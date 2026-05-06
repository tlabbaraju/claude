const express       = require('express');
const router        = express.Router();
const bcrypt        = require('bcrypt');
const requireAdmin  = require('../middleware/requireAdmin');
const { getDb }     = require('../db/index');

function getUsersWithEntities(db) {
  const users = db.prepare(
    'SELECT id, username, role, created_at FROM users ORDER BY role DESC, username ASC'
  ).all();
  const entityRows = db.prepare('SELECT user_id, entity FROM user_entities ORDER BY entity').all();
  const entityMap = {};
  for (const r of entityRows) {
    if (!entityMap[r.user_id]) entityMap[r.user_id] = [];
    entityMap[r.user_id].push(r.entity);
  }
  return users.map(u => ({ ...u, entities: entityMap[u.id] || [] }));
}

function setEntities(db, userId, entities) {
  db.prepare('DELETE FROM user_entities WHERE user_id = ?').run(userId);
  const ins = db.prepare('INSERT OR IGNORE INTO user_entities (user_id, entity) VALUES (?, ?)');
  db.transaction(() => {
    for (const e of (entities || [])) ins.run(userId, e);
  })();
}

router.get('/', requireAdmin, (req, res) => {
  res.json(getUsersWithEntities(getDb()));
});

router.post('/', requireAdmin, async (req, res) => {
  const { username, password, entities, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const db   = getDb();
  const hash = await bcrypt.hash(password, 12);
  try {
    db.prepare(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    ).run(username, hash, role || 'entity_user');
    const created = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    setEntities(db, created.id, entities);
    res.status(201).json({ id: created.id });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { username, password, entities, role } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const db = getDb();
  if (password) {
    const hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET username=?, password_hash=?, role=? WHERE id=?')
      .run(username, hash, role || 'entity_user', req.params.id);
  } else {
    db.prepare('UPDATE users SET username=?, role=? WHERE id=?')
      .run(username, role || 'entity_user', req.params.id);
  }
  setEntities(db, req.params.id, entities);
  res.json({ message: 'Updated' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM user_entities WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
