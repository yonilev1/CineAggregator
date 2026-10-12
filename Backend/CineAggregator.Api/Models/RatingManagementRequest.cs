using System.Collections.Generic;

namespace CineAggregator.Api.Models
{
    public class UpdateRatingsRequest
    {
        public List<Rating> Ratings { get; set; } = new();
    }
}
