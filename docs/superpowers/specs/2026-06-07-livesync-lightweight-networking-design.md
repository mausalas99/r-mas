# LiveSync Lightweight Networking — Design Spec

**Date:** 2026-06-07  
**Status:** Approved — awaiting implementation plan  
**Approach:** Tiered migration (B) — typed mutations for high-value domains, safety bundle fallback for untyped, full overhaul P0–P2  
**Backward compat:** Hard — every change is additive or negotiated; V0 peers unaffected at every step  
**Plan:** (to be created via `writing-plans`)

---

## Problem Statement

LAN LiveSync is architecturally sound (hub-and-spoke, SQLCipher local-first, typed delta/patch paths) but performs poorly on slow hospital Wi-Fi because almost every patient save triggers a **full room bundle push** (`PUT /sync-bundle`) containing all patients, all fields, including large arrays like `labHistory`. This happens on a 900ms debounce regardless of what changed. Additional problems:

- Peer join gossip sends a full WS bundle from every connected Mac to the new joiner
- Revision hints trigger full `GET /sync-bundle` instead of delta log replay
- No HTTP compression on LAN API responses
- Background host scanning continues even when the host is unreachable, causing UI jitter

---

## Design Principle

> **Full sync once on join. Typed mutations for everything thereafter. Bundle = cold-path only.**

After this overhaul:
- The 900ms debounced bundle push is **eliminated** for all typed domains
- Each domain module dispatches its own typed mutation at save time
- The bundle fires at 30s (safety fallback) for untyped domains only, and only when something untyped actually changed
- Reconnect always starts with a full bundle pull; live revision hints use delta log replay first
- Slow/unreachable host auto-transitions to OFFLINE mode; back to LAN is always user-initiated

---

## Scope

### In scope (this spec)

- `lan-mutation-registry.mjs` — new dispatch module
- `lan-network-profile.mjs` — new RTT-based profile state machine
- Post-save hook decoupling across all call sites
- New typed mutation endpoints: **nota**, **indicaciones**, **lab-history/upsert-set**, **patient fields**
- Safety bundle: 30s debounce, stripped typed fields, `entriesPartial` partial merge on host
- `bundle-merge.js` partial entry merge (`mergePartialEntry` + `TYPED_ENTRY_FIELDS`)
- Delta log replay on `livesync:revision` (client uses existing `GET /deltas?afterSeq=N`)
- Peer-join gossip fix: hello → revision hint, not WS bundle
- HTTP compression on `/api/lan/v1/*`
- OFFLINE network state: stop all scanning; user-initiated reconnect only
- New outbox kinds: `lab_history_upsert`, `nota_replace`, `indicaciones_replace`, `patient_fields`
- Schema: add new kinds to `lan_sync_outbox` CHECK constraint

### Deferred (follow-on specs)

- `medReceta`, `medPharmProfile`, `vpo`, `listadoProblemas` typed mutations
- Nota/lab changes recorded in delta log (enabling Flow B catch-up for those domains)
- Incremental `GET /sync-bundle?sinceRevision=N` endpoint
- True per-patient entry merge on host (beyond `entriesPartial` field exclusion)

---

## Architecture Overview

```
Edit (typed domain)
  → dispatchLanMutation(domain, pid, payload)
  → registry lookup
  → typed HTTP endpoint (≤2KB) or WS patch
  → outbox on failure

Edit (untyped domain: medReceta, VPO, entrega…)
  → dispatchLanMutation(domain, pid)
  → scheduleUntypedSafetyBundle() [30s debounce]
  → PUT /sync-bundle [entriesPartial:true, untyped fields only, 50KB cap]

livesync:revision received (live, WS open)
  → GET /deltas?afterSeq=lastDeltaSeq
  → ok: apply delta log entries (skip full bundle)
  → fallback:sync_bundle: GET /sync-bundle (full)

Reconnect from OFFLINE
  → user taps "Reconectar" → single ping
  → success: flush outbox FIRST → GET /sync-bundle (full) → open WS
  → failure: stay OFFLINE, inline error

Peer joins room (livesync:hello received)
  → emitLiveSyncRevisionHint() [~60 bytes]  ← was buildLiveSyncBundleEnvelope() [~100KB]
```

---

## Section 1 — Mutation Registry (`lan-mutation-registry.mjs`)

New module. Owns the dispatch table mapping domain names to typed push handlers. Lives in `public/js/`.

### API

```js
registerMutationHandler(domain: string, handler: (patientId, payload?) => Promise<void>): void
dispatchLanMutation(domain: string, patientId: string, payload?: unknown): void
isTypedDomain(domain: string): boolean
```

### Dispatch logic

```js
// Domain → outbox kind mapping (used in the catch handler below)
const DOMAIN_OUTBOX_KIND = {
  'nota': 'nota_replace',
  'indicaciones': 'indicaciones_replace',
  'lab-history': 'lab_history_upsert',
  'patient-fields': 'patient_fields',
};

function dispatchLanMutation(domain, patientId, payload) {
  if (!activeLiveSyncRoomId || !isLanSessionConfiguredForRest()) return;
  const handler = handlers.get(domain);
  if (handler) {
    void handler(patientId, payload).catch(() => {
      const kind = DOMAIN_OUTBOX_KIND[domain];
      if (kind) enqueueOutbox(activeLiveSyncRoomId, { kind, payload: { patientId, data: payload } });
    });
  } else {
    markUntypedDirty(domain, patientId);
    scheduleUntypedSafetyBundle();
  }
}
```

### Registered handlers (at boot in `orchestrator.mjs`)

| Domain | Handler | Transport |
|--------|---------|-----------|
| `nota` | `pushNotaToHost(pid)` | `PUT /patients/:id/nota` |
| `indicaciones` | `pushIndicacionesToHost(pid)` | `PUT /patients/:id/indicaciones` |
| `lab-history` | `pushLabHistoryUpsert(pid, set)` | `POST /patients/:id/lab-history/upsert-set` |
| `patient-fields` | `pushPatientFieldsToHost(pid)` | WS `livesync:patch {entityType:'patient'}` + HTTP fallback |

HC, agenda, todos, clinicalOps, commands already have dedicated push paths and bypass this registry — they call their own push functions directly.

---

## Section 2 — Post-Save Hook Decoupling

### `orchestrator.mjs` — `setSaveStateHooks`

```js
// Before:
setSaveStateHooks({
  before() { touchPatientLanUpdatedAt(aid); },
  after() { post(); scheduleLiveSyncPush(); }  // ← removed
});

// After:
setSaveStateHooks({
  before() { touchPatientLanUpdatedAt(aid); },
  after() { post(); }  // lab maintenance only
});
```

### Call site replacements

| File | Old call | New call |
|------|----------|----------|
| `clinical-entrega.mjs` | `scheduleLiveSyncPush()` | `dispatchLanMutation('entrega', pid)` |
| `eventualidades-panel.mjs` | `scheduleLiveSyncPush()` | `dispatchLanMutation('eventualidades', pid)` |
| `historia-clinica-panel.mjs` | `scheduleLiveSyncPush()` after `lanPushHistoriaClinica` | **removed** — HC push already handles sync |
| `patients.mjs` | `scheduleLiveSyncPush()` on patient field save | `dispatchLanMutation('patient-fields', pid)` |
| `teams-guardia-bridge.mjs` | `scheduleLiveSyncPush()` | `pushClinicalOpsLanNow()` (already correct domain) |
| `teams-roster.mjs` | `scheduleLiveSyncPush()` | `pushClinicalOpsLanNow()` (already correct domain) |
| `patient-team-assign-ui.mjs` | `scheduleLiveSyncPush()` | `pushClinicalOpsLanNow()` |

`scheduleLiveSyncPush` is **not deleted** — it remains for explicit "Forzar sincronización" and leave-room flows where a full bundle push is intentional. It is only removed from post-save wiring.

---

## Section 3 — New Typed Mutation Endpoints

### 3.1 Lab History — Upsert Set

**Client → Host:**

```
POST /api/lan/v1/patients/:id/lab-history/upsert-set
Authorization: Bearer <teamCode>
Content-Type: application/json

{
  "set": { "id": "ls_1234", "date": "2026-06-07", "values": { "na": 138 }, "updatedAt": "…" },
  "clientId": "lc_a",
  "clientTimestamp": 1780849256
}
```

**Host merge rule:** Upsert by `set.id`. On conflict (same `set.id` received from two peers), LWW by `clientTimestamp`. Append if `set.id` not found. No OCC — lab sets are independent; concurrent additions for different dates are always safe.

**Response:** `{ ok: true, setId, revision }`  
**Outbox kind:** `lab_history_upsert`  
**Host post-accept:** calls `broadcastLiveRevision(roomId, revision, clientId)` — triggers peers to run Flow B catch-up.

### 3.2 Nota — Replace (OCC + auto-LWW)

```
PUT /api/lan/v1/patients/:id/nota
{ "data": { …nota fields… }, "expectedVersion": 4, "clientId": "…", "clientTimestamp": … }
```

**Host merge rule:** Version match → accept, bump version. Mismatch → LWW by `clientTimestamp` (auto-resolved, no blocking conflict). Response includes `lwwApplied: true` when auto-resolved; client shows "nota fusionada automáticamente" toast.

**Response:** `200 { ok, version, data }` or `200 { ok, lwwApplied: true, version, data }`  
**Outbox kind:** `nota_replace`  
**Host post-accept:** calls `broadcastLiveRevision(roomId, revision, clientId)`.

### 3.3 Indicaciones — Replace (same shape as nota)

```
PUT /api/lan/v1/patients/:id/indicaciones
{ "data": { … }, "expectedVersion": 2, "clientId": "…", "clientTimestamp": … }
```

Same OCC + auto-LWW semantics as nota. Separate version counter per patient.  
**Outbox kind:** `indicaciones_replace`  
**Host post-accept:** calls `broadcastLiveRevision(roomId, revision, clientId)`.

### 3.4 Patient Fields — HTTP + WS

**Primary (WS):** `livesync:patch { entityType: 'patient', changedKeys: ['room','bed'], … }` — already handled by `conflict-resolver.js` via `ws-hub.js`. No change needed for the hot path.

**HTTP fallback (outbox drain when WS down):**

```
PUT /api/lan/v1/patients/:id/fields
{ "changedKeys": ["room","bed"], "data": { "room": "2B", "bed": "4" }, "expectedVersion": 7, "clientId": "…" }
```

Routes through existing `conflict-resolver.applyMutation({ entityType: 'patient' })`. Thin new route only.  
**Outbox kind:** `patient_fields`  
**Host post-accept:** calls `broadcastLiveRevision(roomId, revision, clientId)`.

### 3.5 Outbox schema update

Add new kinds to `lan_sync_outbox` CHECK constraint in `lib/db/schema.mjs`:

```sql
CHECK (kind IN ('bundle','patch','clinical_ops','delta','command',
                'lab_history_upsert','nota_replace','indicaciones_replace','patient_fields'))
```

Add drain handlers in `flushLiveSyncOutboxBody` for each new kind.

---

## Section 4 — Safety Bundle (Untyped Fallback)

### Parameters

| Parameter | Today | Safety bundle |
|-----------|-------|---------------|
| Debounce | 900ms | 30s |
| Trigger | Any save (global hook) | Only when `_dirtyUntyped` set has entries |
| Fields in entries | All patient fields | Only untyped: `medReceta`, `medPharmProfile`, `vpo`, `listadoProblemas`, entrega/eventualidades data |
| Fields excluded | — | `labHistory`, `note`, `indicaciones`, `todos`, `clinicalOps`, `agenda` |
| Size cap | Unlimited | 50KB — strips `vpo` → `medPharmProfile` → `listadoProblemas` in that order if over |
| On SLOW/OFFLINE profile | Same | Disabled — untyped domains queue locally in `_dirtyUntyped`, flush when FAST resumes |

### Dirty tracking

```js
const _dirtyUntyped = new Set(); // e.g. 'medReceta:pat_1', 'vpo:pat_2'

function markUntypedDirty(domain, patientId) {
  _dirtyUntyped.add(domain + ':' + patientId);
}
function clearUntypedDirty() {
  _dirtyUntyped.clear();
}
```

Safety bundle only builds entries for patients that appear in `_dirtyUntyped`. Cleared after a successful PUT.

### `entriesPartial` flag and host partial merge

Safety bundle sets `bundle.entriesPartial = true` in the PUT body. This signals the host to merge entry fields rather than replace entries wholesale.

**`bundle-merge.js` — new `mergePartialEntry` function:**

```js
const TYPED_ENTRY_FIELDS = new Set(['note', 'indicaciones', 'labHistory', 'todos']);

function mergePartialEntry(serverEntry, incomingEntry) {
  const merged = { ...serverEntry };
  for (const [key, val] of Object.entries(incomingEntry)) {
    if (!TYPED_ENTRY_FIELDS.has(key)) {
      merged[key] = val; // apply untyped field from client
    }
    // typed fields: preserve server's version (set by typed endpoints)
  }
  return merged;
}
```

When `base.entriesPartial === true`, `bundle-merge.js` calls `mergePartialEntry` for each matching entry instead of replacing the entries array. New entries (no server match) are still appended.

**V0 host receiving `entriesPartial: true`:** ignores the unknown flag, replaces entries wholesale. This is correct — V0 hosts have no typed nota/lab state (those endpoints don't exist on V0), so the client's full entry data is the authoritative source. No regression.

---

## Section 5 — Network Profile (`lan-network-profile.mjs`)

New module in `public/js/`. Three states: `fast`, `slow`, `offline`.

### State machine

```
FAST ──(RTT >500ms, 3×)──► SLOW ──(ping fails, 3×)──► OFFLINE
FAST ──(ping fails, 5×)──────────────────────────────► OFFLINE
SLOW ◄──(RTT <200ms, 5×)── FAST
OFFLINE ◄──(user initiates reconnect, ping ok)── resolved to FAST | SLOW
```

**Hysteresis:** fast→slow requires 3 consecutive slow readings; slow→fast requires 5 consecutive fast readings. Prevents flapping on bursty hospital Wi-Fi.

### Per-profile sync parameters

| Parameter | FAST | SLOW |
|-----------|------|------|
| Typed mutation debounce | 900ms | 4s |
| Safety bundle | 30s | disabled (queue) |
| Reconcile cooldown | 10s | 30s |
| Subnet scan interval | 25s | 60s |
| Outbox flush interval | 60s | 120s |

**OFFLINE:** all scanning stopped (subnet scan, ping loop, WS reconnect). Zero network traffic. Outbox queues locally.

### Measurement

RTT samples come from three passive sources — no new polling loop:
1. Existing ⇄ panel ping (every 5s) → `recordPingSuccess(ms)` / `recordPingFailure()`
2. Successful sync-bundle PUT round-trip → `recordRttSample(ms)`
3. Reconcile GET timing → `recordRttSample(ms)`

Profile decision uses the **median of the last 3 readings** (not instantaneous) to filter burst noise.

### Module API

```js
recordRttSample(ms: number): void
recordPingSuccess(ms: number): void
recordPingFailure(): void
getNetworkProfile(): 'fast' | 'slow' | 'offline'
subscribeNetworkProfile(cb: (profile) => void): () => void
userInitiatedReconnect(): Promise<'fast' | 'slow' | 'offline'>
getLastRttMs(): number   // diagnostics panel
resetProfile(): void     // on explicit room leave/rejoin
```

### OFFLINE → LAN transition (user-initiated only)

The ⇄ panel shows when OFFLINE:

```
🔴 Sin conexión al anfitrión · LiveSync en pausa
   Los cambios se guardan localmente y se sincronizarán al reconectar
                                                    [ Reconectar ]
```

"Reconectar" calls `userInitiatedReconnect()`:
1. Single ping attempt
2. Fail → stay OFFLINE, show "No se encontró el anfitrión" inline (no toast)
3. Success → profile resolves to FAST or SLOW → triggers reconnect flow (Section 6 Flow A)

No background retry. No subnet scan. No WS reconnect attempt. Zero network traffic while OFFLINE.

Integrates with existing `lan-host-detect-guard.mjs`: OFFLINE implies `isAutoHostDetectPaused() === true`. `resumeAutoHostDetect()` called on successful reconnect.

---

## Section 6 — Delta Catch-Up

Two distinct flows based on context.

### Flow A — Reconnect from OFFLINE

```
① userInitiatedReconnect() → ping ok → profile = FAST | SLOW
② flushLiveSyncOutbox(roomId)          ← push LOCAL queue FIRST (avoids overwriting local edits)
③ reconcileLiveSyncRoom(roomId, { force: true, reason: 'reconnect' })
   → always GET /sync-bundle (full)     ← guarantees complete state (nota, lab, untyped all included)
   → also GET /clinical-ops
④ open WS live channel → send livesync:hello
⑤ flushLiveSyncOutbox(roomId) again    ← catches conflicts from reconcile
```

Full bundle on reconnect is intentional and correct — offline period may span hours, delta log is bounded (30 min / 500 entries), and nota/indicaciones/lab are not in the delta log.

### Flow B — Live revision hint (WS connected)

Replaces the current behavior of always doing `GET /sync-bundle` on `livesync:revision`:

```
livesync:revision { revision: N, roomId } received
  → check lastDeltaSeq (tracked per room in memory in `runtime.mjs`; reset to 0 on full reconcile)
  → GET /rooms/:id/deltas?afterSeq=lastDeltaSeq
    → { ok: true, deltas: [...] }
      → apply deltas in seq order
      → update lastDeltaSeq to max applied
    → { ok: false, fallback: 'sync_bundle' }   // gap too large or log expired
      → GET /sync-bundle (full)
      → reset lastDeltaSeq from bundle revision
```

The `GET /rooms/:id/deltas` endpoint already exists in `host-router.js`. The client-side change is in `scheduleReconcileFromRevisionHint` / `reconcileLiveSyncRoomBody`: try delta path first, fall back to bundle.

`lastDeltaSeq` is a per-room in-memory counter in `runtime.mjs` (exported alongside `activeLiveSyncRoomId`). It is updated to the highest `deltaSeq` in each successful `GET /deltas` response. It resets to `0` on full `GET /sync-bundle` reconcile (the next revision hint will trigger `GET /deltas?afterSeq=0`, returning recent entries or `fallback: sync_bundle` if the log is empty).

**Delta log retention (host):** last 500 entries per room OR entries newer than 30 minutes, whichever is smaller. Server returns `fallback: sync_bundle` when `afterSeq` is outside the retention window.

### What the delta log covers

| Domain | In delta log? | Live catch-up path |
|--------|---------------|--------------------|
| HC fields (safe paths) | ✓ | Flow B delta replay |
| Agenda / todos | ✓ (via conflict-resolver) | Flow B delta replay |
| Commands (estado actual, entrega) | ✓ (deltaSeq ordered) | Flow B + command gap reconcile |
| Nota, indicaciones, lab history | ✗ | Flow A only (full bundle on reconnect) |
| Clinical ops / directorio | ✗ (separate path) | `GET /clinical-ops` on reconnect |
| medReceta, VPO (untyped) | ✗ | Flow A only |

Future: once nota/lab endpoints record to the delta log, Flow B covers them too.

---

## Section 7 — Quick Wins

### 7A — Peer-join gossip fix

**`room.mjs` — `livesync:hello` handler:**

```js
// Before (every connected peer sends full WS bundle to the new joiner):
lanClient.sendLive(await buildLiveSyncBundleEnvelope(activeLiveSyncRoomId));

// After (revision hint only — new peer reconciles via HTTP, which it already does on join):
emitLiveSyncRevisionHint(activeLiveSyncRoomId, getHostBundleBases(activeLiveSyncRoomId).revision);
```

In a 6-Mac room, a new joiner previously received 6 simultaneous full WS bundles (~100KB each = 600KB). After this change: 6 revision hints (~60 bytes each = 360 bytes total). The HTTP reconcile already happens on join — the WS bundles were redundant gossip.

### 7B — HTTP compression

```js
// server.js — before LAN router mount
const compression = require('compression');
app.use('/api/lan/v1', compression({ threshold: 2048 }));
```

`compression` is already a transitive Express dependency. The `threshold: 2048` setting skips compression on small payloads (typed mutations, revision hints) and applies it only where it helps (sync-bundle responses, clinical-ops). Ward JSON bundles typically compress 4–8×.

---

## Section 8 — Backward Compatibility

All changes are additive. No existing WS message types, HTTP endpoints, or bundle fields are removed or altered in a breaking way.

| Change | V0 peer / host behavior | Safe? |
|--------|------------------------|-------|
| New HTTP endpoints (nota, lab, fields) | Never called by V0 client | ✓ |
| `hello` → revision hint | V0 already handles `livesync:revision` | ✓ |
| `entriesPartial: true` in safety bundle | V0 host ignores unknown key, replaces entries wholesale — correct, since V0 has no typed nota/lab state to protect | ✓ |
| Safety bundle (30s, stripped fields) | V0 applies via existing `bundle-merge.js` | ✓ |
| OFFLINE mode / no background scan | Client-side only, no peer impact | ✓ |
| HTTP compression | Browser sends `Accept-Encoding: gzip` by default; transparent | ✓ |
| Delta replay on revision hint | Client-side only; server endpoint already exists | ✓ |

**Note on `entriesPartial` with V0 host:** V0 host replacing entries wholesale is the correct behavior — the V1 client's safety bundle contains the current state of untyped fields, and the client is the authoritative source. If a V1 client sent nota data to a V0 host via the safety bundle, the V0 host would store it correctly (no typed endpoints to conflict with). When the host updates to V1, the `mergePartialEntry` guard activates and protects typed-path data going forward.

---

## Section 9 — Test Strategy

### Unit tests (colocated `*.test.mjs`)

| Module | Cases |
|--------|-------|
| `lan-mutation-registry` | Dispatch to registered handler; fallback to untyped safety bundle; no-op when not in LAN session |
| `lan-network-profile` | FAST→SLOW on 3× slow; SLOW→FAST on 5× fast; FAST→OFFLINE on 5× ping fail; SLOW→OFFLINE on 3× ping fail; median-of-3 threshold; `userInitiatedReconnect` resolves profile; `resetProfile` |
| `safety-bundle-builder` | Strips `note`, `indicaciones`, `labHistory`, `todos` from entries; respects 50KB cap (strips vpo→medPharmProfile→listadoProblemas in order); only includes dirty patient entries; sets `entriesPartial: true` |
| `bundle-merge` (new cases) | `entriesPartial: true` preserves `TYPED_ENTRY_FIELDS` from server; new untyped field from client applied; new entry (no server match) appended; V0 host path (no `entriesPartial`) still replaces wholesale |
| Outbox new kinds | `lab_history_upsert`, `nota_replace`, `indicaciones_replace`, `patient_fields` enqueue and drain correctly; drain order (clinical_ops → bundle → typed → others) |

### Integration / regression tests (existing suites)

| Suite | What to verify |
|-------|----------------|
| `lan-sync-clinical-ops.test.mjs` | No regression on `pushClinicalOpsLanNow`, `reconcileLiveSyncRoom`, outbox flush |
| `host-router.test.js` | New endpoints: nota/indicaciones/lab-history/fields — 200 accept, 409 stale version, auth rejection |
| `ws-hub.test.js` | `livesync:hello` → receiver sends revision hint, NOT a full bundle |
| `delta-resolver.test.js` | `GET /deltas?afterSeq=N` returns entries; `fallback: sync_bundle` when gap too large |
| `bundle-merge.test.js` | Full partial-entries regression suite |
| `lan-client.test.mjs` | `_isSyncConnectThrottled` still works; no regression on backoff |

### Contract / regression guards (source-level assertions)

These are `assert.match(src, /pattern/)` style tests in `lan-sync-clinical-ops.test.mjs` or a new `lan-sync-overhaul.test.mjs`:

- `scheduleLiveSyncPush` is NOT called from the `saveState` `after` hook
- `buildLiveSyncBundleEnvelope` is NOT called from the `livesync:hello` handler
- Safety bundle envelope never contains keys `note`, `indicaciones`, or `labHistory` in entries
- OFFLINE profile → `fetch` not called for > 5s after `recordPingFailure()` × 5
- `flushLiveSyncOutbox` is called before `reconcileLiveSyncRoom` in the reconnect sequence

---

## New Files

| File | Purpose |
|------|---------|
| `public/js/lan-mutation-registry.mjs` | Domain dispatch table |
| `public/js/lan-network-profile.mjs` | RTT measurement + 3-state profile |
| `public/js/lan-safety-bundle-builder.mjs` | Builds stripped partial-entry bundle |
| `public/js/lan-mutation-registry.test.mjs` | Unit tests |
| `public/js/lan-network-profile.test.mjs` | Unit tests |
| `public/js/lan-safety-bundle-builder.test.mjs` | Unit tests |

## Modified Files (primary)

| File | Change summary |
|------|---------------|
| `public/js/features/lan/orchestrator.mjs` | Remove `scheduleLiveSyncPush` from `saveState` hook; register mutation handlers at boot |
| `public/js/features/lan/push.mjs` | Add untyped safety bundle scheduler; integrate network profile for debounce params |
| `public/js/features/lan/room.mjs` | hello gossip → revision hint; delta replay in `reconcileLiveSyncRoomBody` |
| `public/js/features/lan/panel.mjs` | OFFLINE state UI; "Reconectar" button; "Red lenta detectada" indicator |
| `public/js/features/lan/runtime.mjs` | Export profile-aware debounce constants |
| `lan-squad/bundle-merge.js` | `mergePartialEntry` + `TYPED_ENTRY_FIELDS` |
| `lan-squad/host-router.js` | New endpoints: nota, indicaciones, lab-history/upsert-set, patients/:id/fields |
| `lib/db/schema.mjs` | Add new outbox kinds to CHECK constraint (schema version bump + migration) |
| `server.js` | Add `compression` middleware on `/api/lan/v1` |
| `public/js/features/clinical-entrega.mjs` | Replace `scheduleLiveSyncPush` with `dispatchLanMutation` |
| `public/js/features/eventualidades-panel.mjs` | Replace `scheduleLiveSyncPush` with `dispatchLanMutation` |
| `public/js/features/historia-clinica-panel.mjs` | Remove trailing `scheduleLiveSyncPush` after HC push |
| `public/js/features/patients.mjs` | Replace `scheduleLiveSyncPush` on patient field save |
| `public/js/features/clinical-teams/teams-guardia-bridge.mjs` | Replace with `pushClinicalOpsLanNow` |
| `public/js/features/clinical-teams/teams-roster.mjs` | Replace with `pushClinicalOpsLanNow` |
| `public/js/patient-team-assign-ui.mjs` | Replace with `pushClinicalOpsLanNow` |
| `public/js/live-sync-outbox.mjs` | New outbox kind handlers |

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | HC field edit → no `PUT /sync-bundle` fired within 30s (only delta or HC endpoint) |
| 2 | Nota save → `PUT /patients/:id/nota` fired; no bundle push |
| 3 | Lab set added → `POST /patients/:id/lab-history/upsert-set` fired |
| 4 | medReceta save → safety bundle fires after 30s (not immediately) |
| 5 | 7th Mac joins room → receives 6 revision hints over WS, not 6 full bundles |
| 6 | Revision hint received → `GET /deltas` attempted first; full bundle only on gap |
| 7 | RTT > 500ms × 3 → profile switches to SLOW; mutation debounce becomes 4s |
| 8 | Ping fails × 3 from SLOW → profile switches to OFFLINE; subnet scan stops |
| 9 | OFFLINE → "Reconectar" → ping ok → outbox flushes → full reconcile |
| 10 | `npm test` green on all LAN suites; no regressions in `lan-sync-clinical-ops.test.mjs` |
| 11 | Bundle size for routine edit < 5KB (typed domain, no bundle) vs ~200KB today |
