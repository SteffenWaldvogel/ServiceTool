# ServiceTool

Ein internes Service-Ticketing-System für technischen Kundendienst und Maschinenwartung. Entwickelt mit Express.js, PostgreSQL und React.

---

## Funktionsübersicht

### Tickets
- Tickets erstellen, bearbeiten und löschen
- Felder: Kunde, Ansprechpartner, Maschine, Kategorie, Kritikalität, Status, Betreff, Beschreibung
- Ticket-Zuweisung an Techniker (Filter "Meine Tickets")
- Ticket-Verknüpfungen (Links zwischen Tickets + Merging)
- SLA-Tracking mit Warning/Überfällig-Badges (konfigurierbar pro Service-Priority)
- Bulk-Aktionen (Mehrfachauswahl, Status/Zuweisung setzen)
- CSV-Export mit aktiven Filtern
- Volltextsuche (Nachrichten, Maschinennummer, AP-Name) mit Highlight
- Filter nach Status, Kritikalität, Kategorie, Datum, Abgeschlossen/Offen
- Sortierung nach Ticket-Nr., Kunde, Kritikalität, Status, Erstellt
- Pagination (25 / 50 / 100 Einträge pro Seite)

### E-Mail-Kommunikation
- Thread-Ansicht pro Ticket (Nachrichten + E-Mails)
- Antworten direkt aus dem Ticket heraus (Reply)
- Interne Notizen (nicht für Kunden sichtbar)
- Bestätigungs-E-Mail an Kunden beim Erstellen
- IMAP-Polling für eingehende E-Mails

### Posteingang
- Übersicht aller ungematchten E-Mails
- Manuelle Zuweisung an bestehende Tickets oder Kunden

### Kunden
- Vollständige Kundenverwaltung (Name, Matchcode, Adresse, Priorität)
- Mehrere E-Mail-Adressen und Telefonnummern pro Kunde
- Ansprechpartner pro Kunde
- Verknüpfte Maschinen und Tickets in der Detailansicht

### Ansprechpartner
- Eigenständige Liste und Detailseite
- Felder: Name, E-Mail, Telefon, Abteilung, Position, Vertretung
- Verknüpfung zu Kunden

### Maschinen
- Globale Maschinenverwaltung
- Felder: Maschinennummer, Bezeichnung, Maschinentyp, Baujahr
- Verknüpfte Tickets pro Maschine

### Ersatzteile
- Ersatzteilkatalog mit Kompatibilitätszuordnung (Baujahr + Maschinennummer)
- Custom Fields pro Ersatzteil

### Import
- CSV/Excel-Import für Kunden, Maschinen und weitere Entitäten

### Stammdaten (Admin)
- Verwaltung aller Referenzdaten über eine eigene Adminseite
- Tabs: Service-Prioritäten, Abteilungen, Positionen, Kategorien, Kritikalität, Status, Maschinentypen, Freifelder
- Freifelder (Custom Fields) pro Entität definierbar inkl. Dropdown-Optionen

### Authentication & Benutzerverwaltung
- Login mit Session-basierter Authentifizierung
- Passwort ändern
- RBAC mit 3 Rollen: Admin, Techniker, Readonly (25 Permissions)
- Benutzerverwaltung für Admins

### System / Audit-Log
- Lückenlose Änderungshistorie für alle relevanten Tabellen
- Automatisch per PostgreSQL-Trigger (INSERT / UPDATE / DELETE)
- Filterbar nach Tabelle, Operation, Benutzer und Zeitraum

### Duplikatserkennung
- Levenshtein-basierter Abgleich beim Anlegen von Kunden, Ansprechpartnern und Maschinen
- Warnung mit Score-Anzeige und Begründungs-Badges
- Bestätigungspflicht bei hohem Übereinstimmungsgrad

### QuickCreate
- Inline-Anlage neuer Entitäten direkt aus Dropdown-Feldern heraus
- Verwendet in: Ticket erstellen (Kunde, AP, Maschine), Maschine anlegen (Maschinentyp)

### Monitoring
- Sentry Fehler-Monitoring (optional, via `SENTRY_DSN` / `VITE_SENTRY_DSN`)

---

## Technik-Stack

| Bereich    | Technologie                          |
|------------|--------------------------------------|
| Backend    | Node.js, Express.js (Port 3001)      |
| Datenbank  | PostgreSQL 17                        |
| Frontend   | React 18, Vite (Port 5173)           |
| Routing    | React Router v6                      |
| Charts     | Recharts                             |
| Auth       | express-session, bcryptjs, RBAC      |
| E-Mail     | Gmail IMAP (imap) + SMTP (nodemailer)|
| Monitoring | Sentry (optional)                    |
| Fonts      | IBM Plex Sans / IBM Plex Mono        |

---

## Voraussetzungen

- Node.js 20+
- PostgreSQL 17
- Ein Gmail-Konto mit App-Passwort (nur für E-Mail-Funktion erforderlich)

---

## Installation

### 1. Datenbank einrichten

```bash
createdb servicetickets
psql -d servicetickets -f database_schema.sql
```

Stammdaten (Abteilungen, Kategorien, Status etc.) einspielen:

```bash
psql -d servicetickets -f backend/src/config/seed.sql
```

### Datenbank-Migrationen

Nach dem initialen Setup bei Bedarf ausführen:

```bash
psql -d servicetickets -f backend/migrations/003_unmatched_emails.sql
```

### 2. Backend einrichten

```bash
cd backend
cp .env.example .env
```

`.env` anpassen:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=servicetickets
DB_USER=postgres
DB_PASSWORD=dein_passwort

SESSION_SECRET=ein_sicherer_zufalls_string   # Pflichtfeld, Server startet nicht ohne
NODE_ENV=production                           # oder development
CORS_ORIGIN=http://localhost:5173

GMAIL_USER=deine@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

SENTRY_DSN=                                   # optional
VITE_SENTRY_DSN=                              # optional, Frontend-Sentry
```

Abhängigkeiten installieren und starten:

```bash
npm install
npm run dev
```

Backend läuft auf: `http://localhost:3001`

### 3. Frontend einrichten

```bash
cd frontend
npm install
npm run dev
```

Frontend läuft auf: `http://localhost:5173`

Weitere Details zu Deployment und Produktivbetrieb: siehe `docs/DEPLOYMENT.md`.

---

## E-Mail-Integration (Gmail)

1. Google-Konto: Zwei-Faktor-Authentifizierung aktivieren
2. App-Passwort generieren: Google-Konto -> Sicherheit -> App-Passwörter
3. IMAP in den Gmail-Einstellungen aktivieren
4. `GMAIL_USER` und `GMAIL_APP_PASSWORD` in `backend/.env` eintragen

Eingehende E-Mails werden automatisch als Ticket-Nachrichten verarbeitet. Nicht zuordenbare E-Mails landen im Posteingang zur manuellen Zuweisung.

---

## Entwicklung

### Beide Server gleichzeitig starten (aus dem Root-Verzeichnis)

```bash
npm run dev:backend
npm run dev:frontend
```

### Änderungen committen und pushen

```bash
# Bash
bash scripts/git-sync.sh "feat: beschreibung der änderung"

# PowerShell
.\scripts\git-sync.ps1 -msg "feat: beschreibung der änderung"
```

### Commit-Konventionen

| Präfix       | Bedeutung                        |
|--------------|----------------------------------|
| `feat`       | Neues Feature                    |
| `fix`        | Fehlerbehebung                   |
| `chore`      | Wartung, Abhängigkeiten, Config  |
| `refactor`   | Umstrukturierung ohne Änderung   |
| `docs`       | Nur Dokumentation                |
| `style`      | Formatierung, Whitespace         |
| `test`       | Tests hinzufügen oder anpassen   |

---

## Projektstruktur

```
ServiceTool/
├── backend/
│   └── src/
│       ├── server.js
│       ├── config/
│       │   ├── database.js
│       │   └── seed.sql
│       ├── middleware/
│       │   ├── auth.js              # Session-Auth + RBAC
│       │   └── validate.js          # express-validator Middleware
│       ├── routes/
│       │   ├── tickets.js
│       │   ├── kunden.js
│       │   ├── ansprechpartner.js
│       │   ├── maschinen.js
│       │   ├── maschinentypen.js
│       │   ├── ersatzteile.js
│       │   ├── stammdaten.js
│       │   ├── customFieldsAdmin.js
│       │   ├── system.js
│       │   ├── lookup.js
│       │   ├── auth.js              # Login, Logout, Passwort ändern
│       │   ├── users.js             # Benutzerverwaltung (Admin)
│       │   └── import.js            # CSV/Excel-Import
│       ├── services/
│       │   ├── emailService.js
│       │   └── matchingService.js
│       └── utils/
│           └── queryBuilder.js
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── TicketList.jsx
│       │   ├── TicketDetail.jsx
│       │   ├── KundenList.jsx
│       │   ├── KundenDetail.jsx
│       │   ├── AnsprechpartnerList.jsx
│       │   ├── AnsprechpartnerDetail.jsx
│       │   ├── MaschinenList.jsx
│       │   ├── MaschinenDetail.jsx
│       │   ├── ErsatzteileList.jsx
│       │   ├── ErsatzteileDetail.jsx
│       │   ├── StammdatenPage.jsx
│       │   ├── SystemPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── BenutzerPage.jsx
│       │   ├── ImportPage.jsx
│       │   └── PosteingangPage.jsx
│       ├── components/
│       │   ├── QuickCreate.jsx
│       │   ├── DuplicateWarning.jsx
│       │   ├── FilterBar.jsx
│       │   ├── SortableHeader.jsx
│       │   ├── CustomFieldsSection.jsx
│       │   ├── MessageThread.jsx
│       │   ├── ReplyBox.jsx
│       │   └── UnmatchedEmailsPanel.jsx
│       ├── hooks/
│       │   └── useFilter.js
│       └── utils/
│           ├── api.js
│           └── helpers.js
├── nginx/
│   └── nginx.conf
├── scripts/
│   ├── git-sync.sh
│   └── git-sync.ps1
├── docs/
│   ├── ACD_v3.md
│   ├── DB_COVERAGE.md
│   └── DEPLOYMENT.md
├── database_schema.sql
├── ecosystem.config.js
├── CHANGELOG.md
├── DEVLOG.md
├── CLEANUP_NOTES.md
└── CLAUDE.md
```

---

## Lizenz

Internes Projekt -- nicht zur öffentlichen Nutzung bestimmt.
