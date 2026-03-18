const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, username, display_name, role, is_active, created_at, last_login FROM users ORDER BY created_at'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users
router.post('/', async (req, res) => {
  const { username, password, display_name, role = 'techniker' } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username und password erforderlich' });
  if (password.length < 6) return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, display_name, role) VALUES ($1,$2,$3,$4) RETURNING user_id, username, display_name, role, is_active, created_at',
      [username, hash, display_name || null, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  const { display_name, role, is_active, password } = req.body;
  try {
    let query, params;
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 12);
      query = 'UPDATE users SET display_name=$1, role=$2, is_active=$3, password_hash=$4 WHERE user_id=$5 RETURNING user_id, username, display_name, role, is_active';
      params = [display_name, role, is_active, hash, req.params.id];
    } else {
      query = 'UPDATE users SET display_name=$1, role=$2, is_active=$3 WHERE user_id=$4 RETURNING user_id, username, display_name, role, is_active';
      params = [display_name, role, is_active, req.params.id];
    }
    const result = await pool.query(query, params);
    if (!result.rows.length) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/users/:id (deactivate)
router.delete('/:id', async (req, res) => {
  try {
    // Darf sich nicht selbst deaktivieren
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
