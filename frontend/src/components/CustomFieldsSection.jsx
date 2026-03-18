import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

// entity: API path prefix (e.g. 'kunden', 'tickets', 'maschinen', 'ersatzteile')
// tableName: DB table name for field definitions (e.g. 'kunden', 'ticket', 'maschine', 'ersatzteile')
// entityId: the PK value
export default function CustomFieldsSection({ entity, tableName, entityId }) {
  const [defs, setDefs] = useState([]);
  const [values, setValues] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entityId) return;
    Promise.all([
      api.getCustomFieldDefs(tableName),
      api.getCustomFields(entity, entityId)
    ]).then(([defList, vals]) => {
      setDefs(defList);
      setValues(vals);
    }).catch(console.error);
  }, [entity, tableName, entityId]);

  if (defs.length === 0) return null;

  const startEdit = () => {
    setDraft({ ...values });
    setEditing(true);
    setError('');
  };

  const cancel = () => {
    setEditing(false);
    setDraft({});
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.saveCustomFields(entity, entityId, draft);
      setValues({ ...draft });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const setDraftVal = (key, val) => setDraft(d => ({ ...d, [key]: val }));

  const renderField = (def) => {
    const val = editing ? (draft[def.field_key] ?? '') : (values[def.field_key] ?? '');

    if (!editing) {
      let display = val || <span className="text-muted">–</span>;
      if (val && def.type === 'dropdown') {
        const opt = def.options?.find(o => o.value === val);
        display = opt ? opt.label : val;
      }
      return (
        <div className="field-row" key={def.field_key}>
          <div className="field-key">{def.label}</div>
          <div className="field-val">{display}</div>
        </div>
      );
    }

    let input;
    if (def.type === 'dropdown') {
      input = (
        <select className="form-control" value={val} onChange={e => setDraftVal(def.field_key, e.target.value)}>
          <option value="">— Wählen —</option>
          {def.options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    } else if (def.type === 'textarea') {
      input = (
        <textarea
          className="form-control"
          rows={2}
          value={val}
          onChange={e => setDraftVal(def.field_key, e.target.value)}
        />
      );
    } else if (def.type === 'number') {
      input = (
        <input
          className="form-control"
          type="number"
          value={val}
          onChange={e => setDraftVal(def.field_key, e.target.value)}
        />
      );
    } else if (def.type === 'date') {
      input = (
        <input
          className="form-control"
          type="date"
          value={val}
          onChange={e => setDraftVal(def.field_key, e.target.value)}
        />
      );
    } else {
      input = (
        <input
          className="form-control"
          type="text"
          value={val}
          onChange={e => setDraftVal(def.field_key, e.target.value)}
        />
      );
    }

    return (
      <div className="form-group" key={def.field_key} style={{ marginBottom: 10 }}>
        <label className="form-label">{def.label}</label>
        {input}
      </div>
    );
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Zusatzfelder</div>
        {!editing ? (
          <button className="btn btn-ghost btn-sm" onClick={startEdit}>✎ Bearbeiten</button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={cancel}>Abbrechen</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        )}
      </div>
      {error && <div className="error-banner" style={{ marginBottom: 10 }}>{error}</div>}
      <div className={editing ? '' : ''}>
        {defs.map(def => renderField(def))}
      </div>
    </div>
  );
}
