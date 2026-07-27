const pool = require('../config/database');

const REPORT_TYPES = ['attendance', 'readiness', 'logistics', 'custom'];
const REPORT_FORMATS = ['pdf', 'excel', 'csv'];
const EVENT_TYPES = ['internal', 'external'];

function isValidReportType(t) {
  return REPORT_TYPES.includes(t);
}

function isValidReportFormat(f) {
  return REPORT_FORMATS.includes(f);
}

function isValidEventType(t) {
  return EVENT_TYPES.includes(t);
}

async function countReports({ search, type, event_type }) {
  let sql = 'SELECT COUNT(*) AS total FROM reports WHERE 1 = 1';
  const params = [];
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (event_type) {
    sql += ' AND event_type = ?';
    params.push(event_type);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR summary LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }
  const [rows] = await pool.query(sql, params);
  return rows[0]?.total ?? 0;
}

async function findMany({ page, limit, search, type, event_type }) {
  const offset = (page - 1) * limit;
  let sql = `
    SELECT r.id, r.title, r.event_type, r.event_source_id, r.event_date, r.summary,
           r.type, r.format, r.file_path, r.file_size, r.generated_by, r.generated_at,
           r.created_at
    FROM reports r
    WHERE 1 = 1
  `;
  const params = [];
  if (type) {
    sql += ' AND r.type = ?';
    params.push(type);
  }
  if (event_type) {
    sql += ' AND r.event_type = ?';
    params.push(event_type);
  }
  if (search) {
    sql += ' AND (r.title LIKE ? OR r.summary LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }
  sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT r.id, r.title, r.event_type, r.event_source_id, r.event_date, r.summary,
            r.type, r.format, r.file_path, r.file_size, r.parameters,
            r.generated_by, r.generated_at, r.expires_at, r.is_recurring,
            r.schedule_pattern, r.created_at
     FROM reports r WHERE r.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function insertReport(conn, row) {
  const [result] = await conn.query(
    `INSERT INTO reports (title, event_type, event_source_id, event_date, summary, type, format, generated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.title,
      row.event_type || 'internal',
      row.event_source_id ?? null,
      row.event_date ?? null,
      row.summary ?? null,
      row.type || 'custom',
      row.format || 'pdf',
      row.generated_by,
    ]
  );
  return result.insertId;
}

async function updateReport(conn, id, patch) {
  const fields = [];
  const params = [];
  const allowed = ['title', 'event_type', 'event_source_id', 'event_date', 'summary', 'type', 'format', 'file_path', 'file_size', 'parameters', 'expires_at', 'is_recurring', 'schedule_pattern'];
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      fields.push(`${k} = ?`);
      params.push(patch[k] ?? null);
    }
  }
  if (!fields.length) return 0;
  params.push(id);
  const [result] = await conn.query(`UPDATE reports SET ${fields.join(', ')} WHERE id = ?`, params);
  return result.affectedRows;
}

async function deleteReport(conn, id) {
  const [result] = await conn.query('DELETE FROM reports WHERE id = ?', [id]);
  return result.affectedRows;
}

async function deleteParticipantsByReportId(conn, reportId) {
  await conn.query('DELETE FROM report_participants WHERE report_id = ?', [reportId]);
}

async function insertParticipants(conn, reportId, participants) {
  if (!participants || !participants.length) return;
  const tuples = [];
  const params = [];
  for (const p of participants) {
    tuples.push('(?, ?, ?, ?, ?)');
    params.push(reportId, p.reservist_id, p.squadron_id ?? null, p.attendance_status || 'present', p.notes ?? null);
  }
  const sql = `INSERT INTO report_participants (report_id, reservist_id, squadron_id, attendance_status, notes) VALUES ${tuples.join(', ')}`;
  await conn.query(sql, params);
}

async function findParticipantsByReportId(reportId) {
  const [rows] = await pool.query(
    `SELECT rp.reservist_id, rp.squadron_id, rp.attendance_status, rp.notes,
            r.first_name, r.last_name, r.rank, r.service_number,
            s.name AS squadron_name
     FROM report_participants rp
     INNER JOIN reservists r ON r.id = rp.reservist_id
     LEFT JOIN squadron s ON s.id = rp.squadron_id
     WHERE rp.report_id = ?
     ORDER BY s.name ASC, r.last_name ASC, r.first_name ASC`,
    [reportId]
  );
  return rows;
}

async function deleteDocumentationsByReportId(conn, reportId) {
  await conn.query('DELETE FROM report_documentations WHERE report_id = ?', [reportId]);
}

async function insertDocumentation(conn, reportId, doc) {
  const [result] = await conn.query(
    `INSERT INTO report_documentations (report_id, original_filename, file_path, file_size, mime_type)
     VALUES (?, ?, ?, ?, ?)`,
    [reportId, doc.original_filename, doc.file_path, doc.file_size ?? null, doc.mime_type ?? null]
  );
  return result.insertId;
}

async function findDocumentationsByReportId(reportId) {
  const [rows] = await pool.query(
    `SELECT id, report_id, original_filename, file_path, file_size, mime_type, uploaded_at
     FROM report_documentations
     WHERE report_id = ?
     ORDER BY uploaded_at ASC`,
    [reportId]
  );
  return rows;
}

async function findDocumentationById(reportId, docId) {
  const [rows] = await pool.query(
    `SELECT id, report_id, original_filename, file_path, file_size, mime_type, uploaded_at
     FROM report_documentations
     WHERE id = ? AND report_id = ?`,
    [docId, reportId]
  );
  return rows[0] || null;
}

async function deleteDocumentationById(conn, reportId, docId) {
  const [result] = await conn.query(
    'DELETE FROM report_documentations WHERE id = ? AND report_id = ?',
    [docId, reportId]
  );
  return result.affectedRows;
}

module.exports = {
  pool,
  REPORT_TYPES,
  REPORT_FORMATS,
  EVENT_TYPES,
  isValidReportType,
  isValidReportFormat,
  isValidEventType,
  countReports,
  findMany,
  findById,
  insertReport,
  updateReport,
  deleteReport,
  deleteParticipantsByReportId,
  insertParticipants,
  findParticipantsByReportId,
  deleteDocumentationsByReportId,
  insertDocumentation,
  findDocumentationsByReportId,
  findDocumentationById,
  deleteDocumentationById,
};