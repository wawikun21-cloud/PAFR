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

const reportsService = {
  getReports: async (params = {}) => {
    try {
      const response = await api.get('/reports', { params });
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch reports',
      };
    }
  },

  getReportById: async (id) => {
    try {
      const response = await api.get(`/reports/${id}`);
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch report',
      };
    }
  },

  createReport: async (reportData) => {
    try {
      const response = await api.post('/reports', reportData);
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create report',
      };
    }
  },

  updateReport: async (id, reportData) => {
    try {
      const response = await api.patch(`/reports/${id}`, reportData);
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update report',
      };
    }
  },

  deleteReport: async (id) => {
    try {
      const response = await api.delete(`/reports/${id}`);
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete report',
      };
    }
  },

  uploadDocumentation: async (reportId, file) => {
    try {
      const formData = new FormData();
      formData.append('documentation', file);
      const response = await api.post(`/reports/${reportId}/documentations`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to upload documentation',
      };
    }
  },
};

export const getReports = reportsService.getReports;
export const getReportById = reportsService.getReportById;
export const createReport = reportsService.createReport;
export const updateReport = reportsService.updateReport;
export const deleteReport = reportsService.deleteReport;
export const uploadDocumentation = reportsService.uploadDocumentation;

export default reportsService;
