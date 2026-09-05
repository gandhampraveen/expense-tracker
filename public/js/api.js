/* ==========================================================================
   API CLIENT MODULE
   Handles HTTP requests to REST Endpoints & Authentication Header persistence
   ========================================================================== */

const API_BASE = '';

const getAuthToken = () => localStorage.getItem('expense_tracker_token');

const request = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/register')) {
        // Token expired or invalid
        localStorage.removeItem('expense_tracker_token');
        localStorage.removeItem('expense_tracker_user');
        window.location.reload();
      }
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error.message);
    throw error;
  }
};

// Auth API Endpoints
const authAPI = {
  register: (userData) => request('/register', { method: 'POST', body: JSON.stringify(userData) }),
  login: (credentials) => request('/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getProfile: () => request('/profile', { method: 'GET' }),
  updateProfile: (profileData) => request('/profile', { method: 'PUT', body: JSON.stringify(profileData) })
};

// Expense API Endpoints
const expenseAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.order) query.append('order', params.order);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/expenses${queryString}`, { method: 'GET' });
  },

  create: (expenseData) => request('/expense', { method: 'POST', body: JSON.stringify(expenseData) }),

  update: (id, expenseData) => request(`/expense/${id}`, { method: 'PUT', body: JSON.stringify(expenseData) }),

  delete: (id) => request(`/expense/${id}`, { method: 'DELETE' }),

  getTotal: (params = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/expense/total${queryString}`, { method: 'GET' });
  },

  getMonthly: () => request('/expense/monthly', { method: 'GET' }),

  getCategoryBreakdown: () => request('/expense/category', { method: 'GET' })
};

// Category API Endpoints
const categoryAPI = {
  getAll: () => request('/categories', { method: 'GET' }),
  create: (categoryData) => request('/categories', { method: 'POST', body: JSON.stringify(categoryData) })
};
