using CineAggregator.Api.Database;
using CineAggregator.Api.Models;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;

namespace CineAggregator.Api.Services
{
    public class MovieService
    {
        private readonly MongoDbService _mongoDbService;
        private readonly ILogger<MovieService> _logger;

        public MovieService(MongoDbService mongoDbService, ILogger<MovieService> logger)
        {
            _mongoDbService = mongoDbService;
            _logger = logger;
        }

        public List<Movie> GetAllMovies() => _mongoDbService.GetAllMovies();

        public Movie GetMovieById(string id) => _mongoDbService.GetMovieById(id);

        public void DeleteMovie(string id) => _mongoDbService.DeleteMovie(id);

        public List<Movie> SearchMovies(string query) => _mongoDbService.SearchMovies(query);

        public List<Movie> FreeTextSearchMovies(string query) => _mongoDbService.FreeTextSearchMovies(query);

        public List<Movie> FilterMovies(string genre, string language, string platform, double? minRating) => 
            _mongoDbService.FilterMovies(genre, language, platform, minRating);

        public double CalculateAggregatedRating(List<Rating> ratings)
        {
            if (ratings == null || !ratings.Any()) return 0;
            
            double totalScore = 0;
            int totalVotes = 0;
            
            foreach (var r in ratings)
            {
                totalScore += r.Score * r.Votes;
                totalVotes += r.Votes;
            }
            
            if (totalVotes == 0) return 0;
            
            return totalScore / totalVotes;
        }

        public void ProcessMovie(Movie movie)
        {
            movie.AggregatedRating = CalculateAggregatedRating(movie.Ratings);
            
            var existing = _mongoDbService.GetMovieByExternalId(movie.Id);
            if (existing == null)
            {
                _mongoDbService.InsertMovie(movie);
            }
            else
            {
                _mongoDbService.UpdateMovie(movie);
            }
        }

        public List<RecommendationResult> GetRecommendations(SearchRequest request)
        {
            double sum = request.RatingWeight + request.GenreWeight + request.PlatformWeight;
            if (Math.Abs(sum - 1.0) > 0.01)
            {
                throw new ArgumentException("Weights must sum to 1.0");
            }

            var movies = _mongoDbService.GetAllMovies();

            if (!string.IsNullOrEmpty(request.Language))
            {
                movies = movies.Where(m => m.Languages.Any(l => l.Equals(request.Language, StringComparison.OrdinalIgnoreCase))).ToList();
            }

            var results = new List<RecommendationResult>();

            foreach (var movie in movies)
            {
                double ratingScore = movie.AggregatedRating / 10.0;
                
                double genreScore = 0;
                if (!string.IsNullOrEmpty(request.Genre) && movie.Genres.Any(g => g.Equals(request.Genre, StringComparison.OrdinalIgnoreCase)))
                {
                    genreScore = 1;
                }

                double platformScore = 0;
                if (!string.IsNullOrEmpty(request.Platform) && movie.Platforms.Any(p => p.Equals(request.Platform, StringComparison.OrdinalIgnoreCase)))
                {
                    platformScore = 1;
                }

                double finalScore = (ratingScore * request.RatingWeight) + 
                                    (genreScore * request.GenreWeight) + 
                                    (platformScore * request.PlatformWeight);
                
                results.Add(new RecommendationResult
                {
                    Id = movie.Id,
                    Title = movie.Title,
                    AggregatedRating = movie.AggregatedRating,
                    FinalScore = Math.Round(finalScore, 2)
                });
            }

            return results.OrderByDescending(r => r.FinalScore).ToList();
        }
    }
}
