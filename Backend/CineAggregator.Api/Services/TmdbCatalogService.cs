using CineAggregator.Api.Database;
using CineAggregator.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;

namespace CineAggregator.Api.Services;

/// <summary>Searches the TMDb catalogue and upserts every returned item into MongoDB.</summary>
public sealed class TmdbCatalogService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _configuration;
    private readonly MongoDbService _database;
    private readonly MovieService _movieService;
    private readonly ILogger<TmdbCatalogService> _logger;

    private static readonly Dictionary<int, string> GenreNames = new()
    {
        [28]="Action", [12]="Adventure", [16]="Animation", [35]="Comedy", [80]="Crime",
        [99]="Documentary", [18]="Drama", [10751]="Family", [14]="Fantasy", [36]="History",
        [27]="Horror", [10402]="Music", [9648]="Mystery", [10749]="Romance", [878]="Science Fiction",
        [10770]="TV Movie", [53]="Thriller", [10752]="War", [37]="Western", [10759]="Action & Adventure",
        [10762]="Kids", [10763]="News", [10764]="Reality", [10765]="Sci-Fi & Fantasy",
        [10766]="Soap", [10767]="Talk", [10768]="War & Politics"
    };

    private static readonly Dictionary<string, int> GenreIds = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Action"]=28, ["Adventure"]=12, ["Animation"]=16, ["Comedy"]=35, ["Crime"]=80,
        ["Documentary"]=99, ["Drama"]=18, ["Family"]=10751, ["Fantasy"]=14, ["History"]=36,
        ["Horror"]=27, ["Music"]=10402, ["Mystery"]=9648, ["Romance"]=10749,
        ["Science Fiction"]=878, ["Sci-Fi"]=878, ["TV Movie"]=10770, ["Thriller"]=53,
        ["War"]=10752, ["Western"]=37, ["Action & Adventure"]=10759, ["Kids"]=10762,
        ["News"]=10763, ["Reality"]=10764, ["Sci-Fi & Fantasy"]=10765, ["Soap"]=10766,
        ["Talk"]=10767, ["War & Politics"]=10768
    };

    private static readonly Dictionary<string, string[]> ConceptExpansions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["бессмертный"] = ["immortal", "immortality", "eternal life", "cannot die", "undying"],
        ["бессмертие"] = ["immortal", "immortality", "eternal life", "undying"],
        ["скрывает силу"] = ["hidden power", "secret power", "underestimated", "overpowered"],
        ["скрывает свою силу"] = ["hidden power", "secret power", "underestimated", "overpowered"],
        ["перерождение"] = ["reincarnation", "reborn", "reincarnated"],
        ["попаданец"] = ["isekai", "transported to another world", "another world"],
        ["герой"] = ["hero", "protagonist"],
        ["главный герой"] = ["main character", "protagonist", "hero"],
        ["демон"] = ["demon", "devil"],
        ["магия"] = ["magic", "wizard", "sorcery"],
        ["аниме"] = ["anime", "animation"]
    };

    public TmdbCatalogService(HttpClient http, IConfiguration configuration, MongoDbService database,
        MovieService movieService, ILogger<TmdbCatalogService> logger)
    {
        _http = http;
        _configuration = configuration;
        _database = database;
        _movieService = movieService;
        _logger = logger;
        _http.BaseAddress = new Uri("https://api.themoviedb.org/3/");
    }


    public async Task<CatalogSearchResult> SearchPageAsync(string? query, int page, string? genre, string? language, string? platform, double? minRating, string? sortBy, CancellationToken cancellationToken = default)
    {
        page = Math.Clamp(page, 1, 500);
        sortBy = (sortBy ?? "relevance").Trim().ToLowerInvariant();
        var apiKey = _configuration["Tmdb:ApiKey"] ?? _configuration["MOVIE_API_KEY"];
        var bearerToken = _configuration["Tmdb:ReadAccessToken"];
        if (string.IsNullOrWhiteSpace(apiKey) && string.IsNullOrWhiteSpace(bearerToken))
            throw new InvalidOperationException("TMDb credentials are missing. Configure Tmdb:ApiKey or Tmdb:ReadAccessToken.");

        var found = new Dictionary<string, Movie>(StringComparer.OrdinalIgnoreCase);
        var hasMore = false;
        if (!string.IsNullOrWhiteSpace(query))
        {
            // Search the external catalogue, not just MongoDB. TMDb search does not support all filters,
            // so supported genre/language/rating filters are applied to each returned page afterwards.
            foreach (var term in BuildSearchTerms(query).Take(6))
            {
                var json = await GetTmdbJsonAsync($"search/multi?query={Uri.EscapeDataString(term)}&include_adult=false&page={page}", apiKey, bearerToken, cancellationToken);
                hasMore |= ((int?)json["page"] ?? page) < ((int?)json["total_pages"] ?? page);
                foreach (var item in json["results"] as JArray ?? new JArray())
                {
                    var mediaType = (string?)item["media_type"];
                    if (mediaType is not ("movie" or "tv")) continue;
                    var movie = MapItem((JObject)item, mediaType);
                    if (movie != null) found[movie.Id] = movie;
                }
            }
        }
        else
        {
            // No search text: browse popular movies and TV shows from TMDb, with any active filters.
            foreach (var mediaType in new[] { "movie", "tv" })
            {
                var args = new List<string> { $"page={page}", "sort_by=popularity.desc", "include_adult=false" };
                if (!string.IsNullOrWhiteSpace(genre) && GenreIds.TryGetValue(genre, out var genreId)) args.Add($"with_genres={genreId}");
                if (!string.IsNullOrWhiteSpace(language)) args.Add($"with_original_language={Uri.EscapeDataString(LanguageCode(language))}");
                if (minRating.HasValue && minRating.Value > 0) args.Add($"vote_average.gte={minRating.Value.ToString(CultureInfo.InvariantCulture)}");
                var provider = ProviderId(platform);
                if (provider != null) { args.Add($"with_watch_providers={provider}"); args.Add("watch_region=US"); }
                var json = await GetTmdbJsonAsync($"discover/{mediaType}?{string.Join("&", args)}", apiKey, bearerToken, cancellationToken);
                hasMore |= ((int?)json["page"] ?? page) < ((int?)json["total_pages"] ?? page);
                foreach (var item in json["results"] as JArray ?? new JArray())
                {
                    var movie = MapItem((JObject)item, mediaType);
                    if (movie != null) found[movie.Id] = movie;
                }
            }
        }

        var filtered = found.Values.Where(m =>
            (string.IsNullOrWhiteSpace(genre) || m.Genres.Any(g => g.Equals(genre, StringComparison.OrdinalIgnoreCase) || (genre.Equals("Sci-Fi", StringComparison.OrdinalIgnoreCase) && g == "Science Fiction"))) &&
            (string.IsNullOrWhiteSpace(language) || m.Languages.Any(l => l.Equals(LanguageCode(language), StringComparison.OrdinalIgnoreCase) || l.Equals(language, StringComparison.OrdinalIgnoreCase))) &&
            (!minRating.HasValue || m.Ratings.Any(r => r.Score >= minRating.Value)) &&
            (string.IsNullOrWhiteSpace(platform) || string.IsNullOrWhiteSpace(query) || m.Platforms.Count == 0 || m.Platforms.Any(x => x.Equals(platform, StringComparison.OrdinalIgnoreCase))))
            .ToList();

        foreach (var movie in filtered)
        {
            var existing = _database.GetMovieByExternalId(movie.Id);
            if (existing != null)
            {
                movie.Platforms = existing.Platforms ?? new List<string>();
                if (movie.Genres.Count == 0) movie.Genres = existing.Genres ?? new List<string>();
                if (string.IsNullOrWhiteSpace(movie.Description)) movie.Description = existing.Description;
            }
            _movieService.ProcessMovie(movie); // upsert; TMDb rating/vote count refresh on every search
        }

        var ordered = sortBy switch
        {
            "newest" or "year-desc" => filtered.OrderByDescending(m => m.ReleaseYear).ThenByDescending(m => m.Popularity).ToList(),
            "year-asc" => filtered.OrderBy(m => m.ReleaseYear == 0 ? int.MaxValue : m.ReleaseYear).ThenBy(m => m.Title).ToList(),
            "top-rated" => filtered.OrderByDescending(m => m.AggregatedRating).ThenByDescending(m => m.Ratings.Select(r => r.Votes).DefaultIfEmpty(0).Max()).ToList(),
            "popular" => filtered.OrderByDescending(m => m.Popularity).ThenByDescending(m => m.AggregatedRating).ToList(),
            _ => filtered.Select(m => new { Movie = m, Score = string.IsNullOrWhiteSpace(query) ? 0 : RelevanceScore(query, m) })
                .OrderByDescending(x => x.Score).ThenByDescending(x => x.Movie.AggregatedRating).Select(x => x.Movie).ToList()
        };
        return new CatalogSearchResult { Results = ordered, Page = page, HasMore = hasMore };
    }

    public async Task<CatalogSearchResult> GetMoviesByActorAsync(
        int personId, int page, string? genre, string? language, string? platform,
        double? minRating, string? sortBy, CancellationToken cancellationToken = default)
    {
        page = Math.Clamp(page, 1, 500);
        sortBy = (sortBy ?? "relevance").Trim().ToLowerInvariant();
        var apiKey = _configuration["Tmdb:ApiKey"] ?? _configuration["MOVIE_API_KEY"];
        var bearerToken = _configuration["Tmdb:ReadAccessToken"];
        if (string.IsNullOrWhiteSpace(apiKey) && string.IsNullOrWhiteSpace(bearerToken))
            throw new InvalidOperationException("TMDb credentials are missing. Configure Tmdb:ApiKey or Tmdb:ReadAccessToken.");

        // TMDb person movie credits returns the movies this exact TMDb person acted in.
        var credits = await GetTmdbJsonAsync($"person/{personId}/movie_credits", apiKey, bearerToken, cancellationToken);
        var movies = new Dictionary<string, Movie>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in credits["cast"] as JArray ?? new JArray())
        {
            var movie = MapItem((JObject)item, "movie");
            if (movie == null) continue;
            movies[movie.Id] = movie;
        }

        var filtered = new List<Movie>();
        foreach (var movie in movies.Values)
        {
            var existing = _database.GetMovieByExternalId(movie.Id);
            if (existing != null)
            {
                movie.Platforms = existing.Platforms ?? new List<string>();
                if (movie.Genres.Count == 0) movie.Genres = existing.Genres ?? new List<string>();
                if (string.IsNullOrWhiteSpace(movie.Description)) movie.Description = existing.Description;
            }

            if (!string.IsNullOrWhiteSpace(genre) &&
                !movie.Genres.Any(g => g.Equals(genre, StringComparison.OrdinalIgnoreCase) ||
                    (genre.Equals("Sci-Fi", StringComparison.OrdinalIgnoreCase) && g == "Science Fiction"))) continue;
            if (!string.IsNullOrWhiteSpace(language) &&
                !movie.Languages.Any(l => l.Equals(LanguageCode(language), StringComparison.OrdinalIgnoreCase) ||
                    l.Equals(language, StringComparison.OrdinalIgnoreCase))) continue;
            movie.AggregatedRating = _movieService.CalculateAggregatedRating(movie.Ratings);
            if (minRating.HasValue && movie.AggregatedRating < minRating.Value) continue;
            if (!string.IsNullOrWhiteSpace(platform) &&
                !movie.Platforms.Any(p => p.Equals(platform, StringComparison.OrdinalIgnoreCase))) continue;

            _movieService.ProcessMovie(movie);
            filtered.Add(movie);
        }

        var ordered = sortBy switch
        {
            "newest" or "year-desc" => filtered.OrderByDescending(m => m.ReleaseYear).ThenByDescending(m => m.Popularity).ToList(),
            "year-asc" => filtered.OrderBy(m => m.ReleaseYear == 0 ? int.MaxValue : m.ReleaseYear).ThenBy(m => m.Title).ToList(),
            "top-rated" => filtered.OrderByDescending(m => m.AggregatedRating).ThenByDescending(m => m.Popularity).ToList(),
            "popular" => filtered.OrderByDescending(m => m.Popularity).ThenByDescending(m => m.AggregatedRating).ToList(),
            _ => filtered.OrderByDescending(m => m.Popularity).ThenByDescending(m => m.ReleaseYear).ToList()
        };

        const int pageSize = 20;
        var results = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return new CatalogSearchResult { Results = results, Page = page, HasMore = ordered.Count > page * pageSize };
    }

    public async Task<List<Movie>> GetRelatedMoviesAsync(string movieId, CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["Tmdb:ApiKey"] ?? _configuration["MOVIE_API_KEY"];
        var bearerToken = _configuration["Tmdb:ReadAccessToken"];
        if (string.IsNullOrWhiteSpace(apiKey) && string.IsNullOrWhiteSpace(bearerToken))
            throw new InvalidOperationException("TMDb credentials are missing. Configure Tmdb:ApiKey or Tmdb:ReadAccessToken.");

        var isTv = movieId.StartsWith("tmdb-tv-", StringComparison.OrdinalIgnoreCase);
        var externalId = isTv ? movieId[8..] : movieId;
        if (!int.TryParse(externalId, out _)) return new List<Movie>();
        var mediaType = isTv ? "tv" : "movie";
        var related = new Dictionary<string, Movie>(StringComparer.OrdinalIgnoreCase);

        // TMDb exposes both recommendation and similar-title lists. Merge them without duplicates.
        foreach (var endpoint in new[] { $"{mediaType}/{externalId}/recommendations?page=1", $"{mediaType}/{externalId}/similar?page=1" })
        {
            var json = await GetTmdbJsonAsync(endpoint, apiKey, bearerToken, cancellationToken);
            foreach (var item in json["results"] as JArray ?? new JArray())
            {
                var mapped = MapItem((JObject)item, mediaType);
                if (mapped != null && !mapped.Id.Equals(movieId, StringComparison.OrdinalIgnoreCase))
                    related.TryAdd(mapped.Id, mapped);
            }
        }
        var results = related.Values
            .OrderByDescending(m => m.Popularity)
            .Take(12)
            .ToList();
        foreach (var relatedMovie in results)
        {
            // Persist recommendations so their View Details links work as well.
            _movieService.ProcessMovie(relatedMovie);
        }
        return results;
    }

    public async Task PopulateMovieDetailsAsync(Movie movie, CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["Tmdb:ApiKey"] ?? _configuration["MOVIE_API_KEY"];
        var bearerToken = _configuration["Tmdb:ReadAccessToken"];
        if (string.IsNullOrWhiteSpace(apiKey) && string.IsNullOrWhiteSpace(bearerToken))
            throw new InvalidOperationException("TMDb credentials are missing. Configure Tmdb:ApiKey or Tmdb:ReadAccessToken.");

        var isTv = movie.Id.StartsWith("tmdb-tv-", StringComparison.OrdinalIgnoreCase);
        var externalId = isTv ? movie.Id[8..] : movie.Id;
        if (!int.TryParse(externalId, out _)) return;
        var mediaType = isTv ? "tv" : "movie";
        movie.WatchProvidersUrl = $"https://www.themoviedb.org/{mediaType}/{externalId}/watch";

        // Cast and streaming availability are independent lookups: one failing should not hide the other.
        try
        {
            var credits = await GetTmdbJsonAsync($"{mediaType}/{externalId}/credits", apiKey, bearerToken, cancellationToken);
            movie.Cast = (credits["cast"] as JArray ?? new JArray())
                .Take(20)
                .Select(item => new CastMember
                {
                    Id = (int?)item["id"] ?? 0,
                    Name = (string?)item["name"] ?? string.Empty,
                    Character = (string?)item["character"] ?? string.Empty,
                    ProfileUrl = string.IsNullOrWhiteSpace((string?)item["profile_path"])
                        ? null
                        : $"https://image.tmdb.org/t/p/w185{(string)item["profile_path"]}"
                })
                .Where(person => !string.IsNullOrWhiteSpace(person.Name))
                .ToList();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Could not load TMDb cast for {MovieId}", movie.Id);
            movie.Cast = new List<CastMember>();
        }

        try
        {
            var providersJson = await GetTmdbJsonAsync($"{mediaType}/{externalId}/watch/providers", apiKey, bearerToken, cancellationToken);
            var regions = providersJson["results"] as JObject;
            var israelRegion = regions?["IL"] as JObject;
            var hasIsraelProviders = new[] { "flatrate", "rent", "buy" }
                .Any(key => (israelRegion?[key] as JArray)?.Count > 0);
            var region = hasIsraelProviders ? israelRegion : regions?["US"] as JObject;
            movie.WatchProviders = new List<WatchProvider>();
            foreach (var providerType in new[] { (Key: "flatrate", Label: "Streaming"), (Key: "rent", Label: "Rent"), (Key: "buy", Label: "Buy") })
            {
                foreach (var provider in region?[providerType.Key] as JArray ?? new JArray())
                {
                    var name = (string?)provider["provider_name"];
                    if (string.IsNullOrWhiteSpace(name)) continue;
                    if (movie.WatchProviders.Any(p => p.Name.Equals(name, StringComparison.OrdinalIgnoreCase) && p.Type == providerType.Label)) continue;
                    var logoPath = (string?)provider["logo_path"];
                    movie.WatchProviders.Add(new WatchProvider
                    {
                        Name = name,
                        Type = providerType.Label,
                        LogoUrl = string.IsNullOrWhiteSpace(logoPath) ? null : $"https://image.tmdb.org/t/p/w92{logoPath}"
                    });
                }
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Could not load TMDb watch providers for {MovieId}", movie.Id);
            movie.WatchProviders = new List<WatchProvider>();
        }
    }

    private async Task<JObject> GetTmdbJsonAsync(string relativeUrl, string? apiKey, string? bearerToken, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(apiKey)) relativeUrl += (relativeUrl.Contains('?') ? "&" : "?") + $"api_key={Uri.EscapeDataString(apiKey)}";
        using var request = new HttpRequestMessage(HttpMethod.Get, relativeUrl);
        if (!string.IsNullOrWhiteSpace(bearerToken)) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        using var response = await _http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
        return JObject.Parse(await response.Content.ReadAsStringAsync(ct));
    }

    private static string LanguageCode(string language) => language.Trim().ToLowerInvariant() switch
    {
        "english" => "en", "hebrew" => "he", "french" => "fr", "spanish" => "es", "russian" => "ru", "japanese" => "ja", "korean" => "ko", _ => language.Trim().ToLowerInvariant()
    };

    private static string? ProviderId(string? platform) => platform?.Trim().ToLowerInvariant() switch
    {
        "netflix" => "8", "disney+" or "disney plus" => "337", "amazon prime" or "prime video" => "9", "apple tv" => "350", _ => null
    };

    public async Task<List<Movie>> SearchAndRefreshAsync(string query, CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["Tmdb:ApiKey"] ?? _configuration["MOVIE_API_KEY"];
        var bearerToken = _configuration["Tmdb:ReadAccessToken"];
        if (string.IsNullOrWhiteSpace(apiKey) && string.IsNullOrWhiteSpace(bearerToken))
        {
            _logger.LogWarning("TMDb credentials are not configured. Falling back to local database search.");
            return _movieService.FreeTextSearchMovies(query);
        }

        var terms = BuildSearchTerms(query).Take(6).ToList();
        var found = new Dictionary<string, Movie>(StringComparer.OrdinalIgnoreCase);
        foreach (var term in terms)
        {
            foreach (var mediaType in new[] { "movie", "tv" })
            {
                var url = $"search/{mediaType}?query={Uri.EscapeDataString(term)}&include_adult=false&page=1";
                if (!string.IsNullOrWhiteSpace(apiKey)) url += $"&api_key={Uri.EscapeDataString(apiKey)}";
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                if (!string.IsNullOrWhiteSpace(bearerToken)) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

                using var response = await _http.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("TMDb search failed with status {StatusCode} for term {Term}", response.StatusCode, term);
                    continue;
                }

                var json = JObject.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
                foreach (var item in json["results"] ?? new JArray())
                {
                    var mapped = MapItem((JObject)item, mediaType);
                    if (mapped == null) continue;
                    found[mapped.Id] = mapped;
                }
            }
        }

        // Save new items and refresh existing records (including rating and vote count).
        foreach (var movie in found.Values)
        {
            var existing = _database.GetMovieByExternalId(movie.Id);
            if (existing != null)
            {
                // Preserve locally-managed fields not supplied by TMDb.
                movie.Platforms = existing.Platforms ?? new List<string>();
                if (movie.Genres.Count == 0) movie.Genres = existing.Genres ?? new List<string>();
            }
            _movieService.ProcessMovie(movie);
        }

        var local = _movieService.FreeTextSearchMovies(query);
        var combined = found.Values.Concat(local)
            .GroupBy(m => m.Id, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .Select(m => new { Movie = m, Score = RelevanceScore(query, m) })
            .OrderByDescending(x => x.Score)
            .ThenByDescending(x => x.Movie.AggregatedRating)
            .Select(x => x.Movie)
            .ToList();

        return combined;
    }

    private static Movie MapItem(JObject item, string mediaType)
    {
        var externalId = item["id"]?.Value<int>();
        if (externalId == null) return null;
        var title = (string)(item[mediaType == "movie" ? "title" : "name"] ?? item["original_title"] ?? item["original_name"]);
        if (string.IsNullOrWhiteSpace(title)) return null;
        var overview = (string)item["overview"] ?? string.Empty;
        var date = (string)(item[mediaType == "movie" ? "release_date" : "first_air_date"]);
        var year = int.TryParse(date?.Length >= 4 ? date[..4] : null, out var parsedYear) ? parsedYear : 0;
        var language = (string)item["original_language"] ?? string.Empty;
        var score = item["vote_average"]?.Value<double>() ?? 0;
        var votes = item["vote_count"]?.Value<int>() ?? 0;
        var posterPath = (string)item["poster_path"];

        return new Movie
        {
            // Prefix the media type to avoid collisions between a movie and a TV show's TMDb ID.
            Id = mediaType == "movie" ? externalId.Value.ToString(CultureInfo.InvariantCulture) : $"tmdb-tv-{externalId.Value}",
            Title = title,
            Description = overview,
            PosterUrl = string.IsNullOrWhiteSpace(posterPath) ? string.Empty : $"https://image.tmdb.org/t/p/w500{posterPath}",
            ReleaseYear = year,
            Popularity = item["popularity"]?.Value<double>() ?? 0,
            Genres = (item["genre_ids"] as JArray ?? new JArray()).Values<int>().Where(GenreNames.ContainsKey).Select(id => GenreNames[id]).Distinct().ToList(),
            Languages = string.IsNullOrWhiteSpace(language) ? new List<string>() : new List<string> { language },
            Platforms = new List<string>(),
            Ratings = new List<Rating> { new() { Source = "TMDb", Score = score, Votes = votes } }
        };
    }

    private static IEnumerable<string> BuildSearchTerms(string query)
    {
        var terms = new List<string> { query.Trim() };
        var lower = query.ToLowerInvariant();
        foreach (var pair in ConceptExpansions)
        {
            if (lower.Contains(pair.Key, StringComparison.OrdinalIgnoreCase))
                terms.AddRange(pair.Value);
        }
        // For short title-like queries, search the full phrase only. Searching each word separately
        // (e.g. "Harry" and "Potter") adds unrelated results and makes title search feel random.
        // Concept expansion remains available for natural-language/descriptive searches.
        var hasConcept = ConceptExpansions.Keys.Any(key => lower.Contains(key, StringComparison.OrdinalIgnoreCase));
        var wordCount = Regex.Split(query.Trim(), @"\s+").Length;
        if (!hasConcept && wordCount <= 4)
            return terms;

        var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "где", "когда", "который", "которая", "которые", "про", "мне", "найди", "покажи", "фильм", "фильмы", "сериал", "сериалы", "аниме", "главный", "герой", "его", "свой", "свою", "the", "a", "an", "where", "who", "with", "about", "movie", "film", "show", "find", "me"
        };
        terms.AddRange(Regex.Split(query, @"[^\p{L}\p{N}]+")
            .Where(w => w.Length >= 3 && !stopWords.Contains(w)));
        return terms.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).Distinct(StringComparer.OrdinalIgnoreCase);
    }

    private static double RelevanceScore(string query, Movie movie)
    {
        static string Normalize(string value) => Regex.Replace(value.ToLowerInvariant(), @"[^\p{L}\p{N}]+", " ").Trim();
        var normalizedQuery = Normalize(query);
        var normalizedTitle = Normalize(movie.Title ?? string.Empty);
        if (normalizedQuery.Length == 0) return 0;

        // Exact/near title matches must always beat a merely related description.
        if (normalizedTitle == normalizedQuery) return 10000;
        if (normalizedTitle.StartsWith(normalizedQuery, StringComparison.Ordinal)) return 8000;
        if (normalizedTitle.Contains(normalizedQuery, StringComparison.Ordinal)) return 6000;

        var isTitleLike = Regex.Split(query.Trim(), @"\s+").Length <= 4
            && !ConceptExpansions.Keys.Any(key => query.Contains(key, StringComparison.OrdinalIgnoreCase));
        var queryTerms = (isTitleLike ? new[] { normalizedQuery } : BuildSearchTerms(query))
            .SelectMany(term => Regex.Split(Normalize(term), @"\s+"))
            .Where(word => word.Length >= 2).Distinct().ToList();
        var title = normalizedTitle;
        var text = Normalize($"{movie.Description} {string.Join(' ', movie.Genres ?? new List<string>())}");
        double score = 0;
        foreach (var word in queryTerms)
        {
            if (title.Split(' ').Contains(word, StringComparer.Ordinal)) score += 300;
            else if (title.Contains(word, StringComparison.Ordinal)) score += 150;
            if (!isTitleLike && text.Contains(word, StringComparison.Ordinal)) score += 1;
        }
        return score + movie.AggregatedRating / 100.0;
    }
}

public sealed class CatalogSearchResult
{
    public List<Movie> Results { get; set; } = new();
    public int Page { get; set; }
    public bool HasMore { get; set; }
}
