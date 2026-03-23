# Database UI Coverage

Documents which database tables have full UI coverage, partial coverage, or no direct UI.

## Coverage Status

| Table | UI Coverage | Page / Component | Notes |
|-------|-------------|-----------------|-------|
| `ticket` | Full | TicketList, TicketDetail | CRUD, messages, custom fields |
| `ticket_messages` | Full | TicketDetail (messages section) | Read + create |
| `ticket_links` | Full | TicketDetail (Verknüpfungen section) | Link/unlink related tickets |
| `ticket_attachments` | Full | TicketDetail (messages section) | File attachments on messages |
| `kunden` | Full | KundenList, KundenDetail | CRUD + emails + telefon |
| `kunden_emails` | Full | KundenDetail | Managed inline in Kunden |
| `kunden_telefonnummern` | Full | KundenDetail | Managed inline in Kunden |
| `ansprechpartner` | Full | AnsprechpartnerList, AnsprechpartnerDetail, KundenDetail | Standalone + nested |
| `maschine` | Full | MaschinenList, MaschinenDetail | CRUD + custom fields |
| `maschinentyp` | Full | StammdatenPage (Maschinentypen tab) | Admin CRUD |
| `ersatzteile` | Full | ErsatzteileList, ErsatzteileDetail | CRUD + Kompatibilität |
| `ersatzteile_maschinentyp_baujahr` | Full | ErsatzteileDetail | Managed inline |
| `ersatzteile_maschinentyp_nummer` | Full | ErsatzteileDetail | Managed inline |
| `users` | Full | BenutzerPage | Admin CRUD for user accounts |
| `roles` | Full | StammdatenPage (Rollen & Rechte tab) | Admin CRUD |
| `permissions` | Full | StammdatenPage (Rollen & Rechte tab, checkbox grid) | Permission definitions |
| `role_permissions` | Full | StammdatenPage (Rollen & Rechte tab) | Role-permission assignments |
| `unmatched_emails` | Full | PosteingangPage, SystemPage (Ungematchte Emails tab) | View + assign unmatched inbound emails |
| `service_priority` | Full | StammdatenPage (Service-Prioritäten tab) | Admin CRUD |
| `abteilung` | Full | StammdatenPage (Abteilungen tab) | Admin CRUD |
| `position` | Full | StammdatenPage (Positionen tab) | Admin CRUD |
| `kategorie` | Full | StammdatenPage (Kategorien tab) | Admin CRUD |
| `kritikalität` | Full | StammdatenPage (Kritikalität tab) | Admin CRUD with Gewichtung-Badge |
| `status` | Full | StammdatenPage (Status tab) | Admin CRUD with Terminal-toggle |
| `custom_field_definitions` | Full | StammdatenPage (Freifelder tab) | Admin CRUD grouped by entity |
| `custom_field_options` | Full | StammdatenPage (Freifelder tab → Optionen) | Sub-table in Freifelder tab |
| `kunden_custom_fields` | Full | KundenDetail (CustomFieldsSection) | Read + edit per field |
| `ansprechpartner_custom_fields` | Full | AnsprechpartnerDetail (CustomFieldsSection) | Read + edit per field |
| `ticket_custom_fields` | Full | TicketDetail (CustomFieldsSection) | Read + edit per field |
| `maschine_custom_fields` | Full | MaschinenDetail (CustomFieldsSection) | Read + edit per field |
| `ersatzteile_custom_fields` | Full | ErsatzteileDetail (CustomFieldsSection) | Read + edit per field |
| `audit_log` | Read-only | SystemPage (Audit-Log) | Filter + paginated view, no write UI (by design); triggers are active |

## Views (read-only, no direct UI)

| View | Notes |
|------|-------|
| `v_kunden_mit_kontakt` | Aggregation used internally; Kunden list shows same data |
| `v_tickets_mit_details` | Data shown via JOIN queries in TicketList/TicketDetail |
| `v_ersatzteile_kompatibilität` | Data shown via JOIN queries in ErsatzteileDetail |

## Tables with no direct UI (reference / infrastructure)

| Table | Reason |
|-------|--------|
| `user_sessions` | Managed by express-session; no direct UI needed (infrastructure) |

## Frontend Pages

| Page | File | Primary tables |
|------|------|---------------|
| Dashboard | Dashboard.jsx | Aggregated stats (read-only) |
| Tickets | TicketList.jsx | ticket |
| Ticket Detail | TicketDetail.jsx | ticket, ticket_messages, ticket_links, ticket_attachments, ticket_custom_fields |
| Kunden | KundenList.jsx | kunden |
| Kunde Detail | KundenDetail.jsx | kunden, kunden_emails, kunden_telefonnummern, ansprechpartner, kunden_custom_fields |
| Maschinen | MaschinenList.jsx | maschine |
| Maschine Detail | MaschinenDetail.jsx | maschine, maschine_custom_fields |
| Ersatzteile | ErsatzteileList.jsx | ersatzteile |
| Ersatzteil Detail | ErsatzteileDetail.jsx | ersatzteile, ersatzteile_maschinentyp_baujahr, ersatzteile_maschinentyp_nummer, ersatzteile_custom_fields |
| Ansprechpartner | AnsprechpartnerList.jsx | ansprechpartner |
| Ansprechpartner Detail | AnsprechpartnerDetail.jsx | ansprechpartner, ansprechpartner_custom_fields |
| Stammdaten | StammdatenPage.jsx | All reference tables + roles, permissions, role_permissions |
| System | SystemPage.jsx | audit_log, unmatched_emails |
| Benutzer | BenutzerPage.jsx | users |
| Login | LoginPage.jsx | users (auth) |
| Import | ImportPage.jsx | CSV/Excel import into various tables |
| Posteingang | PosteingangPage.jsx | unmatched_emails |

## API Route Coverage

| Route prefix | File | Entity |
|---|---|---|
| `/api/auth` | routes/auth.js | users (login, logout, me, change-password) |
| `/api/users` | routes/users.js | users (admin CRUD) |
| `/api/tickets` | routes/tickets.js | ticket, ticket_messages, ticket_custom_fields |
| `/api/tickets/:id/reply` | routes/tickets.js | ticket_messages (email reply) |
| `/api/tickets/:id/links` | routes/tickets.js | ticket_links |
| `/api/tickets/:id/merge` | routes/tickets.js | ticket (merge two tickets) |
| `/api/tickets/unmatched` | routes/tickets.js | unmatched_emails (CRUD) |
| `/api/tickets/bulk` | routes/tickets.js | ticket (bulk update) |
| `/api/tickets/export` | routes/tickets.js | ticket (CSV export) |
| `/api/kunden` | routes/kunden.js | kunden, kunden_emails, kunden_telefonnummern, ansprechpartner (nested), kunden_custom_fields |
| `/api/ansprechpartner` | routes/ansprechpartner.js | ansprechpartner (standalone) |
| `/api/maschinen` | routes/maschinen.js | maschine, maschine_custom_fields |
| `/api/maschinentypen` | routes/maschinentypen.js | maschinentyp |
| `/api/ersatzteile` | routes/ersatzteile.js | ersatzteile, ersatzteile_maschinentyp_baujahr, ersatzteile_maschinentyp_nummer, ersatzteile_custom_fields |
| `/api/import` | routes/import.js | Various (fields, upload, preview, execute) |
| `/api/lookup` | routes/lookup.js | Read-only dropdowns + dashboard stats + users list |
| `/api/stammdaten` | routes/stammdaten.js | service_priority, abteilung, position, kategorie, kritikalität, status, roles, permissions, role_permissions |
| `/api/custom-fields` | routes/customFieldsAdmin.js | custom_field_definitions, custom_field_options |
| `/api/system` | routes/system.js | audit_log (read-only) |
