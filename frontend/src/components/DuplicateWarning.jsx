import React, { useState } from 'react';

export default function DuplicateWarning({ matches, entityType, onSelectExisting, onContinue }) {
  const [confirmed, setConfirmed] = useState(false);
  if (!matches || matches.length === 0) return null;

  const topLevel = matches[0]?.level;
  const isWarning = topLevel === 'warning';
  const color = isWarning ? '#f59e0b' : 'var(--accent)';
  const bgColor = isWarning ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)';
  const icon = isWarning ? '⚠' : 'ℹ';

  return (
    <div style={{ border: `1px solid ${color}`, borderRadius: 'var(--radius)', padding: 14, marginBottom: 16, background: bgColor }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16, color }}>{icon}</span>
        <span style={{ fontWeight: 600, color, fontSize: 13 }}>
          {isWarning ? `Mögliche Dublette gefunden` : `Ähnliche ${entityType} gefunden`}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {matches.map((m, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 500, fontSize: 13 }}>
                {m.name_kunde || m.name || m.maschinennr}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 60, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                  <div style={{ width: `${m.score}%`, height: '100%', background: color, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.score}%</span>
              </div>
            </div>
            {(m.ort || m.plz) && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{[m.plz, m.ort].filter(Boolean).join(' ')}</div>}
            {m.kunde && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.kunde}</div>}
            {m.reasons?.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {m.reasons.map((r, j) => (
                  <span key={j} className="badge" style={{ fontSize: 10, background: `${color}22`, color }}>{r}</span>
                ))}
              </div>
            )}
            {onSelectExisting && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 6, fontSize: 12 }}
                onClick={() => onSelectExisting(m.kundennummer || m.ansprechpartnerid || m.maschinenid)}
              >
                Diesen verwenden →
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          Ich bestätige, dass dies kein Duplikat ist
        </label>
        <button
          className="btn btn-secondary btn-sm"
          disabled={!confirmed}
          onClick={onContinue}
          style={{ opacity: confirmed ? 1 : 0.5 }}
        >
          Trotzdem neu anlegen
        </button>
      </div>
    </div>
  );
}
