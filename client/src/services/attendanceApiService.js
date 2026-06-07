import api from './api';

// ── Scan endpoints ───────────────────────────────────────────────────────────

export const scanInternalTraining = (trainingId, qrCode, scanMethod = 'qr_scanner', deviceInfo = null) => {
  const body = { qr_code: qrCode, scan_method: scanMethod };
  if (deviceInfo) body.device_info = deviceInfo;
  return api.post(`/attendance/scan/internal/${trainingId}`, body);
};

export const scanExternalTraining = (externalTrainingId, qrCode, scanMethod = 'qr_scanner', deviceInfo = null) => {
  const body = { qr_code: qrCode, scan_method: scanMethod };
  if (deviceInfo) body.device_info = deviceInfo;
  return api.post(`/attendance/scan/external/${externalTrainingId}`, body);
};

// ── Manual check-in ──────────────────────────────────────────────────────────

export const manualCheckInInternal = (trainingId, reservistId, status) =>
  api.post(`/attendance/manual/internal/${trainingId}`, { reservist_id: Number(reservistId), status });

export const manualCheckInExternal = (externalTrainingId, reservistId, registrationId, status) => {
  const body = { status };
  if (reservistId) body.reservist_id = Number(reservistId);
  if (registrationId) body.registration_id = Number(registrationId);
  return api.post(`/attendance/manual/external/${externalTrainingId}`, body);
};

// ── Attendance lists ─────────────────────────────────────────────────────────

export const getInternalAttendance = (trainingId) =>
  api.get(`/attendance/internal/${trainingId}`);

export const getExternalAttendance = (externalTrainingId) =>
  api.get(`/attendance/external/${externalTrainingId}`);

// ── Update status ────────────────────────────────────────────────────────────

export const updateAttendanceStatus = (id, eventType, status) =>
  api.patch(`/attendance/${eventType}/${id}`, { status });

// ── Scan history ─────────────────────────────────────────────────────────────

export const getScanHistory = (params = {}) =>
  api.get('/attendance/scan-history', { params });

// ── Facilitator management ───────────────────────────────────────────────────

export const assignFacilitator = (data) =>
  api.post('/attendance/facilitators', data);

export const getFacilitators = (params = {}) =>
  api.get('/attendance/facilitators', { params });

// ── My events ─────────────────────────────────────────────────────────────────

export const getMyEvents = () =>
  api.get('/attendance/my-events');

// ── Event status ──────────────────────────────────────────────────────────────

export const getEventStatus = (eventType, id) =>
  api.get(`/attendance/event-status/${eventType}/${id}`);
