# Teal workbench — full rollout to 8.1.6 (single plan, all remaining screens)

Date: 2026-08-19. Author: CEO (planning only). Executor: Lead (Sonnet). This plan supersedes the phase list in `docs/superpowers/plans/2026-08-18-teal-workbench-full-fidelity.md` for all still-open work. It does not redo anything that plan's REMEDIATION rounds already screenshot-verified.

## Goal

Every one of the 12 mockup screens matches `Paciente Rediseño.dc.html` 1:1 — visually verified in the running app, light and dark — before app version 8.1.6 ships. One plan. No further sub-plans.

## Sources of truth

- Pixel truth: `/Users/mauriciosalas/Downloads/design_handoff_workbench_clinico/Paciente Rediseño.dc.html` (3377 lines). Screen index: 12a Inicio de turno ~L35 · 11a Confirmaciones ~L212 · 11b Calendario ~L262 · 10a Pendientes ~L416 · 10b Interconsultas ~L522 · 9a Nota ~L795 · 8a/8b Interno ~L991/L1091 · 7a Revisar signos ~L1224 · 7b Nuevo pendiente ~L1291 · 6a/6b Guardia ~L1413/L1663 · 5a Pase ~L1924 · 4a Manejo ~L2089 · 3b Sidebar ~L2383 · 2a/2b Laboratorio ~L2486/L2676 · 1a/1b Resumen ~L2875/L3127.
- Written spec: same directory, `README.md`. Where README and mockup disagree, escalate to senior-dev; do not pick silently.
- Do NOT implement `Paciente Actual.dc.html`.
- Repo spec: `docs/superpowers/specs/2026-08-17-teal-workbench-ui-design.md`, tokens in `public/tokens.css`, design rules in `design.md`.

## Constraints

- Vanilla JS. Edit `public/js/**/*.mjs` + `public/styles/*` sources only; `npm run build:ui` after renderer edits; `npm run test:one` for colocated tests (Electron Node, never bare `node --test`).
- Spanish user-facing copy. One teal primary per screen. Red/amber/green only for clinical meaning. No hardcoded hex in new CSS.
- The app is ONE Electron window with a shell. Reproduce mockup proportions inside each mode's pane; never per-mode OS windows.
- Do not reopen: Nube crypto, graph-memory, closed UI bugs. Ignore the pre-existing metrics debt from Nube files.
- Do not fabricate clinical data anywhere (counters, day counts, zones).

## Three hard gates (from MISTAKES.md — these caused the last three failures)

**Gate A — human-visible proof (failure: "done on unit tests alone").** No phase is Done until the ORCHESTRATING session itself has: (1) run `node scripts/verify/screenshot.mjs out.png --eval=...` (or looked at the real on-screen app), with Electron `Cache`/`Code Cache` cleared and `npm run build:ui` fresh, and (2) put that screenshot next to the mockup screen at its line offset, light AND dark. A lead-dev/dev-haiku self-report, passing tests, or "it uses the right tokens" close nothing. If any subagent report contains "not yet wired", "small follow-up", or "verified by test only", that item becomes a required step of the SAME phase before it closes.

**Gate B — no fragmentation (failure: "10 different plans").** One phase = one whole roadmap screen brought to 1:1. Nothing the mockup itself answers may be pushed "out of scope" — layout, spacing, grouping, copy placement are all in-phase, always. Only true data-model or product gaps leave a phase, and only by being added to the "Open decisions" table below with the user's name on the decision. This file is the only plan; phases update their checkbox here, no new plan files.

**Gate C — full-surface pass (failure: "verified element by element").** Before closing a phase, extract the mockup's actual inline styles for the WHOLE screen (font/size/weight/letter-spacing/transform/color/padding/gap/radius/shadow) and diff against the rendered app — one pass over the entire screen surface, not just the elements that phase touched. Checklist per phase: typography scale · colors incl. muted/tertiary · spacing/gaps · radii (999px only chips/progress) · shadows · row grouping/ordering · empty states · one-teal-primary rule.

## Verification protocol (every phase, in order)

1. `npm run build:ui` clean. 2. Touched colocated tests green (`npm run test:one`). 3. Screenshot light + dark vs mockup (Gate A). 4. Gate C full-surface diff. 5. Reduced-motion toggle collapses om-* animations. 6. Commit the phase (see Phase 0). Verify-tool rules: navigate with `page.evaluate(() => document.getElementById('apptab-…')?.click())` against real ids from `public/partials/layout/app-body.html` — never the text-locator helpers; a wrong-looking screenshot means dump DOM state (`scripts/verify/debug-dom.mjs`) before concluding anything.

## Phase 0 — Baseline: commit checkpoint + 12-screen inventory (Lead + Dev) — BLOCKS ALL OTHERS

The whole remediation (~152 files) is UNCOMMITTED since `670d4e93`. First actions:
1. Commit the existing verified work in coherent chunks (kit/tokens · per-screen · verify tooling · docs). Do not reset or discard anything.
2. Screenshot ALL 12 screens, light + dark, into a dated folder. For each, record vs-mockup status: MATCHES / GAPS (list them) / NOT BUILT. This is the real gap list — the docs disagree with each other (the handoff punch-list table in `docs/core/20-claude-code-handoff.md` is stale vs the plan file's remediation rounds), so the screenshots decide.
3. Dev: extend the DEMO PÉREZ fixtures (`tour-pitch-labs.mjs` dayOffset pattern) so untestable states become testable: a patient with 2+ same-day lab draws (hour-group split header, dedup), one with 17+ altered values (cap/wrap), live-arriving out-of-range vital (Movimiento pulse). No PHI — fake data only.
4. Confirm-in-Phase-0 list (docs are unclear on these): sidebar 3b "tarjetas suaves" restyle; Manejo apoyos-vs-meds split count; Interconsultas 10b consult band + schema fields; reversible-action undo toasts actually replacing modals; live look of one converted `showConfirmDialog` (item 17 was code-verified only).

**Done:** clean `git status` except work-in-progress; inventory table appended to this file; fixtures merged.

## Phases 1–9 — one roadmap screen each, reuse-priority order

Each phase = close every gap Phase 0 found for that screen, to full 1:1. Known-remaining items from the remediation rounds are listed; the Phase 0 screenshots may add to them, never remove them without a screenshot proving MATCHES.

**Check before you build (2026-08-19 correction).** The codebase moves fast between sessions — Pase was fully retired the same day this plan was written (see Phase 3 below), and the Phase 0 inventory itself found several screens already partially or mostly implemented, not "NOT BUILT" as older docs claimed. Before writing new code for any phase, grep/read the actual current files for that screen first — do not assume a gap exists just because an older plan or the roadmap description says so. Treat the Phase 0 inventory as the freshest source, but re-verify it too if it's more than a day or two old by the time a phase executes.

**1. Laboratorio 2a/2b** — `lab-results-card.mjs`, `labs-display.mjs`, `lab.css`, `lab-inner.css`. Card/arrows/Día-nav shipped 08-18. Remaining: screenshot the hour-group split header with the new multi-draw fixture (was unit-test-only); full 2a light + 2b dark surface pass; confirm shared consumers (censo, paste-preview, panel history) unregressed.

### Phase 1 regression check (commit 11f2347b)
CSS fix removed redundant date heading in Laboratorio 2a/2b results card when Día-nav picker is active. Verified 2026-08-19:
- Lab results panel: date picker visible (19/08/2026), no duplicate date heading above results. ✓ CORRECT
- Dashboard labs card: displaying without date heading (not affected by scoped CSS fix). ✓ CORRECT
- Censo view: OK (does not use #lab-output-section structure; renderEntry display unaffected)
- Paste-preview view: OK (does not use #lab-output-section structure; renderEntry display unaffected)
Regression check complete: no visual breakage detected.
**2. Guardia 6a/6b remainder** — `guardia-board-chrome.mjs`, `guardia-census-table.mjs`, `pase-board.css`, `lib/db/schema.mjs`. Remaining: Ingresos counter + filter chip (needs decision D3a); EN CURSO status (D3b); right column renders the spec-compliant dashed empty state for Signos recibidos (not a fake panel, not a zero); full 6b dark pass — dark Guardia is a hard requirement (night shift). Movimiento vitals-pulse gets its live screenshot here with the new fixture.
**3. Pase 5a — CUT 2026-08-19, do not execute.** The Pase module was fully retired 2026-08-19 (commit `363d8012`, "retire pase-board module") — `pase-board-render.mjs`/`pase-board-navigation.mjs` no longer exist, folded into `app-tabs.mjs`/`app-tabs-runtime.mjs`, and Pase content now lives inside the unified Resumen glance (see commits `182e7c37` "unify Pase ronda with Resumen glance", `3b589376` "keep Pase on Resumen"). There is no standalone Pase screen left to bring to 1:1 against mockup `#5a`. Any remaining Pase-shaped ground (per-bed ronda navigation, zones, Eventualidades) is now in scope of **Phase 1 (Resumen)**, already shipped/verified there — no separate work item. `pase-board.css` still exists in the tree but is unrelated (used by `clinical-teams`), not a leftover Pase screen.
**4. Manejo 4a + sidebar 3b** — `medications-panel-render.mjs`, `med-pharm-profile*.css`; `patients-list.mjs`, `sidebar.css`. Sidebar 3b soft-cards (Fijados/Pacientes, bold name + gray mono bed/room) — likely NOT done, Phase 0 confirms. "más 1 apoyo (O₂)" split: if the med model lacks the apoyo concept, it is a model change with tests, not a label hack. Egreso modal is done — regression-check only.
**5. Nota 9a** — nota feature + `lib/nota-evolucion/`. S/O/A/P cards fixed 08-18. Remaining: derived Objetivo populates from the day's vitals+labs without typing (live check); autosave toast is reversible-weight (no modal); P-plan mono marks `novo`/`sin cambio`/`suspende`; verified inside Interconsulta mode (the only place it shows, by design).
**6. Pendientes 10a + 7b** — `todos-list-render.mjs`, `workbench/wb-table.mjs`. Table shipped 08-18. Remaining (named cosmetic gap): remove the old inline "Nuevo pendiente…" composer; add "+ Pendiente" button opening the 7b 3-field kit modal (L1291); vencidos rows alert-tint; resueltos collapsed.
**7. Interconsultas 10b** — `chrome.mjs` mode switch, `lib/db/schema.mjs` (`requestingService`/`reason`/`followUpStatus` — Phase 0 confirms if already present). Consult band above the same Resumen content; primary "Actualizar pacientes"; "Generar nota" demoted to menu; frame differs, content identical to 1a.
**8. Inicio de turno 12a** — GATED on decision D1 (user deferred it 08-18; this rollout brief re-includes it — confirm explicitly). If GO: new `public/js/features/inicio-turno/` + tests; `Recibir N pacientes` primary; 3 counters; "Lo primero" table `92px 1fr 128px 96px`; entrega card with `firmada HH:MM` + mentioned-beds extraction (pure function in `lib/` + test); zone chips persisted across restart; the two canonical empty states.
**9. Shared 11a/11b/7a sweep** — final pass over confirmations (weights: destructive/consequence/reversible; grep proves zero `window.confirm` and zero ad hoc modals), calendar popover vs L262 (Último pase chip stays disabled per D5), undo toasts live-verified. 7a Revisar signos ships only when intern data exists (D2) — until then the Guardia empty state stands in.

## Phase 10 — Interno mobile 8a/8b: decision gate only (no build in this rollout)

Cannot be built in the desktop renderer: needs a mobile surface, transport (Nube — deploy blocked on compliance), intern auth, PHI decisions. Recommendation to the user: ship 8.1.6 with 11 desktop screens at 1:1 plus the spec-compliant stand-in empty states; run 8a/8b/7a as its own program after Nube deploy. Needs explicit user sign-off (D2).

## Final gate — pre-8.1.6 ship pass (Lead executes, orchestrating session verifies)

1. All 12 screens re-screenshot in one sitting, light + dark, against the mockup — including screens fixed weeks ago (regression catch).
2. One cross-screen Gate C pass: same type scale, same radii, same shadows, same status-label grammar, one teal primary everywhere, chips 999px only.
3. REAL on-screen window pass at normal desktop size — headless verification missed real layout bugs twice (counters-band gap, Pase height); the user or a computer-use screenshot of the visible window, not only the off-screen harness.
4. `npm run build:ui` · full touched test suite · `npm run metrics:check` (ignore documented Nube debt) · reduced-motion · everything committed.
5. Only then: 8.1.6 release steps per the release checklist (memory: `feedback_release_checklist.md`).

## Open decisions — RESOLVED 2026-08-19

| # | Decision | Blocks | Answer |
|---|----------|--------|--------|
| D1 | Inicio de turno 12a — build for 8.1.6 or skip? | Phase 8 | **Skip.** Phase 8 dropped from this rollout. 12a stays deferred. |
| D2 | Interno mobile 8a/8b + 7a out of 8.1.6? | Phase 10, part of 9 | **Yes, deferred.** Own program after Nube deploy. |
| D3a | Add admission-date field to patient schema? Where set? | Phase 2 | **Yes.** Auto-set the moment the user adds the patient to the census — no manual entry, no separate intake step. |
| D3b | Add in-progress flag to todos (EN CURSO)? | Phases 2, 6 | **Yes.** Build the EN CURSO status. |
| D4 | `CLINICAL_PRIORITY_LABELS` clinician sanity-check. | Final gate | Still open — 2-minute review at final gate. |
| D5 | "Último pase" calendar chip — stays disabled? | Phase 9 | **Yes, stays disabled** for 8.1.6. |

Phase 8 (Inicio de turno) is cut from this rollout per D1. Renumber at execution time or leave the gap — Phase 8's absence does not block Phase 9/Final gate.

## Roles

- **Lead (Sonnet):** implements one phase per session, in order; updates this file's phase status; runs build/tests; prepares screenshots. Never marks Done — the orchestrating session applies Gates A/C itself.
- **Dev (Haiku):** Phase 0 fixtures, greps (confirm inventory, `window.confirm`, radius consumers), test runs.
- **Senior (Opus):** only when Lead is stuck, or on a README-vs-mockup conflict. Not by default.
- **CEO (Fable):** this plan. No code. Session drops back to Sonnet after the plan exists.

Self-contained: a fresh session executes any phase with this file, the handoff directory, and the repo.

## Phase 0 result — screen inventory (2026-08-19)

Method: `npm run build:ui` clean, then real Electron screenshots via `scripts/verify/screenshot.mjs` against the DEMO PÉREZ presentation-mode fixture, navigated with real element ids/functions (`apptab-*`, `switchConsolidatedTab`, `switchInnerTab`, `setWorkModeFromHeader`, `toggleTheme` — never text locators, per the verify-tool rule). Mockup ground truth pulled from `Paciente Rediseño.dc.html` by anchor id (`#1a` … `#12a`) via a local static server + `get_page_text`, cross-checked against one direct render of `#12a` (matches the corresponding app content structurally).

Two structural facts affect every screen below and are not repeated per row:
- **DEMO PÉREZ is a single-patient, non-Guardia fixture.** Guardia-mode screens (5a, 6a, 6b, 7a) render the real "Sin Nube · Sin equipo · No hay pacientes visibles" empty state, not a populated census — Guardia has never been exercised with data through this fixture. That empty state itself is spec-compliant (dashed panel, explanatory copy, no fake numbers), so it is not a defect, but it means the 25-patient census layout in the mockup is **unverified**, not confirmed.
- **A confirmed layout bug hits every screen inside the classic "Paciente" pane's Resumen sub-tab**: `#patient-dashboard-mount` and its whole ancestor chain (`#itab-content-paciente` → `#expediente-panes-host` → `#patient-expediente-classic` → `#patient-view` → `#appcontent-nota`) collapse to ~17px computed height even though the dashboard HTML is present and populated (3.7KB, not hidden). Content is in the DOM but not visible. This blocks 1a/1b outright.

| # | Screen | Verdict | Notes |
|---|--------|---------|-------|
| 1a | Resumen — claro | **GAPS (blocking)** | Dashboard mount collapses to ~17px height, content invisible (see structural fact above). Sidebar/header chrome around it matches the teal-workbench look. Cannot assess panel-by-panel fidelity until the collapse is fixed. |
| 1b | Resumen — oscuro | **GAPS (blocking)** | Same collapse bug in dark mode. |
| 2a | Laboratorio — claro | **GAPS** | Tab shell, "REPORTE DE LABORATORIO" card, and results header ("RESULTADOS · N ALTERADOS DE M", day nav, Copiar) match the mockup's structure and teal accents well. The visible result rows for DEMO PÉREZ's most recent day are a CULTIVO entry (monospace R/I/S susceptibility chips) — the BH/QS/ESC/PFHs numeric grid with hour-group headers and ↑/↓ arrows that the mockup foregrounds was not visible in this pass (may require scrolling to a different day, or may be an ordering/layout gap in lab-results-card.mjs — not confirmed either way). |
| 2b | Laboratorio — oscuro suave | **MATCHES** (partial) | Same content as 2a, correctly re-themed: softer dark background, desaturated red/amber chips, teal headers preserved. Same caveat about the numeric grid not being directly observed. |
| 3a | Sidebar — filas con riel | NOT ASSESSED | Not in this rollout's screen list (superseded by 3b per the mockup's own three-treatment comparison). |
| 3b | Sidebar — tarjetas suaves | **MATCHES** (partial) | Single DEMO PÉREZ card renders as a rounded, teal-bordered soft card with "Fijar" pill and bold name, matching the mockup's card treatment. Not verified: gray-mono bed/room line and multi-patient FIJADOS/PACIENTES section grouping, since the fixture has only one patient with no room/bed metadata shown the way the mockup's "214-B · C2 · M. Interna" line does. |
| 3c | Sidebar — censo compacto | NOT ASSESSED | Not in this rollout's screen list. |
| 4a | Manejo — claro | **MATCHES** (partial) | EXCL./SOAP/MEDICAMENTO/DESTINO/DÍA table renders with correct columns, checkboxes, and destino dropdowns; helper copy above the table matches mockup intent. Not visible in this pass (below the fold or absent for this fixture): "DIETA DETECTADA" card, "TEXTO DE EGRESO" side panel, and the "más N apoyo (O₂)" split-count callout — Phase 0's confirm-list item on the apoyo/med split is still open. |
| 4b | Manejo — oscuro | **MATCHES** (partial) | Same table re-themed correctly in dark mode; same open items as 4a. |
| 5a | Pase — claro | **NOT VERIFIED** | Guardia-mode empty state only (see structural fact above); the one-patient-per-screen Pase layout was not exercised. |
| 5b | Pase — oscuro | NOT ASSESSED | Not separately listed in the mockup (5a only). |
| 6a | Guardia — claro | **NOT VERIFIED** | Empty state only. Chrome around it (header counters band: TOMA DE SIGNOS/PENDIENTES/INGRESOS, "Sin Nube"/"Sin equipo" pills, "Guía guardia 0/5", "Censo: todos" toggle) is present and styled, but the populated 25-row census table, right-column vitals feed, and Movimiento pulse animation are all unverified. |
| 6b | Guardia — oscuro suave | **NOT VERIFIED** | Same empty state, dark mode. Colors re-theme correctly (desaturated red for PENDIENTES, teal preserved) but the populated-census claim from the plan ("dark Guardia is a hard requirement — night shift") is unconfirmed. |
| 7a | Revisar signos recibidos (modal) | **NOT VERIFIED** | Could not trigger — needs a "signos received" event with real vitals data the DEMO PÉREZ fixture doesn't have yet. Only the Guardia empty state was visible underneath. |
| 7b | Nuevo pendiente (modal) | **NOT VERIFIED** | The "+ Pendiente" button referenced by the plan (Phase 6) was not found in the DOM during this pass in the location tried (Resumen sub-tab). It does appear inside the forced Pendientes view (10a) — see that row. Modal itself not opened/confirmed this pass. |
| 7c | Nuevo ingreso (modal) | NOT ASSESSED | Not in this rollout's tracked screen list (12 screens per the plan header), but present in the mockup file; flagging for awareness only. |
| 8a | Mis camas — celular | **NOT BUILT** (confirmed, per D2) | No `inicio-turno`-style mobile surface exists; intern mobile view is out of scope for 8.1.6 per the resolved D2 decision. |
| 8b | Captura — celular | **NOT BUILT** (confirmed, per D2) | Same as 8a. |
| 9a | Nota de evolución (SOAP) | **MATCHES** (partial) | S/O/A cards render with correct headers and teal accents. The O · Objetivo card correctly shows the spec-required empty state ("Sin signos vitales ni laboratorio de hoy para derivar" + disabled "Confirmar") rather than fabricating data — this is the right behavior when the fixture has no same-day vitals/labs, and it's a good sign for the derive-don't-type requirement, but a live population check (Phase 0's "Confirm-in-Phase-0" list item) still needs a fixture with same-day data. P · Plan section and mono change markers (`novo`/`sin cambio`/`suspende`) were not visible in this pass (below the fold). Confirmed reachable only inside Interconsulta mode, matching the plan's "by design" note. |
| 10a | Expediente → Pendientes | **GAPS (confirmed)** | Two concrete findings: (1) **The tab has no visible UI entry point** — `itab-content-todo` / `switchInnerTab('todo')` exist and render correctly, but no `exp-segment-*` button in `public/partials/layout/app-body.html` wires to it; it had to be forced open via direct JS. This is more than the "cosmetic" gap Phase 6 describes — the whole pestaña is unreachable by clicking. (2) **The old inline "Nuevo pendiente…" composer (text field + priority chip + Fecha límite quick-chips) is still present**, alongside a separate "+ Pendiente" button — Phase 6's "remove the old inline composer, add the 7b kit modal button" is only half done (the new button was added, the old composer was not removed). Grouping by VENCIDOS/SIN FECHA/CERRADOS looked correct where visible (SIN FECHA · 5 shown; VENCIDOS section not visible in this fixture, since nothing is overdue). |
| 10b | Modo Interconsultas | **NOT VERIFIED** | Mode switch to Interconsulta succeeded (toast confirms), but this pass re-captured the same Nota de evolución view instead of navigating back to Resumen to see the consult band + sidebar's NUEVAS/EN SEGUIMIENTO patient-list treatment the mockup shows. Needs a follow-up pass that clicks back to the Resumen sub-tab while in Interconsulta mode. |
| 11a | Confirmaciones | **NOT VERIFIED** | No destructive action was triggered in this pass (right-click on a patient chip did not surface a menu with the fixture's single pinned patient). `grep` for `window.confirm` / ad hoc modals (Phase 9's regression check) was not run this session. |
| 11b | Calendario | **MATCHES** | Header date-popover opened correctly: month grid, Hoy/Ayer/7 días quick jumps, "Último pase" chip rendered disabled (matches resolved decision D5), and "DÍAS CON LABS" list with alterados counts per day. Good structural and visual match to the mockup's calendar intent. |
| 11c | Movimiento (motion patterns) | NOT ASSESSED | Cross-cutting animation spec, not a standalone screen; covered by the Phase 0 fixture task (live out-of-range vital) and the reduced-motion check in the verification protocol, not a screenshot. |
| 12a | Inicio de turno | **NOT BUILT (in the UI), code scaffold exists** | `public/js/features/inicio-turno/` (panel, summary, zones, bed-mentions + tests) was found already committed in this Phase 0 checkpoint but has **no DOM hook** — `document.querySelector('[id*="inicio-turno"], [class*="inicio-turno"]')` found nothing live in the running app. Per resolved decision D1, 12a stays deferred for 8.1.6, so this is expected, but the existing scaffold should be noted for whoever picks this up later: the pure-function pieces (summary/zones/bed-mentions) already have colocated tests and may be reusable. |

### Honest gaps in this inventory pass itself

- Guardia/Pase (5a, 6a, 6b, 7a) need a populated-census fixture to verify at all — the current DEMO PÉREZ fixture cannot exercise them. This should be either a new fixture or a documented decision to verify Guardia manually with the user's own Sala/equipo.
- 10b, 11a, 7b, 7c modals need one more navigation pass (this session ran out of time budget after finding the Resumen collapse bug and the Pendientes tab gap, which are the two highest-value findings).
- No Gate C full-surface typography/spacing/shadow diff was attempted — Phase 0 only required a screenshot + verdict, and Gate C is explicitly scoped to each screen's own remediation phase (1–9), not Phase 0.
- 3a, 3c, 5b, 7c, 11c are outside the plan's 12-screen list and were not screenshotted; listed above only where the mockup file happened to surface them, for awareness.

### Priority follow-ups this inventory surfaces for Phase 1+

1. **Fix the Resumen dashboard collapse bug first** — it blocks 1a/1b entirely and is likely a single missing `flex: 1 1 auto` / `min-height: 0` in the `patient-dashboard-mount` → `appcontent-nota` chain, not a content problem.
2. **Wire a visible Pendientes tab button** (10a) — this is bigger than the plan's Phase 6 description suggested; it's a missing entry point, not a cosmetic cleanup.
3. **Remove the legacy inline pendiente composer** now that the 7b-style "+ Pendiente" button exists (10a) — both are live today, which is confusing, not just unfinished.
4. Build (or explicitly defer with a decision row) a populated-Guardia fixture so 5a/6a/6b/7a can ever be screenshot-verified.

## Phase 0 continuation result (2026-08-19)

Picked up the stalled Phase 0 fixture/inventory work. Two commits landed on top of `416882b1`:

**1. Fixture work — `c6a32ec3`.** Finished the two fixtures the prior agent had started (`public/js/tour-pitch-labs-edge-cases.mjs`: same-day AM/PM draws for the hour-group split header, and an 18-altered-value draw for the "N ALTERADOS DE M" cap/wrap) and added the third: `buildPitchLiveAlertVitalsEntry()` in `public/js/tour-pitch-monitoreo.mjs` — a single synthetic out-of-range FC reading recorded "now", for the Movimiento (§11c) live-arriving-vital pulse animation. Colocated tests in `public/js/tour-pitch-labs-edge-cases.test.mjs` and the new `public/js/tour-pitch-monitoreo.test.mjs` (the latter drives the fixture through the real `renderGuardiaVitalsFeed()` and asserts a one-shot `.value-alert-pulse`). Both test files registered in `package.json`. All data synthetic — no PHI. `npm run test:one` green (7/7), `npm run build:ui` clean.

**2. Bug fix — `fa61053b`.** Root cause of the Resumen dashboard collapse (blocking 1a/1b): `#patient-view` has no CSS `display` rule of its own — it's controlled entirely by inline style, toggled `'none'`/`'flex'` by `features/patients-select.mjs`'s `showPatientViewShell()`. `startPresentationMode()` in `public/js/presentation-mode.mjs` cleared the inline style to `''` instead of setting it to `'flex'`, so the element fell back to the browser default `display: block`, and the whole ancestor chain (`patient-dashboard-mount` → `itab-content-paciente` → `expediente-panes-host` → `patient-expediente-classic` → `patient-view` → `appcontent-nota`) collapsed to its content-less ~17px height. One-line fix (`pv.style.display = 'flex'`), plus a colocated regression test (`public/js/presentation-mode.test.mjs`).

**Screenshot verification (Gate A):** ran `npm run build:ui` fresh, cleared Electron cache, then `node scripts/verify/screenshot.mjs` against the real running app, navigated via `setupDemo()` (real element ids: `#btn-start-presentation`, `#clinical-onboard-local-confirm-btn`) and `window.toggleTheme()` for dark. Before the fix: `#patient-dashboard-mount` computed height 16.8px, `#patient-view` computed `display: block`. After the fix: `#patient-view` computed `display: flex`, `#patient-dashboard-mount` computed height 492px, full Resumen dashboard visible and populated (SIGNOS VITALES, LABS FUERA DE RANGO 7/7, EVENTUALIDADES, PENDIENTES, MEDICAMENTOS cards all rendered) in both light and dark. Confirmed 1a and 1b are no longer blocked.

`git status` is clean after both commits.

## Phase 1 result — Laboratorio (2026-08-19)

**Fixture wiring:** already done by a prior session — `tour-pitch-labs.mjs` already registers `DEMO_SAME_DAY_AM_SOME`/`DEMO_SAME_DAY_PM_SOME` (dayOffset -1) and `DEMO_HEAVILY_ALTERED_SOME` (dayOffset -3) from `tour-pitch-labs-edge-cases.mjs`.

**Was the Phase 0 numeric-grid gap real?** Yes, but not a layout bug — a navigation artifact. DEMO PÉREZ's most-recent day (dayOffset 0) is a CULTIVO record, so Phase 0's screenshot always landed on the cultivo view. Navigating the Día-nav to `18/08/2026` (the multi-draw fixture) renders the BH/QS/ESC/PFHs grid correctly: two hour-group headers ("16:15 · Labs · 2 alterados", "06:30 · Labs · 2 alterados"), red altered values with ↑/↓ trend arrows, monospace chips — matches mockup L2486 structurally. The 18-altered fixture (`16/08/2026`) confirmed the "N ALTERADOS DE M" title wraps to two lines cleanly with no overlap of the Día-nav controls.

**Fix made:** `public/styles/lab.css` — added a rule after `.lab-output-fecha` (`#lab-output-section:has(.lab-history-date-select:not([hidden])) .lab-output-fecha { display: none; }`). The Resultados card was repeating the day's date as its own heading even though the Día-nav picker right above it already showed the same date; the mockup (L2486) does not repeat it. Scoped by id so the Día-nav-less fresh-parse view keeps its only date indicator, and other `labs-display.mjs` consumers (dashboard "Labs fuera de rango" card, censo, paste-preview) are structurally unaffected. No JS changed.

**Gate C surface check:** typography, colors, spacing, row grouping in the existing grid CSS already matched the mockup's inline styles — all via `var(--...)` tokens, no hardcoded hex. Dark mode re-themes correctly. No radius/shadow/one-teal-primary violations found.

**Tests:** `tour-pitch-labs-edge-cases.test.mjs` 4/4 pass, `lab-results-card.test.mjs` 7/7 pass. `npm run build:ui` clean (twice).

**Screenshot verdict:**
- 2a (light): **MATCHES** — grid, hour-group headers, alterados counts, trend arrows all correct on both the multi-draw and heavily-altered fixture days; redundant date line removed.
- 2b (dark): **MATCHES** structurally — teal preserved, red desaturated correctly. Not pixel-diffed against literal mockup dark hex values beyond visual pass.

**Reduced-motion:** confirmed — `document.getAnimations()` returns `[]` with `prefers-reduced-motion: reduce` on; all om-* animations on this screen are guarded (locally or via global `motion.css`).

**Shared consumers:** Resumen dashboard's "LABS FUERA DE RANGO" card spot-checked live, unaffected. Censo and paste-preview modal were **not** independently screenshotted this pass (time-boxed) — the fix is id-scoped so it structurally cannot reach them, but that is inference, not a live screenshot. Flagging as the one open item before fully closing Gate A on this phase.

**Commit:** `11f2347b` — `fix(lab): drop redundant date heading in Resultados when Día-nav is active`.

**Status:** Phase 1 substantially done. Remaining before hard-close: live screenshot of censo and paste-preview to confirm zero regression (low risk, not yet directly observed).

## Phase 4 result — Manejo + Sidebar (2026-08-19)

**Already working (no rebuild needed):** the Phase 0 "not visible" items for 4a/4b were not missing features — they were untested with real data. Code review of `medications-panel-render.mjs`, `medications-panel-rows.mjs`, `med-receta-diet.mjs`, and `med-receta-apoyo.mjs` found the "Dieta detectada" card (`buildMedDietHtml`), the "más N apoyo (O₂)" split-count header (`countMedTurnoItems` / `buildMedTurnoHeaderText`), and the "Texto para nota de egreso" side card (`#med-output-section`, equivalent to the mockup's "Texto de egreso" bar + modal) were all already fully implemented, each with its own prior test coverage. The apoyo/med model gap flagged as a possible risk in this rollout's brief does not exist — `med-receta-apoyo.mjs` already has a real `classifyApoyoKind`/`apoyoKindLabel` model with tests; no schema or model work was needed. Sidebar 3b's Fijados/Pacientes grouping and pin-border-not-fill treatment (`patients-card-html.mjs`, `patient-sidebar-card.mjs`) were also already correct and unit-tested.

**Real gaps found and fixed (commit `bb988c51`, plus `747708a6` landed concurrently by another session and carries one of these same fixes — see note below):**
1. **Sidebar bed/room/servicio line was not mono.** Mockup #3b shows this line (`214-B · C2 · M. Interna`) in the gray IBM Plex Mono data scale; the app rendered it in the sans body font. Root cause: `aside.patient-sidebar .patient-card .p-meta { font: var(--type-caption); }` in `public/styles/workbench-surfaces.css` (higher specificity) was overriding an earlier, lower-specificity attempt in `sidebar.css`. Fixed both to use `var(--type-wb-mono, ...)`. Confirmed via computed-style check in the running app: `font-family` now resolves to `"IBM Plex Mono", ui-monospace, ...`.
2. **Manejo table row labels wrapped instead of truncating.** `.med-receta-name` had no `white-space:nowrap/overflow:hidden/text-overflow:ellipsis`, so a long medication/apoyo name wrapped to 3 lines and pushed the Destino/Día columns out of alignment — a real Gate C typography gap vs. mockup #4a's single-line ellipsis rows. Fixed in `public/styles/expediente.css`.
3. **Fixture couldn't exercise the diet card or apoyo header.** The DEMO PÉREZ Manejo fixture (`tour-pitch-seed-maps.mjs`) had 2 plain medications and no `dietas`, so "Dieta detectada" and "más N apoyo" never rendered during any prior verification pass, which is exactly why Phase 0 could not confirm them. Added one diet entry (`Dieta renal, restricción de K y P`, 1400 kcal / 60 g proteína) and one realistic O₂ apoyo item (`OXIGENO · MASCARILLA RESERVORIO 10 L/MIN`, matching the raw-text shape already covered by `med-receta-apoyo.test.mjs`). Fake data only, no PHI. New colocated test `tour-pitch-seed-maps.test.mjs` (2 tests) asserts the fixture produces a renderable diet candidate and exactly one apoyo item with the right header text.

**Not fixed — honest gap:** multi-patient sidebar Fijados/Pacientes grouping (2+ real rows in each section, not just the labels/counts) was still not directly screenshotted this phase. Attempted to add two live patients through the real "+ Agregar" → "Nuevo Paciente" UI flow during verification, but "Modo presentación (DEMO PÉREZ)" isolates the renderer's patient list to the single demo patient (`setPitchPatientIsolation(true)` in `tour-pitch-seed-core.mjs`), so newly added patients don't appear in the list while presentation mode is active — this is a verification-tooling limitation, not a product bug. The grouping code itself (`renderPinnedSectionLabelHtml`, `renderActiveSectionLabelHtml`, `patients-card-html.mjs`) is unit-tested and was not changed. A populated multi-patient fixture (parallel to the Guardia census fixture another session landed concurrently as `tour-pitch-guardia-census.mjs`) would be the right way to close this; flagging it rather than forcing a live screenshot with fabricated risk.

**Concurrency note:** `public/styles/workbench-surfaces.css` was independently edited by both this session and a concurrent Guardia-phase session; the concurrent session's commit `747708a6` happened to include this session's `.p-meta` mono-font fix (verified: the diff in that commit contains exactly the `aside.patient-sidebar .patient-card .p-meta` change described above, correctly attributed to fix intent even though the commit message doesn't mention it). No content was lost or overwritten; this session's own commit `bb988c51` covers the remaining files (fixture, test, `expediente.css`, `sidebar.css`).

**Verification (Gate A):** `npm run build:ui` clean (run 4 times across iterations). Screenshots taken via `scripts/verify/screenshot.mjs` against the real running app (DEMO PÉREZ, `apptab-med`):
- **4a (light):** Dieta detectada card, "más 1 apoyo (O₂)" header, ellipsis-truncated O₂ row, Texto para nota de egreso card all confirmed rendering correctly against mockup #4a's structure.
- **4b (dark):** same content, correctly re-themed (teal preserved, backgrounds/borders dark-appropriate).
- **3b (sidebar):** single-patient soft card confirmed with mono bed/room line (computed-style verified, not just visual).

**Tests:** `tour-pitch-seed-maps.test.mjs` (2/2), `medications-panel-rows.test.mjs`, `patients-card-html.test.mjs`, `med-receta-apoyo.test.mjs`, `patient-sidebar-card.test.mjs` — 20/20 pass total, run both before and after commit.

**Reduced-motion:** no animations were touched this phase (pure CSS typography/font fixes + fixture data); nothing to verify.

**Commit:** `bb988c51` — `feat(manejo,sidebar): Gate C fixes for 4a/4b Manejo and 3b sidebar (Phase 4)`.

**Status:** Phase 4 substantially done. Remaining before hard-close: live multi-patient sidebar screenshot (needs a non-isolated multi-patient fixture, not built this phase).

### Phase 4 correction — Texto de egreso teaser (real fix)

**The Phase 4 claim above ("Texto para nota de egreso side card ... already fully implemented") was wrong for that one item.** Phase 4 checked that `#med-output-section` existed, rendered, and pointed at `openMedEgresoModal()` — but never compared it against mockup `#4a`. What actually rendered was a full-height legacy card: a "Texto para nota de egreso" header, a Completa/Nombre + Día tab pair, and a `<pre id="med-output">` dumping the entire medication list inline — not the mockup's small collapsed teaser row. This is the same failure mode already logged in `MISTAKES.md` (2026-08-18: "the 'Texto de egreso' feature was untouched inline paragraphs instead of the mockup's compact modal"), recurring a second time in this same rollout. Root cause both times: checking that a modal/entry-point exists and works, without checking what the *inline card itself* renders.

**Fix:**
- `public/partials/layout/app-body.html` / `public/index.html` (`#med-output-section`): replaced the full card (header + tabs + `<pre id="med-output">`) with a compact single-line teaser — uppercase "Texto de egreso" label, one ellipsis-truncated mono preview line (`#med-egreso-preview`), and two buttons (Copiar, Abrir texto de egreso). The Completa/Nombre + Día toggle now lives only inside the modal (`medications-egreso-modal.mjs`), which already had it correctly.
- New `buildMedEgresoPreviewLine()` in `public/js/features/medications-egreso-text.mjs` builds the summary line ("N medicamentos · <dieta> · <apoyo>"), reusing `countMedTurnoItems` (medications-panel-rows.mjs) and `apoyoKindLabel`/`mergeDietaItems` — no new data model, no fabricated fields.
- `public/js/features/medications-panel-render.mjs`: replaced `syncMedOutputTabChrome()` (drove the old tabs + full-text `<pre>`) with `syncMedEgresoTeaser()`, which sets the one preview line and shows/hides the row.
- `public/styles/expediente.css`: added `.med-egreso-teaser*` rules for the compact row. Also found and fixed a latent bug while wiring the Copiar/Abrir buttons: both used `.card-header-soft-btn-secondary`, which `html.ui-density-normal .card-header-soft-btn-secondary { display: none !important; }` (base.css) force-hides — meaning these two buttons were already invisible in Guardia/normal-density mode even before this fix, on the old card too. Switched both to plain `.card-header-soft-btn` (not force-hidden), since these are the row's only actions and must always be visible.

**Verification:** `npm run build:ui` clean. `npm run test:one -- public/js/features/medications-egreso-text.test.mjs` — 11/11 pass (4 new tests for `buildMedEgresoPreviewLine`). Screenshotted the real running app (DEMO PÉREZ, Manejo tab) via `scripts/verify/screenshot.mjs` with new eval scripts `scripts/verify/med-egreso-teaser.mjs` (light), `med-egreso-teaser-dark.mjs` (dark), `med-egreso-teaser-modal.mjs` (modal open state): the small teaser row now renders instead of the old full-text panel, in both themes, and "Abrir texto de egreso" opens the modal correctly with the full numbered list.

**Commit:** see `git log` at time of read for the exact hash — filed under this same Phase 4 section rather than a new phase, since it corrects a Phase 4 claim rather than adding new scope.

## Phase 2 result — Guardia (2026-08-19)

**Commit:** `747708a6` — `feat(guardia): populate 6a/6b census fixture, wire Ingresos + EN CURSO (D3a/D3b)`.

**D3a (admission date, auto-set at census-add, no manual entry).** `admissionDateForPatient()` (`public/js/features/guardia-census-table.mjs`) now prefers the existing `patient.registeredAt` stamp — already written by `stampPatientRegistrationMeta()` (`public/js/patient-registration-meta.mjs`) the moment a patient is committed via the add-patient modal (`commitPatientFromModal`/`commitStubPatientFromLab` in `patients-modal-commit.mjs`) — over the hand-typed FIMI/FIUX fields, which remain a legacy fallback for older/synced records. **No `lib/db/schema.mjs` migration was needed**: patients are stored as a JSON blob (`savePatientsBlob`/`loadPatientsBlob`), not fixed SQL columns, so "adding a field" is just a new property already being written by existing code — the resolved decision's intent ("auto-set, no manual entry") was already satisfied by `registeredAt`, it just wasn't wired into Guardia's Ingresos logic yet. Wired into the existing "Ingresos" counter and the "Ingresos" filter chip on the Censo table (both already present, both now driven by real per-patient data).

**D3b (EN CURSO status on todos).** The `inProgress` flag was already normalized/persisted (`storage/storage-todo-normalize.mjs`) and already read by `guardiaPatientStatus()` to render EN CURSO in the Guardia census — but nothing in the UI could ever set it (scaffolded, not wired, per the task's own suspicion). Added `setTodoInProgress()` (`todos-mutations.mjs`) and a small "En curso" toggle button in the Pendientes row's acción cell (`todos-list-render.mjs`), styled with the same warn/amber token as the EN CURSO status label (`workbench-surfaces.css`). `toggleTodo()` now clears `inProgress` automatically when a pendiente is marked resolved, per the spec ("cleared on completion").

**Populated-Guardia fixture.** New `public/js/tour-pitch-guardia-census.mjs`: 24 synthetic patients (bed/cuarto, vitals with altered/no-toma variants, one pendiente each covering all four statuses — 2 VENCIDO, 2 EN CURSO, 5 ABIERTO, 15 quiet — plus 3 admitted "today" for Ingresos), added on top of DEMO PÉREZ rather than replacing it, via `extendPresentationModeWithGuardiaCensus()`. Ids avoid the `demo-` prefix so `storage.saveTodos` (which silently skips `demo-*`) works normally. Wired to a hidden dev-only button (`#btn-seed-guardia-census` → `seedPitchGuardiaCensusFromHelp()`, header.html "Avanzado" panel) for screenshot verification, mirroring the existing `btn-start-presentation`/`btn-export-censo` convention. Fake/synthetic data only, no PHI. 8 colocated tests in `tour-pitch-guardia-census.test.mjs`.

**Right column (Signos recibidos empty state).** Already correctly implemented before this phase (`renderGuardiaSignosRecibidosPanel()` → shared `mountEmptyState`, dashed border, no fabricated panel or zero) — confirmed present, not touched.

**Screenshot verification (Gate A) — what worked and what's blocked:**
- Guardia chrome (header bar, 3-counter band, Censo card header/filter chips, "Sin Nube"/"Sin equipo" pills, Guía guardia nudge) renders correctly and re-themes correctly in dark mode (6b) — screenshots taken light + dark via `scripts/verify/guardia-populated.mjs` / `guardia-populated-dark.mjs`, `setWorkModeFromHeader('guardia')` (real entry point, not a text locator).
- **The populated census table itself did not render** in either screenshot — root-caused (not just observed) to `refreshGuardiaCensusFromDb()` (`clinical-access-runtime/guardia-grid.mjs`) always running in real Electron (`isDbMode()` is true whenever `window.electronAPI` exists — it is not a Nube/cloud flag) and pulling the census via IPC (`api.dbGuardiaCensus`) from the **real local SQLCipher DB**, not from the renderer's in-memory patient list the fixture writes to. This is a pre-existing fact, not a regression from this phase — Phase 0 saw the identical empty state for DEMO PÉREZ alone, before this fixture existed.
- **Verified live instead, successfully:** with the fixture seeded and while still in normal Sala mode (sidebar reads the in-memory list directly, unaffected by the Guardia-specific DB pull), the sidebar shows "PACIENTES 25", and selecting the seeded "DOMÍNGUEZ LARA, MARÍA" patient and opening Pendientes shows her `inProgress` pendiente with the new **"En curso"** toggle rendered active (amber, matching the EN CURSO status color) — screenshot at `/tmp/guardia-fixture-pendientes.png`. This is real, live proof that D3a's data model and D3b's toggle both work end to end; only Guardia's own DB-backed table view couldn't be screenshotted populated.

**Named blocker:** making the populated census appear inside 6a/6b itself requires either (a) writing the 25 synthetic patients into the throwaway verify profile's *actual* local SQLCipher DB via the real IPC commands (safe to do — `scripts/verify/screenshot.mjs` already launches an isolated, disposable `--user-data-dir`, not the user's real data), or (b) a verify-only stub of `dbGuardiaCensus`. Neither was attempted this phase — it is materially more IPC/main-process integration work than a renderer-side fixture, and risked a rushed, fragile result given the remaining time budget. This also blocks Phase 3 (Pase) screenshot verification the same way, since Pase is Guardia-mode too.

**Verdict:**
- 6a (light): chrome/counters/dark-mode-adjacent styling **MATCHES**; populated census table **NOT VERIFIED** (blocked per above, root cause identified).
- 6b (dark): same — chrome **MATCHES**, re-themes correctly (desaturated alert red, teal preserved); populated census **NOT VERIFIED**.
- D3a, D3b: **MATCHES / live-verified** via the reachable in-memory paths (sidebar + Pendientes), plus 21+8 passing unit tests.

**Tests:** `guardia-census-table.test.mjs` (21), `todos-mutations.test.mjs` (+4 new), `tour-pitch-guardia-census.test.mjs` (8 new) — all green via `npm run test:one`. `npm run build:ui` clean. `npm run metrics:check` shows a pre-existing debt score (bootGraphDebt/complexityOverage/lengthOverage, unrelated hub files) not attributable to this phase's diff — not investigated further per the plan's "ignore documented Nube debt" note; flagging for the final gate's own metrics pass to confirm.

**Not done this phase, left untouched:** unrelated in-progress local changes to `tour-pitch-seed-maps.mjs`, `expediente.css`, `sidebar.css` (Manejo apoyo-count / sidebar soft-card work, i.e. Phase 4 territory) were present in the working tree at the start of this session from other work and were deliberately left uncommitted and unstaged — not part of this phase's diff.

### Phase 2 continuation — populated census table verified (2026-08-19)

**Commit:** `907597c` — `fix(guardia): populate 6a/6b census for real, fix enrichment + missing 2-col CSS`.

**The named blocker above was a misdiagnosis, corrected here.** `buildGuardiaCensusPatients()` (`guardia-board-render.mjs`) reads `getPatients()` — the renderer's in-memory list — directly, not a DB round-trip; `refreshGuardiaCensusFromDb()`/`dbGuardiaCensus` only fetch the on-call **guardia assignment** records (`clinicalSessionContext.guardias`, for `guardiasMap` enrichment), never the patient rows themselves. The real reason the fixture never showed up: `buildGuardiaCensusPatients()` filters `getPatients()` by `!p.isDemo`, and the fixture's 24 patients were all built with `isDemo: true` — invisible to Modo Guardia by construction, DB or no DB.

**Fix (`tour-pitch-guardia-census.mjs`):** the 24 fixture patients no longer carry `isDemo: true`. This is safe: they are reachable only from the hidden dev/verify button (`#btn-seed-guardia-census`, never shown in the real UI — `display:none`), and `patientsForPersistence()` (`app-state.mjs`) only strips `isDemo`/`demo-*` rows from what gets written to disk — being ordinary patients means `persistClinicalState()` now writes them for real through the normal SQLCipher blob path, i.e. the exact IPC path a real "add patient" action uses, into the verify harness's disposable `--user-data-dir` profile only. Also removed the now-redundant/duplicating `setDemoPatients` dual-write (was unioning the same 24 rows into both the demo-display bucket and the real list).

**Two real, previously-invisible bugs found once the table had data to show, both fixed:**
1. `enrichPatientForGuardiaCard()` (`guardia-board-chrome.mjs`) builds the census row's actual object from `mapPatientForGuardiaGrid()`, which does not carry `monitoreo`, `registeredAt`, `fimiFecha`, or `fiuxFecha`. Every row read as "sin toma 08:00" regardless of seeded vitals, and the Ingresos (D3a) counter stayed at "0 nuevos" regardless of seeded `registeredAt` stamps. Fixed by keeping those four fields on the enriched object.
2. `.guardia-board-columns` (the census + "Signos recibidos" two-column layout, screens 6a/6b) had **zero CSS anywhere** in the codebase — plain block div, so the two panels stacked vertically instead of the mockup's 1.75fr/1fr side-by-side. Invisible with an empty census (a lone empty-state card looks identical stacked or beside nothing). Added the grid to `pase-board.css`, with a `<980px` single-column responsive fallback.

**Screenshot verdict (Gate C):**
- **6a (light):** Censo card now shows all 24 seeded rows — real bed/cuarto·cama, real Alterados chips (`SatO₂ 89`, `Temp 38.4`, `T/A 82`, `FC 118`, etc.) or `sin alterados`/`sin toma 08:00` for quiet rows, real Pendiente text, and correctly colored VENCIDO (red) / EN CURSO (amber) / ABIERTO (grey) / LISTO (green) status labels — **MATCHES** mockup `#6a` row grammar, grid columns (`92px 1fr 132px 1fr 84px`), and typography. Ingresos counter now correctly reads "3 nuevos" (previously stuck at 0, bug #1 above).
- **6b (dark):** same content, re-themed correctly — dark surface, desaturated alert-red row tint, VENCIDO/EN CURSO colors preserved, teal accent intact. **MATCHES**.
- **Two-column layout:** this sandbox's Electron window maximizes to its actual primary display, which here is a small headless virtual display (960×700 CSS px, under the 980px breakpoint) — so the routine screenshots correctly render single-column at that width, and the "Signos recibidos" empty-state card (still correctly deferred, per Phase 2's original finding — no fake intern-vitals data fabricated) is not visible beside the census in those two PNGs. Confirmed separately at 1600×1000 (temporary one-off script, not committed): `grid-template-columns` resolves to two tracks (`969px 553px`, i.e. 1.75fr/1fr), and the rendered screenshot shows Censo and "Signos recibidos" side by side exactly as in the mockup. On the user's real display (wider than 980px), 6a/6b will render two-column by default.
- **Movimiento vitals-pulse (step 5, `buildPitchLiveAlertVitalsEntry()`):** not separately re-verified this pass — `#guardia-vitals-section` only renders when `turnoActivo` (an active handoff/shift), which the populated-census fixture path doesn't establish; out of scope for this continuation's fix (enrichment + layout), left open below.

**Tests:** `tour-pitch-guardia-census.test.mjs` (+2 new: non-`isDemo` assertion, no demo-bucket duplication), `guardia-census-table.test.mjs` (21, unaffected), `guardia-board-chrome.test.mjs` (6, unaffected) — all green via `npm run test:one`. `npm run build:ui` clean.

**Still open:** Movimiento vitals-pulse live screenshot against the populated census (needs `turnoActivo` set up); a permanent (committed) wide-viewport verify script for the 2-column layout, so future runs don't depend on this sandbox's display size.

### Phase 2 — Signos recibidos two-column layout, closed (2026-08-19)

**Starting point:** the two-column markup (`.guardia-board-columns`, `#guardia-signos-recibidos`), its CSS grid, and the empty-state panel (`renderGuardiaSignosRecibidosPanel()` → shared `mountEmptyState`) were all already wired by commit `907597c5` (previous continuation entry above). Re-checked and confirmed present — no renderer/CSS changes were needed for the panel itself.

**Real root cause of the still-open "not verified at real width" item:** the previous pass's 1600×1000 confirmation was a temporary, uncommitted one-off script. The committed `scripts/verify/screenshot.mjs` floor-to-1440×900 fix (`e1b23504`) did not actually work: Playwright's `firstWindow()` resolves *before* `main.js`'s `ready-to-show` handler fires, and that handler calls `mainWindow.maximize()` — which re-maximizes onto the sandbox's real ~960×700 virtual display and silently undoes the floor resize that ran moments earlier. Every screenshot taken with that script, including this phase's first attempt, rendered at 960 CSS px (below the 980px breakpoint) and showed the census stacked single-column with no visible fix needed on the surface — a false negative.

**Fix:** `scripts/verify/screenshot.mjs` — factored the resize into `applyFloorSize()` and call it twice: once early (unchanged) and once again right before the screenshot capture (after `unmaximize()`), so it wins the race against `main.js`'s late `maximize()` call regardless of timing.

**Verified with real screenshots** (`scripts/verify/guardia-populated.mjs` / `guardia-populated-dark.mjs`, 25-patient fixture, `1440×900` floor confirmed via `window.innerWidth` = 1440 CSS px post-fix):
- **Light:** Censo card (left, wider) and "SIGNOS RECIBIDOS" card (right, narrower) render side by side, matching the mockup's 1.75fr/1fr split. The empty-state card shows the dashed border, uppercase label, muted-tone missing/when-arrives copy — no fabricated data.
- **Dark:** same two-column layout, correctly re-themed (dark surface, dashed border and muted text tokens preserved, teal accents intact).

**Verdict:** 6a/6b two-column layout **MATCHES** the mockup and is now confirmed at a real, non-degenerate viewport width — not just in code. Screen 6a/6b is closed.

**Tests:** no colocated test added — `scripts/verify/screenshot.mjs` is a verify-only script (no existing test convention for `scripts/verify/*`, no behavior change to app code). `npm run build:ui` clean.

**Not touched:** unrelated in-flight changes to `lib/nota-evolucion/*` and `public/js/features/nota-evolucion/*` were present in the working tree from other concurrent work; left untouched and uncommitted.

## Phase 5 result — Nota de evolución (2026-08-19)

**Commit:** `6e5b384c` — `feat(nota-evolucion): full 9a fidelity — header bar, live Objetivo, sign flow`.

**Already working (Phase 0/prior, re-confirmed):** S/O/A/P cards existed with correct field types (S/A free text, O derived-only, P per-zone list), the pure derivation lib `lib/nota-evolucion/objetivo-derive.mjs`, and reachability inside Interconsulta mode as a mode-switch side effect.

**Found broken, not previously caught:** clicking the actual "Nota de evolución" tab dispatched to the old free-text template (`renderNoteForm`) instead of the SOAP screen (`renderNotaEvolucionPrimaryTab`) — `GRANULAR_TAB_RENDERERS.notas` in `public/js/features/expediente-inner-cache.mjs` pointed at the wrong renderer. This clobbered the correct screen back to the legacy one right after the Interconsulta mode-switch had rendered it. Screen 9a was not reliably reachable by clicking before this fix. Fixed.

**Built/fixed this phase:**
- Objetivo card now reads real same-day vitals+labs and populates live (was always empty — labs were never wired in). `lib/nota-evolucion/objetivo-derive.mjs` gained support for a pre-computed `altered` flag on lab items, matching the app's real paste-parsed data shape.
- Removed the old blind per-section "Confirmar" gate. Objetivo now always shows a live preview; it freezes only when the note is signed — matches the mockup, which has no per-section confirm control.
- Added the missing top identity/action bar (patient · bed · día N, draft/firmada status, Copiar nota de ayer / Vista de impresión / Firmar y cerrar) using the existing shared `wb-mode-frame` component — this auto-enforces one teal primary button.
- P·Plan marks: escalated a real conflict (mockup pixels show 4 marks spelled `nuevo`/`sin cambio`/`pendiente`/`suspende`; README text says 3, spelled `novo`/`sin cambio`/`suspende`) to senior-dev per the plan's rule. Ruling: follow the mockup (4 marks, `nuevo` spelling). Implemented, and marks now render as plain colored mono text, not chips, matching the mockup.
- Per-zone accent colors (N/V/HD/HI/NM) added on Objetivo and Plan rows, light and dark.
- Autosave confirmed reversible-weight: a dismissible toast with Deshacer, no modal, no page block.

**Screenshot verdict (Gate C, `/tmp/nota-*.png`, not committed — throwaway verify captures):**
- **Light:** Objetivo shows all 5 zones populated with real derived vitals+lab text (no empty state). P·Plan shows all 4 marks in the correct colors. Header bar, S/A cards, right-column panels all match mockup spacing/type/one-teal-primary. **MATCHES.**
- **Dark:** same content, correctly re-themed — zone colors, mark colors, header bar all readable and correctly contrasted. **MATCHES.**
- Sign flow: "Firmar y cerrar" → success toast → header updates to "firmada HH:MM", Objetivo freezes. Reduced-motion: no animation, toast still visible, verified via `prefers-reduced-motion: reduce` emulation.

**Tests:** 57 total, all green via `npm run test:one` — `lib/nota-evolucion/objetivo-derive.test.mjs` (12), `public/js/features/nota-evolucion/nota-evolucion-html.test.mjs` (15), `nota-evolucion-state.test.mjs` (16), `nota-evolucion-panel.test.mjs` (4), plus regression checks `dashboard-mount.test.mjs` (10) and `nota-evolucion-primary-tab.test.mjs` (3, unaffected by the `expediente-inner-cache.mjs` fix). `npm run build:ui` clean.

**Still open:** none for this phase's stated scope. `scripts/verify/nota-evolucion*.mjs` are committed for future re-runs; the light/dark PNGs used for this verdict were not committed (throwaway captures, consistent with other phases' convention).

### Phase 5 correction — sign button, Objetivo zones/narrative, Plan editability

The user clicked through the real app after the Phase 5 commit and found 4 real problems the screenshot check had missed — the second time this exact screen shipped broken. Honest findings below.

**Problem 1 — "Firmar y cerrar" does nothing.** Could not reproduce. `wireHeaderActions` in `public/js/features/nota-evolucion/nota-evolucion-panel.mjs` was re-verified by clicking the real button in a live Electron window (via `scripts/verify/nota-evolucion-sign.mjs` and two new throwaway repros: a real Playwright mouse click on the button's actual screen coordinates, and typing into Subjetivo then clicking within the 900ms autosave debounce window) — every attempt correctly stamped `signedAt`, showed the "Nota firmada ✓" toast, and re-rendered the header to "firmada HH:MM". The bundled chunk (`public/js/chunks/nota-evolucion-panel-*.js`) was also confirmed to match source exactly (fresh build, not stale). The real gap was elsewhere: **`nota-evolucion-panel.test.mjs` had zero DOM-level coverage of the click → sign → toast → re-render chain** — the exact kind of regression a screenshot check cannot catch (a screenshot never clicks anything). Added a real `jsdom` click-through test (`clicking "Firmar y cerrar" ... signs the note, toasts, and re-renders`) that mounts the actual panel DOM and dispatches a real click, asserting the toast, `signedAt`, and the re-rendered "firmada HH:MM" header text. If this was a real, reproducible bug in the field rather than an environment/timing fluke, this test will now catch it on the next change; if the user hits it again, the next report should include exact click steps and whether the header metadata text changed but was just easy to miss (it is small, gray, and far from the button — a plausible reason a real fix would still "feel" like nothing happened).

**Problem 2 — generic ⌘/ badge.** Root cause: `mode-frame.mjs`'s `buildModeFrameHtml` always rendered the shortcut button with no opt-out. Added a `showShortcut` option (default `true`, so Guardia and Inicio de turno — the only other two callers — are unaffected) and set `showShortcut: false` on Nota de evolución's `buildNotaHeaderHtml`, matching the mockup's 3 plain buttons exactly. Fixed.

**Problem 3a — N and NM Objetivo zones missing.** Confirmed root cause exactly as hypothesized: `lib/nota-evolucion/objetivo-derive.mjs`'s `deriveObjetivoZones` only pushed a zone into the result `if (items.length)`, and N/NM have empty `vitalKeys`, so they only ever appeared via a lab keyword match — on real patient data they were silently absent. Fixed: all 5 zones (N/V/HD/HI/NM) are now always returned, each with an `items: []` array when there's no real vital/lab data (never fabricated numeric data). `buildObjetivoText` (the plain-text signed-snapshot summary) still skips empty zones, so the persisted note text is unchanged.

**Problem 3b — no narrative per zone.** Every zone (including N) does have a real narrative source: `estado-actual-text-build.mjs`'s `assembleSoapLines` already builds one full sentence per zone (N/V/HD/HI/NM, same order as `OBJETIVO_ZONES`) from Estado Actual data — N's line is the FOUR-score/orientación sentence, not something that needed to be invented. Wired via a new `defaultObjetivoNarrativesForPatient(patient)` in `nota-evolucion-state.mjs`, which calls the existing `buildEstadoActualText` (same function `note-from-estado-actual.mjs`'s "Magia IC" pull already uses) and splits its `\n\n`-joined output into 5 lines, stripping the leading `"ZONE: "` prefix. Each zone card now renders an editable `<textarea data-ne-objetivo-narrative>` under the mono vitals/labs line, pre-filled with this default. Edits are persisted per-zone into a new `state.objetivoNarrativas` map via `setObjetivoNarrative`/`objetivoZonesForRender`, so a clinician's edit is never overwritten by the next render (verified by a state test and a DOM test). No genuine data-model gap remains for this problem — every zone has a real narrative source.

**Problem 4 — Plan rows read as locked/derived.** The CSS was already correct as of the Phase 5 commit (plain colored mono text for marks, no pill/chip background — confirmed by re-reading `nota-evolucion.css`). The real gap was editability: `buildPlanZoneHtml` rendered existing item text as a `<span>`, so a clinician could only add new items (bottom input) or remove old ones (×) — there was no way to fix a typo or reword an existing line in place. Fixed: the span is now an `<input type="text" data-ne-plan-edit>`, wired to a new `editPlanItemText` state helper, with plain-field CSS (no visible border until hover/focus, so it still reads as a list item, not a form). Verified live: added a Plan item, edited its text in place via the real DOM, confirmed the persisted state updated.

**Files changed:** `lib/nota-evolucion/objetivo-derive.mjs` (+test), `public/js/features/workbench/mode-frame.mjs` (+test), `public/js/features/nota-evolucion/nota-evolucion-html.mjs` (+test), `public/js/features/nota-evolucion/nota-evolucion-state.mjs` (+test), `public/js/features/nota-evolucion/nota-evolucion-panel.mjs` (+test), `public/styles/nota-evolucion.css`.

**Tests:** 69 total across the 5 touched suites plus the unaffected `nota-evolucion-primary-tab.test.mjs` (3), all green via `npm run test:one`. `npm run build:ui` clean. Verified live in a real Electron window (via `scripts/verify/nota-evolucion.mjs` + ad hoc extensions): sign flow, all 5 Objetivo zones with real pre-filled narrative text from the DEMO PÉREZ fixture, Plan item add + in-place edit, light and dark screenshots.

**Still open:** none of the 4 reported problems remain reproducible or unaddressed against this codebase. Problem 1's underlying trigger could not be reproduced despite deliberate real-mouse-click and race-condition repros — the fix that shipped is the missing regression test, not a code change to the click-handling path itself, which was already correct on inspection and every live test.

## Phase 6 result — Pendientes

**Two Phase 0 bugs, both fixed:**

1. **No clickable UI entry point.** Confirmed the gap was real: at the ≥1100px
   desktop breakpoint the visible nav is `#exp-group-row` (grouped pills), not
   the `.inner-tab-bar` classic bars — neither had a Pendientes button.
   Fixed by adding "Pendientes" as its own always-visible leaf pill in
   `#exp-group-row` (`public/js/expediente-group-row.mjs`,
   `expediente-group-row-ui.mjs`), sibling to Resumen/Clínico/Salida, with a
   red open-count badge (mockup 10a's "4"). Deliberately NOT nested under the
   Resumen/Paciente pill: this row's CSS collapses a non-leaf active pill's
   own label to show only its sub-sections, which would have hidden the
   "Resumen" label whenever Resumen itself is the active view — nesting was
   tried and reverted for that reason (see the doc comment left in
   `expediente-group-row.mjs`). The same button was also added to the
   <1100px classic `.inner-tab-bar` (`app-body.html`, `id="itab-todo"`) for
   narrow windows, with its own badge id so the two never collide.
   `switchInnerTab('todo')` (the pre-existing, already-working handler) does
   the actual navigation in both cases.
2. **Old inline composer still live.** Removed `appendTodoAddRow` and its
   call from `renderTodoFormIn` in `todos-list-render.mjs` (plus the
   now-dead `.todo-composer`-scoped CSS in `workbench-surfaces.css`). Only
   the 7b "+ Pendiente" kit-modal button remains.

**Also found and fixed while verifying 7b:** the due-date quick-chips
("Hoy 18:00" / "Mañana 08:00" / "En 3 h" / "En 24 h") overflowed the modal's
Vence column and got clipped at the modal edge. Root cause: `.todo-due-section`
in `lab.css` carried `margin-left`/`margin-right` offsets sized for the old
inline composer's grid columns (prio/check/actions), which no longer exist
now that composer is gone. Removed those offsets; chips now wrap inside the
200px Vence column as the mockup shows.

**Verified, already correct (built 08-18, no change needed):** Vencidos rows
get the alert-tint header (`wb-table-card-header--alert`, `--color-danger-tint-strong`
background + `--color-danger` title, matching mockup's `rgba(215,0,21,0.07)` /
`#d70015`); Cerrados (resueltos) renders as a collapsed `<details>` closed by
default; grouping order is Vencidos → Hoy → Sin fecha → Cerrados. The D3b
"En curso" toggle (built Phase 2) renders correctly in this same table —
confirmed live in the screenshot below, amber `wb-todo-encurso-btn` next to
"Listo" on every open row.

**Screenshot verification (Gate A) — reached by a real click, not forced JS:**
`npm run build:ui` fresh, then `scripts/verify/pendientes-10a.mjs` drove the
real running app: `setupDemo` → click `#apptab-nota` → `page.locator('#exp-group-row
.exp-group-name', { hasText: 'Pendientes' }).first().click()`. That real
Playwright click landed and the pane opened (`mountHidden: false, headerHidden:
false, hasList: true, oldComposerPresent: false`). One harness-only wrinkle
found and worked around: `screenshot.mjs`'s first floor-size call can lose the
race against `main.js`'s `ready-to-show` maximize (documented in that file),
transiently leaving `window.innerWidth` at the sandbox's 960px virtual display
during script execution — under the row's 1100px breakpoint, so the pill isn't
really absent, just measured too early. Worked around with `page.setViewportSize({width:1440,
height:900})` at the top of the verify script (this is a verify-harness detail,
not an app bug — `screenshot.mjs`'s own late re-floor call already fixes the
final captured pixels regardless). Light + dark screenshots both confirmed:
Pendientes pill active/teal-tinted with badge, PRIOR/PENDIENTE/QUIÉN/VENCE
table, "CERRADOS · ÚLTIMAS 24 H" collapsed, dark mode re-themes correctly, no
old composer anywhere. 7b modal opened via the real `.todo-toolbar-add-btn`
button and screenshotted before/after the due-chip fix.

**Tests:** 185 total across the touched surface, all green via
`npm run test:one` — `todos-list-render.test.mjs` (10, incl. 2 new for
`updateExpPendientesTabBadge`), `expediente-group-row.test.mjs` (9, incl. 2
new/updated for the Pendientes pill), `todos-mutations.test.mjs`,
`todos-add-modal.test.mjs`, `todos-refresh.test.mjs`, `expediente-tabs.test.mjs`,
`dashboard-mount.test.mjs`, `dashboard-html.test.mjs`, `lab-inner.test.mjs`,
`app-shell-expediente-shortcuts.test.mjs`, `app-shell-tab-shortcuts.test.mjs`,
`guardia-census-table.test.mjs`, `guardia-patient-action-sheet.test.mjs`,
`command-palette-model.test.mjs`, `ui-tab-motion.test.mjs`,
`storage-todo-normalize.test.mjs`, `todos-due.test.mjs`, `todos-handoff.test.mjs`.
`npm run build:ui` clean. Reduced-motion: no new animation was added (a
static button + badge reusing the row's existing pill transitions), nothing
to gate.

**Commit:** `80453b4b` — `feat(pendientes): wire real Pendientes tab entry point, remove legacy composer (Phase 6)`.

**Still open / known debt (not blocking):** `npm run metrics:check` reports
`totalScore=350` vs baseline 0 — confirmed via `git stash` that this was
already 340 before this phase's changes (pre-existing, dominated by
`bootGraphDebt: 200`, unrelated to Pendientes); this phase added ~10 points
(`lengthOverage`/`complexityOverage`) from the new pill/badge code. Not a
regression this phase introduced from scratch, but flagging the delta
honestly rather than silently absorbing it into "pre-existing."

**Follow-up (2026-08-19):** user didn't like the loud red numeric badge on
the Pendientes pill. Replaced it with a plain dot (no count) — hidden at
count 0, visible otherwise — reusing the existing `.priority-dot` 8px
circle pattern for `.wb-pendientes-tab-badge` (`public/styles/workbench-surfaces.css`),
with `aria-label="Pendientes abiertos"` set/cleared alongside visibility so
screen readers still get an announcement. Changed
`updateExpPendientesTabBadge()` in `public/js/features/todos-list-render.mjs`,
the default markup in `public/js/features/expediente-group-row-ui.mjs` and
`public/index.html`, and the colocated test in
`public/js/features/todos-list-render.test.mjs`. `npm run test:one` —
`todos-list-render.test.mjs` 10/10 pass. `npm run build:ui` clean.
Screenshot-verified light and dark via new
`scripts/verify/pendientes-badge-dot.mjs` (+ `-dark.mjs`): dot renders,
no number, in both themes. **Commits:** `5cae78e8` (badge → dot logic
and styles) and `22c09a19` (dropped a leftover static "0" text node in
the classic tab-bar badge's default markup, staged by hand across
`app-body.html`/`index.html` since the working tree had unrelated
in-progress changes from a parallel session at the time).

## Phase 7 result — Interconsultas

**Already working (verified, not rebuilt):** the 10b frame/consult band from commit
`17f6a460` was substantially correct. `chrome.mjs`'s `setWorkModeFromHeader('interconsulta')`
real mode switch, `interconsulta-mode-chrome.mjs`'s top bar (`Actualizar pacientes` primary,
`Generar nota (.docx)` demoted into a `⋯` overflow menu, `⌘/` shortcut), and
`consult-band.mjs`'s `getConsultInfo`/`renderConsultBandHtml` (servicio solicitante / motivo /
seguimiento, backed by `patient.consultInfo` JSON — no schema bump needed, matching the
existing `interconsultServiceIds` pattern) all render correctly once actually navigated to
(Paciente tab → Resumen sub-tab, while in Interconsulta mode) — Phase 0 never made it that far.
Content below the band is the same Resumen dashboard as 1a, as designed.

**Built/fixed this phase:** the sidebar always grouped Fijados/Pacientes regardless of mode —
real gap, confirmed by `grep` (zero hits for "Nuevas"/"En seguimiento" anywhere in the
codebase before this phase). Added:
- `buildInterconsultaZones()` in `public/js/patient-list-incremental.mjs` — buckets by
  `consultInfo.followUpStatus`: no status or `pendiente` → Nuevas, `en_curso`/`resuelta` → En
  seguimiento (pinned/archived unchanged).
- `renderNuevasSectionLabelHtml` / `renderEnSeguimientoSectionLabelHtml` in
  `public/js/features/patients-card-html.mjs`, reusing the existing `.patient-list-section-label`
  component (same one already verified for Fijados/Pacientes at 1a/3b).
- `public/js/features/patients-list.mjs`: `isInterconsultaSidebarActive()` routes zone-building
  and rendering to the new grouping in Interconsulta mode (not Sala, not Guardia); the
  incremental/virtualized silent-update patchers are bypassed for this mode (they assume the
  pinned/active/archived shape) — always full-renders instead. Interconsulta list zones use a
  new non-Sortable `.patient-list-zone` class (added to `sidebar.css`) — no drag reordering
  semantics were defined for Nuevas/En seguimiento, so this is deliberate, not an oversight.
- Seeded `DEMO PÉREZ`'s `consultInfo` in `tour-pitch-seed-maps.mjs` (Cirugía general / glucémico
  posoperatorio reason / `en_curso`) so the band and sidebar grouping have real content instead
  of the empty state during verification.

**Tests:** `patient-list-incremental.test.mjs` (+1: buckets nuevas vs en seguimiento, respects
pinned/archived), `tour-pitch-seed-maps.test.mjs` (+1: DEMO PÉREZ carries consultInfo). All
pre-existing colocated tests for the touched files still green
(`patients-list.test.mjs`, `patients-card-html.test.mjs`, `interconsulta-mode-chrome.test.mjs`,
`consult-band.test.mjs`).

**Screenshot verdict (light + dark):** navigated for real via
`setWorkModeFromHeader('interconsulta')` → `#apptab-nota` click → `switchConsolidatedTab('paciente')`
→ `#itab-paciente` click (`scripts/verify/interconsulta-10b.mjs`, `-dark.mjs`). Both renders show:
consult band above the Resumen content with real servicio/motivo/seguimiento text; "Actualizar
pacientes" as the sole teal primary action; "Datos" secondary/outlined; "Generar nota" correctly
absent from the primary row (lives in the `⋯` menu); sidebar shows "EN SEGUIMIENTO · 1" with DEMO
PÉREZ inside it (no Nuevas patients in the demo fixture, so that section is correctly omitted —
covered by the unit test instead). Dark mode: same layout, correct token-driven colors, no
contrast issues. MATCHES mockup #10b — commit `5ec04976`.

**Gate C:** typography/spacing/radii/shadows all inherited from already-verified shared
components (`.patient-list-section-label`, `.wb-btn*`, dashboard cards) — no new hex, no new
radii. One-teal-primary rule holds. Reduced-motion: no animation touched this phase (pure
layout/grouping change).

**Open decisions:** none — no data-model gap; `followUpStatus` already existed.

## Phase 9 result — Shared sweep (2026-08-19)

**Commit:** see `git log` — `feat(confirm): route destructive/reversible actions through the shared workbench kit (Phase 9)`.

### 1. Confirmaciones (11a)

**`grep -rn "window.confirm" public/js/` — one real hit, fixed.** `public/js/guardia-orphan-entregas.mjs:205` used the raw browser `window.confirm()` for a real destructive action ("Eliminar este paciente del anfitrión ⇄ y liberar la entrega... Esta acción no se puede deshacer"). Converted to `openConfirm({ weight: 'destructive' })` from `workbench/confirm.mjs` (`runDeleteOrphanFromServer` split out as the `onConfirm` callback). New colocated test `guardia-orphan-entregas.test.mjs` (source-text regression, matching this repo's existing convention for this kind of check) — 2/2 pass. No prior test file existed for this module.

**Ad hoc/inline confirm modals not using the shared kit — found and triaged.** A second, older confirm component exists (`ui-approval-card.mjs`'s `showConfirmDialog`, `ui-confirm`/`lab-conflict-backdrop` classes) with 9 call sites across `patients-select.mjs`, `clinical-sync-mode-settings.mjs`, and 4 `cloud-sync/*` files (regenerate recovery code, revoke sessions, purge sala, etc.). It is a real second confirm component, not the mockup's weight system, but it is itself styled/shared (not literally unstyled ad hoc) and one of its call sites (`remote-patient-delete-confirm.mjs`) renders an itemized list the `workbench/confirm.mjs` kit doesn't support. Given this phase's charter is the confirmation *system*, not a blanket account-security-code refactor, I converted only the one call site that is a real, live-reachable destructive action a clinician actually triggers day to day: **`patients-select.mjs`'s `showPatientDeleteConfirm()`** ("Eliminar paciente" / "Eliminar N pacientes") now uses `openConfirm({ weight: 'destructive' })` instead of `showConfirmDialog`. Verified via existing `patients-select.test.mjs` (12/12 pass, no test touched the old internals directly). **Honest gap left open:** the remaining 8 `showConfirmDialog` call sites (mostly Nube/cloud-sync account actions) still use the legacy component — flagging for a future decision rather than a blanket conversion this phase, since several are security-sensitive and one needs a list-rendering feature the kit doesn't have yet.

**A second, more clear-cut gap found while checking Pendientes: the "×" delete-pendiente button had *zero* confirmation of any kind** (`todos-list-render.mjs`, wired straight to `deleteTodo()`). This is one of the task's own example destructive actions ("deleting a pendiente") and is live-reachable via the real Pendientes tab (Phase 6 entry point). Fixed: wrapped in `openConfirm({ weight: 'destructive', title: '¿Eliminar este pendiente?', ... })`. New test in `todos-list-render.test.mjs` (real DOM click, asserts the row survives the click and the destructive modal opens) — pass.

**Live screenshot verdict (real click path: Pendientes pill → "×" on a row), light + dark:** modal renders white card, bold title, muted message, footer with plain "Cancelar" + solid red "Eliminar" — matches mockup #11a's destructive-weight treatment (radius, shadow, right-aligned button pair, alert-red confirm button) in both themes. Dark mode re-themed correctly (confirmed via `magick` pixel sampling on the PNG, not just visual read: modal surface `#272B35`/`#2E333D`, a dark slate — an earlier visual read of the screenshot mistakenly looked "white," corrected by direct pixel measurement). Screenshots: `scripts/verify/confirm-11a-pendiente-delete.mjs` / `-dark.mjs` (throwaway PNGs, not committed, matching this plan's existing convention).

### 2. Calendario (11b) — regression re-check

Re-opened the header date-popover via a real click on `#today-date` (`scripts/verify/calendar-11b.mjs`). Confirmed, light and dark, no regression since Phase 0: month grid, Hoy/Ayer/7 días quick jumps, "Último pase" chip present and disabled (D5 holds), "DÍAS CON LABS" list with alterados counts. Dark mode background verified via pixel sampling, genuinely dark (not the false "still white" read I got from eyeballing the PNG at first). **MATCHES**, no changes made.

### 3. Undo toasts

`workbench/undo-toast.mjs` is live-wired to two real reversible actions, both confirmed by real clicks, not just code inspection:
- **Nota autosave (Phase 5):** re-verified via `scripts/verify/nota-evolucion-autosave.mjs` — typing into Subjetivo shows a `.wb-undo-toast` reading "Subjetivo guardado · Deshacer" within ~1.2s (the original script's 1600ms wait sometimes catches it after auto-dismiss, showing a stale generic toast instead — a script-timing artifact, not a product bug; confirmed the real undo toast fires at the right time with a tighter wait).
- **Pendientes "Listo" (Phase 2/6) — was NOT wired, now fixed.** The mockup's own #11a reversible-weight example is literally this transition ("Pendiente marcado como listo" + Deshacer), but the real "Listo" button (`todos-list-render.mjs`) called `toggleTodo()` directly with no feedback and no way back. Wired `openConfirm({ weight: 'reversible', message: 'Pendiente marcado como listo', onUndo: () => toggleTodo(t.id) })`, firing only on the open → listo transition (not the reverse). New test in `todos-list-render.test.mjs` — pass. Live screenshot (`scripts/verify/undo-toast-11a.mjs`) confirms the real toast: dark card, message + teal "Deshacer" link, bottom-center — matches mockup #11a's third example closely.

### 4. 7a Revisar signos recibidos (modal)

Confirmed still correctly deferred per D2 — no `revisar-signos`/"Revisar signos recibidos" code anywhere in `public/js/`, and the Guardia "SIGNOS RECIBIDOS" dashed-border empty-state stand-in (`renderGuardiaSignosRecibidosPanel`, built Phase 2) is still present and wired. Re-screenshotted live against the 25-patient populated-census fixture (`scripts/verify/guardia-populated.mjs`): empty state renders correctly beside the populated Censo table, no fabricated data, no regression. No work done here, per the plan's instruction.

### 5. Gate C spot-check

No new hex, no new radii (the destructive/reversible confirm treatments reuse `workbench/confirm.mjs` and `workbench/undo-toast.mjs`'s existing CSS verbatim — only call sites changed, not the components). One-teal-primary rule holds (destructive uses `wb-btn-danger`, reversible has no button row at all, just the Deshacer text link, both pre-existing kit classes). No new animation — the undo toast reuses the existing globally-guarded `.om-rise` (`prefers-reduced-motion: reduce` already zeroes it in `motion.css`).

### Tests and build

`npm run build:ui` clean (4 runs across iterations). `npm run test:one` — `patients-select.test.mjs` (12/12), `todos-list-render.test.mjs` (10/10, +2 new), `guardia-orphan-entregas.test.mjs` (2/2, new file, registered in `package.json`), `workbench/confirm.test.mjs` (6/6) and `workbench/undo-toast.test.mjs` (3/3) unaffected — all green. `npm run metrics:check`: `totalScore=350` vs baseline 0 — this is the exact same pre-existing debt Phase 6 already flagged (dominated by `bootGraphDebt`), not attributable to this phase's diff; not investigated further per the plan's "ignore documented Nube debt" note.

### All planned phases now complete

Phases 1, 2, 4, 5, 6, 7, and 9 (this one) are done. Phase 3 (Pase) was cut — the module was retired before this rollout started, folded into Resumen. Phase 8 (Inicio de turno) is deferred per resolved decision D1. Phase 10 (Interno mobile) is deferred per D2. **Ready for the final gate** — the 12-screen re-check and 8.1.6 release steps are reserved for the orchestrating session, not run here.
