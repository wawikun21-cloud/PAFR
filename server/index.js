const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes and modules
const db = require('./config/database');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const reservistsRoutes = require('./routes/reservists');
const arsensRoutes = require('./routes/arsens');
const groupsRoutes = require('./routes/groups');
const citiesRoutes = require('./routes/cities');
const assignmentsRoutes = require('./routes/assignments');
const suppliesRoutes = require('./routes/supplies');
const issuancesRoutes = require('./routes/issuances');
const trainingsRoutes = require('./routes/trainings');
const attendanceRoutes = require('./routes/attendance');

// Test database connection
db.getConnection((err, connection) => {
    if (err) {
        console.error(' Database connection failed:', err.message);
    } else {
        console.log(' Database connected successfully');
        connection.release();
    }
});

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to PAFR API',
        version: '1.0.0',
        status: 'running'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Authentication Routes
app.use('/auth', authRoutes);

// API Routes
app.use('/auth', authRoutes);

// API Routes
app.use('/api/users', usersRoutes);
app.use('/api/reservists', reservistsRoutes);
app.use('/api/arsens', arsensRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/cities', citiesRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/supplies', suppliesRoutes);
app.use('/api/issuances', issuancesRoutes);
app.use('/api/trainings', trainingsRoutes);
app.use('/api/attendance', attendanceRoutes);

/**
 * GET /api/hierarchy
 * Get full hierarchy tree (ARSEN → Groups → Cities)
 */
app.get('/api/hierarchy', (req, res) => {
    try {
        const includeInactive = req.query.include_inactive === 'true';

        let arsenQuery = 'SELECT id, code, name, location, commander_name FROM arsens WHERE is_active = TRUE';
        if (includeInactive) {
            arsenQuery = 'SELECT id, code, name, location, commander_name, is_active FROM arsens WHERE 1=1';
        }
        arsenQuery += ' ORDER BY name ASC';

        db.query(arsenQuery, (arsenErr, arsens) => {
            if (arsenErr) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Database error',
                    code: 'DB_ERROR'
                });
            }

            if (!arsens || arsens.length === 0) {
                return res.status(200).json({
                    status: 'success',
                    data: { hierarchy: [] }
                });
            }

            const arsenIds = arsens.map(a => a.id);
            const placeholders = arsenIds.map(() => '?').join(',');

            let groupQuery = `SELECT id, arsen_id, code, name, commander_name FROM groups WHERE arsen_id IN (${placeholders}) AND is_active = TRUE`;
            if (includeInactive) {
                groupQuery = `SELECT id, arsen_id, code, name, commander_name, is_active FROM groups WHERE arsen_id IN (${placeholders})`;
            }
            groupQuery += ' ORDER BY name ASC';

            db.query(groupQuery, arsenIds, (groupErr, groups) => {
                if (groupErr) {
                    return res.status(500).json({
                        status: 'error',
                        message: 'Database error',
                        code: 'DB_ERROR'
                    });
                }

                if (!groups || groups.length === 0) {
                    const hierarchy = arsens.map(a => ({
                        ...a,
                        groups: []
                    }));
                    return res.status(200).json({
                        status: 'success',
                        data: { hierarchy }
                    });
                }

                const groupIds = groups.map(g => g.id);
                const groupPlaceholders = groupIds.map(() => '?').join(',');

                let cityQuery = `SELECT id, group_id, name, province FROM cities WHERE group_id IN (${groupPlaceholders}) AND is_active = TRUE`;
                if (includeInactive) {
                    cityQuery = `SELECT id, group_id, name, province, is_active FROM cities WHERE group_id IN (${groupPlaceholders})`;
                }
                cityQuery += ' ORDER BY name ASC';

                db.query(cityQuery, groupIds, (cityErr, cities) => {
                    if (cityErr) {
                        return res.status(500).json({
                            status: 'error',
                            message: 'Database error',
                            code: 'DB_ERROR'
                        });
                    }

                    const citiesByGroup = {};
                    if (cities) {
                        cities.forEach(city => {
                            if (!citiesByGroup[city.group_id]) {
                                citiesByGroup[city.group_id] = [];
                            }
                            citiesByGroup[city.group_id].push(city);
                        });
                    }

                    const groupsByArsen = {};
                    groups.forEach(group => {
                        if (!groupsByArsen[group.arsen_id]) {
                            groupsByArsen[group.arsen_id] = [];
                        }
                        group.cities = citiesByGroup[group.id] || [];
                        groupsByArsen[group.arsen_id].push(group);
                    });

                    const hierarchy = arsens.map(arsen => ({
                        ...arsen,
                        groups: groupsByArsen[arsen.id] || []
                    }));

                    res.status(200).json({
                        status: 'success',
                        data: { hierarchy }
                    });
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

// Test database connection endpoint
app.get('/test-db', (req, res) => {
    db.query('SELECT COUNT(*) as count FROM users', (err, results) => {
        if (err) {
            return res.status(500).json({
                status: 'error',
                message: err.message,
                database: process.env.DB_NAME
            });
        }
        res.json({
            status: 'connected',
            database: process.env.DB_NAME,
            host: process.env.DB_HOST,
            user_count: results[0].count
        });
    });
});

// Get all tables endpoint
app.get('/tables', (req, res) => {
    db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = ?
    `, [process.env.DB_NAME], (err, results) => {
        if (err) {
            return res.status(500).json({
                status: 'error',
                message: err.message
            });
        }
        const tables = results.map(row => row.TABLE_NAME);
        res.json({
            database: process.env.DB_NAME,
            tables: tables
        });
    });
});

// 404 Not Found handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal server error',
        code: 'SERVER_ERROR'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`PAFR Server running on http://localhost:${PORT}`);
});
