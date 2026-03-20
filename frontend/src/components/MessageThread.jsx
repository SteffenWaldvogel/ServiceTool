import React from 'react';

function formatDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function isImageType(mimeType) {
  return mimeType && mimeType.startsWith('image/');
}

const MessageThread = React.memo(function MessageThread({ messages = [], onMoveMessage }) {
  if (messages.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '24px 0' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Noch keine Nachrichten – erste Email oder Notiz hinzufügen
        </p>
      </div>
    );
  }

  // Sort by created_at ascending (oldest first)
  const sorted = [...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="msg-thread">
      {sorted.map((msg, i) => {
        const isEmail = msg.message_type === 'email';
        const isTech = msg.message_type === 'technician';
        const isSys = msg.message_type === 'system';
        const isWeb = msg.message_type === 'web';

        let bubbleClass = 'msg-bubble';
        if (isEmail) bubbleClass += ' msg-email';
        else if (isTech) bubbleClass += ' msg-technician';
        else if (isSys) bubbleClass += ' msg-system';
        if (msg.is_internal) bubbleClass += ' msg-internal';

        const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];

        return (
          <div key={msg.message_id || i} className={bubbleClass}>
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
                {msg._fromChild && (
                  <span className="msg-badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', marginLeft: 4 }}>
                    Ticket #{msg.ticketnr}
                  </span>
                )}
              </div>
            )}
            <div className="msg-text">{msg.message}</div>
            {attachments.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {attachments.map(att => (
                  <a
                    key={att.id}
                    href={`/api/tickets/attachments/${att.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', borderRadius: 6,
                      background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                      color: 'var(--accent)', textDecoration: 'none', fontSize: 12,
                      maxWidth: 280, overflow: 'hidden',
                    }}
                    title={`${att.filename} (${formatSize(att.size_bytes)})`}
                  >
                    <span>{isImageType(att.mime_type) ? '🖼' : '📎'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.filename}
                    </span>
                    {att.size_bytes > 0 && (
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>({formatSize(att.size_bytes)})</span>
                    )}
                  </a>
                ))}
              </div>
            )}
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
});

export default MessageThread;
