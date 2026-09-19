# Fix head-of-line blocking in the Nube push queue

## Built — 2026-09-17

Shipped the CEO-approved fix (verdict section below), nothing else. Single file: `public/js/features/cloud-sync/sync-runtime-pull-push.mjs`, `runFlushOutbox` (~lines 325-374) plus two small new helpers `outboxRowKey`/`pickNextOutboxRow`. Added `isLabSidecarOutboxMutationId` to the existing `cloud-lab-sidecar-index.mjs` import.

The single-snapshot `for (const item of pending)` loop became a `for (;;)` loop that re-lists `outbox.list()` every turn and picks the first not-yet-tried non-lab row (falling back to the first not-yet-tried row of any kind). A `tried` Set keyed by `${clientMutationId}@${enqueuedAt}` makes a permanently-failing row attempted once per flush call (loop still terminates), while a row that gets new ops merged in mid-flush gets a fresh `enqueuedAt` from the outbox and is picked up again on a later turn of the same flush. `firstErr`/one-stuck-row-doesn't-block-others and the `Enviando N/M cambios` progress reporting are unchanged in behavior (`total` now recomputed each turn as `doneOps + sum of remaining pending ops`).

**Tests** — all in `public/js/features/cloud-sync/sync-runtime-cycle-flush.test.mjs`: 3 new cases plus one pre-existing test rewritten because the fix changes its scenario's real outcome. **14/14 pass.**

- New: 10 lab rows + 1 clinicalOps row → first push is `clinicalOps`.
- New: 3 lab rows, a field op enqueued mid-first-push → second push is the field op, not lab row 2.
- New: a permanently-failing row → 1 push attempt, error surfaces.
- Rewritten: `'an op merged into the row mid-flight...'` — previously asserted the merged op stayed unsent until the next cycle. That is exactly the bug this fix removes: the merged op (fresh `enqueuedAt`) is now sent within the *same* flush. Updated to assert 2 pushes, the second is the merged op, outbox ends up empty.
- Unchanged, still green: the two-row progress test.

Also ran (all green, unaffected): `sync-runtime-pull-push.test.mjs` (3/3), `sync-runtime-schedule.test.mjs` (5/5). `npm run build:ui` succeeded.

**Staged, not committed** — owner commits by hand. **Not yet verified live** in the running Electron app; connect Nube with a large lab backfill pending, edit a patient field mid-backfill, confirm the edit reaches the peer within one push cycle instead of after the whole backfill drains.

---

Plan by senior-dev (Opus, max), 2026-09-17. Reviewed by CEO (Fable, xhigh) same day: **approve with changes.**

## CEO review verdict (2026-09-17) — read this first, it supersedes sections 2a/2b below

Lane rule (`labSidecars/` prefix, path-only, shared pacer) is correct and kept. Both round-robins below (2a `drainCloudOps` rewrite, 2b `interleaveOutboxRows`) are **cut**:

- **2a is dead code.** No caller ever feeds `drainCloudOps` a mixed lane — outbox rows are pure lab or pure non-lab in production (`mapBundleEnvelopeToOps` → `mapPatientEntryToCloudBundleOps` excludes labs; the one function that would mix them, `mapPatientEntryToOps`, has no production caller). The plan's stated inner root cause ("`cloud-room-push` mixes fields with labSidecars") is false.
- **2b misses the actual bug.** `runFlushOutbox` reads `outbox.list()` **once** into a snapshot, then loops it. A live edit made *after* the flush started isn't in that snapshot at all — interleaving it wouldn't help, re-reading the outbox would.

**Approved fix — one file, `sync-runtime-pull-push.mjs`, `runFlushOutbox`:** replace the single-snapshot loop with a loop that re-lists `outbox.list()` on every turn (so a mid-flush edit is picked up immediately) and, each turn, prefers a non-lab row over a lab row via `isLabSidecarOutboxMutationId` (import from `./cloud-lab-sidecar-index.mjs`). Track tried rows by `${clientMutationId}@${enqueuedAt}` so a permanently-failing row is attempted once per flush and the loop still terminates; a row that gets new ops merged in mid-flush gets a fresh `enqueuedAt` and is picked again. Keep the existing `firstErr` / one-stuck-row-doesn't-block-others behavior and the `setStatus('syncing', 'Enviando N/M cambios')` progress reporting, recomputing `total` each turn against the remaining snapshot.

Do not touch `cloud-push-direct.mjs`, `outbox-lab.mjs`, or `outbox.mjs`. Sections 1, 3 (correctness argument — still valid, per-path LWW on the Worker is the real backstop either way), 5 (risk/rollback), and 6 (cuts) below still apply to the *reasoning*, not to files 2a/2b describe building.

**Corrected test plan (replaces section 4 below):** all cases go in `sync-runtime-cycle-flush.test.mjs`. Do **not** add the `cloud-push-direct.test.mjs` or `outbox-lab.test.mjs` cases from section 4.

1. 10 `labSidecars/pN` rows enqueued, then one `clinicalOps` row → first `api.push` body has `path: 'clinicalOps'` (regression test named in the plan).
2. 3 lab rows; inside the first `api.push`'s resolution, enqueue a new `cloud-room-push` field op → the **second** push body is that field op, not lab row 2. This is the test for the bug the owner actually hits (edit arriving mid-flush).
3. A row whose push always rejects with a permanent error is attempted exactly once in one flush (loop terminates), and `firstErr` still surfaces/throws.
4. Unchanged: the existing progress test (two non-lab rows) still reports `'Enviando 1/2 cambios'`, `'Enviando 2/2 cambios'`.

Also run `sync-runtime-pull-push.test.mjs` (covers `runPullLatest`, exists already — plan section 4 was wrong that it doesn't) and `sync-runtime-schedule.test.mjs` (shares the pacer), plus `npm run build:ui`.

Verify live after: connect Nube with a large lab backfill pending, edit a patient field mid-backfill, confirm the edit reaches the peer within one push cycle, not after the whole backfill drains.

---

## 0. Root cause — the queue blocks at two levels, not one

| Level | Code | What blocks |
|---|---|---|
| **Outer** | `sync-runtime-pull-push.mjs:323` — `for (const item of pending)` | `enqueueCloudLabSidecarsBackfill` (`mutate-bridge.mjs:303-352`) calls `splitLabOpsIntoOutboxItems` (`outbox-lab.mjs:231-242`), which enqueues **one row per chunk per patient**. After a connect, `outbox.list()` holds hundreds of `labSidecars/*` rows. One small `clinicalOps` edit behind them waits for every one of them, each row a full `await drainCloudOps`. |
| **Inner** | `cloud-push-direct.mjs:121-144` — the single FIFO `while (remaining.length)` | The `cloud-room-push` row mixes small `entries/*/fields` with fat `entries/*/note`, `entries/*/indicaciones` **and** `labSidecars/*` ops (`mutate-bridge-ops.mjs:78-165`). Fat ops at the front eat the 180 KB byte budget, so each chunk carries 1-2 ops and the small ones wait many chunks × `pacer.gapMs()` (250 ms-8 s). |

Both get the same two-lane round-robin. The outer one is the bigger win per line and is the one the owner actually observes after connect.

---

## 1. Lane rule — `labSidecars/` path prefix only. No byte threshold.

```js
lane(op) = isLabSidecarOp(op) ? LANE_LAB : LANE_SMALL
```

`isLabSidecarOp` already exists at `/Users/mauriciosalas/R+/public/js/features/cloud-sync/cloud-push-direct.mjs:36-38`. Reuse it. Zero new constants, zero new predicates.

**Why the byte threshold is cut** (it was the obvious second term, and it is wrong here):

A size-based lane is a pure function of the op but **not** of the path. Two writes to `entries/p1/note` — 200 bytes then 40 KB — would land in *different* lanes, and round-robin could then put the newer one on the wire first. A prefix rule is a function of `op.path` alone, so two writes to the same path are **unconditionally** in the same lane. That is strictly stronger than what requirement 5 asks for.

It also loses nothing measurable. The fat traffic is lab sidecars — `slimLabSetForCloud`/`truncateLabRow` in `cloud-op-slim.mjs` exist precisely because `resLabs` arrays reach hundreds of KB (see the fixture at `sync-runtime-cycle-flush.test.mjs:41`). Clinical notes are a few KB; 16 of them fit inside the 180 KB budget. And lab traffic is the bulk-backfill class, while everything else is the latency-sensitive class — exactly the split we want.

---

## 2. Files and functions to change

### 2a. `/Users/mauriciosalas/R+/public/js/features/cloud-sync/cloud-push-direct.mjs` — inner round-robin

Rewrite the body of `drainCloudOps` (currently lines 106-146). Signature, options, and return value are unchanged.

```js
const total = ops.length;
// Two lanes, round-robined: a bulk lab backfill must not hold the wire
// against a live edit. Lane is a pure function of op.path, so two writes to
// the same path always share a lane and can never swap.
const lanes = [[], []];                     // [0] = small/live, [1] = lab
for (const op of Array.isArray(ops) ? ops : []) lanes[isLabSidecarOp(op) ? 1 : 0].push(op);
let turn = 0;
let sent = 0, attempt = 0, congestionEvents = 0, lastResult = null;

while (lanes[0].length || lanes[1].length) {
  if (!lanes[turn].length) { turn ^= 1; continue; }
  const chunk = chunkCloudOps(lanes[turn], pacer.chunkOps())[0] || [];
  if (!chunk.length) break;
  attempt += 1;
  let result;
  try {
    result = await sendChunk(chunk, attempt);
  } catch (err) {
    if (isCloudBackoffError(err) && congestionEvents < CLOUD_DRAIN_MAX_CONGESTION_EVENTS) {
      congestionEvents += 1;                 // shared budget, NOT per lane
      pacer.onCongested(err);
      await delay(pacer.gapMs());
      continue;                              // same lane retries, re-cut smaller
    }
    throw err;
  }
  pacer.onClean();
  lanes[turn] = lanes[turn].slice(chunk.length);
  sent += chunk.length;
  if (onChunkAcked) await onChunkAcked(chunk, result);
  onProgress?.(sent, total);
  lastResult = result;
  turn ^= 1;                                 // flip only after a clean ack
  if (lanes[0].length || lanes[1].length) await delay(pacer.gapMs());
}
return lastResult;
```

Four decisions, each load-bearing:

1. **`congestionEvents` and the pacer stay global, not per-lane.** Both lanes hit the same D1 room, the same `120 pushes/min` room cap (`quotas.js`), over the same connection. Congestion is a property of the backend. Per-lane counters would give one drain 12 tolerated events instead of 6 and double the request rate *during* an overload — the exact hammering the AIMD pacer was built to stop. `cloudDrainPacer` (`cloud-sync-timing.mjs:207`) is already shared with `pushCloudOpsDirect` and with `noteFailure` in `sync-runtime-schedule.mjs:26`; per-lane state would be inconsistent with both.
2. **Turn flips only on a clean ack.** On congestion the same lane retries. This keeps the existing `continue` semantics byte for byte.
3. **`attempt` stays one running counter across both lanes.** It feeds the wire id `:a${attempt}:${nextWireIdStamp()}` (`cloud-push-direct.mjs:221`, `sync-runtime-pull-push.mjs:205`). Per-lane counters would make both lanes emit `a1`.
4. **`chunkCloudOps` runs per lane**, so `MAX_LAB_OPS_PER_CHUNK`, `CHUNK_BUDGET_BYTES` and `pacer.chunkOps()` all apply inside each lane, unchanged. A chunk never mixes lanes; a chunk is only a push body, so that is free.

Per-pass cost drops: `chunkCloudOps` now scans `n/2` instead of `n`.

### 2b. `/Users/mauriciosalas/R+/public/js/features/cloud-sync/outbox-lab.mjs` — outer round-robin helper

New exported pure function. It goes here, not in a new file — this module already owns lab-vs-outbox-row logic and already imports `isLabSidecarOutboxMutationId` (`cloud-lab-sidecar-index.mjs:291-294`, which matches both `labSidecars/*` and `cloud-lab-backfill`).

```js
/**
 * Lab backfill enqueues hundreds of `labSidecars/*` rows at connect. Strict FIFO
 * over them makes one live edit wait for all of them. Alternate one non-lab row,
 * one lab row. Relative order inside each lane is preserved.
 * ponytail: two fixed lanes; add weights only if one lane measurably starves.
 */
export function interleaveOutboxRows(rows) {
  const input = Array.isArray(rows) ? rows : [];
  const lab = [], rest = [];
  for (const row of input) {
    (isLabSidecarOutboxMutationId(row?.clientMutationId) ? lab : rest).push(row);
  }
  if (!lab.length || !rest.length) return input.slice();
  const out = [];
  for (let i = 0; i < Math.max(lab.length, rest.length); i += 1) {
    if (i < rest.length) out.push(rest[i]);
    if (i < lab.length) out.push(lab[i]);
  }
  return out;
}
```

Non-lab goes first on each turn, so the live edit wins the tie.

### 2c. `/Users/mauriciosalas/R+/public/js/features/cloud-sync/sync-runtime-pull-push.mjs` — use it

Three lines in `runFlushOutbox` (lines 304-335):

- Add `interleaveOutboxRows` to the existing import from `./outbox-lab.mjs` (line 13).
- Line 313: `const pending = interleaveOutboxRows(outbox.list());`
- `total` (lines 315-318) is a sum over `pending` — order-independent, leave it alone.

Nothing else in that file changes. `pushSingleWithStaleRetry` (192-217), `PUSH_STALE_RETRIES = 3` (line 24), the 409 fresh-pull retry, and `outbox.removeOps` per chunk (line 244) are all untouched — `removeOps` matches by `(path, updatedAt)` and does not care which lane a chunk came from.

**No Worker change. No schema change. No wire-format change.**

---

## 3. Correctness — no reordering of writes to the same path

Three layers, checked against the real code. Any one of them is sufficient.

**Layer 1 — inside one drain, a path appears at most once.**
`drainCloudOps` is only ever fed one outbox row's ops (`sync-runtime-pull-push.mjs:236,274`) or one caller-built array (`pushCloudOpsDirect`). A row's `ops` array is produced by `mergeOpsByPath` (`outbox.mjs:17-26`), which builds a `Map` keyed by `op.path` and returns `Array.from(merged.values())` — **one entry per path, by construction**. The in-memory outbox and the test helper (`sync-runtime-cycle-test-helpers.mjs:1-10`) use the identical function. So inside a drain there is no second write to the same path to reorder against.

Known hole, for completeness: `mergeItemIntoRows` (`outbox.mjs:86-91`) uses `incomingOps` **verbatim** when no row exists yet, so a caller passing duplicate paths in one `enqueue` would bypass the Map. No caller does — `prepareOutboxOpsForEnqueue` (`outbox-lab.mjs:214-219`) runs `coalesceLabSidecarOps` + `filterCloudLabSidecarOps` + `filterCloudOpsNotAttempted` first, and `collectCloudBundleOps` emits one op per (patient, field). Layer 2 covers it anyway.

**Layer 2 — the lane function does not read position or neighbours.**
`lane(op) = isLabSidecarOp(op)` reads `String(op?.path || '')` and nothing else. Two ops with the same `path` get the same lane, always. Within a lane, `lanes[turn].slice(chunk.length)` consumes strictly front-to-back, so lane-internal order is exactly input order. Round-robin therefore only ever interleaves ops that are **in different lanes**, which by construction means **different paths**.

Same argument at the row level: `interleaveOutboxRows` classifies on `clientMutationId` alone and preserves order inside each lane.

**Layer 3 — the Worker enforces per-path LWW regardless of arrival order.**
`applyOps` in `/Users/mauriciosalas/R+/cloud/sync-worker/src/lww.js:314-373` gates every op on `isNewerVersion(op, state.entityVersions[op.path])` and pushes `{ op, reason: 'stale' }` when it is not newer (lines 320-321, 355-357). Wire order does not decide the stored value; `updatedAt` does.

**The one residual, and why it is acceptable.** `mutate-bridge-ops.mjs:164-165` puts `labSidecars/${patientId}/${setId}` ops into the `cloud-room-push` row, which `interleaveOutboxRows` classifies as *non-lab* by id. The same lab path could therefore sit in a `cloud-room-push` row (fast lane) and a `labSidecars/pX` row (slow lane) at the same instant, and the two could swap. Consequence: the older write is rejected as stale by Layer 3, costing one op slot and one `stale_rejected` line in the Conexión panel. **No data loss.** If that noise ever shows up, the one-line hardening is to classify a row as lab when `row.ops.some(isLabSidecarOp)` — do not build it now.

---

## 4. Test plan

### `/Users/mauriciosalas/R+/public/js/features/cloud-sync/cloud-push-direct.test.mjs`

Add to `describe('drainCloudOps')` (line 74):

1. **`alternates lanes instead of draining lab first`** — `ops = [...12 labOp, ...3 fieldOp]`. Assert the first `sendChunk` call receives only `entries/*` ops, i.e. the three field ops go out on attempt 1 even though 12 lab ops were queued ahead of them. This is the regression test for the bug.
2. **`preserves relative order inside each lane`** — interleave lab and field ops in the input; assert `receivedChunks.flat().filter(isLab)` deep-equals the input lab ops in input order, and the same for non-lab.
3. **`shares one congestion budget across both lanes`** — mixed lab + field ops, `sendChunk` always throws 503. Assert exactly `7` calls (1 + `CLOUD_DRAIN_MAX_CONGESTION_EVENTS`), not 13. Mirrors the existing assert at line 171.
4. **`caps lab ops per chunk inside its own lane`** — 21 lab ops + 2 field ops; assert no chunk carries more than `MAX_LAB_OPS_PER_CHUNK` lab ops.

**Existing cases stay green, no edits.** Lines 79-92, 94-130, 132-153, 155-172 and 174-186 all use plain integers or paths with no `labSidecars/` prefix, so every op lands in lane 0 and the loop degenerates to today's FIFO. The attempt-numbering assert at line 124 holds because `attempt` stays a single counter. This is why the lane predicate must keep `isLabSidecarOp`'s defensive `String(op?.path || '')`.

### `/Users/mauriciosalas/R+/public/js/features/cloud-sync/outbox-lab.test.mjs`

New `describe('interleaveOutboxRows')`:

- lab-only list returns unchanged; non-lab-only list returns unchanged (no churn when there is nothing to interleave)
- 3 lab rows enqueued first + 1 `clinicalOps` row → `clinicalOps` lands at index 0
- relative order inside each lane preserved
- `cloud-lab-backfill` counts as lab (matches `isLabSidecarOutboxMutationId`)
- `rows` not an array → `[]`

### `/Users/mauriciosalas/R+/public/js/features/cloud-sync/sync-runtime-cycle-flush.test.mjs`

There is **no** `sync-runtime-pull-push.test.mjs`; that path is covered here through `createSyncRuntimeCycle`. Add one end-to-end case:

- **`a live edit behind a lab backfill reaches the Worker first`** — `makeOutbox` with 10 `labSidecars/pN` rows then one `clinicalOps` row. Assert the first `api.push` body carries `path: 'clinicalOps'`.

**Check, do not change**, the existing progress test at lines 358-385: both rows (`m1`, `m2`) are non-lab, so `interleaveOutboxRows` returns them unchanged and `['Enviando 1/2 cambios', 'Enviando 2/2 cambios']` still holds.

### Commands

```bash
npm run test:one -- public/js/features/cloud-sync/cloud-push-direct.test.mjs
npm run test:one -- public/js/features/cloud-sync/outbox-lab.test.mjs
npm run test:one -- public/js/features/cloud-sync/sync-runtime-cycle-flush.test.mjs
npm run test:one -- public/js/features/cloud-sync/sync-runtime-schedule.test.mjs   # shares cloudDrainPacer
npm run build:ui                                                                  # public/js edit
```

---

## 5. Risk and rollback

| Risk | Backstop |
|---|---|
| A lab path duplicated across a `cloud-room-push` row and a `labSidecars/*` row swaps order | Worker per-path LWW rejects the older one (`lww.js:320`). Shows as `stale_rejected` in Conexión, no data loss. Watch that counter after the first connect. |
| Request rate against the 120 push/min room cap | Unchanged. Round-robin changes **order**, never **count**. The pacer stays one shared singleton. |
| Status detail regression | `total` is computed before the interleave and is order-independent; `sent` stays monotonic. |
| Worker or wire incompatibility | None — no Worker, schema, or payload change. |

**Rollback:** revert `drainCloudOps` to the single `remaining` array, delete `interleaveOutboxRows`, and restore `const pending = outbox.list();`. Ordering-only, so no migration and no in-flight data to reconcile.

---

## 6. Cut

- **Byte-size lane threshold** — cut. It breaks the same-path-same-lane guarantee (section 1). Add only if profiling shows fat non-lab ops dominating a chunk.
- **Generalized scheduler / priority queue / weights / per-lane pacer / any config knob** — cut. Two fixed lanes, one chunk per turn.
- **N-ops-per-turn tuning** — cut. One chunk per turn, and chunk size is already the AIMD window.
- **New module for the lane logic** — cut. `isLabSidecarOp` is already in `cloud-push-direct.mjs:36`; `interleaveOutboxRows` goes in the existing `outbox-lab.mjs`.
- **`chunkCloudOps` allocating every chunk and using only `[0]`** — pre-existing, and the lane split makes it cheaper, not worse. Leave it.
- **The lab-sidecar `skipLabShards` inefficiency in `cloud/sync-worker/src/sync.js`** — explicitly out of scope, as stated.

Net diff: ~30 lines in `cloud-push-direct.mjs`, ~18 in `outbox-lab.mjs`, 3 in `sync-runtime-pull-push.mjs`, plus tests.
