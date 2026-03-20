import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import CustomFieldsSection from '../components/CustomFieldsSection';
import QuickCreate from '../components/QuickCreate';
import DuplicateWarning from '../components/DuplicateWarning';

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

// ── Inline Ansprechpartner Form ─────────────────────────────────────────────
function InlineAPForm({ kundenId, ap, otherAPs, onClose, onSaved }) {
  const isEdit = !!ap;
  const [form, setForm] = useState({
    ansprechpartner_name: ap?.ansprechpartner_name || '',
    abteilung_id: ap?.abteilung_id ? String(ap.abteilung_id) : '',
    position_id: ap?.position_id ? String(ap.position_id) : '',
    ansprechpartner_email: ap?.ansprechpartner_email || '',
    ansprechpartner_telefon: ap?.ansprechpartner_telefon || '',
    ansprechpartner_vertretungid: ap?.ansprechpartner_vertretungid ? String(ap.ansprechpartner_vertretungid) : ''
  });
  const [abteilungen, setAbteilungen] = useState([]);
  const [positionen, setPositionen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dupMatches, setDupMatches] = useState(null);
  const [pendingData, setPendingData] = useState(null);

  useEffect(() => {
    api.getAbteilungen().then(setAbteilungen).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.abteilung_id) {
      api.getPositionen(form.abteilung_id).then(setPositionen).catch(console.error);
    } else {
      setPositionen([]);
    }
  }, [form.abteilung_id]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const setInput = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ansprechpartner_name.trim()) { setError('Name ist erforderlich'); return; }
    setLoading(true); setError('');

    const data = {
      ansprechpartner_name: form.ansprechpartner_name.trim(),
      abteilung_id: form.abteilung_id || null,
      position_id: form.position_id || null,
      ansprechpartner_email: form.ansprechpartner_email || null,
      ansprechpartner_telefon: form.ansprechpartner_telefon || null,
      ansprechpartner_vertretungid: form.ansprechpartner_vertretungid || null
    };

    if (!isEdit) {
      try {
        const result = await api.matchAnsprechpartner({
          name: data.ansprechpartner_name,
          email: data.ansprechpartner_email,
          telefon: data.ansprechpartner_telefon,
          kundennummer: kundenId
        });
        if (result.matches && result.matches.length > 0) {
          setDupMatches(result.matches);
          setPendingData(data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Match check failed:', err);
      }
    }

    await doSave(data);
    setLoading(false);
  };

  const doSave = async (data) => {
    try {
      let saved;
      if (isEdit) {
        saved = await api.updateAnsprechpartner(kundenId, ap.ansprechpartnerid, data);
      } else {
        saved = await api.createAnsprechpartner(kundenId, data);
      }
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    }
  };

  if (dupMatches) {
    return (
      <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', marginTop: 8 }}>
        <DuplicateWarning
          matches={dupMatches}
          onConfirm={async () => {
            setDupMatches(null);
            await doSave(pendingData);
          }}
          onSelectExisting={(existing) => {
            setDupMatches(null);
            onClose();
          }}
          onCancel={() => { setDupMatches(null); setPendingData(null); }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', marginTop: 8, border: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
        {isEdit ? 'Ansprechpartner bearbeiten' : 'Neuer Ansprechpartner'}
      </div>
      {error && <div className="error-banner" style={{ marginBottom: 8 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Name *</label>
            <input className="form-control" value={form.ansprechpartner_name} onChange={setInput('ansprechpartner_name')} />
          </div>
          <div className="form-group">
            <label className="form-label">Abteilung</label>
            <QuickCreate
              label="Abteilung"
              value={form.abteilung_id}
              onChange={set('abteilung_id')}
              options={abteilungen.map(a => ({ id: String(a.abteilung_id || a.id), label: a.abteilung_name || a.name }))}
              onCreateNew={async (data) => {
                const created = await api.createAbteilung({ abteilung_name: data.abteilung_name });
                await api.getAbteilungen().then(setAbteilungen).catch(console.error);
                return { id: String(created.abteilung_id || created.id) };
              }}
              createFields={[{ key: 'abteilung_name', label: 'Name', required: true }]}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Position</label>
            <QuickCreate
              label="Position"
              value={form.position_id}
              onChange={set('position_id')}
              options={positionen.map(p => ({ id: String(p.position_id || p.id), label: p.position_name || p.name }))}
              onCreateNew={async (data) => {
                const created = await api.createPosition({ position_name: data.position_name, abteilung_id: form.abteilung_id });
                if (form.abteilung_id) {
                  api.getPositionen(form.abteilung_id).then(setPositionen).catch(console.error);
                }
                return { id: String(created.position_id || created.id) };
              }}
              createFields={[{ key: 'position_name', label: 'Name', required: true }]}
            />
          </div>
          <div className="form-group">
            <label className="form-label">E-Mail</label>
            <input className="form-control" type="email" value={form.ansprechpartner_email} onChange={setInput('ansprechpartner_email')} />
          </div>
          <div className="form-group">
            <label className="form-label">Telefon</label>
            <input className="form-control" type="tel" value={form.ansprechpartner_telefon} onChange={setInput('ansprechpartner_telefon')} />
          </div>
          {otherAPs && otherAPs.length > 0 && (
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Vertretung</label>
              <select className="form-control" value={form.ansprechpartner_vertretungid} onChange={setInput('ansprechpartner_vertretungid')}>
                <option value="">— Keine —</option>
                {otherAPs.map(a => (
                  <option key={a.ansprechpartnerid} value={a.ansprechpartnerid}>{a.ansprechpartner_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? 'Speichern…' : isEdit ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Inline Maschine Form ────────────────────────────────────────────────────
function InlineMaschineForm({ kundenId, maschinentypen, onClose, onSaved, navigate }) {
  const [form, setForm] = useState({
    maschinennr: '',
    maschinentyp_id: '',
    bezeichnung: '',
    baujahr: '',
    sofort_ticket: false
  });
  const [maschinentypenList, setMaschinentypenList] = useState(maschinentypen || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dupMatches, setDupMatches] = useState(null);
  const [pendingData, setPendingData] = useState(null);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const setInput = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.maschinennr.trim()) { setError('Maschinennummer ist erforderlich'); return; }
    if (!form.maschinentyp_id) { setError('Maschinentyp ist erforderlich'); return; }
    setLoading(true); setError('');

    const data = {
      maschinennr: form.maschinennr.trim(),
      maschinentyp_id: form.maschinentyp_id,
      bezeichnung: form.bezeichnung.trim() || null,
      baujahr: form.baujahr ? parseInt(form.baujahr) : null
    };

    try {
      const result = await api.matchMaschinen({ maschinennr: data.maschinennr });
      if (result.matches && result.matches.length > 0) {
        setDupMatches(result.matches);
        setPendingData(data);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Match check failed:', err);
    }

    await doSave(data);
    setLoading(false);
  };

  const doSave = async (data) => {
    try {
      const saved = await api.createMaschine(data);
      onSaved(saved);
      if (form.sofort_ticket) {
        navigate(`/tickets?prefill_maschine=${saved.maschinenid}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (dupMatches) {
    return (
      <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', marginTop: 8 }}>
        <DuplicateWarning
          matches={dupMatches}
          onConfirm={async () => {
            setDupMatches(null);
            await doSave(pendingData);
          }}
          onSelectExisting={() => {
            setDupMatches(null);
            onClose();
          }}
          onCancel={() => { setDupMatches(null); setPendingData(null); }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', marginTop: 8, border: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Neue Maschine anlegen</div>
      {error && <div className="error-banner" style={{ marginBottom: 8 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Maschinennr. *</label>
            <input className="form-control" value={form.maschinennr} onChange={setInput('maschinennr')} placeholder="z.B. SN-2024-001" />
          </div>
          <div className="form-group">
            <label className="form-label">Maschinentyp *</label>
            <QuickCreate
              label="Maschinentyp"
              value={form.maschinentyp_id}
              onChange={set('maschinentyp_id')}
              options={maschinentypenList.map(m => ({ id: String(m.id || m.maschinentyp_id), label: m.name || m.maschinentyp_name }))}
              onCreateNew={async (data) => {
                const created = await api.createMaschinentyp({ maschinentyp_name: data.maschinentyp_name });
                const newTyp = { id: String(created.maschinentyp_id || created.id), name: created.maschinentyp_name };
                setMaschinentypenList(prev => [...prev, newTyp]);
                return { id: String(created.maschinentyp_id || created.id) };
              }}
              createFields={[{ key: 'maschinentyp_name', label: 'Name', required: true }]}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bezeichnung</label>
            <input className="form-control" value={form.bezeichnung} onChange={setInput('bezeichnung')} placeholder="z.B. Hydraulikpresse" />
          </div>
          <div className="form-group">
            <label className="form-label">Baujahr</label>
            <input className="form-control" type="number" min="1900" max="2100" value={form.baujahr} onChange={setInput('baujahr')} placeholder="z.B. 2020" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.sofort_ticket} onChange={e => setForm(f => ({ ...f, sofort_ticket: e.target.checked }))} />
              Sofort Ticket erstellen
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? 'Speichern…' : 'Anlegen'}
          </button>
        </div>
      </form>
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
  const [maschinentypen, setMaschinentypen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditKunde, setShowEditKunde] = useState(false);
  const [apForm, setApForm] = useState(null); // null | 'create' | { edit: ap }
  const [showMaschineForm, setShowMaschineForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const reload = () => Promise.all([
    api.getKunde(id),
    api.getKundenTickets(id)
  ]).then(([k, t]) => { setKunde(k); setTickets(t); });

  useEffect(() => {
    Promise.all([
      reload(),
      api.getServicePriorities().then(setPriorities),
      api.getMaschinentypen().then(setMaschinentypen)
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

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

  const apList = kunde.ansprechpartner || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb"><Link to="/kunden">Kunden</Link><span className="sep">/</span><span>{kunde.name_kunde}</span></div>
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

      {successMsg && (
        <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>
          {successMsg}
        </div>
      )}

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
            action={
              <button className="btn btn-secondary btn-sm" onClick={() => setApForm(apForm ? null : 'create')}>
                {apForm === 'create' ? 'Abbrechen' : '+ Hinzufügen'}
              </button>
            }
          >
            {apForm === 'create' && (
              <InlineAPForm
                kundenId={id}
                ap={null}
                otherAPs={apList}
                onClose={() => setApForm(null)}
                onSaved={() => {
                  setApForm(null);
                  reload();
                  showSuccess('Ansprechpartner wurde angelegt');
                }}
              />
            )}

            {!apList.length && apForm !== 'create' ? (
              <div className="text-muted">Keine Ansprechpartner eingetragen</div>
            ) : (
              <div>
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
                    {apList.map(ap => (
                      <React.Fragment key={ap.ansprechpartnerid}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => {
                          if (apForm?.edit?.ansprechpartnerid === ap.ansprechpartnerid) {
                            setApForm(null);
                          } else {
                            navigate(`/ansprechpartner/${ap.ansprechpartnerid}`);
                          }
                        }}>
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
                                onClick={(e) => { e.stopPropagation(); setApForm({ edit: ap }); }}>✎</button>
                              <button className="btn btn-ghost btn-sm btn-icon" title="Löschen"
                                style={{ color: 'var(--danger)' }}
                                onClick={(e) => { e.stopPropagation(); deleteAP(ap); }}>✕</button>
                            </div>
                          </td>
                        </tr>
                        {apForm?.edit?.ansprechpartnerid === ap.ansprechpartnerid && (
                          <tr>
                            <td colSpan={6} style={{ padding: 0 }}>
                              <InlineAPForm
                                kundenId={id}
                                ap={ap}
                                otherAPs={apList.filter(a => a.ansprechpartnerid !== ap.ansprechpartnerid)}
                                onClose={() => setApForm(null)}
                                onSaved={() => {
                                  setApForm(null);
                                  reload();
                                  showSuccess('Ansprechpartner wurde gespeichert');
                                }}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Maschinen aus Tickets */}
          <Section
            title="Maschinen"
            action={
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMaschineForm(f => !f)}>
                {showMaschineForm ? 'Abbrechen' : '+ Maschine anlegen'}
              </button>
            }
          >
            {showMaschineForm && (
              <InlineMaschineForm
                kundenId={id}
                maschinentypen={maschinentypen}
                onClose={() => setShowMaschineForm(false)}
                onSaved={() => {
                  setShowMaschineForm(false);
                  reload();
                  showSuccess('Maschine wurde angelegt');
                }}
                navigate={navigate}
              />
            )}

            {!kunde.maschinen?.length && !showMaschineForm ? (
              <div className="text-muted">Keine Maschinen über Tickets verknüpft</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Maschinennr.</th>
                    <th>Typ</th>
                    <th>Baujahr</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(kunde.maschinen || []).map(m => (
                    <tr key={m.maschinenid} style={{ cursor: 'pointer' }} onClick={() => navigate(`/maschinen/${m.maschinenid}`)}>
                      <td className="mono" style={{ fontSize: 13, color: 'var(--accent)' }}>{m.maschinennr}</td>
                      <td>{m.maschinentyp_name || <span className="text-muted">–</span>}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{m.baujahr || <span className="text-muted">–</span>}</td>
                      <td>
                        <span style={{ color: 'var(--accent)', fontSize: 13 }} title="Details anzeigen">→</span>
                      </td>
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
    </div>
  );
}
