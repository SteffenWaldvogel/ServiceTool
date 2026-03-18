import React from 'react';

function formatDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function MessageThread({ messages = [], onMoveMessage }) {
  if (messages.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '24px 0' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Noch keine Nachrichten – erste Email oder Notiz hinzufügen
        </p>
      </div>
    );
  }

  return (
    <div className="msg-thread">
      {messages.map((msg, i) => {
        const isEmail = msg.message_type === 'email';
        const isTech = msg.message_type === 'technician';
        const isSys = msg.message_type === 'system';
        const isWeb = msg.message_type === 'web';

        let bubbleClass = 'msg-bubble';
        if (isEmail) bubbleClass += ' msg-email';
        else if (isTech) bubbleClass += ' msg-technician';
        else if (isSys) bubbleClass += ' msg-system';
        if (msg.is_internal) bubbleClass += ' msg-internal';

        return (
          <div key={msg.message_id} className={bubbleClass}>
            {!isSys && (
              <div className="msg-header">
                {isEmail && (
                  <>
                    <span>&#9993; </span>
                    <strong>{msg.from_name || msg.from_email}</strong>
                    {msg.from_email && msg.from_name && (
                      <span style={{ marginLeft: 4, opacity: 0.7 }}>&lt;{msg.from_email}&gt;</span>
                    )}
                  </>
                )}
                {isTech && (
                  <>
                    <span>&#128100; </span>
                    <strong>Techniker: {msg.from_name}</strong>
                  </>
                )}
                {isWeb && (
                  <>
                    <span>&#127760; </span>
                    <strong>{msg.from_name || 'Web'}</strong>
                    {i === 0 && (
                      <span className="msg-badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1', marginLeft: 4 }}>
                        Erstmeldung
                      </span>
                    )}
                  </>
                )}
                <span style={{ marginLeft: 8, opacity: 0.6 }}>{formatDate(msg.created_at)}</span>
                {msg.message_type && !isWeb && (
                  <span className="msg-badge" style={{
                    background: isEmail ? 'rgba(59,130,246,0.15)' : isTech ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                    color: isEmail ? 'var(--accent)' : isTech ? '#10b981' : 'var(--text-muted)'
                  }}>
                    {isEmail ? 'Email' : isTech ? 'Techniker' : 'System'}
                  </span>
                )}
                {msg.is_internal && (
                  <span className="msg-badge" style={{ background: 'rgba(234,179,8,0.2)', color: '#eab308', marginLeft: 4 }}>
                    Intern
                  </span>
                )}
              </div>
            )}
            <div className="msg-text">{msg.message}</div>
            {onMoveMessage && isEmail && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 10, padding: '1px 6px', marginTop: 4 }}
                onClick={() => onMoveMessage(msg)}
              >&#8594; Verschieben</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
