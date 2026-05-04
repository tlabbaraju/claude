const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const requireAuth = require('../middleware/requireAuth');
const { query, queryOne } = require('../db');

// GET / — list all users
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT user_id, username, created_at FROM dbo.users ORDER BY user_id ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:id — get single user
router.get('/:id', requireAuth, async (req, res) => {
  const raw = req.params.id;
  if (!raw) return res.status(400).json({ error: 'Invalid id' });
  try {
    const row = await queryOne(
      'SELECT user_id, username, created_at FROM dbo.users WHERE user_id = ?',
      [raw]
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / — create user
router.post('/', requireAuth, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  try {
    const maxRows = await query('SELECT ISNULL(MAX(user_id), 0) AS max_id FROM dbo.users');
    const nextId = String((maxRows[0]?.max_id ?? 0) + 1);
    const password_hash = await bcrypt.hash(password, 12);
    await query(
      'INSERT INTO dbo.users (user_id, username, password_hash, created_at) VALUES (?, ?, ?, GETDATE())',
      [nextId, username, password_hash]
    );
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id — update user
router.put('/:id', requireAuth, async (req, res) => {
  const raw = req.params.id;
  if (!raw) return res.status(400).json({ error: 'Invalid id' });
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }
  try {
    if (password) {
      const password_hash = await bcrypt.hash(password, 12);
      await query(
        'UPDATE dbo.users SET username = ?, password_hash = ? WHERE user_id = ?',
        [username, password_hash, raw]
      );
    } else {
      await query(
        'UPDATE dbo.users SET username = ? WHERE user_id = ?',
        [username, raw]
      );
    }
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — delete user
router.delete('/:id', requireAuth, async (req, res) => {
  const raw = req.params.id;
  if (!raw) return res.status(400).json({ error: 'Invalid id' });
  try {
    await query(
      'DELETE FROM dbo.users WHERE user_id = ?',
      [raw]
    );
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
