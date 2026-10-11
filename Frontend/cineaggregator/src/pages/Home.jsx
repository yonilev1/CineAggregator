import React, { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import Filters from '../components/Filters';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { getCatalogPage, searchMovies, freeTextSearchMovies, filterMovies } from '../services/movieService';

function Home() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ genre: '', language: '', platform: '', minRating: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  useEffect(() => { loadPage(1, '', filters, false); }, []);

  const loadPage = async (requestedPage, activeQuery, activeFilters, append) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const data = await getCatalogPage({ query: activeQuery, page: requestedPage, filters: activeFilters, sortBy });
      const results = data.results || [];
      setMovies(current => append ? [...current, ...results.filter(m => !current.some(old => old.id === m.id))] : results);
      setPage(data.page || requestedPage);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); setLoadingMore(false); }
  };

  const handleSearch = async (nextQuery) => {
    const q = (nextQuery || '').trim();
    setQuery(q);
    await loadPage(1, q, filters, false);
  };

  const handleFreeTextSearch = async (nextQuery) => {
    const q = (nextQuery || '').trim();
    setQuery(q);
    await loadPage(1, q, filters, false);
  };

  const handleFilter = async (nextFilters) => {
    const normalized = { ...nextFilters, minRating: Number(nextFilters.minRating || 0) };
    setFilters(normalized);
    // Applying filters must keep and use whatever is currently typed in the search box.
    await loadPage(1, query, normalized, false);
  };

  const handleShowMore = () => loadPage(page + 1, query, filters, true);

  const handleSortChange = async (event) => {
    const nextSort = event.target.value;
    setSortBy(nextSort);
    // Restart pagination when sort order changes, keeping the current query and filters.
    setLoading(true);
    setError(null);
    try {
      const data = await getCatalogPage({ query, page: 1, filters, sortBy: nextSort });
      setMovies(data.results || []);
      setPage(data.page || 1);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="home-page">
      <h1>CineAggregator</h1>
      <div className="controls">
        <SearchBar query={query} onQueryChange={setQuery} onSearch={handleSearch} onFreeTextSearch={handleFreeTextSearch} />
        <Filters onFilter={handleFilter} />
        <div className="sort-controls">
          <label htmlFor="movie-sort">Sort by</label>
          <select id="movie-sort" value={sortBy} onChange={handleSortChange}>
            <option value="relevance">Best match</option>
            <option value="newest">Newest releases</option>
            <option value="top-rated">Top rated</option>
            <option value="popular">Most popular</option>
            <option value="year-asc">Oldest releases</option>
            <option value="year-desc">Release year: newest first</option>
          </select>
        </div>
      </div>
      {loading && <Loading />}
      {error && <p className="error-message">{error}</p>}
      {!loading && !error && movies.length === 0 && <p className="no-results">No movies found. Try another query or remove some filters.</p>}
      {!loading && movies.length > 0 && (
        <div className="movies-grid">{movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}</div>
      )}
      {!loading && hasMore && (
        <div className="show-more-container">
          <button type="button" onClick={handleShowMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Show More'}
          </button>
        </div>
      )}
      {loadingMore && <Loading />}
    </div>
  );
}

export default Home;
