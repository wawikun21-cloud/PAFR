// client/src/services/trainingsService.js
import axios from 'axios';

// Create axios instance - uses relative URLs which work with Vite proxy
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token (optional until JWT is wired)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const trainingsService = {
  // Get all trainings with filters and pagination
  getTrainings: async (params = {}) => {
    try {
      const response = await api.get('/trainings/internal', { params });
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch trainings'
      };
    }
  },

  // Get external trainings
  getExternalTrainings: async (params = {}) => {
    try {
      const response = await api.get('/trainings/external', { params });
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch external trainings'
      };
    }
  },

  // Get training by ID (internal)
  getInternalTrainingById: async (id) => {
    try {
      const response = await api.get(`/trainings/internal/${id}`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch training'
      };
    }
  },

  // Get training by ID (external)
  getExternalTrainingById: async (id) => {
    try {
      const response = await api.get(`/trainings/external/${id}`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch training'
      };
    }
  },

  // Create new internal training
  createInternalTraining: async (trainingData) => {
    try {
      const response = await api.post('/trainings/internal', trainingData);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create training'
      };
    }
  },

  // Create new external training
  createExternalTraining: async (trainingData) => {
    try {
      const response = await api.post('/trainings/external', trainingData);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create external training'
      };
    }
  },

  // Update existing internal training
  updateInternalTraining: async (id, trainingData) => {
    try {
      const response = await api.patch(`/trainings/internal/${id}`, trainingData);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update training'
      };
    }
  },

  // Update existing external training
  updateExternalTraining: async (id, trainingData) => {
    try {
      const response = await api.patch(`/trainings/external/${id}`, trainingData);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update external training'
      };
    }
  },

  // Delete internal training
  deleteInternalTraining: async (id) => {
    try {
      const response = await api.delete(`/trainings/internal/${id}`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete training'
      };
    }
  },

  // Delete external training
  deleteExternalTraining: async (id) => {
    try {
      const response = await api.delete(`/trainings/external/${id}`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete external training'
      };
    }
  },

  // Create registration for external training
  createRegistration: async (trainingId, participantData) => {
    try {
      const response = await api.post(`/trainings/external/${trainingId}/register`, { participantData });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to submit registration'
      };
    }
  },

  // Get registrations for external training
  getRegistrationsByTrainingId: async (trainingId) => {
    try {
      const response = await api.get(`/trainings/external/${trainingId}/registrations`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch registrations'
      };
    }
  },

  // Get slot availability for external training.
  //
  // BUG FIX: The server wraps its payload in a standard envelope:
  //   { success: true, message: 'OK', data: { hasSquadronLimits, squads, ... } }
  //
  // The original implementation returned `response.data` (the full envelope) as
  // `result.data`, so `result.data.hasSquadronLimits` was always `undefined` and
  // `result.data.squads` was always `undefined` — causing every squadron to show
  // "0 registered" regardless of actual registrations.
  //
  // The fix unwraps `body.data` (the inner payload) before returning it.
  getTrainingSlotAvailability: async (trainingId) => {
    try {
      const response = await api.get(`/trainings/external/${trainingId}/slots`);
      const body = response.data;
      if (body?.success === false) {
        return { success: false, message: body.message || 'Failed to fetch slot availability' };
      }
      // body.data is { hasSquadronLimits, squads } or { hasSquadronLimits: false, totalSlots, totalRegistered, remaining }
      return {
        success: true,
        data: body?.data ?? body,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch slot availability'
      };
    }
  },

  // Upload letter order (internal training)
  uploadLetterOrder: async (file, trainingId) => {
    try {
      const formData = new FormData();
      formData.append('letter_order', file);
      const response = await api.post(
        `/trainings/internal/${trainingId}/attachments/letter-order`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to upload letter order',
      };
    }
  },

  downloadInternalAttachment: async (trainingId, attachmentId) => {
    try {
      const response = await api.get(
        `/trainings/internal/${trainingId}/attachments/${attachmentId}/file`,
        { responseType: 'blob' }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to download attachment'
      };
    }
  },

  downloadExternalAttachment: async (trainingId, attachmentId) => {
    const response = await api.get(
      `/trainings/external/${trainingId}/attachments/${attachmentId}/file`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  uploadExternalLetterOrder: async (file, externalTrainingId) => {
    try {
      const formData = new FormData();
      formData.append('letter_order', file);
      const response = await api.post(
        `/trainings/external/${externalTrainingId}/attachments/letter-order`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to upload letter order',
      };
    }
  },

  getInternalTrainingAttachments: async (trainingId) => {
    try {
      const response = await api.get(`/trainings/internal/${trainingId}/attachments`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data || [],
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch attachments',
      };
    }
  },

  getExternalTrainingAttachments: async (trainingId) => {
    try {
      const response = await api.get(`/trainings/external/${trainingId}/attachments`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data || [],
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch attachments',
      };
    }
  },

  getInternalTrainingParticipants: async (trainingId) => {
    try {
      const response = await api.get(`/trainings/internal/${trainingId}/participants`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data || [],
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch participants',
      };
    }
  },

  getExternalTrainingParticipants: async (trainingId) => {
    try {
      const response = await api.get(`/trainings/external/${trainingId}/participants`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data || [],
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch participants',
      };
    }
  },
};

export const getTrainings = trainingsService.getTrainings;
export const getExternalTrainings = trainingsService.getExternalTrainings;
export const getTrainingById = trainingsService.getInternalTrainingById; // Default to internal for backward compatibility
export const createTraining = trainingsService.createInternalTraining; // Default to internal for backward compatibility
export const updateTraining = trainingsService.updateInternalTraining; // Default to internal for backward compatibility
export const deleteTraining = trainingsService.deleteInternalTraining; // Default to internal for backward compatibility
export const createInternalTraining = trainingsService.createInternalTraining;
export const updateInternalTraining = trainingsService.updateInternalTraining;
export const createRegistration = trainingsService.createRegistration;
export const getRegistrationsByTrainingId = trainingsService.getRegistrationsByTrainingId;
export const uploadLetterOrder = trainingsService.uploadLetterOrder;
export const uploadExternalLetterOrder = trainingsService.uploadExternalLetterOrder;
export const createExternalTraining = trainingsService.createExternalTraining;
export const updateExternalTraining = trainingsService.updateExternalTraining;
export const deleteExternalTraining = trainingsService.deleteExternalTraining;
export const getExternalTrainingById = trainingsService.getExternalTrainingById;
export const getInternalTrainingById = trainingsService.getInternalTrainingById;
export const getTrainingSlotAvailability = trainingsService.getTrainingSlotAvailability;

export const downloadInternalAttachment = trainingsService.downloadInternalAttachment;
export const downloadExternalAttachment = trainingsService.downloadExternalAttachment;
export const getInternalTrainingAttachments = trainingsService.getInternalTrainingAttachments;
export const getExternalTrainingAttachments = trainingsService.getExternalTrainingAttachments;
export const getInternalTrainingParticipants = trainingsService.getInternalTrainingParticipants;
export const getExternalTrainingParticipants = trainingsService.getExternalTrainingParticipants;

export default trainingsService;