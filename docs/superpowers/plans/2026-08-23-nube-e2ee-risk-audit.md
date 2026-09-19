# Nube E2EE deploy plan — exhaustive risk audit (2026-08-23)

## Update (2026-08-25): S0-1/S0-2 (Interno board + vitals reading encrypted fields) addressed
`cloud/sync-worker/src/interno/routes.js` now intercepts `/board` and `/vitals` at the route
level and returns `503 temporarily_disabled` instead of reading `clinicalOps`/`monitoreo`
server-side — see the file's own top-of-file comment, which cites this audit's Stage 0
items 3-4. This closes S0-1/S0-2 as originally described (silent-empty-result failure);
the routes are disabled, not silently wrong. Re-enabling them requires the on-device
redesign named in the deploy plan's Stage 0, not just deleting this block. Other S0/S1/S2
findings below (recovery re-wrap, non-owner decrypt, rollback-destroys-ciphertext, etc.)
have not been re-verified as of this update — treat them as still open until checked.

Verdict: **Do not deploy any stage as written.** The plan's central premise —
"the Worker never reads field values, so content can be encrypted while the
server keeps working" — is false. Five server-side code paths read encrypted
field values today. Two of them are the Interno phone-vitals workflow and the
Pase-labs mobile view, and both fail silently with HTTP 200 and empty
results, not with an error. Separately, password recovery cannot re-wrap a
DEK (the server forbids it), non-owner members can never decrypt at all, and
`wrangler rollback` destroys ciphertext rather than merely orphaning it.

Stage A alone is also not "worker only" — the same `wrangler deploy`
republishes the mobile PWA.

---

## S0 — Would cause data loss or patient-safety harm

### S0-1. Encrypting `clinicalOps` kills every server-side team scope
`cloud-sync-crypto-wire.mjs:20-21` puts `clinicalOps` in the encrypted set.
Five server readers depend on its plaintext contents:

- `cloud/sync-worker/src/pase-labs.js:133-142` — `clinicalOps.clinical_users`,
  `.team_membership`, `.team_membership_removals`, `.patient_team_assignment`
- `cloud/sync-worker/src/interno/board.js:12,23,29,84` — `.team_membership`,
  `.teams`, `.team_guardia_today`, `.active_guardias`
- `cloud/sync-worker/src/interno/vitals.js:63` — `.active_guardias`

An envelope `{enc:1,iv,ct}` passes `typeof === 'object'` at
`pase-labs.js:124`, then every property read returns `undefined`.
`resolveUserTeamIds` returns an empty Set, so `pase-labs.js:151`
`activeTeamIds.has(...)` is always false. `/api/sync/v1/pase-labs` returns
`200 {patients: []}` forever. No error, no log.

**Fix:** remove `'clinicalOps'` from `isEncryptedContentPath`
(`cloud-sync-crypto-wire.mjs:21`). It is team/guardia routing metadata, not
clinical content — the same trade already accepted for identity fields.
Moving team scoping client-side is a separate multi-week project, not a
deploy-day option.

### S0-2. Interno phone board goes empty — nurses cannot record vitals
Follows from S0-1. `board.js:84` `(clinicalOps?.active_guardias || [])` →
`[]`; `board.js:87` scope → `{teams:[], salaGuardiaToday:[]}`; `board.js:88`
`resolveInternoBoardPatients` returns nothing. Then `interno/vitals.js:154`
`assertInternoPatientOnBoard` rejects every patient, so `applyInternoVitals`
fails for all.

Worse, fixing S0-1 alone opens a corruption path. With the board working
again, `interno/vitals.js:55-59` (`if (!nextPatient.monitoreo)`) sees the
truthy envelope and skips the shell; `applyInternoMedicionToPatient`
(`vitals-medicion.js:76-80`) mutates it; `vitals.js:84-88` then pushes
`entries/{id}/monitoreo` as a plaintext or hybrid value over the ciphertext.
Desktop pulls it, sees `enc===1`, decrypts the stale `ct`, and silently
discards the nurse's vitals reading.

This is the decision the plan never surfaces: Interno vitals and E2EE-for-
`monitoreo` are mutually exclusive. Either `monitoreo` stays plaintext, or
Interno's vitals submission is removed. Pick one, in writing, before Stage A.

### S0-3. Password recovery cannot re-wrap the DEK — the server rejects it
`cloud/sync-worker/src/room-dek.js:69-71`:
```js
if (existing.wrapped_dek_ct) {
  throw new SyncError('conflict', 'Esta sala ya tiene una llave configurada.');
}
```
Write-once. `rewrapCachedRoomDeks` (`room-dek.mjs:138-156`) calls
`api.setRoomDek` on a room that always already has one → always 409 →
caught at line 148 → logged `WRAP_FAILED` → silently continues.

So after a password recovery the server-side wrap is still under the old
password. The recovering device keeps working only because the DEK sits in
memory and in `cloud-sync-remember.json`. Every other device — and that
device after reinstall or a "no recordar" session — calls `loadRoomDek`,
`unwrapDek` throws, `room-dek.mjs:90-93` catches and returns `null`, and the
room's entire clinical content becomes permanently unreadable.

`docs/core/15-security.md:149` and the deploy plan both claim this works.
`room-dek.test.mjs:141-190` passes because `setRoomDek` is a mock. This is
the exact failure category as 2026-08-14: green unit tests against a mocked
server contract.

**Fix:** add a distinct `PUT /rooms/:id/dek/rewrap` that overwrites. Do not
just delete the 409 — `room-dek-migrate.mjs:128-131` calls `ensureRoomDek`
whenever `loadRoomDek` returns null, so without the 409 a device that merely
failed to unwrap would overwrite the wrap with a brand-new random DEK and
destroy the room's content irrecoverably. The 409 is currently the only
thing preventing that.

### S0-4. Non-owner members can never decrypt anything
The DEK is wrapped with a key derived from `sessionPassword` — the
logged-in user's own Nube password (`room-dek.mjs:58` → `crypto.mjs:44-59`).
Members unwrap with their own password (`room-dek.mjs:85`, reached from
`handleJoinRoom` at `panel-conexion-handlers.mjs:326`). There is no shared
room secret anywhere in the tree. Users have per-user accounts
(`handleRegister`, `room_members.role`).

Result: only the room owner can ever read encrypted content. Every teammate
gets envelopes and pushes plaintext (see S0-7).

The plan's Stage B step 7 — "a second new-build device unwraps with the
password and decrypts" — passes if both devices log in as the same user,
which is exactly how a solo canary gets run. The canary as specified does
not detect this.

**Fix:** Stage B must use a second distinct user account joined as a member.
The design fix (per-member wrapped DEK, or an explicit room passphrase
separate from the login password) is real engineering, not a deploy step.

### S0-5. `wrangler rollback` destroys ciphertext; it does not just orphan it
The envelope guards at `lww.js:167-170` and `lww.js:235-239` exist in this
tree. The deployed worker's `mergeMonitoreoLww` / `mergeClinicalOpsLww` run
unguarded. Merging an envelope reads `.historial` / `.team_membership` →
`undefined` → produces a plaintext object without `ct` or `iv`. The
ciphertext is gone, and no key recovers it.

Plan lines 44-47 list only two minor rollback costs. This is the real one.

**Fix:** replace the rollback section with a hard rule — rollback is safe
only while `SELECT COUNT(*) FROM rooms WHERE wrapped_dek_ct IS NOT NULL` is
0. After that, roll forward only. Add that query as the first step of any
incident response.

*(Verify via `git log -S isEncryptedEnvelope` whether the guard predates the
E2EE work — if it does, this drops to S2.)*

### S0-6. Backfill collides with migration 008's shard cap — and they ship together
`crypto.mjs:120` base64-encodes the ciphertext: ~+37% per value.
`QUOTAS.labShardMaxBytes = 1_900_000`. Any patient whose lab history is
above ~1.39 MB today passes now and hard-fails `payload_too_large` after
encryption — and 008 exists precisely because rooms are hitting that
ceiling.

`room-dek-migrate.mjs:98-110` pushes every plaintext content field in one
sweep through the chunking pipeline. A chunk failing mid-sweep leaves the
room permanently half-encrypted. `sweepRoomForPlaintextContent:111` returns
`{swept: ops.length}` — ops built, not ops accepted — so
`auditDekEvent(BACKFILL_SWEPT)` reports success on a rejected push. Failures
are swallowed at `room-dek-migrate.mjs:138-145` and return `null`.

The two workstreams are not independent; the plan treats them as such.

**Fix, before Stage A:** run a D1 query for the largest per-patient
`labSidecars` byte total in prod and multiply by 1.37. Then make the sweep
verify by re-pulling and asserting zero remaining plaintext content paths,
and surface failure to the user in Spanish instead of returning `null`.

### S0-7. Encryption fails open — silent plaintext PHI
`cloud-sync-crypto-wire.mjs:45`: `if (!dek || !Array.isArray(ops)) return
ops;` — no DEK means push plaintext. And `loadRoomDek` returns `null` on any
error (`room-dek.mjs:90-93`) or whenever no password is cached
(`room-dek.mjs:81`).

So a transient 500 on `GET /rooms/:id/dek`, or a Recuérdame-restored
session, silently downgrades that device to plaintext for the entire
session — into a room the user believes is encrypted.

**Fix:** fail closed. If `GET dek` returns a non-null wrapped DEK and unwrap
fails, block push and show a Spanish error. Distinguish "room has no DEK"
(fine) from "room has a DEK we cannot open" (stop).

### S0-8. The disaster-recovery plan is destroyed by the same failure it is meant to cover
`cloud-sync-crypto-wire.mjs:31,35` — `maybeDecrypt` returns the envelope
itself into app state when the key is missing or wrong. That flows through
`pull-apply.mjs` into local SQLCipher, and the local backup is built from
that same store.

So any device that cannot decrypt overwrites its own good plaintext mirror
with unreadable envelopes. Per S0-4 that is every non-owner device. The
plan's recovery section assumes the mirror survives; it does not, for
exactly the devices most likely to need it.

**Fix:** on an undecryptable envelope, skip the local write for that field
rather than overwrite. And replace the plan's "confirm a backup cadence"
action item with a hard gate: take and verify a restorable offline export of
every active room before Stage C.

---

## S1 — Would cause an outage

### S1-1. Registration never caches the password → new rooms silently get no DEK
`handleRegister` (`panel-conexion-handlers.mjs:143-161`) never calls
`cacheSessionPassword`. `ensureRoomDek` returns `null` at `room-dek.mjs:54`
when `sessionPassword` is empty — before the try block, so not even a
`WRAP_FAILED` audit event. `handleCreateRoom:300` swallows it:
`.catch(() => {})`. Toast says "Sala creada" and the room is plaintext
forever.

**Fix:** add `cacheSessionPassword(form.password)` to `handleRegister`;
surface `ensureRoomDek` failure to the user.

### S1-2. The Worker deploy also ships the mobile PWA — which has zero E2EE code
`cloud/sync-worker/wrangler.toml:23-25`:
```toml
[assets]
directory = "../sync-pages/public"
```
Grep of `cloud/sync-pages/` for
`room-dek|wrappedDek|isEncryptedEnvelope|enc:1`: 0 matches. The bundle was
built 2026-08-16; E2EE was built 2026-08-17.

Two consequences the plan misses: (a) Stage A is not "worker only" — it
republishes a client to phones; (b) phones can never be "hand-updated in the
same window" — they need `npm run build:cloud-mobile` and a redeploy.

**Fix:** add both to the plan. Add `cloud/sync-pages/` to the clean-tree
go/no-go check.

### S1-3. Mobile lab window filters on lab-set dates server-side
`mobile-lab-window.js:23` → `filterLabSidecarMapForMobileReference` →
`resolveLabSetMs` on an envelope returns nothing. Mobile/iPad clients
receive zero labs from an encrypted room, decided server-side before
decryption is even attempted. Same class as S0-1: `labSidecars` has a
plaintext-date dependency.

### S1-4. The Worker imports renderer and lib source — the clean-tree check is too narrow
- `cloud/sync-worker/src/interno/vitals-medicion.js:1-5` imports
  `public/js/features/estado-actual-data.mjs` and
  `estado-actual-ranges.mjs`
- `cloud/sync-worker/src/pase-labs.js:6` imports
  `lib/clinical-scope/team-membership.mjs`
- `cloud/sync-worker/src/interno/board.js:1-2` imports `lib/interno/*`

Go/no-go item "`cloud/sync-worker/` clean in git" does not cover these. A
dirty `public/js/features/estado-actual-*` ships straight into production
Worker logic.

**Fix:** the check must cover `cloud/sync-worker`, `cloud/sync-pages`,
`lib/interno`, `lib/clinical-scope`, `lib/lab-mobile-history-window.mjs`,
`public/js/features/estado-actual-*`.

### S1-5. Sweep coverage is not guaranteed for small rooms
`room-dek-migrate.mjs:97` falls back to `foldOpsToLatestByPath(data.ops)`
when `revision ≤ 100`. The daily cron (`cron-purge.mjs`, `crons = ["0 6 *
* *"]`) deletes old `mutations` rows per room. A small room whose ops were
purged folds to an incomplete path set — those fields stay plaintext forever,
silently, and no one ever learns.

**Fix:** after the sweep, re-pull and assert zero remaining plaintext
content paths. Retry or report.

---

## S2 — Security gaps

### S2-1. `entries/{id}` root is not encrypted but can carry `monitoreo`
`cloud-sync-crypto-wire.mjs:22` matches only `entries/{id}/{field}`, never
the root. `interno/vitals.js:93-100` pushes `entries/{patientId}` with
`{id, monitoreo}`. Check `mutate-bridge-ops.mjs` for what the desktop
entry-root op carries — if it carries content fields, E2EE leaks them on
every stub write. Must be resolved before Stage A.

### S2-2. AES-GCM with no additional authenticated data
`crypto.mjs:119` passes no `additionalData`, so the field path is not bound
to the ciphertext. Anyone with D1 write access can move patient A's
encrypted note onto patient B and the client will decrypt it happily.
Confidentiality holds against the stated threat model; integrity does not.

**Fix (one line each side):** `{ name:'AES-GCM', iv, additionalData: new
TextEncoder().encode(path) }`. This must land before any data is encrypted
— retrofitting means re-encrypting everything.

### S2-3. Raw unwrapped DEKs on disk, described inaccurately
`room-dek.mjs:101-107` writes raw DEKs to `cloud-sync-remember.json` (mode
0600). Docs call this "no new trust boundary since anyone who can read that
file already has the Bearer token". A stolen token expires in ~14 days; a
stolen DEK never expires and decrypts every past and future push for that
room. Not a deploy blocker — but correct the wording in `15-security.md:148`.

### S2-4. `handleJoinRoom:326` mislabels a DEK failure as a join failure
`await loadRoomDek(...)` is outside a catch, so a DEK failure lands in the
outer handler and toasts "No se pudo unir a la sala" even though the join
already succeeded server-side. During rollout this will read as "the deploy
broke joining."

---

## S3 — Process, docs, minor

- **A live plan file contains a data-destroying instruction.**
  `docs/superpowers/plans/2026-08-17-nube-e2ee.md:40` says to "remove the
  legacy `WORKER_DATA_KEY` AES path once client E2EE ships (dead code)".
  Production `room_state` is encrypted with that key (`15-security.md:20-22`,
  confirmed by direct D1 query). Executing that line makes every existing
  room permanently unreadable. That plan is still listed Active at
  `docs/core/20-claude-code-handoff.md:53`. Strike line 40 today. Line 41
  ("no new migration needed") is also stale — 006 exists.
- **No min-version gate exists.** Grep of `cloud/sync-worker/src` for
  `min-version|426` returns only a WebSocket upgrade check at
  `room-sync-hub.js:42`. Given S0-4 and S0-7, old and non-decrypting clients
  keep writing plaintext into encrypted rooms with no server-side way to
  stop them. The plan's "skipped: 426 gate" moves from accepted to needed.
- **Dirty deploy config.** `cloud/sync-worker/wrangler.toml` is
  uncommitted, adding only `[observability] enabled = true`. Harmless, but
  it violates the go/no-go clean-tree item. Commit or revert first.
- **`wrangler.toml:5-7` says Workers Paid, `cpu_ms = 30_000`.**
  `15-security.md` repeatedly reasons from "Cloudflare Free" CPU limits
  (lines 39, 58, 82, 145). The Free-CPU argument for dropping at-rest AES is
  stale. Correct the doc.
- **008 foreign key without cascade.** `schema/008` declares `room_id TEXT
  NOT NULL REFERENCES rooms(id)` with no `ON DELETE CASCADE`. D1 enforces
  FKs. Verify `admin.js buildPurgeRoomStatements` deletes `room_state_labs`
  before the room row, or room deletion starts failing where it previously
  succeeded.
- **Compliance.** Treating the personal Cloudflare account and missing DPA
  as non-gating for E2EE is correct — E2EE strictly improves that position.
  Two caveats: (1) do not use "we deployed E2EE" to close the compliance
  item, since identity fields, `clinicalOps`, and the Interno board stay
  plaintext on a personal tenant; (2) the 2026-08-14 GitHub account lock
  proves single-personal-account risk is not theoretical — a Cloudflare
  suspension takes the Worker, the D1, and the wrapped DEKs offline
  simultaneously. That is an availability risk worth naming in the plan, not
  paperwork.

---

## What the plan already gets right — do not change these

- **Password iteration handling is genuinely backward compatible.**
  `schema/007`: `ALTER TABLE users ADD COLUMN password_iterations INTEGER
  NOT NULL DEFAULT 50000`. Correct diagnosis of the 2026-08-14 failure and
  the correct fix.
- **006/007/008 are pure additive DDL.** No data movement, no
  interdependency, no ordering constraint. Applying them ahead of the
  Worker deploy is safe and the live Worker ignores them. Verified from the
  SQL.
- **The `bumpTimestamp` +1 ms design is correct.**
  `room-dek-migrate.mjs:28-32` beats the tie-rejection in `isNewerVersion`
  while still losing to any genuinely newer teammate edit (always stamped
  near "now"). No lost-update window beyond what LWW already tolerates. No
  change needed.
- **`admin.js` reads no encrypted content field** (grep for
  `labSidecars|monitoreo|note|indicaciones|clinicalOps|todos`: zero
  matches). Admin census is genuinely unaffected. The Stage C step 10 check
  on admin census is redundant.
- **008's self-migration-on-next-write design is sound** and independently
  low-risk. Its residual (1.9 MB per patient shard) is honestly documented.
- **Owner-only DEK set + write-once 409** (`room-dek.js:60-71`) correctly
  prevents a second device clobbering a room's key with fresh random bytes.
  Keep it; fix S0-3 with a separate endpoint.
- **Stage ordering (Worker → canary → cohort) is right in principle.** The
  problem is the content of the stages, not the sequence.

---

## Concrete changes to the plan

**Before Stage A (new Stage 0 — design decisions, not deploy steps):**
1. Decide and record: `clinicalOps` stays plaintext (S0-1). Edit
   `cloud-sync-crypto-wire.mjs:21`.
2. Decide and record: `monitoreo` stays plaintext or Interno vitals
   submission is disabled (S0-2). No third option.
3. Add AAD binding to `encryptValue`/`decryptValue` (S2-2). Must precede
   any encryption.
4. Add the DEK rewrap endpoint (S0-3). Do not remove the 409.
5. Resolve the multi-user wrap (S0-4). Until this is designed, E2EE only
   works for single-account rooms — which is not the pilot's shape.
6. Fix fail-open (S0-7) and local-mirror overwrite (S0-8) in
   `cloud-sync-crypto-wire.mjs`.
7. Fix `handleRegister` password caching (S1-1).
8. Answer S2-1 (`entries/{id}` root payload).

**Stage A additions:**
- Clean-tree check expanded to the six paths in S1-4, plus
  `cloud/sync-pages`.
- Note explicitly that this deploy republishes the mobile PWA; rebuild it
  (`npm run build:cloud-mobile`) or accept shipping the 2026-08-16 bundle.
- Add the pre-deploy D1 query for max per-patient `labSidecars` bytes ×
  1.37 vs `labShardMaxBytes` (S0-6).
- Verify `room_state_labs` deletes before `rooms` in the purge path (S3).
- Commit or revert `wrangler.toml`.

**Stage B additions (the canary must actually falsify things):**
- Second distinct user account joined as member, not a second device on
  the owner's account (S0-4).
- Password-recovery round trip: recover, then unwrap the DEK from a third
  device with the new password (S0-3).
- Interno phone board loads and a vitals submission round-trips into an
  encrypted room (S0-2).
- `/api/sync/v1/pase-labs` returns non-empty for an encrypted room (S0-1).
- After backfill, re-pull and assert zero remaining plaintext content
  paths (S0-6, S1-5).
- Rollback drill on the canary: encrypt, `wrangler rollback`, push one
  `monitoreo` op, then roll forward and check whether the ciphertext
  survived (S0-5).

**Rollback section — replace entirely:**
> Rollback is safe only while `SELECT COUNT(*) FROM rooms WHERE
> wrapped_dek_ct IS NOT NULL` returns 0. Run that query first, every time.
> Once any room holds a DEK, roll forward only — the old Worker's
> `mergeMonitoreoLww` / `mergeClinicalOpsLww` will merge an envelope and
> drop its `ct`/`iv`, destroying the data permanently.

**Recovery section — replace the action item:**
> Take and verify a restorable offline export of every active room before
> Stage C. Do not rely on device local mirrors: a device that cannot
> decrypt overwrites its own mirror with envelopes
> (`cloud-sync-crypto-wire.mjs:31,35`).
