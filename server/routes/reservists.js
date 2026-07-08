const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { getUserScopeFilter, requireAdminArsenOrHigher } = require('../middleware/rbac');
const { hashPassword, generateResetToken } = require('../app/auth');
const { logAudit } = require('../utils/auditLogger');
const crypto = require('crypto');

const TRAINING_FORBIDDEN_FIELDS = [
  'training_id', 'trainings', 'internal_training_participants',
  'external_training_attachments', 'training_registrations'
];

const router = express.Router();

// Helper: Generate unique reservist QR code (e.g. RES- followed by 12 hex chars)
// Uses 8 bytes (16 hex chars) to minimize collision risk with UNIQUE constraint
function generateUniqueQRCode() {
  return `RES-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

// Helper: Parse Excel date (serial number) or string to MySQL date format
function parseExcelDate(value) {
  if (!value) return null;
  // Excel serial date (number)
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }
  // String date - try to parse
  const str = String(value).trim();
  if (!str) return null;
  const date = new Date(str);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

// Helper: Parse fullname format "LTC JENNY LYN T NALUPA O-160092 PAF(RES)"
// Returns { rank, firstName, lastName, serviceNumber }
function parseFullname(fullname) {
  const result = {
    rank: '',
    firstName: '',
    lastName: '',
    serviceNumber: ''
  };

  if (!fullname || typeof fullname !== 'string') {
    return result;
  }

  let cleanName = fullname.trim();

  // Extract service number (pattern: MN-XXXXX or O-XXXXX, with possible hyphens in number)
  const serviceNumberMatch = cleanName.match(/(MN-[\w-]+|O-[\w-]+)/i);
  result.serviceNumber = serviceNumberMatch ? serviceNumberMatch[1].toUpperCase() : '';

  // Remove service number and PAF(RES) suffix from name
  cleanName = cleanName
    .replace(/\s*(MN-[\w-]+|O-[\w-]+)\s*/i, ' ')
    .replace(/\s*PAF\s*\(.*?\)[\s.]*$/i, '') // Handle PAF(Res), PAF(RES), PAF(RES).
    .trim();

  // Extract rank - first word if it matches known rank patterns
  const rankPattern = /^(LTC|LTCOL|COL|CAPT|CPT|1LT|2LT|MSGT|MSG|SSGT|SG|TSGT|TSG|SGT|Sgt|CPL|Cpl|PVT|Pvt|PV2|Spc|SPC|Airman|A1C|AB|AIRMAN|ADO|AMN|ENS|LTJG|LT|LCDR|CDR|RADM|VADM|ADM|CC|LtCol|Maj|Major|Capt)$/i;
  const rankMatch = cleanName.match(rankPattern);
  result.rank = rankMatch ? rankMatch[1].toUpperCase() : '';

  // Remove rank from name
  const remainingName = cleanName.replace(rankPattern, '').trim();

  // Split remaining into first and last name
  // Handle format like "JENNY LYN T NALUPA" where T is middle initial
  const nameParts = remainingName.trim().split(/\s+/);
  if (nameParts.length >= 2) {
    result.firstName = nameParts[0];
    result.lastName = nameParts.slice(1).join(' ');
  } else if (nameParts.length === 1) {
    result.firstName = nameParts[0];
    result.lastName = '';
  }

  return result;
}

// Helper: Get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || null;
};

// Helper: Get pagination params
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 25));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// Helper: Build WHERE clause for filters
const buildFilterQuery = (filters) => {
  const conditions = [];
  const params = [];

  // Active/inactive status
  if (filters.status === 'active') {
    conditions.push('r.is_active = ?');
    params.push(1);
  } else if (filters.status === 'inactive') {
    conditions.push('r.is_active = ?');
    params.push(0);
  }

  // Assignment filters
  if (filters.arsen_id) {
    conditions.push('g.arsen_id = ?');
    params.push(Number(filters.arsen_id));
  }
  if (filters.group_id) {
    conditions.push('ra.group_id = ?');
    params.push(Number(filters.group_id));
  }
  if (filters.squadron_id) {
    conditions.push('ra.squadron_id = ?');
    params.push(Number(filters.squadron_id));
  }

  // Military filters
  if (filters.rank) {
    conditions.push('r.`rank` = ?');
    params.push(filters.rank);
  }
  if (filters.reserve_status) {
    conditions.push('r.reserve_status = ?');
    params.push(filters.reserve_status);
  }
  if (filters.specialization) {
    conditions.push('r.specialization = ?');
    params.push(filters.specialization);
  }
  if (filters.category) {
    conditions.push('r.category = ?');
    params.push(filters.category);
  }
  if (filters.sourceOfCommission) {
    conditions.push('r.source_of_commission = ?');
    params.push(filters.sourceOfCommission);
  }

  // Personal filters
  if (filters.bloodType) {
    conditions.push('r.blood_type = ?');
    params.push(filters.bloodType);
  }
  if (filters.sex) {
    conditions.push('r.sex = ?');
    params.push(filters.sex);
  }
  if (filters.civilStatus) {
    conditions.push('r.civil_status = ?');
    params.push(filters.civilStatus);
  }

  // Full-text search across name, service number, rank, email
  if (filters.search) {
    conditions.push('(r.first_name LIKE ? OR r.last_name LIKE ? OR CONCAT(r.first_name, " ", r.last_name) LIKE ? OR r.service_number LIKE ? OR r.`rank` LIKE ? OR u.email LIKE ?)');
    const s = '%' + filters.search + '%';
    params.push(s, s, s, s, s, s);
  }

  return {
    whereClause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    params
  };
};

// ─────────────────────────────────────────────────────────────
// Scope guard helpers — reused across PUT, DELETE, assign
// ─────────────────────────────────────────────────────────────

/**
 * Verify that a reservist (by reservist.id) belongs to the admin_arsen's ARSEN.
 * Returns true if in-scope, false otherwise.
 */
async function isReservistInArsenScope(reservistId, arsenId) {
  const [rows] = await db.query(
    `SELECT r.id FROM reservists r
     LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
     LEFT JOIN \`groups\` g ON ra.group_id = g.id
     WHERE r.id = ? AND g.arsen_id = ?`,
    [reservistId, arsenId]
  );
  return rows.length > 0;
}

/**
 * Verify that a group belongs to the admin_arsen's ARSEN.
 * Returns true if in-scope, false otherwise.
 */
async function isGroupInArsenScope(groupId, arsenId) {
  const [rows] = await db.query(
    'SELECT id FROM `groups` WHERE id = ? AND arsen_id = ?',
    [groupId, arsenId]
  );
  return rows.length > 0;
}

/**
 * GET /api/reservists
 * List all reservists with filters, pagination, and sorting
 */
router.get(
  '/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort_by').optional().isIn(['first_name', 'last_name', 'rank', 'service_number', 'created_at']),
    query('sort_order').optional().isIn(['asc', 'desc']),
    query('status').optional().isIn(['active', 'inactive', 'standby']),
    query('group_id').optional().isInt(),
    query('squadron_id').optional().isInt(),
    query('rank').optional(),
    query('reserve_status').optional(),
    query('search').optional()
  ],
  async (req, res) => {
    try {
      // Check authorization - reservist can only see own info
      if (req.user.role === 'reservist') {
        return res.status(403).json({
          status: 'error',
          message: 'Reservists can only access their own profile',
          code: 'ACCESS_DENIED'
        });
      }

      // Apply scope filter for unit admins
      let scopeWhere = '';
      let scopeParams = [];
      if (req.user.role !== 'admin') {
        const { conditions, params } = getUserScopeFilter(req.user, { group: 'ra.group_id', squadron: 'ra.squadron_id', arsen: 'g.arsen_id' });
        if (conditions.length > 0) {
          scopeWhere = conditions.join(' AND ');
          scopeParams = params;
        }
      }

      // Validate query params
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { page, limit, offset } = getPaginationParams(req.query);
      const sortBy = req.query.sort_by || 'created_at';
      const sortOrder = (req.query.sort_order || 'desc').toUpperCase();

      const filter = buildFilterQuery(req.query);
      
      // Combine scope and filter conditions
      const allParams = [...filter.params, ...scopeParams];
      let whereClause = '';
      if (filter.whereClause && scopeWhere) {
        whereClause = filter.whereClause + ' AND ' + scopeWhere;
      } else if (filter.whereClause) {
        whereClause = filter.whereClause;
      } else if (scopeWhere) {
        whereClause = 'WHERE ' + scopeWhere;
      }

      const countQuery = `
        SELECT COUNT(DISTINCT r.id) as total
        FROM reservists r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
        LEFT JOIN \`groups\` g ON ra.group_id = g.id
        LEFT JOIN arsens a ON g.arsen_id = a.id
        ${whereClause}
      `;

      const [countResult] = await db.query(countQuery, allParams);
      const total = countResult[0].total;

      // Fetch per-status stats (always over the full scoped+filtered set, not just one page)
      // Stats query — identical JOINs to the count query so the WHERE clause
      // (which may reference g.arsen_id via scope filters) resolves correctly.
      const statsQuery = `
        SELECT
          SUM(r.is_active = 1)                              AS active,
          SUM(r.is_active = 0)                              AS inactive,
          SUM(r.reserve_status = 'Standby Reserve')         AS standby,
          SUM(r.reserve_status = 'Retired')                 AS retired,
          SUM(r.reserve_status = 'Ready Reserve')           AS ready,
           0 AS bcmt,
           0 AS adt,
           0 AS vadt,
           0 AS rotc
        FROM reservists r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
        LEFT JOIN \`groups\` g ON ra.group_id = g.id
        LEFT JOIN arsens a ON g.arsen_id = a.id
        ${whereClause}
      `;
      const [statsResult] = await db.query(statsQuery, allParams);
      const stats = statsResult[0] || {};

      // Fetch paginated records
      const query_str = `
        SELECT 
          r.id, r.user_id, r.first_name, r.last_name, r.rank, 
          r.service_number, r.position, r.date_of_birth, r.place_of_birth,
          r.age, r.sex, r.civil_status, r.citizenship, r.height, r.weight,
          r.blood_type, r.phone_number, r.address,
          r.reserve_center, r.category, r.date_enlisted, r.source_of_commission,
          r.rank_date_appointment, r.specialization, r.reserve_status,
          r.highest_education, r.course_degree, r.school, r.year_graduated,
          r.occupation, r.employer, r.office_address,
          r.basic_training_completed, r.basic_training_date,
          r.emergency_contact_name, r.emergency_contact_phone, r.emergency_contact_address,
          r.is_active, r.created_at, r.updated_at,
          u.email,
          ra.id as assignment_id, ra.group_id, ra.squadron_id, 
          g.name as group_name, a.name as arcen_name,
          s.name as squadron_name, s.location as squadron_location
        FROM reservists r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
        LEFT JOIN \`groups\` g ON ra.group_id = g.id
        LEFT JOIN arsens a ON g.arsen_id = a.id
        LEFT JOIN squadron s ON ra.squadron_id = s.id
        ${whereClause}
        ORDER BY r.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      const params = [...allParams, limit, offset];
      const [rows] = await db.query(query_str, params);

      res.json({
        status: 'success',
        data: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          total:   Number(total),
          active:  Number(stats.active   || 0),
          inactive:Number(stats.inactive || 0),
          standby: Number(stats.standby  || 0),
          retired: Number(stats.retired  || 0),
          ready:   Number(stats.ready    || 0),
          bcmt:    Number(stats.bcmt     || 0),
          adt:     Number(stats.adt      || 0),
          vadt:    Number(stats.vadt     || 0),
          rotc:    Number(stats.rotc     || 0),
        }
      });
    } catch (error) {
      console.error('Error fetching reservists:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch reservists',
        code: 'FETCH_ERROR'
      });
    }
  }
);

/**
 * GET /api/reservists/:id
 * Get detailed information for a specific reservist
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization: admin or own record
    if (req.user.role === 'reservist' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // For unit admins, verify the reservist is within their scope
    if (req.user.role !== 'admin' && req.user.role !== 'reservist') {
      const [scopeCheck] = await db.query(`
        SELECT r.id FROM reservists r
        LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
        LEFT JOIN \`groups\` g ON ra.group_id = g.id
        WHERE r.id = ? AND (
          ra.squadron_id = ? OR ra.group_id = ? OR g.arsen_id = ?
        )
      `, [id, req.user.scope_squadron_id, req.user.scope_group_id, req.user.scope_arsen_id]);
      if (scopeCheck.length === 0) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied - reservist is outside your scope',
          code: 'OUT_OF_SCOPE'
        });
      }
    }

    const query_str = `
      SELECT 
        r.*, u.email, u.role, u.is_active as user_active,
        ra.id as assignment_id, ra.group_id, ra.squadron_id, ra.assigned_date,
        g.name as group_name, g.code as group_code,
        s.name as squadron_name, s.location
      FROM reservists r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      LEFT JOIN squadron s ON ra.squadron_id = s.id
      WHERE r.id = ?
    `;

    const [rows] = await db.query(query_str, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservist not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching reservist:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reservist',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /api/reservists
 * Create a new reservist
 * Allowed: admin, admin_arsen
 * admin_arsen: can only assign reservists to groups within their own ARSEN
 */
router.post(
  '/',
  authenticateToken,
  requireAdminArsenOrHigher,
  [
    body('email').isEmail().trim().normalizeEmail(),
    body('first_name').notEmpty().trim().isLength({ min: 2, max: 100 }),
    body('last_name').notEmpty().trim().isLength({ min: 2, max: 100 }),
    body('rank').notEmpty().trim(),
    body('service_number').notEmpty().trim().isLength({ min: 3, max: 100 }),
    body('password').isLength({ min: 6 }),
    body('date_of_birth').optional({ checkFalsy: true, nullable: true }).isISO8601(),
    body('sex').optional({ checkFalsy: true, nullable: true }).isIn(['Male', 'Female', 'Other']),
    body('blood_type').optional({ checkFalsy: true, nullable: true }).isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']),
    body('phone_number').optional({ checkFalsy: true, nullable: true }).trim(),
    body('reserve_status').optional({ checkFalsy: true, nullable: true }).isIn(['Ready Reserve', 'Standby Reserve', 'Retired']),
    body('group_id').optional({ checkFalsy: true, nullable: true }).isInt(),
    body('squadron_id').optional({ checkFalsy: true, nullable: true }).isInt(),
    body('position').optional().trim(),
    body('specialization').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const {
        email, password, first_name, last_name, rank, service_number,
        date_of_birth, sex, blood_type, phone_number, reserve_status,
        group_id, squadron_id,
        place_of_birth, civil_status, citizenship, height, weight,
        address, reserve_center, category, date_enlisted,
        source_of_commission, rank_date_appointment, position, specialization,
        highest_education, course_degree, school, year_graduated,
        occupation, employer, office_address,
        basic_training_completed, basic_training_date,
        emergency_contact_name, emergency_contact_phone, emergency_contact_address,
        ...otherFields
      } = req.body;

      // ── Scope guard: admin_arsen may only create reservists inside their ARSEN ──
      if (req.user.role === 'admin_arsen' && group_id) {
        const inScope = await isGroupInArsenScope(parseInt(group_id), req.user.scope_arsen_id);
        if (!inScope) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only assign reservists to groups within your ARSEN',
            code: 'OUT_OF_SCOPE'
          });
        }
      }

      // Check if email or service number already exists
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ? UNION SELECT r.user_id FROM reservists r WHERE r.service_number = ?',
        [email, service_number]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Email or service number already exists',
          code: 'DUPLICATE_ENTRY'
        });
      }

      // Validate group and squadron if provided
      let group_id_int = null;
      let squadron_id_int = null;

      if (group_id && squadron_id) {
        const hasGroupId = !isNaN(parseInt(group_id));
        const hasSquadronId = !isNaN(parseInt(squadron_id));

        if (!hasGroupId || !hasSquadronId) {
          return res.status(400).json({
            status: 'error',
            message: 'Both group_id and squadron_id must be valid integers',
            code: 'INVALID_ASSIGNMENT'
          });
        }

        group_id_int = parseInt(group_id);
        squadron_id_int = parseInt(squadron_id);

        const [groupData] = await db.query(
          'SELECT id FROM `groups` WHERE id = ? AND is_active = TRUE',
          [group_id_int]
        );
        const [squadronData] = await db.query(
          'SELECT id FROM squadron WHERE id = ? AND is_active = TRUE',
          [squadron_id_int]
        );

        if (groupData.length === 0 || squadronData.length === 0) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid group or squadron',
            code: 'INVALID_ASSIGNMENT'
          });
        }
      }

      // Hash password — use service_number as default if password is empty
      const passwordToUse = password || service_number;
      const hashedPassword = await hashPassword(passwordToUse);

      // Start transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // Create user
        const [userResult] = await connection.execute(
          'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, TRUE)',
          [email, hashedPassword, 'reservist']
        );

        const userId = userResult.insertId;

        // Create reservist with all fields
        const reservistData = {
          user_id: userId,
          first_name,
          last_name,
          rank,
          service_number,
          date_of_birth: date_of_birth || null,
          sex: sex || null,
          blood_type: blood_type || 'Unknown',
          phone_number: phone_number || null,
          reserve_status: reserve_status || 'Ready Reserve',
          is_active: true,
          place_of_birth: place_of_birth || null,
          civil_status: civil_status || null,
          citizenship: citizenship || 'Filipino',
          height: height || null,
          weight: weight || null,
          address: address || null,
          reserve_center: reserve_center || null,
          category: category || null,
          date_enlisted: date_enlisted || null,
          source_of_commission: source_of_commission || null,
          rank_date_appointment: rank_date_appointment || null,
          position: position || null,
          specialization: specialization || null,
          highest_education: highest_education || null,
          course_degree: course_degree || null,
          school: school || null,
          year_graduated: year_graduated || null,
          occupation: occupation || null,
          employer: employer || null,
          office_address: office_address || null,
          basic_training_completed: basic_training_completed || null,
          basic_training_date: basic_training_date || null,
          emergency_contact_name: emergency_contact_name || null,
          emergency_contact_phone: emergency_contact_phone || null,
          emergency_contact_address: emergency_contact_address || null,
          ...otherFields,
          qr_code: generateUniqueQRCode()
        };

        const columns = Object.keys(reservistData).map(col => `\`${col}\``);
        const values = Object.values(reservistData);
        const placeholders = columns.map(() => '?').join(',');

        const [reservistResult] = await connection.execute(
          `INSERT INTO reservists (${columns.join(',')}) VALUES (${placeholders})`,
          values
        );

        const reservistId = reservistResult.insertId;

        // Create assignment if provided
        if (group_id_int && squadron_id_int) {
          await connection.execute(
            'INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary) VALUES (?, ?, ?, CURDATE(), TRUE)',
            [reservistId, group_id_int, squadron_id_int]
          );
        }

        await connection.commit();

        // Log audit
        logAudit({
          user_id: req.user.id,
          action: 'reservist.created',
          entity_type: 'reservist',
          entity_id: reservistId,
          new_values: { email, first_name, last_name, rank, service_number },
          ip_address: getClientIp(req),
          user_agent: req.headers['user-agent']
        });

        // Fetch created reservist
        const [created] = await db.query(
          'SELECT r.*, u.email FROM reservists r JOIN users u ON r.user_id = u.id WHERE r.id = ?',
          [reservistId]
        );

        res.status(201).json({
          status: 'success',
          message: 'Reservist created successfully',
          data: created[0]
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error creating reservist:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create reservist',
        code: 'CREATE_ERROR'
      });
    }
  }
);

/**
 * PUT /api/reservists/:id
 * Update a reservist's information
 * Allowed: admin, admin_arsen
 * admin_arsen: can only update reservists within their ARSEN scope
 */
router.put(
  '/:id',
  authenticateToken,
  requireAdminArsenOrHigher,
  [
    body('first_name').optional({ checkFalsy: true, nullable: true }).trim().isLength({ min: 2, max: 100 }),
    body('last_name').optional({ checkFalsy: true, nullable: true }).trim().isLength({ min: 2, max: 100 }),
    body('rank').optional({ checkFalsy: true, nullable: true }).trim(),
    body('date_of_birth').optional({ checkFalsy: true, nullable: true }).isISO8601(),
    body('sex').optional({ checkFalsy: true, nullable: true }).isIn(['Male', 'Female', 'Other']),
    body('blood_type').optional({ checkFalsy: true, nullable: true }).isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']),
    body('phone_number').optional({ checkFalsy: true, nullable: true }).trim(),
    body('reserve_status').optional({ checkFalsy: true, nullable: true }).isIn(['Ready Reserve', 'Standby Reserve', 'Retired'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { id } = req.params;

      // Fetch current reservist
      const [current] = await db.query(
        'SELECT * FROM reservists WHERE id = ?',
        [id]
      );

      if (current.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Reservist not found',
          code: 'NOT_FOUND'
        });
      }

      // ── Scope guard: admin_arsen may only update reservists inside their ARSEN ──
      if (req.user.role === 'admin_arsen') {
        const inScope = await isReservistInArsenScope(id, req.user.scope_arsen_id);
        if (!inScope) {
          return res.status(403).json({
            status: 'error',
            message: 'Access denied - reservist is outside your ARSEN scope',
            code: 'OUT_OF_SCOPE'
          });
        }
      }

      // Prepare update fields
      const updateFields = {};
      const allowedFields = [
        'first_name', 'last_name', 'rank', 'date_of_birth', 'sex',
        'blood_type', 'phone_number', 'reserve_status', 'address',
        'place_of_birth', 'civil_status', 'citizenship', 'height', 'weight',
        'reserve_center', 'category', 'date_enlisted', 'source_of_commission',
        'rank_date_appointment', 'position', 'specialization',
        'highest_education', 'course_degree', 'school', 'year_graduated',
        'occupation', 'employer', 'office_address',
        'basic_training_completed', 'basic_training_date',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_address'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateFields[field] = req.body[field];
        }
      });

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No fields to update',
          code: 'NO_UPDATES'
        });
      }

      // Update reservist
      const updateColumns = Object.keys(updateFields).map(col => `\`${col}\` = ?`).join(',');
      const values = [...Object.values(updateFields), id];

      const updateQuery = `UPDATE reservists SET ${updateColumns} WHERE id = ?`;

      await db.query(updateQuery, values);

      // Log audit
      logAudit({
        user_id: req.user.id,
        action: 'reservist.updated',
        entity_type: 'reservist',
        entity_id: id,
        old_values: current[0],
        new_values: updateFields,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      // Fetch updated reservist — use the same projection as the list endpoint
      // so the response includes assignment, group, arcen, and squadron fields.
      // Without these JOINs the frontend loses assignment details until page refresh.
      const [updated] = await db.query(
        `SELECT
          r.id, r.user_id, r.first_name, r.last_name, r.rank,
          r.service_number, r.position, r.date_of_birth, r.place_of_birth,
          r.age, r.sex, r.civil_status, r.citizenship, r.height, r.weight,
          r.blood_type, r.phone_number, r.address,
          r.reserve_center, r.category, r.date_enlisted, r.source_of_commission,
          r.rank_date_appointment, r.specialization, r.reserve_status,
          r.highest_education, r.course_degree, r.school, r.year_graduated,
          r.occupation, r.employer, r.office_address,
          r.basic_training_completed, r.basic_training_date,
          r.emergency_contact_name, r.emergency_contact_phone, r.emergency_contact_address,
          r.is_active, r.created_at, r.updated_at,
          u.email,
          ra.id as assignment_id, ra.group_id, ra.squadron_id,
          g.name as group_name, a.name as arcen_name,
          s.name as squadron_name, s.location as squadron_location
        FROM reservists r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
        LEFT JOIN \`groups\` g ON ra.group_id = g.id
        LEFT JOIN arsens a ON g.arsen_id = a.id
        LEFT JOIN squadron s ON ra.squadron_id = s.id
        WHERE r.id = ?`,
        [id]
      );

      res.json({
        status: 'success',
        message: 'Reservist updated successfully',
        data: updated[0]
      });
    } catch (error) {
      console.error('Error updating reservist:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update reservist',
        code: 'UPDATE_ERROR'
      });
    }
  }
);

/**
 * DELETE /api/reservists/:id
 * Soft delete - deactivate a reservist
 * Allowed: admin, admin_arsen
 * admin_arsen: can only delete reservists within their ARSEN scope
 */
router.delete('/:id', authenticateToken, requireAdminArsenOrHigher, async (req, res) => {
  try {
    const { id } = req.params;

    const [current] = await db.query(
      'SELECT * FROM reservists WHERE id = ?',
      [id]
    );

    if (current.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservist not found',
        code: 'NOT_FOUND'
      });
    }

    // ── Scope guard: admin_arsen may only delete reservists inside their ARSEN ──
    if (req.user.role === 'admin_arsen') {
      const inScope = await isReservistInArsenScope(id, req.user.scope_arsen_id);
      if (!inScope) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied - reservist is outside your ARSEN scope',
          code: 'OUT_OF_SCOPE'
        });
      }
    }

    // Soft delete by setting is_active to false
    await db.query(
      'UPDATE reservists SET is_active = FALSE WHERE id = ?',
      [id]
    );

    // Also deactivate associated user
    const [reservist] = current;
    await db.query(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [reservist.user_id]
    );

    // Log audit
    logAudit({
      user_id: req.user.id,
      action: 'reservist.deleted',
      entity_type: 'reservist',
      entity_id: id,
      old_values: { is_active: true },
      new_values: { is_active: false },
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent']
    });

    res.json({
      status: 'success',
      message: 'Reservist deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting reservist:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete reservist',
      code: 'DELETE_ERROR'
    });
  }
});

/**
 * GET /api/reservists/:id/assignments
 * Get assignment history for a reservist
 */
router.get('/:id/assignments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization: admin or own record
    if (req.user.role === 'reservist' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if reservist exists
    const [reservist] = await db.query(
      'SELECT id FROM reservists WHERE id = ?',
      [id]
    );

    if (reservist.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservist not found',
        code: 'NOT_FOUND'
      });
    }

    const query = `
      SELECT 
        ra.id, ra.group_id, ra.squadron_id, ra.assigned_date, ra.is_primary,
        g.name as group_name, g.code as group_code,
        s.name as squadron_name, s.location
      FROM reservist_assignments ra
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      LEFT JOIN squadron s ON ra.squadron_id = s.id
      WHERE ra.reservist_id = ?
      ORDER BY ra.assigned_date DESC
    `;

    const [assignments] = await db.query(query, [id]);

    res.json({
      status: 'success',
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch assignments',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /api/reservists/:id/assign
 * Assign reservist to a Group and Squadron
 * Allowed: admin, admin_arsen
 * admin_arsen: can only assign to groups within their ARSEN scope
 */
router.post(
  '/:id/assign',
  authenticateToken,
  requireAdminArsenOrHigher,
  [
    body('group_id').isInt(),
    body('squadron_id').isInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { id } = req.params;
      const { group_id, squadron_id } = req.body;

      // Check if reservist exists
      const [reservist] = await db.query(
        'SELECT id FROM reservists WHERE id = ?',
        [id]
      );

      if (reservist.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Reservist not found',
          code: 'NOT_FOUND'
        });
      }

      // Scope guard: admin_arsen may only reassign reservists currently in their ARSEN
      if (req.user.role === 'admin_arsen') {
        const inScope = await isReservistInArsenScope(id, req.user.scope_arsen_id);
        if (!inScope) {
          return res.status(403).json({
            status: 'error',
            message: 'Access denied - reservist is outside your ARSEN scope',
            code: 'OUT_OF_SCOPE'
          });
        }
      }

      // Validate group and squadron exist and are active
      const [groupData] = await db.query(
        'SELECT id FROM `groups` WHERE id = ? AND is_active = TRUE',
        [group_id]
      );
      const [squadronData] = await db.query(
        'SELECT id FROM squadron WHERE id = ? AND is_active = TRUE',
        [squadron_id]
      );

      if (groupData.length === 0 || squadronData.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid group or squadron',
          code: 'INVALID_ASSIGNMENT'
        });
      }

      // ── Scope guard: admin_arsen may only assign to groups inside their ARSEN ──
      if (req.user.role === 'admin_arsen') {
        const inScope = await isGroupInArsenScope(group_id, req.user.scope_arsen_id);
        if (!inScope) {
          return res.status(403).json({
            status: 'error',
            message: 'Access denied - group is outside your ARSEN scope',
            code: 'OUT_OF_SCOPE'
          });
        }
      }

      // Check if squadron belongs to group
      const [squadronCheck] = await db.query(
        'SELECT id FROM squadron WHERE id = ? AND group_id = ?',
        [squadron_id, group_id]
      );

      if (squadronCheck.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Squadron does not belong to the specified group',
          code: 'INVALID_ASSIGNMENT'
        });
      }

      // Check if already assigned (primary)
      const [existing] = await db.query(
        'SELECT id FROM reservist_assignments WHERE reservist_id = ? AND group_id = ? AND squadron_id = ? AND is_primary = TRUE',
        [id, group_id, squadron_id]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Reservist already assigned to this group and squadron',
          code: 'DUPLICATE_ASSIGNMENT'
        });
      }

      // Update primary assignment (set others to non-primary)
      await db.query(
        'UPDATE reservist_assignments SET is_primary = FALSE WHERE reservist_id = ? AND is_primary = TRUE',
        [id]
      );

      // Create new assignment
      const [result] = await db.query(
        'INSERT INTO reservist_assignments (reservist_id, group_id, squadron_id, assigned_date, is_primary) VALUES (?, ?, ?, CURDATE(), TRUE)',
        [id, group_id, squadron_id]
      );

      // Log audit
      logAudit({
        user_id: req.user.id,
        action: 'reservist.assigned',
        entity_type: 'assignment',
        entity_id: result.insertId,
        new_values: { reservist_id: id, group_id, squadron_id },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        status: 'success',
        message: 'Reservist assigned successfully',
        data: {
          assignment_id: result.insertId,
          reservist_id: id,
          group_id,
          squadron_id
        }
      });
    } catch (error) {
      console.error('Error assigning reservist:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to assign reservist',
        code: 'ASSIGNMENT_ERROR'
      });
    }
  }
);

/**
 * POST /api/reservists/:id/reset-password
 * Admin reset password functionality
 * Allowed: admin, admin_arsen
 * admin_arsen: can only reset passwords for reservists within their ARSEN scope
 */
router.post(
  '/:id/reset-password',
  authenticateToken,
  requireAdminArsenOrHigher,
  [
    body('new_password').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { id } = req.params;
      const { new_password } = req.body;

      // Get reservist and associated user
      const [reservist] = await db.query(
        'SELECT user_id FROM reservists WHERE id = ?',
        [id]
      );

      if (reservist.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Reservist not found',
          code: 'NOT_FOUND'
        });
      }

      // ── Scope guard: admin_arsen may only reset passwords inside their ARSEN ──
      if (req.user.role === 'admin_arsen') {
        const inScope = await isReservistInArsenScope(id, req.user.scope_arsen_id);
        if (!inScope) {
          return res.status(403).json({
            status: 'error',
            message: 'Access denied - reservist is outside your ARSEN scope',
            code: 'OUT_OF_SCOPE'
          });
        }
      }

      const userId = reservist[0].user_id;

      // Hash new password
      const hashedPassword = await hashPassword(new_password);

      // Update password
      await db.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [hashedPassword, userId]
      );

      // Log audit
      logAudit({
        user_id: req.user.id,
        action: 'user.password_reset',
        entity_type: 'user',
        entity_id: userId,
        new_values: { password_reset: true },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      res.json({
        status: 'success',
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to reset password',
        code: 'RESET_ERROR'
      });
    }
  }
);

/**
 * GET /api/reservists/export
 * Export reservists data as CSV/JSON
 */
router.get('/export', authenticateToken, requireAdminArsenOrHigher, async (req, res) => {
  try {
    const { format = 'csv', group_id, squadron_id } = req.query;

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid export format. Use csv or json',
        code: 'INVALID_FORMAT'
      });
    }

    let query_str = `
      SELECT 
        r.id, r.first_name, r.last_name, r.rank, r.service_number,
        r.position, r.date_of_birth, r.sex, r.phone_number, r.reserve_status,
        r.is_active, r.created_at,
        u.email,
        g.name as group_name, s.name as squadron_name
      FROM reservists r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      LEFT JOIN squadron s ON ra.squadron_id = s.id
      WHERE 1=1
    `;

    const params = [];

    // Apply scope filter for unit admins
    if (req.user.role !== 'admin') {
      const { conditions, params: scopeParams } = getUserScopeFilter(req.user, { group: 'ra.group_id', squadron: 'ra.squadron_id', arsen: 'g.arsen_id' });
      if (conditions.length > 0) {
        query_str += ' AND (' + conditions.join(' OR ') + ')';
        params.push(...scopeParams);
      }
    }

    if (group_id) {
      query_str += ' AND ra.group_id = ?';
      params.push(group_id);
    }

    if (squadron_id) {
      query_str += ' AND ra.squadron_id = ?';
      params.push(squadron_id);
    }

    query_str += ' ORDER BY r.last_name, r.first_name';

    const [rows] = await db.query(query_str, params);

    if (format === 'json') {
      res.json({
        status: 'success',
        data: rows,
        export_info: {
          total_records: rows.length,
          exported_at: new Date().toISOString()
        }
      });
    } else {
      // CSV format
      const csv = rows.map(row =>
        Object.values(row).join(',')
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reservists-export.csv');
      res.send(csv);

      // Log audit
      logAudit({
        user_id: req.user.id,
        action: 'reservists.exported',
        entity_type: 'export',
        new_values: { format, count: rows.length },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });
    }
  } catch (error) {
    console.error('Error exporting reservists:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export reservists',
      code: 'EXPORT_ERROR'
    });
  }
});

/**
 * GET /api/reservists/lookup
 * Lookup own reservist record by serial number or name (authenticated)
 * Only returns data for the logged-in user's own reservist profile
 */
router.get('/lookup', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'reservist') {
      return res.status(403).json({
        status: 'error',
        message: 'Only reservists can use this endpoint',
        code: 'ACCESS_DENIED'
      });
    }

    const { serial, name } = req.query;
    if (!serial && !name) {
      return res.status(400).json({
        status: 'error',
        message: 'serial or name query parameter is required',
        code: 'MISSING_PARAM'
      });
    }

    const [reservists] = await db.query(`
      SELECT
        r.id, r.first_name, r.last_name, r.rank, r.service_number,
        ra.squadron_id, s.name as squadron_name, u.email
      FROM reservists r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN squadron s ON ra.squadron_id = s.id
      WHERE r.user_id = ?
    `, [req.user.id]);

    if (reservists.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservist profile not found',
        code: 'NOT_FOUND'
      });
    }

    const myProfile = reservists[0];
    let match = null;

    if (serial) {
      const serialUpper = String(serial).toUpperCase().trim();
      if (myProfile.service_number && myProfile.service_number.toUpperCase() === serialUpper) {
        match = myProfile;
      }
    } else if (name) {
      const nameLower = String(name).toLowerCase().trim();
      const fullName = `${myProfile.first_name || ''} ${myProfile.last_name || ''}`.toLowerCase();
      if (fullName.includes(nameLower)) {
        match = myProfile;
      }
    }

    if (!match) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservist not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      data: {
        id: match.id,
        first_name: match.first_name,
        last_name: match.last_name,
        rank: match.rank,
        service_number: match.service_number,
        squadron_id: match.squadron_id,
        squadron_name: match.squadron_name,
        email: match.email,
      }
    });
  } catch (error) {
    console.error('Error looking up reservist:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to lookup reservist',
      code: 'LOOKUP_ERROR'
    });
  }
});

/**
 * GET /api/reservists/public-lookup
 * Public lookup of reservist by service number or name (for external training registration)
 * Does not require authentication - allows any visitor to verify their identity
 */
router.get('/public-lookup', async (req, res) => {
  try {
    const { serial, name } = req.query;
    if (!serial && !name) {
      return res.status(400).json({
        success: false,
        message: 'serial or name query parameter is required',
        code: 'MISSING_PARAM'
      });
    }

    let query, params;
    if (serial) {
      query = `
        SELECT
          r.id, r.first_name, r.last_name, r.rank, r.service_number,
          ra.squadron_id, s.name as squadron_name, u.email
        FROM reservists r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
        LEFT JOIN squadron s ON ra.squadron_id = s.id
        WHERE r.service_number = ?
        LIMIT 1
      `;
      params = [String(serial).trim()];
    } else {
      query = `
        SELECT
          r.id, r.first_name, r.last_name, r.rank, r.service_number,
          ra.squadron_id, s.name as squadron_name, u.email
        FROM reservists r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
        LEFT JOIN squadron s ON ra.squadron_id = s.id
        WHERE r.first_name LIKE ? OR r.last_name LIKE ? OR CONCAT(r.first_name, ' ', r.last_name) LIKE ?
        LIMIT 10
      `;
      const namePattern = `%${String(name).trim()}%`;
      params = [namePattern, namePattern, namePattern];
    }

    const [rows] = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservist not found',
        code: 'NOT_FOUND'
      });
    }

    const row = rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        rank: row.rank,
        service_number: row.service_number,
        squadron_id: row.squadron_id,
        squadron_name: row.squadron_name,
        email: row.email,
      }
    });
  } catch (error) {
    console.error('Error in public-lookup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lookup reservist',
      code: 'LOOKUP_ERROR'
    });
  }
});

/**
 * POST /api/reservists/import
 * Bulk import reservists from CSV/JSON
 * Allowed: admin, admin_arsen
 */
router.post(
  '/import',
  authenticateToken,
  requireAdminArsenOrHigher,
  [
    body('data').isArray(),
    body('format').isIn(['csv', 'json'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const { data, format } = req.body;

      if (data.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No data provided for import',
          code: 'EMPTY_DATA'
        });
      }

      if (data.length > 1000) {
        return res.status(400).json({
          status: 'error',
          message: 'Import limited to 1000 records per request',
          code: 'LIMIT_EXCEEDED'
        });
      }

      const connection = await db.getConnection();
      let successCount = 0;
      let failureCount = 0;
      const errors_list = [];

      await connection.beginTransaction();

      try {
        for (let i = 0; i < data.length; i++) {
          const record = data[i];

          // Validate required fields
          if (!record.email || !record.first_name || !record.last_name || !record.rank || !record.service_number) {
            failureCount++;
            errors_list.push({
              row: i + 1,
              error: 'Missing required fields: email, first_name, last_name, rank, service_number'
            });
            continue;
          }

          // ── Scope guard: admin_arsen may only import into their ARSEN ──
          if (req.user.role === 'admin_arsen' && record.group_id) {
            const inScope = await isGroupInArsenScope(parseInt(record.group_id), req.user.scope_arsen_id);
            if (!inScope) {
              failureCount++;
              errors_list.push({
                row: i + 1,
                error: 'Group is outside your ARSEN scope'
              });
              continue;
            }
          }

          // Check for duplicates
          const [existing] = await connection.execute(
            'SELECT id FROM users WHERE email = ? UNION SELECT r.user_id FROM reservists r WHERE r.service_number = ?',
            [record.email, record.service_number]
          );

          if (existing.length > 0) {
            failureCount++;
            errors_list.push({
              row: i + 1,
              error: `Duplicate: email or service number already exists`
            });
            continue;
          }

          try {
            // Use service_number as password
            const tempPassword = record.service_number;
            const hashedPassword = await hashPassword(tempPassword);

            // Create user
            const [userResult] = await connection.execute(
              'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, TRUE)',
              [record.email, hashedPassword, 'reservist']
            );

            // Create reservist
            const reservistData = {
              user_id: userResult.insertId,
              first_name: record.first_name,
              last_name: record.last_name,
              rank: record.rank,
              service_number: record.service_number,
              date_of_birth: record.date_of_birth || null,
              sex: record.sex || null,
              blood_type: record.blood_type || 'Unknown',
              phone_number: record.phone_number || null,
              position: record.position || null,
              reserve_status: record.reserve_status || 'Ready Reserve',
              is_active: true,
              qr_code: generateUniqueQRCode()
            };

            const columns = Object.keys(reservistData).map(col => `\`${col}\``);
            const values = Object.values(reservistData);
            const placeholders = columns.map(() => '?').join(',');

            await connection.execute(
              `INSERT INTO reservists (${columns.join(',')}) VALUES (${placeholders})`,
              values
            );

            successCount++;
          } catch (error) {
            failureCount++;
            errors_list.push({
              row: i + 1,
              error: `Database error: ${error.message}`
            });
          }
        }

        await connection.commit();

        res.json({
          status: 'success',
          message: `Import completed. ${successCount} successful, ${failureCount} failed.`,
          data: {
            success_count: successCount,
            failure_count: failureCount,
            errors: errors_list
          }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error importing reservists:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to import reservists',
        code: 'IMPORT_ERROR'
      });
    }
  }
);

/**
 * POST /api/reservists/bulk-upload
 * Bulk upload reservists from Excel file (position-based format)
 * Allowed: admin, admin_arsen
 * admin_arsen: can only upload into their own ARSEN
 */
const multer = require('multer');
const Excel = require('exceljs');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

router.post(
  '/bulk-upload',
  authenticateToken,
  requireAdminArsenOrHigher,
  upload.single('file'),
  async (req, res) => {
    let connection;
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file provided',
          code: 'NO_FILE'
        });
      }

      // Get optional group and squadron from form
      const arsen_id = parseInt(req.body.arsen_id);
      const group_id = req.body.group_id ? parseInt(req.body.group_id) : null;
      const squadron_id = req.body.squadron_id ? parseInt(req.body.squadron_id) : null;

      if (!arsen_id || isNaN(arsen_id)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid ARSEN ID is required',
          code: 'INVALID_ARSEN'
        });
      }

      // ── Scope guard: admin_arsen may only bulk upload into their own ARSEN ──
      if (req.user.role === 'admin_arsen' && arsen_id !== req.user.scope_arsen_id) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only bulk upload into your assigned ARSEN',
          code: 'OUT_OF_SCOPE'
        });
      }

      // Validate group belongs to the selected arsen if provided
      if (group_id && !isNaN(group_id)) {
        const [groupCheck] = await db.query(
          'SELECT id FROM `groups` WHERE id = ? AND arsen_id = ?',
          [group_id, arsen_id]
        );
        if (groupCheck.length === 0) {
          return res.status(400).json({
            status: 'error',
            message: 'Selected group does not belong to the selected ARSEN',
            code: 'INVALID_GROUP'
          });
        }
      }

      // Validate squadron belongs to the selected group if provided
      if (squadron_id && !isNaN(squadron_id)) {
        const [squadronCheck] = await db.query(
          'SELECT id FROM squadron WHERE id = ? AND group_id = ?',
          [squadron_id, group_id]
        );
        if (squadronCheck.length === 0) {
          return res.status(400).json({
            status: 'error',
            message: 'Selected squadron does not belong to the selected group',
            code: 'INVALID_SQUADRON'
          });
        }
      }

      // Parse Excel/CSV file
      const workbook = new Excel.Workbook();
      if (req.file.mimetype === 'text/csv') {
        const worksheet = workbook.addWorksheet('CSV');
        const csvRows = req.file.buffer.toString('utf8').trim().split('\n');
        csvRows.forEach(row => {
          worksheet.addRow(row.split(','));
        });
      } else {
        await workbook.xlsx.load(req.file.buffer);
      }

      if (workbook.worksheets.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Excel file has no sheets',
          code: 'INVALID_FILE'
        });
      }

      // Get database connection with transaction
      connection = await db.getConnection();
      await connection.beginTransaction();

      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      // Process first sheet only
      const worksheet = workbook.worksheets[0];

      // Find the correct header row by looking for expected column names
      const rawRows = [];
      worksheet.eachRow({ includeEmpty: true }, (row) => {
        rawRows.push(row.values.slice(1));
      });
      let headerRowIndex = 0;
      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (row && row.some(cell =>
          cell && typeof cell === 'string' &&
          (cell === 'DESCRIPTION/POSITION' || cell === 'GRADE' || cell === 'AFSC' ||
           cell === 'REQUIRED' || cell === 'NAME' || cell === 'Position' || cell === 'Name')
        )) {
          headerRowIndex = i;
          break;
        }
      }

      // Extract header names from the detected header row and build data rows manually
      const headers = rawRows[headerRowIndex] || [];
      const dataRows = rawRows.slice(headerRowIndex + 1);
      const rows = dataRows.map(row => {
        const obj = {};
        headers.forEach((key, idx) => {
          if (key != null) obj[key] = row[idx];
        });
        return obj;
      });

      // Process each row in the sheet using the selected ARSEN/Group/Squadron
      for (const row of rows) {
        try {
          const position = row['DESCRIPTION/POSITION'] || row['Position'] || '';
          const name = row['NAME'] || row['Name'] || '';

          // Skip rows with no name
          if (!name || name.trim() === '') continue;

          // Parse fullname - handle "LTC JENNY LYN T NALUPA O-160092 PAF(RES)" format
          const parsed = parseFullname(name);
          const serviceNumber = parsed.serviceNumber;
          const rank = parsed.rank;
          const firstName = parsed.firstName;
          const lastName = parsed.lastName;

          let reservistId;

          // Check if reservist exists by service number
          const [existingReservists] = await connection.query(
            'SELECT id FROM reservists WHERE service_number = ?',
            [serviceNumber]
          );

          if (existingReservists.length > 0) {
            // Scope guard: admin_arsen may only update reservists in their ARSEN
            if (req.user.role === 'admin_arsen') {
              const [scopeCheck] = await connection.query(
                `SELECT r.id FROM reservists r
                 LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
                 LEFT JOIN \`groups\` g ON ra.group_id = g.id
                 WHERE r.id = ? AND g.arsen_id = ?`,
                [existingReservists[0].id, req.user.scope_arsen_id]
              );
              if (scopeCheck.length === 0) {
                errors.push(`Row "${name}": Reservist is outside your ARSEN scope`);
                failureCount++;
                continue;
              }
            }
            // Update existing reservist - only update rank and position
            reservistId = existingReservists[0].id;
            await connection.query(
              'UPDATE reservists SET `rank` = ?, position = ? WHERE id = ?',
              [rank, position, reservistId]
            );
          } else {
            // Create new reservist - use service number as fallback if missing
            const sn = serviceNumber || `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            // First create a user account
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@pafr.mil`;
            const passwordHash = await hashPassword(sn);

            // Check if user exists
            const [existingUsers] = await connection.query(
              'SELECT id FROM users WHERE email = ?',
              [email]
            );

            let userId;

            if (existingUsers.length > 0) {
              userId = existingUsers[0].id;
            } else {
              const [userResult] = await connection.query(
                'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, TRUE)',
                [email, passwordHash, 'reservist']
              );
              userId = userResult.insertId;
            }

            // Create reservist - only rank and position
            const [reservistResult] = await connection.query(
              `INSERT INTO reservists (
                user_id, first_name, last_name, service_number,
                position, reserve_status, qr_code, \`rank\`, is_active
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
              [userId, firstName, lastName, sn, position, 'Ready Reserve', generateUniqueQRCode(), rank]
            );

            reservistId = reservistResult.insertId;
          }

          // Create or update assignment using selected group/squadron
          if (group_id && !isNaN(group_id)) {
            const [existingAssignments] = await connection.query(
              'SELECT id FROM reservist_assignments WHERE reservist_id = ? AND group_id = ? AND squadron_id = ?',
              [reservistId, group_id, squadron_id || null]
            );

            if (existingAssignments.length === 0) {
              // Set other assignments to non-primary
              await connection.query(
                'UPDATE reservist_assignments SET is_primary = FALSE WHERE reservist_id = ? AND is_primary = TRUE',
                [reservistId]
              );

              // Create new assignment
              await connection.query(
                `INSERT INTO reservist_assignments (
                  reservist_id, group_id, squadron_id, assigned_date, is_primary
                ) VALUES (?, ?, ?, CURDATE(), TRUE)`,
                [reservistId, group_id, squadron_id || null]
              );
            }
          }

          successCount++;
        } catch (error) {
          errors.push(`Row "${row['NAME'] || row['Name'] || 'unknown'}" in sheet "${sheetName}": ${error.message}`);
          failureCount++;
        }
      }

      await connection.commit();

      // Log audit
      logAudit({
        user_id: req.user.id,
        action: 'reservist.bulk_upload',
        entity_type: 'reservist',
        new_values: { successful: successCount, failed: failureCount },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      res.json({
        status: 'success',
        message: 'Bulk upload completed',
        data: {
          successful: successCount,
          failed: failureCount,
          total: successCount + failureCount,
          errors: errors
        }
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Rollback error:', rollbackError);
        }
      }

      console.error('Error in bulk upload:', error);
      res.status(500).json({
        status: 'error',
        message: 'Bulk upload failed: ' + error.message,
        code: 'BULK_UPLOAD_ERROR'
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

/**
 * POST /api/reservists/bulk-upload-info
 * Bulk upload reservists from Excel file with detailed personal & military info
 * Allowed: admin, admin_arsen
 * admin_arsen: can only upload into their own ARSEN
 *
 * Expected columns: Fullname, Rank, AFPSN (Serial Number), Date of Birth, Place of Birth,
 *   Age, Sex, Civil Status, Citizenship, Height, Weight, Blood Type, Home Address,
 *   Contact Number, Email Address, Branch of Service, Reserve Center, Group Command,
 *   Squadron, Category, Source of Commission/Enlistment, Date Enlisted, Rank Date of Appointment,
 *   Specialization/MOS, Status, Highest Educational Attainment, Course/Degree, School,
 *   Year Graduated, Occupation, Employer/Company, Office Address,
 *   Basic Training Completed, Date Completed, Other Military Courses/Training,
 *   AWARDS AND DECORATIONS, Emergency contact name, Relationship, Contact Number, Address
 */
router.post(
  '/bulk-upload-info',
  authenticateToken,
  requireAdminArsenOrHigher,
  upload.single('file'),
  async (req, res) => {
    let connection;
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file provided',
          code: 'NO_FILE'
        });
      }

      const workbook = new Excel.Workbook();
      if (req.file.mimetype === 'text/csv') {
        const worksheet = workbook.addWorksheet('CSV');
        const csvRows = req.file.buffer.toString('utf8').trim().split('\n');
        csvRows.forEach(row => {
          worksheet.addRow(row.split(','));
        });
      } else {
        await workbook.xlsx.load(req.file.buffer);
      }

      if (workbook.worksheets.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Excel file has no sheets',
          code: 'INVALID_FILE'
        });
      }

      const bodyArsenId = req.body.arsen_id ? parseInt(req.body.arsen_id) : null;
      const bodyGroupId = req.body.group_id ? parseInt(req.body.group_id) : null;
      const bodySquadronId = req.body.squadron_id ? parseInt(req.body.squadron_id) : null;

      if (!bodyArsenId || isNaN(bodyArsenId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid ARSEN ID is required',
          code: 'INVALID_ARSEN'
        });
      }

      // ── Scope guard: admin_arsen may only bulk upload into their own ARSEN ──
      if (req.user.role === 'admin_arsen' && bodyArsenId !== req.user.scope_arsen_id) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only bulk upload into your assigned ARSEN',
          code: 'OUT_OF_SCOPE'
        });
      }

      if (!bodyGroupId || isNaN(bodyGroupId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid Group ID is required',
          code: 'INVALID_GROUP'
        });
      }

      if (!bodySquadronId || isNaN(bodySquadronId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid Squadron ID is required',
          code: 'INVALID_SQUADRON'
        });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      for (const worksheet of workbook.worksheets) {
        const rawRows = [];
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          rawRows.push(row.values.slice(1));
        });

        let headerRowIndex = 0;
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (row && row.some(cell =>
            cell && typeof cell === 'string' &&
            (cell.trim() === 'Fullname' || cell.trim() === 'Rank' || cell.trim() === 'AFPSN (Serial Number)' ||
             cell.trim() === 'Email Address' || cell.trim() === 'Contact Number')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = (rawRows[headerRowIndex] || []).map(h => h != null ? String(h).replace(/\s+/g, ' ').trim() : h);
        const dataRows = rawRows.slice(headerRowIndex + 1);

        // Build header index map: for duplicate headers, store all indices
        const headerIndexMap = {};
        headers.forEach((h, idx) => {
          if (h != null) {
            if (!headerIndexMap[h]) headerIndexMap[h] = [];
            headerIndexMap[h].push(idx);
          }
        });

        const rows = dataRows.map(row => {
          const obj = {};
          headers.forEach((key, idx) => {
            if (key != null) obj[key] = row[idx];
          });
          obj.__raw = row;
          obj.__headerIndexMap = headerIndexMap;
          return obj;
        });

        if (rows.length === 0) continue;

        for (const row of rows) {
          try {
            const fullname = (row['Fullname'] || '').trim();

            if (!fullname || fullname.length < 2) continue;

            // Parse fullname - handle "LTC JENNY LYN T NALUPA O-160092 PAF(RES)" format
            // If Rank column is empty, extract from Fullname
            const rowRank = (row['Rank'] || '').trim();
            const parsedName = parseFullname(fullname);

            // Use rank from column if provided, otherwise use parsed rank
            const finalRank = rowRank || parsedName.rank;

            // Use service number from column if provided, otherwise use parsed service number
            const rowServiceNumber = (row['AFPSN (Serial Number)'] || '').trim();
            const finalServiceNumber = rowServiceNumber || parsedName.serviceNumber;

            // Use parsed first/last name if columns are empty
            const rowFirstName = (row['First Name'] || '').trim();
            const rowLastName = (row['Last Name'] || '').trim();

            const firstName = rowFirstName || parsedName.firstName;
            const lastName = rowLastName || parsedName.lastName;

            // Continue with other fields...
            const dateOfBirth = row['Date of Birth'] || null;
            const placeOfBirth = row['Place of Birth'] || null;
            const age = (() => { const v = parseInt(row['Age'], 10); return isNaN(v) ? null : v; })();
            const sex = row['Sex'] || null;
            const civilStatus = row['Civil Status'] || null;
            const citizenship = row['Citizenship'] || 'Filipino';
            const height = (() => { const v = parseFloat(row['Height']); return isNaN(v) ? null : v; })();
            const weight = (() => { const v = parseFloat(row['Weight']); return isNaN(v) ? null : v; })();
            const bloodType = row['Blood Type'] || null;
            const homeAddress = row['Home Address'] || null;
            const contactNumber = (row.__headerIndexMap['Contact Number'] ? row.__raw[row.__headerIndexMap['Contact Number'][0]] : row['Contact Number']) || null;
            const email = row['Email Address'] || null;
            const branchOfService = row['Branch of Service'] || null;
            const reserveCenter = row['Reserve Center'] || null;
            const groupCommand = row['Group Command'] || null;
            const squadron = row['Squadron'] || null;
            const category = row['Category (1st / 2nd / 3rd Category)'] || null;
            const sourceOfCommission = row['Source of Commission/Enlistment (ROTC/ BCMT/ MOTC/ Direct Commission)'] || null;
            const dateEnlisted = row['Date Enlisted'] || null;
            const rankDateOfAppointment = row['Rank Date of Appointment'] || null;
            const specialization = row['Specialization/MOS'] || null;
            const reserveStatus = row['Status (Ready Reserve/ Standby Reserve/ Retired)'] || 'Ready Reserve';
            const highestEducation = row['Highest Educational Attainment'] || null;
            const courseDegree = row['Course/Degree'] || null;
            const school = row['School'] || null;
            const yearGraduated = (() => { const v = parseInt(row['Year Graduated'], 10); return isNaN(v) ? null : v; })();
            const occupation = row['Occupation'] || null;
            const employer = row['Employer/Company'] || null;
            const officeAddress = row['Office Address'] || null;
            const basicTraining = row['Basic Training Completed (BCMT/ROTC)'] || null;
            const dateCompleted = row['Date Completed'] || null;
            const otherTraining = row['Other Military Courses/Training'] || null;
            const awards = row['AWARDS AND DECORATIONS'] || null;
            const emergencyContactName = row['Emergency contact name'] || null;
            const emergencyRelationship = row['Relationship'] || null;
            const emergencyContactNumber = (row.__headerIndexMap['Contact Number'] && row.__headerIndexMap['Contact Number'].length > 1 ? row.__raw[row.__headerIndexMap['Contact Number'][1]] : row['Contact Number']) || null;
            const emergencyAddress = row['Address'] || null;

            // Check if reservist exists by service number
            let reservistId;
            let createdNew = false;

            if (finalServiceNumber) {
              const [existingReservists] = await connection.query(
                'SELECT id FROM reservists WHERE service_number = ?',
                [finalServiceNumber]
              );

              if (existingReservists.length > 0) {
                // Scope guard: admin_arsen may only update reservists in their ARSEN
                if (req.user.role === 'admin_arsen') {
                  const [scopeCheck] = await connection.query(
                    `SELECT r.id FROM reservists r
                     LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
                     LEFT JOIN \`groups\` g ON ra.group_id = g.id
                     WHERE r.id = ? AND g.arsen_id = ?`,
                    [existingReservists[0].id, req.user.scope_arsen_id]
                  );
                  if (scopeCheck.length === 0) {
                    errors.push(`Row "${fullname}": Reservist is outside your ARSEN scope`);
                    failureCount++;
                    continue;
                  }
                }
                reservistId = existingReservists[0].id;
                const parsedUpdateDob = parseExcelDate(dateOfBirth);
                const parsedUpdateRankDate = parseExcelDate(rankDateOfAppointment);
                const parsedUpdateBasicDate = parseExcelDate(dateCompleted);
                const parsedUpdateDateEnlisted = parseExcelDate(dateEnlisted);
                await connection.query(
                  `UPDATE reservists SET
                    first_name = ?, last_name = ?, date_of_birth = ?,
                    place_of_birth = ?, age = ?, sex = ?, civil_status = ?,
                    citizenship = ?, height = ?, weight = ?, blood_type = ?,
                    phone_number = ?, address = ?, reserve_center = ?, category = ?,
                    source_of_commission = ?, date_enlisted = ?, rank_date_appointment = ?, specialization = ?,
                    reserve_status = ?, highest_education = ?, course_degree = ?, school = ?,
                    year_graduated = ?, occupation = ?, employer = ?, office_address = ?,
                    basic_training_completed = ?, basic_training_date = ?,
                    emergency_contact_name = ?, emergency_contact_phone = ?,
                    emergency_contact_address = ?, \`rank\` = ?
                  WHERE id = ?`,
                  [
                    firstName, lastName, parsedUpdateDob, placeOfBirth, age, sex,
                    civilStatus, citizenship, height, weight, bloodType, contactNumber,
                    homeAddress, reserveCenter, category, sourceOfCommission,
                    parsedUpdateDateEnlisted, parsedUpdateRankDate, specialization, reserveStatus, highestEducation,
                    courseDegree, school, yearGraduated, occupation, employer, officeAddress,
                    basicTraining, parsedUpdateBasicDate, emergencyContactName, emergencyContactNumber,
                    emergencyAddress, finalRank, reservistId
                  ]
                );
              }
            }

            // Create new reservist if not found by service number (or no service number provided)
            if (!reservistId) {
              // Parse date fields from Excel format
              const parsedDateOfBirth = parseExcelDate(dateOfBirth);
              const parsedRankDateOfAppointment = parseExcelDate(rankDateOfAppointment);
              const parsedBasicTrainingDate = parseExcelDate(dateCompleted);
              const parsedDateEnlisted = parseExcelDate(dateEnlisted);

              // Create new reservist — use service number as password
              const userEmail = email || `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@pafr.mil`;
              const tempPassword = finalServiceNumber;
              const passwordHash = await hashPassword(tempPassword);

              const [existingUsers] = await connection.query(
                'SELECT id FROM users WHERE email = ?',
                [userEmail]
              );

              let userId;
              if (existingUsers.length > 0) {
                userId = existingUsers[0].id;
              } else {
                const [userResult] = await connection.query(
                  'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, TRUE)',
                  [userEmail, passwordHash, 'reservist']
                );
                userId = userResult.insertId;
              }

              const [reservistResult] = await connection.query(
                `INSERT INTO reservists (user_id, first_name, last_name, service_number, date_of_birth,
                  place_of_birth, age, sex, civil_status, citizenship, height, weight,
                  blood_type, phone_number, address, reserve_center, category,
                  source_of_commission, date_enlisted, rank_date_appointment, specialization,
                  reserve_status, highest_education, course_degree, school, year_graduated,
                  occupation, employer, office_address, basic_training_completed,
                  basic_training_date, emergency_contact_name, emergency_contact_phone,
                  emergency_contact_address, qr_code, \`rank\`, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
                [
                  userId, firstName, lastName, finalServiceNumber, parsedDateOfBirth,
                  placeOfBirth, age, sex, civilStatus, citizenship, height, weight,
                  bloodType, contactNumber, homeAddress, reserveCenter, category,
                  sourceOfCommission, parsedDateEnlisted, parsedRankDateOfAppointment, specialization,
                  reserveStatus, highestEducation, courseDegree, school, yearGraduated,
                  occupation, employer, officeAddress, basicTraining, parsedBasicTrainingDate,
                  emergencyContactName, emergencyContactNumber, emergencyAddress,
                  generateUniqueQRCode(), finalRank
                ]
              );

              reservistId = reservistResult.insertId;
              createdNew = true;
            }

            // Create or update assignment
            if (bodyGroupId) {
              // Validate group belongs to the selected arsen
              const [groupCheck] = await connection.query(
                'SELECT id FROM `groups` WHERE id = ? AND arsen_id = ?',
                [bodyGroupId, bodyArsenId]
              );
              if (groupCheck.length === 0) {
                errors.push(`Row "${fullname}": Selected group does not belong to the selected ARSEN`);
                failureCount++;
                continue;
              }

              // Validate squadron belongs to the selected group
              const [squadronCheck] = await connection.query(
                'SELECT id FROM squadron WHERE id = ? AND group_id = ?',
                [bodySquadronId, bodyGroupId]
              );
              if (squadronCheck.length === 0) {
                errors.push(`Row "${fullname}": Selected squadron does not belong to the selected group`);
                failureCount++;
                continue;
              }

              const [existingAssignments] = await connection.query(
                'SELECT id FROM reservist_assignments WHERE reservist_id = ? AND group_id = ? AND squadron_id = ?',
                [reservistId, bodyGroupId, bodySquadronId]
              );

              if (existingAssignments.length === 0) {
                await connection.query(
                  'UPDATE reservist_assignments SET is_primary = FALSE WHERE reservist_id = ? AND is_primary = TRUE',
                  [reservistId]
                );

                await connection.query(
                  `INSERT INTO reservist_assignments (
                    reservist_id, group_id, squadron_id, assigned_date, is_primary
                  ) VALUES (?, ?, ?, CURDATE(), TRUE)`,
                  [reservistId, bodyGroupId, bodySquadronId]
                );
              }
            }

            successCount++;
          } catch (rowError) {
            errors.push(`Row "${row['Fullname'] || 'unknown'}" in sheet "${sheetName}": ${rowError.message}`);
            failureCount++;
          }
        }
      }

      await connection.commit();

      if (errors.length > 0) {
        console.error('Bulk upload info errors:', JSON.stringify(errors, null, 2));
      }

      logAudit({
        user_id: req.user.id,
        action: 'reservist.bulk_upload_info',
        entity_type: 'reservist',
        new_values: { successful: successCount, failed: failureCount },
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      res.json({
        status: 'success',
        message: 'Bulk upload completed',
        data: {
          successful: successCount,
          failed: failureCount,
          total: successCount + failureCount,
          errors: errors
        }
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Rollback error:', rollbackError);
        }
      }

      console.error('Error in bulk upload info:', error);
      res.status(500).json({
        status: 'error',
        message: 'Bulk upload failed: ' + error.message,
        code: 'BULK_UPLOAD_ERROR'
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

/**
 * GET /api/reservists/filters/metadata
 * Return distinct filter values from the database for dynamic filter dropdowns
 */
router.get('/filters/metadata', authenticateToken, async (req, res) => {
  try {
    const [rankRows] = await db.query(
      "SELECT DISTINCT `rank` FROM reservists WHERE `rank` IS NOT NULL AND `rank` != '' ORDER BY `rank`"
    );
    const [specRows] = await db.query(
      "SELECT DISTINCT specialization FROM reservists WHERE specialization IS NOT NULL AND specialization != '' ORDER BY specialization"
    );
    const [statusRows] = await db.query(
      "SELECT DISTINCT reserve_status FROM reservists WHERE reserve_status IS NOT NULL AND reserve_status != '' ORDER BY reserve_status"
    );
    const [arsenRows] = await db.query(
      'SELECT id, name FROM arsens WHERE is_active = TRUE ORDER BY name'
    );
    const [groupRows] = await db.query(
      'SELECT g.id, g.name, g.arsen_id, a.name as arsen_name FROM `groups` g JOIN arsens a ON g.arsen_id = a.id WHERE g.is_active = TRUE ORDER BY a.name, g.name'
    );
    const [squadronRows] = await db.query(
      'SELECT s.id, s.name, s.group_id, g.name as group_name, g.arsen_id, a.name as arsen_name FROM squadron s JOIN `groups` g ON s.group_id = g.id JOIN arsens a ON g.arsen_id = a.id WHERE s.is_active = TRUE ORDER BY a.name, g.name, s.name'
    );
    const [categoryRows] = await db.query(
      "SELECT DISTINCT category FROM reservists WHERE category IS NOT NULL AND category != '' ORDER BY category"
    );
    const [sourceRows] = await db.query(
      "SELECT DISTINCT source_of_commission FROM reservists WHERE source_of_commission IS NOT NULL AND source_of_commission != '' ORDER BY source_of_commission"
    );
    const [bloodTypeRows] = await db.query(
      "SELECT DISTINCT blood_type FROM reservists WHERE blood_type IS NOT NULL AND blood_type != 'Unknown' ORDER BY blood_type"
    );
    const [sexRows] = await db.query(
      "SELECT DISTINCT sex FROM reservists WHERE sex IS NOT NULL AND sex != '' ORDER BY sex"
    );
    const [civilStatusRows] = await db.query(
      "SELECT DISTINCT civil_status FROM reservists WHERE civil_status IS NOT NULL AND civil_status != '' ORDER BY civil_status"
    );

    res.json({
      status: 'success',
      data: {
        ranks: rankRows.map(r => r.rank),
        specializations: specRows.map(r => r.specialization),
        reserveStatuses: statusRows.map(r => r.reserve_status),
        categories: categoryRows.map(r => r.category),
        sourcesOfCommission: sourceRows.map(r => r.source_of_commission),
        bloodTypes: bloodTypeRows.map(r => r.blood_type),
        sexes: sexRows.map(r => r.sex),
        civilStatuses: civilStatusRows.map(r => r.civil_status),
        arsens: arsenRows.map(a => ({ id: a.id, name: a.name })),
        groups: groupRows.map(g => ({ id: g.id, name: g.name, arsen_id: g.arsen_id, arsen_name: g.arsen_name })),
        squadrons: squadronRows.map(s => ({ id: s.id, name: s.name, group_id: s.group_id, group_name: s.group_name, arsen_id: s.arsen_id, arsen_name: s.arsen_name })),
      }
    });
  } catch (error) {
    console.error('Error fetching filter metadata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch filter metadata',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/reservists/my/profile
 * Get current reservist's own profile (self-service)
 */
router.get('/my/profile', authenticateToken, async (req, res) => {
  try {
    // Find the reservist record linked to this user
    const [reservists] = await db.query(`
      SELECT 
        r.*, u.email, u.role, u.is_active as user_active,
        ra.id as assignment_id, ra.group_id, ra.squadron_id, ra.assigned_date,
        g.name as group_name, g.code as group_code,
        s.name as squadron_name, s.location
      FROM reservists r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
      LEFT JOIN \`groups\` g ON ra.group_id = g.id
      LEFT JOIN squadron s ON ra.squadron_id = s.id
      WHERE r.user_id = ?
    `, [req.user.id]);

    if (reservists.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservist profile not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      data: reservists[0]
    });
  } catch (error) {
    console.error('Error fetching own profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/reservists/my/trainings
 * Get current reservist's training history (self-service)
 */
router.get('/my/trainings', authenticateToken, async (req, res) => {
  try {
    const [reservist] = await db.query('SELECT id FROM reservists WHERE user_id = ?', [req.user.id]);
    if (reservist.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Reservist not found', code: 'NOT_FOUND' });
    }
    const reservistId = reservist[0].id;

    const [trainings] = await db.query(`
      SELECT 
        t.id, t.title, t.start_datetime, t.end_datetime, t.status,
        a.status as attendance_status
      FROM internal_training_participants itp
      JOIN trainings t ON itp.training_id = t.id
      LEFT JOIN attendance a ON a.training_id = t.id AND a.reservist_id = itp.reservist_id
      WHERE itp.reservist_id = ?
      ORDER BY t.start_datetime DESC
    `, [reservistId]);

    res.json({
      status: 'success',
      data: trainings
    });
  } catch (error) {
    console.error('Error fetching own trainings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch trainings',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/reservists/my/attendance
 * Get current reservist's attendance records (self-service)
 */
router.get('/my/attendance', authenticateToken, async (req, res) => {
  try {
    const [reservist] = await db.query('SELECT id FROM reservists WHERE user_id = ?', [req.user.id]);
    if (reservist.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Reservist not found', code: 'NOT_FOUND' });
    }
    const reservistId = reservist[0].id;

    const [attendance] = await db.query(`
      SELECT 
        a.id, a.status, a.created_at,
        t.title as training_title, t.start_datetime
      FROM attendance a
      JOIN trainings t ON a.training_id = t.id
      WHERE a.reservist_id = ?
      ORDER BY a.created_at DESC
      LIMIT 100
    `, [reservistId]);

    res.json({
      status: 'success',
      data: attendance
    });
  } catch (error) {
    console.error('Error fetching own attendance:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch attendance',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/reservists/my/readiness
 * Get current reservist's readiness score (self-service)
 */
router.get('/my/readiness', authenticateToken, async (req, res) => {
  try {
    const [reservist] = await db.query('SELECT id FROM reservists WHERE user_id = ?', [req.user.id]);
    if (reservist.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Reservist not found', code: 'NOT_FOUND' });
    }
    const reservistId = reservist[0].id;

    const [readiness] = await db.query(
      'SELECT * FROM v_reservist_readiness WHERE reservist_id = ?',
      [reservistId]
    );

    res.json({
      status: 'success',
      data: readiness[0] || null
    });
  } catch (error) {
    console.error('Error fetching own readiness:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch readiness',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * PUT /api/reservists/my/profile
 * Update current reservist's own profile (self-service)
 * Training fields are strictly forbidden for non-admin users
 */
router.put(
  '/my/profile',
  authenticateToken,
  [
    body('first_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('last_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('rank').optional().trim(),
    body('phone_number').optional().trim(),
    body('address').optional(),
    body('date_of_birth').optional().isISO8601(),
    body('sex').optional().isIn(['Male', 'Female', 'Other']),
    body('blood_type').optional().isIn(['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']),
    body('emergency_contact_name').optional().trim(),
    body('emergency_contact_phone').optional().trim(),
    body('emergency_contact_address').optional(),
    body('civil_status').optional().isIn(['Single','Married','Widowed','Separated','Divorced']),
    body('citizenship').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      // Reject training-related fields explicitly
      const bodyKeys = Object.keys(req.body);
      const forbidden = bodyKeys.filter(k => TRAINING_FORBIDDEN_FIELDS.includes(k));
      if (forbidden.length > 0) {
        logAudit({
          user_id: req.user.id,
          action: 'profile_update.attempted_training_field',
          entity_type: 'reservist',
          entity_id: req.user.id,
          new_values: { forbidden_fields: forbidden },
          ip_address: getClientIp(req),
          user_agent: req.headers['user-agent']
        });
        return res.status(409).json({
          status: 'error',
          message: 'Training data cannot be modified through profile endpoint',
          code: 'FORBIDDEN_TRAINING_UPDATE'
        });
      }

      const [reservist] = await db.query(
        'SELECT id, user_id FROM reservists WHERE user_id = ?',
        [req.user.id]
      );

      if (reservist.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Reservist profile not found',
          code: 'NOT_FOUND'
        });
      }

      const reservistId = reservist[0].id;
      const allowedFields = [
        'first_name', 'last_name', 'rank', 'phone_number', 'address',
        'date_of_birth', 'sex', 'blood_type',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_address',
        'civil_status', 'citizenship'
      ];

      const updateFields = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateFields[field] = req.body[field];
        }
      });

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No valid fields to update',
          code: 'NO_UPDATES'
        });
      }

      const updateColumns = Object.keys(updateFields).map(col => `\`${col}\` = ?`).join(',');
      const values = [...Object.values(updateFields), reservistId];

      await db.query(`UPDATE reservists SET ${updateColumns} WHERE id = ?`, values);

      logAudit({
        user_id: req.user.id,
        action: 'reservist.profile_updated',
        entity_type: 'reservist',
        entity_id: reservistId,
        old_values: null,
        new_values: updateFields,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']
      });

      const [updated] = await db.query(
        'SELECT * FROM reservists WHERE id = ?',
        [reservistId]
      );

      res.json({
        status: 'success',
        message: 'Profile updated successfully',
        data: updated[0]
      });
    } catch (error) {
      console.error('Error updating own profile:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update profile',
        code: 'UPDATE_ERROR'
      });
    }
  }
);

/**
 * POST /api/reservists/my/profile/generate-qr
 * Generate a QR code value for the current reservist if not already set
 */
router.post('/my/profile/generate-qr', authenticateToken, async (req, res) => {
  try {
    const [reservists] = await db.query(
      'SELECT id, qr_code, service_number FROM reservists WHERE user_id = ?',
      [req.user.id]
    );

    if (reservists.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservist profile not found',
        code: 'NOT_FOUND'
      });
    }

    const reservist = reservists[0];

    if (reservist.qr_code) {
      return res.json({
        status: 'success',
        data: { qr_code: reservist.qr_code }
      });
    }

    const qrValue = reservist.service_number || `RES-${reservist.id}-${Date.now()}`;

    await db.query(
      'UPDATE reservists SET qr_code = ? WHERE id = ?',
      [qrValue, reservist.id]
    );

    res.json({
      status: 'success',
      data: { qr_code: qrValue }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate QR code',
      code: 'GENERATE_ERROR'
    });
  }
});

module.exports = router;