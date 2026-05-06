const { getDb } = require('./index');

function ensureSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'entity_user',
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_entities (
      user_id INTEGER NOT NULL,
      entity  TEXT NOT NULL,
      UNIQUE(user_id, entity)
    );

    CREATE TABLE IF NOT EXISTS financial_data (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      entity     TEXT NOT NULL,
      year       INTEGER NOT NULL,
      tab_type   TEXT NOT NULL,
      jan  REAL DEFAULT 0,
      feb  REAL DEFAULT 0,
      mar  REAL DEFAULT 0,
      apr  REAL DEFAULT 0,
      may  REAL DEFAULT 0,
      jun  REAL DEFAULT 0,
      jul  REAL DEFAULT 0,
      aug  REAL DEFAULT 0,
      sep  REAL DEFAULT 0,
      oct  REAL DEFAULT 0,
      nov  REAL DEFAULT 0,
      dec  REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      updated_by TEXT,
      UNIQUE(entity, year, tab_type)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      entity     TEXT NOT NULL,
      year       INTEGER NOT NULL,
      tab_type   TEXT NOT NULL,
      month      TEXT NOT NULL,
      old_value  REAL,
      new_value  REAL,
      changed_by TEXT NOT NULL,
      changed_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { ensureSchema };
