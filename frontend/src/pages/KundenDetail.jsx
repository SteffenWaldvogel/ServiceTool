import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import CustomFieldsSection from '../components/CustomFieldsSection';

function Section({ title, children, action }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Edit Kunde Modal ───────────────────────────────────────────────────────
function EditKundeModal({ kunde, priorities, onClose, onSaved }) {
  const [form, setForm] = useState({
    name_kunde: kunde.name_kunde || '',
    matchcode: kunde.matchcode || '',
    zusatz: kunde.zusatz || '',
    straße: kunde.straße || '',
    hausnr: kunde.hausnr || '',
    plz: kunde.plz || '',
    ort: kunde.ort || '',
    land: kunde.land || 'Deutschland',
    service_priority_id: kunde.service_priority_id || '',
    bemerkung_kunde: kunde.bemerkung_kunde || '',
    emails: kunde.emails?.length ? [...kunde.emails] : [''],
    telefonnummern: kunde.telefonnummern?.length ? [...kunde.telefonnummern] : ['']
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const setEmail = (i) => (e) => setForm(f => {
    const emails = [...f.emails]; emails[i] = e.target.value; return { ...f, emails };
  });
  const setTel = (i) => (e) => setForm(f => {
    const telefonnummern = [...f.telefonnummern]; telefonnummern[i] = e.target.value; return { ...f, telefonnummern };
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name_kunde.trim()) { setError('Firmenname ist erforderlich'); return; }
    setLoading(true); setError('');
    try {
      const saved = await api.updateKunde(kunde.kundennummer, {
        name_kunde: form.name_kunde.trim(),
        matchcode: form.matchcode.trim() || null,
        zusatz: form.zusatz.trim() || null,
        straße: form.straße.trim() || null,
        hausnr: form.hausnr.trim() || null,
        plz: form.plz.trim() || null,
        ort: form.ort.trim() || null,
        land: form.land.trim() || 'Deutschland',
        service_priority_id: form.service_priority_id || null,
        bemerkung_kunde: form.bemerkung_kunde.trim() || null,
        emails: form.emails.filter(e => e.trim()),
        telefonnummern: form.telefonnummern.filter(t => t.trim())
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">Kundendaten bearbeiten</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Firmenname *</label>
              <input className="form-control" value={form.name_kunde} onChange={set('name_kunde')} />
            </div>
            <div className="form-group">
              <label className="form-label">Matchcode</label>
              <input className="form-control" value={form.matchcode} onChange={set('matchcode')} />
            </div>
            <div className="form-group">
              <label className="form-label">Zusatz</label>
              <input className="form-control" value={form.zusatz} onChange={set('zusatz')} />
            </div>
            <div className="form-group">
              <label className="form-label">Straße</label>
              <input className="form-control" value={form.straße} onChange={set('straße')} />
            </div>
            <div className="form-group">
              <label className="form-label">Hausnummer</label>
              <input className="form-control" value={form.hausnr} onChange={set('hausnr')} />
            </div>
            <div className="form-group">
              <label className="form-label">PLZ</label>
              <input className="form-control" value={form.plz} onChange={set('plz')} />
            </div>
            <div className="form-group">
              <label className="form-label">Ort</label>
              <input className="form-control" value={form.ort} onChange={set('ort')} />
            </div>
            <div className="form-group">
              <label className="form-label">Land</label>
              <input className="form-control" value={form.land} onChange={set('land')} />
            </div>
            <div className="form-group">
              <label className="form-label">Service-Priorität</label>
              <select className="form-control" value={form.service_priority_id} onChange={set('service_priority_id')}>
                <option value="">— Wählen —</option>
                {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Bemerkung</label>
              <textarea className="form-control" rows={2} value={form.bemerkung_kunde} onChange={set('bemerkung_kunde')} />
            </div>
          </div>
          <hr className="divider" />
          <div className="card-title">E-Mail-Adressen</div>
          {form.emails.map((email, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="form-control" type="email" value={email} onChange={setEmail(i)} style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost btn-icon"
                onClick={() => setForm(f => ({ ...f, emails: f.emails.filter((_, j) => j !== i) || [''] }))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}
            onClick={() => setForm(f => ({ ...f, emails: [...f.emails, ''] }))}>
            + E-Mail hinzufügen
          </button>
          <hr className="divider" />
          <div className="card-title">Telefonnummern</div>
          {form.telefonnummern.map((tel, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="form-control" value={tel} onChange={setTel(i)} style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost btn-icon"
                onClick={() => setForm(f => ({ ...f, telefonnummern: f.telefonnummern.filter((_, j) => j !== i) || [''] }))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}
            onClick={() => setForm(f => ({ ...f, telefonnummern: [...f.telefonnummern, ''] }))}>
            + Telefon hinzufügen
          </button>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add/Edit Ansprechpartner Modal ─────────────────────────────────────────
function AnsprechpartnerModal({ kundenId, ap, onClose, onSaved }) {
  const isEdit = !!ap;
  const [form, setForm] = useState({
    ansprechpartner_name: ap?.ansprechpartner_name || '',
    abteilung_id: ap?.abteilung_id || '',
    position_id: ap?.position_id || '',
    ansprechpartner_email: ap?.ansprechpartner_email || '',
    ansprechpartner_telefon: ap?.ansprechpartner_telefon || '',
    ansprechpartner_vertretungid: ap?.ansprechpartner_vertretungid || ''
  });
  const [abteilungen, setAbteilungen] = useState([]);
  const [positionen, setPositionen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAbteilungen().then(setAbteilungen).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.abteilung_id) {
      api.getPositionen(form.abteilung_id).then(setPositionen).catch(console.error);
    } else {
      api.getPositionen().then(setPositionen).catch(console.error);
    }
  }, [form.abteilung_id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.ansprechpartner_name.trim()) { setError('Name ist erforderlich'); return; }
    if (!form.abteilung_id) { setError('Abteilung ist erforderlich'); return; }
    if (!form.position_id) { setError('Position ist erforderlich'); return; }
    setLoading(true); setError('');
    try {
      const data = {
        ansprechpartner_name: form.ansprechpartner_name.trim(),
        abteilung_id: form.abteilung_id,
        position_id: form.position_id,
        ansprechpartner_email: form.ansprechpartner_email || null,
        ansprechpartner_telefon: form.ansprechpartner_telefon || null,
        ansprechpartner_vertretungid: form.ansprechpartner_vertretungid || null
      };
      let saved;
      if (isEdit) {
        saved = await api.updateAnsprechpartner(kundenId, ap.ansprechpartnerid, data);
      } else {
        saved = await api.createAnsprechpartner(kundenId, data);
      }
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Ansprechpartner bearbeiten' : 'Ansprechpartner hinzufügen'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Name *</label>
              <input className="form-control" value={form.ansprechpartner_name} onChange={set('ansprechpartner_name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Abteilung *</label>
              <select className="form-control" value={form.abteilung_id} onChange={set('abteilung_id')}>
                <option value="">— Wählen —</option>
                {abteilungen.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Position *</label>
              <select className="form-control" value={form.position_id} onChange={set('position_id')}>
                <option value="">— Wählen —</option>
                {positionen.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">E-Mail</label>
              <input className="form-control" type="email" value={form.ansprechpartner_email} onChange={set('ansprechpartner_email')} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefon</label>
              <input className="form-control" value={form.ansprechpartner_telefon} onChange={set('ansprechpartner_telefon')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Speichern…' : isEdit ? 'Speichern' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function KundenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kunde, setKunde] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditKunde, setShowEditKunde] = useState(false);
  const [apModal, setApModal] = useState(null); // null | 'create' | { edit: ap }

  const reload = () => Promise.all([
    api.getKunde(id),
    api.getKundenTickets(id)
  ]).then(([k, t]) => { setKunde(k); setTickets(t); });

  useEffect(() => {
    Promise.all([reload(), api.getServicePriorities().then(setPriorities)])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const deleteAP = async (ap) => {
    if (!confirm(`„${ap.ansprechpartner_name}" wirklich löschen?`)) return;
    try {
      await api.deleteAnsprechpartner(id, ap.ansprechpartnerid);
      reload();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /> Lade Kunde…</div>;
  if (!kunde) return <div className="page"><div className="error-banner">Kunde nicht gefunden</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/kunden')} style={{ marginBottom: 8 }}>← Zurück</button>
          <div className="page-title">{kunde.name_kunde}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            {kunde.matchcode && (
              <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{kunde.matchcode}</span>
            )}
            {kunde.service_priority_name && (
              <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>
                {kunde.service_priority_name}
              </span>
            )}
            <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>#{kunde.kundennummer}</span>
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div>
          {/* Stammdaten */}
          <Section
            title="Stammdaten"
            action={<button className="btn btn-ghost btn-sm" onClick={() => setShowEditKunde(true)}>✎ Bearbeiten</button>}
          >
            {kunde.zusatz && (
              <div className="field-row">
                <div className="field-key">Zusatz</div>
                <div className="field-val">{kunde.zusatz}</div>
              </div>
            )}
            <div className="field-row">
              <div className="field-key">Adresse</div>
              <div className="field-val">
                {[
                  [kunde.straße, kunde.hausnr].filter(Boolean).join(' '),
                  [kunde.plz, kunde.ort].filter(Boolean).join(' '),
                  kunde.land
                ].filter(s => s?.trim()).join(', ') || <span className="text-muted">–</span>}
              </div>
            </div>
            <div className="field-row">
              <div className="field-key">E-Mail-Adressen</div>
              <div className="field-val">
                <div className="tag-list">
                  {kunde.emails?.length > 0
                    ? kunde.emails.map((email, i) => (
                        <a key={i} href={`mailto:${email}`} style={{ color: 'var(--accent)', fontSize: 13 }}>{email}</a>
                      ))
                    : <span className="text-muted">–</span>
                  }
                </div>
              </div>
            </div>
            <div className="field-row">
              <div className="field-key">Telefonnummern</div>
              <div className="field-val">
                <div className="tag-list">
                  {kunde.telefonnummern?.length > 0
                    ? kunde.telefonnummern.map((tel, i) => <span key={i} style={{ fontSize: 13 }}>{tel}</span>)
                    : <span className="text-muted">–</span>
                  }
                </div>
              </div>
            </div>
            <div className="field-row">
              <div className="field-key">Service-Priorität</div>
              <div className="field-val">
                {kunde.service_priority_name
                  ? <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>{kunde.service_priority_name}</span>
                  : <span className="text-muted">–</span>
                }
              </div>
            </div>
            {kunde.bemerkung_kunde && (
              <div className="field-row">
                <div className="field-key">Bemerkung</div>
                <div className="field-val" style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{kunde.bemerkung_kunde}</div>
              </div>
            )}
            <div className="field-row">
              <div className="field-key">Erstellt am</div>
              <div className="field-val text-muted" style={{ fontSize: 12 }}>
                {new Date(kunde.created_at).toLocaleString('de-DE')}
              </div>
            </div>
          </Section>

          {/* Custom Fields */}
          <CustomFieldsSection entity="kunden" tableName="kunden" entityId={kunde.kundennummer} />

          {/* Ansprechpartner */}
          <Section
            title="Ansprechpartner"
            action={<button className="btn btn-secondary btn-sm" onClick={() => setApModal('create')}>+ Hinzufügen</button>}
          >
            {!kunde.ansprechpartner?.length ? (
              <div className="text-muted">Keine Ansprechpartner eingetragen</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Abteilung</th>
                    <th>Position</th>
                    <th>E-Mail</th>
                    <th>Telefon</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {kunde.ansprechpartner.map(ap => (
                    <tr key={ap.ansprechpartnerid} style={{ cursor: 'pointer' }} onClick={() => navigate(`/ansprechpartner/${ap.ansprechpartnerid}`)}>
                      <td style={{ fontWeight: 500 }}>{ap.ansprechpartner_name}</td>
                      <td>{ap.abteilung_name || <span className="text-muted">–</span>}</td>
                      <td>{ap.position_name || <span className="text-muted">–</span>}</td>
                      <td>
                        {ap.ansprechpartner_email
                          ? <a href={`mailto:${ap.ansprechpartner_email}`} style={{ color: 'var(--accent)', fontSize: 13 }}>{ap.ansprechpartner_email}</a>
                          : <span className="text-muted">–</span>}
                      </td>
                      <td>{ap.ansprechpartner_telefon || <span className="text-muted">–</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" title="Bearbeiten"
                            onClick={(e) => { e.stopPropagation(); setApModal({ edit: ap }); }}>✎</button>
                          <button className="btn btn-ghost btn-sm btn-icon" title="Löschen"
                            style={{ color: 'var(--danger)' }}
                            onClick={(e) => { e.stopPropagation(); deleteAP(ap); }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Maschinen aus Tickets */}
          <Section title="Maschinen aus Tickets">
            {!kunde.maschinen?.length ? (
              <div className="text-muted">Keine Maschinen über Tickets verknüpft</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Maschinennr.</th>
                    <th>Typ</th>
                    <th>Baujahr</th>
                  </tr>
                </thead>
                <tbody>
                  {kunde.maschinen.map(m => (
                    <tr key={m.maschinenid}>
                      <td className="mono" style={{ fontSize: 13, color: 'var(--accent)' }}>{m.maschinennr}</td>
                      <td>{m.maschinentyp_name || <span className="text-muted">–</span>}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{m.baujahr || <span className="text-muted">–</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>

        {/* Sidebar: Tickets */}
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Tickets ({tickets.length})</div>
              <span style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}
                onClick={() => navigate('/tickets')}>
                Alle anzeigen →
              </span>
            </div>
            {tickets.length === 0 ? (
              <div className="text-muted">Keine Tickets vorhanden</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tickets.slice(0, 10).map(t => (
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
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.betreff || <span className="text-muted">(kein Betreff)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {new Date(t.erstellt_am).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditKunde && (
        <EditKundeModal
          kunde={kunde}
          priorities={priorities}
          onClose={() => setShowEditKunde(false)}
          onSaved={() => { setShowEditKunde(false); reload(); }}
        />
      )}

      {(apModal === 'create' || apModal?.edit) && (
        <AnsprechpartnerModal
          kundenId={id}
          ap={apModal?.edit || null}
          onClose={() => setApModal(null)}
          onSaved={() => { setApModal(null); reload(); }}
        />
      )}
    </div>
  );
}
