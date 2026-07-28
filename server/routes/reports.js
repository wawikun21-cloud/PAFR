const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const reportsController = require('../controllers/reportsController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getUploadRoot, getMaxUploadBytes, isAllowedMime, safeExtFromOriginal } = require('../config/uploads');

const router = express.Router();

const rejectInvalid = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  return next();
};

const pageLimitValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

const idParam = [param('id').isInt({ min: 1 })];

const docStorage = multer.diskStorage({
  destination(req, file, cb) {
    const reportId = req.params.id;
    const dir = path.join(getUploadRoot(), 'reports', String(reportId));
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { return cb(e); }
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = safeExtFromOriginal(file.originalname) || '.bin';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: getMaxUploadBytes() },
  fileFilter(req, file, cb) {
    if (!isAllowedMime(file.mimetype)) {
      return cb(new Error('Only PDF, JPEG, and PNG files are allowed'));
    }
    if (!safeExtFromOriginal(file.originalname)) {
      return cb(new Error('Invalid file extension'));
    }
    cb(null, true);
  },
});

const documentationUploadMiddleware = (req, res, next) => {
  const upload = docUpload.single('documentation');
  upload(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message || 'Upload failed';
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
};

router.get(
  '/',
  authenticateToken,
  requireAdmin,
  pageLimitValidators,
  rejectInvalid,
  reportsController.listReports
);

router.get(
  '/:id',
  authenticateToken,
  requireAdmin,
  [...idParam],
  rejectInvalid,
  reportsController.getReport
);

router.post(
  '/',
  authenticateToken,
  requireAdmin,
  [
    body('title').trim().notEmpty().isLength({ max: 500 }),
    body('event_type').optional({ checkFalsy: true }).isIn(['internal', 'external']),
    body('event_source_id').optional({ checkFalsy: true }).isInt({ min: 1 }),
    body('event_date').optional({ checkFalsy: true }).isDate(),
    body('summary').optional({ checkFalsy: true }).isString(),
    body('type').optional({ checkFalsy: true }).isIn(['attendance', 'readiness', 'logistics', 'custom']),
    body('format').optional({ checkFalsy: true }).isIn(['pdf', 'excel', 'csv']),
    body('participants').optional({ checkFalsy: true }).isArray(),
  ],
  rejectInvalid,
  reportsController.createReport
);

router.patch(
  '/:id',
  authenticateToken,
  requireAdmin,
  [...idParam, body('participants').optional({ checkFalsy: true }).isArray()],
  rejectInvalid,
  reportsController.updateReport
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  [...idParam],
  rejectInvalid,
  reportsController.deleteReport
);

router.post(
  '/:id/documentations',
  authenticateToken,
  requireAdmin,
  [...idParam],
  rejectInvalid,
  documentationUploadMiddleware,
  reportsController.uploadDocumentation
);

const docIdParam = [...idParam, param('docId').isInt({ min: 1 })];

router.delete(
  '/:id/documentations/:docId',
  authenticateToken,
  requireAdmin,
  docIdParam,
  rejectInvalid,
  reportsController.deleteDocumentation
);

router.get(
  '/:id/documentations/:docId/download',
  authenticateToken,
  docIdParam,
  rejectInvalid,
  reportsController.downloadDocumentation
);

module.exports = router;