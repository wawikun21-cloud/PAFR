const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

/**
 * GET /api/attendance
 * List attendance records with pagination and filtering
 */
router.get('/', authenticateToken, [
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
        const trainingId = req.query.training_id;
        const status = req.query.status;

        let query = `
            SELECT a.id, a.reservist_id, a.training_id, 
                   a.status, a.notes, a.check_in_time, a.check_out_time,
                   a.recorded_by, a.created_at,
                   r.first_name, r.last_name, r.service_number,
                   t.title as training_title
            FROM attendance a
            LEFT JOIN reservists r ON a.reservist_id = r.id
            LEFT JOIN trainings t ON a.training_id = t.id
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM attendance a WHERE 1=1';
        const queryParams = [];
        const countParams = [];

        if (trainingId) {
            query += ' AND a.training_id = ?';
            countQuery += ' AND a.training_id = ?';
            queryParams.push(trainingId);
            countParams.push(trainingId);
        }

        if (status) {
            query += ' AND a.status = ?';
            countQuery += ' AND a.status = ?';
            queryParams.push(status);
            countParams.push(status);
        }

        query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        db.query(countQuery, countParams, (countErr, countResults) => {
            if (countErr) {
                console.error('Attendance count query error:', countErr);
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
                    console.error('Attendance query error:', err);
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
                        attendance: results,
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

module.exports = router;
