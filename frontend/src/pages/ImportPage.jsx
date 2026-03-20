import React, { useState, useRef } from 'react';
import { api } from '../utils/api';

const ENTITIES = [
  { value: 'kunden', label: 'Kunden' },
  { value: 'maschinen', label: 'Maschinen' },
  { value: 'ersatzteile', label: 'Ersatzteile' },
  { value: 'ansprechpartner', label: 'Ansprechpartner' },
];

const STEPS = ['Datei hochladen', 'Spalten zuordnen', 'Vorschau', 'Import'];

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
}

function autoMap(csvColumns, fields) {
  const mapping = {};
  for (const col of csvColumns) {
    const normCol = normalize(col);
    const match = fields.find(f => normalize(f.key) === normCol || normalize(f.label) === normCol);
    mapping[col] = match ? match.key : '_skip';
  }
  return mapping;
}

export default function ImportPage() {
  const [step, setStep] = useState(0);
  const [entityType, setEntityType] = useState('kunden');
  const [fields, setFields] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  // Step 1: Upload
  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const [fieldDef, result] = await Promise.all([
        api.getImportFields(entityType),
        api.uploadImportFile(file),
      ]);
      setFields(fieldDef.fields);
      setUploadResult(result);
      setMapping(autoMap(result.columns, fieldDef.fields));
      setStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // Step 2: Mapping -> Preview
  const runPreview = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.previewImport({
        uploadId: uploadResult.uploadId,
        entityType,
        mapping,
      });
      setPreview(result);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Execute
  const runImport = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.executeImport({
        uploadId: uploadResult.uploadId,
        entityType,
        mapping,
        skipDuplicates,
      });
      setImportResult(result);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setUploadResult(null);
    setMapping({});
    setPreview(null);
    setImportResult(null);
    setError('');
  };

  const activeMappings = Object.entries(mapping).filter(([, v]) => v && v !== '_skip');
  const requiredFields = fields.filter(f => f.required);
  const mappedKeys = activeMappings.map(([, v]) => v);
  const missingRequired = requiredFields.filter(f => !mappedKeys.includes(f.key));

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Daten-Import</div>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: i === step ? 600 : 400,
            background: i === step ? 'rgba(59,130,246,0.15)' : i < step ? 'rgba(16,185,129,0.1)' : 'var(--surface)',
            color: i === step ? 'var(--accent)' : i < step ? '#10b981' : 'var(--text-muted)',
            border: `1px solid ${i === step ? 'var(--accent)' : 'var(--border)'}`,
          }}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {/* STEP 0: Upload */}
      {step === 0 && (
        <div className="card">
          <div className="card-title">Datei und Entity-Typ wählen</div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Was importieren?</label>
            <select className="form-control" value={entityType} onChange={e => setEntityType(e.target.value)} style={{ maxWidth: 300 }}>
              {ENTITIES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, padding: 40, textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(59,130,246,0.05)' : 'transparent',
              transition: 'all 0.2s',
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>&#128196;</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>CSV oder Excel-Datei hierher ziehen</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>oder klicken zum Auswählen</div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" hidden onChange={e => handleFile(e.target.files[0])} />
          </div>
          {loading && <div style={{ marginTop: 12, textAlign: 'center' }}><div className="spinner" /> Datei wird verarbeitet...</div>}
        </div>
      )}

      {/* STEP 1: Column Mapping */}
      {step === 1 && uploadResult && (
        <div className="card">
          <div className="card-title">
            Spalten zuordnen
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              {uploadResult.totalRows} Zeilen in Datei
            </span>
          </div>
          {missingRequired.length > 0 && (
            <div className="error-banner" style={{ marginBottom: 12, fontSize: 12 }}>
              Pflichtfelder nicht zugeordnet: {missingRequired.map(f => f.label).join(', ')}
            </div>
          )}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>CSV-Spalte</th>
                  <th>Beispielwert</th>
                  <th>Zuordnung</th>
                </tr>
              </thead>
              <tbody>
                {uploadResult.columns.map(col => (
                  <tr key={col}>
                    <td style={{ fontWeight: 500 }}>{col}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {uploadResult.preview[0]?.[col] ?? ''}
                    </td>
                    <td>
                      <select
                        className="form-control"
                        value={mapping[col] || '_skip'}
                        onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value }))}
                        style={{ height: 32, maxWidth: 280 }}
                      >
                        <option value="_skip">-- Nicht importieren --</option>
                        {fields.map(f => (
                          <option key={f.key} value={f.key}>
                            {f.label}{f.required ? ' *' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => { setStep(0); setUploadResult(null); }}>Zurück</button>
            <button className="btn btn-primary" disabled={missingRequired.length > 0 || loading} onClick={runPreview}>
              {loading ? 'Lade Vorschau...' : 'Vorschau'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Preview */}
      {step === 2 && preview && (
        <div className="card">
          <div className="card-title">
            Vorschau
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              {preview.preview.length} von {preview.totalRows} Zeilen
            </span>
          </div>
          <div className="table-wrapper" style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  {activeMappings.map(([, dbField]) => {
                    const f = fields.find(ff => ff.key === dbField);
                    return <th key={dbField}>{f?.label || dbField}</th>;
                  })}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map(row => {
                  const hasErrors = row.errors.length > 0;
                  const hasDupes = row.duplicates.length > 0;
                  const highDupe = row.duplicates.some(d => d.score >= 80);
                  return (
                    <tr key={row.row} style={{ opacity: hasErrors ? 0.5 : 1 }}>
                      <td className="mono" style={{ fontSize: 11 }}>{row.row}</td>
                      {activeMappings.map(([, dbField]) => (
                        <td key={dbField} style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.data[dbField] ?? ''}
                        </td>
                      ))}
                      <td>
                        {hasErrors && (
                          <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 10 }}
                            title={row.errors.join('\n')}>
                            Fehler
                          </span>
                        )}
                        {!hasErrors && highDupe && (
                          <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 10 }}
                            title={row.duplicates.map(d => `${d.score}% – ${d.reasons?.join(', ')}`).join('\n')}>
                            Duplikat?
                          </span>
                        )}
                        {!hasErrors && hasDupes && !highDupe && (
                          <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', fontSize: 10 }}>
                            Hinweis
                          </span>
                        )}
                        {!hasErrors && !hasDupes && (
                          <span style={{ color: '#10b981', fontSize: 12 }}>OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} />
              Wahrscheinliche Duplikate überspringen (Score &ge; 80%)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Zurück</button>
            <button className="btn btn-primary" disabled={loading} onClick={runImport}>
              {loading ? 'Importiere...' : `${preview.totalRows} Zeilen importieren`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Result */}
      {step === 3 && importResult && (
        <div className="card">
          <div className="card-title">Import abgeschlossen</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ padding: 16, background: 'rgba(16,185,129,0.1)', borderRadius: 8, flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{importResult.imported}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Importiert</div>
            </div>
            <div style={{ padding: 16, background: 'rgba(245,158,11,0.1)', borderRadius: 8, flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{importResult.skipped}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Übersprungen</div>
            </div>
            <div style={{ padding: 16, background: 'rgba(100,116,139,0.1)', borderRadius: 8, flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-secondary)' }}>{importResult.total}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gesamt</div>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#ef4444' }}>Fehler ({importResult.errors.length})</div>
              <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 12 }}>
                {importResult.errors.slice(0, 50).map((e, i) => (
                  <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="mono" style={{ color: 'var(--text-muted)' }}>Zeile {e.row}:</span>{' '}
                    {e.error}
                  </div>
                ))}
                {importResult.errors.length > 50 && (
                  <div style={{ color: 'var(--text-muted)', padding: 4 }}>...und {importResult.errors.length - 50} weitere</div>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={reset}>Neuer Import</button>
            <button className="btn btn-secondary" onClick={() => window.location.href = `/${entityType}`}>
              Zur {ENTITIES.find(e => e.value === entityType)?.label}-Liste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
