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

## 16. Improved free-text search and catalogue refresh

`GET /api/movies/search/freetext?query=...` now searches TMDb movie and TV catalogues as well as the local MongoDB collection. Results found remotely are stored locally. If an item already exists, its TMDb rating and vote count are refreshed on every search; locally-managed platform data is preserved. Common concept expansions (for example, immortality, reincarnation, hidden power, and isekai) broaden the search. Results are then ranked by text relevance and rating.

Configure at least one TMDb credential before running the backend:

- `Tmdb__ApiKey` (TMDb v3 API key), or
- `Tmdb__ReadAccessToken` (TMDb v4 read access token).

For local development, put the key in user secrets or an environment variable rather than committing a real key. Docker Compose can pass it with `Tmdb__ApiKey: ${MOVIE_API_KEY}` under the backend service.

No external API can practically return every film ever made in a single request. This implementation searches the external catalogue on demand and gradually caches returned results; `/api/movies` lists the items cached so far. Concept expansion is a practical baseline, not a true embedding-based semantic search.

## Search improvements (October 2026)

- Title-like queries are sent to TMDb as a full phrase instead of generating a separate external search for every word. Exact, prefix, and phrase title matches rank ahead of descriptive matches.
- Added sorting: best match, newest releases, top rated, most popular, oldest releases, and release year newest-first. The selected sorting and current filters are kept when loading the next page.
- The “Показать больше” button is centered below the results, with a larger font and red background.

After replacing the project files, rebuild and restart the containers from the folder containing `docker-compose.yml`:

```powershell
docker compose down
docker compose up -d --build
```

This rebuilds the frontend and backend with the updated code. Do not add `-v` to `docker compose down`, so the MongoDB data volume is preserved.


## 17. User Registration, Authentication, and Role-Based Access Control

The system supports secure JSON Web Token (JWT) authentication with two distinct user roles:

### Roles & Permissions

| Capability | Regular User (`User`) | Administrator (`Admin`) |
|---|---|---|
| Register new account | ✅ Yes | ❌ Self-registration creates `User` |
| Browse & search movies | ✅ Yes | ✅ Yes |
| Filter & view cast / providers | ✅ Yes | ✅ Yes |
| Personalized recommendations | ✅ Yes | ✅ Yes |
| Manage & recalculate ratings | ❌ Access Denied | ✅ Full control via Admin Panel & Movie Details |
| Modify administrative settings | ❌ Access Denied | ✅ Site announcement banner, registration toggle |
| Delete movies from catalog | ❌ Access Denied | ✅ Dedicated deletion capability |
| Access Admin Interface (`/admin`)| ❌ Access Denied | ✅ Protected dedicated UI |

### Pre-Seeded Default Accounts

When the application starts, it automatically seeds two accounts if they do not exist:

1. **Administrator**:
   - **Username**: `admin`
   - **Password**: `Admin123!`
   - **Role**: `Admin`

2. **Regular User**:
   - **Username**: `user`
   - **Password**: `User123!`
   - **Role**: `User`

### Authentication Endpoints

- `POST /api/auth/register` — Registers a regular user with role `User` and returns a JWT token.
- `POST /api/auth/login` — Authenticates credentials and returns a JWT token with the user's role.
- `GET /api/auth/me` — Protected endpoint returning current user details.

### Protected Administrative Endpoints (`[Authorize(Roles = "Admin")]`)

- `PUT /api/admin/movies/{id}/ratings` — Updates or adds rating sources for a movie and recalculates the weighted `AggregatedRating` using `Sum(Score × Votes) / Sum(Votes)`.
- `DELETE /api/admin/movies/{id}` — Permanently removes a movie from the local database.
- `GET /api/admin/settings` — Retrieves administrative configurations.
- `PUT /api/admin/settings` — Updates application-wide settings (e.g. site announcement banner, public registration toggle).
- `GET /api/admin/movies` — Lists stored movies for administrator management.
- `GET /api/admin/users` — Lists registered users and their assigned roles.
