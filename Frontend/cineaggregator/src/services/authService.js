const API_BASE = "http://localhost:5000/api/auth";

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  localStorage.setItem("cine_token", data.token);
  localStorage.setItem("cine_username", data.username);
  localStorage.setItem("cine_role", data.role);
  window.dispatchEvent(new Event("authChange"));
  return data;
}

export async function register(username, password) {
  const response = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }

  localStorage.setItem("cine_token", data.token);
  localStorage.setItem("cine_username", data.username);
  localStorage.setItem("cine_role", data.role);
  window.dispatchEvent(new Event("authChange"));
  return data;
}

export function logout() {
  localStorage.removeItem("cine_token");
  localStorage.removeItem("cine_username");
  localStorage.removeItem("cine_role");
  window.dispatchEvent(new Event("authChange"));
}

export function getToken() {
  return localStorage.getItem("cine_token");
}

export function getUsername() {
  return localStorage.getItem("cine_username");
}

export function getRole() {
  return localStorage.getItem("cine_role");
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function isAdmin() {
  return getRole() === "Admin";
}

export function getCurrentUser() {
  if (!isAuthenticated()) return null;
  return {
    username: getUsername(),
    role: getRole(),
    token: getToken()
  };
}
