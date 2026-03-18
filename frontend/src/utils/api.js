const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── Tickets ──────────────────────────────────────────────────────────────
  getTickets: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/tickets${q ? '?' + q : ''}`);
  },
  getTicket: (ticketnr) => request(`/tickets/${ticketnr}`),
  createTicket: (data) => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  updateTicket: (ticketnr, data) => request(`/tickets/${ticketnr}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTicket: (ticketnr) => request(`/tickets/${ticketnr}`, { method: 'DELETE' }),

  // Ticket messages
  getTicketMessages: (ticketnr) => request(`/tickets/${ticketnr}/messages`),
  addTicketMessage: (ticketnr, data) =>
    request(`/tickets/${ticketnr}/messages`, { method: 'POST', body: JSON.stringify(data) }),

  // Aliases used by new components
  getMessages: (ticketnr) => request(`/tickets/${ticketnr}/messages`),
  addMessage: (ticketnr, data) =>
    request(`/tickets/${ticketnr}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  sendReply: (ticketnr, data) =>
    request(`/tickets/${ticketnr}/reply`, { method: 'POST', body: JSON.stringify(data) }),
  linkMessage: (ticketnr, messageId) =>
    request(`/tickets/${ticketnr}/link-message`, { method: 'POST', body: JSON.stringify({ message_id: messageId }) }),
  getUnmatchedEmails: () => request('/tickets/unmatched'),
  assignUnmatchedEmail: (unmatchedId, ticketnr) =>
    request(`/tickets/unmatched/${unmatchedId}/assign`, { method: 'POST', body: JSON.stringify({ ticketnr }) }),

  // Dashboard stats alias
  getStats: () => request('/lookup/dashboard-stats'),

  // ── Kunden ───────────────────────────────────────────────────────────────
  getKunden: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/kunden${q ? '?' + q : ''}`);
  },
  getKunde: (kundennummer) => request(`/kunden/${kundennummer}`),
  getKundenTickets: (kundennummer) => request(`/kunden/${kundennummer}/tickets`),
  // createKunde: body = { name_kunde, matchcode, zusatz, straße, hausnr, plz, ort, land,
  //   service_priority_id, bemerkung_kunde, emails: ['e1','e2'], telefonnummern: ['t1','t2'] }
  createKunde: (data) => request('/kunden', { method: 'POST', body: JSON.stringify(data) }),
  updateKunde: (kundennummer, data) =>
    request(`/kunden/${kundennummer}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteKunde: (kundennummer) => request(`/kunden/${kundennummer}`, { method: 'DELETE' }),

  // Ansprechpartner - requires abteilung_id and position_id
  createAnsprechpartner: (kundennummer, data) =>
    request(`/kunden/${kundennummer}/ansprechpartner`, { method: 'POST', body: JSON.stringify(data) }),
  updateAnsprechpartner: (kundennummer, apId, data) =>
    request(`/kunden/${kundennummer}/ansprechpartner/${apId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnsprechpartner: (kundennummer, apId) =>
    request(`/kunden/${kundennummer}/ansprechpartner/${apId}`, { method: 'DELETE' }),

  // ── Maschinen (global) ───────────────────────────────────────────────────
  getMaschinen: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/maschinen${q ? '?' + q : ''}`);
  },
  getMaschine: (maschinenid) => request(`/maschinen/${maschinenid}`),
  createMaschine: (data) => request('/maschinen', { method: 'POST', body: JSON.stringify(data) }),
  updateMaschine: (maschinenid, data) =>
    request(`/maschinen/${maschinenid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMaschine: (maschinenid) => request(`/maschinen/${maschinenid}`, { method: 'DELETE' }),
  getMaschinenTickets: (maschinenid) => request(`/maschinen/${maschinenid}/tickets`),

  // ── Lookup ───────────────────────────────────────────────────────────────
  getStatus: () => request('/lookup/status'),
  getKategorien: () => request('/lookup/kategorien'),
  getKritikalitaeten: () => request('/lookup/kritikalitaeten'),
  getMaschinentypen: () => request('/lookup/maschinentypen'),
  getServicePriorities: () => request('/lookup/service-priorities'),
  getAbteilungen: () => request('/lookup/abteilungen'),
  getPositionen: (abteilung_id) => {
    const q = abteilung_id ? `?abteilung_id=${abteilung_id}` : '';
    return request(`/lookup/positionen${q}`);
  },
  getDashboardStats: () => request('/lookup/dashboard-stats'),
  getCustomFieldDefs: (tableName) => request(`/lookup/custom-fields/${tableName}`),

  // ── Custom Fields ─────────────────────────────────────────────────────────
  getCustomFields: (entity, id) => request(`/${entity}/${id}/custom-fields`),
  saveCustomFields: (entity, id, data) =>
    request(`/${entity}/${id}/custom-fields`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Maschinentypen CRUD ──────────────────────────────────────────────────
  createMaschinentyp: (data) => request('/maschinentypen', { method: 'POST', body: JSON.stringify(data) }),
  updateMaschinentyp: (id, data) => request(`/maschinentypen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMaschinentyp: (id) => request(`/maschinentypen/${id}`, { method: 'DELETE' }),

  // ── Stammdaten CRUD ──────────────────────────────────────────────────────
  // Service-Prioritäten
  getServicePrioritiesAdmin: () => request('/stammdaten/service-priority'),
  createServicePriority: (data) => request('/stammdaten/service-priority', { method: 'POST', body: JSON.stringify(data) }),
  updateServicePriority: (id, data) => request(`/stammdaten/service-priority/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteServicePriority: (id) => request(`/stammdaten/service-priority/${id}`, { method: 'DELETE' }),

  // Abteilungen
  getAbteilungenAdmin: () => request('/stammdaten/abteilungen'),
  createAbteilung: (data) => request('/stammdaten/abteilungen', { method: 'POST', body: JSON.stringify(data) }),
  updateAbteilung: (id, data) => request(`/stammdaten/abteilungen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAbteilung: (id) => request(`/stammdaten/abteilungen/${id}`, { method: 'DELETE' }),

  // Positionen
  getPositionenAdmin: () => request('/stammdaten/positionen'),
  createPosition: (data) => request('/stammdaten/positionen', { method: 'POST', body: JSON.stringify(data) }),
  updatePosition: (id, data) => request(`/stammdaten/positionen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePosition: (id) => request(`/stammdaten/positionen/${id}`, { method: 'DELETE' }),

  // Kategorien
  getKategorienAdmin: () => request('/stammdaten/kategorien'),
  createKategorie: (data) => request('/stammdaten/kategorien', { method: 'POST', body: JSON.stringify(data) }),
  updateKategorie: (id, data) => request(`/stammdaten/kategorien/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteKategorie: (id) => request(`/stammdaten/kategorien/${id}`, { method: 'DELETE' }),

  // Kritikalität
  getKritikalitaetenAdmin: () => request('/stammdaten/kritikalitaet'),
  createKritikalitaet: (data) => request('/stammdaten/kritikalitaet', { method: 'POST', body: JSON.stringify(data) }),
  updateKritikalitaet: (id, data) => request(`/stammdaten/kritikalitaet/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteKritikalitaet: (id) => request(`/stammdaten/kritikalitaet/${id}`, { method: 'DELETE' }),

  // Status
  getStatusAdmin: () => request('/stammdaten/status'),
  createStatus: (data) => request('/stammdaten/status', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, data) => request(`/stammdaten/status/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStatus: (id) => request(`/stammdaten/status/${id}`, { method: 'DELETE' }),

  // ── Ansprechpartner (standalone) ─────────────────────────────────────────
  getAnsprechpartner: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/ansprechpartner${q ? '?' + q : ''}`);
  },
  getAnsprechpartnerById: (id) => request(`/ansprechpartner/${id}`),
  createAnsprechpartnerStandalone: (data) => request('/ansprechpartner', { method: 'POST', body: JSON.stringify(data) }),
  updateAnsprechpartnerStandalone: (id, data) => request(`/ansprechpartner/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnsprechpartnerStandalone: (id) => request(`/ansprechpartner/${id}`, { method: 'DELETE' }),

  // ── System ────────────────────────────────────────────────────────────────
  getAuditLog: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/system/audit-log${q ? '?' + q : ''}`);
  },

  // ── Custom Fields Admin ───────────────────────────────────────────────────
  getCustomFieldDefinitions: (tableName) => request(`/custom-fields/definitions${tableName ? '?table_name=' + tableName : ''}`),
  createCustomFieldDefinition: (data) => request('/custom-fields/definitions', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomFieldDefinition: (table, key, data) => request(`/custom-fields/definitions/${table}/${key}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomFieldDefinition: (table, key) => request(`/custom-fields/definitions/${table}/${key}`, { method: 'DELETE' }),
  getCustomFieldOptions: (table, key) => request(`/custom-fields/options/${table}/${key}`),
  createCustomFieldOption: (data) => request('/custom-fields/options', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomFieldOption: (table, key, value, data) => request(`/custom-fields/options/${table}/${key}/${value}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomFieldOption: (table, key, value) => request(`/custom-fields/options/${table}/${key}/${value}`, { method: 'DELETE' }),

  // ── Dubletten-Matching ────────────────────────────────────────────────────
  matchKunden: (data) => request('/kunden/match', { method: 'POST', body: JSON.stringify(data) }),
  matchAnsprechpartner: (data) => request('/ansprechpartner/match', { method: 'POST', body: JSON.stringify(data) }),
  matchMaschinen: (data) => request('/maschinen/match', { method: 'POST', body: JSON.stringify(data) }),

  // ── Ersatzteile ──────────────────────────────────────────────────────────
  getErsatzteile: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/ersatzteile${q ? '?' + q : ''}`);
  },
  getErsatzteil: (artikelnr) => request(`/ersatzteile/${artikelnr}`),
  createErsatzteil: (data) => request('/ersatzteile', { method: 'POST', body: JSON.stringify(data) }),
  updateErsatzteil: (artikelnr, data) =>
    request(`/ersatzteile/${artikelnr}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteErsatzteil: (artikelnr) => request(`/ersatzteile/${artikelnr}`, { method: 'DELETE' }),

  // Kompatibilität Baujahr
  addKompatibilitaetBaujahr: (artikelnr, data) =>
    request(`/ersatzteile/${artikelnr}/kompatibilitaet-baujahr`, { method: 'POST', body: JSON.stringify(data) }),
  deleteKompatibilitaetBaujahr: (artikelnr, data) =>
    request(`/ersatzteile/${artikelnr}/kompatibilitaet-baujahr`, { method: 'DELETE', body: JSON.stringify(data) }),

  // Kompatibilität Nummer
  addKompatibilitaetNummer: (artikelnr, data) =>
    request(`/ersatzteile/${artikelnr}/kompatibilitaet-nummer`, { method: 'POST', body: JSON.stringify(data) }),
  deleteKompatibilitaetNummer: (artikelnr, data) =>
    request(`/ersatzteile/${artikelnr}/kompatibilitaet-nummer`, { method: 'DELETE', body: JSON.stringify(data) }),
};
