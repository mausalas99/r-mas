# Tablas Dinámicas: standalone combined-table builder

## Context

The first pass of this feature embedded a "+ Agregar analito de otro estudio" picker
inside the existing per-study "Gráfica del estudio" modal (opened from one section's
own "Gráfica" button). The owner wants this to be a fully separate feature instead:
its own button, its own builder, no ties to any single study's modal. This plan
undoes the embedding and rebuilds it as a standalone "Tablas Dinámicas" entry point.

Good news: almost all of the underlying engine from the first pass is still exactly
what's needed and gets reused as-is — it just moves to a new, dedicated modal instead
of living inside the section modal.

## Where the button goes

Explored the Tendencias panel: `tendencias-hidden.mjs`'s `buildTendInlineControlsHtml()`
(lines 170–201) renders a toolbar (`.tend-inline-controls`) at the very top of the
Tendencias panel, above every individual study section — it already holds "Ver
todas/Solo fuera de rango", "Ocultos (N)", and "Gasometría extendida" as
`.tend-toolbar-btn` buttons. This is the natural "top area" home: always visible,
scoped to labs, sibling to the other panel-level actions rather than any one study.
"Tablas Dinámicas" joins that row as a fourth `.tend-toolbar-btn`.

## Revert: un-embed from the per-study modal

- **`tend-group-table-render.mjs`**: remove the unconditional `renderAnalytePickerBar(...)`
  call and the `#tend-group-analyte-picker-slot` div from `renderGroupTable`. The
  per-study modal goes back to showing only its own section's rows.
- **`tend-group-modal-open.mjs`**: remove `hydrateExtraSpecs()` and the
  `state.tableExtraSpecs = hydrateExtraSpecs(...)` line from `prepareTendGroupOpen` —
  the per-study modal no longer has an "extras" concept. Keep `crossSectionEligibleSpecs`
  exported (the new builder's picker still calls it) but simplify it to not need an
  "exclude this one section" case (see below).
- **`tend-group-modal.mjs`**: remove `tableExtraSpecs: []` from the initial state
  (table-render.mjs already falls back to `state.tableExtraSpecs || []`, so this is
  just cleanup, not required for correctness — but keeps the per-study state honest).

What stays, because the new builder needs it unchanged:
- `tend-core.mjs`: `buildSectionTableModel`'s per-row `sectionKey` (already reused by
  every row regardless of which modal renders it).
- `tend-prefs.mjs`: `readGroupExtraFields`/`writeGroupExtraFields`, and the existing
  `readGroupTableHidden`/`writeGroupTableHidden`/`readGroupTableByDay`/`writeGroupTableByDay`
  — all keyed by `(patientId, sectionKey)`. The new builder reuses every one of these
  verbatim by passing a reserved pseudo section key instead of a real one (see below) —
  no new prefs functions needed.
- `tend-group-analyte-picker.mjs`: reused as-is, just now permanently visible (instead
  of conditionally shown) since the whole new modal exists only to add rows.
- `tend-group-table-render.mjs`'s `renderGroupTable`: reused as-is for painting the
  table, hide/restore, day-mode grouping, and the export model — it never assumed a
  chart-capable section, it just reads `state.specsByField` + `state.tableExtraSpecs`.

## New standalone builder

**Reserved key**: `DYNAMIC_TABLE_SECTION_KEY = '__DYNAMIC__'` (doesn't match
`tendEligibleSectionKey`'s regex, so it can never collide with a real lab section).
Used everywhere the reused prefs functions want a `sectionKey` — this is what makes
persistence (extra fields, hidden rows/cols, day-mode) come for free.

**`crossSectionEligibleSpecs(deps, state)`** (tend-group-modal-open.mjs): today it
excludes `state.sectionKey` from candidates. With `state.sectionKey ===
DYNAMIC_TABLE_SECTION_KEY`, nothing real gets excluded by that check, so it already
offers analytes from every real section with no code change needed there.

**New file `public/js/tend-dynamic-table-modal.mjs`**: a small, self-contained
controller (no Chart.js, no tabs, no gaso-extended) — modeled on
`tend-group-modal.mjs` + `tend-group-modal-open.mjs`'s `prepareTendGroupOpen`, but
trimmed:
- `state`: `{ sectionKey: DYNAMIC_TABLE_SECTION_KEY, patientId, historyDescFull,
  historyDesc, historyAsc, rangeFrom, rangeTo, specsByField: {} (always empty —
  there is no "primary" section), tableExtraSpecs, tableModel, dynamicMode: true }`.
- `open()`: gets the active patient, loads/sorts full lab history (reuse
  `sortLabHistoryChronological`), hydrates `tableExtraSpecs` from
  `readGroupExtraFields(patientId, DYNAMIC_TABLE_SECTION_KEY)` resolved back to live
  specs via `deps.getCatalogSpecs` (same resolution logic the old `hydrateExtraSpecs`
  used — moves here). No eligibility gate to open — unlike the per-study modal, this
  should always be openable for an active patient, even with sparse labs; the picker
  and table simply show "sin datos" until the user has ≥2 lab sets to trend.
  Requires only `deps.getActiveId()` truthy.
- Date range row: reuse the same `filterHistoryByDateRange`/`applyTendGroupDateRange`
  helpers, wired the same way `wireRangeRow` does in `tend-group-modal.mjs`.
- `renderTable()`: calls the SAME `renderGroupTable(deps, state, DYNAMIC_TABLE_SECTION_KEY, renderTable)`
  from `tend-group-table-render.mjs` — no fork needed.
- Copy PNG/text: reuse `copyTendGroupTablePng`/`copyTendGroupTableText` from
  `tend-group-modal-open.mjs` as-is, but give the title a fixed fallback ("Tabla
  dinámica") instead of `getSectionLabel(sectionKey)`, since `DYNAMIC_TABLE_SECTION_KEY`
  isn't a real section.
- `close()`: same teardown shape as `tend-group-modal.mjs.closeModal` minus chart
  destruction (there are no charts to destroy).

**`tend-group-table-render.mjs`**: gate the picker so it only appears here, not in the
per-study modal — `if (state.dynamicMode) renderAnalytePickerBar({...})` inside
`renderGroupTable`, replacing the unconditional call removed above.

**Markup — `public/partials/modals/root.html`**: new backdrop
`#tend-dynamic-table-backdrop`, copy-pasting the existing `#tend-group-backdrop`
structure (lines 943–971) minus the tabs (`.tend-group-tabs-wrap`) and the charts
panel — just header, range row, table wrap, copy actions. Reuses the exact same CSS
classes (`tend-group-backdrop`, `tend-group-modal`, `tend-group-header`,
`tend-group-range-row`, `tend-group-panel`, `tend-group-table-actions`, …), so no new
CSS is needed beyond what already exists from the first pass
(`.tend-analyte-picker-*`, `.tend-group-extra-chips`, `.tend-group-extra-chip` in
`modals.css`, already shipped).

**Toolbar button — `tendencias-hidden.mjs`**: add a fourth button to
`buildTendInlineControlsHtml`, always shown (no condition, unlike "Ocultos"/"Gasometría
extendida" which are conditional): `<button type="button" class="tend-toolbar-btn
tend-dynamic-table-trigger">Tablas Dinámicas</button>`.

**Wiring — `tendencias-ui-shell.mjs`**: add a case to `handleTendenciasToolbarClick`
for `.tend-dynamic-table-trigger` → a new `openTendDynamicTableModal()` function,
mirroring `openTendGroupModal`/`openTendGasoExtendedModal`'s init-then-open shape
(no Chart.js load needed here, so it can open synchronously once the module is
imported — simpler than the chart-modal path).

## Out of scope (unchanged from the first pass)

- Charts stay single-section; this builder is table-only, by design.
- `.docx` export untouched.

## Verification

- `npm run test:one -- public/js/tend-core.test.mjs public/js/tend-prefs.test.mjs public/js/tend-group-table-render.test.mjs public/js/tend-group-modal-open.test.mjs`
- New `public/js/tend-dynamic-table-modal.test.mjs` for the pure logic (date-range
  filtering reuse, extras hydration/resolution) — DOM-heavy open/close wiring isn't
  unit-tested, consistent with how `tend-group-modal.mjs` itself has no test file today.
- `npm run build:ui`
- Manual: open a patient with labs in ≥2 sections, click "Tablas Dinámicas" in the
  Tendencias toolbar (confirm the per-study "Gráfica del estudio" modal no longer
  shows any add-analyte picker), add analytes from two different sections, confirm
  values/dates, hide/restore a row, copy as image/text, close and reopen to confirm
  the added analytes persisted.
