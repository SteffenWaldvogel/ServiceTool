const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const pool = require('../config/database');
const validate = require('../middleware/validate');

// Dummy-Hash für Timing-Attack-Schutz (verhindert User-Enumeration via Antwortzeit)
const DUMMY_HASH = '$2b$12$invalidhashfortimingequalityXXXXXXXXXXXXXXXXXXXXXXXXX';

async function loadPermissions(roleId) {
  const result = await pool.query(
    `SELECT p.name FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.permission_id
     WHERE rp.role_id = $1`,
    [roleId]
  );
  return result.rows.map(r => r.name);
}

// Login Rate-Limit (strenger als global: max 10 Versuche / 15 Min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Zu viele Login-Versuche, bitte 15 Minuten warten' },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login',
  loginLimiter,
  body('username').trim().isLength({ min: 1, max: 50 }).escape(),
  body('password').isLength({ min: 1, max: 200 }),
  validate,
  async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query(
        `SELECT u.user_id, u.username, u.display_name, u.password_hash, u.role_id, u.is_active,
                r.name AS role, r.label AS role_label
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         WHERE u.username = $1 AND u.is_active = true`,
        [username]
      );

      if (result.rows.length === 0) {
        // Timing-Attack-Schutz: Dummy-Compare auch wenn User nicht gefunden
        await bcrypt.compare(password, DUMMY_HASH);
        return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Ungültige Zugangsdaten' });

      await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);

      const permissions = await loadPermissions(user.role_id);

      req.session.user = {
        user_id: user.user_id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        role_id: user.role_id,
        role_label: user.role_label,
        permissions
      };
      res.json({ user: req.session.user });
    } catch (err) {
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  res.json({ user: req.session.user });
});

// GET /api/auth/my-permissions
router.get('/my-permissions', async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  const u = req.session.user;
  try {
    if (u.role === 'admin') {
      const result = await pool.query('SELECT name FROM permissions');
      return res.json(result.rows.map(r => r.name));
    }
    // Permissions aus session zurückgeben (wurden beim Login geladen)
    const sessionPerms = Array.isArray(u.permissions) ? u.permissions : [];
    return res.json(sessionPerms);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 8)
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen haben' });
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
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

module.exports = router;
