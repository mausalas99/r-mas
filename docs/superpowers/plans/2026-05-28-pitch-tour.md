# Tour pitch (presentación) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hidden 28-step pitch tour with strong visual guidance (scrim + pitch spotlights + numbered callouts), rich demo seed data, and ⌥⌘⇧P unlock — independent of existing Sala/IC guided tours.

**Architecture:** Isolated modules (`tour-pitch*.mjs`) + minimal hooks in `settings-help.mjs`, `platform.mjs`, `index.html`, `modals.css`. Reuse `#tour-dock` with `pitchTourActive` flag. Visual layer: `#tour-pitch-scrim` + `.tour-spotlight-pitch` classes.

**Tech Stack:** Vanilla JS (ESM), existing tour dock DOM, `procesarLabs` from `labs.js`, `patient.monitoreo` from `estado-actual-data.mjs`.

**Spec:** `docs/superpowers/specs/2026-05-28-pitch-tour-design.md`

---

## File map

| Action | Path |
|--------|------|
| Create | `public/js/tour-pitch-steps.mjs` |
| Create | `public/js/tour-pitch-targets.mjs` |
| Create | `public/js/tour-pitch-demo-seed.mjs` |
| Create | `public/js/tour-pitch.mjs` |
| Create | `public/js/tour-pitch-demo-seed.test.mjs` |
| Create | `public/js/tour-pitch-targets.test.mjs` |
| Modify | `public/styles/modals.css` |
| Modify | `public/index.html` (or `public/partials/chrome/overlays.html` if scrim lives there) |
| Modify | `public/js/features/settings-help.mjs` |
| Modify | `public/js/features/platform.mjs` |
| Modify | `public/js/tour-guards.mjs` |
| Modify | `public/js/app-shell.mjs` or `public/js/app-runtimes.mjs` (exports/window handlers) |
| Modify | `package.json` test script (add new test files) |

---

### Task 1: Visual layer (scrim + pitch spotlights + dock variant)

**Files:**
- Modify: `public/index.html` (after `#tour-dock` or in overlays partial)
- Modify: `public/styles/modals.css`

- [ ] **Step 1:** Add empty div:

```html
<div id="tour-pitch-scrim" class="tour-pitch-scrim" aria-hidden="true" hidden></div>
```

- [ ] **Step 2:** Add CSS:

```css
.tour-pitch-scrim {
  position: fixed; inset: 0; z-index: 99990;
  background: rgba(15, 23, 42, 0.48);
  pointer-events: none;
  opacity: 0; transition: opacity 0.2s ease;
}
.tour-pitch-scrim.is-active { opacity: 1; }
@keyframes tour-pitch-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.55); }
  50% { box-shadow: 0 0 0 10px rgba(13, 148, 136, 0); }
}
.tour-spotlight-pitch {
  position: relative; z-index: 100001 !important;
  outline: 3px solid #0d9488 !important; outline-offset: 4px !important;
  animation: tour-pitch-pulse 2.2s ease-in-out infinite;
}
.tour-spotlight-pitch-secondary {
  position: relative; z-index: 100000 !important;
  outline: 2px dashed color-mix(in oklab, #0d9488 70%, var(--border)) !important;
  outline-offset: 3px !important;
}
#tour-dock.tour-dock--pitch .tour-dock-inner {
  border-color: #0d9488;
  box-shadow: 0 8px 32px rgba(13, 148, 136, 0.2);
}
.tour-pitch-callout {
  font-weight: 650; color: #0d9488; margin-bottom: 8px !important;
}
html.dark .tour-pitch-callout { color: #2dd4bf; }
```

- [ ] **Step 3:** Run `npm test` (no new tests yet) — ensure no CSS parse errors.

---

### Task 2: Steps + targets

**Files:**
- Create: `public/js/tour-pitch-steps.mjs`
- Create: `public/js/tour-pitch-targets.mjs`
- Create: `public/js/tour-pitch-targets.test.mjs`

- [ ] **Step 1:** Export `PITCH_TOUR_STEPS` array (28 ids from spec §5).

- [ ] **Step 2:** Export `PITCH_TARGETS` map keyed by step id with fields: `appTab`, `innerTab`, `selector`, `secondarySelector?`, `spotlight`, `dockLeft`, `calloutLabel`, `openSettings?`, `openConnection?`, `openProfile?`, `setDensity?` (`pase` for step 18).

- [ ] **Step 3:** Export `getPitchTourTarget(stepId)`, `getPitchTourSteps()`.

- [ ] **Step 4:** Test — every step in `PITCH_TOUR_STEPS` has target with non-empty `selector` and `calloutLabel` (except `pitch_intro` and `wrap` may omit callout).

```bash
node --test public/js/tour-pitch-targets.test.mjs
```

---

### Task 3: Demo seed (cultivos S/I/R + EA 3 días)

**Files:**
- Create: `public/js/tour-pitch-demo-seed.mjs`
- Create: `public/js/tour-pitch-demo-seed.test.mjs`

- [ ] **Step 1:** Export `PITCH_DEMO_PATIENT_ID = 'demo-pitch'` (or reuse `demo-onboarding` if pitch tour owns lifecycle exclusively — prefer **separate id** `demo-pitch` to avoid collision if user runs normal tour later).

- [ ] **Step 2:** Add `PITCH_SOME_WITH_CULTIVOS` string — concatenate SOME fragments from `labs-cultivo.test.mjs` patterns (hemo pseudo S/I/R, uro ESBL, catéter).

- [ ] **Step 3:** `buildPitchMonitoreoHistorial()` — 8+ mediciones across 3 calendar days; export for tests.

- [ ] **Step 4:** `seedPitchDemo({ patients, notes, indicaciones, labHistory, ... })` — insert patient, run `procesarLabs` / store history, set notes/indica/med/listado/recetaHu/agenda, assign `monitoreo`.

- [ ] **Step 5:** `clearPitchDemo(state)` — remove demo-pitch* keys and patient.

- [ ] **Step 6:** Tests:

```bash
node --test public/js/tour-pitch-demo-seed.test.mjs
```

Assert parsed cultivo output includes ` R`, ` I`, ` S` (or condensed `ATB R:` / `S:`).

Assert historial spans 3 distinct local dates and length >= 8.

---

### Task 4: Pitch tour engine

**Files:**
- Create: `public/js/tour-pitch.mjs`
- Modify: `public/js/tour-guards.mjs`

- [ ] **Step 1:** State: `pitchTourActive`, `pitchStepId`, `pitchTourIdx`.

- [ ] **Step 2:** `unlockPitchTour()` — set `localStorage['rpc-pitch-tour-unlock']='1'`, show `#btn-start-pitch-tour`, toast “Tour pitch desbloqueado”.

- [ ] **Step 3:** `syncPitchTourUnlockButton()` — call on settings open + boot.

- [ ] **Step 4:** Visual helpers:

```js
function showPitchScrim(on) { /* toggle .is-active on #tour-pitch-scrim */ }
function clearPitchTourVisuals() { /* remove pitch + legacy spotlight classes */ }
function applyPitchSpotlights(target) { /* primary + secondary selectors */ }
```

- [ ] **Step 5:** `applyPitchTourStep(stepId)` — mode switch logic (copy from `startOnboarding` for IC step 19), `setUiDensity`, tab switches via runtime `rt` registered from settings-help.

- [ ] **Step 6:** `renderPitchTourStep()` — switch on stepId for Spanish copy; prepend `<p class="tour-pitch-callout">` when `calloutLabel` set; badge `Pitch · Paso N de 28`; add `#tour-dock.tour-dock--pitch`.

- [ ] **Step 7:** `startPitchTour()`, `stopPitchTour()`, `pitchTourClickNext()`, wire `guidedTourAdvanceAfter` equivalents for `ic_nota`/`ic_indica` when pitch active.

- [ ] **Step 8:** Extend `tour-guards.mjs`:

```js
let pitchTourActive = false;
export function syncPitchTourContext({ active, stepId }) { ... }
export function isCasiopeaTourSendBlocked(kind) {
  if (pitchTourActive && (stepId === 'sala_casiopea_lab' || stepId === 'sala_casiopea_trends')) return true;
  // existing guided tour checks...
}
```

- [ ] **Step 9:** Export all public functions for app-shell/settings-help.

---

### Task 5: Integration

**Files:**
- Modify: `public/js/features/settings-help.mjs`
- Modify: `public/js/features/platform.mjs`
- Modify: `public/js/app-shell.mjs`
- Modify: `package.json` (test script line)

- [ ] **Step 1:** Import pitch module; register runtime partial (same `rt` as guided tour).

- [ ] **Step 2:** In `renderTourStep` / `guidedTourClickNext` early-return if `pitchTourActive` and delegate to pitch module OR keep pitch render entirely in pitch module and hook `showTourDock` shared.

- [ ] **Step 3:** Add hidden button in settings help HTML section:

```html
<button type="button" id="btn-start-pitch-tour" style="display:none" ...>Tour pitch (presentación)</button>
```

- [ ] **Step 4:** `platform.mjs` keydown: if `e.altKey && e.metaKey && e.shiftKey && e.key === 'p'` → `unlockPitchTour()`.

- [ ] **Step 5:** Re-export `startPitchTour` on window if app uses `settingsHelpWindowHandlers`.

- [ ] **Step 6:** Add test files to `npm test` script in `package.json`.

- [ ] **Step 7:** Run full test + `npm run build:ui:check` if applicable.

```bash
npm test
```

---

### Task 6: Manual verification checklist

- [ ] ⌥⌘⇧P → botón visible en Ajustes
- [ ] Iniciar tour → scrim visible en pasos 2–27
- [ ] Paso 10 cultivos muestra S/I/R en UI
- [ ] Paso 14 gráficas EA con puntos en 3 días
- [ ] Paso 19 cambia a Interconsulta
- [ ] Pasos 21–22 spotlight en Generar (dock izquierda)
- [ ] Omitir → demo limpiado, scrim off

**Do not commit** unless user asks (local pitch build).

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| 28 steps | Task 2 |
| Visual scrim + pitch spotlight | Task 1, 4 |
| Callout labels | Task 2, 4 |
| Cultivos S/I/R | Task 3 |
| EA 3 días | Task 3 |
| No manejo | Steps omit `sala_manejo` |
| ⌥⌘⇧P unlock | Task 5 |
| Neo blocked | Task 4 |
| Independent of guided tour LS | Task 4 (no GUIDED_TOUR_LS_KEY write) |
