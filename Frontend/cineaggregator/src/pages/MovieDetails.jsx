import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMovie } from '../services/movieService';
import Loading from '../components/Loading';

function MovieDetails() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true);
      try {
        const data = await getMovie(id);
        setMovie(data);
      } catch (err) {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <p className="error-message">{error}</p>;
  if (!movie) return <p className="no-results">Movie not found.</p>;

  const poster = movie.posterUrl || "https://via.placeholder.com/400x600?text=No+Poster";

  return (
    <div className="movie-details">
      <Link to="/" className="btn-back">← Back</Link>
      <div className="details-container">
        <img src={poster} alt={movie.title} className="details-poster" />
        <div className="details-info">
          <h2>{movie.title} ({movie.releaseYear})</h2>
          <h3 className="movie-rating">⭐ {Number(movie.aggregatedRating).toFixed(2)}</h3>
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
                <li key={i}>{r.source}: {r.score}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovieDetails;
