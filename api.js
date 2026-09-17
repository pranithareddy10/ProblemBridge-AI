/**
 * ProblemBridge AI - REST API Client
 */
const API_BASE = '/api';

const API = {
  getToken() {
    return localStorage.getItem('pb_auth_token') || '';
  },

  setToken(token) {
    if (token) localStorage.setItem('pb_auth_token', token);
    else localStorage.removeItem('pb_auth_token');
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = options.headers || {};
    const token = this.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from server' }));

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  },

  // Authentication
  auth: {
    async register(userData) {
      const res = await API.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      if (res.token) API.setToken(res.token);
      return res;
    },

    async login(credentials) {
      const res = await API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res.token) API.setToken(res.token);
      return res;
    },

    async me() {
      if (!API.getToken()) return null;
      try {
        const res = await API.request('/auth/me');
        return res.user;
      } catch (e) {
        API.setToken(null);
        return null;
      }
    },

    logout() {
      API.setToken(null);
      sessionStorage.removeItem('problemBridgeUser');
    }
  },

  // Problems
  problems: {
    async analyze(payload) {
      return API.request('/problems/analyze', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    async create(formData) {
      return API.request('/problems', {
        method: 'POST',
        body: formData
      });
    },

    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/problems${query ? `?${query}` : ''}`);
    },

    async get(id) {
      return API.request(`/problems/${id}`);
    },

    async support(id) {
      return API.request(`/problems/${id}/support`, {
        method: 'POST'
      });
    },

    async updateAuthorityStatus(id, status) {
      return API.request(`/problems/${id}/authority-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },

    async verify(id, answer) {
      return API.request(`/problems/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ answer })
      });
    }
  },

  // Challenges
  challenges: {
    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/challenges${query ? `?${query}` : ''}`);
    },

    async get(id) {
      return API.request(`/challenges/${id}`);
    },

    async create(payload) {
      return API.request('/challenges', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    async watch(id) {
      return API.request(`/challenges/${id}/watch`, {
        method: 'POST'
      });
    }
  },

  // Solutions
  solutions: {
    async create(formData) {
      return API.request('/solutions', {
        method: 'POST',
        body: formData
      });
    },

    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/solutions${query ? `?${query}` : ''}`);
    },

    async get(id) {
      return API.request(`/solutions/${id}`);
    },

    async updateStatus(id, status, websiteUrl) {
      return API.request(`/solutions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, websiteUrl })
      });
    }
  },

  // Stats
  stats: {
    async get() {
      return API.request('/stats');
    }
  }
};

window.API = API;
