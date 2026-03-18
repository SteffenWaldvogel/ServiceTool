import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import QuickCreate from '../components/QuickCreate';
import FilterBar from '../components/FilterBar';
import SortableHeader from '../components/SortableHeader';
import { useFilter } from '../hooks/useFilter';

function MaschineModal({ item, maschinentypen, onClose, onSaved, onMaschinentypenUpdate }) {
  const isEdit = !!item;
  const [form, setForm] = useState(item ? {
    maschinennr: item.maschinennr || '',
    bezeichnung: item.bezeichnung || '',
    maschinentyp_id: item.maschinentyp_id ? String(item.maschinentyp_id) : '',
    baujahr: item.baujahr || ''
  } : {
    maschinennr: '',
    bezeichnung: '',
    maschinentyp_id: '',
    baujahr: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.maschinennr.trim()) { setError('Maschinennummer ist erforderlich'); return; }
    if (!form.maschinentyp_id) { setError('Maschinentyp ist erforderlich'); return; }
    setLoading(true); setError('');
    try {
      const data = {
        maschinennr: form.maschinennr.trim(),
        bezeichnung: form.bezeichnung.trim() || null,
        maschinentyp_id: form.maschinentyp_id,
        baujahr: form.baujahr ? parseInt(form.baujahr) : null
      };
      const saved = isEdit
        ? await api.updateMaschine(item.maschinenid, data)
        : await api.createMaschine(data);
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
          <div className="modal-title">{isEdit ? 'Maschine bearbeiten' : 'Neue Maschine anlegen'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Maschinennummer *</label>
            <input
              className="form-control"
              value={form.maschinennr}
              onChange={set('maschinennr')}
              placeholder="z.B. SN-2024-001"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bezeichnung</label>
            <input
              className="form-control"
              value={form.bezeichnung}
              onChange={set('bezeichnung')}
              placeholder="z.B. Hydraulikpresse Typ A"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Maschinentyp *</label>
            <QuickCreate
              label="Maschinentyp"
              value={form.maschinentyp_id}
              onChange={v => setForm(f => ({ ...f, maschinentyp_id: v }))}
              options={maschinentypen.map(m => ({ id: m.id, label: m.name }))}
              onCreateNew={async (data) => {
                const created = await api.createMaschinentyp({
                  maschinentyp_name: data.name,
                  maschinentyp_beschreibung: data.beschreibung || null
                });
                if (onMaschinentypenUpdate) onMaschinentypenUpdate(created);
                return { id: created.maschinentyp_id || created.id };
              }}
              createFields={[
                { key: 'name', label: 'Name', required: true },
                { key: 'beschreibung', label: 'Beschreibung', type: 'textarea' },
              ]}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Baujahr</label>
            <input
              className="form-control"
              type="number"
              min="1900"
              max="2100"
              value={form.baujahr}
              onChange={set('baujahr')}
              placeholder="z.B. 2020"
            />
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

export default function MaschinenList() {
  const navigate = useNavigate();
  const [maschinen, setMaschinen] = useState([]);
  const [total, setTotal] = useState(0);
  const [maschinentypen, setMaschinentypen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const { filters, sort, page, setFilter, setSort, setPage, clearFilters, buildParams } = useFilter({});

  const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== null && v !== undefined).length;

  const load = useCallback(() => {
    setLoading(true);
    const params = buildParams();
    api.getMaschinen(params)
      .then(res => {
        if (res && typeof res === 'object' && 'data' in res) {
          setMaschinen(res.data);
          setTotal(res.total);
        } else {
          setMaschinen(Array.isArray(res) ? res : []);
          setTotal(Array.isArray(res) ? res.length : 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getMaschinentypen().then(setMaschinentypen).catch(console.error);
  }, []);

  const filterConfig = [
    { key: 'search', type: 'search', label: 'Maschinennr.', placeholder: 'z.B. CNC-…' },
    { key: 'maschinentyp_id', type: 'select', label: 'Maschinentyp', options: maschinentypen.map(m => ({ id: m.id || m.maschinentyp_id, label: m.name || m.maschinentyp_name })) },
    { key: 'baujahr_von', type: 'number', label: 'Baujahr von', placeholder: '1990', advanced: true },
    { key: 'baujahr_bis', type: 'number', label: 'Baujahr bis', placeholder: '2024', advanced: true },
  ];

  const totalPages = Math.ceil(total / page.limit);
  const currentPage = Math.floor(page.offset / page.limit) + 1;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Maschinen</div>
          <div className="page-subtitle">{total} Maschinen</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Neue Maschine</button>
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
        <div className="loading"><div className="spinner" /> Lade Maschinen…</div>
      ) : maschinen.length === 0 ? (
        <div className="empty-state">
          <div className="icon">⚙️</div>
          <p>Keine Maschinen gefunden</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th><SortableHeader field="maschinennr" label="Maschinennummer" sort={sort} onSort={setSort} /></th>
                <th>Bezeichnung</th>
                <th><SortableHeader field="maschinentyp" label="Typ" sort={sort} onSort={setSort} /></th>
                <th><SortableHeader field="baujahr" label="Baujahr" sort={sort} onSort={setSort} /></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {maschinen.map(m => (
                <tr key={m.maschinenid} style={{ cursor: 'pointer' }} onClick={() => navigate(`/maschinen/${m.maschinenid}`)}>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.maschinenid}</td>
                  <td>
                    <span className="mono" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 500 }}>
                      {m.maschinennr}
                    </span>
                  </td>
                  <td>{m.bezeichnung || <span className="text-muted">–</span>}</td>
                  <td>{m.maschinentyp_name || <span className="text-muted">–</span>}</td>
                  <td className="mono" style={{ fontSize: 13 }}>
                    {m.baujahr || <span className="text-muted">–</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Bearbeiten"
                        onClick={(e) => { e.stopPropagation(); setModal({ edit: m }); }}
                      >✎</button>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Löschen"
                        style={{ color: 'var(--danger)' }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Maschine "${m.maschinennr}" wirklich löschen?`)) {
                            try {
                              await api.deleteMaschine(m.maschinenid);
                              load();
                            } catch (err) {
                              alert(err.message);
                            }
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
        <MaschineModal
          item={modal?.edit || null}
          maschinentypen={maschinentypen}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          onMaschinentypenUpdate={(created) => {
            const newTyp = { id: created.maschinentyp_id || created.id, name: created.maschinentyp_name || created.name };
            setMaschinentypen(prev => [...prev, newTyp]);
          }}
        />
      )}
    </div>
  );
}
