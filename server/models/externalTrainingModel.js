const pool = require('../config/database');

const EXTERNAL_STATUSES = ['draft', 'open', 'closed', 'completed'];

async function countExternal({ search, status }) {
  let sql = 'SELECT COUNT(*) AS total FROM external_trainings WHERE 1 = 1';
  const params = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }
  const [rows] = await pool.query(sql, params);
  return rows[0]?.total ?? 0;
}

async function findExternalMany({ page, limit, search, status }) {
  const offset = (page - 1) * limit;
  let sql = `
    SELECT id, title, description, start_date, start_time, venue, status, capacity,
           instructor, squadron_limits, created_at, updated_at
    FROM external_trainings
    WHERE 1 = 1
  `;
  const params = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }
  sql += ' ORDER BY start_date DESC, id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const [rows] = await pool.query(sql, params);
  return rows.map((r) => ({
    ...r,
    squadron_limits:
      typeof r.squadron_limits === 'string'
        ? safeJsonParse(r.squadron_limits)
        : r.squadron_limits,
  }));
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function findExternalById(id) {
  const [rows] = await pool.query(
    `SELECT id, title, description, start_date, start_time, venue, status, capacity,
            instructor, squadron_limits, created_at, updated_at
     FROM external_trainings WHERE id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    ...r,
    squadron_limits:
      typeof r.squadron_limits === 'string'
        ? safeJsonParse(r.squadron_limits)
        : r.squadron_limits,
  };
}

async function insertExternal(row) {
  const executor = row.executor || pool;
  const [result] = await executor.query(
    `INSERT INTO external_trainings (
      title, description, start_date, start_time, venue, status, capacity, instructor, squadron_limits
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.title,
      row.description ?? null,
      row.start_date,
      row.start_time ?? null,
      row.venue ?? null,
      row.status,
      row.capacity ?? null,
      row.instructor ?? null,
      row.squadron_limits == null ? null : typeof row.squadron_limits === 'string' ? row.squadron_limits : JSON.stringify(row.squadron_limits),
    ]
  );
  return result.insertId;
}

async function updateExternal(id, patch) {
  const fields = [];
  const params = [];
  const map = {
    title: patch.title,
    description: patch.description,
    start_date: patch.start_date,
    start_time: patch.start_time,
    venue: patch.venue,
    status: patch.status,
    capacity: patch.capacity,
    instructor: patch.instructor,
  };
  for (const [k, v] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      fields.push(`${k} = ?`);
      params.push(v ?? null);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'squadron_limits')) {
    fields.push('squadron_limits = ?');
    const sl = patch.squadron_limits;
    params.push(sl == null ? null : typeof sl === 'string' ? sl : JSON.stringify(sl));
  }
  if (!fields.length) return 0;
  params.push(id);
  const executor = patch.executor || pool;
  const [result] = await executor.query(
    `UPDATE external_trainings SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function deleteExternal(id) {
  const [result] = await pool.query('DELETE FROM external_trainings WHERE id = ?', [id]);
  return result.affectedRows;
}

async function getParticipantsForTraining(trainingId) {
  const [rows] = await pool.query(
    `SELECT 
       tr.id,
       tr.training_id,
       tr.participant_data,
       tr.registered_at
     FROM training_registrations tr
     WHERE tr.training_id = ?
     ORDER BY tr.registered_at DESC`,
    [trainingId]
  );
  return rows.map((r) => ({
    ...r,
    participant_data:
      typeof r.participant_data === 'string'
        ? safeJsonParse(r.participant_data)
        : r.participant_data,
  }));
}

function isValidExternalStatus(s) {
  return EXTERNAL_STATUSES.includes(s);
}

/**
 * Creates a personal alert for a reservist upon successful registration
 * in an external training.  Mirrors the pattern used for internal training
 * assignment notifications (`training_assigned_internal`).
 *
 * @param {object} opts
 * @param {number} opts.reservistUserId  - The `users.id` of the reservist
 * @param {string} opts.trainingTitle    - Title of the external training
 * @param {string|Date} opts.startDate   - Training start date (for the message)
 * @param {object} [opts.executor]       - Optional transaction executor (e.g. pool connection)
 */
async function notifyExternalRegistration({ reservistUserId, trainingTitle, startDate, executor }) {
  const db = executor || pool;

  const formattedDate = startDate
    ? new Date(startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const title = `Successfully registered for "${trainingTitle}"`;
  const message = formattedDate
    ? `You have been successfully registered for the external training "${trainingTitle}" scheduled on ${formattedDate}.`
    : `You have been successfully registered for the external training "${trainingTitle}".`;

  // 1. Insert the alert row
  const [alertResult] = await db.query(
    `INSERT INTO alerts (title, message, alert_type, target_role, is_active, start_date)
     VALUES (?, ?, 'training_registered_external', 'reservist', 1, NOW())`,
    [title, message]
  );
  const alertId = alertResult.insertId;

  // 2. Link it to this reservist only via user_alerts (same as internal assignment flow)
  await db.query(
    `INSERT INTO user_alerts (user_id, alert_id, is_read)
     VALUES (?, ?, 0)`,
    [reservistUserId, alertId]
  );

  return alertId;
}

module.exports = {
  countExternal,
  findExternalMany,
  findExternalById,
  insertExternal,
  updateExternal,
  deleteExternal,
  isValidExternalStatus,
  notifyExternalRegistration,
  EXTERNAL_STATUSES,
  getParticipantsForTraining,
};
