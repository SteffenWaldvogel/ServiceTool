import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getKritColor, parseKategorie } from '../utils/helpers';

function CreateTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    betreff: '',
    beschreibung: '',
    ticket_kundennummer: '',
    status_id: '',
    kritikalitaet_id: '',
    kategorie_id: '',
    ticket_maschinenid: '',
    ticket_ansprechpartnerid: '',
    erstellt_von: '',
    send_confirmation: false
  });
  const [lookup, setLookup] = useState({ status: [], kategorien: [], kritikalitaeten: [], kunden: [] });
  const [maschinen, setMaschinen] = useState([]);
  const [ansprechpartner, setAnsprechpartner] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getStatus(),
      api.getKategorien(),
      api.getKritikalitaeten(),
      api.getKunden()
    ]).then(([status, kategorien, kritikalitaeten, kunden]) => {
      setLookup({ status, kategorien, kritikalitaeten, kunden });
      const offen = status.find(s => s.status_name === 'Offen');
      if (offen) setForm(f => ({ ...f, status_id: String(offen.status_id) }));
    }).catch(console.error);
  }, []);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'ticket_kundennummer') {
      setForm(f => ({ ...f, ticket_kundennummer: val, ticket_maschinenid: '', ticket_ansprechpartnerid: '' }));
      if (val) {
        api.getMaschinen().then(all => setMaschinen(all)).catch(() => setMaschinen([]));
        api.getKunde(val).then(k => setAnsprechpartner(k.ansprechpartner || [])).catch(() => setAnsprechpartner([]));
      } else {
        setMaschinen([]);
        setAnsprechpartner([]);
      }
    } else {
      setForm(f => ({ ...f, [k]: val }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.betreff.trim()) { setError('Betreff ist erforderlich'); return; }
    if (!form.ticket_kundennummer) { setError('Kunde ist erforderlich'); return; }
    if (!form.kritikalitaet_id) { setError('Kritikalität ist erforderlich'); return; }
    if (!form.kategorie_id) { setError('Kategorie ist erforderlich'); return; }
    if (!form.status_id) { setError('Status ist erforderlich'); return; }
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
        beschreibung: form.beschreibung.trim() || null,
        erstellt_von: form.erstellt_von.trim() || null,
        send_confirmation: form.send_confirmation
      });
      onCreated(ticket);
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
          <div className="modal-title">Neues Ticket erstellen</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Betreff *</label>
            <input
              className="form-control"
              value={form.betreff}
              onChange={set('betreff')}
              placeholder="Kurze Beschreibung des Problems"
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Kunde *</label>
              <select className="form-control" value={form.ticket_kundennummer} onChange={set('ticket_kundennummer')}>
                <option value="">— Kunden wählen —</option>
                {lookup.kunden.map(k => (
                  <option key={k.kundennummer} value={k.kundennummer}>{k.name_kunde}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Maschine {!form.ticket_kundennummer && <span className="text-muted">(erst Kunde wählen)</span>}
              </label>
              <select
                className="form-control"
                value={form.ticket_maschinenid}
                onChange={set('ticket_maschinenid')}
                disabled={!form.ticket_kundennummer}
              >
                <option value="">— Keine —</option>
                {maschinen.map(m => (
                  <option key={m.maschinenid} value={m.maschinenid}>
                    {m.maschinennr} {m.maschinentyp_name ? `(${m.maschinentyp_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ansprechpartner</label>
              <select
                className="form-control"
                value={form.ticket_ansprechpartnerid}
                onChange={set('ticket_ansprechpartnerid')}
                disabled={!form.ticket_kundennummer}
              >
                <option value="">— Keiner —</option>
                {ansprechpartner.map(ap => (
                  <option key={ap.ansprechpartnerid} value={ap.ansprechpartnerid}>
                    {ap.ansprechpartner_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status *</label>
              <select className="form-control" value={form.status_id} onChange={set('status_id')}>
                <option value="">— Status wählen —</option>
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
          </div>
          <div className="form-group">
            <label className="form-label">Erstellt von</label>
            <input
              className="form-control"
              value={form.erstellt_von}
              onChange={set('erstellt_von')}
              placeholder="Name des Erstellers"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Beschreibung</label>
            <textarea
              className="form-control"
              value={form.beschreibung}
              onChange={set('beschreibung')}
              rows={4}
              placeholder="Detaillierte Beschreibung des Problems…"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="checkbox"
              id="sendEmail"
              checked={form.send_confirmation}
              onChange={set('send_confirmation')}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="sendEmail" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Bestätigungs-E-Mail an Kunden senden
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Erstellen…' : 'Ticket erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ search: '', status_id: '', kritikalitaet_id: '' });
  const [statusList, setStatusList] = useState([]);
  const [kritList, setKritList] = useState([]);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.status_id) params.status_id = filters.status_id;
    if (filters.kritikalitaet_id) params.kritikalitaet_id = filters.kritikalitaet_id;
    api.getTickets(params)
      .then(setTickets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getStatus().then(setStatusList).catch(console.error);
    api.getKritikalitaeten().then(setKritList).catch(console.error);
  }, []);

  const setFilter = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Tickets</div>
          <div className="page-subtitle">{tickets.length} Tickets gefunden</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Neues Ticket</button>
      </div>

      <div className="filter-bar">
        <input
          className="form-control"
          placeholder="Suche nach Betreff, Ticket-Nr., Kunde…"
          value={filters.search}
          onChange={setFilter('search')}
          style={{ flex: 2 }}
        />
        <select className="form-control" value={filters.status_id} onChange={setFilter('status_id')}>
          <option value="">Alle Status</option>
          {statusList.map(s => <option key={s.status_id} value={s.status_id}>{s.status_name}</option>)}
        </select>
        <select className="form-control" value={filters.kritikalitaet_id} onChange={setFilter('kritikalitaet_id')}>
          <option value="">Alle Kritikalitäten</option>
          {kritList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setFilters({ search: '', status_id: '', kritikalitaet_id: '' })}
        >
          Zurücksetzen
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Lade Tickets…</div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>Keine Tickets gefunden</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ticket-Nr.</th>
                <th>Betreff</th>
                <th>Kunde</th>
                <th>Kategorie</th>
                <th>Kritikalität</th>
                <th>Status</th>
                <th>Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.ticketnr} onClick={() => navigate(`/tickets/${t.ticketnr}`)}>
                  <td>
                    <span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>#{t.ticketnr}</span>
                  </td>
                  <td style={{ maxWidth: 280 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.betreff || <span className="text-muted">(kein Betreff)</span>}
                    </span>
                  </td>
                  <td>{t.kunden_name || <span className="text-muted">–</span>}</td>
                  <td>
                    {t.kategorie_name ? (() => {
                      const { typ, level } = parseKategorie(t.kategorie_name);
                      return (
                        <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 10 }}>{typ}</span>
                          {level && <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: 10 }}>{level}</span>}
                        </span>
                      );
                    })() : <span className="text-muted">–</span>}
                  </td>
                  <td>
                    {t.kritikalitaet_name ? (
                      <span className="badge" style={{
                        background: getKritColor(t.kritikalitaet_gewichtung) + '22',
                        color: getKritColor(t.kritikalitaet_gewichtung)
                      }}>
                        {t.kritikalitaet_name}
                      </span>
                    ) : <span className="text-muted">–</span>}
                  </td>
                  <td>
                    {t.status_name ? (
                      <span className="badge" style={{
                        background: t.is_terminal ? 'rgba(100,116,139,0.15)' : 'rgba(59,130,246,0.15)',
                        color: t.is_terminal ? '#64748b' : 'var(--accent)'
                      }}>
                        {t.status_name}
                      </span>
                    ) : <span className="text-muted">–</span>}
                  </td>
                  <td className="text-muted" style={{ fontSize: 12 }}>
                    {new Date(t.erstellt_am).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={(ticket) => { setShowCreate(false); navigate(`/tickets/${ticket.ticketnr}`); }}
        />
      )}
    </div>
  );
}
