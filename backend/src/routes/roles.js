const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/roles – alle Rollen
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT role_id, name, label, is_system FROM roles ORDER BY role_id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/permissions (via /api/roles/permissions) – alle Permissions gruppiert nach Modul
router.get('/permissions', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT permission_id, name, label, category FROM permissions ORDER BY category, name'
    );
    // Nach Kategorie gruppieren
    const grouped = {};
    for (const p of result.rows) {
      const cat = p.category || 'Sonstige';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/roles/:id/permissions – Berechtigungen einer Rolle
router.get('/:id/permissions', async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige Rollen-ID' });
  try {
    const result = await pool.query(
      `SELECT p.permission_id, p.name, p.label, p.category
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.category, p.name`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
