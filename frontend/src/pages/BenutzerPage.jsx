import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username || '',
    display_name: user?.display_name || '',
    password: '',
    role_id: user?.role_id || 2,
    is_active: user?.is_active ?? true,
    email: user?.email || '',
    telefon: user?.telefon || '',
    notify_ticket_assigned: user?.notify_ticket_assigned ?? true,
    notify_ticket_created: user?.notify_ticket_created ?? false,
    notify_status_changed: user?.notify_status_changed ?? true,
    notify_sla_warning: user?.notify_sla_warning ?? true,
    notify_unmatched_email: user?.notify_unmatched_email ?? false,
    notify_high_priority: user?.notify_high_priority ?? true,
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getRoles().then(setRoles).catch(() => {});
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!isEdit && !form.password) { setError('Passwort ist erforderlich'); return; }
    if (form.password && form.password.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben'); return; }
    setLoading(true); setError('');
    try {
      if (isEdit) {
        const data = {
          display_name: form.display_name, role_id: Number(form.role_id), is_active: form.is_active,
          email: form.email || null, telefon: form.telefon || null,
          notify_ticket_assigned: form.notify_ticket_assigned,
          notify_ticket_created: form.notify_ticket_created,
          notify_status_changed: form.notify_status_changed,
          notify_sla_warning: form.notify_sla_warning,
          notify_unmatched_email: form.notify_unmatched_email,
          notify_high_priority: form.notify_high_priority,
        };
        if (form.password) data.password = form.password;
        await api.updateUser(user.user_id, data);
      } else {
        await api.createUser({
          username: form.username, password: form.password, display_name: form.display_name,
          role_id: Number(form.role_id), email: form.email || null, telefon: form.telefon || null
        });
      }
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          {!isEdit && (
            <div className="form-group">
              <label className="form-label">Benutzername *</label>
              <input className="form-control" value={form.username} onChange={set('username')} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Anzeigename</label>
            <input className="form-control" value={form.display_name} onChange={set('display_name')} />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort {isEdit ? '(leer = nicht ändern, min. 8 Zeichen)' : '* (min. 8 Zeichen)'}</label>
            <input className="form-control" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">E-Mail</label>
              <input className="form-control" type="email" value={form.email} onChange={set('email')} placeholder="user@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Telefon</label>
              <input className="form-control" value={form.telefon} onChange={set('telefon')} placeholder="+49 ..." />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Rolle</label>
            <select className="form-control" value={form.role_id} onChange={set('role_id')}>
              {roles.map(r => (
                <option key={r.role_id} value={r.role_id}>{r.label || r.name}</option>
              ))}
            </select>
          </div>
          {isEdit && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={set('is_active')} />
                <label htmlFor="is_active" className="form-label" style={{ margin: 0 }}>Aktiv</label>
              </div>
              {form.email && (
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>E-Mail-Benachrichtigungen</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
                    {[
                      { key: 'notify_ticket_assigned', label: 'Ticket zugewiesen' },
                      { key: 'notify_status_changed', label: 'Status geändert' },
                      { key: 'notify_high_priority', label: 'Hohe Priorität' },
                      { key: 'notify_sla_warning', label: 'SLA-Warnung' },
                      { key: 'notify_ticket_created', label: 'Neues Ticket' },
                      { key: 'notify_unmatched_email', label: 'Ungematchte Email' },
                    ].map(({ key, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" id={key} checked={form[key]} onChange={set(key)} />
                        <label htmlFor={key} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>{label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPw !== form.confirm) { setError('Passwörter stimmen nicht überein'); return; }
    if (form.newPw.length < 6) { setError('Mindestens 6 Zeichen'); return; }
    setLoading(true); setError('');
    try {
      await api.changePassword({ current_password: form.current, new_password: form.newPw });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Passwort ändern</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">Passwort geändert!</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Aktuelles Passwort</label>
            <input className="form-control" type="password" value={form.current} onChange={set('current')} />
          </div>
          <div className="form-group">
            <label className="form-label">Neues Passwort</label>
            <input className="form-control" type="password" value={form.newPw} onChange={set('newPw')} />
          </div>
          <div className="form-group">
            <label className="form-label">Bestätigen</label>
            <input className="form-control" type="password" value={form.confirm} onChange={set('confirm')} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading || success}>
              {loading ? 'Speichern…' : 'Passwort ändern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { ChangePasswordModal };

export default function BenutzerPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const { user: currentUser } = useAuth();

  const load = () => {
    setLoading(true);
    api.getUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deactivate = async (u) => {
    if (!confirm(`Benutzer "${u.username}" deaktivieren?`)) return;
    try {
      await api.deleteUser(u.user_id);
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Benutzerverwaltung</div>
          <div className="page-subtitle">{users.length} Benutzer</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Neuer Benutzer</button>
      </div>
      {loading ? (
        <div className="loading"><div className="spinner" /> Lade…</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Benutzername</th>
                <th>Anzeigename</th>
                <th>E-Mail</th>
                <th>Rolle</th>
                <th>Aktiv</th>
                <th>Letzter Login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id}>
                  <td className="mono" style={{ fontSize: 13 }}>{u.username}</td>
                  <td>{u.display_name || <span className="text-muted">–</span>}</td>
                  <td style={{ fontSize: 12 }}>{u.email || <span className="text-muted">–</span>}</td>
                  <td>
                    <span className="badge" style={{
                      background: u.role === 'admin' ? 'rgba(239,68,68,0.15)' : u.role === 'readonly' ? 'rgba(100,116,139,0.15)' : 'rgba(59,130,246,0.15)',
                      color: u.role === 'admin' ? '#ef4444' : u.role === 'readonly' ? '#64748b' : 'var(--accent)'
                    }}>{u.role_label || u.role}</span>
                  </td>
                  <td>
                    <span style={{ color: u.is_active ? 'var(--success, #10b981)' : 'var(--text-muted)' }}>
                      {u.is_active ? '✓ Aktiv' : '✗ Inaktiv'}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: 12 }}>
                    {u.last_login ? new Date(u.last_login).toLocaleString('de-DE') : '–'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Bearbeiten" onClick={() => setModal({ edit: u })}>✎</button>
                      {u.user_id !== currentUser?.user_id && u.is_active && (
                        <button className="btn btn-ghost btn-sm btn-icon" title="Deaktivieren" style={{ color: 'var(--danger)' }} onClick={() => deactivate(u)}>✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(modal === 'create' || modal?.edit) && (
        <UserModal
          user={modal?.edit || null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
