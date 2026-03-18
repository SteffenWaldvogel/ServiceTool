CREATE TABLE IF NOT EXISTS unmatched_emails (
  id            SERIAL PRIMARY KEY,
  from_email    VARCHAR(255) NOT NULL,
  from_name     VARCHAR(255),
  subject       VARCHAR(500),
  message       TEXT,
  raw_headers   TEXT,
  received_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unmatched_received
  ON unmatched_emails(received_at DESC);

COMMENT ON TABLE unmatched_emails IS
  'Eingehende Emails die keinem Ticket zugeordnet werden konnten';
