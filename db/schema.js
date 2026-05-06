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
  `);
}

module.exports = { ensureSchema };
