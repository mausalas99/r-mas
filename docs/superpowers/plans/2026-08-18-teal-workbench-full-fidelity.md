# Plan — Teal Workbench 1:1 fidelity (full UI overhaul, phases 2+)

## REMEDIATION — 2026-08-18, after user visual review

Phases 0-10 were marked "Done" on unit tests + clean build alone. Nobody opened the running app next to the mockup. The user did, and found real mismatches. See `MISTAKES.md` 2026-08-18 entry for the full accountability writeup.

**New rule, effective immediately: no phase/screen is Done until a screenshot of the actual running app is taken and compared directly against `Paciente Rediseño.dc.html`, by the orchestrating session itself — not inferred from a subagent's self-report, not "it uses the right CSS variables so it must be right." If a subagent's own report names something as unfinished or not-yet-wired, that is a required follow-up, not a footnote.**

Punch list (worst-first), confirmed broken by the user's own side-by-side screenshots:

0. **DEMO PÉREZ stale fixture — FIXED 2026-08-18.** Root cause: lab entry dates in `tour-pitch-labs.mjs` / `tour-pitch-cultivos-some.mjs` were hardcoded to May 2026, so the "hoy" filter in `labs-glance-model.mjs` never matched real "today" — Resumen's Labs card and the Laboratorio tab always showed empty/wrong-day data regardless of any other fix. Changed both files to compute `fecha` from a `dayOffset` relative to "today", same pattern `tour-pitch-monitoreo.mjs` already used for vitals. Verified via `scripts/verify/screenshot.mjs`: both screens now show real, correctly-dated lab data. (The files named in the original task brief, `pitch-demo-export-perez.mjs`/`-data.mjs`, are a separate JSON-export path unrelated to what "Modo presentación" actually seeds — patched their call site too for consistency, but the real fix is in the seed files above.)
1. ~~**Nota de evolución** — the new Phase 8 derived-Objetivo screen was wired in as a secondary hidden "Nota SOAP" button.~~ **User clarified 2026-08-18: Nota de evolución is only visible in Modo interconsultas, by design. Not a bug — dropped.**
2. **Laboratorio — FIXED 2026-08-18.** Card header now reads "RESULTADOS · N ALTERADOS DE M" with a bordered Día-nav pill and Copiar button (`lab-results-card.mjs`, new); rows restyled as label + wrapped mono-value grid (`labs-display.mjs`), altered values bold red with trend arrows. Trend-arrow data source question (from the plan) was already resolved in the code via parsed-day-snapshots (`diagrams-parse.mjs`), no senior-dev call needed. Verified by screenshot 2026-08-18: BH/QS/ESC rows show e.g. `Hb 10.2↓`, `Glu 108↑`, correctly bolded/arrowed. Did not touch `lab-panel-output-helpers.mjs` (kept clear for the Movimiento item). Open: hour-group split-header only verified by unit test, no real multi-draw-per-day fixture existed to screenshot.
3. **Pendientes — FIXED 2026-08-18.** Rewrote to a PRIOR / PENDIENTE / QUIÉN / VENCE table via `workbench/wb-table.mjs`, groups VENCIDOS/HOY/SIN FECHA/CERRADOS (`todos-due.mjs`, `todos-list-render.mjs`). Blocking bug fixed: in Electron/DB mode, `storage.getTodos()` reads an in-memory `_blobCache` that `tour-pitch-demo-todos.mjs`'s `seedPitchDemoTodos()` never touched (it wrote to localStorage only) — Modo presentación's Pendientes tab always rendered "Sin pendientes" once a DB session was unlocked, in every session before this one. Fixed by mirroring the write into the live blob cache (`getBlobCache()`/`invalidateParsed()`) without persisting demo rows to the real DB. New test covers the blob-cache path; 42/42 tests pass, build clean. Verified by screenshot 2026-08-18: Resumen's Pendientes panel shows real items, and the Pendientes tab (via the Resumen card's "Pendientes" action → `switchDashInner('todo')`) renders the grouped table — "SIN FECHA · 5" with PRIOR./PENDIENTE/QUIÉN/VENCE columns and correct priority labels (ALTA/MEDIA/BAJA). Known cosmetic gap, not blocking: the old inline "Nuevo pendiente…" composer row still sits above the table; mockup only shows a "+ Pendiente" button opening the 7b modal — left for its own future pass.
4. ~~**"Texto de egreso" (Manejo)**~~ **Superseded — user asked for it back; see item 19 below (built as a real modal, FIXED and screenshot-verified 2026-08-18).**
5. **Calendario popover — FIXED 2026-08-18.** Wired `openHeaderDatePopoverFromChrome()` (`public/js/features/chrome.mjs`) to `#today-date`; added "Días con labs" quick-nav (`header-date-popover-model.mjs`) inside the same popover, click switches to Laboratorio and jumps to that day. Old bulk-update modal left untouched, as instructed. Verified by screenshot 2026-08-18: popover opens from header date, shows calendar grid, Hoy/Ayer/7 días chips ("Último pase" stays disabled — no `lastPaseDate` concept in the codebase, unscoped follow-up), and real per-day altered counts. 40/40 tests pass, build clean.
6. **Pase gaps — FIXED 2026-08-18.** Manejo now groups by zone (HI/HD/NM/V/N + Otro) via a keyword classifier (`med-pase-zone.mjs`); added Eventualidades panel (last 12h); Cultivos was already present, unchanged. Board order: Alterados → Pendientes+Eventualidades → Manejo(zoned)+Cultivos → Agenda → labs. Also fixed a real crash: entering Pase mode caused infinite recursion in `lab-some-tables-modal.mjs`'s close handler — fixed with a reentrancy guard. Verified by screenshot 2026-08-18: mode frame "PASE · SERVICIO DEMO · 1 de 1 · HH:MM", one teal primary, all panels render. Zone classifier is a keyword heuristic, not stored data — flagged as a future real-data gap if zone matters clinically.
7b. **Inicio de turno (12a, Phase 10)** — DEFERRED 2026-08-18 by user request. Not started, not assigned, do not pick up without new explicit direction.
7. **Movimiento (11c) — PARTIALLY VERIFIED 2026-08-18.** Three states: (1) labs-loading skeleton — already correct pre-existing code, no change needed. (2) single-pulse on new out-of-range vital, no self-reordering — fixed in `guardia-vitals-feed.mjs` (order now commits across renders, only reshuffles on explicit "N nuevos" tap; reused existing unused `value-alert-pulse` CSS). NOT screenshot-verified — needs a live Guardia turno with real-time vitals arriving, too complex to stage headlessly this session. (3) "Actualizar pacientes" inline progress, no relayout — fixed in `lab-repo-batch-import.mjs` (spinner + Detener toggle via CSS class, never `hidden`). VERIFIED by screenshot: queue panel shows spinner active, Detener enabled in place, Cerrar doesn't shift, job rows show Listo/Actualizando/Pendiente correctly. 24/24 tests pass, build clean. Item stays open until (2) gets a real screenshot.

## REMEDIATION ROUND 2 — 2026-08-18, real-window feedback

The items above were verified via `scripts/verify/screenshot.mjs`'s off-screen headless window. The user then looked at the actual on-screen running app at normal desktop size and found several things the headless verification missed or that are new:

8. **Guardia counters band not stretching — FIXED 2026-08-18.** Big empty gap between the counters band and the "Censo" toggle at normal window width. Root cause was a stray extra `}` in `public/styles/workbench-kit.css` (line ~1000) — the flex CSS was actually already correct (`flex:1 1 auto` on `.wb-counters-band` and each `.wb-counter-cell`). Removed the stray brace. Verified by screenshot: band now fills the row.
9. **Pase board too tall — FIXED 2026-08-18.** Real rules were in `public/styles/layout.css`, not `pase-board.css`. Cut section/card padding and gaps roughly in half; fixed a CSS grid auto-fill bug where lone empty-state cards shrank to one narrow track instead of filling the row; capped Cultivos to 2 visible entries + "+N más" link (was showing all 8 stacked). Verified by screenshot at full-screen resolution: patient header → Fuera de rango → Pendientes/Eventualidades → Manejo/Cultivos all fit in one view; only Agenda/Labs (documented lower priority) need scroll. Files: `pase-board-render.mjs`, `layout.css`.
10. **Resumen Labs card — RETRY, FIXED 2026-08-18.** The first fix (flex-row wrap) only addressed whole-group wrapping, not the real user complaint: cells inside a group were a flat unbordered block, not individual bordered cells. Rebuilt per exact mockup markup (lines 3021-3064): `.draw` is now a bordered card with a red-tinted header ("LABS FUERA DE RANGO · N DE M" + cutoff-time caption), body is a CSS grid with 1px gaps creating visible cell borders, each cell showing label/big-mono-value/delta (3 lines — a mockup 4th "interpretive note" line was skipped, no data field for it exists, not fabricated). Verified by screenshot 2026-08-18 (click patient card first, then Paciente tab — the known render-trigger quirk): card renders exactly as designed, "LABS FUERA DE RANGO · 7 DE 7", 7 bordered cells with real Hb/Hto/Glu/Cr/BUN/Na/K values. 18/18 + 19/19 tests pass, build clean.
11. **Tendencias tab doesn't scroll — DOES NOT REPRODUCE, closed.** `#itab-content-tend` has `overflow-y:auto`, `scrollHeight` (1645) > `clientHeight` (492), and a synthetic wheel event moves `scrollTop` correctly. No blocking handler found. No code change.
12. **Laboratorio top "Pegar SOME/Procesar" card — ALREADY CORRECT, closed.** The `<details>` element has no `open` attribute, so it's collapsed by default once data exists (confirmed by screenshot 2026-08-18, "RESULTADOS · 7 ALTERADOS DE 24" gets full room below it). No change needed.
13. **Cultivos "duplication" — NOT A BUG, closed.** Rows that looked duplicated are real polymicrobial samples (same date/site, different organisms — e.g. Acinetobacter + E. coli same draw). No identical rows found in real DEMO PÉREZ data.
14. **Movimiento — RETRY, FIXED 2026-08-18.** First three attempts at this item all fixed the wrong UI (a small "COLA LABS" corner widget with a per-patient job list) because nobody read the mockup markup carefully — the mockup's 11c section is a motion-pattern spec, not that widget. Corrected after re-reading the exact mockup lines 333-391: (1) "Cargando labs" — new `buildLabChemistrySkeletonHtml()` renders a real K/Cr/BUN/Hb 4-column shimmer grid inline in the modal during single-patient fetch (`ui-skeleton.mjs`, new function — did not touch the unrelated existing whole-tab skeleton). (2) "Llegó un signo fuera de rango" — confirmed already correct from item 7, untouched. (3) "Actualizando pacientes" — ripped out the per-patient list entirely; sidebar dock now shows exactly one fixed-size teal spinner button + one thin progress bar + one mono "N de M" caption, matching the mockup's button+bar+caption pattern. Verified by screenshot 2026-08-18 mid-run: modal shows the K/Cr/BUN/Hb shimmer grid, sidebar dock shows the button/bar/caption with no per-row list. Tests pass, build clean.
15. **Nota de evolución looks unfinished — FIXED 2026-08-18.** Root cause: the S/O/A/P redesign code was already correct in source, but `npm run build:ui` had never been run since those edits — the shipped chunk was stale. Ran the build; also fixed a `@container`-query gap (screen embeds at under 600px even on a 960px-min desktop window, but the old breakpoint was viewport-based and never fired there) and a Confirmar-button/label overlap at narrow widths. Verified by screenshot 2026-08-18 (via Interconsulta mode, `window.setWorkModeFromHeader('interconsulta')`): S/O/A/P now render as proper bordered cards with header bars, matching the mockup. 41/41 tests pass. Note: this screen is only reachable in Interconsulta mode (Sala mode migrates "Nota de evolución" to "Estado actual" by existing design) — consistent with the user's earlier by-design clarification on item 1.

Each item above must be closed with an actual before/after screenshot comparison attached to the session's report, not just test output.

## REMEDIATION ROUND 3 — 2026-08-18, second real-window feedback pass

21. **"Actualizar labs" dock — FIXED 2026-08-18.** Two bugs, both confirmed via user screenshot: (a) said "Actualizando" twice (static header title duplicated the dynamic button state) — header retitled "Actualizar labs", live state left alone. (b) dock was squeezed inside the narrow patient sidebar column instead of spanning full width. Moved `#lab-repo-batch-queue` out of `&lt;aside id="patient-sidebar"&gt;` to a direct child of `.app`, now a fixed full-width bar docked to the bottom of the whole window (`position:fixed; left:0; right:0; bottom:0`), header/row content capped at 1100px and centered so it doesn't look stretched on wide screens. JS wiring confirmed safe (plain `getElementById`, no sidebar-scoped lookups). Test passes, build clean. Verified by screenshot: full-width bottom bar, "ACTUALIZAR LABS" header once, "Listo" state once, progress bar and "1 de 1" caption spanning the window.

16. **Cultivo/lab label glued to value text — FIXED 2026-08-18.** Lines like "UROCULTIVO POR SONDA 16/08: ..." rendered as "UROCULTIVOPOR SONDA..." (no space) outside the Laboratorio grid card (cultivo chunks, Pase board). Root cause: `renderEntry` in `public/js/labs-display.mjs` (tab-delimited branch) concatenated `</span><span class="lab-row-values...">` with zero whitespace between them — invisible inside `#lab-output-box`'s CSS grid (whitespace text nodes are discarded between grid items) but visible everywhere else. Added a single space between the tags. New test added, 12/12 pass, build clean. Verified by screenshot: "ASPIRADO  TRAQUEAL 18/05: ESCHERICHIA COLI · BLEE" now renders with a clean gap.
17. **Ad hoc `window.confirm()` popups, Phase 3 leftover — FIXED 2026-08-18, code-verified only.** Converted 14 call sites across `clinical-sync-mode-settings.mjs`, `cloud-sync/panel-admin-helpers.mjs` (+ 3 dependent files), `cloud-sync/panel-conexion-handlers.mjs`, `cloud-sync/panel-interno-qr.mjs` to the styled `showConfirmDialog`. `grep -rn "window\.confirm(" public/js/features/` returns zero real hits (one string-literal test assertion only). Existing colocated tests pass, build clean. Could NOT get a live screenshot: the "Activar guardia con R+ Cloud…" trigger sits behind a settings flow that didn't yield a dialog within the headless harness after several navigation attempts (same category of issue as the Movimiento vitals sub-state — deep flow, hard to stage headlessly). Verified by code + tests, not by screenshot — flag if the user spots this dialog looking wrong live.
18. **Resumen Labs card overcrowds with many altered values — FIXED 2026-08-18.** User's design call: sort worsening values (negative trend) first by magnitude of the drop; everything else falls back to a fixed clinical-importance priority list (Lactato, pH, pCO2, pO2, Bica, K, Na, Glu, Cr, BUN, Hb, Hto, Plaquetas, TP/INR — written as one reviewable constant `CLINICAL_PRIORITY_LABELS` in `dashboard-html.mjs`, not validated against any existing clinical range table since none exists in the codebase — worth a clinician sanity-check). Capped to 8 cells per draw group; "N DE M" count reflects the capped visible count, "el resto en Laboratorio" caption unchanged. 21/21 tests pass (incl. 3 new: worst-drop-first, priority fallback, 17→8 cap), build clean. Verified by screenshot on DEMO PÉREZ (7 chips, under the cap): sort order now reads K → Na → Glu → Cr → BUN → Hb → Hto, exactly matching the priority list, no regression. Could not screenshot the actual 17+ cap/wrap behavior — no demo patient with that many altered values — mechanism is unit-tested instead.
20. **Resumen Labs card still overflows with multiple draws same day — FIXED 2026-08-18.** After the 8-cap/severity-sort fix (item 18), a patient with 2+ lab draws in one day still overflowed because each draw renders its own full card, and the same analyte (e.g. Lactato, pO2, Bica, Hto) can appear in more than one draw with different values, stacking redundant cells. User's call: drop the older duplicate, keep the most recent. Added `dedupeChipsAcrossEnvios` in `dashboard-html.mjs`, runs before the existing sort+cap per card; a draw emptied entirely by dedup is dropped (no empty card); "N DE M" total (M) still counts the true full-day total including duplicates, only the per-card visible count changes. 24/24 tests pass (3 new), build clean. Verified by screenshot that the single-draw case (DEMO PÉREZ) has no regression; could NOT screenshot the actual multi-draw dedup — no demo patient has 2+ same-day draws with overlapping analytes — covered by the 3 new unit tests instead.
19. **"Texto de egreso" modal (Manejo) — FIXED 2026-08-18.** Rebuilt as a real modal (`medications-egreso-modal.mjs`, new) reusing the shared kit shell, triggered by a new "Abrir texto de egreso" button in `#med-output-section`. Completa/Nombre+día toggle, teal Copiar button (same clipboard contract as before), numbered med list. Day count omitted gracefully when not tracked, not fabricated. 7 new tests pass, build clean. Verified by screenshot: modal opens with title, toggle, Copiar, and a clean numbered list ("1. PARACETAMOL 500 MG..."), matching the mockup — no more raw `||`-joined dump.

**Verify-tool tip (2026-08-18):** `goto-demo.mjs`'s `clickTopTab`/`clickSubTab` text-locator helpers can silently click a hidden same-text element elsewhere on the page (e.g. a settings-dropdown entry) instead of the real tab, producing a false "still empty" screenshot. Prefer `page.evaluate(() => document.getElementById('apptab-lab')?.click())` against the real DOM id (see `public/partials/layout/app-body.html` for ids) inside a custom `--eval` script.

## Goal

Bring every screen of R+ to 1:1 visual and behavioral fidelity with the design handoff:
- Spec of record: `/Users/mauriciosalas/Downloads/design_handoff_workbench_clinico/README.md`
- Pixel truth: `/Users/mauriciosalas/Downloads/design_handoff_workbench_clinico/Paciente Rediseño.dc.html` (open in a browser next to the app; screen line offsets below)
- Do NOT implement `Paciente Actual.dc.html`.

Phase 1 (tokens, fonts, palette, 2 of 5 animations, patient-dashboard pilot, partial Guardia table) is DONE per commit 670d4e93 and `docs/superpowers/plans/2026-08-17-teal-workbench-ui-redesign.md`. Do not redo it. Phase 0 below fixes the specific defects verified in it.

## Constraints

- Vanilla JS, no framework. Edit `public/js/**/*.mjs` sources only, never `public/js/chunks/` or `app.bundle.mjs`. Run `npm run build:ui` after renderer edits. (`.claude/rules/renderer.md`)
- Spanish user-facing copy. Colocated `*.test.mjs` updated in the same turn as behavior changes; run with `npm run test:one`, never bare `node --test`.
- Red/amber/green only for clinical meaning. One teal primary per screen, top right.
- Do not reopen closed items: Nube crypto, graph-memory, prior UI bugs. `npm run metrics:check` already shows a pre-existing debt regression from uncommitted Nube files — do not chase it.
- Do not shrink `#connection-dropdown` width.
- The app is ONE resizable Electron window with a shell (header + patient sidebar + tabs). The mockup draws per-mode fixed windows. Rule: reproduce the mockup's internal proportions and paddings inside each mode's pane; keep the app fluid; use max-widths where a fixed-width read column matters. Do not build per-mode OS windows.
- Where the README text and the mockup pixels disagree with the inventory summaries in this plan, README + mockup win. Always verify against the open mockup, not against this plan's prose.

## Chosen approach

Build a shared "workbench kit" (mode frame + counters band + table grammar + status labels + chips + empty state + 3-weight confirmation + undo toast) ONCE, then convert screens one per phase, highest daily value first (Guardia → shared confirmations → Paciente/Pendientes → Labs → Pase → Manejo/sidebar → Nota → Interconsultas → Inicio de turno). Each phase ships working and tested before the next starts.

## Mockup screen index (line offsets in `Paciente Rediseño.dc.html`, 3377 lines)

12a Inicio de turno ~L35 · 11a Confirmaciones ~L212 · 11b Calendario ~L262 · 10a Pendientes ~L416 · 10b Interconsultas ~L522 · 9a Nota ~L795 · 8a Interno lista ~L991 · 8b Captura ~L1091 · 7a Revisar signos ~L1224 · 7b Nuevo pendiente ~L1291 · 6a Guardia claro ~L1413 · 6b Guardia oscuro ~L1663 · 5a Pase ~L1924 · 4a Manejo ~L2089 · 3a/3b Sidebar ~L1413/L2383 (3b is the chosen variant) · 2a/2b Laboratorio ~L2486/L2676 · 1a/1b Resumen ~L2875/L3127.

---

## Phase 0 — Token and motion true-up (S) — Dev (Haiku) with Lead review

Verified defects from phase 1, all in two files plus docs:

- `public/tokens.css`:
  - `--radius-chip: 8px` → design says chips are `999px` (and `design.md` already agrees). Add `--radius-badge: 6px` and `--radius-row-btn: 7px`. Audit consumers of `--radius-chip` before flipping (Dev task: grep, list, Lead decides per consumer).
  - Add `--color-table-head: rgb(249,248,245)` (+ dark peer) and fix panel-header: `--color-content` is `#f2f1ed`, spec says `rgb(242,240,236)` — add `--color-panel-header` with the exact value instead of overloading `--color-content`.
  - Hairline/border: spec hairline `rgba(28,28,30,0.06)`, border `0.10–0.12`; current `--divider` = ink 8%, `--border` = ink 14%. Retune.
  - `--scrim-bg` light: 32% → spec `rgba(28,28,30,0.42)`.
  - Add shadow tokens: `--shadow-window: 0 18px 48px rgba(28,28,30,0.16)`, `--shadow-modal: 0 24px 64px rgba(28,28,30,0.28)`, `--shadow-counter-alert: inset 0 -2px 0 var(--color-danger)`.
  - Add the dense data type scale as tokens (section label 700 11px/0.08em, counter label 700 10px/0.09em, column head 700 9.5px/0.08em, counter figure 600 13px, patient name 600 12.5px, row 500 12–12.5px, mono data 500/600 11.5px, status label 600 10.5px mono uppercase, buttons 600 11.5/11px, metadata 500 11.5px).
- `public/styles/motion.css`: add true `om-rise` (enter +10px→0, hold ~76% of a 4.2s cycle, exit) — current `toast-in` drops from above with scale, wrong direction and no self-contained cycle. Retime shimmer 1.4s → ~1.1s with the spec's `-180px → 220px` sweep. Keep reduced-motion overrides.
- Update `design.md` + `docs/superpowers/specs/2026-08-17-teal-workbench-ui-design.md` + `teal-workbench.test.mjs` assertions.

**Done:** `teal-workbench.test.mjs` asserts the new values; `npm run build:ui` clean; no visual regression on patient-dashboard (existing 79 tests pass).

## Phase 1 — Workbench kit (shared components) (L) — Lead

New files: `public/js/features/workbench/` — `mode-frame.mjs`, `counters-band.mjs`, `wb-table.mjs`, `status-label.mjs`, `filter-chips.mjs`, `empty-state.mjs`, `confirm.mjs`, `undo-toast.mjs`, each with a colocated `.test.mjs`. New `public/styles/workbench-kit.css`. Wire into build (`public/index.src.html` partials if needed).

Components, per README:
1. **Mode frame** (bands 1–2 of the 4-band pattern, rendered inside a mode pane): identity/action bar (~44px, `padding: 12px 24px`, mode name uppercase + mono context + tertiary metadata left; 1–2 secondary buttons + `⌘/` + ONE teal primary right) and counters band (max 3 cells, white bg, `border-right: 1px solid rgba(28,28,30,0.08)`, label 10px uppercase + figure 13px; alert cell = `alert-tint-strong` + `--shadow-counter-alert`; optional 5px teal progress bar with `om-sweep`).
2. **Table grammar**: fixed card header (`9px 16px`) → fixed column-head row (`7px 16px`, 9.5px uppercase) → scrolling body (`10px 16px` rows, 11px for two-line rows) → closing summary line as centered `ink-2` text, NOT a row. Row hover `rgba(28,28,30,0.03)`; `alert-tint` rows keep their tint on hover; row click opens patient; in-row buttons stop propagation.
3. **Status labels**: `VENCIDO` (alert-deep) / `EN CURSO` (warn) / `ABIERTO` (ink-2) / `LISTO` (ok), 600 10.5px mono uppercase.
4. **Filter chips**: 999px; active = white + `border-strong`; inactive = `ink-2` text, no border/fill. (Zone chips in 12a use teal fill for active — a separate variant.)
5. **Empty state**: dashed `border-dashed` + `empty-fill`; label, one line "what is missing", one line "when it arrives", one exit link. Never a large zero. (Pilot has a first version in `patient-dashboard.css` — generalize it here.)
6. **Confirmation, one component, `weight` prop**: `destructive` (scrim modal, alert button right), `consequence` (scrim modal, teal primary, `rail` footer, consequences stated in one sentence), `reversible` (NO modal — execute + `om-rise` toast with Deshacer). Modal open 160ms ease-out, Esc/click-outside close.

**Done:** each component has a test asserting DOM structure/classes; a scratch harness page renders the kit next to mockup fragments (11a modals L212, 6a counters L1413) and matches paddings/typography exactly; no production screen changed yet.

## Phase 2 — Guardia 6a/6b to full fidelity (L) — Lead + Dev

Files: `public/js/features/guardia-board.mjs`, `guardia-board-chrome.mjs` (+ its new test), `guardia-board-render.mjs`, `guardia-census-table.mjs` (+ test), `public/styles/pase-board.css` (guardia census styles live here), `lib/db/schema.mjs` (+ schema test).

- Adopt mode frame + counters band. Counters in order: *Toma de signos 08:00* (progress bar), *Pendientes* (alert cell), *Ingresos*.
- Census table exact columns `92px 1fr 132px 1fr 84px`; Alterados mono in alert with `+N` truncation in `ink-2`; `sin toma 08:00` in warn; closing summary line; filter chips *Con pendiente · N* / *Todos* / *Ingresos*.
- Schema bumps (this phase, named blockers from the prior plan): admission-date field (enables Ingresos counter + filter) and an in-progress flag on todos (enables `EN CURSO`). Bump `lib/db/schema.mjs` + test.
- Right column *Signos recibidos*: no intern data source exists (blocked on Phase 11) — render the spec-compliant empty state ("cuándo llega" = when interns exist), not a fake panel, not a zero.
- 6b: verify the whole board under `html.dark` — the dark guardia is a hard requirement (night shift), not a nice-to-have.

**Done:** side-by-side with mockup L1413 (light) and L1663 (dark): column widths, counter band, chips, status labels, summary line all match; primary button is *Entregar guardia*, top right, only teal button; tests updated (`guardia-census-table.test.mjs`, `guardia-board-chrome.test.mjs`); build + tests green.

## Phase 3 — Confirmations rollout + calendar popover 11a/11b + 7b (M) — Lead

Files: `public/js/features/clinical-entrega/` (entrega modal → `consequence` weight, with the exact pending/vitals counts sentence), any ad hoc `confirm(...)`/custom modals found by Dev grep across `public/js/features/`, `public/styles/modals.css`, `rpc-date-picker.css` or new popover in workbench kit; `7b Nuevo pendiente` (L1291) as a kit-styled 3-field modal wherever pendientes are created.
- Reversible actions (guardar, marcar, enviar) LOSE their modals and gain undo toasts. Dev inventories all current confirmations first; Lead classifies each into a weight.
- Calendar popover (L262): 286px, radius 14, modal shadow, 7-column grid, selected day teal fill, today ringed, no-data days `ink-3` unclickable, chips Hoy/Ayer/Último pase/7 días, loaded range stated in mono below, anchored to the header date, Esc/click-outside/selection closes. Note: README (286px popover) is authoritative over any other reading of the mockup.

**Done:** zero ad hoc confirmation modals remain (grep proves it); entrega flow shows the consequence modal with real counts; date in header opens the popover matching L262.

## Phase 4 — Resumen 1a/1b + Pendientes 10a (M/L) — Lead

Files: `public/js/features/patient-dashboard/dashboard-html.mjs`, `dashboard-model.mjs` (+ tests), `public/styles/patient-dashboard.css`, `public/js/features/expediente.mjs` + `public/styles/expediente.css` for the 10a tab.
- Finish the pilot: labs section split *fuera de rango* (mini-table, alert, trend context) / *en rango* (one-line summary) — the named data-model gap from `2026-08-17-pilot-remove-card-boxes.md`; apply the dense type scale; mono for every columnar number.
- 10a: grouped pendientes list — vencidos first (`alert-tint` bg, VENCIDO label), then en curso, abiertos, resueltos collapsed; each item shows text, who, when, triggering value; `+ Pendiente` uses the 7b modal.

**Done:** app vs mockup L2875/L3127 and L416 side-by-side; the dark 1b "registro por reglas" no-boxes layout holds; grouped ordering asserted in tests.

## Phase 5 — Laboratorio 2a/2b (L) — Lead, with one senior-dev question

Files: `public/js/features/lab-panel*.mjs`, `labs-display.mjs`, `tend-core.mjs`, `public/styles/lab.css`, `lab-inner.css`.
- Abnormal-first ordering; date columns newest LEFT; mono values; out-of-range in alert with trend arrow vs previous draw.
- **Named design decision (send to senior-dev before coding):** trend arrows need per-analyte history, but core panels (BH/QS/ESC/PFHs) are free-text short codes not in the `labs-panel-defs.mjs` catalog (`tend-core.mjs` limitation, documented 2026-08-17). Options: extend the catalog with short-code aliases, or compute trends from parsed day snapshots. Do not hand-wave this; get the decision, then implement.
- `labs-display.mjs` is shared by censo, paste-preview, panel history — regression risk; Dev runs the full lab test set after.

**Done:** app vs L2486/L2676; abnormal rows on top with arrows; shared consumers visually unchanged where the design does not cover them.

## Phase 6 — Pase 5a (M) — Lead

Files: `public/js/features/pase-board.mjs`, `pase-board-render.mjs`, `pase-board-navigation.mjs`, `public/styles/pase-board.css`.
- One patient per screen: alterados first, pendientes, plan del día; mode frame with position context (`Sala 2 · 3 de 6 · 08:14`); keyboard bed navigation (exists in `pase-board-navigation.mjs` — keep, no animation on nav); secondary *Censo PDF* / *Salir del pase*.

**Done:** app vs L1924; keyboard next/prev patient with zero animation; one teal primary.

## Phase 7 — Manejo 4a + patient sidebar 3b (M) — Lead

Files: `public/js/features/medications-panel-render.mjs`, `med-pharm-profile-*.mjs`, `public/styles/med-pharm-profile.css`; sidebar: `public/js/features/patients-list.mjs`, `public/styles/sidebar.css`.
- Sidebar restyled to **3b "tarjetas suaves"** (the chosen variant; 3a existed, do not build). Groups Fijados/Pacientes, name bold + bed/room/specialty in gray mono.
- Manejo: *Medicamentos del turno · 11* header with `más 1 apoyo (O₂)` — apoyos (O₂, soluciones) counted apart from meds. Verify the split exists in the med model; if not, it is a model change with tests, not a label hack.

**Done:** app vs L2089 and L2383; apoyo counting asserted in a test.

## Phase 8 — Nota de evolución 9a (L) — Lead

Files: likely `public/js/features/vpo.mjs` / nota feature (Dev confirms the actual note surface first), new `lib/` module for the derived Objetivo (+ test), styles file per current organization.
- S: free text, autosave + `om-rise` aviso with deshacer. O: **derived** per zone from the day's vitals + labs, out-of-range in alert; the resident reviews, does not type; store the signed snapshot. A: free text, largest field. P: per zone with mono marks `novo` / `sin cambio` / `suspende` (labels, not icons).
- Objetivo derivation is Node-side logic in `lib/` with real tests (Electron Node runner).

**Done:** app vs L795; Objetivo populates from existing vitals/labs data without typing; autosave toast is reversible-weight (no modal).

## Phase 9 — Interconsultas 10b (M) — Lead

Files: interconsulta mode entry in header (`chrome.mjs` / mode switch), reuse Resumen from Phase 4; `lib/db/schema.mjs` bump for `{requestingService, reason, followUpStatus}` per patient (+ test).
- Consult band above the same patient summary; top bar `200px minmax(0,1fr) auto`, 52px; primary *Actualizar pacientes*; *Generar nota* demoted to a menu; Pendientes tab inside the mode.

**Done:** app vs L522; summary content identical to 1a, only the frame differs.

## Phase 10 — Inicio de turno 12a (L) — Lead

Files: new `public/js/features/inicio-turno/` (+ tests), new style file or section; state: `shift` (zones persisted between shifts), handoff `mentionedBeds` extraction from the entrega text (pure function in `lib/` or feature module + test); data from clinical-entrega, todos, census.
- Everything in README §12a: mode frame with *Recibir N pacientes* primary; 3 counters; *Lo primero* table (`92px 1fr 128px 96px`, two-line rows, per-row distinct action buttons — teal for vencidos, secondary otherwise); *Entrega de …* card with `firmada HH:MM` mono + mentioned beds extracted; *Tus zonas hoy* teal-fill chips + persistence note; *Internos del turno* with warn unassigned row + Asignar; the two canonical empty states (Labs de hoy, Interconsultas).

**Done:** app vs L35, every panel present; zone selection survives restart; mention extraction unit-tested.

## Phase 11 — FLAGGED: Interno móvil 8a/8b + signos recibidos pipeline 7a (XL, needs a product decision — do not start without the user)

This is the one part that CANNOT be built inside the existing vanilla-JS desktop renderer. 8a/8b is a phone surface for a different user (the intern) feeding live data into Guardia (6a panel, progress counter, 7a review modal). It requires: a mobile web surface, a transport (the natural one is Nube — whose deploy is blocked by the compliance gaps in `docs/superpowers/plans/2026-08-14-nube-client-encryption-compliance.md`), auth for interns, and PHI handling decisions. The prior E2EE work even notes "Interno redesign deferred". **Recommendation: plan it as its own program after Nube deploy questions are resolved. Until then, Phase 2's empty state stands in for Signos recibidos, and 7a ships only when data exists.**

---

## Task split

- **Lead (Sonnet):** all phase implementation, one phase per session, in order; updates the Active plans row + phase checkboxes in this plan file as each ships; runs `npm run build:ui`, `npm run test:one` on touched tests, visual side-by-side with the mockup file open in a browser.
- **Dev (Haiku):** Phase 0 mechanical token edits; consumer greps (`--radius-chip`, ad hoc confirms, `confirm(`, modal openers); test runs; inventory of every current modal for Phase 3; locating the real nota surface for Phase 8.
- **Senior (Opus), on demand only:** Phase 5 trend-arrow catalog decision; any 1:1 fidelity dispute where mockup and README disagree.

## Global verification (every phase)

1. `npm run build:ui` clean. 2. Touched colocated tests green via `npm run test:one`. 3. Open `Paciente Rediseño.dc.html` in a browser, scroll to the phase's screen, compare side-by-side in light AND dark. 4. Toggle reduced motion — all om-* collapse. 5. `npm run metrics:check` — ignore only the pre-existing Nube debt already documented in the phase-1 plan.

---

This plan is self-contained: any fresh session can execute a phase with only this file, the design handoff directory, and the repo. Nothing here reopens Nube crypto, graph-memory, or prior closed UI bugs.
