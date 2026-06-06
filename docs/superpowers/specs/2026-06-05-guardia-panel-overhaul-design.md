# Guardia Panel Overhaul — Design Spec

**Date:** 2026-06-05  
**Scope:** Bug fixes (4) + UX redesign of entrega flow and turno activo panel  
**Primary files touched:** `guardia-board.mjs`, `unified-patient-grid-board.mjs`, `entrega-modal-ui.mjs`, `clinical-entrega.mjs`, `lib/entrega/entrega-handoff-context.mjs`  
**New files:** `public/js/features/entrega-roster-panel.mjs`, `public/js/features/guardia-vitals-feed.mjs`

---

## 1. Bug Fixes

### BUG-1 · Vasopressor always active on open

**Root cause:** `normalizeVasopressor` in `lib/entrega/entrega-handoff-context.mjs` (line 100):

```js
const active = !!(vas?.active || vas?.agent || vas?.dose || vas?.rate);
```

When called with `{ active: false, agent: 'norepinefrina' }` (the default), `vas.agent` is truthy so `active` becomes `true` even though `active` was explicitly `false`.

**Fix:** Respect an explicit boolean `active` field before falling back to inference from other fields.

```js
const active = vas != null && 'active' in vas
  ? !!vas.active
  : !!(vas?.agent || vas?.dose || vas?.rate);
```

This preserves the inference behaviour for records that pre-date the `active` field (backwards compat) while respecting explicit toggles.

---

### BUG-2 · Most patients show critical status when toggle is off

**Root cause:** `enrichPatientForGuardiaCard` in `guardia-board.mjs` (lines 135–139) marks a patient critical for any open high-priority todo, producing false positives on most patients.

**Current logic:**
```js
const isCritical = !!(
  g?.is_critical ||
  vitalsAltered ||
  (openTodos > 0 && storage.getTodos(base.id).some((t) => !t.completed && t.priority === 'alta'))
);
```

**New logic — remove high-priority todo condition, add vasopressor/ventilation from handoff context:**
```js
const handoff = g?.handoff_context ? normalizeHandoffContext(g.handoff_context) : null;
const isCritical = !!(
  g?.is_critical ||
  vitalsAltered ||
  handoff?.vasopressor?.active ||
  handoff?.ventilation?.active
);
```

Critical is now driven by: explicit toggle set in the entrega form **OR** altered vitals from interno **OR** active vasopressor **OR** active ventilation. High-priority todos are not a critical signal.

---

### BUG-3 · Vitals countdown does not tick

**Root cause:** `compileChip` in `unified-patient-grid-board.mjs` renders the vitals banner as a static HTML string at render time. There is no live refresh.

**Fix:** Add a module-level `setInterval` (60 s tick) that re-renders only the `.patient-chip-vitals` element inside each chip, recomputing `calcVitalsBannerForSpec` from the stored spec. The chip stores the spec in a `data-vitals-spec` attribute (JSON-encoded) so the ticker can compute without re-fetching the data model.

Implementation:
- `compileChip` adds `data-vitals-spec` to the card element.
- `UnifiedPatientGridBoard` exposes a `startVitalsTicker()` and `stopVitalsTicker()` method that manage the interval.
- `renderGuardiaBoard` calls `gridBoard.startVitalsTicker()` after drawing.
- Ticker updates only the text content and CSS class of `.patient-chip-vitals`, not the full chip.

---

### BUG-4 · Entrega phase toggle button does nothing

**Root cause:** `wireGuardiaEntregaPhaseButton` in `guardia-board.mjs` sets `gridModeControlsWired = true` **before** checking if the button element exists in the DOM:

```js
function wireGuardiaEntregaPhaseButton(settings) {
  if (gridModeControlsWired) return;
  gridModeControlsWired = true;          // ← guard trips here
  const btn = document.getElementById('btn-guardia-entrega-phase');
  if (!btn) return;                       // ← returns without attaching listener
  // ...event listener never reached on subsequent calls
}
```

On the first render the button may not yet exist. The guard fires, the early return exits without wiring, and all subsequent renders skip the function entirely.

**Fix:** Move the guard below the button existence check, or make the guard conditional on the listener having been attached:

```js
function wireGuardiaEntregaPhaseButton(settings) {
  const btn = document.getElementById('btn-guardia-entrega-phase');
  if (!btn || btn._guardiaEntregaWired) return;
  btn._guardiaEntregaWired = true;
  // attach listener...
}
```

Using a property on the element itself (`_guardiaEntregaWired`) avoids the module-level flag problem when the DOM is rebuilt.

---

## 2. UX Redesign — Two Modes

The guardia panel now has two distinct operational modes with clear visual differentiation.

### Mode 1 · Entrega

Triggered by the "Entrega" toolbar button. Replaces the current toggle+tap-each-card flow.

**Behaviour:**
- Pressing "Entrega" opens a full-width slide-over panel (the census is hidden, not dimmed).
- The slide-over shows an **entrega roster**: all patients sorted with critical/unstable first, then the rest.
- Each row shows: bed number, full name, diagnosis, handoff context summary (if already filled), status badge, and vasopressor/ventilation icon flags.
- Rows with no handoff context yet show a "Sin contexto — toca para completar" hint.
- Tapping any row opens the **wide entrega modal** (see §2.1) as an overlay.
- A "Confirmar entrega" button at the bottom finalises the phase and transitions to Turno activo.
- A "Cancelar" button exits entrega mode without saving.

**Component:** `public/js/features/entrega-roster-panel.mjs`  
Exports `openEntregaRosterPanel(settings)` and `closeEntregaRosterPanel()`.  
Renders into a `<div id="entrega-roster-panel">` that the HTML already provides (or is injected by the component).

---

### 2.1 · Wide Entrega Modal

Replaces the current tall "Pendientes de guardia" modal with a wide (≈780 px) compact layout.

**Layout (top to bottom):**

1. **Nav bar** — prev/next patient arrows, patient name + bed, "N de M" counter, entrega-active badge.
2. **Row 1** — R1 de guardia | Equipo de origen | Estado general (3-column grid).
3. **Marcadores** — Paciente crítico / Negativas firmadas / Show as toggle chips.
4. **Divider label** — "Soporte · Signos vitales"
5. **Row 2 (2-column):**
   - **Left — Soporte activo:** Vasopresor card + Ventilación card stacked vertically. Each card has a toggle dot; only when toggled on do the detail fields (agent, dose, unit pills / mode, FiO₂, settings) appear.
   - **Right — Signos vitales en guardia:** parameter pills (TA, FC, FR, Temp, Sat O₂, Glucometría), frequency tab selector (Rutina / Intervalo / Por turno), interval chips (1h–8h) or per-turno options, and a live summary line.
6. **Notas breves** — single compact textarea.
7. **Summary line** — auto-generated one-liner from all fields (existing `handoffContextSummary`).
8. **Footer** — Cancelar | Confirmar entrega.

**Navigation:** The modal reads the entrega roster order. Prev/next arrows update the modal in-place (no close/reopen). Unsaved changes on the current patient are auto-saved to the draft when navigating away.

---

### Mode 2 · Turno Activo

Activated automatically when "Confirmar entrega" is pressed, or manually via "Iniciar turno" if the user skips entrega. Persisted in `localStorage` as `guardia.turnoActive`.

**Layout:**

1. **App bar** — "Turno activo" green badge + clock, "Iniciar entrega" ghost button.
2. **Signos vitales panel** (top, prominent) — a card grid showing the most recently registered vital set per patient. Each card: bed, name, values (TA/FC/FR/Temp/Sat), time-ago. Altered values are highlighted in orange. Cards are sorted by recency. Panel only shows patients with at least one registered vital set during the current session.
3. **Census grid** (below) — existing `UnifiedPatientGridBoard` with the live-ticking vitals countdown.

**Component:** `public/js/features/guardia-vitals-feed.mjs`  
Exports `renderGuardiaVitalsFeed(guardiasMap, patients)`.  
Reads `last_vitals_check` and the last `monitoreo.historial` entry per patient from the existing data model.  
Renders into `<div id="guardia-vitals-feed">`.

The vitals feed re-renders whenever `renderGuardiaBoard` is called (already triggered on LAN sync and interno vitals push).

---

## 3. Critical Status Signal (revised)

Used in both `enrichPatientForGuardiaCard` (guardia board) and `computeGuardiaSummary` (summary tiles):

| Signal | Source | Include? |
|---|---|---|
| Explicit `is_critical` toggle | Entrega modal / DB | ✅ |
| Altered vitals (interno) | `monitoreo.historial` last entry | ✅ |
| Active vasopressor | `handoff_context.vasopressor.active` | ✅ |
| Active ventilation | `handoff_context.ventilation.active` | ✅ |
| High-priority open todo | `storage.getTodos()` | ❌ removed |

---

## 4. SVG Icons (no emojis)

All icons throughout the guardia panel use inline SVG from the Lucide set (already used in the codebase). New icon usages:

- Vasopressor: triangle-alert `<path d="M10.29 3.86L1.82 18..."/>`
- Ventilation: activity/waveform `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`
- Vitals live: activity waveform same as above
- Navigation arrows: `<polyline points="15 18 9 12 15 6"/>` / `<polyline points="9 18 15 12 9 6"/>`
- Clock/turno: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`

---

## 5. Files Changed

| File | Change |
|---|---|
| `lib/entrega/entrega-handoff-context.mjs` | Fix `normalizeVasopressor` active inference |
| `public/js/features/guardia-board.mjs` | Fix button wiring guard; new critical logic; call `startVitalsTicker`; integrate roster panel and vitals feed |
| `public/js/features/unified-patient-grid-board.mjs` | Add `data-vitals-spec` attr; `startVitalsTicker` / `stopVitalsTicker` |
| `public/js/features/entrega-modal-ui.mjs` | Wide layout (780px); patient nav arrows; in-place nav draft save |
| `public/js/features/clinical-entrega.mjs` | `toggleEntregaPhase` opens roster panel instead of phase-only toggle; turno active state |
| `public/js/features/entrega-roster-panel.mjs` | **New** — slide-over roster component |
| `public/js/features/guardia-vitals-feed.mjs` | **New** — vitals feed panel for turno activo |
| `public/index.html` (via `build-ui.mjs`) | Add `#entrega-roster-panel` and `#guardia-vitals-feed` mount points |

---

## 6. Out of Scope

- Redesign of the LAN sync or DB schema for guardia records.
- Changes to the interno QR vitals registration flow (vitals feed reads existing data).
- Pase board or sala view changes.
- Mobile/interno board changes.
