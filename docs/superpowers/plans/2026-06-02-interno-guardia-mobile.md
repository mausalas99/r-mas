# Modo Interno (MIP) — Guardia móvil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar una micro-app web móvil por QR de sala para que MIPs registren signos vitales y glucometrías; los datos sincronizan a Estado actual y Modo Guardia del residente con alertas de alteración.

**Architecture:** Router Express dedicado `/api/interno/v1` con auth por token de sala; UI estática en `public/interno/`; scope desde `active_guardias` entregados al R1 de guardia; mutaciones vía `appendMedicion` + LAN broadcast; polling 30s + WebSocket `interno:<sala>`.

**Tech Stack:** Node/Express, better-sqlite3 (clinical DB), existing `lan-squad` conflict resolver + ws-hub, vanilla ES modules en frontend interno.

**Spec:** [2026-06-02-interno-guardia-mobile-design.md](../specs/2026-06-02-interno-guardia-mobile-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/db/schema.mjs` | Migration `sala_interno_access` |
| `lib/db/clinical-access-db.mjs` | get/rotate/toggle sala token |
| `lib/interno/interno-scope.mjs` | Patients visible to interno board |
| `lib/interno/interno-board.mjs` | Build board DTO (banners, pendientes) |
| `lib/interno/interno-vitals.mjs` | Build medición + alteredAt + glu check |
| `lib/interno/interno-router.js` | HTTP + WS endpoints |
| `lib/interno/interno-scope.test.mjs` | Scope unit tests |
| `lib/interno/interno-vitals.test.mjs` | Vitals builder tests |
| `lib/interno/interno-router.test.mjs` | Router integration tests |
| `public/interno/index.html` | Mobile shell + sala slug from path |
| `public/interno/interno-app.mjs` | Board UI, modal, poll, WS client |
| `public/interno/interno.css` | High-density mobile styles |
| `public/interno/host-discovery.mjs` | LAN host probe (reuse lan discovery pattern) |
| `public/js/features/interno-qr-panel.mjs` | R4/Admin QR management in guardia hub |
| `lib/db/ipc-handlers.mjs` | IPC for token CRUD from renderer |
| `preload.js` | Expose interno admin IPC |
| `server.js` | Mount interno router + WS path |
| `lan-squad/ws-hub.js` | Optional: export room broadcast helper for interno channel |
| `public/js/features/guardia-board.mjs` | Refresh on interno sync event |

---

### Task 1: Schema + token storage

**Files:**
- Modify: `lib/db/schema.mjs`
- Modify: `lib/db/clinical-access-db.mjs`
- Create: `lib/db/sala-interno-access.test.mjs`

- [ ] **Step 1: Write failing test for bootstrap tokens**

```javascript
// lib/db/sala-interno-access.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
// open in-memory DB, run migrations, assert 3 sala rows with tokens
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test lib/db/sala-interno-access.test.mjs`

- [ ] **Step 3: Add table + bootstrap in schema.mjs**

```sql
CREATE TABLE IF NOT EXISTS sala_interno_access (
  sala TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  rotated_at TEXT,
  rotated_by TEXT
);
```

Insert `Sala 1`, `Sala 2`, `Sala E` with `crypto.randomBytes(32).toString('hex')` on first migration.

- [ ] **Step 4: Add helpers in clinical-access-db.mjs**

`getSalaInternoAccess(db, sala)`, `rotateSalaInternoToken(db, sala, userId)`, `setSalaInternoActive(db, sala, active)`, `listSalaInternoAccess(db)`.

- [ ] **Step 5: Run test — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.mjs lib/db/clinical-access-db.mjs lib/db/sala-interno-access.test.mjs
git commit -m "feat(interno): schema and sala access token storage"
```

---

### Task 2: Interno scope + board builder

**Files:**
- Create: `lib/interno/interno-scope.mjs`
- Create: `lib/interno/interno-board.mjs`
- Create: `lib/interno/interno-scope.test.mjs`

- [ ] **Step 1: Write failing tests for scope**

Cases:
- Patient in sala with active_guardia to R1 guardia on-call → included
- Patient in sala but covering_user not R1 guardia → excluded
- Wrong sala → excluded
- Empty guardias → empty board

Reuse logic patterns from `public/js/clinico-access.mjs` (`salaOnCallR1` equivalent on server — may need port or shared module).

- [ ] **Step 2: Run tests — FAIL**

- [ ] **Step 3: Implement `resolveInternoBoardPatients(db, clinicalOps, sala, now)`**

Returns patient rows joined with `active_guardias` meta.

- [ ] **Step 4: Implement `buildInternoBoardDto(patients, guardiasMap)`**

Map to spec JSON; reuse `calcVitalsBanner` — extract shared pure fn to `lib/interno/vitals-banner.mjs` (copy from unified-patient-grid-board) to avoid importing renderer bundle.

Parse `pendientes_json` lines; optional time regex `(\d{1,2}:\d{2})`.

- [ ] **Step 5: Run tests — PASS**

- [ ] **Step 6: Commit**

---

### Task 3: Vitals submission builder

**Files:**
- Create: `lib/interno/interno-vitals.mjs`
- Create: `lib/interno/interno-vitals.test.mjs`

- [ ] **Step 1: Write failing tests**

- Valid vitals → medición with id, recordedAt, alteredAt for FC out of range
- Glu 220 → flagged altered (glu key in snapshot metadata or separate `gluAltered: true` on medición)
- Empty payload → error
- Optional reporterName → recordedBy block

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement using shared logic**

Import `appendMedicion`, `medicionHasCoreData`, `buildAlteredAtDefaults` from `public/js/features/estado-actual-data.mjs` and `estado-actual-ranges.mjs` (Node-compatible).

Glu thresholds: `< 70` or `> 180` → set `alteredAt.glu` or array flag on glucometría entry.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

---

### Task 4: Express router + vitals POST

**Files:**
- Create: `lib/interno/interno-router.js`
- Modify: `server.js`
- Create: `lib/interno/interno-router.test.mjs`

- [ ] **Step 1: Write failing integration test**

Spin minimal Express app with mock store; GET `/board` with valid token; POST `/vitals` updates patient.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement router**

Middleware `validateInternoToken(req, res, next)` reads `X-Interno-Token` + sala from query.

GET `/board`: check `is_active`, return DTO.

POST `/vitals`: scope check, build medición, apply patient mutation through existing lan store/resolver, update `last_vitals_check` in clinical DB via host's db manager.

- [ ] **Step 4: Mount in server.js**

```javascript
const { createInternoRouter } = require('./lib/interno/interno-router.js');
appExpress.use('/api/interno/v1', createInternoRouter({ store: lanStore, getDb: () => lanDbManager }));
```

Add rate limiter (60/min POST).

- [ ] **Step 5: Run tests — PASS**

- [ ] **Step 6: Commit**

---

### Task 5: WebSocket channel

**Files:**
- Modify: `lib/interno/interno-router.js`
- Modify: `lan-squad/ws-hub.js` (if needed for second WS path)

- [ ] **Step 1: Add WS upgrade path `/api/interno/v1/ws`**

Auth message within 3s: `{ type: 'auth', token, sala }`. Join room `interno:Sala 1`.

- [ ] **Step 2: Broadcast on vitals POST**

`broadcastInterno(sala, { type: 'board-changed' })`.

- [ ] **Step 3: Manual test with wscat**

- [ ] **Step 4: Commit**

---

### Task 6: Mobile micro-app UI

**Files:**
- Create: `public/interno/index.html`
- Create: `public/interno/interno-app.mjs`
- Create: `public/interno/interno.css`
- Create: `public/interno/host-discovery.mjs`

- [ ] **Step 1: HTML shell**

Parse sala from path `/interno/sala-1` → `Sala 1`. Read `?t=` token from URL (stored sessionStorage).

- [ ] **Step 2: host-discovery.mjs**

Probe `GET http://{candidate}/api/interno/v1/ping` across LAN candidates (reuse discovery list from lan-sync if extractable, else scan subnet last octet heuristic + localhost).

- [ ] **Step 3: Board render**

Compact rows, expand panel, summary header counts.

- [ ] **Step 4: Vitals modal**

Fields: tas, tad, fc, fr, temp, sat; glucometrías dynamic list; optional name; submit POST.

- [ ] **Step 5: Polling 30s + WS reconnect**

On `board-changed`, refetch board.

- [ ] **Step 6: CSS — touch-friendly, dark mode tokens**

- [ ] **Step 7: Manual test on phone simulator / narrow viewport**

- [ ] **Step 8: Commit**

---

### Task 7: R4/Admin QR panel

**Files:**
- Create: `public/js/features/interno-qr-panel.mjs`
- Modify: `lib/db/ipc-handlers.mjs`, `preload.js`
- Modify: `public/js/features/lan-hub-panel-shell.mjs` or `lan-sync.mjs` (guardia hub)

- [ ] **Step 1: IPC handlers**

`dbInternoListAccess`, `dbInternoRotateToken`, `dbInternoSetActive`.

- [ ] **Step 2: Panel UI per sala**

Toggle active, regenerate, show URL `http://{lanHost}/interno/sala-1?t={token}`, QR canvas (use lightweight QR lib or SVG generator already in repo if any; else add minimal dependency).

Print button → `window.print()` on QR card.

- [ ] **Step 3: Gate with `canConfigureRotation` or new `canManageInternoQr(user)` → R4 + Admin**

- [ ] **Step 4: Commit**

---

### Task 8: Resident sync + guardia alerts

**Files:**
- Modify: `public/js/features/guardia-board.mjs`
- Modify: `public/js/clinical-access-runtime.mjs` (light)

- [ ] **Step 1: On `patients-updated` sync, re-render guardia board if active**

Already partially exists — verify monitoreo historial triggers chip banner refresh.

- [ ] **Step 2: Add visual flag on chip when latest medición has alteredAt**

In `enrichPatientForGuardiaCard`, check last historial entry for altered vitals/glu → `vitalsAltered: true`.

- [ ] **Step 3: Optional toast when guardiaMode && vitalsAltered incoming**

- [ ] **Step 4: Commit**

---

### Task 9: End-to-end verification

- [ ] **Step 1: Run full unit test suite**

`npm test` or project test command for new interno tests.

- [ ] **Step 2: Manual E2E checklist**

1. R1 entrega paciente a R1 guardia con pendientes + frecuencia 2h
2. R4 abre panel QR, copia link
3. Abrir link en móvil → paciente visible
4. Registrar FC 130 + glu 210 → residente ve alteración en Modo Guardia y EA
5. Desactivar token → 403
6. Regenerar token → link viejo 403

- [ ] **Step 3: Update README snippet (optional, only if user wants docs)**

---

## Notes for implementer

- **Do not** route interno through `evaluateClinicalScope` — separate token auth avoids creating ghost users.
- **Reuse** `appendMedicion` — do not duplicate monitoreo merge logic.
- **pendientes_json** is newline-separated strings from entrega modal; parse conservatively.
- **QR permanente:** URL path is stable; only `?t=` changes on regenerate — reprint QR when token rotates.
- Glucometría UI: allow multiple entries like `estado-actual-panel.mjs` parseFormMedicion glu section (simplified).
