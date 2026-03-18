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
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendConfirmationEmail(toEmail, ticket) {
  if (!process.env.SMTP_USER) return;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: `[${ticket.ticket_nummer}] Ihr Service-Ticket wurde erstellt`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #1e293b;">Service-Ticket erstellt</h2>
        <p>Ihr Ticket wurde erfolgreich erstellt.</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold;">Ticket-Nr.:</td><td style="padding: 8px;">${ticket.ticket_nummer}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Betreff:</td><td style="padding: 8px;">${ticket.betreff}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;">Offen</td></tr>
        </table>
        <p style="margin-top: 20px; color: #64748b; font-size: 12px;">
          Bitte antworten Sie nicht auf diese E-Mail. Für Rückfragen verwenden Sie die Ticket-Nummer als Betreff.
        </p>
      </div>
    `
  });
}

// ─── IMAP Email Polling ───────────────────────────────────────────────────────
function generateTicketNummer() {
  const now = new Date();
  return `TK-${now.getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
}

async function processIncomingEmail(parsed) {
  try {
    const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase();
    if (!fromAddress) return;

    const messageId = parsed.messageId;

    // Check duplicate
    const existing = await pool.query(
      'SELECT id FROM ticket WHERE email_message_id = $1',
      [messageId]
    );
    if (existing.rows.length > 0) return;

    // Match sender to Kunde via kunden_emails
    const kundeResult = await pool.query(
      `SELECT k.id AS kunden_id, k.name AS kunden_name
       FROM kunden_emails ke
       JOIN kunden k ON ke.kunden_id = k.id
       WHERE LOWER(ke.email) = $1`,
      [fromAddress]
    );

    const kunden_id = kundeResult.rows[0]?.kunden_id || null;

    // Get default status "Offen"
    const statusResult = await pool.query("SELECT id FROM status WHERE name='Offen' LIMIT 1");
    const status_id = statusResult.rows[0]?.id || null;

    const ticket_nummer = generateTicketNummer();
    const betreff = parsed.subject || '(Kein Betreff)';
    const beschreibung = parsed.text || parsed.html?.replace(/<[^>]+>/g, '') || '';

    const result = await pool.query(
      `INSERT INTO ticket (ticket_nummer, kunden_id, status_id, betreff, beschreibung,
        per_email_erstellt, email_message_id, erstellt_von)
       VALUES ($1,$2,$3,$4,$5,true,$6,$7) RETURNING *`,
      [ticket_nummer, kunden_id, status_id, betreff, beschreibung.slice(0, 5000), messageId, fromAddress]
    );

    console.log(`[Email] Ticket erstellt: ${ticket_nummer} von ${fromAddress}`);

    // Send confirmation if kunde found
    if (kunden_id) {
      try {
        await sendConfirmationEmail(fromAddress, result.rows[0]);
      } catch (e) {
        console.error('[Email] Bestätigung fehlgeschlagen:', e.message);
      }
    }
  } catch (err) {
    console.error('[Email] processIncomingEmail Fehler:', err.message);
  }
}

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
          if (parsed) await processIncomingEmail(parsed);
        });
      });
    });
    fetch.once('error', (e) => console.error('[IMAP] Fetch error:', e.message));
  });
}

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

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) { console.error('[IMAP] openBox Fehler:', err.message); return; }
        console.log('[Email] IMAP verbunden – polling alle 30s');
        fetchUnseen(imap);
        const interval = setInterval(() => fetchUnseen(imap), 30000);
        imap.once('end', () => {
          clearInterval(interval);
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

module.exports = { startEmailPolling, sendConfirmationEmail };
