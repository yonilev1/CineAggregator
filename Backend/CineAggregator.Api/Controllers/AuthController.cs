using CineAggregator.Api.Database;
using CineAggregator.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
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

        public AuthController(MongoDbService mongoDbService, IConfiguration config)
        {
            _mongoDbService = mongoDbService;
            _config = config;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            Console.WriteLine($"Login attempt for username: '{request?.Username}' with password: '{request?.Password}'");
            if (request == null || string.IsNullOrEmpty(request.Username))
            {
                return BadRequest("Request or username is empty");
            }

            var user = _mongoDbService.GetUserByUsername(request.Username);
            Console.WriteLine($"Found user: {user != null}");
            if (user != null) {
                Console.WriteLine($"Expected pass: '{user.Password}', Got: '{request.Password}'");
            }

            if (user == null || user.Password != request.Password)
            {
                return Unauthorized("Invalid credentials");
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Role, user.Role)
                }),
                Expires = DateTime.UtcNow.AddHours(1),
                Issuer = _config["Jwt:Issuer"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return Ok(new LoginResponse
            {
                Token = tokenHandler.WriteToken(token),
                Role = user.Role
            });
        }
    }
}
