import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import CustomFieldsSection from '../components/CustomFieldsSection';

function EditInline({ label, value, type = 'text', options, nullable, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  const startEdit = () => { setVal(value ?? ''); setEditing(true); };
  const save = async () => { await onSave(val); setEditing(false); };

  if (editing) {
    return (
      <div className="field-row" style={{ alignItems: 'center' }}>
        <div className="field-key">{label}</div>
        <div style={{ flex: 1, display: 'flex', gap: 8 }}>
          {type === 'select' ? (
            <select className="form-control" value={val} onChange={e => setVal(e.target.value)} style={{ height: 32 }}>
              {nullable && <option value="">— Keine —</option>}
              {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          ) : type === 'textarea' ? (
            <textarea className="form-control" value={val} onChange={e => setVal(e.target.value)} rows={2} style={{ flex: 1 }} />
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

function KompatibilitaetBaujahrSection({ artikelnr, data, maschinentypen, onReload }) {
  const [form, setForm] = useState({ maschinentyp_id: '', baujahr_von: '', baujahr_bis: '', bemerkung_baujahr: '' });
  const [adding, setAdding] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const add = async (e) => {
    e.preventDefault();
    if (!form.maschinentyp_id) return;
    await api.addKompatibilitaetBaujahr(artikelnr, {
      maschinentyp_id: form.maschinentyp_id,
      baujahr_von: form.baujahr_von ? parseInt(form.baujahr_von) : null,
      baujahr_bis: form.baujahr_bis ? parseInt(form.baujahr_bis) : null,
      bemerkung_baujahr: form.bemerkung_baujahr || null
    });
    setForm({ maschinentyp_id: '', baujahr_von: '', baujahr_bis: '', bemerkung_baujahr: '' });
    setAdding(false);
    onReload();
  };

  const remove = async (row) => {
    if (!confirm('Eintrag löschen?')) return;
    await api.deleteKompatibilitaetBaujahr(artikelnr, {
      maschinentyp_id: row.maschinentyp_id,
      baujahr_von: row.baujahr_von,
      baujahr_bis: row.baujahr_bis
    });
    onReload();
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Kompatibilität nach Baujahr</div>
        <button className="btn btn-secondary btn-sm" onClick={() => setAdding(!adding)}>
          {adding ? 'Abbrechen' : '+ Hinzufügen'}
        </button>
      </div>
      {adding && (
        <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 8, marginBottom: 12 }}>
          <select className="form-control" value={form.maschinentyp_id} onChange={set('maschinentyp_id')} required>
            <option value="">— Maschinentyp —</option>
            {maschinentypen.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input className="form-control" type="number" placeholder="von" value={form.baujahr_von} onChange={set('baujahr_von')} />
          <input className="form-control" type="number" placeholder="bis" value={form.baujahr_bis} onChange={set('baujahr_bis')} />
          <input className="form-control" placeholder="Bemerkung" value={form.bemerkung_baujahr} onChange={set('bemerkung_baujahr')} />
          <button type="submit" className="btn btn-primary btn-sm">✓</button>
        </form>
      )}
      {data.length === 0 ? (
        <div className="text-muted">Keine Baujahr-Kompatibilitäten eingetragen</div>
      ) : (
        <table>
          <thead>
            <tr><th>Maschinentyp</th><th>Baujahr von</th><th>Baujahr bis</th><th>Bemerkung</th><th></th></tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>{row.maschinentyp_name}</td>
                <td className="mono">{row.baujahr_von ?? <span className="text-muted">–</span>}</td>
                <td className="mono">{row.baujahr_bis ?? <span className="text-muted">–</span>}</td>
                <td className="text-muted" style={{ fontSize: 12 }}>{row.bemerkung_baujahr || '–'}</td>
                <td><button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => remove(row)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function KompatibilitaetNummerSection({ artikelnr, data, maschinentypen, onReload }) {
  const [form, setForm] = useState({ maschinentyp_id: '', maschinennummer_von: '', maschinennummer_bis: '', bemerkung_nummer: '' });
  const [adding, setAdding] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const add = async (e) => {
    e.preventDefault();
    if (!form.maschinentyp_id) return;
    await api.addKompatibilitaetNummer(artikelnr, {
      maschinentyp_id: form.maschinentyp_id,
      maschinennummer_von: form.maschinennummer_von || null,
      maschinennummer_bis: form.maschinennummer_bis || null,
      bemerkung_nummer: form.bemerkung_nummer || null
    });
    setForm({ maschinentyp_id: '', maschinennummer_von: '', maschinennummer_bis: '', bemerkung_nummer: '' });
    setAdding(false);
    onReload();
  };

  const remove = async (row) => {
    if (!confirm('Eintrag löschen?')) return;
    await api.deleteKompatibilitaetNummer(artikelnr, {
      maschinentyp_id: row.maschinentyp_id,
      maschinennummer_von: row.maschinennummer_von,
      maschinennummer_bis: row.maschinennummer_bis
    });
    onReload();
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Kompatibilität nach Maschinennummer</div>
        <button className="btn btn-secondary btn-sm" onClick={() => setAdding(!adding)}>
          {adding ? 'Abbrechen' : '+ Hinzufügen'}
        </button>
      </div>
      {adding && (
        <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 8, marginBottom: 12 }}>
          <select className="form-control" value={form.maschinentyp_id} onChange={set('maschinentyp_id')} required>
            <option value="">— Maschinentyp —</option>
            {maschinentypen.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input className="form-control" placeholder="Nr. von" value={form.maschinennummer_von} onChange={set('maschinennummer_von')} />
          <input className="form-control" placeholder="Nr. bis" value={form.maschinennummer_bis} onChange={set('maschinennummer_bis')} />
          <input className="form-control" placeholder="Bemerkung" value={form.bemerkung_nummer} onChange={set('bemerkung_nummer')} />
          <button type="submit" className="btn btn-primary btn-sm">✓</button>
        </form>
      )}
      {data.length === 0 ? (
        <div className="text-muted">Keine Nummer-Kompatibilitäten eingetragen</div>
      ) : (
        <table>
          <thead>
            <tr><th>Maschinentyp</th><th>Nr. von</th><th>Nr. bis</th><th>Bemerkung</th><th></th></tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>{row.maschinentyp_name}</td>
                <td className="mono" style={{ fontSize: 12 }}>{row.maschinennummer_von ?? <span className="text-muted">–</span>}</td>
                <td className="mono" style={{ fontSize: 12 }}>{row.maschinennummer_bis ?? <span className="text-muted">–</span>}</td>
                <td className="text-muted" style={{ fontSize: 12 }}>{row.bemerkung_nummer || '–'}</td>
                <td><button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => remove(row)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ErsatzteileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [part, setPart] = useState(null);
  const [allParts, setAllParts] = useState([]);
  const [maschinentypen, setMaschinentypen] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => api.getErsatzteil(id).then(setPart), [id]);

  useEffect(() => {
    Promise.all([
      api.getErsatzteil(id),
      api.getErsatzteile(),
      api.getMaschinentypen()
    ]).then(([p, all, mt]) => {
      setPart(p);
      setAllParts(all.data || all);
      setMaschinentypen(mt);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const update = async (field, value) => {
    await api.updateErsatzteil(id, { ...part, [field]: value || null });
    await load();
  };

  if (loading) return <div className="loading"><div className="spinner" /> Lade Ersatzteil…</div>;
  if (!part) return <div className="page"><div className="error-banner">Ersatzteil nicht gefunden</div></div>;

  const baugruppe_options = allParts
    .filter(p => p.artikelnr !== parseInt(id))
    .map(p => ({ id: p.artikelnr, name: `[${p.artikelnr}] ${p.bezeichnung}` }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb"><Link to="/ersatzteile">Ersatzteile</Link><span className="sep">/</span><span>#{part.artikelnr}</span></div>
          <div className="page-title">{part.bezeichnung}</div>
          <span className="mono" style={{ color: 'var(--accent)', fontSize: 13 }}>#{part.artikelnr}</span>
        </div>
      </div>

      <div className="detail-layout">
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Stammdaten</div>
            <EditInline label="Bezeichnung" value={part.bezeichnung} onSave={(v) => update('bezeichnung', v)} />
            <EditInline label="Zusatzbezeichnungen" value={part.zusätzliche_bezeichnungen} onSave={(v) => update('zusätzliche_bezeichnungen', v)} />
            <EditInline
              label="Baugruppe"
              value={part.baugruppe_bezeichnung ? `[${part.baugruppe_artikelnr}] ${part.baugruppe_bezeichnung}` : null}
              type="select"
              options={baugruppe_options}
              nullable
              onSave={(v) => update('baugruppe_artikelnr', v || null)}
            />
            <EditInline label="Zusatzinfos" value={part.zusatzinfos} type="textarea" onSave={(v) => update('zusatzinfos', v)} />
            <EditInline label="Bemerkung" value={part.bemerkung_ersatzteil} type="textarea" onSave={(v) => update('bemerkung_ersatzteil', v)} />
            <div className="field-row">
              <div className="field-key">Erstellt am</div>
              <div className="field-val text-muted" style={{ fontSize: 12 }}>{new Date(part.created_at).toLocaleString('de-DE')}</div>
            </div>
          </div>

          <KompatibilitaetBaujahrSection
            artikelnr={id}
            data={part.kompatibilitaet_baujahr || []}
            maschinentypen={maschinentypen}
            onReload={load}
          />

          <KompatibilitaetNummerSection
            artikelnr={id}
            data={part.kompatibilitaet_nummer || []}
            maschinentypen={maschinentypen}
            onReload={load}
          />

          <CustomFieldsSection entity="ersatzteile" tableName="ersatzteile" entityId={part.artikelnr} />
        </div>

        <div>
          {part.sub_parts?.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Unterteile ({part.sub_parts.length})</div>
              {part.sub_parts.map(sp => (
                <div key={sp.artikelnr}
                  style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => navigate(`/ersatzteile/${sp.artikelnr}`)}>
                  <span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>#{sp.artikelnr}</span>
                  <span style={{ marginLeft: 8 }}>{sp.bezeichnung}</span>
                  {sp.zusätzliche_bezeichnungen && (
                    <div className="text-muted" style={{ fontSize: 11 }}>{sp.zusätzliche_bezeichnungen}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="card">
            <div className="card-title">Kompatibilität</div>
            <div className="field-row">
              <div className="field-key">Baujahr-Einträge</div>
              <div className="field-val mono">{part.kompatibilitaet_baujahr?.length ?? 0}</div>
            </div>
            <div className="field-row">
              <div className="field-key">Nummer-Einträge</div>
              <div className="field-val mono">{part.kompatibilitaet_nummer?.length ?? 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
