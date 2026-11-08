import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('luxurystay_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global 401 Handling (Excludes /auth/login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('luxurystay_token');
      localStorage.removeItem('luxurystay_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/updateprofile', data),
  updatePassword: (data) => api.put('/auth/updatepassword', data),
  updateAvatar: (formData) => api.put('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  logout: () => api.post('/auth/logout'),
};

export const users = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  deactivate: (id) => api.put(`/users/${id}/deactivate`),
  activate: (id) => api.put(`/users/${id}/activate`),
  delete: (id) => api.delete(`/users/${id}`),
};

export const rooms = {
  getAll: (params) => api.get('/rooms', { params }),
  getStats: () => api.get('/rooms/stats'),
  getCleaning: () => api.get('/rooms/cleaning'),
  getAvailable: (params) => api.get('/rooms/available', { params }),
  getPublic: () => api.get('/rooms/public'),
  getPublicStats: () => api.get('/rooms/public/stats'),
  getPublicById: (id) => api.get(`/rooms/public/${id}`),
  checkPublicAvailability: (id, params) => api.get(`/rooms/public/${id}/availability`, { params }),
  getById: (id) => api.get(`/rooms/${id}`),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  updateStatus: (id, data) => api.put(`/rooms/${id}/status`, data),
  updateCleaningProgress: (id, progress) => api.put(`/rooms/${id}/cleaning-progress`, { progress }),
  delete: (id) => api.delete(`/rooms/${id}`),
};

export const bookings = {
  getAll: (params) => api.get('/bookings', { params }),
  getToday: () => api.get('/bookings/today'),
  getMine: () => api.get('/bookings/mine'),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  createGuest: (data) => api.post('/bookings/guest', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  checkIn: (id) => api.put(`/bookings/${id}/checkin`),
  checkOut: (id) => api.put(`/bookings/${id}/checkout`),
  cancel: (id, reason) => api.put(`/bookings/${id}/cancel`, { reason }),
  delete: (id) => api.delete(`/bookings/${id}`),
};

export const guests = {
  getAll: (params) => api.get('/guests', { params }),
  search: (q, limit) => api.get('/guests/search', { params: { q, limit } }),
  getById: (id) => api.get(`/guests/${id}`),
  create: (data) => api.post('/guests', data),
  update: (id, data) => api.put(`/guests/${id}`, data),
  blacklist: (id, reason) => api.put(`/guests/${id}/blacklist`, { reason }),
  unblacklist: (id) => api.put(`/guests/${id}/unblacklist`),
  updateLoyalty: (id, data) => api.put(`/guests/${id}/loyalty`, data),
  delete: (id) => api.delete(`/guests/${id}`),
};

export const billing = {
  getAll: (params) => api.get('/billing', { params }),
  getSummary: () => api.get('/billing/summary'),
  getMine: () => api.get('/billing/mine'),
  getById: (id) => api.get(`/billing/${id}`),
  create: (data) => api.post('/billing', data),
  update: (id, data) => api.put(`/billing/${id}`, data),
  addCharge: (id, data) => api.put(`/billing/${id}/charge`, data),
  addPayment: (id, data) => api.put(`/billing/${id}/payment`, data),
  delete: (id) => api.delete(`/billing/${id}`),
};

export const maintenance = {
  getAll: (params) => api.get('/maintenance', { params }),
  getById: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  assign: (id, assignedTo) => api.put(`/maintenance/${id}/assign`, { assignedTo }),
  start: (id) => api.put(`/maintenance/${id}/start`),
  complete: (id, data) => api.put(`/maintenance/${id}/complete`, data),
  updateStatus: (id, data) => api.put(`/maintenance/${id}/status`, data),
  cancel: (id) => api.put(`/maintenance/${id}/cancel`),
  delete: (id) => api.delete(`/maintenance/${id}`),
};

export const feedback = {
  getAll: (params) => api.get('/feedback', { params }),
  getPublic: () => api.get('/feedback/public'),
  getSummary: () => api.get('/feedback/summary'),
  getById: (id) => api.get(`/feedback/${id}`),
  create: (data) => api.post('/feedback', data),
  respond: (id, data) => api.put(`/feedback/${id}/respond`, data),
  toggleFeature: (id, featured) => api.put(`/feedback/${id}/feature`, { featured }),
  delete: (id) => api.delete(`/feedback/${id}`),
};

export const reports = {
  overview: () => api.get('/reports/overview'),
  occupancy: (params) => api.get('/reports/occupancy', { params }),
  revenue: (params) => api.get('/reports/revenue', { params }),
  guests: () => api.get('/reports/guests'),
  staff: () => api.get('/reports/staff'),
  maintenance: () => api.get('/reports/maintenance'),
  export: (params) => api.get('/reports/export', { params }),
};

export const notifications = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread/count'),
  create: (data) => api.post('/notifications', data),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read/all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const settings = {
  get: () => api.get('/settings'),
  getPublic: () => api.get('/settings/public'),
  update: (data) => api.put('/settings', data),
};

export const contact = {
  send: (data) => api.post('/contact', data),
};

export const services = {
  getAll: (params) => api.get('/services', { params }),
  getCatalog: () => api.get('/services/catalog'),
  create: (data) => api.post('/services', data),
  updateStatus: (id, data) => api.put(`/services/${id}/status`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

export default api;