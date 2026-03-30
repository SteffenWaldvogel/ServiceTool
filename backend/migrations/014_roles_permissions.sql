-- Migration 014: Granulare Berechtigungen – neue Rollen + erweiterte Permissions
-- Idempotent: kann mehrfach ausgeführt werden

-- ── Neue Berechtigungen (module:action Format) ─────────────────────────────────
INSERT INTO permissions (name, label, category) VALUES
  -- Tickets
  ('tickets:read',             'Tickets anzeigen',              'Tickets'),
  ('tickets:create',           'Tickets erstellen',             'Tickets'),
  ('tickets:edit',             'Tickets bearbeiten',            'Tickets'),
  ('tickets:delete',           'Tickets löschen',               'Tickets'),
  -- Kunden
  ('kunden:read',              'Kunden anzeigen',               'Kunden'),
  ('kunden:create',            'Kunden erstellen',              'Kunden'),
  ('kunden:edit',              'Kunden bearbeiten',             'Kunden'),
  ('kunden:delete',            'Kunden löschen',                'Kunden'),
  -- Ansprechpartner
  ('ansprechpartner:read',     'Ansprechpartner anzeigen',      'Ansprechpartner'),
  ('ansprechpartner:create',   'Ansprechpartner erstellen',     'Ansprechpartner'),
  ('ansprechpartner:edit',     'Ansprechpartner bearbeiten',    'Ansprechpartner'),
  ('ansprechpartner:delete',   'Ansprechpartner löschen',       'Ansprechpartner'),
  -- Maschinen
  ('maschinen:read',           'Maschinen anzeigen',            'Maschinen'),
  ('maschinen:create',         'Maschinen erstellen',           'Maschinen'),
  ('maschinen:edit',           'Maschinen bearbeiten',          'Maschinen'),
  ('maschinen:delete',         'Maschinen löschen',             'Maschinen'),
  -- Ersatzteile
  ('ersatzteile:read',         'Ersatzteile anzeigen',          'Ersatzteile'),
  ('ersatzteile:create',       'Ersatzteile erstellen',         'Ersatzteile'),
  ('ersatzteile:edit',         'Ersatzteile bearbeiten',        'Ersatzteile'),
  ('ersatzteile:delete',       'Ersatzteile löschen',           'Ersatzteile'),
  -- Stammdaten
  ('stammdaten:read',          'Stammdaten anzeigen',           'Verwaltung'),
  ('stammdaten:edit',          'Stammdaten bearbeiten',         'Verwaltung'),
  -- Import
  ('import:use',               'Daten-Import nutzen',           'Verwaltung'),
  -- Reports
  ('reports:read',             'Berichte anzeigen',             'Verwaltung'),
  ('reports:export',           'Berichte exportieren',          'Verwaltung'),
  -- System
  ('system:read',              'System / Audit-Log anzeigen',  'Verwaltung'),
  ('system:admin',             'System-Administration',         'Verwaltung')
ON CONFLICT (name) DO NOTHING;

-- ── Neue Benutzer-Rollen ───────────────────────────────────────────────────────
INSERT INTO roles (name, label, is_system) VALUES
  ('innendienst',  'Service Innendienst',  false),
  ('aussendienst', 'Service Außendienst',  false),
  ('verkauf',      'Verkauf',              false),
  ('lager',        'Lager',               false),
  ('sachbearbeiter','Sachbearbeiter',      false)
ON CONFLICT (name) DO NOTHING;

-- ── Berechtigungen für neue Rollen (module:action Format) ─────────────────────

-- Service Innendienst: alles außer delete + system-admin
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.role_id, p.permission_id
  FROM roles r, permissions p
  WHERE r.name = 'innendienst'
    AND p.name IN (
      'tickets:read','tickets:create','tickets:edit','tickets:delete',
      'kunden:read','kunden:create','kunden:edit',
      'ansprechpartner:read','ansprechpartner:create','ansprechpartner:edit',
      'maschinen:read','maschinen:create','maschinen:edit',
      'ersatzteile:read',
      'stammdaten:read',
      'reports:read','reports:export',
      'system:read'
    )
ON CONFLICT DO NOTHING;

-- Service Außendienst: Lesen + Tickets bearbeiten + Maschinen
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.role_id, p.permission_id
  FROM roles r, permissions p
  WHERE r.name = 'aussendienst'
    AND p.name IN (
      'tickets:read','tickets:create','tickets:edit',
      'kunden:read',
      'ansprechpartner:read',
      'maschinen:read','maschinen:edit',
      'ersatzteile:read'
    )
ON CONFLICT DO NOTHING;

-- Verkauf: Kunden + Tickets lesen/erstellen
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.role_id, p.permission_id
  FROM roles r, permissions p
  WHERE r.name = 'verkauf'
    AND p.name IN (
      'tickets:read','tickets:create',
      'kunden:read','kunden:create','kunden:edit',
      'ansprechpartner:read','ansprechpartner:create','ansprechpartner:edit',
      'maschinen:read',
      'ersatzteile:read',
      'reports:read'
    )
ON CONFLICT DO NOTHING;

-- Lager: Ersatzteile voll + Maschinen lesen
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.role_id, p.permission_id
  FROM roles r, permissions p
  WHERE r.name = 'lager'
    AND p.name IN (
      'ersatzteile:read','ersatzteile:create','ersatzteile:edit','ersatzteile:delete',
      'maschinen:read',
      'tickets:read'
    )
ON CONFLICT DO NOTHING;

-- Sachbearbeiter: alles lesen
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.role_id, p.permission_id
  FROM roles r, permissions p
  WHERE r.name = 'sachbearbeiter'
    AND p.name IN (
      'tickets:read',
      'kunden:read',
      'ansprechpartner:read',
      'maschinen:read',
      'ersatzteile:read',
      'stammdaten:read',
      'reports:read'
    )
ON CONFLICT DO NOTHING;

-- ── user_roles Tabelle für Mehrfach-Rollen ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
