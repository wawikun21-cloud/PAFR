const reportsService = require('../services/reportsService');
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
  return res.status(code).json(body);
}

function listReports(req, res) {
  reportsService
    .listReports(req.query)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to list reports'));
}

function getReport(req, res) {
  reportsService
    .getReportById(req.params.id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Report not found' });
      return res.json({ success: true, message: 'OK', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to load report'));
}

function createReport(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  reportsService
    .createReport(req.body, userId)
    .then((data) => {
      logAudit('report.create', userId, { reportId: data.id });
      return res.status(201).json({ success: true, message: 'Report created successfully', data });
    })
    .catch((err) => sendError(res, err, 'Failed to create report'));
}

function updateReport(req, res) {
  const userId = req.user?.id;
  reportsService
    .updateReport(req.params.id, req.body)
    .then((data) => {
      logAudit('report.update', userId, { reportId: req.params.id });
      return res.json({ success: true, message: 'Report updated successfully', data });
    })
    .catch((err) => sendError(res, err, 'Failed to update report'));
}

function deleteReport(req, res) {
  const userId = req.user?.id;
  reportsService
    .deleteReport(req.params.id)
    .then((ok) => {
      if (!ok) return res.status(404).json({ success: false, message: 'Report not found' });
      logAudit('report.delete', userId, { reportId: req.params.id });
      return res.json({ success: true, message: 'Report deleted successfully', data: null });
    })
    .catch((err) => sendError(res, err, 'Failed to delete report'));
}

function uploadDocumentation(req, res) {
  const userId = req.user?.id;
  const reportId = Number(req.params.id);
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  reportsService
    .saveDocumentation(reportId, req.file)
    .then((data) => {
      logAudit('report.documentation.upload', userId, { reportId, docId: data.id });
      return res.status(201).json({ success: true, message: 'Documentation uploaded', data });
    })
    .catch((err) => sendError(res, err, 'Failed to upload documentation'));
}

function deleteDocumentation(req, res) {
  const userId = req.user?.id;
  const reportId = Number(req.params.id);
  const docId = Number(req.params.docId);
  reportsService
    .deleteDocumentation(reportId, docId)
    .then((ok) => {
      if (!ok) return res.status(404).json({ success: false, message: 'Documentation not found' });
      logAudit('report.documentation.delete', userId, { reportId, docId });
      return res.json({ success: true, message: 'Documentation deleted successfully', data: null });
    })
    .catch((err) => sendError(res, err, 'Failed to delete documentation'));
}

function downloadDocumentation(req, res) {
  const reportId = Number(req.params.id);
  const docId = Number(req.params.docId);
  reportsService
    .getDocumentationFile(reportId, docId)
    .then((doc) => {
      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      return res.download(doc.file_path, doc.original_filename, (err) => {
        if (err && !res.headersSent) {
          sendError(res, err, 'Failed to download documentation');
        }
      });
    })
    .catch((err) => sendError(res, err, 'Failed to download documentation'));
}

module.exports = {
  listReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  uploadDocumentation,
  deleteDocumentation,
  downloadDocumentation,
};