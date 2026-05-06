const express      = require('express');
const router       = express.Router();
const bcrypt       = require('bcrypt');
const requireAdmin = require('../middleware/requireAdmin');
const { getAllUsersWithEntities, createUser, updateUser, deleteUser, setUserEntities } = require('../db/fabric');

router.get('/', requireAdmin, async (req, res) => {
  try {
    res.json(await getAllUsersWithEntities());
  } catch (err) {
    console.error('[Fabric Error] GET /users:', err.message);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { username, password, entities, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const hash   = await bcrypt.hash(password, 12);
    const userId = await createUser({ username, password_hash: hash, role: role || 'entity_user' });
    await setUserEntities(userId, entities);
    res.status(201).json({ id: userId });
  } catch (err) {
    console.error('[Fabric Error] POST /users:', err.message);
    if (err.message.includes('duplicate') || err.message.includes('Violation of UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { username, password, entities, role } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  try {
    const password_hash = password ? await bcrypt.hash(password, 12) : null;
    await updateUser(Number(req.params.id), { username, password_hash, role: role || 'entity_user' });
    await setUserEntities(Number(req.params.id), entities);
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('[Fabric Error] PUT /users:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await deleteUser(Number(req.params.id));
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[Fabric Error] DELETE /users:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
