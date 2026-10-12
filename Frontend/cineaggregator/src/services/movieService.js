import { getToken } from './authService';

const API_URL = "http://localhost:5000/api/movies";
const ADMIN_URL = "http://localhost:5000/api/admin";

function getAuthHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

function buildCatalogUrl({ query = "", page = 1, filters = {}, sortBy = 'relevance' } = {}) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    params.set("page", String(page));
    params.set("sortBy", sortBy);
    if (filters.genre) params.set("genre", filters.genre);
    if (filters.language) params.set("language", filters.language);
    if (filters.platform) params.set("platform", filters.platform);
    if (filters.minRating !== undefined && filters.minRating !== null && Number(filters.minRating) > 0) params.set("minRating", String(filters.minRating));
    return `${API_URL}/search/freetext?${params.toString()}`;
}

export async function getCatalogPage(options = {}) {
    const response = await fetch(buildCatalogUrl(options), {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? { results: data, page: options.page || 1, hasMore: data.length >= 20 } : data;
}

export async function getMovies() {
    const page = await getCatalogPage({ page: 1 });
    return page.results;
}

export async function getMovie(id) {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch movie");
    return response.json();
}

export async function searchMovies(query, page = 1, filters = {}) {
    return getCatalogPage({ query, page, filters });
}

export async function freeTextSearchMovies(query, page = 1, filters = {}) {
    return getCatalogPage({ query, page, filters });
}

export async function filterMovies(filters, page = 1) {
    return getCatalogPage({ page, filters });
}

export async function getMovieSuggestions(query, limit = 8, signal = null) {
    if (!query || query.trim().length < 2) return [];
    const params = new URLSearchParams();
    params.set("query", query.trim());
    params.set("limit", String(limit));
    const response = await fetch(`${API_URL}/suggestions?${params.toString()}`, {
        headers: getAuthHeaders(),
        signal
    });
    if (!response.ok) return [];
    return response.json();
}

export async function getMoviesByActor(personId, options = {}) {
    const params = new URLSearchParams();
    params.set("page", String(options.page || 1));
    params.set("sortBy", options.sortBy || "relevance");
    const filters = options.filters || {};
    if (filters.genre) params.set("genre", filters.genre);
    if (filters.language) params.set("language", filters.language);
    if (filters.platform) params.set("platform", filters.platform);
    if (filters.minRating !== undefined && filters.minRating !== null && Number(filters.minRating) > 0) {
        params.set("minRating", String(filters.minRating));
    }
    const response = await fetch(`${API_URL}/actor/${encodeURIComponent(personId)}/movies?${params.toString()}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Actor movie search failed (${response.status})`);
    return response.json();
}

export async function getRecommendations(preferences) {
    const response = await fetch(`${API_URL}/recommend`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(preferences)
    });
    if (!response.ok) throw new Error("Failed to fetch recommendations");
    return response.json();
}

// ================= Public Settings =================
export async function getPublicSettings() {
    try {
        const response = await fetch(`${ADMIN_URL}/settings/public`);
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

// ================= Admin Operations =================
export async function getAdminSettings() {
    const response = await fetch(`${ADMIN_URL}/settings`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch administrative settings");
    return response.json();
}

export async function updateAdminSettings(settings) {
    const response = await fetch(`${ADMIN_URL}/settings`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error("Failed to update administrative settings");
    return response.json();
}

export async function updateMovieRatings(movieId, ratings) {
    const response = await fetch(`${ADMIN_URL}/movies/${encodeURIComponent(movieId)}/ratings`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ratings })
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to update movie ratings");
    }
    return response.json();
}

export async function deleteMovie(movieId) {
    const response = await fetch(`${ADMIN_URL}/movies/${encodeURIComponent(movieId)}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to delete movie");
    return true;
}

export async function getAdminMovies() {
    const response = await fetch(`${ADMIN_URL}/movies`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to load stored movies");
    return response.json();
}
