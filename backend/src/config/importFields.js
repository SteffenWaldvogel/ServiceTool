'use strict';

const IMPORT_FIELDS = {
  kunden: {
    label: 'Kunden',
    fields: [
      { key: 'name_kunde', label: 'Kundenname', required: true },
      { key: 'matchcode', label: 'Matchcode' },
      { key: 'zusatz', label: 'Zusatz' },
      { key: 'straße', label: 'Straße' },
      { key: 'hausnr', label: 'Hausnummer' },
      { key: 'plz', label: 'PLZ' },
      { key: 'ort', label: 'Ort' },
      { key: 'land', label: 'Land' },
      { key: 'service_priority_name', label: 'Service Priority (Name)', resolve: true },
      { key: 'bemerkung_kunde', label: 'Bemerkung' },
      { key: 'emails', label: 'E-Mail (kommagetrennt)', multi: true },
      { key: 'telefonnummern', label: 'Telefon (kommagetrennt)', multi: true },
    ],
  },
  maschinen: {
    label: 'Maschinen',
    fields: [
      { key: 'maschinennr', label: 'Maschinennummer', required: true },
      { key: 'bezeichnung', label: 'Bezeichnung' },
      { key: 'maschinentyp_name', label: 'Maschinentyp (Name)', required: true, resolve: true },
      { key: 'baujahr', label: 'Baujahr', type: 'number' },
    ],
  },
  ersatzteile: {
    label: 'Ersatzteile',
    fields: [
      { key: 'bezeichnung', label: 'Bezeichnung', required: true },
      { key: 'zusätzliche_bezeichnungen', label: 'Zusätzliche Bezeichnungen' },
      { key: 'zusatzinfos', label: 'Zusatzinfos' },
      { key: 'bemerkung_ersatzteil', label: 'Bemerkung' },
    ],
  },
  ansprechpartner: {
    label: 'Ansprechpartner',
    fields: [
      { key: 'ansprechpartner_name', label: 'Name', required: true },
      { key: 'kunde_name', label: 'Kunde (Name)', required: true, resolve: true },
      { key: 'abteilung_name', label: 'Abteilung (Name)', resolve: true },
      { key: 'position_name', label: 'Position (Name)', resolve: true },
      { key: 'ansprechpartner_email', label: 'E-Mail' },
      { key: 'ansprechpartner_telefon', label: 'Telefon' },
    ],
  },
};

module.exports = IMPORT_FIELDS;
