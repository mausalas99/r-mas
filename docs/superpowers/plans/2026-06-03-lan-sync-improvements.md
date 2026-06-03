# LAN Sync Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Ship by phase** (0 → 1 → 2 → 3); do not start Phase 3 module split until Phase 0–1 tests are green.

**Goal:** Improve guardia LAN reliability (profile push, transports, outbox, clinical-ops slice), ward operability (pinned host, diagnostics, auto-join confirm), and long-term maintainability (module split, merge registry, host DB alignment) without replacing hub-and-spoke or SQLCipher local-first.

**Architecture:** Incremental changes on existing `lan-squad/` host + `lan-sync.mjs` client. Phase 3 extracts modules behind a thin `lan-sync.mjs` facade (no new `app.js` static imports). Phase 4 (IM-14–16) is **out of scope** for this plan — separate specs required.

**Tech Stack:** Node 20+ `node:test`, Express 5 (`host-router.js`), vanilla ESM renderer, SQLCipher (`lib/db/`), WebSocket (`ws-hub.js`), esbuild bundle.

**Spec:** [`docs/superpowers/specs/2026-06-03-lan-sync-improvements-design.md`](../specs/2026-06-03-lan-sync-improvements-design.md)

**Prerequisites:** LAN host concurrency + conflict resolution already on `main` (revision/`entityVersions`, `ConflictResolver`, clinical diff viewer).

**Debt gate:** After each phase, run `npm test` and `npm run metrics` (if available); `totalScore` must not exceed `scripts/metrics/baseline.json`.

---

## File map (by phase)

| Phase | File | Action |
|-------|------|--------|
| 0 | `public/js/features/lan-sync.mjs` | Fix `pushClinicalOpsLanNow`, ticket UI |
| 0 | `public/js/features/lan-sync-clinical-ops.test.mjs` | Extend contract tests |
| 0 | `public/js/clinical-profile-lan-sync.mjs` | Consume `channels` in callers (optional) |
| 0 | `public/js/features/clinical-registration.mjs` | Toasts for `channels.outbox` |
| 0 | `public/js/features/clinical-onboarding.mjs` | Same |
| 0 | `public/js/features/clinical-teams.mjs` | Same |
| 1 | `public/js/lan-sync-state.mjs` | **Create** — room phase FSM |
| 1 | `public/js/lan-sync-state.test.mjs` | **Create** |
| 1 | `public/js/features/lan-sync.mjs` | Wire FSM, HTTP/WS split |
| 1 | `lan-squad/ws-hub.js` | Forward `livesync:revision` |
| 1 | `lib/db/schema.mjs` | Bump `SCHEMA_VERSION` → 9, `lan_sync_outbox` |
| 1 | `lib/db/schema.test.mjs` | Migration test |
| 1 | `lib/db/ipc-handlers.mjs` | `dbLanOutbox*` handlers |
| 1 | `public/js/live-sync-outbox.mjs` | IPC-first enqueue/drain |
| 1 | `lan-squad/host-router.js` | `GET/PUT …/clinical-ops` |
| 1 | `lan-squad/host-router.test.js` | clinical-ops 200/409 |
| 1 | `public/js/clinical-ops-lan.mjs` | `pushClinicalOpsToHost` helper |
| 2 | `public/js/lan-surrogate-host.mjs` | Pin storage helpers |
| 2 | `public/js/lan-sync-diagnostics.mjs` | **Create** |
| 2 | `public/js/lan-sync-diagnostics.test.mjs` | **Create** |
| 2 | `public/js/features/lan-sync.mjs` | Pin UI, scan behavior, diagnostics panel |
| 3 | `public/js/lan-sync-*.mjs` | **Create** modules (see Task 13) |
| 3 | `public/js/lan-merge-registry.mjs` | **Create** |
| 3 | `lan-squad/merge-registry.js` | **Create** thin host wrapper |
| 3 | `main.js` / `lib/db/*` | Host clinical ops DB (13a) |
| * | `package.json` | Register new `*.test.*` files |
| * | `public/js/app.bundle.mjs` | `npm run build:ui` after renderer edits |

---

## Phase 0 — Bug fixes & honest UX (IM-01 – IM-03)

### Task 1: IM-01 — Fix profile push live WebSocket (P0)

**Files:**
- Modify: `public/js/features/lan-sync.mjs` (`pushClinicalOpsLanNow`)
- Modify: `public/js/features/lan-sync-clinical-ops.test.mjs`

- [ ] **Step 1: Add failing contract test**

In `lan-sync-clinical-ops.test.mjs`, assert source does **not** call `connectLiveChannel` unconditionally inside `pushClinicalOpsLanNow` live branch — e.g. match `liveConnected` block that uses `sendLive` without preceding `connectLiveChannel` when same room, or extract helper `sendLiveBundleIfOpen(roomId, envelope)` and test its source.

- [ ] **Step 2: Implement `sendLiveBundleIfOpen` (inline or helper in same file)**

```javascript
function sendLiveBundleIfOpen(roomId, envelope) {
  var rid = String(roomId || '').trim();
  var ws = lanClient._liveWs;
  if (!lanClient.liveConnected || String(lanClient.liveRoomId || '') !== rid) return false;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  return lanClient.sendLive(envelope);
}
```

In `pushClinicalOpsLanNow`, replace:

```javascript
if (lanClient.liveConnected) {
  try {
    lanClient.connectLiveChannel(roomId);
    lanClient.sendLive(envelope);
    pushedLive = true;
  } catch (_e2) {}
}
```

with:

```javascript
pushedLive = sendLiveBundleIfOpen(roomId, envelope);
```

Only call `connectLiveChannel(roomId)` when membership requires live but channel is wrong room or not OPEN (optional: await one `lan-live-status` with 3s timeout — document in comment).

- [ ] **Step 3: Run tests**

```bash
node --test public/js/features/lan-sync-clinical-ops.test.mjs
npm test
```

- [ ] **Step 4: Build UI bundle**

```bash
npm run build:ui
```

- [ ] **Step 5: Commit**

```bash
git add public/js/features/lan-sync.mjs public/js/features/lan-sync-clinical-ops.test.mjs public/js/app.bundle.mjs public/js/app.bundle.meta.json
git commit -m "fix(lan): do not reconnect live WS on profile push (IM-01)"
```

---

### Task 2: IM-02 — Structured `LanPushResult` (P0)

**Files:**
- Modify: `public/js/features/lan-sync.mjs` (`pushClinicalOpsLanNow`)
- Modify: `public/js/clinical-profile-lan-sync.test.mjs`
- Modify: `public/js/features/clinical-registration.mjs`
- Modify: `public/js/features/clinical-onboarding.mjs`
- Modify: `public/js/features/clinical-teams.mjs` (profile save / delete user push paths)

- [ ] **Step 1: Define result shape in `pushClinicalOpsLanNow`**

Early returns include `channels: {}`. Success paths set `channels: { http?, live?, outbox? }`. Example:

```javascript
return { ok: false, code: 'PUSH_FAILED', channels: { outbox: true } };
return { ok: true, channels: { http: okHttp, live: pushedLive } };
```

- [ ] **Step 2: Update `flushClinicalProfileToLan` JSDoc** in `clinical-profile-lan-sync.mjs`.

- [ ] **Step 3: Registration/onboarding toasts**

When `!lanPush.ok && lanPush.channels?.outbox`, show info toast (Spanish): “Perfil guardado; se publicará al reconectar.”  
Keep `isBenignLanPushSkipCode` for `NO_ROOM` / `NO_LAN`.

- [ ] **Step 4: Contract test** — `clinical-profile-lan-sync.test.mjs` documents `channels` in re-export path (grep `pushClinicalOpsLanNow` return).

- [ ] **Step 5: `npm test` + `npm run build:ui`**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(lan): structured push result channels for profile sync (IM-02)"
```

---

### Task 3: IM-03 — Ticket expiry UX (P0)

**Files:**
- Modify: `public/js/features/lan-sync.mjs` (`updateLanPairingDisplay`, `mintLanPairingTicket`, copy handlers)

- [ ] **Step 1: Extend pairing display HTML**

When `_lastLanPairing.expiresAt` exists, render:

```html
<p class="lan-pairing-expiry">Válido hasta <strong>HH:MM</strong></p>
```

Parse ISO with `Date`; format `es-MX` 24h local. Add class `lan-pairing-expiry--soon` when &lt; 60s left.

- [ ] **Step 2: Toast on copy**

Append to success toast: ` (válido hasta HH:MM)`.

- [ ] **Step 3: Manual QA checklist** (document in PR): mint → wait → copy still works with `forceNew`.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(lan): show ticket expiry in pairing UI (IM-03)"
```

---

### Phase 0 exit criteria

- [ ] All Phase 0 tests pass
- [ ] `npm run metrics` ≤ baseline
- [ ] Update spec checklist IM-01–03 in PR description

---

## Phase 1 — Sync reliability (IM-04 – IM-07)

### Task 4: IM-04 — Room sync state machine (P1)

**Files:**
- Create: `public/js/lan-sync-state.mjs`
- Create: `public/js/lan-sync-state.test.mjs`
- Modify: `public/js/features/lan-sync.mjs`
- Modify: `package.json` (add test file)

- [ ] **Step 1: Write failing tests for transitions**

```javascript
// lan-sync-state.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRoomSyncPhase, setRoomSyncPhase, RoomSyncPhase } from './lan-sync-state.mjs';

describe('lan-sync-state', () => {
  it('starts offline without room', () => {
    assert.equal(getRoomSyncPhase('sala-1'), RoomSyncPhase.offline);
  });
  it('joining -> catching_up -> live', () => {
    setRoomSyncPhase('sala-1', RoomSyncPhase.joining);
    setRoomSyncPhase('sala-1', RoomSyncPhase.catching_up);
    setRoomSyncPhase('sala-1', RoomSyncPhase.live);
    assert.equal(getRoomSyncPhase('sala-1'), RoomSyncPhase.live);
  });
});
```

- [ ] **Step 2: Implement module**

Export `RoomSyncPhase` enum strings, per-room Map, `subscribeRoomSyncPhase(cb)`.

- [ ] **Step 3: Wire in `lan-sync.mjs`**

| Event | Phase |
|-------|-------|
| `joinLanRoom` start | `joining` |
| `reconcileLiveSyncRoom` start | `catching_up` |
| reconcile success + live connected | `live` |
| live disconnect | `degraded` |
| `leaveLiveSyncRoom` | clear / `configured` |
| no LAN config | `offline` |

Update `#lan-livesync-status` copy from phase.

- [ ] **Step 4: `npm test` + commit**

```bash
git commit -m "feat(lan): room sync phase state machine (IM-04)"
```

---

### Task 5: IM-05 — HTTP vs WebSocket responsibilities (P1)

**Files:**
- Modify: `public/js/features/lan-sync.mjs` (`scheduleLiveSyncPush`, `onLiveSyncWireMessage`)
- Modify: `lan-squad/ws-hub.js` (broadcast `livesync:revision`)

- [ ] **Step 1: Change `scheduleLiveSyncPush`**

Default: **HTTP** `pushRoomSyncBundleToHost` only.  
Remove unconditional `lanClient.sendLive(bundle)` from debounced push.

Keep WS full bundle for:
- `leaveLiveSyncRoom` (`livesync:leave`)
- explicit `forceLiveBundle` flag (add internal opt for debugging)

- [ ] **Step 2: Add client emit after successful HTTP PUT**

On `resp.ok` from bundle PUT, optionally `sendLive({ type: 'livesync:revision', roomId, revision, clientId })`.

- [ ] **Step 3: Server `ws-hub.js`**

If `msg.type === 'livesync:revision'`, `broadcast(channel, msg)` without resolver.

- [ ] **Step 4: Client handler**

On `livesync:revision` for active room (not self `clientId`), debounce 500ms → single `reconcileLiveSyncRoom`.

- [ ] **Step 5: Regression tests**

Run existing `lan-squad/host-router.test.js`, `live-sync-room.test.mjs`, `historia-clinica-lan-sync.test.mjs` if present.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(lan): debounced HTTP-primary sync; WS revision hints (IM-05)"
```

---

### Task 6: IM-06 — SQLCipher LAN outbox (P1)

**Files:**
- Modify: `lib/db/schema.mjs` (`SCHEMA_VERSION = 9`)
- Modify: `lib/db/schema.test.mjs`
- Modify: `lib/db/ipc-handlers.mjs`
- Modify: `public/js/live-sync-outbox.mjs`
- Modify: `preload.js` (if new IPC channels needed)
- Modify: `package.json`

- [ ] **Step 1: Schema migration**

Add table from spec:

```sql
CREATE TABLE IF NOT EXISTS lan_sync_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('bundle', 'patch', 'clinical_ops')),
  payload_json TEXT NOT NULL,
  enqueued_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_lan_outbox_room ON lan_sync_outbox(room_id, enqueued_at);
```

- [ ] **Step 2: IPC handlers**

- `dbLanOutboxEnqueue({ roomId, kind, payload })`
- `dbLanOutboxDrain({ roomId })` → rows, delete drained
- `dbLanOutboxCount({ roomId })`
- `dbLanOutboxIncrementAttempt({ id, lastError })`

- [ ] **Step 3: Renderer `live-sync-outbox.mjs`**

```javascript
export async function enqueueOutbox(roomId, item) {
  const api = window.rplusDb || window.electronAPI;
  if (api?.dbLanOutboxEnqueue) {
    return api.dbLanOutboxEnqueue({ roomId, kind: item.kind, payload: item.payload });
  }
  // legacy localStorage fallback (existing code)
}
```

- [ ] **Step 4: Tests**

`schema.test.mjs`: v8→v9 creates table.  
New `lib/db/lan-outbox.test.mjs` optional for pure SQL helpers.

- [ ] **Step 5: Cap 50 per room** in handler (delete oldest).

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(db): SQLCipher LAN sync outbox schema v9 (IM-06)"
```

---

### Task 7: IM-07 — Clinical-ops slice endpoint (P1)

**Files:**
- Modify: `lan-squad/host-router.js`
- Create/extend: `lan-squad/clinical-ops-route.js` (optional extract)
- Modify: `lan-squad/host-router.test.js`
- Modify: `public/js/features/lan-sync.mjs` (`pushClinicalOpsLanNow`)
- Modify: `public/js/clinical-ops-lan.mjs`

- [ ] **Step 1: Failing host-router tests**

```javascript
test('PUT /rooms/:id/clinical-ops merges snapshot', async () => { /* ... */ });
test('PUT clinical-ops stale revision returns 409', async () => { /* ... */ });
```

- [ ] **Step 2: Implement routes**

`GET` returns `{ snapshot, revision }` from room bundle’s `clinicalOps` + bundle revision.  
`PUT` merges via `mergeClinicalOpsSnapshotsData`; bumps revision like bundle merge.

- [ ] **Step 3: Client `pushClinicalOpsLanNow`**

Order:
1. `PUT …/clinical-ops` with exported snapshot
2. If fail and not 409 → fall back to full bundle push
3. On 409 → existing conflict flow if applicable

- [ ] **Step 4: `npm test` + commit**

```bash
git commit -m "feat(lan): clinical-ops slice endpoint and client push (IM-07)"
```

---

### Phase 1 exit criteria

- [ ] IM-04–07 acceptance boxes in spec satisfied
- [ ] `project-context.mdc` changelog entry for schema v9 + clinical-ops route
- [ ] `npm run build:ui`

---

## Phase 2 — Ward operations (IM-08 – IM-10)

### Task 8: IM-08 — Pinned host role (P2)

**Files:**
- Modify: `public/js/lan-surrogate-host.mjs` or new `public/js/lan-host-pin.mjs`
- Modify: `public/js/features/lan-sync.mjs` (`scanLanHosts`, `scheduleSurrogateFailoverCheck`)
- Modify: ⇄ panel markup in `lan-sync.mjs` / `lan-hub-panel-shell.mjs`

- [ ] **Step 1: Storage keys**

`rpc-lan-pinned-host-url` in localStorage; helpers `getPinnedHostUrl`, `setPinnedHostUrl`, `clearPinnedHostUrl`.

- [ ] **Step 2: Disable auto `applyLanHostUrlSwitch` in `scanLanHosts`**

When pin set: show toast “Anfitrión fijado: …” instead of switching.  
When unpinned: show suggest toast with Confirm → switch (reuse confirm pattern).

- [ ] **Step 3: Surrogate failover**

`scheduleSurrogateFailoverCheck`: if pin active, skip auto switch; offer confirm dialog.

- [ ] **Step 4: UI checkbox** “Fijar esta Mac como anfitrión del turno” (host role only).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(lan): pinned host URL; confirm before host switch (IM-08)"
```

---

### Task 9: IM-09 — Sync health panel (P2)

**Files:**
- Create: `public/js/lan-sync-diagnostics.mjs`
- Create: `public/js/lan-sync-diagnostics.test.mjs`
- Modify: `public/js/features/lan-sync.mjs` (panel section)
- Modify: `public/js/lan-sync-state.mjs` (phase export)

- [ ] **Step 1: `getLanSyncDiagnostics()`**

Return plain object (no secrets): hostUrl, pingAt, pingStatus, wsSync, wsLive, roomId, phase, bundleRevision, outboxCount, pinnedHost, lastErrors[].

- [ ] **Step 2: Ring buffer for errors**

`recordLanSyncError({ op, code, message })` max 5 — call from failed fetch/WS/auth.

- [ ] **Step 3: UI collapsible** in ⇄ “Estado de sincronización” + button “Copiar informe” (redact bearer).

- [ ] **Step 4: Test** diagnostics redacts `teamCode` / Bearer patterns.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(lan): sync diagnostics panel and support report (IM-09)"
```

---

### Task 10: IM-10 — Confirm inferred auto-join (P2)

**Files:**
- Modify: `public/js/features/lan-sync.mjs` (`saveLanSettingsFromUi`, `resolveAutoJoinRoomId`)

- [ ] **Step 1: Classify join source**

```javascript
function classifyAutoJoinSource() {
  // returns 'membership' | 'url' | 'settings_sala' | 'none'
}
```

- [ ] **Step 2: `saveLanSettingsFromUi`**

If ping ok and source === `settings_sala` and no `sessionStorage['rpc-lan-auto-join-confirmed-' + roomId]` → `confirm()` before `joinLanRoom`.  
Set session flag on confirm.  
`membership` / `url` → join without confirm.  
`createLanRoomFromUi` → still auto-join created room.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(lan): confirm before auto-join from settings sala only (IM-10)"
```

---

### Phase 2 exit criteria

- [ ] Manual QA: two Macs, pin prevents silent switch
- [ ] Diagnostics copy paste works without DevTools

---

## Phase 3 — Maintainability (IM-11 – IM-13)

> **Order:** Do Task 13a before large file split if host DB touches are small; otherwise Task 11 first to reduce merge pain.

### Task 11: IM-11 — Split `lan-sync.mjs` (P3)

**Files:** (create + shrink facade)

| New module | Exports (examples) |
|------------|-------------------|
| `public/js/lan-sync-transport.mjs` | `initLanClientFromStorage`, `lanFetchAuthed`, ping helpers |
| `public/js/lan-sync-room.mjs` | `joinLanRoom`, `leaveLiveSyncRoom`, `reconcileLiveSyncRoom`, `bootLanRoomMembership` |
| `public/js/lan-sync-push.mjs` | `scheduleLiveSyncPush`, `pushClinicalOpsLanNow`, outbox flush |
| `public/js/lan-sync-panel.mjs` | `renderLanPanel`, pairing, IM-03/09 UI |
| `public/js/lan-sync-failover.mjs` | surrogate, pin, `scanLanHosts` |
| `public/js/features/lan-sync.mjs` | `registerLanRuntime`, re-exports, wire listeners |

- [ ] **Step 1: Move code without behavior change** (one module per PR sub-task if needed).

- [ ] **Step 2: Shared state**

Minimal shared bag `lanSyncRuntime.mjs` or pass `deps` object to avoid circular imports:

```javascript
export const lanRuntime = { lanClient, activeLiveSyncRoomId, /* getters */ };
```

- [ ] **Step 3: Verify `app-runtimes.mjs` only imports `./features/lan-sync.mjs`**

- [ ] **Step 4: `npm run metrics` — no new boot-graph imports in `app.js`**

- [ ] **Step 5: Commit per module or one commit**

```bash
git commit -m "refactor(lan): split lan-sync into transport/room/push/panel modules (IM-11)"
```

---

### Task 12: IM-12 — Domain merge registry (P3)

**Files:**
- Create: `public/js/lan-merge-registry.mjs`
- Create: `public/js/lan-merge-registry.test.mjs`
- Modify: `public/js/features/lan-sync.mjs` (`mergeLiveSyncFullBundles`)
- Create: `lan-squad/merge-registry.js` (re-export host merge fns)

- [ ] **Step 1: Registry object** mapping domain → merge fn (spec IM-12).

- [ ] **Step 2: Replace inline merge calls** in `mergeLiveSyncFullBundles` with registry dispatch.

- [ ] **Step 3: Golden tests** — two fixture bundles merge identically before/after refactor.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(lan): domain merge registry for room bundles (IM-12)"
```

---

### Task 13: IM-13 — Host clinical ops in SQLCipher (P3, incremental)

**Sub-phases:**

#### Task 13a: Host writes clinical ops via DB IPC

**Files:**
- Modify: `main.js` (host process DB unlock path)
- Modify: `lib/db/ipc-handlers.mjs` (reuse `dbClinicalOpsMerge` on host)
- Modify: `lan-squad/host-router.js` PUT clinical-ops → DB first, then materialize bundle

- [ ] **Step 1:** Document invariant: host anfitrión must have clinical DB unlocked.

- [ ] **Step 2:** PUT clinical-ops merges to SQLCipher, updates `roomSyncBundles[rid].clinicalOps` cache.

- [ ] **Step 3:** Tests with mock dbManager in host-router test harness.

#### Task 13b: Bundle clinicalOps as cache only

- [ ] **Step 1:** On host boot, rebuild bundle `clinicalOps` from DB export.

- [ ] **Step 2:** Update `resetLanSquadHostState` help text in UI.

- [ ] **Commit:** `feat(lan): host clinical ops authoritative in SQLCipher (IM-13)`

**Out of scope 13c:** Full patient entities on host DB.

---

### Phase 3 exit criteria

- [ ] Each new file ≤600 lines, functions ≤80 lines (Tier 1)
- [ ] `lan-sync.mjs` facade ≤200 lines

---

## Phase 4 — Future forks (IM-14 – IM-16) — NOT in this plan

| ID | Action |
|----|--------|
| IM-14 | New spec: `…-lan-crdt-soap-field-design.md` before any Yjs dependency |
| IM-15 | New spec: P2P mesh; product sign-off required |
| IM-16 | New spec: cloud replication log; depends on IM-13 + IM-05 |

Do not create tasks or PRs for Phase 4 under this plan.

---

## Open questions (resolve in PR 1 of Phase 1)

| # | Question | Default if unresolved |
|---|----------|------------------------|
| Q1 | `livesync:leave` still sends WS full bundle? | **Yes** (peer merge on leave) |
| Q2 | R4/Admin auto-supersede without confirm? | **No** — same confirm as IM-08 |
| Q3 | Host always DB-unlocked when hosting? | **Yes** — document in ⇄ if not |
| Q4 | clinical-ops PUT body limit | **1MB** JSON limit |

Record decisions at top of this plan when closed.

---

## Verification matrix (full program)

| Check | Command / action |
|-------|------------------|
| Unit/integration | `npm test` |
| UI bundle | `npm run build:ui` |
| Debt | `npm run metrics` (≤ baseline) |
| Manual ward | 2 Macs + iPad: join, @usuario, directorio, second iPad link, pin host |
| Conflict | Force 409 on bundle — diff viewer still opens |

---

## Suggested PR sequence

| PR | Tasks | Title |
|----|-------|-------|
| 1 | 1–3 | `fix/feat(lan): Phase 0 profile push + push channels + ticket expiry` |
| 2 | 4–5 | `feat(lan): Phase 1 state machine + HTTP-primary sync` |
| 3 | 6–7 | `feat(lan): Phase 1 SQL outbox + clinical-ops endpoint` |
| 4 | 8–10 | `feat(lan): Phase 2 pin host + diagnostics + auto-join confirm` |
| 5 | 11–12 | `refactor(lan): Phase 3 module split + merge registry` |
| 6 | 13a–b | `feat(lan): Phase 3 host clinical ops in DB` |

---

## Changelog (plan maintenance)

When Phase 1 ships, add to `project-context.mdc`:

```markdown
- **YYYY-MM-DD** `lan-sync-v2`: SQL outbox, clinical-ops route, sync phase FSM; `lan-sync-state.mjs`, schema v9.
```
