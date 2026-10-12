using System.Collections.Generic;

namespace CineAggregator.Api.Models
{
    public class MovieSuggestionDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int ReleaseYear { get; set; }
        public string PosterUrl { get; set; } = string.Empty;
        public double AggregatedRating { get; set; }
        public List<string> Genres { get; set; } = new();
    }
}
