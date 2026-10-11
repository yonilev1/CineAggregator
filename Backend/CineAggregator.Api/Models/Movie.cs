using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace CineAggregator.Api.Models
{
    public class Movie
    {
        [BsonId]
        [BsonRepresentation(BsonType.String)]
        public string Id { get; set; }
        
        [BsonElement("title")]
        public string Title { get; set; }
        
        [BsonElement("description")]
        public string Description { get; set; }
        
        [BsonElement("posterUrl")]
        public string PosterUrl { get; set; }
        
        [BsonElement("releaseYear")]
        public int ReleaseYear { get; set; }
        
        [BsonElement("genres")]
        public List<string> Genres { get; set; } = new();
        
        [BsonElement("languages")]
        public List<string> Languages { get; set; } = new();
        
        [BsonElement("platforms")]
        public List<string> Platforms { get; set; } = new();
        
        [BsonElement("ratings")]
        public List<Rating> Ratings { get; set; } = new();
        
        [BsonElement("aggregatedRating")]
        public double AggregatedRating { get; set; }

        [BsonElement("popularity")]
        public double Popularity { get; set; }

        // Filled from TMDb when opening the details page; not persisted to MongoDB.
        [BsonIgnore]
        public List<Movie> RelatedMovies { get; set; } = new();

        // Detail-page metadata is fetched live from TMDb and is not stored in MongoDB.
        [BsonIgnore]
        public List<CastMember> Cast { get; set; } = new();

        [BsonIgnore]
        public List<WatchProvider> WatchProviders { get; set; } = new();

        [BsonIgnore]
        public string WatchProvidersUrl { get; set; } = string.Empty;
    }

    public class CastMember
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Character { get; set; } = string.Empty;
        public string? ProfileUrl { get; set; }
    }

    public class WatchProvider
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
    }
}
