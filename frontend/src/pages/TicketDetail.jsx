import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import CustomFieldsSection from '../components/CustomFieldsSection';
import MessageThread from '../components/MessageThread';
import ReplyBox from '../components/ReplyBox';

import { getKritColor } from '../utils/helpers';

function EditField({ label, value, editValue, type = 'text', options, onSave, nullable }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  const startEdit = () => {
    setVal(editValue !== undefined ? String(editValue ?? '') : String(value ?? ''));
    setEditing(true);
  };

  const save = async () => {
    await onSave(val);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="field-row" style={{ alignItems: 'center' }}>
        <div className="field-key">{label}</div>
        <div style={{ flex: 1, display: 'flex', gap: 8 }}>
          {type === 'select' ? (
            <select className="form-control" value={val} onChange={e => setVal(e.target.value)} style={{ height: 32 }}>
              {nullable && <option value="">— Keine —</option>}
              {options.map(o => (
                <option key={o.id ?? o.value} value={o.id ?? o.value}>
                  {o.name ?? o.label}
                </option>
              ))}
            </select>
          ) : type === 'textarea' ? (
            <textarea className="form-control" value={val} onChange={e => setVal(e.target.value)} rows={3} style={{ flex: 1 }} />
          ) : (
            <input className="form-control" type={type} value={val} onChange={e => setVal(e.target.value)} style={{ height: 32 }} />
          )}
          <button className="btn btn-primary btn-sm" onClick={save}>✓</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="field-row" style={{ cursor: 'pointer' }} onClick={startEdit} title="Klicken zum Bearbeiten">
      <div className="field-key">{label}</div>
      <div className="field-val">{value || <span className="text-muted">–</span>}</div>
      <span style={{ color: 'var(--text-muted)', fontSize: 11, opacity: 0.5, marginLeft: 8 }}>✎</span>
    </div>
  );
}

function MoveMessageModal({ message, currentTicketnr, onClose, onMoved }) {
  const [targetId, setTargetId] = useState('');
  const [targetTicket, setTargetTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookupTicket = async () => {
    if (!targetId) return;
    try {
      const t = await api.getTicket(targetId);
      setTargetTicket(t);
      setError('');
    } catch {
      setError('Ticket nicht gefunden');
      setTargetTicket(null);
    }
  };

  const move = async () => {
    setLoading(true);
    try {
      await api.linkMessage(targetId, message.message_id);
      onMoved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Nachricht verschieben</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>&#x2715;</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <div className="form-group">
          <label className="form-label">Ziel-Ticket-Nummer</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-control"
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              placeholder="Ticket-Nr."
              onKeyDown={e => e.key === 'Enter' && lookupTicket()}
            />
            <button className="btn btn-secondary" type="button" onClick={lookupTicket}>Suchen</button>
          </div>
        </div>
        {targetTicket && (
          <div style={{ padding: '8px 12px', background: 'rgba(59,130,246,0.1)', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
            #{targetTicket.ticketnr} – {targetTicket.kunden_name} – {targetTicket.status_name}
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" disabled={!targetTicket || loading} onClick={move}>
            {loading ? '…' : 'Verschieben'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [kunde, setKunde] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState({ status: [], kategorien: [], kritikalitaeten: [], kunden: [], users: [] });
  const [maschinen, setMaschinen] = useState([]);
  const [kundenAP, setKundenAP] = useState([]);
  const [delConfirm, setDelConfirm] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyInternal, setReplyInternal] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [movingMsg, setMovingMsg] = useState(null);

  const loadTicket = () => api.getTicket(id).then(t => {
    setTicket(t);
    if (t.ticket_kundennummer) {
      api.getKunde(t.ticket_kundennummer)
        .then(k => { setKunde(k); setKundenAP(k.ansprechpartner || []); })
        .catch(() => { setKunde(null); setKundenAP([]); });
    }
  });

  useEffect(() => {
    Promise.all([
      api.getTicket(id),
      api.getStatus(),
      api.getKategorien(),
      api.getKritikalitaeten(),
      api.getKunden(),
      api.getMaschinen(),
      api.getLookupUsers()
    ]).then(([t, status, kategorien, kritikalitaeten, kunden, mlist, users]) => {
      setTicket(t);
      setLookup({ status, kategorien, kritikalitaeten, kunden, users });
      setMaschinen(mlist);
      if (t.ticket_kundennummer) {
        api.getKunde(t.ticket_kundennummer)
          .then(k => { setKunde(k); setKundenAP(k.ansprechpartner || []); })
          .catch(() => {});
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  // Reload AP when kunde changes
  useEffect(() => {
    if (ticket?.ticket_kundennummer) {
      api.getKunde(ticket.ticket_kundennummer)
        .then(k => { setKunde(k); setKundenAP(k.ansprechpartner || []); })
        .catch(() => { setKundenAP([]); });
    } else {
      setKunde(null);
      setKundenAP([]);
    }
  }, [ticket?.ticket_kundennummer]);

  const update = async (field, value) => {
    const body = { ...ticket };
    body[field] = value || null;
    // Always ensure non-umlaut alias exists for the backend PUT
    body.kritikalitaet_id = body.kritikalitaet_id ?? body['kritikalität_id'] ?? null;
    if (field === 'kritikalitaet_id') body['kritikalität_id'] = value || null;
    await api.updateTicket(id, body);
    await loadTicket();
  };

  const closeTicket = async () => {
    const terminalStatus = lookup.status.find(s => s.status_name === 'Geschlossen');
    const openStatus = lookup.status.find(s => s.status_name === 'Offen');
    await api.updateTicket(id, {
      ...ticket,
      status_id: ticket.is_terminal
        ? (openStatus?.status_id || ticket.status_id)
        : (terminalStatus?.status_id || ticket.status_id)
    });
    await loadTicket();
  };

  const deleteTicket = async () => {
    await api.deleteTicket(id);
    navigate('/tickets');
  };

  if (loading) return <div className="loading"><div className="spinner" /> Lade Ticket…</div>;
  if (!ticket) return <div className="page"><div className="error-banner">Ticket nicht gefunden</div></div>;

  const betreff = ticket.messages?.[0]?.message?.split('\n')[0] || ticket.betreff || `Ticket #${ticket.ticketnr}`;

  const statusOptions = lookup.status.map(s => ({ id: s.status_id, name: s.status_name }));
  const kategorieOptions = lookup.kategorien.map(k => ({ id: k.kategorie_id, name: k.kategorie_name }));
  const kritOptions = lookup.kritikalitaeten.map(k => ({ id: k.id, name: k.name }));
  const kundenOptions = lookup.kunden.map(k => ({ id: k.kundennummer, name: k.name_kunde }));
  const maschinenOptions = maschinen.map(m => ({ id: m.maschinenid, name: `${m.maschinennr}${m.maschinentyp_name ? ` (${m.maschinentyp_name})` : ''}` }));
  const apOptions = kundenAP.map(ap => ({ id: ap.ansprechpartnerid, name: `${ap.ansprechpartner_name}${ap.position_name ? ` – ${ap.position_name}` : ''}` }));
  const userOptions = lookup.users.map(u => ({ id: u.user_id, name: u.display_name }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tickets')}>← Zurück</button>
            <span className="mono" style={{ color: 'var(--accent)', fontSize: 15 }}>#{ticket.ticketnr}</span>
          </div>
          <div className="page-title" style={{ marginTop: 8 }}>
            {betreff.length > 80 ? betreff.slice(0, 80) + '…' : betreff}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={closeTicket}>
            {ticket.is_terminal ? '🔓 Wieder öffnen' : '✓ Schließen'}
          </button>
          {delConfirm ? (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Wirklich löschen?</span>
              <button className="btn btn-danger btn-sm" onClick={deleteTicket}>Ja, löschen</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDelConfirm(false)}>Nein</button>
            </>
          ) : (
            <button className="btn btn-danger btn-sm" onClick={() => setDelConfirm(true)}>Löschen</button>
          )}
        </div>
      </div>

      <div className="detail-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Kommunikationsbereich */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Kommunikation ({(ticket.messages || []).length})</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setReplyInternal(false); setShowReply(v => !v); }}
                >
                  &#9993; Antworten
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setReplyInternal(true); setShowReply(v => !v); }}
                >
                  &#128274; Notiz
                </button>
              </div>
            </div>
            {msgSuccess && (
              <div className="success-banner" style={{ marginBottom: 12 }}>{msgSuccess}</div>
            )}
            <MessageThread
              messages={ticket.messages || []}
              onMoveMessage={(msg) => setMovingMsg(msg)}
            />
            {showReply && (
              <ReplyBox
                ticketnr={ticket.ticketnr}
                defaultToEmail={ticket.ap_email || (kunde?.emails?.[0] || '')}
                defaultToName={ticket.ap_name || ''}
                initialInternal={replyInternal}
                onClose={() => setShowReply(false)}
                onSent={() => {
                  setShowReply(false);
                  setMsgSuccess('Nachricht gespeichert');
                  setTimeout(() => setMsgSuccess(''), 3000);
                  loadTicket();
                }}
              />
            )}
          </div>

          <CustomFieldsSection entity="tickets" tableName="ticket" entityId={ticket.ticketnr} />

          <div className="card">
            <div className="card-title">Ticket-Felder</div>
            <EditField label="Status" value={ticket.status_name} editValue={ticket.status_id}
              type="select" options={statusOptions} onSave={(v) => update('status_id', v)} />
            <EditField label="Kritikalität" value={ticket.kritikalitaet_name} editValue={ticket['kritikalität_id']}
              type="select" options={kritOptions} onSave={(v) => update('kritikalitaet_id', v)} />
            <EditField label="Kategorie" value={ticket.kategorie_name} editValue={ticket.kategorie_id}
              type="select" options={kategorieOptions} onSave={(v) => update('kategorie_id', v)} />
            <EditField label="Kunde" value={ticket.kunden_name} editValue={ticket.ticket_kundennummer}
              type="select" options={kundenOptions} onSave={(v) => update('ticket_kundennummer', v)} />
            <EditField
              label="Maschine"
              value={ticket.maschine_maschinennr ? `${ticket.maschine_maschinennr}${ticket.maschine_typ ? ` (${ticket.maschine_typ})` : ''}` : null}
              editValue={ticket.ticket_maschinenid}
              type="select"
              options={maschinenOptions}
              nullable
              onSave={(v) => update('ticket_maschinenid', v || null)}
            />
            <EditField
              label="Ansprechpartner"
              value={ticket.ap_name}
              editValue={ticket.ticket_ansprechpartnerid}
              type="select"
              options={apOptions}
              nullable
              onSave={(v) => update('ticket_ansprechpartnerid', v || null)}
            />
            <EditField
              label="Zugewiesen an"
              value={ticket.assigned_display_name}
              editValue={ticket.assigned_to}
              type="select"
              options={userOptions}
              nullable
              onSave={(v) => update('assigned_to', v || null)}
            />
            <EditField label="Erstellt von" value={ticket.erstellt_von} type="text"
              onSave={(v) => update('erstellt_von', v)} />
            <EditField label="Geändert von" value={ticket.geändert_von} type="text"
              onSave={(v) => update('geändert_von', v)} />
            <div className="field-row">
              <div className="field-key">Erstellt am</div>
              <div className="field-val text-muted">{new Date(ticket.erstellt_am).toLocaleString('de-DE')}</div>
            </div>
            {ticket.geändert_am && (
              <div className="field-row">
                <div className="field-key">Geändert am</div>
                <div className="field-val text-muted">{new Date(ticket.geändert_am).toLocaleString('de-DE')}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Kunde Sidebar */}
          {kunde ? (
            <div className="card">
              <div className="card-title">Kunde</div>
              <Link to={`/kunden/${kunde.kundennummer}`} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                {kunde.name_kunde}
              </Link>
              {kunde.zusatz && <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{kunde.zusatz}</div>}
              {kunde.service_priority_name && (
                <div style={{ marginTop: 6, marginBottom: 10 }}>
                  <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>{kunde.service_priority_name}</span>
                </div>
              )}
              {(kunde.ort || kunde.plz) && (
                <div className="field-row">
                  <div className="field-key">Ort</div>
                  <div className="field-val">{[kunde.plz, kunde.ort].filter(Boolean).join(' ')}</div>
                </div>
              )}
              {kunde.emails?.length > 0 && (
                <div className="field-row">
                  <div className="field-key">E-Mail</div>
                  <div className="field-val">
                    {kunde.emails.map((e, i) => <a key={i} href={`mailto:${e}`} style={{ color: 'var(--accent)', fontSize: 12, display: 'block' }}>{e}</a>)}
                  </div>
                </div>
              )}
              {kunde.telefonnummern?.length > 0 && (
                <div className="field-row">
                  <div className="field-key">Telefon</div>
                  <div className="field-val">{kunde.telefonnummern[0]}</div>
                </div>
              )}
              {kundenAP.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="card-title" style={{ fontSize: 12, marginBottom: 6 }}>Ansprechpartner</div>
                  {kundenAP.slice(0, 3).map(ap => (
                    <div key={ap.ansprechpartnerid} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 500 }}>{ap.ansprechpartner_name}</div>
                      {ap.position_name && <div className="text-muted" style={{ fontSize: 12 }}>{ap.position_name}</div>}
                      {ap.ansprechpartner_email && (
                        <a href={`mailto:${ap.ansprechpartner_email}`} style={{ color: 'var(--accent)', fontSize: 12 }}>{ap.ansprechpartner_email}</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="card-title">Kunde</div>
              <div className="text-muted">Kein Kunde zugeordnet</div>
            </div>
          )}

          {/* Meta */}
          <div className="card">
            <div className="card-title">Meta</div>
            <div className="field-row">
              <div className="field-key">Ticket-Nr.</div>
              <div className="field-val mono" style={{ color: 'var(--accent)' }}>#{ticket.ticketnr}</div>
            </div>
            {ticket.status_name && (
              <div className="field-row">
                <div className="field-key">Status</div>
                <div className="field-val">
                  <span className="badge" style={{
                    background: ticket.is_terminal ? 'rgba(100,116,139,0.15)' : 'rgba(59,130,246,0.15)',
                    color: ticket.is_terminal ? '#64748b' : 'var(--accent)'
                  }}>{ticket.status_name}</span>
                </div>
              </div>
            )}
            {ticket.kritikalitaet_name && (
              <div className="field-row">
                <div className="field-key">Kritikalität</div>
                <div className="field-val">
                  <span className="badge" style={{
                    background: getKritColor(ticket.kritikalitaet_gewichtung) + '22',
                    color: getKritColor(ticket.kritikalitaet_gewichtung)
                  }}>{ticket.kritikalitaet_name}</span>
                </div>
              </div>
            )}
            <div className="field-row">
              <div className="field-key">Zugewiesen</div>
              <div className="field-val">{ticket.assigned_display_name || <span className="text-muted">–</span>}</div>
            </div>
            <div className="field-row">
              <div className="field-key">Aktualisiert</div>
              <div className="field-val text-muted">{new Date(ticket.updated_at || ticket.created_at).toLocaleString('de-DE')}</div>
            </div>
          </div>
        </div>
      </div>

      {movingMsg && (
        <MoveMessageModal
          message={movingMsg}
          currentTicketnr={ticket.ticketnr}
          onClose={() => setMovingMsg(null)}
          onMoved={() => { setMovingMsg(null); loadTicket(); }}
        />
      )}
    </div>
  );
}
