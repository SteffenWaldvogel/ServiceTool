import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const KNOWN_TABLES = [
  'kunden', 'ansprechpartner', 'ticket', 'maschine', 'ersatzteile',
  'service_priority', 'abteilung', 'position', 'kategorie', 'kritikalität',
  'status', 'maschinentyp'
];

const OPERATIONS = ['INSERT', 'UPDATE', 'DELETE'];

function JsonPreview({ value, label }) {
  const [open, setOpen] = useState(false);
  if (!value) return <span className="text-muted">–</span>;
  return (
    <div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(o => !o)}
        style={{ padding: '2px 8px', fontSize: 11 }}
      >
        {open ? '▼' : '▶'} {label}
      </button>
      {open && (
        <pre style={{
          marginTop: 8,
          padding: '8px 12px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          fontSize: 11,
          fontFamily: 'IBM Plex Mono, monospace',
          color: 'var(--text-secondary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}

function OperationBadge({ op }) {
  const styles = {
    INSERT: { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
    UPDATE: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
    DELETE: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
  };
  const style = styles[op] || { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' };
  return <span className="badge" style={style}>{op}</span>;
}

// ── Audit-Log Tab ──────────────────────────────────────────────────────────────
function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    table_name: '',
    operation: '',
    changed_by: '',
    from: '',
    to: '',
    limit: '100',
  });

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = {};
    if (filters.table_name) params.table_name = filters.table_name;
    if (filters.operation) params.operation = filters.operation;
    if (filters.changed_by) params.changed_by = filters.changed_by;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.limit) params.limit = filters.limit;

    api.getAuditLog(params)
      .then(setLogs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }));
  const resetFilters = () => setFilters({ table_name: '', operation: '', changed_by: '', from: '', to: '', limit: '100' });

  const formatDate = (ts) => {
    if (!ts) return '–';
    return new Date(ts).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Filter</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tabelle</label>
            <select className="form-control" value={filters.table_name} onChange={setFilter('table_name')}>
              <option value="">Alle Tabellen</option>
              {KNOWN_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Operation</label>
            <select className="form-control" value={filters.operation} onChange={setFilter('operation')}>
              <option value="">Alle</option>
              {OPERATIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Geändert von</label>
            <input className="form-control" value={filters.changed_by} onChange={setFilter('changed_by')} placeholder="Benutzername…" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Von Datum</label>
            <input className="form-control" type="date" value={filters.from} onChange={setFilter('from')} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bis Datum</label>
            <input className="form-control" type="date" value={filters.to} onChange={setFilter('to')} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Max. Einträge</label>
            <select className="form-control" value={filters.limit} onChange={setFilter('limit')}>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={resetFilters}>Zurücksetzen</button>
          <button className="btn btn-secondary btn-sm" onClick={load}>Aktualisieren</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading"><div className="spinner" /> Lade Audit-Log…</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>Keine Audit-Log-Einträge vorhanden</p>
          <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-muted)' }}>
            Das Audit-Log wird befüllt, wenn Datenbank-Trigger konfiguriert sind.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            {logs.length} Einträge
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Zeitpunkt</th>
                  <th>Tabelle</th>
                  <th>Datensatz-ID</th>
                  <th>Operation</th>
                  <th>Geändert von</th>
                  <th>Alte Werte</th>
                  <th>Neue Werte</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.audit_id} style={{ cursor: 'default' }}>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.audit_id}</td>
                    <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(log.changed_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)', border: '1px solid var(--border)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
                        {log.table_name}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{log.record_id || '–'}</td>
                    <td><OperationBadge op={log.operation} /></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{log.changed_by || <span className="text-muted">–</span>}</td>
                    <td style={{ minWidth: 160 }}>
                      <JsonPreview value={log.old_values} label="Alte Werte" />
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <JsonPreview value={log.new_values} label="Neue Werte" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ── Aktive Nutzer Tab ──────────────────────────────────────────────────────────
function ActiveSessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.getActiveSessions()
      .then(setSessions)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const logoutSession = async (sid) => {
    if (!confirm('Diese Session beenden?')) return;
    try {
      await api.logoutSession(sid);
      load();
    } catch (err) { alert(err.message); }
  };

  const logoutAll = async () => {
    if (!confirm('Alle anderen Sessions beenden?')) return;
    try {
      await api.logoutAllSessions();
      load();
    } catch (err) { alert(err.message); }
  };

  const formatDate = (ts) => {
    if (!ts) return '–';
    return new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {sessions.length} aktive Session(s) — Auto-Refresh alle 30s
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={load}>Aktualisieren</button>
          <button className="btn btn-danger btn-sm" onClick={logoutAll} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            Alle ausloggen
          </button>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="loading"><div className="spinner" /> Lade Sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <p>Keine aktiven Sessions gefunden</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Benutzername</th>
                <th>Anzeigename</th>
                <th>Eingeloggt seit</th>
                <th>Session läuft ab</th>
                <th>Session-ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.sid}>
                  <td className="mono" style={{ fontSize: 13 }}>{s.username || '–'}</td>
                  <td>{s.display_name || <span className="text-muted">–</span>}</td>
                  <td style={{ fontSize: 12 }}>{formatDate(s.login_at)}</td>
                  <td style={{ fontSize: 12 }}>{formatDate(s.session_expires)}</td>
                  <td className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sid}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Session beenden"
                      style={{ color: 'var(--danger, #ef4444)' }}
                      onClick={() => logoutSession(s.sid)}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Wartungsmodus Tab ──────────────────────────────────────────────────────────
function MaintenanceTab() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ reason: '', estimated_end: '' });

  const load = useCallback(() => {
    setLoading(true);
    api.getMaintenance()
      .then(data => {
        setStatus(data);
        if (data?.reason) setForm(f => ({ ...f, reason: data.reason || '' }));
        if (data?.estimated_end) setForm(f => ({ ...f, estimated_end: data.estimated_end ? new Date(data.estimated_end).toISOString().slice(0,16) : '' }));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const activate = async () => {
    if (!confirm('Wartungsmodus aktivieren? Alle nicht-Admin-Sessions werden beendet.')) return;
    setSaving(true); setError('');
    try {
      await api.setMaintenance({
        is_active: true,
        reason: form.reason || null,
        estimated_end: form.estimated_end || null,
      });
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const deactivate = async () => {
    if (!confirm('Wartungsmodus deaktivieren?')) return;
    setSaving(true); setError('');
    try {
      await api.setMaintenance({ is_active: false });
      setForm({ reason: '', estimated_end: '' });
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  if (loading) return <div className="loading"><div className="spinner" /> Lade…</div>;

  const isActive = status?.is_active;

  return (
    <>
      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Aktueller Status */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Aktueller Status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isActive ? 12 : 0 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: isActive ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            color: isActive ? '#ef4444' : '#10b981',
            border: `1px solid ${isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          }}>
            {isActive ? 'Wartungsmodus AKTIV' : 'Normal-Betrieb'}
          </span>
          {isActive && status.activated_by && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              aktiviert von <strong>{status.activated_by}</strong>
              {status.activated_at && ` am ${new Date(status.activated_at).toLocaleString('de-DE')}`}
            </span>
          )}
        </div>
        {isActive && status.reason && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 4, fontSize: 13 }}>
            <strong>Grund:</strong> {status.reason}
          </div>
        )}
        {isActive && status.estimated_end && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Voraussichtliches Ende: {new Date(status.estimated_end).toLocaleString('de-DE')}
          </div>
        )}
      </div>

      {/* Formular */}
      {!isActive ? (
        <div className="card">
          <div className="card-title">Wartungsmodus aktivieren</div>
          <div className="form-group">
            <label className="form-label">Grund / Nachricht für Benutzer</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.reason}
              onChange={set('reason')}
              placeholder="z.B. Datenbankwartung, bitte bis 14:00 Uhr warten."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Voraussichtliches Ende (optional)</label>
            <input
              className="form-control"
              type="datetime-local"
              value={form.estimated_end}
              onChange={set('estimated_end')}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={activate}
            disabled={saving}
            style={{ background: '#ef4444', borderColor: '#ef4444' }}
          >
            {saving ? 'Aktivieren…' : 'Wartungsmodus aktivieren'}
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">Wartungsmodus beenden</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Nach dem Deaktivieren können sich alle Benutzer wieder anmelden.
          </p>
          <button
            className="btn btn-primary"
            onClick={deactivate}
            disabled={saving}
          >
            {saving ? 'Deaktivieren…' : 'Wartungsmodus deaktivieren'}
          </button>
        </div>
      )}
    </>
  );
}

// ── Hauptkomponente ────────────────────────────────────────────────────────────
export default function SystemPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('audit');

  const tabs = [
    { key: 'audit', label: 'Audit-Log' },
    ...(isAdmin ? [
      { key: 'sessions', label: 'Aktive Nutzer' },
      { key: 'maintenance', label: 'Wartungsmodus' },
    ] : []),
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">System</div>
          <div className="page-subtitle">Verwaltung &amp; Überwachung</div>
        </div>
      </div>

      {/* Tab-Navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === t.key ? 600 : 400,
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'audit' && <AuditLogTab />}
      {activeTab === 'sessions' && isAdmin && <ActiveSessionsTab />}
      {activeTab === 'maintenance' && isAdmin && <MaintenanceTab />}
    </div>
  );
}
