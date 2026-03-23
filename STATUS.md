# Project Status – 2026-03-23

## Systems
- **Frontend**: React 18 + Vite (Port 5173)
- **Backend**: Express.js (Port 3001)
- **Database**: PostgreSQL 18 (local)
- **Email**: ticket@hokubema-manuals.de via one.com (IMAP + SMTP)
- **AI**: Claude API (Haiku + Sonnet) — needs $5 credits on console.anthropic.com

## Progress

### Phase 1 – MVP (100% complete)
- Ticket CRUD + Messages + Email-Integration
- Kundenverwaltung (Multi-Email/Telefon, Ansprechpartner)
- Maschinen + Ersatzteile + Kompatibilität
- Dashboard (Stat Tiles, Charts, Zeitfilter, Techniker-Verteilung)
- Volltextsuche + Highlight + Debounce
- CSV Export + CSV/Excel Import
- Auth + RBAC (3 Rollen, 25 Permissions)
- Duplikatserkennung (Levenshtein)
- QuickCreate (inline Entitäten-Anlage)
- Custom Fields pro Entität
- Audit Log (PostgreSQL Triggers)
- SLA Tracking + Bulk-Aktionen
- Ticket Linking + Merging
- Deployment (PM2, Nginx, CI/CD, Backup)
- Sentry Monitoring (optional)

### Phase 1 Bonus (100% complete)
- Notification System (6 Event-Typen, Email-Alerts, per-User Präferenzen)
- User Kontaktdaten (Email, Telefon, 6 Notify-Checkboxen)
- Posteingang Redesign (Master-Detail, Side-by-Side Ticket-Erstellung, QuickCreate)
- Anhänge-Fix (IMAP Binary, PDF Viewer, Blob-URLs)
- ReplyBox als Modal-Overlay
- Detaillierte Benachrichtigungen (Kunde, Maschine, Kategorie, SLA, etc.)
- Generisches Email-Setup (one.com / Gmail fallback)

### Phase 2 – AI & Advanced (45%)
- ✅ Claude AI Backend (aiService.js + routes/ai.js)
- ✅ Email-Analyse (Haiku, automatisch bei unmatched + manuell)
- ✅ Antwort-Vorschlag (Sonnet, Button in TicketDetail)
- ✅ Zusammenfassung (Haiku, Button in TicketDetail)
- ✅ Ähnliche Tickets API (/api/ai/similar)
- ⏳ API Credits aufladen ($5 Minimum) — **BLOCKER**
- ⏳ Ähnliche Tickets Frontend-Integration
- ⏳ Advanced Reporting (Trend-Charts, SLA Compliance)
- ⏳ Mobile Responsive CSS

### Phase 3+ (Planned)
- Mobile App
- Customer Self-Service Portal

## TODOs

### Blocker
- [ ] Anthropic API Credits aufladen ($5 auf console.anthropic.com)

### Next Features
- [ ] Ähnliche Tickets im Frontend anzeigen
- [ ] Advanced Reporting — Trends, SLA Compliance, exportierbar
- [ ] Mobile Responsive CSS

### Tech Debt
- [ ] `xlsx` ersetzen — Prototype Pollution Vulnerability, kein Fix verfügbar
- [ ] `imap` ersetzen durch `imapflow` — Package ist unmaintained
- [ ] Vite auf v8 upgraden — esbuild dev server vulnerability (breaking change)
- [ ] Structured Logger (pino) statt console.log in emailService

### Cleanup
- [ ] Dead API aliases entfernen: `getTicketMessages`, `addTicketMessage`, `getMessages` (siehe CLEANUP_NOTES.md)

## Session History
| Session | Datum | Schwerpunkt |
|---------|-------|-------------|
| 1–4 | 2026-03-18 | Core Build: Tickets, Kunden, Maschinen, Filter, QuickCreate, Audit |
| 5 | 2026-03-18 | Email-Kommunikation (IMAP/SMTP, Thread, Reply, Unmatched) |
| 6 | 2026-03-18 | Auth, Fonts, Performance, Polling |
| 7 | 2026-03-18 | RBAC (3 Rollen, 25 Permissions) |
| 8 | 2026-03-18 | Security Hardening (Helmet, Rate-Limit, Validator) |
| 9 | 2026-03-18 | Ticket-Zuweisung an Techniker |
| 11 | 2026-03-18 | Dashboard-Erweiterungen |
| 12 | 2026-03-19 | Deployment (PM2, Nginx, Backup, CI/CD) |
| 13 | 2026-03-19 | Volltextsuche + Highlight |
| 14 | 2026-03-19 | CSV Export |
| 15 | 2026-03-19 | SLA Tracking |
| 16 | 2026-03-19 | Sentry + Bulk-Aktionen |
| 17 | 2026-03-20 | Email-Anhänge, Import, Ticket-Verknüpfung, Posteingang |
| 18 | 2026-03-23 | Notifications, Email-Setup, Posteingang-Redesign, Anhänge-Fix, Claude AI |

## Kosten
| Posten | Monatlich |
|--------|-----------|
| Hosting (lokal) | €0 |
| Email (one.com) | im Domain-Paket |
| Claude AI (geschätzt) | ~$6–9 |
| Sentry (Free Tier) | €0 |
| GitHub (Free) | €0 |
| **Gesamt** | **~$6–9/Monat** |
