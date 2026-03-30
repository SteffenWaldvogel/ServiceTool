-- Migration 013: Active Sessions View + Maintenance Mode
-- Idempotent: kann mehrfach ausgeführt werden

-- ── Aktive Sessions View ───────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
  s.sid,
  (s.sess->>'user_id')::INTEGER       AS user_id,
  u.username,
  u.display_name,
  TO_TIMESTAMP((s.sess->>'login_at')::BIGINT / 1000) AS login_at,
  s.expire AS session_expires
FROM user_sessions s
LEFT JOIN users u ON (s.sess->>'user_id')::INTEGER = u.user_id
WHERE s.sess->>'user_id' IS NOT NULL
  AND s.expire > NOW();

-- ── Wartungsmodus-Tabelle ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_mode (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  is_active     BOOLEAN NOT NULL DEFAULT false,
  activated_by  VARCHAR(100),
  activated_at  TIMESTAMP,
  reason        TEXT,
  estimated_end TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO maintenance_mode (id, is_active) VALUES (1, false) ON CONFLICT (id) DO NOTHING;
