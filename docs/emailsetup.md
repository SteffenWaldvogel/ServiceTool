# Email Catch-Up & Dedup Setup

## What changed
- **Startup catch-up**: Backend now fetches all emails from the last 48h on startup, regardless of seen/unseen status. No more missed emails after downtime.
- **Dedup**: Each email's RFC Message-ID is stored. Emails already in the system are skipped automatically.
- **Migration 012**: Adds `email_message_id` column to `ticket_messages` and `unmatched_emails` with unique indexes.

## Setup steps (run on new device after git pull)

### 1. Pull latest code
```bash
git pull
```

### 2. Run database migration
```bash
psql -U postgres -d servicetickets -f backend/migrations/012_email_message_id.sql
```

### 3. Restart backend
```bash
cd backend
npm run dev
```

### Verify
On startup the backend log should show:
```
[Email] IMAP verbunden – catch-up + polling alle 30s
[Email] Catch-up: suche Emails seit <timestamp>...
```

No duplicate emails should appear. Previously processed emails are skipped silently.
