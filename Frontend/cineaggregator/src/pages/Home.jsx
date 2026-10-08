import React, { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import Filters from '../components/Filters';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { getMovies, searchMovies, freeTextSearchMovies, filterMovies } from '../services/movieService';

function Home() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInitialMovies();
  }, []);

  const loadInitialMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMovies();
      setMovies(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query) return loadInitialMovies();
    setLoading(true);
    setError(null);
    try {
      const data = await searchMovies(query);
      setMovies(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFreeTextSearch = async (query) => {
    if (!query) return loadInitialMovies();
    setLoading(true);
    setError(null);
    try {
      const data = await freeTextSearchMovies(query);
      setMovies(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async (filters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await filterMovies(filters);
      setMovies(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      <h1>CineAggregator</h1>
      <div className="controls">
        <SearchBar onSearch={handleSearch} onFreeTextSearch={handleFreeTextSearch} />
        <Filters onFilter={handleFilter} />
      </div>

      {loading && <Loading />}
      {error && <p className="error-message">{error}</p>}
      
      {!loading && !error && movies.length === 0 && (
        <p className="no-results">No movies found.</p>
      )}

      {!loading && !error && movies.length > 0 && (
        <div className="movies-grid">
          {movies.map(movie => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
