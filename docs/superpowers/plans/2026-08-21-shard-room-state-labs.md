# Shard room_state.labSidecars out of the single-row blob

## Context

`cloud/sync-worker` stores each room's whole clinical state (patients, notes,
`labSidecars`, agenda, `clinicalOps`, tombstones) as **one encrypted blob in
one row** — table `room_state`, `PRIMARY KEY (room_id)`
([schema/001-init.sql](cloud/sync-worker/schema/001-init.sql)).

Cloudflare D1 hard-caps any single BLOB/string/row at **2,000,000 bytes**
(confirmed against developers.cloudflare.com/d1/platform/limits). Yesterday's
fix ([a488d032](cloud/sync-worker/src/quotas.js)) raised the *app-level*
per-op and per-push caps because real `labSidecars` batches were being
rejected at 220KB/512KB — but it also raised `storageHardBytes` headroom
implicitly, and rooms can still grow past D1's real 2MB-per-row ceiling as
`labSidecars` accumulates (the code comment even says "labs uncapped by set
count"). That's the `D1_ERROR: string or blob too big: SQLITE_TOOBIG` the
user just hit. Raising app-level caps further cannot fix this — the wall is
in D1 itself, one row is never allowed past 2MB.

Goal: split `labSidecars` (the field that actually grows unbounded) into its
own table, one row per `(room_id, patient_id)`, so no single row can approach
D1's cap regardless of how much lab history a room accumulates. Everything
else (entries, agenda, clinicalOps, todos, tombstones, entityVersions) stays
in the existing `room_state` row — it's small and bounded by
`maxLivePatients` (50).

## Design

**Storage**: new table `room_state_labs (room_id, patient_id, ciphertext,
iv, updated_at)`, `PRIMARY KEY (room_id, patient_id)`. `room_state.ciphertext`
stops carrying `labSidecars` going forward.

**Read path stays invisible to every consumer.** `loadRoomState()` in
[sync.js](cloud/sync-worker/src/sync.js) keeps returning the exact same flat
`RoomSyncState` shape ([lww.js emptyState()](cloud/sync-worker/src/lww.js))
it does today — it just assembles it from two sources instead of one:
1. decode the core `room_state` row
2. `SELECT * FROM room_state_labs WHERE room_id = ?`, decode each row, drop
   into `state.labSidecars[patient_id]`
3. **backward compat**: if the core row is a pre-migration row that still has
   an embedded (non-empty) `labSidecars`, and a `patient_id` isn't present in
   the shard rows yet, use the core-embedded value. No separate backfill
   migration needed — old rooms just self-migrate on their next write (step
   below always re-derives shards from whatever's in memory, so post-write
   the core blob no longer carries `labSidecars` and shards are the source of
   truth).

Because the returned shape never changes, **no changes needed** in
`lww.js` (`applyOps`/`emptyState`), `mobile-lab-window.js`, `interno/board.js`,
`interno/vitals.js` reads, or the client — they all keep consuming
`state.labSidecars` exactly as before.

**Write path** — `commitMutationBatch()` in sync.js:
- Encode the core state *without* `labSidecars` → unchanged `room_state`
  UPDATE (same EXISTS-guarded statement pattern already used for the race
  guard).
- For every patient id in `Object.keys(nextState.labSidecars) ∪
  Object.keys(previousState.labSidecars)` (union catches both new/changed
  labs and labs that got wiped this mutation, e.g. a tombstone) — at most
  `maxLivePatients` (50), cheap to loop, no extra DB round trip since both
  objects are already in memory:
  - has content → `INSERT OR REPLACE INTO room_state_labs (...) SELECT ...
    FROM mutations WHERE room_id=? AND client_mutation_id=? AND revision=?`
    (same "only if this batch's own mutation row exists" guard idiom the
    `mutations` insert already uses — keeps the whole batch atomic, no new
    concept).
  - empty/absent → guarded `DELETE FROM room_state_labs WHERE room_id=? AND
    patient_id=? AND EXISTS (...)`.
- `storage_bytes` stays **exact** with no extra query: since every known
  patient's shard is (re)encoded this pass anyway, `storageBytes = coreBytes
  + sum(all shard ciphertext lengths)` — same math as today, just summed
  across rows instead of read from one blob's length.
- New hard guard: `QUOTAS.labShardMaxBytes` (1,900,000 bytes — margin under
  D1's 2,000,000 cap) checked per patient shard before the batch is built;
  throws the existing `payload_too_large` `SyncError` if one patient's total
  lab history in a room would still exceed a single row. This is the actual
  fix for the reported crash: it turns an opaque `SQLITE_TOOBIG` 500 into the
  same clear, already-handled quota error the app shows for `noteMaxBytes`
  today, and it's enforced *before* D1 ever sees the write.

**Dedup the three separate "decode room_state row" readers.** Right now
`interno/room-resolve.js` and `pase-labs.js` each hand-roll their own
`SELECT ciphertext, iv FROM room_state ...` + `decodeRoomState`, duplicating
sync.js's `loadRoomState`. Since that duplication is exactly the kind of
drift that would silently re-break this fix (a third copy that "forgets" to
read the shard table), both are switched to import and call sync.js's
`loadRoomState` instead of their own SQL. `board.js`/`vitals.js` call sites
adjust only their destructuring (`{ state }` vs the old bare-state return) —
no behavior change.

**Cleanup**: `admin.js`'s `buildPurgeRoomStatements()` gets one more
statement: `DELETE FROM room_state_labs WHERE room_id = ?`, alongside the
existing `room_state` delete.

**Room creation** (`rooms.js`, two call sites): no change needed —
`emptyRoomState()` already starts with `labSidecars: {}`, so creation writes
zero shard rows naturally.

## Files

- `cloud/sync-worker/schema/008-shard-room-state-labs.sql` — new, DDL only:
  `CREATE TABLE room_state_labs (room_id TEXT NOT NULL, patient_id TEXT NOT
  NULL, ciphertext BLOB NOT NULL, iv BLOB NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY (room_id, patient_id))`.
- [cloud/sync-worker/src/sync.js](cloud/sync-worker/src/sync.js) —
  `loadRoomState()` assembly, `commitMutationBatch()` split write, both
  described above.
- [cloud/sync-worker/src/quotas.js](cloud/sync-worker/src/quotas.js) — add
  `labShardMaxBytes: 1_900_000` with a comment citing D1's 2,000,000-byte
  row/blob cap.
- [cloud/sync-worker/src/admin.js](cloud/sync-worker/src/admin.js) —
  `buildPurgeRoomStatements()` +1 statement.
- [cloud/sync-worker/src/interno/room-resolve.js](cloud/sync-worker/src/interno/room-resolve.js)
  — drop its own `loadRoomState`, delegate to sync.js's.
- [cloud/sync-worker/src/pase-labs.js](cloud/sync-worker/src/pase-labs.js) —
  same delegation, replaces its raw SQL block (~line 118-124).
- [cloud/sync-worker/src/interno/board.js](cloud/sync-worker/src/interno/board.js),
  [cloud/sync-worker/src/interno/vitals.js](cloud/sync-worker/src/interno/vitals.js)
  — adjust the one call site each to the shared `loadRoomState`'s `{ state }`
  return shape.

No client changes (desktop/mobile) — `/pull` and mutation responses keep the
exact same JSON shape.

## Tests (colocated, run via `npm run test:one`, not full `npm test`)

New `cloud/sync-worker/src/sync-room-state-shard.test.mjs`, following the
existing style in `mutation-guard.test.mjs`:
- a mutation that writes `labSidecars/p1/s1` produces a `room_state_labs`
  row for `p1` and the core `room_state` row no longer contains `labSidecars`
- a tombstone mutation deletes that patient's shard row
- a legacy single-blob row (labSidecars embedded in core, no shard rows yet)
  still reads back identically via `loadRoomState`, and the next mutation
  migrates it (shard row appears, core stops carrying it)
- a patient whose merged lab history exceeds `labShardMaxBytes` is rejected
  with `SyncError('payload_too_large', ...)`, batch not applied, `storage_bytes`
  unchanged
- `storage_bytes` after commit equals core bytes + sum of shard bytes

Update `cloud/sync-worker/src/admin.test.*` (purge) if it asserts the exact
statement list from `buildPurgeRoomStatements`.

## Verification

```bash
npm run test:one -- cloud/sync-worker/src/sync-room-state-shard.test.mjs
npm run test:one -- cloud/sync-worker/src/mutation-guard.test.mjs
npm run test:one -- cloud/sync-worker/src/crypto-at-rest.test.js
npm run db:migrate:local   # inside cloud/sync-worker — applies 008 to local D1
```
Then exercise a real room locally: create a room, push enough `labSidecars`
ops across enough patients to have blown the old single-row 2MB cap, confirm
no `SQLITE_TOOBIG`, and confirm a `/pull` (`needSnapshot`) response still
looks identical in shape to before.

## Known residual limit (not fixed here, flagging on purpose)

`labShardMaxBytes` (1.9MB) is a hard technical ceiling per patient's total
lab history *within one room* — it cannot be raised, it's D1's own row cap.
A single patient with an extremely long lab history in one room could still
eventually hit it. Fixing that needs paginating one patient's labs across
multiple shard rows (by lab-set id range or date), which is a bigger change
and not needed to fix the crash reported today — call it out to the user as
a follow-up if it ever actually triggers, don't build it speculatively now.
