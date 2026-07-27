const attendanceModel = require('../models/attendanceModel');
const { isAdmin } = require('./rbac');

const authorizeFacilitator = () => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - No user information',
        code: 'UNAUTHORIZED'
      });
    }

    // Any admin tier (admin, admin_arsen, admin_group, admin_squadron) can
    // manage attendance unconditionally. Only a plain assigned facilitator
    // needs the per-event training_facilitators check below.
    if (isAdmin(req.user.role)) {
      return next();
    }

    // Get training/event IDs from various sources.
    // req.body/req.query can be undefined on GET requests or if body-parser
    // hasn't run yet, so fall back to an empty object before reading off them.
    const body = req.body || {};
    const query = req.query || {};
    const eventType = req.params.eventType;
    const genericId = req.params.id || null;

    // req.params.id is shared by BOTH /:eventType/:id (internal or external)
    // routes, so it must not be assigned to trainingId unconditionally — that
    // silently mis-routes external event checks against the internal
    // trainings table (and vice versa). Resolve it based on eventType first.
    let trainingId = req.params.trainingId || body.training_id || query.training_id || null;
    let externalTrainingId = req.params.externalTrainingId || body.external_training_id || query.external_training_id || null;

    if (eventType === 'internal') {
      trainingId = trainingId || genericId;
    } else if (eventType === 'external') {
      externalTrainingId = externalTrainingId || genericId;
    } else if (!trainingId && !externalTrainingId) {
      // No eventType on this route at all (legacy routes keyed by :trainingId
      // or :externalTrainingId directly) — fall back to the generic :id.
      trainingId = genericId;
    }

    // For /:eventType/:id routes, determine which table to check based on eventType
    if (eventType === 'internal' && trainingId) {
      const isFac = await attendanceModel.isFacilitator(trainingId, null, req.user.id);
      if (!isFac) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You must be an admin or assigned facilitator for this event.',
          code: 'FORBIDDEN'
        });
      }
    } else if (eventType === 'external' && externalTrainingId) {
      const isFac = await attendanceModel.isFacilitator(null, externalTrainingId, req.user.id);
      if (!isFac) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You must be an admin or assigned facilitator for this event.',
          code: 'FORBIDDEN'
        });
      }
    } else {
      // Legacy check for routes with trainingId or externalTrainingId params
      const isFac = await attendanceModel.isFacilitator(trainingId, externalTrainingId, req.user.id);
      if (!isFac) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You must be an admin or assigned facilitator for this event.',
          code: 'FORBIDDEN'
        });
      }
    }

    next();
  };
};

/**
 * For the PATCH /:eventType/:id (updateAttendanceStatus) route specifically.
 * Unlike /event-status/:eventType/:id — where :id genuinely IS the training/
 * external_training id — this route's :id is the attendance RECORD's own
 * primary key (attendance.id or external_training_attendance.id). Treating it
 * as a training id (what authorizeFacilitator does) silently checks the
 * wrong training's facilitator list. This variant looks up the record's real
 * training/external_training id first, then authorizes against that.
 */
const authorizeFacilitatorForAttendanceRecord = () => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - No user information',
        code: 'UNAUTHORIZED'
      });
    }

    if (isAdmin(req.user.role)) {
      return next();
    }

    const { eventType, id } = req.params;
    const eventId = await attendanceModel.getAttendanceRecordEventId(eventType, id);

    if (!eventId) {
      return res.status(404).json({
        status: 'error',
        message: 'Attendance record not found',
        code: 'NOT_FOUND'
      });
    }

    const trainingId = eventType === 'internal' ? eventId : null;
    const externalTrainingId = eventType === 'external' ? eventId : null;

    const isFac = await attendanceModel.isFacilitator(trainingId, externalTrainingId, req.user.id);
    if (!isFac) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You must be an admin or assigned facilitator for this event.',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

module.exports = { authorizeFacilitator, authorizeFacilitatorForAttendanceRecord };