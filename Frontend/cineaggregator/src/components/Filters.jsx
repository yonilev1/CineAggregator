import React, { useState } from 'react';

function Filters({ onFilter }) {
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('');
  const [platform, setPlatform] = useState('');
  const [minRating, setMinRating] = useState(0);

  const handleFilter = (e) => {
    e.preventDefault();
    onFilter({ genre, language, platform, minRating });
  };

  return (
    <form className="filters" onSubmit={handleFilter}>
      <select value={genre} onChange={(e) => setGenre(e.target.value)}>
        <option value="">All Genres</option>
        <option value="Action">Action</option>
        <option value="Comedy">Comedy</option>
        <option value="Drama">Drama</option>
        <option value="Sci-Fi">Sci-Fi</option>
        <option value="Thriller">Thriller</option>
      </select>

      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="">All Languages</option>
        <option value="English">English</option>
        <option value="Hebrew">Hebrew</option>
        <option value="French">French</option>
        <option value="Spanish">Spanish</option>
      </select>

      <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
        <option value="">All Platforms</option>
        <option value="Netflix">Netflix</option>
        <option value="Disney+">Disney+</option>
        <option value="Amazon Prime">Amazon Prime</option>
        <option value="Apple TV">Apple TV</option>
      </select>

      <div className="rating-filter">
        <label>Min Rating: {minRating}</label>
        <input 
          type="range" 
          min="0" max="10" step="0.5" 
          value={minRating} 
          onChange={(e) => setMinRating(e.target.value)} 
        />
      </div>

      <button type="submit">Filter</button>
    </form>
  );
}

export default Filters;
