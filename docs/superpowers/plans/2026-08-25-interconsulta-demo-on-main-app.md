# Handoff — interconsulta board demo, seeded on the main app — NOT STARTED (pivot)

**Date:** 2026-08-25
**From:** Claude (Sonnet) — this session
**To:** fresh Claude Code session
**Branch:** `main`, uncommitted (see `git status`)

## What the user actually wants (changed mid-session)

Original ask: seed 12 demo patients into the interconsulta board (8 recurring
follow-ups across teams, 2 VPOs, 2 new interconsultas for the on-call team) so
the board can be screenshotted/demoed.

First attempt built this as a **verify-script-only** feature (user's explicit
choice at the time via AskUserQuestion): a Playwright script + a
`window.seedInterconsultaDemo()` hook that only exists to drive throwaway
Electron profiles for screenshots.

**User then changed direction:** they want the demo seeded directly in the
**real, main running app** — the one they actually use — not a throwaway
profile. Patients should be **visible in the real UI** but **hidden from
sync/persistence**, the same way the existing "Modo presentación" (DEMO
PÉREZ) pitch patient is hidden. This is a materially different, more
sensitive feature: it touches the real local DB and the real cloud sync path
for the user's actual account.

## What's already built (safe to reuse as-is)

- [`lib/clinical-scope/interconsulta-demo-seed.mjs`](../../../lib/clinical-scope/interconsulta-demo-seed.mjs) — pure, tested builders:
  - `buildInterconsultaDemoTeams()` — 4 fixed Interconsultas teams (A–D)
  - `buildInterconsultaDemoPatients(roles, now)` — the 12 patients (8 follow-up / 2 VPO / 2 new-IC), correctly bucketed per `classifyInterconsultaBoardBucket`
  - `buildInterconsultaDemoAssignments(patients, now)` — `{patient_id, team_id, effective_at, created_at}` rows, because the board resolves each patient's lane via `resolvePatientCensusTeamId()` (assignments first), not via a `censusTeamId` field on the patient object
  - Full test coverage: `lib/clinical-scope/interconsulta-demo-seed.test.mjs` (7 tests, all passing)
- These builders are **display-shape-agnostic** — reusable regardless of where/how the demo gets triggered. Keep them.

## What needs to change for "on the main app, hidden from sync"

Do NOT reuse `public/js/tour-ic-demo-seed.mjs` or `scripts/verify/interconsulta-demo-seed.mjs` as-is — those assume a throwaway verify profile and unconditionally overwrite `clinicalSessionContext.teams`/`getPatients()`, which would nuke the user's real teams and real patient list. Delete or repurpose them.

### The hiding mechanism: two separate problems, only one has precedent

1. **Hide from local persistence (SQLCipher).** Precedent exists:
   `setPersistPatientsResolver()` (`app-state.mjs`) — when set, `persistClinicalState()`
   filters out `p.isDemo` (and the two hardcoded pitch ids) before writing to
   disk. `tour-pitch-demo-seed.mjs`/`presentation-mode.mjs` already use this.
   **Do not** also call `setPitchPatientIsolation(true)` — that flag makes
   `clinical-read-model-demo.mjs`'s `getPatientsForDisplay()` show **only**
   the isolated demo patient(s) and hide everything else (this bit me hard
   in the verify-script attempt — cost real debugging time). The user wants
   demo patients **mixed into** the real visible list, not a full-screen takeover.

2. **Hide from cloud sync.** **No precedent exists. Verified by grep this
   session: nothing in `public/js/features/cloud-sync/*.mjs` checks
   `p.isDemo` anywhere** — `cloud-census-collect.mjs`, `mutate-bridge.mjs`,
   `cloud-census-sala-push.mjs`, `pull-apply.mjs` all iterate `getPatients()`
   directly with no demo filter. The pitch/presentation-mode demo patient
   has never needed this because pitch mode's display isolation (problem 1's
   footgun above) means normal sync flows never see real+demo patients
   mixed together in the first place. **This is the actual open problem** —
   whoever picks this up needs to find every cloud-sync call site that reads
   `getPatients()` and either:
   - add an `isDemo` filter at each site (grep `getPatients()` inside
     `public/js/features/cloud-sync/`), or
   - add one filtered accessor (e.g. `getSyncablePatients()`) and migrate
     those call sites to it — probably the better long-term shape, less
     footgun-prone than N separate filters.

   Before writing any code here: trace what actually triggers a push (is it
   pure `scheduleCloudSyncPush()` calls, a periodic full-outbox flush, or
   both?) and confirm demo patients can't leak in through cloud pull/merge
   either (a remote peer's `pull-apply.mjs` should never receive or apply
   `isDemo` rows).

### Suggested shape (not implemented, just a starting point)

- A toggle, e.g. `window.seedInterconsultaDemo()` / a settings/debug menu
  item, that:
  - builds teams/patients/assignments via the existing lib functions
  - **merges** into the real `getPatients()` array (`setPatients(getPatients().concat(demoPatients))`), not replace
  - **merges** into `clinicalSessionContext.teams`/`scopeContext.assignments`, not replace (keep the user's real teams)
  - calls `setPersistPatientsResolver(...)` so `persistClinicalState()` strips `isDemo` patients before hitting SQLCipher
  - does **not** call `setPitchPatientIsolation(true)`
- A companion "clear demo patients" action (filter `!p.isDemo` back out of
  `getPatients()`, restore the resolver to `null`) — the pitch demo has
  `clearPitchDemo()` as precedent for the shape, not the content.
- Whatever cloud-sync fix from problem 2 above, with its own test(s).
- Decide where this lives in the UI (a real settings toggle vs. a hidden
  dev-only shortcut like `initPresentationShortcut()`'s ⌘⇧⌥P) — ask the user
  if unclear; this wasn't specified.

## Verification before calling it done

- `npm run test:one` on every touched file (existing lib tests, new
  cloud-sync filter tests, any new wiring test)
- Manually confirm in the real app: seed demo patients, trigger a cloud
  sync push (or inspect the outbox payload / network request), confirm demo
  patients are **absent** from what's sent
- Confirm local DB (`SELECT` via sqlite3 on the profile's `.db`, or the
  existing persistence test pattern) never contains `isDemo` rows after a
  `persistClinicalState()` flush

## What NOT to redo

- Don't re-litigate the patient/team data shape — `interconsulta-demo-seed.mjs` and its tests are solid, reuse them.
- Don't reuse `tour-pitch-demo-seed.mjs`'s `setPitchPatientIsolation(true)` — confirmed this session to hide everything else, wrong behavior for this ask.
