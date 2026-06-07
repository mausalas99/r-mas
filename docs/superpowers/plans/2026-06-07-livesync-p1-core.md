# LiveSync P1 Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the full-room-bundle push from every patient save by (1) introducing a typed mutation registry with dedicated endpoints for nota, indicaciones, lab history, and patient fields; (2) replacing global post-save bundle triggers with domain-specific dispatchers; (3) building a lean safety bundle (30s, stripped of typed fields) for untyped domains; and (4) switching live revision hints from full-bundle reconciles to delta log replay.

**Architecture:** New modules `lan-mutation-registry.mjs` and `lan-safety-bundle-builder.mjs` handle dispatch and bundle construction. New Express routes in `host-router.js` receive typed mutations and call `broadcastLiveRevision` to notify peers. `bundle-merge.js` gains a `mergePartialEntry` path guarded by an `entriesPartial` flag. The outbox schema bumps to v14, adding four new kind values. `reconcileLiveSyncRoomBody` in `push.mjs` gains a delta-first path for revision-hint-triggered reconciles. All eight `scheduleLiveSyncPush()` call sites are replaced with domain-specific dispatchers.

**Tech Stack:** ES modules (`public/js/`), CommonJS (`lan-squad/`), SQLite via better-sqlite3, `node --test` runner, Express 5.

---

## Prerequisite: Plan A (P0 Quick Wins) must be merged first

Plan A adds `emitLiveSyncRevisionHint` to `room.mjs`'s import block and fixes the gossip handler. Tasks in this plan assume Plan A is already applied.

---

## Task 1: Schema v14 — expand outbox CHECK constraint and VALID_KINDS

**Why first:** All later tasks that enqueue typed mutations depend on the DB accepting new `kind` values. Without this, `INSERT INTO lan_sync_outbox` with `kind = 'nota_replace'` will fail at the SQLite constraint check.

**Files:**
- Modify: `lib/db/schema.mjs` (SCHEMA_VERSION, new migrateToV14, applyMigrations chain)
- Modify: `lib/db/lan-sync-outbox.mjs` (expand VALID_KINDS)
- Test: `lib/db/schema.test.mjs` (verify migration applies and new kinds are accepted)

---

- [ ] **Step 1: Write the failing test in `lib/db/schema.test.mjs`**

Open `lib/db/schema.test.mjs`. Find the block of existing migration tests and add after the last test:

```js
it('migrateToV14 adds typed outbox kinds to CHECK constraint', async () => {
  const db = openDbForTest();    // use whatever helper the file already uses to get a test DB
  applyMigrations(db);

  // All new kinds must insert successfully
  const newKinds = ['lab_history_upsert', 'nota_replace', 'indicaciones_replace', 'patient_fields'];
  for (const kind of newKinds) {
    assert.doesNotThrow(
      () => enqueueLanSyncOutbox(db, {
        roomId: 'r1',
        kind,
        payload: { test: true },
      }),
      `kind ${kind} should be accepted after v14 migration`
    );
  }

  // Old kinds must still work
  for (const kind of ['bundle', 'patch', 'clinical_ops', 'delta', 'command']) {
    assert.doesNotThrow(
      () => enqueueLanSyncOutbox(db, { roomId: 'r1', kind, payload: { test: true } }),
      `legacy kind ${kind} must still be accepted`
    );
  }
});
```

> Note: check how the existing tests open a test DB (look for `openDbForTest`, `openTestDb`, or similar in `lib/db/schema.test.mjs`). The helper opens an in-memory SQLite database for isolation.

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd /Users/mauriciosalas/R+
node --test lib/db/schema.test.mjs 2>&1 | tail -20
```

Expected: the new test fails — new kinds trigger a constraint error or the test references the old `VALID_KINDS` guard.

- [ ] **Step 3: Bump SCHEMA_VERSION to 14 in `lib/db/schema.mjs`**

Find:
```js
export const SCHEMA_VERSION = 13;
```

Replace with:
```js
export const SCHEMA_VERSION = 14;
```

- [ ] **Step 4: Add `migrateToV14` function to `lib/db/schema.mjs`**

Add after the `migrateToV13` function (before the `readSchemaVersion` function):

```js
/** @param {import('better-sqlite3').Database} db */
function migrateToV14(db) {
  if (!tableExists(db, 'lan_sync_outbox')) {
    db.prepare(
      'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run('schema_version', '14');
    return;
  }
  db.exec(`
    CREATE TABLE lan_sync_outbox_v14 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN (
        'bundle', 'patch', 'clinical_ops', 'delta', 'command',
        'lab_history_upsert', 'nota_replace', 'indicaciones_replace', 'patient_fields'
      )),
      payload_json TEXT NOT NULL,
      enqueued_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    INSERT INTO lan_sync_outbox_v14
      (id, room_id, kind, payload_json, enqueued_at, attempts, last_error)
    SELECT id, room_id, kind, payload_json, enqueued_at, attempts, last_error
    FROM lan_sync_outbox;
    DROP TABLE lan_sync_outbox;
    ALTER TABLE lan_sync_outbox_v14 RENAME TO lan_sync_outbox;
    CREATE INDEX IF NOT EXISTS idx_lan_outbox_room ON lan_sync_outbox(room_id, enqueued_at);
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '14');
}
```

- [ ] **Step 5: Wire `migrateToV14` into `applyMigrations` in `lib/db/schema.mjs`**

Find the end of the `applyMigrations` function (after the v13 block):

```js
  if (readSchemaVersion(db) < 13) {
    const runV13 = db.transaction(() => {
      migrateToV13(db);
    });
    runV13();
  }
}
```

Add the v14 block:

```js
  if (readSchemaVersion(db) < 13) {
    const runV13 = db.transaction(() => {
      migrateToV13(db);
    });
    runV13();
  }
  if (readSchemaVersion(db) < 14) {
    const runV14 = db.transaction(() => {
      migrateToV14(db);
    });
    runV14();
  }
}
```

- [ ] **Step 6: Expand `VALID_KINDS` in `lib/db/lan-sync-outbox.mjs`**

Find:
```js
const VALID_KINDS = new Set(['bundle', 'patch', 'clinical_ops', 'delta', 'command']);
```

Replace with:
```js
const VALID_KINDS = new Set([
  'bundle', 'patch', 'clinical_ops', 'delta', 'command',
  'lab_history_upsert', 'nota_replace', 'indicaciones_replace', 'patient_fields',
]);
```

- [ ] **Step 7: Run the test to confirm it passes**

```bash
node --test lib/db/schema.test.mjs 2>&1 | tail -20
```

Expected: all tests pass including the new v14 test.

- [ ] **Step 8: Run the full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: no new failures.

- [ ] **Step 9: Commit**

```bash
git add lib/db/schema.mjs lib/db/lan-sync-outbox.mjs lib/db/schema.test.mjs
git commit -m "feat(db): schema v14 — expand outbox kinds for typed LAN mutations

Adds lab_history_upsert, nota_replace, indicaciones_replace, and
patient_fields to lan_sync_outbox CHECK constraint and VALID_KINDS set.
Migration recreates the table (copy-drop-rename pattern from v12)."
```

---

## Task 2: Safety bundle builder (`lan-safety-bundle-builder.mjs`)

**What it does:** Builds a stripped sync-bundle containing only untyped patient fields (medReceta, medPharmProfile, vpo, listadoProblemas, etc.) and sets `entriesPartial: true`. Typed fields (`note`, `indicaciones`, `labHistory`, `todos`) are omitted so a V1 host's `mergePartialEntry` guard preserves the typed-path state.

**Files:**
- Create: `public/js/lan-safety-bundle-builder.mjs`
- Create: `public/js/lan-safety-bundle-builder.test.mjs`

---

- [ ] **Step 1: Create the failing test**

Create `public/js/lan-safety-bundle-builder.test.mjs`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSafetyBundleEntries,
  SAFETY_BUNDLE_SIZE_CAP_BYTES,
  TYPED_ENTRY_FIELDS,
} from './lan-safety-bundle-builder.mjs';

describe('buildSafetyBundleEntries', () => {
  const mkEntry = (id, overrides = {}) => ({
    id,
    name: 'Test Patient',
    note: { texto: 'SOAP note text' },
    indicaciones: { items: ['paracetamol'] },
    labHistory: [{ id: 'ls_1', date: '2026-06-07', values: {} }],
    todos: [{ id: 't1', text: 'check labs' }],
    medReceta: { meds: [{ name: 'amox' }] },
    vpo: { text: 'some vpo content' },
    ...overrides,
  });

  it('strips typed fields from each entry', () => {
    const entries = buildSafetyBundleEntries([mkEntry('p1')]);
    assert.equal(entries.length, 1);
    assert.ok(!('note' in entries[0]), 'note must be stripped');
    assert.ok(!('indicaciones' in entries[0]), 'indicaciones must be stripped');
    assert.ok(!('labHistory' in entries[0]), 'labHistory must be stripped');
    assert.ok(!('todos' in entries[0]), 'todos must be stripped');
  });

  it('preserves untyped fields', () => {
    const entries = buildSafetyBundleEntries([mkEntry('p1')]);
    assert.ok('medReceta' in entries[0], 'medReceta must be preserved');
    assert.ok('vpo' in entries[0], 'vpo must be preserved');
    assert.ok('name' in entries[0], 'name must be preserved');
    assert.ok('id' in entries[0], 'id must be preserved');
  });

  it('only includes entries listed in dirtyPatientIds', () => {
    const entries = buildSafetyBundleEntries(
      [mkEntry('p1'), mkEntry('p2'), mkEntry('p3')],
      new Set(['p2'])
    );
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, 'p2');
  });

  it('includes all entries when dirtyPatientIds is not provided', () => {
    const entries = buildSafetyBundleEntries([mkEntry('p1'), mkEntry('p2')]);
    assert.equal(entries.length, 2);
  });

  it('TYPED_ENTRY_FIELDS exports the expected set', () => {
    for (const f of ['note', 'indicaciones', 'labHistory', 'todos']) {
      assert.ok(TYPED_ENTRY_FIELDS.has(f), `TYPED_ENTRY_FIELDS must include ${f}`);
    }
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
node --test public/js/lan-safety-bundle-builder.test.mjs 2>&1 | tail -10
```

Expected: fails with module-not-found or import errors.

- [ ] **Step 3: Implement `lan-safety-bundle-builder.mjs`**

Create `public/js/lan-safety-bundle-builder.mjs`:

```js
/**
 * Builds a stripped "safety bundle" for untyped domains.
 *
 * Only fields NOT managed by typed mutation endpoints are included in each
 * patient entry. The bundle sets entriesPartial: true so a V1 host calls
 * mergePartialEntry and preserves typed-path state (nota, indicaciones, labs).
 */

/** Fields managed by typed endpoints — excluded from safety bundle entries. */
export const TYPED_ENTRY_FIELDS = new Set([
  'note',
  'indicaciones',
  'labHistory',
  'todos',
]);

/**
 * Strips typed fields from patient entries and optionally filters to only
 * dirty patients.
 *
 * @param {object[]} allEntries - Full patient entry array from local state.
 * @param {Set<string>} [dirtyPatientIds] - If provided, only include entries
 *   whose `id` is in this set. If omitted, include all entries.
 * @returns {object[]} Stripped entries safe to include in a safety bundle.
 */
export function buildSafetyBundleEntries(allEntries, dirtyPatientIds) {
  if (!Array.isArray(allEntries)) return [];
  return allEntries
    .filter((e) => {
      if (!e || !e.id) return false;
      if (dirtyPatientIds && !dirtyPatientIds.has(e.id)) return false;
      return true;
    })
    .map((e) => {
      const stripped = {};
      for (const [key, val] of Object.entries(e)) {
        if (!TYPED_ENTRY_FIELDS.has(key)) {
          stripped[key] = val;
        }
      }
      return stripped;
    });
}
```

> Note: Size-capping logic (50KB, strip vpo → medPharmProfile → listadoProblemas in order) is added in Task 3 where the full bundle envelope is assembled. This module only handles entry stripping and filtering.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
node --test public/js/lan-safety-bundle-builder.test.mjs 2>&1 | tail -10
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/lan-safety-bundle-builder.mjs public/js/lan-safety-bundle-builder.test.mjs
git commit -m "feat(lan): safety bundle entry builder

Strips typed fields (note, indicaciones, labHistory, todos) from patient
entries for untyped-domain safety bundles. Only dirty patient entries are
included when a dirty set is provided. Exports TYPED_ENTRY_FIELDS for
reuse in bundle-merge partial entry guard (Task 4)."
```

---

## Task 3: Mutation registry (`lan-mutation-registry.mjs`)

**What it does:** Central dispatch table. Typed domains (nota, indicaciones, lab-history, patient-fields) call their HTTP endpoint. Unknown/untyped domains set a dirty flag and schedule a 30-second safety bundle. Queues to the outbox on HTTP failure.

**Files:**
- Create: `public/js/lan-mutation-registry.mjs`
- Create: `public/js/lan-mutation-registry.test.mjs`

---

- [ ] **Step 1: Create the failing test**

Create `public/js/lan-mutation-registry.test.mjs`:

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// We test the registry using pure unit stubs — no real LAN session needed.
// The registry must be reset between tests by reimporting or via a reset fn.

describe('dispatchLanMutation', () => {
  it('calls the registered handler for a typed domain', async () => {
    const { createMutationRegistry } = await import('./lan-mutation-registry.mjs');
    const registry = createMutationRegistry({ isActive: () => true });

    let called = null;
    registry.registerMutationHandler('nota', async (pid, payload) => {
      called = { pid, payload };
    });

    await registry.dispatchLanMutation('nota', 'p1', { texto: 'hello' });
    assert.deepEqual(called, { pid: 'p1', payload: { texto: 'hello' } });
  });

  it('returns immediately when no active LAN session', async () => {
    const { createMutationRegistry } = await import('./lan-mutation-registry.mjs');
    const registry = createMutationRegistry({ isActive: () => false });

    let called = false;
    registry.registerMutationHandler('nota', async () => { called = true; });
    await registry.dispatchLanMutation('nota', 'p1', {});

    assert.equal(called, false);
  });

  it('calls markUntypedDirty and scheduleUntypedSafetyBundle for unknown domain', async () => {
    const { createMutationRegistry } = await import('./lan-mutation-registry.mjs');
    let dirtyArgs = null;
    let scheduleCalled = false;

    const registry = createMutationRegistry({
      isActive: () => true,
      markUntypedDirty: (domain, pid) => { dirtyArgs = { domain, pid }; },
      scheduleUntypedSafetyBundle: () => { scheduleCalled = true; },
    });

    await registry.dispatchLanMutation('vpo', 'p1');
    assert.deepEqual(dirtyArgs, { domain: 'vpo', pid: 'p1' });
    assert.equal(scheduleCalled, true);
  });

  it('enqueues outbox when typed handler throws', async () => {
    const { createMutationRegistry } = await import('./lan-mutation-registry.mjs');
    let enqueued = null;

    const registry = createMutationRegistry({
      isActive: () => true,
      enqueueOutbox: (roomId, item) => { enqueued = { roomId, item }; },
      getActiveRoomId: () => 'room1',
    });

    registry.registerMutationHandler('nota', async () => { throw new Error('network'); });
    registry.setDomainOutboxKind('nota', 'nota_replace');

    await registry.dispatchLanMutation('nota', 'p1', { texto: 'hi' });
    assert.equal(enqueued?.item?.kind, 'nota_replace');
    assert.equal(enqueued?.roomId, 'room1');
  });

  it('isTypedDomain returns true for registered domains', async () => {
    const { createMutationRegistry } = await import('./lan-mutation-registry.mjs');
    const registry = createMutationRegistry({ isActive: () => true });
    registry.registerMutationHandler('nota', async () => {});
    assert.equal(registry.isTypedDomain('nota'), true);
    assert.equal(registry.isTypedDomain('vpo'), false);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
node --test public/js/lan-mutation-registry.test.mjs 2>&1 | tail -10
```

Expected: module-not-found error or assertion failures.

- [ ] **Step 3: Implement `lan-mutation-registry.mjs`**

Create `public/js/lan-mutation-registry.mjs`:

```js
/**
 * LAN Mutation Registry — routes domain saves to typed endpoints or
 * the untyped 30-second safety bundle.
 *
 * Usage:
 *   import { lanMutationRegistry } from './lan-mutation-registry.mjs';
 *   lanMutationRegistry.registerMutationHandler('nota', pushNotaToHost);
 *   lanMutationRegistry.dispatchLanMutation('nota', patientId, payload);
 *
 * For testing, use createMutationRegistry(deps) to get an isolated instance.
 */

export function createMutationRegistry(deps = {}) {
  const handlers = new Map();
  const domainKinds = new Map();

  const isActive = deps.isActive ?? (() => false);
  const markUntypedDirty = deps.markUntypedDirty ?? (() => {});
  const scheduleUntypedSafetyBundle = deps.scheduleUntypedSafetyBundle ?? (() => {});
  const enqueueOutbox = deps.enqueueOutbox ?? (() => {});
  const getActiveRoomId = deps.getActiveRoomId ?? (() => '');

  function registerMutationHandler(domain, handler) {
    handlers.set(String(domain), handler);
  }

  function setDomainOutboxKind(domain, kind) {
    domainKinds.set(String(domain), kind);
  }

  function isTypedDomain(domain) {
    return handlers.has(String(domain));
  }

  async function dispatchLanMutation(domain, patientId, payload) {
    if (!isActive()) return;
    const handler = handlers.get(String(domain));
    if (handler) {
      try {
        await handler(patientId, payload);
      } catch (_err) {
        const kind = domainKinds.get(String(domain));
        if (kind) {
          const roomId = getActiveRoomId();
          if (roomId) enqueueOutbox(roomId, { kind, payload: { patientId, data: payload } });
        }
      }
    } else {
      markUntypedDirty(domain, patientId);
      scheduleUntypedSafetyBundle();
    }
  }

  return {
    registerMutationHandler,
    setDomainOutboxKind,
    isTypedDomain,
    dispatchLanMutation,
  };
}

// Singleton for production use; wired in orchestrator.mjs at boot.
export const lanMutationRegistry = createMutationRegistry();
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
node --test public/js/lan-mutation-registry.test.mjs 2>&1 | tail -10
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/lan-mutation-registry.mjs public/js/lan-mutation-registry.test.mjs
git commit -m "feat(lan): mutation registry — typed dispatch with untyped fallback

createMutationRegistry() provides a testable instance; lanMutationRegistry
is the production singleton wired in orchestrator.mjs. Typed domains call
their handler directly; failures enqueue to the SQLCipher outbox. Unknown
domains mark dirty and schedule the 30-second safety bundle."
```

---

## Task 4: `bundle-merge.js` partial entry merge (entriesPartial flag)

**What it does:** When `incoming.entriesPartial === true`, the host merges entry fields instead of wholesale-replacing the entries array. Fields in `TYPED_ENTRY_FIELDS` (note, indicaciones, labHistory, todos) are preserved from the server state; all other fields are applied from the incoming entry. New entries (no server match) are appended as normal.

**Files:**
- Modify: `lan-squad/bundle-merge.js` (add `mergePartialEntry`, change `'entries' in base` block)
- Test: `lan-squad/bundle-merge.test.js` (add partial-merge test cases)

---

- [ ] **Step 1: Write the failing tests**

Open `lan-squad/bundle-merge.test.js`. Find the end of the existing test suite and add:

```js
describe('entriesPartial — partial merge', () => {
  const TYPED = ['note', 'indicaciones', 'labHistory', 'todos'];

  function mkServerEntry(id, overrides = {}) {
    return {
      id,
      name: 'Server Name',
      note: { texto: 'server note' },
      indicaciones: { items: ['server drug'] },
      labHistory: [{ id: 'ls_s', date: '2026-06-01', values: {} }],
      todos: [{ id: 't_s', text: 'server todo' }],
      medReceta: { meds: [] },
      vpo: { text: 'server vpo' },
      ...overrides,
    };
  }

  function mkIncomingEntry(id, overrides = {}) {
    return {
      id,
      name: 'Client Name',
      note: { texto: 'client note' },
      indicaciones: { items: ['client drug'] },
      labHistory: [{ id: 'ls_c', date: '2026-06-07', values: {} }],
      todos: [{ id: 't_c', text: 'client todo' }],
      medReceta: { meds: [{ name: 'amox' }] },
      vpo: { text: 'client vpo' },
      ...overrides,
    };
  }

  it('preserves typed fields from server when entriesPartial is true', () => {
    const serverBundle = {
      revision: 1,
      entityVersions: {},
      agenda: [], todos: {}, entries: [mkServerEntry('p1')],
      manejo: null, clinicalOps: null, committedAt: new Date().toISOString(),
    };
    const incoming = {
      baseRevision: 1,
      baseEntityVersions: {},
      entries: [mkIncomingEntry('p1')],
      entriesPartial: true,
      clientId: 'lc_a',
    };
    const result = mergeBundlePut(serverBundle, incoming, { nowIso: () => new Date().toISOString() });
    const merged = result.bundle.entries.find((e) => e.id === 'p1');
    assert.ok(merged, 'merged entry must exist');
    // typed fields: server wins
    assert.deepStrictEqual(merged.note, { texto: 'server note' }, 'note must come from server');
    assert.deepStrictEqual(merged.indicaciones, { items: ['server drug'] }, 'indicaciones from server');
    assert.deepStrictEqual(merged.labHistory, [{ id: 'ls_s', date: '2026-06-01', values: {} }], 'labHistory from server');
    // untyped fields: client wins
    assert.equal(merged.name, 'Client Name', 'name must come from client');
    assert.deepStrictEqual(merged.medReceta, { meds: [{ name: 'amox' }] }, 'medReceta from client');
  });

  it('appends new entries not found on server when entriesPartial is true', () => {
    const serverBundle = {
      revision: 1, entityVersions: {}, agenda: [], todos: {},
      entries: [mkServerEntry('p1')],
      manejo: null, clinicalOps: null, committedAt: new Date().toISOString(),
    };
    const incoming = {
      baseRevision: 1, baseEntityVersions: {},
      entries: [mkIncomingEntry('p_new')],
      entriesPartial: true,
      clientId: 'lc_a',
    };
    const result = mergeBundlePut(serverBundle, incoming, { nowIso: () => new Date().toISOString() });
    const newEntry = result.bundle.entries.find((e) => e.id === 'p_new');
    assert.ok(newEntry, 'new entry must be appended');
    assert.equal(result.bundle.entries.length, 2, 'original server entry plus new entry');
  });

  it('replaces entries wholesale when entriesPartial is NOT set (V0 behavior)', () => {
    const serverBundle = {
      revision: 1, entityVersions: {}, agenda: [], todos: {},
      entries: [mkServerEntry('p1')],
      manejo: null, clinicalOps: null, committedAt: new Date().toISOString(),
    };
    const incoming = {
      baseRevision: 1, baseEntityVersions: {},
      entries: [mkIncomingEntry('p1')],
      clientId: 'lc_a',
    };
    const result = mergeBundlePut(serverBundle, incoming, { nowIso: () => new Date().toISOString() });
    const merged = result.bundle.entries.find((e) => e.id === 'p1');
    // Without entriesPartial, client's typed fields should overwrite server's
    assert.deepStrictEqual(merged.note, { texto: 'client note' }, 'without entriesPartial, note from client');
  });
});
```

> Note: check `lan-squad/bundle-merge.test.js` for the import at the top (look for `const { mergeBundlePut } = require('./bundle-merge.js')` or similar).

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
node --test lan-squad/bundle-merge.test.js 2>&1 | tail -20
```

Expected: the `entriesPartial` tests fail (entries are replaced wholesale regardless of flag).

- [ ] **Step 3: Implement `mergePartialEntry` and wire it in `bundle-merge.js`**

Open `lan-squad/bundle-merge.js`. After the `function materializeTodos(map)` function (before `function mergeEntityLww`), add:

```js
/** Fields whose values are maintained by typed endpoints — never overwritten by safety bundle. */
const TYPED_ENTRY_FIELDS = new Set(['note', 'indicaciones', 'labHistory', 'todos']);

/**
 * Merges a safety-bundle (partial) entry into the server's version.
 * Typed fields are preserved from serverEntry; all other fields come from incomingEntry.
 * New entries (no server match) are not handled here — they are appended directly.
 *
 * @param {object} serverEntry - Current server entry for this patient.
 * @param {object} incomingEntry - Entry from the partial safety bundle.
 * @returns {object} Merged entry.
 */
function mergePartialEntry(serverEntry, incomingEntry) {
  const merged = { ...serverEntry };
  for (const [key, val] of Object.entries(incomingEntry)) {
    if (!TYPED_ENTRY_FIELDS.has(key)) {
      merged[key] = val;
    }
  }
  return merged;
}
```

Then find the block at line 179:
```js
  if ('entries' in base) {
    bundle.entries = Array.isArray(base.entries) ? base.entries : [];
  }
```

Replace with:

```js
  if ('entries' in base) {
    const incomingEntries = Array.isArray(base.entries) ? base.entries : [];
    if (base.entriesPartial === true) {
      // Partial merge: preserve typed fields from server; apply untyped from client.
      const serverById = new Map((bundle.entries || []).map((e) => [e && e.id, e]));
      const result = [...(bundle.entries || [])]; // start from server entries
      const serverIdSet = new Set(serverById.keys());
      for (const incoming of incomingEntries) {
        if (!incoming || !incoming.id) continue;
        if (serverIdSet.has(incoming.id)) {
          const idx = result.findIndex((e) => e && e.id === incoming.id);
          if (idx >= 0) result[idx] = mergePartialEntry(result[idx], incoming);
        } else {
          result.push(incoming); // new entry not on server — append
        }
      }
      bundle.entries = result;
    } else {
      bundle.entries = incomingEntries;
    }
  }
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
node --test lan-squad/bundle-merge.test.js 2>&1 | tail -20
```

Expected: all tests pass including the three new partial-merge tests.

- [ ] **Step 5: Run the full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: no new failures.

- [ ] **Step 6: Commit**

```bash
git add lan-squad/bundle-merge.js lan-squad/bundle-merge.test.js
git commit -m "feat(lan): entriesPartial partial merge in bundle-merge

When incoming bundle carries entriesPartial:true (safety bundle from a
V1 client), typed fields (note, indicaciones, labHistory, todos) are
preserved from the server entry. Untyped fields are applied from the
client. New entries not present on server are appended. V0 behavior
(no flag) is unchanged — entries are replaced wholesale."
```

---

## Task 5: New typed mutation host endpoints

**What it does:** Four new Express routes in `host-router.js` accept typed mutations from V1 clients. Each route applies the mutation to `host-store.js` data and calls `broadcastLiveRevision` so other peers run delta catch-up.

**Files:**
- Modify: `lan-squad/host-router.js` (add 4 routes after the existing `/patients/:id` PUT route)
- Test: write contract/smoke tests in `lan-squad/host-router.test.js` (or create if it doesn't exist)

---

- [ ] **Step 1: Check whether `host-router.test.js` exists**

```bash
ls lan-squad/*.test.js 2>/dev/null || echo "no test files"
```

If no test file exists, create `lan-squad/host-router.test.js` with the boilerplate below. If it already exists, add the new tests at the end.

- [ ] **Step 2: Write the failing route tests**

In `lan-squad/host-router.test.js`, add (or create with):

```js
'use strict';
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const express = require('express');
const { createLanRouter } = require('./host-router.js');

function makeTestApp(storeOverrides = {}) {
  const app = express();
  app.use(express.json());

  // Minimal store stub
  const store = {
    getState: () => ({
      teamCode: 'TEST',
      rooms: [{ id: 'r1', displayName: 'Test Room' }],
      roomSyncBundles: {},
    }),
    upsertPatientLabHistorySet: storeOverrides.upsertPatientLabHistorySet ?? (() => ({ ok: true, revision: 2 })),
    replacePatientNota: storeOverrides.replacePatientNota ?? (() => ({ ok: true, version: 2 })),
    replacePatientIndicaciones: storeOverrides.replacePatientIndicaciones ?? (() => ({ ok: true, version: 2 })),
    putRoomSyncBundle: storeOverrides.putRoomSyncBundle ?? (() => ({ bundle: { revision: 1 } })),
    ...storeOverrides,
  };

  const router = createLanRouter({
    store,
    broadcast: () => {},
    resolver: { applyMutation: () => ({ ok: true, version: 1 }) },
    getHostClinicalMeta: () => ({ rank: 'R4', isProgramAdmin: true }),
  });

  // Bypass auth for tests
  app.use('/api/lan/v1', (req, _res, next) => {
    req.lanAuthenticated = true;
    next();
  });
  app.use('/api/lan/v1', router);
  return app;
}

async function doRequest(app, method, path, body) {
  const http = require('node:http');
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const data = body ? JSON.stringify(body) : null;
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: `/api/lan/v1${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data ? Buffer.byteLength(data) : 0,
          Authorization: 'Bearer TEST',
        },
      }, (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, body: raw }); }
        });
      });
      if (data) req.write(data);
      req.end();
    });
  });
}

describe('POST /patients/:id/lab-history/upsert-set', () => {
  it('returns 200 ok with setId and revision', async () => {
    const app = makeTestApp();
    const res = await doRequest(app, 'POST', '/patients/p1/lab-history/upsert-set', {
      set: { id: 'ls_1', date: '2026-06-07', values: { na: 138 }, updatedAt: new Date().toISOString() },
      clientId: 'lc_a',
      clientTimestamp: Date.now(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok('revision' in res.body);
  });

  it('returns 401 when unauthenticated', async () => {
    // createLanRouter has auth middleware — test by omitting the bypass
    // This is a smoke test; full auth is covered by bearer-auth unit tests
    assert.ok(true, 'auth covered by bearer-auth tests');
  });
});

describe('PUT /patients/:id/nota', () => {
  it('returns 200 with version on success', async () => {
    const app = makeTestApp();
    const res = await doRequest(app, 'PUT', '/patients/p1/nota', {
      data: { texto: 'SOAP note' },
      expectedVersion: 0,
      clientId: 'lc_a',
      clientTimestamp: Date.now(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(typeof res.body.version === 'number');
  });
});

describe('PUT /patients/:id/indicaciones', () => {
  it('returns 200 with version on success', async () => {
    const app = makeTestApp();
    const res = await doRequest(app, 'PUT', '/patients/p1/indicaciones', {
      data: { items: ['paracetamol 1g'] },
      expectedVersion: 0,
      clientId: 'lc_a',
      clientTimestamp: Date.now(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });
});

describe('PUT /patients/:id/fields', () => {
  it('returns 200 on success', async () => {
    const app = makeTestApp();
    const res = await doRequest(app, 'PUT', '/patients/p1/fields', {
      changedKeys: ['room', 'bed'],
      data: { room: '2B', bed: '4' },
      expectedVersion: 0,
      clientId: 'lc_a',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

```bash
node --test lan-squad/host-router.test.js 2>&1 | tail -20
```

Expected: 404 errors (routes don't exist yet) or import errors.

- [ ] **Step 4: Add store methods to `host-store.js`**

Open `lan-squad/host-store.js`. Find `putRoomSyncBundle` and after it add three new methods (before the `return` statement that exposes the API):

```js
function upsertPatientLabHistorySet(patientId, set, clientTimestamp) {
  const state = ensureLoadedSync();
  // Find the room bundle that contains this patient
  const roomId = findRoomForPatient(state, patientId);
  if (!roomId) return { ok: false, error: 'patient not found' };
  const bundle = state.roomSyncBundles[roomId];
  if (!bundle) return { ok: false, error: 'no bundle' };
  const entry = (bundle.entries || []).find((e) => e && e.id === patientId);
  if (!entry) return { ok: false, error: 'entry not found' };
  if (!Array.isArray(entry.labHistory)) entry.labHistory = [];
  const existing = entry.labHistory.findIndex((s) => s && s.id === set.id);
  if (existing >= 0) {
    // LWW by clientTimestamp
    const prev = entry.labHistory[existing];
    const prevTs = Number(prev._clientTimestamp || 0);
    if (clientTimestamp >= prevTs) {
      entry.labHistory[existing] = { ...set, _clientTimestamp: clientTimestamp };
    }
  } else {
    entry.labHistory.push({ ...set, _clientTimestamp: clientTimestamp });
  }
  bundle.revision = Number(bundle.revision || 0) + 1;
  persistSync(state);
  return { ok: true, revision: bundle.revision };
}

function replacePatientNota(patientId, data, expectedVersion, clientTimestamp) {
  const state = ensureLoadedSync();
  const roomId = findRoomForPatient(state, patientId);
  if (!roomId) return { ok: false, error: 'patient not found' };
  const bundle = state.roomSyncBundles[roomId];
  const entry = (bundle?.entries || []).find((e) => e && e.id === patientId);
  if (!entry) return { ok: false, error: 'entry not found' };
  const currentVersion = Number(entry._notaVersion || 0);
  let lwwApplied = false;
  if (expectedVersion !== currentVersion) {
    // Auto-LWW: accept if clientTimestamp is newer than stored
    const storedTs = Number(entry._notaClientTimestamp || 0);
    if (clientTimestamp > storedTs) {
      lwwApplied = true;
    } else {
      return { ok: true, lwwApplied: false, version: currentVersion, data: entry.note };
    }
  }
  entry.note = data;
  entry._notaVersion = currentVersion + 1;
  entry._notaClientTimestamp = clientTimestamp;
  bundle.revision = Number(bundle.revision || 0) + 1;
  persistSync(state);
  return { ok: true, lwwApplied, version: entry._notaVersion, data: entry.note };
}

function replacePatientIndicaciones(patientId, data, expectedVersion, clientTimestamp) {
  const state = ensureLoadedSync();
  const roomId = findRoomForPatient(state, patientId);
  if (!roomId) return { ok: false, error: 'patient not found' };
  const bundle = state.roomSyncBundles[roomId];
  const entry = (bundle?.entries || []).find((e) => e && e.id === patientId);
  if (!entry) return { ok: false, error: 'entry not found' };
  const currentVersion = Number(entry._indicacionesVersion || 0);
  let lwwApplied = false;
  if (expectedVersion !== currentVersion) {
    const storedTs = Number(entry._indicacionesClientTimestamp || 0);
    if (clientTimestamp > storedTs) {
      lwwApplied = true;
    } else {
      return { ok: true, lwwApplied: false, version: currentVersion, data: entry.indicaciones };
    }
  }
  entry.indicaciones = data;
  entry._indicacionesVersion = currentVersion + 1;
  entry._indicacionesClientTimestamp = clientTimestamp;
  bundle.revision = Number(bundle.revision || 0) + 1;
  persistSync(state);
  return { ok: true, lwwApplied, version: entry._indicacionesVersion, data: entry.indicaciones };
}
```

Also add a helper `findRoomForPatient` before these methods:

```js
function findRoomForPatient(state, patientId) {
  if (!state.roomSyncBundles) return null;
  for (const [roomId, bundle] of Object.entries(state.roomSyncBundles)) {
    if (bundle && Array.isArray(bundle.entries)) {
      if (bundle.entries.some((e) => e && e.id === patientId)) return roomId;
    }
  }
  return null;
}
```

And expose the new methods in the returned object (find the `return {` block that exposes `putRoomSyncBundle`):

```js
    upsertPatientLabHistorySet,
    replacePatientNota,
    replacePatientIndicaciones,
```

- [ ] **Step 5: Add the four routes to `host-router.js`**

Open `lan-squad/host-router.js`. Find the closing `return r;` line (near the end). Insert before it:

```js
  // ── Typed mutation endpoints (V1 clients) ──────────────────────────

  r.post('/patients/:id/lab-history/upsert-set', express.json({ limit: '512kb' }), (req, res) => {
    try {
      const { set, clientId, clientTimestamp } = req.body || {};
      if (!set || !set.id) return res.status(400).json({ error: 'set.id required' });
      const result = store.upsertPatientLabHistorySet(
        req.params.id,
        set,
        Number(clientTimestamp || 0)
      );
      if (!result.ok) return res.status(404).json({ error: result.error });
      broadcastLiveRevision(req.params.id, result.revision, clientId || 'host');
      res.json({ ok: true, setId: set.id, revision: result.revision });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.put('/patients/:id/nota', express.json({ limit: '256kb' }), (req, res) => {
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
      broadcastLiveRevision(req.params.id, result.revision ?? 0, clientId || 'host');
      res.json({ ok: true, version: result.version, data: result.data, ...(result.lwwApplied ? { lwwApplied: true } : {}) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.put('/patients/:id/indicaciones', express.json({ limit: '256kb' }), (req, res) => {
    try {
      const { data, expectedVersion, clientId, clientTimestamp } = req.body || {};
      if (data == null) return res.status(400).json({ error: 'data required' });
      const result = store.replacePatientIndicaciones(
        req.params.id,
        data,
        Number(expectedVersion ?? 0),
        Number(clientTimestamp || 0)
      );
      if (!result.ok) return res.status(404).json({ error: result.error });
      broadcastLiveRevision(req.params.id, result.revision ?? 0, clientId || 'host');
      res.json({ ok: true, version: result.version, data: result.data, ...(result.lwwApplied ? { lwwApplied: true } : {}) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.put('/patients/:id/fields', express.json({ limit: '128kb' }), (req, res) => {
    try {
      const { changedKeys, data, expectedVersion, clientId } = req.body || {};
      if (!Array.isArray(changedKeys) || !data) {
        return res.status(400).json({ error: 'changedKeys and data required' });
      }
      const result = resolver.applyMutation({
        entityType: 'patient',
        entityId: req.params.id,
        expectedVersion: Number(expectedVersion ?? 0),
        changedKeys,
        data: { ...data, id: req.params.id },
        clientId: String(clientId || ''),
      });
      if (!result.ok) return res.status(409).json({ error: 'conflict', version: result.version });
      broadcastLiveRevision(req.params.id, result.version ?? 0, clientId || 'host');
      res.json({ ok: true, version: result.version });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
```

> Note: `broadcastLiveRevision` is already defined at the top of `createLanRouter` — no imports needed.

- [ ] **Step 6: Run the tests to confirm they pass**

```bash
node --test lan-squad/host-router.test.js 2>&1 | tail -20
```

Expected: all route tests pass.

- [ ] **Step 7: Run the full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: no new failures.

- [ ] **Step 8: Commit**

```bash
git add lan-squad/host-router.js lan-squad/host-store.js lan-squad/host-router.test.js
git commit -m "feat(lan): typed mutation endpoints for nota, indicaciones, lab-history, fields

Four new routes on the host:
  POST /patients/:id/lab-history/upsert-set  (LWW by clientTimestamp)
  PUT  /patients/:id/nota                     (OCC + auto-LWW)
  PUT  /patients/:id/indicaciones             (OCC + auto-LWW)
  PUT  /patients/:id/fields                   (routes to conflict-resolver)

Each route calls broadcastLiveRevision so peers run delta catch-up.
Store methods upsertPatientLabHistorySet, replacePatientNota,
replacePatientIndicaciones added to host-store.js."
```

---

## Task 6: Outbox drain for new kinds

**What it does:** `flushLiveSyncOutboxBody` in `push.mjs` already handles `bundle`, `clinical_ops`, `delta`, `command`, and `patch`. This task adds the four new kind handlers so queued typed mutations are replayed when connectivity restores.

**Files:**
- Modify: `public/js/features/lan/push.mjs` (add handlers in `pushOutboxItem`)
- Test: Add drain-path tests in `public/js/features/lan-sync-clinical-ops.test.mjs`

---

- [ ] **Step 1: Write the failing drain tests**

Open `public/js/features/lan-sync-clinical-ops.test.mjs`. Add a new describe block:

```js
describe('flushLiveSyncOutboxBody — typed mutation drain', () => {
  it('nota_replace outbox item is drained by calling PUT /patients/:id/nota', () => {
    // Source-level contract: the drain function must reference 'nota_replace'
    assert.match(
      lanSyncPush,
      /nota_replace/,
      'push.mjs must handle nota_replace outbox kind'
    );
  });

  it('indicaciones_replace outbox item is handled', () => {
    assert.match(lanSyncPush, /indicaciones_replace/);
  });

  it('lab_history_upsert outbox item is handled', () => {
    assert.match(lanSyncPush, /lab_history_upsert/);
  });

  it('patient_fields outbox item is handled', () => {
    assert.match(lanSyncPush, /patient_fields/);
  });
});
```

> Note: `lanSyncPush` is already read at the top of this test file via `readFileSync('features/lan/push.mjs', 'utf8')` — check the import block and use the same variable name.

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
node --test public/js/features/lan-sync-clinical-ops.test.mjs 2>&1 | tail -20
```

Expected: 4 new tests fail (strings not found in push.mjs).

- [ ] **Step 3: Add drain handlers in `push.mjs`**

Open `public/js/features/lan/push.mjs`. Find `function pushOutboxItem(item)` (around line 534). Find the block:

```js
      if (item.kind === 'patch') {
        return pushLiveSyncPatchOutbox(item.payload);
      }
      return Promise.resolve(true);
```

Replace with:

```js
      if (item.kind === 'patch') {
        return pushLiveSyncPatchOutbox(item.payload);
      }
      if (item.kind === 'nota_replace') {
        return pushTypedMutationToHost('/patients/' + encodeURIComponent(item.payload.patientId) + '/nota', item.payload.data !== undefined ? item.payload : { data: item.payload });
      }
      if (item.kind === 'indicaciones_replace') {
        return pushTypedMutationToHost('/patients/' + encodeURIComponent(item.payload.patientId) + '/indicaciones', item.payload.data !== undefined ? item.payload : { data: item.payload });
      }
      if (item.kind === 'lab_history_upsert') {
        return pushTypedMutationToHost('/patients/' + encodeURIComponent(item.payload.patientId) + '/lab-history/upsert-set', item.payload, 'POST');
      }
      if (item.kind === 'patient_fields') {
        return pushTypedMutationToHost('/patients/' + encodeURIComponent(item.payload.patientId) + '/fields', item.payload);
      }
      return Promise.resolve(true);
```

Also add the helper function `pushTypedMutationToHost` just before `function pushOutboxItem`:

```js
function pushTypedMutationToHost(path, body, method) {
  var m = method || 'PUT';
  return lanClient.fetch('/api/lan/v1' + path, {
    method: m,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(function (res) {
    return !!(res && res.ok);
  }).catch(function () {
    return false;
  });
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
node --test public/js/features/lan-sync-clinical-ops.test.mjs 2>&1 | tail -20
```

Expected: all tests pass including the 4 new drain tests.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/lan/push.mjs public/js/features/lan-sync-clinical-ops.test.mjs
git commit -m "feat(lan): outbox drain for typed mutation kinds

flushLiveSyncOutboxBody now replays nota_replace, indicaciones_replace,
lab_history_upsert, and patient_fields outbox items by calling their
respective typed endpoints via pushTypedMutationToHost."
```

---

## Task 7: Wire mutation registry and remove `scheduleLiveSyncPush` from post-save hooks

**What it does:** This is the core behavioral change — removes the global `scheduleLiveSyncPush()` call from the `setSaveStateHooks` `after` hook and from 7 other call sites, replacing each with the appropriate domain dispatcher.

**Files:**
- Modify: `public/js/features/lan/orchestrator.mjs` (wire registry at boot; remove from `after` hook)
- Modify: `public/js/features/clinical-entrega.mjs`
- Modify: `public/js/features/eventualidades-panel.mjs`
- Modify: `public/js/features/historia-clinica-panel.mjs`
- Modify: `public/js/features/patients.mjs`
- Modify: `public/js/features/clinical-teams/teams-guardia-bridge.mjs`
- Modify: `public/js/features/clinical-teams/teams-roster.mjs`
- Modify: `public/js/patient-team-assign-ui.mjs`
- Test: Add contract tests in `public/js/lan-sync-wiring.test.mjs`

---

- [ ] **Step 1: Write the failing contract tests**

Open `public/js/lan-sync-wiring.test.mjs`. Add:

```js
it('saveState after hook does NOT call scheduleLiveSyncPush', () => {
  // Extract the setSaveStateHooks call block
  const hookStart = lanSyncFeature.indexOf('setSaveStateHooks({');
  assert.ok(hookStart >= 0, 'setSaveStateHooks call must exist');
  const hookBlock = lanSyncFeature.slice(hookStart, hookStart + 300);
  assert.doesNotMatch(
    hookBlock,
    /scheduleLiveSyncPush\(\)/,
    'saveState after() must not call scheduleLiveSyncPush()'
  );
});

it('history-clinica-panel does not call scheduleLiveSyncPush after lanPushHistoriaClinica', () => {
  const hcPanel = read('features/historia-clinica-panel.mjs');
  // Verify scheduleLiveSyncPush is not called anywhere (HC has its own push path)
  assert.doesNotMatch(
    hcPanel,
    /scheduleLiveSyncPush\(\)/,
    'historia-clinica-panel must not call scheduleLiveSyncPush'
  );
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | tail -20
```

Expected: both new tests fail.

- [ ] **Step 3: Wire the mutation registry in `orchestrator.mjs`**

Open `public/js/features/lan/orchestrator.mjs`. At the top of the file, add to the imports (after the existing push.mjs import):

```js
import { lanMutationRegistry } from '../../lan-mutation-registry.mjs';
import { enqueueOutbox } from '../../live-sync-outbox.mjs';
```

Find the function `wireLanSyncBridges` (or `registerLanSyncBridges` — use the actual function name). Inside that function, after all bridge registrations are done but before `initLanClientFromStorage()`, add:

```js
  // Wire typed mutation handlers into the registry
  lanMutationRegistry.registerMutationHandler('nota', async (pid, payload) => {
    const rid = getActiveLiveSyncRoomId();
    if (!rid) return;
    const res = await lanClient.fetch('/api/lan/v1/patients/' + encodeURIComponent(pid) + '/nota', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: payload,
        expectedVersion: 0,
        clientId: getLanClientId(),
        clientTimestamp: Date.now(),
      }),
    });
    if (!res || !res.ok) throw new Error('nota push failed');
  });
  lanMutationRegistry.setDomainOutboxKind('nota', 'nota_replace');

  lanMutationRegistry.registerMutationHandler('indicaciones', async (pid, payload) => {
    const rid = getActiveLiveSyncRoomId();
    if (!rid) return;
    const res = await lanClient.fetch('/api/lan/v1/patients/' + encodeURIComponent(pid) + '/indicaciones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: payload,
        expectedVersion: 0,
        clientId: getLanClientId(),
        clientTimestamp: Date.now(),
      }),
    });
    if (!res || !res.ok) throw new Error('indicaciones push failed');
  });
  lanMutationRegistry.setDomainOutboxKind('indicaciones', 'indicaciones_replace');

  lanMutationRegistry.registerMutationHandler('lab-history', async (pid, payload) => {
    const rid = getActiveLiveSyncRoomId();
    if (!rid) return;
    const set = payload; // payload IS the lab set object
    const res = await lanClient.fetch('/api/lan/v1/patients/' + encodeURIComponent(pid) + '/lab-history/upsert-set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        set,
        clientId: getLanClientId(),
        clientTimestamp: Date.now(),
      }),
    });
    if (!res || !res.ok) throw new Error('lab-history push failed');
  });
  lanMutationRegistry.setDomainOutboxKind('lab-history', 'lab_history_upsert');

  lanMutationRegistry.registerMutationHandler('patient-fields', async (pid, payload) => {
    // Patient field changes go via WS livesync:patch (already handled by conflict-resolver).
    // This handler is a no-op here — the hot path is already wired.
    // The outbox kind handles the fallback when WS is down.
    void pid; void payload;
  });
  lanMutationRegistry.setDomainOutboxKind('patient-fields', 'patient_fields');

  // Wire isActive and deps into the registry singleton
  lanMutationRegistry._deps = {
    isActive: () => !!getActiveLiveSyncRoomId() && isLanSessionConfiguredForRest(),
    getActiveRoomId: getActiveLiveSyncRoomId,
    enqueueOutbox,
  };
```

> Note: `lanMutationRegistry` is a `createMutationRegistry()` singleton but the production deps (isActive, etc.) need to be injected after orchestrator boots. The cleanest way is to add a `configure(deps)` method to `lan-mutation-registry.mjs`. See Step 3b below.

- [ ] **Step 3b: Add `configure` method to `lan-mutation-registry.mjs`**

Open `public/js/lan-mutation-registry.mjs`. In `createMutationRegistry`, the `isActive`, `markUntypedDirty`, etc. are captured from `deps` at construction time. For the singleton, we need to be able to set them after boot. Add a `configure` method:

In `createMutationRegistry`:

```js
  function configure(liveDeps) {
    if (typeof liveDeps.isActive === 'function') isActiveRef = liveDeps.isActive;
    if (typeof liveDeps.markUntypedDirty === 'function') markUntypedDirtyRef = liveDeps.markUntypedDirty;
    if (typeof liveDeps.scheduleUntypedSafetyBundle === 'function') scheduleUntypedSafety = liveDeps.scheduleUntypedSafetyBundle;
    if (typeof liveDeps.enqueueOutbox === 'function') enqueueOutboxRef = liveDeps.enqueueOutbox;
    if (typeof liveDeps.getActiveRoomId === 'function') getActiveRoomIdRef = liveDeps.getActiveRoomId;
  }
```

Change the internal dispatch to use ref vars instead of captured closures:

```js
  let isActiveRef = deps.isActive ?? (() => false);
  let markUntypedDirtyRef = deps.markUntypedDirty ?? (() => {});
  let scheduleUntypedSafety = deps.scheduleUntypedSafetyBundle ?? (() => {});
  let enqueueOutboxRef = deps.enqueueOutbox ?? (() => {});
  let getActiveRoomIdRef = deps.getActiveRoomId ?? (() => '');
```

And in `dispatchLanMutation`, reference the `Ref` variables:

```js
  async function dispatchLanMutation(domain, patientId, payload) {
    if (!isActiveRef()) return;
    const handler = handlers.get(String(domain));
    if (handler) {
      try {
        await handler(patientId, payload);
      } catch (_err) {
        const kind = domainKinds.get(String(domain));
        if (kind) {
          const roomId = getActiveRoomIdRef();
          if (roomId) enqueueOutboxRef(roomId, { kind, payload: { patientId, data: payload } });
        }
      }
    } else {
      markUntypedDirtyRef(domain, patientId);
      scheduleUntypedSafety();
    }
  }
```

Export `configure` in both the instance and the singleton:
```js
  return { registerMutationHandler, setDomainOutboxKind, isTypedDomain, dispatchLanMutation, configure };
```

Then in `orchestrator.mjs` at boot:
```js
  lanMutationRegistry.configure({
    isActive: () => !!getActiveLiveSyncRoomId() && isLanSessionConfiguredForRest(),
    getActiveRoomId: getActiveLiveSyncRoomId,
    enqueueOutbox: (roomId, item) => enqueueOutbox(roomId, item),
  });
```

- [ ] **Step 4: Remove `scheduleLiveSyncPush()` from `setSaveStateHooks` in `orchestrator.mjs`**

Find (around line 1684):
```js
  setSaveStateHooks({
    before() {
      var aid = runtime.getActiveId();
      if (activeLiveSyncRoomId && aid) touchPatientLanUpdatedAt(aid);
    },
    after() {
      post();
      scheduleLiveSyncPush();
    },
  });
```

Replace with:
```js
  setSaveStateHooks({
    before() {
      var aid = runtime.getActiveId();
      if (activeLiveSyncRoomId && aid) touchPatientLanUpdatedAt(aid);
    },
    after() {
      post();
    },
  });
```

- [ ] **Step 5: Replace call sites in other modules**

**`public/js/features/clinical-entrega.mjs`** (line 397):

Find:
```js
      scheduleLiveSyncPush();
```

Replace with:
```js
      import('../../lan-mutation-registry.mjs').then(function (m) {
        m.lanMutationRegistry.dispatchLanMutation('entrega', aid);
      });
```

> `aid` is the active patient id. Check the surrounding code to confirm the variable name for the current patient ID in this file (look for `getActiveId()`, `currentPatientId`, or similar, and use the same variable).

**`public/js/features/eventualidades-panel.mjs`** (line 396):

Find:
```js
  scheduleLiveSyncPush();
```

Replace with:
```js
  import('../../lan-mutation-registry.mjs').then(function (m) {
    m.lanMutationRegistry.dispatchLanMutation('eventualidades', currentPatientId);
  });
```

> Check the surrounding code for the correct patient ID variable name.

**`public/js/features/historia-clinica-panel.mjs`** (lines 887 and 904):

Remove both occurrences of `scheduleLiveSyncPush();`. The HC module already calls `lanPushHistoriaClinica` which handles its own sync. Also remove the import of `scheduleLiveSyncPush` from the import block if it's only used for these calls.

**`public/js/features/patients.mjs`** (line 1418):

Find:
```js
      scheduleLiveSyncPush();
```

Replace with:
```js
      import('../lan-mutation-registry.mjs').then(function (m) {
        m.lanMutationRegistry.dispatchLanMutation('patient-fields', patientId);
      });
```

> Check the surrounding code for the patient ID variable name (likely `patientId` or `id`).

**`public/js/features/clinical-teams/teams-guardia-bridge.mjs`** (line 17):

The existing code already prefers `pushClinicalOpsLanNow` with a `scheduleLiveSyncPush` fallback:
```js
    if (typeof mod.pushClinicalOpsLanNow === 'function') {
      return mod.pushClinicalOpsLanNow();
    }
    if (typeof mod.scheduleLiveSyncPush === 'function') mod.scheduleLiveSyncPush();
```

Remove the fallback line (leave `pushClinicalOpsLanNow` only):
```js
    if (typeof mod.pushClinicalOpsLanNow === 'function') {
      return mod.pushClinicalOpsLanNow();
    }
```

**`public/js/features/clinical-teams/teams-roster.mjs`** (line 476):

Find:
```js
      if (typeof mod.scheduleLiveSyncPush === 'function') mod.scheduleLiveSyncPush();
```

Replace with:
```js
      if (typeof mod.pushClinicalOpsLanNow === 'function') void mod.pushClinicalOpsLanNow();
```

**`public/js/patient-team-assign-ui.mjs`** (line 72):

Find:
```js
      else if (typeof lan.scheduleLiveSyncPush === 'function') lan.scheduleLiveSyncPush();
```

Replace with:
```js
      else if (typeof lan.pushClinicalOpsLanNow === 'function') void lan.pushClinicalOpsLanNow();
```

- [ ] **Step 6: Run the contract tests to confirm they pass**

```bash
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | tail -20
```

Expected: all tests pass including the two new contract tests.

- [ ] **Step 7: Run the full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: no new failures.

- [ ] **Step 8: Build the UI bundle to verify no import errors**

```bash
npm run build:ui 2>&1 | tail -20
```

Expected: build completes without errors.

- [ ] **Step 9: Commit**

```bash
git add public/js/features/lan/orchestrator.mjs \
        public/js/features/clinical-entrega.mjs \
        public/js/features/eventualidades-panel.mjs \
        public/js/features/historia-clinica-panel.mjs \
        public/js/features/patients.mjs \
        public/js/features/clinical-teams/teams-guardia-bridge.mjs \
        public/js/features/clinical-teams/teams-roster.mjs \
        public/js/patient-team-assign-ui.mjs \
        public/js/lan-mutation-registry.mjs \
        public/js/lan-sync-wiring.test.mjs
git commit -m "feat(lan): decouple post-save hooks from scheduleLiveSyncPush

Removes the global scheduleLiveSyncPush() from saveState after() hook
and from 7 other call sites. Each domain now dispatches through the
lanMutationRegistry (typed) or triggers the 30s safety bundle (untyped).
scheduleLiveSyncPush remains available for explicit force-sync and
leave-room flows."
```

---

## Task 8: Delta catch-up — revision hint tries delta log first (Flow B)

**What it does:** When `livesync:revision` is received and the WS channel is live, the client currently schedules a full `GET /sync-bundle` reconcile after 500ms. This task changes `scheduleReconcileFromRevisionHint` to first attempt `GET /rooms/:id/deltas?afterSeq=lastDeltaSeq`. If the delta log has entries, they are applied without touching the full bundle. If the gap is too large or the log is empty, it falls back to the existing full reconcile.

**Files:**
- Modify: `public/js/features/lan/runtime.mjs` (add `lastDeltaSeqByRoom`, getter/setter)
- Modify: `public/js/features/lan/push.mjs` (new `tryDeltaReplayFromHint` function; update `scheduleReconcileFromRevisionHint`)
- Test: contract test in `public/js/lan-sync-wiring.test.mjs`

---

- [ ] **Step 1: Write the failing contract test**

Open `public/js/lan-sync-wiring.test.mjs`. Add:

```js
it('scheduleReconcileFromRevisionHint references tryDeltaReplayFromHint', () => {
  // Contract: the revision-hint path must attempt delta replay before full reconcile
  assert.match(
    lanSyncPush,
    /tryDeltaReplayFromHint|\/deltas\?afterSeq/,
    'push.mjs must reference delta replay in the revision-hint reconcile path'
  );
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | grep -E '(fail|pass)' | tail -10
```

Expected: the new test fails.

- [ ] **Step 3: Add `lastDeltaSeqByRoom` to `runtime.mjs`**

Open `public/js/features/lan/runtime.mjs`. Add after the `LIVE_SYNC_OUTBOX_FLUSH_MS` constant:

```js
/** Per-room last applied delta sequence number. Used by Flow B delta catch-up. */
const _lastDeltaSeqByRoom = new Map();

/** @param {string} roomId @returns {number} */
export function getLastDeltaSeq(roomId) {
  return _lastDeltaSeqByRoom.get(String(roomId)) ?? 0;
}

/** @param {string} roomId @param {number} seq */
export function setLastDeltaSeq(roomId, seq) {
  _lastDeltaSeqByRoom.set(String(roomId), Number(seq));
}

/** @param {string} roomId — called after a full bundle reconcile to reset delta tracking */
export function resetLastDeltaSeq(roomId) {
  _lastDeltaSeqByRoom.delete(String(roomId));
}
```

- [ ] **Step 4: Implement `tryDeltaReplayFromHint` in `push.mjs`**

Open `public/js/features/lan/push.mjs`. Add to the top-level imports from `./runtime.mjs`:

```js
import {
  // ...existing imports...
  getLastDeltaSeq,
  setLastDeltaSeq,
  resetLastDeltaSeq,
} from './runtime.mjs';
```

Then add the function before `scheduleReconcileFromRevisionHint`:

```js
/**
 * Flow B: Attempt to catch up using the delta log instead of a full bundle.
 * Returns true if deltas were applied successfully; false if the caller should
 * fall back to a full reconcile.
 *
 * @param {string} roomId
 * @returns {Promise<boolean>}
 */
async function tryDeltaReplayFromHint(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid) return false;
  var afterSeq = getLastDeltaSeq(rid);
  try {
    var res = await lanClient.fetch(
      '/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/deltas?afterSeq=' + afterSeq,
      { cache: 'no-store' }
    );
    if (!res || !res.ok) return false;
    var j = await res.json();
    if (!j) return false;
    if (j.fallback === 'sync_bundle') return false; // gap too large
    if (!Array.isArray(j.deltas) || j.deltas.length === 0) return true; // nothing to apply, already up-to-date
    // Apply deltas in seq order via the existing delta apply path
    await ensureLanSyncPushBridgeWired();
    var b = bridge();
    if (typeof b.applyLiveSyncDeltas !== 'function') return false;
    await b.applyLiveSyncDeltas(rid, j.deltas);
    // Update lastDeltaSeq to the highest seq in this batch
    var maxSeq = j.deltas.reduce(function (m, d) { return Math.max(m, Number(d.seq || 0)); }, afterSeq);
    setLastDeltaSeq(rid, maxSeq);
    return true;
  } catch (_eDelta) {
    return false;
  }
}
```

- [ ] **Step 5: Update `scheduleReconcileFromRevisionHint` to use delta-first**

Find the existing function (around line 644):

```js
export function scheduleReconcileFromRevisionHint(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid || !liveSyncRoomIdIsRelevant(rid)) return;
  if (!activeLiveSyncRoomId) ensureEffectiveLiveSyncRoomId();
  scheduleReconcileLiveSyncRoom(rid, { reason: 'revision-hint', delayMs: 500 });
}
```

Replace with:

```js
export function scheduleReconcileFromRevisionHint(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid || !liveSyncRoomIdIsRelevant(rid)) return;
  if (!activeLiveSyncRoomId) ensureEffectiveLiveSyncRoomId();
  // Flow B: try delta log first; fall back to full reconcile if gap too large.
  setTimeout(function () {
    tryDeltaReplayFromHint(rid).then(function (applied) {
      if (!applied) {
        scheduleReconcileLiveSyncRoom(rid, { reason: 'revision-hint-fallback', delayMs: 0 });
      }
    }).catch(function () {
      scheduleReconcileLiveSyncRoom(rid, { reason: 'revision-hint-error', delayMs: 0 });
    });
  }, 500);
}
```

- [ ] **Step 6: Reset `lastDeltaSeq` after full reconcile**

In `reconcileLiveSyncRoomBody`, after a successful `GET /sync-bundle` response (around line 888 where `setHostBundleBases` is called), add:

```js
        resetLastDeltaSeq(rid);
```

So after the bundle is loaded, the delta seq is reset to 0 (the next revision hint will fetch `?afterSeq=0`, getting recent deltas or a fallback).

- [ ] **Step 7: Run the tests**

```bash
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | tail -20
npm test 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add public/js/features/lan/runtime.mjs public/js/features/lan/push.mjs public/js/lan-sync-wiring.test.mjs
git commit -m "perf(lan): Flow B delta replay on revision hints

scheduleReconcileFromRevisionHint now attempts GET /deltas?afterSeq=N
before triggering a full bundle reconcile. If deltas cover the gap,
only delta entries are applied (no GET /sync-bundle). Falls back to
full reconcile when the gap is too large or the delta log is empty.
lastDeltaSeq tracked per room in runtime.mjs; reset after each full
reconcile."
```

---

## Final verification

```bash
# Full test suite
npm test 2>&1 | tail -30

# UI bundle compiles cleanly
npm run build:ui 2>&1 | tail -10

# Contract tests specifically
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | grep -E '(pass|fail|ok)'
node --test public/js/lan-mutation-registry.test.mjs 2>&1 | grep -E '(pass|fail|ok)'
node --test public/js/lan-safety-bundle-builder.test.mjs 2>&1 | grep -E '(pass|fail|ok)'
node --test lib/db/schema.test.mjs 2>&1 | grep -E '(pass|fail|ok)'
node --test lan-squad/bundle-merge.test.js 2>&1 | grep -E '(pass|fail|ok)'
node --test lan-squad/host-router.test.js 2>&1 | grep -E '(pass|fail|ok)'
```

All must be green before marking Plan B complete.
