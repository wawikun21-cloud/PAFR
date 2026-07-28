const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authorize, requireAdmin } = require('../middleware/rbac');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

const handleValidation = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: errors.array()
        });
        return false;
    }
    return true;
};

const dbError = (res, message = 'Database error') => {
    res.status(500).json({ status: 'error', message, code: 'DB_ERROR' });
};

/**
 * GET /api/supplies
 * List all supplies with pagination and filtering
 */
router.get('/', authenticateToken, [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('category').optional().trim(),
    query('low_stock').optional().isBoolean()
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const offset = (page - 1) * limit;
        const category = req.query.category;
        const lowStock = req.query.low_stock === 'true';
        const search = req.query.q;

        let sql = `SELECT s.*, 
    (SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'reservist_id', r.id,
            'first_name', r.first_name,
            'last_name', r.last_name,
            'service_number', r.service_number,
            'rank', r.rank,
            'quantity_issued', si.quantity_issued,
            'issued_date', si.issued_date,
            'due_return_date', si.due_return_date,
            'returned_date', si.returned_date,
            'issuance_type', si.issuance_type
        )
    ) FROM supply_issuances si 
    JOIN reservists r ON si.reservist_id = r.id 
    WHERE si.supply_id = s.id AND si.returned_date IS NULL) as assigned_reservists
FROM supplies s WHERE 1=1`;
        let countSql = 'SELECT COUNT(*) as total FROM supplies WHERE 1=1';
        const params = [];
        const countParams = [];

        if (category) {
            sql += ' AND category = ?';
            countSql += ' AND category = ?';
            params.push(category);
            countParams.push(category);
        }

        if (lowStock) {
            sql += ' AND quantity_available <= reorder_level';
            countSql += ' AND quantity_available <= reorder_level';
        }

        if (search) {
            sql += ' AND (name LIKE ? OR description LIKE ?)';
            countSql += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
            countParams.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [countResults] = await db.query(countSql, countParams);
        const total = countResults[0].total;
        const totalPages = Math.ceil(total / limit);

        const [results] = await db.query(sql, params);

        res.status(200).json({
            status: 'success',
            data: {
                supplies: results,
                pagination: { currentPage: page, totalPages, totalItems: total, itemsPerPage: limit }
            }
        });
    } catch (error) {
        dbError(res);
    }
});

/**
 * GET /api/supplies/low-stock
 */
router.get('/low-stock', authenticateToken, async (req, res) => {
    try {
        const [results] = await db.query(
            'SELECT * FROM supplies WHERE quantity_available <= reorder_level ORDER BY quantity_available ASC'
        );
        res.status(200).json({ status: 'success', data: { supplies: results, count: results.length } });
    } catch (error) {
        dbError(res);
    }
});

/**
 * GET /api/supplies/categories
 */
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const [results] = await db.query('SELECT DISTINCT category FROM supplies ORDER BY category ASC');
        const categories = results.map(r => r.category);
        res.status(200).json({ status: 'success', data: { categories } });
    } catch (error) {
        dbError(res);
    }
});

/**
 * GET /api/supplies/:id
 */
router.get('/:id', authenticateToken, [
    param('id').isInt({ min: 1 }).withMessage('Valid supply ID is required')
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const [results] = await db.query('SELECT * FROM supplies WHERE id = ?', [req.params.id]);

        if (!results || results.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Supply not found', code: 'SUPPLY_NOT_FOUND' });
        }

        res.status(200).json({ status: 'success', data: results[0] });
    } catch (error) {
        dbError(res);
    }
});

/**
 * POST /api/supplies
 */
router.post('/', authenticateToken, requireAdmin, [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('category').notEmpty().trim().withMessage('Category is required'),
    body('unit').notEmpty().trim().withMessage('Unit is required'),
    body('quantity_available').optional().isInt({ min: 0 }),
    body('reorder_level').optional().isInt({ min: 0 }),
    body('max_stock').optional().isInt({ min: 0 }),
    body('location').optional().trim(),
    body('supplier').optional().trim(),
    body('description').optional().trim()
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const { name, category, unit, quantity_available = 0, reorder_level = 10, max_stock, location, supplier, description } = req.body;

        const [existing] = await db.query('SELECT id FROM supplies WHERE name = ? AND category = ?', [name, category]);
        if (existing && existing.length > 0) {
            return res.status(409).json({ status: 'error', message: 'Supply with this name and category already exists', code: 'SUPPLY_EXISTS' });
        }

        const [result] = await db.query(
            `INSERT INTO supplies (name, category, description, unit, quantity_available, reorder_level, max_stock, location, supplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, category, description || null, unit, quantity_available, reorder_level, max_stock || null, location || null, supplier || null]
        );

        logAudit({ user_id: req.user.id, action: 'supply.created', entity_type: 'supply', entity_id: result.insertId, new_values: req.body });

        res.status(201).json({ status: 'success', message: 'Supply created successfully', data: { supplyId: result.insertId } });
    } catch (error) {
        dbError(res, 'Failed to create supply');
    }
});

/**
 * PUT /api/supplies/:id
 */
router.put('/:id', authenticateToken, requireAdmin, [
    param('id').isInt({ min: 1 }).withMessage('Valid supply ID is required'),
    body('name').optional().notEmpty().trim(),
    body('category').optional().notEmpty().trim(),
    body('unit').optional().notEmpty().trim(),
    body('quantity_available').optional().isInt({ min: 0 }),
    body('reorder_level').optional().isInt({ min: 0 }),
    body('max_stock').optional().isInt({ min: 0 }),
    body('location').optional().trim(),
    body('supplier').optional().trim(),
    body('description').optional().trim()
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const supplyId = req.params.id;
        const [existing] = await db.query('SELECT * FROM supplies WHERE id = ?', [supplyId]);

        if (!existing || existing.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Supply not found', code: 'SUPPLY_NOT_FOUND' });
        }

        const oldValues = existing[0];
        const { name, category, unit, quantity_available, reorder_level, max_stock, location, supplier, description } = req.body;

        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (category !== undefined) { updates.push('category = ?'); params.push(category); }
        if (unit !== undefined) { updates.push('unit = ?'); params.push(unit); }
        if (quantity_available !== undefined) { updates.push('quantity_available = ?'); params.push(quantity_available); }
        if (reorder_level !== undefined) { updates.push('reorder_level = ?'); params.push(reorder_level); }
        if (max_stock !== undefined) { updates.push('max_stock = ?'); params.push(max_stock); }
        if (location !== undefined) { updates.push('location = ?'); params.push(location || null); }
        if (supplier !== undefined) { updates.push('supplier = ?'); params.push(supplier || null); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }

        if (updates.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No fields to update', code: 'NO_UPDATE' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(supplyId);

        await db.query(`UPDATE supplies SET ${updates.join(', ')} WHERE id = ?`, params);

        logAudit({ user_id: req.user.id, action: 'supply.updated', entity_type: 'supply', entity_id: supplyId, old_values: oldValues, new_values: req.body });

        res.status(200).json({ status: 'success', message: 'Supply updated successfully' });
    } catch (error) {
        dbError(res, 'Failed to update supply');
    }
});

/**
 * POST /api/supplies/adjust-stock
 */
router.post('/adjust-stock', authenticateToken, requireAdmin, [
    body('supply_id').isInt({ min: 1 }).withMessage('Valid supply ID is required'),
    body('quantity_change').isInt().withMessage('Quantity change is required (positive or negative)'),
    body('reason').notEmpty().trim().withMessage('Reason for adjustment is required')
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const { supply_id, quantity_change, reason } = req.body;

        const [existing] = await db.query('SELECT * FROM supplies WHERE id = ?', [supply_id]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Supply not found', code: 'SUPPLY_NOT_FOUND' });
        }

        const supply = existing[0];
        const newQuantity = supply.quantity_available + quantity_change;

        if (newQuantity < 0) {
            return res.status(400).json({ status: 'error', message: 'Adjustment would result in negative stock', code: 'INVALID_STOCK_ADJUSTMENT' });
        }

        if (supply.max_stock && newQuantity > supply.max_stock) {
            return res.status(400).json({ status: 'error', message: `Adjustment would exceed max stock (${supply.max_stock})`, code: 'MAX_STOCK_EXCEEDED' });
        }

        await db.query('UPDATE supplies SET quantity_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQuantity, supply_id]);

        logAudit({ user_id: req.user.id, action: 'supply.stock_adjusted', entity_type: 'supply', entity_id: supply_id, old_values: { quantity_available: supply.quantity_available, reason }, new_values: { quantity_available: newQuantity, quantity_change, reason } });

        res.status(200).json({ status: 'success', message: 'Stock adjusted successfully', data: { supply_id, previous_quantity: supply.quantity_available, new_quantity: newQuantity, change: quantity_change } });
    } catch (error) {
        dbError(res, 'Failed to adjust stock');
    }
});

/**
 * DELETE /api/supplies/:id
 */
router.delete('/:id', authenticateToken, requireAdmin, [
    param('id').isInt({ min: 1 }).withMessage('Valid supply ID is required')
], async (req, res) => {
    try {
        if (!handleValidation(req, res)) return;

        const supplyId = req.params.id;

        const [existing] = await db.query('SELECT * FROM supplies WHERE id = ?', [supplyId]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Supply not found', code: 'SUPPLY_NOT_FOUND' });
        }

        const oldValues = existing[0];

        const [issuanceResults] = await db.query('SELECT COUNT(*) as count FROM supply_issuances WHERE supply_id = ? AND returned_date IS NULL', [supplyId]);
        if (issuanceResults[0].count > 0) {
            return res.status(400).json({ status: 'error', message: 'Cannot delete supply with active issuances', code: 'SUPPLY_IN_USE' });
        }

        await db.query('DELETE FROM supplies WHERE id = ?', [supplyId]);

        logAudit({ user_id: req.user.id, action: 'supply.deleted', entity_type: 'supply', entity_id: supplyId, old_values: oldValues });

        res.status(200).json({ status: 'success', message: 'Supply deleted successfully' });
    } catch (error) {
        dbError(res, 'Failed to delete supply');
    }
});

module.exports = router;
