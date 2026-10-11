using CineAggregator.Api.Models;
using CineAggregator.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;

namespace CineAggregator.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MoviesController : ControllerBase
    {
        private readonly MovieService _movieService;
        private readonly ILogger<MoviesController> _logger;
        private readonly TmdbCatalogService _tmdbCatalogService;

        public MoviesController(MovieService movieService, TmdbCatalogService tmdbCatalogService, ILogger<MoviesController> logger)
        {
            _movieService = movieService;
            _tmdbCatalogService = tmdbCatalogService;
            _logger = logger;
        }

        [HttpGet]
        public ActionResult<List<Movie>> GetAllMovies()
        {
            return Ok(_movieService.GetAllMovies());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Movie>> GetMovieById(string id, CancellationToken cancellationToken)
        {
            var movie = _movieService.GetMovieById(id);
            if (movie == null)
            {
                return NotFound();
            }

            try
            {
                await _tmdbCatalogService.PopulateMovieDetailsAsync(movie, cancellationToken);
            }
            catch (Exception ex) when (ex is HttpRequestException || ex is InvalidOperationException)
            {
                // Keep the local movie details page usable if TMDb metadata is temporarily unavailable.
                _logger.LogWarning(ex, "Could not load cast/watch metadata for movie {MovieId}", id);
            }

            try
            {
                movie.RelatedMovies = await _tmdbCatalogService.GetRelatedMoviesAsync(id, cancellationToken);
            }
            catch (Exception ex) when (ex is HttpRequestException || ex is InvalidOperationException)
            {
                // Details should still be available if the external related-title lookup fails.
                _logger.LogWarning(ex, "Could not load related TMDb titles for movie {MovieId}", id);
                movie.RelatedMovies = new List<Movie>();
            }

            return Ok(movie);
        }

        [HttpGet("search")]
        public ActionResult<List<Movie>> SearchMovies([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest("Query cannot be empty.");
            }
            return Ok(_movieService.SearchMovies(query));
        }

        [HttpGet("actor/{personId:int}/movies")]
        public async Task<IActionResult> GetMoviesByActor(
            int personId, [FromQuery] int page = 1, [FromQuery] string? genre = null,
            [FromQuery] string? language = null, [FromQuery] string? platform = null,
            [FromQuery] double? minRating = null, [FromQuery] string? sortBy = "relevance",
            CancellationToken cancellationToken = default)
        {
            try
            {
                var result = await _tmdbCatalogService.GetMoviesByActorAsync(
                    personId, page, genre, language, platform, minRating, sortBy, cancellationToken);
                return Ok(result);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "TMDb actor filmography request failed for person {PersonId}", personId);
                return StatusCode(502, "The external movie catalogue is temporarily unavailable.");
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "External movie catalogue is not configured");
                return StatusCode(503, ex.Message);
            }
        }

        [HttpGet("search/freetext")]
        public async Task<IActionResult> FreeTextSearch(
            [FromQuery] string? query, [FromQuery] int page = 1, [FromQuery] string? genre = null,
            [FromQuery] string? language = null, [FromQuery] string? platform = null,
            [FromQuery] double? minRating = null, [FromQuery] string? sortBy = "relevance", CancellationToken cancellationToken = default)
        {
            try
            {
                var result = await _tmdbCatalogService.SearchPageAsync(query, page, genre, language, platform, minRating, sortBy, cancellationToken);
                return Ok(result);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "External movie catalogue request failed");
                return StatusCode(502, "The external movie catalogue is temporarily unavailable.");
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "External movie catalogue is not configured");
                return StatusCode(503, ex.Message);
            }
        }

        [HttpGet("filter")]
        public ActionResult<List<Movie>> FilterMovies([FromQuery] string genre, [FromQuery] string language, [FromQuery] string platform, [FromQuery] double? minRating)
        {
            return Ok(_movieService.FilterMovies(genre, language, platform, minRating));
        }

        [HttpPost("recommend")]
        public ActionResult<List<RecommendationResult>> GetRecommendations([FromBody] SearchRequest request)
        {
            try
            {
                var results = _movieService.GetRecommendations(request);
                return Ok(results);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
