'use strict';

const crypto = require('crypto');
const store = new Map();
const TTL = 15 * 60 * 1000; // 15 minutes

function cleanup() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now - entry.createdAt > TTL) store.delete(id);
  }
}

function storeUpload(columns, rows) {
  cleanup();
  const id = crypto.randomUUID();
  store.set(id, { columns, rows, totalRows: rows.length, createdAt: Date.now() });
  return id;
}

function getUpload(id) {
  cleanup();
  return store.get(id) || null;
}

function removeUpload(id) {
  store.delete(id);
}

module.exports = { storeUpload, getUpload, removeUpload };
