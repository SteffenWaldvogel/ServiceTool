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
