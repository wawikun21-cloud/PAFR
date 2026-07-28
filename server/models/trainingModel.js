const db = require('../config/database');
// rawPool kept for direct pool access; prefer db / db.getConnection() for Promises
const pool = db.rawPool;

const INTERNAL_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];

function toDatetime(dateStr, endOfDay = false) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return endOfDay ? `${s} 23:59:59` : `${s} 00:00:00`;
  }
  return s;
}

async function countInternal({ search, status, type, squadronId }) {
  let sql = `
    SELECT COUNT(DISTINCT t.id) AS total
    FROM trainings t
    LEFT JOIN activities a ON a.training_id = t.id AND a.id = (
      SELECT MIN(a2.id) FROM activities a2 WHERE a2.training_id = t.id
    )
    WHERE 1 = 1
  `;
  const params = [];

  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }
  if (type) {
    sql += ` AND JSON_VALID(a.description) AND JSON_UNQUOTE(JSON_EXTRACT(a.description, '$.activityType')) = ?`;
    params.push(type);
  }
  if (squadronId) {
    sql += ` AND EXISTS (
      SELECT 1 FROM internal_training_participants itp
      JOIN reservist_assignments ra ON itp.reservist_id = ra.reservist_id AND ra.is_primary = TRUE
      WHERE itp.training_id = t.id AND ra.squadron_id = ?
    )`;
    params.push(squadronId);
  }

  const [rows] = await db.query(sql, params);
  return rows[0]?.total ?? 0;
}

async function findInternalMany({ page, limit, search, status, type, squadronId }) {
  const offset = (page - 1) * limit;
  let sql = `
    SELECT
      t.id,
      t.title,
      t.description,
      t.start_datetime,
      t.end_datetime,
      t.venue,
      t.area_id,
      t.status,
      t.capacity,
      t.created_by,
      t.created_at,
      t.updated_at,
      t.venue AS location,
      TIMESTAMPDIFF(HOUR, t.start_datetime, t.end_datetime) AS duration_hours,
      CASE WHEN JSON_VALID(a.description) THEN JSON_UNQUOTE(JSON_EXTRACT(a.description, '$.activityType')) ELSE NULL END AS type,
      a.instructor AS instructor,
      CASE WHEN JSON_VALID(a.description) THEN JSON_UNQUOTE(JSON_EXTRACT(a.description, '$.requirements')) ELSE NULL END AS requirements
    FROM trainings t
    LEFT JOIN activities a ON a.training_id = t.id AND a.id = (
      SELECT MIN(a2.id) FROM activities a2 WHERE a2.training_id = t.id
    )
    WHERE 1 = 1
  `;
  const params = [];

  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }
  if (type) {
    sql += ` AND JSON_VALID(a.description) AND JSON_UNQUOTE(JSON_EXTRACT(a.description, '$.activityType')) = ?`;
    params.push(type);
  }
  if (squadronId) {
    sql += ` AND EXISTS (
      SELECT 1 FROM internal_training_participants itp
      JOIN reservist_assignments ra ON itp.reservist_id = ra.reservist_id AND ra.is_primary = TRUE
      WHERE itp.training_id = t.id AND ra.squadron_id = ?
    )`;
    params.push(squadronId);
  }

  sql += ' ORDER BY t.start_datetime DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  return rows;
}

async function findInternalById(id) {
  const [rows] = await db.query(
    `SELECT
       t.id,
       t.title,
       t.description,
       t.start_datetime,
       t.end_datetime,
       t.venue,
       t.area_id,
       t.status,
       t.capacity,
       t.created_by,
       t.created_at,
       t.updated_at,
       t.venue AS location,
       TIMESTAMPDIFF(HOUR, t.start_datetime, t.end_datetime) AS duration_hours
     FROM trainings t
     WHERE t.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function insertInternal(conn, row) {
  const sql = `
    INSERT INTO trainings (
      title, description, start_datetime, end_datetime, venue, area_id,
      status, capacity, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    row.title,
    row.description ?? null,
    row.start_datetime,
    row.end_datetime,
    row.venue,
    row.area_id ?? null,
    row.status,
    row.capacity ?? null,
    row.created_by,
  ];
  const executor = conn || db;
  const [result] = await executor.query(sql, params);
  return result.insertId;
}

async function updateInternal(id, patch, conn = null) {
  const allowed = [
    'title',
    'description',
    'start_datetime',
    'end_datetime',
    'venue',
    'area_id',
    'status',
    'capacity',
  ];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${key} = ?`);
      params.push(patch[key]);
    }
  }
  if (!sets.length) return 0;
  params.push(id);
  const executor = conn || db;
  const [result] = await executor.query(`UPDATE trainings SET ${sets.join(', ')} WHERE id = ?`, params);
  return result.affectedRows;
}

async function deleteInternal(id) {
  const [result] = await db.query('DELETE FROM trainings WHERE id = ?', [id]);
  return result.affectedRows;
}

function isValidInternalStatus(s) {
  return INTERNAL_STATUSES.includes(s);
}

module.exports = {
  db,
  pool,
  getConnection: db.getConnection.bind(db),
  toDatetime,
  countInternal,
  findInternalMany,
  findInternalById,
  insertInternal,
  updateInternal,
  deleteInternal,
  isValidInternalStatus,
  INTERNAL_STATUSES,
};
