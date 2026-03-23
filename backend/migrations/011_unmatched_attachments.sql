-- Migration 011: Attachments for unmatched emails
-- Run: psql -d servicetickets -f backend/migrations/011_unmatched_attachments.sql

CREATE TABLE IF NOT EXISTS unmatched_email_attachments (
  id                SERIAL PRIMARY KEY,
  unmatched_email_id INTEGER NOT NULL REFERENCES unmatched_emails(id) ON DELETE CASCADE,
  filename          VARCHAR(255) NOT NULL DEFAULT 'attachment',
  mime_type         VARCHAR(100) DEFAULT 'application/octet-stream',
  size_bytes        INTEGER DEFAULT 0,
  content           BYTEA,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unmatched_att_email
  ON unmatched_email_attachments(unmatched_email_id);

-- AI suggestion on unmatched emails
ALTER TABLE unmatched_emails ADD COLUMN IF NOT EXISTS ai_suggestion JSONB;
