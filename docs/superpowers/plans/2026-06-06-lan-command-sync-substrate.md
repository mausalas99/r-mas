# LAN Command Sync Substrate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved local-first LAN command sync substrate for `estadoActual`, add-only `eventualidades`, and `pendientes`.

**Architecture:** Add a registry-driven command path beside the existing LAN bundle/delta paths. The host validates and applies typed commands, assigns room-scoped `deltaSeq`, durably appends a compact command log before ACK, then lets a scheduler coalesce expensive materialized view persistence.

**Tech Stack:** Node/Electron, CommonJS in `lan-squad/`, ESM in renderer and `lib/db/`, Express LAN routes, `node --test`, SQLCipher-backed LAN outbox.

---

## Source Documents

- Spec: `docs/superpowers/specs/2026-06-06-lan-command-sync-substrate-design.md`
- Existing host delta path: `lan-squad/delta-resolver.js`, `lan-squad/host-store.js`, `lan-squad/host-router.js`
- Existing SQL outbox: `lib/db/lan-sync-outbox.mjs`, `lib/db/schema.mjs`
- Existing renderer LAN modules: `public/js/features/lan/orchestrator.mjs`, `public/js/features/lan/push.mjs`, `public/js/features/lan/room.mjs`

## File Structure

- Create `lan-squad/command-registry.js`: pure domain registry, command envelope validation, tie-break helpers, and domain apply logic.
- Create `lan-squad/command-registry.test.js`: unit coverage for validation, stale `baseSeq`, LWW, append dedupe, and item commands.
- Create `lan-squad/command-resolver.js`: host-facing resolver that combines the registry with `host-store` command commits.
- Create `lan-squad/command-resolver.test.js`: sequence, duplicate retry, stale base, and clock-drift diagnostics tests.
- Create `lan-squad/sync-scheduler.js`: coalesced L2 materialization and explicit flush API.
- Create `lan-squad/sync-scheduler.test.js`: at-least-once scheduling, coalescing, flush pre-emption, and `flushAll`.
- Modify `lan-squad/host-store.js`: add command entity support, `commitCommandEntity()`, command log append, command duplicate lookup, and flush helpers.
- Modify `lan-squad/host-router.js`: add `POST /rooms/:id/commands` and `POST /rooms/:id/flush`, broadcast `livesync:command:applied`.
- Modify `lan-squad/host-router.test.js`: route, auth, broadcast, duplicate, stale-base, and flush endpoint tests.
- Modify `lib/db/schema.mjs`: allow `command` in `lan_sync_outbox.kind` through a new schema migration.
- Modify `lib/db/lan-sync-outbox.mjs`: preserve `command` kind.
- Modify `lib/db/lan-sync-outbox.test.mjs`: verify restart-safe command payload shape.
- Create `public/js/lan-command-client.mjs`: renderer command envelope helpers, stable command ids, and push response normalization.
- Create `public/js/lan-command-client.test.mjs`: command envelope and response handling tests.
- Modify `public/js/features/lan/push.mjs`: post `command` outbox items to `/commands`, keep legacy item kinds unchanged.
- Modify `public/js/features/lan/room.mjs`: handle `livesync:command:applied`, enforce `deltaSeq` ordering, trigger catch-up on gaps.
- Modify `public/js/features/lan/orchestrator.mjs`: expose small wrappers for proof-domain command enqueueing and stale-base pause behavior.
- Create `public/js/features/lan-command-room.test.mjs`: command broadcast ordering and gap recovery helper tests.
- Modify `public/js/lan-sync-diagnostics.mjs` and `public/js/lan-sync-diagnostics.test.mjs`: expose queue depth, last ACK, last applied command seq, stale-base count, duplicate count, scheduler flush fields.

---

### Task 1: Command Registry Pure Domain Rules

**Files:**
- Create: `lan-squad/command-registry.js`
- Test: `lan-squad/command-registry.test.js`

- [ ] **Step 1: Write failing tests for envelope validation and stale `baseSeq`**

Add `lan-squad/command-registry.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createCommandRegistry,
  STALE_BASE_SEQ_REQUIRES_SNAPSHOT,
} = require('./command-registry.js');

function registry() {
  return createCommandRegistry({ staleBaseSeqWindow: 150, nowMs: () => 1718293049000 });
}

test('validateCommand rejects missing required envelope fields', () => {
  const out = registry().validateCommand({
    domain: 'estadoActual',
    op: 'updateField',
    roomId: 'sala-1',
    clientId: 'lc_a',
    clientCreatedAt: 1718293048000,
    baseSeq: 1,
    payload: { path: 'signosVitales.fc', value: 110 },
  }, { latestDeltaSeq: 2 });

  assert.equal(out.ok, false);
  assert.equal(out.code, 'INVALID_COMMAND');
  assert.deepEqual(out.missing, ['commandId']);
});

test('validateCommand returns stale snapshot fallback when baseSeq is too old', () => {
  const out = registry().validateCommand({
    commandId: 'cmd_1',
    domain: 'estadoActual',
    op: 'updateField',
    roomId: 'sala-1',
    clientId: 'lc_a',
    clientCreatedAt: 1718293048000,
    baseSeq: 10,
    payload: { path: 'signosVitales.fc', value: 110 },
  }, { latestDeltaSeq: 161 });

  assert.equal(out.ok, false);
  assert.equal(out.code, STALE_BASE_SEQ_REQUIRES_SNAPSHOT);
  assert.equal(out.latestDeltaSeq, 161);
});
```

- [ ] **Step 2: Run validation tests and verify they fail**

Run: `node --test lan-squad/command-registry.test.js`

Expected: FAIL with `Cannot find module './command-registry.js'`.

- [ ] **Step 3: Implement registry validation constants and required field checks**

Create `lan-squad/command-registry.js`:

```js
'use strict';

const STALE_BASE_SEQ_REQUIRES_SNAPSHOT = 'STALE_BASE_SEQ_REQUIRES_SNAPSHOT';
const INVALID_COMMAND = 'INVALID_COMMAND';
const DEFAULT_STALE_BASE_SEQ_WINDOW = 150;
const CLOCK_DRIFT_WARN_MS = 10 * 60 * 1000;

const REQUIRED_FIELDS = [
  'commandId',
  'domain',
  'op',
  'roomId',
  'clientId',
  'clientCreatedAt',
  'baseSeq',
  'payload',
];

function trim(value) {
  return String(value || '').trim();
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function missingRequired(command) {
  return REQUIRED_FIELDS.filter((field) => {
    if (!Object.prototype.hasOwnProperty.call(command || {}, field)) return true;
    if (field === 'payload') return !isObject(command[field]);
    if (field === 'clientCreatedAt' || field === 'baseSeq') return !Number.isFinite(Number(command[field]));
    return trim(command[field]) === '';
  });
}

function createCommandRegistry(options = {}) {
  const staleBaseSeqWindow = Number.isFinite(Number(options.staleBaseSeqWindow))
    ? Number(options.staleBaseSeqWindow)
    : DEFAULT_STALE_BASE_SEQ_WINDOW;
  const nowMs = typeof options.nowMs === 'function' ? options.nowMs : () => Date.now();

  function validateCommand(command, context = {}) {
    const missing = missingRequired(command);
    if (missing.length) {
      return { ok: false, code: INVALID_COMMAND, status: 'invalid_command', missing };
    }

    const latestDeltaSeq = Number(context.latestDeltaSeq || 0);
    const baseSeq = Number(command.baseSeq || 0);
    if (latestDeltaSeq - baseSeq > staleBaseSeqWindow) {
      return {
        ok: false,
        code: STALE_BASE_SEQ_REQUIRES_SNAPSHOT,
        status: 'stale_base_seq_requires_snapshot',
        latestDeltaSeq,
        fallback: 'sync_bundle',
      };
    }

    const driftMs = Math.abs(Number(command.clientCreatedAt || 0) - nowMs());
    return { ok: true, clockDriftWarning: driftMs > CLOCK_DRIFT_WARN_MS };
  }

  return { validateCommand };
}

module.exports = {
  createCommandRegistry,
  STALE_BASE_SEQ_REQUIRES_SNAPSHOT,
  INVALID_COMMAND,
  CLOCK_DRIFT_WARN_MS,
};
```

- [ ] **Step 4: Run validation tests and verify they pass**

Run: `node --test lan-squad/command-registry.test.js`

Expected: PASS.

- [ ] **Step 5: Add failing tests for the three proof-domain strategies**

Append to `lan-squad/command-registry.test.js`:

```js
test('estadoActual updateField applies LWW by timestamp, clientId, then commandId', () => {
  const r = registry();
  const first = r.applyCommand({
    commandId: 'cmd_b',
    domain: 'estadoActual',
    op: 'updateField',
    roomId: 'sala-1',
    patientId: 'pat_1',
    entityId: 'pat_1:estadoActual',
    clientId: 'lc_a',
    clientCreatedAt: 1000,
    baseSeq: 0,
    payload: { path: 'signosVitales.fc', value: 100 },
  }, { data: {}, meta: {} });
  const second = r.applyCommand({
    commandId: 'cmd_a',
    domain: 'estadoActual',
    op: 'updateField',
    roomId: 'sala-1',
    patientId: 'pat_1',
    entityId: 'pat_1:estadoActual',
    clientId: 'lc_b',
    clientCreatedAt: 1000,
    baseSeq: 0,
    payload: { path: 'signosVitales.fc', value: 110 },
  }, { data: first.data, meta: first.meta });

  assert.equal(second.data.signosVitales.fc, 110);
  assert.deepEqual(second.changedPaths, ['signosVitales.fc']);
});

test('eventualidades add dedupes repeated stable ids as duplicate_ignored', () => {
  const r = registry();
  const seed = r.applyCommand({
    commandId: 'cmd_ev_1',
    domain: 'eventualidades',
    op: 'add',
    roomId: 'sala-1',
    patientId: 'pat_1',
    entityId: 'pat_1:eventualidades',
    clientId: 'lc_a',
    clientCreatedAt: 1000,
    baseSeq: 0,
    payload: { eventualidadId: 'ev_1', at: '2026-06-06T12:00:00.000Z', text: 'Fiebre' },
  }, { data: {}, meta: {} });
  const duplicate = r.applyCommand({
    commandId: 'cmd_ev_2',
    domain: 'eventualidades',
    op: 'add',
    roomId: 'sala-1',
    patientId: 'pat_1',
    entityId: 'pat_1:eventualidades',
    clientId: 'lc_a',
    clientCreatedAt: 1001,
    baseSeq: 0,
    payload: { eventualidadId: 'ev_1', at: '2026-06-06T12:00:00.000Z', text: 'Fiebre' },
  }, { data: seed.data, meta: seed.meta });

  assert.equal(duplicate.status, 'duplicate_ignored');
  assert.equal(duplicate.data.entries.length, 1);
});

test('pendientes add update complete converge by stable item id', () => {
  const r = registry();
  const add = r.applyCommand({
    commandId: 'cmd_t_1',
    domain: 'pendientes',
    op: 'add',
    roomId: 'sala-1',
    patientId: 'pat_1',
    entityId: 'pat_1:pendientes',
    clientId: 'lc_a',
    clientCreatedAt: 1000,
    baseSeq: 0,
    payload: { itemId: 'todo_1', text: 'Labs', completed: false },
  }, { data: {}, meta: {} });
  const done = r.applyCommand({
    commandId: 'cmd_t_2',
    domain: 'pendientes',
    op: 'complete',
    roomId: 'sala-1',
    patientId: 'pat_1',
    entityId: 'pat_1:pendientes',
    clientId: 'lc_a',
    clientCreatedAt: 2000,
    baseSeq: 0,
    payload: { itemId: 'todo_1', completed: true },
  }, { data: add.data, meta: add.meta });

  assert.equal(done.data.items[0].id, 'todo_1');
  assert.equal(done.data.items[0].completed, true);
});
```

- [ ] **Step 6: Run strategy tests and verify they fail**

Run: `node --test lan-squad/command-registry.test.js`

Expected: FAIL with `r.applyCommand is not a function`.

- [ ] **Step 7: Implement strategy apply logic**

Replace `lan-squad/command-registry.js` with this complete implementation:

```js
'use strict';

const STALE_BASE_SEQ_REQUIRES_SNAPSHOT = 'STALE_BASE_SEQ_REQUIRES_SNAPSHOT';
const INVALID_COMMAND = 'INVALID_COMMAND';
const DEFAULT_STALE_BASE_SEQ_WINDOW = 150;
const CLOCK_DRIFT_WARN_MS = 10 * 60 * 1000;

const REQUIRED_FIELDS = [
  'commandId',
  'domain',
  'op',
  'roomId',
  'clientId',
  'clientCreatedAt',
  'baseSeq',
  'payload',
];

function trim(value) {
  return String(value || '').trim();
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function missingRequired(command) {
  return REQUIRED_FIELDS.filter((field) => {
    if (!Object.prototype.hasOwnProperty.call(command || {}, field)) return true;
    if (field === 'payload') return !isObject(command[field]);
    if (field === 'clientCreatedAt' || field === 'baseSeq') return !Number.isFinite(Number(command[field]));
    return trim(command[field]) === '';
  });
}

function compareCommandOrder(a, b) {
  const aTs = Number(a && a.clientCreatedAt ? a.clientCreatedAt : 0);
  const bTs = Number(b && b.clientCreatedAt ? b.clientCreatedAt : 0);
  if (aTs !== bTs) return aTs < bTs ? -1 : 1;
  const aClient = trim(a && a.clientId);
  const bClient = trim(b && b.clientId);
  if (aClient !== bClient) return aClient < bClient ? -1 : 1;
  const aCommand = trim(a && a.commandId);
  const bCommand = trim(b && b.commandId);
  if (aCommand === bCommand) return 0;
  return aCommand < bCommand ? -1 : 1;
}

function setPath(target, path, value) {
  const parts = trim(path).split('.').filter(Boolean);
  if (!parts.length) return target;
  let cur = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cur[part] || typeof cur[part] !== 'object' || Array.isArray(cur[part])) cur[part] = {};
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
  return target;
}

function applyEstadoActual(command, state) {
  if (command.op !== 'updateField') {
    return { ok: false, status: 'invalid_command', code: INVALID_COMMAND, error: 'unsupported_estado_actual_op' };
  }
  const path = trim(command.payload.path);
  if (!path) return { ok: false, status: 'invalid_command', code: INVALID_COMMAND, error: 'path_required' };
  const data = clone(state.data || {});
  const meta = clone(state.meta || {});
  const prev = meta[path];
  if (prev && compareCommandOrder(command, prev) < 0) {
    return { ok: true, status: 'duplicate_ignored', data, meta, changedPaths: [] };
  }
  setPath(data, path, command.payload.value);
  meta[path] = {
    clientCreatedAt: Number(command.clientCreatedAt),
    clientId: trim(command.clientId),
    commandId: trim(command.commandId),
  };
  return { ok: true, status: 'accepted', data, meta, changedPaths: [path] };
}

function eventKey(entry) {
  return trim(entry.eventualidadId || entry.id) || `${trim(entry.at)}|${trim(entry.text)}`;
}

function applyEventualidades(command, state) {
  if (command.op !== 'add') {
    return { ok: false, status: 'invalid_command', code: INVALID_COMMAND, error: 'unsupported_eventualidades_op' };
  }
  const payload = command.payload || {};
  const key = eventKey(payload);
  if (!key) return { ok: false, status: 'invalid_command', code: INVALID_COMMAND, error: 'eventualidad_id_required' };
  const data = clone(state.data || {});
  const entries = Array.isArray(data.entries) ? data.entries.slice() : [];
  const seen = new Set(entries.map(eventKey));
  if (seen.has(key)) return { ok: true, status: 'duplicate_ignored', data: { ...data, entries }, meta: clone(state.meta || {}) };
  entries.push({
    id: trim(payload.eventualidadId || payload.id) || trim(command.commandId),
    at: trim(payload.at),
    text: trim(payload.text),
    clientCreatedAt: Number(command.clientCreatedAt),
    commandId: trim(command.commandId),
  });
  return { ok: true, status: 'accepted', data: { ...data, entries }, meta: clone(state.meta || {}), changedPaths: ['entries'] };
}

function applyPendientes(command, state) {
  if (!['add', 'update', 'complete'].includes(command.op)) {
    return { ok: false, status: 'invalid_command', code: INVALID_COMMAND, error: 'unsupported_pendientes_op' };
  }
  const payload = command.payload || {};
  const itemId = trim(payload.itemId || payload.id);
  if (!itemId) return { ok: false, status: 'invalid_command', code: INVALID_COMMAND, error: 'item_id_required' };
  const data = clone(state.data || {});
  const meta = clone(state.meta || {});
  const items = Array.isArray(data.items) ? data.items.slice() : [];
  const idx = items.findIndex((item) => trim(item && item.id) === itemId);
  const prevMeta = meta[itemId];
  if (prevMeta && compareCommandOrder(command, prevMeta) < 0) {
    return { ok: true, status: 'duplicate_ignored', data: { ...data, items }, meta, changedPaths: [] };
  }
  const prev = idx >= 0 ? items[idx] : { id: itemId, completed: false };
  const next = {
    ...prev,
    ...payload,
    id: itemId,
    updatedAt: payload.updatedAt || new Date(Number(command.clientCreatedAt)).toISOString(),
  };
  if (command.op === 'complete') next.completed = payload.completed !== false;
  if (idx >= 0) items[idx] = next;
  else items.push(next);
  meta[itemId] = {
    clientCreatedAt: Number(command.clientCreatedAt),
    clientId: trim(command.clientId),
    commandId: trim(command.commandId),
  };
  return { ok: true, status: 'accepted', data: { ...data, items }, meta, changedPaths: [itemId] };
}

const DOMAIN_APPLY = {
  estadoActual: applyEstadoActual,
  eventualidades: applyEventualidades,
  pendientes: applyPendientes,
};

function createCommandRegistry(options = {}) {
  const staleBaseSeqWindow = Number.isFinite(Number(options.staleBaseSeqWindow))
    ? Number(options.staleBaseSeqWindow)
    : DEFAULT_STALE_BASE_SEQ_WINDOW;
  const nowMs = typeof options.nowMs === 'function' ? options.nowMs : () => Date.now();

  function validateCommand(command, context = {}) {
    const missing = missingRequired(command);
    if (missing.length) {
      return { ok: false, code: INVALID_COMMAND, status: 'invalid_command', missing };
    }
    if (!DOMAIN_APPLY[trim(command.domain)]) {
      return { ok: false, code: INVALID_COMMAND, status: 'invalid_command', error: 'unsupported_domain' };
    }

    const latestDeltaSeq = Number(context.latestDeltaSeq || 0);
    const baseSeq = Number(command.baseSeq || 0);
    if (latestDeltaSeq - baseSeq > staleBaseSeqWindow) {
      return {
        ok: false,
        code: STALE_BASE_SEQ_REQUIRES_SNAPSHOT,
        status: 'stale_base_seq_requires_snapshot',
        latestDeltaSeq,
        fallback: 'sync_bundle',
      };
    }

    const driftMs = Math.abs(Number(command.clientCreatedAt || 0) - nowMs());
    return { ok: true, clockDriftWarning: driftMs > CLOCK_DRIFT_WARN_MS };
  }

  function applyCommand(command, state = {}) {
    const fn = DOMAIN_APPLY[trim(command && command.domain)];
    if (!fn) return { ok: false, status: 'invalid_command', code: INVALID_COMMAND, error: 'unsupported_domain' };
    return fn(command, { data: state.data || {}, meta: state.meta || {} });
  }

  return { validateCommand, applyCommand };
}

module.exports = {
  createCommandRegistry,
  STALE_BASE_SEQ_REQUIRES_SNAPSHOT,
  INVALID_COMMAND,
  CLOCK_DRIFT_WARN_MS,
  compareCommandOrder,
};
```

- [ ] **Step 8: Run registry tests**

Run: `node --test lan-squad/command-registry.test.js`

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

```bash
git add lan-squad/command-registry.js lan-squad/command-registry.test.js
git commit -m "feat(lan): add command sync registry"
```

---

### Task 2: Host Store Command Commit And Durable Log

**Files:**
- Modify: `lan-squad/host-store.js`
- Create: `lan-squad/command-resolver.js`
- Test: `lan-squad/command-resolver.test.js`

- [ ] **Step 1: Write failing command resolver tests**

Create `lan-squad/command-resolver.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHostStore } = require('./host-store.js');
const { createCommandResolver } = require('./command-resolver.js');

function makeStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-command-'));
  return {
    dir,
    store: createHostStore({ filePath: path.join(dir, 'state.json'), teamCodePlain: '123456' }),
  };
}

function estadoCommand(overrides = {}) {
  return {
    commandId: 'cmd_1',
    domain: 'estadoActual',
    op: 'updateField',
    roomId: 'room-a',
    patientId: 'pat_1',
    entityId: 'pat_1:estadoActual',
    clientId: 'lc_a',
    clientCreatedAt: 1718293049000,
    baseSeq: 0,
    payload: { path: 'signosVitales.fc', value: 110 },
    ...overrides,
  };
}

test('applyCommand assigns deltaSeq and appends command log before ack', () => {
  const { store } = makeStore();
  const resolver = createCommandResolver({ store, nowIso: () => '2026-06-06T14:34:10.000Z' });
  const out = resolver.applyCommand(estadoCommand());

  assert.equal(out.status, 'accepted');
  assert.equal(out.deltaSeq, 1);
  assert.equal(out.commandId, 'cmd_1');
  assert.equal(out.committedAt, '2026-06-06T14:34:10.000Z');

  const replay = store.getRoomDeltaLog('room-a', 0);
  assert.equal(replay.ok, true);
  assert.equal(replay.deltas.length, 1);
  assert.equal(replay.deltas[0].type, 'command');
  assert.equal(replay.deltas[0].commandId, 'cmd_1');
});

test('applyCommand returns duplicate_ignored for repeated commandId', () => {
  const { store } = makeStore();
  const resolver = createCommandResolver({ store });
  const first = resolver.applyCommand(estadoCommand());
  const second = resolver.applyCommand(estadoCommand());

  assert.equal(first.status, 'accepted');
  assert.equal(second.status, 'duplicate_ignored');
  assert.equal(second.deltaSeq, first.deltaSeq);
  assert.equal(store.getRoomDeltaLog('room-a', 0).deltas.length, 1);
});

test('applyCommand returns stale_base_seq_requires_snapshot when baseSeq is too old', () => {
  const { store } = makeStore();
  const resolver = createCommandResolver({ store });
  store.ensureRoomBundleForTest('room-a').deltaSeq = 200;

  const out = resolver.applyCommand(estadoCommand({ baseSeq: 49 }));

  assert.equal(out.ok, false);
  assert.equal(out.code, 'STALE_BASE_SEQ_REQUIRES_SNAPSHOT');
  assert.equal(out.latestDeltaSeq, 200);
});
```

- [ ] **Step 2: Run resolver tests and verify they fail**

Run: `node --test lan-squad/command-resolver.test.js`

Expected: FAIL with `Cannot find module './command-resolver.js'`.

- [ ] **Step 3: Add host-store methods required by the tests**

Modify `lan-squad/host-store.js`:

1. Add entity key helper near `ensureDeltaEntity()`:

```js
  function commandEntityKey(command) {
    const domain = String(command && command.domain || '').trim();
    const entityId = String(command && command.entityId || '').trim();
    const patientId = String(command && command.patientId || '').trim();
    if (domain === 'estadoActual') return `cmd:estadoActual:${entityId || patientId}`;
    if (domain === 'eventualidades') return `cmd:eventualidades:${entityId || patientId}`;
    if (domain === 'pendientes') return `cmd:pendientes:${entityId || patientId}`;
    throw new Error('unsupported_command_domain');
  }
```

2. Add command helpers after `getRoomDeltaLog()`:

```js
  function ensureRoomBundleForTest(roomId) {
    return ensureRoomBundle(ensureLoadedSync(), roomId);
  }

  function getAppliedCommand(roomId, commandId) {
    const bundle = getRoomSyncBundle(roomId);
    const id = String(commandId || '').trim();
    if (!bundle || !id || !Array.isArray(bundle.deltaLog)) return null;
    return bundle.deltaLog.find((entry) => entry && entry.type === 'command' && entry.commandId === id) || null;
  }

  function getCommandEntityState(roomId, command) {
    const bundle = ensureRoomBundle(ensureLoadedSync(), roomId);
    const key = commandEntityKey(command);
    const rec = bundle.entities[key];
    return {
      key,
      version: Number(rec && rec.version || 0),
      data: rec && rec.data && typeof rec.data === 'object' ? rec.data : {},
      meta: rec && rec.commandMeta && typeof rec.commandMeta === 'object' ? rec.commandMeta : {},
    };
  }

  function commitCommandEntity({ roomId, command, data, meta, status, nowIsoOverride }) {
    const state = ensureLoadedSync();
    const bundle = ensureRoomBundle(state, roomId);
    const key = commandEntityKey(command);
    const rec = bundle.entities[key] && typeof bundle.entities[key] === 'object'
      ? bundle.entities[key]
      : { version: 0, data: {}, commandMeta: {}, deleted: false };
    const nextSeq = Number(bundle.deltaSeq || 0) + 1;
    const committedAt = nowIsoOverride || nowIso();
    rec.version = Number(rec.version || 0) + 1;
    rec.data = data && typeof data === 'object' ? data : {};
    rec.commandMeta = meta && typeof meta === 'object' ? meta : {};
    rec.updatedAt = committedAt;
    rec.deleted = false;
    bundle.entities[key] = rec;
    bundle.entityVersions[key] = rec.version;
    bundle.revision = Number(bundle.revision || 0) + 1;
    bundle.deltaSeq = nextSeq;
    bundle.committedAt = committedAt;
    if (!Array.isArray(bundle.deltaLog)) bundle.deltaLog = [];
    const entry = {
      type: 'command',
      status: status || 'accepted',
      commandId: String(command.commandId || ''),
      domain: String(command.domain || ''),
      op: String(command.op || ''),
      roomId,
      patientId: command.patientId || null,
      entityId: command.entityId || null,
      originClientId: String(command.clientId || ''),
      clientCreatedAt: Number(command.clientCreatedAt || 0),
      deltaSeq: nextSeq,
      revision: bundle.revision,
      committedAt,
      payload: command.payload || {},
    };
    bundle.deltaLog.push(entry);
    while (bundle.deltaLog.length > 200) bundle.deltaLog.shift();
    persistState();
    return { bundle, key, rec, entry, version: rec.version, deltaSeq: nextSeq, revision: bundle.revision, committedAt };
  }
```

3. Export the new helpers in the returned object:

```js
    ensureRoomBundleForTest,
    getAppliedCommand,
    getCommandEntityState,
    commitCommandEntity,
```

- [ ] **Step 4: Create command resolver**

Create `lan-squad/command-resolver.js`:

```js
'use strict';

const { createCommandRegistry } = require('./command-registry.js');

function createCommandResolver({ store, registry = createCommandRegistry(), nowIso = () => new Date().toISOString() }) {
  function applyCommand(command) {
    const roomId = String(command && command.roomId || '').trim();
    const commandId = String(command && command.commandId || '').trim();
    const existing = store.getAppliedCommand(roomId, commandId);
    if (existing) {
      return {
        ok: true,
        status: 'duplicate_ignored',
        commandId,
        deltaSeq: existing.deltaSeq,
        revision: existing.revision,
      };
    }

    const latestDeltaSeq = Number(store.getRoomSyncBundle(roomId)?.deltaSeq || 0);
    const validation = registry.validateCommand(command, { latestDeltaSeq });
    if (!validation.ok) return { ok: false, ...validation };

    const current = store.getCommandEntityState(roomId, command);
    const applied = registry.applyCommand(command, { data: current.data, meta: current.meta });
    if (!applied.ok) return { ok: false, ...applied };
    if (applied.status === 'duplicate_ignored') {
      return {
        ok: true,
        status: 'duplicate_ignored',
        commandId,
        deltaSeq: latestDeltaSeq,
        revision: Number(store.getRoomSyncBundle(roomId)?.revision || 0),
      };
    }

    const commit = store.commitCommandEntity({
      roomId,
      command,
      data: applied.data,
      meta: applied.meta,
      status: applied.status,
      nowIsoOverride: nowIso(),
    });

    return {
      ok: true,
      status: 'accepted',
      commandId,
      domain: command.domain,
      op: command.op,
      roomId,
      patientId: command.patientId,
      entityId: command.entityId,
      deltaSeq: commit.deltaSeq,
      revision: commit.revision,
      committedAt: commit.committedAt,
      materialized: false,
      clockDriftWarning: !!validation.clockDriftWarning,
      payload: command.payload,
    };
  }

  return { applyCommand };
}

module.exports = { createCommandResolver };
```

- [ ] **Step 5: Run resolver tests**

Run: `node --test lan-squad/command-resolver.test.js`

Expected: PASS.

- [ ] **Step 6: Run existing host delta tests**

Run: `node --test lan-squad/delta-resolver.test.js lan-squad/host-store.test.js`

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add lan-squad/host-store.js lan-squad/command-resolver.js lan-squad/command-resolver.test.js
git commit -m "feat(lan): commit sequenced command entries"
```

---

### Task 3: Sync Scheduler And Flush Contract

**Files:**
- Create: `lan-squad/sync-scheduler.js`
- Test: `lan-squad/sync-scheduler.test.js`

- [ ] **Step 1: Write failing scheduler tests**

Create `lan-squad/sync-scheduler.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSyncScheduler } = require('./sync-scheduler.js');

test('scheduleMaterialize coalesces multiple room requests into one flush', async () => {
  const calls = [];
  const scheduler = createSyncScheduler({
    windowMs: 5,
    hostStore: {
      materializeRoomViews(roomId, opts) {
        calls.push({ roomId, opts });
        return { revision: 7, deltaSeq: 3 };
      },
      getRoomSyncBundle() {
        return { revision: 7, deltaSeq: 3 };
      },
    },
  });

  scheduler.scheduleMaterialize('room-a', { reason: 'command' });
  scheduler.scheduleMaterialize('room-a', { reason: 'command' });
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].roomId, 'room-a');
});

test('flush pre-empts pending throttle and returns latest revision and deltaSeq', async () => {
  const calls = [];
  const scheduler = createSyncScheduler({
    windowMs: 50,
    hostStore: {
      materializeRoomViews(roomId, opts) {
        calls.push({ roomId, opts });
      },
      getRoomSyncBundle() {
        return { revision: 9, deltaSeq: 4 };
      },
    },
  });

  scheduler.scheduleMaterialize('room-a', { reason: 'command' });
  const out = await scheduler.flush('room-a', { reason: 'sync-now' });

  assert.equal(calls.length, 1);
  assert.equal(out.ok, true);
  assert.equal(out.revision, 9);
  assert.equal(out.latestDeltaSeq, 4);
  assert.equal(out.reason, 'sync-now');
});
```

- [ ] **Step 2: Run scheduler tests and verify they fail**

Run: `node --test lan-squad/sync-scheduler.test.js`

Expected: FAIL with `Cannot find module './sync-scheduler.js'`.

- [ ] **Step 3: Implement scheduler**

Create `lan-squad/sync-scheduler.js`:

```js
'use strict';

function createSyncScheduler({ hostStore, windowMs = 50 }) {
  if (!hostStore || typeof hostStore.materializeRoomViews !== 'function') {
    throw new Error('hostStore.materializeRoomViews required');
  }
  const timers = new Map();
  const reasons = new Map();

  function clear(roomId) {
    const timer = timers.get(roomId);
    if (timer) clearTimeout(timer);
    timers.delete(roomId);
  }

  function scheduleMaterialize(roomId, { reason = 'command' } = {}) {
    const rid = String(roomId || '').trim();
    if (!rid) return { ok: false, error: 'roomId_required' };
    reasons.set(rid, reason);
    if (timers.has(rid)) return { ok: true, scheduled: true };
    timers.set(rid, setTimeout(() => {
      void flush(rid, { reason: reasons.get(rid) || 'scheduled' });
    }, Number(windowMs) || 50));
    return { ok: true, scheduled: true };
  }

  async function flush(roomId, { reason = 'flush', clientId = 'host' } = {}) {
    const rid = String(roomId || '').trim();
    if (!rid) return { ok: false, error: 'roomId_required' };
    clear(rid);
    reasons.delete(rid);
    await hostStore.materializeRoomViews(rid, { deferPersist: false });
    const bundle = typeof hostStore.getRoomSyncBundle === 'function'
      ? hostStore.getRoomSyncBundle(rid)
      : null;
    const out = {
      ok: true,
      roomId: rid,
      revision: Number(bundle && bundle.revision || 0),
      latestDeltaSeq: Number(bundle && bundle.deltaSeq || 0),
      reason,
    };
    if (typeof hostStore.appendRoomBundleAudit === 'function') {
      hostStore.appendRoomBundleAudit(rid, {
        at: new Date().toISOString(),
        clientId: String(clientId || 'host'),
        action: 'sync.flush',
        detail: { reason, revision: out.revision, latestDeltaSeq: out.latestDeltaSeq },
      });
    }
    return out;
  }

  async function flushAll({ reason = 'flush-all' } = {}) {
    const rooms = [...timers.keys()];
    const out = [];
    for (const roomId of rooms) out.push(await flush(roomId, { reason }));
    return out;
  }

  function pendingRooms() {
    return [...timers.keys()];
  }

  return { scheduleMaterialize, flush, flushAll, pendingRooms };
}

module.exports = { createSyncScheduler };
```

- [ ] **Step 4: Add failing test that flush writes an audit entry**

Append to `lan-squad/sync-scheduler.test.js`:

```js
test('flush appends sync.flush audit entry with reason and clientId', async () => {
  const audits = [];
  const scheduler = createSyncScheduler({
    windowMs: 50,
    hostStore: {
      materializeRoomViews() {},
      getRoomSyncBundle() {
        return { revision: 9, deltaSeq: 4 };
      },
      appendRoomBundleAudit(roomId, entry) {
        audits.push({ roomId, entry });
      },
    },
  });
  await scheduler.flush('room-a', { reason: 'manual-troubleshooting', clientId: 'lc_a' });
  assert.equal(audits.length, 1);
  assert.equal(audits[0].entry.action, 'sync.flush');
  assert.equal(audits[0].entry.detail.reason, 'manual-troubleshooting');
  assert.equal(audits[0].entry.clientId, 'lc_a');
});
```

- [ ] **Step 5: Run scheduler tests**

Run: `node --test lan-squad/sync-scheduler.test.js`

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add lan-squad/sync-scheduler.js lan-squad/sync-scheduler.test.js
git commit -m "feat(lan): add sync materialization scheduler with flush audit trail"
```

Flush reasons should use stable strings such as `sync-now`, `manual-troubleshooting`, `shutdown`, and `test-case` so post-incident review can filter room bundle `audit_log` entries by `action: 'sync.flush'`.

---

### Task 4: Command And Flush HTTP Endpoints

**Files:**
- Modify: `lan-squad/host-router.js`
- Modify: `lan-squad/host-router.test.js`

- [ ] **Step 1: Add failing endpoint tests**

Append to `lan-squad/host-router.test.js`:

```js
test('POST /rooms/:id/commands accepts command and broadcasts canonical command', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-command-route-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  const broadcasts = [];
  const app = mountLanRouter(store, (channel, msg) => broadcasts.push({ channel, msg }));
  const server = http.createServer(app);
  await listenServer(server);
  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/api/lan/v1/rooms/sala-1/commands`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...bearerHeaders(code), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandId: 'cmd_route_1',
        domain: 'estadoActual',
        op: 'updateField',
        roomId: 'ignored-client-room',
        patientId: 'pat_1',
        entityId: 'pat_1:estadoActual',
        clientId: 'lc_a',
        clientCreatedAt: 1718293049000,
        baseSeq: 0,
        payload: { path: 'signosVitales.fc', value: 110 },
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.status, 'accepted');
    assert.strictEqual(body.roomId, 'sala-1');
    assert.strictEqual(body.deltaSeq, 1);
    assert.ok(broadcasts.some((b) => b.msg.type === 'livesync:command:applied' && b.msg.commandId === 'cmd_route_1'));
  } finally {
    await tearDownLanTest({ server, dir, store });
  }
});

test('POST /rooms/:id/flush forces materialization for LAN-authenticated clients', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-flush-route-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  store.createRoom('Sala flush');
  const app = mountLanRouter(store);
  const server = http.createServer(app);
  await listenServer(server);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/lan/v1/rooms/sala-1/flush`, {
      method: 'POST',
      headers: { ...bearerHeaders(code), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'test' }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.reason, 'test');
  } finally {
    await tearDownLanTest({ server, dir, store });
  }
});
```

- [ ] **Step 2: Run endpoint tests and verify they fail**

Run: `node --test lan-squad/host-router.test.js --test-name-pattern "commands|flush"`

Expected: FAIL with `404` for missing endpoints.

- [ ] **Step 3: Wire command resolver and scheduler into host router**

Modify `lan-squad/host-router.js`:

1. Add imports:

```js
const { createCommandResolver } = require('./command-resolver.js');
const { createSyncScheduler } = require('./sync-scheduler.js');
```

2. After `deltaResolver` creation, add:

```js
  const commandResolver = createCommandResolver({ store });
  const syncScheduler = createSyncScheduler({ hostStore: store });
```

3. Add routes after `/rooms/:id/deltas`:

```js
  r.post('/rooms/:id/commands', express.json({ limit: '1mb' }), (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const out = commandResolver.applyCommand({
      ...body,
      roomId: req.params.id,
    });
    if (out.code === 'STALE_BASE_SEQ_REQUIRES_SNAPSHOT') return res.status(409).json(out);
    if (!out.ok) return res.status(400).json(out);
    if (out.status === 'accepted') {
      syncScheduler.scheduleMaterialize(req.params.id, { reason: 'command' });
      broadcast(`live:${encodeURIComponent(req.params.id)}`, {
        type: 'livesync:command:applied',
        ...out,
      });
      broadcastLiveRevision(req.params.id, out.revision, body.clientId);
    }
    res.json(out);
  });

  r.post('/rooms/:id/flush', express.json({ limit: '32kb' }), async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const reason = String(body.reason || 'sync-now').slice(0, 64);
    const clientId = String(body.clientId || 'host').slice(0, 128);
    const out = await syncScheduler.flush(req.params.id, { reason, clientId });
    res.json(out);
  });
```

- [ ] **Step 4: Run focused route tests**

Run: `node --test lan-squad/host-router.test.js --test-name-pattern "commands|flush"`

Expected: PASS.

- [ ] **Step 5: Run existing LAN host tests**

Run: `node --test lan-squad/host-router.test.js lan-squad/host-store.test.js lan-squad/delta-resolver.test.js`

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add lan-squad/host-router.js lan-squad/host-router.test.js
git commit -m "feat(lan): expose command sync endpoints"
```

---

### Task 5: SQL Outbox Command Kind

**Files:**
- Modify: `lib/db/schema.mjs`
- Modify: `lib/db/lan-sync-outbox.mjs`
- Modify: `lib/db/lan-sync-outbox.test.mjs`

- [ ] **Step 1: Add failing outbox test for `command` kind**

Append to `lib/db/lan-sync-outbox.test.mjs`:

```js
  it('SQL outbox preserves command kind and restart-safe envelope', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    enqueueLanSyncOutbox(db, {
      roomId: 'room1',
      kind: 'command',
      payload: {
        commandId: 'cmd_1',
        domain: 'eventualidades',
        op: 'add',
        roomId: 'room1',
        clientId: 'lc_a',
        clientCreatedAt: 1718293049000,
        baseSeq: 0,
        payload: { eventualidadId: 'ev_1', text: 'Fiebre' },
      },
    });
    const rows = drainLanSyncOutbox(db, { roomId: 'room1' });
    assert.equal(rows[0].kind, 'command');
    assert.equal(rows[0].payload.commandId, 'cmd_1');
    assert.equal(rows[0].payload.domain, 'eventualidades');
    assert.equal(rows[0].payload.op, 'add');
    db.close();
  });
```

- [ ] **Step 2: Run outbox test and verify it fails**

Run: `node --test lib/db/lan-sync-outbox.test.mjs --test-name-pattern "command kind"`

Expected: FAIL because `normalizeKind()` maps `command` to `bundle`.

- [ ] **Step 3: Add schema migration and helper support**

Modify `lib/db/lan-sync-outbox.mjs`:

```js
const VALID_KINDS = new Set(['bundle', 'patch', 'clinical_ops', 'delta', 'command']);
```

Modify `lib/db/schema.mjs` by adding a new migration after the v10 `delta` migration:

```js
  if (version < 11) {
    db.exec(`
      CREATE TABLE lan_sync_outbox_v11 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('bundle', 'patch', 'clinical_ops', 'delta', 'command')),
        payload_json TEXT NOT NULL,
        enqueued_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
      INSERT INTO lan_sync_outbox_v11
        (id, room_id, kind, payload_json, enqueued_at, attempts, last_error)
      SELECT id, room_id, kind, payload_json, enqueued_at, attempts, last_error
      FROM lan_sync_outbox;
      DROP TABLE lan_sync_outbox;
      ALTER TABLE lan_sync_outbox_v11 RENAME TO lan_sync_outbox;
      CREATE INDEX IF NOT EXISTS idx_lan_outbox_room ON lan_sync_outbox(room_id, enqueued_at);
    `);
    version = 11;
    setVersion(11);
  }
```

- [ ] **Step 4: Run outbox tests**

Run: `node --test lib/db/lan-sync-outbox.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run schema tests**

Run: `node --test lib/db/schema.test.mjs lib/db/lan-sync-outbox.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add lib/db/schema.mjs lib/db/lan-sync-outbox.mjs lib/db/lan-sync-outbox.test.mjs
git commit -m "feat(lan): persist command outbox entries"
```

---

### Task 6: Renderer Command Client And Push Path

**Files:**
- Create: `public/js/lan-command-client.mjs`
- Test: `public/js/lan-command-client.test.mjs`
- Modify: `public/js/features/lan/push.mjs`

- [ ] **Step 1: Write failing command client tests**

Create `public/js/lan-command-client.test.mjs`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLanCommand,
  normalizeCommandPushResponse,
  shouldRemoveCommandOutboxEntry,
} from './lan-command-client.mjs';

describe('lan-command-client', () => {
  it('buildLanCommand creates restart-safe command envelope', () => {
    const cmd = buildLanCommand({
      domain: 'eventualidades',
      op: 'add',
      roomId: 'sala-1',
      patientId: 'pat_1',
      clientId: 'lc_a',
      baseSeq: 7,
      payload: { eventualidadId: 'ev_1', text: 'Fiebre' },
      nowMs: () => 1718293049000,
      randomId: () => 'abc',
    });

    assert.equal(cmd.commandId, 'cmd_abc');
    assert.equal(cmd.domain, 'eventualidades');
    assert.equal(cmd.op, 'add');
    assert.equal(cmd.entityId, 'pat_1:eventualidades');
    assert.equal(cmd.clientCreatedAt, 1718293049000);
    assert.equal(cmd.baseSeq, 7);
  });

  it('normalizes accepted duplicate and stale-base responses', () => {
    assert.deepEqual(
      normalizeCommandPushResponse({ ok: true, status: 200, body: { ok: true, status: 'accepted' } }),
      { ok: true, removeOutbox: true, staleBase: false, duplicate: false, status: 'accepted' }
    );
    assert.deepEqual(
      normalizeCommandPushResponse({ ok: true, status: 200, body: { ok: true, status: 'duplicate_ignored' } }),
      { ok: true, removeOutbox: true, staleBase: false, duplicate: true, status: 'duplicate_ignored' }
    );
    assert.deepEqual(
      normalizeCommandPushResponse({ ok: false, status: 409, body: { code: 'STALE_BASE_SEQ_REQUIRES_SNAPSHOT' } }),
      { ok: false, removeOutbox: false, staleBase: true, duplicate: false, status: 'stale_base_seq_requires_snapshot' }
    );
  });

  it('removes command outbox entries only after accepted or duplicate ack', () => {
    assert.equal(shouldRemoveCommandOutboxEntry({ ok: true, status: 'accepted' }), true);
    assert.equal(shouldRemoveCommandOutboxEntry({ ok: true, status: 'duplicate_ignored' }), true);
    assert.equal(shouldRemoveCommandOutboxEntry({ ok: false, code: 'STALE_BASE_SEQ_REQUIRES_SNAPSHOT' }), false);
  });
});
```

- [ ] **Step 2: Run command client tests and verify they fail**

Run: `node --test public/js/lan-command-client.test.mjs`

Expected: FAIL with `Cannot find module './lan-command-client.mjs'`.

- [ ] **Step 3: Implement command client helpers**

Create `public/js/lan-command-client.mjs`:

```js
function trim(value) {
  return String(value || '').trim();
}

function defaultRandomId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

export function buildLanCommand({
  domain,
  op,
  roomId,
  patientId,
  entityId,
  clientId,
  baseSeq = 0,
  payload,
  nowMs = () => Date.now(),
  randomId = defaultRandomId,
}) {
  const d = trim(domain);
  const pid = trim(patientId);
  return {
    commandId: `cmd_${randomId()}`,
    domain: d,
    op: trim(op),
    roomId: trim(roomId),
    patientId: pid,
    entityId: trim(entityId) || (pid ? `${pid}:${d}` : d),
    clientId: trim(clientId),
    clientCreatedAt: Number(nowMs()),
    baseSeq: Number(baseSeq || 0),
    payload: payload && typeof payload === 'object' ? payload : {},
  };
}

export function normalizeCommandPushResponse(result) {
  const body = result && result.body && typeof result.body === 'object' ? result.body : {};
  const status = String(body.status || '').trim();
  const staleBase = body.code === 'STALE_BASE_SEQ_REQUIRES_SNAPSHOT' || status === 'stale_base_seq_requires_snapshot';
  const duplicate = status === 'duplicate_ignored';
  const accepted = !!body.ok && (status === 'accepted' || duplicate);
  return {
    ok: accepted,
    removeOutbox: accepted,
    staleBase,
    duplicate,
    status: staleBase ? 'stale_base_seq_requires_snapshot' : status,
  };
}

export function shouldRemoveCommandOutboxEntry(result) {
  return !!(result && result.ok && (result.status === 'accepted' || result.status === 'duplicate_ignored'));
}
```

- [ ] **Step 4: Run command client tests**

Run: `node --test public/js/lan-command-client.test.mjs`

Expected: PASS.

- [ ] **Step 5: Add command push support to `push.mjs`**

Modify `public/js/features/lan/push.mjs`:

1. Import normalizer:

```js
import { normalizeCommandPushResponse } from '../../lan-command-client.mjs';
```

2. Add function near `pushDeltaToHost()`:

```js
async function pushCommandToHost(roomId, envelope) {
  const rid = String(roomId || '').trim();
  const command = envelope && (envelope.command || envelope.payload || envelope);
  if (!rid || !command) return false;
  const resp = await lanClient.fetch('/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/commands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const body = await resp.json().catch(function () {
    return {};
  });
  return normalizeCommandPushResponse({ ok: !!(resp && resp.ok), status: resp && resp.status, body });
}
```

3. In the outbox drain branch that currently routes `kind === 'delta'`, add:

```js
if (item.kind === 'command') {
  return pushCommandToHost(roomId, item.payload);
}
```

Use the existing loop’s variable names when patching; keep `bundle`, `patch`, `clinical_ops`, and `delta` behavior unchanged.

- [ ] **Step 6: Run renderer command tests and LAN push tests**

Run: `node --test public/js/lan-command-client.test.mjs public/js/features/lan-sync-clinical-ops.test.mjs public/js/live-sync-outbox.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add public/js/lan-command-client.mjs public/js/lan-command-client.test.mjs public/js/features/lan/push.mjs
git commit -m "feat(lan): post command outbox entries"
```

---

### Task 7: Live Command Broadcast Ordering And Gap Recovery

**Files:**
- Modify: `public/js/features/lan/room.mjs`
- Test: `public/js/features/lan-command-room.test.mjs`

- [ ] **Step 1: Write failing room ordering tests**

Create `public/js/features/lan-command-room.test.mjs` with pure exported helpers from `room.mjs`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldApplyCommandBroadcast,
  updateCommandSeqState,
} from './lan/room.mjs';

describe('LAN command room ordering', () => {
  it('applies next command when deltaSeq is contiguous', () => {
    assert.deepEqual(
      shouldApplyCommandBroadcast({ lastAppliedSeq: 4 }, { deltaSeq: 5, commandId: 'cmd_5' }),
      { action: 'apply' }
    );
  });

  it('ignores old command broadcasts', () => {
    assert.deepEqual(
      shouldApplyCommandBroadcast({ lastAppliedSeq: 5 }, { deltaSeq: 5, commandId: 'cmd_5' }),
      { action: 'ignore' }
    );
  });

  it('requires catch-up when command broadcast has a sequence gap', () => {
    assert.deepEqual(
      shouldApplyCommandBroadcast({ lastAppliedSeq: 4 }, { deltaSeq: 7, commandId: 'cmd_7' }),
      { action: 'catch_up', afterSeq: 4 }
    );
  });

  it('updates last applied sequence and last command id', () => {
    assert.deepEqual(
      updateCommandSeqState({ lastAppliedSeq: 4 }, { deltaSeq: 5, commandId: 'cmd_5' }),
      { lastAppliedSeq: 5, lastAckedCommandId: 'cmd_5' }
    );
  });
});
```

- [ ] **Step 2: Run ordering tests and verify they fail**

Run: `node --test public/js/features/lan-command-room.test.mjs`

Expected: FAIL because the helper exports do not exist.

- [ ] **Step 3: Add pure ordering helpers to `room.mjs`**

Add near existing delta helpers in `public/js/features/lan/room.mjs`:

```js
export function shouldApplyCommandBroadcast(state, msg) {
  const lastAppliedSeq = Number(state && state.lastAppliedSeq || 0);
  const seq = Number(msg && msg.deltaSeq || 0);
  if (!seq || seq <= lastAppliedSeq) return { action: 'ignore' };
  if (seq > lastAppliedSeq + 1) return { action: 'catch_up', afterSeq: lastAppliedSeq };
  return { action: 'apply' };
}

export function updateCommandSeqState(state, msg) {
  return {
    ...(state || {}),
    lastAppliedSeq: Number(msg && msg.deltaSeq || state && state.lastAppliedSeq || 0),
    lastAckedCommandId: String(msg && msg.commandId || state && state.lastAckedCommandId || ''),
  };
}
```

In the existing WebSocket message handler, add a branch:

```js
if (data.type === 'livesync:command:applied') {
  const decision = shouldApplyCommandBroadcast(commandSeqState, data);
  if (decision.action === 'catch_up') {
    requestDeltaCatchUp(decision.afterSeq);
    return;
  }
  if (decision.action === 'ignore') return;
  commandSeqState = updateCommandSeqState(commandSeqState, data);
  window.dispatchEvent(new CustomEvent('lan-command-applied', { detail: data }));
  return;
}
```

Use module-level `commandSeqState = { lastAppliedSeq: 0, lastAckedCommandId: '' }` for command broadcasts. For the first implementation, a gap should call `scheduleReconcileFromRevisionHint(data.roomId)` and dispatch `window.dispatchEvent(new CustomEvent('lan-command-gap', { detail: { afterSeq: decision.afterSeq, message: data } }))`; this preserves convergence through the existing revision/full-bundle catch-up path while the command replay path matures.

- [ ] **Step 4: Run ordering tests**

Run: `node --test public/js/features/lan-command-room.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run existing LAN room tests**

Run: `node --test public/js/features/lan-delta-wiring.test.mjs public/js/mobile-lan-boot.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit Task 7**

```bash
git add public/js/features/lan/room.mjs public/js/features/lan-command-room.test.mjs
git commit -m "feat(lan): order command broadcasts by delta sequence"
```

---

### Task 8: Proof-Domain Command Builders In Orchestrator

**Files:**
- Modify: `public/js/features/lan/orchestrator.mjs`
- Test: `public/js/features/lan-command-builders.test.mjs`

- [ ] **Step 1: Write failing builder tests**

Create `public/js/features/lan-command-builders.test.mjs`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEstadoActualCommand,
  buildEventualidadAddCommand,
  buildPendienteCommand,
} from './lan/orchestrator.mjs';

const base = {
  roomId: 'sala-1',
  patientId: 'pat_1',
  clientId: 'lc_a',
  baseSeq: 4,
  nowMs: () => 1718293049000,
  randomId: () => 'abc',
};

describe('LAN proof-domain command builders', () => {
  it('builds estadoActual update command', () => {
    const cmd = buildEstadoActualCommand({ ...base, path: 'signosVitales.fc', value: 110 });
    assert.equal(cmd.domain, 'estadoActual');
    assert.equal(cmd.op, 'updateField');
    assert.equal(cmd.payload.path, 'signosVitales.fc');
    assert.equal(cmd.payload.value, 110);
  });

  it('builds add-only eventualidades command', () => {
    const cmd = buildEventualidadAddCommand({ ...base, eventualidadId: 'ev_1', text: 'Fiebre', at: '2026-06-06T12:00:00.000Z' });
    assert.equal(cmd.domain, 'eventualidades');
    assert.equal(cmd.op, 'add');
    assert.equal(cmd.payload.eventualidadId, 'ev_1');
  });

  it('builds pendientes add update complete commands', () => {
    assert.equal(buildPendienteCommand({ ...base, op: 'add', itemId: 'todo_1', text: 'Labs' }).op, 'add');
    assert.equal(buildPendienteCommand({ ...base, op: 'update', itemId: 'todo_1', text: 'Labs AM' }).op, 'update');
    assert.equal(buildPendienteCommand({ ...base, op: 'complete', itemId: 'todo_1' }).payload.completed, true);
  });
});
```

- [ ] **Step 2: Run builder tests and verify they fail**

Run: `node --test public/js/features/lan-command-builders.test.mjs`

Expected: FAIL because the exports do not exist.

- [ ] **Step 3: Add command builder exports**

Modify `public/js/features/lan/orchestrator.mjs`:

1. Import:

```js
import { buildLanCommand } from '../../lan-command-client.mjs';
```

2. Add exports near other LAN command helpers:

```js
export function buildEstadoActualCommand(opts) {
  return buildLanCommand({
    ...opts,
    domain: 'estadoActual',
    op: 'updateField',
    entityId: `${opts.patientId}:estadoActual`,
    payload: { path: opts.path, value: opts.value },
  });
}

export function buildEventualidadAddCommand(opts) {
  return buildLanCommand({
    ...opts,
    domain: 'eventualidades',
    op: 'add',
    entityId: `${opts.patientId}:eventualidades`,
    payload: {
      eventualidadId: opts.eventualidadId,
      at: opts.at,
      text: opts.text,
    },
  });
}

export function buildPendienteCommand(opts) {
  const op = String(opts.op || '').trim();
  return buildLanCommand({
    ...opts,
    domain: 'pendientes',
    op,
    entityId: `${opts.patientId}:pendientes`,
    payload: {
      itemId: opts.itemId,
      text: opts.text,
      completed: op === 'complete' ? true : opts.completed,
    },
  });
}
```

- [ ] **Step 4: Run builder tests**

Run: `node --test public/js/features/lan-command-builders.test.mjs`

Expected: PASS.

- [ ] **Step 5: Wire local enqueue calls where proof-domain saves already happen**

Before editing save handlers, inspect the current call sites:

Run: `rg "eventualidades|estadoActual|pendientes|todo" public/js/features public/js -g "*.mjs"`

Patch only the narrow save points that already enqueue/push LAN updates. For the first pass, add builder coverage and command enqueue plumbing without removing legacy bundle fallback. At each patched save point:

```js
const command = buildEstadoActualCommand({
  roomId,
  patientId,
  clientId,
  baseSeq: lastAppliedSeq,
  path,
  value,
});
enqueueLanSyncOutbox(db, { roomId, kind: 'command', payload: { command } });
```

Use the matching builder for `eventualidades` and `pendientes`. Preserve the existing local save before enqueueing. Do not remove legacy bundle fallback in this task.

- [ ] **Step 6: Run focused renderer tests**

Run: `node --test public/js/features/lan-command-builders.test.mjs public/js/lan-command-client.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit Task 8**

```bash
git add public/js/features/lan/orchestrator.mjs public/js/features/lan-command-builders.test.mjs
git commit -m "feat(lan): build proof-domain sync commands"
```

---

### Task 9: Diagnostics And Observability

**Files:**
- Modify: `public/js/lan-sync-diagnostics.mjs`
- Modify: `public/js/lan-sync-diagnostics.test.mjs`
- Test: `public/js/lan-command-diagnostics.test.mjs`

- [ ] **Step 1: Review diagnostics entry points**

Read `public/js/lan-sync-diagnostics.mjs` and `public/js/lan-sync-diagnostics.test.mjs` before editing. Keep existing exports intact and add the command sync helper described below.

- [ ] **Step 2: Write failing diagnostics test**

Create `public/js/lan-command-diagnostics.test.mjs`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCommandSyncDiagnostics } from './lan-sync-diagnostics.mjs';

describe('command sync diagnostics', () => {
  it('reports command queue and scheduler fields', () => {
    const out = buildCommandSyncDiagnostics({
      commandQueueDepth: 2,
      oldestPendingCommandAgeMs: 15000,
      lastCommandAck: { status: 'accepted', at: '2026-06-06T14:34:10.000Z' },
      lastAppliedSeq: 12,
      lastAckedCommandId: 'cmd_1',
      schedulerPendingRooms: ['sala-1'],
      lastFlush: { reason: 'sync-now', ok: true },
      staleBaseCount: 1,
      duplicateCommandCount: 3,
      clockDriftWarnings: 1,
      replayGapCount: 2,
      fullBundleFallbackCount: 1,
    });

    assert.equal(out.commandQueueDepth, 2);
    assert.equal(out.lastAppliedSeq, 12);
    assert.deepEqual(out.schedulerPendingRooms, ['sala-1']);
    assert.equal(out.staleBaseCount, 1);
  });
});
```

If the diagnostics file exports a differently named builder, add the new helper there and keep existing exports.

- [ ] **Step 3: Run diagnostics test and verify it fails**

Run: `node --test public/js/lan-command-diagnostics.test.mjs`

Expected: FAIL because the helper does not exist.

- [ ] **Step 4: Implement diagnostics helper**

Add to `public/js/lan-sync-diagnostics.mjs`:

```js
export function buildCommandSyncDiagnostics(input) {
  const src = input && typeof input === 'object' ? input : {};
  return {
    commandQueueDepth: Number(src.commandQueueDepth || 0),
    oldestPendingCommandAgeMs: Number(src.oldestPendingCommandAgeMs || 0),
    lastCommandAck: src.lastCommandAck || null,
    lastAppliedSeq: Number(src.lastAppliedSeq || 0),
    lastAckedCommandId: String(src.lastAckedCommandId || ''),
    schedulerPendingRooms: Array.isArray(src.schedulerPendingRooms) ? src.schedulerPendingRooms.slice() : [],
    lastFlush: src.lastFlush || null,
    staleBaseCount: Number(src.staleBaseCount || 0),
    duplicateCommandCount: Number(src.duplicateCommandCount || 0),
    clockDriftWarnings: Number(src.clockDriftWarnings || 0),
    replayGapCount: Number(src.replayGapCount || 0),
    fullBundleFallbackCount: Number(src.fullBundleFallbackCount || 0),
  };
}
```

- [ ] **Step 5: Run diagnostics test**

Run: `node --test public/js/lan-command-diagnostics.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit Task 9**

```bash
git add public/js/lan-sync-diagnostics.mjs public/js/lan-command-diagnostics.test.mjs
git commit -m "feat(lan): expose command sync diagnostics"
```

---

### Task 10: Integration Verification And Metrics

**Files:**
- Modify only files needed to fix verification failures.
- No new feature code unless a test exposes a real integration defect.

- [ ] **Step 1: Run focused LAN command suite**

Run:

```bash
node --test \
  lan-squad/command-registry.test.js \
  lan-squad/command-resolver.test.js \
  lan-squad/sync-scheduler.test.js \
  lan-squad/host-router.test.js \
  lib/db/lan-sync-outbox.test.mjs \
  public/js/lan-command-client.test.mjs \
  public/js/features/lan-command-room.test.mjs \
  public/js/features/lan-command-builders.test.mjs \
  public/js/lan-command-diagnostics.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run existing related LAN suite**

Run:

```bash
node --test \
  lan-squad/delta-resolver.test.js \
  lan-squad/host-store.test.js \
  lan-squad/bundle-merge.test.js \
  public/js/features/lan-delta-wiring.test.mjs \
  public/js/live-sync-outbox.test.mjs \
  lib/db/schema.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Run metrics if available**

Run: `npm run metrics`

Expected: If the script exists, PASS and no debt score regression. If the script is not implemented, record the missing script and manually check touched files stay under Tier 1 size/complexity limits.

- [ ] **Step 4: Build UI bundle**

Run: `npm run build:ui`

Expected: PASS. Generated bundle and chunk changes are expected after renderer edits.

- [ ] **Step 5: Review final diff for generated and unrelated files**

Run:

```bash
git status --short
git diff --stat
git diff -- lan-squad lib/db public/js docs/superpowers/plans
```

Expected: Source, tests, plan, and generated bundle changes are explainable. No unrelated guardia/release changes are included unless they were already present before implementation and remain unstaged.

- [ ] **Step 6: Update project context if implementation changed architecture**

If the implementation adds the command route, scheduler, registry, schema migration, or renderer command path, update `.cursor/rules/project-context.mdc` changelog with:

```markdown
- **2026-06-06** `lan-command-sync`: registry-driven command sync substrate for estadoActual/eventualidades/pendientes; host `deltaSeq` command ACK + scheduler materialization; `lan-squad/command-*`, `sync-scheduler.js`, `lan-command-client.mjs`.
```

- [ ] **Step 7: Commit final integration**

```bash
git add lan-squad lib/db public/js .cursor/rules/project-context.mdc
git commit -m "feat(lan): add command sync substrate"
```

---

## Self-Review

Spec coverage:

- Local-first command path: Tasks 6 and 8.
- Host-authoritative `deltaSeq`: Tasks 2 and 4.
- Registry domain strategies: Task 1.
- L1 durable command log: Task 2.
- L2 scheduler and flush: Tasks 3 and 4.
- SQL outbox restart survival with `domain`, `op`, `commandId`: Task 5.
- Broadcast ordering and gap recovery: Task 7.
- Observability: Task 9.
- Verification and metrics: Task 10.

Type consistency:

- Command envelope fields match the spec: `commandId`, `domain`, `op`, `roomId`, `clientId`, `clientCreatedAt`, `baseSeq`, `payload`.
- Host ACK fields match the spec: `status`, `commandId`, `deltaSeq`, `revision`, `committedAt`, `materialized`.
- Broadcast type is consistently `livesync:command:applied`.

Scope guardrails:

- HC remains on existing field-delta/full-bundle paths.
- clinicalOps/teams, manejo, roster, and administrative patient fields remain legacy.
- `eventualidades` is add-only.
- `pendientes` excludes delete/archive.
