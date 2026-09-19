# Boot debt — Phase 3 Stage B (profile-chain decoupling), gated

Date: 2026-08-23
Status: not started
Owner: Lead (Sonnet). Stage B.0 measurement: Dev (Haiku).
Prior docs: `docs/superpowers/plans/2026-08-22-boot-speed-debt.md` (Phase 3), `docs/superpowers/plans/2026-08-23-boot-debt-phase2-phase3a.md` (Stage A method + result).

## Context

Stage A (2026-08-23) removed only the direct `app.js`/`app-runtimes.mjs` edges to the 5 boot files in the metafile graph and measured 0 exclusive eager bytes. Cause: the profile/medications chain (`profile-formats.mjs`, `profile-prefs.mjs`, `profile-app-mode.mjs`, `medications-actions.mjs`) statically imports the same files. The Stage A gate failed on that narrow framing. The root cause it exposed is still open.

**Verified import inventory (2026-08-23) — every edge from the 4 chain files into the 5 boot files:**

| File | Imports from boot files | All call sites handler-only? |
|---|---|---|
| `profile-formats.mjs` | `switchAppTab` (:21), `switchInnerTab`, `renderInnerTabs` (:22-25), `renderNotaEvolucionPrimaryTab` (:20) | yes |
| `profile-prefs.mjs` | `renderInnerTabs`, `switchInnerTab`, `getActiveInnerTab` (:3) | yes |
| `profile-app-mode.mjs` | `switchInnerTab`, `getActiveInnerTab`, `refreshExpedienteForAppModeChange` (:15-19), `renderNotaEvolucionPrimaryTab` (:12) | yes |
| `medications-actions.mjs` | `switchInnerTab` (:32) | yes |

Note: the scope is wider than `switchAppTab`/`switchInnerTab` alone. Six named functions cross the boundary. Fixing only two leaves the static edges in place and gains nothing.

## Decision: do Stage B now — but behind a 30-minute gate

Yes, with one condition. The Stage A gate failed only because it did not cut the profile-chain edges; those edges are the identified blocker, and every call site is confirmed handler-only, so the fix is small and mechanical. But the 08-15 doc measured the graph as a hub (12 direct imports each reach 1049-1118 of 1120 modules), so a third eager path to the 5 files may exist and make this refactor free 0 bytes too. So: rerun the Stage A metafile script once more with the profile-chain edges also cut (minutes of work, script and method already exist) — refactor only if bytes actually leave. No "fake fix": if bytes stay 0, do not convert imports just to clear the 200-point score; that is exactly what the 08-22 doc rejects.

## Stage B.0 — gate (Dev/Haiku, no feature-file edits)

1. `npm run build:ui`, then rerun the Stage A reachability analysis on `public/js/app.bundle.meta.json` (method in the 08-23 doc, "Method" section), removing BOTH edge sets: (a) `app.js`/`app-runtimes.mjs` → each of the 5 boot files, (b) the 4 chain-file edges in the table above.
2. Report exclusive eager bytes that leave the bundle.
3. **Gate:** < ~75 KB → stop. Append the result to this doc, keep `bootGraphDebt = 200` as accepted debt, and route all further effort to Step 9 planning (a third path proves edge-by-edge cannot win). Otherwise proceed.

## Stage B.1 — decouple the chain (Lead)

**Pattern: window-global with `typeof` guard.** Why over runtime-stub: `switchAppTab`/`switchInnerTab` are already published globals (`windowHandlers` export, `public/js/features/expediente-navigation.mjs:260-265`, wired by `app.js:91`) and already consumed this way by 5+ files (`paste-smart.mjs:27`, `command-palette.mjs:56-57`, `expediente-group-row-ui.mjs:71`, `inicio-turno-panel.mjs:312`). The colocated-test mock pattern for it exists (`guardia-patient-action-sheet.test.mjs:10-35`). Runtime-stub would add new stub wiring per module for the same result — larger diff, second pattern in the same chain.

1. In the 4 files, delete the imports in the table and change call sites to `globalThis.fnName` behind a `typeof ... === 'function'` guard. Use `globalThis`, not `window`, so tests under Electron Node can mock it — match `guardia-patient-action-sheet.mjs`.
2. Add the four missing names to the existing `windowHandlers` object in `expediente-navigation.mjs` (`renderInnerTabs`, `getActiveInnerTab`, `refreshExpedienteForAppModeChange`) and expose `renderNotaEvolucionPrimaryTab` the same way from its own module; `app.js` already imports and wires both files.
3. Tests, same turn (rule `tests-with-code`): extend/add colocated `*.test.mjs` for the 4 files using the `globalThis` mock + `afterEach` restore pattern from `guardia-patient-action-sheet.test.mjs:10-35`. Assert each handler calls the expected global with the expected tab id. New test files go into `package.json` `scripts.test`.
4. Commit Stage B.1 alone — one commit, reverts clean.

## Stage B.2 — re-apply the Phase 1 split (Lead, separate commit)

1. Re-apply the reverted Phase 1 change: convert `app.js`/`app-runtimes.mjs` direct imports of the 5 boot files to non-blocking `import()` started at boot, wiring each module (including its `windowHandlers`) as its import resolves. `renderInnerTabs` + `syncMainAppTabA11y` stay synchronous — they paint frame one.
2. Lower `EAGER_BOOT_BUDGET_BYTES` in `app-boot-imports.test.mjs` to the new measured figure so the win is locked in. Known pre-existing issue: that test is already ~2.7 KB over budget from unrelated WIP (`ui-motion.mjs` `appendExitingRows`) — coordinate with that WIP's owner; do not fold their bytes into this change.
3. Metafile check (not code review): confirm the 5 files now sit in lazy chunks, no cycle hoisted them back (risk 2 in the Step 9 notes).

## Critical files

- `public/js/features/profile-formats.mjs`, `profile-prefs.mjs`, `profile-app-mode.mjs`, `medications-actions.mjs` (+ colocated tests)
- `public/js/features/expediente-navigation.mjs` (`windowHandlers` additions), `public/js/features/nota-evolucion/nota-evolucion-primary-tab.mjs`
- `public/js/app.js`, `public/js/app-runtimes.mjs` (Stage B.2)
- `public/js/app-boot-imports.test.mjs` (budget)
- This doc + `docs/core/20-claude-code-handoff.md` (results, per the "Phase 1 — result" convention)

## Verification

1. `npm run test:one -- <each touched test>` (rtest alias fine).
2. `npm run build:ui`; then the Stage B.0 script once more on the fresh metafile — confirm the bytes actually left.
3. Packaged-app cold launch (not dev mode), before/after `perf-markers.mjs` deltas, watch for any empty-tab-bar flash — the standing CEO condition from Phase 1.
4. Manual smoke, Spanish UI: Sala↔Guardia mode switch, one medication action that navigates to notas, one format navigation (nota/indica), open Settings, one command-palette navigation.
5. `npm run metrics:check` — `bootGraphDebt` must drop from 200. Do not run `metrics:baseline` while unrelated WIP sits uncommitted in the tree.

## Stage B.0 — gate result (2026-08-23)

Ran the extended reachability check (metafile edges from `app.js`/`app-runtimes.mjs` AND the 4 chain files into the 5 boot files, all cut). **Passed**: 102.6 KB (15 modules) would actually leave the eager bundle — well over the ~75 KB threshold. `app-tabs.mjs`, `expediente-navigation.mjs`, `expediente-inner-cache.mjs` would go lazy; `app-tabs-runtime.mjs` and `nota-evolucion-primary-tab.mjs` stay eager regardless (reachable via `settings-help/tour-step-actions.mjs` and `profile-save.mjs`, outside this plan's 4-file scope — noted for a future pass, not blocking). Proceeded to Stage B.1.

## Stage B.1 — result (2026-08-23, commit `10a24fa7`)

Shipped. All 6 functions (`switchAppTab`, `switchInnerTab`, `renderInnerTabs`, `getActiveInnerTab`, `refreshExpedienteForAppModeChange`, `renderNotaEvolucionPrimaryTab`) — plus `invalidateInnerTabRenderCache`, found during implementation to be a 7th handler-only cross-boundary call in `medications-actions.mjs` not listed in the original inventory — now resolve via a shared `resolveGlobalFn` helper (new file `resolve-global-fn.mjs`, deduped from a private copy already in `guardia-patient-action-sheet.mjs`) instead of static imports. `expediente-navigation.mjs`, `expediente-inner-cache.mjs`, and `nota-evolucion-primary-tab.mjs` now export `windowHandlers` and are wired into `app.js`'s `Object.assign(window, ...)` registration. 18 new/updated colocated tests, all passing.

**Confirmed: B.1 alone does not shrink the eager bundle.** `npm run test:one -- public/js/app-boot-imports.test.mjs` still fails the budget check (now 3,473,191 B vs 3,460,648 B — worse than before this session, not better) because `app.js`/`app-runtimes.mjs` still statically import the 5 boot files directly for their own use; only the chain-file edges were cut. This was expected — B.0's gate modeled cutting both edge sets together. Stage B.2 (re-applying the Phase 1 non-blocking-import split to `app.js`/`app-runtimes.mjs` themselves) is required to realize the 102.6 KB and is **not done** — it touches the boot sequence directly and needs the packaged-app cold-launch verification this plan's own gate requires, which was not run this session.

## Stage B.2 — blocked (2026-08-23), not attempted

Before touching `app.js`/`app-runtimes.mjs`, re-checked what actually keeps `app-tabs-runtime.mjs`, `expediente-inner-cache.mjs`, `nota-evolucion-primary-tab.mjs` eager once B.1's chain edges are gone. Result: **0 bytes droppable**, because `app-tabs.mjs` and `expediente-navigation.mjs` — which must stay eager and synchronous (they hold `renderInnerTabs`/`syncMainAppTabA11y`, the two calls that paint frame one, per Phase 1's own finding) — import `app-tabs-runtime.mjs` (`expediente-navigation.mjs:37`, `app-tabs.mjs:25`, for shared runtime state `rt`) and `expediente-inner-cache.mjs` (`expediente-navigation.mjs:51`, `app-tabs.mjs:32`) directly at module top level, inside the same functions that must run synchronously.

So converting `app.js`/`app-runtimes.mjs`'s own edges to non-blocking imports (as Stage B.2 was scoped) changes nothing — the 3 files are still pulled in eagerly through `app-tabs.mjs`/`expediente-navigation.mjs` regardless. Getting any real bytes out requires **splitting `app-tabs.mjs` and `expediente-navigation.mjs` themselves** — pulling `renderInnerTabs`/`syncMainAppTabA11y` and whatever `rt` state they need into a small new eager core file, and moving the rest of each file (plus their own `app-tabs-runtime.mjs`/`expediente-inner-cache.mjs` imports) out to load lazily. This is exactly what the 2026-08-22 doc's original "Phase 1 — real speed" section called for ("Split `expediente-navigation.mjs` so its render path is a small eager file; move the rest of its logic out") but was never done — Phase 1 shipped only the tab-bar-motion deferral, not this split.

**Not attempted.** This is a materially bigger, riskier change than anything scoped in this doc — it means pulling apart the internals of the two files that drive every tab switch in the app, in a live medical workbench, without the kind of call-site-by-call-site review that change deserves. Stopping here rather than doing it under a "B.2" label it doesn't fit. `bootGraphDebt = 200` stays accepted, understood debt, same conclusion Stage A already reached — this doc adds the specific reason B.2 as scoped can't reach it.

## Rollback risk

Low and contained. No medication persistence or settings-storage logic changes — only post-action navigation call sites inside handlers. Failure mode of a missing global is a guarded no-op (action completes, tab does not switch), not a crash or data loss; this is the already-shipped behavior of `paste-smart.mjs`/`command-palette.mjs`. Two independent commits (B.1 decoupling, B.2 split): `git revert` either alone. The one real timing risk — a user handler firing before the non-blocking imports resolve in the first ~100 ms — is covered by the guards and checked by the packaged-launch smoke test.

## Follow-on: Step 9 — tab-level code split (NOT this plan)

Step 9 stays its own future plan (source outline: `2026-08-15-startup-lag-optimization.md:649-677`, folded into the 08-23 doc). Before any planning session writes it, check three things: (1) re-measure — the 600-1200 ms estimate predates Steps 0-8 and Phase 1; today's measured gap was ~447 ms, so confirm the prize is still worth the risk; (2) what existing lazy machinery already covers — esbuild `splitting: true` plus `lazy-feature-routes.mjs`/`lazy-feature-routes-charts.mjs` (`chartsRuntimeProxies`) already handle Charts; map which of the six proposed boundaries (boot core, Labs, Expediente/notes, Charts, Settings/help, Cloud/teams/guardia) still leak eagerly, from the metafile, not the code; (3) start with the Settings/profile boundary — largest cleanly separable block (~306 KB via `tour-flow`), least first-screen interaction, and Stage B above is its direct enabling move. Prerequisites: Stage B finished (it is the dry run), and the `app-boot-imports.test.mjs` eager-budget guard green so the split cannot be silently defeated a third time.
