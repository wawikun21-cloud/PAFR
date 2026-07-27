const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/auth');
const { authorize, requireAdmin } = require('../middleware/rbac');
const { authorizeFacilitator, authorizeFacilitatorForAttendanceRecord } = require('../middleware/facilitatorAuth');

const router = express.Router();

const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(e => ({
      field: e.path || e.param,
      message: e.msg,
      value: e.value
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorDetails
    });
  }
  return next();
};

const idParam = [param('id').isInt({ min: 1 })];
const trainingIdParam = [param('trainingId').isInt({ min: 1 })];
const externalTrainingIdParam = [param('externalTrainingId').isInt({ min: 1 })];

// ── Scan endpoints (admin or facilitator) ────────────────────────────────────

router.post(
  '/scan/internal/:trainingId',
  authenticateToken,
  authorizeFacilitator(),
  [
    ...trainingIdParam,
    body('qr_code').trim().notEmpty().withMessage('QR code is required'),
    body('scan_method').optional().isIn(['qr_scanner', 'camera', 'manual']),
    body('device_info').if((value) => value !== undefined).isString().isLength({ max: 500 }),
  ],
  rejectInvalid,
  attendanceController.scanInternal
);

router.post(
  '/scan/external/:externalTrainingId',
  authenticateToken,
  authorizeFacilitator(),
  [
    ...externalTrainingIdParam,
    body('qr_code').trim().notEmpty().withMessage('QR code is required'),
    body('scan_method').optional().isIn(['qr_scanner', 'camera', 'manual']),
    body('device_info').if((value) => value !== undefined).isString().isLength({ max: 500 }),
  ],
  rejectInvalid,
  attendanceController.scanExternal
);

// ── Manual check-in (admin or facilitator) ────────────────────────────────────

router.post(
  '/manual/internal/:trainingId',
  authenticateToken,
  authorizeFacilitator(),
  [
    ...trainingIdParam,
    body('reservist_id').isInt({ min: 1 }).withMessage('reservist_id is required'),
    body('status').isIn(['present', 'absent', 'late', 'excused', 'pending']).withMessage('Invalid status'),
  ],
  rejectInvalid,
  attendanceController.manualCheckInInternal
);

router.post(
  '/manual/external/:externalTrainingId',
  authenticateToken,
  authorizeFacilitator(),
  [
    ...externalTrainingIdParam,
    body('reservist_id').optional().isInt({ min: 1 }).withMessage('reservist_id must be a positive integer'),
    body('registration_id').optional().isInt({ min: 1 }).withMessage('registration_id must be a positive integer'),
    body('status').isIn(['present', 'absent', 'late', 'excused', 'pending']).withMessage('Invalid status'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    // Additional validation: at least one ID must be provided
    const hasReservistId = req.body.reservist_id !== undefined;
    const hasRegistrationId = req.body.registration_id !== undefined;
    if (!hasReservistId && !hasRegistrationId) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'reservist_id', message: 'Either reservist_id or registration_id is required' }]
      });
    }
    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(e => ({
        field: e.path || e.param,
        message: e.msg,
        value: e.value
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails
      });
    }
    return next();
  },
  attendanceController.manualCheckInExternal
);

// ── Attendance list & stats (admin or facilitator) ────────────────────────────

router.get(
  '/internal/:trainingId',
  authenticateToken,
  authorizeFacilitator(),
  [...trainingIdParam],
  rejectInvalid,
  attendanceController.getInternalAttendance
);

router.get(
  '/external/:externalTrainingId',
  authenticateToken,
  authorizeFacilitator(),
  [...externalTrainingIdParam],
  rejectInvalid,
  attendanceController.getExternalAttendance
);

// ── Update attendance status (admin or facilitator) ───────────────────────────

router.patch(
  '/:eventType/:id',
  authenticateToken,
  authorizeFacilitatorForAttendanceRecord(),
  [
    ...idParam,
    param('eventType').isIn(['internal', 'external']).withMessage('eventType must be internal or external'),
    body('status').isIn(['present', 'absent', 'late', 'excused', 'pending']).withMessage('Invalid status'),
  ],
  rejectInvalid,
  attendanceController.updateStatus
);

// ── Scan audit log (admin or facilitator) ─────────────────────────────────────

router.get(
  '/scan-history',
  authenticateToken,
  authorizeFacilitator(),
  [
    query('training_id').optional().isInt({ min: 1 }),
    query('external_training_id').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  rejectInvalid,
  attendanceController.getScanHistory
);

// ── My events — list events where current user is facilitator ─────────────────

router.get(
  '/my-events',
  authenticateToken,
  attendanceController.getMyEvents
);

// ── Event status — quick stats for a specific event ───────────────────────────

router.get(
  '/event-status/:eventType/:id',
  authenticateToken,
  authorizeFacilitator(),
  [
    ...idParam,
    param('eventType').isIn(['internal', 'external']).withMessage('eventType must be internal or external'),
  ],
  rejectInvalid,
  attendanceController.getEventStatus
);

// ── Facilitator management (admin only) ───────────────────────────────────────

router.post(
  '/facilitators',
  authenticateToken,
  requireAdmin,
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
    body('training_id').optional().isInt({ min: 1 }),
    body('external_training_id').optional().isInt({ min: 1 }),
  ],
  rejectInvalid,
  attendanceController.assignFacilitator
);

router.get(
  '/facilitators',
  authenticateToken,
  requireAdmin,
  [
    query('training_id').optional().isInt({ min: 1 }),
    query('external_training_id').optional().isInt({ min: 1 }),
  ],
  rejectInvalid,
  attendanceController.getFacilitators
);

router.delete(
  '/facilitators',
  authenticateToken,
  requireAdmin,
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
    body('training_id').optional().isInt({ min: 1 }),
    body('external_training_id').optional().isInt({ min: 1 }),
  ],
  rejectInvalid,
  attendanceController.removeFacilitator
);

module.exports = router;