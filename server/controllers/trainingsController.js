const trainingsService = require('../services/trainingsService');
const trainingAttachmentService = require('../services/trainingAttachmentService');
const externalTrainingAttachmentService = require('../services/externalTrainingAttachmentService');
const { logAudit } = require('../utils/auditLogger');
const { sendTrainingAlertSafe } = require('../services/Alertservice');
const fs = require('fs');

function sendError(res, err, fallback = 'Request failed') {
  const code = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = err.statusCode ? err.message : fallback;
  const body = { success: false, message };
  // Non-production: surface driver/SQL errors so misconfigured or stale API processes are obvious in Network tab.
  if (process.env.NODE_ENV !== 'production' && code === 500 && err && typeof err === 'object') {
    if (err.message && err.message !== message) body.details = err.message;
    if (err.sqlMessage) body.sqlMessage = err.sqlMessage;
    if (err.code) body.code = err.code;
  }
  if (code === 500) {
    console.error('[Training Controller Error]', err);
  }
  return res.status(code).json(body);
}

function listInternal(req, res) {
  const query = { ...req.query };
  if (req.user?.role === 'reservist') {
    const db = require('../config/database');
    db.query('SELECT id FROM reservists WHERE user_id = ?', [req.user.id])
      .then(([rRows]) => {
        if (rRows.length === 0) {
          query.squadronId = -1;
          return trainingsService.listInternalTrainings(query);
        }
        return db.query(
          'SELECT squadron_id FROM reservist_assignments WHERE reservist_id = ? AND is_primary = TRUE',
          [rRows[0].id]
        ).then(([aRows]) => {
          if (aRows.length > 0) {
            query.squadronId = aRows[0].squadron_id;
          } else {
            query.squadronId = -1;
          }
          return trainingsService.listInternalTrainings(query);
        });
      })
      .then((data) =>
        res.json({
          success: true,
          message: 'OK',
          data,
        })
      )
      .catch((err) => sendError(res, err, 'Failed to list trainings'));
  } else {
    trainingsService
      .listInternalTrainings(query)
      .then((data) =>
        res.json({
          success: true,
          message: 'OK',
          data,
        })
      )
      .catch((err) => sendError(res, err, 'Failed to list trainings'));
  }
}

function getInternal(req, res) {
  trainingsService
    .getInternalTrainingById(req.params.id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Training not found' });
      return res.json({ success: true, message: 'OK', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to load training'));
}

function createInternal(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  trainingsService
    .createInternalTraining(req.body, userId)
    .then((data) => {
      logAudit('training.create', userId, { trainingId: data.id });
      return res.status(201).json({ success: true, message: 'Training created successfully', data });
    })
    .catch((err) => sendError(res, err, 'Failed to create training'));
}

function updateInternal(req, res) {
  const userId = req.user?.id;
  trainingsService
    .updateInternalTraining(req.params.id, req.body)
    .then((data) => {
      logAudit('training.update', userId, { trainingId: req.params.id });
      return res.json({ success: true, message: 'Training updated successfully', data });
    })
    .catch((err) => sendError(res, err, 'Failed to update training'));
}

function deleteInternal(req, res) {
  const userId = req.user?.id;
  trainingsService
    .deleteInternalTraining(req.params.id)
    .then((ok) => {
      if (!ok) return res.status(404).json({ success: false, message: 'Training not found' });
      logAudit('training.delete', userId, { trainingId: req.params.id });
      return res.json({ success: true, message: 'Training deleted successfully', data: null });
    })
    .catch((err) => sendError(res, err, 'Failed to delete training'));
}

function listActivities(req, res) {
  trainingsService
    .listActivities(req.params.trainingId)
    .then((activities) => res.json({ success: true, message: 'OK', data: { activities } }))
    .catch((err) => sendError(res, err, 'Failed to list activities'));
}

function createActivity(req, res) {
  const userId = req.user?.id;
  trainingsService
    .createActivity(req.params.trainingId, req.body)
    .then((activities) => {
      logAudit('activity.create', userId, { trainingId: req.params.trainingId });
      return res.status(201).json({ success: true, message: 'Activity created', data: { activities } });
    })
    .catch((err) => sendError(res, err, 'Failed to create activity'));
}

function updateActivity(req, res) {
  const userId = req.user?.id;
  trainingsService
    .updateActivity(req.params.trainingId, req.params.activityId, req.body)
    .then((activity) => {
      logAudit('activity.update', userId, { activityId: req.params.activityId });
      return res.json({ success: true, message: 'Activity updated', data: activity });
    })
    .catch((err) => sendError(res, err, 'Failed to update activity'));
}

function deleteActivity(req, res) {
  const userId = req.user?.id;
  trainingsService
    .deleteActivity(req.params.trainingId, req.params.activityId)
    .then(() => {
      logAudit('activity.delete', userId, { activityId: req.params.activityId });
      return res.json({ success: true, message: 'Activity deleted', data: null });
    })
    .catch((err) => sendError(res, err, 'Failed to delete activity'));
}

function listExternal(req, res) {
  const query = { ...req.query };
  if (req.user?.role === 'reservist') {
    const db = require('../config/database');
    db.query('SELECT id FROM reservists WHERE user_id = ?', [req.user.id])
      .then(([rRows]) => {
        if (rRows.length === 0) {
          query.squadronId = -1;
          return trainingsService.listExternalTrainings(query);
        }
        return db.query(
          'SELECT squadron_id FROM reservist_assignments WHERE reservist_id = ? AND is_primary = TRUE',
          [rRows[0].id]
        ).then(([aRows]) => {
          if (aRows.length > 0) {
            query.squadronId = aRows[0].squadron_id;
          } else {
            query.squadronId = -1;
          }
          return trainingsService.listExternalTrainings(query);
        });
      })
      .then((data) =>
        res.json({
          success: true,
          message: 'OK',
          data,
        })
      )
      .catch((err) => sendError(res, err, 'Failed to list external trainings'));
  } else {
    trainingsService
      .listExternalTrainings(query)
      .then((data) => res.json({ success: true, message: 'OK', data }))
      .catch((err) => sendError(res, err, 'Failed to list external trainings'));
  }
}

function getExternal(req, res) {
  trainingsService
    .getExternalTrainingById(req.params.id)
    .then((row) => {
      if (!row) return res.status(404).json({ success: false, message: 'Training not found' });
      return res.json({ success: true, message: 'OK', data: row });
    })
    .catch((err) => sendError(res, err, 'Failed to load training'));
}

function getInternalTrainingParticipants(req, res) {
  trainingsService
    .getInternalTrainingParticipants(req.params.trainingId)
    .then((participants) => {
      res.json({ success: true, message: 'OK', data: participants });
    })
    .catch((err) => sendError(res, err, 'Failed to load participants'));
}

function getExternalTrainingParticipants(req, res) {
  trainingsService
    .getExternalTrainingParticipants(req.params.id)
    .then((participants) => {
      res.json({ success: true, message: 'OK', data: participants });
    })
    .catch((err) => sendError(res, err, 'Failed to load participants'));
}

function createExternal(req, res) {
  const userId = req.user?.id;
  trainingsService
    .createExternalTraining(req.body)
    .then((data) => {
      logAudit('external_training.create', userId, { id: data.id });
      return res.status(201).json({ success: true, message: 'External training created', data });
    })
    .catch((err) => sendError(res, err, 'Failed to create external training'));
}

function updateExternal(req, res) {
  const userId = req.user?.id;
  trainingsService
    .updateExternalTraining(req.params.id, req.body)
    .then((data) => {
      logAudit('external_training.update', userId, { id: req.params.id });
      return res.json({ success: true, message: 'External training updated', data });
    })
    .catch((err) => sendError(res, err, 'Failed to update external training'));
}

function deleteExternal(req, res) {
  const userId = req.user?.id;
  trainingsService
    .deleteExternalTraining(req.params.id)
    .then((ok) => {
      if (!ok) return res.status(404).json({ success: false, message: 'Training not found' });
      logAudit('external_training.delete', userId, { id: req.params.id });
      return res.json({ success: true, message: 'External training deleted', data: null });
    })
    .catch((err) => sendError(res, err, 'Failed to delete external training'));
}

function registerExternal(req, res) {
  const registrantUserId = req.user?.id ?? null;
  trainingsService
    .registerExternalParticipant(req.params.id, req.body.participantData, registrantUserId)
    .then((data) => res.status(201).json({ success: true, message: 'Registered', data }))
    .catch((err) => sendError(res, err, 'Registration failed'));
}

function getTrainingSlotAvailability(req, res) {
  trainingsService
    .getTrainingSlotAvailability(req.params.id)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to get slot availability'));
}

function verifyReservist(req, res) {
  trainingsService
    .verifyReservistByServiceNumber(req.params.id, req.query.service_number, req.user?.id)
    .then((data) => res.json({ success: true, message: 'OK', data }))
    .catch((err) => sendError(res, err, 'Failed to verify service number'));
}

function listRegistrations(req, res) {
  const trainingId = Number(req.params.id);
  trainingsService
    .listRegistrations(trainingId)
    .then((data) =>
      res.json({
        success: true,
        message: 'OK',
        data,
      })
    )
    .catch((err) => sendError(res, err, 'Failed to list registrations'));
}

// Training stats for dashboard (Arsen → Group → Squadron with real counts)
function getTrainingStats(req, res) {
  trainingsService
    .getTrainingStats(req.query)
    .then((data) =>
      res.json({
        success: true,
        message: 'OK',
        data,
      })
    )
    .catch((err) => sendError(res, err, 'Failed to load training statistics'));
}

function uploadLetterOrder(req, res) {
  const trainingId = Number(req.params.trainingId);
  const userId = req.user?.id;
  trainingAttachmentService
    .registerLetterOrderUpload(trainingId, req.file, userId)
    .then((attachment) => res.status(201).json({ success: true, message: 'Letter order uploaded', data: attachment }))
    .catch((err) => sendError(res, err, 'Failed to upload letter order'));
}

function uploadExternalLetterOrder(req, res) {
  const externalTrainingId = Number(req.params.id);
  const userId = req.user?.id;
  externalTrainingAttachmentService
    .registerLetterOrderUpload(externalTrainingId, req.file, userId)
    .then((attachment) => res.status(201).json({ success: true, message: 'Letter order uploaded', data: attachment }))
    .catch((err) => sendError(res, err, 'Failed to upload letter order'));
}

function downloadTrainingAttachment(req, res) {
  const { trainingId, attachmentId } = req.params;
  trainingAttachmentService.getDownloadStreamContext(attachmentId, trainingId)
    .then(context => {
      res.setHeader('Content-Type', context.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${context.originalFilename}"`);
      const fileStream = fs.createReadStream(context.absolutePath);
      fileStream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Failed to read file' });
        }
      });
      fileStream.pipe(res);
    })
    .catch(err => sendError(res, err, 'Failed to download attachment'));
}

function downloadExternalTrainingAttachment(req, res) {
  const { id: externalTrainingId, attachmentId } = req.params;
  externalTrainingAttachmentService.getDownloadStreamContext(attachmentId, externalTrainingId)
    .then(context => {
      res.setHeader('Content-Type', context.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${context.originalFilename}"`);
      const fileStream = fs.createReadStream(context.absolutePath);
      fileStream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Failed to read file' });
        }
      });
      fileStream.pipe(res);
    })
    .catch(err => sendError(res, err, 'Failed to download attachment'));
}

function listInternalAttachments(req, res) {
  const trainingId = Number(req.params.trainingId);
  trainingAttachmentService
    .listPublicForTraining(trainingId)
    .then((attachments) => res.json({ success: true, message: 'OK', data: attachments }))
    .catch((err) => sendError(res, err, 'Failed to list attachments'));
}

function deleteInternalAttachment(req, res) {
  const trainingId = Number(req.params.trainingId);
  const attachmentId = Number(req.params.attachmentId);
  const userId = req.user?.id;
  trainingAttachmentService
    .deleteAttachment(attachmentId, trainingId)
    .then((data) => {
      logAudit('attachment.delete', userId, { trainingId, attachmentId });
      return res.json({ success: true, message: 'Attachment deleted', data });
    })
    .catch((err) => sendError(res, err, 'Failed to delete attachment'));
}

function listExternalAttachments(req, res) {
  const externalTrainingId = Number(req.params.id);
  externalTrainingAttachmentService
    .listPublicForExternalTraining(externalTrainingId)
    .then((attachments) => res.json({ success: true, message: 'OK', data: attachments }))
    .catch((err) => sendError(res, err, 'Failed to list attachments'));
}

function deleteExternalAttachment(req, res) {
  const externalTrainingId = Number(req.params.id);
  const attachmentId = Number(req.params.attachmentId);
  const userId = req.user?.id;
  externalTrainingAttachmentService
    .deleteAttachment(attachmentId, externalTrainingId)
    .then((data) => {
      logAudit('external_attachment.delete', userId, { externalTrainingId, attachmentId });
      return res.json({ success: true, message: 'Attachment deleted', data });
    })
    .catch((err) => sendError(res, err, 'Failed to delete attachment'));
}

module.exports = {
  listInternal,
  getInternal,
  createInternal,
  updateInternal,
  deleteInternal,
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  listExternal,
  getExternal,
  createExternal,
  updateExternal,
  deleteExternal,
  registerExternal,
  listRegistrations,
  uploadLetterOrder,
  downloadTrainingAttachment,
  uploadExternalLetterOrder,
  downloadExternalTrainingAttachment,
  listInternalAttachments,
  deleteInternalAttachment,
  listExternalAttachments,
  deleteExternalAttachment,
  getTrainingStats,
  getTrainingSlotAvailability,
  verifyReservist,
  getInternalTrainingParticipants,
  getExternalTrainingParticipants,
};