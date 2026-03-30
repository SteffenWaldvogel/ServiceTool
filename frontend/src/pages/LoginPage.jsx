import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [maintenance, setMaintenance] = useState(null);
  const { login } = useAuth();

  useEffect(() => {
    api.getMaintenance()
      .then(data => { if (data?.is_active) setMaintenance(data); })
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Bitte alle Felder ausfüllen'); return; }
    setLoading(true); setError('');
    try {
      await login(username, password);
      // AuthContext setzt user, App re-rendert automatisch
    } catch (err) {
      setError(err.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', fontFamily: 'var(--font-sans)'
    }}>
      <div className="card" style={{ width: 360, padding: '32px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)', fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: 1 }}>
            ServiceTool
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Bitte einloggen</div>
        </div>
        {maintenance && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 6,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
            color: '#ef4444', fontSize: 13
          }}>
            <strong>Wartungsmodus aktiv</strong>
            {maintenance.reason && <div style={{ marginTop: 4, color: '#fca5a5' }}>{maintenance.reason}</div>}
            {maintenance.estimated_end && (
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                Voraussichtlich bis: {new Date(maintenance.estimated_end).toLocaleString('de-DE')}
              </div>
            )}
          </div>
        )}
        {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Benutzername</label>
            <input
              className="form-control"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14
                }}
              >{showPw ? '🙈' : '👁'}</button>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? <><div className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginRight: 8 }} />Einloggen…</> : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}
