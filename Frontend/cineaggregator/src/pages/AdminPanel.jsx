import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAdmin, isAuthenticated } from '../services/authService';
import {
  getAdminSettings,
  updateAdminSettings,
  getAdminMovies,
  updateMovieRatings,
  deleteMovie,
  getMovie
} from '../services/movieService';
import Loading from '../components/Loading';

function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ratings'); // 'ratings' | 'settings' | 'movies'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Settings State
  const [settings, setSettings] = useState({
    siteAnnouncement: '',
    enablePublicRegistration: true,
    maintenanceMode: false,
    defaultRecommendationLimit: 20
  });

  // Stored Movies State
  const [storedMovies, setStoredMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [ratingsList, setRatingsList] = useState([]);
  const [savingRatings, setSavingRatings] = useState(false);

  // Add new rating state
  const [newSource, setNewSource] = useState('');
  const [newScore, setNewScore] = useState('');
  const [newVotes, setNewVotes] = useState('');

  // Search in Admin
  const [movieSearchQuery, setMovieSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (!isAdmin()) {
      setError("Access Denied: You must be an Administrator to view this interface.");
      setLoading(false);
      return;
    }

    loadInitialAdminData();
  }, [navigate]);

  const loadInitialAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedSettings, fetchedMovies] = await Promise.all([
        getAdminSettings(),
        getAdminMovies()
      ]);
      setSettings(fetchedSettings);
      setStoredMovies(fetchedMovies);
      if (fetchedMovies.length > 0) {
        selectMovieForEditing(fetchedMovies[0]);
      }
    } catch (err) {
      setError(err.message || "Failed to load administrative data.");
    } finally {
      setLoading(false);
    }
  };

  const selectMovieForEditing = (movie) => {
    setSelectedMovie(movie);
    setRatingsList(movie.ratings ? movie.ratings.map(r => ({ ...r })) : []);
    setSuccessMsg(null);
  };

  const calculateAggregatedRatingPreview = (ratings) => {
    if (!ratings || ratings.length === 0) return 0;
    let totalScore = 0;
    let totalVotes = 0;
    for (const r of ratings) {
      const score = Number(r.score) || 0;
      const votes = Number(r.votes) || 0;
      totalScore += score * votes;
      totalVotes += votes;
    }
    return totalVotes === 0 ? 0 : (totalScore / totalVotes).toFixed(2);
  };

  const handleRatingChange = (index, field, value) => {
    const updated = [...ratingsList];
    updated[index] = {
      ...updated[index],
      [field]: field === 'source' ? value : Number(value)
    };
    setRatingsList(updated);
  };

  const handleRemoveRating = (index) => {
    const updated = ratingsList.filter((_, i) => i !== index);
    setRatingsList(updated);
  };

  const handleAddRating = (e) => {
    e.preventDefault();
    if (!newSource.trim() || newScore === '' || newVotes === '') {
      return;
    }

    const scoreNum = parseFloat(newScore);
    const votesNum = parseInt(newVotes, 10);

    if (scoreNum < 0 || scoreNum > 10) {
      alert("Score must be between 0 and 10.");
      return;
    }

    setRatingsList([
      ...ratingsList,
      { source: newSource.trim(), score: scoreNum, votes: votesNum }
    ]);

    setNewSource('');
    setNewScore('');
    setNewVotes('');
  };

  const handleSaveRatings = async () => {
    if (!selectedMovie) return;
    setSavingRatings(true);
    setSuccessMsg(null);
    setError(null);

    try {
      const updated = await updateMovieRatings(selectedMovie.id, ratingsList);
      setSuccessMsg(`Ratings for "${selectedMovie.title}" successfully updated! New Aggregated Rating: ⭐ ${Number(updated.aggregatedRating).toFixed(2)}`);
      // Update stored movies list in local state
      setStoredMovies(storedMovies.map(m => m.id === selectedMovie.id ? updated : m));
      setSelectedMovie(updated);
    } catch (err) {
      setError(err.message || "Failed to update ratings.");
    } finally {
      setSavingRatings(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);
    try {
      const updated = await updateAdminSettings(settings);
      setSettings(updated);
      setSuccessMsg("Application settings successfully saved!");
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    }
  };

  const handleDeleteMovie = async (movieId, movieTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${movieTitle}" from the database?`)) {
      return;
    }

    try {
      await deleteMovie(movieId);
      const remaining = storedMovies.filter(m => m.id !== movieId);
      setStoredMovies(remaining);
      if (selectedMovie && selectedMovie.id === movieId) {
        setSelectedMovie(remaining[0] || null);
        setRatingsList(remaining[0]?.ratings || []);
      }
      setSuccessMsg(`Movie "${movieTitle}" deleted successfully.`);
    } catch (err) {
      setError(err.message || "Failed to delete movie.");
    }
  };

  if (!isAuthenticated() || !isAdmin()) {
    return (
      <div className="admin-page">
        <div className="admin-access-denied">
          <h2>🚫 Access Denied</h2>
          <p>You do not have administrative privileges to access this area.</p>
          <Link to="/" className="btn-primary">Return to Movies</Link>
        </div>
      </div>
    );
  }

  if (loading) return <Loading />;

  const filteredMovies = storedMovies.filter(m =>
    m.title?.toLowerCase().includes(movieSearchQuery.toLowerCase())
  );

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>⚙️ Administration Control Interface</h1>
        <p>Authorized access only: manage movie rating sources, calculate scores, and configure application settings.</p>
      </header>

      {error && <div className="admin-alert error">{error}</div>}
      {successMsg && <div className="admin-alert success">{successMsg}</div>}

      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'ratings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('ratings'); setSuccessMsg(null); }}
        >
          ⭐ Manage Movie Ratings
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('settings'); setSuccessMsg(null); }}
        >
          🔧 Administrative Settings
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'movies' ? 'active' : ''}`}
          onClick={() => { setActiveTab('movies'); setSuccessMsg(null); }}
        >
          🎬 Stored Movies Catalog ({storedMovies.length})
        </button>
      </div>

      <div className="admin-tab-content">
        {/* ================= TAB 1: RATINGS MANAGEMENT ================= */}
        {activeTab === 'ratings' && (
          <div className="ratings-management-layout">
            <aside className="movie-picker-panel">
              <h3>Select Movie</h3>
              <input
                type="text"
                placeholder="Filter stored movies..."
                value={movieSearchQuery}
                onChange={(e) => setMovieSearchQuery(e.target.value)}
                className="admin-search-input"
              />
              <div className="admin-movie-list">
                {filteredMovies.map(movie => (
                  <button
                    key={movie.id}
                    className={`admin-movie-item ${selectedMovie?.id === movie.id ? 'active' : ''}`}
                    onClick={() => selectMovieForEditing(movie)}
                  >
                    <strong>{movie.title}</strong>
                    <span>⭐ {Number(movie.aggregatedRating || 0).toFixed(2)}</span>
                  </button>
                ))}
                {filteredMovies.length === 0 && (
                  <p className="no-movies-hint">No stored movies found.</p>
                )}
              </div>
            </aside>

            <main className="ratings-editor-panel">
              {selectedMovie ? (
                <>
                  <div className="editor-movie-header">
                    {selectedMovie.posterUrl && (
                      <img src={selectedMovie.posterUrl} alt="" className="editor-thumb" />
                    )}
                    <div>
                      <h2>{selectedMovie.title} ({selectedMovie.releaseYear})</h2>
                      <p className="editor-id">ID: {selectedMovie.id}</p>
                      <div className="live-rating-badge">
                        Project Aggregated Rating: <strong>⭐ {calculateAggregatedRatingPreview(ratingsList)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="rating-formula-box">
                    <strong>Business Logic Formula:</strong>
                    <code>AggregatedRating = Sum(Score × Votes) / Sum(Votes)</code>
                  </div>

                  <h4>Configured Rating Sources</h4>
                  <div className="ratings-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Score (0 - 10)</th>
                          <th>Vote Count</th>
                          <th>Weight Contribution</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ratingsList.map((rating, idx) => {
                          const score = Number(rating.score) || 0;
                          const votes = Number(rating.votes) || 0;
                          const contribution = (score * votes).toLocaleString();
                          return (
                            <tr key={idx}>
                              <td>
                                <input
                                  type="text"
                                  value={rating.source}
                                  onChange={(e) => handleRatingChange(idx, 'source', e.target.value)}
                                  className="table-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  value={rating.score}
                                  onChange={(e) => handleRatingChange(idx, 'score', e.target.value)}
                                  className="table-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={rating.votes}
                                  onChange={(e) => handleRatingChange(idx, 'votes', e.target.value)}
                                  className="table-input"
                                />
                              </td>
                              <td className="contrib-cell">{contribution}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRating(idx)}
                                  className="btn-danger-small"
                                  title="Remove this source"
                                >
                                  ✕ Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {ratingsList.length === 0 && (
                          <tr>
                            <td colSpan="5" className="empty-table-cell">
                              No ratings configured. Add a source below.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <form onSubmit={handleAddRating} className="add-rating-inline-form">
                    <h5>Add New Rating Source:</h5>
                    <div className="inline-inputs">
                      <input
                        type="text"
                        placeholder="Source (e.g. Rotten Tomatoes)"
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
                      <button type="submit" className="btn-secondary">
                        + Add Source
                      </button>
                    </div>
                  </form>

                  <div className="editor-actions">
                    <button
                      type="button"
                      onClick={handleSaveRatings}
                      disabled={savingRatings}
                      className="btn-primary btn-large"
                    >
                      {savingRatings ? 'Saving & Calculating...' : '💾 Save & Recalculate Aggregated Rating'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="select-movie-placeholder">
                  <p>Please select a movie from the left column to manage ratings.</p>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ================= TAB 2: ADMINISTRATIVE SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="admin-settings-card">
            <h3>Global Application Settings</h3>
            <p className="section-description">
              Control application-wide configurations and behavioral flags. Changes take effect immediately.
            </p>

            <form onSubmit={handleSaveSettings} className="admin-form">
              <div className="form-group">
                <label htmlFor="siteAnnouncement">Global Site Announcement Banner</label>
                <input
                  id="siteAnnouncement"
                  type="text"
                  value={settings.siteAnnouncement || ''}
                  onChange={(e) => setSettings({ ...settings, siteAnnouncement: e.target.value })}
                  placeholder="e.g. Welcome to CineAggregator - Now streaming in 4K!"
                />
                <small>Displayed prominently to all users across the frontend.</small>
              </div>

              <div className="form-checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enablePublicRegistration}
                    onChange={(e) => setSettings({ ...settings, enablePublicRegistration: e.target.checked })}
                  />
                  <span>Enable Public User Registration</span>
                </label>
                <small>When unchecked, new users cannot self-register through the registration form.</small>
              </div>

              <div className="form-checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  />
                  <span>Display Maintenance Notice</span>
                </label>
                <small>Displays a maintenance notice banner for users.</small>
              </div>

              <div className="form-group">
                <label htmlFor="defaultRec">Default Recommendation Search Result Limit</label>
                <input
                  id="defaultRec"
                  type="number"
                  min="5"
                  max="100"
                  value={settings.defaultRecommendationLimit || 20}
                  onChange={(e) => setSettings({ ...settings, defaultRecommendationLimit: parseInt(e.target.value, 10) })}
                />
              </div>

              <button type="submit" className="btn-primary">
                Save Administrative Settings
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 3: STORED MOVIES ================= */}
        {activeTab === 'movies' && (
          <div className="admin-movies-tab">
            <div className="tab-header-flex">
              <h3>MongoDB Stored Movies ({storedMovies.length})</h3>
              <input
                type="text"
                placeholder="Search movies..."
                value={movieSearchQuery}
                onChange={(e) => setMovieSearchQuery(e.target.value)}
                className="admin-search-input"
              />
            </div>

            <div className="admin-movies-grid">
              {filteredMovies.map(movie => (
                <div key={movie.id} className="admin-movie-card">
                  <img
                    src={movie.posterUrl || "https://via.placeholder.com/300x450?text=No+Poster"}
                    alt=""
                    className="admin-card-poster"
                  />
                  <div className="admin-card-body">
                    <h4>{movie.title} ({movie.releaseYear})</h4>
                    <p>⭐ Aggregated: {Number(movie.aggregatedRating || 0).toFixed(2)}</p>
                    <p className="genres-small">{(movie.genres || []).join(', ')}</p>
                    <div className="admin-card-actions">
                      <button
                        onClick={() => {
                          setActiveTab('ratings');
                          selectMovieForEditing(movie);
                        }}
                        className="btn-secondary-small"
                      >
                        Edit Ratings
                      </button>
                      <button
                        onClick={() => handleDeleteMovie(movie.id, movie.title)}
                        className="btn-danger-small"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
