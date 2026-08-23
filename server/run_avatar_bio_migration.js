require('dotenv').config();
const fs = require('fs');
const db = require('./config/database');

async function runMigration() {
  try {
    const sql = fs.readFileSync('./sql/008_reservist_avatar_bio.sql', 'utf8');
    const statements = sql.split(/;/g).filter(s => s.trim() && !s.trim().startsWith('USE'));

    for (const stmt of statements) {
      if (stmt.trim()) {
        console.log('Running:', stmt.substring(0, 70).replace(/\s+/g, ' ') + '...');
        await db.query(stmt);
      }
    }
    console.log('Migration completed successfully');
  } catch (e) {
    console.error('Migration error:', e.message);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}
runMigration();
