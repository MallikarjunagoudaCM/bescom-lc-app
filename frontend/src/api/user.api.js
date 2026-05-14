import api from './axios';
export const userApi = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getLinemen: () => api.get('/users/linemen'),
  getKptclStations: () => api.get('/users/kptcl-stations'),
  updateNotifPrefs: (data) => api.patch('/users/me/notifications', data),
};
