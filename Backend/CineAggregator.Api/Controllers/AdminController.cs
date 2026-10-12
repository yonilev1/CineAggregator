using CineAggregator.Api.Database;
using CineAggregator.Api.Models;
using CineAggregator.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;

namespace CineAggregator.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly MongoDbService _mongoDbService;
        private readonly MovieService _movieService;
        private readonly ILogger<AdminController> _logger;

        public AdminController(MongoDbService mongoDbService, MovieService movieService, ILogger<AdminController> logger)
        {
            _mongoDbService = mongoDbService;
            _movieService = movieService;
            _logger = logger;
        }

        [AllowAnonymous]
        [HttpGet("settings/public")]
        public ActionResult<AdminSettings> GetPublicSettings()
        {
            var settings = _mongoDbService.GetSettings();
            return Ok(new
            {
                siteAnnouncement = settings.SiteAnnouncement,
                enablePublicRegistration = settings.EnablePublicRegistration,
                maintenanceMode = settings.MaintenanceMode,
                defaultRecommendationLimit = settings.DefaultRecommendationLimit
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("settings")]
        public ActionResult<AdminSettings> GetSettings()
        {
            return Ok(_mongoDbService.GetSettings());
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("settings")]
        public ActionResult<AdminSettings> UpdateSettings([FromBody] AdminSettings settings)
        {
            if (settings == null)
            {
                return BadRequest("Invalid settings payload.");
            }

            _mongoDbService.UpdateSettings(settings);
            _logger.LogInformation("Administrator updated application settings.");
            return Ok(settings);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("movies/{id}/ratings")]
        public ActionResult<Movie> UpdateMovieRatings(string id, [FromBody] UpdateRatingsRequest request)
        {
            if (request == null || request.Ratings == null)
            {
                return BadRequest("Ratings list cannot be null.");
            }

            // Ensure any movie without record gets fetched or initialized if needed
            var movie = _mongoDbService.GetMovieById(id);
            if (movie == null)
            {
                return NotFound($"Movie with ID '{id}' was not found in the local database.");
            }

            // Validate ratings
            foreach (var r in request.Ratings)
            {
                if (r.Score < 0 || r.Score > 10)
                {
                    return BadRequest($"Rating score for {r.Source} must be between 0 and 10.");
                }
                if (r.Votes < 0)
                {
                    return BadRequest($"Rating votes for {r.Source} cannot be negative.");
                }
            }

            var updatedMovie = _movieService.UpdateMovieRatings(id, request.Ratings);
            _logger.LogInformation("Administrator updated ratings for movie '{MovieId}'. New AggregatedRating: {Rating}", id, updatedMovie?.AggregatedRating);

            return Ok(updatedMovie);
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("movies/{id}")]
        public IActionResult DeleteMovie(string id)
        {
            var success = _movieService.DeleteMovie(id);
            if (!success)
            {
                return NotFound($"Movie with ID '{id}' not found.");
            }

            _logger.LogInformation("Administrator deleted movie '{MovieId}' from database.", id);
            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("movies")]
        public ActionResult<List<Movie>> GetStoredMovies()
        {
            return Ok(_movieService.GetAllMovies());
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("users")]
        public ActionResult<List<object>> GetUsers()
        {
            var users = _mongoDbService.GetAllUsers();
            var result = new List<object>();
            foreach (var u in users)
            {
                result.Add(new
                {
                    id = u.Id,
                    username = u.Username,
                    role = u.Role,
                    createdAt = u.CreatedAt
                });
            }
            return Ok(result);
        }
    }
}
