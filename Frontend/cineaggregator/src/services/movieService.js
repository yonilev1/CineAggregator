const API_URL = "http://localhost:5000/api/movies";

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
    const response = await fetch(buildCatalogUrl(options));
    if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
    const data = await response.json();
    // Backward-compatible if an older API build returns an array.
    return Array.isArray(data) ? { results: data, page: options.page || 1, hasMore: data.length >= 20 } : data;
}

export async function getMovies() {
    const page = await getCatalogPage({ page: 1 });
    return page.results;
}

export async function getMovie(id) {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("Failed to fetch movie");
    return response.json();
}

// Both title search and free-text search query the external catalogue, not just MongoDB.
export async function searchMovies(query, page = 1, filters = {}) {
    return getCatalogPage({ query, page, filters });
}

export async function freeTextSearchMovies(query, page = 1, filters = {}) {
    return getCatalogPage({ query, page, filters });
}

export async function filterMovies(filters, page = 1) {
    return getCatalogPage({ page, filters });
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
    const response = await fetch(`${API_URL}/actor/${encodeURIComponent(personId)}/movies?${params.toString()}`);
    if (!response.ok) throw new Error(`Actor movie search failed (${response.status})`);
    return response.json();
}

export async function getRecommendations(preferences) {
    const response = await fetch(`${API_URL}/recommend`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences)
    });
    if (!response.ok) throw new Error("Failed to fetch recommendations");
    return response.json();
}
