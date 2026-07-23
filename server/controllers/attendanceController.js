const attendanceService = require('../services/attendanceService');
const { logAudit } = require('../utils/auditLogger');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  if (process.env.NODE_ENV !== 'production' && code === 500 && err && typeof err === 'object') {
    if (err.message && err.message !== message) body.details = err.message;
    if (err.sqlMessage) body.sqlMessage = err.sqlMessage;
    if (err.code) body.code = err.code;
  }
  if (code === 500) {
    console.error('[Attendance Controller Error]', err);
  }
  return res.status(code).json(body);
}

function scanInternal(req, res) {
  const facilitatorId = req.user?.id;
  attendanceService
    .scanQRCodeInternal(
      req.params.trainingId,
      req.body.qr_code,
      req.body.scan_method || 'qr_scanner',
      facilitatorId,
      req.body.device_info || req.headers['user-agent'] || null
    )
    .then((data) => {
      logAudit('attendance.scan', facilitatorId, {
        trainingId: req.params.trainingId,
        eventType: 'internal',
        qr_code: req.body.qr_code
      });
      return res.json({ success: true, message: data.message, data: data.data });
    })
    .catch((err) => sendError(res, err, 'Scan failed'));
}

function scanExternal(req, res) {
  const facilitatorId = req.user?.id;
  attendanceService
    .scanQRCodeExternal(
      req.params.externalTrainingId,
      req.body.qr_code,
      req.body.scan_method || 'qr_scanner',
      facilitatorId,
      req.body.device_info || req.headers['user-agent'] || null
    )
    .then((data) => {
      logAudit('attendance.scan', facilitatorId, {
        externalTrainingId: req.params.externalTrainingId,
        eventType: 'external',
        qr_code: req.body.qr_code
      });
      return res.json({ success: true, message: data.message, data: data.data });
    })
    .catch((err) => sendError(res, err, 'Scan failed'));
}

function manualCheckInInternal(req, res) {
  const facilitatorId = req.user?.id;
  attendanceService
    .manualCheckInInternal(req.params.trainingId, req.body.reservist_id, req.body.status, facilitatorId)
    .then((data) => {
      logAudit('attendance.manual', facilitatorId, {
        trainingId: req.params.trainingId,
        reservistId: req.body.reservist_id,
        status: req.body.status
      });
      return res.json(data);
    })
    .catch((err) => sendError(res, err, 'Manual check-in failed'));
}

function manualCheckInExternal(req, res) {
  const facilitatorId = req.user?.id;
  const { reservist_id, registration_id, status } = req.body;
  attendanceService
    .manualCheckInExternal(req.params.externalTrainingId, reservist_id || registration_id, status, facilitatorId)
    .then((data) => {
      logAudit('attendance.manual', facilitatorId, {
        externalTrainingId: req.params.externalTrainingId,
        reservistId: reservist_id || registration_id,
        status: req.body.status
      });
      return res.json(data);
    })
    .catch((err) => sendError(res, err, 'Manual check-in failed'));
}

function getInternalAttendance(req, res) {
  attendanceService
    .getInternalAttendanceList(req.params.trainingId)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to load attendance'));
}

function getExternalAttendance(req, res) {
  attendanceService
    .getExternalAttendanceList(req.params.externalTrainingId)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to load attendance'));
}

function updateStatus(req, res) {
  const facilitatorId = req.user?.id;
  attendanceService
    .updateAttendanceStatus(req.params.id, req.params.eventType, req.body.status, facilitatorId)
    .then((data) => res.json(data))
    .catch((err) => sendError(res, err, 'Failed to update status'));
}

function getScanHistory(req, res) {
  const trainingId = req.query.training_id ? Number(req.query.training_id) : null;
  const externalTrainingId = req.query.external_training_id ? Number(req.query.external_training_id) : null;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  attendanceService
    .getScanHistory(trainingId, externalTrainingId, limit)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to load scan history'));
}

function assignFacilitator(req, res) {
  const assignedBy = req.user?.id;
  const trainingId = req.body.training_id ? Number(req.body.training_id) : null;
  const externalTrainingId = req.body.external_training_id ? Number(req.body.external_training_id) : null;

  attendanceService
    .assignFacilitator(trainingId, externalTrainingId, req.body.user_id, assignedBy)
    .then((data) => {
      logAudit('attendance.facilitator.assign', assignedBy, { userId: req.body.user_id, trainingId, externalTrainingId });
      return res.json(data);
    })
    .catch((err) => sendError(res, err, 'Failed to assign facilitator'));
}

function getFacilitators(req, res) {
  const trainingId = req.query.training_id ? Number(req.query.training_id) : null;
  const externalTrainingId = req.query.external_training_id ? Number(req.query.external_training_id) : null;

  attendanceService
    .getFacilitators(trainingId, externalTrainingId)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to load facilitators'));
}

function removeFacilitator(req, res) {
  const removedBy = req.user?.id;
  const trainingId = req.body.training_id ? Number(req.body.training_id) : null;
  const externalTrainingId = req.body.external_training_id ? Number(req.body.external_training_id) : null;
  const userId = req.body.user_id ? Number(req.body.user_id) : null;

  attendanceService
    .removeFacilitator(trainingId, externalTrainingId, userId)
    .then((data) => {
      logAudit('attendance.facilitator.remove', removedBy, { userId, trainingId, externalTrainingId });
      return res.json(data);
    })
    .catch((err) => sendError(res, err, 'Failed to remove facilitator'));
}

function getMyEvents(req, res) {
  const userId = req.user?.id;
  const role = req.user?.role;
  attendanceService
    .getMyEvents(userId, role)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to load events'));
}

function getEventStatus(req, res) {
  attendanceService
    .getEventStatus(req.params.eventType, req.params.id)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to load event status'));
}

module.exports = {
  scanInternal,
  scanExternal,
  manualCheckInInternal,
  manualCheckInExternal,
  getInternalAttendance,
  getExternalAttendance,
  updateStatus,
  getScanHistory,
  assignFacilitator,
  getFacilitators,
  removeFacilitator,
  getMyEvents,
  getEventStatus,
};