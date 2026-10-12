using MongoDB.Bson.Serialization.Attributes;

namespace CineAggregator.Api.Models
{
    public class AdminSettings
    {
        [BsonId]
        public string Id { get; set; } = "app_settings";

        [BsonElement("siteAnnouncement")]
        public string SiteAnnouncement { get; set; } = "Welcome to CineAggregator - Stream & Discover movies.";

        [BsonElement("enablePublicRegistration")]
        public bool EnablePublicRegistration { get; set; } = true;

        [BsonElement("maintenanceMode")]
        public bool MaintenanceMode { get; set; } = false;

        [BsonElement("defaultRecommendationLimit")]
        public int DefaultRecommendationLimit { get; set; } = 20;
    }
}
