import { getToken } from './authService';

const API_URL = "http://localhost:5000/api/movies";

const getHeaders = () => ({
    "Authorization": "Bearer " + getToken(),
    "Content-Type": "application/json"
});

export async function getMovies() {
    const response = await fetch(API_URL, { headers: getHeaders() });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
}

export async function getMovie(id) {
    const response = await fetch(`${API_URL}/${id}`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
}

export async function searchMovies(query) {
    const response = await fetch(`${API_URL}/search?query=${encodeURIComponent(query)}`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
}

export async function freeTextSearchMovies(query) {
    const response = await fetch(`${API_URL}/search/freetext?query=${encodeURIComponent(query)}`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
}

export async function filterMovies(filters) {
    const params = new URLSearchParams();
    if (filters.genre) params.append("genre", filters.genre);
    if (filters.language) params.append("language", filters.language);
    if (filters.platform) params.append("platform", filters.platform);
    if (filters.minRating) params.append("minRating", filters.minRating);
    const response = await fetch(`${API_URL}/filter?${params.toString()}`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
}

export async function getRecommendations(preferences) {
    const response = await fetch(`${API_URL}/recommend`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(preferences)
    });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
}

export async function deleteMovie(id) {
    const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: getHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch");
}
