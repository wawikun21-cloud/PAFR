const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { hashPassword } = require('../app/auth');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

/**
 * GET /api/reservists
 * List all reservists with pagination and filtering
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
        const groupId = req.query.group_id;
        const cityId = req.query.city_id;

        let query = `
            SELECT r.id, r.first_name, r.last_name, r.rank, r.service_number, 
                   r.date_of_birth, r.phone_number, r.is_active as reservist_active,
                   u.id as user_id, u.email, u.role, u.is_active as user_active,
                   ra.group_id, g.name as group_name, ra.city_id, c.name as city_name
            FROM reservists r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
            LEFT JOIN \`groups\` g ON ra.group_id = g.id
            LEFT JOIN cities c ON ra.city_id = c.id
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM reservists r WHERE 1=1';
        const queryParams = [];
        const countParams = [];

        if (isActive !== undefined) {
            const activeValue = isActive === 'true' ? 1 : 0;
            query += ' AND r.is_active = ?';
            countQuery += ' AND r.is_active = ?';
            queryParams.push(activeValue);
            countParams.push(activeValue);
        }

        if (search) {
            query += ' AND (r.first_name LIKE ? OR r.last_name LIKE ? OR r.service_number LIKE ?)';
            countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR service_number LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (groupId) {
            query += ' AND ra.group_id = ?';
            queryParams.push(groupId);
        }

        if (cityId) {
            query += ' AND ra.city_id = ?';
            queryParams.push(cityId);
        }

        query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
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
                        reservists: results,
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
 * GET /api/reservists/:id
 * Get single reservist with details
 */
router.get('/:id', authenticateToken, [
    param('id').isInt({ min: 1 }).withMessage('Valid reservist ID is required')
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

        const reservistId = req.params.id;

        // Helper function to fetch reservist
        const fetchReservist = () => {
            const query = `
                SELECT r.*, 
                       u.id as user_id, u.email, u.role, u.is_active as user_active, u.last_login_at,
                       ra.group_id, g.name as group_name, g.code as group_code,
                       ra.city_id, c.name as city_name, c.province,
                       a.id as arsen_id, a.name as arsen_name, a.code as arsen_code
                FROM reservists r
                LEFT JOIN users u ON r.user_id = u.id
                LEFT JOIN reservist_assignments ra ON r.id = ra.reservist_id AND ra.is_primary = TRUE
                LEFT JOIN \`groups\` g ON ra.group_id = g.id
                LEFT JOIN cities c ON ra.city_id = c.id
                LEFT JOIN arsens a ON g.arsen_id = a.id
                WHERE r.id = ?
            `;

            db.query(query, [reservistId], (err, results) => {
                if (err) {
                    console.error('Reservist fetch error:', err);
                    console.error('Query:', query);
                    console.error('Params:', [reservistId]);
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR',
                        debug: err.message
                    });
                }

                if (!results || results.length === 0) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Reservist not found',
                        code: 'RESERVIST_NOT_FOUND'
                    });
                }

                res.status(200).json({
                    status: 'success',
                    data: results[0]
                });
            });
        };

        if (req.user.role === 'reservist') {
            db.query('SELECT id FROM reservists WHERE user_id = ?', [req.user.userId], (checkErr, checkResults) => {
                if (checkErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR'
                    });
                }
                
                if (!checkResults || checkResults.length === 0 || checkResults[0].id != reservistId) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'Access denied. You can only view your own profile.',
                        code: 'ACCESS_DENIED'
                    });
                }
                
                // If check passes, fetch reservist
                fetchReservist();
            });
        } else {
            // For admin users, fetch directly
            fetchReservist();
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * POST /api/reservists
 * Create new reservist with user account
 */
router.post('/', authenticateToken, authorize('admin'), [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('first_name').notEmpty().trim().withMessage('First name is required'),
    body('last_name').notEmpty().trim().withMessage('Last name is required'),
    body('rank').notEmpty().trim().withMessage('Rank is required'),
    body('service_number').notEmpty().trim().withMessage('Service number is required'),
    body('date_of_birth').optional().isDate().withMessage('Valid date required'),
    body('phone_number').optional().trim(),
    body('emergency_contact_name').optional().trim(),
    body('emergency_contact_phone').optional().trim(),
    body('address').optional().trim(),
    body('group_id').optional().isInt({ min: 1 }),
    body('city_id').optional().isInt({ min: 1 })
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

        const {
            email, password, first_name, last_name, rank, service_number,
            date_of_birth, phone_number, emergency_contact_name,
            emergency_contact_phone, address, group_id, city_id
        } = req.body;

        db.query('SELECT id FROM users WHERE email = ?', [email], async (emailErr, emailResults) => {
            if (emailErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (emailResults && emailResults.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Email already registered',
                    code: 'EMAIL_EXISTS'
                });
            }

            db.query('SELECT id FROM reservists WHERE service_number = ?', [service_number], async (serviceErr, serviceResults) => {
                if (serviceErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR'
                    });
                }

                if (serviceResults && serviceResults.length > 0) {
                    return res.status(409).json({
                        status: 'error',
                        message: 'Service number already exists',
                        code: 'SERVICE_NUMBER_EXISTS'
                    });
                }

                try {
                    const passwordHash = await hashPassword(password);

                    db.query(
                        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                        [email, passwordHash, 'reservist'],
                        (userErr, userResults) => {
                            if (userErr) {
                                return res.status(500).json({
                                    status: 'error',
                                    message: 'Failed to create user account',
                                    code: 'DB_ERROR'
                                });
                            }

                            const userId = userResults.insertId;

                            db.query(
                                `INSERT INTO reservists
                                 (user_id, first_name, last_name, \`rank\`, service_number, date_of_birth,
                                  phone_number, emergency_contact_name, emergency_contact_phone, address)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [userId, first_name, last_name, rank, service_number,
                                    date_of_birth || null, phone_number || null,
                                    emergency_contact_name || null, emergency_contact_phone || null,
                                    address || null],
                                (reservistErr, reservistResults) => {
                                    if (reservistErr) {
                                        console.error('Reservist INSERT error:', reservistErr);
                                        db.query('DELETE FROM users WHERE id = ?', [userId]);
                                        return res.status(500).json({
                                            status: 'error',
                                            message: 'Failed to create reservist record',
                                            code: 'DB_ERROR'
                                        });
                                    }

                                    const newReservistData = {
                                        id: reservistResults.insertId,
                                        user_id: userId,
                                        first_name, last_name, rank, service_number,
                                        date_of_birth, phone_number, emergency_contact_name,
                                        emergency_contact_phone, address
                                    };

                                    logAudit({
                                        user_id: req.user.userId,
                                        action: 'reservist.created',
                                        entity_type: 'reservist',
                                        entity_id: reservistResults.insertId,
                                        new_values: newReservistData
                                    });

                                    // Create assignment if group_id is provided
                                    if (group_id) {
                                        const assignmentQuery = `
                                            INSERT INTO reservist_assignments 
                                            (reservist_id, group_id, city_id, is_primary, assigned_date) 
                                            VALUES (?, ?, ?, TRUE, CURRENT_DATE)
                                        `;
                                        db.query(assignmentQuery, [reservistResults.insertId, group_id, city_id || null], (assignErr) => {
                                            if (assignErr) {
                                                console.error('Failed to create assignment:', assignErr);
                                            }
                                        });
                                    }

                                    res.status(201).json({
                                        status: 'success',
                                        message: 'Reservist created successfully',
                                        data: {
                                            reservistId: reservistResults.insertId,
                                            userId: userId,
                                            email,
                                            service_number
                                        }
                                    });
                                }
                            );
                        }
                    );
                } catch (hashError) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Password hashing failed',
                        code: 'AUTH_ERROR'
                    });
                }
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
 * PUT /api/reservists/:id
 * Update reservist and optionally user info
 */
router.put('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid reservist ID is required'),
    body('first_name').optional().notEmpty().trim(),
    body('last_name').optional().notEmpty().trim(),
    body('rank').optional().notEmpty().trim(),
    body('service_number').optional().notEmpty().trim(),
    body('date_of_birth').optional().isDate(),
    body('phone_number').optional().trim(),
    body('emergency_contact_name').optional().trim(),
    body('emergency_contact_phone').optional().trim(),
    body('address').optional().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('group_id').optional().isInt({ min: 1 }),
    body('city_id').optional().isInt({ min: 1 })
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

        const reservistId = req.params.id;
        
        if (!req.user || !req.user.userId) {
            console.error('User not authenticated properly:', req.user);
            return res.status(401).json({
                status: 'error',
                message: 'User authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const {
            first_name, last_name, rank, service_number, date_of_birth,
            phone_number, emergency_contact_name, emergency_contact_phone,
            address, email, group_id, city_id
        } = req.body;

        // First, get the reservist to check existence and get user_id
        db.query('SELECT * FROM reservists WHERE id = ?', [reservistId], (checkErr, checkResults) => {
            
            if (checkErr) {
                console.error('Database error on SELECT:', checkErr);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR',
                    debug: checkErr.message
                });
            }

            if (!checkResults || checkResults.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Reservist not found',
                    code: 'RESERVIST_NOT_FOUND'
                });
            }

            const oldReservistData = checkResults[0];
            const userId = oldReservistData.user_id;

        // Helper function to proceed with update
        const proceedWithUpdate = () => {
            const reservistUpdates = [];
            const reservistParams = [];

            if (first_name) { reservistUpdates.push('first_name = ?'); reservistParams.push(first_name); }
            if (last_name) { reservistUpdates.push('last_name = ?'); reservistParams.push(last_name); }
            if (rank) { reservistUpdates.push('`rank` = ?'); reservistParams.push(rank); }
            if (service_number) { reservistUpdates.push('service_number = ?'); reservistParams.push(service_number); }
            if (date_of_birth !== undefined) { reservistUpdates.push('date_of_birth = ?'); reservistParams.push(date_of_birth || null); }
            if (phone_number !== undefined) { reservistUpdates.push('phone_number = ?'); reservistParams.push(phone_number || null); }
            if (emergency_contact_name !== undefined) { reservistUpdates.push('emergency_contact_name = ?'); reservistParams.push(emergency_contact_name || null); }
            if (emergency_contact_phone !== undefined) { reservistUpdates.push('emergency_contact_phone = ?'); reservistParams.push(emergency_contact_phone || null); }
            if (address !== undefined) { reservistUpdates.push('address = ?'); reservistParams.push(address || null); }

            if (reservistUpdates.length > 0) {
                reservistUpdates.push('updated_at = CURRENT_TIMESTAMP');
                reservistParams.push(reservistId);

                const reservistQuery = `UPDATE reservists SET ${reservistUpdates.join(', ')} WHERE id = ?`;
                
                db.query(reservistQuery, reservistParams, (updateErr, updateResults) => {
                    
                    if (updateErr) {
                        console.error('UPDATE ERROR:', updateErr);
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to update reservist',
                            code: 'DB_ERROR',
                            debug: updateErr.message,
                            query: reservistQuery,
                            params: reservistParams
                        });
                    }

                    logAudit({
                        user_id: req.user.userId,
                        action: 'reservist.updated',
                        entity_type: 'reservist',
                        entity_id: reservistId,
                        old_values: oldReservistData,
                        new_values: req.body
                    });

                    // Update assignment if needed
                    updateAssignment();
                });
            } else {
                // No reservist fields to update, proceed to assignment update
                updateAssignment();
            }
        };

// Helper function to update assignment
        const updateAssignment = () => {
            
            // If assigning a group, validate it exists
            if (group_id !== undefined) {
                db.query('SELECT id FROM `groups` WHERE id = ?', [group_id], (groupErr, groupResults) => {
                    if (groupErr) {
                        console.error('Error validating group:', groupErr);
                        return res.status(500).json({
                            status: 'error',
                            message: 'Database error',
                            code: 'DB_ERROR',
                            debug: groupErr.message
                        });
                    }

                    if (!groupResults || groupResults.length === 0) {
                        return res.status(400).json({
                            status: 'error',
                            message: 'Invalid group_id',
                            code: 'INVALID_GROUP'
                        });
                    }

                    // If city_id is also being set, validate it
                    if (city_id !== undefined) {
                        db.query('SELECT id FROM cities WHERE id = ? AND group_id = ?', [city_id, group_id], (cityErr, cityResults) => {
                            if (cityErr) {
                                console.error('Error validating city:', cityErr);
                                return res.status(500).json({
                                    status: 'error',
                                    message: 'Database error',
                                    code: 'DB_ERROR',
                                    debug: cityErr.message
                                });
                            }

                            if (!cityResults || cityResults.length === 0) {
                                return res.status(400).json({
                                    status: 'error',
                                    message: 'Invalid city_id or city does not belong to selected group',
                                    code: 'INVALID_CITY'
                                });
                            }

                            proceedWithAssignmentUpdate();
                        });
                    } else {
                        proceedWithAssignmentUpdate();
                    }
                });
            } else if (city_id !== undefined) {
                db.query('UPDATE reservist_assignments SET city_id = ? WHERE reservist_id = ? AND is_primary = TRUE', 
                    [city_id || null, reservistId], 
                    (updateCityErr) => {
                        if (updateCityErr) {
                            console.error('Failed to update assignment city:', updateCityErr);
                            return res.status(500).json({
                                status: 'error',
                                message: 'Failed to update assignment city',
                                code: 'DB_ERROR',
                                debug: updateCityErr.message
                            });
                        }
                        updateEmail();
                    }
                );
            } else {
                updateEmail();
            }
        };

        // Helper function to proceed with assignment update
        const proceedWithAssignmentUpdate = () => {
            db.query('SELECT id FROM reservist_assignments WHERE reservist_id = ? AND is_primary = TRUE', [reservistId], (assignErr, assignResults) => {
                if (assignErr) {
                    console.error('Error selecting assignment:', assignErr);
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to query assignment',
                        code: 'DB_ERROR',
                        debug: assignErr.message
                    });
                }
                
                if (assignResults && assignResults.length > 0) {
                    const updateQuery = city_id !== undefined 
                        ? 'UPDATE reservist_assignments SET group_id = ?, city_id = ?, assigned_date = CURRENT_DATE WHERE reservist_id = ? AND is_primary = TRUE'
                        : 'UPDATE reservist_assignments SET group_id = ?, assigned_date = CURRENT_DATE WHERE reservist_id = ? AND is_primary = TRUE';
                    const params = city_id !== undefined ? [group_id, city_id, reservistId] : [group_id, reservistId];
                    db.query(updateQuery, params, (updateAssignErr) => {
                        if (updateAssignErr) {
                            console.error('Failed to update assignment:', updateAssignErr);
                            return res.status(500).json({
                                status: 'error',
                                message: 'Failed to update assignment',
                                code: 'DB_ERROR',
                                debug: updateAssignErr.message
                            });
                        }
                        updateEmail();
                    });
                } else if (group_id) {
                    db.query(
                        'INSERT INTO reservist_assignments (reservist_id, group_id, city_id, is_primary, assigned_date) VALUES (?, ?, ?, TRUE, CURRENT_DATE)',
                        [reservistId, group_id, city_id || null],
                        (insertAssignErr) => {
                            if (insertAssignErr) {
                                console.error('Failed to create assignment:', insertAssignErr);
                                return res.status(500).json({
                                    status: 'error',
                                    message: 'Failed to create assignment',
                                    code: 'DB_ERROR',
                                    debug: insertAssignErr.message
                                });
                            }
                            updateEmail();
                        }
                    );
                } else {
                    updateEmail();
                }
            });
        };

        // Helper function to update email
        const updateEmail = () => {
            if (email) {
                // Check if email already exists for another user
                db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (checkEmailErr, checkEmailResults) => {
                    if (checkEmailErr) {
                        console.error('Failed to check email uniqueness:', checkEmailErr);
                        return res.status(500).json({
                            status: 'error',
                            message: 'Database error',
                            code: 'DB_ERROR',
                            debug: checkEmailErr.message
                        });
                    }

                    if (checkEmailResults && checkEmailResults.length > 0) {
                        return res.status(409).json({
                            status: 'error',
                            message: 'Email already in use by another user',
                            code: 'EMAIL_EXISTS'
                        });
                    }

                    db.query('UPDATE users SET email = ? WHERE id = ?', [email, userId], (emailErr) => {
                        if (emailErr) {
                            console.error('Failed to update email:', emailErr);
                            return res.status(500).json({
                                status: 'error',
                                message: 'Failed to update email',
                                code: 'DB_ERROR',
                                debug: emailErr.message
                            });
                        }
                        sendSuccessResponse();
                    });
                });
            } else {
                sendSuccessResponse();
            }
        };

        // Helper function to send success response
        const sendSuccessResponse = () => {
            res.status(200).json({
                status: 'success',
                message: 'Reservist updated successfully'
            });
        };

        // Check if service_number already exists (if being updated)
        if (service_number) {
            db.query('SELECT id FROM reservists WHERE service_number = ? AND id != ?', [service_number, reservistId], (serviceErr, serviceResults) => {
                if (serviceErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR',
                        debug: serviceErr.message
                    });
                }
                
                if (serviceResults && serviceResults.length > 0) {
                    return res.status(409).json({
                        status: 'error',
                        message: 'Service number already exists',
                        code: 'SERVICE_NUMBER_EXISTS'
                    });
                }
                
                proceedWithUpdate();
            });
        } else {
            proceedWithUpdate();
        }
        });
    } catch (error) {
        console.error('Unhandled error in PUT /api/reservists/:id:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR',
            debug: error.message
        });
    }
});



/**
 * DELETE /api/reservists/:id
 * Soft delete reservist (deactivate)
 */
router.delete('/:id', authenticateToken, authorize('admin'), [
    param('id').isInt({ min: 1 }).withMessage('Valid reservist ID is required')
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

        const reservistId = req.params.id;

        db.query('SELECT * FROM reservists WHERE id = ?', [reservistId], (checkErr, checkResults) => {
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
                    message: 'Reservist not found',
                    code: 'RESERVIST_NOT_FOUND'
                });
            }

            const oldReservistData = checkResults[0];
            const userId = oldReservistData.user_id;

            db.query('UPDATE reservists SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [reservistId], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Failed to deactivate reservist',
                        code: 'DB_ERROR'
                    });
                }

                logAudit({
                    user_id: req.user.userId,
                    action: 'reservist.deleted',
                    entity_type: 'reservist',
                    entity_id: reservistId,
                    old_values: oldReservistData
                });

                db.query('UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId], (userErr) => {
                    if (userErr) {
                        console.error('Failed to deactivate user:', userErr);
                    }
                });

                res.status(200).json({
                    status: 'success',
                    message: 'Reservist deactivated successfully'
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
 * GET /api/reservists/:id/assignments
 * Get all assignments for a specific reservist
 */
router.get('/:id/assignments', authenticateToken, [
    param('id').isInt({ min: 1 }).withMessage('Valid reservist ID is required')
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

        const reservistId = req.params.id;

        if (req.user.role === 'reservist') {
            db.query('SELECT id FROM reservists WHERE user_id = ?', [req.user.userId], (checkErr, checkResults) => {
                if (checkErr || !checkResults || checkResults.length === 0 || checkResults[0].id != reservistId) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'Access denied. You can only view your own assignments.',
                        code: 'ACCESS_DENIED'
                    });
                }
            });
        }

        const query = `
            SELECT ra.*, 
                   g.name as group_name, g.code as group_code,
                   c.name as city_name, c.province,
                   a.name as arsen_name
            FROM reservist_assignments ra
            LEFT JOIN groups g ON ra.group_id = g.id
            LEFT JOIN cities c ON ra.city_id = c.id
            LEFT JOIN arsens a ON g.arsen_id = a.id
            WHERE ra.reservist_id = ?
            ORDER BY ra.assigned_date DESC
        `;

        db.query(query, [reservistId], (err, results) => {
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
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            code: 'SERVER_ERROR'
        });
    }
});

module.exports = router;
