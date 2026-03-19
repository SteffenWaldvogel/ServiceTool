import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getKritColor, parseKategorie, getSlaStatus, getSlaLabel } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import QuickCreate from '../components/QuickCreate';
import FilterBar from '../components/FilterBar';
import SortableHeader from '../components/SortableHeader';

function highlight(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} style={{ background: '#f59e0b33', color: '#f59e0b', borderRadius: 2, padding: '0 2px' }}>{part}</mark>
      : part
  );
}

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
  const [lookup, setLookup] = useState({
    status: [], kategorien: [], kritikalitaeten: [], kunden: [],
    abteilungen: [], positionen: [], maschinentypen: []
  });
  const [maschinen, setMaschinen] = useState([]);
  const [kundenAP, setKundenAP] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getStatus(),
      api.getKategorien(),
      api.getKritikalitaeten(),
      api.getKunden(),
      api.getAbteilungen(),
      api.getPositionen(),
      api.getMaschinentypen(),
      api.getMaschinen()
    ]).then(([status, kategorien, kritikalitaeten, kunden, abteilungen, positionen, maschinentypen, maschinen]) => {
      setLookup({ status, kategorien, kritikalitaeten, kunden: kunden.data || kunden, abteilungen, positionen, maschinentypen });
      setMaschinen(maschinen.data || maschinen);
      const offen = status.find(s => s.status_name === 'Offen');
      if (offen) setForm(f => ({ ...f, status_id: String(offen.status_id) }));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.ticket_kundennummer) {
      api.getKunde(form.ticket_kundennummer)
        .then(k => setKundenAP(k.ansprechpartner || []))
        .catch(() => setKundenAP([]));
    } else {
      setKundenAP([]);
    }
  }, [form.ticket_kundennummer]);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
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
              <QuickCreate
                label="Kunde"
                value={form.ticket_kundennummer}
                onChange={v => { setForm(f => ({ ...f, ticket_kundennummer: v, ticket_ansprechpartnerid: '' })); }}
                options={lookup.kunden.map(k => ({ id: k.kundennummer, label: k.name_kunde }))}
                matchFn={data => api.matchKunden({ name_kunde: data.name_kunde, matchcode: data.matchcode, plz: data.plz, ort: data.ort, emails: data.email ? [data.email] : [] })}
                onCreateNew={async (data) => {
                  const k = await api.createKunde({
                    name_kunde: data.name_kunde,
                    matchcode: data.matchcode || data.name_kunde.substring(0, 10).toUpperCase(),
                    plz: data.plz || null,
                    ort: data.ort || null,
                    emails: data.email ? [data.email] : [],
                    telefonnummern: data.telefon ? [data.telefon] : [],
                    service_priority_id: null
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
            <div className="form-group">
              <label className="form-label">
                Maschine {!form.ticket_kundennummer && <span className="text-muted">(erst Kunde wählen)</span>}
              </label>
              <QuickCreate
                label="Maschine"
                value={form.ticket_maschinenid}
                onChange={v => setForm(f => ({ ...f, ticket_maschinenid: v }))}
                options={maschinen.map(m => ({ id: m.maschinenid, label: m.maschinennr, sublabel: m.maschinentyp_name }))}
                nullable
                matchFn={data => api.matchMaschinen({ maschinennr: data.maschinennr })}
                onCreateNew={async (data) => {
                  const m = await api.createMaschine({
                    maschinennr: data.maschinennr,
                    maschinentyp_id: data.maschinentyp_id,
                    baujahr: data.baujahr ? parseInt(data.baujahr) : null
                  });
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
                    abteilung_id: data.abteilung_id,
                    position_id: data.position_id,
                    ansprechpartner_email: data.email || null,
                    ansprechpartner_telefon: data.telefon || null,
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
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [myTickets, setMyTickets] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkAssigned, setBulkAssigned] = useState('');
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: '', status_id: '', kritikalitaet_id: '', kategorie_id: '', is_terminal: '', date_from: '', date_to: '' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState({ by: 'created_at', dir: 'desc' });
  const [page, setPage] = useState({ limit: 25, offset: 0 });
  const [statusList, setStatusList] = useState([]);
  const [kritList, setKritList] = useState([]);
  const [kategorienList, setKategorienList] = useState([]);
  const navigate = useNavigate();

  // Debounce Suche: API-Request erst 300ms nach letztem Tastendruck
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (filters.status_id) params.status_id = filters.status_id;
    if (filters.kritikalitaet_id) params.kritikalitaet_id = filters.kritikalitaet_id;
    if (filters.kategorie_id) params.kategorie_id = filters.kategorie_id;
    if (filters.is_terminal) params.is_terminal = filters.is_terminal;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (myTickets && user?.user_id) params.assigned_to = user.user_id;
    params.sort = sort.by;
    params.dir = sort.dir;
    params.limit = page.limit;
    params.offset = page.offset;
    api.getTickets(params)
      .then(result => {
        const ticketsArr = Array.isArray(result) ? result : result.data || [];
        const totalCount = Array.isArray(result) ? result.length : (parseInt(result.total) || ticketsArr.length);
        setTickets(ticketsArr);
        setTotal(totalCount);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters.status_id, filters.kritikalitaet_id, filters.kategorie_id, filters.is_terminal, filters.date_from, filters.date_to, debouncedSearch, sort, page, myTickets, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getStatus().then(setStatusList).catch(console.error);
    api.getKritikalitaeten().then(setKritList).catch(console.error);
    api.getKategorien().then(setKategorienList).catch(console.error);
    api.getLookupUsers().then(setUsers).catch(console.error);
  }, []);

  const toggleSelect = (nr) =>
    setSelected(s => { const n = new Set(s); n.has(nr) ? n.delete(nr) : n.add(nr); return n; });

  const toggleAll = () =>
    setSelected(s => s.size === tickets.length ? new Set() : new Set(tickets.map(t => t.ticketnr)));

  const handleBulkApply = async () => {
    if (selected.size === 0) return;
    const data = { ticketnrs: [...selected] };
    if (bulkStatus) data.status_id = bulkStatus;
    if (bulkAssigned !== '') data.assigned_to = bulkAssigned === 'null' ? null : bulkAssigned;
    try {
      await api.bulkUpdateTickets(data);
      setSelected(new Set());
      setBulkStatus('');
      setBulkAssigned('');
      load();
    } catch (err) {
      console.error('Bulk-Update fehlgeschlagen:', err);
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.status_id) params.status_id = filters.status_id;
      if (filters.kritikalitaet_id) params.kritikalitaet_id = filters.kritikalitaet_id;
      if (filters.kategorie_id) params.kategorie_id = filters.kategorie_id;
      if (filters.is_terminal) params.is_terminal = filters.is_terminal;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (myTickets && user?.user_id) params.assigned_to = user.user_id;
      const blob = await api.exportTickets(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export fehlgeschlagen:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(p => ({ ...p, offset: 0 }));
    setSelected(new Set());
  };

  const handleSort = (field) => {
    setSort(s => ({ by: field, dir: s.by === field && s.dir === 'asc' ? 'desc' : 'asc' }));
    setPage(p => ({ ...p, offset: 0 }));
    setSelected(new Set());
  };

  const filterConfig = [
    { key: 'search', label: 'Suche', type: 'search', placeholder: 'Betreff, Ticket-Nr., Kunde…' },
    { key: 'status_id', label: 'Status', type: 'select', options: statusList.map(s => ({ id: s.status_id, label: s.status_name })) },
    { key: 'kritikalitaet_id', label: 'Kritikalität', type: 'select', options: kritList.map(k => ({ id: k.id, label: k.name })) },
    { key: 'kategorie_id', label: 'Kategorie', type: 'select', options: kategorienList.map(k => ({ id: k.kategorie_id, label: k.kategorie_name })), advanced: true },
    { key: 'date', label: 'Erstellt', type: 'daterange', advanced: true },
    { key: 'is_terminal', label: 'Nur abgeschlossen', type: 'boolean', advanced: true },
  ];

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && !['search'].includes(k)).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Tickets</div>
          <div className="page-subtitle">Gesamt: {total} Tickets</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm${myTickets ? ' btn-primary' : ' btn-secondary'}`}
            onClick={() => { setMyTickets(v => !v); setPage(p => ({ ...p, offset: 0 })); }}
          >
            {myTickets ? '👤 Meine Tickets' : '👤 Meine Tickets'}
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>↓ CSV</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Neues Ticket</button>
        </div>
      </div>

      <FilterBar
        filterConfig={filterConfig}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={() => { setFilters({ search: '', status_id: '', kritikalitaet_id: '', kategorie_id: '', is_terminal: '', date_from: '', date_to: '' }); setPage(p => ({ ...p, offset: 0 })); }}
        activeCount={activeFilterCount}
      />

      {loading ? (
        <div className="loading"><div className="spinner" /> Lade Tickets…</div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>Keine Tickets gefunden</p>
        </div>
      ) : (
        <>
        {selected.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', marginBottom: 8,
            background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            borderRadius: 6, fontSize: 13
          }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{selected.size} ausgewählt</span>
            <select
              className="form-control"
              style={{ width: 160, height: 30, fontSize: 12 }}
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
            >
              <option value="">— Status setzen —</option>
              {statusList.map(s => <option key={s.status_id} value={s.status_id}>{s.status_name}</option>)}
            </select>
            <select
              className="form-control"
              style={{ width: 180, height: 30, fontSize: 12 }}
              value={bulkAssigned}
              onChange={e => setBulkAssigned(e.target.value)}
            >
              <option value="">— Zuweisen —</option>
              <option value="null">— Zuweisung aufheben —</option>
              {users.map(u => <option key={u.user_id} value={u.user_id}>{u.display_name}</option>)}
            </select>
            <button
              className="btn btn-primary btn-sm"
              disabled={!bulkStatus && bulkAssigned === ''}
              onClick={handleBulkApply}
            >
              Anwenden
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
              Abbrechen
            </button>
          </div>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={tickets.length > 0 && selected.size === tickets.length}
                    onChange={toggleAll}
                  />
                </th>
                <th><SortableHeader field="ticketnr" label="Ticket-Nr." sort={sort} onSort={handleSort} /></th>
                <th>Betreff</th>
                <th><SortableHeader field="kunde" label="Kunde" sort={sort} onSort={handleSort} /></th>
                <th>Kategorie</th>
                <th><SortableHeader field="kritikalitaet" label="Kritikalität" sort={sort} onSort={handleSort} /></th>
                <th><SortableHeader field="status" label="Status" sort={sort} onSort={handleSort} /></th>
                <th><SortableHeader field="assigned" label="Zugewiesen" sort={sort} onSort={handleSort} /></th>
                <th>SLA</th>
                <th><SortableHeader field="created_at" label="Erstellt" sort={sort} onSort={handleSort} /></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.ticketnr} onClick={() => navigate(`/tickets/${t.ticketnr}`)}>
                  <td onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(t.ticketnr)}
                      onChange={() => toggleSelect(t.ticketnr)}
                    />
                  </td>
                  <td>
                    <span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>#{highlight(String(t.ticketnr), filters.search)}</span>
                  </td>
                  <td style={{ maxWidth: 280 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.betreff
                        ? highlight(t.betreff.split('\n')[0], filters.search)
                        : <span className="text-muted">(kein Betreff)</span>}
                    </span>
                  </td>
                  <td>{t.kunden_name ? highlight(t.kunden_name, filters.search) : <span className="text-muted">–</span>}</td>
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
                  <td style={{ fontSize: 12 }}>
                    {t.assigned_display_name
                      ? <span style={{ color: 'var(--text-secondary)' }}>{t.assigned_display_name}</span>
                      : <span className="text-muted">–</span>}
                  </td>
                  <td>
                    {(() => {
                      const status = getSlaStatus(t);
                      if (!status || status === 'ok') return <span className="text-muted" style={{ fontSize: 11 }}>–</span>;
                      const color = status === 'overdue' ? '#ef4444' : '#f59e0b';
                      return (
                        <span style={{ fontSize: 11, color, fontWeight: 500 }}>
                          {status === 'overdue' ? '⚠ ' : '◔ '}{getSlaLabel(t)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="text-muted" style={{ fontSize: 12 }}>
                    {new Date(t.erstellt_am).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Gesamt: {total} · Seite {Math.floor(page.offset / page.limit) + 1} von {Math.ceil(total / page.limit) || 1}
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" disabled={page.offset === 0} onClick={() => { setPage(p => ({ ...p, offset: 0 })); setSelected(new Set()); }}>«</button>
          <button className="btn btn-ghost btn-sm" disabled={page.offset === 0} onClick={() => { setPage(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) })); setSelected(new Set()); }}>‹</button>
          <button className="btn btn-ghost btn-sm" disabled={page.offset + page.limit >= total} onClick={() => { setPage(p => ({ ...p, offset: p.offset + p.limit })); setSelected(new Set()); }}>›</button>
          <button className="btn btn-ghost btn-sm" disabled={page.offset + page.limit >= total} onClick={() => { setPage(p => ({ ...p, offset: Math.floor((total - 1) / p.limit) * p.limit })); setSelected(new Set()); }}>»</button>
          <select className="form-control" style={{ width: 80, height: 30, fontSize: 12 }} value={page.limit} onChange={e => { setPage({ limit: parseInt(e.target.value), offset: 0 }); setSelected(new Set()); }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={(ticket) => { setShowCreate(false); navigate(`/tickets/${ticket.ticketnr}`); }}
        />
      )}
    </div>
  );
}
