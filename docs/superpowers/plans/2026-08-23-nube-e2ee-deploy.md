# Plan — Nube E2EE: built → deployed and verified

## Status (2026-08-25): Stage 0 items 3/4/6/7 confirmed BUILT — Stage A rehearsal not yet run
Verified directly against code on 2026-08-25 (not just this file): interno phone
board + phone vitals routes are disabled server-side (`cloud/sync-worker/src/interno/routes.js`,
503 `temporarily_disabled`) — items 3/4. Backfill chunking is patient-by-patient
(`public/js/features/cloud-sync/room-dek-migrate.mjs: sweepRoomForPlaintextContent`) — item 6.
DEK-fetch retries + in-memory/durable caching are built (`public/js/features/cloud-sync/room-dek.mjs:
fetchRoomDekWithRetry`, `hydrateRoomDeksFromPersistence`) — item 7. Migrations 006–012 are applied
on remote D1 (`wrangler d1 migrations list rplus-sync --remote` → "No migrations to apply"), including
`rooms.wrapped_dek_ct`/`wrapped_dek_iv`/`wrapped_dek_salt` and the admin-escrow columns.
Master switch `NUBE_E2EE_ENABLED = false` in `room-dek.mjs` is the only thing gating rollout — its own
comment says it's waiting on `NUBE_VERSION_GATE_ENABLED` (turned on 2026-08-25, old sessions purged)
plus confirmed fleet adoption. **Stage A's local rehearsal was run on 2026-08-24 (evidence: local D1 has all migrations,
test users/rooms from the handoff doc's own smoke tests) and re-verified 2026-08-25
against today's code** (version floor bumped to 8.2.1, gate on) — all 7 checks in
`docs/superpowers/plans/2026-08-24-stage-a-local-rehearsal-handoff.md` §4(a-f) passed,
including the new case of an 8.2.0 client (the old rehearsal's version) now correctly
rejected. **Stage B's canary room test ran 2026-08-26** against local D1, exercising the real
client crypto code (`crypto.mjs`) end to end: owner creates room + DEK, content pushed
through the Worker lands as ciphertext (`{enc:1,...}`) in D1, a second device joins with
just the room code and correctly decrypts it, an old/no-version client is blocked
outright (426, not shown garbage — a stronger outcome than the plan originally
anticipated, thanks to the version gate), and a pre-existing plaintext room's content
backfills to ciphertext and decrypts back losslessly. All 12 checks passed.
**Fleet adoption is still the one open item** — only 4/20 users (20%) confirmed on 8.2.1
as of 2026-08-25 — the flag's own gating comment wants confirmed adoption, not just the
version floor being enforced. Do not flip `NUBE_E2EE_ENABLED` until that improves.

## Stage 0 — design decisions (resolved 2026-08-23, before any deploy step)

1. **Room key ownership (fixes: only-owner-can-decrypt).** Model B — the room key gets wrapped
   separately for each member's own login password (not a shared passphrase). First-join
   bootstrap: any already-unlocked device auto-wraps a copy for a new member in the
   background, next time it's online — zero manual steps for regular staff.
2. **Admin rescue key (fixes: password-reset permanently locks a room).** Every room's key
   also gets one extra copy locked with an admin public/private key pair. Private key lives
   in the admin's Mac Keychain, never on the server. One admin (djsalas99) for now, extensible
   to more later without redesign. Escrow copy created automatically for every room at
   creation — always available if ever needed, not opt-in per room.
3. **Interno phone board (team-assignment lookup, `clinicalOps`) — removed for now, rebuilt
   later.** Server-side team lookup can't work once this is encrypted. Rather than leave it
   plaintext, the phone board feature is turned off temporarily and redesigned later to do
   the lookup on-device instead of server-side.
4. **Phone vitals submission (`monitoreo`) — removed for now, rebuilt later.** Same reasoning
   as #3 — nurse phone check-in goes offline temporarily rather than staying plaintext,
   redesigned later for encrypted vitals.
5. **iPad/mobile lab viewing — stays as-is, NOT removed.** Only the Interno phone board
   (open/team-based) is being removed — iPad lab viewing is already behind user login and
   is a separate, lower-risk surface. Lab *dates* stay visible (needed for sort/filter); lab
   *content* still encrypts. Small, accepted privacy cost: server can see a lab happened on a
   date, not what it says.
6. **Backfill/size-limit collision (fixes: encrypting old data can hit D1's hard 2MB row cap).**
   D1's 2MB row limit is a fixed platform wall, not raisable by cost — confirmed via
   Cloudflare's own docs and pricing (storage cost is a non-issue at current scale: whole DB
   is <1MB today). Confirmed separately that day-to-day lab writes are already incremental
   (one row per lab result, per `schema/010-shard-room-state-lab-sets.sql`) and can never hit
   the cap. The risk is isolated to the ONE-TIME backfill sweep that turns on encryption for
   an existing room's old data — fix: make that sweep go patient-by-patient, lab-by-lab (the
   same small-piece pattern normal writes already use), instead of pushing everything in one
   shot. Removes the size risk entirely; no need to skip patients or otherwise change the
   crypto format.
7. **Key-fetch failures (fixes: silent-plaintext-fallback risk).** Invest in making key
   fetching reliable BEFORE shipping (retries, local caching of the unwrapped key) so
   failures should be rare. If one still happens: do not block the doctor from working — but
   show a visible, non-silent indicator (e.g. a small badge: "esta sala no está protegida
   ahora mismo") so no one assumes protection that isn't there, clearing automatically once
   the key is available again.

## Goal
Move the tested client-E2EE code (per-room DEK, schema/006+007) into production without a repeat of the 2026-08-14 login outage.

## Key facts that shape the plan (verified in code today)
- **Worker deploy is backward compatible.** `auth.js:107` reads `row.password_iterations` per row; missing/old rows default to 50k (`LEGACY_ITERATIONS`). This is the exact fix for the 2026-08-14 failure mode. Old logins verify under the new Worker.
- **Client E2EE gates DEK *creation*, not encryption.** `room-dek.mjs`'s `NUBE_E2EE_ENABLED` flag (added after this line was written) only guards whether `ensureRoomDek`/backfill ever run — `api-client.mjs` itself still encrypts the moment a DEK is cached, no flag check there. `room-dek-migrate.mjs`'s sweep backfills automatically on **owner login** — the first owner on a new build (once the flag is on) silently encrypts the whole live room.
- **Old clients cannot read envelopes.** `cloud-sync-crypto-wire.mjs:31` passes `{enc:1,iv,ct}` through untouched — old builds render garbage for content fields in an encrypted room.
- **One Worker deploy ships two workstreams.** The tree also contains the labs-shard code (schema/008, not yet deployed). Deploying the Worker deploys both. Migrations 006+007+008 must all apply remotely first.
- **No staging env exists** in `wrangler.toml`. Do not build one — local D1 + a canary account on prod is enough at pilot scale.

## Chosen approach — three stages, each independently safe
The Worker side is safe to ship alone (nothing encrypts until a client holds a DEK). The client side is the dangerous half because backfill is automatic. So: **Worker first, canary room second, cohort app update third** — and the owner of a live room must not touch the new build until the whole room's devices are updated.

---

## Ordered steps

**Stage A — Worker (any day, low-traffic hour)**
1. Confirm `cloud/sync-worker/` has no uncommitted edits.
2. Local rehearsal: `wrangler d1 migrations apply rplus-sync --local` (006, 007, 008), run the sync-worker test suite, then via `wrangler dev`: seed a 50k-iteration user, log in (must pass); register a new user (100k), log in (must pass); push/pull a room.
   *Risk:* stale `.wrangler` local-D1 cache (hit before on 008). If migrations misbehave locally, wipe `.wrangler` state and re-apply — do not skip the rehearsal.
3. `npm run db:migrate:remote` (applies 006+007+008 to prod D1). Verify by D1 query: columns `wrapped_dek_ct`, `password_iterations`, table `room_state_labs` exist; spot-check `password_iterations` on old user rows.
   *Risk:* ALTER TABLE is additive and instant; the current live Worker ignores the new columns. Low.
4. Note the current Worker deployment version ID (`wrangler deployments list`). Confirm `WORKER_DATA_KEY` secret still set (`wrangler secret list`).
5. `wrangler deploy`. Immediately: `/health`; log in with a real existing account (50k row); pull a live room; confirm room content renders on a current 8.1.x app; D1 query confirms `room_state` rows still decrypt (at-rest path `sync.js`/`crypto-at-rest.js` is unchanged in this tree).
   *Risk:* login breaks again → rollback (see below). This is the 15-minute watch window.

**Stage B — Canary room (own devices only, prod Worker, before any release)**
6. On a dev build of the app (not released), create a **throwaway test room** — never log in as owner of a live clinical room from this build.
7. Verify E2EE end to end against prod: `rooms.wrapped_dek_ct` populated; pushed content fields in D1 are `{"enc":1,...}` ciphertext; a second new-build device unwraps with the password and decrypts; monitoreo falls back to plain LWW replace; an **old** 8.1.x build pointed at the canary room shows garbage content but does not crash and identity fields still show.
8. Verify backfill on the canary: make a plaintext room with the old build, then log in as owner with the new build; confirm silent DEK generation + re-push, and that the re-pushed content matches a fresh pull (no data loss).
   *Risk:* backfill re-push clobbers or drops fields. This step is the only place to catch it before it runs on a live room.

**Stage C — Client rollout (cohort-coordinated)**
9. Ship the client E2EE in the next app release. Hand-update **every device in the pilot cohort in the same window**. Best timing: near month turn — rooms are monthly, so new rooms get DEKs at creation and old plaintext rooms retire naturally.
   *Risk:* a straggler old device in an encrypted room sees garbage content until updated. Accepted — small, hand-managed cohort. Mitigation is speed of update, not code.
10. After first live owner login: D1 query confirms live room content is ciphertext; Interno phone board and admin census still work (they read identity fields, which stay plaintext — verify anyway); update `docs/core/15-security.md` deploy status and the handoff table.

---

## Rollback
- **Worker:** `wrangler rollback` to the noted version ID. Migrations stay — old Worker ignores the new columns; do not write down-migrations.
  - *Known cost 1:* accounts created/re-hashed at 100k after deploy fail verify under the old Worker (it hardcodes 50k). Window is small; fix by rolling forward, or password-recovery those few users.
  - *Known cost 2:* labs written into `room_state_labs` shards are invisible to the old Worker. Roll back fast (first minutes) or prefer roll-forward of a fix.
- **Client:** there is **no cheap undo once a live room is backfilled** — decrypting-and-re-pushing plaintext has no tool and we will not build one. Rollback for the client stage = do not ship / pull the release before owners log in. Worst case after backfill: room stays encrypted, cohort must run the new build; or wait for month-turn and start a fresh room. This is why Stage B gates Stage C.

## Go/no-go checklist before `wrangler deploy`
- [ ] 006+007+008 applied to remote D1; columns verified by direct query
- [ ] Local rehearsal passed: 50k login, 100k register+login, push/pull
- [ ] Sync-worker test suite green in this tree
- [ ] `WORKER_DATA_KEY` present in `wrangler secret list`
- [ ] Previous deployment version ID written down; rollback command ready
- [ ] `cloud/sync-worker/` clean in git; deploying from the tested commit
- [ ] Low-traffic hour, not mid-guardia; free to watch 30 min and do a live login test

And before Stage C (app release): all Stage B canary checks passed, including the backfill round-trip.

## Recovery path if a room is lost or a key is lost (added 2026-08-23)

On desktop, Nube pull applies the **full room** to the local DB (`pull-apply.mjs:192-193`, not team-filtered — that filter is mobile/PWA-only). So any device that was recently synced holds a full, already-decrypted plaintext copy of every patient in the room, and the local backup (`backup-payload.mjs`) is built from that same store.

Practical effect: if a cloud room is wiped/corrupted, or a room DEK is lost, any team member's recent local backup can be used to manually recreate the room's data — no DEK needed, because the backup was taken after local decryption. This meaningfully lowers the "lost forever" risk that a naive reading of E2EE (Cloudflare never sees plaintext) implies. It does **not** help with Nube login/password failures (unrelated system) — only with data loss.

Action item: before Stage C, confirm at least one team member per active room takes a local backup on a normal cadence, since this is now the de facto room recovery mechanism.

## Skipped, and why (ponytail)
- **Staging environment** — none exists; local D1 + prod canary room covers pilot scale. Add if the cohort grows past one program.
- **426 / min-version gate for old clients** — real code, real risk surface of its own; the cohort is small and hand-updated. Add before opening Nube beyond the pilot salas.
- **Interno bed/alias redesign** — not cheap (server-side board reads names); stays a separate follow-up as directed.
- **Decrypt-and-repush rollback tool** — YAGNI; month-turn rooms are the escape hatch.
- **DEK audit logging + DPA/account move** — do not gate deploy; log as first follow-up after Stage C.

## Task list
**Lead (Sonnet):** Stage A steps 1–5 (rehearsal, remote migrate, deploy, live login verify). Stage B steps 6–8 (canary room, backfill round-trip). Stage C step 10 doc updates.
**Dev (Haiku):** run the sync-worker test suite pre-deploy; D1 verification queries (columns, ciphertext spot-checks, `password_iterations` on old rows); grep-confirm no uncommitted `cloud/sync-worker` files at deploy time.
**Senior (Opus):** only if Stage A login verify fails or Stage B backfill loses data.

## Smallest file set to touch
Code: **none** (deploy-only).
Docs after each stage: `docs/core/15-security.md` (Deploy status), `docs/core/20-claude-code-handoff.md` (plan table rows for E2EE + labs shard, since one deploy ships both).
