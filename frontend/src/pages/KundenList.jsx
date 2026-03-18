import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import FilterBar from '../components/FilterBar';
import SortableHeader from '../components/SortableHeader';
import { useFilter } from '../hooks/useFilter';

function CreateKundeModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name_kunde: '',
    matchcode: '',
    zusatz: '',
    straße: '',
    hausnr: '',
    plz: '',
    ort: '',
    land: 'Deutschland',
    service_priority_id: '',
    bemerkung_kunde: '',
    emails: [''],
    telefonnummern: ['']
  });
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getServicePriorities().then(setPriorities).catch(console.error);
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const setEmail = (i) => (e) => {
    setForm(f => {
      const emails = [...f.emails];
      emails[i] = e.target.value;
      return { ...f, emails };
    });
  };

  const setTel = (i) => (e) => {
    setForm(f => {
      const telefonnummern = [...f.telefonnummern];
      telefonnummern[i] = e.target.value;
      return { ...f, telefonnummern };
    });
  };

  const removeEmail = (i) => setForm(f => ({ ...f, emails: f.emails.filter((_, j) => j !== i) }));
  const removeTel = (i) => setForm(f => ({ ...f, telefonnummern: f.telefonnummern.filter((_, j) => j !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name_kunde.trim()) { setError('Firmenname ist erforderlich'); return; }
    setLoading(true); setError('');
    try {
      const data = {
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
      };
      const kunde = await api.createKunde(data);
      onCreated(kunde);
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
          <div className="modal-title">Neuen Kunden anlegen</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Firmenname *</label>
              <input className="form-control" value={form.name_kunde} onChange={set('name_kunde')} placeholder="Musterfirma GmbH" />
            </div>
            <div className="form-group">
              <label className="form-label">Matchcode</label>
              <input className="form-control" value={form.matchcode} onChange={set('matchcode')} placeholder="MUSTER" />
            </div>
            <div className="form-group">
              <label className="form-label">Zusatz</label>
              <input className="form-control" value={form.zusatz} onChange={set('zusatz')} placeholder="Niederlassung Nord" />
            </div>
            <div className="form-group">
              <label className="form-label">Straße</label>
              <input className="form-control" value={form.straße} onChange={set('straße')} placeholder="Musterstraße" />
            </div>
            <div className="form-group">
              <label className="form-label">Hausnummer</label>
              <input className="form-control" value={form.hausnr} onChange={set('hausnr')} placeholder="12a" />
            </div>
            <div className="form-group">
              <label className="form-label">PLZ</label>
              <input className="form-control" value={form.plz} onChange={set('plz')} placeholder="12345" />
            </div>
            <div className="form-group">
              <label className="form-label">Ort</label>
              <input className="form-control" value={form.ort} onChange={set('ort')} placeholder="Musterstadt" />
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
              <textarea className="form-control" value={form.bemerkung_kunde} onChange={set('bemerkung_kunde')} rows={2} />
            </div>
          </div>

          <hr className="divider" />
          <div className="card-title">E-Mail-Adressen</div>
          {form.emails.map((email, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={setEmail(i)}
                placeholder="email@firma.de"
                style={{ flex: 1 }}
              />
              {i > 0 && (
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeEmail(i)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() =>
            setForm(f => ({ ...f, emails: [...f.emails, ''] }))
          }>+ E-Mail hinzufügen</button>

          <hr className="divider" />
          <div className="card-title">Telefonnummern</div>
          {form.telefonnummern.map((tel, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                className="form-control"
                value={tel}
                onChange={setTel(i)}
                placeholder="+49 123 456789"
                style={{ flex: 1 }}
              />
              {i > 0 && (
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeTel(i)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() =>
            setForm(f => ({ ...f, telefonnummern: [...f.telefonnummern, ''] }))
          }>+ Telefon hinzufügen</button>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Speichern…' : 'Kunde anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function KundenList() {
  const [kunden, setKunden] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [servicePriorities, setServicePriorities] = useState([]);
  const navigate = useNavigate();

  const { filters, sort, page, setFilter, setSort, setPage, clearFilters, buildParams } = useFilter({});

  const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== null && v !== undefined).length;

  const load = useCallback(() => {
    setLoading(true);
    const params = buildParams();
    api.getKunden(params)
      .then(res => {
        if (res && typeof res === 'object' && 'data' in res) {
          setKunden(res.data);
          setTotal(res.total);
        } else {
          setKunden(Array.isArray(res) ? res : []);
          setTotal(Array.isArray(res) ? res.length : 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getServicePriorities().then(setServicePriorities).catch(console.error);
  }, []);

  const filterConfig = [
    { key: 'search', type: 'search', label: 'Suche', placeholder: 'Name, Matchcode…' },
    { key: 'plz', type: 'search', label: 'PLZ', placeholder: 'z.B. 70…' },
    { key: 'service_priority_id', type: 'select', label: 'Priority', options: servicePriorities.map(s => ({ id: s.id || s.service_priority_id, label: s.name || s.priority_name || s.service_priority_name })) },
  ];

  const totalPages = Math.ceil(total / page.limit);
  const currentPage = Math.floor(page.offset / page.limit) + 1;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Kunden</div>
          <div className="page-subtitle">{total} Kunden</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Neuer Kunde</button>
      </div>

      <FilterBar
        filterConfig={filterConfig}
        filters={filters}
        onFilterChange={setFilter}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      />

      {/* Page size selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Zeigen:</span>
          {[25, 50, 100].map(n => (
            <button key={n} className={`btn btn-sm ${page.limit === n ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setPage({ limit: n, offset: 0 })}>{n}</button>
          ))}
        </div>
        {total > page.limit && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <button className="btn btn-ghost btn-sm" disabled={currentPage <= 1}
              onClick={() => setPage(p => ({ ...p, offset: p.offset - p.limit }))}>←</button>
            <span style={{ color: 'var(--text-secondary)' }}>{currentPage} / {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={currentPage >= totalPages}
              onClick={() => setPage(p => ({ ...p, offset: p.offset + p.limit }))}>→</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Lade Kunden…</div>
      ) : kunden.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏢</div>
          <p>Keine Kunden gefunden</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th><SortableHeader field="kundennummer" label="Nr." sort={sort} onSort={setSort} /></th>
                <th>Matchcode</th>
                <th><SortableHeader field="name_kunde" label="Firmenname" sort={sort} onSort={setSort} /></th>
                <th><SortableHeader field="ort" label="Ort" sort={sort} onSort={setSort} /></th>
                <th><SortableHeader field="plz" label="PLZ" sort={sort} onSort={setSort} /></th>
                <th><SortableHeader field="service_priority" label="Priority" sort={sort} onSort={setSort} /></th>
                <th style={{ textAlign: 'right' }}><SortableHeader field="ticket_count" label="Tickets" sort={sort} onSort={setSort} /></th>
                <th style={{ textAlign: 'right' }}>Offen</th>
              </tr>
            </thead>
            <tbody>
              {kunden.map(k => (
                <tr key={k.kundennummer} onClick={() => navigate(`/kunden/${k.kundennummer}`)}>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.kundennummer}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{k.matchcode || <span className="text-muted">–</span>}</td>
                  <td style={{ fontWeight: 500 }}>
                    {k.name_kunde}
                    {k.zusatz && <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6, fontSize: 12 }}>{k.zusatz}</span>}
                  </td>
                  <td>{k.ort || <span className="text-muted">–</span>}</td>
                  <td>{k.plz || <span className="text-muted">–</span>}</td>
                  <td>
                    {k.service_priority_name
                      ? <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>{k.service_priority_name}</span>
                      : <span className="text-muted">–</span>
                    }
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>{k.ticket_count ?? k.ticket_anzahl ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    {k.offene_tickets > 0
                      ? <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>{k.offene_tickets}</span>
                      : <span className="text-muted">0</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom pagination */}
      {total > page.limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" disabled={currentPage <= 1}
            onClick={() => setPage(p => ({ ...p, offset: 0 }))}>«</button>
          <button className="btn btn-ghost btn-sm" disabled={currentPage <= 1}
            onClick={() => setPage(p => ({ ...p, offset: p.offset - p.limit }))}>‹</button>
          <span style={{ padding: '4px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
            Seite {currentPage} von {totalPages} ({total} gesamt)
          </span>
          <button className="btn btn-ghost btn-sm" disabled={currentPage >= totalPages}
            onClick={() => setPage(p => ({ ...p, offset: p.offset + p.limit }))}>›</button>
          <button className="btn btn-ghost btn-sm" disabled={currentPage >= totalPages}
            onClick={() => setPage({ limit: page.limit, offset: (totalPages - 1) * page.limit })}>»</button>
        </div>
      )}

      {showCreate && (
        <CreateKundeModal
          onClose={() => setShowCreate(false)}
          onCreated={(k) => { setShowCreate(false); navigate(`/kunden/${k.kundennummer}`); }}
        />
      )}
    </div>
  );
}
