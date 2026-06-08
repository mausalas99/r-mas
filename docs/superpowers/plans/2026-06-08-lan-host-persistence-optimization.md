# LAN Host Persistence Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate monolithic synchronous host JSON writes by shipping four phases: async coalesced commits (P0), per-room JSON shards (P1), lab sidecars with capped write path (P2), and normalized SQLite repositories (P3).

**Architecture:** `host-store.js` keeps an in-memory cache as authority; a `CommitBarrier` coalesces disk flushes (P0); a `sharded-host-persistence` adapter writes only dirty shards (P1); lab sidecars decouple `labHistory` from bundle rewrites (P2); SQL repositories replace shards when clinical DB is unlocked (P3). HTTP contracts unchanged; typed routes `await store.awaitDurableCommit()` before 200.

**Tech Stack:** Node.js CommonJS (`lan-squad/`), `node --test`, `better-sqlite3-multiple-ciphers` via `lib/db/`, existing `write-queue.js` + `atomic-json.js`.

**Spec:** [`docs/superpowers/specs/2026-06-08-lan-host-persistence-optimization-design.md`](../specs/2026-06-08-lan-host-persistence-optimization-design.md)

---

## File structure (final state after P3)

| File | Responsibility |
|------|----------------|
| `lan-squad/persistence/commit-barrier.js` | Coalesced flush timer + shared waiter set (P0) |
| `lan-squad/persistence/commit-barrier.test.js` | Barrier unit tests (P0) |
| `lan-squad/persistence/json-meta-repository.js` | Read/write `lan-host/meta.json` (P1) |
| `lan-squad/persistence/json-room-bundle-repository.js` | Read/write `lan-host/bundles/{roomId}.json` (P1) |
| `lan-squad/persistence/sharded-host-persistence.js` | Load/split/commit shards + boot repair (P1) |
| `lan-squad/persistence/sharded-host-persistence.test.js` | Shard + migration + repair tests (P1) |
| `lan-squad/persistence/lab-sidecar.js` | `upsertLabSidecar`, assemble, cap logic (P2) |
| `lan-squad/persistence/lab-sidecar.test.js` | Cap + O(1) write path tests (P2) |
| `lan-squad/persistence/sqlite-host-repositories.js` | P3 table access (meta, room, entries, labs) |
| `lan-squad/persistence/sqlite-host-repositories.test.js` | SQL migration + lab upsert bench (P3) |
| `lan-squad/host-store.js` | Facade; delegates persist to adapters |
| `lan-squad/host-router.js` | `await store.awaitDurableCommit()` on typed routes |
| `lib/db/schema.mjs` | Schema v15 — normalized LAN host tables (P3) |
| `lib/db/lan-host-persistence.mjs` | Deprecated monolith path; re-export SQL repos (P3) |
| `server.js`, `main.js` | `hostStateDir` wiring, health repair count |

---

## PR 1 — P0: Async coalesced commit

Ship alone. No on-disk schema change.

**Status:** Implemented (Tasks 1–4). `commit-barrier.js`, `host-store.js`, `host-router.js` wired; 46 tests pass in P0 suites.

**P1 status:** Implemented — JSON shards, migration, boot repair; `sharded-host-persistence.js`, `server.js`, `main.js`.

**P2 status:** Implemented — lab sidecars (cap 20), `getRoomSyncBundleForApi`; 53 tests in P0–P2 suites.

**P3 status:** Implemented — schema v15, `sqlite-host-repositories.js`, mode switch `sql-v3` / `json-sharded` / `json-monolith`; 88 tests in full LAN host suite.

---

### Task 1: `CommitBarrier` module

**Files:**
- Create: `lan-squad/persistence/commit-barrier.js`
- Create: `lan-squad/persistence/commit-barrier.test.js`

- [ ] **Step 1: Write failing tests**

Create `lan-squad/persistence/commit-barrier.test.js`:

```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createCommitBarrier } = require('./commit-barrier.js');

describe('commit-barrier', () => {
  it('coalesces schedules into one flush after COMMIT_COALESCE_MS', async () => {
    let flushes = 0;
    const barrier = createCommitBarrier({ coalesceMs: 50 });
    const p1 = barrier.scheduleFlush(async () => { flushes += 1; });
    const p2 = barrier.scheduleFlush(async () => { flushes += 1; });
    assert.strictEqual(flushes, 0);
    await Promise.all([p1, p2]);
    assert.strictEqual(flushes, 1);
  });

  it('flushNow runs immediately and resolves all waiters', async () => {
    let flushes = 0;
    const barrier = createCommitBarrier({ coalesceMs: 60_000 });
    const p1 = barrier.scheduleFlush(async () => { flushes += 1; });
    const p2 = barrier.scheduleFlush(async () => { flushes += 1; });
    await barrier.flushNow(async () => { flushes += 1; });
    await Promise.all([p1, p2]);
    assert.strictEqual(flushes, 1);
  });

  it('rejects all waiters when flush throws', async () => {
    const barrier = createCommitBarrier({ coalesceMs: 10 });
    const p = barrier.scheduleFlush(async () => { throw new Error('disk'); });
    await assert.rejects(p, /disk/);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd /Users/mauriciosalas/R+
node --test lan-squad/persistence/commit-barrier.test.js
```

Expected: `Cannot find module './commit-barrier.js'`

- [ ] **Step 3: Implement `commit-barrier.js`**

```javascript
'use strict';

function createCommitBarrier({ coalesceMs = 150 } = {}) {
  let timer = null;
  let inFlight = null;
  let waiters = [];
  let generation = 0;
  let completedGeneration = 0;
  let pendingRun = null;

  function settleWaiters(err) {
    const batch = waiters;
    waiters = [];
    for (const w of batch) {
      if (err) w.reject(err);
      else w.resolve(completedGeneration);
    }
  }

  async function runFlush(runFn) {
    if (inFlight) return inFlight;
    const myGen = ++generation;
    inFlight = (async () => {
      try {
        await runFn();
        completedGeneration = myGen;
        settleWaiters(null);
      } catch (e) {
        settleWaiters(e);
        throw e;
      } finally {
        inFlight = null;
        pendingRun = null;
      }
    })();
    return inFlight;
  }

  function armTimer() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (pendingRun) void runFlush(pendingRun);
    }, coalesceMs);
  }

  function scheduleFlush(runFn) {
    const captured = generation;
    pendingRun = runFn;
    armTimer();
    return new Promise((resolve, reject) => {
      waiters.push({
        resolve: (g) => {
          if (g >= captured) resolve();
          else scheduleFlush(runFn).then(resolve, reject);
        },
        reject,
      });
    });
  }

  async function flushNow(runFn) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingRun = runFn;
    return runFlush(runFn);
  }

  return { scheduleFlush, flushNow };
}

module.exports = { createCommitBarrier };
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
node --test lan-squad/persistence/commit-barrier.test.js
```

- [ ] **Step 5: Commit**

```bash
git add lan-squad/persistence/commit-barrier.js lan-squad/persistence/commit-barrier.test.js
git commit -m "feat(lan-host): add CommitBarrier for coalesced durable flushes"
```

---

### Task 2: Wire barrier into `host-store.js`

**Files:**
- Modify: `lan-squad/host-store.js`
- Modify: `lan-squad/host-store.test.js`

- [ ] **Step 1: Add contract test — no sync write on mutation path**

Add to `lan-squad/host-store.test.js`:

```javascript
const fs = require('node:fs');
const hostStoreSrc = fs.readFileSync(path.join(__dirname, 'host-store.js'), 'utf8');

it('persistState does not call atomicWriteJson synchronously on mutation path', () => {
  const fnBody = hostStoreSrc.slice(
    hostStoreSrc.indexOf('function schedulePersist'),
    hostStoreSrc.indexOf('function flushCacheToDisk')
  );
  assert.doesNotMatch(fnBody, /atomicWriteJson\(/);
});
```

Run: `node --test lan-squad/host-store.test.js` — fails until refactor.

- [ ] **Step 2: Replace `persistState` / `commitCacheNow` with barrier pipeline**

In `createHostStore`, after `const queue = createWriteQueue()`:

```javascript
const { createCommitBarrier } = require('./persistence/commit-barrier.js');
const commitBarrier = createCommitBarrier({ coalesceMs: 150 });
let lastCommitAudit = null;

async function flushCacheToDisk() {
  const t0 = Date.now();
  const snapshot = cache.get();
  if (useDb()) {
    await persistCacheToDb();
  } else {
    await writeJsonAtomic(filePath, snapshot);
  }
  lastCommitAudit = {
    commitMs: Date.now() - t0,
    byteLength: JSON.stringify(snapshot).length,
    shards: ['monolith'],
    coalesced: true,
    persistGeneration: 'json-monolith',
  };
}

function schedulePersist() {
  return commitBarrier.scheduleFlush(() =>
    queue.enqueue(() => flushCacheToDisk())
  );
}

async function awaitDurableCommit() {
  await schedulePersist();
}

async function flushCacheNow() {
  await commitBarrier.flushNow(() => queue.enqueue(() => flushCacheToDisk()));
}
```

Replace every `persistState()` call with `schedulePersist()` (fire-and-forget) **except** keep synchronous cache mutation before it.

Remove sync `atomicWriteJson` from old `persistState` and `commitCacheNow`. Update `putHistoriaClinicaQueued` to:

```javascript
return queue.enqueue(async () => {
  // ... existing mutation + audit ...
  await flushCacheNow();
  return out;
});
```

Change `flush()` export:

```javascript
function flush() {
  return flushCacheNow();
}
```

Export `awaitDurableCommit` and `getLastCommitAudit` from store factory return object.

- [ ] **Step 3: Coalescing integration test**

Add to `host-store.test.js`:

```javascript
it('10 rapid lab upserts within coalesce window produce one disk write', async () => {
  const writes = [];
  const orig = require('./atomic-json.js').writeJsonAtomic;
  require('./atomic-json.js').writeJsonAtomic = async (fp, obj) => {
    writes.push(fp);
    return orig(fp, obj);
  };
  try {
    const store = createHostStore({ filePath, teamCodePlain: 'cap' });
    const room = store.createRoom('Sala 1');
    store.putRoomSyncBundle(room.id, {
      baseRevision: 0,
      baseEntityVersions: {},
      agenda: [],
      todos: {},
      entries: [{ patient: { id: 'p1' }, note: {} }],
    });
    await store.flush();
    writes.length = 0;
    for (let i = 0; i < 10; i += 1) {
      store.upsertPatientLabHistorySet('p1', { id: 's' + i, date: '2026-06-08' }, Date.now());
    }
    await store.flush();
    assert.ok(writes.length <= 2, 'expected coalesced writes, got ' + writes.length);
  } finally {
    require('./atomic-json.js').writeJsonAtomic = orig;
  }
});
```

- [ ] **Step 4: Run host-store tests**

```bash
node --test lan-squad/host-store.test.js lan-squad/put-historia-clinica-queued.test.js
```

- [ ] **Step 5: Commit**

```bash
git add lan-squad/host-store.js lan-squad/host-store.test.js
git commit -m "feat(lan-host): async coalesced host commits (P0)"
```

---

### Task 3: HTTP handlers await durable commit

**Files:**
- Modify: `lan-squad/host-router.js`
- Modify: `lan-squad/host-router.test.js`

- [ ] **Step 1: Add integration test — 200 after disk flush**

In `host-router.test.js`, extend the existing `PUT /patients/:id/nota` describe block:

```javascript
it('returns 200 only after durable commit (reload from disk)', async () => {
  const { app, store, dir } = await makeApp();
  const room = store.createRoom('sala-1');
  store.putRoomSyncBundle(room.id, {
    baseRevision: 0,
    baseEntityVersions: {},
    agenda: [],
    todos: {},
    entries: [{ patient: { id: 'p1' }, note: { texto: 'a' } }],
  });
  await store.flush();
  const res = await doTypedMutationRequest(app, 'PUT', '/patients/p1/nota', {
    data: { texto: 'b' },
    expectedVersion: 0,
    clientId: 'c1',
    clientTimestamp: Date.now(),
  });
  assert.strictEqual(res.status, 200);
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
  const entry = raw.roomSyncBundles[room.id].entries.find((e) => e.patient.id === 'p1');
  assert.strictEqual(entry.note.texto, 'b');
});
```

- [ ] **Step 2: Make typed routes async + await**

Change each typed handler in `host-router.js` from sync `try/catch` to `async`:

```javascript
r.put('/patients/:id/nota', express.json({ limit: '256kb' }), async (req, res) => {
  try {
    const { data, expectedVersion, clientId, clientTimestamp } = req.body || {};
    if (data == null) return res.status(400).json({ error: 'data required' });
    const result = store.replacePatientNota(
      req.params.id,
      data,
      Number(expectedVersion ?? 0),
      Number(clientTimestamp || 0)
    );
    if (!result.ok) return res.status(404).json({ error: result.error });
    await store.awaitDurableCommit();
    broadcastLiveRevision(result.roomId || req.params.id, result.revision ?? 0, clientId || 'host');
    res.json({ ok: true, version: result.version, data: result.data, ...(result.lwwApplied ? { lwwApplied: true } : {}) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
```

Apply the same `await store.awaitDurableCommit()` pattern to:
- `POST …/lab-history/upsert-set`
- `PUT …/indicaciones`
- `PUT …/fields` (after `resolver.applyMutation`)

- [ ] **Step 3: Run router tests**

```bash
node --test lan-squad/host-router.test.js
```

- [ ] **Step 4: Commit**

```bash
git add lan-squad/host-router.js lan-squad/host-router.test.js
git commit -m "feat(lan-host): await durable commit on typed LAN mutations"
```

---

### Task 4: P0 docs + project context

**Files:**
- Modify: `.cursor/rules/project-context.mdc`
- Modify: `docs/superpowers/specs/2026-06-08-lan-host-persistence-optimization-design.md` (plan link)

- [ ] **Step 1: Update spec plan line**

Set `**Plan:**` to `` [`docs/superpowers/plans/2026-06-08-lan-host-persistence-optimization.md`](../plans/2026-06-08-lan-host-persistence-optimization.md) ``

- [ ] **Step 2: Prepend changelog in project-context.mdc**

```markdown
- **2026-06-08** `lan-host-persist`: async coalesced host commits (P0); P1–P3 sharded/sidecar/SQLite follow — `lan-squad/persistence/commit-barrier.js`, `host-store.js`.
```

- [ ] **Step 3: Commit**

```bash
git add .cursor/rules/project-context.mdc docs/superpowers/specs/2026-06-08-lan-host-persistence-optimization-design.md
git commit -m "docs(context): LAN host persistence P0 shipped"
```

---

## PR 2 — P1: Per-room JSON shards

Requires P0 merged.

---

### Task 5: JSON shard repositories

**Files:**
- Create: `lan-squad/persistence/json-meta-repository.js`
- Create: `lan-squad/persistence/json-room-bundle-repository.js`

- [ ] **Step 1: Implement meta repository**

`json-meta-repository.js`:

```javascript
'use strict';
const path = require('node:path');
const { readJson, writeJsonAtomic } = require('../atomic-json.js');

function metaPath(hostStateDir) {
  return path.join(hostStateDir, 'meta.json');
}

async function readMeta(hostStateDir) {
  return readJson(metaPath(hostStateDir));
}

async function writeMeta(hostStateDir, meta) {
  await writeJsonAtomic(metaPath(hostStateDir), meta);
}

function defaultMeta(teamCodeHash) {
  return {
    version: 2,
    teamCodeHash,
    patients: [],
    rooms: [],
    roomRevisions: {},
  };
}

module.exports = { readMeta, writeMeta, defaultMeta, metaPath };
```

- [ ] **Step 2: Implement room bundle repository**

`json-room-bundle-repository.js`:

```javascript
'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const { readJson, writeJsonAtomic } = require('../atomic-json.js');

function bundlePath(hostStateDir, roomId) {
  return path.join(hostStateDir, 'bundles', `${roomId}.json`);
}

async function readRoomBundle(hostStateDir, roomId) {
  return readJson(bundlePath(hostStateDir, roomId));
}

async function writeRoomBundle(hostStateDir, roomId, bundle) {
  const fp = bundlePath(hostStateDir, roomId);
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await writeJsonAtomic(fp, bundle);
}

module.exports = { readRoomBundle, writeRoomBundle, bundlePath };
```

- [ ] **Step 3: Commit**

```bash
git add lan-squad/persistence/json-meta-repository.js lan-squad/persistence/json-room-bundle-repository.js
git commit -m "feat(lan-host): JSON meta and room bundle repositories (P1)"
```

---

### Task 6: Sharded persistence adapter + monolith migration

**Files:**
- Create: `lan-squad/persistence/sharded-host-persistence.js`
- Create: `lan-squad/persistence/sharded-host-persistence.test.js`
- Modify: `lan-squad/host-store.js`

- [ ] **Step 1: Write migration round-trip test**

`sharded-host-persistence.test.js` — create monolith fixture with 2 rooms, call `migrateMonolithToShards`, load via `loadShardedState`, assert deep equal to original `roomSyncBundles` and `patients`.

- [ ] **Step 2: Implement `sharded-host-persistence.js`**

Key exports:

```javascript
async function loadShardedState(hostStateDir, teamCodeHash)
async function migrateMonolithToShards({ monolithPath, hostStateDir, teamCodeHash })
async function commitDirtyShards({ hostStateDir, cache, dirtyMeta, dirtyRooms })
async function repairShardsOnBoot(hostStateDir) // returns { repairedRooms: string[] }
```

`migrateMonolithToShards` (with **pre-flight** in `migrate-host-state.js` or `sharded-host-persistence.js`):

0. **Pre-flight (abort if any step fails — do not create `lan-host/`):**
   - Assert monolith file exists and `JSON.parse` succeeds.
   - Assert `version === 2` (run `migrateHostStateIfNeeded` on parsed object first).
   - Copy monolith to `lan-squad-host-state.json.pre-shard-backup` via temp + rename; verify backup parses and deep-equals normalized monolith (patients/rooms/bundles keys).
   - Only then `mkdir lan-host/bundles`.
1. Read monolith JSON (again from backup path or original).
2. Write `meta.json` with `patients`, `rooms`, `roomRevisions` built from each bundle's `revision`.
3. Write each `bundles/{roomId}.json`.
4. Rename original monolith → `lan-squad-host-state.json.migrated` (keep `.pre-shard-backup` as recovery copy).

`commitDirtyShards` write order: **bundle shards first**, then `meta.json` (update `roomRevisions[roomId]` after each bundle write).

- [ ] **Step 3: Extend `createHostStore`**

```javascript
function createHostStore({
  filePath,           // legacy monolith path (migration source)
  hostStateDir,       // new: path.join(userData, 'lan-host')
  teamCodePlain,
  dbManager = null,
  getClientId = () => 'host',
}) {
  const stateDir = hostStateDir || path.join(path.dirname(filePath), 'lan-host');
  // ...
  let dirtyMeta = false;
  const dirtyRooms = new Set();

  async function flushCacheToDisk() {
    if (useDb()) { /* unchanged P0 */ }
    else if (fs.existsSync(path.join(stateDir, 'meta.json'))) {
      await commitDirtyShards({ hostStateDir: stateDir, cache, dirtyMeta, dirtyRooms });
      dirtyMeta = false;
      dirtyRooms.clear();
    } else {
      await writeJsonAtomic(filePath, cache.get()); // pre-migration fallback
    }
  }

  function markDirty(roomId) {
    if (roomId) dirtyRooms.add(roomId);
    else dirtyMeta = true;
  }
}
```

After each mutation: `markDirty(roomId)` then `schedulePersist()`.

`loadFromDisk`: if `meta.json` exists → `loadShardedState` + `repairShardsOnBoot`; else if monolith exists → `migrateMonolithToShards` then load.

- [ ] **Step 4: Wire `server.js` and `main.js`**

```javascript
const lanHostStateDir = path.join(userData, 'lan-host');
const lanStatePath = path.join(userData, 'lan-squad-host-state.json');
// createHostStore({ filePath: lanStatePath, hostStateDir: lanHostStateDir, ... })
```

Update `lan-reset-squad-host-state` IPC to `fs.rmSync(lanHostStateDir, { recursive: true, force: true })` plus legacy monolith if present.

- [ ] **Step 5: Shard-only write test**

Assert lab upsert touches only `bundles/sala-1.json` bytes (mock `writeJsonAtomic` paths).

- [ ] **Step 6: Run tests + commit**

```bash
node --test lan-squad/persistence/sharded-host-persistence.test.js lan-squad/host-store.test.js
git commit -m "feat(lan-host): per-room JSON shards with monolith migration (P1)"
```

---

### Task 7: Boot crash repair

**Files:**
- Modify: `lan-squad/persistence/sharded-host-persistence.js`
- Modify: `server.js` (health extras)

- [ ] **Step 1: Test bundle-ahead-of-meta repair**

Write bundle with `revision: 5`, meta `roomRevisions[sala-1]: 3` → `repairShardsOnBoot` → meta becomes 5.

- [ ] **Step 2: Implement repair policy** (per spec § Crash recovery)

- [ ] **Step 3: Expose `repairedRoomCount` in `getHealthExtras`**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(lan-host): shard boot repair and health reporting (P1)"
```

---

## PR 3 — P2: Lab sidecar + cap

Requires P1 merged.

---

### Task 8: `lab-sidecar.js` write path

**Files:**
- Create: `lan-squad/persistence/lab-sidecar.js`
- Create: `lan-squad/persistence/lab-sidecar.test.js`

- [ ] **Step 1: Cap tests (no Array.sort on write)**

```javascript
it('upsertLabSidecar does not call Array.sort', () => {
  const src = fs.readFileSync(path.join(__dirname, 'lab-sidecar.js'), 'utf8');
  assert.doesNotMatch(src, /orderedIds[\s\S]{0,200}Array\.sort/);
});

it('caps at HOST_LAB_SET_CAP with prepend/pop only', () => {
  let sc = emptySidecar();
  for (let i = 0; i < 25; i += 1) {
    sc = upsertLabSidecar(sc, { id: 's' + i, date: '2026-06-0' + (i % 9) }, i);
  }
  assert.strictEqual(sc.orderedIds.length, 20);
});
```

- [ ] **Step 2: Implement `upsertLabSidecar`, `assembleLabHistory`, `sidecarPath`**

Constants: `HOST_LAB_SET_CAP = 20`.

- [ ] **Step 3: Commit**

```bash
git add lan-squad/persistence/lab-sidecar.js lan-squad/persistence/lab-sidecar.test.js
git commit -m "feat(lan-host): lab sidecar upsert with O(1) cap (P2)"
```

---

### Task 9: Integrate sidecar into host-store + router assemble

**Files:**
- Modify: `lan-squad/host-store.js`
- Modify: `lan-squad/host-router.js`
- Create: `lan-squad/persistence/lab-sidecar-persistence.test.js`

- [ ] **Step 1: Change `upsertPatientLabHistorySet`**

1. Upsert sidecar file `labs/{roomId}/{patientId}.json`.
2. Set `entry.labMeta = { labHistoryVersion, labSetCount, latestSetAt }`.
3. Delete `entry.labHistory` before bundle persist.
4. `markDirty(roomId)` + `markDirtyLab(patientId)` for commit routing.

- [ ] **Step 2: `getRoomSyncBundle` assembles labs for API**

In `host-router.js` `GET /rooms/:id/sync-bundle`, clone bundle and inject `labHistory` from sidecars (or wrap in store method `getRoomSyncBundleForApi(roomId)`).

- [ ] **Step 3: P2 lab migration on boot**

If `meta.labSidecarVersion < 1`, split existing `entry.labHistory` into sidecars.

- [ ] **Step 4: Bundle size stability test**

25 lab upserts → `bundles/sala-1.json` size delta &lt; 5%.

- [ ] **Step 5: Sidecar crash repair test**

Sidecar exists, `labMeta` missing → repair on boot.

- [ ] **Step 6: Run full LAN host tests + commit**

```bash
node --test lan-squad/persistence/lab-sidecar.test.js lan-squad/persistence/lab-sidecar-persistence.test.js lan-squad/host-router.test.js
git commit -m "feat(lan-host): lab sidecars decoupled from bundle writes (P2)"
```

---

## PR 4 — P2b: Lab entries in delta log

**Files:**
- Modify: `lan-squad/host-store.js` (delta log on lab upsert)
- Modify: `lan-squad/host-router.js` (pass `clientId`, return `deltaSeq`)
- Modify: `public/js/features/lan/orchestrator.mjs` (`applyLabUpsertDelta` in `applyLiveSyncDeltas`)

- [x] **Step 1:** Add delta log entry shape `{ type: 'lab_upsert', patientId, setId, set, deltaSeq }`
- [x] **Step 2:** Client `tryDeltaReplayFromHint` → `applyLiveSyncDeltas` applies lab deltas
- [x] **Step 3:** Tests (`host-store.test.js`, `lan-sync-wiring.test.mjs`)

---

## PR 5 — P3: Normalized SQLite repositories

Requires P2 merged. Gated on unlocked SQLCipher.

---

### Task 10: Schema v15 migration

**Files:**
- Modify: `lib/db/schema.mjs` (`SCHEMA_VERSION = 15`)
- Modify: `lib/db/schema.test.mjs`

- [ ] **Step 1: Add DDL for tables** (per spec — `lan_host_meta`, `lan_room_bundles`, `lan_bundle_entries`, `lan_lab_sets`, `lan_lab_set_order`)

No secondary indexes on `lan_lab_sets`. PK on `lan_lab_set_order (room_id, patient_id, pos)`.

- [ ] **Step 2: Migration function `migrateToV15LanHostTables(db)`**

Import from P2 JSON shards if `lan_host_meta.migration_generation` absent.

- [ ] **Step 3: Run schema tests**

```bash
node --test lib/db/schema.test.mjs
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(db): schema v15 normalized LAN host tables (P3)"
```

---

### Task 11: SQLite repositories

**Files:**
- Create: `lan-squad/persistence/sqlite-host-repositories.js`
- Create: `lan-squad/persistence/sqlite-host-repositories.test.js`

- [ ] **Step 1: Implement repos** — `loadCacheFromSql`, `commitLabUpsertTransaction`, `commitRoomBundle`, `commitMeta`

`commitLabUpsertTransaction` single `db.transaction(() => { … })`:
1. `INSERT OR REPLACE INTO lan_lab_sets …`
2. Update `lan_lab_set_order` (evict pos CAP-1 if needed)
3. Update `lan_bundle_entries.lab_meta_json`
4. `UPDATE lan_room_bundles SET revision = revision + 1`

- [ ] **Step 2: Bench test — 500 upserts stable p50**

```javascript
it('500 lab upserts do not grow transaction time linearly', () => {
  const times = [];
  for (let i = 0; i < 500; i += 1) { /* record ms */ }
  assert.ok(times[499] < times[0] * 3);
});
```

- [ ] **Step 3: Assert no secondary indexes on lan_lab_sets**

Query `sqlite_master` in test.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(lan-host): SQLite host repositories (P3)"
```

---

### Task 12: Host-store persistence mode switch

**Files:**
- Modify: `lan-squad/host-store.js`
- Modify: `lib/db/lan-host-persistence.mjs`
- Modify: `lan-squad/host-store-clinical-ops-db.test.js`

- [ ] **Step 1: `resolvePersistMode()`**

```javascript
function resolvePersistMode() {
  if (useDb() && dbManager.isUnlocked() && dbHasLanHostV15(db)) return 'sql-v3';
  if (fs.existsSync(metaPath)) return 'json-sharded';
  return 'json-monolith';
}
```

- [ ] **Step 2: Branch `flushCacheToDisk` by mode**

- [ ] **Step 3: Stop writing `lan_host_state.json` blob when `sql-v3`**

- [ ] **Step 4: Locked DB → still JSON shards (regression test)**

- [ ] **Step 5: Import test — GET /sync-bundle identical pre/post SQL migration**

- [ ] **Step 6: Backup JSON to `lan-host/.p3-sqlite-backup/` on first SQL import**

- [ ] **Step 7: Full test suite + commit**

```bash
node --test lan-squad/host-store.test.js lan-squad/host-store-clinical-ops-db.test.js lan-squad/persistence/sqlite-host-repositories.test.js lan-squad/host-router.test.js
git commit -m "feat(lan-host): SQL persistence path with JSON fallback (P3)"
```

---

### Task 13: Final docs + metrics

**Files:**
- Modify: `.cursor/rules/project-context.mdc` (Domain index + changelog)
- Optional: `public/js/features/lan/panel.mjs` — show `getLastCommitAudit()` in diagnostics

- [ ] **Step 1: Update project-context Domain index**

Add under LAN sync:

`| Host persistence | `lan-squad/persistence/*`, `host-store.js` sharded + SQL modes |`

- [ ] **Step 2: Changelog entry for P1–P3 when each ships**

- [ ] **Step 3: Commit**

```bash
git commit -m "docs(context): LAN host persistence P1–P3 complete"
```

---

## Final verification (all PRs merged)

```bash
cd /Users/mauriciosalas/R+
node --test lan-squad/persistence/commit-barrier.test.js \
  lan-squad/persistence/sharded-host-persistence.test.js \
  lan-squad/persistence/lab-sidecar.test.js \
  lan-squad/persistence/lab-sidecar-persistence.test.js \
  lan-squad/persistence/sqlite-host-repositories.test.js \
  lan-squad/host-store.test.js \
  lan-squad/host-store-clinical-ops-db.test.js \
  lan-squad/host-router.test.js \
  lan-squad/put-historia-clinica-queued.test.js \
  lib/db/schema.test.mjs
npm test
```

Manual smoke (host Mac):
1. Start R+ as LAN host with existing monolith → confirm auto-migration to `lan-host/`.
2. Add lab set on one patient → Activity Monitor: host process CPU spike &lt; 2s, fan stable.
3. Second Mac joins sala → `GET /sync-bundle` includes assembled `labHistory`.
4. Unlock SQLCipher → confirm SQL import; repeat lab upsert; confirm `lan_host_state` row not updated.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| P0 CommitBarrier + shared waiters | Task 1–2 |
| P0 no sync writeFileSync | Task 2 |
| P0 HTTP await durable commit | Task 3 |
| P0 commitMs audit | Task 2 (`lastCommitAudit`) |
| P1 shard layout + migration | Task 5–6 |
| P1 roomRevisions + write order | Task 6 |
| P1 crash repair | Task 7 |
| P2 sidecar + labMeta | Task 8–9 |
| P2 cap O(1) no sort | Task 8 |
| P2 GET assemble labHistory | Task 9 |
| P2b delta log labs | PR 4 (optional) |
| P3 schema tables | Task 10 |
| P3 PK-only lab_sets | Task 10–11 |
| P3 lan_lab_set_order cap | Task 11 |
| P3 JSON fallback when locked | Task 12 |
| server/main IPC reset | Task 6 |
| project-context updates | Task 4, 13 |

---

## Execution options

**Plan complete and saved to `docs/superpowers/plans/2026-06-08-lan-host-persistence-optimization.md`.**

1. **Subagent-Driven (recommended)** — one subagent per PR (P0 → P1 → P2 → P3), review between PRs.
2. **Inline Execution** — implement PR 1 (P0) in this session, checkpoint, then continue.

Which approach?
