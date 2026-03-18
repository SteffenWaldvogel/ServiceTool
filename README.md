# ServiceTool

Ein internes Service-Ticketing-System für technischen Kundendienst und Maschinenwartung. Entwickelt mit Express.js, PostgreSQL und React.

---

## Funktionsübersicht

### Tickets
- Tickets erstellen, bearbeiten und löschen
- Felder: Kunde, Ansprechpartner, Maschine, Kategorie, Kritikalität, Status, Betreff, Beschreibung
- Ticket-Nachrichten (interner Verlauf + E-Mail-Eingang)
- Bestätigungs-E-Mail an Kunden beim Erstellen
- Filter nach Status, Kritikalität, Kategorie, Datum, Abgeschlossen/Offen
- Sortierung nach Ticket-Nr., Kunde, Kritikalität, Status, Erstellt
- Pagination (25 / 50 / 100 Einträge pro Seite)

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

### Stammdaten (Admin)
- Verwaltung aller Referenzdaten über eine eigene Adminseite
- Tabs: Service-Prioritäten, Abteilungen, Positionen, Kategorien, Kritikalität, Status, Maschinentypen, Freifelder
- Freifelder (Custom Fields) pro Entität definierbar inkl. Dropdown-Optionen

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

---

## Technik-Stack

| Bereich    | Technologie                          |
|------------|--------------------------------------|
| Backend    | Node.js, Express.js (Port 3001)      |
| Datenbank  | PostgreSQL 17                        |
| Frontend   | React 18, Vite (Port 5173)           |
| Routing    | React Router v6                      |
| Charts     | Recharts                             |
| E-Mail     | Gmail IMAP (imap) + SMTP (nodemailer)|
| Fonts      | IBM Plex Sans / IBM Plex Mono        |

---

## Voraussetzungen

- Node.js 18+
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

GMAIL_USER=deine@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
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

---

## E-Mail-Integration (Gmail)

1. Google-Konto: Zwei-Faktor-Authentifizierung aktivieren
2. App-Passwort generieren: Google-Konto → Sicherheit → App-Passwörter
3. IMAP in den Gmail-Einstellungen aktivieren
4. `GMAIL_USER` und `GMAIL_APP_PASSWORD` in `backend/.env` eintragen

Eingehende E-Mails werden automatisch als Ticket-Nachrichten verarbeitet.

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
│       │   └── lookup.js
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
│       │   └── SystemPage.jsx
│       ├── components/
│       │   ├── QuickCreate.jsx
│       │   ├── DuplicateWarning.jsx
│       │   ├── FilterBar.jsx
│       │   ├── SortableHeader.jsx
│       │   └── CustomFieldsSection.jsx
│       ├── hooks/
│       │   └── useFilter.js
│       └── utils/
│           ├── api.js
│           └── helpers.js
├── scripts/
│   ├── git-sync.sh
│   └── git-sync.ps1
├── docs/
│   └── DB_COVERAGE.md
├── database_schema.sql
├── CHANGELOG.md
└── CLAUDE.md
```

---

## Lizenz

Internes Projekt – nicht zur öffentlichen Nutzung bestimmt.
