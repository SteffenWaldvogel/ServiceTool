const express = require('express');
const router = express.Router();
const pool = require('../config/database');

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

module.exports = router;
