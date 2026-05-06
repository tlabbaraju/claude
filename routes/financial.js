const express            = require('express');
const router             = express.Router();
const requireAuth        = require('../middleware/requireAuth');
const requireAdmin       = require('../middleware/requireAdmin');
const { getDb }          = require('../db/index');
const { mergeFinancialData, writeAuditLog } = require('../db/fabric');

const MONTHS    = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const TAB_TYPES = ['current_estimate','past_due_31plus','total_past_due'];

function canAccessEntity(user, entity) {
  return user.role === 'admin' || (user.entities && user.entities.includes(entity));
}

// Admin: all entities for a year
router.get('/all/:year', requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM financial_data WHERE year = ? ORDER BY entity, tab_type'
  ).all(Number(req.params.year));
  res.json(rows);
});

// Entity user: all entities they have access to for a year
router.get('/mine/:year', requireAuth, (req, res) => {
  const { entities, role } = req.session.user;
  if (role === 'admin') return res.status(400).json({ error: 'Use /all/:year for admin' });
  if (!entities || entities.length === 0) return res.json([]);
  const db = getDb();
  const placeholders = entities.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM financial_data WHERE year = ? AND entity IN (${placeholders}) ORDER BY entity, tab_type`
  ).all(Number(req.params.year), ...entities);
  res.json(rows);
});

// Single entity
router.get('/:entity/:year', requireAuth, (req, res) => {
  const { entity, year } = req.params;
  if (!canAccessEntity(req.session.user, entity)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const db   = getDb();
  const rows = db.prepare(
    'SELECT * FROM financial_data WHERE entity = ? AND year = ?'
  ).all(entity, Number(year));
  res.json(rows);
});

router.put('/:entity/:year/:tab_type', requireAuth, (req, res) => {
  const { entity, year, tab_type } = req.params;
  if (!canAccessEntity(req.session.user, entity)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!TAB_TYPES.includes(tab_type)) return res.status(400).json({ error: 'Invalid tab_type' });

  const db      = getDb();
  const updates = req.body;
  const current = db.prepare(
    'SELECT * FROM financial_data WHERE entity = ? AND year = ? AND tab_type = ?'
  ).get(entity, Number(year), tab_type);

  const monthValues  = Object.fromEntries(
    MONTHS.map(m => [m, updates[m] !== undefined ? Number(updates[m]) : (current?.[m] ?? 0)])
  );
  const monthSetCols = MONTHS.map(m => `${m} = @${m}`).join(', ');

  db.prepare(`
    INSERT INTO financial_data (entity, year, tab_type, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec, updated_at, updated_by)
    VALUES (@entity, @year, @tab_type, @jan, @feb, @mar, @apr, @may, @jun, @jul, @aug, @sep, @oct, @nov, @dec, datetime('now'), @updated_by)
    ON CONFLICT(entity, year, tab_type) DO UPDATE SET
      ${monthSetCols}, updated_at = datetime('now'), updated_by = @updated_by
  `).run({ entity, year: Number(year), tab_type, ...monthValues, updated_by: req.session.user.username });

  const insertAudit   = db.prepare(
    'INSERT INTO audit_log (entity, year, tab_type, month, old_value, new_value, changed_by) VALUES (?,?,?,?,?,?,?)'
  );
  const fabricEntries = [];
  db.transaction(() => {
    for (const m of MONTHS) {
      const oldVal = current?.[m] ?? null;
      const newVal = monthValues[m];
      if (oldVal !== newVal) {
        insertAudit.run(entity, Number(year), tab_type, m, oldVal, newVal, req.session.user.username);
        fabricEntries.push({ entity, year: Number(year), tab_type, month: m, old_value: oldVal, new_value: newVal, changed_by: req.session.user.username });
      }
    }
  })();

  // Local save complete — fire Fabric writes without blocking the response
  Promise.allSettled([
    mergeFinancialData({ entity, year: Number(year), tab_type, months: monthValues, updated_by: req.session.user.username }),
    writeAuditLog(fabricEntries),
  ]).then(results => {
    const labels = ['mergeFinancialData', 'writeAuditLog'];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Fabric Error] ${labels[i]}:`, r.reason?.message ?? r.reason);
      }
    });
  });

  res.json({ message: 'Saved' });
});

module.exports = router;
