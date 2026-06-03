# LAN Full LWW — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace blocking LAN conflict modals and 409 overlap responses with server-side Last-Write-Wins on all entity paths, plus an optional debounced info toast.

**Architecture:** Shared `pickLwwByUpdatedAt` in `lan-squad/lww-utils.js` drives overlap resolution in `conflict-resolver.js` and `bundle-merge.js`. Host always returns success with `lwwApplied` / `lwwAppliedKeys` metadata. Renderer applies server bodies, syncs host caches, and shows toast only when `storage.getLanLwwOverwriteToast()` is true.

**Tech Stack:** Node `node:test`, Express 5, `ws`, vanilla ES modules (renderer), `localStorage` prefs via `storage.js`.

**Spec:** [`docs/superpowers/specs/2026-06-03-lan-conflict-lww-design.md`](../specs/2026-06-03-lan-conflict-lww-design.md)

---

## File map

| File | Action |
|------|--------|
| `lan-squad/lww-utils.js` | **Create** — timestamp compare + merge helpers |
| `lan-squad/lww-utils.test.js` | **Create** |
| `lan-squad/conflict-resolver.js` | **Modify** — LWW on overlap; LWW when missing baseData |
| `lan-squad/conflict-resolver.test.js` | **Modify** — overlap → success |
| `lan-squad/bundle-merge.js` | **Modify** — merge on version skew via LWW |
| `lan-squad/bundle-merge.test.js` | **Modify** |
| `lan-squad/host-router.js` | **Modify** — clinical-ops / sync-bundle 409 → 200 LWW |
| `lan-squad/host-router.test.js` | **Modify** |
| `lan-squad/ws-hub.js` | **Modify** — broadcast applied on LWW |
| `lan-squad/ws-hub.test.js` | **Modify** |
| `public/js/lan-lww-toast.mjs` | **Create** — debounced toast helper |
| `public/js/lan-lww-toast.test.mjs` | **Create** |
| `public/js/storage.js` | **Modify** — `get/setLanLwwOverwriteToast` |
| `public/js/features/lan-sync.mjs` | **Modify** — remove modal hot path; apply LWW responses |
| `public/js/lan-sync-push.mjs` | **Modify** — no drafts on bundle 409 |
| `public/js/lan-sync-panel.mjs` | **Modify** — settings checkbox + hide legacy drafts card |
| `public/partials/` or `public/index.html` | **Modify** — checkbox in ⇄ / LAN settings if needed |
| `public/js/features/lan-sync-clinical-ops.test.mjs` | **Modify** — expectations |
| `public/js/lan-conflict-draft-resolution.test.mjs` | **Modify** or trim obsolete cases |
| `package.json` | **Modify** — register new tests in `scripts.test` |

---

### Task 1: LWW utilities (host)

**Files:**
- Create: `lan-squad/lww-utils.js`
- Create: `lan-squad/lww-utils.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compareUpdatedAt, pickLwwRecord, mergeRecordsLww } = require('./lww-utils.js');

test('compareUpdatedAt prefers newer ISO', () => {
  assert.equal(compareUpdatedAt('2026-06-03T10:00:00.000Z', '2026-06-03T11:00:00.000Z'), -1);
  assert.equal(compareUpdatedAt('2026-06-03T12:00:00.000Z', '2026-06-03T11:00:00.000Z'), 1);
  assert.equal(compareUpdatedAt(null, '2026-06-03T11:00:00.000Z'), -1);
});

test('pickLwwRecord incoming wins on tie', () => {
  const a = { id: 't1', text: 'A', updatedAt: '2026-06-03T10:00:00.000Z' };
  const b = { id: 't1', text: 'B', updatedAt: '2026-06-03T10:00:00.000Z' };
  assert.equal(pickLwwRecord(a, b, 'incoming').text, 'B');
});

test('mergeRecordsLww merges object keys with per-field LWW for overlap', () => {
  const server = { cuarto: '201', cama: 'A', lanUpdatedAt: '2026-06-03T09:00:00.000Z' };
  const incoming = { cuarto: '102', lanUpdatedAt: '2026-06-03T10:00:00.000Z' };
  const { merged, overwrittenKeys } = mergeRecordsLww(server, incoming, {
    changedKeys: ['cuarto'],
    timestampFields: ['lanUpdatedAt', 'updatedAt'],
  });
  assert.equal(merged.cuarto, '102');
  assert.deepEqual(overwrittenKeys, ['cuarto']);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test lan-squad/lww-utils.test.js
```

Expected: FAIL — cannot find module or exports undefined.

- [ ] **Step 3: Implement minimal module**

```javascript
'use strict';

function tsValue(iso) {
  if (!iso || typeof iso !== 'string') return 0;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}

/** @returns {-1|0|1} negative if a older than b */
function compareUpdatedAt(aIso, bIso) {
  const a = tsValue(aIso);
  const b = tsValue(bIso);
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function recordTimestamp(rec, fields) {
  const list = Array.isArray(fields) ? fields : ['updatedAt', 'lanUpdatedAt'];
  for (const f of list) {
    if (rec && rec[f]) return rec[f];
  }
  return null;
}

/** @param {'server'|'incoming'} preferOnTie */
function pickLwwRecord(serverRec, incomingRec, preferOnTie, timestampFields) {
  const sTs = recordTimestamp(serverRec, timestampFields);
  const iTs = recordTimestamp(incomingRec, timestampFields);
  const cmp = compareUpdatedAt(sTs, iTs);
  if (cmp < 0) return { winner: incomingRec, overwritten: true };
  if (cmp > 0) return { winner: serverRec, overwritten: false };
  if (preferOnTie === 'incoming') return { winner: incomingRec, overwritten: serverRec !== incomingRec };
  return { winner: serverRec, overwritten: false };
}

function mergeRecordsLww(serverData, incomingPatch, opts) {
  const changedKeys = Array.isArray(opts?.changedKeys) ? opts.changedKeys : Object.keys(incomingPatch || {});
  const timestampFields = opts?.timestampFields || ['lanUpdatedAt', 'updatedAt'];
  const merged = { ...(serverData || {}) };
  const overwrittenKeys = [];
  const whole = pickLwwRecord(serverData, { ...serverData, ...incomingPatch }, 'incoming', timestampFields);
  if (whole.overwritten && changedKeys.length === 0) {
    return { merged: { ...whole.winner, ...incomingPatch }, overwrittenKeys: Object.keys(incomingPatch || {}) };
  }
  for (const key of changedKeys) {
    if (!(key in (incomingPatch || {}))) continue;
    const sSlice = { [key]: serverData?.[key], ...recordTimestamp(serverData, timestampFields) && { updatedAt: recordTimestamp(serverData, timestampFields) } };
    const iSlice = { [key]: incomingPatch[key], updatedAt: incomingPatch.updatedAt || recordTimestamp(incomingPatch, timestampFields) };
    const pick = pickLwwRecord(
      { value: serverData?.[key], updatedAt: recordTimestamp(serverData, timestampFields) },
      { value: incomingPatch[key], updatedAt: incomingPatch.updatedAt || recordTimestamp(incomingPatch, timestampFields) },
      'incoming',
      ['updatedAt']
    );
    if (pick.overwritten || incomingPatch[key] !== serverData?.[key]) {
      merged[key] = incomingPatch[key];
      if (serverData?.[key] !== incomingPatch[key]) overwrittenKeys.push(key);
    }
  }
  if (incomingPatch?.lanUpdatedAt) merged.lanUpdatedAt = incomingPatch.lanUpdatedAt;
  if (incomingPatch?.updatedAt) merged.updatedAt = incomingPatch.updatedAt;
  return { merged, overwrittenKeys };
}

module.exports = { compareUpdatedAt, pickLwwRecord, mergeRecordsLww, recordTimestamp };
```

Refine `mergeRecordsLww` during implementation so patient overlap test passes (cuarto field wins by newer `lanUpdatedAt` on incoming).

- [ ] **Step 4: Run tests**

```bash
node --test lan-squad/lww-utils.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lan-squad/lww-utils.js lan-squad/lww-utils.test.js
git commit -m "feat(lan): add LWW timestamp helpers for host merge"
```

---

### Task 2: ConflictResolver — LWW on overlap

**Files:**
- Modify: `lan-squad/conflict-resolver.js`
- Modify: `lan-squad/conflict-resolver.test.js`

- [ ] **Step 1: Replace failing overlap test**

In `lan-squad/conflict-resolver.test.js`, replace `structural conflict when keys overlap` with:

```javascript
test('overlap keys resolve with LWW (incoming newer wins)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-lww-'));
  const filePath = path.join(dir, 's.json');
  const store = createHostStore({ filePath, teamCodePlain: 'tok' });
  store.upsertPatient({ id: 'p1', nombre: 'Ana', cuarto: '101', lanUpdatedAt: '2026-06-03T09:00:00.000Z' }, null);
  const resolver = createConflictResolver({ store });
  store.upsertPatient({
    id: 'p1',
    nombre: 'Ana',
    cuarto: '201',
    lanUpdatedAt: '2026-06-03T09:30:00.000Z',
  }, 1);
  const out = resolver.applyMutation({
    entityType: 'patient',
    entityId: 'p1',
    expectedVersion: 1,
    baseData: { id: 'p1', nombre: 'Ana', cuarto: '101', lanUpdatedAt: '2026-06-03T09:00:00.000Z' },
    changedKeys: ['cuarto'],
    data: {
      id: 'p1',
      nombre: 'Ana',
      cuarto: '102',
      lanUpdatedAt: '2026-06-03T10:00:00.000Z',
    },
  });
  assert.strictEqual(out.lwwApplied, true);
  assert.strictEqual(out.data.cuarto, '102');
  assert.ok(out.overwrittenKeys.includes('cuarto'));
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node --test lan-squad/conflict-resolver.test.js
```

- [ ] **Step 3: Implement LWW branch in resolver**

At top of `conflict-resolver.js`:

```javascript
const { mergeRecordsLww } = require('./lww-utils.js');
```

Replace the `throw new ConflictError` block at lines 122–128 with:

```javascript
    const incomingData =
      mutation.op === 'delete'
        ? { ...(server.data || {}), _deleted: true, updatedAt: data.updatedAt || data.lanUpdatedAt }
        : { ...(server.data || {}), ...data };
    const { merged, overwrittenKeys } = mergeRecordsLww(server.data, incomingData, {
      changedKeys: overlap,
      timestampFields: ['lanUpdatedAt', 'updatedAt'],
    });
    const version = server.version + 1;
    store.setEntity(
      {
        roomId,
        entityType,
        entityId,
        patientId,
        version,
        data: merged,
        deleted: mutation.op === 'delete',
      },
      setOpts
    );
    if (roomId) store.materializeRoomViews(roomId, setOpts);
    return {
      ok: true,
      entityType,
      entityId,
      version,
      data: merged,
      autoMerged: false,
      lwwApplied: true,
      overwrittenKeys,
    };
```

For `!baseData || !changedKeys.length` (lines 82–98): apply **incoming wins** merge into server (increment version) instead of `ConflictError`, return `{ lwwApplied: true, overwrittenKeys: ['*'] }` except keep `ConflictError` only when `expectedVersion > 0` and entity missing (true orphan).

- [ ] **Step 4: Run resolver tests**

```bash
node --test lan-squad/conflict-resolver.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lan-squad/conflict-resolver.js lan-squad/conflict-resolver.test.js
git commit -m "feat(lan): LWW overlap in ConflictResolver"
```

---

### Task 3: Bundle merge — LWW on version skew

**Files:**
- Modify: `lan-squad/bundle-merge.js`
- Modify: `lan-squad/bundle-merge.test.js`

- [ ] **Step 1: Change stale entity version test to expect success**

```javascript
  it('stale entity version applies LWW instead of conflict', () => {
    let bundle = emptyBundle(now());
    bundle.revision = 1;
    bundle.entityVersions = { 'a:e1': 2 };
    bundle.agenda = [{ id: 'e1', procedure: 'Server', updatedAt: '2026-06-03T09:00:00.000Z' }];
    const r = mergeBundlePut(
      bundle,
      {
        baseRevision: 1,
        baseEntityVersions: { 'a:e1': 1 },
        agenda: [{ id: 'e1', procedure: 'Incoming', updatedAt: '2026-06-03T10:00:00.000Z' }],
      },
      { nowIso: now }
    );
    assert.equal(r.ok, true);
    assert.equal(r.bundle.agenda[0].procedure, 'Incoming');
    assert.ok(Array.isArray(r.lwwAppliedKeys));
    assert.ok(r.lwwAppliedKeys.includes('a:e1'));
  });
```

Add test for `baseRevision !== serverRevision` still merges incoming agenda key.

- [ ] **Step 2: Run — expect FAIL**

```bash
node --test lan-squad/bundle-merge.test.js
```

- [ ] **Step 3: Implement**

When `conflicts.length > 0` or revision mismatch:

1. Do **not** return `ok: false`.
2. For each conflicting key, run `pickLwwRecord` on extracted local/server payloads (agenda/todo items have `updatedAt`).
3. Proceed with existing merge loops (agenda map, todo map, etc.).
4. Set `lwwAppliedKeys` array on success result.
5. If `baseRevision !== serverRevision` but payload keys present, skip early return at lines 74–88; log keys in `lwwAppliedKeys` as `'*'` or per-key.

- [ ] **Step 4: Run bundle tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add lan-squad/bundle-merge.js lan-squad/bundle-merge.test.js
git commit -m "feat(lan): bundle merge uses LWW on version skew"
```

---

### Task 4: HTTP + WS host surfaces

**Files:**
- Modify: `lan-squad/host-router.js`
- Modify: `lan-squad/host-router.test.js`
- Modify: `lan-squad/ws-hub.js`
- Modify: `lan-squad/ws-hub.test.js`

- [ ] **Step 1: Update `PUT /patients/:id` overlap test** (`host-router.test.js` ~474)

Expect `status 200`, body `{ lwwApplied: true, data: { cuarto: '102' } }`.

- [ ] **Step 2: Run — FAIL**

```bash
node --test lan-squad/host-router.test.js
```

- [ ] **Step 3: host-router**

Remove or narrow `catch (e) { if (e.code === 'CONFLICT') return res.status(409)` for overlap paths. Resolver should not throw on overlap anymore; keep 409 only for routes still using old merge until Task 3 completes clinical-ops/sync-bundle handlers.

For `PUT /rooms/:id/sync-bundle` and `PUT clinical-ops`: when merge returns `ok: true` with `lwwAppliedKeys`, respond **200** with `{ bundle, lwwAppliedKeys }`.

- [ ] **Step 4: ws-hub**

On successful `applyMutation`, always broadcast `livesync:applied` including `lwwApplied` / `overwrittenKeys` in payload. Remove unicast `livesync:conflict` branch for overlap (grep `livesync:conflict` in `ws-hub.js`).

- [ ] **Step 5: Replace WS test** `livesync:patch overlap unicasts conflict` with:

```javascript
test('livesync:patch overlap broadcasts applied with lwwApplied', async () => {
  // ... same setup ...
  const appliedPromise = waitForMessage(wsA, (m) => m.type === 'livesync:applied');
  // send patch with newer updatedAt on cuarto
  const applied = await appliedPromise;
  assert.strictEqual(applied.lwwApplied, true);
});
```

- [ ] **Step 6: Run host + ws tests**

```bash
node --test lan-squad/host-router.test.js lan-squad/ws-hub.test.js
```

- [ ] **Step 7: Commit**

```bash
git add lan-squad/host-router.js lan-squad/host-router.test.js lan-squad/ws-hub.js lan-squad/ws-hub.test.js
git commit -m "feat(lan): HTTP/WS success on LWW overlap"
```

---

### Task 5: Renderer — toast preference + helper

**Files:**
- Modify: `public/js/storage.js`
- Create: `public/js/lan-lww-toast.mjs`
- Create: `public/js/lan-lww-toast.test.mjs`

- [ ] **Step 1: Storage API**

In `storage.js` near other `rpc-lan-*` helpers:

```javascript
  getLanLwwOverwriteToast() {
    try {
      var v = localStorage.getItem('rpc-lan-lww-overwrite-toast');
      if (v === '0') return false;
      return true; // default on
    } catch (_e) {
      return true;
    }
  },
  setLanLwwOverwriteToast(enabled) {
    try {
      localStorage.setItem('rpc-lan-lww-overwrite-toast', enabled ? '1' : '0');
    } catch (_e) {}
  },
```

- [ ] **Step 2: Toast module test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowLwwToast, resetLwwToastDebounceForTests } from './lan-lww-toast.mjs';

test('debounces duplicate entity toasts within window', () => {
  resetLwwToastDebounceForTests();
  assert.equal(shouldShowLwwToast('patient', 'p1'), true);
  assert.equal(shouldShowLwwToast('patient', 'p1'), false);
});
```

- [ ] **Step 3: Implement `lan-lww-toast.mjs`**

Export `notifyLwwOverwrite(runtime, { entityType, entityId, overwrittenKeys })` — checks `Storage.getLanLwwOverwriteToast()`, debounce map keyed by `entityType:entityId`, calls `runtime.showToast(message, 'info')` with Spanish copy from spec §5.

- [ ] **Step 4: Register test in `package.json` `scripts.test` array if not auto-globbed**

- [ ] **Step 5: Run**

```bash
node --test public/js/lan-lww-toast.test.mjs
```

- [ ] **Step 6: Commit**

```bash
git add public/js/storage.js public/js/lan-lww-toast.mjs public/js/lan-lww-toast.test.mjs package.json
git commit -m "feat(lan): optional LWW overwrite toast preference"
```

---

### Task 6: Renderer — remove conflict modal hot path

**Files:**
- Modify: `public/js/features/lan-sync.mjs`
- Modify: `public/js/lan-sync-push.mjs`
- Modify: `public/js/features/lan-sync-clinical-ops.test.mjs`

- [ ] **Step 1: Update clinical-ops tests**

Replace assertions that `saveDraftConflict` runs on 409 with expectations for `lwwAppliedKeys` + no draft (read current file and adjust strings).

- [ ] **Step 2: `handleSyncConflict` in `lan-sync.mjs`**

Replace body (~960–1035) with:

1. Build payload from WS/HTTP as today.
2. Call new `applyLwwConflictLocally(payload, serverSnapshot)` that merges server data into live state / `rememberLiveSyncEntity`.
3. If `payload.lwwApplied` or overwritten keys non-empty, `notifyLwwOverwrite(runtime, …)`.
4. **Never** call `openClinicalConflictViewer` or `saveDraftConflict`.
5. Keep `conflictSnapshotsMatchForAutoResolve` fast path if still useful (silent apply without toast).

- [ ] **Step 3: `lanPushPatientVersioned`**

On `resp.ok`, read `body.lwwApplied` / `body.overwrittenKeys` → toast + `rememberLiveSyncEntity`. Remove `handleSyncConflict` call for 409 (should not occur).

- [ ] **Step 4: `lan-sync-push.mjs`**

In `pushRoomSyncBundleToHost` 409 handler (~337–387): remove `saveDraftConflict` chain; on 200 with `lwwAppliedKeys`, `setHostBundleBases` + `notifyLwwOverwrite`. Delete `finishBundle409Locally` branches that existed only for modal flow unless still needed for silent accept.

`resolveClinicalOps409`: simplify to align revision + retry once; if still “conflict”, apply incoming snapshot (LWW).

- [ ] **Step 5: Host cache coherence**

After successful host-origin PUT/patch/bundle in `lan-sync.mjs`, always `setHostBundleBases` + `rememberLiveSyncEntity` from response (spec §7).

- [ ] **Step 6: Run renderer tests**

```bash
node --test public/js/features/lan-sync-clinical-ops.test.mjs public/js/lan-conflict-draft-resolution.test.mjs
```

- [ ] **Step 7: Commit**

```bash
git add public/js/features/lan-sync.mjs public/js/lan-sync-push.mjs public/js/features/lan-sync-clinical-ops.test.mjs
git commit -m "feat(lan): client applies LWW without conflict modal"
```

---

### Task 7: Settings UI + legacy drafts

**Files:**
- Modify: `public/js/lan-sync-panel.mjs`
- Modify: `public/partials/` or settings LAN section in assembled HTML

- [ ] **Step 1: Add checkbox** in ⇄ LAN settings (near disconnect banner toggle):

```html
<label class="settings-check">
  <input type="checkbox" id="settings-lan-lww-toast" checked />
  Avisar cuando la sala sobrescribió un cambio concurrente
</label>
```

Wire in `lan-sync-panel.mjs`: on open, read `Storage.getLanLwwOverwriteToast()`; on change, `setLanLwwOverwriteToast(checkbox.checked)`.

- [ ] **Step 2: `appendLanConflictDraftsSection`**

Hide section when no legacy drafts, or rename to “Conflictos antiguos” with single **Descartar todos** calling `clearAllDraftConflicts()` from `draft-conflict-store.mjs`.

- [ ] **Step 3: Build UI**

```bash
npm run build:ui
```

- [ ] **Step 4: Commit**

```bash
git add public/js/lan-sync-panel.mjs public/partials/ scripts/build-ui if needed
git commit -m "feat(lan): settings toggle for LWW overwrite toast"
```

---

### Task 8: Verification + docs

**Files:**
- Modify: `docs/superpowers/specs/2026-06-03-lan-conflict-lww-design.md` (checkbox goals when done)
- Already updated: `.cursor/rules/project-context.mdc`

- [ ] **Step 1: Full test suite**

```bash
npm test
```

Expected: all pass; fix any remaining 409 expectations in `lan-client.test.mjs` (conflict event may become unused — update test to `livesync:applied` only or remove).

- [ ] **Step 2: Metrics (Tier 1)**

```bash
npm run metrics
```

Ensure `conflict-resolver.js` / new `lww-utils.js` stay within complexity/length budgets; extract helpers if needed.

- [ ] **Step 3: Manual smoke (host)**

1. Start `npm start`, join sala as host.
2. Edit patient cuarto twice from same machine — **no modal**.
3. Toggle toast off in Ajustes — overwrite another field silently.
4. Second client edits same todo — newer `updatedAt` wins, toast once if enabled.

- [ ] **Step 4: Mark spec success criteria** in design doc checkboxes.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-06-03-lan-conflict-lww-design.md
git commit -m "docs(lan): mark LWW conflict spec verification complete"
```

---

## Spec coverage checklist

| Spec § | Task |
|--------|------|
| §1 LWW all entities | 2, 3 |
| §2 HTTP patients | 2, 4, 6 |
| §3 WS patches | 2, 4, 6 |
| §4 sync-bundle | 3, 4, 6 |
| §5 optional toast | 5, 7 |
| §6 remove modal | 6, 7 |
| §7 host cache | 6 |
| §8 errors (no overlap 409) | 2–4 |
| §9 testing | 1–8 |
| §10 docs/metrics | 8 |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-03-lan-conflict-lww.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement in this session with executing-plans checkpoints  

Which approach do you want?
