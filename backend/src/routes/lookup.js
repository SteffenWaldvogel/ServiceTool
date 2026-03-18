const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/lookup/status
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT status_id, status_name, is_terminal FROM status ORDER BY status_id'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lookup/kategorien
router.get('/kategorien', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT kategorie_id, kategorie_name FROM kategorie ORDER BY kategorie_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lookup/kritikalitaeten
router.get('/kritikalitaeten', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT kritikalität_id AS id, kritikalität_name AS name, kritikalität_gewichtung FROM kritikalität ORDER BY kritikalität_gewichtung'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lookup/maschinentypen
router.get('/maschinentypen', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT maschinentyp_id AS id, maschinentyp_name AS name FROM maschinentyp ORDER BY maschinentyp_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lookup/service-priorities
router.get('/service-priorities', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT service_priority_id AS id, service_priority_name AS name FROM service_priority ORDER BY priority_order'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lookup/abteilungen
router.get('/abteilungen', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT abteilung_id AS id, abteilung_name AS name FROM abteilung ORDER BY abteilung_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lookup/positionen?abteilung_id=
router.get('/positionen', async (req, res) => {
  try {
    const { abteilung_id } = req.query;
    const params = [];
    let where = '';
    if (abteilung_id) {
      params.push(abteilung_id);
      where = `WHERE p.abteilung_id = $1`;
    }
    const result = await pool.query(
      `SELECT p.position_id AS id, p.position_name AS name, p.abteilung_id, a.abteilung_name
       FROM position p
       JOIN abteilung a ON p.abteilung_id = a.abteilung_id
       ${where}
       ORDER BY p.position_name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lookup/dashboard-stats?period=all|week|month
router.get('/dashboard-stats', async (req, res) => {
  try {
    const period = req.query.period || 'all';
    let periodFilter = '';
    if (period === 'week')  periodFilter = "AND t.erstellt_am >= NOW() - INTERVAL '7 days'";
    if (period === 'month') periodFilter = "AND t.erstellt_am >= NOW() - INTERVAL '30 days'";

    const [ticketStats, statusDist, recentTickets, kritikalitaetDist, unreadResult, technikerDist] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE s.is_terminal = false ${periodFilter}) AS offen,
          COUNT(*) FILTER (WHERE s.status_name = 'In Bearbeitung' ${periodFilter}) AS in_bearbeitung,
          COUNT(*) FILTER (WHERE s.status_name = 'Warten auf Kunde' ${periodFilter}) AS warten,
          COUNT(*) FILTER (WHERE DATE(t.erstellt_am) = CURRENT_DATE) AS heute_erstellt,
          COUNT(*) FILTER (WHERE DATE(t.created_at) = CURRENT_DATE AND s.is_terminal = true) AS heute_geschlossen,
          COUNT(*) FILTER (WHERE t.erstellt_am >= NOW() - INTERVAL '7 days') AS diese_woche,
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (t.updated_at - t.erstellt_am)) / 3600
            ) FILTER (WHERE s.is_terminal = true ${periodFilter})
          ::numeric, 1) AS avg_loesungszeit_h
        FROM ticket t
        LEFT JOIN status s ON t.status_id = s.status_id
      `),
      pool.query(`
        SELECT s.status_name AS name, s.is_terminal, COUNT(t.ticketnr)::int AS anzahl
        FROM status s
        LEFT JOIN ticket t ON t.status_id = s.status_id ${periodFilter ? `AND (1=1 ${periodFilter})` : ''}
        GROUP BY s.status_id, s.status_name, s.is_terminal
        ORDER BY s.status_id
      `),
      pool.query(`
        SELECT
          t.ticketnr,
          t.erstellt_am,
          s.status_name,
          s.is_terminal,
          k.name_kunde AS kunden_name,
          kr.kritikalität_name AS kritikalitaet_name,
          kr.kritikalität_gewichtung AS kritikalitaet_gewichtung,
          (
            SELECT tm.message
            FROM ticket_messages tm
            WHERE tm.ticketnr = t.ticketnr
            ORDER BY tm.created_at ASC
            LIMIT 1
          ) AS betreff
        FROM ticket t
        LEFT JOIN status s ON t.status_id = s.status_id
        LEFT JOIN kunden k ON t.ticket_kundennummer = k.kundennummer
        LEFT JOIN kritikalität kr ON t.kritikalität_id = kr.kritikalität_id
        WHERE 1=1 ${periodFilter}
        ORDER BY t.erstellt_am DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT
          kr.kritikalität_name AS name,
          kr.kritikalität_gewichtung AS gewichtung,
          COUNT(t.ticketnr)::int AS anzahl
        FROM kritikalität kr
        LEFT JOIN ticket t ON t.kritikalität_id = kr.kritikalität_id
          AND t.status_id IN (SELECT status_id FROM status WHERE is_terminal = false)
          ${periodFilter}
        GROUP BY kr.kritikalität_id, kr.kritikalität_name, kr.kritikalität_gewichtung
        ORDER BY kr.kritikalität_gewichtung DESC
      `),
      pool.query(`
        SELECT COUNT(*)::int AS unread_messages
        FROM ticket_messages m
        JOIN ticket t ON m.ticketnr = t.ticketnr
        JOIN status s ON t.status_id = s.status_id
        WHERE m.message_type = 'email'
        AND m.created_at > (
          SELECT COALESCE(MAX(created_at), '1970-01-01'::timestamp)
          FROM ticket_messages
          WHERE ticketnr = m.ticketnr AND message_type = 'technician'
        )
        AND s.is_terminal = false
      `),
      pool.query(`
        SELECT
          COALESCE(u.display_name, u.username, '— Nicht zugewiesen —') AS name,
          COUNT(t.ticketnr)::int AS anzahl
        FROM ticket t
        LEFT JOIN users u ON t.assigned_to = u.user_id
        LEFT JOIN status s ON t.status_id = s.status_id
        WHERE s.is_terminal = false ${periodFilter}
        GROUP BY t.assigned_to, u.display_name, u.username
        ORDER BY anzahl DESC
        LIMIT 10
      `)
    ]);

    // Ungematchte Emails (parallel, separate try/catch da Tabelle optional)
    let unmatchedCount = 0;
    try {
      const unmatchedResult = await pool.query('SELECT COUNT(*)::int AS cnt FROM unmatched_emails');
      unmatchedCount = unmatchedResult.rows[0].cnt;
    } catch (e) { /* Tabelle existiert noch nicht */ }

    res.json({
      stats: ticketStats.rows[0],
      statusVerteilung: statusDist.rows,
      letzte_tickets: recentTickets.rows,
      kritikalitaetVerteilung: kritikalitaetDist.rows,
      technikerVerteilung: technikerDist.rows,
      unread_messages: unreadResult.rows[0].unread_messages,
      unmatched_emails: unmatchedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lookup/users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, username, COALESCE(display_name, username) AS display_name
       FROM users
       WHERE is_active = true
       ORDER BY display_name, username`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lookup/custom-fields/:tableName
router.get('/custom-fields/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const result = await pool.query(
      `SELECT
         cf.custom_field_key AS field_key,
         cf.custom_field_label AS label,
         cf.custom_field_type AS type,
         cf.custom_field_position AS position,
         COALESCE(
           json_agg(
             json_build_object(
               'value', co.custom_field_option_value,
               'label', co.custom_field_option_label
             ) ORDER BY co.custom_field_option_position
           ) FILTER (WHERE co.custom_field_option_value IS NOT NULL),
           '[]'
         ) AS options
       FROM custom_field_definitions cf
       LEFT JOIN custom_field_options co
         ON cf.custom_field_table_name = co.custom_field_table_name
         AND cf.custom_field_key = co.custom_field_key
       WHERE cf.custom_field_table_name = $1
       GROUP BY cf.custom_field_key, cf.custom_field_label, cf.custom_field_type, cf.custom_field_position
       ORDER BY cf.custom_field_position`,
      [tableName]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
