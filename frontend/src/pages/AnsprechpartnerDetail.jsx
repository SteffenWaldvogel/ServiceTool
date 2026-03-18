import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';

function EditField({ label, value, onSave, type = 'text', options = [] }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setVal(value ?? ''); }, [value]);

  const save = async () => {
    setLoading(true);
    try {
      await onSave(val || null);
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="field-row">
      <div className="field-key">{label}</div>
      <div className="field-val" style={{ flex: 1 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {type === 'select' ? (
              <select className="form-control" style={{ flex: 1 }} value={val} onChange={e => setVal(e.target.value)}>
                <option value="">— Bitte wählen —</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input
                className="form-control"
                type={type}
                style={{ flex: 1 }}
                value={val}
                onChange={e => setVal(e.target.value)}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setVal(value ?? ''); } }}
              />
            )}
            <button className="btn btn-primary btn-sm" onClick={save} disabled={loading}>
              {loading ? '…' : '✓'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setVal(value ?? ''); }}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{value || <span className="text-muted">–</span>}</span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(true)} style={{ opacity: 0.5 }}>✎</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnsprechpartnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ap, setAp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [abteilungen, setAbteilungen] = useState([]);
  const [positionen, setPositionen] = useState([]);
  const [allAnsprechpartner, setAllAnsprechpartner] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.getAnsprechpartnerById(id)
      .then(data => {
        setAp(data);
        // Load positions for the current abteilung
        if (data.abteilung_id) {
          api.getPositionen(data.abteilung_id).then(setPositionen).catch(console.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    api.getAbteilungen().then(setAbteilungen).catch(console.error);
    api.getAnsprechpartner().then(setAllAnsprechpartner).catch(console.error);
  }, [load]);

  // Reload positions when abteilung changes
  useEffect(() => {
    if (ap?.abteilung_id) {
      api.getPositionen(ap.abteilung_id).then(setPositionen).catch(console.error);
    }
  }, [ap?.abteilung_id]);

  const updateField = async (fieldKey, value) => {
    await api.updateAnsprechpartnerStandalone(id, { [fieldKey]: value });
    await load();
  };

  const updateAbteilung = async (abteilungId) => {
    // When changing abteilung, clear position_id
    await api.updateAnsprechpartnerStandalone(id, { abteilung_id: abteilungId || null, position_id: null });
    if (abteilungId) {
      const pos = await api.getPositionen(abteilungId);
      setPositionen(pos);
    } else {
      setPositionen([]);
    }
    await load();
  };

  const deleteAp = async () => {
    if (!confirm(`Ansprechpartner "${ap.ansprechpartner_name}" wirklich löschen?`)) return;
    try {
      await api.deleteAnsprechpartnerStandalone(id);
      navigate('/ansprechpartner');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /> Lade…</div></div>;
  if (error) return <div className="page"><div className="error-banner">{error}</div></div>;
  if (!ap) return null;

  const abteilungOptions = abteilungen.map(a => ({ value: a.abteilung_id, label: a.abteilung_name }));
  const positionOptions = positionen.map(p => ({ value: p.position_id, label: p.position_name }));
  const vertretungOptions = allAnsprechpartner
    .filter(a => a.ansprechpartnerid !== parseInt(id))
    .map(a => ({ value: a.ansprechpartnerid, label: `${a.ansprechpartner_name}${a.name_kunde ? ` (${a.name_kunde})` : ''}` }));

  const formatDate = (ts) => ts
    ? new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '–';

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/ansprechpartner')}>
            ← Zurück
          </button>
          <div>
            <div className="page-title">{ap.ansprechpartner_name}</div>
            <div className="page-subtitle">
              Ansprechpartner #{ap.ansprechpartnerid}
              {ap.name_kunde && (
                <> · <Link to={`/kunden/${ap.ansprechpartner_kundennr}`} style={{ color: 'var(--accent)' }}>{ap.name_kunde}</Link></>
              )}
            </div>
          </div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={deleteAp}>Löschen</button>
      </div>

      <div className="detail-layout">
        {/* Main info */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Stammdaten</div>

            <EditField
              label="Name"
              value={ap.ansprechpartner_name}
              onSave={(val) => updateField('ansprechpartner_name', val)}
            />
            <EditField
              label="E-Mail"
              value={ap.ansprechpartner_email}
              type="email"
              onSave={(val) => updateField('ansprechpartner_email', val)}
            />
            <EditField
              label="Telefon"
              value={ap.ansprechpartner_telefon}
              onSave={(val) => updateField('ansprechpartner_telefon', val)}
            />
            <EditField
              label="Abteilung"
              value={ap.abteilung_name}
              type="select"
              options={abteilungOptions}
              onSave={(val) => updateAbteilung(val)}
            />
            <EditField
              label="Position"
              value={ap.position_name}
              type="select"
              options={positionOptions}
              onSave={(val) => updateField('position_id', val)}
            />
            <EditField
              label="Vertretung"
              value={ap.vertretung_name}
              type="select"
              options={vertretungOptions}
              onSave={(val) => updateField('ansprechpartner_vertretungid', val)}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Kunde card */}
          {ap.kundennummer && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Kunde</div>
              <div style={{ marginBottom: 8 }}>
                <Link to={`/kunden/${ap.kundennummer}`} style={{ color: 'var(--accent)', fontWeight: 500, fontSize: 14 }}>
                  {ap.name_kunde}
                </Link>
              </div>
              {ap.kunden_matchcode && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Matchcode: <span className="mono">{ap.kunden_matchcode}</span>
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                Kunden-Nr.: <span className="mono">{ap.kundennummer}</span>
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="card">
            <div className="card-title">Metadaten</div>
            <div className="field-row">
              <div className="field-key">ID</div>
              <div className="field-val mono" style={{ fontSize: 12 }}>{ap.ansprechpartnerid}</div>
            </div>
            <div className="field-row">
              <div className="field-key">Erstellt</div>
              <div className="field-val" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(ap.created_at)}</div>
            </div>
            <div className="field-row">
              <div className="field-key">Geändert</div>
              <div className="field-val" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(ap.updated_at)}</div>
            </div>
            {ap.vertretung_name && (
              <div className="field-row">
                <div className="field-key">Vertretung</div>
                <div className="field-val" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ap.vertretung_name}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
