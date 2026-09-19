# Instant Nube sync: carry real changes over the live line, chart number locked everywhere

## Context

Today, when someone changes a patient in one open window, the server only tells other open windows "something changed, revision N" over a live WebSocket line. Every other window then has to make a second trip back to the server to fetch what actually changed. That second trip is the last real delay in Nube sync — typically a quarter second to two seconds depending on the connection.

The fix: put the actual change inside that first message, so other windows apply it the instant it arrives, no second trip needed.

The blocker: two fields, `registro` (chart/admission number) and `diagnosticos`, are not locked (encrypted) today, unlike notes and other clinical text. Putting them into that live-line message as-is would send them, in plain readable form, to every open window over the wire — the live line's code comment says it should never carry patient content at all.

Digging into why they're unlocked today found one real reason: the server itself reads `registro` as a plain string in one place, to detect a patient being re-admitted under the same chart number and clear the stale "discharged" marker. A second place that used to need it — a round hand-off screen, "Modo Pase" — turned out to be dead: nothing in the app calls it anymore, confirmed by checking for any caller of its API path. The live board screen also never displays these two fields at all, it just carries them along.

So instead of the smaller "only hide these two fields from the live-line message" fix first drafted, this plan locks `registro`/`diagnosticos` the same way notes already are, everywhere, and replaces the one real server-side need (re-admit matching) with a matching trick that doesn't require reading the real value.

## Recommended approach

**1. Lock `registro`/`diagnosticos` like any other protected field, but only those two keys inside the shared `fields` update** (they travel bundled with room/bed/name, which must stay plainly readable for the live board — cama/servicio/nombre are untouched). Reuses the existing lock (AES-256-GCM room key) already used for notes — no new crypto.

**2. Replace server-side plaintext matching with a one-way fingerprint.** When a chart number is set, the device also computes a one-way fingerprint of it (a keyed hash — same input always gives the same fingerprint, but the fingerprint can't be turned back into the real number) and sends that alongside the locked value. The server compares fingerprints instead of real chart numbers to detect a re-admitted patient and clear the old "discharged" marker. Checked this exact trick against Jev (the project's decision-scoring tool): 93 out of 100 sure it's the right fix for this one case, over two other options.

**3. The dead round hand-off screen's server code either gets deleted as unused, or is simply left alone** — since nothing calls it, it will just stop being able to show a readable chart number, which nobody will notice. Deletion is the cleaner move but is a separate, small cleanup, not required for this to ship.

**4. Once `registro`/`diagnosticos` are locked the same way notes already are, the "put the real change in the live-line message" part becomes simpler, not harder** — the server never needs to unlock-then-relock anything for the broadcast; it forwards whatever the device already sent, exactly as it already must for notes today.

Four more judgment calls, about the live-line message itself rather than the locking question, were checked against Jev using the project's real numbers:

- **How big a broadcast message is allowed to get before the server gives up and falls back to the old slow path:** Jev picked 32KB (75% weight vs 8KB/64KB) — comfortably above what even a big batched change produces, small enough to never strain the live line.
- **Ship order for the server change vs. the app change:** Jev favored server first, then app (60% vs. a coordinated flag at 31%, a moderate lean not a strong one). Recommended anyway because an old app talking to a new server just ignores the new part, and a new app talking to an old server just falls back automatically — either order is safe, server-first lets it be checked alone first.
- **Should the existing slow-path safety-net timer learn to unlock these fields too:** Jev's vote was close (56/44). Resolved by a fact, not the vote: that timer's slow fetch reads the real stored value straight from the server, and after this change that value is genuinely locked in storage — so the safety net now needs the same unlock step the fast path uses. This is a change from the earlier draft of this plan, driven by locking the fields for real instead of only for the broadcast.
- **What a window with no room password entered yet this session should show for a locked field it can't read:** Jev strongly picked (95%) the same blank/locked placeholder notes already show in that situation. Adopted as-is.

## Critical files

- [public/js/features/cloud-sync/cloud-sync-crypto-wire.mjs](public/js/features/cloud-sync/cloud-sync-crypto-wire.mjs) — extend the locked-fields list to cover `registro`/`diagnosticos` as two keys inside a `fields` update (siblings like `cama`/`servicio` stay plaintext); add the one-way-fingerprint step alongside the lock step.
- [cloud/sync-worker/src/lww.js](cloud/sync-worker/src/lww.js) — re-admit matching switches from comparing the real chart number to comparing fingerprints.
- [cloud/sync-worker/schema/](cloud/sync-worker/schema/) — the `tombstones` table's `registro` column now stores a fingerprint, not the real number; needs a small migration note (existing rows: either backfill by fingerprinting the stored value once during migration, or accept old tombstones stop matching — flag this choice for review before writing the migration).
- [cloud/sync-worker/src/sync.js](cloud/sync-worker/src/sync.js), [room-sync-notify.js](cloud/sync-worker/src/room-sync-notify.js), [room-sync-hub.js](cloud/sync-worker/src/room-sync-hub.js) — the live-line broadcast now carries the actual change (already-locked, so no per-field redaction step needed here).
- [public/js/features/cloud-sync/room-sync-ws-internals.mjs](public/js/features/cloud-sync/room-sync-ws-internals.mjs), [sync-runtime-cycle.mjs](public/js/features/cloud-sync/sync-runtime-cycle.mjs) — apply an incoming change straight away when the message carries one, unlocking it through the same step a normal fetch already uses.
- [cloud/sync-worker/src/pase-labs.js](cloud/sync-worker/src/pase-labs.js) — confirmed unreachable from the app; flag for deletion as a small separate cleanup.

## Edge cases handled

- **No room password entered yet this session:** locked field shown as a placeholder, same as notes today.
- **Message too big (large batched change):** server omits the change payload above 32KB; window falls back to its existing slow fetch, which now also unlocks these two fields on the way in.
- **Room password/join-code rotation:** confirmed the underlying lock itself never changes on rotation, only its wrapper — a locked value or fingerprint never goes stale from this.
- **Old app version, or old server not yet upgraded, mid-rollout:** the message shape only ever gains an optional extra piece; either side missing it behaves exactly as it does today. Ship the server change first so it can be verified alone before any app depends on it.
- **Old tombstone rows from before this change:** stored with the real chart number, not a fingerprint — won't match a fingerprint-based lookup after the switch. Needs a one-time decision: backfill them by fingerprinting in place, or accept that a patient discharged before this ships and re-admitted after won't get their old marker auto-cleared (a minor, self-healing annoyance, not data loss).
- **Two quick edits to the same patient in a row:** each is its own message, applied as it arrives; nothing gets merged away or dropped.

## Verification

- Extend these existing test files with the new cases (do not run the full suite — `npm run test:one -- <file>` per file, per [.claude/rules/tests-with-code.md](.claude/rules/tests-with-code.md)):
  - `cloud-sync-crypto-wire.test.mjs` — `registro`/`diagnosticos` lock/unlock round trip; fingerprint is stable for the same input and differs for a different one; no-password-yet case leaves the field locked.
  - `lww.js`'s test file — re-admit matching by fingerprint instead of real value; regression case proving unrelated fields in the same update are unaffected.
  - `sync.js`'s and `room-sync-hub.js`'s test files (add if missing) — broadcast carries the change; shape is unchanged when no payload is attached.
  - `room-sync-ws-internals.mjs` / `sync-runtime-cycle.mjs` test files — a message with a payload applies immediately; the safety-net timer still falls back correctly when it doesn't.
- After implementation, `npm run build:ui` (renderer files changed), then verify live in the running app: open two windows in the same room, edit the chart number in one, confirm the other updates without a network-tab GET fetch firing, and confirm re-admitting a discharged patient still clears their old marker.
