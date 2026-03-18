# Service Tool – CLAUDE.md

## Stack
- **Backend**: Express.js (Port 3001), PostgreSQL via `pg`
- **Frontend**: React 18 + Vite (Port 5173), React Router v6, Recharts
- **Fonts**: IBM Plex Sans + IBM Plex Mono (Google Fonts, free)
- **Email**: Gmail IMAP polling (imap package) + SMTP (nodemailer)

## Project Structure
```
ServiceTool/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express entry point
│   │   ├── config/
│   │   │   ├── database.js        # pg Pool
│   │   │   └── seed.sql           # Stammdaten-Seed (idempotent)
│   │   ├── routes/
│   │   │   ├── tickets.js         # CRUD /api/tickets + messages
│   │   │   ├── kunden.js          # CRUD /api/kunden (mit Emails/Telefon in Transaktion)
│   │   │   ├── lookup.js          # Stammdaten + /api/lookup/dashboard-stats
│   │   │   ├── maschinen.js       # CRUD /api/maschinen (global)
│   │   │   ├── maschinentypen.js  # CRUD /api/maschinentypen
│   │   │   ├── ersatzteile.js     # CRUD /api/ersatzteile + Kompatibilität
│   │   │   ├── ansprechpartner.js # Standalone CRUD /api/ansprechpartner
│   │   │   ├── stammdaten.js      # Admin-CRUD Referenzdaten (Abteilung, Position, etc.)
│   │   │   ├── customFieldsAdmin.js # Admin-CRUD custom_field_definitions + options
│   │   │   └── system.js          # GET /api/system/audit-log
│   │   ├── services/
│   │   │   ├── emailService.js    # IMAP polling + SMTP
│   │   │   └── matchingService.js # Levenshtein-Dubletten-Matching
│   │   └── utils/
│   │       └── queryBuilder.js    # Generic filter/sort/pagination builder
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Router + Sidebar layout
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Stat tiles + charts + recent tickets
│   │   │   ├── TicketList.jsx     # Table, filter/sort/pagination, create modal
│   │   │   ├── TicketDetail.jsx   # Inline editing + messages + Kunde sidebar
│   │   │   ├── KundenList.jsx     # Filter/sort/pagination + ticket counter
│   │   │   ├── KundenDetail.jsx   # Stammdaten, Inline-AP-Form, Inline-Maschinen-Form, Tickets
│   │   │   ├── MaschinenList.jsx  # Filter/sort/pagination + CRUD
│   │   │   ├── MaschinenDetail.jsx# Tabs: Stammdaten | Ticket-Historie
│   │   │   ├── ErsatzteileList.jsx# Filter/sort/pagination + CRUD
│   │   │   ├── ErsatzteileDetail.jsx # Kompatibilität Baujahr + Nummer
│   │   │   ├── AnsprechpartnerList.jsx # Filter/sort/pagination
│   │   │   ├── AnsprechpartnerDetail.jsx # Inline-edit + Kunde-Sidebar
│   │   │   ├── StammdatenPage.jsx # Tabbed admin für alle Referenzdaten
│   │   │   └── SystemPage.jsx     # Audit-Log Viewer
│   │   ├── components/
│   │   │   ├── CustomFieldsSection.jsx # Freifelder pro Entity
│   │   │   ├── QuickCreate.jsx    # Searchable dropdown + Inline-Anlegen
│   │   │   ├── DuplicateWarning.jsx # Dubletten-Warnung mit Score
│   │   │   ├── FilterBar.jsx      # Primary + Advanced Filter mit Chips
│   │   │   └── SortableHeader.jsx # Sortierbare Spaltenköpfe
│   │   ├── hooks/
│   │   │   └── useFilter.js       # Filter/Sort/Pagination State Hook
│   │   ├── utils/
│   │   │   ├── api.js             # fetch wrapper für alle API-Calls
│   │   │   └── helpers.js         # getKritColor, parseKategorie
│   │   └── styles/global.css      # Dark industrial theme
│   ├── index.html
│   ├── vite.config.js             # proxy /api → :3001
│   └── package.json
├── docs/
│   └── DB_COVERAGE.md             # Tabellen-Coverage-Matrix
├── database_schema.sql            # PostgreSQL schema + seed data
├── CHANGELOG.md
├── DEVLOG.md
├── package.json                   # root scripts: dev:backend, dev:frontend
├── .gitignore
└── CLAUDE.md
```

## Database Tables
`ticket`, `ticket_messages`, `kunden`, `kunden_emails`, `kunden_telefonnummern`, `ansprechpartner`,
`maschine`, `maschinentyp`, `kategorie`, `kritikalität`, `status`, `service_priority`,
`abteilung`, `position`, `ersatzteile`, `ersatzteile_maschinentyp_baujahr`, `ersatzteile_maschinentyp_nummer`,
`custom_field_definitions`, `custom_field_options`, plus 5 custom-field entity tables, `audit_log`

## Setup

### 1. Database
```bash
createdb servicetickets
psql -d servicetickets -f database_schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with DB credentials and Gmail settings
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Email Setup (Gmail)
1. Enable 2FA on your Google account
2. Generate an App Password: Google Account → Security → App Passwords
3. Set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `backend/.env`
4. Enable IMAP in Gmail settings

## API Endpoints

### Tickets
- `GET/POST /api/tickets` – list (filter/sort/pagination → `{ data, total }`) / create
- `GET/PUT/DELETE /api/tickets/:id`
- `GET /api/tickets/:id/messages`
- `POST /api/tickets/:id/messages`

### Kunden
- `GET/POST /api/kunden` – list (`{ data, total }`) / create with emails+telefon in transaction
- `GET/PUT/DELETE /api/kunden/:id`
- `GET /api/kunden/:id/tickets`
- `POST /api/kunden/:id/ansprechpartner`
- `PUT/DELETE /api/kunden/:id/ansprechpartner/:apId`
- `POST /api/kunden/match` – Dubletten-Check

### Ansprechpartner (standalone)
- `GET /api/ansprechpartner` – list (`{ data, total }`) mit Filter/Sort/Pagination
- `GET/PUT/DELETE /api/ansprechpartner/:id`
- `POST /api/ansprechpartner`
- `POST /api/ansprechpartner/match` – Dubletten-Check

### Maschinen
- `GET/POST /api/maschinen` – list (`{ data, total }`) / create
- `GET/PUT/DELETE /api/maschinen/:id`
- `GET /api/maschinen/:id/tickets`
- `POST /api/maschinen/match` – Dubletten-Check

### Maschinentypen
- `GET/POST /api/maschinentypen`
- `PUT/DELETE /api/maschinentypen/:id`

### Ersatzteile
- `GET/POST /api/ersatzteile` – list (`{ data, total }`) / create
- `GET/PUT/DELETE /api/ersatzteile/:id`
- `GET/POST/DELETE /api/ersatzteile/:id/kompatibilitaet-baujahr`
- `GET/POST/DELETE /api/ersatzteile/:id/kompatibilitaet-nummer`

### Lookup (read-only)
- `GET /api/lookup/status|kategorien|kritikalitaeten|maschinentypen|service-priorities`
- `GET /api/lookup/abteilungen`
- `GET /api/lookup/positionen?abteilung_id=`
- `GET /api/lookup/dashboard-stats`

### Stammdaten Admin (CRUD)
- `GET/POST /api/stammdaten/abteilungen`
- `PUT/DELETE /api/stammdaten/abteilungen/:id`
- `GET/POST /api/stammdaten/positionen`
- `PUT/DELETE /api/stammdaten/positionen/:id`
- `GET/POST /api/stammdaten/kategorien`
- `PUT/DELETE /api/stammdaten/kategorien/:id`
- `GET/POST /api/stammdaten/kritikalitaet`
- `PUT/DELETE /api/stammdaten/kritikalitaet/:id`
- `GET/POST /api/stammdaten/status`
- `PUT/DELETE /api/stammdaten/status/:id`
- `GET/POST /api/stammdaten/service-priority`
- `PUT/DELETE /api/stammdaten/service-priority/:id`

### Custom Fields Admin
- `GET/POST /api/custom-fields/definitions`
- `PUT/DELETE /api/custom-fields/definitions/:table/:key`
- `GET /api/custom-fields/options/:table/:key`
- `POST /api/custom-fields/options`
- `PUT/DELETE /api/custom-fields/options/:table/:key/:value`

### System
- `GET /api/system/audit-log`

## Design
Dark industrial theme using CSS custom properties in `global.css`.
Colors: bg `#0d1117`, surface `#161b22`, accent `#3b82f6`.
No external UI library – all components hand-written.

## Security Conventions

- **SQL**: Alle Queries müssen parameterisiert sein (`pg` `$1, $2, ...`). Keine String-Konkatenation mit User-Input in SQL.
- **Passwörter**: Immer bcryptjs cost 12. Kein Plaintext speichern oder zurückgeben.
- **SESSION_SECRET**: Muss in `.env` gesetzt sein. Server startet nicht ohne es (exit 1).
- **Rate-Limiting**: Login max 10/15min (`skipSuccessfulRequests: true`), global API max 500/15min.
- **Input-Validierung**: Alle POST/PUT-Routen nutzen `express-validator` + zentrale `validate`-Middleware.
- **Timing-Attack-Schutz**: Bei unbekanntem User beim Login trotzdem `bcrypt.compare` auf Dummy-Hash ausführen.
- **HTTP-Header**: `helmet` ist aktiv (X-Frame-Options, X-Content-Type-Options, HSTS, etc.).
- **Fehler-Responses**: In Production (`NODE_ENV=production`) keine Stack-Traces zurückgeben.
- **CORS**: Origin kommt aus `CORS_ORIGIN` Env-Var, nicht hardkodiert.

## Git Workflow

### Branch Strategy
- `main` – production-ready code, protected
- `develop` – integration branch for features
- `feature/<name>` – individual feature branches, merged into develop
- `fix/<name>` – bug fix branches

### Conventional Commits
Format: `<type>(<scope>): <short description>`

Types:
- `feat` – new feature
- `fix` – bug fix
- `chore` – maintenance, dependencies, config
- `refactor` – code restructuring without behavior change
- `docs` – documentation only
- `style` – formatting, whitespace
- `test` – adding or updating tests

Examples:
```
feat(tickets): add QuickCreate for inline kunde creation
fix(backend): correct umlaut quoting in kritikalität query
chore: update dependencies
```

### Quick Sync Scripts
```bash
# Bash (Linux/macOS/Git Bash)
bash scripts/git-sync.sh "feat: my change"

# PowerShell (Windows)
.\scripts\git-sync.ps1 -msg "feat: my change"
```

### CI/CD
GitHub Actions workflow at `.github/workflows/ci.yml` runs on push to `main`/`develop`:
1. Install backend + frontend dependencies
2. Build frontend
3. Smoke-test backend startup
4. (on main) Deploy frontend to Vercel
