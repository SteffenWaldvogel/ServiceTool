import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import FilterBar from '../components/FilterBar';
import SortableHeader from '../components/SortableHeader';
import { useFilter } from '../hooks/useFilter';

function ErsatzteilModal({ item, allParts, onClose, onSaved }) {
  const isEdit = !!item;
  const [form, setForm] = useState(item ? {
    bezeichnung: item.bezeichnung || '',
    zusätzliche_bezeichnungen: item.zusätzliche_bezeichnungen || '',
    baugruppe_artikelnr: item.baugruppe_artikelnr || '',
    zusatzinfos: item.zusatzinfos || '',
    bemerkung_ersatzteil: item.bemerkung_ersatzteil || ''
  } : {
    bezeichnung: '',
    zusätzliche_bezeichnungen: '',
    baugruppe_artikelnr: '',
    zusatzinfos: '',
    bemerkung_ersatzteil: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.bezeichnung.trim()) { setError('Bezeichnung ist erforderlich'); return; }
    setLoading(true); setError('');
    try {
      const data = {
        bezeichnung: form.bezeichnung.trim(),
        zusätzliche_bezeichnungen: form.zusätzliche_bezeichnungen.trim() || null,
        baugruppe_artikelnr: form.baugruppe_artikelnr || null,
        zusatzinfos: form.zusatzinfos.trim() || null,
        bemerkung_ersatzteil: form.bemerkung_ersatzteil.trim() || null
      };
      const saved = isEdit
        ? await api.updateErsatzteil(item.artikelnr, data)
        : await api.createErsatzteil(data);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const baugruppeOptions = allParts.filter(p => !isEdit || p.artikelnr !== item.artikelnr);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Ersatzteil bearbeiten' : 'Neues Ersatzteil'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Bezeichnung *</label>
              <input
                className="form-control"
                value={form.bezeichnung}
                onChange={set('bezeichnung')}
                placeholder="z.B. Hydraulikdichtung 40mm"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Zusätzliche Bezeichnungen</label>
              <input
                className="form-control"
                value={form.zusätzliche_bezeichnungen}
                onChange={set('zusätzliche_bezeichnungen')}
                placeholder="Alternative Namen, Synonyme…"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Baugruppe (übergeordnetes Teil)</label>
              <select className="form-control" value={form.baugruppe_artikelnr} onChange={set('baugruppe_artikelnr')}>
                <option value="">— Kein übergeordnetes Teil —</option>
                {baugruppeOptions.map(p => (
                  <option key={p.artikelnr} value={p.artikelnr}>
                    [{p.artikelnr}] {p.bezeichnung}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Zusatzinfos</label>
              <textarea
                className="form-control"
                value={form.zusatzinfos}
                onChange={set('zusatzinfos')}
                rows={2}
                placeholder="Technische Hinweise, Spezifikationen…"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Bemerkung</label>
              <textarea
                className="form-control"
                value={form.bemerkung_ersatzteil}
                onChange={set('bemerkung_ersatzteil')}
                rows={2}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Speichern…' : isEdit ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ErsatzteileList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [allItems, setAllItems] = useState([]); // for baugruppe select in modal
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const { filters, sort, page, setFilter, setSort, setPage, clearFilters, buildParams } = useFilter({});

  const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== null && v !== undefined).length;

  const load = useCallback(() => {
    setLoading(true);
    const params = buildParams();
    api.getErsatzteile(params)
      .then(res => {
        if (res && typeof res === 'object' && 'data' in res) {
          setItems(res.data);
          setTotal(res.total);
        } else {
          setItems(Array.isArray(res) ? res : []);
          setTotal(Array.isArray(res) ? res.length : 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  // Load all items for baugruppe select (unfiltered)
  useEffect(() => {
    api.getErsatzteile({ limit: 1000 })
      .then(res => setAllItems(res && res.data ? res.data : (Array.isArray(res) ? res : [])))
      .catch(console.error);
  }, []);

  const filterConfig = [
    { key: 'search', type: 'search', label: 'Bezeichnung', placeholder: 'Suchbegriff…' },
    { key: 'artikelnr', type: 'search', label: 'Artikelnr.', placeholder: 'z.B. 42' },
    { key: 'nur_baugruppen', type: 'select', label: 'Typ',
      options: [{ id: 'false', label: 'Einzelteile' }, { id: 'true', label: 'Baugruppen' }] },
  ];

  const totalPages = Math.ceil(total / page.limit);
  const currentPage = Math.floor(page.offset / page.limit) + 1;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Ersatzteile</div>
          <div className="page-subtitle">{total} Artikel</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Neues Ersatzteil</button>
      </div>

      <FilterBar
        filterConfig={filterConfig}
        filters={filters}
        onFilterChange={setFilter}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      />

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
        <div className="loading"><div className="spinner" /> Lade Ersatzteile…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔩</div>
          <p>Keine Ersatzteile gefunden</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th><SortableHeader field="artikelnr" label="Artikel-Nr." sort={sort} onSort={setSort} /></th>
                <th><SortableHeader field="bezeichnung" label="Bezeichnung" sort={sort} onSort={setSort} /></th>
                <th>Zusatzbezeichnungen</th>
                <th>Baugruppe</th>
                <th style={{ textAlign: 'right' }}>Kompatibilität</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.artikelnr} style={{ cursor: 'pointer' }} onClick={() => navigate(`/ersatzteile/${item.artikelnr}`)}>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>
                    {item.artikelnr}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {item.bezeichnung}
                    {item.zusatzinfos && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.zusatzinfos.slice(0, 60)}{item.zusatzinfos.length > 60 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {item.zusätzliche_bezeichnungen || <span className="text-muted">–</span>}
                  </td>
                  <td>
                    {item.baugruppe_bezeichnung ? (
                      <span style={{ fontSize: 12 }}>
                        <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                          [{item.baugruppe_artikelnr}]
                        </span>
                        {' '}{item.baugruppe_bezeichnung}
                      </span>
                    ) : <span className="text-muted">–</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.kompatibilitaet_anzahl > 0 ? (
                      <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        {item.kompatibilitaet_anzahl}
                      </span>
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Bearbeiten"
                        onClick={(e) => { e.stopPropagation(); setModal({ edit: item }); }}
                      >✎</button>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Löschen"
                        style={{ color: 'var(--danger)' }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`"${item.bezeichnung}" wirklich löschen?`)) {
                            await api.deleteErsatzteil(item.artikelnr);
                            load();
                          }
                        }}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {(modal === 'create' || modal?.edit) && (
        <ErsatzteilModal
          item={modal?.edit || null}
          allParts={allItems}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
