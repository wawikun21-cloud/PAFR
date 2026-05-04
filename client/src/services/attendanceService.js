/**
 * Attendance Service
 * API calls for attendance marking and tracking
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export async function getAttendance(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.training_id) queryParams.append('training_id', params.training_id);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.status) queryParams.append('status', params.status);
  
  const url = `/api/attendance${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return apiGet(url);
}

export async function getAttendanceById(id) {
  return apiGet(`/api/attendance/${id}`);
}

export async function markAttendance(data) {
  return apiPost('/api/attendance', data);
}

export async function updateAttendance(id, data) {
  return apiPut(`/api/attendance/${id}`, data);
}

export async function getTrainingAttendance(trainingId) {
  return apiGet(`/api/trainings/${trainingId}/attendance`);
}

export async function markBulkAttendance(trainingId, records) {
  return apiPost(`/api/trainings/${trainingId}/attendance/bulk`, { records });
}
