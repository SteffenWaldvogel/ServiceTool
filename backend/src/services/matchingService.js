'use strict';

function levenshtein(a, b) {
  if (!a) return b?.length ?? 0;
  if (!b) return a.length;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function normalizeStr(s) {
  return s?.toLowerCase().trim()
    .replace(/[\s\-_.]+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    ?? '';
}

function wordOverlap(a, b) {
  const wa = new Set(normalizeStr(a).split(' ').filter(w => w.length > 2));
  const wb = new Set(normalizeStr(b).split(' ').filter(w => w.length > 2));
  let count = 0;
  for (const w of wa) if (wb.has(w)) count++;
  return count;
}

async function matchKunde(pool, data) {
  const { name_kunde, matchcode, plz, ort, straße, emails = [] } = data;
  const rows = await pool.query(`
    SELECT k.kundennummer, k.name_kunde, k.matchcode, k.plz, k.ort, k.straße,
           array_agg(ke.email_adresse) FILTER (WHERE ke.email_adresse IS NOT NULL) AS emails
    FROM kunden k
    LEFT JOIN kunden_emails ke ON ke.kundennummer = k.kundennummer
    GROUP BY k.kundennummer
  `);

  const matches = [];
  for (const row of rows.rows) {
    let score = 0;
    const reasons = [];
    const normName = normalizeStr(name_kunde);
    const rowNormName = normalizeStr(row.name_kunde);

    if (normName && rowNormName) {
      if (normName === rowNormName) { score += 90; reasons.push('Gleicher Name (exakt)'); }
      else if (levenshtein(normName, rowNormName) <= 2) { score += 70; reasons.push('Ähnlicher Name'); }
      else if (wordOverlap(name_kunde, row.name_kunde) >= 2) { score += 50; reasons.push('Überschneidende Wörter im Namen'); }
    }
    if (matchcode && row.matchcode && normalizeStr(matchcode) === normalizeStr(row.matchcode)) {
      score += 25; reasons.push('Gleicher Matchcode');
    }
    if (plz && row.plz && plz === row.plz) {
      if (ort && row.ort && normalizeStr(ort) === normalizeStr(row.ort)) {
        score += 40; reasons.push('Gleiche PLZ + Ort');
      } else {
        score += 30; reasons.push('Gleiche PLZ');
      }
    }
    if (straße && row.straße && normalizeStr(straße) === normalizeStr(row.straße)) {
      score += 20; reasons.push('Gleiche Straße');
    }
    const rowEmails = row.emails || [];
    for (const email of emails) {
      if (email && rowEmails.some(re => re?.toLowerCase() === email.toLowerCase())) {
        score += 60; reasons.push('Gleiche E-Mail-Adresse'); break;
      }
    }

    if (score >= 60) {
      matches.push({
        kundennummer: row.kundennummer,
        name_kunde: row.name_kunde,
        ort: row.ort,
        plz: row.plz,
        emails: rowEmails,
        score,
        level: score >= 80 ? 'warning' : 'hint',
        reasons,
      });
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

async function matchAnsprechpartner(pool, data, kundennummer) {
  const { name, email, telefon } = data;
  const rows = await pool.query(`
    SELECT ap.ansprechpartnerid, ap.ansprechpartner_name, ap.ansprechpartner_email,
           ap.ansprechpartner_telefon, ap.ansprechpartner_kundennr, k.name_kunde
    FROM ansprechpartner ap
    LEFT JOIN kunden k ON k.kundennummer = ap.ansprechpartner_kundennr
  `);

  const matches = [];
  for (const row of rows.rows) {
    let score = 0;
    const reasons = [];
    const sameKunde = String(row.ansprechpartner_kundennr) === String(kundennummer);
    const normName = normalizeStr(name);
    const rowNorm = normalizeStr(row.ansprechpartner_name);

    if (normName && rowNorm) {
      if (normName === rowNorm && sameKunde) { score += 90; reasons.push('Gleicher Name (selber Kunde)'); }
      else if (levenshtein(normName, rowNorm) <= 2 && sameKunde) { score += 70; reasons.push('Ähnlicher Name (selber Kunde)'); }
    }
    if (email && row.ansprechpartner_email) {
      if (email.toLowerCase() === row.ansprechpartner_email.toLowerCase()) {
        score += sameKunde ? 60 : 80;
        reasons.push('Gleiche E-Mail');
      }
    }
    if (telefon && row.ansprechpartner_telefon && telefon === row.ansprechpartner_telefon) {
      score += 30; reasons.push('Gleiche Telefonnummer');
    }

    if (score >= 60) {
      matches.push({
        ansprechpartnerid: row.ansprechpartnerid,
        name: row.ansprechpartner_name,
        email: row.ansprechpartner_email,
        kunde: row.name_kunde,
        score,
        level: score >= 80 ? 'warning' : 'hint',
        reasons,
      });
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

async function matchMaschine(pool, data) {
  const { maschinennr } = data;
  const rows = await pool.query('SELECT maschinenid, maschinennr FROM maschine');
  const normInput = normalizeStr(maschinennr);

  const matches = [];
  for (const row of rows.rows) {
    let score = 0;
    const reasons = [];
    const normRow = normalizeStr(row.maschinennr);

    if (maschinennr === row.maschinennr) { score += 100; reasons.push('Exakt gleiche Maschinennummer'); }
    else if (normInput === normRow) { score += 50; reasons.push('Normalisiert gleich (Leerzeichen/Bindestriche)'); }
    else if (levenshtein(normInput, normRow) <= 1) { score += 80; reasons.push('Sehr ähnliche Maschinennummer (1 Zeichen Unterschied)'); }

    if (score >= 60) {
      matches.push({ maschinenid: row.maschinenid, maschinennr: row.maschinennr, score, level: score >= 80 ? 'warning' : 'hint', reasons });
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}

module.exports = { matchKunde, matchAnsprechpartner, matchMaschine };
