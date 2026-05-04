const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

/**
 * GET /api/cities
 * List all cities with pagination and filtering
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
        const groupId = req.query.group_id;
        const province = req.query.province;
        const isActive = req.query.is_active;
        const search = req.query.search;

        let query = `
            SELECT c.id, c.name, c.province, c.postal_code, c.is_active,
                   c.created_at, c.updated_at,
                   g.id as group_id, g.code as group_code, g.name as group_name,
                   a.id as arsen_id, a.code as arsen_code, a.name as arsen_name
            FROM cities c
            LEFT JOIN \`groups\` g ON c.group_id = g.id
            LEFT JOIN arsens a ON g.arsen_id = a.id
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM cities c WHERE 1=1';
        const queryParams = [];
        const countParams = [];

        if (groupId) {
            query += ' AND c.group_id = ?';
            countQuery += ' AND c.group_id = ?';
            queryParams.push(groupId);
            countParams.push(groupId);
        }

        if (province) {
            query += ' AND c.province = ?';
            countQuery += ' AND c.province = ?';
            queryParams.push(province);
            countParams.push(province);
        }

        if (isActive !== undefined) {
            const activeValue = isActive === 'true' ? 1 : 0;
            query += ' AND c.is_active = ?';
            countQuery += ' AND c.is_active = ?';
            queryParams.push(activeValue);
            countParams.push(activeValue);
        }

        if (search) {
            query += ' AND (c.name LIKE ? OR c.province LIKE ?)';
            countQuery += ' AND (c.name LIKE ? OR c.province LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`);
            countParams.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY c.name ASC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        db.query(countQuery, countParams, (countErr, countResults) => {
            if (countErr) {
                console.error('Cities count query error:', countErr);
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
                    console.error('Cities query error:', err);
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
                        cities: results,
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
 * GET /api/cities/:id
 * Get single city with group and ARSEN details
 */
router.get('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid city ID is required')
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

        const cityId = req.params.id;

        const query = `
            SELECT c.*, 
                   g.id as group_id, g.code as group_code, g.name as group_name,
                   a.id as arsen_id, a.code as arsen_code, a.name as arsen_name
            FROM cities c
            LEFT JOIN groups g ON c.group_id = g.id
            LEFT JOIN arsens a ON g.arsen_id = a.id
            WHERE c.id = ?
        `;

        db.query(query, [cityId], (err, results) => {
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
                    message: 'City not found',
                    code: 'CITY_NOT_FOUND'
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
 * GET /api/cities/groups/:groupId/cities
 * Get cities under specific group
 */
router.get('/groups/:groupId/cities', authenticateToken, authorize('admin'), [
    param('groupId').isInt({ min: 1 }).withMessage('Valid group ID is required')
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

        const groupId = req.params.groupId;
        const isActive = req.query.is_active;

        let query = `
            SELECT c.id, c.name, c.province, c.postal_code, c.is_active, c.created_at
            FROM cities c
            WHERE c.group_id = ?
        `;
        const queryParams = [groupId];

        if (isActive !== undefined) {
            const activeValue = isActive === 'true' ? 1 : 0;
            query += ' AND c.is_active = ?';
            queryParams.push(activeValue);
        }

        query += ' ORDER BY c.name ASC';

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
                data: { cities: results }
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
 * POST /api/cities
 * Create new city (admin only)
 */
router.post('/', authenticateToken, authorize('admin'), [
    body('group_id').isInt({ min: 1 }).withMessage('Valid group ID is required'),
    body('name').notEmpty().trim().withMessage('City name is required'),
    body('province').notEmpty().trim().withMessage('Province is required'),
    body('postal_code').optional().trim()
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

        const { group_id, name, province, postal_code } = req.body;

        db.query('SELECT id FROM groups WHERE id = ? AND is_active = TRUE', [group_id], (groupErr, groupResults) => {
            if (groupErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (!groupResults || groupResults.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Group not found or inactive',
                    code: 'GROUP_NOT_FOUND'
                });
            }

            db.query(
                'INSERT INTO cities (group_id, name, province, postal_code) VALUES (?, ?, ?, ?)',
                [group_id, name, province, postal_code || null],
                (insertErr, insertResults) => {
                    if (insertErr) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to create city',
                            code: 'DB_ERROR'
                        });
                    }

                    logAudit({
                        user_id: req.user.userId,
                        action: 'city.created',
                        entity_type: 'city',
                        entity_id: insertResults.insertId,
                        new_values: { group_id, name, province, postal_code }
                    });

                    res.status(201).json({
                        status: 'success',
                        message: 'City created successfully',
                        data: {
                            cityId: insertResults.insertId,
                            group_id,
                            name,
                            province
                        }
                    });
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
 * PUT /api/cities/:id
 * Update city (admin only)
 */
router.put('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid city ID is required'),
    body('group_id').optional().isInt({ min: 1 }),
    body('name').optional().trim(),
    body('province').optional().trim(),
    body('postal_code').optional().trim(),
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

        const cityId = req.params.id;
        const { group_id, name, province, postal_code, is_active } = req.body;

        db.query('SELECT * FROM cities WHERE id = ?', [cityId], (err, results) => {
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
                    message: 'City not found',
                    code: 'CITY_NOT_FOUND'
                });
            }

            const oldCityData = results[0];

            if (group_id) {
                db.query('SELECT id FROM groups WHERE id = ? AND is_active = TRUE', [group_id], (groupErr, groupResults) => {
                    if (groupErr || !groupResults || groupResults.length === 0) {
                        return res.status(404).json({
                            status: 'error',
                            message: 'Group not found or inactive',
                            code: 'GROUP_NOT_FOUND'
                        });
                    }
                });
            }

            const updates = [];
            const params = [];

            if (group_id) { updates.push('group_id = ?'); params.push(group_id); }
            if (name) { updates.push('name = ?'); params.push(name); }
            if (province) { updates.push('province = ?'); params.push(province); }
            if (postal_code !== undefined) { updates.push('postal_code = ?'); params.push(postal_code || null); }
            if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }

            if (updates.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No fields to update',
                    code: 'NO_UPDATE'
                });
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(cityId);

            const query = `UPDATE cities SET ${updates.join(', ')} WHERE id = ?`;

            db.query(query, params, (updateErr, updateResults) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to update city',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'city.updated',
                    entity_type: 'city',
                    entity_id: cityId,
                    old_values: oldCityData,
                    new_values: req.body
                });

                res.status(200).json({
                    status: 'success',
                    message: 'City updated successfully'
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
 * DELETE /api/cities/:id
 * Soft delete (deactivate) city
 */
router.delete('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid city ID is required')
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

        const cityId = req.params.id;

        db.query('SELECT * FROM cities WHERE id = ?', [cityId], (err, results) => {
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
                    message: 'City not found',
                    code: 'CITY_NOT_FOUND'
                });
            }

            const oldCityData = results[0];

            db.query('UPDATE cities SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [cityId], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to deactivate city',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'city.deleted',
                    entity_type: 'city',
                    entity_id: cityId,
                    old_values: oldCityData
                });

                res.status(200).json({
                    status: 'success',
                    message: 'City deactivated successfully'
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
 * GET /api/cities/:id/assignments
 * Get all assignments for a specific city
 */
router.get('/:id/assignments', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid city ID is required')
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

        const cityId = req.params.id;

        db.query('SELECT id FROM cities WHERE id = ?', [cityId], (checkErr, checkResults) => {
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
                    message: 'City not found',
                    code: 'CITY_NOT_FOUND'
                });
            }

            const query = `
                SELECT ra.*, 
                       r.first_name, r.last_name, r.rank, r.service_number,
                       g.name as group_name, g.code as group_code
                FROM reservist_assignments ra
                LEFT JOIN reservists r ON ra.reservist_id = r.id
                LEFT JOIN groups g ON ra.group_id = g.id
                WHERE ra.city_id = ?
                ORDER BY ra.assigned_date DESC
            `;

            db.query(query, [cityId], (err, results) => {
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
