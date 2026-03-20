'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const pool = require('../config/database');
const IMPORT_FIELDS = require('../config/importFields');
const { storeUpload, getUpload, removeUpload } = require('../services/uploadStore');
const { matchKunde, matchAnsprechpartner, matchMaschine } = require('../services/matchingService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/import/fields/:entityType
router.get('/fields/:entityType', (req, res) => {
  const def = IMPORT_FIELDS[req.params.entityType];
  if (!def) return res.status(400).json({ error: 'Unbekannter Entity-Typ' });
  res.json(def);
});

// POST /api/import/upload
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    let rows, columns;

    if (ext === 'csv' || ext === 'txt') {
      const text = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, ''); // BOM strip
      const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
      columns = result.meta.fields || [];
      rows = result.data;
    } else if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    } else {
      return res.status(400).json({ error: 'Nur CSV und Excel (.xlsx) werden unterstützt' });
    }

    if (rows.length === 0) return res.status(400).json({ error: 'Datei enthält keine Daten' });

    const uploadId = storeUpload(columns, rows);
    res.json({
      uploadId,
      columns,
      totalRows: rows.length,
      preview: rows.slice(0, 10),
    });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Parsen: ' + err.message });
  }
});

// ─── Reference Resolution ────────────────────────────────────────────────────

async function buildLookups() {
  const [sp, mt, abt, pos, kunden] = await Promise.all([
    pool.query('SELECT service_priority_id, service_priority_name FROM service_priority'),
    pool.query('SELECT maschinentyp_id, maschinentyp_name FROM maschinentyp'),
    pool.query('SELECT abteilung_id, abteilung_name FROM abteilung'),
    pool.query('SELECT position_id, position_name FROM position'),
    pool.query('SELECT kundennummer, name_kunde FROM kunden'),
  ]);
  const norm = s => (s || '').toLowerCase().trim();
  return {
    service_priority: new Map(sp.rows.map(r => [norm(r.service_priority_name), r.service_priority_id])),
    maschinentyp: new Map(mt.rows.map(r => [norm(r.maschinentyp_name), r.maschinentyp_id])),
    abteilung: new Map(abt.rows.map(r => [norm(r.abteilung_name), r.abteilung_id])),
    position: new Map(pos.rows.map(r => [norm(r.position_name), r.position_id])),
    kunden: new Map(kunden.rows.map(r => [norm(r.name_kunde), r.kundennummer])),
  };
}

function resolveRow(entityType, row, lookups) {
  const errors = [];
  const norm = s => (s || '').toLowerCase().trim();

  if (entityType === 'kunden' && row.service_priority_name) {
    const id = lookups.service_priority.get(norm(row.service_priority_name));
    if (id) { row.service_priority_id = id; } else { errors.push(`Service Priority '${row.service_priority_name}' nicht gefunden`); }
  }
  if (entityType === 'maschinen' && row.maschinentyp_name) {
    const id = lookups.maschinentyp.get(norm(row.maschinentyp_name));
    if (id) { row.maschinentyp_id = id; } else { errors.push(`Maschinentyp '${row.maschinentyp_name}' nicht gefunden`); }
  }
  if (entityType === 'ansprechpartner') {
    if (row.kunde_name) {
      const id = lookups.kunden.get(norm(row.kunde_name));
      if (id) { row.ansprechpartner_kundennr = id; } else { errors.push(`Kunde '${row.kunde_name}' nicht gefunden`); }
    }
    if (row.abteilung_name) {
      const id = lookups.abteilung.get(norm(row.abteilung_name));
      if (id) { row.abteilung_id = id; } else { errors.push(`Abteilung '${row.abteilung_name}' nicht gefunden`); }
    }
    if (row.position_name) {
      const id = lookups.position.get(norm(row.position_name));
      if (id) { row.position_id = id; } else { errors.push(`Position '${row.position_name}' nicht gefunden`); }
    }
  }
  return errors;
}

function validateRow(entityType, row) {
  const def = IMPORT_FIELDS[entityType];
  const missing = def.fields.filter(f => f.required && !row[f.key] && !row[f.key.replace('_name', '_id')]);
  return missing.map(f => `Pflichtfeld '${f.label}' fehlt`);
}

// ─── Insert Functions ────────────────────────────────────────────────────────

async function insertKunde(client, row) {
  const result = await client.query(
    `INSERT INTO kunden (matchcode, name_kunde, zusatz, "straße", hausnr, plz, ort, land, service_priority_id, bemerkung_kunde)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING kundennummer`,
    [row.matchcode || null, row.name_kunde, row.zusatz || null, row.straße || null, row.hausnr || null,
     row.plz || null, row.ort || null, row.land || null, row.service_priority_id || null, row.bemerkung_kunde || null]
  );
  const kundennummer = result.rows[0].kundennummer;
  if (row.emails) {
    const emails = String(row.emails).split(',').map(e => e.trim()).filter(Boolean);
    for (const email of emails) {
      await client.query('INSERT INTO kunden_emails (kundennummer, email_adresse) VALUES ($1, $2)', [kundennummer, email]);
    }
  }
  if (row.telefonnummern) {
    const tels = String(row.telefonnummern).split(',').map(t => t.trim()).filter(Boolean);
    for (const tel of tels) {
      await client.query('INSERT INTO kunden_telefonnummern (kundennummer, telefonnummer) VALUES ($1, $2)', [kundennummer, tel]);
    }
  }
  return kundennummer;
}

async function insertMaschine(client, row) {
  const result = await client.query(
    `INSERT INTO maschine (maschinennr, bezeichnung, maschinentyp_id, baujahr)
     VALUES ($1,$2,$3,$4) RETURNING maschinenid`,
    [row.maschinennr, row.bezeichnung || null, row.maschinentyp_id, row.baujahr || null]
  );
  return result.rows[0].maschinenid;
}

async function insertErsatzteil(client, row) {
  const result = await client.query(
    `INSERT INTO ersatzteile (bezeichnung, "zusätzliche_bezeichnungen", zusatzinfos, bemerkung_ersatzteil)
     VALUES ($1,$2,$3,$4) RETURNING artikelnr`,
    [row.bezeichnung, row['zusätzliche_bezeichnungen'] || null, row.zusatzinfos || null, row.bemerkung_ersatzteil || null]
  );
  return result.rows[0].artikelnr;
}

async function insertAnsprechpartner(client, row) {
  const result = await client.query(
    `INSERT INTO ansprechpartner (ansprechpartner_name, ansprechpartner_kundennr, abteilung_id, position_id, ansprechpartner_email, ansprechpartner_telefon)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING ansprechpartnerid`,
    [row.ansprechpartner_name, row.ansprechpartner_kundennr || null, row.abteilung_id || null,
     row.position_id || null, row.ansprechpartner_email || null, row.ansprechpartner_telefon || null]
  );
  return result.rows[0].ansprechpartnerid;
}

const inserters = { kunden: insertKunde, maschinen: insertMaschine, ersatzteile: insertErsatzteil, ansprechpartner: insertAnsprechpartner };

// ─── Duplicate Check ─────────────────────────────────────────────────────────

async function checkDuplicate(entityType, row) {
  try {
    if (entityType === 'kunden') {
      return await matchKunde(pool, { name_kunde: row.name_kunde, matchcode: row.matchcode, plz: row.plz, ort: row.ort, straße: row.straße, emails: row.emails ? String(row.emails).split(',').map(e => e.trim()) : [] });
    }
    if (entityType === 'maschinen') {
      return await matchMaschine(pool, { maschinennr: row.maschinennr });
    }
    if (entityType === 'ansprechpartner') {
      return await matchAnsprechpartner(pool, { name: row.ansprechpartner_name, email: row.ansprechpartner_email, telefon: row.ansprechpartner_telefon }, row.ansprechpartner_kundennr);
    }
  } catch { /* ignore */ }
  return [];
}

// POST /api/import/preview
router.post('/preview', async (req, res) => {
  try {
    const { uploadId, entityType, mapping } = req.body;
    if (!IMPORT_FIELDS[entityType]) return res.status(400).json({ error: 'Unbekannter Entity-Typ' });

    const data = getUpload(uploadId);
    if (!data) return res.status(404).json({ error: 'Upload abgelaufen – bitte erneut hochladen' });

    const lookups = await buildLookups();
    const previewRows = data.rows.slice(0, 20);
    const results = [];

    for (let i = 0; i < previewRows.length; i++) {
      const csvRow = previewRows[i];
      const mapped = {};
      for (const [csvCol, dbField] of Object.entries(mapping)) {
        if (dbField && dbField !== '_skip') mapped[dbField] = csvRow[csvCol];
      }

      const resolveErrors = resolveRow(entityType, mapped, lookups);
      const valErrors = validateRow(entityType, mapped);
      const duplicates = await checkDuplicate(entityType, mapped);

      results.push({
        row: i + 1,
        data: mapped,
        errors: [...resolveErrors, ...valErrors],
        duplicates,
      });
    }

    res.json({ preview: results, totalRows: data.totalRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/import/execute
router.post('/execute', async (req, res) => {
  const { uploadId, entityType, mapping, skipDuplicates } = req.body;
  if (!IMPORT_FIELDS[entityType]) return res.status(400).json({ error: 'Unbekannter Entity-Typ' });

  const data = getUpload(uploadId);
  if (!data) return res.status(404).json({ error: 'Upload abgelaufen – bitte erneut hochladen' });

  const lookups = await buildLookups();
  const insertFn = inserters[entityType];
  const client = await pool.connect();

  let imported = 0, skipped = 0;
  const errors = [];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < data.rows.length; i++) {
      const csvRow = data.rows[i];
      const mapped = {};
      for (const [csvCol, dbField] of Object.entries(mapping)) {
        if (dbField && dbField !== '_skip') mapped[dbField] = csvRow[csvCol];
      }

      const resolveErrors = resolveRow(entityType, mapped, lookups);
      const valErrors = validateRow(entityType, mapped);

      if (resolveErrors.length > 0 || valErrors.length > 0) {
        errors.push({ row: i + 1, error: [...resolveErrors, ...valErrors].join('; ') });
        skipped++;
        continue;
      }

      if (skipDuplicates) {
        const dupes = await checkDuplicate(entityType, mapped);
        if (dupes.some(d => d.score >= 80)) {
          skipped++;
          continue;
        }
      }

      try {
        await client.query('SAVEPOINT row_sp');
        await insertFn(client, mapped);
        await client.query('RELEASE SAVEPOINT row_sp');
        imported++;
      } catch (rowErr) {
        await client.query('ROLLBACK TO SAVEPOINT row_sp');
        errors.push({ row: i + 1, error: rowErr.message });
        skipped++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Import fehlgeschlagen: ' + err.message });
  } finally {
    client.release();
  }

  removeUpload(uploadId);
  res.json({ imported, skipped, errors, total: data.rows.length });
});

module.exports = router;
