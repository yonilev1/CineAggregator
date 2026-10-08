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

        public MoviesController(MovieService movieService, ILogger<MoviesController> logger)
        {
            _movieService = movieService;
            _logger = logger;
        }

        [HttpGet]
        public ActionResult<List<Movie>> GetAllMovies()
        {
            return Ok(_movieService.GetAllMovies());
        }

        [HttpGet("{id}")]
        public ActionResult<Movie> GetMovieById(string id)
        {
            var movie = _movieService.GetMovieById(id);
            if (movie == null)
            {
                return NotFound();
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

        [HttpGet("search/freetext")]
        public ActionResult<List<Movie>> FreeTextSearch([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest("Query cannot be empty.");
            }
            return Ok(_movieService.FreeTextSearchMovies(query));
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
