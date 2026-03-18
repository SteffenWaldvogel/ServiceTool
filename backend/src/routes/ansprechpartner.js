const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const buildQuery = require('../utils/queryBuilder');

const AP_FILTERS = {
  email:        { type: 'ilike', col: 'ap.ansprechpartner_email' },
  kunden_id:    { type: 'exact', col: 'ap.ansprechpartner_kundennr' },
  abteilung_id: { type: 'exact', col: 'ap.abteilung_id' },
  position_id:  { type: 'exact', col: 'ap.position_id' },
};

const AP_SORTS = {
  default:   'ap.ansprechpartner_name',
  name:      'ap.ansprechpartner_name',
  kunde:     'k.name_kunde',
  abteilung: 'ab.abteilung_name',
  position:  'pos.position_name',
};

// GET /api/ansprechpartner
router.get('/', async (req, res) => {
  try {
    const { conditions, params, orderBy, limit, offset } = buildQuery(req.query, AP_FILTERS, AP_SORTS, { defaultDir: 'asc' });

    // search on name OR email
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      const p = params.length;
      conditions.push(`(ap.ansprechpartner_name ILIKE $${p} OR ap.ansprechpartner_email ILIKE $${p})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM ansprechpartner ap
       LEFT JOIN abteilung ab ON ap.abteilung_id = ab.abteilung_id
       LEFT JOIN position pos ON ap.position_id = pos.position_id
       LEFT JOIN kunden k ON ap.ansprechpartner_kundennr = k.kundennummer
       ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT
         ap.ansprechpartnerid,
         ap.ansprechpartner_name,
         ap.ansprechpartner_email,
         ap.ansprechpartner_telefon,
         ap.ansprechpartner_kundennr,
         ap.abteilung_id,
         ab.abteilung_name,
         ap.position_id,
         pos.position_name,
         ap.ansprechpartner_vertretungid,
         ap.created_at,
         ap.updated_at,
         k.name_kunde,
         k.matchcode AS kunden_matchcode
       FROM ansprechpartner ap
       LEFT JOIN abteilung ab ON ap.abteilung_id = ab.abteilung_id
       LEFT JOIN position pos ON ap.position_id = pos.position_id
       LEFT JOIN kunden k ON ap.ansprechpartner_kundennr = k.kundennummer
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ansprechpartner/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         ap.ansprechpartnerid,
         ap.ansprechpartner_name,
         ap.ansprechpartner_email,
         ap.ansprechpartner_telefon,
         ap.ansprechpartner_kundennr,
         ap.abteilung_id,
         ab.abteilung_name,
         ap.position_id,
         pos.position_name,
         ap.ansprechpartner_vertretungid,
         vert.ansprechpartner_name AS vertretung_name,
         ap.created_at,
         ap.updated_at,
         k.name_kunde,
         k.matchcode AS kunden_matchcode,
         k.kundennummer
       FROM ansprechpartner ap
       LEFT JOIN abteilung ab ON ap.abteilung_id = ab.abteilung_id
       LEFT JOIN position pos ON ap.position_id = pos.position_id
       LEFT JOIN kunden k ON ap.ansprechpartner_kundennr = k.kundennummer
       LEFT JOIN ansprechpartner vert ON ap.ansprechpartner_vertretungid = vert.ansprechpartnerid
       WHERE ap.ansprechpartnerid = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Ansprechpartner nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ansprechpartner
router.post('/', async (req, res) => {
  try {
    const {
      ansprechpartner_kundennr,
      ansprechpartner_name,
      abteilung_id,
      position_id,
      ansprechpartner_email,
      ansprechpartner_telefon,
      ansprechpartner_vertretungid
    } = req.body;

    if (!ansprechpartner_name?.trim()) {
      return res.status(400).json({ error: 'ansprechpartner_name ist erforderlich' });
    }
    if (!ansprechpartner_kundennr) {
      return res.status(400).json({ error: 'ansprechpartner_kundennr ist erforderlich' });
    }
    if (!abteilung_id) {
      return res.status(400).json({ error: 'abteilung_id ist erforderlich' });
    }
    if (!position_id) {
      return res.status(400).json({ error: 'position_id ist erforderlich' });
    }

    const result = await pool.query(
      `INSERT INTO ansprechpartner
         (ansprechpartner_kundennr, ansprechpartner_name, abteilung_id, position_id,
          ansprechpartner_email, ansprechpartner_telefon, ansprechpartner_vertretungid)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        ansprechpartner_kundennr,
        ansprechpartner_name.trim(),
        abteilung_id,
        position_id,
        ansprechpartner_email || null,
        ansprechpartner_telefon || null,
        ansprechpartner_vertretungid || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Referenzierter Datensatz (Kunde/Abteilung/Position) nicht gefunden' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ansprechpartner/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      ansprechpartner_name,
      abteilung_id,
      position_id,
      ansprechpartner_email,
      ansprechpartner_telefon,
      ansprechpartner_vertretungid,
      ansprechpartner_kundennr
    } = req.body;

    const result = await pool.query(
      `UPDATE ansprechpartner SET
         ansprechpartner_name=COALESCE($1, ansprechpartner_name),
         abteilung_id=COALESCE($2, abteilung_id),
         position_id=COALESCE($3, position_id),
         ansprechpartner_email=COALESCE($4, ansprechpartner_email),
         ansprechpartner_telefon=COALESCE($5, ansprechpartner_telefon),
         ansprechpartner_vertretungid=$6,
         ansprechpartner_kundennr=COALESCE($7, ansprechpartner_kundennr),
         updated_at=NOW()
       WHERE ansprechpartnerid=$8
       RETURNING *`,
      [
        ansprechpartner_name || null,
        abteilung_id || null,
        position_id || null,
        ansprechpartner_email || null,
        ansprechpartner_telefon || null,
        ansprechpartner_vertretungid || null,
        ansprechpartner_kundennr || null,
        req.params.id
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Ansprechpartner nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Referenzierter Datensatz nicht gefunden' });
    if (err.code === 'P0001') return res.status(400).json({ error: err.message }); // trigger exception
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ansprechpartner/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM ansprechpartner WHERE ansprechpartnerid=$1 RETURNING ansprechpartnerid',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Ansprechpartner nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'Ansprechpartner wird noch von Tickets verwendet und kann nicht gelöscht werden' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ansprechpartner/match
router.post('/match', async (req, res) => {
  try {
    const { matchAnsprechpartner } = require('../services/matchingService');
    const matches = await matchAnsprechpartner(pool, req.body, req.body.kundennummer);
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
