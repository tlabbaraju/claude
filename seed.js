require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('./db');

const USERNAME = 'admin';
const PASSWORD = process.env.SESSION_SECRET;

(async () => {
  try {
    const existing = await query(
      'SELECT user_id FROM dbo.users WHERE username = ?',
      [USERNAME]
    );
    if (existing.length) {
      console.log(`User "${USERNAME}" already exists — nothing to do.`);
      process.exit(0);
    }

    const maxRows = await query('SELECT ISNULL(MAX(user_id), 0) AS max_id FROM dbo.users');
    const nextId = (maxRows[0]?.max_id ?? 0) + 1;
    const hash = await bcrypt.hash(PASSWORD, 12);
    await query(
      'INSERT INTO dbo.users (user_id, username, password_hash, created_at) VALUES (?, ?, ?, GETDATE())',
      [nextId, USERNAME, hash]
    );
    console.log(`Created user "${USERNAME}" with password from SESSION_SECRET.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
})();
