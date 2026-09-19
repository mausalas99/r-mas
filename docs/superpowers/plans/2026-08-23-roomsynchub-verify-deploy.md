# RoomSyncHub push: verify and deploy

Date: 2026-08-23
Status: planned, not started

## Goal
Move Nube room sync from 8s polling to Durable Object + WebSocket push, using the Workers Paid plan. Code already exists — this is verify-and-deploy, not build.

## What exists (confirmed in tree)
- DO complete: `cloud/sync-worker/src/room-sync-hub.js`, `room-live.js`, route in `rooms.js:502`, notify-after-commit in `sync.js:512`, export in `index.js`, DO binding + `v1` migration in `cloud/sync-worker/wrangler.toml`.
- Client complete: `room-sync-ws.mjs` / `room-sync-ws-internals.mjs` (reconnect 1-30s backoff, 300ms debounce, poll fallback). Wired into desktop (`panel-conexion-runtime.mjs:65`) and mobile (`public/js/features/cloud-mobile/runtime.mjs:84`).
- Timing already WS-aware: `cloud-sync-timing.mjs` — 90s idle / 30s active with WS up, 8s fallback only.

## Constraints
- WS carries revision numbers only, never clinical snapshot data (`docs/core/15-security.md:55`). No PHI change, no E2EE change.
- `wrangler deploy` ships all of `main`, including pending room_state shard code that needs remote migration 008 first (see `2026-08-21-shard-room-state-labs.md`). Do not deploy before that gate.
- Rollback: `wrangler rollback`. Clients auto-fall back to polling. Cheap revert.

## Cut from original 8.1.0 design (ponytail)
No new code needed. Do NOT add: presence, payload-over-WS, per-client queues, a feature flag. Revision-hint-only is correct as-is.

## Phases

1. **Verify prod state.** `wrangler deployments list` in `cloud/sync-worker`; test `wss://…/rooms/<test-room>/live` — DO may already be live from a past release.
2. **Pre-deploy gate.** Confirm E2EE worker code on main is inert without client opt-in; run `npm run db:migrate:remote` for migration 008.
3. **Deploy.** `wrangler deploy` in `cloud/sync-worker`. Rebuild mobile asset chunks first if they predate `room-sync-ws` wiring.
4. **Verify desktop.** Two R+ instances, one room. Edit on A, confirm B updates <2s. Kill the route, confirm B degrades to 8s polling.
5. **Verify mobile.** Same two-device check on R+ Móvil.
6. **Close out.** One fallback test in `room-sync-ws.test.mjs`; update handoff doc status row; release-notes line (Spanish, no PHI claims).

## Files to touch
- `public/js/features/cloud-sync/room-sync-ws.test.mjs` (one test)
- `docs/core/20-claude-code-handoff.md` (status row)
- Possibly rebuilt: `cloud/sync-pages/public/mobile/js/chunks/*` (build output only)

## Stop condition
If phase 1 shows the DO already serves prod traffic, phases 2-3 collapse to "confirm chunk freshness" — becomes docs + test only.
