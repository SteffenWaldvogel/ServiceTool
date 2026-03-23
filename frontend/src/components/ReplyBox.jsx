import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function ReplyBox({ ticketnr, defaultToEmail, defaultToName, onSent, onClose, initialInternal = false, initialMessage = '' }) {
  const [isInternal, setIsInternal] = useState(initialInternal);
  const [toEmail, setToEmail] = useState(defaultToEmail || '');
  const [subject, setSubject] = useState(`[Ticket #${ticketnr}] Re:`);
  const [message, setMessage] = useState(initialMessage);
  const [sentBy, setSentBy] = useState(() => localStorage.getItem('technician_name') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sentBy) localStorage.setItem('technician_name', sentBy);
  }, [sentBy]);

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) { setError('Nachricht darf nicht leer sein'); return; }
    setLoading(true); setError('');

    try {
      if (isInternal) {
        await api.addMessage(ticketnr, {
          from_name: sentBy || 'Techniker',
          from_email: null,
          message: message.trim(),
          message_type: 'system',
          is_internal: true
        });
      } else {
        try {
          await api.sendReply(ticketnr, {
            to_email: toEmail,
            to_name: defaultToName,
            subject,
            message: message.trim(),
            sent_by: sentBy
          });
        } catch (err) {
          // 503 = Email nicht konfiguriert, Notiz gespeichert – kein echter Fehler
          if (err.message && err.message.includes('nicht konfiguriert')) {
            setError('Email nicht konfiguriert – als Notiz gespeichert');
          } else {
            throw err;
          }
        }
      }
      onSent();
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div className="modal-title">
            {isInternal ? 'Interne Notiz' : 'Antwort senden'} — Ticket #{ticketnr}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>&#x2715;</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            className={`btn btn-sm ${!isInternal ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsInternal(false)}
          >&#9993; Als Email senden</button>
          <button
            type="button"
            className={`btn btn-sm ${isInternal ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsInternal(true)}
          >&#128274; Interne Notiz</button>
        </div>
        {error && <div className="error-banner" style={{ marginBottom: 8 }}>{error}</div>}
        <form onSubmit={submit}>
          <div className="grid-2">
            {!isInternal && (
              <>
                <div className="form-group">
                  <label className="form-label">An (Email)</label>
                  <input className="form-control" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="kunde@beispiel.de" />
                </div>
                <div className="form-group">
                  <label className="form-label">Betreff</label>
                  <input className="form-control" value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Mein Name</label>
              <input className="form-control" value={sentBy} onChange={e => setSentBy(e.target.value)} placeholder="Techniker-Name" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nachricht *</label>
            <textarea
              className="form-control"
              rows={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={isInternal ? 'Interne Notiz (nicht sichtbar für Kunden)…' : 'Antwort an Kunden…'}
              autoFocus
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Senden…' : isInternal ? 'Notiz speichern' : 'Senden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
