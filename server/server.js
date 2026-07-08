const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./config/database');
const loginLimiter = require('./middleware/rateLimiter');

// Only load .env in local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

console.log('SERVER STARTING - Loading updated code...');

const app = express();

// CORS configuration
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
];

const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [];

const allowedOrigins = [...defaultOrigins, ...envOrigins];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.hostingersite.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
const authRoutes = require('./routes/auth');
const reservistsRoutes = require('./routes/reservists');
const arsentsRoutes = require('./routes/arsents');
const groupsRoutes = require('./routes/groups');
const squadronRoutes = require('./routes/squadron');
const squadronsRoutes = require('./routes/squadrons');
const areasRoutes = require('./routes/areas');
const suppliesRoutes = require('./routes/supplies');
const issuancesRoutes = require('./routes/issuances');
const trainingsRoutes = require('./routes/trainings');
const attendanceRoutes = require('./routes/attendance');
const readinessRoutes = require('./routes/readiness');
const reportsRoutes = require('./routes/reports');
const alertsRoutes = require('./routes/alerts');
const auditLogsRoutes = require('./routes/audit-logs');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');
const assignmentsRoutes = require('./routes/assignments');
const hierarchyRoutes = require('./routes/hierarchy');
const announcementsRoutes = require('./routes/announcements');
const mapRoutes = require('./routes/map');

// Serve client static files
const clientDist = path.join(__dirname, '..', 'client', 'dist');
console.log('Client dist path:', clientDist);
console.log('Client dist exists:', fs.existsSync(clientDist));
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  console.log('Static file serving enabled from:', clientDist);
} else {
  console.error('WARNING: client/dist not found! Build may have failed.');
}

// API Routes
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/reservists', reservistsRoutes);
app.use('/api/arsens', arsentsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/squadron', squadronRoutes);
app.use('/api/squadrons', squadronsRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/supplies', suppliesRoutes);
app.use('/api/issuances', issuancesRoutes);
app.use('/api/trainings', trainingsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/readiness', readinessRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/map', mapRoutes);

// Health check with DB test
app.get('/api/health', async (req, res) => {
  const result = { status: 'OK', timestamp: new Date().toISOString(), env: process.env.NODE_ENV };
  try {
    const [rows] = await db.query('SELECT 1 as test');
    result.db = 'connected';
  } catch (err) {
    result.db = 'failed';
    result.dbError = err.message;
  }
  res.json(result);
});

// Diagnostic info
app.get('/api/debug', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    dbHost: process.env.DB_HOST,
    dbName: process.env.DB_NAME,
    clientDist,
    clientDistExists: fs.existsSync(clientDist),
    distContents: fs.existsSync(clientDist) ? fs.readdirSync(clientDist) : []
  });
});

// SPA fallback — serve index.html for non-API routes
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  } else {
    next();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PAFR Server running on port ${PORT}`);
});

module.exports = app;