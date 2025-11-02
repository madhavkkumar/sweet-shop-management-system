const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Get auth token from localStorage
const getToken = () => localStorage.getItem('token');

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

// Auth API
export const authAPI = {
  register: async (username, email, password) => {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  login: async (username, password) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
};

// Sweets API
export const sweetsAPI = {
  getAll: async () => {
    return apiRequest('/api/sweets');
  },

  search: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/api/sweets/search?${queryParams}`);
  },

  create: async (sweet) => {
    return apiRequest('/api/sweets', {
      method: 'POST',
      body: JSON.stringify(sweet),
    });
  },

  update: async (id, sweet) => {
    return apiRequest(`/api/sweets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sweet),
    });
  },

  delete: async (id) => {
    return apiRequest(`/api/sweets/${id}`, {
      method: 'DELETE',
    });
  },

  purchase: async (id, quantity) => {
    return apiRequest(`/api/sweets/${id}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    });
  },

  restock: async (id, quantity) => {
    return apiRequest(`/api/sweets/${id}/restock`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    });
  },
};

