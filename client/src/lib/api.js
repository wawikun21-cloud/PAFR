/**
 * API Utility for PAFR Frontend
 * Handles JWT token injection, base URL configuration, and 401 handling
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get the stored JWT token from localStorage
 */
export function getToken() {
  return localStorage.getItem('pafr_token');
}

/**
 * Set the JWT token in localStorage
 */
export function setToken(token) {
  localStorage.setItem('pafr_token', token);
}

/**
 * Remove the JWT token from localStorage
 */
export function removeToken() {
  localStorage.removeItem('pafr_token');
}

/**
 * Get the stored user object from localStorage
 */
export function getUser() {
  const userStr = localStorage.getItem('pafr_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Set the user object in localStorage
 */
export function setUser(user) {
  localStorage.setItem('pafr_user', JSON.stringify(user));
}

/**
 * Remove the user object from localStorage
 */
export function removeUser() {
  localStorage.removeItem('pafr_user');
}

/**
 * Clear all auth data from localStorage
 */
export function clearAuth() {
  removeToken();
  removeUser();
}

/**
 * Create headers with optional auth token
 */
function createHeaders(includeAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Handle API response
 * @param {Response} response - Fetch Response object
 * @returns {Promise<any>} Parsed response data
 */
async function handleResponse(response) {
  const data = await response.json();

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    clearAuth();
    // Trigger a custom event to notify AuthContext
    window.dispatchEvent(new CustomEvent('pafr-auth-logout'));
    throw new Error(data.message || 'Session expired. Please login again.');
  }

  return data;
}

/**
 * Make a GET request
 */
export async function apiGet(endpoint, includeAuth = true) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: createHeaders(includeAuth),
  });

  return handleResponse(response);
}

/**
 * Make a POST request
 */
export async function apiPost(endpoint, body, includeAuth = true) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: createHeaders(includeAuth),
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

/**
 * Make a PUT request
 */
export async function apiPut(endpoint, body, includeAuth = true) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: createHeaders(includeAuth),
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

/**
 * Make a DELETE request
 */
export async function apiDelete(endpoint, includeAuth = true) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: createHeaders(includeAuth),
  });

  return handleResponse(response);
}

export default {
  getToken,
  setToken,
  removeToken,
  getUser,
  setUser,
  removeUser,
  clearAuth,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
};
