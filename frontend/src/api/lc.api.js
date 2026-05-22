import api from './axios';
export const lcApi = {
  getAll: (params) => api.get('/lc', { params }),
  getById: (id) => api.get(`/lc/${id}`),
  getStats: () => api.get('/lc/stats'),
  create: (data) => api.post('/lc', data),
  approve: (id, data) => api.patch(`/lc/${id}/approve`, data),
  approveEE: (id, data) => api.patch(`/lc/${id}/approveEE`, data),
  reject: (id, data) => api.patch(`/lc/${id}/reject`, data),
  jeReview: (id, data) => api.patch(`/lc/${id}/je-review`, data),
  validatePin: (id, data) => api.patch(`/lc/${id}/validate-pin`, data),
  validateReleaseCode: (id, data) => api.patch(`/lc/${id}/validate-release-code`, data),
  validateSecretCode: (id, data) => api.patch(`/lc/${id}/validate-secret-code`, data),
  delegate: (id, data) => api.patch(`/lc/${id}/delegate`, data),
  startWork: (id, data) => api.patch(`/lc/${id}/start-work`, data),
  completeWork: (id, data) => api.patch(`/lc/${id}/complete-work`, data),
  closeRequest: (id, data) => api.patch(`/lc/${id}/close-request`, data),
  release: (id, data) => api.patch(`/lc/${id}/release`, data),
  getEnergizeReadiness: (id) => api.get(`/lc/${id}/energize-readiness`),
  energizeFeeder: (id, data) => api.patch(`/lc/${id}/energize-feeder`, data),
  uploadPhotos: (id, photoType, files, caption = '') => {
    const form = new FormData();
    form.append('photoType', photoType);
    form.append('caption', caption);
    files.forEach(f => form.append('photos', f));
    return api.post(`/lc/${id}/photos`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
