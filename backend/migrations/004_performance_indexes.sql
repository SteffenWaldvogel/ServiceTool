-- Performance-Indizes für häufig gefilterte Spalten
CREATE INDEX IF NOT EXISTS idx_ticket_status    ON ticket(status_id);
CREATE INDEX IF NOT EXISTS idx_ticket_kunden    ON ticket(ticket_kundennummer);
CREATE INDEX IF NOT EXISTS idx_ticket_erstellt  ON ticket(erstellt_am DESC);
CREATE INDEX IF NOT EXISTS idx_messages_ticket  ON ticket_messages(ticketnr);
CREATE INDEX IF NOT EXISTS idx_messages_type    ON ticket_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_ap_kunden        ON ansprechpartner(ansprechpartner_kundennr);
