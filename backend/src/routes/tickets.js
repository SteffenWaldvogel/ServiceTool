const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { sendConfirmationEmail } = require('../services/emailService');
const { createNotification, notifyUsersByRole, notifyHighPriority } = require('../services/notificationService');
const buildQuery = require('../utils/queryBuilder');

// Build a detailed notification message from a full ticket row
function buildTicketSummary(t) {
  const parts = [];
  if (t.kunden_name) parts.push(`Kunde: ${t.kunden_name}`);
  if (t.maschine_maschinennr) parts.push(`Maschine: ${t.maschine_maschinennr}${t.maschine_typ ? ` (${t.maschine_typ})` : ''}`);
  if (t.kategorie_name) parts.push(`Kategorie: ${t.kategorie_name}`);
  if (t.kritikalitaet_name) parts.push(`Kritikalität: ${t.kritikalitaet_name}`);
  if (t.status_name) parts.push(`Status: ${t.status_name}`);
  if (t.sla_priority_name) parts.push(`SLA: ${t.sla_priority_name}`);
  const betreff = t.betreff?.split('\n')[0]?.slice(0, 80);
  if (betreff) parts.push(`Betreff: ${betreff}`);
  return parts.join(' | ');
}

const TICKET_FILTERS = {
  status_id:           { type: 'in',        col: 't.status_id' },
  kategorie_id:        { type: 'in',        col: 't.kategorie_id' },
  kritikalitaet_id:    { type: 'in',        col: "t.\"kritikalität_id\"" },
  ticket_kundennummer: { type: 'exact',     col: 't.ticket_kundennummer' },
  kunden_id:           { type: 'exact',     col: 't.ticket_kundennummer' },
  ticket_maschinenid:  { type: 'exact',     col: 't.ticket_maschinenid' },
  erstellt_von:        { type: 'ilike',     col: 't.erstellt_von' },
  date_from:           { type: 'date_from', col: 't.erstellt_am' },
  date_to:             { type: 'date_to',   col: 't.erstellt_am' },
  is_terminal:         { type: 'boolean',   col: 's.is_terminal' },
  assigned_to:         { type: 'exact',     col: 't.assigned_to' },
};

const TICKET_SORTS = {
  default:       't.erstellt_am',
  created_at:    't.erstellt_am',
  kritikalitaet: "kr.\"kritikalität_gewichtung\"",
  status:        's.status_name',
  kunde:         'k.name_kunde',
  ticketnr:      't.ticketnr',
  geaendert_am:  "t.\"geändert_am\"",
  assigned:      'u.display_name',
};

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
    t.assigned_to,
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
    u.user_id AS assigned_user_id,
    u.username AS assigned_username,
    COALESCE(u.display_name, u.username) AS assigned_display_name,
    m.maschinennr AS maschine_maschinennr,
    mt.maschinentyp_name AS maschine_typ,
    ap.ansprechpartner_name AS ap_name,
    ap.ansprechpartner_email AS ap_email,
    k.service_priority_id,
    sp.service_priority_name AS sla_priority_name,
    sp.response_time_h       AS sla_response_time_h,
    t.parent_ticketnr,
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
  LEFT JOIN users u ON t.assigned_to = u.user_id
  LEFT JOIN service_priority sp ON k.service_priority_id = sp.service_priority_id
`;

// GET /api/tickets/unmatched
router.get('/unmatched', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM unmatched_emails ORDER BY received_at DESC LIMIT 100');
    // Attach attachment metadata (without content)
    for (const row of result.rows) {
      try {
        const atts = await pool.query(
          'SELECT id, filename, mime_type, size_bytes FROM unmatched_email_attachments WHERE unmatched_email_id = $1',
          [row.id]
        );
        row.attachments = atts.rows;
      } catch {
        row.attachments = [];
      }
    }
    res.json(result.rows);
  } catch (err) {
    if (err.code === '42P01') return res.json([]);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/unmatched/attachments/:attachmentId
router.get('/unmatched/attachments/:attachmentId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT filename, mime_type, content FROM unmatched_email_attachments WHERE id = $1',
      [req.params.attachmentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Anhang nicht gefunden' });
    const { filename, mime_type, content } = result.rows[0];
    res.set('Content-Type', mime_type || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/unmatched/:id/assign
router.post('/unmatched/:id/assign', async (req, res) => {
  try {
    const { ticketnr } = req.body;
    if (!ticketnr) return res.status(400).json({ error: 'ticketnr ist erforderlich' });

    const emailRow = await pool.query('SELECT * FROM unmatched_emails WHERE id = $1', [req.params.id]);
    if (emailRow.rows.length === 0) return res.status(404).json({ error: 'Email nicht gefunden' });

    // Fetch attachments before deleting the unmatched email
    const attRows = await pool.query(
      'SELECT filename, mime_type, size_bytes, content FROM unmatched_email_attachments WHERE unmatched_email_id = $1',
      [req.params.id]
    );
    const attachments = attRows.rows.map(a => ({
      filename: a.filename,
      contentType: a.mime_type,
      size: a.size_bytes,
      content: a.content,
    }));

    const { addMessageToTicket } = require('../services/emailService');
    const msg = await addMessageToTicket(ticketnr, emailRow.rows[0].from_email, emailRow.rows[0].from_name, emailRow.rows[0].message, 'email', attachments);
    if (!msg) return res.status(404).json({ error: 'Ticket nicht gefunden' });

    // CASCADE deletes unmatched_email_attachments too
    await pool.query('DELETE FROM unmatched_emails WHERE id = $1', [req.params.id]);
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tickets/unmatched/:id
router.delete('/unmatched/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM unmatched_emails WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Email nicht gefunden' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/attachments/:attachmentId – Download Anhang
router.get('/attachments/:attachmentId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT filename, mime_type, content FROM message_attachments WHERE id = $1',
      [req.params.attachmentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Anhang nicht gefunden' });
    const { filename, mime_type, content } = result.rows[0];
    res.set('Content-Type', mime_type || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tickets/bulk – Bulk-Update für mehrere Tickets
router.put('/bulk', async (req, res) => {
  const { ticketnrs, status_id, assigned_to } = req.body;
  if (!Array.isArray(ticketnrs) || ticketnrs.length === 0)
    return res.status(400).json({ error: 'ticketnrs ist erforderlich' });
  if (!status_id && assigned_to === undefined)
    return res.status(400).json({ error: 'Mindestens status_id oder assigned_to angeben' });

  try {
    const sets = [];
    const params = [];

    if (status_id) {
      params.push(status_id);
      sets.push(`status_id = $${params.length}`);
    }
    if (assigned_to !== undefined) {
      params.push(assigned_to);
      sets.push(`assigned_to = $${params.length}`);
    }

    const nrPlaceholders = ticketnrs.map((_, i) => `$${params.length + i + 1}`);
    ticketnrs.forEach(nr => params.push(nr));

    const result = await pool.query(
      `UPDATE ticket SET ${sets.join(', ')}
       WHERE ticketnr IN (${nrPlaceholders.join(',')})
       RETURNING ticketnr`,
      params
    );
    res.json({ updated: result.rowCount, ticketnrs: result.rows.map(r => r.ticketnr) });

    // Notifications for bulk assignment
    try {
      if (assigned_to) {
        for (const row of result.rows) {
          // Fetch full ticket data for detailed message
          const fullRow = await pool.query(`${TICKET_SELECT} WHERE t.ticketnr = $1`, [row.ticketnr]);
          const summary = fullRow.rows[0] ? buildTicketSummary(fullRow.rows[0]) : null;
          createNotification({
            userId: assigned_to,
            eventType: 'ticket_assigned',
            title: `Ticket #${row.ticketnr} zugewiesen`,
            message: summary,
            referenceType: 'ticket',
            referenceId: row.ticketnr
          });
        }
      }
    } catch (notifErr) {
      console.error('[Notification] Fehler bei Bulk-Update:', notifErr.message);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/export – gleiche Filter wie GET /, ohne Pagination, CSV-Output
router.get('/export', async (req, res) => {
  try {
    const { conditions, params } = buildQuery(req.query, TICKET_FILTERS, TICKET_SORTS);

    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      const p = params.length;
      conditions.push(`(
        k.name_kunde               ILIKE $${p}
        OR t.ticketnr::text        ILIKE $${p}
        OR m.maschinennr           ILIKE $${p}
        OR ap.ansprechpartner_name ILIKE $${p}
        OR EXISTS (
          SELECT 1 FROM ticket_messages tm
          WHERE tm.ticketnr = t.ticketnr AND tm.message ILIKE $${p}
        )
      )`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await pool.query(
      `${TICKET_SELECT} ${where} ORDER BY t.erstellt_am DESC LIMIT 5000`,
      params
    );

    const escape = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };

    const headers = [
      'Ticket-Nr.', 'Betreff', 'Kunde', 'Maschinennr.', 'Ansprechpartner',
      'Status', 'Kritikalität', 'Kategorie', 'Zugewiesen an',
      'Erstellt von', 'Erstellt am', 'Geändert am'
    ];

    const rows = result.rows.map(t => [
      t.ticketnr,
      t.betreff ? t.betreff.split('\n')[0] : '',
      t.kunden_name,
      t.maschine_maschinennr,
      t.ap_name,
      t.status_name,
      t.kritikalitaet_name,
      t.kategorie_name,
      t.assigned_display_name,
      t.erstellt_von,
      t.erstellt_am ? new Date(t.erstellt_am).toLocaleDateString('de-DE') : '',
      t.geändert_am ? new Date(t.geändert_am).toLocaleDateString('de-DE') : '',
    ].map(escape).join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tickets_${date}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets
router.get('/', async (req, res) => {
  try {
    const { conditions, params, orderBy, limit, offset } = buildQuery(req.query, TICKET_FILTERS, TICKET_SORTS);

    // Volltextsuche: Kunde, Ticket-Nr., Maschinennr., Ansprechpartner, Nachrichten
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      const p = params.length;
      conditions.push(`(
        k.name_kunde             ILIKE $${p}
        OR t.ticketnr::text      ILIKE $${p}
        OR m.maschinennr         ILIKE $${p}
        OR ap.ansprechpartner_name ILIKE $${p}
        OR EXISTS (
          SELECT 1 FROM ticket_messages tm
          WHERE tm.ticketnr = t.ticketnr
            AND tm.message ILIKE $${p}
        )
      )`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Count query (same WHERE, no ORDER/LIMIT)
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM ticket t
       LEFT JOIN status s ON t.status_id = s.status_id
       LEFT JOIN kunden k ON t.ticket_kundennummer = k.kundennummer
       LEFT JOIN kritikalität kr ON t.kritikalität_id = kr.kritikalität_id
       LEFT JOIN maschine m ON t.ticket_maschinenid = m.maschinenid
       LEFT JOIN ansprechpartner ap ON t.ticket_ansprechpartnerid = ap.ansprechpartnerid
       ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const query = `${TICKET_SELECT} ${where} ORDER BY ${orderBy} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
    const result = await pool.query(query, dataParams);

    res.json({ data: result.rows, total: countResult.rows[0].total });
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

    // Fetch all messages with attachment info
    const messages = await pool.query(
      `SELECT tm.message_id, tm.ticketnr, tm.from_email, tm.from_name, tm.message, tm.message_type, tm.is_internal, tm.created_at,
              COALESCE(
                (SELECT json_agg(json_build_object('id', ma.id, 'filename', ma.filename, 'mime_type', ma.mime_type, 'size_bytes', ma.size_bytes))
                 FROM message_attachments ma WHERE ma.message_id = tm.message_id),
                '[]'::json
              ) AS attachments
       FROM ticket_messages tm
       WHERE tm.ticketnr = $1
       ORDER BY tm.created_at ASC`,
      [req.params.id]
    );
    ticket.messages = messages.rows;

    // Fetch child tickets (Unter-Tickets) if this is an Überticket
    const children = await pool.query(
      `SELECT t.ticketnr, t.erstellt_am, t.status_id,
              s.status_name, s.is_terminal,
              k.name_kunde AS kunden_name,
              ap.ansprechpartner_name AS ap_name,
              m.maschinennr AS maschine_maschinennr,
              (SELECT tm.message FROM ticket_messages tm WHERE tm.ticketnr = t.ticketnr ORDER BY tm.created_at ASC LIMIT 1) AS betreff
       FROM ticket t
       LEFT JOIN status s ON t.status_id = s.status_id
       LEFT JOIN kunden k ON t.ticket_kundennummer = k.kundennummer
       LEFT JOIN ansprechpartner ap ON t.ticket_ansprechpartnerid = ap.ansprechpartnerid
       LEFT JOIN maschine m ON t.ticket_maschinenid = m.maschinenid
       WHERE t.parent_ticketnr = $1
       ORDER BY t.erstellt_am ASC`,
      [req.params.id]
    );
    ticket.child_tickets = children.rows;

    // Fetch messages from all child tickets for merged view
    if (children.rows.length > 0) {
      const childIds = children.rows.map(c => c.ticketnr);
      const childMessages = await pool.query(
        `SELECT message_id, ticketnr, from_email, from_name, message, message_type, is_internal, created_at
         FROM ticket_messages
         WHERE ticketnr = ANY($1)
         ORDER BY created_at ASC`,
        [childIds]
      );
      ticket.child_messages = childMessages.rows;
    } else {
      ticket.child_messages = [];
    }

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
      assigned_to = null,
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
          ticket_ansprechpartnerid, ticket_maschinenid, erstellt_von, assigned_to, erstellt_am)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       RETURNING *`,
      [
        kategorie_id,
        kritikalitaet_id,
        status_id,
        kundennummer,
        ticket_ansprechpartnerid || null,
        ticket_maschinenid || null,
        erstellt_von || null,
        assigned_to || null
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

    // Notifications (after response, non-blocking)
    try {
      const t = full.rows[0];
      const summary = buildTicketSummary(t);
      notifyUsersByRole('admin', {
        eventType: 'ticket_created',
        title: `Neues Ticket #${ticket.ticketnr}`,
        message: summary,
        referenceType: 'ticket',
        referenceId: ticket.ticketnr
      });
      if (assigned_to) {
        createNotification({
          userId: assigned_to,
          eventType: 'ticket_assigned',
          title: `Ticket #${ticket.ticketnr} zugewiesen`,
          message: summary,
          referenceType: 'ticket',
          referenceId: ticket.ticketnr
        });
      }
      // High priority notification
      const kritGewichtung = t?.kritikalitaet_gewichtung;
      if (kritGewichtung >= 3) {
        notifyHighPriority(
          ticket.ticketnr,
          `Hohe Priorität: Ticket #${ticket.ticketnr}`,
          summary,
          assigned_to || null
        );
      }
    } catch (notifErr) {
      console.error('[Notification] Fehler bei Ticket-Erstellung:', notifErr.message);
    }
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
      assigned_to,
    } = req.body;

    // Accept both spellings of kritikalität_id
    const kritikalitaet_id = req.body.kritikalitaet_id ?? req.body['kritikalität_id'] ?? null;

    const kundennummer = ticket_kundennummer || kunden_id || null;

    // Fetch old values for change detection
    const oldTicket = await pool.query(
      'SELECT assigned_to, status_id FROM ticket WHERE ticketnr = $1', [req.params.id]
    );
    const oldAssigned = oldTicket.rows[0]?.assigned_to;
    const oldStatus = oldTicket.rows[0]?.status_id;

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
         assigned_to=$9,
         geändert_am=NOW(),
         updated_at=NOW()
       WHERE ticketnr=$10
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
        assigned_to !== undefined ? (assigned_to || null) : null,
        req.params.id
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket nicht gefunden' });

    // Return full ticket with joined data
    const full = await pool.query(`${TICKET_SELECT} WHERE t.ticketnr = $1`, [req.params.id]);
    res.json(full.rows[0]);

    // Notifications (after response, non-blocking)
    const currentUserId = req.session?.user?.user_id;
    try {
      const ticketnr = parseInt(req.params.id);
      const newAssigned = assigned_to !== undefined ? (assigned_to || null) : null;

      const t = full.rows[0];
      const summary = buildTicketSummary(t);

      // Ticket assigned to someone new
      if (newAssigned && newAssigned !== oldAssigned) {
        createNotification({
          userId: newAssigned,
          eventType: 'ticket_assigned',
          title: `Ticket #${ticketnr} zugewiesen`,
          message: summary,
          referenceType: 'ticket',
          referenceId: ticketnr
        });
      }

      // Status changed — notify assignee (if not self)
      if (status_id && parseInt(status_id) !== oldStatus) {
        const finalAssigned = newAssigned || oldAssigned;
        if (finalAssigned && finalAssigned !== currentUserId) {
          createNotification({
            userId: finalAssigned,
            eventType: 'status_changed',
            title: `Ticket #${ticketnr}: Status → ${t?.status_name || 'geändert'}`,
            message: summary,
            referenceType: 'ticket',
            referenceId: ticketnr
          });
        }
      }
    } catch (notifErr) {
      console.error('[Notification] Fehler bei Ticket-Update:', notifErr.message);
    }
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
      `SELECT message_id, ticketnr, from_email, from_name, message, message_type, is_internal, created_at
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
    const { from_email, from_name, message, message_type = 'web', is_internal = false } = req.body;

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
      `INSERT INTO ticket_messages (ticketnr, from_email, from_name, message, message_type, is_internal)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        req.params.id,
        from_email || null,
        from_name || null,
        message.trim(),
        message_type,
        is_internal || false
      ]
    );

    // Update geändert_am on ticket
    await pool.query(
      'UPDATE ticket SET "geändert_am"=NOW(), updated_at=NOW() WHERE ticketnr=$1',
      [req.params.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/reply
router.post('/:id/reply', async (req, res) => {
  try {
    const { to_email, to_name, subject, message, sent_by } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message ist erforderlich' });

    const ticketCheck = await pool.query('SELECT ticketnr FROM ticket WHERE ticketnr = $1', [req.params.id]);
    if (ticketCheck.rows.length === 0) return res.status(404).json({ error: 'Ticket nicht gefunden' });

    const mailUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const mailPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    if (!mailUser || !mailPass) {
      // Email nicht konfiguriert – nur als Notiz speichern
      const result = await pool.query(
        `INSERT INTO ticket_messages (ticketnr, from_email, from_name, message, message_type, is_internal)
         VALUES ($1, $2, $3, $4, 'technician', false) RETURNING *`,
        [req.params.id, sent_by || 'Service', sent_by || 'Service', message.trim()]
      );
      await pool.query('UPDATE ticket SET updated_at=NOW(), "geändert_am"=NOW() WHERE ticketnr=$1', [req.params.id]);
      return res.status(503).json({
        error: 'Email nicht konfiguriert – Nachricht als Notiz gespeichert',
        message: result.rows[0]
      });
    }

    const { sendTicketReply } = require('../services/emailService');
    await sendTicketReply({
      ticketnr: parseInt(req.params.id),
      toEmail: to_email,
      toName: to_name,
      subject,
      textBody: message.trim(),
      sentBy: sent_by
    });

    // Gespeicherte Nachricht zurückgeben
    const lastMsg = await pool.query(
      `SELECT * FROM ticket_messages WHERE ticketnr = $1 AND message_type = 'technician' ORDER BY created_at DESC LIMIT 1`,
      [req.params.id]
    );
    res.status(201).json(lastMsg.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/link-message
router.post('/:id/link-message', async (req, res) => {
  try {
    const { message_id } = req.body;
    if (!message_id) return res.status(400).json({ error: 'message_id ist erforderlich' });

    const result = await pool.query(
      'UPDATE ticket_messages SET ticketnr = $1 WHERE message_id = $2 RETURNING *',
      [req.params.id, message_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nachricht nicht gefunden' });

    await pool.query('UPDATE ticket SET updated_at=NOW(), "geändert_am"=NOW() WHERE ticketnr=$1', [req.params.id]);

    res.json({ success: true, message: `Nachricht zu Ticket #${req.params.id} verschoben`, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Ticket-Verknüpfungen ────────────────────────────────────────────────────

// GET /api/tickets/:id/links
router.get('/:id/links', async (req, res) => {
  try {
    const ticketnr = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT tl.id, tl.link_type, tl.created_at,
              CASE WHEN tl.ticket_a = $1 THEN tl.ticket_b ELSE tl.ticket_a END AS linked_ticketnr,
              t.status_id, s.status_name, s.is_terminal,
              k.name_kunde AS kunden_name,
              (SELECT m.message FROM ticket_messages m WHERE m.ticketnr = t.ticketnr ORDER BY m.created_at LIMIT 1) AS betreff
       FROM ticket_links tl
       JOIN ticket t ON t.ticketnr = CASE WHEN tl.ticket_a = $1 THEN tl.ticket_b ELSE tl.ticket_a END
       LEFT JOIN status s ON s.status_id = t.status_id
       LEFT JOIN kunden k ON k.kundennummer = t.ticket_kundennummer
       WHERE tl.ticket_a = $1 OR tl.ticket_b = $1
       ORDER BY tl.created_at DESC`,
      [ticketnr]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/links
router.post('/:id/links', async (req, res) => {
  try {
    const ticketnr = parseInt(req.params.id);
    const { linked_ticketnr, link_type } = req.body;
    if (!linked_ticketnr) return res.status(400).json({ error: 'linked_ticketnr ist erforderlich' });
    if (ticketnr === parseInt(linked_ticketnr)) return res.status(400).json({ error: 'Ticket kann nicht mit sich selbst verknüpft werden' });

    // Ensure ticket_a < ticket_b for unique constraint
    const a = Math.min(ticketnr, parseInt(linked_ticketnr));
    const b = Math.max(ticketnr, parseInt(linked_ticketnr));

    const result = await pool.query(
      `INSERT INTO ticket_links (ticket_a, ticket_b, link_type)
       VALUES ($1, $2, $3) RETURNING *`,
      [a, b, link_type || 'related']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Verknüpfung existiert bereits' });
    if (err.code === '23503') return res.status(404).json({ error: 'Ticket nicht gefunden' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/merge – Ticket als Unter-Ticket zusammenführen
router.post('/:id/merge', async (req, res) => {
  try {
    const parentId = parseInt(req.params.id);
    const { child_ticketnr } = req.body;
    if (!child_ticketnr) return res.status(400).json({ error: 'child_ticketnr ist erforderlich' });
    const childId = parseInt(child_ticketnr);
    if (parentId === childId) return res.status(400).json({ error: 'Ticket kann nicht mit sich selbst zusammengeführt werden' });

    // Check both tickets exist
    const parentCheck = await pool.query('SELECT ticketnr FROM ticket WHERE ticketnr = $1', [parentId]);
    if (parentCheck.rows.length === 0) return res.status(404).json({ error: 'Überticket nicht gefunden' });

    const childCheck = await pool.query('SELECT ticketnr, parent_ticketnr FROM ticket WHERE ticketnr = $1', [childId]);
    if (childCheck.rows.length === 0) return res.status(404).json({ error: 'Unter-Ticket nicht gefunden' });
    if (childCheck.rows[0].parent_ticketnr) return res.status(400).json({ error: `Ticket #${childId} ist bereits Unter-Ticket von #${childCheck.rows[0].parent_ticketnr}` });

    // Prevent circular: parent can't be a child itself
    const circularCheck = await pool.query('SELECT parent_ticketnr FROM ticket WHERE ticketnr = $1', [parentId]);
    if (circularCheck.rows[0].parent_ticketnr) return res.status(400).json({ error: `Ticket #${parentId} ist selbst ein Unter-Ticket und kann kein Überticket sein` });

    await pool.query('UPDATE ticket SET parent_ticketnr = $1 WHERE ticketnr = $2', [parentId, childId]);
    await pool.query('UPDATE ticket SET updated_at = NOW(), "geändert_am" = NOW() WHERE ticketnr = $1', [parentId]);

    res.json({ ok: true, message: `Ticket #${childId} ist jetzt Unter-Ticket von #${parentId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/unmerge – Unter-Ticket wieder lösen
router.post('/:id/unmerge', async (req, res) => {
  try {
    const childId = parseInt(req.params.id);
    const result = await pool.query(
      'UPDATE ticket SET parent_ticketnr = NULL WHERE ticketnr = $1 RETURNING ticketnr',
      [childId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket nicht gefunden' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tickets/:id/links/:linkId
router.delete('/:id/links/:linkId', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ticket_links WHERE id = $1 RETURNING id', [req.params.linkId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Verknüpfung nicht gefunden' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
