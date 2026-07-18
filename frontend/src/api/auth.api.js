import api from './axios';
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  loginSso: (idToken) => api.post('/auth/login-sso', { idToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};
