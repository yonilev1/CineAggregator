using CineAggregator.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Linq;

namespace CineAggregator.Api.Database
{
    public class MongoDbService
    {
        private readonly IMongoCollection<Movie> _movies;
        private readonly IMongoCollection<User> _users;
        private readonly ILogger<MongoDbService> _logger;

        public MongoDbService(IConfiguration config, ILogger<MongoDbService> logger)
        {
            _logger = logger;
            var connectionString = config["MongoDb:ConnectionString"] ?? "mongodb://localhost:27017";
            var databaseName = config["MongoDb:DatabaseName"] ?? "CineAggregator";

            var client = new MongoClient(connectionString);
            var database = client.GetDatabase(databaseName);
            _movies = database.GetCollection<Movie>("movies");
            _users = database.GetCollection<User>("users");
            SeedUsers();
        }

        public List<Movie> GetAllMovies()
        {
            return _movies.Find(movie => true).ToList();
        }

        public Movie GetMovieById(string id)
        {
            return _movies.Find(m => m.Id == id).FirstOrDefault();
        }

        public List<Movie> SearchMovies(string query)
        {
            var filter = Builders<Movie>.Filter.Regex("title", new BsonRegularExpression(query, "i")) |
                         Builders<Movie>.Filter.Regex("description", new BsonRegularExpression(query, "i"));
            return _movies.Find(filter).ToList();
        }

        public List<Movie> FreeTextSearchMovies(string query)
        {
            var stopWords = new HashSet<string> { "i", "a", "an", "the", "want", "where", "with", "about", "movie", "film", "show", "me", "find", "get", "is", "are", "was", "were", "to", "of", "in", "on", "and", "or", "that", "this", "it", "for", "has", "have", "do", "does" };

            var words = query.Split(' ', System.StringSplitOptions.RemoveEmptyEntries)
                             .Select(w => w.Trim().ToLower())
                             .Where(w => w.Length > 2 && !stopWords.Contains(w))
                             .ToList();

            if (!words.Any())
                return new List<Movie>();

            var filters = new List<FilterDefinition<Movie>>();
            foreach (var word in words)
            {
                var wordFilter = Builders<Movie>.Filter.Regex("title", new BsonRegularExpression(word, "i")) |
                                 Builders<Movie>.Filter.Regex("description", new BsonRegularExpression(word, "i")) |
                                 Builders<Movie>.Filter.Regex("genres", new BsonRegularExpression(word, "i"));
                filters.Add(wordFilter);
            }

            var combined = Builders<Movie>.Filter.Or(filters);
            return _movies.Find(combined).ToList();
        }

        public List<Movie> FilterMovies(string genre, string language, string platform, double? minRating)
        {
            var builder = Builders<Movie>.Filter;
            var filter = builder.Empty;

            if (!string.IsNullOrEmpty(genre))
                filter &= builder.Regex("genres", new BsonRegularExpression(genre, "i"));

            if (!string.IsNullOrEmpty(language))
                filter &= builder.Regex("languages", new BsonRegularExpression(language, "i"));

            if (!string.IsNullOrEmpty(platform))
                filter &= builder.Regex("platforms", new BsonRegularExpression(platform, "i"));

            if (minRating.HasValue)
                filter &= builder.Gte(m => m.AggregatedRating, minRating.Value);

            return _movies.Find(filter).ToList();
        }

        public void InsertMovie(Movie movie)
        {
            _movies.InsertOne(movie);
        }

        public void UpdateMovie(Movie movie)
        {
            _movies.ReplaceOne(m => m.Id == movie.Id, movie);
        }

        public Movie GetMovieByExternalId(string id)
        {
            return _movies.Find(m => m.Id == id).FirstOrDefault();
        }

        public User GetUserByUsername(string username) => _users.Find(u => u.Username == username).FirstOrDefault();

        public void DeleteMovie(string id) => _movies.DeleteOne(m => m.Id == id);

        private void SeedUsers()
        {
            if (!_users.Find(_ => true).Any())
            {
                _users.InsertMany(new[]
                {
                    new User { Username = "admin", Password = "admin", Role = "Admin" },
                    new User { Username = "user", Password = "user", Role = "User" }
                });
            }
        }
    }
}
