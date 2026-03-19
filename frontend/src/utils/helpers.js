// ── Kategorie ────────────────────────────────────────────────────────────────
/**
 * Splits "Ersatzteil · Level 2" into { typ: "Ersatzteil", level: "L2" }
 * Works for any name – if no " · " separator, returns full name as typ.
 */
export function parseKategorie(name) {
  const parts = name?.split(' · ');
  return {
    typ:   parts?.[0] ?? name ?? '',
    level: parts?.[1]?.replace('Level ', 'L') ?? '',
  };
}

// ── Kritikalität ─────────────────────────────────────────────────────────────
// Gewichtung: 1 = Low (grün), 2 = Medium (gelb), 3 = High (rot)
export const KRIT_COLOR = {
  1: '#06d6a0',   // Low    – grün
  2: '#ffd166',   // Medium – gelb
  3: '#ff4d4d',   // High   – rot
};

export function getKritColor(gewichtung) {
  return KRIT_COLOR[gewichtung] ?? '#64748b';
}

// ── SLA ──────────────────────────────────────────────────────────────────────
// Gibt null | 'ok' | 'warning' | 'overdue' zurück
export function getSlaStatus(ticket) {
  if (!ticket.sla_response_time_h || ticket.is_terminal) return null;
  const created = new Date(ticket.erstellt_am);
  const deadline = new Date(created.getTime() + ticket.sla_response_time_h * 3600 * 1000);
  const now = new Date();
  const totalMs = deadline - created;
  const remainingMs = deadline - now;
  if (remainingMs < 0) return 'overdue';
  if (remainingMs / totalMs < 0.2) return 'warning';
  return 'ok';
}

// Formatiert verbleibende / überschrittene Zeit als lesbaren String
export function getSlaLabel(ticket) {
  if (!ticket.sla_response_time_h || ticket.is_terminal) return null;
  const created = new Date(ticket.erstellt_am);
  const deadline = new Date(created.getTime() + ticket.sla_response_time_h * 3600 * 1000);
  const diffMs = deadline - new Date();
  const abs = Math.abs(diffMs);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  if (diffMs < 0) return `${h}h ${m}m überfällig`;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h verbleibend`;
  return `${h}h ${m}m verbleibend`;
}
