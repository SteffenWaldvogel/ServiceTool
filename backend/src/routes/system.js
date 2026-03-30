const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { fetchAllEmails } = require('../services/emailService');
const { requireAdmin } = require('../middleware/auth');
const { invalidateMaintenanceCache } = require('../middleware/maintenanceMode');

// GET /api/system/maintenance – PUBLIC (kein Auth erforderlich)
// HINWEIS: Dieser Endpunkt wird in server.js VOR requireAuth registriert
router.get('/maintenance', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT is_active, activated_by, activated_at, reason, estimated_end FROM maintenance_mode WHERE id = 1'
    );
    res.json(result.rows[0] || { is_active: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/system/maintenance – Admin only
router.post('/maintenance', requireAdmin, async (req, res) => {
  const { is_active, reason, estimated_end } = req.body;
  const username = req.session.user.username;
  try {
    if (is_active) {
      // Alle Nicht-Admin-Sessions löschen
      await pool.query(
        `DELETE FROM user_sessions
         WHERE (sess->>'user_id') IS NOT NULL
           AND (sess->>'user_id')::INTEGER NOT IN (
             SELECT u.user_id FROM users u
             JOIN roles r ON r.role_id = u.role_id
             WHERE r.name = 'admin'
           )
           AND sid != $1`,
        [req.sessionID]
      );
      await pool.query(
        `UPDATE maintenance_mode
         SET is_active = true, activated_by = $1, activated_at = NOW(),
             reason = $2, estimated_end = $3
         WHERE id = 1`,
        [username, reason || null, estimated_end || null]
      );
    } else {
      await pool.query(
        `UPDATE maintenance_mode
         SET is_active = false, activated_by = NULL, activated_at = NULL,
             reason = NULL, estimated_end = NULL
         WHERE id = 1`
      );
    }
    invalidateMaintenanceCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/active-sessions – Admin only
router.get('/active-sessions', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sid, user_id, username, display_name, login_at, session_expires
       FROM v_active_sessions
       ORDER BY login_at DESC NULLS LAST`
    );
    res.json(result.rows);
  } catch (err) {
    if (err.code === '42P01') return res.json([]);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/system/sessions/:sid – Admin only, einzelne Session löschen
router.delete('/sessions/:sid', requireAdmin, async (req, res) => {
  const { sid } = req.params;
  if (sid === req.sessionID) {
    return res.status(400).json({ error: 'Eigene Session kann nicht gelöscht werden' });
  }
  try {
    await pool.query('DELETE FROM user_sessions WHERE sid = $1', [sid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/system/sessions – Admin only, alle Fremd-Sessions löschen
router.delete('/sessions', requireAdmin, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM user_sessions WHERE sid != $1',
      [req.sessionID]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system/audit-log
// Query params: table_name, operation, changed_by, from (date), to (date), limit (default 100)
router.get('/audit-log', async (req, res) => {
  try {
    const { table_name, operation, changed_by, from: fromDate, to: toDate, limit = 100 } = req.query;

    const params = [];
    const conditions = [];

    if (table_name) {
      params.push(table_name);
      conditions.push(`table_name = $${params.length}`);
    }

    if (operation) {
      params.push(operation.toUpperCase());
      conditions.push(`operation = $${params.length}`);
    }

    if (changed_by) {
      params.push(`%${changed_by}%`);
      conditions.push(`changed_by ILIKE $${params.length}`);
    }

    if (fromDate) {
      params.push(fromDate);
      conditions.push(`changed_at >= $${params.length}::date`);
    }

    if (toDate) {
      params.push(toDate);
      conditions.push(`changed_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const safeLimit = Math.min(parseInt(limit) || 100, 1000);
    params.push(safeLimit);

    const query = `
      SELECT
        audit_id,
        table_name,
        record_id,
        operation,
        old_values,
        new_values,
        changed_by,
        changed_at
      FROM audit_log
      ${where}
      ORDER BY changed_at DESC
      LIMIT $${params.length}
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    // If audit_log table doesn't exist yet, return empty array gracefully
    if (err.code === '42P01') {
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/system/fetch-emails – manueller Email-Abruf
router.post('/fetch-emails', async (req, res) => {
  try {
    await fetchAllEmails();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
