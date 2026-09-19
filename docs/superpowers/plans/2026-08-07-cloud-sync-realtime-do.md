# Cloud Sync Realtime (Room DO + WebSocket) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Replace aggressive HTTP polling with **push → DO signal → peer pull** on Workers Free, and **relax poll intervals** when WebSocket transport is healthy.

**Architecture:** `RoomSyncHub` Durable Object per `roomId`; Worker RPC after `commitMutationBatch`; client `room-sync-ws.mjs` triggers existing `pullLatest` / `syncCycle`; poll scheduler reads transport state for relaxed vs fallback timings.

**Tech Stack:** Cloudflare Workers + Durable Objects (SQLite), Wrangler `durable_objects` binding, existing `sync-runtime-cycle.mjs`, `npm run test:one`, Miniflare/worker tests.

**Spec:** [`../specs/2026-08-07-cloud-sync-realtime-do-design.md`](../specs/2026-08-07-cloud-sync-realtime-do-design.md)

---

## File map

| Path | Role |
|------|------|
| `cloud/sync-worker/src/room-sync-hub.js` | DO class: WS accept, broadcast, hibernation |
| `cloud/sync-worker/src/room-sync-hub.test.js` | DO unit tests |
| `cloud/sync-worker/src/sync.js` | Call `notifyRevision` after commit |
| `cloud/sync-worker/src/routes.js` | `GET .../rooms/:id/live` WS upgrade |
| `cloud/sync-worker/wrangler.toml` | `[[durable_objects.bindings]]` |
| `public/js/features/cloud-sync/room-sync-ws.mjs` | Client WS transport |
| `public/js/features/cloud-sync/room-sync-ws.test.mjs` | Client transport tests |
| `public/js/features/cloud-sync/cloud-sync-timing.mjs` | Relaxed + fallback constants |
| `public/js/features/cloud-sync/sync-runtime-schedule.mjs` | Transport-aware poll delays |
| `public/js/features/cloud-sync/sync-runtime-cycle.mjs` | Wire WS lifecycle to runtime |
| `public/js/features/cloud-sync/panel-conexion-runtime.mjs` | Start/stop WS with runtime |
| `public/js/features/cloud-mobile/runtime.mjs` | Same WS for mobile |
| `cloud/sync-worker/scripts/estimate-free-tier.mjs` | `REALTIME=1` scenario |

---

### Task 1: Worker — RoomSyncHub DO

**Files:** Create `room-sync-hub.js`, modify `wrangler.toml`, `index.js` export

- [ ] **Step 1:** Add DO binding in `wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "ROOM_SYNC_HUB"
class_name = "RoomSyncHub"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["RoomSyncHub"]
```

- [ ] **Step 2:** Implement `RoomSyncHub` with hibernatable WebSockets, `notifyRevision` RPC, `hello` on connect.

- [ ] **Step 3:** Export class from `index.js` (`export { RoomSyncHub }`).

- [ ] **Step 4:** Tests — broadcast, ignore stale revision, auth handoff stub.

- [ ] **Step 5:** `npm run test:one -- cloud/sync-worker/src/room-sync-hub.test.js`

---

### Task 2: Worker — notify after push + WS route

**Files:** `sync.js`, `routes.js`

- [ ] **Step 1:** In `commitMutationBatch` success path, RPC room DO `notifyRevision`.

- [ ] **Step 2:** Add `GET /api/sync/v1/rooms/:roomId/live` — member check, forward upgrade to DO.

- [ ] **Step 3:** Tests — push mock env with DO, assert notify called.

- [ ] **Step 4:** `npm run test:one -- cloud/sync-worker/src/sync.test.js` (or new route test)

---

### Task 3: Client — `room-sync-ws.mjs`

**Files:** Create `room-sync-ws.mjs`, `room-sync-ws.test.mjs`

- [ ] **Step 1:** Build WS URL from `getCloudSyncUrl()` + `roomId` + Bearer (subprotocol or query — prefer header via Worker if needed; else `?` token only if WS API requires).

- [ ] **Step 2:** Parse `revision` frames; invoke `onRevision(revision)` callback.

- [ ] **Step 3:** Reconnect with backoff (1s → 30s cap); set transport `ws` / `poll`.

- [ ] **Step 4:** Close on `stop()`, `visibility hidden`, logout.

- [ ] **Step 5:** Register test in `package.json` manifest; `npm run test:one -- public/js/features/cloud-sync/room-sync-ws.test.mjs`

---

### Task 4: Timing — relaxed poll when WS healthy

**Files:** `cloud-sync-timing.mjs`, `cloud-sync-timing.test.mjs`, `sync-runtime-schedule.mjs`

- [ ] **Step 1:** Add constants:

```js
export const CLOUD_POLL_IDLE_WS_MS = 90_000;
export const CLOUD_POLL_MOBILE_IDLE_WS_MS = 60_000;
export const CLOUD_POLL_ACTIVE_WS_MS = 30_000;
export const CLOUD_POLL_IDLE_FALLBACK_MS = 20_000;
export const CLOUD_POLL_MOBILE_IDLE_FALLBACK_MS = 25_000;
export const CLOUD_POLL_ACTIVE_FALLBACK_MS = 8_000;
```

- [ ] **Step 2:** Extend `nextCloudPollDelayMs({ transport: 'ws' | 'poll' | 'offline' })`.

- [ ] **Step 3:** Scheduler accepts `getTransportState` from runtime.

- [ ] **Step 4:** Update tests for all three transport modes.

---

### Task 5: Runtime integration

**Files:** `sync-runtime-cycle.mjs`, `panel-conexion-runtime.mjs`, `cloud-mobile/runtime.mjs`

- [ ] **Step 1:** Start WS client when runtime starts; stop on `runtime.stop()`.

- [ ] **Step 2:** On revision signal: if `revision > getRevision()`, `void syncCycle()` (coalesce inflight).

- [ ] **Step 3:** Pass `getTransportState` into poll scheduler.

- [ ] **Step 4:** `npm run test:one -- public/js/features/cloud-sync/sync-runtime-cycle.test.mjs`

---

### Task 6: Diagnostics UI (optional but recommended)

**Files:** `panel-cloud-diagnostics.mjs`, `cloud-sync-diagnostics.mjs`

- [ ] **Step 1:** Show transport chip: `Nube · WS` vs `Nube · Poll`.

- [ ] **Step 2:** Trace last WS revision signal timestamp.

---

### Task 7: Estimator + docs

**Files:** `estimate-free-tier.mjs`, `features-index.md`, `cloud/sync-worker/README.md`

- [ ] **Step 1:** Add `REALTIME=1` path to estimator (WS + 90s safety poll).

- [ ] **Step 2:** README § Realtime transport + Free tier note (DO on Free).

- [ ] **Step 3:** Link spec in `docs/features/features-index.md`.

- [ ] **Step 4:** `npm run estimate:free`, `REALTIME=1 npm run estimate:free`, `CONCURRENT=60 REALTIME=1` — document 60-user ceiling vs stress.

---

### Task 8: Build + manual QA

- [ ] **Step 1:** `npm run build:ui` + `npm run build:cloud-mobile`

- [ ] **Step 2:** Manual — two Macs, same room, edit censo field → peer < 2 s

- [ ] **Step 3:** Kill WS (block in devtools) → fallback poll within 20 s

- [ ] **Step 4:** `npm run metrics:check` on touched Tier-1 files

---

## Commit sequence (suggested)

1. `feat(sync-worker): RoomSyncHub DO + live WS route`
2. `feat(cloud-sync): room WS client + relaxed poll when connected`
3. `docs(cloud-sync): realtime DO spec + plan; update features index`
