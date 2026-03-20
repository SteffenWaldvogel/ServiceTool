import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';

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

export default function SystemPage() {
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

  const resetFilters = () => setFilters({
    table_name: '', operation: '', changed_by: '', from: '', to: '', limit: '100'
  });

  const formatDate = (ts) => {
    if (!ts) return '–';
    return new Date(ts).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">System</div>
          <div className="page-subtitle">Audit-Log</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>Aktualisieren</button>
      </div>

      {/* Filter bar */}
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
                      {formatDate(log.changed_at)}
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
    </div>
  );
}
