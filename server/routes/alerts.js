const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * Alerts & Insights API
 * - Broadcast alerts (admin-created) from `alerts` + per-user read via `user_alerts`
 * - System-generated alerts computed on-demand, persisted to `system_alerts` for stable IDs + ack
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getScopeWhere(user) {
  const conditions = [];
  const params = [];
  if (user.scope_squadron_id) {
    conditions.push('(target_squadron_id IS NULL OR target_squadron_id = ?)');
    params.push(user.scope_squadron_id);
  } else if (user.scope_group_id) {
    conditions.push('(target_group_id IS NULL OR target_group_id = ?)');
    params.push(user.scope_group_id);
  } else if (user.scope_arsen_id) {
    conditions.push('(target_area_id IS NULL OR target_area_id = ?)');
    params.push(user.scope_arsen_id);
  }
  return { where: conditions.length ? conditions.join(' AND ') : '1=1', params };
}

async function getRelevantBroadcastAlerts(user, filters = {}) {
  const { severity, unread_only } = filters;
  const { where: scopeWhere, params: scopeParams } = getScopeWhere(user);

  // Exclude personal training alerts — fetched separately via getPersonalTrainingAlerts
  // Note: alert_type column may not exist on older schemas; use LEFT JOIN check if needed
  const PERSONAL_ALERT_TYPES = ['training_assigned_internal', 'training_registered_external'];

  let sql = `
    SELECT 
      a.id,
      a.title,
      a.message,
      a.created_at,
      a.target_role,
      a.target_group_id,
      a.target_squadron_id,
      a.target_area_id,
      ua.is_read,
      'broadcast' AS source,
      'info' AS severity,
      'broadcast' AS alert_type
    FROM alerts a
    LEFT JOIN user_alerts ua ON ua.alert_id = a.id AND ua.user_id = ?
    WHERE a.is_active = 1
      AND (a.end_date IS NULL OR a.end_date >= CURDATE())
      AND (${scopeWhere})
  `;
  const queryParams = [user.id, ...scopeParams];

  if (unread_only === 'true' || unread_only === '1') {
    sql += ` AND (ua.is_read IS NULL OR ua.is_read = 0) `;
  }
  if (severity) {
    // broadcasts are 'info' level for now; could extend table later
    if (severity !== 'info') {
      return [];
    }
  }

  sql += ` ORDER BY a.created_at DESC LIMIT 200 `;

  const [rows] = await db.query(sql, queryParams);

  return rows.map((r) => ({
    id: `broadcast-${r.id}`,
    source: 'broadcast',
    alert_type: 'broadcast',
    severity: r.severity,
    title: r.title,
    message: r.message,
    created_at: r.created_at,
    is_read: !!r.is_read,
    entity_type: 'broadcast',
    target_role: r.target_role,
    target_group_id: r.target_group_id,
    target_squadron_id: r.target_squadron_id,
    target_area_id: r.target_area_id,
  }));
}


/**
 * Fetches training alerts that belong ONLY to the current user.
 * These are stored in alerts with a personal alert_type and linked
 * via user_alerts so only this user can see them.
 */
async function getPersonalTrainingAlerts(user, filters = {}) {
  const { unread_only } = filters;

  // Note: alert_type column may not exist on older schemas
  let sql = `
    SELECT
      a.id,
      a.title,
      a.message,
      '' AS alert_type,
      a.created_at,
      ua.is_read
    FROM user_alerts ua
    INNER JOIN alerts a ON a.id = ua.alert_id
    WHERE ua.user_id = ?
      AND a.is_active = 1
  `;
  const params = [user.id];

  if (unread_only === 'true' || unread_only === '1') {
    sql += ' AND ua.is_read = 0 ';
  }

  sql += ' ORDER BY a.created_at DESC LIMIT 200 ';

  const [rows] = await db.query(sql, params);

  return rows.map((r) => ({
    id: `broadcast-${r.id}`,   // re-use broadcast prefix so existing mark-as-read route works
    source: 'personal',
    alert_type: r.alert_type,
    severity: 'info',
    title: r.title,
    message: r.message,
    created_at: r.created_at,
    is_read: !!r.is_read,
    entity_type: 'training',
  }));
}

async function syncAndGetSystemAlerts(user, filters = {}) {
  const { severity, type: alertTypeFilter, unread_only } = filters;

  const [rules] = await db.query('SELECT * FROM alert_rules WHERE is_active = 1');
  const ruleMap = Object.fromEntries(rules.map((r) => [r.type, r]));

  const toEnsure = [];

  // ── 1. Low Readiness Squadrons (critical) ─────────────────────────
  {
    const rule = ruleMap.readiness_low;
    const th = rule?.threshold || 60;
    const [rows] = await db.query(
      `SELECT squadron_id, squadron_name, avg_readiness_score, group_id, arsen_id 
       FROM v_squadron_readiness 
       WHERE avg_readiness_score < ?`,
      [th]
    );
    for (const r of rows) {
      toEnsure.push({
        ruleType: 'readiness_low',
        title: `${r.squadron_name} has low readiness score`,
        message: `${r.squadron_name} has low readiness score (${r.avg_readiness_score}%) — recommended additional training and support`,
        severity: 'critical',
        entityType: 'squadron', entityId: r.squadron_id, entityName: r.squadron_name,
        squadronId: r.squadron_id, groupId: r.group_id, arsenId: r.arsen_id,
      });
    }
  }

  // ── 2. Reservists below 60% readiness (per squadron aggregate) ─────
  {
    const [rows] = await db.query(
      `SELECT 
         vs.squadron_id, vs.squadron_name, vs.group_id, vs.arsen_id,
         COUNT(*) AS n,
         ROUND(AVG(vr.readiness_score), 1) AS avg_score
       FROM v_reservist_readiness vr
       JOIN v_squadron_readiness vs ON vr.squadron_id = vs.squadron_id
       WHERE vr.readiness_score < 60
       GROUP BY vs.squadron_id`
    );
    for (const r of rows) {
      toEnsure.push({
        ruleType: 'readiness_low',
        title: `${r.n} reservists in ${r.squadron_name} have critical readiness`,
        message: `${r.n} reservists in ${r.squadron_name} have readiness below 60% (critical threshold)`,
        severity: 'critical',
        entityType: 'squadron', entityId: r.squadron_id, entityName: r.squadron_name,
        squadronId: r.squadron_id, groupId: r.group_id, arsenId: r.arsen_id,
      });
    }
  }

  // ── 3. No readiness assessment in last 180 days ────────────────────
  {
    const lookback = 180;
    const [rows] = await db.query(
      `SELECT 
         s.id AS squadron_id, s.name AS squadron_name, 
         g.id AS group_id, g.arsen_id,
         MAX(rd.assessment_date) AS last_assess
       FROM squadron s
       LEFT JOIN reservist_assignments ra ON ra.squadron_id = s.id AND ra.is_primary = 1
       LEFT JOIN readiness rd ON rd.reservist_id = ra.reservist_id
       LEFT JOIN \`groups\` g ON s.group_id = g.id
       GROUP BY s.id
       HAVING last_assess IS NULL OR last_assess < DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [lookback]
    );
    for (const r of rows) {
      toEnsure.push({
        ruleType: 'no_assessment',
        title: `${r.squadron_name} has no recent readiness assessment`,
        message: `${r.squadron_name} has no readiness assessment recorded in the last ${lookback} days`,
        severity: 'warning',
        entityType: 'squadron', entityId: r.squadron_id, entityName: r.squadron_name,
        squadronId: r.squadron_id, groupId: r.group_id, arsenId: r.arsen_id,
      });
    }
  }

  // ── 4. No training attendance in last 90 days ─────────────────────
  {
    const lookback = 90;
    const [rows] = await db.query(
      `SELECT 
         vs.squadron_id, vs.squadron_name, vs.group_id, vs.arsen_id,
         COUNT(DISTINCT r.id) AS n
       FROM reservists r
       LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = 1
       LEFT JOIN v_squadron_readiness vs ON ra.squadron_id = vs.squadron_id
       WHERE r.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM attendance a 
           WHERE a.reservist_id = r.id AND a.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         )
         AND NOT EXISTS (
           SELECT 1 FROM internal_training_participants itp 
           JOIN trainings t ON itp.training_id = t.id 
           WHERE itp.reservist_id = r.id AND t.start_datetime >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         )
       GROUP BY vs.squadron_id`,
      [lookback, lookback]
    );
    for (const r of rows) {
      if (r.n > 0) {
        toEnsure.push({
          ruleType: 'no_training',
          title: `${r.n} reservists in ${r.squadron_name} have not attended training recently`,
          message: `${r.n} reservists in ${r.squadron_name} have not attended any training in the last ${lookback} days`,
          severity: 'warning',
          entityType: 'squadron', entityId: r.squadron_id, entityName: r.squadron_name,
          squadronId: r.squadron_id, groupId: r.group_id, arsenId: r.arsen_id,
        });
      }
    }
  }

  // ── 5. Low attendance rate squadrons (<70%) ────────────────────────
  {
    const rule = ruleMap.low_attendance;
    const th = rule?.threshold || 70;
    const [rows] = await db.query(
      `SELECT squadron_id, squadron_name, avg_attendance_rate, group_id, arsen_id 
       FROM v_squadron_readiness 
       WHERE avg_attendance_rate < ?`,
      [th]
    );
    for (const r of rows) {
      toEnsure.push({
        ruleType: 'low_attendance',
        title: `${r.squadron_name} has low attendance rate`,
        message: `${r.squadron_name} attendance rate is ${r.avg_attendance_rate}% (below ${th}% threshold)`,
        severity: 'warning',
        entityType: 'squadron', entityId: r.squadron_id, entityName: r.squadron_name,
        squadronId: r.squadron_id, groupId: r.group_id, arsenId: r.arsen_id,
      });
    }
  }

  // ── 6. Low supply stock ────────────────────────────────────────────
  {
    const [rows] = await db.query(
      `SELECT id, name, quantity_available, COALESCE(reorder_level, 10) AS reorder_level
       FROM supplies 
       WHERE quantity_available <= COALESCE(reorder_level, 10)`
    );
    for (const r of rows) {
      toEnsure.push({
        ruleType: 'supply_low',
        title: `${r.name} stock below reorder level`,
        message: `${r.name} stock is ${r.quantity_available} (reorder at ${r.reorder_level})`,
        severity: 'warning',
        entityType: 'supply', entityId: r.id, entityName: r.name,
      });
    }
  }

  // ── 7. Overdue supply returns ──────────────────────────────────────
  {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS n FROM supply_issuances 
       WHERE returned_date IS NULL AND due_return_date < CURDATE()`
    );
    const n = rows[0]?.n || 0;
    if (n > 0) {
      toEnsure.push({
        ruleType: 'supply_overdue',
        title: `${n} supply issuances are past due return date`,
        message: `${n} supply issuances are overdue for return`,
        severity: 'critical',
        entityType: 'issuance', entityId: 0, entityName: 'Supplies',
      });
    }
  }

  // ── 8. Standby Reserve count ───────────────────────────────────────
  {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS n FROM reservists 
       WHERE reserve_status = 'Standby Reserve' AND is_active = 1`
    );
    const n = rows[0]?.n || 0;
    if (n > 0) {
      toEnsure.push({
        ruleType: 'profile_incomplete',
        title: `${n} reservists have "Standby Reserve" status`,
        message: `${n} reservists have "Standby Reserve" status but are overdue for reclassification review`,
        severity: 'warning',
        entityType: 'reservist', entityId: 0, entityName: 'Standby Reserve',
      });
    }
  }

  // ── 9. Incomplete profile data ─────────────────────────────────────
  {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS n FROM reservists 
       WHERE is_active = 1 AND (
         phone_number IS NULL OR TRIM(phone_number) = '' OR
         address IS NULL OR TRIM(address) = '' OR
         date_of_birth IS NULL
       )`
    );
    const n = rows[0]?.n || 0;
    if (n > 0) {
      toEnsure.push({
        ruleType: 'profile_incomplete',
        title: `${n} reservists have incomplete profile data`,
        message: `${n} reservists have incomplete profile data (missing required fields)`,
        severity: 'warning',
        entityType: 'reservist', entityId: 0, entityName: 'Profiles',
      });
    }
  }

  // ── 10. Medical unfit/limited ──────────────────────────────────────
  {
    const [rows] = await db.query(
      `SELECT COUNT(DISTINCT r.id) AS n
       FROM readiness rd
       JOIN reservists r ON rd.reservist_id = r.id
       WHERE r.is_active = 1 
         AND rd.medical_status IN ('unfit', 'limited')
         AND rd.assessment_date = (
           SELECT MAX(assessment_date) FROM readiness rd2 WHERE rd2.reservist_id = r.id
         )`
    );
    const n = rows[0]?.n || 0;
    if (n > 0) {
      toEnsure.push({
        ruleType: 'profile_incomplete',
        title: `${n} reservists have medical status unfit or limited`,
        message: `${n} reservists have medical status marked "unfit" or "limited"`,
        severity: 'warning',
        entityType: 'reservist', entityId: 0, entityName: 'Medical',
      });
    }
  }

  // ── 11. Upcoming training (48h) ──────────────────────────────────
  {
    const [rows] = await db.query(
       `SELECT t.id, t.title, t.start_datetime,
          (SELECT COUNT(*) FROM internal_training_participants itp 
           WHERE itp.training_id = t.id) AS participant_count
        FROM trainings t
        WHERE t.status IN ('published', 'ongoing')
          AND t.start_datetime >= CURDATE() AND t.start_datetime < DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
    );
    for (const r of rows) {
      if (r.participant_count > 0) {
        toEnsure.push({
          ruleType: 'training_upcoming',
          title: `Upcoming training "${r.title}" has registered participants`,
          message: `Training "${r.title}" starts soon with ${r.participant_count} participants`,
          severity: 'info',
          entityType: 'training', entityId: r.id, entityName: r.title,
        });
      }
    }
  }

  // ── Ensure all alerts in parallel ──────────────────────────────────
  async function ensureSystemAlert({ ruleType, title, message, severity, entityType, entityId, entityName, squadronId, groupId, arsenId }) {
    const entityIsNull = entityId == null;
    const checkWhere = entityIsNull
      ? 'alert_type = ? AND entity_id IS NULL'
      : 'alert_type = ? AND entity_id = ?';
    const checkParams = entityIsNull ? [ruleType] : [ruleType, entityId];

    const [existing] = await db.query(
      `SELECT id FROM system_alerts 
       WHERE ${checkWhere}
       LIMIT 1`,
      checkParams
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    const updateWhere = entityIsNull
      ? 'alert_type = ? AND entity_id IS NULL AND is_acknowledged = 0'
      : 'alert_type = ? AND entity_id = ? AND is_acknowledged = 0';
    const updateParams = entityIsNull ? [ruleType] : [ruleType, entityId];
    await db.query(
      `UPDATE system_alerts 
       SET is_acknowledged = 1, acknowledged_at = NOW() 
       WHERE ${updateWhere}`,
      updateParams
    );

    const rule = ruleMap[ruleType];
    const ruleId = rule ? rule.id : null;

    const [ins] = await db.query(
      `INSERT INTO system_alerts 
       (rule_id, alert_type, severity, title, message, entity_type, entity_id, entity_name, squadron_id, group_id, arsen_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ruleId, ruleType, severity, title, message, entityType, entityId, entityName, squadronId, groupId, arsenId]
    );
    return ins.insertId;
  }

  // Run with limited concurrency to avoid exhausting the connection pool
  const results = [];
  const batchSize = 3;
  for (let i = 0; i < toEnsure.length; i += batchSize) {
    const batch = toEnsure.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(args => ensureSystemAlert(args)));
    results.push(...batchResults);
  }
  const generated = results.map((id, i) => ({ dbId: id, ...toEnsure[i] }));

  // Now fetch the actual rows from system_alerts (respect scope + filters)
  let scopeFilter = '1=1';
  const scopeParams = [];
  if (user.scope_squadron_id) {
    scopeFilter = '(squadron_id IS NULL OR squadron_id = ?)';
    scopeParams.push(user.scope_squadron_id);
  } else if (user.scope_group_id) {
    scopeFilter = '(group_id IS NULL OR group_id = ?)';
    scopeParams.push(user.scope_group_id);
  } else if (user.scope_arsen_id) {
    scopeFilter = '(arsen_id IS NULL OR arsen_id = ?)';
    scopeParams.push(user.scope_arsen_id);
  }

  let systemSql = `
    SELECT id, alert_type, severity, title, message, entity_type, entity_id, entity_name,
           squadron_id, group_id, arsen_id, created_at, is_acknowledged
    FROM system_alerts
    WHERE is_acknowledged = 0 AND ${scopeFilter}
  `;
  const sysParams = [...scopeParams];

  if (alertTypeFilter) {
    systemSql += ` AND alert_type = ? `;
    sysParams.push(alertTypeFilter);
  }
  if (severity) {
    systemSql += ` AND severity = ? `;
    sysParams.push(severity);
  }

  systemSql += ` ORDER BY 
    FIELD(severity, 'critical', 'warning', 'info'), created_at DESC 
    LIMIT 300 `;

  const [systemRows] = await db.query(systemSql, sysParams);

  return systemRows.map((r) => ({
    id: `system-${r.id}`,
    source: 'system',
    alert_type: r.alert_type,
    severity: r.severity,
    title: r.title,
    message: r.message,
    created_at: r.created_at,
    is_read: !!r.is_acknowledged,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    entity_name: r.entity_name,
    squadron_id: r.squadron_id,
    group_id: r.group_id,
    arsen_id: r.arsen_id,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/alerts
 * Returns combined broadcast + system alerts with filtering
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = {
      severity: req.query.severity,
      type: req.query.type,
      scope: req.query.scope,
      scope_id: req.query.scope_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      unread_only: req.query.unread_only,
      search: (req.query.search || '').trim(),
    };

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 25));

    const isReservist = req.user.role === 'reservist';

    const [broadcast, system, personal] = await Promise.all([
      getRelevantBroadcastAlerts(req.user, filters),
      isReservist ? Promise.resolve([]) : syncAndGetSystemAlerts(req.user, filters),
      getPersonalTrainingAlerts(req.user, filters), // Always fetch personal training alerts for all users
    ]);

    let all = [...broadcast, ...system, ...personal];

    // Date filter
    if (filters.start_date) {
      const start = new Date(filters.start_date);
      all = all.filter((a) => new Date(a.created_at) >= start);
    }
    if (filters.end_date) {
      const end = new Date(filters.end_date);
      all = all.filter((a) => new Date(a.created_at) <= end);
    }

    // Text search (title + message)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      all = all.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.message || '').toLowerCase().includes(q)
      );
    }

    // Sort: critical first, then date desc
    all.sort((a, b) => {
      const sevOrder = { critical: 0, warning: 1, info: 2 };
      const sa = sevOrder[a.severity] ?? 3;
      const sb = sevOrder[b.severity] ?? 3;
      if (sa !== sb) return sa - sb;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const total = all.length;

    // Pagination
    const startIdx = (page - 1) * limit;
    const pagedAlerts = all.slice(startIdx, startIdx + limit);

    // Summary counts (based on full filtered set)
    const summary = {
      critical: all.filter((a) => a.severity === 'critical').length,
      warning: all.filter((a) => a.severity === 'warning').length,
      info: all.filter((a) => a.severity === 'info').length,
      unread: all.filter((a) => !a.is_read).length,
      total,
    };

    res.json({
      status: 'success',
      data: {
        alerts: pagedAlerts,
        summary,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch alerts',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * POST /api/alerts
 * Create broadcast alert (admin only)
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  [
    body('title').notEmpty().trim().withMessage('Title is required'),
    body('message').notEmpty().trim().withMessage('Message is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array(),
      });
    }

    try {
      const {
        title,
        message,
        target_role = 'all',
        target_group_id = null,
        target_squadron_id = null,
        target_area_id = null,
        start_date = null,
        end_date = null,
      } = req.body;

      const [result] = await db.query(
        `INSERT INTO alerts 
         (title, message, target_role, target_group_id, target_squadron_id, target_area_id, 
          created_by, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          message,
          target_role,
          target_group_id,
          target_squadron_id,
          target_area_id,
          req.user.id,
          start_date || new Date(),
          end_date,
        ]
      );

      const [newAlert] = await db.query('SELECT * FROM alerts WHERE id = ?', [result.insertId]);

      res.status(201).json({
        status: 'success',
        data: newAlert[0],
        message: 'Broadcast alert created',
      });
    } catch (error) {
      console.error('Error creating alert:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create alert',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * PATCH /api/alerts/:id/read
 * Mark broadcast or system alert as read/acknowledged for current user
 */
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params; // e.g. "broadcast-45", "system-12"
    // NOTE: personal training alerts (training_assigned_internal,
    // training_registered_external) intentionally share the "broadcast-" prefix
    // so they are marked read via the same user_alerts upsert path below.
    const [source, numericId] = id.split('-');

    if (source === 'broadcast') {
      await db.query(
        `INSERT INTO user_alerts (user_id, alert_id, is_read, read_at)
         VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE is_read = 1, read_at = NOW()`,
        [req.user.id, numericId]
      );
    } else if (source === 'system') {
      await db.query(
        `UPDATE system_alerts 
         SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = NOW()
         WHERE id = ?`,
        [req.user.id, numericId]
      );
    } else {
      return res.status(400).json({ status: 'error', message: 'Invalid alert id', code: 'BAD_REQUEST' });
    }

    res.json({ status: 'success', message: 'Alert marked as read' });
  } catch (error) {
    console.error('Error marking alert read:', error);
    res.status(500).json({ status: 'error', message: 'Failed to mark read', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/alerts/insights
 * Positive trends and top performers
 */
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    // Top training squadrons this month
    const [topTrainings] = await db.query(`
      SELECT 
        s.name AS squadron_name,
        COUNT(DISTINCT t.id) AS training_count
      FROM squadron s
      LEFT JOIN reservist_assignments ra ON ra.squadron_id = s.id
      LEFT JOIN internal_training_participants itp ON itp.reservist_id = ra.reservist_id
      LEFT JOIN trainings t ON t.id = itp.training_id 
        AND MONTH(t.start_datetime) = MONTH(CURDATE()) 
        AND YEAR(t.start_datetime) = YEAR(CURDATE())
      GROUP BY s.id
      ORDER BY training_count DESC
      LIMIT 5
    `);

    // Highest attendance (from view)
    const [highAttendance] = await db.query(`
      SELECT squadron_name, avg_attendance_rate
      FROM v_squadron_readiness
      ORDER BY avg_attendance_rate DESC
      LIMIT 5
    `);

    // Overall force readiness trend (simple month vs previous if data allows)
    const [[currentReadiness]] = await db.query('SELECT * FROM v_overall_readiness');

    const insights = {
      top_training_squadrons: topTrainings,
      highest_attendance: highAttendance,
      overall_readiness: currentReadiness?.avg_readiness_score || 0,
      // Add more computed positive metrics as needed
      notes: 'Insights computed on-demand from live data',
    };

    res.json({ status: 'success', data: insights });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch insights', code: 'INTERNAL_ERROR' });
  }
});

module.exports = router;