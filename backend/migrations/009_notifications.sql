-- Migration 009: Notifications table
-- Run: psql -d servicetickets -f backend/migrations/009_notifications.sql

CREATE TABLE IF NOT EXISTS notifications (
  notification_id  SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_type       VARCHAR(50) NOT NULL,
  title            VARCHAR(255) NOT NULL,
  message          TEXT,
  reference_type   VARCHAR(50),
  reference_id     INTEGER,
  is_read          BOOLEAN DEFAULT false,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications (created_at);
