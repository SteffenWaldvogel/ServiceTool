-- ============================================================================
-- SEED DATA – Service Tool
-- Kann jederzeit erneut ausgeführt werden (ON CONFLICT DO NOTHING)
-- Ausnahme: TRUNCATE-Blöcke ersetzen Daten vollständig
-- ============================================================================

-- ── 1. ABTEILUNGEN ───────────────────────────────────────────────────────────
TRUNCATE abteilung CASCADE;

INSERT INTO abteilung (abteilung_name, abteilung_beschreibung) VALUES
('Einkauf',               'Einkauf und Beschaffung'),
('Verkauf',               'Verkauf und Auftragsabwicklung'),
('Vertrieb',              'Vertrieb und Kundenakquise'),
('Logistik',              'Lager, Versand und Logistik'),
('Finanzen',              'Finanzwesen und Controlling'),
('Mahnwesen',             'Mahnwesen und Forderungsmanagement'),
('Buchhaltung',           'Buchhaltung und Rechnungswesen'),
('Marketing',             'Marketing und Kommunikation'),
('Sachbearbeiter',        'Allgemeine Sachbearbeitung'),
('QS/QN',                 'Qualitätssicherung und Qualitätsmanagement'),
('Service/Instandhaltung','Service, Wartung und Instandhaltung');


-- ── 2. POSITIONEN (Standard pro Abteilung) ───────────────────────────────────
INSERT INTO position (position_name, abteilung_id, position_beschreibung)
SELECT 'Leiter', abteilung_id, 'Abteilungsleiter'
FROM abteilung
ON CONFLICT DO NOTHING;

INSERT INTO position (position_name, abteilung_id, position_beschreibung)
SELECT 'Mitarbeiter', abteilung_id, 'Mitarbeiter'
FROM abteilung
ON CONFLICT DO NOTHING;

INSERT INTO position (position_name, abteilung_id, position_beschreibung)
VALUES
('Servicetechniker', (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Service/Instandhaltung'), 'Außendienst Servicetechniker'),
('Innendienst',      (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Service/Instandhaltung'), 'Innendienst Service'),
('Außendienst',      (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Vertrieb'),               'Außendienstmitarbeiter Vertrieb'),
('Prüfer',           (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'QS/QN'),                  'Qualitätsprüfer'),
('Buchhalter',       (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Buchhaltung'),             'Buchhalter'),
('Sachbearbeiter',   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Sachbearbeiter'),          'Allgemeiner Sachbearbeiter')
ON CONFLICT DO NOTHING;

-- Spezialpositionen
INSERT INTO position (position_name, abteilung_id, position_beschreibung)
VALUES
  ('Servicetechniker Außendienst',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Service/Instandhaltung'),
   'Außendienst-Servicetechniker für Vor-Ort-Einsätze'),
  ('Servicetechniker Innendienst',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Service/Instandhaltung'),
   'Innendienst Service und Telefon-Support'),
  ('Außendienstmitarbeiter',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Vertrieb'),
   'Vertrieb Außendienst'),
  ('Key Account Manager',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Vertrieb'),
   'Betreuung von Schlüsselkunden'),
  ('Verkaufsinnendienst',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Verkauf'),
   'Auftragsbearbeitung und Angebotserstellung'),
  ('Einkäufer',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Einkauf'),
   'Beschaffung und Lieferantenmanagement'),
  ('Qualitätsprüfer',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'QS/QN'),
   'Qualitätssicherung und Prüfung'),
  ('QM-Beauftragter',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'QS/QN'),
   'Qualitätsmanagement-Beauftragter'),
  ('Buchhalter',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Buchhaltung'),
   'Finanzbuchhaltung'),
  ('Lagerist',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Logistik'),
   'Lagerverwaltung und Kommissionierung'),
  ('Logistikkoordinator',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Logistik'),
   'Versand- und Logistikkoordination'),
  ('Sachbearbeiter',
   (SELECT abteilung_id FROM abteilung WHERE abteilung_name = 'Sachbearbeiter'),
   'Allgemeine Sachbearbeitung')
ON CONFLICT (position_name, abteilung_id) DO NOTHING;


-- ── 3. KATEGORIEN ────────────────────────────────────────────────────────────
TRUNCATE kategorie CASCADE;

INSERT INTO kategorie (kategorie_name, kategorie_beschreibung) VALUES
('Ersatzteil · Level 1',
 'Direkt lösbar. Alle Informationen vorhanden um das benötigte Ersatzteil eindeutig zu identifizieren und bereitzustellen (z.B. Artikelnummer, Zeichnungsnummer, Maschinendaten: Maschinennummer, Type, Baujahr PFLICHT, Bilder). Keine Rückfragen oder fachliche Klärung notwendig.'),
('Ersatzteil · Level 2',
 'Klärung notwendig. Informationen sind unvollständig oder unklar. Rückfragen beim Kunden oder interne Klärung erforderlich (z.B. Elektromontage / Endmontage), um das richtige Ersatzteil zu identifizieren.'),
('Ersatzteil · Level 3',
 'Ersatzteil als Ergebnis technischer Bewertung. Das benötigte Ersatzteil ergibt sich erst aus einer technischen Analyse (z.B. bei Fehlerursachenanalyse eines technischen Problems). Einbindung von Elektromontage oder Endmontage erforderlich.'),
('Ersatzteil · Level 4',
 'Ersatzteil ist nach technischer Analyse nicht mehr vorhanden. Alternativen werden gesucht bzw. angeboten und Lösungen werden dokumentiert/neu aufgenommen.'),
('Technisches Problem · Level 1',
 'Direkt lösbar (remote). Alle Informationen vorhanden um das Problem direkt mit dem Kunden remote zu lösen. Maschinen- oder Serviceanleitung liegt vor und ist für den konkreten Fall ausreichend.'),
('Technisches Problem · Level 2',
 'Analyse / Klärung notwendig. Problem kann nicht direkt gelöst werden, da Informationen fehlen oder der Fehler nicht eindeutig reproduzierbar ist. Rückfragen beim Kunden und/oder erste technische Analyse notwendig. Remote-Lösung noch nicht ausgeschlossen.'),
('Technisches Problem · Level 3',
 'Technisch lösbar (remote). Problem erfordert fachliche Expertise, ist aber ohne Vor-Ort-Einsatz lösbar. Lösung erfolgt über Serviceanleitung, Expertenwissen oder direkte Kommunikation mit dem Kunden. Ersatzteil kann Bestandteil der Lösung sein, Einbau erfolgt durch Kunden.'),
('Technisches Problem · Level 4',
 'Vor-Ort-Service erforderlich. Problem ist remote nicht lösbar. Physischer Eingriff an der Maschine notwendig. Serviceeinsatz durch Händler-Techniker oder eigene Techniker, abhängig von Dringlichkeit und Kritikalität.');


-- ── 4. KRITIKALITÄT ──────────────────────────────────────────────────────────
TRUNCATE kritikalität CASCADE;

INSERT INTO kritikalität (kritikalität_name, kritikalität_beschreibung, kritikalität_gewichtung) VALUES
('Low',
 'Kein akuter Schaden. Aber erhöhter Beobachtungsbedarf. Fall sollte nicht liegen bleiben. Auslöser: Kunde meldet sich erneut / Verzögerung durch Rückfragen / Unklare Situation mit möglichem Folgeproblem. Auswirkungen: Sichtbarer Marker im Ticket, bevorzugte Bearbeitung innerhalb der normalen Queue, aktive Rückmeldung (keine Funkstille).',
 1),
('Medium',
 'Betrieb eingeschränkt. Zeitdruck vorhanden. Kunde kann nur eingeschränkt arbeiten. Auslöser: Teilweiser Maschinenausfall / Wiederholte Fehlerversuche / Fehlerhafte Lieferung oder unzureichende Ersthilfe. Auswirkungen: Klare Priorisierung, Zuweisung an erfahrenere Mitarbeiter, verkürzte Reaktionszeiten, engere interne Abstimmung.',
 2),
('High',
 'Vollständiger Maschinenausfall. Produktionsstillstand oder Sicherheitsrisiko. Sicherheitsrelevanter Fall. Akute Eskalation. Auslöser: Sicherheitsrelevante oder direkte Auswirkung / Eskalation auf Management-Ebene. Auswirkungen: Sofortige Bearbeitung, höchste Priorität, direkte Eskalation, ggf. sofortige Entscheidung für Serviceeinsatz.',
 3);


-- ── 5. STATUS ────────────────────────────────────────────────────────────────
TRUNCATE status CASCADE;

INSERT INTO status (status_name, status_beschreibung, is_terminal) VALUES
('Offen',            'Ticket wurde erstellt, noch nicht bearbeitet.',         FALSE),
('In Bearbeitung',   'Techniker/Sachbearbeiter arbeitet aktiv daran.',         FALSE),
('Warten auf Kunde', 'Rückfrage gestellt, wartet auf Kundenantwort.',          FALSE),
('Warten auf Teile', 'Ersatzteil bestellt, wartet auf Lieferung.',             FALSE),
('Eskaliert',        'An erfahreneren Mitarbeiter oder Management übergeben.', FALSE),
('Vor-Ort geplant',  'Serviceeinsatz vor Ort wurde terminiert.',               FALSE),
('Gelöst',           'Problem wurde gelöst, wartet auf Kundenbestätigung.',    FALSE),
('Geschlossen',      'Ticket vollständig abgeschlossen und bestätigt.',        TRUE),
('Storniert',        'Ticket wurde storniert (Duplikat oder hinfällig).',      TRUE);


-- ── 6. SERVICE PRIORITY ──────────────────────────────────────────────────────
INSERT INTO service_priority (service_priority_name, service_priority_beschreibung, priority_order)
VALUES
('Standard', 'Standard Service Level',                               1),
('Premium',  'Premium Service Level mit erweiterten Reaktionszeiten', 2),
('VIP',      'VIP Service Level mit Priority Support und Eskalation', 3)
ON CONFLICT DO NOTHING;
