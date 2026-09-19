# Cross-area network view (admin, full unlock)

## Context

Admin asked for a way to see all patients across every hospital area (sala)
in one place — they noticed patients from Área A/Pensionistas were missing.

Root cause: each Electron device's Nube (cloud sync) connection is paired to
exactly one "room," and each room is tied to exactly one sala (Sala 1, Sala
2, Sala E, Torre HU, Interconsultas, UX, Eme, Área A/Pensionistas). Even an
Admin-rank account only ever pulls the one room its device is paired to —
there's no view spanning rooms today.

Follow-up ask: not just a read-only directory — the admin wants their own
device able to open the **full chart** in any area, for debugging/help.

CEO review (ceo-fable) caught that this does **not** need any new crypto or
trust model. `GET /admin/rooms` (`cloud/sync-worker/src/admin.js:100-123`,
client `api.adminRooms()` in `api-client.mjs:116`) already hands an
admin-role user every room's plaintext join **code**. With the code, the
existing per-room flow — `joinRoom`, `loadRoomDek`, `pull` + decrypt — already
does everything needed. No canonical admin keypair, no new server tables, no
IPC changes, nothing under `cloud/`, `lib/`, `preload.js`, or `main.js`. This
plan replaces an earlier draft that proposed rebuilding the admin-rescue-key
escrow system — rejected as solving a problem that doesn't exist: the admin
already has a legitimate way into every room via its own room code.

## Design (single phase)

**`public/js/features/cloud-sync/network-census.mjs`** (new):
1. `api.adminRooms()` → group by `sala`, pick the current room per sala by
   highest `turnKey` (sala+month, sorts lexically as `YYYY-MM`).
2. For each of the 8 `CLOUD_SALAS`
   (`public/js/features/cloud-sync/sala-allowlist.mjs`) that has a current
   room: `api.joinRoom({ code })` (idempotent — `INSERT OR IGNORE` server
   side) → `loadRoomDek(api, roomId, code)`
   (`public/js/features/cloud-sync/room-dek.mjs`) → `api.pull(roomId, 0)` →
   `decryptRoomStateFromPull` (`cloud-sync-crypto-wire.mjs`) → collect
   `entries[]`.
3. A sala that errors (room full — `QUOTAS.maxMembers` in
   `cloud/sync-worker/src/quotas.js`, or missing DEK) yields a `{ sala,
   error }` row instead of throwing, so one bad room doesn't blank the view.
4. **Restore the device's own home room at the end.** Each `joinRoom` call
   moves the server-side `active_room_id`
   (`rooms.js` `setUserActiveRoom`, called from `handleJoinRoom`) — looping
   over 8 rooms leaves it on the last one touched, which would break this
   device's normal sync and the mobile `handleActiveRoom` lookup. Re-join
   (or re-activate) the device's actual home room code once the sweep
   finishes.
5. Tag these DEK reads distinctly in the existing audit trail:
   `auditDekEvent(DEK_EVENTS.WRAP_GET, { roomId, reason: 'network-census' })`
   (`cloud-sync-audit.mjs`) — so a census sweep is distinguishable from normal
   sync in the log, same mechanism already used elsewhere in `room-dek.mjs`.

**`public/js/features/cloud-sync/network-census-view.mjs`** (new): a modal,
same pattern as the existing admin directory
(`clinical-teams/teams-roster-directory-modal.mjs` +
`-directory-render.mjs`), grouped by sala in `CLINICAL_SALA_VALUES` order
(`lib/clinical-salas.mjs`) — reuse the sort approach from
`orderedTeamIdsWithPatients()` in `unified-patient-grid-team-groups.mjs`,
grouping by sala instead of team. Each patient renders via the existing
`renderPatientCardHtml()` (`patients-card-html.mjs`). Clicking a patient:
switch this device's active room to that patient's room, reusing the same
join mechanics as `handleJoinRoom` in `panel-conexion-handlers.mjs` (already
a member after the sweep, so this is just a switch), then open the chart
normally.

**Entry point:** a button next to the existing directory trigger. Gate on
the **server's** admin check, not just the client rank check — client-side
`hasElevatedTeamPrivileges()` (`clinical-privileges.mjs:70-74`) also passes
R4, but the server's `ADMIN_ROLES` (`admin.js`) is `admin`/`program_admin`
only, so an R4 would hit a 403. Show the button for elevated users but
surface a plain "solo Admin de Nube" message on a 403 rather than gating
purely client-side.

## What this deliberately does not change

- No new database table, no canonical admin keypair, no new IPC, no changes
  to `lib/admin-rescue-key.mjs` (that stays exactly what it was built for —
  lost-room-code rescue, not this).
- Regular staff devices and their normal single-room sync: untouched.
- A room at its 20-member cap (`QUOTAS.maxMembers`) simply shows as
  unavailable in the census (`{ sala, error }` row) rather than failing the
  whole view.

## Verification

- Colocated tests per `.claude/rules/tests-with-code.md`:
  `network-census.test.mjs` (per-sala room selection by turnKey, home-room
  restore after the sweep, error rows for full/inaccessible rooms),
  `network-census-view.test.mjs` (grouping/sort order). Register new test
  files in `package.json` `scripts.test`.
- `npm run test:one -- public/js/features/cloud-sync/network-census.test.mjs`
  and the view test, before `build:ui`.
- `npm run build:ui` after the renderer edits.
- `npm run metrics:check` before merge.
- Manual: as the Admin account, open the network view, confirm
  Área A/Pensionistas patients appear with real names/beds, click one,
  confirm the device's active room switches and the chart opens, then
  confirm normal sync still points at the original home room afterward.
- Update the row in `docs/core/20-claude-code-handoff.md` in the same turn
  this ships.
