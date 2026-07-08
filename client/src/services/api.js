import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with auth header support
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401 = token is missing, expired, or invalid → clear session and redirect to login
    // 403 = authenticated but forbidden (wrong role/scope) → do NOT logout; let the
    //       calling component handle it gracefully (show an error, hide the UI, etc.)
    if (status === 401 && !error.config?.skipAuthRedirect) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out. Please check your connection.';
    }
    return Promise.reject(error);
  }
);

// Authentication endpoints
export const login = (credentials) => api.post('/auth/login', credentials, { skipAuthRedirect: true });
export const logout = () => api.post('/auth/logout');
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data, { skipAuthRedirect: true });

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Reservists
export const getReservists = (params = {}) => api.get('/reservists', { params });
export const getReservist = (id) => api.get(`/reservists/${id}`);
export const createReservist = (data) => api.post('/reservists', data);
export const updateReservist = (id, data) => api.put(`/reservists/${id}`, data);
export const deleteReservist = (id) => api.delete(`/reservists/${id}`);
export const assignReservist = (id, data) => api.post(`/reservists/${id}/assign`, data);
export const resetReservistPassword = (id, data) => api.post(`/reservists/${id}/reset-password`, data);
export const bulkUploadReservists = (formData) =>
  api.post('/reservists/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  });
export const bulkUploadReservistInfo = (formData) =>
  api.post('/reservists/bulk-upload-info', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  });
export const bulkPreviewReservists = (formData) =>
  api.post('/reservists/bulk-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  });

// Trainings
export const getTrainings = (params = {}) => api.get('/trainings', { params });
export const getTraining = (id) => api.get(`/trainings/${id}`);
export const createTraining = (data) => api.post('/trainings', data);
export const updateTraining = (id, data) => api.put(`/trainings/${id}`, data);
export const deleteTraining = (id) => api.delete(`/trainings/${id}`);

// Attendance
export const getAttendance = (params = {}) => api.get('/attendance', { params });
export const getAttendanceRecord = (id) => api.get(`/attendance/${id}`);
export const createAttendance = (data) => api.post('/attendance', data);
export const updateAttendance = (id, data) => api.put(`/attendance/${id}`, data);

// Readiness
export const getReadiness = (options = {}) => {
  const { endpoint = '', params = {} } = options;
  const path = endpoint ? `/readiness/${endpoint}` : '/readiness';
  return api.get(path, { params });
};

// Supplies
export const getSupplies = (params = {}) => api.get('/supplies', { params });
export const getSupply = (id) => api.get(`/supplies/${id}`);
export const createSupply = (data) => api.post('/supplies', data);
export const updateSupply = (id, data) => api.put(`/supplies/${id}`, data);
export const deleteSupply = (id) => api.delete(`/supplies/${id}`);
export const getLowStockSupplies = () => api.get('/supplies/low-stock');
export const getSupplyCategories = () => api.get('/supplies/categories');
export const adjustSupplyStock = (data) => api.post('/supplies/adjust-stock', data);

// Issuances
export const getIssuances = (params = {}) => api.get('/issuances', { params });
export const getIssuance = (id) => api.get(`/issuances/${id}`);
export const getOverdueIssuances = () => api.get('/issuances/overdue');
export const getReservistIssuances = (id) => api.get(`/issuances/reservist/${id}`);
export const createIssuance = (data) => api.post('/issuances', data);
export const returnIssuance = (id, data) => api.put(`/issuances/${id}`, data);
export const getIssuancesBySquadron = (squadronId) => api.get(`/issuances/squadron/${squadronId}`);
export const getUniformTracker = (params = {}) => api.get('/issuances/uniform-tracker', { params });
export const bulkIssueUniforms = (data) => api.post('/issuances/bulk', data);

// Areas
export const getAreas = (params = {}) => api.get('/areas', { params });
export const getArea = (id) => api.get(`/areas/${id}`);

// Groups
export const getGroups = (params = {}, config = {}) => api.get('/hierarchy', { params, ...config });
export const getSquadrons = (params = {}) => api.get('/squadron', { params });
export const getGroupsList = (params = {}) => api.get('/groups', { params });
export const getGroupsByArsen = (arsenId) => api.get(`/groups?arsen_id=${arsenId}`);

// ARSENs
export const getArcens = (params = {}) => api.get('/arsens', { params });
export const getArsen = (id) => api.get(`/arsens/${id}`);
export const createArsen = (data) => api.post('/arsens', data);
export const updateArsen = (id, data) => api.put(`/arsens/${id}`, data);
export const deleteArsen = (id) => api.delete(`/arsens/${id}`);

// GROUPs
export const getGroup = (id) => api.get(`/groups/${id}`);
export const createGroup = (data) => api.post('/groups', data);
export const updateGroup = (id, data) => api.put(`/groups/${id}`, data);
export const deleteGroup = (id) => api.delete(`/groups/${id}`);

// SQUADRONs
export const getSquadron = (id) => api.get(`/squadron/${id}`);
export const createSquadron = (data) => api.post('/squadron', data);
export const updateSquadron = (id, data) => api.put(`/squadron/${id}`, data);
export const deleteSquadron = (id) => api.delete(`/squadron/${id}`);

// Filter metadata
export const getReservistFilterMetadata = () => api.get('/reservists/filters/metadata');

// Settings
export const getSettings = () => api.get('/settings');
export const getSetting = (key) => api.get(`/settings/${key}`);
export const updateSetting = (key, data) => api.put(`/settings/${key}`, data);
export const createSetting = (data) => api.post('/settings', data);

// Role Management (Settings)
export const getRoles = () => api.get('/settings/roles');
export const getSettingsUsers = () => api.get('/settings/users');
export const updateUserRole = (id, data) => api.put(`/settings/users/${id}/role`, data);
export const getUserRoleHistory = (id) => api.get(`/settings/users/${id}/role-history`);
// Super admin only - gets all arsens/groups/squadrons
export const getRoleOptions = () => api.get('/settings/role-options');
// Scoped admin - gets only entities within user's scope
export const getScopedRoleOptions = () => api.get('/settings/users/role-options');
// Get scoped options for editing a specific user
export const getUserEditOptions = (id) => api.get(`/settings/users/${id}/edit-options`);
// Create/deactivate users (scoped)
export const createUser = (data) => api.post('/settings/users', data);
export const deleteUser = (id) => api.delete(`/settings/users/${id}`);

// Alerts & Insights
export const getAlerts = (params = {}) => api.get('/alerts', { params, timeout: 60000 });
export const createAlert = (data) => api.post('/alerts', data);
export const markAlertRead = (id) => api.patch(`/alerts/${id}/read`);
export const getAlertsInsights = () => api.get('/alerts/insights');

// Map
export const getMapSquadrons = (params = {}) => api.get('/map/squadrons', { params });
export const getMapSummary = () => api.get('/map/summary');

// Self-service profile (reservist)
export const getMyProfile = () => api.get('/reservists/my/profile');
export const generateMyQR = () => api.post('/reservists/my/profile/generate-qr');
export const updateMyProfile = (data) => api.put('/reservists/my/profile', data);
export const getMyTrainings = () => api.get('/reservists/my/trainings');
export const getMyAttendance = () => api.get('/reservists/my/attendance');
export const getMyReadiness = () => api.get('/reservists/my/readiness');

export default api;