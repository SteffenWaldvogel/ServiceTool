-- Migration 010: User contact info + notification preferences
-- Run: psql -d servicetickets -f backend/migrations/010_user_contact_notify.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefon VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_ticket_assigned BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_ticket_created BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_status_changed BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_sla_warning BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_unmatched_email BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_high_priority BOOLEAN DEFAULT true;
