const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

console.log('Loading groups.js routes file...');

const router = express.Router();

/**
 * GET /api/groups
 * List all groups with pagination and filtering
 */
router.get('/', authenticateToken, authorize('admin'), [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], (req, res) => {
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

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const arsenId = req.query.arsen_id;
        const isActive = req.query.is_active;
        const search = req.query.search;

        let query = `
            SELECT g.id, g.code, g.name, g.commander_name, g.is_active as group_active,
                   g.created_at, g.updated_at,
                   a.id as arsen_id, a.code as arsen_code, a.name as arsen_name
            FROM \`groups\` g
            LEFT JOIN arsens a ON g.arsen_id = a.id
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM `groups` g WHERE 1=1';
        const queryParams = [];
        const countParams = [];

        if (arsenId) {
            query += ' AND g.arsen_id = ?';
            countQuery += ' AND g.arsen_id = ?';
            queryParams.push(arsenId);
            countParams.push(arsenId);
        }

        if (isActive !== undefined) {
            const activeValue = isActive === 'true' ? 1 : 0;
            query += ' AND g.is_active = ?';
            countQuery += ' AND g.is_active = ?';
            queryParams.push(activeValue);
            countParams.push(activeValue);
        }

        if (search) {
            query += ' AND (g.code LIKE ? OR g.name LIKE ? OR g.commander_name LIKE ?)';
            countQuery += ' AND (g.code LIKE ? OR g.name LIKE ? OR g.commander_name LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY g.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        db.query(countQuery, countParams, (countErr, countResults) => {
            if (countErr) {
                console.error('Groups count query error:', countErr);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR',
                    debug: countErr.message
                });
            }

            const total = countResults[0].total;
            const totalPages = Math.ceil(total / limit);

            db.query(query, queryParams, (err, results) => {
                if (err) {
                    console.error('Groups query error:', err);
                    console.error('Query:', query);
                    console.error('Params:', queryParams);
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR',
                        debug: err.message
                    });
                }

                res.status(200).json({
                    status: 'success',
                    data: {
                        groups: results,
                        pagination: {
                            currentPage: page,
                            totalPages,
                            totalItems: total,
                            itemsPerPage: limit
                        }
                    }
                });
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * GET /api/groups/:id
 * Get single group with ARSEN details
 */
router.get('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid group ID is required')
], (req, res) => {
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

        const groupId = req.params.id;

        const query = `
            SELECT g.*, a.id as arsen_id, a.code as arsen_code, a.name as arsen_name
            FROM \`groups\` g
            LEFT JOIN arsens a ON g.arsen_id = a.id
            WHERE g.id = ?
        `;

        db.query(query, [groupId], (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (!results || results.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Group not found',
                    code: 'GROUP_NOT_FOUND'
                });
            }

            res.status(200).json({
                status: 'success',
                data: results[0]
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * GET /api/groups/arsens/:arsenId/groups
 * Get groups under specific ARSEN
 */
router.get('/arsens/:arsenId/groups', authenticateToken, authorize('admin'), [
    param('arsenId').isInt({ min: 1 }).withMessage('Valid ARSEN ID is required')
], (req, res) => {
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

        const arsenId = req.params.arsenId;
        const isActive = req.query.is_active;

        let query = `
            SELECT g.id, g.code, g.name, g.commander_name, g.is_active, g.created_at
            FROM \`groups\` g
            WHERE g.arsen_id = ?
        `;
        const queryParams = [arsenId];

        if (isActive !== undefined) {
            const activeValue = isActive === 'true' ? 1 : 0;
            query += ' AND g.is_active = ?';
            queryParams.push(activeValue);
        }

        query += ' ORDER BY g.name ASC';

        db.query(query, queryParams, (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            res.status(200).json({
                status: 'success',
                data: { groups: results }
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * POST /api/groups
 * Create new group (admin only)
 */
router.post('/', authenticateToken, authorize('admin'), [
    body('arsen_id').isInt({ min: 1 }).withMessage('Valid ARSEN ID is required'),
    body('code').notEmpty().trim().withMessage('Group code is required'),
    body('name').notEmpty().trim().withMessage('Group name is required'),
    body('commander_name').optional().trim()
], (req, res) => {
    console.log('POST /api/groups handler called');
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

        const { arsen_id, code, name, commander_name } = req.body;

        db.query('SELECT id FROM arsens WHERE id = ? AND is_active = TRUE', [arsen_id], (arsenErr, arsenResults) => {
            if (arsenErr) {
                console.error('ARSEN check error:', arsenErr);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error - ARSEN check',
                    code: 'DB_ERROR'
                });
            }

            if (!arsenResults || arsenResults.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'ARSEN not found or inactive',
                    code: 'ARSEN_NOT_FOUND'
                });
            }

            db.query(
                'SELECT id FROM `groups` WHERE arsen_id = ? AND code = ?',
                [arsen_id, code],
                (                codeErr, codeResults) => {
                    if (codeErr) {
                        console.error('Group code check error:', codeErr);
                        return res.status(500).json({
                            status: 'error',
                            message: 'Database error - code check',
                            code: 'DB_ERROR',
                            debug: codeErr.sqlMessage || codeErr.message
                        });
                    }

                    if (codeResults && codeResults.length > 0) {
                        return res.status(409).json({
                            status: 'error',
                            message: 'Group code already exists for this ARSEN',
                            code: 'GROUP_CODE_EXISTS'
                        });
                    }

                    db.query(
                        'INSERT INTO `groups` (arsen_id, code, name, commander_name) VALUES (?, ?, ?, ?)',
                        [arsen_id, code, name, commander_name || null],
                        (insertErr, insertResults) => {
                            if (insertErr) {
                                console.error('Group INSERT error:', insertErr);
                                return res.status(500).json({
                                    status: 'error',
                                    message: 'Failed to create group - v3',
                                    code: 'DB_ERROR',
                                    debug: insertErr.sqlMessage || insertErr.message,
                                    version: 'v3'
                                });
                            }

                            logAudit({
                                user_id: req.user.userId,
                                action: 'group.created',
                                entity_type: 'group',
                                entity_id: insertResults.insertId,
                                new_values: { arsen_id, code, name, commander_name }
                            });

                            res.status(201).json({
                                status: 'success',
                                message: 'Group created successfully',
                                data: {
                                    groupId: insertResults.insertId,
                                    arsen_id,
                                    code,
                                    name
                                }
                            });
                        }
                    );
                }
            );
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * PUT /api/groups/:id
 * Update group (admin only)
 */
router.put('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid group ID is required'),
    body('arsen_id').optional().isInt({ min: 1 }),
    body('code').optional().trim(),
    body('name').optional().trim(),
    body('commander_name').optional().trim(),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
], (req, res) => {
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

        const groupId = req.params.id;
        const { arsen_id, code, name, commander_name, is_active } = req.body;

        db.query('SELECT * FROM \`groups\` WHERE id = ?', [groupId], (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (!results || results.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Group not found',
                    code: 'GROUP_NOT_FOUND'
                });
            }

            const oldGroupData = results[0];
            const currentArsenId = arsen_id || oldGroupData.arsen_id;

            if (code) {
                db.query('SELECT id FROM \`groups\` WHERE arsen_id = ? AND code = ? AND id != ?', [currentArsenId, code, groupId], (codeErr, codeResults) => {
                    if (codeResults && codeResults.length > 0) {
                        return res.status(409).json({
                            status: 'error',
                            message: 'Group code already exists for this ARSEN',
                            code: 'GROUP_CODE_EXISTS'
                        });
                    }
                });
            }

            const updates = [];
            const params = [];

            if (arsen_id) { updates.push('arsen_id = ?'); params.push(arsen_id); }
            if (code) { updates.push('code = ?'); params.push(code); }
            if (name) { updates.push('name = ?'); params.push(name); }
            if (commander_name !== undefined) { updates.push('commander_name = ?'); params.push(commander_name || null); }
            if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }

            if (updates.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No fields to update',
                    code: 'NO_UPDATE'
                });
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(groupId);

            const query = `UPDATE \`groups\` SET ${updates.join(', ')} WHERE id = ?`;
            
            db.query(query, params, (updateErr, updateResults) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to update group',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'group.updated',
                    entity_type: 'group',
                    entity_id: groupId,
                    old_values: oldGroupData,
                    new_values: req.body
                });

                res.status(200).json({
                    status: 'success',
                    message: 'Group updated successfully'
                });
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * DELETE /api/groups/:id
 * Soft delete (deactivate) group
 */
router.delete('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid group ID is required')
], (req, res) => {
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

        const groupId = req.params.id;

        db.query('SELECT * FROM \`groups\` WHERE id = ?', [groupId], (err, results) => {
            if (err) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (!results || results.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Group not found',
                    code: 'GROUP_NOT_FOUND'
                });
            }

            const oldGroupData = results[0];

            db.query('UPDATE \`groups\` SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [groupId], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to deactivate group',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'group.deleted',
                    entity_type: 'group',
                    entity_id: groupId,
                    old_values: oldGroupData
                });

                res.status(200).json({
                    status: 'success',
                    message: 'Group deactivated successfully'
                });
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * GET /api/groups/:id/assignments
 * Get all assignments for a specific group
 */
router.get('/:id/assignments', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid group ID is required')
], (req, res) => {
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

        const groupId = req.params.id;

        db.query('SELECT id FROM \`groups\` WHERE id = ?', [groupId], (checkErr, checkResults) => {
            if (checkErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }
            if (!checkResults || checkResults.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Group not found',
                    code: 'GROUP_NOT_FOUND'
                });
            }

            const query = `
                SELECT ra.*, 
                       r.first_name, r.last_name, r.rank, r.service_number,
                       c.name as city_name, c.province
                FROM reservist_assignments ra
                LEFT JOIN reservists r ON ra.reservist_id = r.id
                LEFT JOIN cities c ON ra.city_id = c.id
                WHERE ra.group_id = ?
                ORDER BY ra.assigned_date DESC
            `;

            db.query(query, [groupId], (err, results) => {
                if (err) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR'
                    });
                }

                res.status(200).json({
                    status: 'success',
                    data: {
                        assignments: results
                    }
                });
            });
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

module.exports = router;
