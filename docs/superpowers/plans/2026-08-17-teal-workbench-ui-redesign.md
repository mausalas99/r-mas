# UI redesign — "Teal workbench" (from design handoff zip)

## Context

The user gave me a design handoff zip (`design_handoff_workbench_clinico`) with a full hi-fi redesign of the Medicina Interna workbench: 12 screens (turno start, pase, guardia, SOAP note, interconsult mode, patient chart, labs, treatment, a mobile vitals-capture screen for interns) plus shared modal/popover/animation patterns. It is not code — it's a static HTML reference for visual truth (colors, type, spacing, layout), to be rebuilt using the app's real JS/CSS.

While reviewing it I found the app already has a different, freshly-finished design system — **Hybrid H / Warm instrument** (`design.md`, spec dated 2026-08-13, 4 days before this zip). It uses an ink accent (no color) and its own token names in `public/tokens.css`, consumed across ~28 CSS files and the `.mjs` render files under `public/js/features/`.

I asked the user which system should win. **Decision: the new zip design wins.** Hybrid H becomes historical (same fate as "Hallmark" before it — noted as reference only, not deleted).

Given the size (12 screens, dozens of files, a brand-new color system), this plan covers a **first phase**: the token swap plus one pilot screen, done to full production quality — not a partial pass across everything. The remaining 11 screens are listed as a follow-up roadmap (separate sessions), so we grow the app in working layers instead of leaving 12 screens half-done at once.

## What's in the zip (reference only, do not touch)

`/Users/mauriciosalas/Downloads/UIUX beautification discussion.zip` → extracted for this session at `/tmp/uiux_extract2/design_handoff_workbench_clinico/`:
- `Paciente Rediseño.dc.html` — the 12-screen redesign, source of visual truth
- `README.md` — full written spec: tokens, layout grammar, per-screen notes, animations, state shape
- `Paciente Actual.dc.html` — old app for comparison, **not implemented**

## Phase 1 (this pass): tokens + pilot screen

### 1a. Replace design tokens
File: `public/tokens.css`

Swap Hybrid H's ink-accent values for the zip's palette, keeping the existing variable **names** so all 28 dependent CSS files pick up the new look automatically:

| Token | New value (from zip) |
|---|---|
| `--color-paper` | `#eceae6` (app-bg, same value already) |
| `--color-surface` | `#f8f7f4` (chrome) |
| `--color-elevated` | `#ffffff` (panel) |
| `--color-ink` | `#1a1a1c` |
| `--color-ink-muted` | `#6c6c70` |
| `--color-accent` | `oklch(0.52 0.09 195)` (teal) |
| `--color-accent-hover` | `oklch(0.42 0.09 195)` |
| `--color-danger` | `#d70015` (alert) |
| new: warn | `#8a4208` (warn) |
| `--color-success` | `#1c6b31` (ok) |
| `--border` | `rgba(28,28,30,0.10–0.12)` |
| dark-mode block | `--color-paper: #171a21`, `--color-surface/--color-elevated: #1e222b`, `--color-ink: #e8eaed`, alert `#ff6b6b`, warn `#f0a35e`, ok `#5fd18a`, teal accent kept, lightened if under 4.5:1 |
| radii | keep `--radius-control` semantics but repoint: 6px badge, 7px row button, 8px bar button, 12px card/window, 14px modal, 999px chip/progress only (never action buttons — this rule from Hybrid H still holds, the zip agrees) |

Add IBM Plex Mono weights 400/500/600/700 if not already loaded (README says reuse existing mono font if present — check `public/tokens.css` font-face / `public/index.html` link tags first; likely already there since Hybrid H also used Plex Mono for labs).

### 1b. Update the design doc
File: `design.md` — rewrite to describe the new system (rename or keep "Hybrid H" as historical section like Hallmark is today), point `Spec` line at a new spec file.

New spec file: `docs/superpowers/specs/2026-08-17-teal-workbench-ui-design.md` — port the README's token tables, layout grammar (4-band window structure), and interaction rules (single primary button, weight-based confirmations, om-* animation keyframes with `prefers-reduced-motion` fallback) into this repo's spec format.

### 1c. Pilot screen: Sala / Resumen del paciente (zip ids `1a`/`1b`) — DONE, corrected scope

**Correction found during implementation:** the real screen matching the zip's "Resumen del paciente" is `public/js/features/patient-dashboard/` (`dashboard-html.mjs`, `dashboard-mount.mjs`, `public/styles/patient-dashboard.css`), not `expediente/*` — `expediente/*` is the problem-list/cultures tab inside the chart, a different surface. Also: this app is one persistent Electron window with a shell (sidebar + tabs), not per-mode standalone windows like the zip mockup shows — the zip's "4-band window" chrome (title bar, counters, body grid) needs adapting into the existing shell/panel model per screen, not copied 1:1.

**What shipped:** `patient-dashboard.css` was already 100% token-driven (71 `var(--…)` uses, 0 hardcoded hex) — the tokens.css swap in 1a recolored it to teal/new alert-warn-ok automatically, with zero markup or CSS changes needed. Verified with the existing test suite (`patient-dashboard-css.test.mjs`, `dashboard-html.test.mjs`, `dashboard-mount.test.mjs` — 79 tests, all pass unchanged) plus `expediente-tabs.test.mjs` / `expediente-group-row.test.mjs` (11 tests, pass).

**Not done in this pass** (real new features, not just recolor — deliberately left for a follow-up so this phase stays "grow in layers," not a half-built feature): the counters band pattern, alert-tint row backgrounds with hover-preserves-tint, and the dashed-border empty-state pattern from the README don't exist yet anywhere in `patient-dashboard`. Building them means new markup + new colocated tests, e.g. marking overdue `pendientes` rows (README's "vencido" rule) — `dashboard-html.mjs`'s `rowTime()` already detects `item.dueDate` but nothing currently flags overdue-ness or applies `--color-danger-tint`/`--color-danger-deep`. This is real, scoped follow-up work, not part of the token-swap pilot.

**Follow-up shipped (2026-08-17, later same day):** vencido row + empty-state box, scoped to what README §10a/§12a actually specify for this screen (the counters band is a Guardia/Pase pattern, not part of 1a/1b — confirmed by re-reading README §215-217, so it stays out of `patient-dashboard` and moves to roadmap items 2/3 below).

- `dashboard-html.mjs`: `Pendientes` card rows now check `isTodoOverdue()` (reused from `public/js/todos-due.mjs`, same helper the Guardia/todos UI already uses — real clock, no new logic). Overdue rows get `<li class="is-overdue">` with a `Vencido` tag instead of the time. `Eventualidades` rows are untouched (overdue marking is pendientes-only, per spec).
- `patient-dashboard.css`: `.rows li.is-overdue` — `--color-danger-tint` background, `--color-danger-deep` mono uppercase tag, 7px radius (row-button radius per the token table). `.empty-hint` (shared by Labs/Eventualidades/Pendientes empty copy) now boxed with `1px dashed --color-border-dashed` + `--color-empty-fill`, per README §146's empty-state rule. No hover-preserves-tint rule was needed — the whole card is one clickable button, so a per-row background isn't touched by the card's own hover mix (verified by reading the CSS, not just assumed).
- Tests: `dashboard-html.test.mjs` — new case asserts an overdue pendiente gets the tag+class, a not-yet-due one keeps the time, and eventualidades never gets the overdue class even with a past `dueDate`.
- Verified: `npm run test:one -- public/js/features/patient-dashboard/dashboard-html.test.mjs public/js/features/patient-dashboard/patient-dashboard-css.test.mjs public/js/features/patient-dashboard/dashboard-mount.test.mjs` (15 + 27 + more, all pass) and `npm run build:ui` clean.

**Follow-up shipped (2026-08-17, layout gap found by direct mockup comparison):** the user compared the running app's dark-mode Resumen screen against the mockup's `1b` directly (screenshot vs. mockup open in a browser tab) and found the app used bordered/rounded "card" boxes for every section, where the mockup is explicitly "sin cajas: reglas... una sola columna" (no boxes: rule-lines, single reading column). See `docs/superpowers/plans/2026-08-17-pilot-remove-card-boxes.md`.

- `patient-dashboard.css` only, no JS/HTML change: `.card` rule (background/border-radius removed, kept the existing `.card-h` bottom-rule as the visual separator) and `.bento.vitals-labs` (2-column grid → 1 column, so Signos vitales and Labs stack instead of sitting side by side — matches the mockup). `.bento.rest` (Pendientes/Eventualidades side-by-side) and `.bento.meds-band` (Medicamentos) were left as-is — both already match the mockup's own layout.
- Explicitly not touched: the Labs card's internal content shape (today groups by delivery/envio time; the mockup splits into a "fuera de rango" mini-table + "en rango" list) — a data-model difference, not a box/spacing one, needs its own future plan.
- Verified: `npm run build:ui` clean. No colocated test added — CSS-only, no behavior/output change (per `tests-with-code.md`, tests are for behavior changes). Visual verification is a follow-up screenshot from the user against the mockup.

### 1d. Animations
Add the five `@keyframes` from README §11c (`om-spin`, `om-shimmer`, `om-pulse`, `om-rise`, `om-sweep`) to a shared CSS file (check `public/styles/` for an existing motion/animations file first, e.g. anything referenced by `ui-motion.mjs`/`ui-physics.mjs`; else add to `base.css`). Wrap in `@media (prefers-reduced-motion: reduce)` per the README's hard requirement. Wire `om-shimmer` into the pilot screen's loading state only for phase 1 — the other four hook into features not yet touched.

## Roadmap (separate follow-up plans, not this pass)

Build order after phase 1 ships and is verified, grouped by shared component reuse:

1. **Labs** (`2a`/`2b`) — split in two after scoping (2026-08-17, see `docs/superpowers/plans/2026-08-17-labs-token-cleanup.md`): (a) **done** — `lab.css` had 6 dead hex fallbacks inside `var(--x, #hex)` cleaned up (the real custom properties are always defined, so the fallbacks never fired; no visual change). (b) **not started, needs its own plan** — trend arrows (↑/↓ vs. previous draw) and the mockup's grid-of-chips layout. Trend arrows need a design decision first: the app's only per-analyte history lookup (`tend-core.mjs`) works against a structured field-key catalog (`labs-panel-defs.mjs`, extended panels only); the day view's core panels (BH/QS/ESC/PFHs) are short-code abbreviations parsed from free text, not in that catalog. A grid layout would also touch `labs-display.mjs`, shared outside the Laboratorio tab (censo, paste-preview, panel history) — real regression risk, not a CSS tweak.
2. **Guardia** (`6a`/`6b`) — **shipped 2026-08-17** (see `docs/superpowers/plans/2026-08-17-guardia-census-table.md`), scoped to the census table + 2 of 3 counters. Card-chip grid replaced with a Cama/Paciente/Alterados/Pendiente/Estado table (new `guardia-census-table.mjs`), reusing the pilot's alert-tint-row convention. Signos + Pendientes counters wired to real data; Ingresos counter and the mockup's four extra right-column panels (Signos recibidos, Pendientes vencidos, Ingresos, Eventualidades, Movimientos) are out of scope — no data source exists yet (needs an admission-date schema field). EN CURSO status dropped — today's todo model has no in-progress flag, only vencido/abierto/listo.
3. **Pase** (`5a`) — single-patient view, keyboard bed navigation
4. **Manejo + patient sidebar** (`4a`, `3b`) — sidebar is shared across screens, build once
5. **SOAP note** (`9a`) — includes the auto-derived "Objetivo" field (needs vitals+labs aggregation logic, not just styling)
6. **Pendientes tab** (`10a`) — grouped list, reuses status-label pattern from Guardia
7. **Interconsultas** (`10b`, 1440×900) — reuses pilot screen content, new chrome only
8. **Inicio de turno** (`12a`) — new screen, no current equivalent; needs new state (`shift`, handoff-mention extraction)
9. **Confirmations, calendar popover, modals** (`11a`, `11b`, `7a`, `7b`) — shared components used by everything above; consider pulling this earlier if screens above keep re-implementing ad hoc confirms
10. **Interno mobile** (`8a`, `8b`) — separate mobile surface under `public/interno/` or `public/js/features/cloud-mobile/`; only mobile screen in the whole set

Each follow-up gets its own plan file and its own row in the Active plans table, per `docs/core/20-claude-code-handoff.md` convention.

## Verification (phase 1)

- `npm run build:ui` after every `public/js` or `public/styles` edit
- Load the app (or the relevant screen) in the Browser tool; compare side-by-side against `Paciente Rediseño.dc.html` ids `1a` (light) and `1b` (dark) opened directly in a browser tab
- Check `prefers-reduced-motion: reduce` actually collapses the om-* animations (toggle OS setting or emulate in devtools)
- `npm run metrics:check` before considering phase 1 done
- Any existing `expediente*.test.mjs` — run via `npm run test:one -- path/to/file.test.mjs`, not bare `node --test`

## Phase 1 result (2026-08-17)

Shipped: tokens.css palette swap (light + dark), `--color-warn` decoupled from `--color-livesync-syncing`, new alert-tint/border-strong/empty-fill/rail tokens, IBM Plex Mono 700 weight added, `design.md` + new spec doc + `docs/core/06-design-system.md` updated, two new animations added to `motion.css` (`value-alert-pulse`, `progress-sweep-fill` — reused existing `skel-shimmer`/`btn-spin`/`toast-in` for the other three instead of duplicating), `warm-instrument.test.mjs` renamed to `teal-workbench.test.mjs` and its color assertions updated for the new palette (package.json test script updated to match).

Verified: `npm run build:ui` clean, `npm run test:one` on `teal-workbench.test.mjs` (11/11), `patient-dashboard-css.test.mjs` + `dashboard-html.test.mjs` + `dashboard-mount.test.mjs` (79/79), `expediente-tabs.test.mjs` + `expediente-group-row.test.mjs` (11/11) — all pass with zero changes needed, confirming the token-name-preserving strategy worked.

`npm run metrics:check` reports a debt regression (score 72 vs baseline 0), but it's pre-existing: it traces to already-uncommitted `lib/cloud-sync-remember-store.cjs` and `public/js/features/cloud-sync/*` files from the Nube E2EE work (see `docs/core/20-claude-code-handoff.md` Active plans), not to anything touched in this phase. Not this session's to fix — Nube crypto is closed per `CLAUDE.md`.

Not shipped (see 1c correction above): no new layout markup in the pilot screen — counters band, alert-tint rows, empty-state pattern are real follow-up work, not colored-in-for-free like the rest of `patient-dashboard.css`.

## After approval

Copy this plan into the repo (`docs/superpowers/plans/2026-08-17-teal-workbench-ui-redesign.md`) and add it as a row in the Active plans table in `docs/core/20-claude-code-handoff.md`, per CLAUDE.md.
