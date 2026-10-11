import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMovie } from '../services/movieService';
import Loading from '../components/Loading';

function MovieDetails() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true);
      try {
        const data = await getMovie(id);
        setMovie(data);
      } catch (err) {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <p className="error-message">{error}</p>;
  if (!movie) return <p className="no-results">Movie not found.</p>;

  const poster = movie.posterUrl || "https://via.placeholder.com/400x600?text=No+Poster";
  const isTv = String(movie.id).startsWith('tmdb-tv-');
  const tmdbId = isTv ? String(movie.id).slice('tmdb-tv-'.length) : String(movie.id);
  const watchUrl = movie.watchProvidersUrl || `https://www.themoviedb.org/${isTv ? 'tv' : 'movie'}/${encodeURIComponent(tmdbId)}/watch`;
  const titleForSearch = `${movie.title || ''} ${movie.releaseYear && movie.releaseYear > 0 ? movie.releaseYear : ''}`.trim();
  const encodedTitle = encodeURIComponent(titleForSearch);
  const watchLinks = [
    { label: 'TMDB — Where to Watch', url: watchUrl },
    { label: 'JustWatch', url: `https://www.justwatch.com/il/search?q=${encodedTitle}` },
    { label: 'Google TV', url: `https://play.google.com/store/search?q=${encodedTitle}&c=movies` }
  ];
  const providerSearchUrl = (providerName) => {
    const query = encodeURIComponent(`${providerName} ${titleForSearch}`);
    const normalized = providerName.toLowerCase();
    if (normalized.includes('netflix')) return `https://www.netflix.com/search?q=${encodedTitle}`;
    if (normalized.includes('prime') || normalized.includes('amazon')) return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodedTitle}`;
    if (normalized.includes('disney')) return `https://www.disneyplus.com/search?q=${encodedTitle}`;
    if (normalized.includes('apple')) return `https://tv.apple.com/search?term=${encodedTitle}`;
    return `https://www.google.com/search?q=${query}`;
  };

  return (
    <div className="movie-details">
      <Link to="/" className="btn-back">← Back</Link>
      <div className="details-container">
        <img src={poster} alt={movie.title} className="details-poster" />
        <div className="details-info">
          <h2>{movie.title} ({movie.releaseYear})</h2>
          <h3 className="movie-rating">⭐ {Number(movie.aggregatedRating).toFixed(2)}</h3>
          <p className="description">{movie.description}</p>
          <div className="details-lists">
            <div className="list-group">
              <h4>Genres</h4>
              <ul>{movie.genres?.map(g => <li key={g}>{g}</li>)}</ul>
            </div>
            <div className="list-group">
              <h4>Languages</h4>
              <ul>{movie.languages?.map(l => <li key={l}>{l}</li>)}</ul>
            </div>
            <div className="list-group">
              <h4>Platforms</h4>
              <ul>{movie.platforms?.map(p => <li key={p}>{p}</li>)}</ul>
            </div>
          </div>

          <div className="ratings-sources">
            <h4>Ratings by Source</h4>
            <ul>
              {movie.ratings?.map((r, i) => (
                <li key={i}>{r.source}: {r.score}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="cast-section">
        <h3>Cast</h3>
        {movie.cast?.length > 0 ? (
          <div className="cast-grid">
            {movie.cast.map((person) => (
              <article className="cast-card" key={person.id || `${person.name}-${person.character}`}>
                {person.profileUrl ? (
                  <img src={person.profileUrl} alt={person.name} className="cast-photo" loading="lazy" />
                ) : (
                  <div className="cast-photo cast-photo-placeholder" aria-hidden="true">{person.name?.charAt(0) || '?'}</div>
                )}
                <div className="cast-person-info">
                  {person.id ? (
                    <Link className="cast-person-link" to={`/actor/${person.id}?name=${encodeURIComponent(person.name || '')}`} title={`Find movies featuring ${person.name}`}>
                      {person.name}
                    </Link>
                  ) : (
                    <strong>{person.name}</strong>
                  )}
                  {person.character && <span>{person.character}</span>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="metadata-empty">Cast information is not available from TMDB for this title.</p>
        )}
      </section>

      <section className="watch-options-section">
        <h3>Where to Watch</h3>
        <p className="watch-options-description">Check availability and viewing options on these services.</p>
        <div className="watch-links-list">
          {watchLinks.map((link) => (
            <a key={link.label} href={link.url} className="btn-watch-link" target="_blank" rel="noopener noreferrer">
              {link.label} ↗
            </a>
          ))}
        </div>
        {movie.watchProviders?.length > 0 && (
          <div className="provider-list">
            <h4>Providers listed by TMDB (Israel, or US if Israel data is unavailable)</h4>
            <div className="provider-chips">
              {movie.watchProviders.map((provider) => (
                <a key={`${provider.name}-${provider.type}`} href={providerSearchUrl(provider.name)} target="_blank" rel="noopener noreferrer" className="provider-chip" title={`Search for ${titleForSearch} on ${provider.name}`}>
                  {provider.logoUrl && <img src={provider.logoUrl} alt="" loading="lazy" />}
                  <span>{provider.name}</span>
                  <small>{provider.type}</small>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {movie.relatedMovies?.length > 0 && (
        <section className="related-movies">
          <h3>Similar &amp; Related Movies</h3>
          <div className="movies-grid">
            {movie.relatedMovies.map(related => (
              <div className="movie-card" key={related.id}>
                <img src={related.posterUrl || "https://via.placeholder.com/300x450?text=No+Poster"} alt={related.title} className="movie-poster" />
                <div className="movie-content">
                  <h3>{related.title}</h3>
                  <p className="movie-rating">⭐ {Number(related.aggregatedRating || 0).toFixed(2)}</p>
                  <p className="movie-genres">{(related.genres || []).join(" | ")}</p>
                  <Link to={`/movie/${related.id}`} className="btn-view-details">View Details</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default MovieDetails;
