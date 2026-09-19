# Auto-migrate existing Nube rooms to E2EE

## Context

The shipped Nube E2EE design (`docs/superpowers/plans/2026-08-17-nube-e2ee.md`, `public/js/features/cloud-sync/crypto.mjs` + `room-dek.mjs`) only turns on encryption for **new** rooms — `ensureRoomDek()` runs once, at room creation. Rooms created before this ships stay plaintext forever; nothing ever revisits them.

The user's requirement: existing rooms must become encrypted too, with **zero user action** — their users are tech illiterate and cannot be told to "recreate the room" or click anything. This plan adds a silent backfill: the next time the room **owner** logs in, their device generates a DEK for any of its rooms that doesn't have one yet, then rewrites that room's already-stored plaintext content so it gets encrypted at rest — without ever risking a teammate's more recent edit.

## Why this design (key findings from the existing code)

- **Only the owner can set a room's DEK.** `cloud/sync-worker/src/room-dek.js:56` (`handlePutRoomDek`) throws 403 unless `membership.role === 'owner'`, and rejects (409 `conflict`) if a DEK is already set. So the backfill can only run on the owner's device, and is naturally race-safe against being set twice.
- **Password is required to wrap a fresh DEK, and it's only in memory during an explicit login.** `room-dek.mjs:21-33` — Recuérdame restores the session token but not the password (documented in `docs/core/15-security.md`). So the backfill has to run right after `cacheSessionPassword()` is called, i.e. in `handleLogin`/`handleRecover` (`panel-conexion-handlers.mjs:186,237`), not at silent boot.
- **Do not reconstruct content from local UI state.** `mapPatientEntryToOps`/`collectPatientEntriesForCloudPush` (`mutate-bridge-ops.mjs`, `cloud-census-collect.mjs`) build ops from this device's *locally cached, team-scope-filtered* census — using that as the migration source could push stale or partial content and, worse, clobber a more recent edit from a patient this device doesn't even see. The migration must re-push the exact value **already stored server-side**, sourced from a fresh pull.
- **An exact clock echo is silently rejected.** `cloud/sync-worker/src/lww.js` (`isNewerVersion`) rejects an op whose `updatedAt`+`actorId` exactly ties the stored `entityVersions` entry — so simply re-sending the same value with its original clock would no-op and never get encrypted. Fix: bump that field's own prior `updatedAt` by the smallest safe increment (+1ms), never "now". Because it's a tiny bump on an *old* clock, any genuinely newer edit from a teammate (always stamped near "now") still correctly wins if it races the sweep — no new data-loss window beyond what LWW already tolerates for any two concurrent edits today.
- **No server changes needed.** `handleMutations`/`lww.js` already treat op values opaquely. `api.push` (`api-client.mjs:100-107`) already auto-encrypts any op whose path matches `isEncryptedContentPath` (`cloud-sync-crypto-wire.mjs`) once a DEK is cached. The whole migration is client-side: build ops with the right value/clock, push through the existing `pushCloudOpsDirect` (`cloud-push-direct.mjs`).
- **Getting the authoritative current value + clock per path, without new endpoints:**
  - `api.pull(roomId, 0)` forces `since=0`. For any room with real history (`revision > PULL_REVISION_GAP` = 100, `pull-strategy.js`), the Worker always returns a full `state` snapshot (`sync.js: handlePull`), which already includes `state.entityVersions[path] = {updatedAt, actorId}` (`lww.js: emptyState`/`applyOps`) for every path — this metadata is already sent to the client today, nothing new to expose.
  - For a small/new room (`revision ≤ 100`), the same `since=0` pull instead returns the raw `ops` array, ordered by revision ASC (`sync.js:381-389`). Fold it client-side, keeping the last op per path — a small pure helper, no server change.
- **Idempotent by construction.** A path is only swept if its current value isn't already `isEncryptedEnvelope` (`crypto.mjs`) — re-running costs one pull and finds nothing to do.

## Files to change

**Extract a shared "what counts as content" walker** (avoid the sweep and the existing decrypt path drifting apart on which fields are in scope)
- `public/js/features/cloud-sync/cloud-sync-crypto-wire.mjs` — factor the walk already implicit in `decryptRoomStateFromPull` (entries' `note/indicaciones/historiaClinica/eventualidades/monitoreo`, `labSidecars/*`, `todos/*`, `clinicalOps`) into a small exported `listContentFieldEntries(state) -> {path, value}[]`. `decryptRoomStateFromPull` keeps its current in-place mutation behavior but can reuse the same path list internally.

**New migration module**
- `public/js/features/cloud-sync/room-dek-migrate.mjs` — new:
  - `bumpTimestamp(iso)` — ISO string + 1ms, string-safe.
  - `foldOpsToLatestByPath(ops)` — reduces an ordered ops array to `{path: {value, updatedAt, actorId}}`, last-write-per-path.
  - `sweepRoomForPlaintextContent(api, roomId, actorId)` — `api.pull(roomId, 0)`; if `data.state`, read `listContentFieldEntries(data.state)` + `data.state.entityVersions`; else fold `data.ops`. Filter to paths where the value isn't already `isEncryptedEnvelope` (import from `crypto.mjs`) and where `isEncryptedContentPath(path)` is true. Build ops `{path, value, updatedAt: bumpTimestamp(originalUpdatedAt), actorId}`. Push via `pushCloudOpsDirect`.
  - `backfillRoomEncryption(api, room, actorId)` — guards on `room.role === 'owner'`; calls the existing `ensureRoomDek(api, room.id)` (`room-dek.mjs`, unchanged — already safe to call for an existing room, and its `setRoomDek` 409 on a race is caught the same way `ensureRoomDek` already catches/reports wrap failures); on success, calls `sweepRoomForPlaintextContent`. No-ops (returns early) if a DEK is already cached for the room.

**Wire-up**
- `public/js/features/cloud-sync/panel-conexion-handlers.mjs` — right after `cacheSessionPassword(form.password)` in the login handler and in `handleRecover` (lines ~186 and ~237), fire-and-forget `backfillRoomEncryption(deps.getApi(), room, getCloudSyncClientId())` for the room this device is currently connected to (read via the same room snapshot helper already used elsewhere in this file, e.g. `deps.getCloudSyncRoomSnapshot()`). Matches the existing fire-and-forget pattern already used for DEK persistence (this file, line ~19-20) — failure must not block login.

**Docs**
- `docs/core/15-security.md` — update the "Deploy status" table: existing rooms now migrate automatically on the owner's next login (no manual recreation), and note the non-owner-device limitation (they pick up the DEK on their own next connect, same as today).

**Tests** (colocated, per `.claude/rules/tests-with-code.md`)
- `public/js/features/cloud-sync/room-dek-migrate.test.mjs` — new. Covers: tie clocks get bumped and accepted (mock a `lww`-style stale check); ops-fold path for a small/new room; no-op when a path is already an encrypted envelope; no-op when `room.role !== 'owner'`; a 409 from `setRoomDek` (race with another device) is swallowed, not thrown.
- `public/js/features/cloud-sync/cloud-sync-crypto-wire.test.mjs` — extend for `listContentFieldEntries`.
- `public/js/features/cloud-sync/panel-conexion-handlers.test.mjs` — extend to assert `backfillRoomEncryption` fires after login/recover and does not block/throw into the caller.

## Explicitly out of scope

- Migrating `entries/*/fields` (patient identity/census) — same boundary as the shipped design; Interno/admin still need it plaintext.
- Any interaction with room code rotation (`handleRotateCode`) — unrelated, unchanged.
- A non-owner-initiated backfill — architecturally blocked server-side (403); not attempted client-side either.

## Verification

1. `npm run test:one -- public/js/features/cloud-sync/room-dek-migrate.test.mjs`
2. `npm run test:one -- public/js/features/cloud-sync/cloud-sync-crypto-wire.test.mjs`
3. `npm run test:one -- public/js/features/cloud-sync/panel-conexion-handlers.test.mjs`
4. Manual: seed a room via the current (plaintext) path with a note, a lab, and a todo. Log in as the owner on the updated build. Confirm via `wrangler d1 execute` that `mutations`/`room_state` now hold ciphertext for those fields. Confirm a second, non-owner device still reads the same content correctly after it picks up the DEK on its next connect.
5. `npm run build:ui` (after the `public/js/**` edits).
6. `npm run metrics:check` before merge.
