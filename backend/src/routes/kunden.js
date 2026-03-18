const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/kunden?search=
router.get('/', async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE k.name_kunde ILIKE $1 OR k.ort ILIKE $1 OR k.matchcode ILIKE $1`;
    }
    const query = `
      SELECT
        k.kundennummer, k.matchcode, k.name_kunde, k.zusatz,
        k.straße, k.hausnr, k.plz, k.ort, k.land,
        k.bemerkung_kunde, k.created_at, k.updated_at,
        sp.service_priority_name,
        COUNT(DISTINCT t.ticketnr)::int AS ticket_anzahl,
        COUNT(DISTINCT t.ticketnr) FILTER (
          WHERE t.status_id IN (SELECT status_id FROM status WHERE is_terminal = false)
        )::int AS offene_tickets
      FROM kunden k
      LEFT JOIN service_priority sp ON k.service_priority_id = sp.service_priority_id
      LEFT JOIN ticket t ON t.ticket_kundennummer = k.kundennummer
      ${where}
      GROUP BY k.kundennummer, sp.service_priority_name
      ORDER BY k.name_kunde
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kunden/:id - full detail
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [kunde, emails, telefone, ansprechpartner, maschinen] = await Promise.all([
      pool.query(`
        SELECT k.*, sp.service_priority_name
        FROM kunden k
        LEFT JOIN service_priority sp ON k.service_priority_id = sp.service_priority_id
        WHERE k.kundennummer = $1
      `, [id]),
      pool.query(
        'SELECT email_adresse FROM kunden_emails WHERE kundennummer = $1 ORDER BY email_adresse',
        [id]
      ),
      pool.query(
        'SELECT telefonnummer FROM kunden_telefonnummern WHERE kundennummer = $1 ORDER BY telefonnummer',
        [id]
      ),
      pool.query(`
        SELECT
          ap.ansprechpartnerid, ap.ansprechpartner_name, ap.ansprechpartner_email,
          ap.ansprechpartner_telefon, ap.ansprechpartner_vertretungid,
          ap.abteilung_id, a.abteilung_name,
          ap.position_id, p.position_name,
          ap.created_at, ap.updated_at
        FROM ansprechpartner ap
        LEFT JOIN abteilung a ON ap.abteilung_id = a.abteilung_id
        LEFT JOIN position p ON ap.position_id = p.position_id
        WHERE ap.ansprechpartner_kundennr = $1
        ORDER BY ap.ansprechpartner_name
      `, [id]),
      pool.query(`
        SELECT DISTINCT m.maschinenid, m.maschinennr, m.baujahr, m.created_at, m.updated_at,
               mt.maschinentyp_id, mt.maschinentyp_name
        FROM maschine m
        JOIN maschinentyp mt ON m.maschinentyp_id = mt.maschinentyp_id
        JOIN ticket t ON t.ticket_maschinenid = m.maschinenid
        WHERE t.ticket_kundennummer = $1
        ORDER BY m.maschinennr
      `, [id])
    ]);

    if (kunde.rows.length === 0) return res.status(404).json({ error: 'Kunde nicht gefunden' });

    res.json({
      ...kunde.rows[0],
      emails: emails.rows.map(r => r.email_adresse),
      telefonnummern: telefone.rows.map(r => r.telefonnummer),
      ansprechpartner: ansprechpartner.rows,
      maschinen: maschinen.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kunden/:id/tickets
router.get('/:id/tickets', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT
        t.ticketnr, t.erstellt_am, t.geändert_am, t.created_at, t.updated_at,
        s.status_id, s.status_name, s.is_terminal,
        kr.kritikalität_id, kr.kritikalität_name AS kritikalitaet_name, kr.kritikalität_gewichtung,
        ka.kategorie_id, ka.kategorie_name,
        (
          SELECT tm.message
          FROM ticket_messages tm
          WHERE tm.ticketnr = t.ticketnr
          ORDER BY tm.created_at ASC
          LIMIT 1
        ) AS betreff
      FROM ticket t
      LEFT JOIN status s ON t.status_id = s.status_id
      LEFT JOIN kritikalität kr ON t.kritikalität_id = kr.kritikalität_id
      LEFT JOIN kategorie ka ON t.kategorie_id = ka.kategorie_id
      WHERE t.ticket_kundennummer = $1
      ORDER BY t.erstellt_am DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kunden
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      name_kunde, matchcode, zusatz, straße, hausnr, plz, ort, land,
      service_priority_id, bemerkung_kunde,
      emails = [],
      telefonnummern = []
    } = req.body;

    if (!name_kunde?.trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'name_kunde ist erforderlich' });
    }

    const kundeResult = await client.query(
      `INSERT INTO kunden
         (matchcode, name_kunde, zusatz, straße, hausnr, plz, ort, land, service_priority_id, bemerkung_kunde)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        matchcode || null, name_kunde.trim(), zusatz || null,
        straße || null, hausnr || null, plz || null,
        ort || null, land || 'Deutschland',
        service_priority_id || null, bemerkung_kunde || null
      ]
    );
    const kunde = kundeResult.rows[0];

    for (const email of emails) {
      const emailStr = typeof email === 'string' ? email : email.email_adresse || email.email;
      if (emailStr?.trim()) {
        await client.query(
          'INSERT INTO kunden_emails (kundennummer, email_adresse) VALUES ($1,$2)',
          [kunde.kundennummer, emailStr.trim()]
        );
      }
    }

    for (const tel of telefonnummern) {
      const telStr = typeof tel === 'string' ? tel : tel.telefonnummer || tel.telefon;
      if (telStr?.trim()) {
        await client.query(
          'INSERT INTO kunden_telefonnummern (kundennummer, telefonnummer) VALUES ($1,$2)',
          [kunde.kundennummer, telStr.trim()]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(kunde);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/kunden/:id
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  const { id } = req.params;
  try {
    await client.query('BEGIN');
    const {
      name_kunde, matchcode, zusatz, straße, hausnr, plz, ort, land,
      service_priority_id, bemerkung_kunde,
      emails, telefonnummern
    } = req.body;

    const result = await client.query(
      `UPDATE kunden SET
         matchcode=$1, name_kunde=$2, zusatz=$3, straße=$4, hausnr=$5,
         plz=$6, ort=$7, land=$8, service_priority_id=$9, bemerkung_kunde=$10,
         updated_at=NOW()
       WHERE kundennummer=$11
       RETURNING *`,
      [
        matchcode || null, name_kunde, zusatz || null, straße || null, hausnr || null,
        plz || null, ort || null, land || 'Deutschland',
        service_priority_id || null, bemerkung_kunde || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }

    if (emails !== undefined) {
      await client.query('DELETE FROM kunden_emails WHERE kundennummer=$1', [id]);
      for (const email of emails) {
        const emailStr = typeof email === 'string' ? email : email.email_adresse || email.email;
        if (emailStr?.trim()) {
          await client.query(
            'INSERT INTO kunden_emails (kundennummer, email_adresse) VALUES ($1,$2)',
            [id, emailStr.trim()]
          );
        }
      }
    }

    if (telefonnummern !== undefined) {
      await client.query('DELETE FROM kunden_telefonnummern WHERE kundennummer=$1', [id]);
      for (const tel of telefonnummern) {
        const telStr = typeof tel === 'string' ? tel : tel.telefonnummer || tel.telefon;
        if (telStr?.trim()) {
          await client.query(
            'INSERT INTO kunden_telefonnummern (kundennummer, telefonnummer) VALUES ($1,$2)',
            [id, telStr.trim()]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/kunden/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM kunden WHERE kundennummer=$1 RETURNING kundennummer',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Kunde nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kunden/:id/custom-fields
router.get('/:id/custom-fields', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT field_key, field_value FROM kunden_custom_fields WHERE kundennummer = $1',
      [req.params.id]
    );
    const fields = {};
    result.rows.forEach(r => { fields[r.field_key] = r.field_value; });
    res.json(fields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/kunden/:id/custom-fields
router.put('/:id/custom-fields', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(req.body)) {
      if (value === null || value === '') {
        await client.query(
          'DELETE FROM kunden_custom_fields WHERE kundennummer=$1 AND field_key=$2',
          [req.params.id, key]
        );
      } else {
        await client.query(
          `INSERT INTO kunden_custom_fields (kundennummer, field_key, field_value)
           VALUES ($1,$2,$3)
           ON CONFLICT (kundennummer, field_key) DO UPDATE SET field_value=EXCLUDED.field_value`,
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

// POST /api/kunden/:id/ansprechpartner
router.post('/:id/ansprechpartner', async (req, res) => {
  try {
    const {
      ansprechpartner_name, abteilung_id, position_id,
      ansprechpartner_email, ansprechpartner_telefon, ansprechpartner_vertretungid
    } = req.body;

    if (!abteilung_id || !position_id) {
      return res.status(400).json({ error: 'abteilung_id und position_id sind erforderlich' });
    }
    if (!ansprechpartner_name?.trim()) {
      return res.status(400).json({ error: 'ansprechpartner_name ist erforderlich' });
    }

    const result = await pool.query(
      `INSERT INTO ansprechpartner
         (ansprechpartner_kundennr, ansprechpartner_name, abteilung_id, position_id,
          ansprechpartner_email, ansprechpartner_telefon, ansprechpartner_vertretungid)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        req.params.id, ansprechpartner_name.trim(), abteilung_id, position_id,
        ansprechpartner_email || null, ansprechpartner_telefon || null,
        ansprechpartner_vertretungid || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/kunden/:id/ansprechpartner/:apId
router.put('/:id/ansprechpartner/:apId', async (req, res) => {
  try {
    const {
      ansprechpartner_name, abteilung_id, position_id,
      ansprechpartner_email, ansprechpartner_telefon, ansprechpartner_vertretungid
    } = req.body;

    const result = await pool.query(
      `UPDATE ansprechpartner SET
         ansprechpartner_name=$1, abteilung_id=$2, position_id=$3,
         ansprechpartner_email=$4, ansprechpartner_telefon=$5,
         ansprechpartner_vertretungid=$6, updated_at=NOW()
       WHERE ansprechpartnerid=$7 AND ansprechpartner_kundennr=$8
       RETURNING *`,
      [
        ansprechpartner_name, abteilung_id, position_id,
        ansprechpartner_email || null, ansprechpartner_telefon || null,
        ansprechpartner_vertretungid || null,
        req.params.apId, req.params.id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/kunden/:id/ansprechpartner/:apId
router.delete('/:id/ansprechpartner/:apId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM ansprechpartner WHERE ansprechpartnerid=$1 AND ansprechpartner_kundennr=$2',
      [req.params.apId, req.params.id]
    );
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kunden/match
router.post('/match', async (req, res) => {
  try {
    const { matchKunde } = require('../services/matchingService');
    const matches = await matchKunde(pool, req.body);
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
