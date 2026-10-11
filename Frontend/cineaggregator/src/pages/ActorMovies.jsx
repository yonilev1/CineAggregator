import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Filters from '../components/Filters';
import Loading from '../components/Loading';
import MovieCard from '../components/MovieCard';
import { getMoviesByActor } from '../services/movieService';

function ActorMovies() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const actorName = searchParams.get('name') || 'Actor';
  const [movies, setMovies] = useState([]);
  const [filters, setFilters] = useState({ genre: '', language: '', platform: '', minRating: 0 });
  const [sortBy, setSortBy] = useState('popular');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const loadPage = useCallback(async (requestedPage, activeFilters, activeSort, append) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const data = await getMoviesByActor(id, { page: requestedPage, filters: activeFilters, sortBy: activeSort });
      const results = data.results || [];
      setMovies(current => append ? [...current, ...results.filter(m => !current.some(old => old.id === m.id))] : results);
      setPage(data.page || requestedPage);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err.message || 'Could not load movies for this actor.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id]);

  useEffect(() => { loadPage(1, filters, sortBy, false); }, [id, loadPage]);

  const handleFilter = (nextFilters) => {
    const normalized = { ...nextFilters, minRating: Number(nextFilters.minRating || 0) };
    setFilters(normalized);
    loadPage(1, normalized, sortBy, false);
  };

  const handleSortChange = (event) => {
    const nextSort = event.target.value;
    setSortBy(nextSort);
    loadPage(1, filters, nextSort, false);
  };

  return (
    <div className="home-page actor-movies-page">
      <Link to="/" className="btn-back">← Back to all movies</Link>
      <h1>Movies featuring {actorName}</h1>
      <p className="actor-search-description">Filmography from TMDb for this actor.</p>
      <div className="controls">
        <Filters onFilter={handleFilter} />
        <div className="sort-controls">
          <label htmlFor="actor-movie-sort">Sort by</label>
          <select id="actor-movie-sort" value={sortBy} onChange={handleSortChange}>
            <option value="popular">Most popular</option>
            <option value="newest">Newest releases</option>
            <option value="top-rated">Top rated</option>
            <option value="year-asc">Oldest releases</option>
            <option value="year-desc">Release year: newest first</option>
          </select>
        </div>
      </div>
      {loading && <Loading />}
      {error && <p className="error-message">{error}</p>}
      {!loading && !error && movies.length === 0 && <p className="no-results">No movies found for {actorName} with these filters.</p>}
      {!loading && movies.length > 0 && <div className="movies-grid">{movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}</div>}
      {!loading && hasMore && (
        <div className="show-more-container">
          <button type="button" onClick={() => loadPage(page + 1, filters, sortBy, true)} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Show More'}
          </button>
        </div>
      )}
      {loadingMore && <Loading />}
    </div>
  );
}

export default ActorMovies;
