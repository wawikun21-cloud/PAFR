import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const auditLogsService = {
  getAuditLogs: async (params = {}) => {
    try {
      const response = await api.get('/audit-logs', { params });
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch audit logs',
      };
    }
  },

  getAuditLogById: async (id) => {
    try {
      const response = await api.get(`/audit-logs/${id}`);
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch audit log',
      };
    }
  },
};

export const getAuditLogs = auditLogsService.getAuditLogs;
export const getAuditLogById = auditLogsService.getAuditLogById;

export default auditLogsService;
