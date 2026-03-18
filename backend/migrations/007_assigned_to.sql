-- Migration 007: assigned_to Spalte für Ticket-Zuweisung
-- Idempotent: nur ausführen wenn Spalte noch nicht existiert

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE ticket
      ADD COLUMN assigned_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;
