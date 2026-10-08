import React, { useState } from 'react';

function SearchBar({ onSearch, onFreeTextSearch }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('exact');

  const handleSearch = (e) => {
    e.preventDefault();
    if (mode === 'freetext') {
      onFreeTextSearch(query);
    } else {
      onSearch(query);
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSearch}>
      <input 
        type="text" 
        placeholder={mode === 'exact' ? "Search by title..." : "Describe what you want..."} 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
      />
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
  );
}

export default SearchBar;
