const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const pool = require('../config/database');
const validate = require('../middleware/validate');

const userCreateRules = [
  body('username').trim().matches(/^[a-zA-Z0-9_]+$/).isLength({ min: 3, max: 50 }),
  body('display_name').optional().trim().isLength({ max: 100 }),
  body('password').isLength({ min: 8, max: 200 }),
  body('role_id').optional().isInt({ min: 1 }),
];

const userUpdateRules = [
  body('display_name').optional().trim().isLength({ max: 100 }),
  body('password').optional().isLength({ min: 8, max: 200 }),
  body('role_id').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean(),
];

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.username, u.display_name, u.role_id,
             r.name AS role, r.label AS role_label,
             u.is_active, u.created_at, u.last_login
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      ORDER BY u.created_at
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users
router.post('/', userCreateRules, validate, async (req, res) => {
  const { username, password, display_name, role_id = 2 } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(`
      INSERT INTO users (username, password_hash, display_name, role_id)
      VALUES ($1,$2,$3,$4)
      RETURNING user_id, username, display_name, role_id, is_active, created_at
    `, [username, hash, display_name || null, role_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', userUpdateRules, validate, async (req, res) => {
  const { display_name, role_id, is_active, password } = req.body;
  try {
    let query, params;
    if (password && password.length >= 8) {
      const hash = await bcrypt.hash(password, 12);
      query = 'UPDATE users SET display_name=$1, role_id=$2, is_active=$3, password_hash=$4 WHERE user_id=$5 RETURNING user_id, username, display_name, role_id, is_active';
      params = [display_name, role_id, is_active, hash, req.params.id];
    } else {
      query = 'UPDATE users SET display_name=$1, role_id=$2, is_active=$3 WHERE user_id=$4 RETURNING user_id, username, display_name, role_id, is_active';
      params = [display_name, role_id, is_active, req.params.id];
    }
    const result = await pool.query(query, params);
    if (!result.rows.length) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/users/:id (deactivate)
router.delete('/:id', async (req, res) => {
  try {
    if (String(req.session?.user?.user_id) === String(req.params.id))
      return res.status(400).json({ error: 'Eigenen Account nicht deaktivieren' });
    const result = await pool.query(
      'UPDATE users SET is_active = false WHERE user_id = $1 RETURNING user_id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
