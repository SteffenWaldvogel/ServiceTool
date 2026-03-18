const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true', [username]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);
    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      display_name: user.display_name,
      role: user.role
    };
    res.json({ user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  res.json({ user: req.session.user });
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 6)
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben' });
  try {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = $1', [req.session.user.user_id]
    );
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Aktuelles Passwort falsch' });
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, req.session.user.user_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
