if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pafr',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  timezone: '+00:00',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

const pool = mysql.createPool(dbConfig);

const MIGRATIONS = [
  `ALTER TABLE reservists ADD COLUMN IF NOT EXISTS status_bcmt tinyint(1) NOT NULL DEFAULT 0`,
  `ALTER TABLE reservists ADD COLUMN IF NOT EXISTS status_adt tinyint(1) NOT NULL DEFAULT 0`,
  `ALTER TABLE reservists ADD COLUMN IF NOT EXISTS status_vadt tinyint(1) NOT NULL DEFAULT 0`,
  `ALTER TABLE reservists ADD COLUMN IF NOT EXISTS status_rotc tinyint(1) NOT NULL DEFAULT 0`,
  `ALTER TABLE reservists ADD COLUMN IF NOT EXISTS status_others varchar(255) DEFAULT NULL`,
  `ALTER TABLE reservists ADD COLUMN IF NOT EXISTS avatar_offset_y INT NOT NULL DEFAULT 0`,
  `ALTER TABLE reservists ADD COLUMN IF NOT EXISTS avatar_offset_x INT NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    type ENUM('General','Training','Deployment','Administrative','Emergency') NOT NULL DEFAULT 'General',
    priority ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    author VARCHAR(100) NOT NULL DEFAULT 'CO Admin',
    body TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_type (type),
    KEY idx_priority (priority),
    KEY idx_status (status),
    KEY idx_created (created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS blob_files (
    id BIGINT NOT NULL AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    mime_type VARCHAR(100) DEFAULT NULL,
    file_size INT DEFAULT NULL,
    file_data LONGBLOB,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_reservist (reservist_id),
    CONSTRAINT fk_blob_reservist FOREIGN KEY (reservist_id) REFERENCES reservists (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function runMigrations() {
  const promisePool = pool.promise();
  for (const sql of MIGRATIONS) {
    try {
      await promisePool.query(sql);
    } catch (err) {
      const ignoreCodes = [
        'ER_DUP_COLUMN', 'ER_TABLE_EXISTS_ERROR',
        1060, 1050
      ];
      if (
        ignoreCodes.includes(err.code) ||
        ignoreCodes.includes(err.errno)
      ) {
        // already exists or duplicate, skip
      } else {
        console.error('Migration error:', err.message);
      }
    }
  }
}

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    console.error('Server will start but DB-dependent features will fail');
  } else {
    console.log('Database connected successfully');
    connection.release();
  }
  runMigrations();
});

const db = pool.promise();

db.getConnection = () => pool.promise().getConnection();

db.rawPool = pool;

module.exports = db;