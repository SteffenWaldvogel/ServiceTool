# Changelog

All notable changes to the Service Tool project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [UNRELEASED]

### Added (Session 7)
- RBAC: Tabellen roles, permissions, role_permissions (Migration 006)
- 3 System-Rollen: admin (25 Rechte), techniker (15 Rechte), readonly (6 Rechte)
- 25 granulare Permissions in 6 Kategorien (Tickets, Kunden, Maschinen, Ersatzteile, Ansprechpartner, Verwaltung)
- requirePermission(permName) Middleware-Factory
- Login lädt Permissions in Session (Array von permission.name strings)
- Admin-User mit sicherem bcrypt-Passwort (cost 12), kein Klartext im Code
- Passwortlänge Minimum auf 8 Zeichen angehoben
- users.js: role_id (FK) statt role VARCHAR
- stammdaten.js: RBAC-Admin-Routen (roles CRUD, permissions, role-permissions)
- AuthContext: hasPermission(perm) Helper, Admin-Shortcut
- App.jsx: Sidebar-Guards via hasPermission statt role === 'admin'
- BenutzerPage: dynamische Rollen-Dropdown (aus API)
- StammdatenPage: neuer Tab "Rollen & Rechte" mit Checkbox-Grid pro Rolle
- api.js: getRoles, createRole, updateRole, deleteRole, getPermissions, updateRolePermissions

### Added (Session 6)
- Lokale Fonts: @fontsource/ibm-plex-sans + ibm-plex-mono (offline-fähig)
- DB-Indizes für ticket, ticket_messages, ansprechpartner (Migration 004)
- users-Tabelle + user_sessions (Migration 005)
- Authentifizierung: express-session + bcryptjs (Login/Logout/Me/Change-Password)
- Auth-Middleware: requireAuth + requireAdmin
- Geschützte Routen: alle /api/* außer /api/auth
- Admin-only: /api/stammdaten, /api/system, /api/custom-fields, /api/users
- LoginPage mit Show/Hide Passwort
- AuthContext (React Context für user + login + logout)
- App.jsx: Auth-Guard (LoginPage wenn nicht eingeloggt)
- Sidebar: User-Footer mit Logout + Passwort-ändern Button
- Sidebar: Stammdaten/System/Benutzer nur für Admin sichtbar
- BenutzerPage: Admin-CRUD für Benutzer
- Teil A: Polling-Backoff (60s→300s bei Fehler, pausiert wenn Tab versteckt)
- Teil A: FilterBar Debouncing 300ms für Text/Zahl-Inputs
- Teil A: React.memo für FilterBar, SortableHeader, MessageThread
- Teil A: dashboard-stats Queries parallel (Promise.all)

### Added (Session 5)
- emailService.js: Schema-Fix (ticketnr statt id, Fehlspalten entfernt)
- emailService.js: addMessageToTicket() vollständig implementiert
- emailService.js: sendTicketReply() mit Nachrichtenspeicherung
- Email-Matching: 4-stufiger Algorithmus (Betreff-Regex → Kunden-Match → unmatched)
- backend/migrations/003_unmatched_emails.sql
- ticket_messages: is_internal-Spalte (ALTER TABLE)
- POST /api/tickets/:id/reply
- POST /api/tickets/:id/link-message
- GET /api/tickets/unmatched + POST /api/tickets/unmatched/:id/assign
- dashboard-stats: unread_messages + unmatched_emails
- MessageThread.jsx (chronologischer Thread, 3 Nachrichtentypen + interne Notizen, Verschieben-Button)
- ReplyBox.jsx (Email-Reply + interne Notizen, localStorage Techniker-Name)
- UnmatchedEmailsPanel.jsx (manuelle Ticket-Zuweisung)
- TicketDetail.jsx: Kommunikationsbereich mit Thread + Reply + Nachricht verschieben (MoveMessageModal)
- SystemPage: Tab "Ungematchte Emails" mit Badge
- App.jsx: Sidebar-Badge für ungelesene Nachrichten + ungematchte Emails (60s Polling)
- api.js: getMessages, addMessage, sendReply, linkMessage, getUnmatchedEmails, assignUnmatchedEmail, getStats

### Added (Session 4)
- **KundenDetail**: Inline-Form für Ansprechpartner – ausklappbares Form mit QuickCreate für Abteilung/Position und DuplicateWarning-Integration
- **KundenDetail**: Inline-Form für Maschinen – Anlegen direkt in KundenDetail mit QuickCreate Maschinentyp, Dubletten-Check, "Sofort Ticket erstellen" Checkbox
- **KundenDetail**: Maschinen-Tabelle navigiert zu `/maschinen/:id` (Pfeil-Link + klickbare Zeile)
- **MaschinenDetail**: Tabs "Stammdaten" und "Ticket-Historie" – vollständige Tabelle mit Kategorie-Badge, Kritikalität, Status, Datum
- **Filter/Sort/Pagination für KundenList**: FilterBar (Suche, PLZ, Service-Priority), SortableHeader, Paginierung 25/50/100
- **Filter/Sort/Pagination für AnsprechpartnerList**: FilterBar (Name, E-Mail, Abteilung), SortableHeader, Paginierung
- **Filter/Sort/Pagination für MaschinenList**: FilterBar (Maschinennr., Typ, Baujahr von/bis), SortableHeader, Paginierung
- **Filter/Sort/Pagination für ErsatzteileList**: FilterBar (Bezeichnung, Artikelnr., Typ-Filter), SortableHeader, Paginierung
- **FilterBar**: type `number` ergänzt (numerische Filter-Inputs)
- **queryBuilder**: `gte`, `lte`, `boolean_null` Filter-Typen ergänzt
- **Backend kunden.js GET /**: queryBuilder, JOINs für service_priority + ticket_count Subquery, Response `{ data, total }`
- **Backend ansprechpartner.js GET /**: queryBuilder, Response `{ data, total }`
- **Backend maschinen.js GET /**: queryBuilder mit Baujahr-Bereichsfilter, Response `{ data, total }`
- **Backend ersatzteile.js GET /**: queryBuilder mit boolean_null für Baugruppen-Filter, Response `{ data, total }`
- **Backend ersatzteile.js**: GET-Endpoints für kompatibilitaet-baujahr und kompatibilitaet-nummer (mit maschinentyp_name JOIN)
- **Backend tickets.js**: Filter `ticket_maschinenid` ergänzt
- **Backend maschinen.js GET /:id/tickets**: kategorie_name über JOIN ergänzt
- **seed.sql**: Spezialpositionen für Service/Vertrieb/QS/Buchhaltung/Logistik ergänzt
- **CLAUDE.md**: Project Structure und API Endpoints vollständig aktualisiert

### Changed (Session 4)
- KundenList: von einfacher Suche zu vollständigem Filter/Sort/Pagination umgestellt
- AnsprechpartnerList: von einfacher Suche zu Filter/Sort/Pagination umgestellt
- MaschinenList: von einfachen Filtern zu FilterBar + SortableHeader + Pagination umgestellt
- ErsatzteileList: von einfachen Filtern zu FilterBar + SortableHeader + Pagination umgestellt
- MaschinenDetail: Ticket-Sidebar zu Tab "Ticket-Historie" mit vollständiger Tabelle erweitert
- Alle List-APIs geben jetzt `{ data, total }` zurück (Frontend behandelt beide Formate rückwärtskompatibel)

### Added
- GitHub Actions CI/CD workflow (`.github/workflows/ci.yml`) – lint, build, smoke-test on push to main/develop
- Git-Sync Scripts (`scripts/git-sync.sh` + `scripts/git-sync.ps1`) – one-command add/commit/push
- `QuickCreate` component (`frontend/src/components/QuickCreate.jsx`) – searchable dropdown with inline "Neu anlegen" mini-modal; after creation the new item is auto-selected
- `DuplicateWarning` component (`frontend/src/components/DuplicateWarning.jsx`) – score bar, reason badges, confirm-checkbox before allowing duplicate creation
- Duplicate detection: `backend/src/services/matchingService.js` with Levenshtein distance scoring for Kunden, Ansprechpartner and Maschinen
- Match API endpoints: `POST /api/kunden/match`, `POST /api/ansprechpartner/match`, `POST /api/maschinen/match`
- `useFilter` hook (`frontend/src/hooks/useFilter.js`) – unified filter/sort/pagination state management
- `FilterBar` component (`frontend/src/components/FilterBar.jsx`) – primary + advanced filter rows, active-filter chips, clear button
- `SortableHeader` component (`frontend/src/components/SortableHeader.jsx`) – sortable table column headers with direction indicator
- Advanced filter + sort + pagination for TicketList (sort by Ticket-Nr., Kunde, Kritikalität, Status, Erstellt; page sizes 25/50/100)
- `queryBuilder` utility (`backend/src/utils/queryBuilder.js`) – flexible PostgreSQL WHERE/ORDER BY builder supporting in, exact, ilike, date_from, date_to, boolean filter types
- `backend/src/config/seed.sql` – Stammdaten-Seed-Datei (idempotent ausführbar)
- `frontend/src/utils/helpers.js` – Zentrale Hilfsfunktionen: `getKritColor()`, `parseKategorie()`
- PostgreSQL Audit-Log-Trigger für 7 Tabellen: `ticket`, `kunden`, `ansprechpartner`, `maschine`, `ersatzteile`, `status`, `kategorie` — jede Änderung wird automatisch in `audit_log` gespeichert
- Ansprechpartner-Zeilen in KundenDetail navigieren jetzt zur `/ansprechpartner/:id`-Detailseite

### Changed
- Stammdaten: 11 Unternehmensabteilungen (ersetzt alte 5)
- Stammdaten: Kategorien als Ersatzteil/Tech. Problem Level 1–4 System (8 Einträge)
- Stammdaten: Kritikalität Low / Medium / High mit Gewichtung 1–3 (ersetzt 4-stufiges Schema)
- Stammdaten: Status-Workflow auf 9 Stufen erweitert (inkl. Eskaliert, Vor-Ort geplant, Warten auf Teile)
- Frontend: Kritikalitäts-Farbmapping Low=grün / Medium=gelb / High=rot (zentral in helpers.js)
- Frontend: Kategorie-Kompaktanzeige in TicketList (Badge "Ersatzteil" + "L2")
- Frontend: Alle Komponenten nutzen jetzt `getKritColor` aus helpers.js

### Fixed
- Edit/Delete-Buttons in Ansprechpartner-Tabelle (KundenDetail) verhindern jetzt Row-Navigation via `stopPropagation`

### Removed
- Veraltete Dateien entfernt: `database_new/`, `migration_v2.sql`, `DATABASE_FILES_OVERVIEW.md`, `dbdiagram_schema.dbml`, `database_schema(1).sql`, `prompt.txt`

---

## [2.1.0] – 2026-03-18

### Added

#### Backend
- `backend/src/routes/stammdaten.js` – Full CRUD for all reference/master-data tables:
  - `GET/POST/PUT/:id/DELETE/:id` for: `service_priority`, `abteilungen`, `positionen`, `kategorien`, `kritikalitaet`, `status`
  - 409 Conflict responses when records are referenced by other tables (FK violations)
  - Unique-constraint error handling with descriptive messages
- `backend/src/routes/system.js` – Read-only audit log endpoint:
  - `GET /api/system/audit-log` with filter params: `table_name`, `operation`, `changed_by`, `from`, `to`, `limit`
  - Gracefully returns empty array when `audit_log` table has no data or triggers are not active
- `backend/src/routes/customFieldsAdmin.js` – Admin CRUD for custom field meta-data:
  - `GET/POST/PUT/DELETE` for `custom_field_definitions` (per table/key composite PK)
  - `GET/POST/PUT/DELETE` for `custom_field_options` (per table/key/value composite PK)
  - ON DELETE CASCADE from definitions to options handled at DB level
- `backend/src/routes/ansprechpartner.js` – Standalone ansprechpartner routes:
  - `GET /api/ansprechpartner` – list all, filterable by `kunden_id` and `search`
  - `GET /api/ansprechpartner/:id` – detail with joined abteilung, position, kunde, vertretung names
  - `POST /api/ansprechpartner` – create with full validation
  - `PUT /api/ansprechpartner/:id` – update (COALESCE pattern, preserves unset fields)
  - `DELETE /api/ansprechpartner/:id` – with 409 if referenced by tickets
- `backend/src/server.js` – Registered four new route modules

#### Frontend
- `frontend/src/pages/StammdatenPage.jsx` – Tabbed admin UI for all reference tables:
  - Tabs: Service-Prioritäten, Abteilungen, Positionen, Kategorien, Kritikalität, Status, Maschinentypen, Freifelder
  - Inline edit modal and delete with confirmation for each tab
  - Kritikalität tab shows colored Gewichtung badge
  - Status tab shows Terminal/Offen badge with toggle
  - Freifelder tab: grouped by entity, add/delete definitions, manage dropdown options via sub-modal
- `frontend/src/pages/SystemPage.jsx` – Read-only audit log viewer:
  - Filter bar: table_name (known tables dropdown), operation, changed_by, from/to dates, limit
  - Expandable JSON columns for old_values / new_values
  - Operation badges (INSERT=green, UPDATE=amber, DELETE=red)
  - Graceful empty state with explanation
- `frontend/src/pages/AnsprechpartnerList.jsx` – Standalone ansprechpartner list:
  - Search by name/email, filter by customer
  - Clickable customer link, navigate to detail on row click
  - Create modal with customer/abteilung/position dropdowns
- `frontend/src/pages/AnsprechpartnerDetail.jsx` – Ansprechpartner detail page:
  - All fields inline-editable (name, email, telefon, abteilung, position, vertretung)
  - Customer card with link to KundenDetail
  - Abteilung change resets position and reloads position options
  - Delete with confirmation, returns to list
- `frontend/src/utils/api.js` – Added API methods:
  - Stammdaten CRUD: `getServicePrioritiesAdmin`, `createServicePriority`, `updateServicePriority`, `deleteServicePriority`
  - Same pattern for abteilungen, positionen, kategorien, kritikalitaet, status
  - Ansprechpartner standalone: `getAnsprechpartner`, `getAnsprechpartnerById`, `createAnsprechpartnerStandalone`, `updateAnsprechpartnerStandalone`, `deleteAnsprechpartnerStandalone`
  - System: `getAuditLog`
  - Custom fields admin: `getCustomFieldDefinitions`, `createCustomFieldDefinition`, `updateCustomFieldDefinition`, `deleteCustomFieldDefinition`, `getCustomFieldOptions`, `createCustomFieldOption`, `updateCustomFieldOption`, `deleteCustomFieldOption`
- `frontend/src/App.jsx` – Updated routing and sidebar:
  - Routes added: `/ansprechpartner`, `/ansprechpartner/:id`, `/stammdaten`, `/system`
  - Sidebar restructured: ÜBERSICHT / SERVICE / STAMM / VERWALTUNG sections
  - New nav icons for Ansprechpartner, Stammdaten, System

#### Docs
- `docs/DB_COVERAGE.md` – Table-by-table UI and API route coverage documentation
- `CHANGELOG.md` – This file
- `DEVLOG.md` – Development session log

---

## [2.0.0] – initial build

### Added

#### Backend
- Express.js server on port 3001 with CORS for Vite dev server
- PostgreSQL connection pool via `pg`
- `routes/tickets.js` – full ticket CRUD + messages + custom fields
- `routes/kunden.js` – full kunden CRUD + emails/telefon transaction + ansprechpartner nested + custom fields
- `routes/maschinen.js` – global machine CRUD + custom fields
- `routes/maschinentypen.js` – maschinentyp CRUD
- `routes/ersatzteile.js` – spare parts CRUD + kompatibilität-baujahr/nummer + custom fields
- `routes/lookup.js` – read-only dropdowns (status, kategorien, kritikalitaeten, maschinentypen, service-priorities, abteilungen, positionen) + dashboard-stats
- `services/emailService.js` – Gmail IMAP polling + SMTP via nodemailer

#### Frontend
- React 18 + Vite on port 5173
- React Router v6 with sidebar layout
- Dark industrial theme (IBM Plex Sans/Mono, CSS custom properties)
- Pages: Dashboard, TicketList, TicketDetail, KundenList, KundenDetail, MaschinenList, MaschinenDetail, ErsatzteileList, ErsatzteileDetail
- `CustomFieldsSection` component used in all detail pages
- `utils/api.js` – fetch wrapper for all API endpoints

#### Database
- Full PostgreSQL schema (`database_schema.sql`) with BCNF/4NF normalization
- Master data: service_priority, abteilung, position, kategorie, kritikalität, status, maschinentyp
- Core tables: kunden, kunden_emails, kunden_telefonnummern, ansprechpartner, maschine, ersatzteile, ticket, ticket_messages
- Custom fields: definitions, options, and 5 entity value tables
- Audit log table
- Views: v_kunden_mit_kontakt, v_tickets_mit_details, v_ersatzteile_kompatibilität
- Triggers: auto-timestamps, vertretung self-reference guard
- Seed data for all reference tables
