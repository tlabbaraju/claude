const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { query, queryOne } = require('../db');

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT project_id, project_name, request_date, requestor, description, it_comments FROM dbo.project_requests ORDER BY request_date DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const row = await queryOne(
      'SELECT project_id, project_name, request_date, requestor, description, it_comments FROM dbo.project_requests WHERE project_id = ?',
      [parseInt(req.params.id, 10)]
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { project_name, request_date, requestor, description } = req.body;
  if (!project_name || !requestor || !description) {
    return res.status(400).json({ error: 'project_name, requestor, and description are required' });
  }
  try {
    await query(
      'INSERT INTO dbo.project_requests (project_name, request_date, requestor, description) VALUES (?, ?, ?, ?)',
      [project_name, request_date || new Date(), requestor, description]
    );
    res.status(201).json({ message: 'Request created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { project_name, request_date, requestor, description, it_comments } = req.body;
  if (!project_name || !requestor || !description) {
    return res.status(400).json({ error: 'project_name, requestor, and description are required' });
  }
  try {
    await query(
      'UPDATE dbo.project_requests SET project_name = ?, request_date = ?, requestor = ?, description = ?, it_comments = ? WHERE project_id = ?',
      [project_name, request_date || new Date(), requestor, description, it_comments || null, parseInt(req.params.id, 10)]
    );
    res.json({ message: 'Request updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await query(
      'DELETE FROM dbo.project_requests WHERE project_id = ?',
      [parseInt(req.params.id, 10)]
    );
    res.json({ message: 'Request deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
