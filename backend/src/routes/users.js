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
  body('email').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('telefon').optional({ nullable: true }).trim().isLength({ max: 50 }),
];

const userUpdateRules = [
  body('display_name').optional().trim().isLength({ max: 100 }),
  body('password').optional().isLength({ min: 8, max: 200 }),
  body('role_id').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean(),
  body('email').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('telefon').optional({ nullable: true }).trim().isLength({ max: 50 }),
];

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.username, u.display_name, u.role_id,
             r.name AS role, r.label AS role_label,
             u.is_active, u.created_at, u.last_login,
             u.email, u.telefon,
             u.notify_ticket_assigned, u.notify_ticket_created,
             u.notify_status_changed, u.notify_sla_warning,
             u.notify_unmatched_email, u.notify_high_priority
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      ORDER BY u.created_at
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users
router.post('/', userCreateRules, validate, async (req, res) => {
  const { username, password, display_name, role_id = 2, email, telefon } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(`
      INSERT INTO users (username, password_hash, display_name, role_id, email, telefon)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING user_id, username, display_name, role_id, is_active, created_at, email, telefon
    `, [username, hash, display_name || null, role_id, email || null, telefon || null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', userUpdateRules, validate, async (req, res) => {
  const {
    display_name, role_id, is_active, password, email, telefon,
    notify_ticket_assigned, notify_ticket_created, notify_status_changed,
    notify_sla_warning, notify_unmatched_email, notify_high_priority
  } = req.body;
  try {
    const sets = [
      'display_name=$1', 'role_id=$2', 'is_active=$3',
      'email=$4', 'telefon=$5',
      'notify_ticket_assigned=$6', 'notify_ticket_created=$7',
      'notify_status_changed=$8', 'notify_sla_warning=$9',
      'notify_unmatched_email=$10', 'notify_high_priority=$11'
    ];
    const params = [
      display_name, role_id, is_active,
      email || null, telefon || null,
      notify_ticket_assigned ?? true, notify_ticket_created ?? false,
      notify_status_changed ?? true, notify_sla_warning ?? true,
      notify_unmatched_email ?? false, notify_high_priority ?? true
    ];

    if (password && password.length >= 8) {
      const hash = await bcrypt.hash(password, 12);
      params.push(hash);
      sets.push(`password_hash=$${params.length}`);
    }

    params.push(req.params.id);
    const returning = 'user_id, username, display_name, role_id, is_active, email, telefon, notify_ticket_assigned, notify_ticket_created, notify_status_changed, notify_sla_warning, notify_unmatched_email, notify_high_priority';
    const result = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE user_id=$${params.length} RETURNING ${returning}`,
      params
    );
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
