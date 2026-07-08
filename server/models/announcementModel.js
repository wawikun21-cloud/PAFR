const crypto = require('crypto');
const db = require('../config/database');

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS announcements (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

async function ensureTable() {
  try {
    await db.query(CREATE_TABLE_SQL);
  } catch (err) {
    console.error('Failed to ensure announcements table:', err.message);
  }
}

ensureTable();

const announcementModel = {
  async findAll() {
    const [rows] = await db.query('SELECT * FROM announcements ORDER BY created_at DESC');
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM announcements WHERE id = ?', [id]);
    return rows[0];
  },

  async create(announcement) {
    const { title, type, priority, status, author, body } = announcement;
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO announcements (id, title, type, priority, status, author, body) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title, type || 'General', priority || 'medium', status || 'active', author || 'CO Admin', body]
    );
    return this.findById(id);
  },

  async update(id, announcement) {
    const { title, type, priority, status, author, body } = announcement;
    await db.query(
      'UPDATE announcements SET title = ?, type = ?, priority = ?, status = ?, author = ?, body = ? WHERE id = ?',
      [title, type, priority, status, author, body, id]
    );
    return this.findById(id);
  },

  async delete(id) {
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    return { id };
  },
};

module.exports = announcementModel;