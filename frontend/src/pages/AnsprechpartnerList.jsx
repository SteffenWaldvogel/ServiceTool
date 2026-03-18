import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

function CreateAnsprechpartnerModal({ onClose, onSaved }) {
  const [kunden, setKunden] = useState([]);
  const [abteilungen, setAbteilungen] = useState([]);
  const [positionen, setPositionen] = useState([]);
  const [form, setForm] = useState({
    ansprechpartner_name: '',
    ansprechpartner_kundennr: '',
    abteilung_id: '',
    position_id: '',
    ansprechpartner_email: '',
    ansprechpartner_telefon: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getKunden({ limit: 500 }),
      api.getAbteilungen(),
    ]).then(([k, a]) => {
      setKunden(k);
      setAbteilungen(a);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.abteilung_id) {
      api.getPositionen(form.abteilung_id)
        .then(setPositionen)
        .catch(console.error);
    } else {
      setPositionen([]);
    }
  }, [form.abteilung_id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.ansprechpartner_name.trim()) { setError('Name ist erforderlich'); return; }
    if (!form.ansprechpartner_kundennr) { setError('Kunde ist erforderlich'); return; }
    if (!form.abteilung_id) { setError('Abteilung ist erforderlich'); return; }
    if (!form.position_id) { setError('Position ist erforderlich'); return; }
    setLoading(true); setError('');
    try {
      const saved = await api.createAnsprechpartnerStandalone({
        ansprechpartner_name: form.ansprechpartner_name.trim(),
        ansprechpartner_kundennr: form.ansprechpartner_kundennr,
        abteilung_id: form.abteilung_id,
        position_id: form.position_id,
        ansprechpartner_email: form.ansprechpartner_email || null,
        ansprechpartner_telefon: form.ansprechpartner_telefon || null,
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
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Neuen Ansprechpartner anlegen</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-control" value={form.ansprechpartner_name} onChange={set('ansprechpartner_name')} placeholder="Vor- und Nachname" />
          </div>
          <div className="form-group">
            <label className="form-label">Kunde *</label>
            <select className="form-control" value={form.ansprechpartner_kundennr} onChange={set('ansprechpartner_kundennr')}>
              <option value="">— Kunde wählen —</option>
              {kunden.map(k => (
                <option key={k.kundennummer} value={k.kundennummer}>
                  {k.name_kunde}{k.matchcode ? ` (${k.matchcode})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Abteilung *</label>
              <select className="form-control" value={form.abteilung_id} onChange={set('abteilung_id')}>
                <option value="">— Abteilung wählen —</option>
                {abteilungen.map(a => (
                  <option key={a.abteilung_id} value={a.abteilung_id}>{a.abteilung_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Position *</label>
              <select className="form-control" value={form.position_id} onChange={set('position_id')} disabled={!form.abteilung_id}>
                <option value="">— Position wählen —</option>
                {positionen.map(p => (
                  <option key={p.position_id} value={p.position_id}>{p.position_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">E-Mail</label>
            <input className="form-control" type="email" value={form.ansprechpartner_email} onChange={set('ansprechpartner_email')} placeholder="name@firma.de" />
          </div>
          <div className="form-group">
            <label className="form-label">Telefon</label>
            <input className="form-control" value={form.ansprechpartner_telefon} onChange={set('ansprechpartner_telefon')} placeholder="+49 123 456789" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Speichern…' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AnsprechpartnerList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kundenFilter, setKundenFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (kundenFilter) params.kunden_id = kundenFilter;
    api.getAnsprechpartner(params)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, kundenFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Ansprechpartner</div>
          <div className="page-subtitle">{items.length} Ansprechpartner</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Neuer Ansprechpartner</button>
      </div>

      <div className="filter-bar">
        <input
          className="form-control"
          placeholder="Suche nach Name oder E-Mail…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 2 }}
        />
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setSearch(''); setKundenFilter(''); }}
        >
          Zurücksetzen
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Lade Ansprechpartner…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">👤</div>
          <p>Keine Ansprechpartner gefunden</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Kunde</th>
                <th>Abteilung</th>
                <th>Position</th>
                <th>E-Mail</th>
                <th>Telefon</th>
              </tr>
            </thead>
            <tbody>
              {items.map(ap => (
                <tr key={ap.ansprechpartnerid} onClick={() => navigate(`/ansprechpartner/${ap.ansprechpartnerid}`)}>
                  <td style={{ fontWeight: 500 }}>{ap.ansprechpartner_name}</td>
                  <td>
                    {ap.name_kunde ? (
                      <span
                        style={{ color: 'var(--accent)', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/kunden/${ap.ansprechpartner_kundennr}`); }}
                      >
                        {ap.name_kunde}
                        {ap.kunden_matchcode && <span className="text-muted" style={{ marginLeft: 4, fontSize: 11 }}>({ap.kunden_matchcode})</span>}
                      </span>
                    ) : <span className="text-muted">–</span>}
                  </td>
                  <td>{ap.abteilung_name || <span className="text-muted">–</span>}</td>
                  <td>{ap.position_name || <span className="text-muted">–</span>}</td>
                  <td>
                    {ap.ansprechpartner_email
                      ? <a href={`mailto:${ap.ansprechpartner_email}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--accent)' }}>{ap.ansprechpartner_email}</a>
                      : <span className="text-muted">–</span>}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{ap.ansprechpartner_telefon || <span className="text-muted">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateAnsprechpartnerModal
          onClose={() => setShowCreate(false)}
          onSaved={(saved) => {
            setShowCreate(false);
            navigate(`/ansprechpartner/${saved.ansprechpartnerid}`);
          }}
        />
      )}
    </div>
  );
}
