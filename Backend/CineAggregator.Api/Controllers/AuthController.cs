using CineAggregator.Api.Database;
using CineAggregator.Api.Models;
using CineAggregator.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CineAggregator.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly MongoDbService _mongoDbService;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthController> _logger;

        public AuthController(MongoDbService mongoDbService, IConfiguration config, ILogger<AuthController> logger)
        {
            _mongoDbService = mongoDbService;
            _config = config;
            _logger = logger;
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username and password are required." });
            }

            if (request.Username.Length < 3)
            {
                return BadRequest(new { message = "Username must be at least 3 characters." });
            }

            if (request.Password.Length < 4)
            {
                return BadRequest(new { message = "Password must be at least 4 characters." });
            }

            var settings = _mongoDbService.GetSettings();
            if (!settings.EnablePublicRegistration)
            {
                return BadRequest(new { message = "Public user registration is currently disabled by administrator." });
            }

            var existingUser = _mongoDbService.GetUserByUsername(request.Username);
            if (existingUser != null)
            {
                return Conflict(new { message = "Username is already taken." });
            }

            var user = new User
            {
                Username = request.Username.Trim(),
                PasswordHash = PasswordHelper.HashPassword(request.Password),
                Role = "User", // All self-registered users are regular "User"
                CreatedAt = DateTime.UtcNow
            };

            _mongoDbService.CreateUser(user);
            _logger.LogInformation("New user registered: {Username}", user.Username);

            var token = GenerateJwtToken(user);

            return Ok(new AuthResponse
            {
                Token = token,
                Username = user.Username,
                Role = user.Role
            });
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username and password are required." });
            }

            var user = _mongoDbService.GetUserByUsername(request.Username);
            if (user == null || !PasswordHelper.VerifyPassword(user.PasswordHash, request.Password))
            {
                return Unauthorized(new { message = "Invalid username or password." });
            }

            var token = GenerateJwtToken(user);
            _logger.LogInformation("User logged in: {Username} ({Role})", user.Username, user.Role);

            return Ok(new AuthResponse
            {
                Token = token,
                Username = user.Username,
                Role = user.Role
            });
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult GetCurrentUser()
        {
            var username = User.Identity?.Name ?? User.FindFirst(ClaimTypes.Name)?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "User";

            if (string.IsNullOrEmpty(username))
            {
                return Unauthorized();
            }

            return Ok(new
            {
                username = username,
                role = role
            });
        }

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _config["Jwt:Key"] ?? "CineAggregatorSuperSecretKeyForJwtAuthentication2026!";
            var jwtIssuer = _config["Jwt:Issuer"] ?? "CineAggregator";
            var jwtAudience = _config["Jwt:Audience"] ?? "CineAggregator";

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id ?? user.Username),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
