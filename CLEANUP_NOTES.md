# Cleanup Notes – 2026-03-23

## Artifact Files (Root)

| File | Status | Action |
|------|--------|--------|
| `Screenshot 2026-03-20 143112.png` | Untracked, no longer needed | **Delete** |
| `error.txt` | SystemPage.jsx error already fixed in commit `6967b7a` | **Delete** |
| `mail.txt` | Plaintext Gmail credentials — **security risk** | **Delete immediately**, credentials belong in `backend/.env` only |

---

## Unused API Methods (`frontend/src/utils/api.js`)

### Redundant Duplicates (safe to remove)
| Method | Line | Why Unused | Verdict |
|--------|------|-----------|---------|
| `getTicketMessages(ticketnr)` | 46 | Duplicate of `getMessages` (line 51), which is itself unused — actual usage goes through `TicketDetail` inline fetch | **Remove** — dead alias |
| `addTicketMessage(ticketnr, data)` | 47-48 | Duplicate of `addMessage` (line 52-53), which IS used by `ReplyBox.jsx` | **Remove** — `addMessage` covers this |
| `getMessages(ticketnr)` | 51 | Alias of `getTicketMessages`, but nothing imports it either — `TicketDetail` fetches messages directly | **Remove** — dead alias |

### Potentially Useful (keep for now)
| Method | Line | Why Unused | Verdict |
|--------|------|-----------|---------|
| `deleteKunde(kundennummer)` | 112 | Backend `DELETE /api/kunden/:id` route exists, but UI has no delete button for Kunden | **Keep** — needed when Kunden delete UI is added |
| `updateCustomFieldDefinition(table, key, data)` | 216 | Backend `PUT /api/custom-fields/definitions/:table/:key` exists, StammdatenPage only creates/deletes | **Keep** — needed when inline-edit of custom field definitions is added |
| `updateCustomFieldOption(table, key, value, data)` | 220 | Backend `PUT /api/custom-fields/options/:table/:key/:value` exists, StammdatenPage only creates/deletes | **Keep** — needed when inline-edit of custom field options is added |

---

## Unused CSS (`frontend/src/styles/global.css`)

| Selector | Line | Verdict |
|----------|------|---------|
| `.grid-3` | 535 | 3-column grid layout, only `.grid-2` is used anywhere. **Keep** — useful utility class for future layouts (e.g. dashboard rework, detail pages). Costs nothing in bundle. |

---

## Security Scan

| Check | Result |
|-------|--------|
| `.env` in `.gitignore` | Yes — `backend/.env` and `.env` both excluded |
| `mail.txt` ever committed | No — gitignored and never in history |
| Secrets hardcoded in source | None found — all passwords use `process.env` or bcrypt hashes |
| Dummy hash in `auth.js:10` | Intentional — timing-attack protection (documented in CLAUDE.md) |

---

## Console.log Audit

### Frontend
**None found** — clean.

### Backend
| File | Count | Verdict |
|------|-------|---------|
| `server.js:125` | 1 | Startup message (`Server läuft auf Port...`) — **Keep**, standard for Express |
| `emailService.js` | 12 | IMAP polling status, match results, attachment logs — **Keep**, operational logging for email subsystem. Consider replacing with a proper logger (e.g. `pino`) in a future session. |

---

## TODO/FIXME/HACK Comments

**None found** — clean.

---

## Dependency Vulnerabilities (`npm audit`)

### Backend — 5 high
| Package | Issue | Fix |
|---------|-------|-----|
| `xlsx` | Prototype Pollution + ReDoS | **No fix available** — consider switching to `exceljs` or `sheetjs-ce` |
| `imap` → `utf7` → `semver` | Vulnerable transitive deps | Upstream `imap` package is unmaintained — consider `imapflow` as replacement |

### Frontend — 2 moderate
| Package | Issue | Fix |
|---------|-------|-----|
| `esbuild` ≤0.24.2 | Dev server request leak | Fix via `npm audit fix --force` (upgrades Vite to v8 — **breaking change**, test first) |

---

## Summary

**Delete now:** 3 root artifact files, 3 redundant API aliases
**Keep:** `deleteKunde`, `updateCustomFieldDefinition`, `updateCustomFieldOption`, `.grid-3`
**Security:** No leaked secrets. `mail.txt` is gitignored and never committed, but should still be deleted.
**Logging:** Frontend clean. Backend emailService has operational console.logs — acceptable, but a structured logger would be better long-term.
**Vulnerabilities:** `xlsx` and `imap` have known issues with no direct fix — consider alternative packages in a future session.
