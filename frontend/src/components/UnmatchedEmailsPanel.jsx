import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

function ZuweisungsModal({ email, onAssigned, onClose }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      api.getTickets({ search, limit: 10 })
        .then(r => setResults(Array.isArray(r) ? r : r.data || []))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const assign = async () => {
    if (!selected) { setError('Bitte Ticket wählen'); return; }
    setLoading(true);
    try {
      await api.assignUnmatchedEmail(email.id, selected.ticketnr);
      onAssigned();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Email Ticket zuweisen</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>&#x2715;</button>
        </div>
        <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          Von: <strong>{email.from_name || email.from_email}</strong> &lt;{email.from_email}&gt;
        </div>
        {error && <div className="error-banner">{error}</div>}
        <div className="form-group">
          <label className="form-label">Ticket suchen (Nr. oder Kunde)</label>
          <input
            className="form-control"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ticket-Nr. oder Kundenname…"
          />
        </div>
        {results.length > 0 && (
          <div className="table-wrapper" style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
            <table>
              <tbody>
                {results.map(t => (
                  <tr
                    key={t.ticketnr}
                    style={{
                      cursor: 'pointer',
                      background: selected?.ticketnr === t.ticketnr ? 'rgba(59,130,246,0.1)' : ''
                    }}
                    onClick={() => setSelected(t)}
                  >
                    <td className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>#{t.ticketnr}</td>
                    <td>{t.kunden_name}</td>
                    <td>{t.status_name}</td>
                    <td style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.betreff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {selected && (
          <div style={{ padding: '8px 12px', background: 'rgba(59,130,246,0.1)', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
            Ausgewählt: <strong>#{selected.ticketnr}</strong> – {selected.kunden_name} – {selected.status_name}
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" disabled={!selected || loading} onClick={assign}>
            {loading ? 'Zuweisen…' : 'Zuweisen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UnmatchedEmailsPanel({ onAssigned }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);

  const load = () => {
    setLoading(true);
    api.getUnmatchedEmails()
      .then(setEmails)
      .catch(() => setEmails([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Lade&#8230;</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600 }}>Nicht zugeordnete Emails ({emails.length})</span>
        <button className="btn btn-ghost btn-sm" onClick={load}>&#8635; Aktualisieren</button>
      </div>
      {emails.length === 0 ? (
        <div className="empty-state"><p>Keine nicht zugeordneten Emails</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {emails.map(e => (
            <div key={e.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {e.from_name || e.from_email} &lt;{e.from_email}&gt;
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{e.subject}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(e.received_at).toLocaleString('de-DE')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 500 }}>
                    {(e.message || '').slice(0, 200)}{e.message?.length > 200 ? '…' : ''}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setAssigning(e)}>
                  Ticket zuweisen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {assigning && (
        <ZuweisungsModal
          email={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={() => {
            setAssigning(null);
            load();
            if (onAssigned) onAssigned();
          }}
        />
      )}
    </div>
  );
}
