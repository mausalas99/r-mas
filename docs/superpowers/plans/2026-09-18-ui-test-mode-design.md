# UI test mode — design (planning only, nothing built)

**Date:** 2026-09-18
**Status:** proposed, not started. Ask from a peer session ("Message routing computeruse") relayed to this session: design a fully isolated synthetic-data mode for adversarial UI review (every screen, every click) with zero risk to real patient data and zero risk of breaking the live app.
**Routing:** every judgment call below went through Jev (`scripts/jev/choice.mjs`) grounded on a survey of the current data model, not picked from plain reasoning. Two calls came back below the 0.85 act-without-asking threshold and were escalated to the owner; both were decided in this session (see "Owner decisions").

## Architecture facts this design rests on

- Patients: one `patients` table (`lib/db/schema-primitives.mjs`), scoped by `censusTeamId`/`interconsult_type`. Censo/Sala/Guardia are status/team values, not separate tables.
- Cloud sync: Worker URL is a constant in `public/js/features/cloud-sync/settings.mjs`, already overridable via `localStorage.cloudSyncUrl` or `window.electronAPI.getDevCloudSyncUrlOverride()` (dev-only). `api-transport.mjs` calls it directly, no abstraction layer.
- Existing precedent: `scripts/dev-nube-test-app.mjs` already launches a second Electron process with its own `--user-data-dir` and its own port, via env vars — zero in-app code changes. It currently points at the **real** Worker; this design forks that pattern to point at a fake one instead.
- Existing fixture precedent: `lib/clinical-scope/interconsulta-demo-seed.mjs` seeds ~12 synthetic patients into a real running DB for the tour/pitch flow. Reusable as a starting point for a larger synthetic roster, not as the isolation mechanism itself.
- Labs: parsed inline from pasted text by `public/js/lab-bulk-paste.mjs` + `labs-extract.mjs` (regex-based), no separate normalizer to fake.
- No centralized feature-flag system exists. Config is env vars read at boot + localStorage keys.

## Decisions (Jev confidence ≥ 0.85 — acted on directly)

| # | Decision | Answer | Confidence |
|---|----------|--------|------------|
| 1 | Toggle mechanism | Extend `dev-nube-test-app.mjs`'s pattern: separate process, separate `--user-data-dir`, env-var driven, zero changes to the real app's runtime code | 1.00 |
| 2 | Synthetic data storage | A real, fresh SQLCipher DB in the isolated userData dir, same schema, filled by a seed script — not an in-memory mock, not fixture JSON injected past the DB | 0.99 |
| 3 | Nube simulation | A small local mock HTTP server that fakes the Worker's API surface (rooms, ops, sync failures, lock states); point `cloudSyncUrl` at it | 1.00 |
| 4 | Scope boundary | Keep E2EE crypto correctness, real Worker infra, and load/performance testing **out of scope** — those are already covered by existing unit/integration tests; this mode is for UI/click coverage only | 1.00 |
| 5 | Safety guarantee | The test-mode launcher hardcodes its own userData dir and a non-default mock sync URL, and **refuses to boot** if it detects the real production Worker URL or an existing real userData path | 1.00 |

## Owner decisions (Jev was a near-tie or moderate confidence — escalated, owner picked)

| # | Decision | Jev's read | Owner picked |
|---|----------|-------------|--------------|
| 6 | Synthetic labs fixtures | 0.67 confidence, "both" at 78% probability | **Both** — structured lab records seeded for most synthetic patients, plus a few raw pasted-text fixtures so the paste/parse screen itself gets exercised |
| 7 | Fault-injection mechanism | 0.30 confidence, a near-tie (config file 53% vs live toggle 46%) | **Scenario config file** — the mock server reads a JSON fault-injection config at launch (sync failures, stuck locks, timeouts), so an adversarial sweep is deterministic and repeatable run to run |

## What test mode looks like, end to end

1. `npm run dev:ui-test` (new script, sibling to `dev:nube-test`) launches a second Electron process:
   - `--user-data-dir` → a dedicated temp dir, always wiped fresh (no `--keep` option — test mode is never meant to accumulate state across runs).
   - `R_PLUS_CLOUD_SYNC_URL` → `http://localhost:<mock-port>`, never the real Worker.
   - A boot-time guard (new, small): if the resolved sync URL matches the real Worker's hostname, or the userData path matches the real app's default userData path, the process refuses to start and prints why.
2. On first boot in this userData dir, a seed step (extends `interconsulta-demo-seed.mjs`'s approach, not its exact seed) writes a larger synthetic roster into the real SQLCipher DB: patients across Censo/Sala/Guardia team values, varying ages/sexes/diagnoses, structured lab records for most, a handful with raw paste-text fixtures instead.
3. The mock Nube server (new, small Node HTTP server) serves the same request shapes `api-transport.mjs` sends today — rooms, ops, revisions — backed by in-memory state, seeded with a couple of fake teams/rooms so cloud-sync screens have something to show. It reads a scenario config file (JSON) at launch that can inject: a sync timeout, a stuck "encrypted room, no key yet" banner, a stale revision race, a rate-limited unlock lockout.
4. Everything else (rendering, patient screens, notes, meds, labs UI, settings) runs unmodified — same app code, same schema, pointed at fake data instead of real.

## Explicitly out of scope

- Crypto correctness (E2EE key derivation, encryption/decryption round-trips) — already unit-tested; the mock server doesn't need to speak real ciphertext, just shapes the UI expects.
- Real Worker/D1 behavior (rate limits, actual persistence, real network latency) — covered by the sync-worker's own tests.
- Performance/load testing — this mode is for click-through coverage, not stress testing.
- Multi-device/multi-window real sync races — the mock server is single-process, in-memory; cross-window race testing stays on the real `dev-nube-test-app.mjs` path.

## Open follow-ups before implementation starts

- Exact list of adversarial scenarios to encode in the fault-injection config (needs a short list from whoever runs the adversarial pass — likely the computer-use/Jev UI-audit routing work already in flight per `project_jev_computeruse_routing`).
- Whether the seed roster should be regenerated per run (fully random within constraints) or fixed (same patients every run, for reproducible bug reports) — not asked yet, worth a quick Jev/owner call once implementation starts.
- No code has been written for this. Next step, if approved, is a `lead-dev` implementation pass split into: (a) the launcher + boot guard, (b) the seed script, (c) the mock Nube server + scenario config.
