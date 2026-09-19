# Labs screen (roadmap item 1) — scoped down to token cleanup

## Context

The teal-workbench redesign (`docs/superpowers/plans/2026-08-17-teal-workbench-ui-redesign.md`) lists "Labs (2a/2b)" as roadmap item 1, described as "reuses pilot's table/row patterns, adds trend arrows." I went to implement it and found the real scope is much bigger than that one-liner suggests — the zip's "Laboratorio" screen (2a/2b) is a full standalone tab (patient sidebar + results table + diagram placeholders), and it maps onto an already-large, already-built feature area in this app (80+ files under `public/js/labs*`, `lab-*`, `tend-core.mjs`).

I investigated (via an Explore agent + direct reads) what already exists vs. what the mockup implies is new, so this plan reflects the actual codebase, not the mockup's ideal state.

## What I found

**Current Laboratorio tab** (`public/js/features/patient-dashboard/lab-inner.mjs` shows/hides `#lab-inner-labs`) renders results as **monospace text lines** (`renderEntry`/`renderToken` in `public/js/labs-display.mjs`), grouped by draw time via `clusterDayLabSets()` in `public/js/lab-history-day-view.mjs` (`.lab-hour-group-h` headers). This is a fundamentally different rendering model than the mockup's grid-of-chips-per-analyte layout used in the small dashboard glance card (`renderDrawHtml` in `dashboard-html.mjs`) — the full tab works off raw pasted free-text lines, not a structured field catalog.

**Altered-value highlighting already exists**: `renderToken()` wraps `*`-suffixed values in `<strong class="lab-value-altered">`, styled via `var(--color-danger)` in `public/styles/lab.css`. This file is **mostly token-driven already**, with 6 leftover hardcoded hex colors (`#b91c1c` ×4, `#fff` ×1, `#15803d` ×1) that should have been on the tokens.css swap list in phase 1 but were missed.

**Trend arrows (↑/↓ vs. previous draw) do not exist anywhere in this render path.** The only per-analyte historical-value machinery in the app is `tend-core.mjs`'s `getSetTrendValueForSeries()`/`columnSetsForFields()`, which works against a **structured field-key catalog** (`labs-panel-defs.mjs` — extended panels like thyroid/cardiac markers, keyed by `{key, labels[]}`). The core panels shown in the day view (BH/QS/ESC/PFHs — Hb, Hto, Leu, Plt, Glu, Cr, Na, K, etc.) are **short-code abbreviations parsed from free text**, not run through that catalog. Building trend arrows for the day view means either (a) building a new short-code-to-history lookup from scratch, or (b) extending the extended-panel catalog to cover core panels and rewiring the day-view renderer to go through it — both are real design decisions, not a CSS/markup tweak, and deserve their own investigation once someone decides which approach fits the app's data model.

**Rebuilding the day view as a grid-of-chips** (to visually match the mockup's per-tipo grouped chip rows) would also touch `renderEntry`/`renderToken`, which are shared by the censo, paste-preview, and panel-history rendering paths — not scoped to the Laboratorio tab alone. Changing them risks regressing those other surfaces.

## Recommendation: scope this pass down to the token cleanup only

Given the size gap between "adds trend arrows" and what that actually requires, I'm treating this pass as **just the leftover token-swap cleanup that phase 1 missed**, and pushing trend arrows + any layout rework back onto the roadmap as their own, better-scoped future items — consistent with how the pilot screen's counters band got correctly ruled out of scope earlier in this same plan.

### This pass:
1. **`public/styles/lab.css`** — replace the 6 hardcoded hex colors with their token equivalents:
   - `#b91c1c` (4 occurrences: lines ~1898, 1901, 2473, 2595) → `var(--color-danger)`
   - `#15803d` (line ~2588) → `var(--color-success)`
   - `#fff` (line ~1919) → check context first; likely `var(--color-elevated)` or `var(--color-surface)` depending on what element it's on
   - Read each occurrence in context before swapping — don't blind-replace, since `#fff` in particular could be intentional (e.g. always-white regardless of theme, like text-on-colored-chip).
2. Verify no dark-mode regression: after the swap, `html.dark` should still resolve these correctly since the tokens already have dark variants (confirmed in tokens.css from phase 1).
3. No test changes expected (this is a pure color-value swap, not a behavior change) — but run the existing lab CSS/rendering tests to confirm nothing broke.

### Explicitly NOT this pass (moved to roadmap, each needs its own plan):
- **Trend arrows vs. previous draw** — needs a design decision on short-code catalog vs. extending `labs-panel-defs.mjs`, done separately with more research into `tend-core.mjs`'s existing model.
- **Grid-of-chips layout matching the mockup** — would touch shared rendering (`labs-display.mjs`) used outside the Laboratorio tab; needs its own risk assessment.
- **Sidebar/diagram-panel chrome from the mockup** — this app is one shell with an existing patient sidebar (`3b`, already the "chosen" treatment per the README) and no diagram/chart feature exists yet; out of scope entirely for a design pass.

## Files touched
- `public/styles/lab.css` (color-only edit)

## Verification
- `npm run build:ui`
- `npm run test:one -- public/js/lab-history-day-view.test.mjs public/js/features/patient-dashboard/lab-inner.test.mjs` (or whatever the closest existing lab-rendering tests are — confirm no CSS-driven test asserts a literal hex value that would now fail)
- Visual check not required for a color-only token swap (same computed color in light mode; dark-mode correctness comes from the token definitions already verified in phase 1)

## After approval
Copy this plan into the repo (`docs/superpowers/plans/2026-08-17-labs-token-cleanup.md`), and update the roadmap line in `docs/superpowers/plans/2026-08-17-teal-workbench-ui-redesign.md` roadmap item 1 to reflect that "Labs (2a/2b)" is split into: (a) token cleanup — this plan, done, and (b) trend arrows + grid layout — pushed to a future, separately-scoped plan. Add a row to the Active plans table in `docs/core/20-claude-code-handoff.md`.
