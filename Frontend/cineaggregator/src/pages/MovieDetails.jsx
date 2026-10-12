import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMovie, updateMovieRatings } from '../services/movieService';
import { isAdmin } from '../services/authService';
import Loading from '../components/Loading';

function MovieDetails() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin Rating Edit State
  const [isEditingRatings, setIsEditingRatings] = useState(false);
  const [ratingsEditList, setRatingsEditList] = useState([]);
  const [savingRatings, setSavingRatings] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState(null);
  const [newSource, setNewSource] = useState('');
  const [newScore, setNewScore] = useState('');
  const [newVotes, setNewVotes] = useState('');

  const adminUser = isAdmin();

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true);
      try {
        const data = await getMovie(id);
        setMovie(data);
        if (data && data.ratings) {
          setRatingsEditList(data.ratings.map(r => ({ ...r })));
        }
      } catch (err) {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  const handleOpenEdit = () => {
    setRatingsEditList(movie.ratings ? movie.ratings.map(r => ({ ...r })) : []);
    setIsEditingRatings(true);
    setEditSuccessMsg(null);
  };

  const handleRatingValueChange = (index, field, value) => {
    const updated = [...ratingsEditList];
    updated[index] = {
      ...updated[index],
      [field]: field === 'source' ? value : Number(value)
    };
    setRatingsEditList(updated);
  };

  const handleRemoveRatingItem = (index) => {
    setRatingsEditList(ratingsEditList.filter((_, i) => i !== index));
  };

  const handleAddRatingItem = (e) => {
    e.preventDefault();
    if (!newSource.trim() || newScore === '' || newVotes === '') return;
    const scoreVal = parseFloat(newScore);
    const votesVal = parseInt(newVotes, 10);
    if (scoreVal < 0 || scoreVal > 10) {
      alert("Rating score must be between 0 and 10.");
      return;
    }
    setRatingsEditList([
      ...ratingsEditList,
      { source: newSource.trim(), score: scoreVal, votes: votesVal }
    ]);
    setNewSource('');
    setNewScore('');
    setNewVotes('');
  };

  const handleSaveUpdatedRatings = async () => {
    setSavingRatings(true);
    setEditSuccessMsg(null);
    try {
      const updated = await updateMovieRatings(movie.id, ratingsEditList);
      setMovie(prev => ({
        ...prev,
        ratings: updated.ratings,
        aggregatedRating: updated.aggregatedRating
      }));
      setEditSuccessMsg("Ratings updated successfully!");
      setIsEditingRatings(false);
    } catch (err) {
      alert(err.message || "Failed to update ratings.");
    } finally {
      setSavingRatings(false);
    }
  };

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
          
          <div className="rating-row">
            <h3 className="movie-rating">⭐ {Number(movie.aggregatedRating).toFixed(2)}</h3>
            {adminUser && (
              <button
                onClick={handleOpenEdit}
                className="btn-admin-edit-ratings"
                title="Administrator option to adjust movie ratings"
              >
                ⚙️ Manage Ratings (Admin)
              </button>
            )}
          </div>

          {editSuccessMsg && <div className="admin-alert success inline">{editSuccessMsg}</div>}

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
                <li key={i}>{r.source}: <strong>{r.score}</strong> <small>({(r.votes || 0).toLocaleString()} votes)</small></li>
              ))}
              {(!movie.ratings || movie.ratings.length === 0) && (
                <li>No specific source ratings recorded.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Admin Inline Ratings Manager Modal / Panel */}
      {isEditingRatings && adminUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3>⚙️ Administrator: Manage Ratings for "{movie.title}"</h3>
              <button onClick={() => setIsEditingRatings(false)} className="btn-close-modal">✕</button>
            </div>
            <p className="modal-note">
              Adjust source scores or add new ones. Saving will recalculate the weighted Aggregated Rating according to formula:
              <code>Sum(Score × Votes) / Sum(Votes)</code>
            </p>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Score (0-10)</th>
                  <th>Votes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ratingsEditList.map((r, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        value={r.source}
                        onChange={(e) => handleRatingValueChange(idx, 'source', e.target.value)}
                        className="table-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={r.score}
                        onChange={(e) => handleRatingValueChange(idx, 'score', e.target.value)}
                        className="table-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={r.votes}
                        onChange={(e) => handleRatingValueChange(idx, 'votes', e.target.value)}
                        className="table-input"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemoveRatingItem(idx)}
                        className="btn-danger-small"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <form onSubmit={handleAddRatingItem} className="add-rating-inline-form modal-add">
              <input
                type="text"
                placeholder="Source name"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                required
              />
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="Score (0-10)"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                required
              />
              <input
                type="number"
                min="0"
                placeholder="Votes"
                value={newVotes}
                onChange={(e) => setNewVotes(e.target.value)}
                required
              />
              <button type="submit" className="btn-secondary">+ Add</button>
            </form>

            <div className="modal-actions">
              <button
                onClick={handleSaveUpdatedRatings}
                disabled={savingRatings}
                className="btn-primary"
              >
                {savingRatings ? 'Saving...' : '💾 Save & Recalculate'}
              </button>
              <button
                onClick={() => setIsEditingRatings(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
