const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const pool = require('../config/database');

// ─── SMTP Transport ───────────────────────────────────────────────────────────
const MAIL_USER = process.env.SMTP_USER || process.env.GMAIL_USER;
const MAIL_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS
  }
});

// ─── checkEmailAlreadyProcessed ──────────────────────────────────────────────
async function checkEmailAlreadyProcessed(emailMessageId, fromEmail, subject, messageDate) {
  // Primary: check by RFC Message-ID
  if (emailMessageId) {
    const r1 = await pool.query(
      'SELECT 1 FROM ticket_messages WHERE email_message_id = $1 LIMIT 1', [emailMessageId]
    );
    if (r1.rows.length > 0) return true;
    const r2 = await pool.query(
      'SELECT 1 FROM unmatched_emails WHERE email_message_id = $1 LIMIT 1', [emailMessageId]
    );
    if (r2.rows.length > 0) return true;
  }
  // Fallback: check by from + subject + date (within 1 minute window)
  if (fromEmail && messageDate) {
    const r3 = await pool.query(
      `SELECT 1 FROM ticket_messages
       WHERE from_email = $1 AND created_at BETWEEN $2::timestamptz - INTERVAL '1 minute' AND $2::timestamptz + INTERVAL '1 minute'
       LIMIT 1`,
      [fromEmail, messageDate]
    );
    if (r3.rows.length > 0) return true;
    const r4 = await pool.query(
      `SELECT 1 FROM unmatched_emails
       WHERE from_email = $1 AND COALESCE(subject,'') = COALESCE($2,'')
         AND received_at BETWEEN $3::timestamptz - INTERVAL '1 minute' AND $3::timestamptz + INTERVAL '1 minute'
       LIMIT 1`,
      [fromEmail, subject || '', messageDate]
    );
    if (r4.rows.length > 0) return true;
  }
  return false;
}

// ─── addMessageToTicket ───────────────────────────────────────────────────────
async function addMessageToTicket(ticketnr, fromEmail, fromName, messageText, messageType = 'email', attachments = [], emailMessageId = null) {
  const ticketCheck = await pool.query('SELECT ticketnr FROM ticket WHERE ticketnr = $1', [ticketnr]);
  if (ticketCheck.rows.length === 0) {
    console.log(`⚠️  Ticket #${ticketnr} nicht gefunden – Nachricht ignoriert`);
    return null;
  }
  const result = await pool.query(
    `INSERT INTO ticket_messages (ticketnr, from_email, from_name, message, message_type, is_internal, created_at, email_message_id)
     VALUES ($1, $2, $3, $4, $5, false, NOW(), $6) RETURNING *`,
    [ticketnr, fromEmail, fromName || fromEmail, messageText, messageType, emailMessageId]
  );
  const messageId = result.rows[0].message_id;

  // Save attachments
  for (const att of attachments) {
    try {
      await pool.query(
        `INSERT INTO message_attachments (message_id, filename, mime_type, size_bytes, content)
         VALUES ($1, $2, $3, $4, $5)`,
        [messageId, att.filename || 'attachment', att.contentType || 'application/octet-stream', att.size || 0, att.content]
      );
      console.log(`📎 Anhang gespeichert: ${att.filename} (${att.size} bytes)`);
    } catch (err) {
      console.error(`⚠️ Anhang-Fehler: ${err.message}`);
    }
  }

  await pool.query(`UPDATE ticket SET updated_at = NOW(), "geändert_am" = NOW() WHERE ticketnr = $1`, [ticketnr]);
  console.log(`✅ Nachricht zu Ticket #${ticketnr} gespeichert (${messageType}, ${attachments.length} Anhänge)`);
  return result.rows[0];
}

// ─── sendTicketReply ──────────────────────────────────────────────────────────
async function sendTicketReply({ ticketnr, toEmail, toName, subject, htmlBody, textBody, sentBy }) {
  const finalSubject = subject || `[Ticket #${ticketnr}] Rückmeldung vom Service`;
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Service" <${MAIL_USER}>`,
    to: toEmail,
    subject: finalSubject,
    text: textBody,
    html: htmlBody,
    headers: {
      'References': `ticket-${ticketnr}@servicetool`,
      'X-Ticket-ID': String(ticketnr),
    }
  });
  await addMessageToTicket(ticketnr, MAIL_USER, sentBy || 'Service', textBody || htmlBody, 'technician');
  console.log(`📤 Reply zu Ticket #${ticketnr} gesendet an ${toEmail}`);
  return info;
}

// ─── sendConfirmationEmail ────────────────────────────────────────────────────
async function sendConfirmationEmail(toEmail, ticket) {
  if (!MAIL_USER) return;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || MAIL_USER,
    to: toEmail,
    subject: `[Ticket #${ticket.ticketnr}] Ihr Service-Ticket wurde erstellt`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #1e293b;">Service-Ticket erstellt</h2>
        <p>Ihr Ticket wurde erfolgreich erstellt.</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold;">Ticket-Nr.:</td><td style="padding: 8px;">#${ticket.ticketnr}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;">Offen</td></tr>
        </table>
        <p style="margin-top: 20px; color: #64748b; font-size: 12px;">
          Bitte antworten Sie mit <strong>[Ticket #${ticket.ticketnr}]</strong> im Betreff für Rückfragen.
        </p>
      </div>
    `
  });
}

// ─── 4-stufiger Matching-Algorithmus ─────────────────────────────────────────
async function processIncomingEmail(parsed, rawText) {
  try {
    const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase();
    const fromName = parsed.from?.value?.[0]?.name || fromAddress;
    if (!fromAddress) return;

    const emailMessageId = parsed.messageId || null;
    const messageDate = parsed.date || null;

    // Dedup: skip if this email was already processed
    if (await checkEmailAlreadyProcessed(emailMessageId, fromAddress, parsed.subject, messageDate)) {
      return;
    }

    const subject = parsed.subject || '';
    const messageText = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]+>/g, '') : '') || '';

    // Extract attachments
    const attachments = (parsed.attachments || []).map(att => ({
      filename: att.filename || 'attachment',
      contentType: att.contentType || 'application/octet-stream',
      size: att.size || (att.content ? att.content.length : 0),
      content: att.content, // Buffer
    }));
    if (attachments.length > 0) {
      console.log(`📎 ${attachments.length} Anhänge gefunden: ${attachments.map(a => a.filename).join(', ')}`);
    }

    // STUFE 1: Ticket-Nummer im Betreff
    const ticketMatch = subject.match(/\[Ticket #(\d+)\]/i) || subject.match(/ticket[- #]+(\d+)/i);
    if (ticketMatch) {
      const ticketnr = parseInt(ticketMatch[1]);
      const termCheck = await pool.query(
        `SELECT t.ticketnr, s.is_terminal
         FROM ticket t
         JOIN status s ON t.status_id = s.status_id
         WHERE t.ticketnr = $1`,
        [ticketnr]
      );
      if (termCheck.rows.length > 0) {
        if (termCheck.rows[0].is_terminal) {
          console.log(`⚠️  Ticket #${ticketnr} ist abgeschlossen – speichere trotzdem`);
        }
        await addMessageToTicket(ticketnr, fromAddress, fromName, messageText.slice(0, 5000), 'email', attachments, emailMessageId);
        console.log(`📨 Email von ${fromAddress}: Match-Stufe 1 → Ticket #${ticketnr}`);
        return;
      }
    }

    // STUFE 2: Absender-Email gegen kunden_emails
    const kundeResult = await pool.query(
      `SELECT k.kundennummer FROM kunden k
       JOIN kunden_emails ke ON k.kundennummer = ke.kundennummer
       WHERE LOWER(ke.email_adresse) = LOWER($1)
       LIMIT 1`,
      [fromAddress]
    );

    if (kundeResult.rows.length > 0) {
      const kundennummer = kundeResult.rows[0].kundennummer;

      // Neuestes offenes Ticket dieses Kunden
      const openTicket = await pool.query(
        `SELECT t.ticketnr
         FROM ticket t
         JOIN status s ON t.status_id = s.status_id
         WHERE t.ticket_kundennummer = $1 AND s.is_terminal = false
         ORDER BY t.created_at DESC
         LIMIT 1`,
        [kundennummer]
      );

      if (openTicket.rows.length > 0) {
        const ticketnr = openTicket.rows[0].ticketnr;
        await addMessageToTicket(ticketnr, fromAddress, fromName, messageText.slice(0, 5000), 'email', attachments, emailMessageId);
        console.log(`📨 Email von ${fromAddress}: Match-Stufe 2 → Ticket #${ticketnr}`);
        return;
      } else {
        // Kein offenes Ticket → neues erstellen
        const statusResult = await pool.query("SELECT status_id FROM status WHERE status_name = 'Offen' LIMIT 1");
        const kritResult = await pool.query('SELECT kritikalität_id FROM kritikalität ORDER BY kritikalität_gewichtung ASC LIMIT 1');
        const katResult = await pool.query('SELECT kategorie_id FROM kategorie LIMIT 1');

        const status_id = statusResult.rows[0]?.status_id;
        const krit_id = kritResult.rows[0]?.['kritikalität_id'];
        const kat_id = katResult.rows[0]?.kategorie_id;

        if (status_id && krit_id && kat_id) {
          const ticketResult = await pool.query(
            `INSERT INTO ticket (kategorie_id, "kritikalität_id", status_id, ticket_kundennummer, erstellt_von, erstellt_am)
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING ticketnr`,
            [kat_id, krit_id, status_id, kundennummer, fromAddress]
          );
          const newTicketnr = ticketResult.rows[0].ticketnr;
          await addMessageToTicket(newTicketnr, fromAddress, fromName, messageText.slice(0, 5000), 'email', attachments, emailMessageId);
          console.log(`📨 Email von ${fromAddress}: Match-Stufe 2b → neues Ticket #${newTicketnr}`);
          return;
        }
      }
    }

    // STUFE 3: Kein Match → in unmatched_emails speichern
    const unmatchedResult = await pool.query(
      'INSERT INTO unmatched_emails (from_email, from_name, subject, message, email_message_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [fromAddress, fromName, subject, messageText.slice(0, 5000), emailMessageId]
    );
    const unmatchedId = unmatchedResult.rows[0].id;

    // Save attachments for unmatched email
    for (const att of attachments) {
      try {
        await pool.query(
          `INSERT INTO unmatched_email_attachments (unmatched_email_id, filename, mime_type, size_bytes, content)
           VALUES ($1, $2, $3, $4, $5)`,
          [unmatchedId, att.filename, att.contentType, att.size, att.content]
        );
        console.log(`📎 Unmatched-Anhang gespeichert: ${att.filename} (${att.size} bytes)`);
      } catch (attErr) {
        console.error(`⚠️ Unmatched-Anhang-Fehler: ${attErr.message}`);
      }
    }
    console.log(`📨 Email von ${fromAddress}: kein Match → unmatched_emails (${attachments.length} Anhänge)`);

    // AI analysis (non-blocking)
    try {
      const { isEnabled, analyzeEmail } = require('./aiService');
      if (isEnabled()) {
        const suggestion = await analyzeEmail({ fromEmail: fromAddress, fromName, subject, message: messageText });
        if (suggestion) {
          await pool.query(
            'UPDATE unmatched_emails SET ai_suggestion = $1 WHERE id = $2',
            [JSON.stringify(suggestion), unmatchedId]
          );
          console.log(`🤖 KI-Analyse gespeichert für unmatched email #${unmatchedId}`);
        }
      }
    } catch (aiErr) {
      console.error('[AI] Fehler bei Email-Analyse:', aiErr.message);
    }

    // Notify admins about unmatched email
    try {
      const { notifyUsersByRole } = require('./notificationService');
      notifyUsersByRole('admin', {
        eventType: 'unmatched_email',
        title: `Ungematchte Email von ${fromName || fromAddress}`,
        message: (subject || '(kein Betreff)').slice(0, 80),
        referenceType: 'unmatched_email',
        referenceId: null
      });
    } catch (notifErr) {
      console.error('[Notification] Fehler bei unmatched email:', notifErr.message);
    }

  } catch (err) {
    console.error('[Email] processIncomingEmail Fehler:', err.message);
  }
}

// ─── IMAP Email Polling ───────────────────────────────────────────────────────
function fetchBySearch(imap, criteria, markSeen) {
  imap.search(criteria, (err, results) => {
    if (err || !results?.length) return;

    const fetch = imap.fetch(results, { bodies: '', markSeen });
    fetch.on('message', (msg) => {
      const chunks = [];
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => { chunks.push(chunk); });
        stream.once('end', async () => {
          const fullBuffer = Buffer.concat(chunks);
          const parsed = await simpleParser(fullBuffer).catch(() => null);
          if (parsed) await processIncomingEmail(parsed, fullBuffer);
        });
      });
    });
    fetch.once('error', (e) => console.error('[IMAP] Fetch error:', e.message));
  });
}

function fetchUnseen(imap) {
  fetchBySearch(imap, ['UNSEEN'], true);
}

// Catch-up: fetch last 48h regardless of seen/unseen — dedup prevents duplicates
function fetchCatchUp(imap) {
  const since = new Date();
  since.setHours(since.getHours() - 48);
  console.log(`[Email] Catch-up: suche Emails seit ${since.toISOString()}...`);
  fetchBySearch(imap, [['SINCE', since]], false);
}

let pollingInterval = null;
let imapConnection = null;

function startEmailPolling() {
  const imapUser = process.env.IMAP_USER || process.env.SMTP_USER || process.env.GMAIL_USER;
  const imapPass = process.env.IMAP_PASS || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const imapHost = process.env.IMAP_HOST || 'imap.gmail.com';
  const imapPort = parseInt(process.env.IMAP_PORT || '993');

  if (!imapUser || !imapPass) {
    console.log('[Email] Keine IMAP-Zugangsdaten gesetzt – Email-Polling deaktiviert.');
    return;
  }

  const connectAndPoll = () => {
    const imap = new Imap({
      user: imapUser,
      password: imapPass,
      host: imapHost,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
    imapConnection = imap;

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) { console.error('[IMAP] openBox Fehler:', err.message); return; }
        console.log('[Email] IMAP verbunden – catch-up + polling alle 30s');
        fetchCatchUp(imap);
        pollingInterval = setInterval(() => fetchUnseen(imap), 30000);
        imap.once('end', () => {
          clearInterval(pollingInterval);
          pollingInterval = null;
          console.log('[Email] IMAP Verbindung getrennt – reconnect in 10s');
          setTimeout(connectAndPoll, 10000);
        });
      });
    });

    imap.once('error', (err) => {
      console.error('[IMAP] Verbindungsfehler:', err.message);
      setTimeout(connectAndPoll, 15000);
    });

    imap.connect();
  };

  connectAndPoll();
}

function stopEmailPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  if (imapConnection) {
    try { imapConnection.end(); } catch (e) {}
    imapConnection = null;
  }
}

async function checkNewEmails() {
  if (imapConnection) {
    fetchUnseen(imapConnection);
  }
}

async function fetchAllEmails() {
  if (imapConnection) {
    fetchBySearch(imapConnection, ['ALL'], false);
  }
}

module.exports = {
  addMessageToTicket,
  sendTicketReply,
  sendConfirmationEmail,
  startEmailPolling,
  stopEmailPolling,
  checkNewEmails,
  fetchAllEmails
};
