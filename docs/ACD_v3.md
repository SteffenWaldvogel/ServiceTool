# Architecture Concept Document (ACD) v3.0

**Projekt / Project:** ServiceTool – Service-Ticket-System
**Version:** 3.0 (aktualisiert / updated)
**Datum / Date:** 2026-03-23
**Vorgaenger / Predecessor:** ACD v2.0 FREEMIUM (Supabase + Vercel + Railway)
**Status:** Phase 1 MVP abgeschlossen / Phase 1 MVP complete

---

## 1. Zusammenfassung / Executive Summary

Das ServiceTool ist ein internes Service-Ticket-System fuer einen kleinen Maschinenbau-Betrieb (3-4 Benutzer). Seit dem urspruenglichen ACD v2.0 hat sich die Architektur wesentlich weiterentwickelt: Statt Cloud-Diensten (Supabase, Railway) setzt das Projekt auf eine vollstaendig selbst gehostete Loesung mit lokaler PostgreSQL-Datenbank, eigenem Auth-System und On-Prem-Deployment.

The ServiceTool is an internal service ticket system for a small machinery company (3-4 users). Since the original ACD v2.0, the architecture has evolved significantly: instead of cloud services (Supabase, Railway), the project uses a fully self-hosted solution with local PostgreSQL, custom auth, and on-prem deployment.

**Kosten / Cost:** 0-5 EUR/Monat (nur Domain) / 0-5 EUR/month (domain only)

---

## 2. Vergleich ACD v2 vs. v3 / Comparison ACD v2 vs. v3

| Komponente / Component | ACD v2.0 (geplant / planned) | ACD v3.0 (tatsaechlich / actual) | Grund / Reason |
|---|---|---|---|
| **Datenbank** | Supabase (PostgreSQL) | PostgreSQL 17 (lokal / local) | Keine Verbindungs-/Speicherlimits, volle Kontrolle, Datensouveraenitaet |
| **Auth** | Supabase Auth | DIY bcrypt + express-session + RBAC | RBAC mit 25 Berechtigungen noetig, Session-basiert einfacher fuer internes Tool |
| **Frontend** | React + Vite auf Vercel | React 18 + Vite auf Vercel | Unveraendert / unchanged |
| **Backend** | Express.js auf Railway | Express.js + PM2 + Nginx (lokal) | On-Prem fuer Datensouveraenitaet, keine laufenden Kosten |
| **Email** | Gmail IMAP + SMTP | Gmail IMAP Polling (30s) + SMTP (nodemailer) | Unveraendert / unchanged |
| **Monitoring** | Sentry (optional) | Sentry (optional, nur mit DSN) | Unveraendert / unchanged |
| **CI/CD** | GitHub Actions | GitHub Actions | Unveraendert / unchanged |

---

## 3. Tech-Stack / Technology Stack

| Komponente / Component | Technologie / Technology | Kosten / Cost |
|---|---|---|
| Frontend | React 18 + Vite | 0 EUR |
| Frontend Hosting | Vercel (Free Tier) | 0 EUR |
| Backend | Express.js + PM2 | 0 EUR |
| Backend Hosting | Lokaler Server + Nginx | 0 EUR |
| Datenbank / Database | PostgreSQL 17 (lokal) | 0 EUR |
| Email | Gmail IMAP/SMTP | 0 EUR |
| Auth | DIY bcrypt (cost 12) + express-session + RBAC | 0 EUR |
| Monitoring | Sentry (Free Tier, optional) | 0 EUR |
| CI/CD | GitHub Actions | 0 EUR |
| Security | helmet + express-rate-limit + express-validator | 0 EUR |
| Schriften / Fonts | IBM Plex Sans + IBM Plex Mono (Google Fonts) | 0 EUR |
| Charts | Recharts | 0 EUR |
| **Gesamt / Total** | | **0-5 EUR/Monat** |

---

## 4. Architektur-Uebersicht / Architecture Overview

```
                          +------------------+
                          |   Vercel (CDN)   |
                          |  React 18 + Vite |
                          +--------+---------+
                                   |
                              HTTPS (API Proxy)
                                   |
                          +--------+---------+
                          |      Nginx       |
                          |  Reverse Proxy   |
                          +--------+---------+
                                   |
                          +--------+---------+
                          |   Express.js     |
                          |   (PM2 managed)  |
                          |   Port 3001      |
                          +--------+---------+
                                   |
                    +--------------+--------------+
                    |                             |
           +--------+--------+          +--------+--------+
           |  PostgreSQL 17  |          |  Gmail IMAP/    |
           |  (lokal)        |          |  SMTP           |
           +-----------------+          +-----------------+
```

### 4.1 Frontend-Architektur

- **Framework:** React 18 mit Vite als Build-Tool
- **Routing:** React Router v6 (Client-Side Routing)
- **State:** Lokaler State + Custom Hooks (`useFilter` fuer Filter/Sort/Pagination)
- **UI:** Handgeschriebene Komponenten, kein externes UI-Framework
- **Theme:** Dark Industrial (CSS Custom Properties: bg `#0d1117`, surface `#161b22`, accent `#3b82f6`)
- **Charts:** Recharts fuer Dashboard-Visualisierungen
- **Deployment:** Vercel via GitHub Actions (automatisch bei Push auf `main`)

### 4.2 Backend-Architektur

- **Framework:** Express.js (Port 3001)
- **Prozess-Management:** PM2 (Auto-Restart, Log-Management)
- **Reverse Proxy:** Nginx (SSL-Terminierung, Static Files)
- **Architektur-Stil:** Monolith (angemessen fuer 3-4 Benutzer)
- **Datenbankzugriff:** `pg` Pool mit parametrisierten Queries

### 4.3 Datenbank-Schema

28+ Tabellen, darunter:
- **Kern / Core:** `ticket`, `ticket_messages`, `kunden`, `ansprechpartner`, `maschine`, `maschinentyp`, `ersatzteile`
- **Kontaktdaten:** `kunden_emails`, `kunden_telefonnummern` (Multi-Email/Phone)
- **Referenzdaten / Lookup:** `kategorie`, `kritikalitaet`, `status`, `service_priority`, `abteilung`, `position`
- **Kompatibilitaet:** `ersatzteile_maschinentyp_baujahr`, `ersatzteile_maschinentyp_nummer`
- **Custom Fields:** `custom_field_definitions`, `custom_field_options` + 5 Entity-Tabellen
- **System:** `audit_log` (mit PostgreSQL-Triggers), `users`, `roles`, `permissions`

---

## 5. Sicherheit / Security

| Massnahme / Measure | Implementierung / Implementation |
|---|---|
| SQL Injection | Parametrisierte Queries (`pg` `$1, $2, ...`), keine String-Konkatenation |
| Passwort-Hashing | bcryptjs, Cost Factor 12 |
| Session Management | express-session mit SESSION_SECRET (Pflicht, Server startet nicht ohne) |
| RBAC | 3 Rollen (admin, techniker, readonly), 25 granulare Berechtigungen, Middleware-Factory |
| Rate Limiting | Login: max 10/15min (skipSuccessfulRequests), Global API: max 500/15min |
| Input-Validierung | express-validator + zentrale validate-Middleware auf allen POST/PUT-Routen |
| HTTP-Header | helmet (X-Frame-Options, X-Content-Type-Options, HSTS, etc.) |
| CORS | Origin aus `CORS_ORIGIN` Env-Var, nicht hardkodiert |
| Timing-Attack-Schutz | Bei unbekanntem User trotzdem bcrypt.compare auf Dummy-Hash |
| Fehler-Responses | Keine Stack-Traces in Production (`NODE_ENV=production`) |

---

## 6. Email-Integration

- **Protokoll:** Gmail IMAP Polling (alle 30 Sekunden) + SMTP via nodemailer
- **Matching-Algorithmus:** 4-stufig (Message-ID-Thread, Betreff-Ticket-Nr., Absender-Email, Fuzzy Levenshtein)
- **Unzustellbare Emails:** Posteingang-UI fuer nicht zugeordnete Emails (manuelles Matching)
- **Konfiguration:** `GMAIL_USER` + `GMAIL_APP_PASSWORD` in `.env` (2FA + App-Passwort erforderlich)
- **Anhaenge / Attachments:** Werden empfangen und koennen an Tickets angehaengt werden

---

## 7. Authentifizierung & Autorisierung / Authentication & Authorization

### Rollen / Roles

| Rolle / Role | Beschreibung / Description |
|---|---|
| **admin** | Vollzugriff auf alle Funktionen, Benutzerverwaltung, Stammdaten-Pflege |
| **techniker** | Ticket-Bearbeitung, Kundenverwaltung, eigene Tickets zuweisen |
| **readonly** | Nur Lesen, kein Erstellen/Bearbeiten/Loeschen |

### Berechtigungen / Permissions

25 granulare Berechtigungen, darunter:
- `tickets:create`, `tickets:read`, `tickets:update`, `tickets:delete`, `tickets:assign`, `tickets:bulk`
- `kunden:create`, `kunden:read`, `kunden:update`, `kunden:delete`
- `maschinen:create`, `maschinen:read`, `maschinen:update`, `maschinen:delete`
- `ersatzteile:create`, `ersatzteile:read`, `ersatzteile:update`, `ersatzteile:delete`
- `stammdaten:manage`, `users:manage`, `audit:read`, `email:manage`
- u.a. / etc.

---

## 8. Architektur-Entscheidungen / Architecture Decisions

### 8.1 Lokale PostgreSQL statt Supabase / Local PostgreSQL over Supabase

**Entscheidung:** Eigene PostgreSQL 17 Installation statt Supabase.
**Gruende / Reasons:**
- Keine Verbindungslimits (Supabase Free: 2 Connections, 500MB Speicher)
- Volle Kontrolle ueber Schema, Trigger, Extensions
- Datensouveraenitaet (alle Daten auf eigenem Server)
- Einfachere Backup-Strategie
- Kein Vendor Lock-in

### 8.2 DIY Session Auth statt Supabase Auth / Custom Auth over Supabase Auth

**Entscheidung:** Eigenes Auth-System mit bcrypt + express-session.
**Gruende / Reasons:**
- RBAC mit 25 Berechtigungen ueber Supabase Auth nicht sinnvoll abbildbar
- Session-basiert einfacher fuer internes Tool (kein JWT-Refresh noetig)
- Volle Kontrolle ueber Rollen und Berechtigungen

### 8.3 PM2 + Nginx statt Railway / On-Prem over Railway

**Entscheidung:** Lokales Deployment mit PM2 und Nginx.
**Gruende / Reasons:**
- Datensouveraenitaet (Kundendaten bleiben im Unternehmen)
- Keine laufenden Hosting-Kosten
- Vorhandene Hardware kann genutzt werden
- Volle Kontrolle ueber Updates und Wartungsfenster

### 8.4 Monolith-Architektur / Monolith Architecture

**Entscheidung:** Ein einzelner Express.js-Server fuer alle API-Endpunkte.
**Gruende / Reasons:**
- 3-4 Benutzer, kein Skalierungsbedarf
- Einfacheres Deployment und Debugging
- Weniger operativer Overhead als Microservices

### 8.5 Gmail IMAP Polling

**Entscheidung:** IMAP Polling alle 30 Sekunden statt Webhook/Push.
**Gruende / Reasons:**
- Funktioniert zuverlaessig mit Gmail
- Kein oeffentlicher Endpoint fuer Webhooks noetig
- 4-stufiger Matching-Algorithmus ordnet Emails automatisch zu
- Posteingang-UI als Fallback fuer nicht zugeordnete Emails

### 8.6 Optionales Sentry-Monitoring / Optional Sentry Monitoring

**Entscheidung:** Sentry wird nur aktiviert, wenn `SENTRY_DSN` gesetzt ist.
**Gruende / Reasons:**
- Kein Overhead wenn nicht benoetigt
- Graceful Degradation (System funktioniert ohne Sentry)
- Free Tier ausreichend fuer 3-4 Benutzer

---

## 9. Phasen-Roadmap / Phase Roadmap

### Phase 1: MVP -- ABGESCHLOSSEN / COMPLETE

#### Kern-Features / Core Features

- [x] Ticket CRUD + Nachrichten / Messages
- [x] Email-Integration (IMAP Polling + SMTP)
- [x] Kundenverwaltung (Multi-Email, Multi-Telefon, Ansprechpartner)
- [x] Maschinen + Maschinentypen CRUD
- [x] Ersatzteile + Kompatibilitaet (Baujahr + Nummer)
- [x] Dashboard mit Statistik-Kacheln + Charts (Recharts) + Zeitfilter + Techniker-Verteilung
- [x] Volltextsuche mit Highlighting + Debounce
- [x] CSV-Export
- [x] Dubletten-Erkennung (Levenshtein)
- [x] QuickCreate (Inline-Entity-Erstellung in Dropdowns)
- [x] Freifelder / Custom Fields pro Entity
- [x] Audit-Log mit PostgreSQL-Triggers
- [x] Filter/Sort/Pagination auf allen Listen-Seiten
- [x] Stammdaten-Verwaltung (Admin-CRUD fuer alle Referenzdaten)
- [x] Dark Industrial Theme (CSS Custom Properties)

#### Bonus-Features (ueber ACD v2 Scope hinaus / beyond original ACD scope)

- [x] RBAC (3 Rollen, 25 Berechtigungen, Middleware-Factory)
- [x] SLA-Tracking (response_time_h auf service_priority)
- [x] Bulk-Aktionen (Multi-Select + Status/Zuweisung aendern)
- [x] Ticket-Zuweisung an Techniker
- [x] Ticket-Verknuepfung + Zusammenfuehrung / Linking + Merging
- [x] CSV/Excel-Import
- [x] Posteingang (UI fuer nicht zugeordnete Emails)
- [x] Sentry Error Monitoring
- [x] Email-Anhaenge / Attachments

### Phase 2: Erweiterungen / Extensions (geplant / planned)

- [ ] Claude AI Integration (Auto-Kategorisierung, Antwort-Vorschlaege / auto-categorize, suggest responses)
- [ ] Erweiterte Reports (Trend-Berichte, SLA-Compliance / trend reports, SLA compliance)
- [ ] Mobile Responsive CSS
- [ ] Kunden-Self-Service-Portal / Customer self-service portal

---

## 10. Deployment / Betrieb

### Entwicklung / Development

```bash
# Root-Verzeichnis
npm run dev:backend    # Express.js mit nodemon (Port 3001)
npm run dev:frontend   # Vite Dev Server (Port 5173, Proxy -> 3001)
```

### Produktion / Production

```
Frontend:  Vercel (automatisch via GitHub Actions bei Push auf main)
Backend:   PM2 + Nginx auf lokalem Server
Datenbank: PostgreSQL 17 auf lokalem Server
```

### CI/CD Pipeline (GitHub Actions)

1. Install Backend + Frontend Dependencies
2. Build Frontend
3. Smoke-Test Backend Startup
4. (auf main) Deploy Frontend zu Vercel

### Umgebungsvariablen / Environment Variables

| Variable | Beschreibung / Description |
|---|---|
| `DATABASE_URL` | PostgreSQL Connection String |
| `SESSION_SECRET` | Express-Session Secret (Pflicht / required) |
| `GMAIL_USER` | Gmail-Adresse fuer IMAP/SMTP |
| `GMAIL_APP_PASSWORD` | Gmail App-Passwort |
| `CORS_ORIGIN` | Erlaubte Frontend-Origin |
| `SENTRY_DSN` | Sentry DSN (optional) |
| `NODE_ENV` | `development` oder `production` |

---

## 11. API-Endpunkte / API Endpoints (Uebersicht / Overview)

| Ressource / Resource | Endpunkte / Endpoints | Methoden / Methods |
|---|---|---|
| Tickets | `/api/tickets`, `/api/tickets/:id`, `/api/tickets/:id/messages` | GET, POST, PUT, DELETE |
| Kunden | `/api/kunden`, `/api/kunden/:id`, `/api/kunden/:id/tickets` | GET, POST, PUT, DELETE |
| Ansprechpartner | `/api/ansprechpartner`, `/api/ansprechpartner/:id` | GET, POST, PUT, DELETE |
| Maschinen | `/api/maschinen`, `/api/maschinen/:id`, `/api/maschinen/:id/tickets` | GET, POST, PUT, DELETE |
| Maschinentypen | `/api/maschinentypen`, `/api/maschinentypen/:id` | GET, POST, PUT, DELETE |
| Ersatzteile | `/api/ersatzteile`, `/api/ersatzteile/:id`, `/api/ersatzteile/:id/kompatibilitaet-*` | GET, POST, PUT, DELETE |
| Lookup | `/api/lookup/*` | GET |
| Stammdaten | `/api/stammdaten/*` | GET, POST, PUT, DELETE |
| Custom Fields | `/api/custom-fields/*` | GET, POST, PUT, DELETE |
| System | `/api/system/audit-log` | GET |

Alle Listen-Endpunkte unterstuetzen Filter, Sortierung und Pagination und geben `{ data, total }` zurueck.
All list endpoints support filtering, sorting, and pagination, returning `{ data, total }`.

---

*Dieses Dokument ersetzt das ACD v2.0 FREEMIUM und spiegelt den tatsaechlichen Stand des Projekts wider.*
*This document supersedes ACD v2.0 FREEMIUM and reflects the actual current state of the project.*
