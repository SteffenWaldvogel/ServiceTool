import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import QuickCreate from '../components/QuickCreate';

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
  const [maschinentypen, setMaschinentypen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', maschinentyp_id: '' });
  const [modal, setModal] = useState(null); // null | 'create' | { edit: item }

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.maschinentyp_id) params.maschinentyp_id = filters.maschinentyp_id;
    api.getMaschinen(params)
      .then(setMaschinen)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getMaschinentypen().then(setMaschinentypen).catch(console.error);
  }, []);

  const setFilter = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Maschinen</div>
          <div className="page-subtitle">{maschinen.length} Maschinen</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Neue Maschine</button>
      </div>

      <div className="filter-bar">
        <input
          className="form-control"
          placeholder="Suche nach Maschinennr. oder Typ…"
          value={filters.search}
          onChange={setFilter('search')}
          style={{ flex: 2 }}
        />
        <select className="form-control" value={filters.maschinentyp_id} onChange={setFilter('maschinentyp_id')}>
          <option value="">Alle Maschinentypen</option>
          {maschinentypen.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setFilters({ search: '', maschinentyp_id: '' })}
        >
          Zurücksetzen
        </button>
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
                <th>Maschinennummer</th>
                <th>Bezeichnung</th>
                <th>Typ</th>
                <th>Baujahr</th>
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
