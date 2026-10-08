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
    }
}
