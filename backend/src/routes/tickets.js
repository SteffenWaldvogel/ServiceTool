const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { sendConfirmationEmail } = require('../services/emailService');

// Shared SELECT base - first message as betreff via subquery
const TICKET_SELECT = `
  SELECT
    t.ticketnr,
    t.kategorie_id,
    t.kritikalität_id,
    t.status_id,
    t.ticket_kundennummer,
    t.ticket_ansprechpartnerid,
    t.ticket_maschinenid,
    t.erstellt_von,
    t.erstellt_am,
    t.geändert_von,
    t.geändert_am,
    t.created_at,
    t.updated_at,
    s.status_name,
    s.is_terminal,
    k.name_kunde AS kunden_name,
    kr.kritikalität_name AS kritikalitaet_name,
    kr.kritikalität_gewichtung AS kritikalitaet_gewichtung,
    ka.kategorie_name,
    m.maschinennr AS maschine_maschinennr,
    mt.maschinentyp_name AS maschine_typ,
    ap.ansprechpartner_name AS ap_name,
    ap.ansprechpartner_email AS ap_email,
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
  LEFT JOIN kategorie ka ON t.kategorie_id = ka.kategorie_id
  LEFT JOIN maschine m ON t.ticket_maschinenid = m.maschinenid
  LEFT JOIN maschinentyp mt ON m.maschinentyp_id = mt.maschinentyp_id
  LEFT JOIN ansprechpartner ap ON t.ticket_ansprechpartnerid = ap.ansprechpartnerid
`;

// GET /api/tickets
router.get('/', async (req, res) => {
  try {
    const {
      status_id, kritikalitaet_id, kategorie_id, kunden_id,
      search, limit = 100, offset = 0
    } = req.query;

    const conditions = [];
    const params = [];

    if (status_id) {
      params.push(status_id);
      conditions.push(`t.status_id = $${params.length}`);
    }
    if (kritikalitaet_id) {
      params.push(kritikalitaet_id);
      conditions.push(`t.kritikalität_id = $${params.length}`);
    }
    if (kategorie_id) {
      params.push(kategorie_id);
      conditions.push(`t.kategorie_id = $${params.length}`);
    }
    if (kunden_id) {
      params.push(kunden_id);
      conditions.push(`t.ticket_kundennummer = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const p = params.length;
      conditions.push(
        `(k.name_kunde ILIKE $${p} OR t.ticketnr::text ILIKE $${p} OR EXISTS (
          SELECT 1 FROM ticket_messages tm2
          WHERE tm2.ticketnr = t.ticketnr
          ORDER BY tm2.created_at ASC
          LIMIT 1
        ) AND (
          SELECT tm3.message FROM ticket_messages tm3
          WHERE tm3.ticketnr = t.ticketnr
          ORDER BY tm3.created_at ASC LIMIT 1
        ) ILIKE $${p})`
      );
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);
    const query = `${TICKET_SELECT} ${where} ORDER BY t.erstellt_am DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `${TICKET_SELECT} WHERE t.ticketnr = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket nicht gefunden' });

    const ticket = result.rows[0];

    // Fetch all messages
    const messages = await pool.query(
      `SELECT message_id, ticketnr, from_email, from_name, message, message_type, created_at
       FROM ticket_messages
       WHERE ticketnr = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    );
    ticket.messages = messages.rows;

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      kategorie_id,
      kritikalitaet_id,
      status_id,
      ticket_kundennummer,
      kunden_id, // alias for ticket_kundennummer
      ticket_ansprechpartnerid,
      ticket_maschinenid,
      betreff,
      beschreibung,
      erstellt_von,
      from_email,
      from_name,
      send_confirmation = false
    } = req.body;

    const kundennummer = ticket_kundennummer || kunden_id || null;

    if (!kategorie_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'kategorie_id ist erforderlich' });
    }
    if (!kritikalitaet_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'kritikalitaet_id ist erforderlich' });
    }
    if (!status_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'status_id ist erforderlich' });
    }
    if (!kundennummer) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ticket_kundennummer ist erforderlich' });
    }

    const ticketResult = await client.query(
      `INSERT INTO ticket
         (kategorie_id, kritikalität_id, status_id, ticket_kundennummer,
          ticket_ansprechpartnerid, ticket_maschinenid, erstellt_von, erstellt_am)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       RETURNING *`,
      [
        kategorie_id,
        kritikalitaet_id,
        status_id,
        kundennummer,
        ticket_ansprechpartnerid || null,
        ticket_maschinenid || null,
        erstellt_von || null
      ]
    );
    const ticket = ticketResult.rows[0];

    // Build message content from betreff + beschreibung
    let messageContent = betreff || '';
    if (beschreibung && beschreibung.trim()) {
      messageContent += '\n\n' + beschreibung.trim();
    }

    if (messageContent.trim()) {
      await client.query(
        `INSERT INTO ticket_messages (ticketnr, from_email, from_name, message, message_type)
         VALUES ($1,$2,$3,$4,'web')`,
        [
          ticket.ticketnr,
          from_email || null,
          from_name || erstellt_von || null,
          messageContent.trim()
        ]
      );
    }

    await client.query('COMMIT');

    // Optionally send confirmation email
    if (send_confirmation && kundennummer) {
      try {
        const kundeResult = await pool.query(
          `SELECT k.name_kunde, ke.email_adresse AS email
           FROM kunden k
           LEFT JOIN kunden_emails ke ON ke.kundennummer = k.kundennummer
           WHERE k.kundennummer = $1
           LIMIT 1`,
          [kundennummer]
        );
        if (kundeResult.rows.length > 0 && kundeResult.rows[0].email) {
          await sendConfirmationEmail(kundeResult.rows[0].email, { ...ticket, betreff });
        }
      } catch (emailErr) {
        console.error('Email confirmation failed:', emailErr.message);
      }
    }

    // Return full ticket with joined data
    const full = await pool.query(`${TICKET_SELECT} WHERE t.ticketnr = $1`, [ticket.ticketnr]);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/tickets/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      kategorie_id,
      status_id,
      ticket_kundennummer,
      kunden_id,
      ticket_ansprechpartnerid,
      ticket_maschinenid,
      erstellt_von,
      geändert_von,
    } = req.body;

    // Accept both spellings of kritikalität_id
    const kritikalitaet_id = req.body.kritikalitaet_id ?? req.body['kritikalität_id'] ?? null;

    const kundennummer = ticket_kundennummer || kunden_id || null;

    const result = await pool.query(
      `UPDATE ticket SET
         kategorie_id=$1,
         kritikalität_id=$2,
         status_id=$3,
         ticket_kundennummer=$4,
         ticket_ansprechpartnerid=$5,
         ticket_maschinenid=$6,
         erstellt_von=$7,
         geändert_von=$8,
         geändert_am=NOW(),
         updated_at=NOW()
       WHERE ticketnr=$9
       RETURNING *`,
      [
        kategorie_id || null,
        kritikalitaet_id || null,
        status_id || null,
        kundennummer,
        ticket_ansprechpartnerid || null,
        ticket_maschinenid || null,
        erstellt_von || null,
        geändert_von || null,
        req.params.id
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket nicht gefunden' });

    // Return full ticket with joined data
    const full = await pool.query(`${TICKET_SELECT} WHERE t.ticketnr = $1`, [req.params.id]);
    res.json(full.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tickets/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM ticket WHERE ticketnr=$1 RETURNING ticketnr',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket nicht gefunden' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id/custom-fields
router.get('/:id/custom-fields', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT field_key, field_value FROM ticket_custom_fields WHERE ticketnr = $1',
      [req.params.id]
    );
    const fields = {};
    result.rows.forEach(r => { fields[r.field_key] = r.field_value; });
    res.json(fields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tickets/:id/custom-fields
router.put('/:id/custom-fields', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(req.body)) {
      if (value === null || value === '') {
        await client.query(
          'DELETE FROM ticket_custom_fields WHERE ticketnr=$1 AND field_key=$2',
          [req.params.id, key]
        );
      } else {
        await client.query(
          `INSERT INTO ticket_custom_fields (ticketnr, field_key, field_value)
           VALUES ($1,$2,$3)
           ON CONFLICT (ticketnr, field_key) DO UPDATE SET field_value=EXCLUDED.field_value`,
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

// GET /api/tickets/:id/messages
router.get('/:id/messages', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT message_id, ticketnr, from_email, from_name, message, message_type, created_at
       FROM ticket_messages
       WHERE ticketnr = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/messages
router.post('/:id/messages', async (req, res) => {
  try {
    const { from_email, from_name, message, message_type = 'web' } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'message ist erforderlich' });
    }

    // Verify ticket exists
    const ticketCheck = await pool.query(
      'SELECT ticketnr FROM ticket WHERE ticketnr = $1',
      [req.params.id]
    );
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket nicht gefunden' });
    }

    const result = await pool.query(
      `INSERT INTO ticket_messages (ticketnr, from_email, from_name, message, message_type)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        req.params.id,
        from_email || null,
        from_name || null,
        message.trim(),
        message_type
      ]
    );

    // Update geändert_am on ticket
    await pool.query(
      'UPDATE ticket SET geändert_am=NOW(), updated_at=NOW() WHERE ticketnr=$1',
      [req.params.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
