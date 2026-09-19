# Boot debt — Phase 2 + Phase 3 Stage A, plus folded-in Step 9 outline

## Context

An existing plan already covers this exact topic: [docs/superpowers/plans/2026-08-22-boot-speed-debt.md](2026-08-22-boot-speed-debt.md). Phase 1 (make the tab-bar motion non-blocking) shipped 2026-08-22. Phase 2 (fix the debt-scanner bug) and Phase 3 (profile.mjs import-chain investigation) are still marked "not started." This plan does not replace that doc — it verifies its claims still hold today and scopes the next concrete session of work on top of it.

I nearly went down a different path first — a separate doc, [`docs/superpowers/plans/2026-08-15-startup-lag-optimization.md`](2026-08-15-startup-lag-optimization.md), also covers boot speed. That doc's Steps 0-8 are already shipped (verified today: `main.js` has Step 0's `BOOT_T0`/`bootMark()` instrumentation verbatim — used it this session with `R_PLUS_BOOT_PERF=1` to get real numbers, `updater-feed: 250.5ms`, `pre-window: 279.1ms`, `ready-to-show: 725.8ms`, `did-finish-load: 855.5ms`; it also has the non-blocking `unlockPromise` reorder from Step 8, and `app-boot-imports.test.mjs` has the `EAGER_BOOT_BUDGET_BYTES`/`EAGER_BOOT_BUDGET_FILES` guard from Step 6). Its Step 9 ("tab-level code split", outline only) was explicitly deferred: "Do not start this from this document. It needs a separate plan." By the user's request, **that Step 9 outline is folded into this doc** below as documented future scope, so there's one place tracking what's left instead of three. The 08-15 doc itself gets a pointer added so it's not read as still-open work — see "Housekeeping" at the end.

"Boot debt" in this session's original request pointed at the 2026-08-22 doc (its own title is literally "Boot speed and **debt**") — that's still the active, immediate work (Phase 2/3 below). The folded-in Step 9 material is separate, larger, future scope — not started in this session.

**Verified today (2026-08-23), not just re-stated from the old doc:**
- `npm run metrics:check` → totalScore 400 (`complexityOverage: 60, lengthOverage: 140, bootGraphDebt: 200`). `bootGraphDebt` is unchanged at 200, exactly as the doc predicted after Phase 1 ("bootGraphDebt stays at 200"). The complexity/length part grew from the doc's 184 to 200 — traced to unrelated in-progress work already sitting in the working tree before this session started (`ui-motion.mjs`, `guardia-census-table.mjs`, `todos-list-render.mjs` — someone else's animation work, out of scope here). Phase 2's fix will not zero the score by itself because of this unrelated addition — expect a lower number, not zero.
- The scanner bug is real and now pinned to its exact cause: `eslint.config.mjs:78` already gives test files (`**/*.test.js`, `public/js/**/*.test.mjs`, `lib/**/*.test.mjs`) a 320-line `max-lines-per-function` budget. But `scripts/metrics/score.mjs:36` computes the overage as `firstNumberInMessage - 80` — a hardcoded 80 regardless of which budget actually applies to that file. ESLint's own message already contains the real number ("...Maximum allowed is 320."), so the fix is to parse that instead of hardcoding.
- The Phase 3 claim — every `switchAppTab`/`switchInnerTab` import in `profile-app-mode.mjs`, `profile-formats.mjs`, `profile-prefs.mjs`, `medications-actions.mjs` is called only inside a handler function, never at module top level — spot-checked and confirmed (e.g. `profile-app-mode.mjs:41-53`, inside `reconcileActiveInnerForAppMode`).

## Recommended approach

Run Phase 2 and Phase 3-Stage-A from the existing doc, in that order, in this session. Both are low-risk (a scanner-math fix, and an investigation with no feature-file edits). Phase 3-Stage-B stays gated on Stage A's own measurement gate, exactly as the existing doc specifies — do not skip ahead to it.

### Phase 2 — fix the debt scanner (Lead)

**File:** `scripts/metrics/score.mjs`, the `max-lines-per-function` branch inside `eslintDebtFromResults` (~line 34-38).

Replace the hardcoded `- 80` with the actual budget parsed from ESLint's own message text (`"...Maximum allowed is (\d+)."`), falling back to 80 only if that second number is absent for some reason:

```js
if (msg.ruleId === 'max-lines-per-function') {
  const actual = Number(msg.message.match(/\((\d+)\)/)?.[1] || 0);
  const budget = Number(msg.message.match(/Maximum allowed is (\d+)/)?.[1] || 80);
  const over = actual - budget;
  if (over > 0) lengthOverage += 2 * Math.ceil(over / 10);
}
```

This is a one-function fix — no other file needs to change for the bug itself. Do NOT also split `wireEvents`/`wireModalDismissLayers` in `app-shell-modals.mjs` or the two long test files in this phase unless `metrics:check` after the scanner fix still shows real overage from them (the scanner fix alone may already resolve most of the "over-charge," per the doc's own "~3x" estimate — measure before cutting code).

**Verify:**
- `npm run test:one -- scripts/metrics/score.test.mjs` (if it exists — confirm with `ls scripts/metrics/*score*test*`; add a small case asserting a message like `"Function has too many lines (350). Maximum allowed is 320."` now yields `over = 30`, not `270`).
- `npm run metrics:check` — read the new `complexityOverage`/`lengthOverage` numbers. If `dashboard-html.test.mjs` / `mutate-bridge.test.mjs` / `app-shell-modals.mjs` still show real overage after the fix, that's genuine debt — decide then whether splitting is worth it, don't pre-commit to it now.
- Do not run `npm run metrics:baseline` until the unrelated in-flight WIP (ui-motion.mjs etc.) is either committed or reverted by its owner — baselining now would bake an unrelated, uncommitted score into the committed baseline.

### Phase 3, Stage A — investigate the profile.mjs chain (Dev/Haiku, investigation only)

Exactly as scoped in the existing doc, no changes beyond this:
1. Packaged-app cold launch (not `npm start` dev mode), 5 runs, record `perf-markers.mjs` boot-start → first-paint deltas as a real-ms baseline.
2. From the esbuild metafile (`public/js/app.bundle.meta.json`, produced by `npm run build:ui`), report the KB the 5 boot-debt files (`app-tabs.mjs`, `expediente-navigation.mjs`, `nota-evolucion-primary-tab.mjs`, `expediente-inner-cache.mjs`, `app-tabs-runtime.mjs`) plus their exclusive subtree add to the eager bundle.
3. **Gate, exactly as written in the source doc:** if exclusive eager bytes < ~75 KB, or projected saving < ~10 ms — stop, document 200 points as accepted/understood debt, do not proceed to Stage B. Otherwise Stage B (the actual refactor, described in the source doc, Lead-owned) becomes its own follow-up.

No code changes to `profile-app-mode.mjs`, `profile-formats.mjs`, `profile-prefs.mjs`, `medications-actions.mjs`, or the 5 boot files happen in this pass — that's Stage B, and it only starts if the Stage A gate passes.

## Phase 2 — result (2026-08-23)

Shipped. `scripts/metrics/score.mjs` now parses the real budget from ESLint's own message instead of hardcoding 80. Two cases added to `scripts/metrics/score.test.mjs`, both pass. `npm run metrics:check`: totalScore **400 → 304** (`lengthOverage` 140 → 44; `complexityOverage` 60 unchanged — that's cyclomatic complexity, a different rule, not touched by this fix; `bootGraphDebt` 200 unchanged, as expected, that's Phase 3's territory). The remaining 44 `lengthOverage` + 60 `complexityOverage` are real, not scanner artifacts — left as-is per the plan ("decide then, don't pre-commit to splitting now"); no evidence yet that any of it sits on the boot path. `metrics:baseline` intentionally not run yet — see the note above about unrelated in-flight WIP in the working tree.

## Phase 3, Stage A — result (2026-08-23)

Ran step 2 (esbuild-metafile exclusive-bytes analysis) directly — it produced a decisive answer, so step 1 (packaged 5-run timing) was skipped rather than run for a conclusion it can't change; see below.

**Method:** built the real static-import graph from `public/js/app.bundle.meta.json` (import edges, `kind: "import-statement"` only), computed everything reachable from `app.js` today, then removed exactly the two direct edges this phase would touch (`app.js → target`, `app-runtimes.mjs → target`, for each of the 5 files) and recomputed reachability from `app.js`.

**Result:** all 5 files (`app-tabs.mjs`, `app-tabs-runtime.mjs`, `expediente-navigation.mjs`, `expediente-inner-cache.mjs`, `nota-evolucion-primary-tab.mjs`) stay reachable through another path even with those edges removed — because `profile-formats.mjs` and `profile-prefs.mjs` (part of the always-eager `profile.mjs` chain, needed for Settings) import `app-tabs.mjs` and `expediente-navigation.mjs` directly for `switchAppTab`/`switchInnerTab`. **Exclusive eager bytes that would actually leave the bundle: 0.** This independently confirms, via static graph analysis, what the 08-22 doc's Phase 1 already found empirically ("Splitting the 5 files alone doesn't reduce real eager bytes... Reverted that part").

**Gate:** 0 KB is decisively under the ~75 KB threshold — no packaged-app timing run can turn 0 bytes into a real millisecond win, so that measurement was skipped as moot rather than run for form's sake. **Gate fails. Per the plan: stop. `bootGraphDebt = 200` is accepted, understood debt** — real, but not fixable by touching these 5 files' own import edges. The only path that could still move it is Stage B's actual target: breaking `profile-formats.mjs`/`profile-prefs.mjs`/`profile-app-mode.mjs`/`medications-actions.mjs`'s own imports of `switchAppTab`/`switchInnerTab` (via the runtime-stub or window-global pattern the 08-22 doc names) — that is a real code change to the profile/medications chain itself, not a Stage-A-scope investigation, and needs its own review given it sits near patient settings and medication actions in a live medical app.

**Unrelated finding surfaced while re-running the full test set:** `app-boot-imports.test.mjs`'s zero-headroom eager-budget test now fails — 3,463,384 B vs budget 3,460,648 B (over by ~2.7 KB). Traced to the same unrelated in-flight WIP noted above: `ui-motion.mjs`'s new `appendExitingRows` function (26 added lines) sits inside `guardia-census-table.mjs`/`todos-list-render.mjs`'s already-eager chain. Not caused by this session's Phase 2/Stage A work (neither touched any boot-hub file). Left for that WIP's own owner to resolve when it's committed — either by keeping the animation addition under budget or by bumping `EAGER_BOOT_BUDGET_BYTES` with a justifying note, per that test's own convention.

## Future scope — tab-level code split (folded in from 2026-08-15 doc, Step 9; NOT STARTED)

This is the larger, harder problem behind both docs: `public/js/app.js` has ~50 static imports; the static closure is 1120 modules / 4.8 MB source / ~2.05 MB minified across 63 chunks, all loaded before the app is usable. It is **not started** and needs its own review before any code moves — recorded here only so it isn't lost across three documents.

**Key finding from the 08-15 investigation (why this is hard):** the import graph is a hub, not a tree. Cutting any one direct import of `app.js` saves almost nothing, because nearly every direct import reaches nearly the whole graph (measured: 12 different direct imports each reach 1049-1118 modules). No single fat dependency exists — weight is flat, ~1140 KB spread across `public/js/features`. Edge-by-edge fixes (which is what Phase 3 Stage A/B above is, and what Phase 1 of the 08-22 doc already tried once) cannot solve this; a real fix needs boundary-level splitting.

**Suggested split boundaries** (a starting hypothesis from the 08-15 doc, to be validated against the metafile before acting, not accepted as given):
- **Boot core** — shell, tab bar, storage, DB bridge, unlock, Pase board (first second of use).
- **Labs** — `lab-panel*`, `labs-*`, `lab-history-*`, loads when Labs tab opens.
- **Expediente / notes** — `expediente*`, `notes-indicaciones`, `soap-estado`, `estado-actual-*`.
- **Charts / Tendencias** — already lazy-routed; keep it that way, stop the leaks (this is exactly what Phase 3 above is doing at a smaller scale).
- **Settings / help / tour** — never needed at boot.
- **Cloud sync / teams / guardia** — on demand, except any autostart path.

**Main risks, carried forward unchanged from the 08-15 doc:**
1. `lazy-feature-routes.mjs` already implements this pattern and has been defeated twice already (by the 08-15 doc's own Steps 4 and 5, and now by the 08-22 doc's Phase 1 — "features/profile.mjs has a transitive chain that also statically imports switchAppTab/switchInnerTab"). The mechanism works; the discipline doesn't. The `app-boot-imports.test.mjs` eager-bundle guard (from 08-15 Step 6) is the prerequisite that makes future splits stick — it already exists and is green.
2. Circular imports: esbuild hoists shared modules of a cycle into the eager chunk, silently undoing a split. Every boundary needs a metafile check, not just a code review.
3. `window.*` global handler registration: `app.js` assembles ~20 feature modules' handler objects at boot; deferring a module defers its handlers, and an inline `onclick` in `index.html` can hit an undefined function. Every moved feature needs a lazy proxy — `lazy-feature-routes-charts.mjs` (`chartsRuntimeProxies`) is the existing model to copy.
4. Perceived regression: first click on a deferred tab pays a load. `public/js/ui-skeleton.mjs` (`buildLabPanelSkeletonHtml`) already exists for this.

**Estimated scale, if ever done:** target ~400-600 KB eager / under 20 chunks, roughly 600-1200ms saving — bigger than the entire 447ms boot-gap measured in this session, which implies either that estimate predates some of the wins already shipped, or today's gap is smaller than the full graph problem the 08-15 doc was scoped against. Re-measure before treating that number as current.

**Do not start this without:** a dedicated review (this folded-in outline is not sufficient scoping on its own — the 08-15 doc's own words: "Do not start this from this document"), and Phase 3 above finished first (it's the same pattern at a much smaller, safer scale — a good dry run).

## Critical files

- `scripts/metrics/score.mjs` (the fix)
- `scripts/metrics/score.test.mjs` (verify/extend)
- `docs/superpowers/plans/2026-08-22-boot-speed-debt.md` (append Phase 2 result + Stage A findings when done, matching its existing "## Phase 1 — result" convention)
- `docs/core/20-claude-code-handoff.md` (update the "Boot speed and debt" row once Phase 2/Stage A land)

## Verification (end to end)

1. `npm run test:one -- scripts/metrics/score.test.mjs` (or whatever the actual test file is named)
2. `npm run metrics:check` — confirm `lengthOverage`/`complexityOverage` dropped and the reported numbers now match real ESLint violations, not inflated ones
3. Packaged cold-launch timing for Stage A, per the source doc's own verification step
4. Update the two plan docs' status lines to reflect what actually shipped, same convention as the existing "## Phase 1 — result" section
