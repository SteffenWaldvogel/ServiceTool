-- ============================================================================
-- SERVICE TICKETING SYSTEM - PostgreSQL Database Schema
-- Version: 1.0
-- Normalization: BCNF/4NF
-- ============================================================================

-- Drop existing database if it exists (für Tests)
-- DROP DATABASE IF EXISTS service_ticketing CASCADE;
-- CREATE DATABASE service_ticketing;
-- \c service_ticketing

-- ============================================================================
-- 1. MASTER DATA TABLES (Referenztabellen)
-- ============================================================================

-- Service Priority Levels
CREATE TABLE service_priority (
  service_priority_id SERIAL PRIMARY KEY,
  service_priority_name VARCHAR(50) NOT NULL UNIQUE,
  service_priority_beschreibung TEXT,
  priority_order INTEGER NOT NULL DEFAULT 0
);

-- Abteilungen
CREATE TABLE abteilung (
  abteilung_id SERIAL PRIMARY KEY,
  abteilung_name VARCHAR(255) NOT NULL UNIQUE,
  abteilung_beschreibung TEXT
);

-- Positionen (mit FK zu Abteilung)
CREATE TABLE position (
  position_id SERIAL PRIMARY KEY,
  position_name VARCHAR(255) NOT NULL,
  abteilung_id INTEGER NOT NULL REFERENCES abteilung(abteilung_id),
  position_beschreibung TEXT,
  UNIQUE(position_name, abteilung_id)
);

-- Ticket Kategorien
CREATE TABLE kategorie (
  kategorie_id SERIAL PRIMARY KEY,
  kategorie_name VARCHAR(255) NOT NULL UNIQUE,
  kategorie_beschreibung TEXT
);

-- Kritikalität Levels
CREATE TABLE kritikalität (
  kritikalität_id SERIAL PRIMARY KEY,
  kritikalität_name VARCHAR(50) NOT NULL UNIQUE,
  kritikalität_beschreibung TEXT,
  kritikalität_gewichtung INTEGER NOT NULL DEFAULT 0
);

-- Ticket Status
CREATE TABLE status (
  status_id SERIAL PRIMARY KEY,
  status_name VARCHAR(100) NOT NULL UNIQUE,
  status_beschreibung TEXT,
  is_terminal BOOLEAN DEFAULT FALSE -- TRUE wenn Ticket "geschlossen" ist
);

-- Maschinentypen
CREATE TABLE maschinentyp (
  maschinentyp_id SERIAL PRIMARY KEY,
  maschinentyp_name VARCHAR(255) NOT NULL UNIQUE,
  maschinentyp_beschreibung TEXT
);

-- ============================================================================
-- 2. CORE BUSINESS TABLES
-- ============================================================================

-- Kunden (Haupttabelle)
CREATE TABLE kunden (
  kundennummer SERIAL PRIMARY KEY,
  matchcode VARCHAR(50) UNIQUE,
  name_kunde VARCHAR(255) NOT NULL,
  zusatz VARCHAR(255),
  straße VARCHAR(255),
  hausnr VARCHAR(20),
  plz VARCHAR(10),
  ort VARCHAR(255),
  land VARCHAR(100),
  service_priority_id INTEGER REFERENCES service_priority(service_priority_id),
  bemerkung_kunde TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kunden E-Mails (1:N)
CREATE TABLE kunden_emails (
  kundennummer INTEGER NOT NULL REFERENCES kunden(kundennummer) ON DELETE CASCADE,
  email_adresse VARCHAR(255) NOT NULL,
  PRIMARY KEY (kundennummer, email_adresse)
);

-- Kunden Telefonnummern (1:N)
CREATE TABLE kunden_telefonnummern (
  kundennummer INTEGER NOT NULL REFERENCES kunden(kundennummer) ON DELETE CASCADE,
  telefonnummer VARCHAR(20) NOT NULL,
  PRIMARY KEY (kundennummer, telefonnummer)
);

-- Ansprechpartner
CREATE TABLE ansprechpartner (
  ansprechpartnerid SERIAL PRIMARY KEY,
  ansprechpartner_kundennr INTEGER NOT NULL REFERENCES kunden(kundennummer),
  ansprechpartner_name VARCHAR(255) NOT NULL,
  abteilung_id INTEGER NOT NULL REFERENCES abteilung(abteilung_id),
  position_id INTEGER NOT NULL REFERENCES position(position_id),
  ansprechpartner_email VARCHAR(255),
  ansprechpartner_telefon VARCHAR(20),
  ansprechpartner_vertretungid INTEGER REFERENCES ansprechpartner(ansprechpartnerid) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maschinen
CREATE TABLE maschine (
  maschinenid SERIAL PRIMARY KEY,
  maschinennr VARCHAR(100) NOT NULL UNIQUE,
  bezeichnung TEXT,
  maschinentyp_id INTEGER NOT NULL REFERENCES maschinentyp(maschinentyp_id),
  baujahr INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ersatzteile (mit Self-Reference für Baugruppen)
CREATE TABLE ersatzteile (
  artikelnr SERIAL PRIMARY KEY,
  bezeichnung VARCHAR(255) NOT NULL,
  zusätzliche_bezeichnungen VARCHAR(255),
  baugruppe_artikelnr INTEGER REFERENCES ersatzteile(artikelnr) ON DELETE SET NULL,
  zusatzinfos TEXT,
  bemerkung_ersatzteil TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ersatzteile Maschinentypkompatibilität - BAUJAHRE (4NF: getrennt von Nummern)
CREATE TABLE ersatzteile_maschinentyp_baujahr (
  artikelnr INTEGER NOT NULL REFERENCES ersatzteile(artikelnr) ON DELETE CASCADE,
  maschinentyp_id INTEGER NOT NULL REFERENCES maschinentyp(maschinentyp_id) ON DELETE CASCADE,
  baujahr_von INTEGER,
  baujahr_bis INTEGER,
  bemerkung_baujahr TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (artikelnr, maschinentyp_id, baujahr_von, baujahr_bis)
);

-- Ersatzteile Maschinentypkompatibilität - MASCHINENNUMMERN (4NF: getrennt von Baujahren)
CREATE TABLE ersatzteile_maschinentyp_nummer (
  artikelnr INTEGER NOT NULL REFERENCES ersatzteile(artikelnr) ON DELETE CASCADE,
  maschinentyp_id INTEGER NOT NULL REFERENCES maschinentyp(maschinentyp_id) ON DELETE CASCADE,
  maschinennummer_von VARCHAR(100),
  maschinennummer_bis VARCHAR(100),
  bemerkung_nummer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (artikelnr, maschinentyp_id, maschinennummer_von, maschinennummer_bis)
);

-- Tickets (Haupttabelle für Service-Ticketing)
CREATE TABLE ticket (
  ticketnr SERIAL PRIMARY KEY,
  kategorie_id INTEGER NOT NULL REFERENCES kategorie(kategorie_id),
  kritikalität_id INTEGER NOT NULL REFERENCES kritikalität(kritikalität_id),
  status_id INTEGER NOT NULL REFERENCES status(status_id),
  ticket_kundennummer INTEGER NOT NULL REFERENCES kunden(kundennummer),
  ticket_ansprechpartnerid INTEGER REFERENCES ansprechpartner(ansprechpartnerid) ON DELETE SET NULL,
  ticket_maschinenid INTEGER REFERENCES maschine(maschinenid) ON DELETE SET NULL,
  erstellt_von VARCHAR(255),
  erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  geändert_von VARCHAR(255),
  geändert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Messages (Nachrichten/Kommunikation zu einem Ticket)
CREATE TABLE ticket_messages (
  message_id SERIAL PRIMARY KEY,
  ticketnr INTEGER NOT NULL REFERENCES ticket(ticketnr) ON DELETE CASCADE,
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  message TEXT,
  message_type VARCHAR(50) DEFAULT 'web', -- 'email', 'web', 'technician'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ticket_messages_ticketnr ON ticket_messages(ticketnr);

-- ============================================================================
-- 3. CUSTOM FIELDS CONFIGURATION (Flexible Freifelder)
-- ============================================================================

-- Custom Field Definitionen (Meta-Information)
CREATE TABLE custom_field_definitions (
  custom_field_table_name VARCHAR(50) NOT NULL,
  custom_field_key VARCHAR(50) NOT NULL,
  custom_field_label VARCHAR(255) NOT NULL,
  custom_field_type VARCHAR(50), -- 'text', 'textarea', 'dropdown', 'date', 'number'
  custom_field_description TEXT,
  custom_field_position INTEGER,
  custom_field_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  custom_field_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (custom_field_table_name, custom_field_key)
);

-- Custom Field Optionen (für Dropdowns)
CREATE TABLE custom_field_options (
  custom_field_table_name VARCHAR(50) NOT NULL,
  custom_field_key VARCHAR(50) NOT NULL,
  custom_field_option_value VARCHAR(255) NOT NULL,
  custom_field_option_label VARCHAR(255),
  custom_field_option_position INTEGER,
  custom_field_option_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (custom_field_table_name, custom_field_key) 
    REFERENCES custom_field_definitions(custom_field_table_name, custom_field_key) ON DELETE CASCADE,
  PRIMARY KEY (custom_field_table_name, custom_field_key, custom_field_option_value)
);

-- Kunden Custom Fields
CREATE TABLE kunden_custom_fields (
  kundennummer INTEGER PRIMARY KEY REFERENCES kunden(kundennummer) ON DELETE CASCADE,
  field_key VARCHAR(50) NOT NULL,
  field_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ansprechpartner Custom Fields
CREATE TABLE ansprechpartner_custom_fields (
  ansprechpartnerid INTEGER PRIMARY KEY REFERENCES ansprechpartner(ansprechpartnerid) ON DELETE CASCADE,
  field_key VARCHAR(50) NOT NULL,
  field_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Custom Fields
CREATE TABLE ticket_custom_fields (
  ticketnr INTEGER PRIMARY KEY REFERENCES ticket(ticketnr) ON DELETE CASCADE,
  field_key VARCHAR(50) NOT NULL,
  field_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maschine Custom Fields
CREATE TABLE maschine_custom_fields (
  maschinenid INTEGER PRIMARY KEY REFERENCES maschine(maschinenid) ON DELETE CASCADE,
  field_key VARCHAR(50) NOT NULL,
  field_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ersatzteile Custom Fields
CREATE TABLE ersatzteile_custom_fields (
  artikelnr INTEGER PRIMARY KEY REFERENCES ersatzteile(artikelnr) ON DELETE CASCADE,
  field_key VARCHAR(50) NOT NULL,
  field_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. INDICES FÜR PERFORMANCE
-- ============================================================================

-- Kunden
CREATE INDEX idx_kunden_name ON kunden(name_kunde);
CREATE INDEX idx_kunden_plz ON kunden(plz);
CREATE INDEX idx_kunden_priority ON kunden(service_priority_id);

-- Ansprechpartner
CREATE INDEX idx_ansprechpartner_kundennr ON ansprechpartner(ansprechpartner_kundennr);
CREATE INDEX idx_ansprechpartner_abteilung ON ansprechpartner(abteilung_id);
CREATE INDEX idx_ansprechpartner_position ON ansprechpartner(position_id);

-- Maschinen
CREATE INDEX idx_maschine_nr ON maschine(maschinennr);
CREATE INDEX idx_maschine_typ ON maschine(maschinentyp_id);

-- Ersatzteile
CREATE INDEX idx_ersatzteile_baugruppe ON ersatzteile(baugruppe_artikelnr);
CREATE INDEX idx_ersatzteile_bezeichnung ON ersatzteile(bezeichnung);

-- Tickets
CREATE INDEX idx_ticket_kunde ON ticket(ticket_kundennummer);
CREATE INDEX idx_ticket_maschine ON ticket(ticket_maschinenid);
CREATE INDEX idx_ticket_ansprechpartner ON ticket(ticket_ansprechpartnerid);
CREATE INDEX idx_ticket_kategorie ON ticket(kategorie_id);
CREATE INDEX idx_ticket_kritikalität ON ticket(kritikalität_id);
CREATE INDEX idx_ticket_status ON ticket(status_id);
CREATE INDEX idx_ticket_created ON ticket(created_at);

-- Kompatibilität
CREATE INDEX idx_compat_baujahr_artikel ON ersatzteile_maschinentyp_baujahr(artikelnr);
CREATE INDEX idx_compat_baujahr_typ ON ersatzteile_maschinentyp_baujahr(maschinentyp_id);
CREATE INDEX idx_compat_nummer_artikel ON ersatzteile_maschinentyp_nummer(artikelnr);
CREATE INDEX idx_compat_nummer_typ ON ersatzteile_maschinentyp_nummer(maschinentyp_id);

-- Full-Text Search (für spätere Suche)
CREATE INDEX idx_kunden_search ON kunden USING GIN(
  to_tsvector('german', COALESCE(name_kunde, '') || ' ' || COALESCE(ort, ''))
);

-- ============================================================================
-- 5. VIEWS FÜR HÄUFIGE QUERIES (optional)
-- ============================================================================

-- Aktive Kunden mit Kontaktinfos
CREATE VIEW v_kunden_mit_kontakt AS
SELECT 
  k.kundennummer,
  k.name_kunde,
  k.ort,
  string_agg(DISTINCT ke.email_adresse, ', ') as emails,
  string_agg(DISTINCT kt.telefonnummer, ', ') as telefonnummern,
  sp.service_priority_name
FROM kunden k
LEFT JOIN kunden_emails ke ON k.kundennummer = ke.kundennummer
LEFT JOIN kunden_telefonnummern kt ON k.kundennummer = kt.kundennummer
LEFT JOIN service_priority sp ON k.service_priority_id = sp.service_priority_id
GROUP BY k.kundennummer, k.name_kunde, k.ort, sp.service_priority_name;

-- Tickets mit Auflösung
CREATE VIEW v_tickets_mit_details AS
SELECT 
  t.ticketnr,
  t.ticket_kundennummer,
  k.name_kunde,
  t.ticket_maschinenid,
  m.maschinennr,
  mt.maschinentyp_name,
  k2.kategorie_name,
  kr.kritikalität_name,
  s.status_name,
  ap.ansprechpartner_name,
  t.erstellt_am,
  t.geändert_am
FROM ticket t
JOIN kunden k ON t.ticket_kundennummer = k.kundennummer
LEFT JOIN maschine m ON t.ticket_maschinenid = m.maschinenid
LEFT JOIN maschinentyp mt ON m.maschinentyp_id = mt.maschinentyp_id
LEFT JOIN kategorie k2 ON t.kategorie_id = k2.kategorie_id
LEFT JOIN kritikalität kr ON t.kritikalität_id = kr.kritikalität_id
LEFT JOIN status s ON t.status_id = s.status_id
LEFT JOIN ansprechpartner ap ON t.ticket_ansprechpartnerid = ap.ansprechpartnerid;

-- Ersatzteile Kompatibilität (zusammengefasst)
CREATE VIEW v_ersatzteile_kompatibilität AS
SELECT 
  emb.artikelnr,
  e.bezeichnung,
  mt.maschinentyp_name,
  CASE 
    WHEN emb.baujahr_von IS NOT NULL AND emb.baujahr_bis IS NOT NULL 
      THEN emb.baujahr_von || '-' || emb.baujahr_bis
    WHEN emb.baujahr_von IS NOT NULL 
      THEN 'ab ' || emb.baujahr_von
    ELSE 'alle Baujahre'
  END as baujahre,
  CASE 
    WHEN emn.maschinennummer_von IS NOT NULL AND emn.maschinennummer_bis IS NOT NULL 
      THEN emn.maschinennummer_von || ' - ' || emn.maschinennummer_bis
    WHEN emn.maschinennummer_von IS NOT NULL 
      THEN emn.maschinennummer_von
    ELSE NULL
  END as nummernbereich
FROM ersatzteile_maschinentyp_baujahr emb
FULL OUTER JOIN ersatzteile_maschinentyp_nummer emn 
  ON emb.artikelnr = emn.artikelnr 
  AND emb.maschinentyp_id = emn.maschinentyp_id
JOIN ersatzteile e ON emb.artikelnr = e.artikelnr
JOIN maschinentyp mt ON emb.maschinentyp_id = mt.maschinentyp_id;

-- ============================================================================
-- 6. INITIAL DATA (Master Data)
-- ============================================================================

-- Service Priorities
INSERT INTO service_priority (service_priority_name, service_priority_beschreibung, priority_order) VALUES
('Standard', 'Standard Service Level', 1),
('Premium', 'Premium Service Level mit erweiterten Öffnungszeiten', 2),
('VIP', 'VIP Service Level mit Priority Support', 3);

-- Kritikalität Levels
INSERT INTO kritikalität (kritikalität_name, kritikalität_beschreibung, kritikalität_gewichtung) VALUES
('Niedrig', 'Keine Auswirkung auf Produktion', 1),
('Mittel', 'Einschränkung der Funktionalität', 2),
('Hoch', 'Große Auswirkung auf Produktion', 3),
('Kritisch', 'Produktionsstillstand oder Sicherheitsrisiko', 4);

-- Status
INSERT INTO status (status_name, status_beschreibung, is_terminal) VALUES
('Offen', 'Ticket wurde gerade erstellt', FALSE),
('In Bearbeitung', 'Techniker arbeitet daran', FALSE),
('Warten auf Kunde', 'Wartet auf Kundenfeedback', FALSE),
('Gelöst', 'Problem wurde gelöst, wartet auf Bestätigung', FALSE),
('Geschlossen', 'Ticket ist abgeschlossen', TRUE),
('Storniert', 'Ticket wurde storniert', TRUE);

-- Kategorien (beispielhaft)
INSERT INTO kategorie (kategorie_name, kategorie_beschreibung) VALUES
('Ersatzteil', 'Anfrage bezüglich Ersatzteilen'),
('Technisches Problem', 'Reparatur oder technische Unterstützung'),
('Wartung', 'Routinemäßige Wartung'),
('Anfrage', 'Allgemeine Anfrage oder Beratung');

-- Abteilungen
INSERT INTO abteilung (abteilung_name, abteilung_beschreibung) VALUES
('Geschäftsführung', 'Geschäftsführung'),
('Vertrieb', 'Vertrieb und Verkauf'),
('Service', 'Service und Support'),
('Lager', 'Lager und Logistik'),
('IT', 'Informationstechnologie');

-- Positionen
INSERT INTO position (position_name, abteilung_id, position_beschreibung) VALUES
('Techniker', (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Service'), 'Field Service Techniker'),
('Vertriebsleiter', (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Vertrieb'), 'Verantwortlich für Vertriebsregion'),
('Lagerleiter', (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Lager'), 'Leiter des Lagers'),
('Support Agent', (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Service'), 'Kundenunterstützung per Telefon/Email');

-- Maschinentypen (beispielhaft)
INSERT INTO maschinentyp (maschinentyp_name, maschinentyp_beschreibung) VALUES
('Drehmaschine CNC-1000', 'CNC Drehmaschine Modell 1000'),
('Fräsmaschine VMC-200', 'Vertikale Fräsmaschine VMC-200'),
('Schleifmaschine G-5000', 'Präzisions-Schleifmaschine G-5000'),
('Bohrmaschine DB-150', 'Industrielle Bohrmaschine DB-150');

-- Ersatzteile (beispielhaft)
INSERT INTO ersatzteile (bezeichnung, zusätzliche_bezeichnungen, zusatzinfos) VALUES
('Spindelkugellager SKF 6309', 'Kugellager, Hauptspindel', 'Originalteil für Drehmaschinen'),
('Dichtungsring PTFE 25mm', 'O-Ring, Dichtung', 'Universelles Dichtungselement'),
('Zahnriemen HTD-200', 'Riemen, Antrieb', 'Für Vorschubantrieb'),
('Motorrelais 24V DC', 'Relais, Schaltrelais', 'Elektronisches Schaltrelais'),
('Kolben Hydraulik 40mm', 'Kolben, Hydraulik', 'Für Druckzylinder'),
('LED Anzeigelampe Rot 24V', 'Lampe, Signalisierung', 'Schaltschrankbestückung');

-- Custom Field Definitionen für Kunden (10 Felder)
INSERT INTO custom_field_definitions (custom_field_table_name, custom_field_key, custom_field_label, custom_field_type, custom_field_position) VALUES
('kunden', 'field_1', 'Branche', 'dropdown', 1),
('kunden', 'field_2', 'Kundensegment', 'dropdown', 2),
('kunden', 'field_3', 'Gründungsjahr', 'number', 3),
('kunden', 'field_4', 'Mitarbeiterzahl', 'number', 4),
('kunden', 'field_5', 'Bonität', 'dropdown', 5),
('kunden', 'field_6', 'Besonderheiten', 'textarea', 6),
('kunden', 'field_7', 'ISO-Zertifizierungen', 'text', 7),
('kunden', 'field_8', 'Interne Notizen', 'textarea', 8),
('kunden', 'field_9', 'Vertragsstatus', 'dropdown', 9),
('kunden', 'field_10', 'Weitere Bemerkungen', 'textarea', 10);

-- Custom Field Optionen für Branche
INSERT INTO custom_field_options (custom_field_table_name, custom_field_key, custom_field_option_value, custom_field_option_label, custom_field_option_position) VALUES
('kunden', 'field_1', 'pharma', 'Pharma', 1),
('kunden', 'field_1', 'industrie', 'Industrie/Maschinenbau', 2),
('kunden', 'field_1', 'handel', 'Handel/Logistik', 3),
('kunden', 'field_1', 'automotive', 'Automotive', 4),
('kunden', 'field_1', 'kunststoff', 'Kunststoff/Kunststoffverarbeitung', 5),
('kunden', 'field_1', 'lebensmittel', 'Lebensmittel/Getränke', 6),
('kunden', 'field_1', 'sonstiges', 'Sonstige', 7);

-- Custom Field Optionen für Kundensegment
INSERT INTO custom_field_options (custom_field_table_name, custom_field_key, custom_field_option_value, custom_field_option_label, custom_field_option_position) VALUES
('kunden', 'field_2', 'endkunde', 'Endkunde', 1),
('kunden', 'field_2', 'haendler', 'Händler', 2),
('kunden', 'field_2', 'vertragspartner', 'Vertragspartner', 3),
('kunden', 'field_2', 'government', 'Government/Behörde', 4);

-- ============================================================================
-- 7. TRIGGER FÜR AUTOMATISCHE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kunden_update_timestamp BEFORE UPDATE ON kunden
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER ansprechpartner_update_timestamp BEFORE UPDATE ON ansprechpartner
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER maschine_update_timestamp BEFORE UPDATE ON maschine
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER ersatzteile_update_timestamp BEFORE UPDATE ON ersatzteile
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER ticket_update_timestamp BEFORE UPDATE ON ticket
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 8. VALIDIERUNGS-TRIGGER (Optional, für Datenqualität)
-- ============================================================================

-- Verhindert, dass Ansprechpartner sich selbst als Vertreter hat
CREATE OR REPLACE FUNCTION check_vertretung_not_self()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ansprechpartner_vertretungid = NEW.ansprechpartnerid THEN
    RAISE EXCEPTION 'Ein Ansprechpartner kann sich nicht selbst vertreten';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ansprechpartner_vertretung_check BEFORE INSERT OR UPDATE ON ansprechpartner
  FOR EACH ROW EXECUTE FUNCTION check_vertretung_not_self();

-- ============================================================================
-- 9. BERECHTIGUNGEN FÜR MULTI-USER (Phase 2+)
-- ============================================================================

-- Erstelle Rollen (später mit echten Benutzern füllen)
-- CREATE ROLE technician_role;
-- CREATE ROLE sales_role;
-- CREATE ROLE admin_role;
-- CREATE ROLE customer_role;

-- Beispiel Grants (später aktivieren):
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO technician_role;
-- GRANT SELECT, INSERT, UPDATE ON ticket TO technician_role;
-- GRANT SELECT ON kunden TO technician_role;

-- ============================================================================
-- 10. DATENSCHUTZ (Phase 4+)
-- ============================================================================

-- Audit-Tabelle für GDPR/Compliance
CREATE TABLE IF NOT EXISTS audit_log (
  audit_id SERIAL PRIMARY KEY,
  table_name VARCHAR(255),
  record_id VARCHAR(255),
  operation VARCHAR(10), -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DATABASE READY
-- ============================================================================

COMMIT;

-- Verifizierung
SELECT 'Schema erfolgreich erstellt' as status;
SELECT count(*) as "Tabellen" FROM information_schema.tables WHERE table_schema = 'public';
SELECT count(*) as "Indizes" FROM pg_indexes WHERE schemaname = 'public';
