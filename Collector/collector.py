import os
import time
import requests
import random
from rabbitmq import get_connection, send_movie

GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
    53: "Thriller", 10752: "War", 37: "Western"
}

LANGUAGE_MAP = {
    "en": "English", "he": "Hebrew", "fr": "French",
    "es": "Spanish", "de": "German", "ja": "Japanese",
    "ko": "Korean", "zh": "Chinese", "hi": "Hindi",
    "it": "Italian", "pt": "Portuguese", "ru": "Russian"
}

def fetch_popular_movies(api_key, base_url):
    movies = []
    for page in range(1, 4):
        print(f"Fetching page {page}...")
        response = requests.get(f"{base_url}/movie/popular", params={"api_key": api_key, "page": page})
        response.raise_for_status()
        data = response.json()
        
        for item in data.get("results", []):
            tmdb_id = item.get("id")
            
            random.seed(tmdb_id)
            platforms = random.sample(["Netflix", "Disney+", "Amazon Prime", "Apple TV"], random.randint(1, 2))
            
            movie = {
                "id": str(tmdb_id),
                "title": item.get("title", ""),
                "description": item.get("overview", ""),
                "posterUrl": f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}" if item.get("poster_path") else "",
                "releaseYear": int(item.get("release_date", "0")[:4]) if item.get("release_date") else 0,
                "genres": [GENRE_MAP.get(g, "Unknown") for g in item.get("genre_ids", [])],
                "languages": [LANGUAGE_MAP.get(item.get("original_language", ""), "Unknown")],
                "platforms": platforms,
                "ratings": [{"source": "TMDb", "score": item.get("vote_average", 0), "votes": item.get("vote_count", 0)}]
            }
            movies.append(movie)
        
        time.sleep(0.25)
    
    return movies

def main():
    api_key = os.environ.get("MOVIE_API_KEY")
    base_url = os.environ.get("MOVIE_API_URL", "https://api.themoviedb.org/3")
    
    if not api_key:
        print("Error: MOVIE_API_KEY is not set.")
        return
        
    print("Connecting to RabbitMQ...")
    conn = get_connection()
    channel = conn.channel()
    
    print("Fetching popular movies from TMDb...")
    movies = fetch_popular_movies(api_key, base_url)
    
    print(f"Fetched {len(movies)} movies. Sending to RabbitMQ...")
    for movie in movies:
        send_movie(channel, movie)
        
    conn.close()
    print("Collection complete!")

if __name__ == "__main__":
    main()
