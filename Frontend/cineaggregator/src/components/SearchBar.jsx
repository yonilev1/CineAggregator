import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMovieSuggestions } from '../services/movieService';

function SearchBar({ query, onQueryChange, onSearch, onFreeTextSearch }) {
  const [mode, setMode] = useState('exact');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const cacheRef = useRef(new Map());
  const navigate = useNavigate();

  // Handle typing with debounce and request cancellation
  useEffect(() => {
    const trimmed = (query || '').trim();

    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      setSelectedIndex(-1);
      return;
    }

    // Check query cache first
    const cacheKey = trimmed.toLowerCase();
    if (cacheRef.current.has(cacheKey)) {
      setSuggestions(cacheRef.current.get(cacheKey));
      setIsOpen(true);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      // Abort previous request if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setIsOpen(true);
      setSelectedIndex(-1);

      try {
        const results = await getMovieSuggestions(trimmed, 8, controller.signal);
        cacheRef.current.set(cacheKey, results);
        setSuggestions(results);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setIsOpen(false);

    if (mode === 'freetext') {
      onFreeTextSearch(query);
    } else {
      onSearch(query);
    }
  };

  const handleSelectSuggestion = (movie) => {
    setIsOpen(false);
    onQueryChange(movie.title);
    navigate(`/movie/${encodeURIComponent(movie.id)}`);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        handleSearchSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className="search-bar-wrapper" ref={containerRef}>
      <form className="search-bar" onSubmit={handleSearchSubmit}>
        <div className="search-input-container">
          <input
            type="text"
            placeholder={mode === 'exact' ? "Search by title (e.g. Harry Potter)..." : "Describe what you want (e.g. space exploration)..."}
            value={query || ''}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              if ((query || '').trim().length >= 2) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="search-suggestions-dropdown"
          />
          {isLoading && <span className="input-search-spinner" aria-label="Loading suggestions...">⏳</span>}
        </div>

        <div className="search-mode">
          <label>
            <input type="radio" name="mode" value="exact" checked={mode === 'exact'} onChange={() => setMode('exact')} />
            Exact
          </label>
          <label>
            <input type="radio" name="mode" value="freetext" checked={mode === 'freetext'} onChange={() => setMode('freetext')} />
            Free Text
          </label>
        </div>
        <button type="submit">Search</button>
      </form>

      {/* Live Suggestions Dropdown */}
      {isOpen && (query || '').trim().length >= 2 && (
        <ul id="search-suggestions-dropdown" className="suggestions-dropdown" role="listbox">
          {isLoading && suggestions.length === 0 && (
            <li className="suggestion-status-item">
              <span className="spinner-small"></span> Finding matching movies...
            </li>
          )}

          {!isLoading && suggestions.length === 0 && (
            <li className="suggestion-status-item no-matches">
              No matching movie suggestions found. Press Enter to perform full catalog search.
            </li>
          )}

          {suggestions.map((movie, index) => (
            <li
              key={movie.id}
              role="option"
              aria-selected={selectedIndex === index}
              className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
              onClick={() => handleSelectSuggestion(movie)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <img
                src={movie.posterUrl || "https://via.placeholder.com/90x135?text=No+Poster"}
                alt=""
                className="suggestion-poster"
                loading="lazy"
              />
              <div className="suggestion-info">
                <div className="suggestion-title-row">
                  <strong className="suggestion-title">{movie.title}</strong>
                  {movie.releaseYear > 0 && (
                    <span className="suggestion-year">({movie.releaseYear})</span>
                  )}
                </div>
                <div className="suggestion-meta">
                  {movie.aggregatedRating > 0 && (
                    <span className="suggestion-rating">⭐ {movie.aggregatedRating.toFixed(1)}</span>
                  )}
                  {movie.genres && movie.genres.length > 0 && (
                    <span className="suggestion-genres">
                      {movie.genres.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;
