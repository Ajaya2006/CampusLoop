import { api } from './api';

export const authService = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  me: () => api.get('/users/me').then((r) => r.data),
  logout: () => api.post('/auth/logout').catch(() => null),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then((r) => r.data),
  changePassword: (payload) => api.post('/auth/change-password', payload).then((r) => r.data),
  updateProfile: (payload) => api.patch('/users/me', payload).then((r) => r.data),
  uploadAvatar: (file) => {
    const body = new FormData();
    body.append('file', file);
    return api.post('/users/me/avatar', body, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  dashboard: () => api.get('/users/me/dashboard').then((r) => r.data),
};

export const userService = {
  profile: (id) => api.get(`/users/${id}`).then((r) => r.data),
  listings: (id, params) => api.get(`/users/${id}/listings`, { params }).then((r) => r.data),
  reviews: (id, params) => api.get(`/users/${id}/reviews`, { params }).then((r) => r.data),
};

export const verificationService = {
  status: () => api.get('/verifications/me').then((r) => r.data),
  submit: (formData) =>
    api.post('/verifications/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
};

export const categoryService = {
  list: () => api.get('/categories').then((r) => r.data),
  get: (slug) => api.get(`/categories/${slug}`).then((r) => r.data),
};

export const productService = {
  list: (params) => api.get('/products', { params }).then((r) => r.data),
  filters: () => api.get('/products/filters').then((r) => r.data),
  get: (id) => api.get(`/products/${id}`).then((r) => r.data),
  create: (payload) => api.post('/products', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/products/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/products/${id}`).then((r) => r.data),
  markSold: (id) => api.post(`/products/${id}/sold`).then((r) => r.data),
  mine: (params) => api.get('/products/mine', { params }).then((r) => r.data),
  priceRecommendation: (payload) => api.post('/products/price-recommendation', payload).then((r) => r.data),
  productPriceRecommendation: (id) => api.post(`/products/${id}/price-recommendation`).then((r) => r.data),
  uploadImage: (file, onProgress) => {
    const body = new FormData();
    body.append('file', file);
    return api
      .post('/uploads/product-image', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded * 100) / event.total));
        },
      })
      .then((r) => r.data);
  },
};

export const wishlistService = {
  list: (params) => api.get('/wishlist', { params }).then((r) => r.data),
  add: (productId) => api.post(`/wishlist/${productId}`).then((r) => r.data),
  remove: (productId) => api.delete(`/wishlist/${productId}`).then((r) => r.data),
};

export const chatService = {
  list: () => api.get('/conversations').then((r) => r.data),
  start: (payload) => api.post('/conversations', payload).then((r) => r.data),
  get: (id) => api.get(`/conversations/${id}`).then((r) => r.data),
  send: (id, body) => api.post(`/conversations/${id}/messages`, { body }).then((r) => r.data),
  markRead: (id) => api.post(`/conversations/${id}/read`).then((r) => r.data),
  unreadCount: () => api.get('/conversations/unread-count').then((r) => Number(r.data.message) || 0),
};

export const offerService = {
  list: (direction = 'all') => api.get('/offers', { params: { direction } }).then((r) => r.data),
  create: (payload) => api.post('/offers', payload).then((r) => r.data),
  respond: (id, payload) => api.patch(`/offers/${id}`, payload).then((r) => r.data),
};

export const meetingService = {
  list: () => api.get('/meetings').then((r) => r.data),
  propose: (payload) => api.post('/meetings', payload).then((r) => r.data),
  respond: (id, payload) => api.patch(`/meetings/${id}`, payload).then((r) => r.data),
};

export const transactionService = {
  list: () => api.get('/transactions').then((r) => r.data),
  create: (payload) => api.post('/transactions', payload).then((r) => r.data),
  confirm: (id) => api.post(`/transactions/${id}/confirm`).then((r) => r.data),
  cancel: (id, reason) => api.post(`/transactions/${id}/cancel`, { reason }).then((r) => r.data),
};

export const reviewService = {
  create: (payload) => api.post('/reviews', payload).then((r) => r.data),
  forUser: (id, params) => api.get(`/reviews/user/${id}`, { params }).then((r) => r.data),
};

export const reportService = {
  reasons: () => api.get('/reports/reasons').then((r) => r.data),
  create: (payload) => api.post('/reports', payload).then((r) => r.data),
  mine: () => api.get('/reports/mine').then((r) => r.data),
};

export const notificationService = {
  list: (params) => api.get('/notifications', { params }).then((r) => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then((r) => r.data.count),
  markRead: (id) => api.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post('/notifications/read-all').then((r) => r.data),
  remove: (id) => api.delete(`/notifications/${id}`).then((r) => r.data),
};

export const aiService = {
  features: () => api.get('/ai/features').then((r) => r.data),
  pricingMethod: () => api.get('/ai/pricing-method').then((r) => r.data),
};

export const adminService = {
  stats: () => api.get('/admin/stats').then((r) => r.data),
  analytics: (days = 14) => api.get('/admin/analytics', { params: { days } }).then((r) => r.data),
  users: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  setUserStatus: (id, payload) => api.patch(`/admin/users/${id}/status`, payload).then((r) => r.data),
  verifications: (params) => api.get('/admin/verifications', { params }).then((r) => r.data),
  decideVerification: (id, payload) => api.post(`/admin/verifications/${id}/decision`, payload).then((r) => r.data),
  listings: (params) => api.get('/admin/listings', { params }).then((r) => r.data),
  moderateListing: (id, payload) => api.post(`/admin/listings/${id}/moderate`, payload).then((r) => r.data),
  reports: (params) => api.get('/admin/reports', { params }).then((r) => r.data),
  resolveReport: (id, payload) => api.patch(`/admin/reports/${id}`, payload).then((r) => r.data),
  transactions: (params) => api.get('/admin/transactions', { params }).then((r) => r.data),
  auditLogs: (params) => api.get('/admin/audit-logs', { params }).then((r) => r.data),
};
