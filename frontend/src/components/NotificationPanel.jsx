import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const EVENT_CONFIG = {
  ticket_assigned:  { icon: '→', color: '#3b82f6', label: 'Zuweisung' },
  ticket_created:   { icon: '+', color: '#10b981', label: 'Neues Ticket' },
  unmatched_email:  { icon: '✉', color: '#f59e0b', label: 'Ungematchte Email' },
  status_changed:   { icon: '↻', color: '#8b5cf6', label: 'Status' },
  sla_approaching:  { icon: '⏱', color: '#f59e0b', label: 'SLA Warning' },
  sla_overdue:      { icon: '!', color: '#ef4444', label: 'SLA Überfällig' },
  high_priority:    { icon: '▲', color: '#ef4444', label: 'Hohe Priorität' },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  return `vor ${Math.floor(diff / 86400)} Tag${Math.floor(diff / 86400) > 1 ? 'en' : ''}`;
}

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api.getNotifications({ limit: 20 })
      .then(res => {
        setNotifications(res.data || []);
        setUnreadCount(res.unread_count || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  const handleClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.markNotificationRead(n.notification_id);
        setNotifications(prev => prev.map(x =>
          x.notification_id === n.notification_id ? { ...x, is_read: true } : x
        ));
        setUnreadCount(c => Math.max(0, c - 1));
      } catch {}
    }
    if (n.reference_type === 'ticket' && n.reference_id) {
      navigate(`/tickets/${n.reference_id}`);
    } else if (n.event_type === 'unmatched_email') {
      navigate('/posteingang');
    }
  };

  const deleteOne = async (e, n) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(n.notification_id);
      setNotifications(prev => prev.filter(x => x.notification_id !== n.notification_id));
      if (!n.is_read) setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteAll = async () => {
    try {
      await api.deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => setCollapsed(c => !c)}>
          Benachrichtigungen
          {unreadCount > 0 && (
            <span className="badge" style={{ marginLeft: 8, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 11 }}>
              {unreadCount}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>
            {collapsed ? '▸' : '▾'}
          </span>
        </span>
        {!collapsed && notifications.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {unreadCount > 0 && (
              <button className="btn btn-sm btn-secondary" onClick={markAllRead} style={{ fontSize: 11 }}>
                Alle gelesen
              </button>
            )}
            <button className="btn btn-sm btn-ghost" onClick={deleteAll} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Alle löschen
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        notifications.length === 0 ? (
          <div className="text-muted" style={{ padding: '16px 0', textAlign: 'center', fontSize: 13 }}>
            Keine Benachrichtigungen
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map(n => {
              const cfg = EVENT_CONFIG[n.event_type] || { icon: '•', color: '#64748b', label: n.event_type };
              return (
                <div
                  key={n.notification_id}
                  className={`notification-item${n.is_read ? '' : ' unread'}`}
                  onClick={() => handleClick(n)}
                >
                  {!n.is_read && <div className="notification-dot" />}
                  <div
                    className="notification-icon"
                    style={{ color: cfg.color, background: cfg.color + '18' }}
                  >
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600 }}>
                      {n.title}
                    </div>
                    {n.message && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>
                        {n.message.split(' | ').slice(0, 3).map((part, i) => (
                          <span key={i} style={{ marginRight: 8 }}>
                            {part.includes(':')
                              ? <><span style={{ color: 'var(--text-muted)' }}>{part.split(':')[0]}:</span> {part.split(':').slice(1).join(':').trim()}</>
                              : part
                            }
                            {i < Math.min(n.message.split(' | ').length, 3) - 1 && <span style={{ color: 'var(--border)', margin: '0 2px' }}>·</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {timeAgo(n.created_at)}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={(e) => deleteOne(e, n)}
                      title="Löschen"
                      style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 4px', minWidth: 0 }}
                    >✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
