namespace CineAggregator.Api.Models
{
    public class SearchRequest
    {
        public string Query { get; set; }
        public string Genre { get; set; }
        public string Language { get; set; }
        public string Platform { get; set; }
        public double RatingWeight { get; set; }
        public double GenreWeight { get; set; }
        public double PlatformWeight { get; set; }
    }

    public class RecommendationResult
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public double AggregatedRating { get; set; }
        public double FinalScore { get; set; }
    }
}
