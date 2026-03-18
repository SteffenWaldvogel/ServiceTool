# Database UI Coverage

Documents which database tables have full UI coverage, partial coverage, or no direct UI.

## Coverage Status

| Table | UI Coverage | Page / Component | Notes |
|-------|-------------|-----------------|-------|
| `ticket` | Full | TicketList, TicketDetail | CRUD, messages, custom fields |
| `ticket_messages` | Full | TicketDetail (messages section) | Read + create |
| `kunden` | Full | KundenList, KundenDetail | CRUD + emails + telefon |
| `kunden_emails` | Full | KundenDetail | Managed inline in Kunden |
| `kunden_telefonnummern` | Full | KundenDetail | Managed inline in Kunden |
| `ansprechpartner` | Full | AnsprechpartnerList, AnsprechpartnerDetail, KundenDetail | Standalone + nested |
| `maschine` | Full | MaschinenList, MaschinenDetail | CRUD + custom fields |
| `maschinentyp` | Full | StammdatenPage (Maschinentypen tab) | Admin CRUD |
| `ersatzteile` | Full | ErsatzteileList, ErsatzteileDetail | CRUD + Kompatibilität |
| `ersatzteile_maschinentyp_baujahr` | Full | ErsatzteileDetail | Managed inline |
| `ersatzteile_maschinentyp_nummer` | Full | ErsatzteileDetail | Managed inline |
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
| `audit_log` | Read-only | SystemPage (Audit-Log) | Filter + paginated view, no write UI (by design) |

## Views (read-only, no direct UI)

| View | Notes |
|------|-------|
| `v_kunden_mit_kontakt` | Aggregation used internally; Kunden list shows same data |
| `v_tickets_mit_details` | Data shown via JOIN queries in TicketList/TicketDetail |
| `v_ersatzteile_kompatibilität` | Data shown via JOIN queries in ErsatzteileDetail |

## Tables with no direct UI (reference / infrastructure)

| Table | Reason |
|-------|--------|
| `audit_log` | Read-only; triggers not yet active – no write UI needed |

## API Route Coverage

| Route prefix | File | Entity |
|---|---|---|
| `/api/tickets` | routes/tickets.js | ticket, ticket_messages, ticket_custom_fields |
| `/api/kunden` | routes/kunden.js | kunden, kunden_emails, kunden_telefonnummern, ansprechpartner (nested), kunden_custom_fields |
| `/api/ansprechpartner` | routes/ansprechpartner.js | ansprechpartner (standalone) |
| `/api/maschinen` | routes/maschinen.js | maschine, maschine_custom_fields |
| `/api/maschinentypen` | routes/maschinentypen.js | maschinentyp |
| `/api/ersatzteile` | routes/ersatzteile.js | ersatzteile, ersatzteile_maschinentyp_baujahr, ersatzteile_maschinentyp_nummer, ersatzteile_custom_fields |
| `/api/lookup` | routes/lookup.js | read-only dropdowns + dashboard stats |
| `/api/stammdaten` | routes/stammdaten.js | service_priority, abteilung, position, kategorie, kritikalität, status |
| `/api/custom-fields` | routes/customFieldsAdmin.js | custom_field_definitions, custom_field_options |
| `/api/system` | routes/system.js | audit_log (read-only) |
