-- Migration 008: SLA response_time_h zu service_priority hinzufügen
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_priority' AND column_name = 'response_time_h'
  ) THEN
    ALTER TABLE service_priority ADD COLUMN response_time_h INTEGER;
  END IF;
END $$;

-- Standardwerte für bestehende Einträge
UPDATE service_priority SET response_time_h = 72 WHERE service_priority_name = 'Standard' AND response_time_h IS NULL;
UPDATE service_priority SET response_time_h = 24 WHERE service_priority_name = 'Premium'  AND response_time_h IS NULL;
UPDATE service_priority SET response_time_h = 4  WHERE service_priority_name = 'VIP'      AND response_time_h IS NULL;
