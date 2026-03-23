const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

let client = null;

function getClient() {
  if (!client && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

function isEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ─── Load context data for AI prompts ────────────────────────────────────────

async function loadContext() {
  const [kategorien, kritikalitaeten, kunden, users] = await Promise.all([
    pool.query('SELECT kategorie_id, kategorie_name FROM kategorie ORDER BY kategorie_id'),
    pool.query('SELECT kritikalität_id AS id, kritikalität_name AS name, kritikalität_gewichtung AS gewichtung FROM kritikalität ORDER BY kritikalität_gewichtung'),
    pool.query(`SELECT k.kundennummer, k.name_kunde, k.matchcode,
                  COALESCE((SELECT string_agg(ke.email_adresse, ', ') FROM kunden_emails ke WHERE ke.kundennummer = k.kundennummer), '') AS emails
                FROM kunden k ORDER BY k.name_kunde`),
    pool.query(`SELECT u.user_id, COALESCE(u.display_name, u.username) AS name, r.name AS role
                FROM users u JOIN roles r ON u.role_id = r.role_id
                WHERE u.is_active = true AND r.name != 'admin'`),
  ]);
  return {
    kategorien: kategorien.rows,
    kritikalitaeten: kritikalitaeten.rows,
    kunden: kunden.rows,
    techniker: users.rows,
  };
}

// ─── Analyze incoming email ──────────────────────────────────────────────────

async function analyzeEmail({ fromEmail, fromName, subject, message }) {
  const ai = getClient();
  if (!ai) return null;

  const ctx = await loadContext();

  const prompt = `Du bist ein KI-Assistent für ein Service-Ticketing-System einer Maschinenbau-Firma.
Analysiere die folgende eingehende Email und mache Vorschläge für die Ticket-Erstellung.

VERFÜGBARE KATEGORIEN:
${ctx.kategorien.map(k => `- ID ${k.kategorie_id}: ${k.kategorie_name}`).join('\n')}

VERFÜGBARE KRITIKALITÄTEN:
${ctx.kritikalitaeten.map(k => `- ID ${k.id}: ${k.name} (Gewichtung: ${k.gewichtung})`).join('\n')}

VERFÜGBARE TECHNIKER:
${ctx.techniker.map(u => `- ID ${u.user_id}: ${u.name}`).join('\n')}

KUNDENSTAMM (Auszug):
${ctx.kunden.slice(0, 100).map(k => `- Nr. ${k.kundennummer}: ${k.name_kunde} (${k.matchcode}) [${k.emails}]`).join('\n')}

EMAIL:
Von: ${fromName} <${fromEmail}>
Betreff: ${subject || '(kein Betreff)'}
Inhalt:
${(message || '').slice(0, 3000)}

Antworte NUR mit einem JSON-Objekt (keine Erklärung, kein Markdown):
{
  "betreff": "Kurzer, prägnanter Ticket-Betreff (max 80 Zeichen)",
  "zusammenfassung": "1-2 Sätze Zusammenfassung des Problems",
  "kategorie_id": <ID oder null>,
  "kategorie_grund": "Warum diese Kategorie",
  "kritikalitaet_id": <ID oder null>,
  "kritikalitaet_grund": "Warum diese Priorität",
  "kunde_kundennummer": <Kundennummer oder null>,
  "kunde_grund": "Warum dieser Kunde (Email-Match, Name-Match, etc.)",
  "techniker_id": <User-ID oder null>,
  "techniker_grund": "Warum dieser Techniker",
  "antwort_vorschlag": "Vorgeschlagene Bestätigungs-Antwort an den Kunden (2-3 Sätze, professionell, deutsch)"
}`;

  try {
    const response = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text || '';
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]);
    return {
      betreff: result.betreff || null,
      zusammenfassung: result.zusammenfassung || null,
      kategorie_id: result.kategorie_id || null,
      kategorie_grund: result.kategorie_grund || null,
      kritikalitaet_id: result.kritikalitaet_id || null,
      kritikalitaet_grund: result.kritikalitaet_grund || null,
      kunde_kundennummer: result.kunde_kundennummer || null,
      kunde_grund: result.kunde_grund || null,
      techniker_id: result.techniker_id || null,
      techniker_grund: result.techniker_grund || null,
      antwort_vorschlag: result.antwort_vorschlag || null,
    };
  } catch (err) {
    console.error('[AI] analyzeEmail Fehler:', err.message);
    return null;
  }
}

// ─── Suggest reply for existing ticket ───────────────────────────────────────

async function suggestReply({ ticketnr }) {
  const ai = getClient();
  if (!ai) return null;

  try {
    const ticket = await pool.query(
      `SELECT t.ticketnr, t.erstellt_von, k.name_kunde,
              kr.kritikalität_name AS krit, ka.kategorie_name AS kat,
              s.status_name, m.maschinennr, mt.maschinentyp_name,
              ap.ansprechpartner_name AS ap_name
       FROM ticket t
       LEFT JOIN kunden k ON t.ticket_kundennummer = k.kundennummer
       LEFT JOIN kritikalität kr ON t.kritikalität_id = kr.kritikalität_id
       LEFT JOIN kategorie ka ON t.kategorie_id = ka.kategorie_id
       LEFT JOIN status s ON t.status_id = s.status_id
       LEFT JOIN maschine m ON t.ticket_maschinenid = m.maschinenid
       LEFT JOIN maschinentyp mt ON m.maschinentyp_id = mt.maschinentyp_id
       LEFT JOIN ansprechpartner ap ON t.ticket_ansprechpartnerid = ap.ansprechpartnerid
       WHERE t.ticketnr = $1`,
      [ticketnr]
    );
    if (ticket.rows.length === 0) return null;
    const t = ticket.rows[0];

    const messages = await pool.query(
      'SELECT from_name, message, message_type, is_internal, created_at FROM ticket_messages WHERE ticketnr = $1 ORDER BY created_at ASC LIMIT 20',
      [ticketnr]
    );

    const thread = messages.rows.map(m =>
      `[${m.message_type}${m.is_internal ? '/intern' : ''}] ${m.from_name}: ${(m.message || '').slice(0, 500)}`
    ).join('\n\n');

    const prompt = `Du bist ein Service-Techniker-Assistent. Schlage eine professionelle Antwort für dieses Ticket vor.

TICKET #${t.ticketnr}:
Kunde: ${t.name_kunde || 'Unbekannt'}
Ansprechpartner: ${t.ap_name || 'Unbekannt'}
Maschine: ${t.maschinennr || 'Keine'} ${t.maschinentyp_name ? `(${t.maschinentyp_name})` : ''}
Kategorie: ${t.kat || 'Keine'}
Kritikalität: ${t.krit || 'Keine'}
Status: ${t.status_name || 'Offen'}

BISHERIGE KOMMUNIKATION:
${thread || '(keine Nachrichten)'}

Schreibe eine professionelle Antwort auf Deutsch (2-5 Sätze). Beziehe dich auf den Kontext.
Antworte NUR mit dem Antworttext, keine Erklärung.`;

    const response = await ai.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    return { reply: response.content[0]?.text || null };
  } catch (err) {
    console.error('[AI] suggestReply Fehler:', err.message);
    return null;
  }
}

// ─── Summarize ticket thread ─────────────────────────────────────────────────

async function summarizeTicket({ ticketnr }) {
  const ai = getClient();
  if (!ai) return null;

  try {
    const messages = await pool.query(
      'SELECT from_name, message, message_type, is_internal, created_at FROM ticket_messages WHERE ticketnr = $1 ORDER BY created_at ASC LIMIT 30',
      [ticketnr]
    );

    if (messages.rows.length === 0) return null;

    const thread = messages.rows.map(m =>
      `[${new Date(m.created_at).toLocaleDateString('de-DE')} ${m.message_type}${m.is_internal ? '/intern' : ''}] ${m.from_name}: ${(m.message || '').slice(0, 500)}`
    ).join('\n\n');

    const prompt = `Fasse den folgenden Ticket-Verlauf in 2-4 Sätzen zusammen. Nenne die wichtigsten Punkte: Was ist das Problem, was wurde bisher getan, was ist der aktuelle Stand.

TICKET-VERLAUF:
${thread}

Antworte NUR mit der Zusammenfassung auf Deutsch, keine Überschrift.`;

    const response = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    return { summary: response.content[0]?.text || null };
  } catch (err) {
    console.error('[AI] summarizeTicket Fehler:', err.message);
    return null;
  }
}

// ─── Find similar open tickets ───────────────────────────────────────────────

async function findSimilarTickets({ subject, message }) {
  const ai = getClient();
  if (!ai) return null;

  try {
    const openTickets = await pool.query(
      `SELECT t.ticketnr, k.name_kunde,
              (SELECT m.message FROM ticket_messages m WHERE m.ticketnr = t.ticketnr ORDER BY m.created_at LIMIT 1) AS betreff
       FROM ticket t
       JOIN status s ON t.status_id = s.status_id
       LEFT JOIN kunden k ON t.ticket_kundennummer = k.kundennummer
       WHERE s.is_terminal = false
       ORDER BY t.erstellt_am DESC
       LIMIT 50`
    );

    if (openTickets.rows.length === 0) return { similar: [] };

    const ticketList = openTickets.rows.map(t =>
      `#${t.ticketnr}: ${t.name_kunde || 'Unbekannt'} — ${(t.betreff || '').split('\n')[0].slice(0, 80)}`
    ).join('\n');

    const prompt = `Vergleiche diese neue Anfrage mit den offenen Tickets und finde semantisch ähnliche (gleiches Problem, gleicher Kunde, ähnliches Thema).

NEUE ANFRAGE:
Betreff: ${subject || '(kein Betreff)'}
Inhalt: ${(message || '').slice(0, 1000)}

OFFENE TICKETS:
${ticketList}

Antworte NUR mit einem JSON-Array von Ticket-Nummern die ähnlich sind (max 5), z.B.: [1234, 5678]
Wenn keine ähnlich sind: []`;

    const response = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text || '[]';
    const match = text.match(/\[[\d\s,]*\]/);
    const similar = match ? JSON.parse(match[0]) : [];

    return { similar };
  } catch (err) {
    console.error('[AI] findSimilarTickets Fehler:', err.message);
    return { similar: [] };
  }
}

module.exports = {
  isEnabled,
  analyzeEmail,
  suggestReply,
  summarizeTicket,
  findSimilarTickets,
};
