# Deployment-Anleitung – Service Tool

Produktions-Setup auf einem internen Windows-Server.

---

## Voraussetzungen

| Software | Version | Download |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| PostgreSQL | 17 | https://www.postgresql.org |
| PM2 | aktuell | `npm install -g pm2` |
| Nginx für Windows | aktuell | https://nginx.org/en/download.html |
| Git | aktuell | https://git-scm.com |

---

## 1. Erstmalige Installation

### Repository klonen

```powershell
cd C:\
git clone <repo-url> ServiceTool
cd ServiceTool
```

### Abhängigkeiten installieren

```powershell
cd C:\ServiceTool\backend
npm ci --omit=dev

cd C:\ServiceTool\frontend
npm ci --omit=dev
```

---

## 2. Datenbank einrichten

```powershell
# PostgreSQL Shell öffnen
psql -U postgres

# Datenbank anlegen
CREATE DATABASE servicetickets;
\q

# Schema + Seed einspielen
psql -U postgres -d servicetickets -f C:\ServiceTool\database_schema.sql
```

Migrations ausführen (falls vorhanden):

```powershell
psql -U postgres -d servicetickets -f C:\ServiceTool\backend\migrations\007_assigned_to.sql
```

---

## 3. Umgebungsvariablen konfigurieren

```powershell
cd C:\ServiceTool\backend
copy .env.example .env
notepad .env
```

Pflichtfelder in `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=servicetickets
DB_USER=postgres
DB_PASSWORD=<dein-db-passwort>

SESSION_SECRET=<64-zeichen-zufallsstring>
# Generieren: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

NODE_ENV=production
CORS_ORIGIN=http://localhost        # oder http://<server-ip>
PORT=3001
```

Für Email-Integration zusätzlich:

```env
GMAIL_USER=<gmail-adresse>
GMAIL_APP_PASSWORD=<app-passwort>
```

---

## 4. Frontend bauen

```powershell
cd C:\ServiceTool\frontend
npm run build
# Ausgabe: frontend/dist/
```

---

## 5. PM2 starten

```powershell
cd C:\ServiceTool

# Backend starten
pm2 start ecosystem.config.js --env production

# Status prüfen
pm2 status
pm2 logs service-tool-backend

# Windows-Autostart einrichten
pm2 save
pm2 startup
# Den angezeigten Befehl als Administrator ausführen
```

Nützliche PM2-Befehle:

```powershell
pm2 status                          # Prozess-Übersicht
pm2 logs service-tool-backend       # Live-Logs
pm2 restart service-tool-backend    # Neustart
pm2 stop service-tool-backend       # Stoppen
pm2 reload ecosystem.config.js      # Zero-Downtime Reload
```

---

## 6. Nginx konfigurieren

### Nginx installieren

1. Nginx für Windows von https://nginx.org/en/download.html herunterladen
2. Entpacken nach `C:\nginx`

### Konfiguration einspielen

```powershell
# Vorhandene Konfig sichern
copy C:\nginx\conf\nginx.conf C:\nginx\conf\nginx.conf.bak

# Projekt-Konfig kopieren
copy C:\ServiceTool\nginx\nginx.conf C:\nginx\conf\nginx.conf
```

**Pfad anpassen** in `C:\nginx\conf\nginx.conf`:

```nginx
root C:/ServiceTool/frontend/dist;
```

→ Auf den tatsächlichen Pfad des `frontend/dist`-Ordners anpassen.

### Nginx starten

```powershell
cd C:\nginx
start nginx

# Test ob Konfig valid ist
nginx -t

# Neustart nach Konfigurationsänderungen
nginx -s reload

# Stoppen
nginx -s stop
```

### Nginx als Windows-Dienst (empfohlen)

Mit NSSM (Non-Sucking Service Manager):

```powershell
# NSSM herunterladen: https://nssm.cc/download
nssm install nginx C:\nginx\nginx.exe
nssm start nginx
```

---

## 7. Backup einrichten

### Manueller Test

```powershell
# DB_PASSWORD als Umgebungsvariable setzen
$env:DB_PASSWORD = "dein-passwort"

# Backup ausführen
.\scripts\backup.ps1
```

### Automatisch via Windows Task Scheduler

1. Task Scheduler öffnen (`taskschd.msc`)
2. **Neue Aufgabe erstellen**:
   - Name: `ServiceTool Backup`
   - Trigger: Täglich, 02:00 Uhr
   - Aktion: `powershell.exe`
   - Argumente: `-NonInteractive -File "C:\ServiceTool\scripts\backup.ps1"`
   - Starten in: `C:\ServiceTool`
3. **Umgebungsvariable** `DB_PASSWORD` in den Task-Eigenschaften setzen

Backups landen in `C:\ServiceTool\backups\` als `.sql.gz`-Dateien.
Backups älter als 30 Tage werden automatisch gelöscht.

---

## 8. Updates deployen

Nach Änderungen im Repository:

```powershell
cd C:\ServiceTool

# Änderungen holen
git pull origin main

# Deploy ausführen (Build + PM2 Reload)
.\scripts\deploy.ps1
```

---

## 9. Logs einsehen

```powershell
# PM2-Logs (Backend)
pm2 logs service-tool-backend
# oder direkt:
type C:\ServiceTool\logs\pm2-out.log
type C:\ServiceTool\logs\pm2-error.log

# Nginx-Logs
type C:\nginx\logs\access.log
type C:\nginx\logs\error.log
```

---

## 10. HTTPS einrichten (optional)

Für HTTPS mit selbst-signiertem Zertifikat:

```powershell
# OpenSSL (kommt mit Git für Windows)
cd C:\nginx\ssl   # Ordner anlegen

openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout key.pem -out cert.pem `
  -subj "/CN=service-tool"
```

Dann in `nginx.conf` den HTTPS-Block auskommentieren und Pfade eintragen.

---

## 11. Troubleshooting

| Problem | Lösung |
|---|---|
| Backend startet nicht | `pm2 logs` prüfen; `.env` vorhanden? SESSION_SECRET gesetzt? |
| 502 Bad Gateway | Backend läuft? `pm2 status`; Port 3001 erreichbar? |
| Weiße Seite / 404 | `frontend/dist/` vorhanden? Nginx `root`-Pfad korrekt? |
| DB-Verbindung schlägt fehl | PostgreSQL läuft? `DB_PASSWORD` korrekt? `pg_hba.conf` erlaubt lokale Verbindungen? |
| Backup schlägt fehl | `DB_PASSWORD` Umgebungsvariable gesetzt? `pg_dump.exe` Pfad korrekt? |
