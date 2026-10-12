using CineAggregator.Api.Models;
using CineAggregator.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Linq;

namespace CineAggregator.Api.Database
{
    public class MongoDbService
    {
        private readonly IMongoCollection<Movie> _movies;
        private readonly IMongoCollection<User> _users;
        private readonly IMongoCollection<AdminSettings> _settings;
        private readonly ILogger<MongoDbService> _logger;

        public MongoDbService(IConfiguration config, ILogger<MongoDbService> logger)
        {
            _logger = logger;
            var connectionString = config["MongoDb:ConnectionString"] ?? "mongodb://localhost:27017";
            var databaseName = config["MongoDb:DatabaseName"] ?? "CineAggregator";

            var client = new MongoClient(connectionString);
            var database = client.GetDatabase(databaseName);
            _movies = database.GetCollection<Movie>("movies");
            _users = database.GetCollection<User>("users");
            _settings = database.GetCollection<AdminSettings>("settings");

            SeedInitialData();
        }

        public List<Movie> GetAllMovies()
        {
            return _movies.Find(movie => true).ToList();
        }

        public Movie GetMovieById(string id)
        {
            return _movies.Find(m => m.Id == id).FirstOrDefault();
        }

        public List<Movie> SearchMovies(string query)
        {
            var filter = Builders<Movie>.Filter.Regex("title", new BsonRegularExpression(System.Text.RegularExpressions.Regex.Escape(query), "i")) |
                         Builders<Movie>.Filter.Regex("description", new BsonRegularExpression(System.Text.RegularExpressions.Regex.Escape(query), "i"));
            return _movies.Find(filter).ToList();
        }

        public List<Movie> FreeTextSearchMovies(string query)
        {
            var stopWords = new HashSet<string> { "i", "a", "an", "the", "want", "where", "with", "about", "movie", "film", "show", "me", "find", "get", "is", "are", "was", "were", "to", "of", "in", "on", "and", "or", "that", "this", "it", "for", "has", "have", "do", "does" };

            var words = query.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                             .Select(w => w.Trim().ToLower())
                             .Where(w => w.Length > 2 && !stopWords.Contains(w))
                             .ToList();

            if (!words.Any())
                return new List<Movie>();

            var filters = new List<FilterDefinition<Movie>>();
            foreach (var word in words)
            {
                var wordFilter = Builders<Movie>.Filter.Regex("title", new BsonRegularExpression(System.Text.RegularExpressions.Regex.Escape(word), "i")) |
                                 Builders<Movie>.Filter.Regex("description", new BsonRegularExpression(System.Text.RegularExpressions.Regex.Escape(word), "i")) |
                                 Builders<Movie>.Filter.Regex("genres", new BsonRegularExpression(System.Text.RegularExpressions.Regex.Escape(word), "i"));
                filters.Add(wordFilter);
            }

            var combined = Builders<Movie>.Filter.Or(filters);
            return _movies.Find(combined).ToList();
        }

        public List<Movie> FilterMovies(string genre, string language, string platform, double? minRating)
        {
            var builder = Builders<Movie>.Filter;
            var filter = builder.Empty;

            if (!string.IsNullOrEmpty(genre))
                filter &= builder.Regex("genres", new BsonRegularExpression(genre, "i"));

            if (!string.IsNullOrEmpty(language))
                filter &= builder.Regex("languages", new BsonRegularExpression(language, "i"));

            if (!string.IsNullOrEmpty(platform))
                filter &= builder.Regex("platforms", new BsonRegularExpression(platform, "i"));

            if (minRating.HasValue)
                filter &= builder.Gte(m => m.AggregatedRating, minRating.Value);

            return _movies.Find(filter).ToList();
        }

        public void InsertMovie(Movie movie)
        {
            _movies.InsertOne(movie);
        }

        public void UpdateMovie(Movie movie)
        {
            _movies.ReplaceOne(m => m.Id == movie.Id, movie, new ReplaceOptions { IsUpsert = true });
        }

        public Movie GetMovieByExternalId(string id)
        {
            return _movies.Find(m => m.Id == id).FirstOrDefault();
        }

        public bool DeleteMovie(string id)
        {
            var result = _movies.DeleteOne(m => m.Id == id);
            return result.DeletedCount > 0;
        }

        public Movie UpdateMovieRatings(string id, List<Rating> ratings, double aggregatedRating)
        {
            var filter = Builders<Movie>.Filter.Eq(m => m.Id, id);
            var update = Builders<Movie>.Update
                .Set(m => m.Ratings, ratings)
                .Set(m => m.AggregatedRating, aggregatedRating);

            _movies.UpdateOne(filter, update);
            return GetMovieById(id);
        }

        // ================= User Authentication =================
        public User GetUserByUsername(string username)
        {
            return _users.Find(u => u.Username.ToLower() == username.ToLower()).FirstOrDefault();
        }

        public void CreateUser(User user)
        {
            _users.InsertOne(user);
        }

        public List<User> GetAllUsers()
        {
            return _users.Find(_ => true).ToList();
        }

        // ================= Application Settings =================
        public AdminSettings GetSettings()
        {
            var settings = _settings.Find(s => s.Id == "app_settings").FirstOrDefault();
            if (settings == null)
            {
                settings = new AdminSettings();
                _settings.InsertOne(settings);
            }
            return settings;
        }

        public void UpdateSettings(AdminSettings settings)
        {
            settings.Id = "app_settings";
            _settings.ReplaceOne(s => s.Id == "app_settings", settings, new ReplaceOptions { IsUpsert = true });
        }

        // ================= Seed Data =================
        private void SeedInitialData()
        {
            try
            {
                // Seed Admin if not exists
                var admin = _users.Find(u => u.Username == "admin").FirstOrDefault();
                if (admin == null)
                {
                    _users.InsertOne(new User
                    {
                        Username = "admin",
                        PasswordHash = PasswordHelper.HashPassword("Admin123!"),
                        Role = "Admin",
                        CreatedAt = DateTime.UtcNow
                    });
                    _logger.LogInformation("Seeded default administrator: admin / Admin123!");
                }

                // Seed Regular User if not exists
                var user = _users.Find(u => u.Username == "user").FirstOrDefault();
                if (user == null)
                {
                    _users.InsertOne(new User
                    {
                        Username = "user",
                        PasswordHash = PasswordHelper.HashPassword("User123!"),
                        Role = "User",
                        CreatedAt = DateTime.UtcNow
                    });
                    _logger.LogInformation("Seeded default user: user / User123!");
                }

                // Seed Default Settings
                var settings = _settings.Find(s => s.Id == "app_settings").FirstOrDefault();
                if (settings == null)
                {
                    _settings.InsertOne(new AdminSettings());
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Initial seeding check failed (database may still be starting up).");
            }
        }
    }
}
