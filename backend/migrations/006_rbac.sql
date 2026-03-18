-- Migration 006: RBAC – Rollen, Berechtigungen, Rollen-Berechtigungen
-- Idempotent: kann mehrfach ausgeführt werden

-- ── Rollen ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  role_id   SERIAL PRIMARY KEY,
  name      VARCHAR(50) UNIQUE NOT NULL,
  label     VARCHAR(100),
  is_system BOOLEAN DEFAULT false
);

-- ── Berechtigungen ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  permission_id SERIAL PRIMARY KEY,
  name          VARCHAR(100) UNIQUE NOT NULL,
  label         VARCHAR(150),
  category      VARCHAR(50)
);

-- ── Rollen-Berechtigungen ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(permission_id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ── Seed: Rollen ─────────────────────────────────────────────────────────────
INSERT INTO roles (role_id, name, label, is_system) VALUES
  (1, 'admin',     'Administrator', true),
  (2, 'techniker', 'Techniker',     true),
  (3, 'readonly',  'Nur-Lesen',     false)
ON CONFLICT (name) DO NOTHING;

SELECT setval('roles_role_id_seq', GREATEST((SELECT MAX(role_id) FROM roles), 3));

-- ── Seed: Berechtigungen ──────────────────────────────────────────────────────
INSERT INTO permissions (name, label, category) VALUES
  ('tickets.view',           'Tickets anzeigen',           'Tickets'),
  ('tickets.create',         'Tickets erstellen',          'Tickets'),
  ('tickets.edit',           'Tickets bearbeiten',         'Tickets'),
  ('tickets.delete',         'Tickets löschen',            'Tickets'),
  ('tickets.reply',          'E-Mail-Antwort senden',      'Tickets'),
  ('kunden.view',            'Kunden anzeigen',            'Kunden'),
  ('kunden.create',          'Kunden erstellen',           'Kunden'),
  ('kunden.edit',            'Kunden bearbeiten',          'Kunden'),
  ('kunden.delete',          'Kunden löschen',             'Kunden'),
  ('maschinen.view',         'Maschinen anzeigen',         'Maschinen'),
  ('maschinen.create',       'Maschinen erstellen',        'Maschinen'),
  ('maschinen.edit',         'Maschinen bearbeiten',       'Maschinen'),
  ('maschinen.delete',       'Maschinen löschen',          'Maschinen'),
  ('ersatzteile.view',       'Ersatzteile anzeigen',       'Ersatzteile'),
  ('ersatzteile.create',     'Ersatzteile erstellen',      'Ersatzteile'),
  ('ersatzteile.edit',       'Ersatzteile bearbeiten',     'Ersatzteile'),
  ('ersatzteile.delete',     'Ersatzteile löschen',        'Ersatzteile'),
  ('ansprechpartner.view',   'Ansprechpartner anzeigen',   'Ansprechpartner'),
  ('ansprechpartner.create', 'Ansprechpartner erstellen',  'Ansprechpartner'),
  ('ansprechpartner.edit',   'Ansprechpartner bearbeiten', 'Ansprechpartner'),
  ('ansprechpartner.delete', 'Ansprechpartner löschen',    'Ansprechpartner'),
  ('stammdaten.manage',      'Stammdaten verwalten',       'Verwaltung'),
  ('system.view',            'System / Audit-Log',         'Verwaltung'),
  ('users.manage',           'Benutzerverwaltung',         'Verwaltung'),
  ('customfields.manage',    'Freifelder verwalten',       'Verwaltung')
ON CONFLICT (name) DO NOTHING;

-- ── Benutzer-Tabelle: role VARCHAR → role_id FK ───────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE users ADD COLUMN role_id INTEGER;
  END IF;
END $$;

-- Daten migrieren: alte role-Spalte → role_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    UPDATE users SET role_id = 1 WHERE role = 'admin'     AND role_id IS NULL;
    UPDATE users SET role_id = 2 WHERE role != 'admin'    AND role_id IS NULL;
    ALTER TABLE users DROP COLUMN IF EXISTS role;
  END IF;
END $$;

-- Fallback für Zeilen ohne role_id
UPDATE users SET role_id = 2 WHERE role_id IS NULL;

-- Default + NOT NULL setzen
ALTER TABLE users ALTER COLUMN role_id SET DEFAULT 2;

DO $$
BEGIN
  ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- FK hinzufügen falls noch nicht vorhanden
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_role_id_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_id_fkey
      FOREIGN KEY (role_id) REFERENCES roles(role_id);
  END IF;
END $$;

-- ── Seed: Rollen-Berechtigungen ───────────────────────────────────────────────

-- admin: alle Berechtigungen
INSERT INTO role_permissions (role_id, permission_id)
  SELECT 1, permission_id FROM permissions
ON CONFLICT DO NOTHING;

-- techniker: view + service-relevante Schreibrechte
INSERT INTO role_permissions (role_id, permission_id)
  SELECT 2, p.permission_id FROM permissions p
  WHERE p.name IN (
    'tickets.view','tickets.create','tickets.edit','tickets.delete','tickets.reply',
    'kunden.view','kunden.create','kunden.edit',
    'maschinen.view','maschinen.create','maschinen.edit',
    'ersatzteile.view',
    'ansprechpartner.view','ansprechpartner.create','ansprechpartner.edit'
  )
ON CONFLICT DO NOTHING;

-- readonly: nur Ansicht
INSERT INTO role_permissions (role_id, permission_id)
  SELECT 3, p.permission_id FROM permissions p
  WHERE p.name LIKE '%.view'
ON CONFLICT DO NOTHING;

-- ── Admin-User aktualisieren ──────────────────────────────────────────────────
INSERT INTO users (username, password_hash, display_name, role_id)
VALUES (
  'admin',
  '$2b$12$m/ea5NC20vELwCjpT5zJROQKdtLBZSONtRnlnNVhAgH7uF.H5A3Dm',
  'Administrator',
  1
) ON CONFLICT (username) DO UPDATE SET
  password_hash = '$2b$12$m/ea5NC20vELwCjpT5zJROQKdtLBZSONtRnlnNVhAgH7uF.H5A3Dm',
  role_id = 1;
