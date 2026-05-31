# SQLCipher Clinical Store & Forensic Audit Ledger — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plaintext `localStorage` clinical payloads and `lan-squad-host-state.json` with a single main-process SQLCipher database, passphrase unlock (Argon2id + optional `safeStorage` remember-me), and an append-only SHA-256 hash-chained forensic audit ledger.

**Architecture:** Blob-first SQLite tables (`clinical_blob`, `lan_host_state`) behind `lib/db/db-manager.mjs` and a serialized `WriteQueue` (reuse `lan-squad/write-queue.js`). Renderer keeps `storage.js` API; writes go through IPC. LAN `host-store.js` swaps atomic JSON for DB transactions without changing router/conflict-resolver contracts.

**Tech Stack:** Electron 41, Node `node:test`, `better-sqlite3-multiple-ciphers` (SQLCipher), `@node-rs/argon2`, Electron `safeStorage`, existing `lan-squad/write-queue.js`, `public/js/app-state.mjs`.

**Spec:** [`docs/superpowers/specs/2026-05-31-sqlcipher-forensic-audit-design.md`](../specs/2026-05-31-sqlcipher-forensic-audit-design.md)

**Prerequisites:** Phase 2 LAN security and Phase 3 host WriteQueue stable on the branch you merge into. Do not ship JSON fallback when native module fails (fail-fast per spec).

**Feature flag (dev only):** `process.env.R_PLUS_LEGACY_STORAGE=1` may keep JSON path for local debugging; must be **unset** in release builds (`electron-builder` env). Production code path: SQLCipher only.

---

## File map

| File | Action |
|------|--------|
| `package.json` | Add deps + `postinstall` electron-rebuild; extend `test` script |
| `scripts/rebuild-native-db.mjs` | Create — rebuild SQLCipher binding for Electron |
| `lib/db/canonical-json.mjs` | Create — sorted-keys stringify for payload hashes |
| `lib/db/canonical-json.test.mjs` | Create |
| `lib/db/forensic-audit.mjs` | Create — genesis, append, verify |
| `lib/db/forensic-audit.test.mjs` | Create |
| `lib/db/schema.mjs` | Create — DDL v1 + `applyMigrations(db)` |
| `lib/db/schema.test.mjs` | Create — uses temp plain sqlite if cipher unavailable in CI |
| `lib/db/crypto.mjs` | Create — Argon2id derive, safeStorage wrap, hex key for SQLCipher |
| `lib/db/crypto.test.mjs` | Create — mock `safeStorage` |
| `lib/db/clinical-blobs.mjs` | Create — upsert/get/loadAll |
| `lib/db/lan-host-persistence.mjs` | Create — single-row host state |
| `lib/db/migrate-from-legacy.mjs` | Create — localStorage map + host JSON import |
| `lib/db/migrate-from-legacy.test.mjs` | Create |
| `lib/db/db-manager.mjs` | Create — unlock/lock/queue/transactions |
| `lib/db/db-manager.test.mjs` | Create |
| `lib/db/db-path.mjs` | Create — `{userData}/rplus-clinical.db` |
| `lib/db/clinical-blob-keys.mjs` | Create — rpc-key ↔ blob_key map |
| `lib/db/ipc-handlers.mjs` | Create — register all `db:*` on `ipcMain` |
| `lib/db/native-load.mjs` | Create — load driver; ABI fail-fast helper |
| `main.js` | Wire `registerDbIpcHandlers`, boot `db:status`, native guard |
| `preload.js` | Expose `electronAPI.db.*` |
| `public/js/db-storage-bridge.mjs` | Create — renderer IPC adapter |
| `public/js/storage.js` | Route clinical getters/setters/saveAll through bridge when unlocked |
| `public/js/app-state.mjs` | Await `hydrateFromDb()` before first `saveState` |
| `public/js/app-boot.mjs` | Gate boot on `db:status` / unlock flow |
| `public/partials/…` or `public/js/features/platform.mjs` | Unlock modal, lock menu, backup buttons, chain verify |
| `lan-squad/host-store.js` | Inject `lanHostPersistence` instead of `atomic-json` writes |
| `lan-squad/host-store.test.js` | Temp DB file instead of temp JSON |
| `server.js` | Ensure host store gets DB manager after unlock |
| `lan-squad/auth-router.js` | Emit `lan.ticket.*` audit via db-manager (when present) |
| `scripts/lib/electron-pack-files.js` | Include native `.node` in pack list if needed |

---

## Clinical blob key map (migration)

| `localStorage` key | `clinical_blob.blob_key` |
|--------------------|--------------------------|
| `rpc-patients` | `patients` |
| `rpc-notes` | `notes` |
| `rpc-indicaciones` | `indicaciones` |
| `rpc-labHistory` | `labHistory` |
| `rpc-medRecetaByPatient` | `medRecetaByPatient` |
| `rpc-listado-problemas` | `listadoProblemas` |
| `rpc-recetaHuByPatient` | `recetaHuByPatient` |
| `rpc-vpoByPatient` | `vpoByPatient` |
| `rpc-medPharmProfileByPatient` | `medPharmProfileByPatient` |
| `rpc-medCatalog` | `medCatalog` |
| `rpc-todos` | `todos` |
| `rpc-scheduled-procedures` | `scheduledProcedures` |
| `rpc-lan-room-snapshots` | `lanRoomSnapshots` |
| `rpc-lan-host-patient-map` | `lanHostPatientMap` |

**Not migrated:** `rpc-settings`, `theme`, tour keys, `rpc-lan-client-id`, LAN UI prefs (see spec §6.2).

---

## Task 0: Native dependency spike

**Files:**
- Modify: `package.json`
- Create: `scripts/rebuild-native-db.mjs`

- [ ] **Step 1: Add dependencies**

```json
"dependencies": {
  "better-sqlite3-multiple-ciphers": "^11.0.0",
  "@node-rs/argon2": "^2.0.0"
},
"devDependencies": {
  "@electron/rebuild": "^3.7.0"
},
"scripts": {
  "rebuild:db-native": "node scripts/rebuild-native-db.mjs",
  "postinstall": "node scripts/rebuild-native-db.mjs || true"
}
```

Pin exact versions after first successful `npm install` on macOS arm64; record in this plan’s commit.

- [ ] **Step 2: Create rebuild script**

```javascript
// scripts/rebuild-native-db.mjs
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
execSync(
  'npx @electron/rebuild -f -w better-sqlite3-multiple-ciphers',
  { cwd: root, stdio: 'inherit', env: process.env }
);
```

- [ ] **Step 3: Verify load in Electron**

Run: `npm run rebuild:db-native && npm start`  
Smoke in DevTools main-process log (temporary): `require('better-sqlite3-multiple-ciphers')` opens `:memory:` with `PRAGMA key = "x'"`.

Expected: no `NODE_MODULE_VERSION` error.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/rebuild-native-db.mjs
git commit -m "chore(db): add SQLCipher native deps and electron rebuild"
```

---

## Task 1: Canonical JSON (payload hashing)

**Files:**
- Create: `lib/db/canonical-json.mjs`
- Create: `lib/db/canonical-json.test.mjs`
- Modify: `package.json` (add test path)

- [ ] **Step 1: Write failing test**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalStringify } from './canonical-json.mjs';

describe('canonical-json', () => {
  it('sorts object keys deterministically', () => {
    const a = canonicalStringify({ z: 1, a: { y: 2, b: 3 } });
    const b = canonicalStringify({ a: { b: 3, y: 2 }, z: 1 });
    assert.equal(a, b);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `node --test lib/db/canonical-json.test.mjs`

- [ ] **Step 3: Implement**

```javascript
export function canonicalStringify(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(sortValue);
  const keys = Object.keys(v).sort();
  const out = {};
  for (const k of keys) out[k] = sortValue(v[k]);
  return out;
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/db/canonical-json.mjs lib/db/canonical-json.test.mjs package.json
git commit -m "feat(db): add canonical JSON for audit payload hashes"
```

---

## Task 2: Forensic audit chain (pure logic)

**Files:**
- Create: `lib/db/forensic-audit.mjs`
- Create: `lib/db/forensic-audit.test.mjs`

- [ ] **Step 1: Write failing tests**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENESIS_PREVIOUS_HASH,
  hashPayload,
  computeBlockHash,
  verifyChainRows,
} from './forensic-audit.mjs';

describe('forensic-audit', () => {
  it('genesis block links', () => {
    const payloadHash = hashPayload({ action: 'init' });
    const current = computeBlockHash({
      id: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
      client_id: 'desktop-host',
      event_type: 'system.migration.complete',
      payload_hash: payloadHash,
      previous_hash: GENESIS_PREVIOUS_HASH,
    });
    const rows = [{
      id: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
      client_id: 'desktop-host',
      event_type: 'system.migration.complete',
      payload_hash: payloadHash,
      previous_hash: GENESIS_PREVIOUS_HASH,
      current_hash: current,
    }];
    assert.equal(verifyChainRows(rows), null);
  });

  it('detects tampered row', () => {
    const payloadHash = hashPayload({ action: 'init' });
    const current = computeBlockHash({
      id: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
      client_id: 'desktop-host',
      event_type: 'system.migration.complete',
      payload_hash: payloadHash,
      previous_hash: GENESIS_PREVIOUS_HASH,
    });
    const rows = [{
      id: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
      client_id: 'desktop-host',
      event_type: 'system.migration.complete',
      payload_hash: payloadHash,
      previous_hash: GENESIS_PREVIOUS_HASH,
      current_hash: current + 'ff',
    }];
    assert.equal(verifyChainRows(rows), 1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```javascript
import crypto from 'node:crypto';
import { canonicalStringify } from './canonical-json.mjs';

export const GENESIS_PREVIOUS_HASH = '0'.repeat(64);

export function hashPayload(meta) {
  return crypto.createHash('sha256').update(canonicalStringify(meta || {}), 'utf8').digest('hex');
}

export function computeBlockHash(row) {
  const s = [
    String(row.id),
    row.timestamp,
    row.client_id,
    row.event_type,
    row.payload_hash,
    row.previous_hash,
  ].join('|');
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

export function verifyChainRows(rows) {
  let prev = GENESIS_PREVIOUS_HASH;
  for (const r of rows) {
    if (r.previous_hash !== prev) return r.id;
    const expect = computeBlockHash(r);
    if (expect !== r.current_hash) return r.id;
    prev = r.current_hash;
  }
  return null;
}

/** @param {import('better-sqlite3').Database} db */
export function appendAuditInTransaction(db, { clientId, eventType, meta }) {
  const payload_hash = hashPayload(meta);
  const prevRow = db.prepare(
    'SELECT current_hash FROM forensic_audit_chain ORDER BY id DESC LIMIT 1'
  ).get();
  const previous_hash = prevRow ? prevRow.current_hash : GENESIS_PREVIOUS_HASH;
  const timestamp = new Date().toISOString();
  const id = db.prepare(
    `INSERT INTO forensic_audit_chain
     (timestamp, client_id, event_type, payload_hash, previous_hash, current_hash)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    timestamp,
    clientId,
    eventType,
    payload_hash,
    previous_hash,
    'pending'
  ).lastInsertRowid;
  const current_hash = computeBlockHash({
    id,
    timestamp,
    client_id: clientId,
    event_type: eventType,
    payload_hash,
    previous_hash,
  });
  db.prepare(
    'UPDATE forensic_audit_chain SET current_hash = ? WHERE id = ?'
  ).run(current_hash, id);
  return { id, current_hash };
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `node --test lib/db/forensic-audit.test.mjs`

- [ ] **Step 5: Commit**

```bash
git add lib/db/forensic-audit.mjs lib/db/forensic-audit.test.mjs package.json
git commit -m "feat(db): SHA-256 forensic audit chain primitives"
```

---

## Task 3: Schema migrations

**Files:**
- Create: `lib/db/schema.mjs`
- Create: `lib/db/schema.test.mjs`

- [ ] **Step 1: Write failing test** (open `:memory:` plain DB for CI; cipher tested in Task 7)

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

describe('schema', () => {
  it('creates tables at current version', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(v.value, String(SCHEMA_VERSION));
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all().map((r) => r.name);
    assert.ok(tables.includes('clinical_blob'));
    assert.ok(tables.includes('forensic_audit_chain'));
    db.close();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `schema.mjs`**

Export `SCHEMA_VERSION = 1` and `applyMigrations(db)` executing DDL from spec §6 (full SQL in spec file — copy verbatim into `const DDL_V1` array, run in transaction, set `app_meta.schema_version`).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.mjs lib/db/schema.test.mjs package.json
git commit -m "feat(db): v1 schema for clinical blobs and audit chain"
```

---

## Task 4: Crypto (Argon2id + safeStorage)

**Files:**
- Create: `lib/db/crypto.mjs`
- Create: `lib/db/crypto.test.mjs`

- [ ] **Step 1: Write failing test** (use fixed salt fixture)

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSqlcipherKeyHex, wrapDek, unwrapDek } from './crypto.mjs';

const mockSafe = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from('enc:' + s).toString('base64'),
  decryptString: (s) => Buffer.from(s, 'base64').toString('utf8').replace(/^enc:/, ''),
};

describe('crypto', () => {
  it('deriveSqlcipherKeyHex is 64 hex chars', async () => {
    const salt = Buffer.alloc(16, 1);
    const hex = await deriveSqlcipherKeyHex('test-pass', salt);
    assert.match(hex, /^[0-9a-f]{64}$/);
  });

  it('wrap and unwrap DEK', () => {
    const dek = 'ab'.repeat(32);
    const wrapped = wrapDek(dek, mockSafe);
    assert.equal(unwrapDek(wrapped, mockSafe), dek);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```javascript
import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';

const ARGON2_OPTS = { memoryCost: 65536, timeCost: 3, parallelism: 4, outputLen: 32 };

export async function deriveSqlcipherKeyHex(passphrase, saltBuf) {
  const dk = await hash(passphrase, { salt: saltBuf, ...ARGON2_OPTS });
  return Buffer.from(dk).toString('hex');
}

export function wrapDek(dekHex, safeStorage) {
  if (!safeStorage.isEncryptionAvailable()) return null;
  return safeStorage.encryptString(dekHex);
}

export function unwrapDek(wrapped, safeStorage) {
  if (!wrapped || !safeStorage.isEncryptionAvailable()) return null;
  return safeStorage.decryptString(wrapped);
}

export function newSalt() {
  return randomBytes(16);
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/db/crypto.mjs lib/db/crypto.test.mjs package.json
git commit -m "feat(db): Argon2id key derivation and safeStorage DEK wrap"
```

---

## Task 5: DbManager + WriteQueue

**Files:**
- Create: `lib/db/db-path.mjs`
- Create: `lib/db/db-manager.mjs`
- Create: `lib/db/db-manager.test.mjs`

- [ ] **Step 1: Implement `db-path.mjs`**

```javascript
import path from 'node:path';

export function clinicalDbPath(userData) {
  return path.join(userData, 'rplus-clinical.db');
}
```

- [ ] **Step 2: Write failing test** for `withTransaction` rollback (no audit row on throw)

Use temp file DB with `PRAGMA key` in test setup; mock minimal insert into `clinical_blob` + audit.

- [ ] **Step 3: Implement `db-manager.mjs` skeleton**

```javascript
import { createWriteQueue } from '../../lan-squad/write-queue.js';
import { applyMigrations } from './schema.mjs';
import { appendAuditInTransaction } from './forensic-audit.mjs';
import { clinicalDbPath } from './db-path.mjs';
import { loadNativeDatabase } from './native-load.mjs';

export function createDbManager({ userDataPath, safeStorage, getClientId }) {
  const queue = createWriteQueue();
  let db = null;
  let state = 'locked'; // locked | unlocked

  function assertUnlocked() {
    if (state !== 'unlocked' || !db) {
      const err = new Error('Database locked');
      err.code = 'DB_LOCKED';
      throw err;
    }
  }

  async function unlockWithKeyHex(keyHex) {
    const Database = loadNativeDatabase();
    const path = clinicalDbPath(userDataPath);
    const conn = new Database(path);
    conn.pragma(`key = "x'${keyHex}'"`);
    applyMigrations(conn);
    db = conn;
    state = 'unlocked';
  }

  function lock() {
    if (db) db.close();
    db = null;
    state = 'locked';
  }

  function withTransaction(fn) {
    assertUnlocked();
    return queue.enqueue(() => {
      const run = db.transaction(() => fn(db, helpers));
      return run();
    });
  }

  const helpers = {
    audit(clientId, eventType, meta) {
      appendAuditInTransaction(db, { clientId, eventType, meta });
    },
  };

  return {
    getState: () => state,
    isUnlocked: () => state === 'unlocked',
    unlockWithKeyHex,
    lock,
    withTransaction,
    getDb: () => (state === 'unlocked' ? db : null),
  };
}
```

Extend with `openWithPassphrase`, `tryOpenRemembered`, rate-limited `auth.unlock.fail`, and `rekey` in same task implementation steps.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/db/db-manager.mjs lib/db/db-path.mjs lib/db/db-manager.test.mjs lib/db/native-load.mjs
git commit -m "feat(db): DbManager with serialized transactions and lock state"
```

---

## Task 6: Clinical blobs + LAN host persistence

**Files:**
- Create: `lib/db/clinical-blob-keys.mjs`
- Create: `lib/db/clinical-blobs.mjs`
- Create: `lib/db/lan-host-persistence.mjs`
- Create: `lib/db/migrate-from-legacy.mjs`
- Create: `lib/db/migrate-from-legacy.test.mjs`

- [ ] **Step 1: `clinical-blob-keys.mjs`** — export `LS_KEY_TO_BLOB` and `BLOB_TO_LS_KEY` from table in this plan.

- [ ] **Step 2: `clinical-blobs.mjs`**

```javascript
export function upsertBlob(db, blobKey, json, updatedAt = new Date().toISOString()) {
  db.prepare(
    `INSERT INTO clinical_blob (namespace, blob_key, json, updated_at)
     VALUES ('desktop', ?, ?, ?)
     ON CONFLICT(namespace, blob_key) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`
  ).run(blobKey, json, updatedAt);
}

export function loadAllBlobs(db) {
  const rows = db.prepare(
    `SELECT blob_key, json FROM clinical_blob WHERE namespace = 'desktop'`
  ).all();
  const out = {};
  for (const r of rows) out[r.blob_key] = r.json;
  return out;
}
```

- [ ] **Step 3: `lan-host-persistence.mjs`**

```javascript
export function readHostState(db) {
  const row = db.prepare('SELECT version, team_code_hash, json FROM lan_host_state WHERE id = 1').get();
  if (!row) return null;
  return { ...JSON.parse(row.json), version: row.version, teamCodeHash: row.team_code_hash };
}

export function writeHostState(db, state) {
  const json = JSON.stringify({
    patients: state.patients,
    rooms: state.rooms,
    roomSyncBundles: state.roomSyncBundles,
  });
  db.prepare(
    `INSERT INTO lan_host_state (id, version, team_code_hash, json, updated_at)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       version = excluded.version,
       team_code_hash = excluded.team_code_hash,
       json = excluded.json,
       updated_at = excluded.updated_at`
  ).run(state.version, state.teamCodeHash, json, new Date().toISOString());
}
```

- [ ] **Step 4: `migrate-from-legacy.mjs`** — accept `{ lsSnapshot, hostJsonPath, teamCodeHash }`, upsert all blobs, write host row, append `system.migration.complete` audit inside caller transaction.

- [ ] **Step 5: Test migration** with fixture JSON files under `lib/db/fixtures/legacy-minimal.json`.

- [ ] **Step 6: Commit**

```bash
git add lib/db/clinical-blobs.mjs lib/db/lan-host-persistence.mjs lib/db/migrate-from-legacy.mjs lib/db/clinical-blob-keys.mjs lib/db/migrate-from-legacy.test.mjs lib/db/fixtures
git commit -m "feat(db): clinical blobs, LAN host row, legacy migration"
```

---

## Task 7: Refactor `host-store.js` to use DB

**Files:**
- Modify: `lan-squad/host-store.js`
- Modify: `lan-squad/host-store.test.js`
- Modify: `server.js`

- [ ] **Step 1: Inject `dbManager` into `createHostStore({ dbManager, teamCodePlain })`**

Replace `readJson`/`writeJsonAtomic`/`atomicWriteJson` persistence with:

```javascript
async function persistCacheToDb() {
  if (!dbManager.isUnlocked()) {
    const err = new Error('Database locked');
    err.code = 'DB_LOCKED';
    throw err;
  }
  await dbManager.withTransaction((db, { audit }) => {
    writeHostState(db, cache.get());
    audit(getClientId(), 'lan.host.commit', {
      action: 'host.commit',
      byteLength: JSON.stringify(cache.get()).length,
    });
  });
}
```

Keep in-memory cache + `createWriteQueue()` — `commitCacheNow` calls `persistCacheToDb`.

- [ ] **Step 2: Update tests** — use temp directory + unlocked in-memory/ temp file db via test helper `lib/db/test-open-db.mjs`.

- [ ] **Step 3: Run**

Run: `node --test lan-squad/host-store.test.js lan-squad/put-historia-clinica-queued.test.js`

- [ ] **Step 4: Commit**

```bash
git add lan-squad/host-store.js lan-squad/host-store.test.js server.js lib/db/test-open-db.mjs
git commit -m "feat(db): persist LAN host state through SQLCipher"
```

---

## Task 8: IPC handlers + preload

**Files:**
- Create: `lib/db/ipc-handlers.mjs`
- Create: `lib/db/native-load.mjs`
- Modify: `main.js`
- Modify: `preload.js`

- [ ] **Step 1: `native-load.mjs`**

```javascript
export function loadNativeDatabase() {
  try {
    return require('better-sqlite3-multiple-ciphers');
  } catch (e) {
    const err = new Error('Native database module failed to load');
    err.code = 'DB_NATIVE_ABI_MISMATCH';
    err.cause = e;
    throw err;
  }
}
```

- [ ] **Step 2: `registerDbIpcHandlers({ dbManager, app, dialog })`** — implement channels from spec §8.

- [ ] **Step 3: `main.js`** — on `app.whenReady`, if native load throws, `dialog.showErrorBox` + `app.quit()`. Register handlers after `dbManager` created with `userDataPath`.

- [ ] **Step 4: `preload.js`**

```javascript
dbStatus: () => ipcRenderer.invoke('db:status'),
dbUnlock: (opts) => ipcRenderer.invoke('db:unlock', opts),
dbLock: () => ipcRenderer.invoke('db:lock'),
dbClinicalLoadAll: () => ipcRenderer.invoke('db:clinical-load-all'),
dbClinicalSaveAll: (payload) => ipcRenderer.invoke('db:clinical-save-all', payload),
// ...remaining channels
```

- [ ] **Step 5: Manual smoke** — invoke `db:status` from renderer console.

- [ ] **Step 6: Commit**

```bash
git add lib/db/ipc-handlers.mjs lib/db/native-load.mjs main.js preload.js
git commit -m "feat(db): IPC surface and native load fail-fast"
```

---

## Task 9: Renderer storage bridge + boot gate

**Files:**
- Create: `public/js/db-storage-bridge.mjs`
- Modify: `public/js/storage.js`
- Modify: `public/js/app-state.mjs`
- Modify: `public/js/app-boot.mjs` (or entry that calls initial load)

- [ ] **Step 1: `db-storage-bridge.mjs`**

```javascript
export function isDbMode() {
  return !!(typeof window !== 'undefined' && window.electronAPI && window.electronAPI.dbClinicalLoadAll);
}

export async function hydrateStorageCache() {
  const res = await window.electronAPI.dbClinicalLoadAll();
  return res.blobs || {};
}

export async function persistSaveAll(payload, auditMeta) {
  return window.electronAPI.dbClinicalSaveAll({ blobs: payload, auditMeta });
}
```

Map blob keys back to in-memory structures in `loadStateFromBlobs(blobs)` helper.

- [ ] **Step 2: `storage.js`** — at top, branch:

```javascript
import { isDbMode, hydrateStorageCache, persistSaveAll } from './db-storage-bridge.mjs';

let _blobCache = null;

export async function ensureStorageHydrated() {
  if (!isDbMode()) return;
  if (_blobCache) return;
  _blobCache = await hydrateStorageCache();
}

export function getPatients() {
  if (_blobCache) return JSON.parse(_blobCache.patients || '[]');
  return safeParseArray(localStorage.getItem('rpc-patients'));
}
```

Apply same pattern for getters; `saveAll` calls `persistSaveAll` when `isDbMode()`.

- [ ] **Step 3: `app-state.mjs`** — `export async function bootHydrate()` awaits `ensureStorageHydrated()` then loads patients/notes/... from storage getters.

- [ ] **Step 4: Wire boot** before UI renders patient list.

- [ ] **Step 5: Run** `node --test public/js/storage.test.mjs public/js/app-state.test.mjs` — add mocks for `window.electronAPI`.

- [ ] **Step 6: Commit**

```bash
git add public/js/db-storage-bridge.mjs public/js/storage.js public/js/app-state.mjs
git commit -m "feat(db): renderer storage bridge and boot hydration"
```

---

## Task 10: Unlock / lock UI

**Files:**
- Modify: `public/js/features/platform.mjs` (settings + backup section)
- Modify: `public/partials/layout/app-body.html` or dedicated `public/partials/db-unlock.html` included in shell

- [ ] **Step 1: Full-screen unlock overlay** when `db:status.state === 'locked'` on desktop Electron only.

Fields: passphrase, confirm (first run), checkbox “Recordar en este dispositivo”.

- [ ] **Step 2: Settings → Seguridad**

- **Bloquear base de datos ahora** → `db:lock`
- **Cambiar contraseña** → `db:change-passphrase`
- **Verificar bitácora forense** → `db:audit-verify` full mode, toast result
- **Exportar respaldo JSON** → warning banner + `db:backup-export-json`
- **Exportar copia .db cifrada** → `db:backup-export-db`

- [ ] **Step 3: Replace `rpc-audit-log` UI** — `getAuditLog()` reads last 200 rows from `db:audit-export` or new `db:audit-tail` IPC (filter `clinical.*`, `auth.*` for display).

- [ ] **Step 4: Manual QA** unlock → edit patient → lock → LAN PUT returns 503/`DB_LOCKED`.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/platform.mjs public/partials
git commit -m "feat(db): unlock UI, lock control, and backup settings"
```

---

## Task 11: First-run migration orchestration

**Files:**
- Modify: `lib/db/ipc-handlers.mjs`
- Modify: `main.js`

- [ ] **Step 1: `db:migration-probe`** — renderer sends snapshot of clinical `localStorage` keys; main checks host JSON path.

- [ ] **Step 2: On first successful `db:unlock` after probe positive**

```javascript
await dbManager.withTransaction((db, { audit }) => {
  migrateFromLegacy(db, { lsSnapshot, hostState, teamCodeHash }, audit);
});
// rename files, write backup snapshot
```

- [ ] **Step 3: Strip clinical `rpc-*` keys** via `executeJavaScript` in main after migration COMMIT.

- [ ] **Step 4: Test** end-to-end with copied real `userData` fixture (de-identified) in dev.

- [ ] **Step 5: Commit**

```bash
git add lib/db/ipc-handlers.mjs main.js
git commit -m "feat(db): one-shot legacy migration on first unlock"
```

---

## Task 12: Security audit hooks (Option C events)

**Files:**
- Modify: `lib/db/ipc-handlers.mjs` (`db:unlock` / fail)
- Modify: `lan-squad/auth-router.js` (if Phase 2 landed)
- Modify: `main.js` (`set-approved-output-dir`)

- [ ] **Step 1: `auth.unlock.success` / `auth.unlock.fail` / `auth.lock`** in unlock handlers (fail rate-limit: max 5 / 15 min per process).

- [ ] **Step 2: `lan.ticket.mint` / `lan.ticket.exchange` / `lan.token.rotate`** — call `dbManager.withTransaction` audit only (no extra data write) from auth-router hooks.

- [ ] **Step 3: `system.output_dir.register`** when output dir approved.

- [ ] **Step 4: `clinical.*.save`** metadata from `saveAll` (`changedKeys: Object.keys(blobs)`).

- [ ] **Step 5: Commit**

```bash
git add lib/db/ipc-handlers.mjs lan-squad/auth-router.js main.js
git commit -m "feat(db): wire Option C forensic audit event types"
```

---

## Task 13: Pack native module + docs

**Files:**
- Modify: `scripts/lib/electron-pack-files.js`
- Modify: `docs/superpowers/specs/2026-05-31-sqlcipher-forensic-audit-design.md` (status → Implemented plan linked)

- [ ] **Step 1: Ensure `.node` binary included** in electron-builder `files` / `asarUnpack` for `better-sqlite3-multiple-ciphers`.

- [ ] **Step 2: Add README section** `docs/db-encryption.md` — rebuild instructions, forgot-passphrase policy, backup options.

- [ ] **Step 3: Run full test suite**

Run: `npm test`

- [ ] **Step 4: Run unsigned mac build smoke** (open app, unlock, migrate fixture).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/electron-pack-files.js docs/db-encryption.md docs/superpowers/specs/2026-05-31-sqlcipher-forensic-audit-design.md
git commit -m "chore(db): pack native module and document encryption ops"
```

---

## Plan self-review (spec coverage)

| Spec requirement | Task |
|------------------|------|
| Unified encrypted DB | 0, 5, 6, 7 |
| Argon2id + remember-me | 4, 8, 10 |
| Lock + DB_LOCKED | 5, 7, 10 |
| Blob-first schema | 3, 6 |
| Hash chain Option C | 2, 5, 12 |
| Migration + backups | 6, 10, 11 |
| storage.js API preserved | 9 |
| ABI fail-fast | 0, 8 |
| No read-access chaining | omitted (v2) |
| UI prefs stay localStorage | 9 (not in map) |

---

## Suggested execution order

1. Tasks **0–4** (native + pure modules)  
2. Tasks **5–7** (DB + LAN host)  
3. Tasks **8–11** (IPC, renderer, UI, migration)  
4. Task **12–13** (audit hooks, release)

**Estimated:** 4–6 focused dev days with native rebuild CI validation on macOS + Windows.
