import React, { useState } from 'react';
import { getRecommendations } from '../services/movieService';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';

function Preferences() {
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('');
  const [platform, setPlatform] = useState('');
  
  const [ratingWeight, setRatingWeight] = useState(60);
  const [genreWeight, setGenreWeight] = useState(25);
  const [platformWeight, setPlatformWeight] = useState(15);

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const total = Number(ratingWeight) + Number(genreWeight) + Number(platformWeight);
  const isTotalValid = total === 100;

  const handleFindMovies = async (e) => {
    e.preventDefault();
    if (!isTotalValid) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    const prefs = {
      genre: genre || undefined,
      language: language || undefined,
      platform: platform || undefined,
      ratingWeight: ratingWeight / 100,
      genreWeight: genreWeight / 100,
      platformWeight: platformWeight / 100
    };

    try {
      const data = await getRecommendations(prefs);
      setMovies(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="preferences-page">
      <h1>Movie Preferences</h1>
      <form className="preferences-form" onSubmit={handleFindMovies}>
        <div className="pref-dropdowns">
          <label>
            Preferred Genre:
            <select value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">Any</option>
              <option value="Action">Action</option>
              <option value="Comedy">Comedy</option>
              <option value="Drama">Drama</option>
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Thriller">Thriller</option>
            </select>
          </label>
          <label>
            Preferred Language:
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="">Any</option>
              <option value="English">English</option>
              <option value="Hebrew">Hebrew</option>
              <option value="French">French</option>
              <option value="Spanish">Spanish</option>
            </select>
          </label>
          <label>
            Preferred Platform:
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">Any</option>
              <option value="Netflix">Netflix</option>
              <option value="Disney+">Disney+</option>
              <option value="Amazon Prime">Amazon Prime</option>
              <option value="Apple TV">Apple TV</option>
            </select>
          </label>
        </div>

        <div className="pref-sliders">
          <h3>Weights</h3>
          <label>
            Rating Weight: {ratingWeight}%
            <input type="range" min="0" max="100" step="5" value={ratingWeight} onChange={(e) => setRatingWeight(Number(e.target.value))} />
          </label>
          <label>
            Genre Weight: {genreWeight}%
            <input type="range" min="0" max="100" step="5" value={genreWeight} onChange={(e) => setGenreWeight(Number(e.target.value))} />
          </label>
          <label>
            Platform Weight: {platformWeight}%
            <input type="range" min="0" max="100" step="5" value={platformWeight} onChange={(e) => setPlatformWeight(Number(e.target.value))} />
          </label>
          <p className={`weight-total ${isTotalValid ? 'valid' : 'invalid'}`}>
            Total: {total}% {total !== 100 && "(Must be 100%)"}
          </p>
        </div>

        <button type="submit" disabled={!isTotalValid} className="btn-primary">
          Find Movies
        </button>
      </form>

      {loading && <Loading />}
      {error && <p className="error-message">{error}</p>}
      
      {!loading && !error && hasSearched && movies.length === 0 && (
        <p className="no-results">No movies found matching your preferences.</p>
      )}

      {!loading && !error && movies.length > 0 && (
        <div className="movies-grid">
          {movies.map(movie => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              showScore={true} 
              finalScore={movie.finalScore} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Preferences;
