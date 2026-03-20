const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const pool = require('../config/database');

// ─── SMTP Transport ───────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.GMAIL_USER || process.env.SMTP_USER,
    pass: process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS
  }
});

// ─── addMessageToTicket ───────────────────────────────────────────────────────
async function addMessageToTicket(ticketnr, fromEmail, fromName, messageText, messageType = 'email', attachments = []) {
  const ticketCheck = await pool.query('SELECT ticketnr FROM ticket WHERE ticketnr = $1', [ticketnr]);
  if (ticketCheck.rows.length === 0) {
    console.log(`⚠️  Ticket #${ticketnr} nicht gefunden – Nachricht ignoriert`);
    return null;
  }
  const result = await pool.query(
    `INSERT INTO ticket_messages (ticketnr, from_email, from_name, message, message_type, is_internal, created_at)
     VALUES ($1, $2, $3, $4, $5, false, NOW()) RETURNING *`,
    [ticketnr, fromEmail, fromName || fromEmail, messageText, messageType]
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
    from: `"Service" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: finalSubject,
    text: textBody,
    html: htmlBody,
    headers: {
      'References': `ticket-${ticketnr}@servicetool`,
      'X-Ticket-ID': String(ticketnr),
    }
  });
  await addMessageToTicket(ticketnr, process.env.GMAIL_USER, sentBy || 'Service', textBody || htmlBody, 'technician');
  console.log(`📤 Reply zu Ticket #${ticketnr} gesendet an ${toEmail}`);
  return info;
}

// ─── sendConfirmationEmail ────────────────────────────────────────────────────
async function sendConfirmationEmail(toEmail, ticket) {
  if (!process.env.GMAIL_USER && !process.env.SMTP_USER) return;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.GMAIL_USER || process.env.SMTP_USER,
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
        await addMessageToTicket(ticketnr, fromAddress, fromName, messageText.slice(0, 5000), 'email', attachments);
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
        await addMessageToTicket(ticketnr, fromAddress, fromName, messageText.slice(0, 5000), 'email', attachments);
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
          await addMessageToTicket(newTicketnr, fromAddress, fromName, messageText.slice(0, 5000), 'email', attachments);
          console.log(`📨 Email von ${fromAddress}: Match-Stufe 2b → neues Ticket #${newTicketnr}`);
          return;
        }
      }
    }

    // STUFE 3: Kein Match → in unmatched_emails speichern
    await pool.query(
      'INSERT INTO unmatched_emails (from_email, from_name, subject, message) VALUES ($1, $2, $3, $4)',
      [fromAddress, fromName, subject, messageText.slice(0, 5000)]
    );
    console.log(`📨 Email von ${fromAddress}: kein Match → unmatched_emails`);

  } catch (err) {
    console.error('[Email] processIncomingEmail Fehler:', err.message);
  }
}

// ─── IMAP Email Polling ───────────────────────────────────────────────────────
function fetchUnseen(imap) {
  imap.search(['UNSEEN'], (err, results) => {
    if (err || !results?.length) return;

    const fetch = imap.fetch(results, { bodies: '', markSeen: true });
    fetch.on('message', (msg) => {
      let buffer = '';
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
        stream.once('end', async () => {
          const parsed = await simpleParser(buffer).catch(() => null);
          if (parsed) await processIncomingEmail(parsed, buffer);
        });
      });
    });
    fetch.once('error', (e) => console.error('[IMAP] Fetch error:', e.message));
  });
}

let pollingInterval = null;
let imapConnection = null;

function startEmailPolling() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[Email] GMAIL_USER oder GMAIL_APP_PASSWORD nicht gesetzt – Email-Polling deaktiviert.');
    return;
  }

  const connectAndPoll = () => {
    const imap = new Imap({
      user: process.env.GMAIL_USER,
      password: process.env.GMAIL_APP_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
    imapConnection = imap;

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) { console.error('[IMAP] openBox Fehler:', err.message); return; }
        console.log('[Email] IMAP verbunden – polling alle 30s');
        fetchUnseen(imap);
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

module.exports = {
  addMessageToTicket,
  sendTicketReply,
  sendConfirmationEmail,
  startEmailPolling,
  stopEmailPolling,
  checkNewEmails
};
