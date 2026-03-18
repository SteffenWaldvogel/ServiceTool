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
│   │   ├── config/database.js     # pg Pool
│   │   ├── routes/
│   │   │   ├── tickets.js         # CRUD /api/tickets + messages
│   │   │   ├── kunden.js          # CRUD /api/kunden (mit Emails/Telefon in Transaktion)
│   │   │   ├── lookup.js          # Stammdaten + /api/lookup/dashboard-stats
│   │   │   ├── maschinen.js       # CRUD /api/maschinen (global)
│   │   │   ├── maschinentypen.js  # CRUD /api/maschinentypen
│   │   │   └── ersatzteile.js     # CRUD /api/ersatzteile + Kompatibilität
│   │   └── services/
│   │       └── emailService.js    # IMAP polling + SMTP
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Router + Sidebar layout
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Stat tiles + charts + recent tickets
│   │   │   ├── TicketList.jsx     # Table, filter, create modal
│   │   │   ├── TicketDetail.jsx   # Inline editing + messages + Kunde sidebar
│   │   │   ├── KundenList.jsx     # Search + ticket counter
│   │   │   ├── KundenDetail.jsx   # Stammdaten, Ansprechpartner, Maschinen, Tickets
│   │   │   ├── MaschinenList.jsx  # Global machine CRUD
│   │   │   └── ErsatzteileList.jsx # Spare parts CRUD
│   │   ├── utils/api.js           # fetch wrapper for all API calls
│   │   └── styles/global.css      # Dark industrial theme
│   ├── index.html
│   ├── vite.config.js             # proxy /api → :3001
│   └── package.json
├── database_schema.sql            # PostgreSQL schema + seed data
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
- `GET/POST /api/tickets` – list (filterable) / create
- `GET/PUT/DELETE /api/tickets/:id`
- `GET/POST /api/kunden` – list (searchable) / create with emails+telefon in transaction
- `GET/PUT/DELETE /api/kunden/:id`
- `GET /api/kunden/:id/tickets`
- `POST /api/kunden/:id/ansprechpartner`
- `PUT/DELETE /api/kunden/:id/ansprechpartner/:apId`
- `GET/POST /api/maschinen` – global machines list / create
- `GET/PUT/DELETE /api/maschinen/:id`
- `GET/POST /api/maschinentypen`
- `GET/POST /api/ersatzteile` – spare parts list / create
- `GET/PUT/DELETE /api/ersatzteile/:id`
- `POST/DELETE /api/ersatzteile/:id/kompatibilitaet-baujahr`
- `POST/DELETE /api/ersatzteile/:id/kompatibilitaet-nummer`
- `GET /api/tickets/:id/messages`
- `POST /api/tickets/:id/messages`
- `GET /api/lookup/status|kategorien|kritikalitaeten|maschinentypen|service-priorities`
- `GET /api/lookup/abteilungen`
- `GET /api/lookup/positionen?abteilung_id=`
- `GET /api/lookup/dashboard-stats`

## Design
Dark industrial theme using CSS custom properties in `global.css`.
Colors: bg `#0d1117`, surface `#161b22`, accent `#3b82f6`.
No external UI library – all components hand-written.

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
