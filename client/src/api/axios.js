import axios from 'axios';

// Resolve API base URL dynamically from environment variable or proxy fallback
const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
const baseURL =
  rawApiUrl.endsWith('/api') || rawApiUrl === '/api'
    ? rawApiUrl
    : `${rawApiUrl.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cafeflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional auto-logout on unauthorized
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        // localStorage.removeItem('cafeflow_token');
        // localStorage.removeItem('cafeflow_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
