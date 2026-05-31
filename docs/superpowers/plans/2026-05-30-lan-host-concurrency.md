# LAN host concurrency (Phase 3a) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove clock-based LWW from the LAN host and concurrent client merge path; add server `revision` + `entityVersions`, async serialized persistence with in-memory cache, append-only audit logs, key-level auto-merge, HTTP 409 with Clinical Diff + local draft buffer.

**Architecture:** Repository-style modules under `lan-squad/` (`write-queue`, `host-state-cache`, `bundle-merge`, thin `host-store` facade). Clients use `conflict-merge.mjs` for version-aware merges, `storage.js` for `rpc-lan-sync-drafts`, and `clinical-diff-panel.mjs` on structural conflicts. SQLite is Phase 3b — interfaces only.

**Tech Stack:** Node.js 20+ `node:test`, `fs.promises`, Express 5, vanilla ESM renderer, `localStorage`, existing `live-sync-room.mjs` entity key helpers.

**Spec:** [`docs/superpowers/specs/2026-05-30-lan-host-concurrency-design.md`](../specs/2026-05-30-lan-host-concurrency-design.md)

**Note:** [`docs/superpowers/plans/2026-05-30-clinical-conflict-resolution.md`](2026-05-30-clinical-conflict-resolution.md) is an alternate design (central `ConflictResolver`, IndexedDB drafts, WS unicast). **Do not implement both.** This plan follows the approved host-concurrency spec (repository + materialized arrays + `storage.js` drafts).

**Optional prerequisite:** [`2026-05-30-lan-security-hardening.md`](2026-05-30-lan-security-hardening.md) if shipping on an authenticated LAN surface — orthogonal to merge semantics.

---

## File map

| File | Action |
|------|--------|
| `lan-squad/entity-keys.js` | Create — `agendaEntityKey`, `todoEntityKey`, `collectBundleKeys` |
| `lan-squad/entity-keys.test.js` | Create |
| `lan-squad/audit-log.js` | Create — `appendAudit(entry, logArray, cap=500)` |
| `lan-squad/audit-log.test.js` | Create |
| `lan-squad/write-queue.js` | Create — serialized `enqueue(fn)` |
| `lan-squad/write-queue.test.js` | Create |
| `lan-squad/atomic-json.js` | Create — async `readJson` / `writeJsonAtomic` (`fs.promises`) |
| `lan-squad/host-state-cache.js` | Create — load/get/snapshot/reloadFromDisk |
| `lan-squad/bundle-merge.js` | Create — `mergeBundlePut(server, incoming)` → `{ ok, bundle }` or `{ conflict, conflicts }` |
| `lan-squad/bundle-merge.test.js` | Create |
| `lan-squad/migrate-host-state.js` | Create — v1→v2 in-memory transform |
| `lan-squad/migrate-host-state.test.js` | Create |
| `lan-squad/host-store.js` | Refactor — facade + cache + queue; remove sync I/O |
| `lan-squad/host-store.test.js` | Rewrite LWW tests → version tests |
| `lan-squad/host-router.js` | Modify — 409 bodies, async handlers if needed |
| `lan-squad/host-router.test.js` | Add PUT sync-bundle 409/200 cases |
| `public/js/conflict-merge.mjs` | Create — client key merge + descriptors |
| `public/js/conflict-merge.test.mjs` | Create |
| `public/js/clinical-diff-panel.mjs` | Create — modal DOM API |
| `public/js/clinical-diff-panel.test.mjs` | Create — jsdom-lite or export pure resolvers |
| `public/js/storage.js` | Add draft helpers |
| `public/js/storage.test.mjs` | Add draft tests |
| `public/js/live-sync-room.mjs` | Version-based merge |
| `public/js/live-sync-room.test.mjs` | Replace LWW tests |
| `public/js/features/lan-sync.mjs` | `baseRevision`, 409 → draft + panel |
| `package.json` | Register new tests in `scripts.test` |
| `scripts/bundle-renderer.mjs` | Ensure new public modules imported if required by app |

---

## Task 1: Entity key helpers

**Files:**
- Create: `lan-squad/entity-keys.js`
- Create: `lan-squad/entity-keys.test.js`
- Modify: `package.json` (add `lan-squad/entity-keys.test.js` to `test` script)

- [ ] **Step 1: Write failing tests**

```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { agendaEntityKey, todoEntityKey, collectKeysFromBundlePayload } = require('./entity-keys.js');

describe('entity-keys', () => {
  it('agendaEntityKey', () => {
    assert.equal(agendaEntityKey('e1'), 'a:e1');
  });
  it('todoEntityKey', () => {
    assert.equal(todoEntityKey('p1', 't1'), 't:p1:t1');
  });
  it('collectKeysFromBundlePayload', () => {
    const keys = collectKeysFromBundlePayload({
      agenda: [{ id: 'e1' }],
      todos: { p1: [{ id: 't1' }] },
      manejo: { customProtocols: [] },
    });
    assert.ok(keys.has('a:e1'));
    assert.ok(keys.has('t:p1:t1'));
    assert.ok(keys.has('manejo'));
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test lan-squad/entity-keys.test.js`  
Expected: FAIL `Cannot find module`

- [ ] **Step 3: Implement**

```javascript
'use strict';

function agendaEntityKey(id) {
  return 'a:' + String(id || '');
}

function todoEntityKey(patientId, id) {
  return 't:' + String(patientId || '') + ':' + String(id || '');
}

function collectKeysFromBundlePayload(payload) {
  const keys = new Set();
  if (!payload || typeof payload !== 'object') return keys;
  const agenda = Array.isArray(payload.agenda) ? payload.agenda : [];
  for (const ev of agenda) {
    if (ev && ev.id) keys.add(agendaEntityKey(ev.id));
  }
  const todos = payload.todos && typeof payload.todos === 'object' ? payload.todos : {};
  for (const pid of Object.keys(todos)) {
    const arr = Array.isArray(todos[pid]) ? todos[pid] : [];
    for (const t of arr) {
      if (t && t.id) keys.add(todoEntityKey(pid, t.id));
    }
  }
  if (payload.manejo && typeof payload.manejo === 'object') keys.add('manejo');
  return keys;
}

module.exports = { agendaEntityKey, todoEntityKey, collectKeysFromBundlePayload };
```

- [ ] **Step 4: Run test — expect PASS**

Run: `node --test lan-squad/entity-keys.test.js`

- [ ] **Step 5: Commit**

```bash
git add lan-squad/entity-keys.js lan-squad/entity-keys.test.js package.json
git commit -m "feat(lan): add entity version key helpers"
```

---

## Task 2: Audit log ring buffer

**Files:**
- Create: `lan-squad/audit-log.js`
- Create: `lan-squad/audit-log.test.js`

- [ ] **Step 1: Write failing test**

```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { appendAudit } = require('./audit-log.js');

describe('audit-log', () => {
  it('appends and caps at 500', () => {
    const log = [];
    for (let i = 0; i < 502; i++) {
      appendAudit({ at: 't', clientId: 'c', action: 'test', detail: { i } }, log);
    }
    assert.equal(log.length, 500);
    assert.equal(log[0].detail.i, 2);
    assert.equal(log[499].detail.i, 501);
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `node --test lan-squad/audit-log.test.js`

- [ ] **Step 3: Implement**

```javascript
'use strict';

const DEFAULT_CAP = 500;

function appendAudit(entry, log, cap = DEFAULT_CAP) {
  if (!Array.isArray(log)) throw new TypeError('log must be array');
  log.push(entry);
  while (log.length > cap) log.shift();
  return log;
}

module.exports = { appendAudit, DEFAULT_CAP };
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit** — `feat(lan): audit_log ring buffer helper`

---

## Task 3: Async atomic JSON + write queue

**Files:**
- Create: `lan-squad/atomic-json.js`
- Create: `lan-squad/write-queue.js`
- Create: `lan-squad/write-queue.test.js`

- [ ] **Step 1: Write queue concurrency test**

```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createWriteQueue } = require('./write-queue.js');

describe('write-queue', () => {
  it('runs jobs sequentially', async () => {
    const q = createWriteQueue();
    const order = [];
    await Promise.all([
      q.enqueue(async () => { order.push(1); await new Promise((r) => setTimeout(r, 10)); }),
      q.enqueue(async () => { order.push(2); }),
      q.enqueue(async () => { order.push(3); }),
    ]);
    assert.deepEqual(order, [1, 2, 3]);
  });
});
```

- [ ] **Step 2: Implement `write-queue.js`**

```javascript
'use strict';

function createWriteQueue() {
  let chain = Promise.resolve();
  function enqueue(fn) {
    const run = chain.then(() => fn());
    chain = run.catch(() => {});
    return run;
  }
  return { enqueue };
}

module.exports = { createWriteQueue };
```

- [ ] **Step 3: Implement `atomic-json.js`** (promisify existing sync pattern)

```javascript
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') throw new Error('bad shape');
    return o;
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

async function writeJsonAtomic(filePath, obj) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(obj), 'utf8');
  await fs.rename(tmp, filePath);
}

module.exports = { readJson, writeJsonAtomic };
```

- [ ] **Step 4: Run** `node --test lan-squad/write-queue.test.js` — PASS

- [ ] **Step 5: Commit** — `feat(lan): async atomic JSON and write queue`

---

## Task 4: Host state cache

**Files:**
- Create: `lan-squad/host-state-cache.js`
- Create: `lan-squad/host-state-cache.test.js`

- [ ] **Step 1: Test get/set/reload**

Test that `get()` returns same reference until `replaceState`; `reloadFromDisk` replaces after simulated write.

- [ ] **Step 2: Implement**

```javascript
'use strict';

function createHostStateCache() {
  /** @type {object | null} */
  let state = null;
  return {
    get() {
      if (!state) throw new Error('cache not loaded');
      return state;
    },
    replace(next) {
      state = next;
      return state;
    },
    isLoaded() {
      return state != null;
    },
  };
}

module.exports = { createHostStateCache };
```

Wire disk load in Task 6 (`host-store` init).

- [ ] **Step 3: Commit** — `feat(lan): in-memory host state cache`

---

## Task 5: Server bundle merge engine

**Files:**
- Create: `lan-squad/bundle-merge.js`
- Create: `lan-squad/bundle-merge.test.js`

- [ ] **Step 1: Test disjoint key union**

Server bundle: `revision: 2`, todo `t:p1:t1` version 1. Client sends `baseRevision: 2`, adds `t:p1:t2` with `baseEntityVersions['t:p1:t2']` omitted (new key). Expect `ok: true`, both todos present, `revision: 3`.

- [ ] **Step 2: Test conflict**

Server `t:p1:t1` version 2. Client sends text "A" with `baseEntityVersions['t:p1:t1']: 1`. Expect `ok: false`, `conflicts.length === 1`.

- [ ] **Step 3: Test partial PUT preserves omitted keys**

Client payload only updates agenda; server todos unchanged.

- [ ] **Step 4: Implement `mergeBundlePut`**

Export:

```javascript
/**
 * @returns {{ ok: true, bundle: object, autoMergedKeys: string[] } | { ok: false, bundle: object, conflicts: object[] }}
 */
function mergeBundlePut(serverBundle, incoming, { clientId, nowIso }) { ... }
```

Use `entity-keys.collectKeysFromBundlePayload`, bump `entityVersions[key]` per changed key, increment `revision`, set `committedAt`, `appendAudit` on result bundle.

- [ ] **Step 5: Run** `node --test lan-squad/bundle-merge.test.js` — PASS

- [ ] **Step 6: Commit** — `feat(lan): server-side bundle merge with entity versions`

---

## Task 6: v1→v2 migration

**Files:**
- Create: `lan-squad/migrate-host-state.js`
- Create: `lan-squad/migrate-host-state.test.js`

- [ ] **Step 1: Test migration builds entityVersions from legacy bundle**

Input v1 bundle with `updatedAt` only → output `version: 2`, `revision: 1`, keys `a:*`, `t:*` at version 1.

- [ ] **Step 2: Test failed write does not mutate input file** (use temp dir; mock `writeJsonAtomic` throw; assert original file bytes unchanged)

- [ ] **Step 3: Implement `migrateHostStateIfNeeded(state)`** — pure transform; disk write only from `host-store` queue.

- [ ] **Step 4: Commit** — `feat(lan): host state v2 migration`

---

## Task 7: Refactor `host-store.js`

**Files:**
- Modify: `lan-squad/host-store.js`
- Modify: `lan-squad/host-store.test.js`

- [ ] **Step 1: Replace failing LWW test** (`putRoomSyncBundle LWW por updatedAt`) with:

```javascript
it('putRoomSyncBundle rejects stale entity version with CONFLICT', async () => {
  const store = createHostStore({ filePath, teamCodePlain: 'b' });
  const r = store.createRoom('Sala');
  await store.putRoomSyncBundle(r.id, {
    baseRevision: 0,
    baseEntityVersions: {},
    agenda: [{ id: 'e1', patientId: 'p1', procedure: 'A', updatedAt: '...' }],
    todos: {},
    clientId: 'a',
  });
  await assert.rejects(
    () =>
      store.putRoomSyncBundle(r.id, {
        baseRevision: 1,
        baseEntityVersions: { 'a:e1': 0 },
        agenda: [{ id: 'e1', patientId: 'p1', procedure: 'STALE', updatedAt: '...' }],
        todos: {},
        clientId: 'b',
      }),
    (e) => e.code === 'CONFLICT'
  );
});
```

Adjust for async API (`createHostStore` returns promises on mutations if you promisify facade).

- [ ] **Step 2: Implement facade**

- Init: `readJson` → `migrateHostStateIfNeeded` → `cache.replace` (inside queue).
- `getState()` → sync read from cache (no disk).
- `putRoomSyncBundle` → `queue.enqueue` → `mergeBundlePut` → on conflict throw `{ code: 'CONFLICT', serverBundle, conflicts }` → `writeJsonAtomic`.
- `upsertPatient` → require `expectedVersion` on update (throw `CONFLICT` if missing on existing row).
- Room ops → bump `room.version`, append `audit_log`.
- Keep exporting `atomicWriteJson` as thin async wrapper for tests or deprecate in favor of `atomic-json.js`.

- [ ] **Step 3: Run** `node --test lan-squad/host-store.test.js` — all PASS

- [ ] **Step 4: Commit** — `feat(lan): host-store v2 cache, queue, and versioned bundles`

---

## Task 8: HTTP router 409 contracts

**Files:**
- Modify: `lan-squad/host-router.js`
- Modify: `lan-squad/host-router.test.js`

- [ ] **Step 1: Add integration test PUT sync-bundle 409**

Spin express + store; first PUT succeeds; second PUT with stale `baseEntityVersions` → status 409, body has `conflicts` array and `bundle`.

- [ ] **Step 2: Update handler**

```javascript
r.put('/rooms/:id/sync-bundle', express.json({ limit: '16mb' }), async (req, res) => {
  try {
    const body = req.body && req.body.bundle ? req.body.bundle : req.body;
    const clientId = (req.body && req.body.clientId) || req.get('x-lan-client-id') || '';
    const out = await store.putRoomSyncBundle(req.params.id, body, clientId);
    res.json({ bundle: out.bundle, merged: true, autoMergedKeys: out.autoMergedKeys || [] });
  } catch (e) {
    if (e.code === 'CONFLICT') {
      return res.status(409).json({ error: 'conflict', bundle: e.serverBundle, conflicts: e.conflicts });
    }
    res.status(400).json({ error: e.message });
  }
});
```

- [ ] **Step 3: Run** `node --test lan-squad/host-router.test.js`

- [ ] **Step 4: Commit** — `feat(lan): HTTP 409 for bundle conflicts`

---

## Task 9: Client `conflict-merge.mjs`

**Files:**
- Create: `public/js/conflict-merge.mjs`
- Create: `public/js/conflict-merge.test.mjs`

- [ ] **Step 1: Port entity key helpers** (re-export or duplicate thin wrappers matching `live-sync-room.mjs` exports for consistency)

- [ ] **Step 2: Tests**

- `mergeEntityMaps(local, server, baseEntityVersions)` auto-merges disjoint keys.
- Same key, `baseEntityVersions[k] === server.entityVersions[k]` → take local.
- Same key, mismatch → push to `conflicts[]`.

- [ ] **Step 3: Implement pure functions** (no DOM)

- [ ] **Step 4: Add to `package.json` test script**

- [ ] **Step 5: Commit** — `feat(livesync): client conflict-merge module`

---

## Task 10: Refactor `live-sync-room.mjs`

**Files:**
- Modify: `public/js/live-sync-room.mjs`
- Modify: `public/js/live-sync-room.test.mjs`

- [ ] **Step 1: Change tests** — rename `merge LWW` describe block to `merge by entity version`; fixtures include `entityVersions` on sources instead of only `updatedAt`.

- [ ] **Step 2: Replace `compareIso` tie-break in `upsertAgenda` / `upsertTodo`** with numeric version compare; keep `compareIso` exported for UI sorting only.

- [ ] **Step 3: Extend patch handler** to read `baseEntityVersion` from `livesync:patch` messages.

- [ ] **Step 4: Run** `node --test public/js/live-sync-room.test.mjs`

- [ ] **Step 5: Commit** — `refactor(livesync): version-based room bundle merge`

---

## Task 11: Draft buffer in `storage.js`

**Files:**
- Modify: `public/js/storage.js`
- Modify: `public/js/storage.test.mjs`

- [ ] **Step 1: Failing tests with mock localStorage**

```javascript
import { saveSyncDraft, getSyncDraft, clearSyncDraft, listSyncDraftKeys } from './storage.js';

test('saveSyncDraft round-trip', () => {
  global.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
  saveSyncDraft('room:r1', { roomId: 'r1', localBundle: {}, baseRevision: 1, baseEntityVersions: {}, conflicts: [] });
  assert.equal(getSyncDraft('room:r1').roomId, 'r1');
  clearSyncDraft('room:r1');
  assert.equal(getSyncDraft('room:r1'), null);
});
```

- [ ] **Step 2: Implement** — key constant `SYNC_DRAFTS_KEY = 'rpc-lan-sync-drafts'`

- [ ] **Step 3: Commit** — `feat(storage): LAN sync conflict drafts`

---

## Task 12: Clinical Diff panel

**Files:**
- Create: `public/js/clinical-diff-panel.mjs`
- Create: `public/js/clinical-diff-panel.test.mjs`
- Modify: `public/css/` or existing modal styles if `lab-conflict-*` classes exist (reuse per spec)

- [ ] **Step 1: Export pure `resolveConflictFields(conflict, choices)` for tests**

- [ ] **Step 2: Export `openClinicalDiffPanel({ title, conflicts, onApply, onSaveDraft })`** building two-column modal DOM

- [ ] **Step 3: Test pure resolver** — mine/server/merge string paths

- [ ] **Step 4: Wire minimal CSS** (header, columns, radio per field)

- [ ] **Step 5: Commit** — `feat(ui): clinical diff panel for LAN conflicts`

---

## Task 13: Integrate `lan-sync.mjs`

**Files:**
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Track last known `baseRevision` / `baseEntityVersions` per active room** (from last successful GET or PUT)

- [ ] **Step 2: Change `hostBundleBodyFromEnvelope`**

```javascript
function hostBundleBodyFromEnvelope(envelope, bases) {
  return {
    baseRevision: bases.revision,
    baseEntityVersions: bases.entityVersions,
    agenda: envelope.agenda || [],
    todos: envelope.todos || {},
    entries: envelope.entries || [],
    manejo: envelope.manejo || null,
    uploadedByClientId: envelope.clientId || getLanClientId(),
  };
}
```

- [ ] **Step 3: On PUT response 409** — `saveSyncDraft`, `openClinicalDiffPanel`, do **not** call `applyLiveSyncMerged(serverBundle)` blindly

- [ ] **Step 4: On 200** — update bases from `bundle.revision` / `bundle.entityVersions`; `clearSyncDraft`

- [ ] **Step 5: Badge** — if `listSyncDraftKeys().length`, show indicator in LAN chrome (existing header partial)

- [ ] **Step 6: Manual test checklist** (two windows, same room)

- [ ] **Step 7: Commit** — `feat(lan): versioned host bundle push and conflict UX`

---

## Task 14: Renderer bundle + docs

**Files:**
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-05-16-livesync-agenda-todos-room-design.md` (add deprecation note at top pointing to 2026-05-30 spec for conflict policy)

- [ ] **Step 1: Run full test suite**

Run: `npm test`  
Expected: all lan-squad + new public tests PASS

- [ ] **Step 2: Run** `npm run bundle:renderer` if `lan-sync` imports new modules

- [ ] **Step 3: Commit** — `chore: wire LAN concurrency tests and doc supersede note`

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Repository / write queue / cache | 3, 4, 7 |
| v2 schema + migration atomicity | 6, 7 |
| `entityVersions` + `revision` | 5, 7, 8 |
| Key-level auto-merge | 5, 9 |
| HTTP 409 body | 8 |
| `audit_log` cap 500 | 2, 7 |
| `expectedVersion` required on patient update | 7, 8 |
| Client drafts `rpc-lan-sync-drafts` | 11, 13 |
| Clinical Diff panel | 12, 13 |
| Remove network LWW | 5, 7, 10 |
| WS patch `baseEntityVersion` | 10, 13 (emit side in lan-sync patch helpers) |

---

## Manual test plan (Phase 3a sign-off)

1. Host A + Client B join same LiveSync room.
2. B adds todo `t1`; A adds todo `t2` concurrently → both visible after sync; host file shows both keys in `entityVersions`.
3. A and B edit same todo text within 5s → B gets 409 or live conflict path → diff panel → draft persists after reload.
4. Kill host mid-write (optional chaos) → restart → state is v1 or v2, not corrupt JSON (validate with `jq`).
