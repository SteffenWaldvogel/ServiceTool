import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username || '',
    display_name: user?.display_name || '',
    password: '',
    role: user?.role || 'techniker',
    is_active: user?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!isEdit && !form.password) { setError('Passwort ist erforderlich'); return; }
    setLoading(true); setError('');
    try {
      if (isEdit) {
        const data = { display_name: form.display_name, role: form.role, is_active: form.is_active };
        if (form.password) data.password = form.password;
        await api.updateUser(user.user_id, data);
      } else {
        await api.createUser({ username: form.username, password: form.password, display_name: form.display_name, role: form.role });
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
            <label className="form-label">Passwort {isEdit ? '(leer = nicht ändern)' : '*'}</label>
            <input className="form-control" type="password" value={form.password} onChange={set('password')} />
          </div>
          <div className="form-group">
            <label className="form-label">Rolle</label>
            <select className="form-control" value={form.role} onChange={set('role')}>
              <option value="techniker">Techniker</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {isEdit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={set('is_active')} />
              <label htmlFor="is_active" className="form-label" style={{ margin: 0 }}>Aktiv</label>
            </div>
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
                  <td>
                    <span className="badge" style={{
                      background: u.role === 'admin' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                      color: u.role === 'admin' ? '#ef4444' : 'var(--accent)'
                    }}>{u.role}</span>
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
