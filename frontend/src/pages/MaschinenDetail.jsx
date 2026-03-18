import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import CustomFieldsSection from '../components/CustomFieldsSection';
import { getKritColor, parseKategorie } from '../utils/helpers';

const TABS = ['Stammdaten', 'Ticket-Historie'];

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
  const [activeTab, setActiveTab] = useState('Stammdaten');

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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            className="btn btn-ghost btn-sm"
            style={{
              borderRadius: 0,
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
              padding: '8px 16px',
              fontWeight: activeTab === tab ? 600 : 400
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Ticket-Historie' && tickets.length > 0 && (
              <span className="badge" style={{ marginLeft: 6, background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', fontSize: 10 }}>
                {tickets.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Stammdaten */}
      {activeTab === 'Stammdaten' && (
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
            {/* Summary card */}
            <div className="card">
              <div className="card-title">Übersicht</div>
              <div className="field-row">
                <div className="field-key">Tickets gesamt</div>
                <div className="field-val mono">{tickets.length}</div>
              </div>
              <div className="field-row">
                <div className="field-key">Offen</div>
                <div className="field-val mono">{tickets.filter(t => !t.is_terminal).length}</div>
              </div>
              {tickets.length > 0 && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%' }}
                  onClick={() => setActiveTab('Ticket-Historie')}>
                  Ticket-Historie anzeigen →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Ticket-Historie */}
      {activeTab === 'Ticket-Historie' && (
        <div>
          {tickets.length === 0 ? (
            <div className="empty-state">
              <p>Noch keine Tickets für diese Maschine</p>
              <button className="btn btn-primary" onClick={() => navigate('/tickets')}>Ticket erstellen</button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ticket-Nr.</th>
                    <th>Kunde</th>
                    <th>Kategorie</th>
                    <th>Kritikalität</th>
                    <th>Status</th>
                    <th>Erstellt am</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => {
                    const kategorie = parseKategorie ? parseKategorie(t.kategorie_name) : null;
                    const kritColor = getKritColor(t.kritikalitaet_gewichtung);
                    return (
                      <tr key={t.ticketnr} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets/${t.ticketnr}`)}>
                        <td className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>#{t.ticketnr}</td>
                        <td>{t.name_kunde || <span className="text-muted">–</span>}</td>
                        <td>
                          {t.kategorie_name ? (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {kategorie?.typ && (
                                <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', fontSize: 10 }}>
                                  {kategorie.typ}
                                </span>
                              )}
                              {kategorie?.level && (
                                <span className="badge" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8', fontSize: 10 }}>
                                  {kategorie.level}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: 12 }}>–</span>
                          )}
                        </td>
                        <td>
                          {t.kritikalitaet_name ? (
                            <span className="badge" style={{ background: kritColor + '22', color: kritColor, fontSize: 10 }}>
                              {t.kritikalitaet_name}
                            </span>
                          ) : <span className="text-muted">–</span>}
                        </td>
                        <td>
                          <span className="badge" style={{
                            background: t.is_terminal ? 'rgba(100,116,139,0.15)' : 'rgba(59,130,246,0.15)',
                            color: t.is_terminal ? '#64748b' : 'var(--accent)',
                            fontSize: 10
                          }}>
                            {t.status_name}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(t.erstellt_am).toLocaleDateString('de-DE')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
