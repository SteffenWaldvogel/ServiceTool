const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const buildQuery = require('../utils/queryBuilder');

const MASCHINE_SELECT = `
  SELECT
    m.maschinenid, m.maschinennr, m.bezeichnung, m.baujahr, m.created_at, m.updated_at,
    mt.maschinentyp_id, mt.maschinentyp_name
  FROM maschine m
  JOIN maschinentyp mt ON m.maschinentyp_id = mt.maschinentyp_id
`;

const MASCHINEN_FILTERS = {
  maschinentyp_id: { type: 'in',  col: 'm.maschinentyp_id' },
  baujahr_von:     { type: 'gte', col: 'm.baujahr' },
  baujahr_bis:     { type: 'lte', col: 'm.baujahr' },
};

const MASCHINEN_SORTS = {
  default:      'm.maschinennr',
  maschinennr:  'm.maschinennr',
  maschinentyp: 'mt.maschinentyp_name',
  baujahr:      'm.baujahr',
};

// GET /api/maschinen
router.get('/', async (req, res) => {
  try {
    const { conditions, params, orderBy, limit, offset } = buildQuery(req.query, MASCHINEN_FILTERS, MASCHINEN_SORTS, { defaultDir: 'asc' });

    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      const p = params.length;
      conditions.push(`(m.maschinennr ILIKE $${p} OR mt.maschinentyp_name ILIKE $${p})`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM maschine m
       JOIN maschinentyp mt ON m.maschinentyp_id = mt.maschinentyp_id
       ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `${MASCHINE_SELECT} ${where} ORDER BY ${orderBy} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maschinen/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`${MASCHINE_SELECT} WHERE m.maschinenid = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Maschine nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maschinen
router.post('/', async (req, res) => {
  try {
    const { maschinennr, bezeichnung, maschinentyp_id, baujahr } = req.body;

    if (!maschinennr?.trim()) {
      return res.status(400).json({ error: 'maschinennr ist erforderlich' });
    }
    if (!maschinentyp_id) {
      return res.status(400).json({ error: 'maschinentyp_id ist erforderlich' });
    }

    const result = await pool.query(
      `INSERT INTO maschine (maschinennr, bezeichnung, maschinentyp_id, baujahr)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [maschinennr.trim(), bezeichnung?.trim() || null, maschinentyp_id, baujahr || null]
    );

    // Return with joined maschinentyp
    const full = await pool.query(
      `${MASCHINE_SELECT} WHERE m.maschinenid = $1`,
      [result.rows[0].maschinenid]
    );
    res.status(201).json(full.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Maschinennummer bereits vergeben' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maschinen/:id
router.put('/:id', async (req, res) => {
  try {
    const { maschinennr, bezeichnung, maschinentyp_id, baujahr } = req.body;

    const result = await pool.query(
      `UPDATE maschine SET
         maschinennr=$1, bezeichnung=$2, maschinentyp_id=$3, baujahr=$4, updated_at=NOW()
       WHERE maschinenid=$5
       RETURNING *`,
      [maschinennr, bezeichnung?.trim() || null, maschinentyp_id, baujahr || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Maschine nicht gefunden' });

    const full = await pool.query(`${MASCHINE_SELECT} WHERE m.maschinenid = $1`, [req.params.id]);
    res.json(full.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Maschinennummer bereits vergeben' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maschinen/:id/custom-fields
router.get('/:id/custom-fields', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT field_key, field_value FROM maschine_custom_fields WHERE maschinenid = $1',
      [req.params.id]
    );
    const fields = {};
    result.rows.forEach(r => { fields[r.field_key] = r.field_value; });
    res.json(fields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maschinen/:id/custom-fields
router.put('/:id/custom-fields', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(req.body)) {
      if (value === null || value === '') {
        await client.query(
          'DELETE FROM maschine_custom_fields WHERE maschinenid=$1 AND field_key=$2',
          [req.params.id, key]
        );
      } else {
        await client.query(
          `INSERT INTO maschine_custom_fields (maschinenid, field_key, field_value)
           VALUES ($1,$2,$3)
           ON CONFLICT (maschinenid, field_key) DO UPDATE SET field_value=EXCLUDED.field_value`,
          [req.params.id, key, value]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/maschinen/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM maschine WHERE maschinenid=$1 RETURNING maschinenid',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Maschine nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maschinen/:id/tickets
router.get('/:id/tickets', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.ticketnr, t.erstellt_am, s.status_name, s.is_terminal,
             k.name_kunde, kr.kritikalität_name AS kritikalitaet_name,
             kr.kritikalität_gewichtung AS kritikalitaet_gewichtung,
             ka.kategorie_name,
             (SELECT tm.message FROM ticket_messages tm WHERE tm.ticketnr = t.ticketnr ORDER BY tm.created_at ASC LIMIT 1) AS betreff
      FROM ticket t
      LEFT JOIN status s ON t.status_id = s.status_id
      LEFT JOIN kunden k ON t.ticket_kundennummer = k.kundennummer
      LEFT JOIN kritikalität kr ON t.kritikalität_id = kr.kritikalität_id
      LEFT JOIN kategorie ka ON t.kategorie_id = ka.kategorie_id
      WHERE t.ticket_maschinenid = $1
      ORDER BY t.erstellt_am DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maschinen/match
router.post('/match', async (req, res) => {
  try {
    const { matchMaschine } = require('../services/matchingService');
    const matches = await matchMaschine(pool, req.body);
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
