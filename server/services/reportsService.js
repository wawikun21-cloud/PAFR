const reportModel = require('../models/reportModel');
const { getUploadRoot } = require('../config/uploads');
const path = require('path');
const fs = require('fs');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function clampPagination(page, limit) {
  const p = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
  const l = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT));
  return { page: p, limit: l };
}

function reportDir(reportId) {
  return path.join(getUploadRoot(), 'reports', String(reportId));
}

async function listReports(query) {
  const { page, limit } = clampPagination(query.page, query.limit);
  const search = query.search ? String(query.search).trim() : '';
  const type = query.type && query.type !== 'all' ? query.type : null;
  const event_type = query.event_type && query.event_type !== 'all' ? query.event_type : null;

  const [total, rows] = await Promise.all([
    reportModel.countReports({ search: search || null, type, event_type }),
    reportModel.findMany({ page, limit, search: search || null, type, event_type }),
  ]);

  return {
    reports: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function getReportById(id) {
  const report = await reportModel.findById(id);
  if (!report) return null;
  const [participants, documentations] = await Promise.all([
    reportModel.findParticipantsByReportId(id),
    reportModel.findDocumentationsByReportId(id),
  ]);
  return { ...report, participants, documentations };
}

function normalizeAttendance(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const p of input) {
    const rid = Number(p?.reservist_id);
    if (!rid) continue;
    out.push({
      reservist_id: rid,
      squadron_id: p?.squadron_id ? Number(p.squadron_id) : null,
      attendance_status: p?.attendance_status || 'present',
      notes: p?.notes ? String(p.notes).slice(0, 500) : null,
    });
  }
  return out;
}

async function createReport(body, userId) {
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('Title is required');
    err.statusCode = 400;
    throw err;
  }

  const event_type = body.event_type === 'external' ? 'external' : 'internal';
  const event_source_id = body.event_source_id ? Number(body.event_source_id) : null;
  const event_date = body.event_date || null;
  const summary = body.summary ? String(body.summary).trim() : null;
  const type = reportModel.isValidReportType(body.type) ? body.type : 'custom';
  const format = reportModel.isValidReportFormat(body.format) ? body.format : 'pdf';
  const attendance = normalizeAttendance(body.participants);

  const conn = await reportModel.pool.getConnection();
  try {
    await conn.beginTransaction();

    const reportId = await reportModel.insertReport(conn, {
      title,
      event_type,
      event_source_id,
      event_date,
      summary,
      type,
      format,
      generated_by: userId,
    });

    if (attendance.length) {
      await reportModel.insertParticipants(conn, reportId, attendance);
    }

    await conn.commit();
    return getReportById(reportId);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateReport(id, body) {
  const existing = await reportModel.findById(id);
  if (!existing) {
    const err = new Error('Report not found');
    err.statusCode = 404;
    throw err;
  }

  const patch = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.event_type !== undefined) patch.event_type = body.event_type === 'external' ? 'external' : 'internal';
  if (body.event_source_id !== undefined) patch.event_source_id = body.event_source_id ? Number(body.event_source_id) : null;
  if (body.event_date !== undefined) patch.event_date = body.event_date || null;
  if (body.summary !== undefined) patch.summary = body.summary ? String(body.summary).trim() : null;
  if (body.type !== undefined && reportModel.isValidReportType(body.type)) patch.type = body.type;
  if (body.format !== undefined && reportModel.isValidReportFormat(body.format)) patch.format = body.format;

  const attendance = body.participants !== undefined ? normalizeAttendance(body.participants) : undefined;

  const conn = await reportModel.pool.getConnection();
  try {
    await conn.beginTransaction();

    if (Object.keys(patch).length) {
      await reportModel.updateReport(conn, id, patch);
    }

    if (attendance !== undefined) {
      await reportModel.deleteParticipantsByReportId(conn, id);
      if (attendance.length) {
        await reportModel.insertParticipants(conn, id, attendance);
      }
    }

    await conn.commit();
    return getReportById(id);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function deleteReport(id) {
  const existing = await reportModel.findById(id);
  if (!existing) {
    const err = new Error('Report not found');
    err.statusCode = 404;
    throw err;
  }

  const conn = await reportModel.pool.getConnection();
  try {
    await conn.beginTransaction();

    await reportModel.deleteParticipantsByReportId(conn, id);
    await reportModel.deleteDocumentationsByReportId(conn, id);

    const dir = reportDir(id);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }

    const n = await reportModel.deleteReport(conn, id);
    await conn.commit();
    return n > 0;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function saveDocumentation(reportId, file) {
  const dir = reportDir(reportId);
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }

  const doc = {
    original_filename: file.originalname,
    file_path: file.path,
    file_size: file.size,
    mime_type: file.mimetype,
  };
  const docConn = await reportModel.pool.getConnection();
  try {
    const docId = await reportModel.insertDocumentation(docConn, reportId, doc);
    return { id: docId, ...doc };
  } finally {
    docConn.release();
  }
}

async function deleteDocumentation(reportId, docId) {
  const doc = await reportModel.findDocumentationById(reportId, docId);
  if (!doc) {
    const err = new Error('Documentation not found');
    err.statusCode = 404;
    throw err;
  }

  const conn = await reportModel.pool.getConnection();
  try {
    await conn.beginTransaction();
    const n = await reportModel.deleteDocumentationById(conn, reportId, docId);
    await conn.commit();
    if (n > 0) {
      try { fs.unlinkSync(doc.file_path); } catch { /* ignore, file may already be gone */ }
    }
    return n > 0;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function getDocumentationFile(reportId, docId) {
  const doc = await reportModel.findDocumentationById(reportId, docId);
  if (!doc) {
    const err = new Error('Documentation not found');
    err.statusCode = 404;
    throw err;
  }
  if (!fs.existsSync(doc.file_path)) {
    const err = new Error('File is missing from storage');
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

module.exports = {
  listReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  saveDocumentation,
  deleteDocumentation,
  getDocumentationFile,
};