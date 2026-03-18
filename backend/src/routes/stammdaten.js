const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ── Helper: FK-violation check ──────────────────────────────────────────────
function isFkViolation(err) {
  return err.code === '23503';
}
function isUniqueViolation(err) {
  return err.code === '23505';
}

// ============================================================================
// SERVICE PRIORITY
// ============================================================================

// GET /api/stammdaten/service-priority
router.get('/service-priority', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT service_priority_id, service_priority_name, service_priority_beschreibung, priority_order FROM service_priority ORDER BY priority_order, service_priority_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stammdaten/service-priority
router.post('/service-priority', async (req, res) => {
  try {
    const { service_priority_name, service_priority_beschreibung, priority_order = 0 } = req.body;
    if (!service_priority_name?.trim()) return res.status(400).json({ error: 'service_priority_name ist erforderlich' });
    const result = await pool.query(
      `INSERT INTO service_priority (service_priority_name, service_priority_beschreibung, priority_order)
       VALUES ($1,$2,$3) RETURNING *`,
      [service_priority_name.trim(), service_priority_beschreibung || null, priority_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Service-Priorität existiert bereits' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stammdaten/service-priority/:id
router.put('/service-priority/:id', async (req, res) => {
  try {
    const { service_priority_name, service_priority_beschreibung, priority_order } = req.body;
    const result = await pool.query(
      `UPDATE service_priority SET
         service_priority_name=COALESCE($1, service_priority_name),
         service_priority_beschreibung=COALESCE($2, service_priority_beschreibung),
         priority_order=COALESCE($3, priority_order)
       WHERE service_priority_id=$4 RETURNING *`,
      [service_priority_name || null, service_priority_beschreibung || null, priority_order ?? null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Name bereits vergeben' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stammdaten/service-priority/:id
router.delete('/service-priority/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM service_priority WHERE service_priority_id=$1 RETURNING service_priority_id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    if (isFkViolation(err)) return res.status(409).json({ error: 'Service-Priorität wird noch von Kunden verwendet und kann nicht gelöscht werden' });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ABTEILUNGEN
// ============================================================================

// GET /api/stammdaten/abteilungen
router.get('/abteilungen', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT abteilung_id, abteilung_name, abteilung_beschreibung FROM abteilung ORDER BY abteilung_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stammdaten/abteilungen
router.post('/abteilungen', async (req, res) => {
  try {
    const { abteilung_name, abteilung_beschreibung } = req.body;
    if (!abteilung_name?.trim()) return res.status(400).json({ error: 'abteilung_name ist erforderlich' });
    const result = await pool.query(
      `INSERT INTO abteilung (abteilung_name, abteilung_beschreibung)
       VALUES ($1,$2) RETURNING *`,
      [abteilung_name.trim(), abteilung_beschreibung || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Abteilung existiert bereits' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stammdaten/abteilungen/:id
router.put('/abteilungen/:id', async (req, res) => {
  try {
    const { abteilung_name, abteilung_beschreibung } = req.body;
    const result = await pool.query(
      `UPDATE abteilung SET
         abteilung_name=COALESCE($1, abteilung_name),
         abteilung_beschreibung=COALESCE($2, abteilung_beschreibung)
       WHERE abteilung_id=$3 RETURNING *`,
      [abteilung_name || null, abteilung_beschreibung || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Name bereits vergeben' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stammdaten/abteilungen/:id
router.delete('/abteilungen/:id', async (req, res) => {
  try {
    // Check if used by positions
    const check = await pool.query('SELECT 1 FROM position WHERE abteilung_id=$1 LIMIT 1', [req.params.id]);
    if (check.rows.length) return res.status(409).json({ error: 'Abteilung hat noch Positionen und kann nicht gelöscht werden' });
    const result = await pool.query(
      'DELETE FROM abteilung WHERE abteilung_id=$1 RETURNING abteilung_id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    if (isFkViolation(err)) return res.status(409).json({ error: 'Abteilung wird noch verwendet und kann nicht gelöscht werden' });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// POSITIONEN
// ============================================================================

// GET /api/stammdaten/positionen
router.get('/positionen', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.position_id, p.position_name, p.abteilung_id, p.position_beschreibung,
             a.abteilung_name
      FROM position p
      LEFT JOIN abteilung a ON p.abteilung_id = a.abteilung_id
      ORDER BY a.abteilung_name, p.position_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stammdaten/positionen
router.post('/positionen', async (req, res) => {
  try {
    const { position_name, abteilung_id, position_beschreibung } = req.body;
    if (!position_name?.trim()) return res.status(400).json({ error: 'position_name ist erforderlich' });
    if (!abteilung_id) return res.status(400).json({ error: 'abteilung_id ist erforderlich' });
    const result = await pool.query(
      `INSERT INTO position (position_name, abteilung_id, position_beschreibung)
       VALUES ($1,$2,$3) RETURNING *`,
      [position_name.trim(), abteilung_id, position_beschreibung || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Position mit diesem Namen existiert bereits in dieser Abteilung' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stammdaten/positionen/:id
router.put('/positionen/:id', async (req, res) => {
  try {
    const { position_name, abteilung_id, position_beschreibung } = req.body;
    const result = await pool.query(
      `UPDATE position SET
         position_name=COALESCE($1, position_name),
         abteilung_id=COALESCE($2, abteilung_id),
         position_beschreibung=COALESCE($3, position_beschreibung)
       WHERE position_id=$4 RETURNING *`,
      [position_name || null, abteilung_id || null, position_beschreibung || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Name bereits vergeben in dieser Abteilung' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stammdaten/positionen/:id
router.delete('/positionen/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM position WHERE position_id=$1 RETURNING position_id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    if (isFkViolation(err)) return res.status(409).json({ error: 'Position wird noch von Ansprechpartnern verwendet und kann nicht gelöscht werden' });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// KATEGORIEN
// ============================================================================

// GET /api/stammdaten/kategorien
router.get('/kategorien', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT kategorie_id, kategorie_name, kategorie_beschreibung FROM kategorie ORDER BY kategorie_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stammdaten/kategorien
router.post('/kategorien', async (req, res) => {
  try {
    const { kategorie_name, kategorie_beschreibung } = req.body;
    if (!kategorie_name?.trim()) return res.status(400).json({ error: 'kategorie_name ist erforderlich' });
    const result = await pool.query(
      `INSERT INTO kategorie (kategorie_name, kategorie_beschreibung)
       VALUES ($1,$2) RETURNING *`,
      [kategorie_name.trim(), kategorie_beschreibung || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Kategorie existiert bereits' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stammdaten/kategorien/:id
router.put('/kategorien/:id', async (req, res) => {
  try {
    const { kategorie_name, kategorie_beschreibung } = req.body;
    const result = await pool.query(
      `UPDATE kategorie SET
         kategorie_name=COALESCE($1, kategorie_name),
         kategorie_beschreibung=COALESCE($2, kategorie_beschreibung)
       WHERE kategorie_id=$3 RETURNING *`,
      [kategorie_name || null, kategorie_beschreibung || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Name bereits vergeben' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stammdaten/kategorien/:id
router.delete('/kategorien/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM kategorie WHERE kategorie_id=$1 RETURNING kategorie_id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    if (isFkViolation(err)) return res.status(409).json({ error: 'Kategorie wird noch von Tickets verwendet und kann nicht gelöscht werden' });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// KRITIKALITÄT
// ============================================================================

// GET /api/stammdaten/kritikalitaet
router.get('/kritikalitaet', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT kritikalität_id, kritikalität_name, kritikalität_beschreibung, kritikalität_gewichtung
       FROM kritikalität ORDER BY kritikalität_gewichtung, kritikalität_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stammdaten/kritikalitaet
router.post('/kritikalitaet', async (req, res) => {
  try {
    const { kritikalität_name, kritikalität_beschreibung, kritikalität_gewichtung = 0 } = req.body;
    if (!kritikalität_name?.trim()) return res.status(400).json({ error: 'kritikalität_name ist erforderlich' });
    const result = await pool.query(
      `INSERT INTO kritikalität (kritikalität_name, kritikalität_beschreibung, kritikalität_gewichtung)
       VALUES ($1,$2,$3) RETURNING *`,
      [kritikalität_name.trim(), kritikalität_beschreibung || null, kritikalität_gewichtung]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Kritikalität existiert bereits' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stammdaten/kritikalitaet/:id
router.put('/kritikalitaet/:id', async (req, res) => {
  try {
    const { kritikalität_name, kritikalität_beschreibung, kritikalität_gewichtung } = req.body;
    const result = await pool.query(
      `UPDATE kritikalität SET
         kritikalität_name=COALESCE($1, kritikalität_name),
         kritikalität_beschreibung=COALESCE($2, kritikalität_beschreibung),
         kritikalität_gewichtung=COALESCE($3, kritikalität_gewichtung)
       WHERE kritikalität_id=$4 RETURNING *`,
      [kritikalität_name || null, kritikalität_beschreibung || null, kritikalität_gewichtung ?? null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Name bereits vergeben' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stammdaten/kritikalitaet/:id
router.delete('/kritikalitaet/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM kritikalität WHERE kritikalität_id=$1 RETURNING kritikalität_id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    if (isFkViolation(err)) return res.status(409).json({ error: 'Kritikalität wird noch von Tickets verwendet und kann nicht gelöscht werden' });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// STATUS
// ============================================================================

// GET /api/stammdaten/status
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT status_id, status_name, status_beschreibung, is_terminal FROM status ORDER BY status_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stammdaten/status
router.post('/status', async (req, res) => {
  try {
    const { status_name, status_beschreibung, is_terminal = false } = req.body;
    if (!status_name?.trim()) return res.status(400).json({ error: 'status_name ist erforderlich' });
    const result = await pool.query(
      `INSERT INTO status (status_name, status_beschreibung, is_terminal)
       VALUES ($1,$2,$3) RETURNING *`,
      [status_name.trim(), status_beschreibung || null, is_terminal]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Status existiert bereits' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stammdaten/status/:id
router.put('/status/:id', async (req, res) => {
  try {
    const { status_name, status_beschreibung, is_terminal } = req.body;
    const result = await pool.query(
      `UPDATE status SET
         status_name=COALESCE($1, status_name),
         status_beschreibung=COALESCE($2, status_beschreibung),
         is_terminal=COALESCE($3, is_terminal)
       WHERE status_id=$4 RETURNING *`,
      [status_name || null, status_beschreibung || null, is_terminal ?? null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Name bereits vergeben' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stammdaten/status/:id
router.delete('/status/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM status WHERE status_id=$1 RETURNING status_id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    if (isFkViolation(err)) return res.status(409).json({ error: 'Status wird noch von Tickets verwendet und kann nicht gelöscht werden' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
