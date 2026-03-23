import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import QuickCreate from '../components/QuickCreate';

function AiSuggestionCard({ suggestion, onApply }) {
  if (!suggestion) return null;
  return (
    <div className="card" style={{ marginTop: 12, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.04)' }}>
      <div className="card-title" style={{ color: '#a855f7', fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>🤖</span> KI-Vorschlag
      </div>
      {suggestion.zusammenfassung && (
        <div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>{suggestion.zusammenfassung}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12, marginBottom: 10 }}>
        {suggestion.kategorie_id && (
          <div><span style={{ color: 'var(--text-muted)' }}>Kategorie:</span> {suggestion.kategorie_grund}</div>
        )}
        {suggestion.kritikalitaet_id && (
          <div><span style={{ color: 'var(--text-muted)' }}>Kritikalität:</span> {suggestion.kritikalitaet_grund}</div>
        )}
        {suggestion.kunde_kundennummer && (
          <div><span style={{ color: 'var(--text-muted)' }}>Kunde:</span> {suggestion.kunde_grund}</div>
        )}
        {suggestion.techniker_id && (
          <div><span style={{ color: 'var(--text-muted)' }}>Techniker:</span> {suggestion.techniker_grund}</div>
        )}
      </div>
      {suggestion.antwort_vorschlag && (
        <div style={{ fontSize: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, marginBottom: 10, lineHeight: 1.5, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
          "{suggestion.antwort_vorschlag}"
        </div>
      )}
      <button className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#a855f7', border: '1px solid rgba(139,92,246,0.3)' }} onClick={() => onApply(suggestion)}>
        Vorschläge übernehmen
      </button>
    </div>
  );
}

function EmailDetail({ email, onBack, onHandled }) {
  const [mode, setMode] = useState(null); // null | 'assign' | 'create'
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(email.ai_suggestion || null);
  const [aiLoading, setAiLoading] = useState(false);

  // Ticket creation form
  const [lookup, setLookup] = useState({ status: [], kategorien: [], kritikalitaeten: [], kunden: [], abteilungen: [], positionen: [], maschinentypen: [] });
  const [bearbeiter, setBearbeiter] = useState([]);
  const [maschinen, setMaschinen] = useState([]);
  const [kundenAP, setKundenAP] = useState([]);
  const [form, setForm] = useState({
    betreff: email.subject || '',
    beschreibung: email.message || '',
    ticket_kundennummer: '',
    ticket_maschinenid: '',
    ticket_ansprechpartnerid: '',
    status_id: '',
    kritikalitaet_id: '',
    kategorie_id: '',
    erstellt_von: '',
  });

  useEffect(() => {
    if (mode === 'create') {
      Promise.all([
        api.getStatus(),
        api.getKategorien(),
        api.getKritikalitaeten(),
        api.getKunden(),
        api.getLookupUsers(),
        api.getAbteilungen(),
        api.getPositionen(),
        api.getMaschinentypen(),
        api.getMaschinen()
      ]).then(([status, kategorien, kritikalitaeten, kunden, users, abteilungen, positionen, maschinentypen, mlist]) => {
        setLookup({ status, kategorien, kritikalitaeten, kunden: kunden.data || kunden, abteilungen, positionen, maschinentypen });
        setBearbeiter((users || []).filter(u => u.role_id !== 1));
        setMaschinen(mlist.data || mlist);
        const offen = status.find(s => s.status_name === 'Offen');
        if (offen) setForm(f => ({ ...f, status_id: String(offen.status_id) }));
      }).catch(console.error);
    }
  }, [mode]);

  // Load AP when customer changes
  useEffect(() => {
    if (form.ticket_kundennummer) {
      api.getKunde(form.ticket_kundennummer)
        .then(k => setKundenAP(k.ansprechpartner || []))
        .catch(() => setKundenAP([]));
    } else {
      setKundenAP([]);
    }
  }, [form.ticket_kundennummer]);

  // Search for assign mode
  useEffect(() => {
    if (mode !== 'assign' || !search.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      api.getTickets({ search, limit: 10 })
        .then(r => setResults(Array.isArray(r) ? r : r.data || []))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search, mode]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const assign = async () => {
    if (!selected) return;
    setLoading(true); setError('');
    try {
      await api.assignUnmatchedEmail(email.id, selected.ticketnr);
      onHandled();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const createTicket = async () => {
    if (!form.ticket_kundennummer || !form.kritikalitaet_id || !form.kategorie_id || !form.status_id) {
      setError('Bitte alle Pflichtfelder ausfüllen'); return;
    }
    setLoading(true); setError('');
    try {
      const ticket = await api.createTicket({
        ticket_kundennummer: form.ticket_kundennummer,
        kategorie_id: form.kategorie_id,
        kritikalitaet_id: form.kritikalitaet_id,
        status_id: form.status_id,
        ticket_maschinenid: form.ticket_maschinenid || null,
        ticket_ansprechpartnerid: form.ticket_ansprechpartnerid || null,
        betreff: form.betreff.trim(),
        beschreibung: form.beschreibung.trim(),
        erstellt_von: form.erstellt_von || null,
        from_email: email.from_email,
        from_name: email.from_name,
      });
      // Assign the unmatched email to the new ticket
      await api.assignUnmatchedEmail(email.id, ticket.ticketnr);
      onHandled();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const runAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const result = await api.analyzeEmail({
        fromEmail: email.from_email, fromName: email.from_name,
        subject: email.subject, message: email.message
      });
      setAiSuggestion(result);
    } catch (err) { console.error('AI Fehler:', err.message); }
    finally { setAiLoading(false); }
  };

  const applyAiSuggestion = (s) => {
    setMode('create');
    // Defer form update until lookup data is loaded
    setTimeout(() => {
      setForm(f => ({
        ...f,
        betreff: s.betreff || f.betreff,
        zusammenfassung: s.zusammenfassung || '',
        ticket_kundennummer: s.kunde_kundennummer ? String(s.kunde_kundennummer) : f.ticket_kundennummer,
        kategorie_id: s.kategorie_id ? String(s.kategorie_id) : f.kategorie_id,
        kritikalitaet_id: s.kritikalitaet_id ? String(s.kritikalitaet_id) : f.kritikalitaet_id,
      }));
    }, 500);
  };

  const deleteEmail = async () => {
    if (!confirm('Diese Email wird dauerhaft gelöscht. Fortfahren?')) return;
    try {
      await api.deleteUnmatchedEmail(email.id);
      onHandled();
    } catch (err) { setError(err.message); }
  };

  const ageMs = Date.now() - new Date(email.received_at).getTime();
  const ageH = Math.floor(ageMs / 3600000);
  const ageLabel = ageH < 1 ? 'Gerade eben' : ageH < 24 ? `vor ${ageH}h` : `vor ${Math.floor(ageH / 24)} Tagen`;

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Zurück zur Liste
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: mode ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Left: Email content */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Email-Inhalt</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(59,130,246,0.15)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 15,
            }}>
              {(email.from_name || email.from_email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{email.from_name || email.from_email}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{email.from_email}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{ageLabel}</span>
          </div>
          {email.subject && (
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              {email.subject}
            </div>
          )}
          <div style={{
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 400, overflowY: 'auto',
            padding: '8px 0',
          }}>
            {email.message || '(kein Inhalt)'}
          </div>

          {email.attachments?.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Anhänge ({email.attachments.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {email.attachments.map(att => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/tickets/unmatched/attachments/${att.id}`, { credentials: 'include' });
                        if (!res.ok) throw new Error('Download fehlgeschlagen');
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        if (att.mime_type === 'application/pdf' || att.mime_type?.startsWith('image/')) {
                          window.open(url, '_blank');
                        } else {
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = att.filename;
                          a.click();
                        }
                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                      } catch (err) {
                        console.error('Anhang-Fehler:', err);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', borderRadius: 6,
                      background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                      color: 'var(--accent)', cursor: 'pointer', fontSize: 12,
                    }}
                    title={`${att.filename} — Klicken zum Öffnen`}
                  >
                    <span>{att.mime_type === 'application/pdf' ? '📄' : att.mime_type?.startsWith('image/') ? '🖼' : '📎'}</span>
                    <span>{att.filename}</span>
                    {att.size_bytes > 0 && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        ({att.size_bytes < 1024 ? att.size_bytes + ' B' : att.size_bytes < 1048576 ? (att.size_bytes / 1024).toFixed(1) + ' KB' : (att.size_bytes / 1048576).toFixed(1) + ' MB'})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!mode && aiSuggestion && (
            <AiSuggestionCard suggestion={aiSuggestion} onApply={applyAiSuggestion} />
          )}

          {!mode && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-primary" onClick={() => setMode('create')}>
                + Neues Ticket erstellen
              </button>
              <button className="btn btn-secondary" onClick={() => setMode('assign')}>
                Bestehendem Ticket zuweisen
              </button>
              {!aiSuggestion && (
                <button
                  className="btn btn-sm"
                  style={{ background: 'rgba(139,92,246,0.15)', color: '#a855f7', border: '1px solid rgba(139,92,246,0.3)' }}
                  onClick={runAiAnalysis}
                  disabled={aiLoading}
                >
                  {aiLoading ? '🤖 Analysiere…' : '🤖 KI-Analyse'}
                </button>
              )}
              <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={deleteEmail}>
                Löschen
              </button>
            </div>
          )}
        </div>

        {/* Right: Action panel */}
        {mode === 'create' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Neues Ticket erstellen</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setMode(null); setError(''); }}>✕</button>
            </div>
            {error && <div className="error-banner" style={{ marginBottom: 8 }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Betreff *</label>
              <input className="form-control" value={form.betreff} onChange={set('betreff')} />
            </div>
            <div className="form-group">
              <label className="form-label">Kunde *</label>
              <QuickCreate
                label="Kunde"
                value={form.ticket_kundennummer}
                onChange={v => setForm(f => ({ ...f, ticket_kundennummer: v, ticket_ansprechpartnerid: '' }))}
                options={lookup.kunden.map(k => ({ id: k.kundennummer, label: k.name_kunde }))}
                matchFn={data => api.matchKunden({ name_kunde: data.name_kunde, matchcode: data.matchcode, plz: data.plz, ort: data.ort, emails: data.email ? [data.email] : [] })}
                onCreateNew={async (data) => {
                  const k = await api.createKunde({
                    name_kunde: data.name_kunde,
                    matchcode: data.matchcode || data.name_kunde.substring(0, 10).toUpperCase(),
                    plz: data.plz || null, ort: data.ort || null,
                    emails: data.email ? [data.email] : [],
                    telefonnummern: data.telefon ? [data.telefon] : [],
                  });
                  setLookup(l => ({ ...l, kunden: [...l.kunden, k] }));
                  return { id: k.kundennummer };
                }}
                createFields={[
                  { key: 'name_kunde', label: 'Firmenname', required: true },
                  { key: 'matchcode', label: 'Matchcode', placeholder: 'Kürzel' },
                  { key: 'plz', label: 'PLZ' },
                  { key: 'ort', label: 'Ort' },
                  { key: 'email', label: 'E-Mail', type: 'email' },
                  { key: 'telefon', label: 'Telefon' },
                ]}
              />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Maschine</label>
                <QuickCreate
                  label="Maschine"
                  value={form.ticket_maschinenid}
                  onChange={v => setForm(f => ({ ...f, ticket_maschinenid: v }))}
                  options={maschinen.map(m => ({ id: m.maschinenid, label: m.maschinennr, sublabel: m.maschinentyp_name }))}
                  nullable
                  matchFn={data => api.matchMaschinen({ maschinennr: data.maschinennr })}
                  onCreateNew={async (data) => {
                    const m = await api.createMaschine({ maschinennr: data.maschinennr, maschinentyp_id: data.maschinentyp_id, baujahr: data.baujahr ? parseInt(data.baujahr) : null });
                    setMaschinen(prev => [...prev, m]);
                    return { id: m.maschinenid };
                  }}
                  createFields={[
                    { key: 'maschinennr', label: 'Maschinennummer', required: true },
                    { key: 'maschinentyp_id', label: 'Maschinentyp', required: true, type: 'select', options: lookup.maschinentypen?.map(m => ({ id: m.id, label: m.name })) || [] },
                    { key: 'baujahr', label: 'Baujahr', type: 'number' },
                  ]}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ansprechpartner</label>
                <QuickCreate
                  label="Ansprechpartner"
                  value={form.ticket_ansprechpartnerid}
                  onChange={v => setForm(f => ({ ...f, ticket_ansprechpartnerid: v }))}
                  options={kundenAP.map(ap => ({ id: ap.ansprechpartnerid, label: ap.ansprechpartner_name, sublabel: ap.position_name }))}
                  disabled={!form.ticket_kundennummer}
                  nullable
                  matchFn={data => api.matchAnsprechpartner({ name: data.ansprechpartner_name, email: data.email, telefon: data.telefon, kundennummer: form.ticket_kundennummer })}
                  onCreateNew={async (data) => {
                    const ap = await api.createAnsprechpartner(form.ticket_kundennummer, {
                      ansprechpartner_name: data.ansprechpartner_name,
                      abteilung_id: data.abteilung_id, position_id: data.position_id,
                      ansprechpartner_email: data.email || null, ansprechpartner_telefon: data.telefon || null,
                    });
                    setKundenAP(prev => [...prev, ap]);
                    return { id: ap.ansprechpartnerid };
                  }}
                  createFields={[
                    { key: 'ansprechpartner_name', label: 'Name', required: true },
                    { key: 'abteilung_id', label: 'Abteilung', required: true, type: 'select', options: lookup.abteilungen?.map(a => ({ id: a.abteilung_id || a.id, label: a.abteilung_name || a.name })) || [] },
                    { key: 'position_id', label: 'Position', required: true, type: 'select', options: lookup.positionen?.map(p => ({ id: p.position_id || p.id, label: p.position_name || p.name })) || [] },
                    { key: 'email', label: 'E-Mail', type: 'email' },
                    { key: 'telefon', label: 'Telefon' },
                  ]}
                />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Status *</label>
                <select className="form-control" value={form.status_id} onChange={set('status_id')}>
                  <option value="">— Wählen —</option>
                  {lookup.status.map(s => <option key={s.status_id} value={s.status_id}>{s.status_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Kritikalität *</label>
                <select className="form-control" value={form.kritikalitaet_id} onChange={set('kritikalitaet_id')}>
                  <option value="">— Wählen —</option>
                  {lookup.kritikalitaeten.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Kategorie *</label>
                <select className="form-control" value={form.kategorie_id} onChange={set('kategorie_id')}>
                  <option value="">— Wählen —</option>
                  {lookup.kategorien.map(k => <option key={k.kategorie_id} value={k.kategorie_id}>{k.kategorie_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Erstellt von</label>
                <select className="form-control" value={form.erstellt_von} onChange={set('erstellt_von')}>
                  <option value="">— Bearbeiter wählen —</option>
                  {bearbeiter.map(u => <option key={u.user_id} value={u.display_name}>{u.display_name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Beschreibung</label>
              <textarea className="form-control" rows={4} value={form.beschreibung} onChange={set('beschreibung')} />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => { setMode(null); setError(''); }}>Abbrechen</button>
              <button className="btn btn-primary" disabled={loading} onClick={createTicket}>
                {loading ? 'Erstellen…' : 'Ticket erstellen & zuweisen'}
              </button>
            </div>
          </div>
        )}

        {mode === 'assign' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Bestehendem Ticket zuweisen</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setMode(null); setError(''); setSearch(''); setSelected(null); }}>✕</button>
            </div>
            {error && <div className="error-banner" style={{ marginBottom: 8 }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Ticket suchen (Nr. oder Kunde)</label>
              <input
                className="form-control"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Ticket-Nr. oder Kundenname…"
                autoFocus
              />
            </div>
            {results.length > 0 && (
              <div className="table-wrapper" style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 12 }}>
                <table>
                  <tbody>
                    {results.map(t => (
                      <tr
                        key={t.ticketnr}
                        style={{ cursor: 'pointer', background: selected?.ticketnr === t.ticketnr ? 'rgba(59,130,246,0.1)' : '' }}
                        onClick={() => setSelected(t)}
                      >
                        <td className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>#{t.ticketnr}</td>
                        <td>{t.kunden_name}</td>
                        <td><span className="badge" style={{ background: t.is_terminal ? 'rgba(100,116,139,0.15)' : 'rgba(59,130,246,0.15)', color: t.is_terminal ? '#64748b' : 'var(--accent)', fontSize: 11 }}>{t.status_name}</span></td>
                        <td style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(t.betreff || '').split('\n')[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selected && (
              <div style={{ padding: '8px 12px', background: 'rgba(59,130,246,0.1)', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                Ausgewählt: <strong>#{selected.ticketnr}</strong> — {selected.kunden_name} — {selected.status_name}
              </div>
            )}
            <div className="modal-footer" style={{ padding: 0, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => { setMode(null); setError(''); }}>Abbrechen</button>
              <button className="btn btn-primary" disabled={!selected || loading} onClick={assign}>
                {loading ? 'Zuweisen…' : 'Zuweisen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PosteingangPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const load = () => {
    setLoading(true);
    api.getUnmatchedEmails()
      .then(setEmails)
      .catch(() => setEmails([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /> Lade…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Posteingang</div>
          <div className="page-subtitle">
            {selectedEmail
              ? `Email von ${selectedEmail.from_name || selectedEmail.from_email}`
              : `${emails.length} nicht zugeordnete Email${emails.length !== 1 ? 's' : ''}`
            }
          </div>
        </div>
        {!selectedEmail && (
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Aktualisieren</button>
        )}
      </div>

      {selectedEmail ? (
        <EmailDetail
          email={selectedEmail}
          onBack={() => setSelectedEmail(null)}
          onHandled={() => { setSelectedEmail(null); load(); }}
        />
      ) : emails.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8, color: 'var(--success)' }}>✓</div>
          <p style={{ fontWeight: 500 }}>Alle Emails verarbeitet</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Neue Emails erscheinen hier automatisch (Polling alle 30s)</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {emails.map(e => {
            const ageMs = Date.now() - new Date(e.received_at).getTime();
            const ageH = Math.floor(ageMs / 3600000);
            const ageLabel = ageH < 1 ? 'Gerade eben' : ageH < 24 ? `vor ${ageH}h` : `vor ${Math.floor(ageH / 24)}d`;
            const isOld = ageH > 24;
            return (
              <div
                key={e.id}
                className="card"
                style={{ padding: 14, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onClick={() => setSelectedEmail(e)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(59,130,246,0.15)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14,
                  }}>
                    {(e.from_name || e.from_email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{e.from_name || e.from_email}</span>
                      <span style={{
                        fontSize: 11, flexShrink: 0, marginLeft: 8,
                        color: isOld ? '#f59e0b' : 'var(--text-muted)',
                        fontWeight: isOld ? 500 : 400,
                      }}>{ageLabel}</span>
                    </div>
                    {e.subject && <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{e.subject}</div>}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.attachments?.length > 0 && <span style={{ marginRight: 6 }}>📎{e.attachments.length}</span>}
                      {(e.message || '').slice(0, 120)}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14, flexShrink: 0 }}>→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
