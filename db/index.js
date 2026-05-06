const initSqlJs = require('sql.js');
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'financial.db');

let _sqlDb = null;
let _db    = null;
let _inTx  = false;

function save() {
  if (!_sqlDb || _inTx) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_sqlDb.export()));
}

// Resolves better-sqlite3-style call args to sql.js bind params:
//   ()            → null  (no binding)
//   (val)         → [val]
//   (a, b, c)     → [a, b, c]
//   ([a, b])      → [a, b]
//   ({ key: v })  → { '@key': v }  (named @param SQL)
function resolveParams(args) {
  if (!args || args.length === 0) return null;
  if (args.length === 1) {
    const p = args[0];
    if (p === null || p === undefined) return null;
    if (Array.isArray(p)) return p.length === 0 ? null : p;
    if (typeof p === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(p)) {
        out[(k[0] === '@' || k[0] === ':' || k[0] === '$') ? k : `@${k}`] = v;
      }
      return Object.keys(out).length === 0 ? null : out;
    }
    return [p];
  }
  return Array.from(args);
}

function makeWrapper(sqlDb) {
  return {
    exec(sql) {
      sqlDb.exec(sql);
      save();
      return this;
    },

    prepare(sql) {
      return {
        get(...args) {
          const stmt = sqlDb.prepare(sql);
          const p = resolveParams(args);
          if (p) stmt.bind(p);
          let row = null;
          if (stmt.step()) row = { ...stmt.getAsObject() };
          stmt.free();
          return row;
        },
        all(...args) {
          const stmt = sqlDb.prepare(sql);
          const p = resolveParams(args);
          if (p) stmt.bind(p);
          const rows = [];
          while (stmt.step()) rows.push({ ...stmt.getAsObject() });
          stmt.free();
          return rows;
        },
        run(...args) {
          const stmt = sqlDb.prepare(sql);
          const p = resolveParams(args);
          stmt.run(p === null ? [] : p);
          stmt.free();
          save();
          const r = sqlDb.exec('SELECT last_insert_rowid()');
          return { lastInsertRowid: r[0]?.values[0][0] ?? 0 };
        },
      };
    },

    transaction(fn) {
      return function () {
        _inTx = true;
        sqlDb.run('BEGIN');
        try {
          fn();
          sqlDb.run('COMMIT');
        } catch (e) {
          sqlDb.run('ROLLBACK');
          _inTx = false;
          throw e;
        }
        _inTx = false;
        save();
      };
    },
  };
}

async function initDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    _sqlDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _sqlDb = new SQL.Database();
  }
  _sqlDb.run('PRAGMA foreign_keys = ON');
  _db = makeWrapper(_sqlDb);
  return _db;
}

function getDb() {
  if (!_db) throw new Error('Database not initialized — call initDb() first');
  return _db;
}

module.exports = { initDb, getDb };
