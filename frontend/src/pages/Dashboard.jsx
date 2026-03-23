import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getKritColor } from '../utils/helpers';
import NotificationPanel from '../components/NotificationPanel';

function StatTile({ label, value, color }) {
  return (
    <div className="stat-tile" style={{ '--tile-color': color }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '–'}</div>
    </div>
  );
}

function getStatusColor(entry, index) {
  if (entry.is_terminal) return '#64748b';
  const activeColors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#06b6d4'];
  return activeColors[index % activeColors.length];
}

const PERIODS = [
  { key: 'all',   label: 'Gesamt' },
  { key: 'month', label: 'Monat' },
  { key: 'week',  label: 'Woche' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [myOpenCount, setMyOpenCount] = useState(null);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.getDashboardStats(period)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    if (!user?.user_id) return;
    api.getTickets({ assigned_to: user.user_id, is_terminal: false, limit: 1, offset: 0 })
      .then(result => setMyOpenCount(Array.isArray(result) ? result.length : (result.total ?? 0)))
      .catch(() => setMyOpenCount(0));
  }, [user]);

  if (loading) return <div className="loading"><div className="spinner" /> Lade Dashboard…</div>;
  if (!data) return <div className="page"><div className="error-banner">Fehler beim Laden der Daten</div></div>;

  const { stats, statusVerteilung, letzte_tickets, kritikalitaetVerteilung, technikerVerteilung } = data;

  const avgH = stats.avg_loesungszeit_h != null
    ? `${Number(stats.avg_loesungszeit_h).toFixed(1)} h`
    : '–';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Übersicht aller Service-Aktivitäten</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <NotificationPanel />

      <div className="stat-grid">
        <StatTile label="Offene Tickets" value={stats.offen} color="#3b82f6" />
        <StatTile label="In Bearbeitung" value={stats.in_bearbeitung} color="#f59e0b" />
        <StatTile label="Warten auf Kunde" value={stats.warten} color="#8b5cf6" />
        <StatTile label="Heute erstellt" value={stats.heute_erstellt} color="#10b981" />
        <StatTile label="Heute geschlossen" value={stats.heute_geschlossen} color="#6b7280" />
        <StatTile label="Meine offenen Tickets" value={myOpenCount} color="#06b6d4" />
        <StatTile label="SLA Überfällig" value={stats.sla_overdue ?? 0} color="#ef4444" />
        <StatTile label="Diese Woche" value={stats.diese_woche} color="#10b981" />
        <StatTile label="Ø Lösungszeit" value={avgH} color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Tickets nach Status</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusVerteilung} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e2633', border: '1px solid #2d3748', borderRadius: 6, fontSize: 12 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="anzahl" radius={[4, 4, 0, 0]}>
                {statusVerteilung.map((entry, i) => (
                  <Cell key={i} fill={getStatusColor(entry, i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Offene Tickets nach Kritikalität</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={kritikalitaetVerteilung} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e2633', border: '1px solid #2d3748', borderRadius: 6, fontSize: 12 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="anzahl" radius={[4, 4, 0, 0]}>
                {kritikalitaetVerteilung.map((entry, i) => (
                  <Cell key={i} fill={getKritColor(entry.gewichtung)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {technikerVerteilung?.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Offene Tickets pro Techniker</div>
          <ResponsiveContainer width="100%" height={Math.max(160, technikerVerteilung.length * 36)}>
            <BarChart
              data={technikerVerteilung}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={140}
              />
              <Tooltip
                contentStyle={{ background: '#1e2633', border: '1px solid #2d3748', borderRadius: 6, fontSize: 12 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="anzahl" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <div className="card-title">Letzte Tickets</div>
        {letzte_tickets.length === 0 ? (
          <div className="text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>Keine Tickets vorhanden</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Ticket-Nr.</th>
                <th>Betreff</th>
                <th>Kunde</th>
                <th>Kritikalität</th>
                <th>Status</th>
                <th>Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {letzte_tickets.map(t => (
                <tr key={t.ticketnr} onClick={() => navigate(`/tickets/${t.ticketnr}`)}>
                  <td>
                    <span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>#{t.ticketnr}</span>
                  </td>
                  <td style={{ maxWidth: 240 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.betreff
                        ? t.betreff.split('\n')[0]
                        : <span className="text-muted">(kein Betreff)</span>
                      }
                    </span>
                  </td>
                  <td>{t.kunden_name || <span className="text-muted">–</span>}</td>
                  <td>
                    {t.kritikalitaet_name ? (
                      <span className="badge" style={{
                        background: getKritColor(t.kritikalitaet_gewichtung) + '22',
                        color: getKritColor(t.kritikalitaet_gewichtung)
                      }}>
                        {t.kritikalitaet_name}
                      </span>
                    ) : <span className="text-muted">–</span>}
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: t.is_terminal ? 'rgba(100,116,139,0.15)' : 'rgba(59,130,246,0.15)',
                      color: t.is_terminal ? '#64748b' : 'var(--accent)'
                    }}>
                      {t.status_name}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: 12 }}>
                    {new Date(t.erstellt_am).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
