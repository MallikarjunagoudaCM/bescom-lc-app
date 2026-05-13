import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('bescom_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bescom_token');
      localStorage.removeItem('bescom_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth — unified login for all account types
export const authAPI = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),   // { username, password }
  getMe:          ()     => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// Employee
export const employeeAPI = {
  getProfile:    ()     => api.get('/employee/profile'),
  updateProfile: (data) => api.put('/employee/profile', data),
  getList:       (params) => api.get('/employee/list', { params })
};

// Transfer
export const transferAPI = {
  apply:             (data) => api.post('/transfer/apply', data),
  getMyApplications: ()     => api.get('/transfer/my-applications'),
  getById:           (id)   => api.get(`/transfer/${id}`)
};

// Vacancy
export const vacancyAPI = {
  submit: (data)     => api.post('/vacancy', data),
  getMy:  (params)   => api.get('/vacancy/my', { params }),
  getAll: (params)   => api.get('/vacancy', { params }),
  update: (id, data) => api.put(`/vacancy/${id}`, data)
};

// HR
export const hrAPI = {
  getDashboard:      ()              => api.get('/hr/dashboard'),
  getCycles:         ()              => api.get('/hr/cycles'),
  createCycle:       (data)          => api.post('/hr/cycles', data),
  updateCycleStatus: (id, status)    => api.put(`/hr/cycles/${id}/status`, { status }),
  generateMeritList: (cycleId)       => api.post(`/hr/cycles/${cycleId}/generate-merit`),
  getMeritList:      (cycleId, params) => api.get(`/hr/merit-list/${cycleId}`, { params }),
  processApplication:(id, data)      => api.put(`/hr/applications/${id}/process`, data)
};

// Cycle (employee-accessible)
export const cycleAPI = {
  getActive:    () => api.get('/transfer/active-cycle'),
  getOpenCycles:() => api.get('/transfer/open-cycles'),
  getAll:       () => api.get('/hr/cycles')
};

// Admin — office & HR account management
export const adminAPI = {
  createOfficeAccount: (data)    => api.post('/admin/create-office-account', data),
  updateOfficeAccount: (id,data) => api.put(`/admin/office-account/${id}`, data),
  resetPassword:       (id,data) => api.put(`/admin/reset-password/${id}`, data),
  toggleActive:        (id)      => api.put(`/admin/users/${id}/toggle-active`),
  getUsers:            (params)  => api.get('/admin/users', { params }),
  getHierarchy:        ()        => api.get('/admin/hierarchy')
};

export default api;
