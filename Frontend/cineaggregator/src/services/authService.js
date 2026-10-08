const API_URL = "http://localhost:5000/api/auth";

export async function login(username, password) {
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error("Invalid credentials");
    const data = await response.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("username", username);
    return data;
}

export function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
}

export function getToken() { return localStorage.getItem("token"); }
export function getRole() { return localStorage.getItem("role"); }
export function getUsername() { return localStorage.getItem("username"); }
export function isAuthenticated() { return !!getToken(); }
