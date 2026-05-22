import axios from 'axios';
import toast from 'react-hot-toast';

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
let queue = [];

api.interceptors.response.use(res => res, async err => {
  const orig = err.config;
  const requestUrl = orig?.url || '';
  const isLoginRequest = requestUrl.includes('/auth/login');
  if (err.response?.status === 401 && !orig?._retry && !isLoginRequest) {
    if (refreshing) {
      return new Promise((resolve, reject) => queue.push({ resolve, reject }))
        .then(token => { orig.headers.Authorization = `Bearer ${token}`; return api(orig); });
    }
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return Promise.reject(err);
    }
    orig._retry = true;
    refreshing = true;
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken }, { withCredentials: true, timeout: 5000 });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      queue.forEach(p => p.resolve(data.accessToken));
      queue = [];
      orig.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(orig);
    } catch {
      queue.forEach(p => p.reject());
      queue = [];
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    } finally { refreshing = false; }
  }
  const msg = err.response?.data?.error || 'Something went wrong';
  if (err.response?.status !== 401) toast.error(msg);
  return Promise.reject(err);
});

export default api;
