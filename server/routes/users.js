const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { hashPassword } = require('../app/auth');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

/**
 * GET /api/users
 * List all users with pagination and filtering
 * Query params: page, limit, role, is_active, search
 */
router.get('/', authenticateToken, authorize('admin'), [
    param('page').optional().isInt({ min: 1 }),
    param('limit').optional().isInt({ min: 1, max: 100 })
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
        const role = req.query.role;
        const isActive = req.query.is_active;
        const search = req.query.search;

        let query = 'SELECT id, email, role, is_active, last_login_at, created_at, updated_at FROM users WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        const queryParams = [];
        const countParams = [];

        if (role) {
            query += ' AND role = ?';
            countQuery += ' AND role = ?';
            queryParams.push(role);
            countParams.push(role);
        }

        if (isActive !== undefined) {
            const activeValue = isActive === 'true' ? 1 : 0;
            query += ' AND is_active = ?';
            countQuery += ' AND is_active = ?';
            queryParams.push(activeValue);
            countParams.push(activeValue);
        }

        if (search) {
            query += ' AND email LIKE ?';
            countQuery += ' AND email LIKE ?';
            queryParams.push(`%${search}%`);
            countParams.push(`%${search}%`);
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
                        users: results,
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
 * GET /api/users/:id
 * Get single user by ID
 */
router.get('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid user ID is required')
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

        const userId = req.params.id;

        db.query(
            'SELECT id, email, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ?',
            [userId],
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
                        message: 'User not found',
                        code: 'USER_NOT_FOUND'
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
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', authenticateToken, authorize('admin'), [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['admin', 'reservist']).withMessage('Role must be admin or reservist')
], async (req, res) => {
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

        const { email, password, role } = req.body;

        db.query(
            'SELECT id FROM users WHERE email = ?',
            [email],
            async (err, results) => {
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
                        message: 'Email already registered',
                        code: 'EMAIL_EXISTS'
                    });
                }

                try {
                    const passwordHash = await hashPassword(password);

                    db.query(
                        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                        [email, passwordHash, role],
                        (insertErr, insertResults) => {
                            if (insertErr) {
                                return res.status(500).json({
                                    status: 'error',
                                    message: 'Failed to create user',
                                    code: 'DB_ERROR'
                                });
                            }

                            logAudit({
                                user_id: req.user.userId,
                                action: 'user.created',
                                entity_type: 'user',
                                entity_id: insertResults.insertId,
                                new_values: { email, role }
                            });

                            res.status(201).json({
                                status: 'success',
                                message: 'User created successfully',
                                data: {
                                    userId: insertResults.insertId,
                                    email,
                                    role
                                }
                            });
                        }
                    );
                } catch (hashError) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Password hashing failed',
                        code: 'AUTH_ERROR'
                    });
                }
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
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['admin', 'reservist']).withMessage('Role must be admin or reservist'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
], async (req, res) => {
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

        const userId = req.params.id;
        const { email, password, role, is_active } = req.body;

        db.query('SELECT * FROM users WHERE id = ?', [userId], async (err, results) => {
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
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            const oldUserData = results[0];

            if (email) {
                db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (emailErr, emailResults) => {
                    if (emailResults && emailResults.length > 0) {
                        return res.status(409).json({
                            status: 'error',
                            message: 'Email already in use',
                            code: 'EMAIL_EXISTS'
                        });
                    }
                });
            }

            const updates = [];
            const params = [];

            if (email) {
                updates.push('email = ?');
                params.push(email);
            }
            if (password) {
                try {
                    const passwordHash = await hashPassword(password);
                    updates.push('password_hash = ?');
                    params.push(passwordHash);
                } catch (hashError) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Password hashing failed',
                        code: 'AUTH_ERROR'
                    });
                }
            }
            if (role) {
                updates.push('role = ?');
                params.push(role);
            }
            if (is_active !== undefined) {
                updates.push('is_active = ?');
                params.push(is_active);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No fields to update',
                    code: 'NO_UPDATE'
                });
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(userId);

            const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

            db.query(query, params, (updateErr, updateResults) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to update user',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'user.updated',
                    entity_type: 'user',
                    entity_id: userId,
                    old_values: oldUserData,
                    new_values: req.body
                });

                res.status(200).json({
                    status: 'success',
                    message: 'User updated successfully'
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
 * DELETE /api/users/:id
 * Soft delete (deactivate) user
 */
router.delete('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid user ID is required')
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

        const userId = req.params.id;

        if (parseInt(userId) === req.user.userId) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot deactivate your own account',
                code: 'CANNOT_DEACTIVATE_SELF'
            });
        }

        db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
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
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            const oldUserData = results[0];

            db.query('UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId], (updateErr, updateResults) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to deactivate user',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'user.deleted',
                    entity_type: 'user',
                    entity_id: userId,
                    old_values: oldUserData
                });

                res.status(200).json({
                    status: 'success',
                    message: 'User deactivated successfully'
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
