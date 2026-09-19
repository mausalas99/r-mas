# iPad → desktop sync: vitals edits and new registrations never arrive

## Diagnosis

The fold/merge pipeline is not the bug. `entries/<pid>/monitoreo` traced end to end:
`foldEntryField` → `buildPatientFromCloudEntry` (`pull-apply-state.mjs`) → `applyLanPatientEntryToExisting`
→ `mergeIncomingMonitoreo` → `mergeHistorialMonitoreo`. A plaintext vitals row from the iPad
always has a new id or a newer `savedAt`, so it would change `historial` and give `updated: 1`.
`added: 0` also proves the patient was found locally (a miss always calls `createNewPatientShell`
and returns `added: 1`).

So the op reached the merge with a value that has no readable payload. Only one thing produces
that: the value is still an E2EE envelope `{ enc: 1, iv, ct }`.

**Root cause 1 (vitals): the desktop never loads the room DEK for an auto-joined turn room, and
an undecryptable value is silently treated as "empty".**

- `api-client.mjs` decrypts with `getCachedRoomDek(roomId)`. `cloud-sync-crypto-wire.mjs`'s
  `maybeDecrypt`: no DEK, or wrong key → returns the envelope as-is, no error, no flag.
- `estado-actual-data.mjs`'s `mergeIncomingMonitoreo` guard `if (!incomingHasPayload && localHasPayload) return;`
  — an envelope has no readable payload → no-op. Exactly `updated: 0`.
- Desktop DEK load only happened in `joinRoomByCode`, `handleCreateRoom`, and the owner-only
  backfill path. The turn room (`ensure-turn`) path never called `loadRoomDek` — every boot,
  reconnect, and team-join round trip through it, and it never learned the room's key unless this
  device happened to be the one that created the DEK.
- The iPad always loads the DEK on connect, so it encrypts; a desktop that never loaded the DEK
  cannot open it. Desktop → iPad still worked (desktop pushes plaintext, iPad passes it through).
  This asymmetry matches the report exactly.

**Root cause 2 (new registrations): the iPad outbox gate drops the identity ops.**
`cloud-mobile/mutation-gate.mjs` allowed only `monitoreo|estadoActual|note|indicaciones|todos`.
`enqueueCloudPatientAdmit` emits `entries/<pid>/fields` and `entries/<pid>` — both filtered out
before ever reaching the Worker. The patient's name/bed/registro never left the iPad. This one
was certain from code alone — `mutation-gate.test.mjs` explicitly asserted `fields` was rejected.

## Fix (implemented 2026-09-17)

1. `ensure-turn-room.mjs`: load the room DEK right after every successful turn-room connect
   (`loadDekAfterTurnConnect`) — the one place every desktop connect (login, boot, team join,
   cross-sala push) goes through. Fire-and-forget, never blocks or throws into connect.
2. `room-dek.mjs`: new `markRoomUnprotected(roomId)`. `api-client.mjs`'s `pull` calls it whenever
   a decrypted response still contains an unopened envelope, so the existing "sala no protegida"
   chip (`panel-conexion.mjs`) shows and `retryRoomDekIfUnprotected` self-heals. Chip copy updated
   to describe unreadable ciphertext specifically.
3. `pull-apply-state.mjs`: ciphertext is never merged into local state as if it were the real
   value — `buildPatientFromCloudEntry`, `cloudEntryToLanEntry`, and
   `assembleLabHistoryFromSidecars` all drop any field still shaped like `{ enc: 1, ... }`.
4. `cloud-mobile/mutation-gate.mjs`: opened the gate for `entries/<pid>/fields` and `entries/<pid>`
   so the iPad's own patient-identity ops (name, bed, registro) can leave the device.

## Tests

Colocated tests updated/added in the same turn, run via `npm run test:one`:
`ensure-turn-room.test.mjs`, `room-dek.test.mjs`, `api-client.test.mjs`, `pull-apply.test.mjs`,
`panel-conexion.test.mjs`, `cloud-mobile/mutation-gate.test.mjs`. All pass (80/80 across the
cloud-sync suite files touched). `npm run build:ui`, `npm run build:cloud-mobile`, and
`npm run metrics:check` all clean.

## Follow-up (same day): deployed, worked, but slow + a new red banner

Owner deployed and confirmed both directions now sync, but reported it "took way too long," and
the desktop showed a new "Esta sala tiene datos cifrados que este equipo aún no puede leer" badge
(transport: Poll).

**Root cause.** `loadDekAfterTurnConnect` (added above) loads the room key fire-and-forget on
connect. But the sync runtime's own first pull on connect fires essentially immediately too. On a
desktop that has never held this room's key before — true for every non-owner desktop the first
time it hits this fix — that first pull can land before the key finishes loading, correctly drops
the still-encrypted data (the Task 3 ciphertext guard), and flags the room via `markRoomUnprotected`
(Task 2). The user then waits out the next scheduled poll (up to 90s) to see the data. Separately,
`loadRoomDek`'s "already cached" fast-return path never cleared `unprotectedRooms`, so once that
race happened once, the red banner stayed up forever afterward even though later pulls were
decrypting fine.

**Fix.**
1. `room-dek.mjs`: `loadRoomDek`'s cached-return path now also clears the room's unprotected flag.
   A cached key means this device can decrypt — any earlier flag is stale.
2. `sync-runtime.mjs`: new `nudgeCloudSyncRuntime()` — re-pulls the active shared runtime right
   away instead of waiting for the next scheduled poll.
3. `ensure-turn-room.mjs`: `loadDekAfterTurnConnect` now checks whether the key was already cached
   *before* calling `loadRoomDek`. Only when the fetch was genuinely new (this device didn't have
   it a moment ago) does it call `nudgeCloudSyncRuntime()` after the key lands — a one-time
   correction on first connect, not a recurring extra request against the free-tier budget.

New test `sync-runtime.test.mjs` (2/2). `room-dek.test.mjs`/`ensure-turn-room.test.mjs` re-verified.
73/73 across every touched cloud-sync + cloud-mobile test file. `build:ui`, `build:cloud-mobile`,
`metrics:check` all clean.

## Not yet done

Live verification of this follow-up: redeploy, restart the desktop app, confirm the red banner
clears (or never shows) on a fresh connect, and a fresh iPad edit lands on desktop within a few
seconds instead of up to 90s.

## Side finding, out of scope

`patient-entries.mjs`'s `applyLanVpoField` deletes local `vpo` on any partial ops-fold entry that
doesn't carry the key — same class of bug as the 2026-09-17 note-wipe fix, not fixed here.
