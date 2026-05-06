const express      = require('express');
const router       = express.Router();
const requireAdmin = require('../middleware/requireAdmin');
const { queryAuditLog } = require('../db/fabric');

router.get('/', requireAdmin, async (req, res) => {
  try {
    const { entity, tab_type, year, limit = 500 } = req.query;
    const rows = await queryAuditLog({ entity, tab_type, year, limit });
    res.json(rows);
  } catch (err) {
    console.error('[Fabric Error] GET /audit:', err.message);
    res.status(500).json({ error: 'Failed to load audit log' });
  }
});

module.exports = router;
