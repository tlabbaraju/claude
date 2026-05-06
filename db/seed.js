require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const { initDb, getDb } = require('./index');
const { ensureSchema } = require('./schema');
const seedData = require('./seed-data.json');

async function seed() {
  await initDb();
  ensureSchema();
  const db = getDb();

  const adminHash = await bcrypt.hash('admin123', 12);
  db.prepare(`INSERT OR IGNORE INTO users (username, password_hash, entity, role) VALUES (?, ?, NULL, 'admin')`)
    .run('admin', adminHash);
  console.log('Admin user ready: admin / admin123');

  const upsert = db.prepare(`
    INSERT INTO financial_data (entity, year, tab_type, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec, updated_by)
    VALUES (@entity, @year, @tab_type, @jan, @feb, @mar, @apr, @may, @jun, @jul, @aug, @sep, @oct, @nov, @dec, 'seed')
    ON CONFLICT(entity, year, tab_type) DO UPDATE SET
      jan=excluded.jan, feb=excluded.feb, mar=excluded.mar, apr=excluded.apr,
      may=excluded.may, jun=excluded.jun, jul=excluded.jul, aug=excluded.aug,
      sep=excluded.sep, oct=excluded.oct, nov=excluded.nov, dec=excluded.dec,
      updated_by='seed', updated_at=datetime('now')
  `);

  db.transaction(() => {
    for (const row of seedData) {
      upsert.run({
        entity: row.entity, year: 2026, tab_type: row.tab,
        jan: row.jan, feb: row.feb, mar: row.mar, apr: row.apr,
        may: row.may, jun: row.jun, jul: row.jul, aug: row.aug,
        sep: row.sep, oct: row.oct, nov: row.nov, dec: row.dec,
      });
    }
  })();

  const count = db.prepare('SELECT COUNT(*) AS n FROM financial_data').get();
  console.log(`Seeded ${count.n} financial_data rows`);
  console.log('Done.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
