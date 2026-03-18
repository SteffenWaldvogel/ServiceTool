const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/maschinentypen
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT maschinentyp_id AS id, maschinentyp_name AS name FROM maschinentyp ORDER BY maschinentyp_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maschinentypen
router.post('/', async (req, res) => {
  try {
    const { maschinentyp_name, name } = req.body;
    const typName = (maschinentyp_name || name || '').trim();
    if (!typName) return res.status(400).json({ error: 'maschinentyp_name ist erforderlich' });
    const result = await pool.query(
      'INSERT INTO maschinentyp (maschinentyp_name) VALUES ($1) RETURNING maschinentyp_id AS id, maschinentyp_name AS name',
      [typName]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Maschinentyp existiert bereits' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maschinentypen/:id
router.put('/:id', async (req, res) => {
  try {
    const { maschinentyp_name, name } = req.body;
    const typName = maschinentyp_name || name;
    const result = await pool.query(
      'UPDATE maschinentyp SET maschinentyp_name=$1 WHERE maschinentyp_id=$2 RETURNING maschinentyp_id AS id, maschinentyp_name AS name',
      [typName, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/maschinentypen/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM maschinentyp WHERE maschinentyp_id=$1 RETURNING maschinentyp_id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
