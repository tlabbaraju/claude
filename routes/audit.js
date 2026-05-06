const express       = require('express');
const router        = express.Router();
const requireAdmin  = require('../middleware/requireAdmin');
const { getDb }     = require('../db/index');

router.get('/', requireAdmin, (req, res) => {
  const { entity, tab_type, year, limit = 500 } = req.query;
  let sql    = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];
  if (entity)   { sql += ' AND entity = ?';   params.push(entity); }
  if (tab_type) { sql += ' AND tab_type = ?'; params.push(tab_type); }
  if (year)     { sql += ' AND year = ?';     params.push(Number(year)); }
  sql += ' ORDER BY changed_at DESC LIMIT ?';
  params.push(Number(limit));
  res.json(getDb().prepare(sql).all(...params));
});

module.exports = router;
