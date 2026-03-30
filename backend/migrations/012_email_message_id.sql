-- Add email_message_id column for deduplication (RFC Message-ID header)
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS email_message_id VARCHAR(512);
ALTER TABLE unmatched_emails ADD COLUMN IF NOT EXISTS email_message_id VARCHAR(512);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_messages_email_mid
  ON ticket_messages(email_message_id) WHERE email_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unmatched_emails_email_mid
  ON unmatched_emails(email_message_id) WHERE email_message_id IS NOT NULL;
