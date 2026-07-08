import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common error cases
    if (error.response?.status === 401) {
      // Redirect to login or handle unauthorized access
      window.dispatchEvent(new Event('auth-error'));
    }
    return Promise.reject(error);
  }
);

// API helper functions
export const apiGet = async (url, params = {}) => {
  try {
    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred' };
  }
};

export const apiPost = async (url, data = {}) => {
  try {
    const response = await api.post(url, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred' };
  }
};

export const apiPut = async (url, data = {}) => {
  try {
    const response = await api.put(url, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred' };
  }
};

export const apiDelete = async (url) => {
  try {
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'An error occurred' };
  }
};

export default api;