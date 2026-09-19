# Plan: Nube outbox pacing, durability, and honest status

Date: 2026-09-12. Author: CEO planner (Fable). Executor: Lead (Sonnet) with Dev (Haiku).

## Goal

After an outage, Nube drains its backlog without overloading D1, without losing any queued op, and with a status chip that tells the truth. Keep the LWW-per-path model. No CRDT.

## Constraints

- Cloudflare Worker + D1 free tier. D1 queues requests; a burst of back-to-back pushes overloads it.
- Worker limits: 16 ops per push (`cloud/sync-worker/src/quotas.js:28`); 120 pushes per room per 60 s (`cloud/sync-worker/src/mutation-guard.mjs:18-34`).
- Medical data. Never drop an unsent op. Never delete queued data to "unblock" storage.
- No new dependency. Spanish UI copy. Do not reduce `#connection-dropdown` width.
- Renderer edits: `public/js/**/*.mjs`, then `npm run build:ui`. Schema: bump in `lib/db/schema.mjs`, test in `lib/db/schema.test.mjs`. Tests: `npm run test:one -- <file>`, never bare `node --test` for DB.
- Commits signed by the owner. No attribution trailers.

## Problem statement (verified in code; corrections to the original brief)

The burst is real. Five facts change the fix:

1. **The desktop outbox is in memory, not localStorage.** `public/js/features/cloud-sync/panel-conexion-runtime.mjs:17-26` creates `withTombstoneCoalesce(createMemoryOutbox())` and deletes the legacy localStorage key on every start. `outbox.mjs` (localStorage default, `mergeOpsByPath`) is not on the desktop path. `cloud-mobile/outbox-memory.mjs:14-30` replaces a row wholesale on re-enqueue (no per-path merge) and has no `enqueueMany`. An app restart during an outage loses the queue. Pending patient deletes (tombstones, `mutate-bridge.mjs:499-507`) live only in that queue.
2. **The backlog is bounded by ward size, not by outage time.** Every edit re-collects ALL patients (`cloud-census-collect.mjs:95-99`, no dirty filter) into the single `cloud-room-push` row. The row is ~319 ops with or without an outage. The echo guard (`cloud-op-slim.mjs:183`, `cloud-sync-echo-guard.mjs`) trims the wire payload to `(path, updatedAt)` pairs never attempted. During an outage nothing is marked attempted, so the first drain sends the whole delta.
3. **D1 overload is misclassified.** Worker catch at `cloud/sync-worker/src/worker-app.mjs:76-82` returns HTTP 500 `{error:'internal_error', message:'D1_ERROR: D1 DB is overloaded...'}`. Client `isCloudTransientServerError` (`cloud-sync-timing.mjs:74-77`) accepts only 502/503/504. Result: no in-chunk retry, whole cycle fails, status `error`, backoff 30 s to 5 min. No `Retry-After` header exists anywhere in the Worker.
4. **Whole-row ack and reused wire ids can lose ops.** `sync-runtime-pull-push.mjs:280` removes the entire row after all chunks succeed; ops merged into the row while a 20-chunk drain is in flight are deleted unsent. Also, the chunk wire id is `<id>:<enqueuedAt+i>:c<i>` (`push-mutation-id.mjs`, `pull-push.mjs:238-249`). After a mid-drain failure with no new edits, the next cycle re-cuts the remaining ops and sends them as `c0` again. The Worker dedupes on `(room_id, client_mutation_id)` (`sync.js:478-480, 380`) and returns the cached response for the old `c0`; the new ops are not applied but the client marks them attempted. Probable silent loss until the next edit of those paths. Lead confirms with a test.
5. **No jitter, no pacing, blind chip.** Backoff is deterministic (`cloud-sync-timing.mjs:47-50`). Chunks go back to back (`pull-push.mjs:235-255`), each one D1 batch of 3+ statements (`sync.js:364`). `pendingCount()` counts rows, not ops (`sync-runtime-cycle.mjs:24-26`). The chip shows only `Pendiente` (`panel-conexion-html.mjs:9-15`). `lastPushAt` exists (`cloud-sync-diagnostics.mjs:25`) but only in the expanded diagnostics.

Idempotency is otherwise sound: ops are LWW by `(path, updatedAt)` on the Worker; an exact re-send is harmless. Only the reused-id case in fact 4 is not.

## Design principles adopted (sourced)

| Principle | Source | Why it applies here |
|---|---|---|
| Resumable upload: ack progress in pieces, resume from the last ack | Drive desktop chunked/resumable uploads — https://9to5google.com/2025/01/10/google-drive-desktop-upload/ | Fixes fact 4. Ack per chunk; the row shrinks as it drains. |
| Send deltas, not the full object | Drive differential uploads (same source); Drive changes API pulls deltas since last revision — https://workspaceupdates.googleblog.com/2021/02/google-drive-for-desktop-sync-solutions-update.html | Move the existing wire-time delta filter to enqueue time so the persisted row is the delta too. |
| Congestion control: additive increase, multiplicative decrease (AIMD/TCP) | https://en.wikipedia.org/wiki/Additive_increase/multiplicative_decrease , https://witestlab.poly.edu/blog/tcp-congestion-control-basics/ | Chunk size and gap react to overload signals, then recover gradually — matches how real live-sync/network systems pace themselves. |
| Back off on rate-limited errors, fail fast on permanent ones; cap batch size | Firestore offline persistence and batch-write docs (Firebase) | Overload gets a short paced retry; 4xx surfaces at once. |
| Exponential backoff with jitter | Brooker, AWS — https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ | All clients on a ward reconnect on the same clock. Jitter spreads the burst instead of clustering retries. |
| Classify errors: unreachable vs overloaded vs permanent | Offline-first consensus — https://www.back4app.com/glossary/offline-first-data-sync/ | Fixes fact 3. |
| Make the server say what it means; design away invalid states | Dropbox Nucleus — https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine | Worker returns 503 + `Retry-After` on D1 overload. Wire ids unique per attempt. |
| Single control path; only I/O is concurrent | Dropbox — https://dropbox.tech/infrastructure/-testing-our-new-sync-engine | Keep chunk pushes sequential. D1 is the bottleneck; parallel pushes make it worse. |
| Pending sync state lives in a real local database, not browser storage | Drive/Dropbox client design — https://intervu.dev/blog/file-storage-dropbox-google-drive-system-design/ ; PouchDB adapter ranking — https://pouchdb.com/faq.html | Fixes fact 1. Outbox rows go into SQLCipher, the database R+ already uses for everything else. |

## Rejected as overkill

- **CRDT / OT rewrite.** The failure is transport pacing and durability, not merge semantics.
- **Dropbox three-tree planner.** `mergeOpsByPath` already yields the minimal op set for ~300 paths.
- **Byte-level resumable uploads.** Chunks are at most 180 KB. Chunk-level ack is the right grain.
- **Parallel chunk pushes.** More D1 load, not less.
- **Splitting the row into many rows at enqueue.** Per-chunk ack gives the same result with no change to every enqueue path.
- **Census dirty tracking at collect time.** Delta-at-enqueue (item 8) makes it unnecessary.
- **A "never delete on localStorage quota" stopgap.** Dropped — that code path is dead on desktop (fact 1). Phase 4 is the real fix.

## Proposed changes

Four phases. Phases 1-3 are one PR each, in order. Phase 4 is its own PR after Phase 3. Nothing in Phases 1-3 depends on Phase 4; Phase 4 does not gate them.

### Phase 1: classify errors, add jitter, fix the Worker

1. **Client error classes.** `public/js/features/cloud-sync/cloud-sync-timing.mjs`. `isCloudTransientServerError`: also true for status 500 or 503 when the message matches `/overloaded|queued for too long|SQLITE_BUSY/i`. Add `isCloudPermanentError(err)`: status in {400, 401, 403, 404, 413, 426}, or 409 that is not `revision_stale`/`conflict`. `retryAfterMsFromError`: honor the header on 503 too. Test: `cloud-sync-timing.test.mjs`.
2. **Read `Retry-After` on 503.** `public/js/features/cloud-sync/api-client.mjs:18-23`. Extend the `429` condition to `429 || 503`.
3. **Jitter.** `cloud-sync-timing.mjs` `nextCloudPollDelayMs` error branch: equal jitter, `exp/2 + random() * exp/2`, so the wait is never 0. Accept an optional `random` for tests. Add `jitterMs(baseMs, random)` and reuse it in the pacer (item 5).
4. **Worker says 503 on D1 overload.** `cloud/sync-worker/src/d1-errors.js`: add `isD1OverloadError(err)` (same regex as item 1) + test in `d1-errors.test.js`. `cloud/sync-worker/src/worker-app.mjs:76-82`: when overload, respond 503 `{error:'overloaded', message}` with header `Retry-After: 5`. `cloud/sync-worker/src/errors.js` `syncErrorStatus`: `overloaded` maps to 503. Also set `Retry-After: 10` on the 429 from `mutation-guard.mjs`. Item 1 keeps old Workers safe.

### Phase 2: adaptive drain, per-chunk ack, delta at enqueue

5. **AIMD pacer.** `cloud-sync-timing.mjs`. Constants: `CLOUD_CWND_MAX_OPS = 16`, `CLOUD_CWND_MIN_OPS = 4`, `CLOUD_CHUNK_GAP_MIN_MS = 250`, `CLOUD_CHUNK_GAP_MAX_MS = 8_000`, `CLOUD_DRAIN_MAX_CONGESTION_EVENTS = 6`. `createDrainPacer({ random })` returns `{ chunkOps(), gapMs(), onClean(), onCongested(err) }`. State: `cwnd = 16`, `gap = 250`. `onClean()`: `cwnd = min(16, cwnd + 1)`; `gap = max(250, gap - 250)`. `onCongested(err)`: `cwnd = max(4, floor(cwnd / 2))`; `gap = min(8000, max(gap * 2, retryAfterMsFromError(err, 0)))`. `gapMs()` returns `jitterMs(gap)`. Export one module-level instance `cloudDrainPacer`; the outbox drain and the direct push share it because they hit the same D1. State persists for the session; it never resets to 16 on a new cycle (TCP keeps cwnd across segments). Floor is 4, not 2: 319 ops / 2 = 160 pushes, above the 120-per-minute room limit, which would turn every big drain into a 429 storm; 319 / 4 = 80 stays under it. Test: `cloud-sync-timing.test.mjs` (halve on error, +1 per clean, floor/ceiling, Retry-After wins over doubled gap).
6. **One drain loop, dynamic chunk size, unique wire ids.** `public/js/features/cloud-sync/cloud-push-direct.mjs`. `chunkCloudOps(ops, maxOps = MAX_OPS_PER_CHUNK)`: add the second parameter; byte cap and lab cap still apply. New `drainCloudOps({ ops, sendChunk, onChunkAcked, onProgress, pacer = cloudDrainPacer })`:
   - Loop while `remaining.length`: `chunk = chunkCloudOps(remaining, pacer.chunkOps())[0]`; `attempt += 1`; `result = await sendChunk(chunk, attempt)`.
   - On error: if `isCloudBackoffError(err)` and `congestionEvents < CLOUD_DRAIN_MAX_CONGESTION_EVENTS`: `pacer.onCongested(err)`, `await delay(pacer.gapMs())`, continue (the same ops get re-cut smaller on the next pass). Otherwise throw (permanent, stale exhausted, or too many congestion events; the cycle-level backoff takes over).
   - On success: `pacer.onClean()`, `remaining = remaining.slice(chunk.length)`, `await onChunkAcked(chunk, result)`, `onProgress?.(sent, total)`, and if `remaining.length` then `await delay(pacer.gapMs())`.
   - Wire id: `sendChunk` receives `attempt`; the id becomes `${resolveCloudPushMutationId(item)}:a${attempt}:${Date.now()}`. Unique per attempt, so a re-cut chunk never collides with a cached Worker response (fact 4). An exact re-send after a lost ack is still harmless by LWW.
   - `pushCloudOpsDirect` uses `drainCloudOps`; delete `pushChunkWithRetry`, `DIRECT_PUSH_TRANSIENT_*`. Test: `cloud-push-direct.test.mjs` with injected `delay` and `pacer`.
7. **Per-chunk ack in the outbox path.** `public/js/features/cloud-sync/outbox.mjs`: add `removeOps(clientMutationId, ops)` that drops the row's ops matching `(path, updatedAt)` and deletes the row when empty. Mirror it in `cloud-mobile/outbox-memory.mjs`. `sync-runtime-pull-push.mjs` `pushWithStaleRetry`: call `drainCloudOps` with `sendChunk = pushSingleWithStaleRetry` (keep the 409 stale retry inside it; delete its transient loop and `PUSH_TRANSIENT_*`) and `onChunkAcked` = `outbox.removeOps(item.clientMutationId, chunk)` + `noteCloudOpsAttempted` + `recordRejectedCloudOps` + `applyServerRevision` + `noteCloudLabSidecarOpsSent` + `needPull`. `flushOutboxItem:280`: replace `outbox.remove(id)` with `outbox.removeOps(id, item.ops)` so ops merged mid-flight survive and sanitizer-dropped ops leave the row. Do not change `enqueuedAt` semantics. Tests: `outbox.test.mjs`, `outbox-memory.test.mjs`, `sync-runtime-cycle-flush.test.mjs` (mid-flight enqueue survives; failure at chunk 2 leaves only unsent ops; second cycle never reuses an id).
8. **Delta at enqueue.** `cloud-sync-echo-guard.mjs`: add `filterCloudOpsNotAttempted(ops)` that reads the index once (today `wasCloudOpAlreadyAttempted` parses localStorage per op). Use it in `outbox-lab.mjs` `prepareOutboxOpsForEnqueue:210-214` and in `cloud-op-slim.mjs:183`. Tests: `cloud-sync-echo-guard.test.mjs`, `outbox-lab.test.mjs`.
9. **Overload backoff cap 2 min.** `sync-runtime-schedule.mjs` `noteFailure`: for `isCloudBackoffError(err)`, cap the jittered delay at `CLOUD_POLL_ERROR_OVERLOAD_MAX_MS = 120_000` and call `cloudDrainPacer.onCongested(err)`. Unreachable (status 0) and permanent errors keep the 5 min cap. Test: new `sync-runtime-schedule.test.mjs` (add to `package.json` `scripts.test`).

### Phase 3: honest status

10. **Status detail.** `sync-runtime-cycle.mjs` `createOutboxSync`: add `pendingOpsCount()` (sum of row op lengths). `refreshIdleStatus`: when pending, detail `N cambios sin enviar`; when `lastPushAt` (from `cloud-sync-diagnostics.mjs`) is older than 2 min, append ` · último envío hace X min`. Pass `onProgress` from item 6 up to `setStatus('syncing', 'Enviando k/n cambios')`. `failCycle` (`sync-runtime-cycle.mjs:195-199`): for backoff-class errors with pending > 0, set status `pending` with the existing "Servidor Nube saturado" text, not `error`. `panel-conexion-html.mjs` `formatCloudStatusChipLabel`: append detail for `pending` and `syncing`. Tests: `sync-runtime-cycle.test.mjs`, `panel-conexion-html.test.mjs`.

### Phase 4: outbox in SQLCipher (own PR, after Phase 3)

11. **Schema.** `lib/db/schema.mjs` bump `SCHEMA_VERSION` 26 to 27 following the existing migration pattern (`lib/db/schema-primitives.mjs:1`). New table: `cloud_outbox (room_id TEXT NOT NULL, client_mutation_id TEXT NOT NULL, ops_json TEXT NOT NULL, base_revision INTEGER, enqueued_at INTEGER NOT NULL, PRIMARY KEY (room_id, client_mutation_id))`. Not `clinical_blob` — that table is exported and projected (`lib/db/recover-census-export.mjs`, `lib/clinical-repo/**`); queue rows must not leak into exports. Test: `lib/db/schema.test.mjs`.
12. **Main-process lib + IPC.** New `lib/db/cloud-outbox.mjs`: `loadCloudOutbox(db, roomId)`, `replaceCloudOutbox(db, roomId, rows)` (one transaction: `DELETE WHERE room_id = ?` then `INSERT` each row), `clearCloudOutbox(db, roomId)` + `lib/db/cloud-outbox.test.mjs` (Electron Node). Register three handlers with `bindIpcHandler` in `lib/db/ipc-handlers-register-core.mjs`: `db:cloud-outbox-load`, `db:cloud-outbox-replace`, `db:cloud-outbox-clear`. Expose in `preload.js` as `cloudOutboxLoad({ roomId })`, `cloudOutboxReplace({ roomId, rows })`, `cloudOutboxClear({ roomId })`.
13. **Renderer adapter, sync API kept.** New `public/js/features/cloud-sync/outbox-sqlcipher.mjs` exporting `createSqlcipherOutbox({ getRoomId })`. It builds `createOutbox({ load: () => mirror, save: (rows) => { mirror = rows; persist(); } })` from `outbox.mjs`, so `list/enqueue/enqueueMany/remove/removeOps/replaceAll/clear/pendingCount` stay synchronous and `mergeOpsByPath` semantics return to desktop (fact 1). Rules:
    - `hydrated = false` until `hydrate()` resolves; `persist()` is a no-op before that (marks `dirty` only) so an early enqueue can never overwrite DB rows that are not loaded yet.
    - `hydrate(roomId)`: read `localStorage[OUTBOX_STORAGE_KEY]` (legacy, may be empty), read DB rows via `cloudOutboxLoad`, snapshot the mirror, then `replaceAll(legacyRows)`, `enqueueMany(dbRows)`, `enqueueMany(snapshot)` (newest last, newer ops win per path), then `localStorage.removeItem(OUTBOX_STORAGE_KEY)`, set `hydrated = true`, `persist()`. Re-hydrate when `roomId` changes.
    - `persist()`: coalesced write-through. One in-flight IPC at a time; if a save arrives while one is in flight, set `dirty` and write again when it settles. On IPC failure: `recordCloudSyncError({ op: 'outbox', code, message })`, keep `dirty`, retry on the next save. The mirror is always the source of truth for the session.
    - `ponytail:` the last write can be lost if the app quits inside one debounce window; upgrade path is a `before-quit` flush.
    - `ponytail:` replace-all per save; upgrade path is per-row upsert if diagnostics show write time above ~50 ms.
14. **Wire it.** `panel-conexion-runtime.mjs:17-26`: `ensureSharedOutbox` returns `withTombstoneCoalesce(createSqlcipherOutbox({ getRoomId }))`; delete the `localStorage.removeItem` there (hydrate owns it). In the async IIFE, `await sharedOutbox.hydrate(roomId)` before the first `syncCycle()`. Delete `autostart.mjs:35` (`localStorage.removeItem(OUTBOX_STORAGE_KEY)`); rows stay in the DB keyed by room and push when that room is joined again. Do not clear on logout — dropping queued clinical ops is the thing we never do. Only admin purge flows may call `cloudOutboxClear`. Remove the localStorage default from `outbox.mjs` once hydrate is the only reader of `OUTBOX_STORAGE_KEY`. Check whether `withTombstoneCoalesce` forwards `enqueueMany` and `removeOps`; add them if not.
    Tests: `outbox-sqlcipher.test.mjs` (mock `globalThis.window.electronAPI` like `public/js/clinical-repo-sync-drain.test.mjs:18-46`): enqueue before hydrate does not write; hydrate merges legacy + DB + mirror with newest winning; coalesced persist issues one IPC per settle; IPC failure keeps dirty. Add the file to `package.json` `scripts.test`.

Out of scope: WebSocket 1006 fallback behavior; census dirty tracking at collect time.

## Task list

**Dev (Haiku), background, `isolation: "worktree"`, no overlap with Lead files:**
- Phase 1: items 1-4 and their tests. `npm run test:one -- public/js/features/cloud-sync/cloud-sync-timing.test.mjs`; Worker suite from `cloud/sync-worker`.
- Phase 2 support: item 8 (`cloud-sync-echo-guard.mjs`, `outbox-lab.mjs`, `cloud-op-slim.mjs` + tests) and the `outbox-memory.mjs` mirror of `removeOps` + test.
- Phase 4 support: item 11 schema + `schema.test.mjs`; item 12 `lib/db/cloud-outbox.mjs` + test.

**Lead (Sonnet), `isolation: "worktree"`:**
- Phase 2: items 5-7, 9. Confirm fact 4 with a failing test before the fix.
- Phase 3: item 10.
- Phase 4: items 12 (IPC + preload), 13, 14.
- After each phase: `npm run build:ui`, `npm run metrics:check`, then verify live in the running `npm start` Electron app (not "R+ Cardio"): stop the Worker or set devtools offline, make 10 census edits, 5 pendientes, 1 patient delete; reconnect; watch the chip show `N cambios sin enviar` then `Enviando k/n cambios`; confirm the Conexión panel shows no `internal_error`; in Phase 4 also quit and relaunch mid-outage and confirm the queue survives. Clear `Cache`, `Code Cache`, `GPUCache` under the r-plus userData dir if the bundle looks stale.
- Same turn as each ship: update the row in `docs/core/20-claude-code-handoff.md`; flip the `PLAN.md` task.

## Files to touch

Client (`public/js/features/cloud-sync/`): `cloud-sync-timing.mjs`, `api-client.mjs`, `sync-runtime-schedule.mjs`, `sync-runtime-cycle.mjs`, `sync-runtime-pull-push.mjs`, `cloud-push-direct.mjs`, `outbox.mjs`, `outbox-lab.mjs`, `cloud-sync-echo-guard.mjs`, `cloud-op-slim.mjs`, `panel-conexion-html.mjs`, `panel-conexion-runtime.mjs`, `autostart.mjs`, new `outbox-sqlcipher.mjs`; plus `public/js/features/cloud-mobile/outbox-memory.mjs`. Colocated tests: `cloud-sync-timing.test.mjs`, `cloud-push-direct.test.mjs`, `outbox.test.mjs`, `outbox-lab.test.mjs`, `cloud-sync-echo-guard.test.mjs`, `sync-runtime-cycle.test.mjs`, `sync-runtime-cycle-flush.test.mjs`, `panel-conexion-html.test.mjs`, `outbox-memory.test.mjs`, new `sync-runtime-schedule.test.mjs`, new `outbox-sqlcipher.test.mjs`.

Main process: `lib/db/schema.mjs`, `lib/db/schema-primitives.mjs`, `lib/db/schema.test.mjs`, new `lib/db/cloud-outbox.mjs` + test, `lib/db/ipc-handlers-register-core.mjs`, `preload.js`, `package.json` (scripts.test).

Worker (`cloud/sync-worker/src/`): `d1-errors.js` + `d1-errors.test.js`, `worker-app.mjs`, `errors.js`, `mutation-guard.mjs` (Retry-After on 429).

## Decisions: locked

1. **Drain pacing: adaptive AIMD** (items 5, 6). Chunk size 16 to 4 with halving on congestion, +1 per clean chunk; gap 250 ms to 8 s with doubling on congestion, -250 ms per clean chunk; jittered; `Retry-After` wins. Floor is 4 ops because of the 120-per-minute room limit.
2. **Overload backoff cap: 2 min** (item 9). Unreachable and permanent errors keep 5 min.
3. **Outbox storage: SQLCipher via the Electron main process** (items 11-14), as its own PR after Phase 3. Synchronous renderer API kept via an in-memory mirror with coalesced write-through; hydrate merges legacy localStorage + DB + mirror, newest wins; persist is gated until hydrate completes; no clearing on logout.
4. **Worker fix ships with the client fix this cycle** (item 4, Phase 1); item 1 protects clients that talk to an older Worker.

No open decisions remain.
