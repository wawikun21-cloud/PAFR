const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { attachHierarchyScope } = require('../middleware/rbac');

/**
 * GET /api/hierarchy
 * Returns the full PAFR hierarchy: Airbase → ARSEN → Group → Squadron
 * with aggregated statistics (reservist counts, readiness, status).
 *
 * Supports:
 *   ?hierarchical=true  — nested tree (default)
 *   ?active_only=true   — filter to active entities only
 */
router.get('/', [
  query('hierarchical').optional().isBoolean(),
  query('active_only').optional().isBoolean()
], authenticateToken, attachHierarchyScope(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }

    const { hierarchical, active_only } = req.query;
    const isHierarchical = hierarchical === true || hierarchical === 'true' || hierarchical === undefined;
    const activeOnly = active_only === true || active_only === 'true';

    // ── Fetch ARSENs ──────────────────────────────────────────────
    let arsensWhere = '';
    let arsensParams = [];
    if (activeOnly) {
      arsensWhere = 'WHERE a.is_active = TRUE';
    }

    // Scoped visibility: scoped admins (admin_arsen/admin_group/
    // admin_squadron) only see their own branch of the tree — everything
    // else is pruned out, not just marked read-only. Full admin
    // (req.hierarchyScope === null) sees the whole tree, unfiltered.
    if (req.hierarchyScope) {
      arsensWhere = arsensWhere
        ? `${arsensWhere} AND a.id = ?`
        : 'WHERE a.id = ?';
      arsensParams.push(req.hierarchyScope.arsen_id);
    }

    const [arsens] = await db.query(`
      SELECT
        a.id,
        a.code,
        a.name,
        a.location,
        a.commander_name,
        a.is_active,
        COUNT(DISTINCT g.id) as group_count
      FROM arsens a
      LEFT JOIN \`groups\` g ON a.id = g.arsen_id ${activeOnly ? 'AND g.is_active = TRUE' : ''}
      ${arsensWhere}
      GROUP BY a.id
      ORDER BY a.name ASC
    `, arsensParams);

    // ── Fetch Groups per ARSEN ────────────────────────────────────
    const arsenIds = arsens.map(a => a.id);
    let groupsMap = {};

    if (arsenIds.length > 0) {
      let groupsWhere = `WHERE g.arsen_id IN (${arsenIds.map(() => '?').join(',')})`;
      let groupsParams = [...arsenIds];

      // admin_group/admin_squadron only own a single group within their
      // (already-pruned-to-one) ARSEN — narrow further to just that group.
      // admin_arsen sees every group under their ARSEN, so no extra filter.
      if (req.hierarchyScope && req.user.role !== 'admin_arsen') {
        groupsWhere += ' AND g.id = ?';
        groupsParams.push(req.hierarchyScope.group_id);
      }

      if (activeOnly) {
        groupsWhere += ' AND g.is_active = TRUE';
      }

      const [groups] = await db.query(`
        SELECT
          g.id,
          g.arsen_id,
          g.code,
          g.name,
          g.commander_name,
          g.is_active,
          COUNT(DISTINCT s.id) as squadron_count,
          COUNT(DISTINCT ra.reservist_id) as reservist_count
        FROM \`groups\` g
        LEFT JOIN squadron s ON g.id = s.group_id ${activeOnly ? 'AND s.is_active = TRUE' : ''}
        LEFT JOIN reservist_assignments ra ON g.id = ra.group_id
        ${groupsWhere}
        GROUP BY g.id
        ORDER BY g.name ASC
      `, groupsParams);

      // Build groups map keyed by arsen_id
      groups.forEach(g => {
        if (!groupsMap[g.arsen_id]) groupsMap[g.arsen_id] = [];
        groupsMap[g.arsen_id].push(g);
      });

      // ── Fetch Squadrons per Group ─────────────────────────────
      const groupIds = groups.map(g => g.id);
      let squadronsMap = {};

      if (groupIds.length > 0) {
        let squadronsWhere = `WHERE s.group_id IN (${groupIds.map(() => '?').join(',')})`;
        let squadronsParams = [...groupIds];

        // admin_squadron only owns a single squadron — narrow down to it.
        // reservist should also only see their assigned squadron.
        if (req.hierarchyScope && (req.user.role === 'admin_squadron' || req.user.role === 'reservist')) {
          squadronsWhere += ' AND s.id = ?';
          squadronsParams.push(req.hierarchyScope.squadron_id);
        }

        if (activeOnly) {
          squadronsWhere += ' AND s.is_active = TRUE';
        }

        const [squadrons] = await db.query(`
          SELECT
            s.id,
            s.group_id,
            s.name,
            s.code,
            s.location,
            s.specialization,
            s.is_active as status,
            COUNT(DISTINCT ra.reservist_id) as members
          FROM squadron s
          LEFT JOIN reservist_assignments ra ON s.id = ra.squadron_id
          ${squadronsWhere}
          GROUP BY s.id
          ORDER BY s.name ASC
        `, squadronsParams);

        squadrons.forEach(s => {
          if (!squadronsMap[s.group_id]) squadronsMap[s.group_id] = [];
          squadronsMap[s.group_id].push({
            id: s.id,
            name: s.name,
            code: s.code,
            location: s.location,
            specialization: s.specialization,
            status: s.status ? 'active' : 'inactive',
            members: s.members || 0
          });
        });
      }

      // Attach squadrons to groups
      Object.keys(groupsMap).forEach(arsenId => {
        groupsMap[arsenId] = groupsMap[arsenId].map(g => ({
          ...g,
          squadrons: squadronsMap[g.id] || []
        }));
      });
    }

    // ── Fetch total reservist count for the whole airbase ────────
    let reservistCountParams = [];
    let reservistCountWhere = '';
    if (activeOnly) {
      reservistCountWhere = 'WHERE is_active = TRUE';
    }
    const [reservistResult] = await db.query(
      `SELECT COUNT(DISTINCT id) as total FROM reservists ${reservistCountWhere}`,
      reservistCountParams
    );

    // ── Build response ───────────────────────────────────────────
    const hierarchy = arsens.map(arsen => ({
      id: arsen.id,
      name: arsen.name,
      code: arsen.code,
      location: arsen.location || '',
      commander: arsen.commander_name || '',
      is_active: arsen.is_active,
      can_manage: req.user.role === 'admin',
      reservists: arsen.group_count > 0
        ? groupsMap[arsen.id]?.reduce((sum, g) => sum + (g.reservist_count || 0), 0)
        : 0,
      groups: (groupsMap[arsen.id] || []).map(g => ({
        id: g.id,
        name: g.name,
        code: g.code,
        commander: g.commander_name || '',
        is_active: g.is_active,
        reservists: g.reservist_count || 0,
        squadrons: g.squadrons
      }))
    }));

    const totalReservists = reservistResult[0].total;

    // ── Compute summary stats ────────────────────────────────────
    const totalArcens = arsens.length;
    const totalGroups = arsens.reduce((sum, a) => sum + (groupsMap[a.id]?.length || 0), 0);
    const totalSquadrons = arsens.reduce((sum, a) =>
      sum + (groupsMap[a.id]?.reduce((s, g) => s + g.squadrons.length, 0) || 0), 0);

    // Average readiness (across all reservists with assessments)
    const [readinessResult] = await db.query(`
      SELECT AVG(overall_score) as avg_readiness
      FROM readiness r
      INNER JOIN reservists res ON r.reservist_id = res.id
      WHERE res.is_active = TRUE
        AND r.assessment_date = (
          SELECT MAX(assessment_date)
          FROM readiness
          WHERE reservist_id = r.reservist_id
        )
    `);
    const avgReadiness = readinessResult[0]?.avg_readiness
      ? Math.round(parseFloat(readinessResult[0].avg_readiness) * 10) / 10
      : 0;

    if (isHierarchical) {
      res.json({
        status: 'success',
        data: {
          airbase: {
            id: 'pafr',
            name: 'PAFR Airbase',
            code: 'PAFR',
            region: 'National',
            total_reservists: totalReservists,
            avg_readiness: avgReadiness,
            arcens: hierarchy
          },
          summary: {
            total_arcens: totalArcens,
            total_groups: totalGroups,
            total_squadrons: totalSquadrons,
            total_reservists: totalReservists,
            avg_readiness: avgReadiness
          }
        }
      });
    } else {
      res.json({
        status: 'success',
        data: hierarchy,
        pagination: {
          total: totalArcens,
          page: 1,
          limit: totalArcens
        }
      });
    }
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/hierarchy/summary
 * Quick summary stats without full hierarchy tree.
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const [[arsenCount]] = await db.query('SELECT COUNT(*) as count FROM arsens WHERE is_active = TRUE');
    const [[groupCount]] = await db.query('SELECT COUNT(*) as count FROM `groups` WHERE is_active = TRUE');
    const [[squadronCount]] = await db.query('SELECT COUNT(*) as count FROM squadron WHERE is_active = TRUE');
    const [[reservistCount]] = await db.query('SELECT COUNT(*) as count FROM reservists WHERE is_active = TRUE');

    const [[readinessResult]] = await db.query(`
      SELECT AVG(overall_score) as avg_readiness
      FROM readiness r
      INNER JOIN reservists res ON r.reservist_id = res.id
      WHERE res.is_active = TRUE
        AND r.assessment_date = (
          SELECT MAX(assessment_date)
          FROM readiness
          WHERE reservist_id = r.reservist_id
        )
    `);

    res.json({
      status: 'success',
      data: {
        total_arcens: arsenCount.count,
        total_groups: groupCount.count,
        total_squadrons: squadronCount.count,
        total_reservists: reservistCount.count,
        avg_readiness: readinessResult.avg_readiness
          ? Math.round(parseFloat(readinessResult.avg_readiness) * 10) / 10
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching hierarchy summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;