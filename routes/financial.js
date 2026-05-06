const express       = require('express');
const router        = express.Router();
const requireAuth   = require('../middleware/requireAuth');
const requireAdmin  = require('../middleware/requireAdmin');
const { queryAllEntities, queryFinancialData, queryCurrentRow, mergeFinancialData, writeAuditLog } = require('../db/fabric');

const MONTHS    = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const TAB_TYPES = ['current_estimate','past_due_31plus','total_past_due'];

function canAccessEntity(user, entity) {
  return user.role === 'admin' || (user.entities && user.entities.includes(entity));
}

const ZERO_MONTHS = Object.fromEntries(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map(m => [m, 0]));

// Admin: all entities for a given year/month/day snapshot — always returns all known entities
router.get('/all/:year/:month/:day', requireAdmin, async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const [rows, allEntities] = await Promise.all([
      queryFinancialData({ year: Number(year), month: Number(month), day: Number(day) }),
      queryAllEntities(),
    ]);
    // Fill in zero-rows for any entity+tab_type not yet saved for this date
    const key = r => `${r.entity}||${r.tab_type}`;
    const saved = new Set(rows.map(key));
    const placeholders = allEntities
      .filter(e => !saved.has(key(e)))
      .map(e => ({ ...ZERO_MONTHS, entity: e.entity, year: Number(year), month: Number(month), day: Number(day), tab_type: e.tab_type }));
    res.json([...rows, ...placeholders]);
  } catch (err) {
    console.error('[Fabric Error] GET /all:', err.message);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// Entity user: their entities for a given year/month/day snapshot — always returns all assigned entities
router.get('/mine/:year/:month/:day', requireAuth, async (req, res) => {
  const { entities, role } = req.session.user;
  if (role === 'admin') return res.status(400).json({ error: 'Use /all/:year/:month/:day for admin' });
  if (!entities || entities.length === 0) return res.json([]);
  try {
    const { year, month, day } = req.params;
    const rows = await queryFinancialData({ year: Number(year), month: Number(month), day: Number(day), entities });
    res.json(rows);
  } catch (err) {
    console.error('[Fabric Error] GET /mine:', err.message);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

router.put('/:entity/:year/:month/:day/:tab_type', requireAuth, async (req, res) => {
  const { entity, year, month, day, tab_type } = req.params;
  if (!canAccessEntity(req.session.user, entity)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!TAB_TYPES.includes(tab_type)) return res.status(400).json({ error: 'Invalid tab_type' });

  // Non-admins cannot edit past dates
  if (req.session.user.role !== 'admin') {
    const selected = new Date(Number(year), Number(month) - 1, Number(day));
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    if (selected < today) return res.status(403).json({ error: 'Past dates are read-only' });
  }

  try {
    const updates = req.body;
    const current = await queryCurrentRow({
      entity, year: Number(year), month: Number(month), day: Number(day), tab_type
    });

    const monthValues = Object.fromEntries(
      MONTHS.map(m => [m, updates[m] !== undefined ? Number(updates[m]) : (current?.[m] ?? 0)])
    );

    // Build audit entries from changed values
    const fabricEntries = [];
    for (const m of MONTHS) {
      const oldVal = current?.[m] ?? null;
      const newVal = monthValues[m];
      if (oldVal !== newVal) {
        fabricEntries.push({
          entity, year: Number(year), tab_type,
          month: m, old_value: oldVal, new_value: newVal,
          changed_by: req.session.user.username,
        });
      }
    }

    await mergeFinancialData({
      entity, year: Number(year), month: Number(month), day: Number(day),
      tab_type, months: monthValues, updated_by: req.session.user.username,
    });

    // Audit log write is best-effort — don't fail the save if it errors
    writeAuditLog(fabricEntries).catch(err =>
      console.error('[Fabric Error] writeAuditLog:', err.message)
    );

    res.json({ message: 'Saved' });
  } catch (err) {
    console.error('[Fabric Error] PUT:', err.message);
    res.status(500).json({ error: err.message || 'Save failed' });
  }
});

module.exports = router;
