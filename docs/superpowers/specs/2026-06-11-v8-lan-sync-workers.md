# LAN Sync Web Workers — Non-Blocking UI

**Date:** 2026-06-11  
**Target Release:** v8.0.1  
**Status:** Spec (revised)  
**Timeline:** 3–4 weeks (includes profiling gate)  
**Depends on:** `2026-06-03-lan-sync-improvements-design.md` (Phases 0–3 shipped), `2026-06-03-lan-conflict-lww-design.md`, `features/lan/orchestrator.mjs`, `features/lan/push.mjs`, `lan-delta-client.mjs`  
**Explicitly out of scope:** WebRTC / P2P mesh (IM-15), CRDT (IM-14), cloud replication (IM-16)

## Overview

Move LAN sync operations (network I/O, data reconciliation, conflict resolution) to dedicated Web Workers so the main thread stays responsive. Users won't see UI freezes during patient data sync, lab updates, or censo reconciliation on slow networks.

## Phase 0: Profiling gate (required before worker work)
**Goal:** Confirm main-thread cost is in merge/serialize, not already-async network I/O.
**Instrumentation (dev builds):**
- `performance.mark` / `measure` around:
  - `mergeLiveSyncFullBundles` / registry merge (`lan-merge-registry.mjs`)
  - `applyLwwConflictLocally` and bundle apply in `orchestrator.mjs`
  - Post-reconcile UI refresh (`refreshAllTodoUIs`, census/board repaints)
  - `localStorage` / SQLCipher IPC writes triggered by sync apply
**Acceptance to proceed:**
- At least one journey shows **Long Task > 50ms** on main thread during reconcile or apply, **or**
- Documented evidence that jank is from DOM repaint (→ pair worker with targeted UI updates, not worker-only)
**If profiling shows network wait only:** defer worker; optimize debounce, delta-first, and repaint scope instead.
**Deliverable:** `docs/logs/v8-lan-sync-profile-<date>.md` with median/p95 timings on a 10+ patient bundle reconcile.

## Problem

Perceived UI freezes during LAN sync are likely caused by a mix of:
1. **CPU on main thread** — JSON parse, bundle merge, LWW reconciliation, patch application
2. **Main-thread storage** — `localStorage` and SQLCipher IPC after merge
3. **DOM repaint** — census/board/todo refresh after reconcile
Network I/O (`fetch`, WebSocket) is already async; moving only fetch to a worker does not fix (2) or (3).
**Hypothesis (to validate in Phase 0):** merge + apply on large bundles causes 50ms–500ms+ main-thread long tasks; worker offload reduces long tasks during sync by ≥ 80% on the reconcile path.

## Success Criteria

- **UI never blocks** during LAN sync operations
- **Sync completes in background** while user interacts with app
- **Optimistic updates** show results immediately
- **Rollback on conflict** (rare) with non-blocking toast
- **No functionality loss** — all existing sync behavior preserved
- **Works with existing host/client and P2P modes**

## Architecture

### Worker Structure

```
public/js/workers/
├── lan-sync-worker.mjs          (main orchestrator)
├── lan-sync-reconcile.mjs        (LWW merge logic)
└── lan-sync-protocol.mjs         (network I/O)
```

### Responsibilities
**Worker thread (compute + network orchestration):**
- HTTP/WS request scheduling (existing endpoints; no protocol rewrite)
- JSON parse/stringify of sync payloads
- Bundle merge and LWW reconciliation (pure functions; no DOM/storage)
- Delta/command payload assembly before send
- Returns **patch descriptors**, not full app state
**Main thread (authority + UI):**
- User input and optimistic UI
- Apply patches to **authoritative stores** (`localStorage`, SQLCipher via IPC)
- Targeted UI updates (patient scope, todo scope, census revision bump)
- Worker lifecycle, health, restart
- Toasts via existing `lan-lww-toast.mjs` on overwrite
**Hard rule:** Workers MUST NOT access DOM, `window`, SQLCipher, or Electron IPC. All persistence stays on main.

### Data Flow

```
User Action
    ↓
Main Thread updates UI optimistically
    ↓
Main Thread sends {action, payload} to worker via postMessage
    ↓
Worker performs network I/O (sync with peers/host)
    ↓
Worker reconciles conflicts (LWW)
    ↓
Worker sends final state back to main thread via postMessage
    ↓
Main Thread applies to localStorage
    ↓
Main Thread re-renders affected components
    ↓
Toast confirms success (or rolls back on error)
```

### Communication Protocol

**Main → Worker:**
```javascript
{
  type: 'sync_mutation',
  mutation: {
    kind: 'patient_upsert' | 'note_save' | 'lab_add' | 'todo_create' | ...,
    payload: { ... },
    optimisticId: string  // for rollback tracking
  }
}
```

**Worker → Main:**
```javascript
{
  type: 'sync_complete',
  optimisticId: string,
  result: {
    ok: boolean,
    state: { ... },  // final reconciled state
    conflict?: boolean,
    conflictDetails?: string
  }
}
```

## Implementation Details

### Optimistic Updates

1. User action → UI updates immediately with optimistic state
2. Worker syncs in background (may take 100ms-2s)
3. Worker confirms → toast "Saved" (success)
4. On conflict → toast "Update overwritten by team" + rollback to server state

**No spinners during sync** — updates are silent unless there's an error.

### Conflict Resolution

- Use Last-Write-Wins (LWW) on `updatedAt` timestamp
- If two users edit simultaneously, last write wins
- Both users see the final state (no data loss, deterministic)
- Toast notification: "Dr. Smith's changes took precedence"

### Error Handling

Worker crashes → Main thread detects timeout, restarts worker
- Timeout threshold: 5 seconds for any sync operation
- Main thread falls back to localStorage state
- Toast: "Sync offline; will retry when connected"

## API (Main Thread)

```javascript
// Start/stop worker
initLanSyncWorker()
terminateLanSyncWorker()

// Send mutation to worker
postSyncMutation(mutation)

// Handle worker response
onSyncComplete(callback)

// Check worker health
isSyncWorkerHealthy()
```

## Backward Compatibility

- Existing `emitLiveSyncTodoUpsert`, `emitLiveSyncTodoDelete` functions unchanged
- Worker handles protocol translation internally
- No changes to storage format or LAN room format
- Existing clients without workers can still connect

## Testing

**Unit Tests (Worker Isolation):**
- Reconciliation logic (LWW conflict resolution)
- Serialization/deserialization edge cases
- Protocol encoding/decoding

**Integration Tests (Main + Worker):**
- Optimistic update roundtrip (action → worker → main)
- Conflict detection and rollback
- Worker crash and restart
- Timeout and fallback

**E2E Tests (Real Sync):**
- Multi-device sync (3+ devices)
- Simultaneous mutations on same patient
- Network latency simulation (slow networks)
- Worker performance under load (100+ pending mutations)

## Performance Budgets

- Worker startup: < 50ms
- Per-mutation processing: < 100ms
- UI thread blocked: 0ms (worker runs independently)
- Main thread can render at 60fps during worker sync

## Open Questions

None — design is complete.

## Next Steps

1. User reviews and approves this spec
2. Create implementation plan
3. Implement and test
