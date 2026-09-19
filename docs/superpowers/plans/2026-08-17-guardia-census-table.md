# Guardia screen (roadmap item 2) — census table + counters, scoped

## Context

Roadmap item 2 of the teal-workbench redesign (`docs/superpowers/plans/2026-08-17-teal-workbench-ui-redesign.md`) is "Guardia (6a/6b) — reuses counters bar + row alert-tint from pilot." I read the actual mockup markup (screen `6a` in the design zip) instead of trusting the one-liner, since roadmap item 1 ("Labs") already turned out much bigger than its description suggested.

The real mockup has **six sections**, not two: a 3-counter bar, a census table (Cama/Paciente/Alterados/Pendiente/Estado), and four more right-column panels (Signos recibidos, Pendientes vencidos, Ingresos de la guardia, Eventualidades, Movimientos). Two of those panels need data that doesn't exist anywhere in the app yet (admission-date tracking for Ingresos, a movements/traslados counter). Per your call, this plan covers **only the census table + 2 of the 3 counters** — the part with real data behind it. The other four panels and the Ingresos counter are out of scope; they need a separate data-plumbing decision, not a styling pass.

## What I found (current state)

- **Census currently renders as a card grid**, not a table: `guardia-board-render.mjs` calls `UnifiedPatientGridBoard.drawCensusGrid()` (component in `public/js/features/unified-patient-grid-board.mjs`). This component is **Guardia-only** — no other screen consumes it (confirmed by grep), so building a Guardia-specific table renderer instead carries zero cross-screen blast radius.
- Its `userRank` param ('R1' vs 'R4') controls **team-grouping** (dividers + a follow-up-pin section for R4) — this is real behavior to preserve, not decoration. The table replacement needs the same grouping, applied as sub-headers within the table instead of card-grid sections.
- **Prior art for row-based (non-card) patient lists already exists**: `entrega-roster-render.mjs`'s `renderEntregaRosterRowHtml()` — div-based row with Cama | Nombre | Diagnóstico+summary | Status badge. This is the template to follow for the new table rows, not something to build from zero.
- **Summary tiles today**: `renderGuardiaSummaryTiles()` in `guardia-board-chrome.mjs` shows 4 tiles — Censo, Críticos, Signos, Estudios — via `computeGuardiaSummary()`. "Signos" already counts `vitalsMonitored`/`vitalsOverdue` via `vitalsBannerForGuardia()` → `calcVitalsBannerForSpec()`, but has no "received today" count, no progress bar, no out-of-range-unreviewed count.
- **Pendientes**: no census-wide aggregation exists today — `pendingTodoCount(pid)` is per-patient. `isTodoOverdue()` (`public/js/todos-due.mjs`) already does the overdue check and is what the pilot screen's vencido-row follow-up reused — same function reused here, just summed across the whole census instead of one patient.
- **Alert-tint row pattern already built**: `.rows li.is-overdue` in `patient-dashboard.css` (danger-tint background, danger-deep tag, doesn't wash out on hover because the tint is on the row itself, not the container). Same convention ports directly to table rows here.
- **Per-patient status (VENCIDO/EN CURSO/ABIERTO/LISTO) does not exist anywhere.** And on inspection, the mockup's 4-state model doesn't map cleanly onto today's data: todos only track `completed` (bool) + optional `dueDate` — there's no "in progress" flag anywhere that would distinguish EN CURSO from ABIERTO. Rather than invent a fake in-progress signal, this plan uses **3 states derivable from real data**: `VENCIDO` (has ≥1 overdue pendiente, via `isTodoOverdue`), `ABIERTO` (has ≥1 open, non-overdue pendiente), `LISTO` (no open pendientes). EN CURSO is dropped for this pass — flagged below as a follow-up that needs a real "in progress" concept added to the todo model first, not guessed at here.

## Plan

### 1. Census table renderer (new file: `public/js/features/guardia-census-table.mjs`)
- `buildGuardiaCensusTableHtml(patients, guardiasMap, groupCtx)` — table-shaped rows (grid-template-columns matching the mockup: `92px 1fr 132px 1fr 84px` = Cama/Paciente/Alterados/Pendiente/Estado), grouped by team the same way `UnifiedPatientGridBoard` groups today (reuse whatever grouping helper it calls internally — trace it during implementation, don't reimplement).
- Row markup follows `entrega-roster-render.mjs`'s div-row pattern, not a literal `<table>`.
- Alterados column: pull from `patient.monitoreo.historial` (same source `guardia-vitals-feed.mjs` already reads) — this is new plumbing (today's guardia census fetch doesn't surface this per-row) but the underlying data exists, no schema change.
- Pendiente column: first open pendiente's text (or "—").
- Estado column: new `guardiaPatientStatus(patient, todos)` helper — `vencido | abierto | listo`, using `isTodoOverdue`.
- Wire into `guardia-board-render.mjs` in place of the `drawCensusGrid()` card-render call.

### 2. CSS (new rules in `public/styles/pase-board.css`, where Guardia styles already live)
- Port the `.is-overdue` alert-tint-row pattern from `patient-dashboard.css` (same tokens: `--color-danger-tint`, `--color-danger-deep`, hover-safe by construction).
- Status label colors: `vencido` → `--color-danger-deep`, `abierto` → `--color-ink-muted`, `listo` → `--color-success` (matches mockup's `#a8000f`/`#6c6c70`/`#1c6b31`).
- "sin toma 08:00" cell text → `--color-warn` (matches mockup).

### 3. Counters — additive, not a strict 3-cell replica
The mockup always shows exactly 3 counters, but faking Ingresos data in a clinical app is worse than a layout deviation, so: **keep the existing Censo and Críticos tiles as-is** (real, already relied on), and:
- **Upgrade the Signos tile**: add the progress bar + "X de Y recibidos" + out-of-range-unreviewed count, computed from `guardiasMap` (`last_vitals_check` filtered to today = received; comparing against altered vitals in `monitoreo.historial` = out-of-range-unreviewed). Alert-tint-strong + inset border styling per spec when out-of-range count > 0.
- **Add a new Pendientes tile**: census-wide sum via `isTodoOverdue()` across all patients' `storage.getTodos(pid)`, split into "N abiertos · M vencidos". Alert-tint-strong styling when vencidos > 0.
- Ingresos is skipped entirely for this pass (no data source — see Context).

### Explicitly out of scope (needs its own future plan)
- Ingresos counter + "Ingresos de la guardia" panel — needs an admission-date field added to the patient schema (`lib/db/schema.mjs` bump + migration), a real product decision on where/how that gets set during intake.
- "Signos recibidos" review-queue panel, "Pendientes vencidos" duplicate list, "Eventualidades · noche" panel, "Movimientos" tile — each is a distinct new feature (review/ack state on vitals, a movements/traslados counter), not a styling pass on existing data.
- EN CURSO status — needs a real "in progress" concept added to the todo model first.

## Files touched
- New: `public/js/features/guardia-census-table.mjs` (+ colocated `.test.mjs`)
- `public/js/features/guardia-board-render.mjs` — swap card-grid call for the new table renderer
- `public/js/features/guardia-board-chrome.mjs` — extend `computeGuardiaSummary()`/`renderGuardiaSummaryTiles()` for the upgraded Signos tile + new Pendientes tile
- `public/styles/pase-board.css` — new row/status/counter styles

## Verification
- Colocated tests for the new table renderer + status helper (unit tests on `guardiaPatientStatus()` covering vencido/abierto/listo, and on the table HTML for alert-tint class + column order)
- Update/extend existing `guardia-board-*.test.mjs` and `guardia-board-chrome.test.mjs` for the changed tile output
- `npm run test:one -- <new + touched test files>`
- `npm run build:ui`
- `npm run metrics:check`

## After approval
Copy this plan into the repo (`docs/superpowers/plans/2026-08-17-guardia-census-table.md`), update roadmap item 2 in the teal-workbench plan, add a row to the Active plans table in `docs/core/20-claude-code-handoff.md`.

## Result (2026-08-17)

Shipped as planned:

- New `public/js/features/guardia-census-table.mjs`: `buildGuardiaCensusTableHtml()`/`buildGuardiaCensusTableRowHtml()` (Cama/Paciente/Alterados/Pendiente/Estado rows, R4 team dividers via the existing `buildGuardiaTeamCensusGroups()`/`sortPatientsByPriorityThenBed()` — no reimplementation), `guardiaPatientStatus()` (vencido/abierto/listo, using `isTodoOverdue()`), `alteradosForPatient()` (vitals-only, from `patient.monitoreo.historial`, per the plan's scope note — labs are not merged in), and `mountGuardiaCensusTable()` for DOM wiring + click routing.
- `guardia-board-render.mjs`: replaced `UnifiedPatientGridBoard.drawCensusGrid()` card-chip rendering with `mountGuardiaCensusTable()`. Click routing (open entrega modal / action sheet / `selectPatient`) reimplemented inline from `handleChipClick`'s exact conditions — same behavior, no `UnifiedPatientGridBoard` instance needed. The class itself is untouched and still exported (unused by Guardia now, but its own tests still pass — nothing else in the app imports it).
- `guardia-board-chrome.mjs`: `computeGuardiaSummary()` now also returns `pendientesOpen`/`pendientesOverdue` (census-wide sum via `storage.getTodos(p.id)` + `isTodoOverdue()`) and `vitalsReceivedToday`/`vitalsOutOfRange` (from each patient's last vitals historial entry). `renderGuardiaSummaryTiles()` upgraded the Signos tile's title text and added a 5th "pendientes" tile — Censo and Críticos tiles kept as-is per the plan (no data loss).
- `pase-board.css`: new `.gct-*` row/status/divider rules (danger-tint vencido rows, hover-preserves-tint per the interaction rule), and `.guardia-stat--hot` upgraded from text-color-only to the tint+inset-border treatment matching the mockup's alert cell.

Not shipped, exactly as scoped: Ingresos counter, the four extra right-column panels, EN CURSO status, labs merged into Alterados.

Verified: `npm run test:one` on the 2 new test files (`guardia-census-table.test.mjs`, `guardia-board-chrome.test.mjs`, 16 tests) plus regression sweep across `clinical-entrega`, `guardia-patient-action-sheet`, `entrega-roster-render`, `unified-patient-grid-board`, `unified-patient-grid-team-groups`, `guardia-mode-sync`, `guardia-trust-strip` (59 tests) — all pass, nothing broke from removing the card-grid wiring. `npm run build:ui` clean. `npm run metrics:check` shows the same pre-existing debt score as before this session (72, traced to uncommitted Nube files) — no new regression.
