using MongoDB.Bson.Serialization.Attributes;

namespace CineAggregator.Api.Models
{
    public class Rating
    {
        [BsonElement("source")]
        public string Source { get; set; }
        
        [BsonElement("score")]
        public double Score { get; set; }
        
        [BsonElement("votes")]
        public int Votes { get; set; }
    }
}
