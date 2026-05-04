const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

/**
 * GET /api/arsens
 * List all ARSENs with pagination and filtering
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
        const isActive = req.query.is_active;
        const search = req.query.search;

        let query = 'SELECT id, code, name, location, commander_name, is_active, created_at, updated_at FROM arsens WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM arsens WHERE 1=1';
        const queryParams = [];
        const countParams = [];

        if (isActive !== undefined) {
            const activeValue = isActive === 'true' ? 1 : 0;
            query += ' AND is_active = ?';
            countQuery += ' AND is_active = ?';
            queryParams.push(activeValue);
            countParams.push(activeValue);
        }

        if (search) {
            query += ' AND (code LIKE ? OR name LIKE ? OR commander_name LIKE ?)';
            countQuery += ' AND (code LIKE ? OR name LIKE ? OR commander_name LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        db.query(countQuery, countParams, (countErr, countResults) => {
            if (countErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            const total = countResults[0].total;
            const totalPages = Math.ceil(total / limit);

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
                    data: {
                        arsens: results,
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
 * GET /api/arsens/:id
 * Get single ARSEN by ID
 */
router.get('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid ARSEN ID is required')
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

        const arsenId = req.params.id;

        db.query(
            'SELECT id, code, name, location, commander_name, is_active, created_at, updated_at FROM arsens WHERE id = ?',
            [arsenId],
            (err, results) => {
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
                        message: 'ARSEN not found',
                        code: 'ARSEN_NOT_FOUND'
                    });
                }

                res.status(200).json({
                    status: 'success',
                    data: results[0]
                });
            }
        );
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * POST /api/arsens
 * Create new ARSEN (admin only)
 */
router.post('/', authenticateToken, authorize('admin'), [
    body('code').notEmpty().trim().withMessage('ARSEN code is required'),
    body('name').notEmpty().trim().withMessage('ARSEN name is required'),
    body('location').optional().trim(),
    body('commander_name').optional().trim()
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

        const { code, name, location, commander_name } = req.body;

        db.query(
            'SELECT id FROM arsens WHERE code = ?',
            [code],
            (err, results) => {
                if (err) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR'
                    });
                }

                if (results && results.length > 0) {
                    return res.status(409).json({
                        status: 'error',
                        message: 'ARSEN code already exists',
                        code: 'ARSEN_CODE_EXISTS'
                    });
                }

                db.query(
                    'INSERT INTO arsens (code, name, location, commander_name) VALUES (?, ?, ?, ?)',
                    [code, name, location || null, commander_name || null],
                    (insertErr, insertResults) => {
                        if (insertErr) {
                            return res.status(500).json({
                                status: 'error',
                                message: 'Failed to create ARSEN',
                                code: 'DB_ERROR'
                            });
                        }

                        logAudit({
                            user_id: req.user.userId,
                            action: 'arsen.created',
                            entity_type: 'arsen',
                            entity_id: insertResults.insertId,
                            new_values: { code, name, location, commander_name }
                        });

                        res.status(201).json({
                            status: 'success',
                            message: 'ARSEN created successfully',
                            data: {
                                arsenId: insertResults.insertId,
                                code,
                                name
                            }
                        });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * PUT /api/arsens/:id
 * Update ARSEN (admin only)
 */
router.put('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid ARSEN ID is required'),
    body('code').optional().trim(),
    body('name').optional().trim(),
    body('location').optional().trim(),
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

        const arsenId = req.params.id;
        const { code, name, location, commander_name, is_active } = req.body;

        db.query('SELECT * FROM arsens WHERE id = ?', [arsenId], (err, results) => {
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
                    message: 'ARSEN not found',
                    code: 'ARSEN_NOT_FOUND'
                });
            }

            const oldArsenData = results[0];

            if (code) {
                db.query('SELECT id FROM arsens WHERE code = ? AND id != ?', [code, arsenId], (codeErr, codeResults) => {
                    if (codeResults && codeResults.length > 0) {
                        return res.status(409).json({
                            status: 'error',
                            message: 'ARSEN code already in use',
                            code: 'ARSEN_CODE_EXISTS'
                        });
                    }
                });
            }

            const updates = [];
            const params = [];

            if (code) { updates.push('code = ?'); params.push(code); }
            if (name) { updates.push('name = ?'); params.push(name); }
            if (location !== undefined) { updates.push('location = ?'); params.push(location || null); }
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
            params.push(arsenId);

            const query = `UPDATE arsens SET ${updates.join(', ')} WHERE id = ?`;

            db.query(query, params, (updateErr, updateResults) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to update ARSEN',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'arsen.updated',
                    entity_type: 'arsen',
                    entity_id: arsenId,
                    old_values: oldArsenData,
                    new_values: req.body
                });

                res.status(200).json({
                    status: 'success',
                    message: 'ARSEN updated successfully'
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
 * DELETE /api/arsens/:id
 * Soft delete (deactivate) ARSEN
 */
router.delete('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid ARSEN ID is required')
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

        const arsenId = req.params.id;

        db.query('SELECT * FROM arsens WHERE id = ?', [arsenId], (err, results) => {
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
                    message: 'ARSEN not found',
                    code: 'ARSEN_NOT_FOUND'
                });
            }

            const oldArsenData = results[0];

            db.query('UPDATE arsens SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [arsenId], (updateErr, updateResults) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to deactivate ARSEN',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'arsen.deleted',
                    entity_type: 'arsen',
                    entity_id: arsenId,
                    old_values: oldArsenData
                });

                res.status(200).json({
                    status: 'success',
                    message: 'ARSEN deactivated successfully'
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
