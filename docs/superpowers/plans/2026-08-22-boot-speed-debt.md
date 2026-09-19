# Boot speed and debt plan

Date: 2026-08-22
Status: not started

## Goal

Make the first screen show faster. Get the technical-debt score near 0.
No fake fixes — the score must reflect a real, honest state.

## Background

`npm run metrics:check` reported a debt score of 384 vs a committed baseline
of 0 (`scripts/metrics/baseline.json`, dated 2026-08-07). Two parts:

- **bootGraphDebt = 200** — 8 new static (eager) imports added to the boot
  hub files `public/js/app.js` and `public/js/app-runtimes.mjs` during the
  teal workbench shell redesign (commit `e05bf7d4`). Files:
  `features/app-tabs-runtime.mjs`, `features/app-tabs.mjs`,
  `features/expediente-inner-cache.mjs`, `features/expediente-navigation.mjs`,
  `features/nota-evolucion/nota-evolucion-primary-tab.mjs`, `ui-tab-motion.mjs`.
- **complexityOverage + lengthOverage = 184** — long/complex functions in
  `patient-dashboard/dashboard-html.test.mjs`, `cloud-sync/mutate-bridge.test.mjs`,
  `nota-evolucion/nota-evolucion-panel.mjs`, `app-shell-modals.mjs`.

## Findings (CEO research, 2026-08-22)

- All 8 boot imports are wired into `runDeferredShellAfterOnboarding()`
  (`public/js/app.js:436`), which runs **synchronously** during normal boot
  (`runDomBootAfterState()`, right after `loadSettings()`) — not gated
  behind a later user action, despite the name.
- Of the 8 files, only 2 things must be ready in the very first frame:
  `renderInnerTabs()` and `syncMainAppTabA11y()` (paint the tab bar and its
  first content). The other 5 — tab-bar animation (`ui-tab-motion.mjs`),
  inner-tab render cache (`expediente-inner-cache.mjs`), the note-form
  screen (`nota-evolucion-primary-tab.mjs`), `switchAppTab` wiring
  (`app-tabs.mjs`), and DI stub (`app-tabs-runtime.mjs`) — are not needed
  for the first paint and can load a beat later with no visible difference.
- esbuild already runs with `splitting: true` and hashed chunk names
  (`scripts/bundle-renderer.mjs`); this pattern is already proven in
  production for the chart.js chunk (`lazy-feature-routes-charts.mjs`).
  No bundler change needed.
- `dashboard-html.test.mjs` and `mutate-bridge.test.mjs` are real test
  files (colocated `*.test.mjs`), not misfiled source — but
  `scripts/metrics/score.mjs` (~line 36) applies the wrong length budget to
  them (subtracts 80 instead of the intended looser 320-line budget for
  test files), over-charging part of the 384 by roughly 3x. This is a
  scanner bug, not real app debt.
- Only one flagged source function (`wireModalDismissLayers` in
  `app-shell-modals.mjs`) runs at boot, and it's cheap — Part B (the 184
  complexity/length points) does not meaningfully affect boot speed.

## Risk to guard against

Converting eager imports to `await`-ed dynamic imports at the same boot
point would satisfy the debt score but not make the app faster (same
bytes, same timing) — and risks a one-frame flash of an empty shell if
the await point isn't handled carefully. Rejected in favor of Phase 1
below (non-blocking parallel loads).

## Phase 1 — real speed (Lead)

Keep eager only what paints frame one: `renderInnerTabs` and
`syncMainAppTabA11y`. Split `expediente-navigation.mjs` so its render path
is a small eager file; move the rest of its logic out.

Convert the rest — `ui-tab-motion.mjs`, `expediente-inner-cache.mjs`,
`nota-evolucion-primary-tab.mjs`, `app-tabs-runtime.mjs`, `switchAppTab`
(`app-tabs.mjs`) — to `import()` calls **started at boot but not awaited**
before first paint. Bytes load in parallel; the tab bar never waits. Wire
each module in as its import resolves.

Add `performance.mark` timing around the boot sequence so the real-world
win is measurable in milliseconds, not just inferred.

**Verify:** packaged-app cold launch (not dev mode) on at least one
platform, watching for any flash of an empty tab bar. This was CEO's
explicit condition before shipping.

## Phase 2 — honest debt (Lead + Dev)

- Lead: fix the `score.mjs` length-budget bug for test files (use the
  correct ~320-line budget instead of 80). Split `wireEvents` and
  `wireModalDismissLayers` in `app-shell-modals.mjs` into smaller helpers.
- Dev (Haiku): split the 432-line test blocks in `dashboard-html.test.mjs`
  and `mutate-bridge.test.mjs` into smaller `describe` blocks. Run
  `npm run test:one` on both. Run `npm run build:ui` and
  `npm run metrics:check`. Refresh the baseline once score is at/near 0.

## Files to touch

`public/js/app.js`, `public/js/app-runtimes.mjs`,
`public/js/features/expediente-navigation.mjs` (+ new small core file),
`public/js/ui-tab-motion.mjs` call site,
`public/js/features/nota-evolucion/nota-evolucion-panel.mjs`,
`public/js/app-shell-modals.mjs`,
`public/js/features/patient-dashboard/dashboard-html.test.mjs`,
`public/js/features/cloud-sync/mutate-bridge.test.mjs`,
`scripts/metrics/score.mjs`.

## Do first

Phase 1. It's the only work that makes the app feel faster to a user.
Phase 2 is score cleanup and can follow the same day.

## Phase 1 — result (2026-08-22)

Shipped: `initTabBarMotion()` now runs after first paint (double
`requestAnimationFrame`) instead of inline in
`runDeferredShellAfterOnboarding()`. `renderInnerTabs()` and
`syncMainAppTabA11y()` untouched — still synchronous, still paint first.
Perf marks added (`deferred-shell-start`,
`deferred-shell-eager-paint-done`, `deferred-shell-tab-bar-motion-ready`)
using the existing `perf-markers.mjs` pattern.

**Finding that changes the plan:** the other 5 boot files
(`app-tabs.mjs`, `expediente-navigation.mjs`, `nota-evolucion-primary-tab.mjs`,
`expediente-inner-cache.mjs`, `app-tabs-runtime.mjs`) cannot be split in
isolation. `features/profile.mjs` (needed eagerly for settings) has a
transitive chain — `profile-app-mode.mjs`, `profile-formats.mjs`,
`profile-prefs.mjs`, `medications-actions.mjs` — that also statically
imports `switchAppTab`/`switchInnerTab`. Splitting the 5 files alone
doesn't reduce real eager bytes (measured: bytes went up slightly).
Reverted that part. `bootGraphDebt` stays at 200.

Tests: `npm run test:one -- public/js/app-boot-imports.test.mjs` 9/9 pass.
Build clean.

## Phase 3 — profile.mjs chain (CEO-scoped, 2026-08-22, not started)

CEO confirmed: every `switchAppTab`/`switchInnerTab` call in the
profile/medications chain is inside a **user-action handler**
(`profile-app-mode.mjs:46-52`, `profile-formats.mjs:81-95`,
`profile-prefs.mjs:37`, `medications-actions.mjs:32`) — never boot code.
This looks like an accidental transitive import, not a structural need.
The repo already has two proven patterns for breaking this kind of link
(runtime stub used in `chrome.mjs`/`vpo-panel.mjs`/`receta-hu-shared.mjs`;
window-global check used in `paste-smart.mjs`/`command-palette.mjs`), and
precedent inside the same chain (`profile-app-mode.mjs:35-39` already
lazy-loads `interconsulta-mode-chrome.mjs`).

**Decision:** measure before refactoring. A debt score is not a stopwatch
— no real millisecond cost has been measured yet, and the fix sits near
patient settings and medication actions in a live medical app.

**Stage A result (2026-08-23, see `docs/superpowers/plans/2026-08-23-boot-debt-phase2-phase3a.md` for full method):**
gate failed — 0 exclusive eager bytes would actually leave the bundle if
the 5 files' direct edges from `app.js`/`app-runtimes.mjs` were cut, because
`profile-formats.mjs`/`profile-prefs.mjs` still import them directly for
`switchAppTab`/`switchInnerTab`. Stopped, as the gate specifies.
`bootGraphDebt = 200` accepted as understood, real debt. Stage B not
started — it would require changing the profile/medications chain itself,
which is a different, larger decision than this investigation was scoped for.

**Stage A — investigation only, no code changes to feature files (Dev/Haiku):**
1. Packaged-app cold launch, 5 runs, record the Phase 1 perf-mark deltas
   (boot start → first paint) as a real-ms baseline.
2. From the esbuild metafile, report the KB the 5 boot-debt files + their
   exclusive subtree add to the eager bundle.
3. **Gate:** if exclusive eager bytes < ~75 KB, or projected saving
   < ~10 ms — stop. Document 200 points as accepted, understood debt.
   Otherwise proceed to Stage B.

**Stage B — refactor (only if gate passes, Lead):**
1. In the 4 profile/medications files, replace the static
   `switchAppTab`/`switchInnerTab` imports with the existing runtime-stub
   or window-global pattern (call sites are all inside handlers already).
   Add/extend colocated tests using the existing mock pattern
   (`guardia-patient-action-sheet.test.mjs:10-35`).
2. Re-apply the Phase 1 split of the 5 boot files (non-blocking `import()`
   at boot).
3. Verify: eager-bytes budget test, before/after perf marks on a packaged
   cold launch, manual smoke test in Spanish UI (Sala/Guardia mode switch,
   one medication action, one format navigation). Then `metrics:check`.

**Files (Stage B only):** `profile-app-mode.mjs`, `profile-formats.mjs`,
`profile-prefs.mjs`, `medications-actions.mjs`, the 5 boot files + their
colocated tests, this plan doc.
