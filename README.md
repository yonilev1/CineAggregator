# CineAggregator

## 1. Project Goal
CineAggregator is a full-stack movie aggregation and recommendation system. It fetches movie data from external APIs, processes and stores it, and provides an interactive interface for users to discover and filter movies.

## 2. Architecture
```
External Movie API → Python Collector → RabbitMQ → C# ASP.NET Core → MongoDB → REST API → React Frontend
```

## 3. Technologies
- C#, .NET 8, ASP.NET Core
- MongoDB
- RabbitMQ
- Python
- React, JavaScript
- Docker
- Serilog

## 4. Project Structure
```
CineAggregator/
├── Backend/
│   └── CineAggregator.Api/
├── Collector/
│   ├── collector.py
│   ├── rabbitmq.py
│   ├── requirements.txt
│   └── Dockerfile
├── Frontend/
│   └── cineaggregator/
├── docker-compose.yml
└── README.md
```

## 5. MongoDB
- **Database**: `CineAggregator`
- **Collection**: `movies`
- **Example Document**:
```json
{
  "id": "12345",
  "title": "Example Movie",
  "description": "An example overview of the movie.",
  "posterUrl": "https://image.tmdb.org/t/p/w500/example.jpg",
  "releaseYear": 2024,
  "genres": ["Action", "Sci-Fi"],
  "languages": ["English"],
  "platforms": ["Netflix", "Amazon Prime"],
  "ratings": [
    { "source": "TMDb", "score": 8.5, "votes": 1200 }
  ]
}
```

## 6. RabbitMQ
- **Queue**: `movies`
- **Message Flow**: The Python collector publishes movies (JSON) to the `movies` queue. The C# ASP.NET Core backend consumes messages from this queue and inserts/updates them in MongoDB.

## 7. Python Collector
The `Collector` uses the TMDb API to fetch popular movies and sends them to RabbitMQ. It formats the data, extracts genres, seeds platform availability randomly based on movie ID, and packages the content into our system's expected schema.

## 8. Backend
An ASP.NET Core Web API that uses a hosted service to continuously consume from RabbitMQ and store data into MongoDB. It also exposes standard REST endpoints for the frontend to query movies.

## 9. Frontend
A React Single Page Application (SPA) providing features like searching, filtering, viewing movie details, and viewing personalized recommendations.

## 10. Aggregated Rating Formula
The overall aggregated rating across all sources for a movie is calculated as:
```
Sum(Score × Votes) / Sum(Votes)
```

## 11. Weighted Recommendation Formula
To rank movies based on user preferences:
```
FinalScore = (RatingScore × RatingWeight) + (GenreScore × GenreWeight) + (PlatformScore × PlatformWeight)
```

## 12. Environment Variables

| Variable | Description |
|---|---|
| `MOVIE_API_KEY` | TMDb API key for the collector |
| `MOVIE_API_URL` | TMDb base URL |
| `RABBITMQ_HOST` | RabbitMQ host name/IP |
| `MongoDb__ConnectionString` | MongoDB connection string |
| `MongoDb__DatabaseName` | MongoDB database name |

## 13. Docker Instructions
To run the entire system using Docker Compose:
```bash
docker-compose up --build
```
Ensure that `MOVIE_API_KEY` is exported in your terminal before running.

## 14. Local Development
- **MongoDB & RabbitMQ**: Can be run via `docker-compose up mongodb rabbitmq -d`
- **Backend**: Navigate to `Backend/CineAggregator.Api` and run `dotnet run`
- **Collector**: Navigate to `Collector`, install `pip install -r requirements.txt`, export env vars, and run `python collector.py`
- **Frontend**: Navigate to `Frontend/cineaggregator` and run `npm start`

## 15. API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/movies` | Get a paginated list of movies, with optional filtering/search |
| GET | `/api/movies/{id}` | Get a specific movie by ID |
| POST | `/api/movies/recommendations` | Get personalized movie recommendations |
