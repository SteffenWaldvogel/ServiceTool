import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import CustomFieldsSection from '../components/CustomFieldsSection';

import { getKritColor } from '../utils/helpers';

export default function MaschinenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [maschine, setMaschine] = useState(null);
  const [maschinentypen, setMaschinentypen] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [m, t] = await Promise.all([
      api.getMaschine(id),
      api.getMaschinenTickets(id)
    ]);
    setMaschine(m);
    setTickets(t);
  }, [id]);

  useEffect(() => {
    Promise.all([load(), api.getMaschinentypen().then(setMaschinentypen)])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const startEdit = () => {
    setForm({ maschinennr: maschine.maschinennr, bezeichnung: maschine.bezeichnung || '', maschinentyp_id: maschine.maschinentyp_id, baujahr: maschine.baujahr || '' });
    setEditing(true);
    setError('');
  };

  const save = async () => {
    if (!form.maschinennr?.trim()) { setError('Maschinennummer erforderlich'); return; }
    if (!form.maschinentyp_id) { setError('Maschinentyp erforderlich'); return; }
    setSaving(true); setError('');
    try {
      await api.updateMaschine(id, { maschinennr: form.maschinennr.trim(), bezeichnung: form.bezeichnung.trim() || null, maschinentyp_id: form.maschinentyp_id, baujahr: form.baujahr ? parseInt(form.baujahr) : null });
      await load();
      setEditing(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (loading) return <div className="loading"><div className="spinner" /> Lade Maschine…</div>;
  if (!maschine) return <div className="page"><div className="error-banner">Maschine nicht gefunden</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/maschinen')} style={{ marginBottom: 8 }}>← Zurück</button>
          <div className="page-title">{maschine.maschinennr}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {maschine.maschinentyp_name && (
              <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>{maschine.maschinentyp_name}</span>
            )}
            {maschine.baujahr && (
              <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>Baujahr {maschine.baujahr}</span>
            )}
            <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>ID #{maschine.maschinenid}</span>
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Stammdaten</div>
              {!editing
                ? <button className="btn btn-ghost btn-sm" onClick={startEdit}>✎ Bearbeiten</button>
                : <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setError(''); }}>Abbrechen</button>
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Speichern…' : 'Speichern'}</button>
                  </div>
              }
            </div>
            {error && <div className="error-banner" style={{ marginBottom: 10 }}>{error}</div>}
            {editing ? (
              <div>
                <div className="form-group">
                  <label className="form-label">Maschinennummer *</label>
                  <input className="form-control" value={form.maschinennr} onChange={set('maschinennr')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bezeichnung</label>
                  <input className="form-control" value={form.bezeichnung} onChange={set('bezeichnung')} placeholder="z.B. Hydraulikpresse Typ A" />
                </div>
                <div className="form-group">
                  <label className="form-label">Maschinentyp *</label>
                  <select className="form-control" value={form.maschinentyp_id} onChange={set('maschinentyp_id')}>
                    <option value="">— Wählen —</option>
                    {maschinentypen.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Baujahr</label>
                  <input className="form-control" type="number" min="1900" max="2100" value={form.baujahr} onChange={set('baujahr')} />
                </div>
              </div>
            ) : (
              <div>
                <div className="field-row">
                  <div className="field-key">Maschinennummer</div>
                  <div className="field-val mono" style={{ color: 'var(--accent)' }}>{maschine.maschinennr}</div>
                </div>
                <div className="field-row">
                  <div className="field-key">Bezeichnung</div>
                  <div className="field-val">{maschine.bezeichnung || <span className="text-muted">–</span>}</div>
                </div>
                <div className="field-row">
                  <div className="field-key">Maschinentyp</div>
                  <div className="field-val">{maschine.maschinentyp_name || <span className="text-muted">–</span>}</div>
                </div>
                <div className="field-row">
                  <div className="field-key">Baujahr</div>
                  <div className="field-val mono">{maschine.baujahr || <span className="text-muted">–</span>}</div>
                </div>
                <div className="field-row">
                  <div className="field-key">Erstellt am</div>
                  <div className="field-val text-muted" style={{ fontSize: 12 }}>{new Date(maschine.created_at).toLocaleString('de-DE')}</div>
                </div>
                <div className="field-row">
                  <div className="field-key">Aktualisiert am</div>
                  <div className="field-val text-muted" style={{ fontSize: 12 }}>{new Date(maschine.updated_at).toLocaleString('de-DE')}</div>
                </div>
              </div>
            )}
          </div>

          <CustomFieldsSection entity="maschinen" tableName="maschine" entityId={maschine.maschinenid} />
        </div>

        <div>
          <div className="card">
            <div className="card-title">Tickets ({tickets.length})</div>
            {tickets.length === 0 ? (
              <div className="text-muted">Keine Tickets für diese Maschine</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tickets.map(t => (
                  <div key={t.ticketnr}
                    style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    onClick={() => navigate(`/tickets/${t.ticketnr}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}>#{t.ticketnr}</span>
                      <span className="badge" style={{
                        background: t.is_terminal ? 'rgba(100,116,139,0.15)' : 'rgba(59,130,246,0.15)',
                        color: t.is_terminal ? '#64748b' : 'var(--accent)', fontSize: 10
                      }}>{t.status_name}</span>
                    </div>
                    <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.betreff || <span className="text-muted">(kein Betreff)</span>}
                    </div>
                    {t.name_kunde && <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{t.name_kunde}</div>}
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {new Date(t.erstellt_am).toLocaleDateString('de-DE')}
                      {t.kritikalitaet_name && (
                        <span className="badge" style={{ marginLeft: 6, background: getKritColor(t.kritikalitaet_gewichtung) + '22', color: getKritColor(t.kritikalitaet_gewichtung), fontSize: 10 }}>
                          {t.kritikalitaet_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
