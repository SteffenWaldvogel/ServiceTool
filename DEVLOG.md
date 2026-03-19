# Development Log

Chronological log of development sessions for the Service Tool project.

---

## Session 13 – 2026-03-19
**Ziel:** Volltextsuche – alle relevanten Felder + Highlight + Debounce
**Scope:** tickets.js, TicketList.jsx

### Tasks
- ✅ tickets.js: Suche erweitert auf ticket_messages (EXISTS), maschinennr, ansprechpartner_name
- ✅ tickets.js: COUNT-Query ergänzt um LEFT JOIN maschine + ansprechpartner
- ✅ TicketList.jsx: highlight()-Funktion (Regex, gelbe Mark)
- ✅ TicketList.jsx: Debounce 300ms via useEffect + debouncedSearch-State
- ✅ TicketList.jsx: Ticket-Nr., Betreff, Kundenname mit Highlight

---

## Session 12 – 2026-03-19
**Ziel:** Deployment-Setup (PM2 + Nginx + Backup + CI/CD)
**Scope:** ecosystem.config.js, nginx/, scripts/, docs/, .github/workflows/ci.yml

### Tasks
- ✅ ecosystem.config.js: PM2-Konfiguration (autorestart, logs, production env)
- ✅ nginx/nginx.conf: Reverse Proxy /api/ → :3001, SPA-Fallback, HTTPS-Vorlage
- ✅ scripts/backup.ps1: pg_dump + gzip + Cleanup alter Backups
- ✅ scripts/deploy.ps1: npm ci + npm run build + pm2 reload in einem Schritt
- ✅ .github/workflows/ci.yml: Artefakt-Upload, Smoke-Test mit korrekten Env-Vars
- ✅ docs/DEPLOYMENT.md: vollständige Setup-Anleitung (DB, PM2, Nginx, Backup, HTTPS)
- ✅ .gitignore: logs/, backups/, frontend/dist/ ergänzt

---

## Session 11 – 2026-03-18
**Ziel:** Dashboard-Erweiterungen (Zeitfilter, Techniker-Chart, neue Stat-Tiles)
**Scope:** lookup.js, api.js, Dashboard.jsx

### Tasks
- ✅ lookup.js: period-Filter (?period=week|month|all) in dashboard-stats
- ✅ lookup.js: technikerVerteilung-Query (offene Tickets pro Techniker, TOP 10)
- ✅ lookup.js: avg_loesungszeit_h + diese_woche in ticketStats-Query
- ✅ api.js: getDashboardStats(period = 'all') mit optionalem period-Param
- ✅ Dashboard.jsx: period-State + PERIODS-Array + Filter-Buttons im Page-Header
- ✅ Dashboard.jsx: neue Stat-Tiles (Diese Woche, Ø Lösungszeit)
- ✅ Dashboard.jsx: horizontales Balkendiagramm „Offene Tickets pro Techniker"

---

## Session 9 – 2026-03-18
**Ziel:** Ticket-Zuweisung an Techniker
**Scope:** Migration 007, tickets.js, lookup.js, TicketDetail, TicketList, Dashboard

### Tasks
- ✅ Migration 007: assigned_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL
- ✅ tickets.js: TICKET_SELECT + JOIN users + assigned_to in FILTERS/SORTS/POST/PUT
- ✅ lookup.js: GET /api/lookup/users (aktive User für Dropdown)
- ✅ api.js: getLookupUsers()
- ✅ TicketDetail.jsx: "Zugewiesen an" EditField (Dropdown + nullable) + Meta-Anzeige
- ✅ TicketList.jsx: Spalte "Zugewiesen" + "Meine Tickets"-Toggle (filtered auf user_id)
- ✅ Dashboard.jsx: "Meine offenen Tickets"-Tile via separatem API-Call

---

## Session 8 – 2026-03-18
**Ziel:** Produktionssicherheit & Hardening
**Scope:** Helmet, Rate-Limiting, Input-Validierung, Timing-Attack-Schutz, SQL-Audit, Env-Härtung

### Tasks
- ✅ Pakete installiert: helmet, express-rate-limit, express-validator
- ✅ SESSION_SECRET generiert (64 Zeichen) + in .env geschrieben
- ✅ CORS_ORIGIN + NODE_ENV in .env + .env.example
- ✅ server.js: Startup-Validierung (exit 1 wenn SESSION_SECRET/DB_PASSWORD fehlt)
- ✅ server.js: Helmet (HTTP Security Headers, CSP disabled)
- ✅ server.js: CORS aus .env
- ✅ server.js: Payload-Limit 1MB
- ✅ server.js: Globales Rate-Limit 500/15min
- ✅ server.js: Session-Cookie sameSite + secure in Production
- ✅ server.js: Error-Handler ohne Stack-Trace in Production
- ✅ middleware/validate.js erstellt (zentraler validationResult-Check)
- ✅ routes/auth.js: Login Rate-Limit 10/15min + Input-Validierung + Timing-Attack-Schutz
- ✅ routes/users.js: Input-Validierung mit express-validator
- ✅ middleware/auth.js: Session-Vollständigkeitsprüfung (user_id + username)
- ✅ config/database.js: connectionTimeoutMillis 5000ms
- ✅ .gitignore: prompt.txt hinzugefügt
- ✅ SQL-Injection-Audit: alle Routes geprüft, queryBuilder sicher (Whitelist-Sorting)
- ✅ CLAUDE.md: Security-Konventionen dokumentiert

---

## Session 7 – 2026-03-18
**Ziel:** Granulare Benutzer- & Rechteverwaltung (RBAC)
**Scope:** Migration 006, roles/permissions/role_permissions, requirePermission, UI Rollen-Tab

### Tasks
- ✅ Migration 006: Tabellen roles, permissions, role_permissions
- ✅ Migration 006: Seed – 3 Rollen, 25 Permissions, role_permissions
- ✅ Migration 006: users.role VARCHAR → users.role_id FK
- ✅ Migration 006: Admin-User mit sicherem Passwort (bcrypt cost 12)
- ✅ routes/auth.js: Permissions beim Login in Session laden
- ✅ middleware/auth.js: requirePermission(permName) Factory
- ✅ routes/users.js: role_id statt role string, JOIN auf roles
- ✅ routes/stammdaten.js: CRUD /roles, GET /permissions, PUT /roles/:id/permissions
- ✅ AuthContext.jsx: hasPermission() Helper
- ✅ App.jsx: Sidebar-Guards via hasPermission
- ✅ BenutzerPage.jsx: dynamische Rollen aus API
- ✅ StammdatenPage.jsx: Tab "Rollen & Rechte" mit PermissionModal (Checkbox-Grid)
- ✅ api.js: neue RBAC-Methoden

**Admin-Zugangsdaten:** username=`admin` (Passwort wurde separat kommuniziert)

---

## Session 6 – 2026-03-18
**Ziel:** Performance-Optimierung + Basis-Authentifizierung + Lokale Fonts
**Scope:** CPU-Fixes, Debouncing, React.memo, Login/Rollen, @fontsource

### Tasks
- ✅ Lokale Fonts: @fontsource/ibm-plex-sans + ibm-plex-mono
- ✅ DB-Indizes Migration 004
- ✅ Users-Tabelle Migration 005
- ✅ Backend: bcryptjs + express-session + connect-pg-simple installieren
- ✅ Auth-Routen (login/logout/me/change-password)
- ✅ Auth-Middleware (requireAuth/requireAdmin)
- ✅ server.js: Session + Auth absichern
- ✅ users.js: Admin-CRUD
- ✅ dashboard-stats: Promise.all
- ✅ FilterBar: Debouncing 300ms
- ✅ App.jsx: Polling-Backoff
- ✅ React.memo: SortableHeader, FilterBar, MessageThread
- ✅ AuthContext + LoginPage
- ✅ App.jsx: Auth-Guard + Sidebar User-Footer
- ✅ BenutzerPage.jsx
- ✅ api.js: Auth + User Methoden

---

## Session 5 – 2026-03-18
**Ziel:** Ticket-Kommunikation: Email-Thread, Matching, manuelle Verknüpfung
**Scope:** emailService Fix, ticket_messages CRUD, Thread-UI, Reply, Email-Matching, manuelle Verknüpfung

### Tasks
- ✅ Migration 003: unmatched_emails Tabelle
- ✅ emailService.js: Schema-Fix + addMessageToTicket + sendTicketReply + 4-stufiger Matching-Algorithmus
- ✅ Backend: POST /api/tickets/:id/reply
- ✅ Backend: POST /api/tickets/:id/link-message
- ✅ Backend: GET/POST /api/tickets/unmatched + assign
- ✅ Backend: dashboard-stats um unread_messages + unmatched_emails erweitern
- ✅ MessageThread.jsx
- ✅ ReplyBox.jsx
- ✅ UnmatchedEmailsPanel.jsx
- ✅ TicketDetail.jsx: Kommunikationsbereich
- ✅ SystemPage.jsx: Tab Ungematchte Emails
- ✅ App.jsx: Sidebar-Badge
- ✅ api.js: neue Methoden
- ✅ global.css: neue CSS-Klassen

**Offene Punkte:**
- Email-Credentials (GMAIL_USER / GMAIL_APP_PASSWORD) noch nicht konfiguriert → Reply-Button zeigt 503-Hinweis
- IMAP-Polling inaktiv bis Credentials eingetragen

---

## Session 4b – 2026-03-18
**Ziel:** GitHub MCP Setup + vollständige Repo-Analyse gegen Prompts 1–4
**Tool:** GitHub MCP (project-scope, SteffenWaldvogel/ServiceTool) + lokale Dateiprüfung

### Analyseergebnis:
- Gesamt: **41 ✅ / 1 ⚠️ / 0 ❌**
- Letzter DEVLOG-Eintrag: Session 4 – 2026-03-18, alle Tasks abgeschlossen
- Version laut CHANGELOG: [UNRELEASED] (Session 4)

### Fehlende Dateien:
- keine ❌ Dateien — alle 32 Pflichtdateien vorhanden

### Unvollständige Features:
- ⚠️ **emailService.js**: Referenziert nicht existierende Spalten in `ticket` (`email_message_id`, `per_email_erstellt`, `id` statt `ticketnr`). Email-Eingang würde bei IMAP-Poll crashen. Kein `addMessageToTicket()` implementiert.

### Bereit für Prompt 5 (Ticket-Kommunikation): **JA**
**Begründung:** ticket_messages-Tabelle ✅, Backend-Routen GET/POST /api/tickets/:id/messages ✅, TicketDetail.jsx mit MessageThread ✅. emailService-Bugfix ist Teil von Prompt 5.

### Nächste Schritte:
1. **Prompt 5 starten** — Ticket-Kommunikation: E-Mail-Eingang reparieren (emailService.js Schema-Fix), Nachrichten-Compose aus TicketDetail, Reply-by-Mail
2. emailService.js: `id` → `ticketnr`, `email_message_id`/`per_email_erstellt` entfernen oder Spalten zu Schema ergänzen

---

## Session 4 – 2026-03-18
**Ziel:** Lückenschluss – alle offenen Punkte aus Soll/Ist-Analyse schließen
**Scope:**
  - Prio 1: QuickCreate in KundenDetail + Filter/Sort in allen Listen
  - Prio 2: ErsatzteileDetail Kompatibilität + MaschinenDetail Ticket-Tab
  - Prio 3: seed.sql Positionen + CLAUDE.md aktualisieren

### Tasks
- ✅ KundenDetail: Inline-Form für Ansprechpartner (mit QuickCreate für Abteilung/Position, DuplicateWarning)
- ✅ KundenDetail: Inline-Form für Maschinen anlegen (mit QuickCreate Maschinentyp, Dubletten-Check)
- ✅ KundenDetail: Maschinen-Tabelle mit Navigations-Link zu /maschinen/:id
- ✅ Backend kunden.js: Filter/Sort/Pagination (queryBuilder, service_priority JOIN, ticket_count)
- ✅ Frontend KundenList: FilterBar + SortableHeader + Pagination
- ✅ Backend ansprechpartner.js: Filter/Sort/Pagination
- ✅ Frontend AnsprechpartnerList: FilterBar + SortableHeader + Pagination
- ✅ Backend maschinen.js: Filter/Sort/Pagination (queryBuilder, gte/lte Baujahr)
- ✅ Frontend MaschinenList: FilterBar + SortableHeader + Pagination
- ✅ Backend ersatzteile.js: Filter/Sort/Pagination (queryBuilder, boolean_null)
- ✅ Frontend ErsatzteileList: FilterBar + SortableHeader + Pagination
- ✅ FilterBar: type 'number' hinzugefügt
- ✅ queryBuilder: 'gte', 'lte', 'boolean_null' ergänzt
- ✅ MaschinenDetail: Ticket-Historie Tab (vollständige Tabelle)
- ✅ seed.sql: Positionen ergänzt (Spezialpositionen)
- ✅ CLAUDE.md: Project Structure aktualisiert
- ✅ DB_COVERAGE.md: Abdeckung bestätigt
- ✅ CHANGELOG.md: Session-4-Einträge
- ✅ Git commit + push

---

## Session 3 – 2026-03-18

**Objective:** Implement GitHub integration, QuickCreate inline entity creation, duplicate detection, advanced filtering/sorting with pagination, and supporting infrastructure.

### Scope
Session 3 extends the application with developer tooling (Git/CI) and major UX improvements: users can now create Kunden, Ansprechpartner, and Maschinen inline from dropdowns without leaving the Ticket create modal; a Levenshtein-based matching service warns about potential duplicates; and the TicketList gains server-side sort, advanced filters, and pagination.

### Backend work

1. **`services/matchingService.js`** (new)
   - Implements `matchKunde`, `matchAnsprechpartner`, `matchMaschine`
   - Levenshtein distance + word-overlap + field-by-field scoring
   - Returns top 5 matches with score (0–100), level (`warning`/`hint`), and reason tags
   - Scores ≥ 80 flagged as `warning` (strong duplicate), ≥ 60 as `hint`

2. **Match endpoints** (added to existing routes)
   - `POST /api/kunden/match` → matchKunde
   - `POST /api/ansprechpartner/match` → matchAnsprechpartner
   - `POST /api/maschinen/match` → matchMaschine

3. **`utils/queryBuilder.js`** (new)
   - Generic filter builder supporting: `in`, `exact`, `ilike`, `date_from`, `date_to`, `boolean` types
   - Handles sort aliasing and pagination with max-limit cap (1000)

4. **`routes/tickets.js`** GET / (updated)
   - Replaced manual filter/pagination with `buildQuery` utility
   - Search on `name_kunde` OR `ticketnr::text`
   - Response changed from array to `{ data: [...], total: N }` for pagination support
   - Separate COUNT query for total (same WHERE, no ORDER/LIMIT)

### Frontend work

5. **`components/DuplicateWarning.jsx`** (new)
   - Score progress bar, reason badges, warning/hint color scheme
   - Confirmation checkbox required before "Trotzdem neu anlegen"
   - `onSelectExisting` callback to use an existing record instead

6. **`components/QuickCreate.jsx`** (new)
   - Searchable dropdown trigger with live search input
   - "Neu anlegen" opens a mini-modal with configurable field schema
   - Accepts `matchFn` prop: calls match endpoint before create; shows DuplicateWarning if matches found
   - After confirmed creation, new item is auto-selected in the dropdown

7. **`components/FilterBar.jsx`** (new)
   - Primary filters always visible; advanced filters collapsed under "Mehr Filter" toggle
   - Active filter chips below bar with individual ✕ remove and bulk "Filter löschen"
   - Supports: search, select, boolean checkbox, daterange (two date inputs)

8. **`components/SortableHeader.jsx`** (new)
   - Inline sort indicator: ⇅ (inactive), ▲/▼ (active asc/desc)
   - Accent color on active column

9. **`hooks/useFilter.js`** (new)
   - Encapsulates filters, sort, page state with `setFilter`, `setSort`, `setPage`, `clearFilters`, `buildParams`
   - `setFilter` and `setSort` automatically reset page offset to 0

10. **`pages/TicketList.jsx`** (updated)
    - CreateTicketModal: replaced `<select>` for Kunde, Ansprechpartner, Maschine with QuickCreate components
    - Main list: added FilterBar, SortableHeader on all key columns, pagination controls
    - Handles both array and `{ data, total }` response formats for backward compatibility
    - Lookup now loads abteilungen, positionen, maschinentypen for QuickCreate createFields

11. **`pages/MaschinenList.jsx`** (updated)
    - MaschineModal: replaced maschinentyp `<select>` with QuickCreate
    - New maschinentyp created inline is appended to the maschinentypen list in the parent

12. **`utils/api.js`** (updated)
    - Added `matchKunden`, `matchAnsprechpartner`, `matchMaschinen` methods

### Infrastructure

13. **`.gitignore`** (updated) – added `backend/.env`, `*.local`
14. **`.github/workflows/ci.yml`** (new) – GitHub Actions CI/CD
15. **`scripts/git-sync.sh`** + **`scripts/git-sync.ps1`** (new) – quick sync scripts
16. **`CLAUDE.md`** (updated) – added Git Workflow section with branch strategy and conventional commits

### Key decisions & notes

- **`{ data, total }` response shape**: Only the `GET /api/tickets` route changed. All other list routes remain array-returning for compatibility. The frontend handles both shapes.
- **QuickCreate `matchFn`**: Duplicate check happens before creation. The user must tick a confirmation checkbox to bypass. This avoids mandatory DB roundtrips when not needed (matchFn is optional).
- **queryBuilder**: The `is_terminal` boolean filter joins `status s` which is already present in TICKET_SELECT, so no extra join needed. The count query includes the same JOINs as the data query to ensure WHERE clauses referencing joined tables work correctly.
- **Levenshtein threshold**: Score ≥ 60 to surface matches, ≥ 80 for warning level. Exact email match gets +60 (same kunde) / +80 (different kunde) to catch cross-customer email reuse.

---

## Session 2 – 2026-03-18

**Objective:** Implement all missing features based on master build prompt review.

### Scope
The initial build (Session 1) had all core CRUD pages and routes in place. Session 2 adds administrative management, a standalone ansprechpartner module, system audit visibility, and project documentation.

### Backend work

1. **`routes/stammdaten.js`** (new)
   - Full CRUD for six reference tables: service_priority, abteilung, position, kategorie, kritikalität, status
   - Used `COALESCE($n, column)` pattern in PUT handlers so partial updates preserve unset fields
   - DELETE returns 409 on FK violations with human-readable messages
   - Unique constraint violations return 409 with descriptive message
   - German umlaut column names (`kritikalität_id`, etc.) handled via parameterized queries

2. **`routes/system.js`** (new)
   - Single read-only endpoint `GET /api/system/audit-log`
   - Supports all five filter params; `limit` capped at 1000 for safety
   - Returns empty array gracefully if `audit_log` table is empty or triggers not set up (error code `42P01`)

3. **`routes/customFieldsAdmin.js`** (new)
   - Manages `custom_field_definitions` (composite PK: table_name + key)
   - Manages `custom_field_options` (composite PK: table_name + key + value)
   - DELETE on definitions cascades to options via DB foreign key

4. **`routes/ansprechpartner.js`** (new)
   - Standalone routes (complement to nested `/kunden/:id/ansprechpartner` in kunden.js)
   - GET list joins abteilung, position, kunden tables
   - GET detail also joins vertretung (self-ref) name
   - PUT uses COALESCE pattern; vertretungid explicitly set to $6 (allows null clear)
   - Handles trigger exception for self-referential vertretung (error code P0001)

5. **`server.js`** (updated)
   - Registered all four new routers

### Frontend work

6. **`utils/api.js`** (updated)
   - Added ~30 new API methods grouped under Stammdaten CRUD, Ansprechpartner standalone, System, Custom Fields Admin

7. **`pages/StammdatenPage.jsx`** (new)
   - Single-page tabbed admin interface for all 8 reference entity types
   - `SimpleModal` reusable component handles text/textarea/number/select/checkbox fields
   - `SimpleTab` reusable component renders table + add/edit/delete buttons
   - `FreifelderTab` sub-component with entity filter, definitions table grouped by table_name, and `CustomFieldOptionsManager` sub-modal for dropdown options
   - `MaschinentypenTab` reuses existing `api.getMaschinentypen` / `createMaschinentyp` / etc.
   - Kritikalität: `GewichtungBadge` with color-coded badge (green→amber→red→purple scale)
   - Status: `TerminalBadge` shows Terminal/Offen with color

8. **`pages/SystemPage.jsx`** (new)
   - Filter card with 6 controls (table dropdown from known tables list, operation select, changed_by text, from/to date pickers, limit select)
   - Table with `OperationBadge` and `JsonPreview` expandable cells
   - Empty state explains audit triggers not configured

9. **`pages/AnsprechpartnerList.jsx`** (new)
   - Search input + reset button
   - Clickable Kunde column navigates to `/kunden/:id`
   - `CreateAnsprechpartnerModal` loads kunden and abteilungen on mount, loads positionen when abteilung selected

10. **`pages/AnsprechpartnerDetail.jsx`** (new)
    - Reusable `EditField` component with inline edit (text/email/select), Enter/Escape shortcuts
    - Special handling for abteilung change: clears position_id and reloads position options
    - Sidebar shows Kunde card with link, plus Metadaten card
    - Delete with confirm, navigates back to list

11. **`App.jsx`** (updated)
    - Sidebar reorganized to 4 sections: ÜBERSICHT / SERVICE / STAMM / VERWALTUNG
    - 4 new routes, 4 new imports, 2 new SVG icons

### Documentation

12. **`docs/DB_COVERAGE.md`** – Full table coverage matrix
13. **`CHANGELOG.md`** – Semantic versioning changelog
14. **`DEVLOG.md`** – This file

### Key decisions & notes

- **German umlauts in column names**: PostgreSQL allows `kritikalität_id` as a column name without quoting when using parameterized queries via the `pg` driver. The JS object keys use Unicode directly.
- **COALESCE pattern for PUT**: `SET col = COALESCE($n, col)` allows the frontend to send only changed fields without clearing others. For nullable fields that should be explicitly clearable (e.g. `ansprechpartner_vertretungid`), the parameter is set directly without COALESCE.
- **Positionen abteilung cascade**: When the UI changes an Ansprechpartner's abteilung, the position is reset to null to prevent stale FK. The UI then reloads positions for the new abteilung.
- **Custom fields admin vs. custom fields entity routes**: Admin CRUD lives at `/api/custom-fields/` (this session). Entity-level read/write (`/api/kunden/:id/custom-fields` etc.) was implemented in Session 1.
- **Audit log**: The DB has the `audit_log` table but no triggers that write to it (triggers would need to be added per-table). The UI handles the empty case gracefully.

---

## Session 1 – (initial build)

**Objective:** Build the initial working Express + React service tool application.

### Work done
- Set up project structure (backend/frontend monorepo with root package.json scripts)
- Created PostgreSQL schema with all tables, views, triggers, seed data
- Implemented all backend routes: tickets, kunden, maschinen, maschinentypen, ersatzteile, lookup
- Implemented all frontend pages: Dashboard, TicketList, TicketDetail, KundenList, KundenDetail, MaschinenList, MaschinenDetail, ErsatzteileList, ErsatzteileDetail
- CustomFieldsSection component integrated into all detail pages
- Email service (IMAP polling + SMTP) implemented
- Dark industrial theme with IBM Plex Sans/Mono
