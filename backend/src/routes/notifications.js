const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const unreadOnly = req.query.unread_only === 'true';
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const conditions = ['user_id = $1'];
    const params = [userId];

    if (unreadOnly) {
      conditions.push('is_read = false');
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM notifications ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      unread_count: countResult.rows[0].total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.session.user.user_id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id',
      [req.params.id, req.session.user.user_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Benachrichtigung nicht gefunden' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.session.user.user_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id',
      [req.params.id, req.session.user.user_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Benachrichtigung nicht gefunden' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications – delete all for current user
router.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [req.session.user.user_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
