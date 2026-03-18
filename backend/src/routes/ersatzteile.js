const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const buildQuery = require('../utils/queryBuilder');

const ERSATZTEILE_FILTERS = {
  artikelnr:      { type: 'ilike',        col: 'e.artikelnr::text' },
  nur_baugruppen: { type: 'boolean_null', col: 'e.baugruppe_artikelnr' },
};

const ERSATZTEILE_SORTS = {
  default:     'e.artikelnr',
  artikelnr:   'e.artikelnr',
  bezeichnung: 'e.bezeichnung',
  baugruppe:   'e.baugruppe_artikelnr',
};

// GET /api/ersatzteile
router.get('/', async (req, res) => {
  try {
    const { conditions, params, orderBy, limit, offset } = buildQuery(req.query, ERSATZTEILE_FILTERS, ERSATZTEILE_SORTS, { defaultDir: 'asc' });

    // search on bezeichnung OR zusätzliche_bezeichnungen
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      const p = params.length;
      conditions.push(`(e.bezeichnung ILIKE $${p} OR e.zusätzliche_bezeichnungen ILIKE $${p})`);
    }

    // maschinentyp_id compatibility filter
    if (req.query.maschinentyp_id) {
      params.push(req.query.maschinentyp_id);
      const p = params.length;
      conditions.push(
        `EXISTS (
          SELECT 1 FROM ersatzteile_maschinentyp_baujahr emb
          WHERE emb.artikelnr = e.artikelnr AND emb.maschinentyp_id = $${p}
          UNION
          SELECT 1 FROM ersatzteile_maschinentyp_nummer emn
          WHERE emn.artikelnr = e.artikelnr AND emn.maschinentyp_id = $${p}
        )`
      );
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ersatzteile e ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const result = await pool.query(`
      SELECT
        e.artikelnr,
        e.bezeichnung,
        e.zusätzliche_bezeichnungen,
        e.baugruppe_artikelnr,
        e.zusatzinfos,
        e.bemerkung_ersatzteil,
        e.created_at,
        e.updated_at,
        baugruppe.bezeichnung AS baugruppe_bezeichnung,
        (
          SELECT COUNT(*)::int
          FROM ersatzteile_maschinentyp_baujahr emb
          WHERE emb.artikelnr = e.artikelnr
        ) + (
          SELECT COUNT(*)::int
          FROM ersatzteile_maschinentyp_nummer emn
          WHERE emn.artikelnr = e.artikelnr
        ) AS kompatibilitaet_anzahl
      FROM ersatzteile e
      LEFT JOIN ersatzteile baugruppe ON e.baugruppe_artikelnr = baugruppe.artikelnr
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `, dataParams);

    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ersatzteile/:id
router.get('/:id', async (req, res) => {
  try {
    const [part, baugruppe, subParts, kompBaujahr, kompNummer] = await Promise.all([
      pool.query(
        `SELECT e.*, b.bezeichnung AS baugruppe_bezeichnung
         FROM ersatzteile e
         LEFT JOIN ersatzteile b ON e.baugruppe_artikelnr = b.artikelnr
         WHERE e.artikelnr = $1`,
        [req.params.id]
      ),
      // baugruppe is already in the main query
      Promise.resolve(null),
      pool.query(
        `SELECT e.artikelnr, e.bezeichnung, e.zusätzliche_bezeichnungen
         FROM ersatzteile e
         WHERE e.baugruppe_artikelnr = $1
         ORDER BY e.bezeichnung`,
        [req.params.id]
      ),
      pool.query(
        `SELECT emb.maschinentyp_id, mt.maschinentyp_name, emb.baujahr_von, emb.baujahr_bis, emb.bemerkung_baujahr
         FROM ersatzteile_maschinentyp_baujahr emb
         JOIN maschinentyp mt ON emb.maschinentyp_id = mt.maschinentyp_id
         WHERE emb.artikelnr = $1
         ORDER BY mt.maschinentyp_name, emb.baujahr_von`,
        [req.params.id]
      ),
      pool.query(
        `SELECT emn.maschinentyp_id, mt.maschinentyp_name, emn.maschinennummer_von, emn.maschinennummer_bis, emn.bemerkung_nummer
         FROM ersatzteile_maschinentyp_nummer emn
         JOIN maschinentyp mt ON emn.maschinentyp_id = mt.maschinentyp_id
         WHERE emn.artikelnr = $1
         ORDER BY mt.maschinentyp_name, emn.maschinennummer_von`,
        [req.params.id]
      )
    ]);

    if (!part.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });

    res.json({
      ...part.rows[0],
      sub_parts: subParts.rows,
      kompatibilitaet_baujahr: kompBaujahr.rows,
      kompatibilitaet_nummer: kompNummer.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ersatzteile
router.post('/', async (req, res) => {
  try {
    const {
      bezeichnung, zusätzliche_bezeichnungen, baugruppe_artikelnr,
      zusatzinfos, bemerkung_ersatzteil
    } = req.body;

    if (!bezeichnung?.trim()) {
      return res.status(400).json({ error: 'bezeichnung ist erforderlich' });
    }

    const result = await pool.query(
      `INSERT INTO ersatzteile
         (bezeichnung, zusätzliche_bezeichnungen, baugruppe_artikelnr, zusatzinfos, bemerkung_ersatzteil)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        bezeichnung.trim(),
        zusätzliche_bezeichnungen || null,
        baugruppe_artikelnr || null,
        zusatzinfos || null,
        bemerkung_ersatzteil || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ersatzteile/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      bezeichnung, zusätzliche_bezeichnungen, baugruppe_artikelnr,
      zusatzinfos, bemerkung_ersatzteil
    } = req.body;

    const result = await pool.query(
      `UPDATE ersatzteile SET
         bezeichnung=$1, zusätzliche_bezeichnungen=$2, baugruppe_artikelnr=$3,
         zusatzinfos=$4, bemerkung_ersatzteil=$5, updated_at=NOW()
       WHERE artikelnr=$6
       RETURNING *`,
      [
        bezeichnung,
        zusätzliche_bezeichnungen || null,
        baugruppe_artikelnr || null,
        zusatzinfos || null,
        bemerkung_ersatzteil || null,
        req.params.id
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ersatzteile/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM ersatzteile WHERE artikelnr=$1 RETURNING artikelnr',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ersatzteile/:id/custom-fields
router.get('/:id/custom-fields', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT field_key, field_value FROM ersatzteile_custom_fields WHERE artikelnr = $1',
      [req.params.id]
    );
    const fields = {};
    result.rows.forEach(r => { fields[r.field_key] = r.field_value; });
    res.json(fields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ersatzteile/:id/custom-fields
router.put('/:id/custom-fields', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(req.body)) {
      if (value === null || value === '') {
        await client.query(
          'DELETE FROM ersatzteile_custom_fields WHERE artikelnr=$1 AND field_key=$2',
          [req.params.id, key]
        );
      } else {
        await client.query(
          `INSERT INTO ersatzteile_custom_fields (artikelnr, field_key, field_value)
           VALUES ($1,$2,$3)
           ON CONFLICT (artikelnr, field_key) DO UPDATE SET field_value=EXCLUDED.field_value`,
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

// GET /api/ersatzteile/:id/kompatibilitaet-baujahr
router.get('/:id/kompatibilitaet-baujahr', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT emb.maschinentyp_id, mt.maschinentyp_name, emb.baujahr_von, emb.baujahr_bis, emb.bemerkung_baujahr
       FROM ersatzteile_maschinentyp_baujahr emb
       JOIN maschinentyp mt ON emb.maschinentyp_id = mt.maschinentyp_id
       WHERE emb.artikelnr = $1
       ORDER BY mt.maschinentyp_name, emb.baujahr_von`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ersatzteile/:id/kompatibilitaet-nummer
router.get('/:id/kompatibilitaet-nummer', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT emn.maschinentyp_id, mt.maschinentyp_name, emn.maschinennummer_von, emn.maschinennummer_bis, emn.bemerkung_nummer
       FROM ersatzteile_maschinentyp_nummer emn
       JOIN maschinentyp mt ON emn.maschinentyp_id = mt.maschinentyp_id
       WHERE emn.artikelnr = $1
       ORDER BY mt.maschinentyp_name, emn.maschinennummer_von`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ersatzteile/:id/kompatibilitaet-baujahr
router.post('/:id/kompatibilitaet-baujahr', async (req, res) => {
  try {
    const { maschinentyp_id, baujahr_von, baujahr_bis, bemerkung_baujahr } = req.body;
    const result = await pool.query(
      `INSERT INTO ersatzteile_maschinentyp_baujahr
         (artikelnr, maschinentyp_id, baujahr_von, baujahr_bis, bemerkung_baujahr)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (artikelnr, maschinentyp_id, baujahr_von, baujahr_bis) DO UPDATE
         SET bemerkung_baujahr = EXCLUDED.bemerkung_baujahr
       RETURNING *`,
      [req.params.id, maschinentyp_id, baujahr_von || null, baujahr_bis || null, bemerkung_baujahr || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ersatzteile/:id/kompatibilitaet-baujahr
router.delete('/:id/kompatibilitaet-baujahr', async (req, res) => {
  try {
    const { maschinentyp_id, baujahr_von, baujahr_bis } = req.body;
    await pool.query(
      `DELETE FROM ersatzteile_maschinentyp_baujahr
       WHERE artikelnr=$1 AND maschinentyp_id=$2 AND baujahr_von=$3 AND baujahr_bis=$4`,
      [req.params.id, maschinentyp_id, baujahr_von, baujahr_bis]
    );
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ersatzteile/:id/kompatibilitaet-nummer
router.post('/:id/kompatibilitaet-nummer', async (req, res) => {
  try {
    const { maschinentyp_id, maschinennummer_von, maschinennummer_bis, bemerkung_nummer } = req.body;
    const result = await pool.query(
      `INSERT INTO ersatzteile_maschinentyp_nummer
         (artikelnr, maschinentyp_id, maschinennummer_von, maschinennummer_bis, bemerkung_nummer)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (artikelnr, maschinentyp_id, maschinennummer_von, maschinennummer_bis) DO UPDATE
         SET bemerkung_nummer = EXCLUDED.bemerkung_nummer
       RETURNING *`,
      [req.params.id, maschinentyp_id, maschinennummer_von || null, maschinennummer_bis || null, bemerkung_nummer || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ersatzteile/:id/kompatibilitaet-nummer
router.delete('/:id/kompatibilitaet-nummer', async (req, res) => {
  try {
    const { maschinentyp_id, maschinennummer_von, maschinennummer_bis } = req.body;
    await pool.query(
      `DELETE FROM ersatzteile_maschinentyp_nummer
       WHERE artikelnr=$1 AND maschinentyp_id=$2 AND maschinennummer_von=$3 AND maschinennummer_bis=$4`,
      [req.params.id, maschinentyp_id, maschinennummer_von, maschinennummer_bis]
    );
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
