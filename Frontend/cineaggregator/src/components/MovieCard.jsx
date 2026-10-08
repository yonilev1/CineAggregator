import React from 'react';
import { Link } from 'react-router-dom';
import { getRole } from '../services/authService';

function MovieCard({ movie, showScore, finalScore, onDelete }) {
  const poster = movie.posterUrl || "https://via.placeholder.com/300x450?text=No+Poster";
  
  return (
    <div className="movie-card">
      <img src={poster} alt={movie.title} className="movie-poster" />
      <div className="movie-content">
        <h3>{movie.title}</h3>
        <p className="movie-rating">⭐ {Number(movie.aggregatedRating).toFixed(2)}</p>
        {showScore && finalScore !== undefined && (
          <p className="match-score">Match: {(finalScore * 100).toFixed(0)}%</p>
        )}
        <p className="movie-genres">{(movie.genres || []).join(" | ")}</p>
        <p className="movie-details-small">
          {(movie.languages && movie.languages[0]) || "N/A"} • {(movie.platforms && movie.platforms[0]) || "N/A"}
        </p>
        <Link to={`/movie/${movie.id}`} className="btn-view-details">View Details</Link>
        {getRole() === 'Admin' && (
          <button className="btn-delete" onClick={(e) => { e.preventDefault(); onDelete && onDelete(movie.id); }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default MovieCard;
