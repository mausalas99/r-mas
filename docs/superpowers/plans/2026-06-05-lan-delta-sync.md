# LAN Delta Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add v1 field-level LAN delta sync for `historiaClinica`, `agenda`, and `todo` while preserving full-bundle sync as the compatibility and recovery baseline.

**Architecture:** Implement delta sync as an overlay on the current LAN host state. The host validates `pathValues` / `pathMeta`, applies accepted paths to canonical entity records with flat `fieldMeta`, appends a short replay log, and broadcasts canonical applied deltas to v1 peers while v0 peers continue to converge through revision/full-bundle hints.

**Tech Stack:** Node.js CommonJS host modules in `lan-squad/`, Express LAN router, `ws` WebSocket hub, renderer ESM modules under `public/js/`, `node --test` colocated tests.

---

## File Structure

- Create `lan-squad/delta-paths.js`: host-side path normalization, validation, nested get/set/delete helpers, and per-entity allowlists for v1.
- Create `lan-squad/delta-paths.test.js`: unit tests for path allowlists, prototype rejection, numeric array-index rejection, and explicit `null`.
- Create `lan-squad/delta-resolver.js`: transport-agnostic host apply pipeline for `livesync:delta` and HTTP delta POST.
- Create `lan-squad/delta-resolver.test.js`: unit tests for `ok`, `partial_success`, `stale_delta`, `invalid_delta`, `fieldMeta`, `deltaSeq`, and delta log behavior.
- Modify `lan-squad/host-store.js`: persist `fieldMeta` on entity records, add room `deltaSeq` / `deltaLog`, expose helpers used by the delta resolver, and preserve legacy entity behavior.
- Modify `lan-squad/ws-hub.js`: store per-client delta capabilities and route `livesync:delta` through the delta resolver.
- Modify `lan-squad/ws-hub.test.js`: verify v1 delta broadcast and v0 revision-hint compatibility behavior.
- Modify `lan-squad/host-router.js`: add `POST /rooms/:id/delta` and `GET /rooms/:id/deltas?afterSeq=N` endpoints.
- Modify `lan-squad/host-router.test.js`: verify HTTP delta application and replay/gap fallback signals.
- Modify `public/js/versioned-mutation.mjs`: add explicit delta mutation builder and wrapper, without changing existing patch behavior.
- Modify `public/js/versioned-mutation.test.mjs`: verify delta payload shape and `txId`.
- Create `public/js/lan-delta-client.mjs`: renderer helpers for delta labels, echo suppression bookkeeping, and safe local path application.
- Create `public/js/lan-delta-client.test.mjs`: unit tests for label mapping, echo suppression, remote apply guard, and explicit `null`.
- Modify `public/js/live-sync-outbox.mjs`: support `kind: 'delta'`.
- Modify `lib/db/lan-sync-outbox.mjs`: support `kind: 'delta'` in SQLCipher outbox.
- Modify outbox tests in `public/js/live-sync-outbox.test.mjs` and `lib/db/lan-sync-outbox.test.mjs`.
- Modify `public/js/features/lan/orchestrator.mjs`: handle `livesync:delta:applied`, suppress self echoes, apply remote accepted paths, and toast rejected paths.
- Modify `public/js/features/lan/room.mjs`: include delta capabilities in hello and handle replay on reconnect.
- Modify `public/js/features/lan/push.mjs`: flush delta outbox items through HTTP delta endpoint; preserve existing bundle/clinical_ops paths.
- Modify `public/js/historia-clinica-lan-sync.mjs`: emit delta mutation for v1-safe HC paths when possible and fall back to current mutation for opaque sections.

---

### Task 1: Host Path Validation

**Files:**
- Create: `lan-squad/delta-paths.js`
- Create: `lan-squad/delta-paths.test.js`

- [ ] **Step 1: Write failing validation tests**

Create `lan-squad/delta-paths.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeDeltaPath,
  validateDeltaPaths,
  applyPathValue,
} = require('./delta-paths.js');

test('normalizeDeltaPath trims and rejects prototype pollution segments', () => {
  assert.equal(normalizeDeltaPath(' labsAtAdmission.na '), 'labsAtAdmission.na');
  assert.throws(() => normalizeDeltaPath('__proto__.isAdmin'), /unsafe_path/);
  assert.throws(() => normalizeDeltaPath('meta.constructor.value'), /unsafe_path/);
  assert.throws(() => normalizeDeltaPath('meta.prototype.value'), /unsafe_path/);
});

test('validateDeltaPaths rejects numeric array index paths', () => {
  const result = validateDeltaPaths('historiaClinica', {
    pathValues: { 'plan.0.text': 'wrong target' },
    pathMeta: { 'plan.0.text': { clientTimestamp: 1718293049283 } },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'invalid_delta');
  assert.deepEqual(result.rejectedPaths, ['plan.0.text']);
});

test('validateDeltaPaths accepts allowlisted historiaClinica scalar paths and null clears', () => {
  const result = validateDeltaPaths('historiaClinica', {
    pathValues: {
      'labsAtAdmission.na': null,
      'signosVitalesIngreso.fc': '88',
    },
    pathMeta: {
      'labsAtAdmission.na': { clientTimestamp: 1718293049283 },
      'signosVitalesIngreso.fc': { clientTimestamp: 1718293049290 },
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.paths, ['labsAtAdmission.na', 'signosVitalesIngreso.fc']);
});

test('validateDeltaPaths rejects unknown entity and missing path metadata', () => {
  assert.equal(
    validateDeltaPaths('patient', {
      pathValues: { nombre: 'No v1' },
      pathMeta: { nombre: { clientTimestamp: 1 } },
    }).error,
    'unsupported_entity'
  );

  const result = validateDeltaPaths('todo', {
    pathValues: { text: 'pendiente' },
    pathMeta: {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'missing_path_meta');
  assert.deepEqual(result.rejectedPaths, ['text']);
});

test('applyPathValue sets nested fields and deletes null leaves', () => {
  const data = { labsAtAdmission: { na: 138, k: 4.1 } };
  applyPathValue(data, 'labsAtAdmission.na', 140);
  assert.equal(data.labsAtAdmission.na, 140);
  applyPathValue(data, 'labsAtAdmission.na', null);
  assert.equal(Object.prototype.hasOwnProperty.call(data.labsAtAdmission, 'na'), false);
  assert.equal(data.labsAtAdmission.k, 4.1);
});
```

- [ ] **Step 2: Run validation tests and verify failure**

Run:

```bash
node --test lan-squad/delta-paths.test.js
```

Expected: FAIL with `Cannot find module './delta-paths.js'`.

- [ ] **Step 3: Implement path helpers**

Create `lan-squad/delta-paths.js`:

```js
'use strict';

const UNSAFE_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const SUPPORTED_ENTITIES = new Set(['historiaClinica', 'agenda', 'todo']);

const ALLOWLIST = {
  historiaClinica: [
    /^identificacion(?:\.[A-Za-z][A-Za-z0-9_-]*)?$/,
    /^motivoConsulta$/,
    /^apnp(?:\.[A-Za-z][A-Za-z0-9_-]*)?$/,
    /^app(?:\.[A-Za-z][A-Za-z0-9_-]*)?$/,
    /^ahf(?:\.[A-Za-z][A-Za-z0-9_-]*)?$/,
    /^genero$/,
    /^sexual(?:\.[A-Za-z][A-Za-z0-9_-]*)?$/,
    /^padecimientoActual$/,
    /^datosNegados(?:\.[A-Za-z][A-Za-z0-9_-]*)?$/,
    /^ipas(?:\.[A-Za-z][A-Za-z0-9_-]*)?$/,
    /^signosVitalesIngreso(?:\.[A-Za-z][A-Za-z0-9_-]*)?$/,
    /^labsAtAdmission(?:\.[A-Za-z][A-Za-z0-9_-]*)?$/,
    /^labAnchor$/,
    /^meta(?:\.[A-Za-z][A-Za-z0-9_-]*)?$/,
    /^labLookbackHours$/,
    /^plan$/,
  ],
  agenda: [/^title$/, /^date$/, /^time$/, /^patientId$/, /^notes$/, /^status$/, /^updatedAt$/],
  todo: [/^text$/, /^completed$/, /^priority$/, /^updatedAt$/, /^patientId$/],
};

function normalizeDeltaPath(path) {
  const normalized = String(path || '').trim();
  if (!normalized) throw new Error('empty_path');
  const segments = normalized.split('.');
  for (const segment of segments) {
    if (!segment) throw new Error('empty_path_segment');
    if (UNSAFE_SEGMENTS.has(segment)) throw new Error('unsafe_path');
    if (/^\d+$/.test(segment)) throw new Error('array_index_path');
  }
  return segments.join('.');
}

function pathAllowed(entityType, path) {
  const rules = ALLOWLIST[entityType] || [];
  return rules.some((rule) => rule.test(path));
}

function validateDeltaPaths(entityType, delta) {
  const type = String(entityType || '');
  if (!SUPPORTED_ENTITIES.has(type)) {
    return { ok: false, error: 'unsupported_entity', rejectedPaths: [] };
  }
  const values = delta && delta.pathValues && typeof delta.pathValues === 'object' ? delta.pathValues : null;
  const meta = delta && delta.pathMeta && typeof delta.pathMeta === 'object' ? delta.pathMeta : null;
  if (!values || !meta) return { ok: false, error: 'invalid_delta', rejectedPaths: [] };

  const paths = [];
  const rejectedPaths = [];
  let missingMeta = false;

  for (const rawPath of Object.keys(values)) {
    let path;
    try {
      path = normalizeDeltaPath(rawPath);
    } catch (_e) {
      rejectedPaths.push(rawPath);
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(meta, rawPath) && !Object.prototype.hasOwnProperty.call(meta, path)) {
      missingMeta = true;
      rejectedPaths.push(path);
      continue;
    }
    if (!pathAllowed(type, path)) {
      rejectedPaths.push(path);
      continue;
    }
    paths.push(path);
  }

  if (rejectedPaths.length) {
    return { ok: false, error: missingMeta ? 'missing_path_meta' : 'invalid_delta', paths, rejectedPaths };
  }
  return { ok: true, paths, rejectedPaths: [] };
}

function applyPathValue(target, path, value) {
  const segments = normalizeDeltaPath(path).split('.');
  let cursor = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  const leaf = segments[segments.length - 1];
  if (value === null) delete cursor[leaf];
  else cursor[leaf] = value;
  return target;
}

module.exports = {
  normalizeDeltaPath,
  validateDeltaPaths,
  applyPathValue,
  pathAllowed,
};
```

- [ ] **Step 4: Run validation tests and verify pass**

Run:

```bash
node --test lan-squad/delta-paths.test.js
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lan-squad/delta-paths.js lan-squad/delta-paths.test.js
git commit -m "feat(lan): validate delta sync paths"
```

---

### Task 2: Host Store Delta State

**Files:**
- Modify: `lan-squad/host-store.js`
- Test: `lan-squad/delta-resolver.test.js`

- [ ] **Step 1: Write failing store helper tests through the resolver contract**

Create the first part of `lan-squad/delta-resolver.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHostStore } = require('./host-store.js');
const { createDeltaResolver } = require('./delta-resolver.js');

function makeStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-delta-'));
  const store = createHostStore({
    filePath: path.join(dir, 'state.json'),
    teamCodePlain: '123456',
  });
  return { dir, store };
}

test('applyDelta creates fieldMeta and appends delta log entry', () => {
  const { store } = makeStore();
  const resolver = createDeltaResolver({ store, nowIso: () => '2026-06-05T20:45:10.000Z' });
  const out = resolver.applyDelta({
    roomId: 'room-a',
    entityType: 'historiaClinica',
    entityId: 'pat_1',
    patientId: 'pat_1',
    clientId: 'lc_a',
    txId: 'tx_1',
    pathValues: { 'labsAtAdmission.na': 140 },
    pathMeta: { 'labsAtAdmission.na': { clientTimestamp: 1718293049283 } },
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.deltaSeq, 1);
  assert.deepEqual(out.acceptedPaths, ['labsAtAdmission.na']);
  assert.deepEqual(out.rejectedPaths, []);

  const row = store.getEntity({
    roomId: 'room-a',
    entityType: 'historiaClinica',
    entityId: 'pat_1',
    patientId: 'pat_1',
  });
  assert.equal(row.data.labsAtAdmission.na, 140);
  assert.equal(row.fieldMeta['labsAtAdmission.na'].deltaSeq, 1);

  const replay = store.getRoomDeltaLog('room-a', 0);
  assert.equal(replay.ok, true);
  assert.equal(replay.deltas.length, 1);
  assert.equal(replay.deltas[0].txId, 'tx_1');
});
```

- [ ] **Step 2: Run the resolver test and verify failure**

Run:

```bash
node --test lan-squad/delta-resolver.test.js
```

Expected: FAIL with `Cannot find module './delta-resolver.js'`.

- [ ] **Step 3: Add host-store helper methods**

In `lan-squad/host-store.js`, extend new room bundle shape in `ensureRoomBundle`:

```js
b = {
  revision: 0,
  entityVersions: {},
  deltaSeq: 0,
  deltaLog: [],
  committedAt: nowIso(),
  uploadedByClientId: '',
  entities: {},
  agenda: [],
  todos: {},
  entries: [],
  manejo: null,
  clinicalOps: null,
  audit_log: [],
};
```

After the existing `entityVersions` normalization in `ensureRoomBundle`, add:

```js
if (!Array.isArray(b.deltaLog)) b.deltaLog = [];
if (!Number.isFinite(Number(b.deltaSeq))) b.deltaSeq = 0;
```

Update `getEntity` return values for `agenda`, `todo`, and `historiaClinica` to include field metadata:

```js
return {
  version: Number(rec.version || 1),
  data: rec.data,
  fieldMeta: rec.fieldMeta && typeof rec.fieldMeta === 'object' ? rec.fieldMeta : {},
};
```

Add these functions near `setEntity`:

```js
function ensureDeltaEntity({ roomId, entityType, entityId, patientId }) {
  const state = ensureLoadedSync();
  const bundle = ensureRoomBundle(state, roomId);
  const type = String(entityType || '');
  const id = String(entityId || '');
  let key = '';
  if (type === 'agenda') key = agendaEntityKey(id);
  else if (type === 'todo') key = todoEntityKey(patientId, id);
  else if (type === 'historiaClinica') key = historiaClinicaEntityKey(patientId || id);
  else throw new Error('unsupported_delta_entity');

  if (!bundle.entities[key] || typeof bundle.entities[key] !== 'object') {
    bundle.entities[key] = {
      version: 0,
      data: {},
      fieldMeta: {},
      updatedAt: nowIso(),
      deleted: false,
    };
  }
  if (!bundle.entities[key].fieldMeta || typeof bundle.entities[key].fieldMeta !== 'object') {
    bundle.entities[key].fieldMeta = {};
  }
  if (!bundle.entities[key].data || typeof bundle.entities[key].data !== 'object') {
    bundle.entities[key].data = {};
  }
  return { bundle, key, rec: bundle.entities[key] };
}

function commitDeltaEntity({
  roomId,
  entityType,
  entityId,
  patientId,
  data,
  fieldMeta,
  clientId,
  txId,
  acceptedPaths,
  buildFieldMeta,
}) {
  const { bundle, key, rec } = ensureDeltaEntity({ roomId, entityType, entityId, patientId });
  const nextVersion = Number(rec.version || 0) + 1;
  const nextSeq = Number(bundle.deltaSeq || 0) + 1;
  const committedAt = nowIso();
  const nextFieldMeta =
    typeof buildFieldMeta === 'function'
      ? buildFieldMeta({ deltaSeq: nextSeq, committedAt, previousFieldMeta: fieldMeta || {} })
      : fieldMeta;
  rec.version = nextVersion;
  rec.data = data && typeof data === 'object' ? data : {};
  rec.fieldMeta = nextFieldMeta && typeof nextFieldMeta === 'object' ? nextFieldMeta : {};
  rec.updatedAt = committedAt;
  rec.deleted = false;
  bundle.entityVersions[key] = nextVersion;
  bundle.revision = Number(bundle.revision || 0) + 1;
  bundle.deltaSeq = nextSeq;
  bundle.committedAt = committedAt;
  if (!Array.isArray(bundle.deltaLog)) bundle.deltaLog = [];
  return { bundle, key, rec, version: nextVersion, deltaSeq: nextSeq, committedAt };
}

function appendDeltaLog(roomId, entry) {
  const state = ensureLoadedSync();
  const bundle = ensureRoomBundle(state, roomId);
  if (!Array.isArray(bundle.deltaLog)) bundle.deltaLog = [];
  bundle.deltaLog.push(entry);
  while (bundle.deltaLog.length > 200) bundle.deltaLog.shift();
  persistState();
}

function getRoomDeltaLog(roomId, afterSeq) {
  const bundle = getRoomSyncBundle(roomId);
  if (!bundle) return { ok: false, error: 'no_bundle', deltas: [] };
  const seq = Number(afterSeq || 0);
  const log = Array.isArray(bundle.deltaLog) ? bundle.deltaLog : [];
  const deltas = log.filter((entry) => Number(entry.deltaSeq || 0) > seq);
  if (deltas.length && Number(deltas[0].deltaSeq) !== seq + 1) {
    return { ok: false, error: 'delta_gap', deltas: [] };
  }
  return { ok: true, deltas, latestDeltaSeq: Number(bundle.deltaSeq || 0) };
}
```

Export these methods in the returned object:

```js
ensureDeltaEntity,
commitDeltaEntity,
appendDeltaLog,
getRoomDeltaLog,
```

- [ ] **Step 4: Run the resolver test and verify the expected failure moved**

Run:

```bash
node --test lan-squad/delta-resolver.test.js
```

Expected: FAIL with `Cannot find module './delta-resolver.js'`. The host-store changes are ready for the resolver.

- [ ] **Step 5: Commit**

```bash
git add lan-squad/host-store.js lan-squad/delta-resolver.test.js
git commit -m "feat(lan): add host delta state helpers"
```

---

### Task 3: Host Delta Resolver

**Files:**
- Create: `lan-squad/delta-resolver.js`
- Modify: `lan-squad/delta-resolver.test.js`

- [ ] **Step 1: Add resolver behavior tests**

Append to `lan-squad/delta-resolver.test.js`:

```js
test('applyDelta partially accepts paths by per-path timestamp', () => {
  const { store } = makeStore();
  const resolver = createDeltaResolver({ store, nowIso: () => '2026-06-05T20:45:10.000Z' });

  resolver.applyDelta({
    roomId: 'room-a',
    entityType: 'historiaClinica',
    entityId: 'pat_1',
    patientId: 'pat_1',
    clientId: 'lc_a',
    txId: 'tx_seed',
    pathValues: { 'labsAtAdmission.na': 138, plan: 'Plan A' },
    pathMeta: {
      'labsAtAdmission.na': { clientTimestamp: 100 },
      plan: { clientTimestamp: 200 },
    },
  });

  const out = resolver.applyDelta({
    roomId: 'room-a',
    entityType: 'historiaClinica',
    entityId: 'pat_1',
    patientId: 'pat_1',
    clientId: 'lc_b',
    txId: 'tx_partial',
    pathValues: { 'labsAtAdmission.na': 140, plan: 'Older plan' },
    pathMeta: {
      'labsAtAdmission.na': { clientTimestamp: 300 },
      plan: { clientTimestamp: 150 },
    },
  });

  assert.equal(out.status, 'partial_success');
  assert.deepEqual(out.acceptedPaths, ['labsAtAdmission.na']);
  assert.deepEqual(out.rejectedPaths, ['plan']);

  const row = store.getEntity({
    roomId: 'room-a',
    entityType: 'historiaClinica',
    entityId: 'pat_1',
    patientId: 'pat_1',
  });
  assert.equal(row.data.labsAtAdmission.na, 140);
  assert.equal(row.data.plan, 'Plan A');
});

test('applyDelta returns stale_delta when all paths are older', () => {
  const { store } = makeStore();
  const resolver = createDeltaResolver({ store, nowIso: () => '2026-06-05T20:45:10.000Z' });
  resolver.applyDelta({
    roomId: 'room-a',
    entityType: 'todo',
    entityId: 'todo_1',
    patientId: 'pat_1',
    clientId: 'lc_a',
    txId: 'tx_seed',
    pathValues: { text: 'Nueva indicación' },
    pathMeta: { text: { clientTimestamp: 200 } },
  });

  const out = resolver.applyDelta({
    roomId: 'room-a',
    entityType: 'todo',
    entityId: 'todo_1',
    patientId: 'pat_1',
    clientId: 'lc_b',
    txId: 'tx_old',
    pathValues: { text: 'Vieja indicación' },
    pathMeta: { text: { clientTimestamp: 100 } },
  });

  assert.equal(out.status, 'stale_delta');
  assert.deepEqual(out.acceptedPaths, []);
  assert.deepEqual(out.rejectedPaths, ['text']);
});

test('applyDelta rejects invalid paths without mutating state', () => {
  const { store } = makeStore();
  const resolver = createDeltaResolver({ store, nowIso: () => '2026-06-05T20:45:10.000Z' });
  const out = resolver.applyDelta({
    roomId: 'room-a',
    entityType: 'historiaClinica',
    entityId: 'pat_1',
    patientId: 'pat_1',
    clientId: 'lc_a',
    txId: 'tx_bad',
    pathValues: { '__proto__.isAdmin': true, 'plan.0.text': 'wrong target' },
    pathMeta: {
      '__proto__.isAdmin': { clientTimestamp: 1 },
      'plan.0.text': { clientTimestamp: 1 },
    },
  });

  assert.equal(out.status, 'invalid_delta');
  assert.deepEqual(out.acceptedPaths, []);
  assert.deepEqual(out.rejectedPaths, ['__proto__.isAdmin', 'plan.0.text']);
  assert.equal(
    store.getEntity({ roomId: 'room-a', entityType: 'historiaClinica', entityId: 'pat_1', patientId: 'pat_1' }),
    null
  );
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test lan-squad/delta-resolver.test.js
```

Expected: FAIL with `Cannot find module './delta-resolver.js'`.

- [ ] **Step 3: Implement resolver**

Create `lan-squad/delta-resolver.js`:

```js
'use strict';

const { validateDeltaPaths, normalizeDeltaPath, applyPathValue } = require('./delta-paths.js');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function timestampFor(delta, path) {
  const meta = delta.pathMeta && (delta.pathMeta[path] || delta.pathMeta[normalizeDeltaPath(path)]);
  return Number(meta && meta.clientTimestamp ? meta.clientTimestamp : 0);
}

function shouldAcceptPath(currentMeta, incomingTs, clientId) {
  const currentTs = Number(currentMeta && currentMeta.clientTimestamp ? currentMeta.clientTimestamp : 0);
  if (incomingTs > currentTs) return true;
  if (incomingTs < currentTs) return false;
  const currentClient = String(currentMeta && currentMeta.clientId ? currentMeta.clientId : '');
  return String(clientId || '') > currentClient;
}

function buildRejectedMeta(fieldMeta, rejectedPaths) {
  const rejectedMeta = {};
  for (const path of rejectedPaths) {
    const meta = fieldMeta[path] || {};
    rejectedMeta[path] = {
      winnerClientId: meta.clientId || null,
      winnerCommittedAt: meta.committedAt || null,
    };
  }
  return rejectedMeta;
}

function createDeltaResolver({ store, nowIso = () => new Date().toISOString() }) {
  function applyDelta(delta) {
    const entityType = String(delta && delta.entityType ? delta.entityType : '');
    const validation = validateDeltaPaths(entityType, delta);
    if (!validation.ok) {
      return {
        ok: false,
        status: 'invalid_delta',
        error: validation.error,
        acceptedPaths: [],
        rejectedPaths: validation.rejectedPaths || [],
      };
    }

    const roomId = String(delta.roomId || '').trim();
    const entityId = String(delta.entityId || '').trim();
    const patientId = delta.patientId != null ? String(delta.patientId) : entityId;
    const clientId = String(delta.clientId || 'unknown');
    const txId = String(delta.txId || '');
    const existing =
      store.getEntity({ roomId, entityType, entityId, patientId }) ||
      { version: 0, data: {}, fieldMeta: {} };
    const data = clone(existing.data || {});
    const fieldMeta = clone(existing.fieldMeta || {});
    const acceptedPaths = [];
    const rejectedPaths = [];
    const committedAt = nowIso();

    for (const path of validation.paths) {
      const incomingTs = timestampFor(delta, path);
      if (!shouldAcceptPath(fieldMeta[path], incomingTs, clientId)) {
        rejectedPaths.push(path);
        continue;
      }
      applyPathValue(data, path, delta.pathValues[path]);
      acceptedPaths.push(path);
    }

    if (!acceptedPaths.length) {
      return {
        ok: false,
        status: 'stale_delta',
        entityType,
        entityId,
        patientId,
        acceptedPaths: [],
        rejectedPaths,
        rejectedMeta: buildRejectedMeta(fieldMeta, rejectedPaths),
      };
    }

    const commit = store.commitDeltaEntity({
      roomId,
      entityType,
      entityId,
      patientId,
      data,
      fieldMeta,
      clientId,
      txId,
      acceptedPaths,
      buildFieldMeta({ deltaSeq, committedAt: hostCommittedAt, previousFieldMeta }) {
        const nextMeta = { ...previousFieldMeta };
        for (const path of acceptedPaths) {
          nextMeta[path] = {
            clientTimestamp: timestampFor(delta, path),
            committedAt: hostCommittedAt,
            deltaSeq,
            clientId,
          };
        }
        return nextMeta;
      },
    });

    const out = {
      ok: true,
      status: rejectedPaths.length ? 'partial_success' : 'ok',
      roomId,
      entityType,
      entityId,
      patientId,
      originClientId: clientId,
      txId,
      deltaSeq: commit.deltaSeq,
      version: commit.version,
      acceptedPaths,
      rejectedPaths,
      rejectedMeta: buildRejectedMeta(fieldMeta, rejectedPaths),
      pathValues: Object.fromEntries(acceptedPaths.map((path) => [path, delta.pathValues[path]])),
      fieldMeta: Object.fromEntries(acceptedPaths.map((path) => [path, commit.rec.fieldMeta[path]])),
    };

    store.appendDeltaLog(roomId, out);
    if (roomId) store.materializeRoomViews(roomId);
    return out;
  }

  return { applyDelta };
}

module.exports = { createDeltaResolver };
```

- [ ] **Step 4: Run resolver tests and verify pass**

Run:

```bash
node --test lan-squad/delta-paths.test.js lan-squad/delta-resolver.test.js
```

Expected: PASS, all path and resolver tests.

- [ ] **Step 5: Commit**

```bash
git add lan-squad/delta-resolver.js lan-squad/delta-resolver.test.js lan-squad/host-store.js
git commit -m "feat(lan): apply field-level deltas on host"
```

---

### Task 4: HTTP Delta Endpoint And Replay

**Files:**
- Modify: `lan-squad/host-router.js`
- Modify: `lan-squad/host-router.test.js`

- [ ] **Step 1: Add HTTP endpoint tests**

Append to `lan-squad/host-router.test.js`:

```js
async function setupLanDeltaRouterTest(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  const room = store.createRoom('Sala delta');
  const app = mountLanRouter(store);
  const server = http.createServer(app);
  await listenServer(server);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  return { dir, store, room, server, code, baseUrl };
}

test('POST /rooms/:id/delta applies accepted paths and broadcasts revision', async () => {
  const { server, store, baseUrl, room, dir, code } =
    await setupLanDeltaRouterTest('lan-delta-http-');
  try {
    const res = await fetch(
      `${baseUrl}/api/lan/v1/rooms/${encodeURIComponent(room.id)}/delta`,
      {
        method: 'POST',
        headers: { ...bearerHeaders(code), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'historiaClinica',
          entityId: 'pat_1',
          patientId: 'pat_1',
          clientId: 'lc_a',
          txId: 'tx_http',
          pathValues: { 'labsAtAdmission.na': 140 },
          pathMeta: { 'labsAtAdmission.na': { clientTimestamp: 1718293049283 } },
        }),
      }
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.deltaSeq, 1);
    const row = store.getEntity({
      roomId: room.id,
      entityType: 'historiaClinica',
      entityId: 'pat_1',
      patientId: 'pat_1',
    });
    assert.equal(row.data.labsAtAdmission.na, 140);
  } finally {
    await tearDownLanTest({ server, dir, store });
  }
});

test('GET /rooms/:id/deltas returns gap when replay cannot be contiguous', async () => {
  const { server, store, baseUrl, room, dir, code } =
    await setupLanDeltaRouterTest('lan-delta-replay-');
  try {
    const bundle = store.getRoomSyncBundle(room.id);
    bundle.deltaSeq = 5;
    bundle.deltaLog = [{ deltaSeq: 5, acceptedPaths: ['text'] }];
    const res = await fetch(
      `${baseUrl}/api/lan/v1/rooms/${encodeURIComponent(room.id)}/deltas?afterSeq=3`,
      { headers: bearerHeaders(code) }
    );
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error, 'delta_gap');
    assert.equal(body.fallback, 'sync_bundle');
  } finally {
    await tearDownLanTest({ server, dir, store });
  }
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test lan-squad/host-router.test.js
```

Expected: FAIL with `404` for `/delta`.

- [ ] **Step 3: Add delta resolver to router dependencies**

In `lan-squad/host-router.js`, import the resolver:

```js
const { createDeltaResolver } = require('./delta-resolver.js');
```

Inside `createLanRouter`, initialize:

```js
const deltaResolver = createDeltaResolver({ store });
```

Add routes before `PUT /rooms/:id/sync-bundle`:

```js
r.post('/rooms/:id/delta', express.json({ limit: '1mb' }), (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const out = deltaResolver.applyDelta({
    ...body,
    roomId: req.params.id,
  });
  if (out.status === 'invalid_delta') return res.status(400).json(out);
  if (out.status === 'stale_delta') return res.status(409).json(out);
  broadcast(`live:${encodeURIComponent(req.params.id)}`, {
    type: 'livesync:delta:applied',
    ...out,
  });
  broadcastLiveRevision(req.params.id, store.getRoomSyncBundle(req.params.id)?.revision, body.clientId);
  res.json(out);
});

r.get('/rooms/:id/deltas', (req, res) => {
  const afterSeq = Number(req.query.afterSeq || 0);
  const out = store.getRoomDeltaLog(req.params.id, afterSeq);
  if (!out.ok) {
    return res.status(409).json({
      error: out.error,
      fallback: 'sync_bundle',
    });
  }
  res.json(out);
});
```

- [ ] **Step 4: Run HTTP tests and verify pass**

Run:

```bash
node --test lan-squad/host-router.test.js lan-squad/delta-resolver.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lan-squad/host-router.js lan-squad/host-router.test.js
git commit -m "feat(lan): add HTTP delta sync endpoint"
```

---

### Task 5: WebSocket Delta Routing

**Files:**
- Modify: `lan-squad/ws-hub.js`
- Modify: `lan-squad/ws-hub.test.js`

- [ ] **Step 1: Add WS delta test**

Append to `lan-squad/ws-hub.test.js`:

```js
test('livesync:delta broadcasts canonical applied delta with origin txId', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-ws-delta-'));
  const filePath = path.join(dir, 'state.json');
  const token = 'e'.repeat(64);
  const roomId = 'delta-room';
  const store = createHostStore({ filePath, teamCodePlain: token });
  store.createRoom('Sala delta');
  const resolver = createConflictResolver({ store });
  const httpServer = http.createServer();
  attachWsHub(httpServer, { getState: () => store.getState(), resolver });
  await listen(httpServer);
  const { port } = httpServer.address();
  const channel = `live:${roomId}`;
  try {
    const wsA = await connectAuthedLiveWs(port, token, channel);
    const wsB = await connectAuthedLiveWs(port, token, channel);
    const appliedPromise = waitForMessage(wsB, (msg) => msg.type === 'livesync:delta:applied');
    wsA.send(JSON.stringify({
      type: 'livesync:delta',
      roomId,
      clientId: 'lc_a',
      capabilities: { deltaSync: 1 },
      delta: {
        entityType: 'todo',
        entityId: 'todo_1',
        patientId: 'pat_1',
        txId: 'tx_ws',
        pathValues: { text: 'Pedir laboratorios' },
        pathMeta: { text: { clientTimestamp: 1718293049283 } },
      },
    }));

    const applied = await appliedPromise;
    assert.equal(applied.originClientId, 'lc_a');
    assert.equal(applied.txId, 'tx_ws');
    assert.equal(applied.status, 'ok');
    assert.deepEqual(applied.acceptedPaths, ['text']);
    wsA.close();
    wsB.close();
  } finally {
    await new Promise((resolve) => httpServer.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run WS tests and verify failure**

Run:

```bash
node --test lan-squad/ws-hub.test.js
```

Expected: FAIL because `livesync:delta` is not handled.

- [ ] **Step 3: Route `livesync:delta` through resolver**

In `lan-squad/ws-hub.js`, require the delta resolver:

```js
const { createDeltaResolver } = require('./delta-resolver.js');
```

Inside `attachWsHub`, initialize:

```js
const deltaResolver = resolver && resolver.store ? createDeltaResolver({ store: resolver.store }) : null;
```

If `resolver.store` is not available, adjust `createConflictResolver` to expose its store:

```js
return { applyMutation, ConflictError, store };
```

In the message handler after `clientId` capture:

```js
if (msg.capabilities && typeof msg.capabilities === 'object') {
  ws.__capabilities = msg.capabilities;
}
```

Before the existing `livesync:patch` branch:

```js
if (msg.type === 'livesync:delta' && msg.delta && deltaResolver) {
  try {
    const out = deltaResolver.applyDelta({
      ...msg.delta,
      roomId: msg.roomId,
      clientId: msg.clientId || msg.delta.clientId,
    });
    const applied = {
      type: 'livesync:delta:applied',
      ...out,
    };
    broadcast(channel, applied);
    if (out.ok) {
      broadcast(channel, {
        type: 'livesync:revision',
        roomId: msg.roomId,
        revision: out.revision || 0,
        clientId: msg.clientId || 'host',
      });
    }
  } catch (_e) {
    ws.close();
  }
  return;
}
```

- [ ] **Step 4: Run WS tests and verify pass**

Run:

```bash
node --test lan-squad/ws-hub.test.js lan-squad/delta-resolver.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lan-squad/ws-hub.js lan-squad/ws-hub.test.js lan-squad/conflict-resolver.js
git commit -m "feat(lan): route websocket deltas"
```

---

### Task 6: Renderer Delta Mutation Builder

**Files:**
- Modify: `public/js/versioned-mutation.mjs`
- Modify: `public/js/versioned-mutation.test.mjs`

- [ ] **Step 1: Add failing builder tests**

Append to `public/js/versioned-mutation.test.mjs`:

```js
test('delta builder captures pathValues, pathMeta, and txId', () => {
  const m = createDeltaMutationBuilder('historiaClinica', 'pat_1')
    .setPath('labsAtAdmission.na', 140, 1718293049283)
    .clearPath('labsAtAdmission.k', 1718293049290)
    .build({ roomId: 'room-a', patientId: 'pat_1', clientId: 'lc_a' });

  assert.equal(m.entityType, 'historiaClinica');
  assert.equal(m.entityId, 'pat_1');
  assert.equal(m.clientId, 'lc_a');
  assert.match(m.txId, /^tx_/);
  assert.deepEqual(m.pathValues, {
    'labsAtAdmission.na': 140,
    'labsAtAdmission.k': null,
  });
  assert.equal(m.pathMeta['labsAtAdmission.na'].clientTimestamp, 1718293049283);
  assert.equal(m.pathMeta['labsAtAdmission.k'].clientTimestamp, 1718293049290);
});

test('wrapLiveSyncDelta builds livesync delta envelope', () => {
  const delta = { entityType: 'todo', entityId: 't1', pathValues: {}, pathMeta: {}, txId: 'tx_1' };
  assert.deepEqual(wrapLiveSyncDelta('room-a', 'lc_a', delta), {
    type: 'livesync:delta',
    roomId: 'room-a',
    clientId: 'lc_a',
    delta,
  });
});
```

Update the test import to include:

```js
createDeltaMutationBuilder,
wrapLiveSyncDelta,
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test public/js/versioned-mutation.test.mjs
```

Expected: FAIL with missing export `createDeltaMutationBuilder`.

- [ ] **Step 3: Implement builder**

Add to `public/js/versioned-mutation.mjs`:

```js
function newTxId() {
  return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

export function createDeltaMutationBuilder(entityType, entityId) {
  const pathValues = {};
  const pathMeta = {};
  return {
    setPath(path, value, clientTimestamp) {
      const key = String(path || '').trim();
      if (!key) return this;
      pathValues[key] = value;
      pathMeta[key] = { clientTimestamp: Number(clientTimestamp || Date.now()) };
      return this;
    },
    clearPath(path, clientTimestamp) {
      return this.setPath(path, null, clientTimestamp);
    },
    build(extra = {}) {
      return {
        entityType,
        entityId,
        expectedVersion: Number(extra.expectedVersion || 0),
        pathValues: { ...pathValues },
        pathMeta: { ...pathMeta },
        txId: extra.txId || newTxId(),
        ...extra,
      };
    },
  };
}

export function wrapLiveSyncDelta(roomId, clientId, delta) {
  return { type: 'livesync:delta', roomId, clientId, delta };
}
```

- [ ] **Step 4: Run builder tests and verify pass**

Run:

```bash
node --test public/js/versioned-mutation.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/versioned-mutation.mjs public/js/versioned-mutation.test.mjs
git commit -m "feat(lan): add delta mutation builder"
```

---

### Task 7: Renderer Delta Client Helpers

**Files:**
- Create: `public/js/lan-delta-client.mjs`
- Create: `public/js/lan-delta-client.test.mjs`

- [ ] **Step 1: Write failing helper tests**

Create `public/js/lan-delta-client.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deltaLabelForPath,
  createDeltaEchoTracker,
  applyDeltaPathValues,
  withRemoteDeltaApply,
  isRemoteDeltaApplying,
} from './lan-delta-client.mjs';

test('deltaLabelForPath maps paths to Spanish labels', () => {
  assert.equal(deltaLabelForPath('historiaClinica', 'labsAtAdmission.na'), 'Sodio');
  assert.equal(deltaLabelForPath('historiaClinica', 'plan'), 'Plan');
  assert.equal(deltaLabelForPath('todo', 'text'), 'Pendiente');
  assert.equal(deltaLabelForPath('agenda', 'title'), 'Agenda');
});

test('echo tracker recognizes local txId once', () => {
  const tracker = createDeltaEchoTracker('lc_a');
  tracker.track('tx_1');
  assert.equal(tracker.isOwnEcho({ originClientId: 'lc_a', txId: 'tx_1' }), true);
  assert.equal(tracker.isOwnEcho({ originClientId: 'lc_a', txId: 'tx_1' }), false);
});

test('applyDeltaPathValues applies explicit null as field clear', () => {
  const data = { labsAtAdmission: { na: 140, k: 4.1 } };
  applyDeltaPathValues(data, { 'labsAtAdmission.na': null });
  assert.deepEqual(data, { labsAtAdmission: { k: 4.1 } });
});

test('withRemoteDeltaApply guards nested local save hooks', async () => {
  assert.equal(isRemoteDeltaApplying(), false);
  await withRemoteDeltaApply(async () => {
    assert.equal(isRemoteDeltaApplying(), true);
  });
  assert.equal(isRemoteDeltaApplying(), false);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test public/js/lan-delta-client.test.mjs
```

Expected: FAIL with missing module.

- [ ] **Step 3: Implement helper module**

Create `public/js/lan-delta-client.mjs`:

```js
const LABELS = {
  historiaClinica: {
    'labsAtAdmission': 'Laboratorios de ingreso',
    'labsAtAdmission.na': 'Sodio',
    'labsAtAdmission.k': 'Potasio',
    'signosVitalesIngreso.fc': 'Frecuencia cardiaca',
    plan: 'Plan',
    motivoConsulta: 'Motivo de consulta',
    padecimientoActual: 'Padecimiento actual',
  },
  todo: {
    text: 'Pendiente',
    completed: 'Pendiente',
    priority: 'Prioridad',
  },
  agenda: {
    title: 'Agenda',
    date: 'Fecha',
    time: 'Hora',
    notes: 'Notas',
  },
};

let remoteApplyDepth = 0;

export function deltaLabelForPath(entityType, path) {
  const labels = LABELS[entityType] || {};
  return labels[path] || labels[String(path || '').split('.')[0]] || String(path || 'cambio');
}

export function createDeltaEchoTracker(localClientId) {
  const pending = new Set();
  return {
    track(txId) {
      if (txId) pending.add(String(txId));
    },
    isOwnEcho(msg) {
      const own = String(msg && msg.originClientId || '') === String(localClientId || '');
      const txId = String(msg && msg.txId || '');
      if (!own || !txId || !pending.has(txId)) return false;
      pending.delete(txId);
      return true;
    },
  };
}

export function applyDeltaPathValues(target, pathValues) {
  Object.keys(pathValues || {}).forEach(function (path) {
    const segments = String(path).split('.');
    let cursor = target;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i];
      if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
    }
    const leaf = segments[segments.length - 1];
    if (pathValues[path] === null) delete cursor[leaf];
    else cursor[leaf] = pathValues[path];
  });
  return target;
}

export function isRemoteDeltaApplying() {
  return remoteApplyDepth > 0;
}

export async function withRemoteDeltaApply(fn) {
  remoteApplyDepth += 1;
  try {
    return await fn();
  } finally {
    remoteApplyDepth -= 1;
  }
}
```

- [ ] **Step 4: Run helper tests and verify pass**

Run:

```bash
node --test public/js/lan-delta-client.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/lan-delta-client.mjs public/js/lan-delta-client.test.mjs
git commit -m "feat(lan): add renderer delta helpers"
```

---

### Task 8: Delta Outbox Kind

**Files:**
- Modify: `public/js/live-sync-outbox.mjs`
- Modify: `public/js/live-sync-outbox.test.mjs`
- Modify: `lib/db/lan-sync-outbox.mjs`
- Modify: `lib/db/lan-sync-outbox.test.mjs`

- [ ] **Step 1: Add outbox tests**

In `public/js/live-sync-outbox.test.mjs`, add:

```js
test('enqueue delta kind round-trip', async () => {
  mockLocalStorage();
  await enqueueOutbox('room1', {
    kind: 'delta',
    payload: { type: 'livesync:delta', delta: { txId: 'tx_1' } },
  });
  const items = await drainOutbox('room1');
  assert.equal(items[0].kind, 'delta');
  assert.equal(items[0].payload.delta.txId, 'tx_1');
});
```

In `lib/db/lan-sync-outbox.test.mjs`, add:

```js
test('SQL outbox preserves delta kind', () => {
  const db = makeTestDb();
  enqueueLanSyncOutbox(db, {
    roomId: 'room1',
    kind: 'delta',
    payload: { type: 'livesync:delta', delta: { txId: 'tx_1' } },
  });
  const rows = drainLanSyncOutbox(db, { roomId: 'room1' });
  assert.equal(rows[0].kind, 'delta');
  assert.equal(rows[0].payload.delta.txId, 'tx_1');
});
```

Use the existing DB test setup helpers in that file.

- [ ] **Step 2: Run outbox tests and verify failure**

Run:

```bash
node --test public/js/live-sync-outbox.test.mjs lib/db/lan-sync-outbox.test.mjs
```

Expected: FAIL because `delta` normalizes to `bundle`.

- [ ] **Step 3: Add `delta` kind**

In `public/js/live-sync-outbox.mjs`, update the kind selection:

```js
const kind =
  item.kind === 'delta'
    ? 'delta'
    : item.kind === 'patch'
      ? 'patch'
      : item.kind === 'clinical_ops'
        ? 'clinical_ops'
        : 'bundle';
```

In `lib/db/lan-sync-outbox.mjs`, update:

```js
const VALID_KINDS = new Set(['bundle', 'patch', 'clinical_ops', 'delta']);
```

- [ ] **Step 4: Run outbox tests and verify pass**

Run:

```bash
node --test public/js/live-sync-outbox.test.mjs lib/db/lan-sync-outbox.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/live-sync-outbox.mjs public/js/live-sync-outbox.test.mjs lib/db/lan-sync-outbox.mjs lib/db/lan-sync-outbox.test.mjs
git commit -m "feat(lan): support delta outbox items"
```

---

### Task 9: Renderer Live Delta Apply And Echo Suppression

**Files:**
- Modify: `public/js/features/lan/orchestrator.mjs`
- Modify: `public/js/features/lan/room.mjs`
- Modify: `public/js/features/lan/push.mjs`
- Test: existing LAN renderer tests plus `public/js/lan-delta-client.test.mjs`

- [ ] **Step 1: Add structural renderer tests**

In `public/js/features/lan-sync-clinical-ops.test.mjs` or a new `public/js/features/lan-delta-wiring.test.mjs`, add:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const orchestratorSrc = fs.readFileSync(new URL('./lan/orchestrator.mjs', import.meta.url), 'utf8');
const roomSrc = fs.readFileSync(new URL('./lan/room.mjs', import.meta.url), 'utf8');
const pushSrc = fs.readFileSync(new URL('./lan/push.mjs', import.meta.url), 'utf8');

test('LAN room advertises delta capability and handles applied deltas', () => {
  assert.match(roomSrc, /deltaSync:\s*1/);
  assert.match(roomSrc, /lastDeltaSeq/);
  assert.match(roomSrc, /livesync:delta:applied/);
});

test('orchestrator applies remote deltas under guard and suppresses own echoes', () => {
  assert.match(orchestratorSrc, /withRemoteDeltaApply/);
  assert.match(orchestratorSrc, /createDeltaEchoTracker/);
  assert.match(orchestratorSrc, /deltaLabelForPath/);
});

test('push flushes delta outbox through HTTP delta endpoint', () => {
  assert.match(pushSrc, /item\.kind === 'delta'/);
  assert.match(pushSrc, /\/delta/);
});
```

- [ ] **Step 2: Run structural tests and verify failure**

Run:

```bash
node --test public/js/features/lan-delta-wiring.test.mjs public/js/lan-delta-client.test.mjs
```

Expected: FAIL because wiring is missing.

- [ ] **Step 3: Advertise delta capability**

In `public/js/features/lan/room.mjs`, update `buildLiveSyncHelloPayload` to include:

```js
capabilities: {
  deltaSync: 1,
  deltaEntities: ['historiaClinica', 'agenda', 'todo'],
  lastDeltaSeq: Number(prev && prev.lastDeltaSeq ? prev.lastDeltaSeq : 0),
},
```

In the live message handler, add a branch:

```js
if (data.type === 'livesync:delta:applied') {
  bridge().applyLiveSyncDeltaApplied(data);
  return;
}
```

- [ ] **Step 4: Apply remote deltas in orchestrator**

In `public/js/features/lan/orchestrator.mjs`, import:

```js
import {
  applyDeltaPathValues,
  createDeltaEchoTracker,
  deltaLabelForPath,
  withRemoteDeltaApply,
} from '../../lan-delta-client.mjs';
```

Initialize near LAN runtime state:

```js
const deltaEchoTracker = createDeltaEchoTracker(getLanClientId());
```

Add:

```js
async function applyLiveSyncDeltaApplied(msg) {
  if (!msg || isPitchPatientIsolationActive()) return;
  if (msg.roomId && activeLiveSyncRoomId && msg.roomId !== activeLiveSyncRoomId) return;
  const ownEcho = deltaEchoTracker.isOwnEcho(msg);
  const partial = Array.isArray(msg.rejectedPaths) && msg.rejectedPaths.length > 0;
  if (ownEcho && !partial) {
    syncHostBundleEntityFromApplied(msg);
    return;
  }

  await withRemoteDeltaApply(async function () {
    if (msg.entityType === 'historiaClinica' && msg.entityId) {
      const row = patients.find(function (p) {
        return p && String(p.id) === String(msg.entityId);
      });
      if (row) {
        if (!row.historiaClinica) row.historiaClinica = { version: 0, data: {} };
        row.historiaClinica.data = applyDeltaPathValues(
          Object.assign({}, row.historiaClinica.data || {}),
          msg.pathValues || {}
        );
        row.historiaClinica.version = Number(msg.version || row.historiaClinica.version || 0);
        saveState({ immediate: true });
      }
    }
  });

  if (partial) {
    const labels = (msg.rejectedPaths || []).map(function (path) {
      return deltaLabelForPath(msg.entityType, path);
    });
    runtime.showToast('Tu cambio en "' + labels.join(', ') + '" fue reemplazado por una edición más reciente en la sala.', 'warn');
  }
  syncHostBundleEntityFromApplied(msg);
}
```

Export it through the bridge registration object where other handlers are registered:

```js
applyLiveSyncDeltaApplied,
```

- [ ] **Step 5: Flush delta outbox through HTTP**

In `public/js/features/lan/push.mjs`, add a helper:

```js
async function pushDeltaToHost(roomId, envelope) {
  const rid = String(roomId || '').trim();
  if (!rid || !envelope) return false;
  const body = envelope.delta || envelope;
  const resp = await lanClient.fetch('/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/delta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return resp && (resp.ok || resp.status === 409);
}
```

In outbox flush handling, before `item.kind === 'patch'`:

```js
if (item.kind === 'delta') {
  return pushDeltaToHost(rid, item.payload);
}
```

- [ ] **Step 6: Run renderer wiring tests**

Run:

```bash
node --test public/js/features/lan-delta-wiring.test.mjs public/js/lan-delta-client.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/js/features/lan/orchestrator.mjs public/js/features/lan/room.mjs public/js/features/lan/push.mjs public/js/features/lan-delta-wiring.test.mjs
git commit -m "feat(lan): apply live delta broadcasts"
```

---

### Task 10: Historia Clínica Delta Emission

**Files:**
- Modify: `public/js/historia-clinica-lan-sync.mjs`
- Modify: `public/js/historia-clinica-lan-sync.test.mjs`

- [ ] **Step 1: Add HC delta emission test**

Append to `public/js/historia-clinica-lan-sync.test.mjs`:

```js
test('buildHistoriaClinicaDelta emits safe pathValues for v1 paths', () => {
  const patient = {
    id: 'pat_1',
    historiaClinica: {
      version: 42,
      data: {
        labsAtAdmission: { na: 140 },
        plan: 'Hidratación IV',
      },
    },
  };
  const delta = buildHistoriaClinicaDelta(patient, {
    changedPaths: ['labsAtAdmission.na', 'plan'],
    clientId: 'lc_a',
    roomId: 'room-a',
    nowMs: () => 1718293049283,
  });

  assert.equal(delta.entityType, 'historiaClinica');
  assert.equal(delta.entityId, 'pat_1');
  assert.equal(delta.expectedVersion, 42);
  assert.equal(delta.pathValues['labsAtAdmission.na'], 140);
  assert.equal(delta.pathValues.plan, 'Hidratación IV');
  assert.equal(delta.pathMeta['labsAtAdmission.na'].clientTimestamp, 1718293049283);
});

test('buildHistoriaClinicaDelta returns null for unsafe array index paths', () => {
  const patient = { id: 'pat_1', historiaClinica: { version: 1, data: { plan: [{ text: 'x' }] } } };
  assert.equal(
    buildHistoriaClinicaDelta(patient, {
      changedPaths: ['plan.0.text'],
      clientId: 'lc_a',
      roomId: 'room-a',
      nowMs: () => 1,
    }),
    null
  );
});
```

Update import list to include `buildHistoriaClinicaDelta`.

- [ ] **Step 2: Run HC tests and verify failure**

Run:

```bash
node --test public/js/historia-clinica-lan-sync.test.mjs
```

Expected: FAIL with missing export `buildHistoriaClinicaDelta`.

- [ ] **Step 3: Implement safe HC delta builder**

In `public/js/historia-clinica-lan-sync.mjs`, import:

```js
import { createDeltaMutationBuilder } from './versioned-mutation.mjs';
```

Add:

```js
const HC_DELTA_SAFE_PATHS = new Set([
  'labsAtAdmission.na',
  'labsAtAdmission.k',
  'labsAtAdmission.cr',
  'labsAtAdmission.hb',
  'signosVitalesIngreso.fc',
  'signosVitalesIngreso.ta',
  'signosVitalesIngreso.fr',
  'signosVitalesIngreso.temp',
  'motivoConsulta',
  'padecimientoActual',
  'plan',
]);

function readPathValue(root, path) {
  return String(path || '').split('.').reduce(function (cur, part) {
    return cur && typeof cur === 'object' ? cur[part] : undefined;
  }, root);
}

export function buildHistoriaClinicaDelta(patient, opts) {
  opts = opts || {};
  if (!patient || !patient.historiaClinica || !patient.historiaClinica.data) return null;
  const changedPaths = Array.isArray(opts.changedPaths) ? opts.changedPaths : [];
  if (!changedPaths.length) return null;
  if (changedPaths.some((path) => !HC_DELTA_SAFE_PATHS.has(String(path)))) return null;
  const nowMs = typeof opts.nowMs === 'function' ? opts.nowMs : Date.now;
  const builder = createDeltaMutationBuilder('historiaClinica', patient.id);
  changedPaths.forEach(function (path) {
    const value = readPathValue(patient.historiaClinica.data, path);
    builder.setPath(path, value === undefined ? null : value, nowMs());
  });
  return builder.build({
    roomId: opts.roomId,
    patientId: patient.id,
    clientId: opts.clientId || localStorage.getItem('rpc-lan-client-id') || 'local',
    expectedVersion: Number(patient.historiaClinica.version || 0),
  });
}
```

- [ ] **Step 4: Wire pending HC flush to try delta first**

In `flushPendingHistoriaClinicaLanSync`, before building the legacy mutation:

```js
const delta = buildHistoriaClinicaDelta(patient, {
  changedPaths,
  roomId,
  clientId: localStorage.getItem('rpc-lan-client-id') || 'local',
});
if (delta) {
  const out = await lanPushHistoriaClinicaDelta(patient.id, delta);
  if (out && out.ok) {
    hc.version = out.version || hc.version;
    delete hc.pendingLanSync;
    delete hc.lanSyncPending;
    saveState();
    return { ok: true };
  }
}
```

Add `lanPushHistoriaClinicaDelta` in `public/js/features/lan/orchestrator.mjs`:

```js
export async function lanPushHistoriaClinicaDelta(patientId, delta) {
  const pid = String(patientId || '').trim();
  if (!pid || !delta || !activeLiveSyncRoomId) return { ok: false, error: 'invalid_args' };
  const resp = await lanFetchAuthed(
    '/api/lan/v1/rooms/' + encodeURIComponent(activeLiveSyncRoomId) + '/delta',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...delta,
        entityType: 'historiaClinica',
        entityId: pid,
        patientId: pid,
      }),
    }
  );
  const body = await resp.json().catch(function () {
    return {};
  });
  if (resp.ok) return { ok: true, version: body.version, body };
  if (resp.status === 409) return { ok: false, stale: true, body };
  return { ok: false, status: resp.status, body };
}
```

Re-export it from `public/js/features/lan-sync.mjs`:

```js
export { lanPushHistoriaClinicaDelta } from './lan/orchestrator.mjs';
```

- [ ] **Step 5: Run HC tests**

Run:

```bash
node --test public/js/historia-clinica-lan-sync.test.mjs public/js/versioned-mutation.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/js/historia-clinica-lan-sync.mjs public/js/historia-clinica-lan-sync.test.mjs public/js/features/lan-sync.mjs public/js/features/lan/orchestrator.mjs
git commit -m "feat(lan): emit historia clinica deltas"
```

---

### Task 11: Full Verification And Build Artifacts

**Files:**
- Generated: `public/js/app.bundle.mjs`
- Generated: `public/js/app.bundle.meta.json`
- Generated: `public/js/chunks/*`

- [ ] **Step 1: Run focused host tests**

Run:

```bash
node --test lan-squad/delta-paths.test.js lan-squad/delta-resolver.test.js lan-squad/host-router.test.js lan-squad/ws-hub.test.js
```

Expected: PASS.

- [ ] **Step 2: Run focused renderer tests**

Run:

```bash
node --test public/js/versioned-mutation.test.mjs public/js/lan-delta-client.test.mjs public/js/live-sync-outbox.test.mjs public/js/historia-clinica-lan-sync.test.mjs public/js/features/lan-delta-wiring.test.mjs lib/db/lan-sync-outbox.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Run metrics if available**

Run:

```bash
npm run metrics --if-present
```

Expected: exit 0 if metrics script exists; no-op success if absent. If metrics reports debt increase, stop and reduce touched-file complexity before continuing.

- [ ] **Step 4: Build renderer bundle**

Run:

```bash
npm run build:ui
```

Expected: exit 0 and generated bundle/chunk files update.

- [ ] **Step 5: Run broad test suite if time permits**

Run:

```bash
npm test
```

Expected: PASS. If native DB pretest fails because of local native dependency state, capture the failing native error and run the focused host/renderer tests again after resolving native setup.

- [ ] **Step 6: Commit verification/build artifacts**

Only stage generated bundle files that changed because of `npm run build:ui` plus any source/test files not already committed.

```bash
git add public/js/app.bundle.mjs public/js/app.bundle.meta.json public/js/chunks
git status --short
git commit -m "build(ui): refresh delta sync bundle"
```

---

## Self-Review Checklist

- Spec coverage:
  - V1 scope (`historiaClinica`, `agenda`, `todo`): Tasks 1, 3, 6, 7, 10.
  - Delta overlay / bundle baseline: Tasks 4, 5, 9, 11.
  - `fieldMeta`, `deltaSeq`, delta log: Tasks 2, 3, 4.
  - `pathValues` / `pathMeta`: Tasks 3, 6, 10.
  - `null` clearing: Tasks 1, 3, 7.
  - Prototype and array-index rejection: Tasks 1, 3.
  - WS and HTTP unified pipeline: Tasks 4, 5.
  - Outbox deltas: Task 8 and Task 9.
  - Echo suppression and remote apply guard: Task 7 and Task 9.
  - Mixed v0/v1 convergence: Task 4, Task 5, Task 11.

- Type consistency:
  - Host input uses `pathValues`, `pathMeta`, `clientId`, `txId`.
  - Host output uses `status`, `deltaSeq`, `acceptedPaths`, `rejectedPaths`, `pathValues`, `fieldMeta`.
  - WS broadcast type is `livesync:delta:applied`.
  - Client outbox kind is `delta`.

- Scope control:
  - No `clinicalOps`, roster, manejo, or administrative patient delta paths in v1.
  - No RFC 6902 parser.
  - No proxy observer.
  - No path-level blocking conflict modal.
