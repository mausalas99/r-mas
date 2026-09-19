# Handoff — pay the pre-existing complexity debt to zero

**Date:** 2026-09-06
**From:** Claude Code (Sonnet), during 8.3.2 prep
**To:** next session

## Why this exists

`npm run metrics:check` was red during 8.3.2 prep: `totalScore` 235 vs baseline 140 (later 225 vs 140 before the raise below). One of the two flagged functions was genuinely introduced that session (`estado-actual-panel-registro.mjs` `handleFormClick`) and was fixed in place (split into one small handler per click target, see commit). The rest — 15 `complexity`-rule violations — predate 8.3.2 entirely; `git diff` against those files showed no changes this session. They were apparently never caught by an earlier baseline capture.

Rather than block the 8.3.2 commit on unrelated, unreviewed code, the owner approved raising `scripts/metrics/baseline.json`'s `totalScore` to 225 (see its changelog entry dated 2026-09-06) so `metrics:check` passes. This doc is the follow-up: pay the 15 down to 0 and drop the baseline back down.

**No implementation plan here on purpose — the owner asked for a plain handoff, not a prescribed fix.** Pick your own approach per function.

## Current numbers (2026-09-06)

- `totalScore` 150 measured (225 stored in baseline, i.e. ~75 points of slack already banked from the bootGraph hash resync — don't spend that slack on new debt, spend it paying this down instead).
- All 150 points are `complexityOverage` (15 violations × 10). `bootGraphDebt` is 0 (baseline's `bootGraph` snapshot was refreshed the same day).
- Get the current number with: `npx eslint public/js lib --format json --max-warnings 99999 | node scripts/metrics/top-complexity.mjs`
- Only rows with `ruleId: complexity` count toward `complexityOverage` (10 pts each). `sonarjs/cognitive-complexity` rows are informational only per `scripts/metrics/score.mjs` — don't chase those unless they're on the same function.

## The 15 violations (file:line, complexity score, as of 2026-09-06)

| Complexity | File:line |
|---:|---|
| 23 | `public/js/lab-bulk-paste.mjs:264` |
| 22 | `public/js/features/soap-estado.mjs:49` |
| 21 | `lib/db/clinical-ops-sync-export.mjs:84` |
| 19 | `lib/db/clinical-access-teams-core.mjs:257` |
| 18 | `public/js/features/interconsulta-team-board.mjs:143` |
| 17 | `public/js/features/cloud-sync/panel-conexion-bootstrap.mjs:183` |
| 17 | `public/js/features/cloud-sync/settings.mjs:96` |
| 17 | `public/js/features/estado-actual-meds-dropdown.mjs:88` |
| 17 | `public/js/features/estado-actual-meds.mjs:270` (`applyRecetaProposalForce`) |
| 17 | `public/js/features/nota-evolucion/nota-evolucion-state.mjs:36` |
| 17 | `public/js/labs-lcr-scan.mjs:68` |
| 16 | `lib/db/clinical-access-teams-core.mjs:34` |
| 16 | `public/js/expediente-tabs.mjs:329` |
| 16 | `public/js/features/clinical-rotation.mjs:182` |
| 16 | `public/js/features/workbench/mode-frame.mjs:26` |

Line numbers will drift as the files change — re-run the eslint command above to get current locations; treat this table as a starting pointer, not ground truth.

## How the repo has fixed this before

`git log --oneline -- public/js/features/estado-actual-panel-registro.mjs` and the 2026-09-03b entry in `PLAN.md` (`#shrink-guardrails` area) show the established pattern: extract the tangled function into several small single-purpose functions dispatched from a short list/loop, rather than restructuring the whole file. `handleFormClick` in `estado-actual-panel-registro.mjs` (fixed 2026-09-06, same day as this handoff) is a worked example of that pattern on this exact codebase if you want a reference.

## Definition of done

1. `npx eslint public/js lib --format json --max-warnings 99999 | node scripts/metrics/top-complexity.mjs` shows 0 rows with `ruleId: complexity`.
2. `npm run metrics:baseline` to write the new (lower) `totalScore` — get the owner's sign-off first per `scripts/metrics/eager-boot-changelog.md`'s sibling convention in `baseline.json`'s own changelog ("not a silent refresh").
3. `npm run metrics:check` green.
4. Existing test suite still green (`npm run test:one -- "public/js/**/*.test.mjs" "lib/**/*.test.mjs"`) — none of these functions have dedicated tests today; add one per function you touch if the split changes observable behavior in any way, per `.claude/rules/tests-with-code.md`.

## Do not

- Do not touch `EAGER_BOOT_BUDGET_BYTES` / `EAGER_BOOT_BUDGET_FILES` in `public/js/app-boot-imports.test.mjs` as part of this — unrelated gate, already handled for 8.3.2 (raised to 3,320,000 B same day, see `scripts/metrics/eager-boot-changelog.md`).
- Do not fold this into a feature branch — this is pure debt paydown, ship it standalone so it's easy to revert if a "simplification" changes behavior.
