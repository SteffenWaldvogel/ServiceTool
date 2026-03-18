import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';

// ── Generic simple CRUD tab ────────────────────────────────────────────────

function SimpleModal({ title, fields, item, onClose, onSaved }) {
  const isEdit = !!item;
  const initial = {};
  fields.forEach(f => { initial[f.key] = item ? (item[f.key] ?? '') : (f.default ?? ''); });
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await onSaved(form, isEdit);
      onClose();
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
          <div className="modal-title">{isEdit ? `${title} bearbeiten` : `Neue(r) ${title} anlegen`}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          {fields.map(f => (
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!form[f.key]}
                    onChange={set(f.key)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{f.checkLabel || f.label}</span>
                </label>
              ) : f.type === 'textarea' ? (
                <textarea className="form-control" value={form[f.key]} onChange={set(f.key)} rows={3} placeholder={f.placeholder} />
              ) : f.type === 'select' ? (
                <select className="form-control" value={form[f.key]} onChange={set(f.key)}>
                  <option value="">— Bitte wählen —</option>
                  {f.options && f.options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="form-control"
                  type={f.type || 'text'}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              )}
            </div>
          ))}
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

function SimpleTab({ title, columns, rows, onAdd, onEdit, onDelete, loading, renderRow }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>+ {title} hinzufügen</button>
      </div>
      {loading ? (
        <div className="loading"><div className="spinner" /> Lade…</div>
      ) : rows.length === 0 ? (
        <div className="empty-state"><p>Keine Einträge vorhanden</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {columns.map(c => <th key={c.key}>{c.label}</th>)}
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row._id || row.id} onClick={() => onEdit(row)} style={{ cursor: 'pointer' }}>
                  {renderRow(row)}
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Bearbeiten" onClick={() => onEdit(row)}>✎</button>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Löschen"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => onDelete(row)}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Gewichtung-Badge ───────────────────────────────────────────────────────
function GewichtungBadge({ value }) {
  const colors = ['#64748b', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const color = colors[Math.min(value, colors.length - 1)] || '#64748b';
  return (
    <span className="badge" style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
      {value}
    </span>
  );
}

// ── Terminal badge ─────────────────────────────────────────────────────────
function TerminalBadge({ value }) {
  return value
    ? <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>Terminal</span>
    : <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)' }}>Offen</span>;
}

// ── Freifelder (Custom Fields Admin) Tab ──────────────────────────────────

const ENTITY_TABLES = [
  { value: 'kunden', label: 'Kunden' },
  { value: 'ansprechpartner', label: 'Ansprechpartner' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'maschine', label: 'Maschine' },
  { value: 'ersatzteile', label: 'Ersatzteile' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Mehrzeiliger Text' },
  { value: 'number', label: 'Zahl' },
  { value: 'date', label: 'Datum' },
  { value: 'dropdown', label: 'Dropdown' },
];

function CustomFieldOptionsManager({ tableName, fieldKey, onClose }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.getCustomFieldOptions(tableName, fieldKey)
      .then(setOptions)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [tableName, fieldKey]);

  useEffect(() => { load(); }, [load]);

  const addOption = async () => {
    if (!newValue.trim()) return;
    setError('');
    try {
      await api.createCustomFieldOption({
        table_name: tableName,
        key: fieldKey,
        value: newValue.trim(),
        label: newLabel.trim() || newValue.trim(),
        position: options.length + 1
      });
      setNewValue(''); setNewLabel('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteOption = async (value) => {
    if (!confirm(`Option "${value}" wirklich löschen?`)) return;
    try {
      await api.deleteCustomFieldOption(tableName, fieldKey, value);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Optionen: {fieldKey}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Value</th>
                  <th>Label</th>
                  <th>Pos.</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {options.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Keine Optionen</td></tr>
                ) : options.map(o => (
                  <tr key={o.custom_field_option_value}>
                    <td className="mono" style={{ fontSize: 12 }}>{o.custom_field_option_value}</td>
                    <td>{o.custom_field_option_label}</td>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.custom_field_option_position ?? '–'}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => deleteOption(o.custom_field_option_value)}
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Value (intern) *</label>
            <input className="form-control" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="z.B. pharma" />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Label (angezeigt)</label>
            <input className="form-control" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="z.B. Pharma" />
          </div>
          <button className="btn btn-primary btn-sm" onClick={addOption} style={{ marginBottom: 0 }}>+ Hinzufügen</button>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );
}

function FreifelderTab() {
  const [filterTable, setFilterTable] = useState('');
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [optionsFor, setOptionsFor] = useState(null); // { table, key }

  const load = useCallback(() => {
    setLoading(true);
    api.getCustomFieldDefinitions(filterTable || undefined)
      .then(setDefinitions)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filterTable]);

  useEffect(() => { load(); }, [load]);

  const deleteDefinition = async (row) => {
    if (!confirm(`Felddefinition "${row.custom_field_label}" (${row.custom_field_key}) für Tabelle "${row.custom_field_table_name}" wirklich löschen? Alle gespeicherten Werte werden ebenfalls gelöscht.`)) return;
    try {
      await api.deleteCustomFieldDefinition(row.custom_field_table_name, row.custom_field_key);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const addDefinition = async (form) => {
    await api.createCustomFieldDefinition(form);
    load();
  };

  // Group by table
  const grouped = {};
  definitions.forEach(d => {
    const t = d.custom_field_table_name;
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(d);
  });

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="form-control" style={{ width: 'auto', minWidth: 200 }} value={filterTable} onChange={e => setFilterTable(e.target.value)}>
          <option value="">Alle Tabellen</option>
          {ENTITY_TABLES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>+ Neues Freifeld</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Lade…</div>
      ) : definitions.length === 0 ? (
        <div className="empty-state"><p>Keine Felddefinitionen vorhanden</p></div>
      ) : (
        Object.entries(grouped).map(([tableName, defs]) => (
          <div key={tableName} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 8 }}>
              {ENTITY_TABLES.find(t => t.value === tableName)?.label || tableName}
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Label</th>
                    <th>Typ</th>
                    <th>Position</th>
                    <th>Beschreibung</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {defs.map(d => (
                    <tr key={d.custom_field_key}>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.custom_field_key}</td>
                      <td style={{ fontWeight: 500 }}>{d.custom_field_label}</td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                          {FIELD_TYPES.find(t => t.value === d.custom_field_type)?.label || d.custom_field_type}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.custom_field_position ?? '–'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{d.custom_field_description || '–'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {d.custom_field_type === 'dropdown' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Optionen verwalten"
                              onClick={() => setOptionsFor({ table: d.custom_field_table_name, key: d.custom_field_key })}
                            >Optionen</button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => deleteDefinition(d)}
                          >✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {showAddModal && (
        <SimpleModal
          title="Freifeld"
          fields={[
            { key: 'table_name', label: 'Tabelle', type: 'select', required: true, options: ENTITY_TABLES },
            { key: 'key', label: 'Key (intern, z.B. field_11)', required: true, placeholder: 'field_11' },
            { key: 'label', label: 'Label (angezeigt)', required: true, placeholder: 'z.B. Projektstatus' },
            { key: 'type', label: 'Typ', type: 'select', required: true, options: FIELD_TYPES, default: 'text' },
            { key: 'description', label: 'Beschreibung', type: 'textarea' },
            { key: 'position', label: 'Position (Reihenfolge)', type: 'number' },
          ]}
          item={null}
          onClose={() => setShowAddModal(false)}
          onSaved={addDefinition}
        />
      )}

      {optionsFor && (
        <CustomFieldOptionsManager
          tableName={optionsFor.table}
          fieldKey={optionsFor.key}
          onClose={() => setOptionsFor(null)}
        />
      )}
    </div>
  );
}

// ── Rollen & Rechte Tab ────────────────────────────────────────────────────

const CATEGORY_ORDER = ['Tickets', 'Kunden', 'Maschinen', 'Ersatzteile', 'Ansprechpartner', 'Verwaltung'];

function PermissionModal({ role, allPermissions, onClose, onSaved }) {
  const isAdmin = role.name === 'admin';
  const initial = new Set((role.permissions || []).map(p => p.permission_id));
  const [selected, setSelected] = useState(new Set(initial));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (pid) => {
    if (isAdmin) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };

  const save = async () => {
    setLoading(true); setError('');
    try {
      await api.updateRolePermissions(role.role_id, [...selected]);
      onSaved();
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const grouped = {};
  allPermissions.forEach(p => {
    const cat = p.category || 'Sonstige';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div className="modal-title">Berechtigungen: {role.label || role.name}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {isAdmin && (
          <div style={{ padding: '8px 0 4px', color: 'var(--text-muted)', fontSize: 12 }}>
            Admin hat alle Berechtigungen (nicht änderbar)
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {CATEGORY_ORDER.filter(c => grouped[c]).concat(Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c))).map(cat => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 8 }}>{cat}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                {(grouped[cat] || []).map(p => (
                  <label key={p.permission_id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'default' : 'pointer', opacity: isAdmin ? 0.7 : 1 }}>
                    <input
                      type="checkbox"
                      checked={isAdmin || selected.has(p.permission_id)}
                      onChange={() => toggle(p.permission_id)}
                      disabled={isAdmin}
                      style={{ width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
          {!isAdmin && (
            <button className="btn btn-primary" onClick={save} disabled={loading}>
              {loading ? 'Speichern…' : 'Speichern'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RolleModal({ role, onClose, onSaved }) {
  const isEdit = !!role?.role_id;
  const [form, setForm] = useState({ name: role?.name || '', label: role?.label || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isEdit) {
        await api.updateRole(role.role_id, { label: form.label });
      } else {
        await api.createRole({ name: form.name, label: form.label });
      }
      onSaved();
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Rolle bearbeiten' : 'Neue Rolle'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          {!isEdit && (
            <div className="form-group">
              <label className="form-label">Interner Name * (z.B. serviceleiter)</label>
              <input className="form-control" value={form.name} onChange={set('name')} placeholder="lowercase, keine Leerzeichen" required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Anzeigename</label>
            <input className="form-control" value={form.label} onChange={set('label')} placeholder="z.B. Serviceleiter" />
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

function RollenTab() {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleModal, setRoleModal] = useState(null);
  const [permModal, setPermModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getRoles(), api.getPermissions()])
      .then(([r, p]) => { setRoles(r); setAllPermissions(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteRole = async (role) => {
    if (!confirm(`Rolle "${role.label || role.name}" wirklich löschen?`)) return;
    try {
      await api.deleteRole(role.role_id);
      load();
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="loading"><div className="spinner" /> Lade…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setRoleModal({})}>+ Neue Rolle</button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Anzeigename</th>
              <th>Typ</th>
              <th>Aktive Benutzer</th>
              <th>Berechtigungen</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.role_id}>
                <td className="mono" style={{ fontSize: 12 }}>{role.name}</td>
                <td style={{ fontWeight: 500 }}>{role.label || '–'}</td>
                <td>
                  {role.is_system
                    ? <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>System</span>
                    : <span className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--accent)' }}>Benutzerdefiniert</span>}
                </td>
                <td className="mono" style={{ fontSize: 13 }}>{role.user_count}</td>
                <td>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {role.name === 'admin' ? 'Alle' : `${(role.permissions || []).length} von ${allPermissions.length}`}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" title="Berechtigungen konfigurieren" onClick={() => setPermModal(role)}>
                      Rechte
                    </button>
                    {!role.is_system && (
                      <>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Bearbeiten" onClick={() => setRoleModal(role)}>✎</button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Löschen" style={{ color: 'var(--danger)' }} onClick={() => deleteRole(role)}>✕</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {roleModal !== null && (
        <RolleModal role={roleModal?.role_id ? roleModal : null} onClose={() => setRoleModal(null)} onSaved={load} />
      )}
      {permModal && (
        <PermissionModal role={permModal} allPermissions={allPermissions} onClose={() => setPermModal(null)} onSaved={load} />
      )}
    </div>
  );
}

// ── Maschinentypen Tab ─────────────────────────────────────────────────────

function MaschinentypenTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getMaschinentypen()
      .then(data => setRows(data.map(r => ({ ...r, _id: r.id }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const fields = [
    { key: 'name', label: 'Name', required: true, placeholder: 'z.B. Drehmaschine CNC-2000' },
  ];

  const handleSave = async (form, isEdit) => {
    if (isEdit) {
      await api.updateMaschinentyp(modal._id, { maschinentyp_name: form.name });
    } else {
      await api.createMaschinentyp({ maschinentyp_name: form.name });
    }
    load();
  };

  const handleDelete = async (row) => {
    if (!confirm(`Maschinentyp "${row.name}" wirklich löschen?`)) return;
    try {
      await api.deleteMaschinentyp(row._id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <SimpleTab
        title="Maschinentyp"
        columns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }]}
        rows={rows}
        loading={loading}
        onAdd={() => setModal({})}
        onEdit={(row) => setModal(row)}
        onDelete={handleDelete}
        renderRow={(row) => (
          <>
            <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.id}</td>
            <td style={{ fontWeight: 500 }}>{row.name}</td>
          </>
        )}
      />
      {modal !== null && (
        <SimpleModal
          title="Maschinentyp"
          fields={fields}
          item={modal._id ? { ...modal, name: modal.name } : null}
          onClose={() => setModal(null)}
          onSaved={handleSave}
        />
      )}
    </div>
  );
}

// ── Main StammdatenPage ────────────────────────────────────────────────────

const TABS = [
  { id: 'service-priority', label: 'Service-Prioritäten' },
  { id: 'abteilungen', label: 'Abteilungen' },
  { id: 'positionen', label: 'Positionen' },
  { id: 'kategorien', label: 'Kategorien' },
  { id: 'kritikalitaet', label: 'Kritikalität' },
  { id: 'status', label: 'Status' },
  { id: 'maschinentypen', label: 'Maschinentypen' },
  { id: 'freifelder', label: 'Freifelder' },
  { id: 'rollen', label: 'Rollen & Rechte' },
];

export default function StammdatenPage() {
  const [activeTab, setActiveTab] = useState('service-priority');

  // ── per-tab state ─────────────────────────────────────────────────────
  const [spRows, setSpRows] = useState([]);
  const [spLoading, setSpLoading] = useState(false);
  const [spModal, setSpModal] = useState(null);

  const [abtRows, setAbtRows] = useState([]);
  const [abtLoading, setAbtLoading] = useState(false);
  const [abtModal, setAbtModal] = useState(null);

  const [posRows, setPosRows] = useState([]);
  const [posLoading, setPosLoading] = useState(false);
  const [posModal, setPosModal] = useState(null);
  const [abteilungenForPos, setAbteilungenForPos] = useState([]);

  const [katRows, setKatRows] = useState([]);
  const [katLoading, setKatLoading] = useState(false);
  const [katModal, setKatModal] = useState(null);

  const [kritRows, setKritRows] = useState([]);
  const [kritLoading, setKritLoading] = useState(false);
  const [kritModal, setKritModal] = useState(null);

  const [statusRows, setStatusRows] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusModal, setStatusModal] = useState(null);

  // ── loaders ───────────────────────────────────────────────────────────
  const loadSP = useCallback(() => {
    setSpLoading(true);
    api.getServicePrioritiesAdmin()
      .then(d => setSpRows(d.map(r => ({ ...r, _id: r.service_priority_id }))))
      .catch(console.error).finally(() => setSpLoading(false));
  }, []);

  const loadAbt = useCallback(() => {
    setAbtLoading(true);
    api.getAbteilungenAdmin()
      .then(d => setAbtRows(d.map(r => ({ ...r, _id: r.abteilung_id }))))
      .catch(console.error).finally(() => setAbtLoading(false));
  }, []);

  const loadPos = useCallback(() => {
    setPosLoading(true);
    Promise.all([api.getPositionenAdmin(), api.getAbteilungenAdmin()])
      .then(([pos, abt]) => {
        setPosRows(pos.map(r => ({ ...r, _id: r.position_id })));
        setAbteilungenForPos(abt);
      })
      .catch(console.error).finally(() => setPosLoading(false));
  }, []);

  const loadKat = useCallback(() => {
    setKatLoading(true);
    api.getKategorienAdmin()
      .then(d => setKatRows(d.map(r => ({ ...r, _id: r.kategorie_id }))))
      .catch(console.error).finally(() => setKatLoading(false));
  }, []);

  const loadKrit = useCallback(() => {
    setKritLoading(true);
    api.getKritikalitaetenAdmin()
      .then(d => setKritRows(d.map(r => ({ ...r, _id: r['kritikalität_id'] }))))
      .catch(console.error).finally(() => setKritLoading(false));
  }, []);

  const loadStatus = useCallback(() => {
    setStatusLoading(true);
    api.getStatusAdmin()
      .then(d => setStatusRows(d.map(r => ({ ...r, _id: r.status_id }))))
      .catch(console.error).finally(() => setStatusLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'service-priority') loadSP();
    if (activeTab === 'abteilungen') loadAbt();
    if (activeTab === 'positionen') loadPos();
    if (activeTab === 'kategorien') loadKat();
    if (activeTab === 'kritikalitaet') loadKrit();
    if (activeTab === 'status') loadStatus();
  }, [activeTab, loadSP, loadAbt, loadPos, loadKat, loadKrit, loadStatus]);

  // ── delete helper ────────────────────────────────────────────────────
  const makeDelete = (label, keyField, apiFn, reload) => async (row) => {
    if (!confirm(`"${row[label] || row._id}" wirklich löschen?`)) return;
    try {
      await apiFn(row._id);
      reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const delSP = makeDelete('service_priority_name', 'service_priority_id', api.deleteServicePriority.bind(api), loadSP);
  const delAbt = makeDelete('abteilung_name', 'abteilung_id', api.deleteAbteilung.bind(api), loadAbt);
  const delPos = makeDelete('position_name', 'position_id', api.deletePosition.bind(api), loadPos);
  const delKat = makeDelete('kategorie_name', 'kategorie_id', api.deleteKategorie.bind(api), loadKat);
  const delKrit = makeDelete('kritikalität_name', 'kritikalität_id', api.deleteKritikalitaet.bind(api), loadKrit);
  const delStatus = makeDelete('status_name', 'status_id', api.deleteStatus.bind(api), loadStatus);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Stammdaten-Verwaltung</div>
          <div className="page-subtitle">Referenztabellen und Freifelder verwalten</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 18px',
              background: activeTab === t.id ? 'var(--accent-dim)' : 'transparent',
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: activeTab === t.id ? 600 : 400,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Service-Prioritäten ── */}
      {activeTab === 'service-priority' && (
        <>
          <SimpleTab
            title="Service-Priorität"
            columns={[
              { key: 'service_priority_id', label: 'ID' },
              { key: 'service_priority_name', label: 'Name' },
              { key: 'priority_order', label: 'Reihenfolge' },
              { key: 'service_priority_beschreibung', label: 'Beschreibung' },
            ]}
            rows={spRows}
            loading={spLoading}
            onAdd={() => setSpModal({})}
            onEdit={(row) => setSpModal(row)}
            onDelete={delSP}
            renderRow={(row) => (
              <>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.service_priority_id}</td>
                <td style={{ fontWeight: 500 }}>{row.service_priority_name}</td>
                <td className="mono" style={{ fontSize: 12 }}>{row.priority_order}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.service_priority_beschreibung || '–'}</td>
              </>
            )}
          />
          {spModal !== null && (
            <SimpleModal
              title="Service-Priorität"
              fields={[
                { key: 'service_priority_name', label: 'Name', required: true, placeholder: 'z.B. VIP Plus' },
                { key: 'priority_order', label: 'Reihenfolge', type: 'number', placeholder: '0', default: '0' },
                { key: 'service_priority_beschreibung', label: 'Beschreibung', type: 'textarea' },
              ]}
              item={spModal._id ? spModal : null}
              onClose={() => setSpModal(null)}
              onSaved={async (form, isEdit) => {
                const data = {
                  service_priority_name: form.service_priority_name,
                  service_priority_beschreibung: form.service_priority_beschreibung || null,
                  priority_order: parseInt(form.priority_order) || 0,
                };
                if (isEdit) await api.updateServicePriority(spModal._id, data);
                else await api.createServicePriority(data);
                loadSP();
              }}
            />
          )}
        </>
      )}

      {/* ── Abteilungen ── */}
      {activeTab === 'abteilungen' && (
        <>
          <SimpleTab
            title="Abteilung"
            columns={[
              { key: 'abteilung_id', label: 'ID' },
              { key: 'abteilung_name', label: 'Name' },
              { key: 'abteilung_beschreibung', label: 'Beschreibung' },
            ]}
            rows={abtRows}
            loading={abtLoading}
            onAdd={() => setAbtModal({})}
            onEdit={(row) => setAbtModal(row)}
            onDelete={delAbt}
            renderRow={(row) => (
              <>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.abteilung_id}</td>
                <td style={{ fontWeight: 500 }}>{row.abteilung_name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.abteilung_beschreibung || '–'}</td>
              </>
            )}
          />
          {abtModal !== null && (
            <SimpleModal
              title="Abteilung"
              fields={[
                { key: 'abteilung_name', label: 'Name', required: true, placeholder: 'z.B. Einkauf' },
                { key: 'abteilung_beschreibung', label: 'Beschreibung', type: 'textarea' },
              ]}
              item={abtModal._id ? abtModal : null}
              onClose={() => setAbtModal(null)}
              onSaved={async (form, isEdit) => {
                const data = {
                  abteilung_name: form.abteilung_name,
                  abteilung_beschreibung: form.abteilung_beschreibung || null,
                };
                if (isEdit) await api.updateAbteilung(abtModal._id, data);
                else await api.createAbteilung(data);
                loadAbt();
              }}
            />
          )}
        </>
      )}

      {/* ── Positionen ── */}
      {activeTab === 'positionen' && (
        <>
          <SimpleTab
            title="Position"
            columns={[
              { key: 'position_id', label: 'ID' },
              { key: 'position_name', label: 'Name' },
              { key: 'abteilung_name', label: 'Abteilung' },
              { key: 'position_beschreibung', label: 'Beschreibung' },
            ]}
            rows={posRows}
            loading={posLoading}
            onAdd={() => setPosModal({})}
            onEdit={(row) => setPosModal(row)}
            onDelete={delPos}
            renderRow={(row) => (
              <>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.position_id}</td>
                <td style={{ fontWeight: 500 }}>{row.position_name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{row.abteilung_name || '–'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.position_beschreibung || '–'}</td>
              </>
            )}
          />
          {posModal !== null && (
            <SimpleModal
              title="Position"
              fields={[
                { key: 'position_name', label: 'Name', required: true, placeholder: 'z.B. Einkäufer' },
                {
                  key: 'abteilung_id', label: 'Abteilung', type: 'select', required: true,
                  options: abteilungenForPos.map(a => ({ value: a.abteilung_id, label: a.abteilung_name })),
                  default: posModal.abteilung_id || ''
                },
                { key: 'position_beschreibung', label: 'Beschreibung', type: 'textarea' },
              ]}
              item={posModal._id ? posModal : null}
              onClose={() => setPosModal(null)}
              onSaved={async (form, isEdit) => {
                const data = {
                  position_name: form.position_name,
                  abteilung_id: form.abteilung_id,
                  position_beschreibung: form.position_beschreibung || null,
                };
                if (isEdit) await api.updatePosition(posModal._id, data);
                else await api.createPosition(data);
                loadPos();
              }}
            />
          )}
        </>
      )}

      {/* ── Kategorien ── */}
      {activeTab === 'kategorien' && (
        <>
          <SimpleTab
            title="Kategorie"
            columns={[
              { key: 'kategorie_id', label: 'ID' },
              { key: 'kategorie_name', label: 'Name' },
              { key: 'kategorie_beschreibung', label: 'Beschreibung' },
            ]}
            rows={katRows}
            loading={katLoading}
            onAdd={() => setKatModal({})}
            onEdit={(row) => setKatModal(row)}
            onDelete={delKat}
            renderRow={(row) => (
              <>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.kategorie_id}</td>
                <td style={{ fontWeight: 500 }}>{row.kategorie_name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.kategorie_beschreibung || '–'}</td>
              </>
            )}
          />
          {katModal !== null && (
            <SimpleModal
              title="Kategorie"
              fields={[
                { key: 'kategorie_name', label: 'Name', required: true, placeholder: 'z.B. Installation' },
                { key: 'kategorie_beschreibung', label: 'Beschreibung', type: 'textarea' },
              ]}
              item={katModal._id ? katModal : null}
              onClose={() => setKatModal(null)}
              onSaved={async (form, isEdit) => {
                const data = {
                  kategorie_name: form.kategorie_name,
                  kategorie_beschreibung: form.kategorie_beschreibung || null,
                };
                if (isEdit) await api.updateKategorie(katModal._id, data);
                else await api.createKategorie(data);
                loadKat();
              }}
            />
          )}
        </>
      )}

      {/* ── Kritikalität ── */}
      {activeTab === 'kritikalitaet' && (
        <>
          <SimpleTab
            title="Kritikalität"
            columns={[
              { key: 'kritikalität_id', label: 'ID' },
              { key: 'kritikalität_name', label: 'Name' },
              { key: 'kritikalität_gewichtung', label: 'Gewichtung' },
              { key: 'kritikalität_beschreibung', label: 'Beschreibung' },
            ]}
            rows={kritRows}
            loading={kritLoading}
            onAdd={() => setKritModal({})}
            onEdit={(row) => setKritModal(row)}
            onDelete={delKrit}
            renderRow={(row) => (
              <>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row['kritikalität_id']}</td>
                <td style={{ fontWeight: 500 }}>{row['kritikalität_name']}</td>
                <td><GewichtungBadge value={row['kritikalität_gewichtung']} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row['kritikalität_beschreibung'] || '–'}</td>
              </>
            )}
          />
          {kritModal !== null && (
            <SimpleModal
              title="Kritikalität"
              fields={[
                { key: 'kritikalität_name', label: 'Name', required: true, placeholder: 'z.B. Sehr Hoch' },
                { key: 'kritikalität_gewichtung', label: 'Gewichtung (Zahl)', type: 'number', placeholder: '0', default: '0' },
                { key: 'kritikalität_beschreibung', label: 'Beschreibung', type: 'textarea' },
              ]}
              item={kritModal._id ? kritModal : null}
              onClose={() => setKritModal(null)}
              onSaved={async (form, isEdit) => {
                const data = {
                  'kritikalität_name': form['kritikalität_name'],
                  'kritikalität_beschreibung': form['kritikalität_beschreibung'] || null,
                  'kritikalität_gewichtung': parseInt(form['kritikalität_gewichtung']) || 0,
                };
                if (isEdit) await api.updateKritikalitaet(kritModal._id, data);
                else await api.createKritikalitaet(data);
                loadKrit();
              }}
            />
          )}
        </>
      )}

      {/* ── Status ── */}
      {activeTab === 'status' && (
        <>
          <SimpleTab
            title="Status"
            columns={[
              { key: 'status_id', label: 'ID' },
              { key: 'status_name', label: 'Name' },
              { key: 'is_terminal', label: 'Art' },
              { key: 'status_beschreibung', label: 'Beschreibung' },
            ]}
            rows={statusRows}
            loading={statusLoading}
            onAdd={() => setStatusModal({})}
            onEdit={(row) => setStatusModal(row)}
            onDelete={delStatus}
            renderRow={(row) => (
              <>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.status_id}</td>
                <td style={{ fontWeight: 500 }}>{row.status_name}</td>
                <td><TerminalBadge value={row.is_terminal} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.status_beschreibung || '–'}</td>
              </>
            )}
          />
          {statusModal !== null && (
            <SimpleModal
              title="Status"
              fields={[
                { key: 'status_name', label: 'Name', required: true, placeholder: 'z.B. Eskaliert' },
                { key: 'status_beschreibung', label: 'Beschreibung', type: 'textarea' },
                { key: 'is_terminal', label: 'Terminal-Status', type: 'checkbox', checkLabel: 'Ist Terminal (Ticket geschlossen)', default: false },
              ]}
              item={statusModal._id ? statusModal : null}
              onClose={() => setStatusModal(null)}
              onSaved={async (form, isEdit) => {
                const data = {
                  status_name: form.status_name,
                  status_beschreibung: form.status_beschreibung || null,
                  is_terminal: !!form.is_terminal,
                };
                if (isEdit) await api.updateStatus(statusModal._id, data);
                else await api.createStatus(data);
                loadStatus();
              }}
            />
          )}
        </>
      )}

      {/* ── Maschinentypen ── */}
      {activeTab === 'maschinentypen' && <MaschinentypenTab />}

      {/* ── Freifelder ── */}
      {activeTab === 'freifelder' && <FreifelderTab />}

      {/* ── Rollen & Rechte ── */}
      {activeTab === 'rollen' && <RollenTab />}
    </div>
  );
}
