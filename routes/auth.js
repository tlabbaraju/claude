const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcrypt');
const { getDb } = require('../db/index');

router.get('/me', (req, res) => {
  if (req.session && req.session.user) return res.json(req.session.user);
  res.status(401).json({ error: 'Not authenticated' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const entityRows = db.prepare('SELECT entity FROM user_entities WHERE user_id = ? ORDER BY entity').all(user.id);
  const entities = entityRows.map(r => r.entity);

  req.session.user = { id: user.id, username: user.username, role: user.role, entities };
  res.json(req.session.user);
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

module.exports = router;
