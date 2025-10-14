const { Pool } = require('pg');

// Use PostgreSQL if DATABASE_URL is set (production), otherwise SQLite (local dev)
const usePostgres = !!process.env.DATABASE_URL;

let pool;
if (usePostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('Using PostgreSQL');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const sqliteDb = new sqlite3.Database('./party.db');
  console.log('Using SQLite (dev mode)');
  
  // Wrap SQLite to match pg interface
  pool = {
    query: (text, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      // Convert $1, $2 to ?
      const sqliteText = text.replace(/\$\d+/g, '?');
      sqliteDb.all(sqliteText, params, callback);
    }
  };
}

async function initDatabase() {
  if (!usePostgres) {
    // SQLite init (keep old code for local dev)
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./party.db');
    
    db.run(`CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      attending BOOLEAN NOT NULL,
      avatar_color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guest_id) REFERENCES guests (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER NOT NULL,
      photo_url TEXT NOT NULL,
      drive_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guest_id) REFERENCES guests (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guest_id) REFERENCES guests (id),
      FOREIGN KEY (option_id) REFERENCES poll_options (id),
      UNIQUE(guest_id, option_id)
    )`);

    return;
  }

  // PostgreSQL init
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guests (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      attending BOOLEAN NOT NULL,
      avatar_color TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS photos (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      photo_url TEXT NOT NULL,
      drive_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS poll_options (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS poll_votes (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      option_id INTEGER NOT NULL REFERENCES poll_options(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guest_id, option_id)
    )
  `);

  console.log('PostgreSQL database initialized');
}

module.exports = { pool, initDatabase, usePostgres };

