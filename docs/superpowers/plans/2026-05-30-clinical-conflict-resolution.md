# Clinical Conflict Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace clock-based LiveSync relay and binary patient 409s with a unified versioned mutation model, central `ConflictResolver`, auto-merge on disjoint keys, `livesync:conflict` unicast, Clinical Diff Viewer, and IndexedDB draft buffer.

**Architecture:** Extend `host-store` with a per-room `entities` map (plus materialized `agenda`/`todos` arrays). `ConflictResolver.applyMutation()` is the only write path for versioned entities. Express `PUT /patients/:id` and WS `livesync:patch` both call it. Clients build envelopes via `versioned-mutation.mjs`; on structural conflict, persist draft then open diff modal.

**Tech Stack:** Node.js `node:test`, Express 5, `ws`, native IndexedDB in renderer, existing `lab-conflict-*` CSS.

**Spec:** `docs/superpowers/specs/2026-05-30-clinical-conflict-resolution-design.md`

**Prerequisite:** Complete `docs/superpowers/plans/2026-05-30-lan-security-hardening.md` first (Bearer HTTP, WS first-frame auth). Do not ship resolver on an unauthenticated WS hub.

---

## File map

| File | Action |
|------|--------|
| `lan-squad/entity-keys.js` | Create — `agendaKey`, `todoKey`, parse helpers |
| `lan-squad/host-store.js` | Modify — `getEntity`, `setEntity`, `materializeRoomViews` |
| `lan-squad/host-store.test.js` | Modify — entity + materialize tests |
| `lan-squad/conflict-resolver.js` | Create |
| `lan-squad/conflict-resolver.test.js` | Create |
| `lan-squad/host-router.js` | Modify — versioned `PUT /patients/:id` |
| `lan-squad/host-router.test.js` | Modify — 409 payload, auto-merge 200 |
| `lan-squad/ws-hub.js` | Modify — patch → resolver; unicast conflict |
| `lan-squad/ws-hub.test.js` | Create/extend — applied broadcast, conflict unicast |
| `public/js/versioned-mutation.mjs` | Create |
| `public/js/versioned-mutation.test.mjs` | Create |
| `public/js/draft-conflict-store.mjs` | Create |
| `public/js/draft-conflict-store.test.mjs` | Create |
| `public/js/features/clinical-conflict-viewer.mjs` | Create |
| `public/js/features/clinical-conflict-viewer.test.mjs` | Create |
| `public/js/lan-client.mjs` | Modify — `lan-conflict`, `lan-applied` events |
| `public/js/features/lan-sync.mjs` | Modify — builders, handlers, emit wrappers |
| `package.json` | Modify — add new tests to `scripts.test` |

---

### Task 0: Prerequisite gate

- [ ] **Step 1: Verify LAN security plan merged or complete**

Run:

```bash
node --test lan-squad/ws-hub.test.js 2>/dev/null | head -5
grep -l 'createBearerAuthMiddleware' lan-squad/host-router.js
```

Expected: WS auth tests exist; host-router uses Bearer middleware.

- [ ] **Step 2: If not complete, finish LAN security plan before Task 1**

Do not proceed with resolver on blind-relay `ws-hub.js`.

---

### Task 1: Entity keys and host-store registry

**Files:**
- Create: `lan-squad/entity-keys.js`
- Modify: `lan-squad/host-store.js`
- Modify: `lan-squad/host-store.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// lan-squad/host-store.test.js (add)
const { agendaEntityKey, todoEntityKey } = require('./entity-keys.js');

test('getEntity / setEntity round-trip for room todo', () => {
  const store = createHostStore({ filePath, teamCodePlain: 'test' });
  const room = store.createRoom('UCI');
  store.setEntity({
    roomId: room.id,
    entityType: 'todo',
    entityId: 'td1',
    patientId: 'p1',
    version: 1,
    data: { id: 'td1', text: 'Labs', completed: false, updatedAt: '2026-05-30T10:00:00.000Z' },
  });
  const got = store.getEntity({ roomId: room.id, entityType: 'todo', entityId: 'td1', patientId: 'p1' });
  assert.strictEqual(got.version, 1);
  assert.strictEqual(got.data.text, 'Labs');
  const bundle = store.getRoomSyncBundle(room.id);
  assert.ok(Array.isArray(bundle.todos.p1));
  assert.strictEqual(bundle.todos.p1[0].text, 'Labs');
});
```

- [ ] **Step 2: Run test — FAIL**

Run: `node --test lan-squad/host-store.test.js`  
Expected: `getEntity is not a function`

- [ ] **Step 3: Implement `entity-keys.js`**

```javascript
'use strict';

function agendaEntityKey(eventId) {
  return 'agenda:' + String(eventId || '');
}

function todoEntityKey(patientId, todoId) {
  return 'todo:' + String(patientId || '') + ':' + String(todoId || '');
}

function parseEntityKey(key) {
  if (key.startsWith('agenda:')) return { entityType: 'agenda', entityId: key.slice(7) };
  if (key.startsWith('todo:')) {
    const rest = key.slice(5).split(':');
    return { entityType: 'todo', patientId: rest[0], entityId: rest[1] };
  }
  return null;
}

module.exports = { agendaEntityKey, todoEntityKey, parseEntityKey };
```

- [ ] **Step 4: Add to `host-store.js`**

- Ensure `defaultState` / bundles include `entities: {}` when missing on load.
- `getEntity({ entityType, entityId, roomId, patientId })`:
  - `patient` → find in `state.patients` by id; return `{ version, data: patientRow }`.
  - `agenda` | `todo` → read `roomSyncBundles[roomId].entities[agendaEntityKey|todoEntityKey]`.
- `setEntity({ roomId, entityType, entityId, patientId, version, data, deleted })` — write entity record.
- `materializeRoomViews(roomId)` — rebuild `bundle.agenda` array and `bundle.todos` map from non-deleted entities.

Call `materializeRoomViews` after every `setEntity` for room types.

- [ ] **Step 5: Run tests — PASS**

- [ ] **Step 6: Commit**

```bash
git add lan-squad/entity-keys.js lan-squad/host-store.js lan-squad/host-store.test.js
git commit -m "feat(lan): versioned entity registry in host store"
```

---

### Task 2: ConflictResolver core

**Files:**
- Create: `lan-squad/conflict-resolver.js`
- Create: `lan-squad/conflict-resolver.test.js`
- Modify: `package.json` (`scripts.test`)

- [ ] **Step 1: Write failing tests**

```javascript
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { createHostStore } = require('./host-store.js');
const { createConflictResolver, ConflictError } = require('./conflict-resolver.js');

test('auto-merge disjoint keys on version mismatch', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-merge-'));
  const filePath = path.join(dir, 's.json');
  const store = createHostStore({ filePath, teamCodePlain: 'tok' });
  const p = store.upsertPatient({ id: 'p1', nombre: 'Ana', version: 1 }, null);
  const resolver = createConflictResolver({ store });
  // Simulate server advanced: cuarto changed by B
  store.upsertPatient({ id: 'p1', nombre: 'Ana', cuarto: '201', expectedVersion: 1 }, 1);
  const server = store.getEntity({ entityType: 'patient', entityId: 'p1' });
  const out = resolver.applyMutation({
    entityType: 'patient',
    entityId: 'p1',
    expectedVersion: 1,
    baseData: { id: 'p1', nombre: 'Ana', cuarto: '101' },
    changedKeys: ['cama'],
    data: { id: 'p1', nombre: 'Ana', cuarto: '101', cama: 'B' },
  });
  assert.strictEqual(out.autoMerged, true);
  assert.strictEqual(out.data.cuarto, '201');
  assert.strictEqual(out.data.cama, 'B');
});

test('structural conflict when keys overlap', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-conf-'));
  const filePath = path.join(dir, 's.json');
  const store = createHostStore({ filePath, teamCodePlain: 'tok' });
  store.upsertPatient({ id: 'p1', nombre: 'Ana', cuarto: '101' }, null);
  const resolver = createConflictResolver({ store });
  store.upsertPatient({ id: 'p1', nombre: 'Ana', cuarto: '201' }, 1);
  assert.throws(
    () =>
      resolver.applyMutation({
        entityType: 'patient',
        entityId: 'p1',
        expectedVersion: 1,
        baseData: { id: 'p1', nombre: 'Ana', cuarto: '101' },
        changedKeys: ['cuarto'],
        data: { id: 'p1', nombre: 'Ana', cuarto: '102' },
      }),
    (e) => e instanceof ConflictError && e.conflictingKeys.includes('cuarto')
  );
});
```

Note: adjust `upsertPatient` calls once Task 3 migrates patient writes to envelope-only; for Task 2 tests, use `setEntity` directly if needed.

- [ ] **Step 2: Run — FAIL**

Run: `node --test lan-squad/conflict-resolver.test.js`

- [ ] **Step 3: Implement `conflict-resolver.js`**

```javascript
'use strict';

class ConflictError extends Error {
  constructor(details) {
    super('conflict');
    this.code = 'CONFLICT';
    Object.assign(this, details);
  }
}

function keysChanged(serverData, baseData) {
  const keys = new Set([...Object.keys(serverData || {}), ...Object.keys(baseData || {})]);
  const changed = [];
  for (const k of keys) {
    if (serverData[k] !== baseData[k]) changed.push(k);
  }
  return changed;
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  return out;
}

function createConflictResolver({ store }) {
  function applyMutation(mutation) {
    const entityType = mutation.entityType;
    const entityId = mutation.entityId;
    const expectedVersion = Number(mutation.expectedVersion || 0);
    const changedKeys = Array.isArray(mutation.changedKeys) ? mutation.changedKeys : [];
    const baseData = mutation.baseData;
    const data = mutation.data || {};
    const roomId = mutation.roomId;
    const patientId = mutation.patientId;

    let server = store.getEntity({ entityType, entityId, roomId, patientId });

    if (!server) {
      if (expectedVersion > 0) {
        throw new ConflictError({ conflictingKeys: ['*'], serverData: null, clientData: data });
      }
      const version = 1;
      store.setEntity({ roomId, entityType, entityId, patientId, version, data, deleted: mutation.op === 'delete' });
      if (roomId) store.materializeRoomViews(roomId);
      return { ok: true, entityType, entityId, version, data, autoMerged: false };
    }

    if (expectedVersion === server.version) {
      const version = server.version + 1;
      const nextData = mutation.op === 'delete' ? { ...server.data, _deleted: true } : { ...server.data, ...data };
      store.setEntity({ roomId, entityType, entityId, patientId, version, data: nextData, deleted: mutation.op === 'delete' });
      if (roomId) store.materializeRoomViews(roomId);
      return { ok: true, entityType, entityId, version, data: nextData, autoMerged: false };
    }

    if (!baseData || !changedKeys.length) {
      throw new ConflictError({
        conflictingKeys: changedKeys.length ? changedKeys : ['*'],
        serverData: server.data,
        clientData: data,
        serverVersion: server.version,
        expectedVersion,
      });
    }

    const serverChangedKeys = keysChanged(server.data, baseData);
    const overlap = serverChangedKeys.filter((k) => changedKeys.includes(k));
    if (overlap.length === 0) {
      const merged = { ...server.data, ...pick(data, changedKeys) };
      const version = server.version + 1;
      store.setEntity({ roomId, entityType, entityId, patientId, version, data: merged, deleted: false });
      if (roomId) store.materializeRoomViews(roomId);
      return { ok: true, entityType, entityId, version, data: merged, autoMerged: true };
    }

    throw new ConflictError({
      conflictingKeys: overlap,
      serverData: server.data,
      clientData: data,
      serverVersion: server.version,
      expectedVersion,
    });
  }

  return { applyMutation, ConflictError };
}

module.exports = { createConflictResolver, ConflictError };
```

Refine patient persistence: `setEntity` for `patient` should update `state.patients[]` row (version, fields).

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Add `lan-squad/conflict-resolver.test.js` to `package.json` scripts.test**

- [ ] **Step 6: Commit**

```bash
git add lan-squad/conflict-resolver.js lan-squad/conflict-resolver.test.js package.json
git commit -m "feat(lan): ConflictResolver with disjoint-key auto-merge"
```

---

### Task 3: HTTP PUT /patients versioned envelope

**Files:**
- Modify: `lan-squad/host-router.js`
- Modify: `lan-squad/host-router.test.js`
- Modify: `server.js` (pass resolver into router factory)

- [ ] **Step 1: Write failing test**

```javascript
test('PUT /patients/:id auto-merge returns 200 with autoMerged', async () => {
  // seed patient v1, advance server cuarto to v2, PUT with expectedVersion 1 + disjoint cama change
  // expect 200 { autoMerged: true }
});

test('PUT /patients/:id overlap returns 409 conflict body', async () => {
  // expect conflictingKeys includes 'cuarto'
});
```

- [ ] **Step 2: Change `createLanRouter({ store, broadcast, resolver })`**

```javascript
r.put('/patients/:id', express.json({ limit: '2mb' }), (req, res) => {
  try {
    const mutation = {
      entityType: 'patient',
      entityId: req.params.id,
      expectedVersion: Number(req.body.expectedVersion ?? 0),
      changedKeys: req.body.changedKeys || [],
      baseData: req.body.baseData,
      data: { ...req.body.data, id: req.params.id },
      op: req.body.op,
    };
    if (!mutation.changedKeys.length && mutation.expectedVersion > 0) {
      return res.status(400).json({ error: 'changedKeys_required' });
    }
    const out = resolver.applyMutation(mutation);
    broadcast('sync', { type: 'patients-updated' });
    res.json(out);
  } catch (e) {
    if (e.code === 'CONFLICT') {
      return res.status(409).json({
        error: 'conflict',
        entityType: 'patient',
        entityId: req.params.id,
        expectedVersion: e.expectedVersion,
        serverVersion: e.serverVersion,
        serverData: e.serverData,
        clientData: e.clientData,
        conflictingKeys: e.conflictingKeys,
      });
    }
    res.status(400).json({ error: e.message });
  }
});
```

Remove legacy `expectedVersion` + shallow merge path.

- [ ] **Step 3: Wire resolver in `server.js`**

```javascript
const resolver = createConflictResolver({ store: lanStore });
appExpress.use('/api/lan/v1', createLanRouter({ store: lanStore, broadcast, resolver }));
```

- [ ] **Step 4: Run `node --test lan-squad/host-router.test.js` — PASS**

- [ ] **Step 5: Commit**

```bash
git add lan-squad/host-router.js lan-squad/host-router.test.js server.js
git commit -m "feat(lan): versioned patient PUT through ConflictResolver"
```

---

### Task 4: WebSocket hub — resolver + unicast conflict

**Files:**
- Modify: `lan-squad/ws-hub.js`
- Create/extend: `lan-squad/ws-hub.test.js`
- Modify: `server.js` — `attachWsHub(httpServer, { getState, resolver, getTeamCodeHash })`

- [ ] **Step 1: Write failing WS test**

Use two `ws` clients on `live:test` channel (after auth frame mock):

- Client A sends patch with stale version + overlapping key → A receives `livesync:conflict`, B receives nothing.
- Client A sends disjoint merge patch → both receive `livesync:applied`.

- [ ] **Step 2: Implement message handler in `wss.on('connection')`**

After authenticated:

```javascript
ws.on('message', (raw) => {
  if (!ws.__authenticated) { /* existing quarantine auth */ return; }
  let msg;
  try { msg = JSON.parse(String(raw)); } catch (_e) { return; }
  if (msg.type !== 'livesync:patch' || !msg.mutation) {
    if (channel.startsWith('live:')) broadcast(channel, msg);
    return;
  }
  try {
    const out = resolver.applyMutation({ ...msg.mutation, clientId: msg.clientId, roomId: msg.roomId });
    broadcast(channel, {
      type: 'livesync:applied',
      roomId: msg.roomId,
      entityType: out.entityType,
      entityId: out.entityId,
      version: out.version,
      data: out.data,
      autoMerged: out.autoMerged,
      patientId: msg.mutation.patientId,
    });
  } catch (e) {
    if (e.code === 'CONFLICT') {
      const conflictMsg = {
        type: 'livesync:conflict',
        roomId: msg.roomId,
        entityType: msg.mutation.entityType,
        entityId: msg.mutation.entityId,
        patientId: msg.mutation.patientId,
        conflictingKeys: e.conflictingKeys,
        server: { version: e.serverVersion, data: e.serverData },
        client: { version: e.expectedVersion, data: e.clientData },
        expectedVersion: e.expectedVersion,
      };
      ws.send(JSON.stringify(conflictMsg));
      return;
    }
    ws.close();
  }
});
```

Track `ws.__clientId` from auth frame or first patch `clientId`.

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git add lan-squad/ws-hub.js lan-squad/ws-hub.test.js server.js
git commit -m "feat(lan): WS patches through ConflictResolver with conflict unicast"
```

---

### Task 5: IndexedDB draft-conflict store

**Files:**
- Create: `public/js/draft-conflict-store.mjs`
- Create: `public/js/draft-conflict-store.test.mjs`

- [ ] **Step 1: Write failing test (in-memory fake IDB or skip if no env — use export `__test` hooks)**

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { openDraftDb, saveDraftConflict, listDraftConflicts, deleteDraftConflict } from './draft-conflict-store.mjs';

test('saveDraftConflict returns id', async () => {
  // Guard: skip if typeof indexedDB === 'undefined'
  const id = await saveDraftConflict({ entityType: 'patient', entityId: 'p1', conflictingKeys: ['cuarto'] });
  assert.ok(id);
  const list = await listDraftConflicts();
  assert.ok(list.some((d) => d.id === id));
  await deleteDraftConflict(id);
});
```

- [ ] **Step 2: Implement native IDB wrapper**

```javascript
const DB_NAME = 'rplus-clinical';
const STORE = 'draft-conflicts';
const DB_VERSION = 1;

function openDraftDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('savedAt', 'savedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraftConflict(record) {
  const id = crypto.randomUUID();
  const row = { ...record, id, savedAt: new Date().toISOString() };
  const db = await openDraftDb();
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
  return id;
}
```

Export `listDraftConflicts`, `getDraftConflict`, `deleteDraftConflict`.

- [ ] **Step 3: Run test in environment with IDB (Electron/browser test) or document manual verify**

- [ ] **Step 4: Add to `package.json` test script if runnable; else manual checkpoint**

- [ ] **Step 5: Commit**

```bash
git add public/js/draft-conflict-store.mjs public/js/draft-conflict-store.test.mjs
git commit -m "feat(sync): IndexedDB draft buffer for clinical conflicts"
```

---

### Task 6: versioned-mutation builder

**Files:**
- Create: `public/js/versioned-mutation.mjs`
- Create: `public/js/versioned-mutation.test.mjs`

- [ ] **Step 1: Write failing tests**

```javascript
import { createMutationBuilder } from './versioned-mutation.mjs';
import assert from 'node:assert';
import test from 'node:test';

test('builder captures base and changedKeys', () => {
  const b = createMutationBuilder('todo', 't1');
  const m = b
    .captureBase({ id: 't1', text: 'a', version: 2, patientId: 'p1' })
    .set('text', 'b')
    .build({ roomId: 'r1', patientId: 'p1' });
  assert.deepStrictEqual(m.changedKeys, ['text']);
  assert.strictEqual(m.expectedVersion, 2);
  assert.strictEqual(m.data.text, 'b');
});
```

- [ ] **Step 2: Implement**

```javascript
export function createMutationBuilder(entityType, entityId) {
  let base = null;
  const working = {};
  const changedKeys = new Set();

  return {
    captureBase(snapshot) {
      base = structuredClone(snapshot);
      Object.assign(working, structuredClone(snapshot));
      return this;
    },
    set(key, value) {
      changedKeys.add(key);
      working[key] = value;
      return this;
    },
    build(extra = {}) {
      return {
        entityType,
        entityId,
        expectedVersion: Number(base?.version ?? 0),
        baseData: base,
        changedKeys: [...changedKeys],
        data: { ...working },
        ...extra,
      };
    },
  };
}

export function wrapLiveSyncPatch(roomId, clientId, mutation) {
  return { type: 'livesync:patch', roomId, clientId, mutation };
}
```

- [ ] **Step 3: Run — PASS**

- [ ] **Step 4: Commit**

```bash
git add public/js/versioned-mutation.mjs public/js/versioned-mutation.test.mjs package.json
git commit -m "feat(sync): versioned mutation builder for LAN envelopes"
```

---

### Task 7: Clinical Diff Viewer modal

**Files:**
- Create: `public/js/features/clinical-conflict-viewer.mjs`
- Create: `public/js/features/clinical-conflict-viewer.test.mjs`

- [ ] **Step 1: Write test for HTML builder (pure function)**

```javascript
import { buildConflictDiffHtml } from './clinical-conflict-viewer.mjs';

test('highlights conflicting keys in both columns', () => {
  const html = buildConflictDiffHtml({
    conflictingKeys: ['cuarto'],
    localData: { cuarto: '101', cama: 'A' },
    serverData: { cuarto: '201', cama: 'A' },
  });
  assert.ok(html.includes('cuarto'));
  assert.ok(html.includes('conflict-field'));
});
```

- [ ] **Step 2: Implement `openClinicalConflictViewer(opts)`**

- `buildConflictDiffHtml` — table rows per key; class `conflict-field` on overlapping keys.
- Modal: `lab-conflict-backdrop` + `lab-conflict-modal` (match `patients.mjs`).
- Buttons: **Usar servidor**, **Editar mi borrador**, **Cerrar**.
- Callbacks: `onUseServer`, `onEditDraft`, `onClose`.

- [ ] **Step 3: Run test — PASS**

- [ ] **Step 4: Commit**

```bash
git add public/js/features/clinical-conflict-viewer.mjs public/js/features/clinical-conflict-viewer.test.mjs
git commit -m "feat(ui): Clinical Diff Viewer for sync conflicts"
```

---

### Task 8: Conflict orchestration in lan-sync

**Files:**
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Add `handleSyncConflict(payload)`**

```javascript
import { saveDraftConflict } from '../draft-conflict-store.mjs';
import { openClinicalConflictViewer } from './clinical-conflict-viewer.mjs';

async function handleSyncConflict(payload) {
  const draftId = await saveDraftConflict({
    transport: payload.transport,
    entityType: payload.entityType,
    entityId: payload.entityId,
    roomId: payload.roomId || null,
    patientId: payload.patientId || null,
    localSnapshot: payload.localSnapshot,
    serverSnapshot: payload.serverSnapshot,
    conflictingKeys: payload.conflictingKeys,
  });
  openClinicalConflictViewer({
    draftId,
    conflictingKeys: payload.conflictingKeys,
    localData: payload.localSnapshot?.data,
    serverData: payload.serverSnapshot?.data,
    onUseServer: () => { /* apply server to storage */ },
    onEditDraft: () => { /* load localSnapshot into editor */ },
    onClose: () => {},
  });
}
```

- [ ] **Step 2: Wire `lanClient.addEventListener('lan-conflict', …)`**

Map WS `livesync:conflict` detail → `handleSyncConflict({ transport: 'ws', … })`.

- [ ] **Step 3: Wrap `lanFetch` / patient push**

On `res.status === 409`, parse JSON, build `localSnapshot` from last attempted mutation, `await handleSyncConflict` before returning.

- [ ] **Step 4: Commit**

```bash
git add public/js/features/lan-sync.mjs
git commit -m "feat(sync): draft-then-modal conflict orchestration"
```

---

### Task 9: Migrate LiveSync emitters to versioned envelopes

**Files:**
- Modify: `public/js/features/lan-sync.mjs`
- Modify: `public/js/features/todos.mjs` (only if emit signatures change — prefer lan-sync wrappers)

- [ ] **Step 1: Refactor `emitLiveSyncTodoUpsert`**

```javascript
function emitLiveSyncTodoUpsert(patientId, todo) {
  if (!activeLiveSyncRoomId || !lanClient.liveConnected || !todo) return;
  const mutation = createMutationBuilder('todo', todo.id)
    .captureBase(todo) // caller must pass todo with .version from last applied
    .build({ roomId: activeLiveSyncRoomId, patientId, op: 'upsert' });
  lanClient.sendLive(wrapLiveSyncPatch(activeLiveSyncRoomId, getLanClientId(), mutation));
}
```

Track per-todo `version` in local storage after each `livesync:applied` (increment server version).

- [ ] **Step 2: Same for `emitLiveSyncAgendaUpsert` / `Delete` / `TodoDelete` / `PatientDelete`**

- [ ] **Step 3: Update `onLiveSyncWireMessage`**

Handle `livesync:applied`:

```javascript
if (data.type === 'livesync:applied') {
  applyLiveSyncApplied(data); // update local entity version + data
  return;
}
```

Deprecate handling raw peer `livesync:patch` (host is source of truth for applied).

- [ ] **Step 4: Manual two-client test checklist**

- [ ] Resident A edits todo text; B edits different todo → both apply silently.
- [ ] A and B edit same todo `text` → B gets conflict modal; draft in IDB after force-close.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/lan-sync.mjs
git commit -m "feat(sync): versioned LiveSync patch envelopes and applied handler"
```

---

### Task 10: lan-client events

**Files:**
- Modify: `public/js/lan-client.mjs`

- [ ] **Step 1: Dispatch events in `onmessage`**

```javascript
if (data.type === 'livesync:conflict') {
  this.dispatchEvent(new CustomEvent('lan-conflict', { detail: data }));
  return;
}
if (data.type === 'livesync:applied') {
  this.dispatchEvent(new CustomEvent('lan-applied', { detail: data }));
  return;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/lan-client.mjs
git commit -m "feat(lan): lan-conflict and lan-applied client events"
```

---

### Task 11: Draft recovery UI + bundle

**Files:**
- Modify: `public/js/features/lan-sync.mjs` or settings panel
- Run: `npm run bundle:renderer`

- [ ] **Step 1: Add "Borradores de conflicto" list in LAN settings section**

Call `listDraftConflicts()`; show count; reopen viewer on click.

- [ ] **Step 2: Bundle renderer**

```bash
npm run bundle:renderer
```

- [ ] **Step 3: Full test run**

```bash
node --test lan-squad/conflict-resolver.test.js lan-squad/host-store.test.js lan-squad/host-router.test.js lan-squad/ws-hub.test.js public/js/versioned-mutation.test.mjs
```

- [ ] **Step 4: Commit**

```bash
git add public/js/features/lan-sync.mjs public/js/app.bundle.mjs public/js/app.bundle.mjs.map public/js/app.bundle.meta.json package.json
git commit -m "chore: conflict draft recovery UI and renderer bundle"
```

---

## Spec coverage checklist

| Spec § | Task |
|--------|------|
| Versioned envelope | 3, 6, 9 |
| ConflictResolver | 2 |
| Entity map + materialized views | 1 |
| HTTP 409 | 3, 8 |
| WS conflict unicast | 4, 10 |
| WS applied broadcast | 4, 9 |
| IndexedDB draft | 5, 8 |
| Diff Viewer | 7, 8 |
| Builders | 6, 9 |
| LAN security prerequisite | 0 |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-30-clinical-conflict-resolution.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — implement in this session using **executing-plans**, batched with checkpoints  

Which approach?
