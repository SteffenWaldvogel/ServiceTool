import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

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

  // Exclude self from baugruppe options
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
  const [maschinentypen, setMaschinentypen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', maschinentyp_id: '' });
  const [modal, setModal] = useState(null); // null | 'create' | { edit: item }

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.maschinentyp_id) params.maschinentyp_id = filters.maschinentyp_id;
    api.getErsatzteile(params)
      .then(setItems)
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
          <div className="page-title">Ersatzteile</div>
          <div className="page-subtitle">{items.length} Artikel</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Neues Ersatzteil</button>
      </div>

      <div className="filter-bar">
        <input
          className="form-control"
          placeholder="Suche nach Bezeichnung, Artikelnr., Zusatzbezeichnung…"
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
                <th>Artikel-Nr.</th>
                <th>Bezeichnung</th>
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

      {(modal === 'create' || modal?.edit) && (
        <ErsatzteilModal
          item={modal?.edit || null}
          allParts={items}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
