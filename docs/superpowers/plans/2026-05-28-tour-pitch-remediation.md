# Tour pitch remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix pitch tour bugs (steps 13/18/IC/wrap, minimized dock, demo data, patient restore on skip) via a centralized orchestrator in `tour-pitch.mjs`.

**Architecture:** Refactor `applyPitchTourStep` into `leaveStep` / `enterStep` / `applyVisuals` / `exitPitchTour`. Spotlight only when dock expanded. `scrollPolicy` per target. `reconcilePitchCultivoHistory` preserves `sourceText`. Atomic exit clears resolver before save.

**Tech Stack:** Vanilla JS (ESM), Node `--test`, existing `#tour-dock` DOM, `app-state.mjs` persist resolver.

**Spec:** `docs/superpowers/specs/2026-05-28-tour-pitch-remediation-design.md`

---

## File map

| Action | Path | Responsibility |
|--------|------|------------------|
| Modify | `public/js/tour-pitch-targets.mjs` | Add `scrollPolicy`; export `resolvePitchScrollPolicy` |
| Modify | `public/js/tour-pitch.mjs` | Orchestrator API, step fixes, badge, exports for tests |
| Modify | `public/js/tour-pitch-demo-seed.mjs` | `reconcilePitchCultivoHistory`, hardened `clearPitchDemo` |
| Modify | `public/js/app-state.mjs` | Guard `patientsForPersistence` when resolver returns empty |
| Modify | `public/js/features/settings-help.mjs` | Hook dock collapse → pitch |
| Modify | `public/styles/modals.css` | Verify minimized pitch dock scroll (adjust if needed) |
| Create | `public/js/tour-pitch-orchestrator.test.mjs` | Badge, scroll policy, spotlight gate |
| Create | `public/js/tour-pitch-cultivo-reconcile.test.mjs` | Cultivo history upsert |
| Modify | `public/js/tour-pitch-demo-sandbox.test.mjs` | Never-empty restore guard |
| Modify | `package.json` | Add new test files to `npm test` |

After JS changes: rebuild bundle (`npm run build:ui` or project equivalent) so `app.bundle.mjs` stays in sync.

---

### Task 1: Target metadata — `scrollPolicy`

**Files:**
- Modify: `public/js/tour-pitch-targets.mjs`
- Modify: `public/js/tour-pitch-targets.test.mjs`

- [ ] **Step 1: Write failing test**

Add to `public/js/tour-pitch-targets.test.mjs`:

```js
import { resolvePitchScrollPolicy } from './tour-pitch-targets.mjs';

test('resolvePitchScrollPolicy — modal chart steps skip page scroll', () => {
  assert.equal(resolvePitchScrollPolicy('sala_tend_chart'), 'none');
  assert.equal(resolvePitchScrollPolicy('sala_casiopea_lab'), 'none');
  assert.equal(resolvePitchScrollPolicy('pitch_pegar_monitoreo'), 'none');
});

test('resolvePitchScrollPolicy — default target scroll', () => {
  assert.equal(resolvePitchScrollPolicy('pitch_modo_pase'), 'target');
  assert.equal(resolvePitchScrollPolicy('map_sidebar'), 'target');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test public/js/tour-pitch-targets.test.mjs
```

Expected: FAIL — `resolvePitchScrollPolicy` is not exported

- [ ] **Step 3: Implement**

In `public/js/tour-pitch-targets.mjs`, add `scrollPolicy: 'none'` to:

- `sala_casiopea_lab`
- `sala_tend_chart`
- `pitch_pegar_monitoreo`
- `lab_bulk_separator` (modal hint)

Add `scrollPolicy: 'target'` explicitly to `pitch_modo_pase`, `listado_problemas` (optional — documents intent).

Export:

```js
export function resolvePitchScrollPolicy(stepId) {
  const t = getPitchTourTarget(stepId);
  if (!t) return 'target';
  return t.scrollPolicy || 'target';
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node --test public/js/tour-pitch-targets.test.mjs
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/tour-pitch-targets.mjs public/js/tour-pitch-targets.test.mjs
git commit -m "feat(pitch-tour): add scrollPolicy metadata per step"
```

---

### Task 2: Badge text helper (callout-aligned)

**Files:**
- Modify: `public/js/tour-pitch.mjs`
- Create: `public/js/tour-pitch-orchestrator.test.mjs`

- [ ] **Step 1: Write failing test**

Create `public/js/tour-pitch-orchestrator.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPitchStepBadgeText } from './tour-pitch.mjs';

test('getPitchStepBadgeText uses callout label when present', () => {
  assert.equal(getPitchStepBadgeText('pitch_modo_pase'), '⑰ Modo Pase');
  assert.equal(getPitchStepBadgeText('listado_problemas'), '⑯ Listado de problemas');
});

test('getPitchStepBadgeText uses slide labels for fullscreen steps', () => {
  assert.equal(getPitchStepBadgeText('pitch_intro'), 'Pitch · Intro');
  assert.equal(getPitchStepBadgeText('pitch_problem_laboratoriazo'), 'Pitch · El problema');
  assert.equal(getPitchStepBadgeText('wrap'), 'Pitch · Cierre');
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node --test public/js/tour-pitch-orchestrator.test.mjs
```

- [ ] **Step 3: Implement in `tour-pitch.mjs`**

```js
const PITCH_SLIDE_BADGE = {
  pitch_intro: 'Pitch · Intro',
  pitch_problem_laboratoriazo: 'Pitch · El problema',
  wrap: 'Pitch · Cierre',
};

export function getPitchStepBadgeText(stepId) {
  if (PITCH_SLIDE_BADGE[stepId]) return PITCH_SLIDE_BADGE[stepId];
  const t = getPitchTourTarget(stepId);
  if (t && t.calloutLabel) return String(t.calloutLabel);
  return 'Pitch';
}
```

In `renderPitchTourStep`, replace:

```js
if (badge) badge.textContent = 'Pitch · Paso ' + idx + ' de ' + total;
```

with:

```js
if (badge) badge.textContent = getPitchStepBadgeText(pitchStepId);
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add public/js/tour-pitch.mjs public/js/tour-pitch-orchestrator.test.mjs
git commit -m "feat(pitch-tour): align dock badge with callout labels"
```

---

### Task 3: Spotlight gate + dock collapsed detection

**Files:**
- Modify: `public/js/tour-pitch.mjs`
- Modify: `public/js/tour-pitch-orchestrator.test.mjs`

- [ ] **Step 1: Write failing tests**

Add to `tour-pitch-orchestrator.test.mjs`:

```js
import { shouldApplyPitchSpotlight, isPitchDockCollapsedDom } from './tour-pitch.mjs';

test('shouldApplyPitchSpotlight false when dock collapsed', () => {
  assert.equal(shouldApplyPitchSpotlight({ tourActive: true, dockCollapsed: true }), false);
  assert.equal(shouldApplyPitchSpotlight({ tourActive: true, dockCollapsed: false }), true);
  assert.equal(shouldApplyPitchSpotlight({ tourActive: false, dockCollapsed: false }), false);
});
```

(Optional DOM test with minimal document mock if `isPitchDockCollapsedDom` reads `#tour-dock`.)

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```js
export function isPitchDockCollapsedDom() {
  var dock = document.getElementById('tour-dock');
  return !!(dock && dock.classList.contains('tour-dock-collapsed'));
}

export function shouldApplyPitchSpotlight(opts) {
  opts = opts || {};
  return !!opts.tourActive && !opts.dockCollapsed;
}

export function onPitchDockCollapsedChange(collapsed) {
  if (!pitchTourActive) return;
  if (collapsed) {
    clearPitchTourVisuals();
    showPitchScrim(false);
    syncPitchTourModalChrome(pitchStepId);
  } else {
    applyPitchVisuals(pitchStepId, { dockCollapsed: false });
  }
  schedulePitchDockPlacement();
}
```

Rename internal spotlight entry to `applyPitchVisuals(stepId, opts)`:

```js
function applyPitchVisuals(stepId, opts) {
  if (!shouldApplyPitchSpotlight({ tourActive: pitchTourActive, dockCollapsed: opts && opts.dockCollapsed })) {
    clearPitchSpotlightAncestors();
    document.querySelectorAll('.tour-spotlight-pitch, .tour-spotlight-pitch-secondary').forEach(function (el) {
      el.classList.remove('tour-spotlight-pitch', 'tour-spotlight-pitch-secondary');
    });
    return;
  }
  var t = getPitchTourTarget(stepId);
  if (!t) return;
  // existing scroll + spotlight logic, respecting resolvePitchScrollPolicy(stepId)
}
```

At top of `applyPitchVisuals`, replace page scroll with:

```js
var scrollPolicy = resolvePitchScrollPolicy(stepId);
if (scrollPolicy === 'none') {
  // skip scrollIntoView on document/window
} else if (scrollPolicy === 'target') {
  // scroll first primary selector into view (existing behavior)
}
```

Remove body of `scrollPitchTendChartIntoView` page scroll — keep only optional `modal-body` scroll:

```js
function scrollPitchTendChartModalBody() {
  var body = document.querySelector('#tend-group-modal .tend-group-modal-body');
  if (body) body.scrollTop = 0;
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(pitch-tour): gate spotlight when dock is collapsed"
```

---

### Task 4: Wire dock collapse in settings-help

**Files:**
- Modify: `public/js/features/settings-help.mjs`

- [ ] **Step 1: Import hook**

At top of `settings-help.mjs` (existing pitch imports):

```js
import { isPitchTourActive, onPitchDockCollapsedChange } from '../tour-pitch.mjs';
```

- [ ] **Step 2: Update `setTourDockCollapsed`**

After toggling class:

```js
if (document.body.classList.contains('pitch-tour-active')) {
  onPitchDockCollapsedChange(collapsed);
}
```

- [ ] **Step 3: Manual smoke** — start pitch, minimize dock, confirm no green outlines; expand, spotlights return.

- [ ] **Step 4: Commit**

```bash
git add public/js/features/settings-help.mjs
git commit -m "feat(pitch-tour): notify orchestrator when dock collapses"
```

---

### Task 5: Orchestrator refactor — `leaveStep` / `enterStep`

**Files:**
- Modify: `public/js/tour-pitch.mjs`

- [ ] **Step 1: Extract `leavePitchStep(stepId)`**

```js
function leavePitchStep(stepId) {
  if (stepId === 'pitch_modo_pase') {
    document.body.classList.remove('pitch-step-pase-mode');
    setUiDensity('normal');
    invalidatePaseBoardCache();
    if (typeof rt.renderRoundOverviewPanels === 'function') rt.renderRoundOverviewPanels();
  }
  closePitchTourOverlays({
    keepConnection: stepId === 'livesync_mobile',
    keepSettings: stepId === 'pitch_seguridad',
  });
}
```

- [ ] **Step 2: Rename `applyPitchTourStep` body → `enterPitchStep(stepId)`**

Keep all tab/modal/seed logic; **remove** spotlight/scroll calls from inside timeouts — delegate to `applyPitchVisuals` at end.

Key fixes inside `enterPitchStep`:

**`pitch_modo_pase`** — update `applyPitchPaseModeStep`:

```js
function applyPitchPaseModeStep() {
  syncPitchTourLayoutBodyClasses('pitch_modo_pase');
  if (typeof rt.setRoundOverviewMode === 'function') rt.setRoundOverviewMode(false);
  clearPaseDetailEscape();
  setUiDensity('pase');
  invalidatePaseBoardCache();
  seedPitchDemoTodos();
  switchAppTab('nota');
  syncPaseModeHeaderChip();
  renderPaseBoard();
  refreshAllTodoUIs();
}
```

**`ic_expediente_tabs`** — ensure explicit branch before generic innerTab:

```js
if (stepId === 'ic_expediente_tabs') {
  syncPitchTourLayoutBodyClasses(stepId);
  rt.switchAppTab('nota');
  rt.setRoundOverviewMode(false);
  rt.switchInnerTab('notas');
  renderNoteForm();
  return; // skip generic handler
}
```

- [ ] **Step 3: Update `pitchTourClickNext`**

```js
export function pitchTourClickNext() {
  if (!pitchTourActive) return;
  var steps = getPitchTourSteps();
  if (pitchStepId === 'wrap') { /* existing stop */ return; }
  leavePitchStep(pitchStepId);
  if (pitchTourIdx + 1 >= steps.length) return;
  pitchTourIdx += 1;
  pitchStepId = steps[pitchTourIdx];
  publishPitchGuardContext();
  enterPitchStep(pitchStepId);
  if (!isPitchFullscreenSlide(pitchStepId)) showTourDock();
  renderPitchTourStep();
  applyPitchVisuals(pitchStepId, { dockCollapsed: isPitchDockCollapsedDom() });
}
```

Replace remaining `applyPitchTourStep` call sites (`startPitchTour`, `pitchTourAdvanceAfter`) with `enterPitchStep` + `applyPitchVisuals`.

- [ ] **Step 4: Run full pitch-related tests**

```bash
node --test public/js/tour-pitch-targets.test.mjs public/js/tour-pitch-orchestrator.test.mjs public/js/tour-pitch-demo-seed.test.mjs public/js/tour-pitch-demo-sandbox.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add public/js/tour-pitch.mjs
git commit -m "refactor(pitch-tour): leaveStep/enterStep orchestrator with pase and IC fixes"
```

---

### Task 6: Chart step (⑪) — modal z-index and no page scroll

**Files:**
- Modify: `public/js/tour-pitch.mjs`
- Modify: `public/styles/modals.css` (only if dock still behind modal)

- [ ] **Step 1: Simplify `sala_tend_chart` enter path**

In `enterPitchStep`, keep timeout to open modal only:

```js
if (stepId === 'sala_tend_chart') {
  setTimeout(function () {
    if (!pitchTourActive || pitchStepId !== 'sala_tend_chart') return;
    openPitchTendChartModal();
    syncPitchTourModalChrome('sala_tend_chart');
    applyPitchVisuals('sala_tend_chart', { dockCollapsed: isPitchDockCollapsedDom() });
  }, 280);
  return;
}
```

Delete calls to `scrollPitchTendChartIntoView`.

- [ ] **Step 2: In `applyPitchVisuals` for `sala_tend_chart`**

After spotlight, ensure dock has `tour-dock--pitch-front` via existing `syncPitchTourModalChrome`.

- [ ] **Step 3: Verify CSS stack** (no change if already correct):

```css
#tour-dock.tour-dock--pitch-front { z-index: 103500; }
body.pitch-tour-tend-chart-step .tend-group-backdrop { z-index: 102000 !important; }
```

- [ ] **Step 4: Commit**

```bash
git commit -am "fix(pitch-tour): chart step skips page scroll and keeps dock above backdrop"
```

---

### Task 7: Cultivo history reconcile

**Files:**
- Modify: `public/js/tour-pitch-demo-seed.mjs`
- Create: `public/js/tour-pitch-cultivo-reconcile.test.mjs`
- Modify: `public/js/tour-pitch.mjs` (call from `enterPitchStep`)

- [ ] **Step 1: Write failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePitchCultivoHistory, PITCH_DEMO_PATIENT_ID } from './tour-pitch-demo-seed.mjs';
import { PITCH_CULTIVO_LAB_SPECS } from './tour-pitch-cultivos-some.mjs';

test('reconcilePitchCultivoHistory upserts cultivo entries with sourceText', () => {
  const labHistory = {};
  labHistory[PITCH_DEMO_PATIENT_ID] = [
    { id: 'pitch-lab-trend-1', fecha: '01/05/2026', resLabs: [], parsed: {} },
  ];
  reconcilePitchCultivoHistory(labHistory);
  const ids = labHistory[PITCH_DEMO_PATIENT_ID].map((e) => e.id);
  for (const spec of PITCH_CULTIVO_LAB_SPECS) {
    assert.ok(ids.includes(spec.id), 'missing ' + spec.id);
  }
  const uro = labHistory[PITCH_DEMO_PATIENT_ID].find((e) => e.id === PITCH_CULTIVO_LAB_SPECS[1].id);
  assert.ok(uro.sourceText && uro.sourceText.includes('ESBL'));
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```js
export function reconcilePitchCultivoHistory(labHistoryMap) {
  const pid = PITCH_DEMO_PATIENT_ID;
  const list = Array.isArray(labHistoryMap[pid]) ? labHistoryMap[pid].slice() : [];
  const byId = Object.create(null);
  list.forEach(function (entry) {
    if (entry && entry.id) byId[entry.id] = entry;
  });
  PITCH_CULTIVO_LAB_SPECS.forEach(function (spec) {
    byId[spec.id] = buildPitchLabHistoryEntry(spec);
  });
  labHistoryMap[pid] = Object.keys(byId).map(function (id) {
    return byId[id];
  });
  bumpLabHistoryRevision(pid);
}
```

In `enterPitchStep` for `pitch_cultivos`:

```js
reconcilePitchCultivoHistory(labHistory);
invalidateCultivosTableCache();
seedPitchDemoTodos();
// then renderCultivosTable in timeout
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Add test file to `package.json` `test` script**

- [ ] **Step 6: Commit**

```bash
git add public/js/tour-pitch-demo-seed.mjs public/js/tour-pitch-cultivo-reconcile.test.mjs public/js/tour-pitch.mjs package.json
git commit -m "fix(pitch-tour): reconcile cultivo lab history with sourceText for S/I/R chips"
```

---

### Task 8: Harden patient restore — `exitPitchTour`

**Files:**
- Modify: `public/js/tour-pitch-demo-seed.mjs`
- Modify: `public/js/tour-pitch.mjs`
- Modify: `public/js/app-state.mjs`
- Modify: `public/js/tour-pitch-demo-sandbox.test.mjs`

- [ ] **Step 1: Write failing test**

Add to `tour-pitch-demo-sandbox.test.mjs`:

```js
test('clearPitchDemo never leaves empty list when sandbox had real patients', () => {
  const state = makeState();
  seedPitchDemo(state);
  setPatients([]);
  setPitchPatientIsolation(true);
  clearPitchDemo(state);
  assert.ok(patients.length >= 2);
  assert.equal(patients[0].id, 'real-a');
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Harden `clearPitchDemo`**

Before filter-out-demos fallback:

```js
const restoredPatients = restorePitchPatientsBackup();
const sandbox = readPitchSandboxBackup();
const fromSandbox =
  sandbox && Array.isArray(sandbox.patients) && sandbox.patients.length
    ? sandbox.patients.slice()
    : null;

if (restoredPatients && restoredPatients.length) {
  setPatients(restoredPatients);
} else if (fromSandbox) {
  setPatients(fromSandbox);
} else {
  const filtered = patients.filter(function (p) {
    return p && !isPitchDemoPatientId(p.id);
  });
  setPatients(filtered.length ? filtered : patients);
}
```

- [ ] **Step 4: Guard `patientsForPersistence` in `app-state.mjs`**

```js
function patientsForPersistence() {
  if (_persistPatientsResolver) {
    const overridden = _persistPatientsResolver();
    if (Array.isArray(overridden) && overridden.length) return overridden;
    if (Array.isArray(overridden) && !overridden.length) {
      return patients.filter(function (p) {
        return p && p.id !== 'demo-pitch' && p.id !== 'demo-pitch-2';
      });
    }
  }
  return patients;
}
```

- [ ] **Step 5: Refactor `stopPitchTour` → call `exitPitchTour`**

```js
function exitPitchTour(opts) {
  setPersistPatientsResolver(null);
  setPitchPatientIsolation(false);
  markPitchTourSessionActive(false);
  clearPitchDemo(getPitchDemoState());
  // existing UI cleanup (dock, density, mode, overlays)
  if (opts && opts.celebrate && typeof rt.launchConfetti === 'function') rt.launchConfetti();
}

export function stopPitchTour(opts) {
  closePitchTourOverlays();
  removePitchDockListeners();
  clearPitchTourVisuals();
  pitchTourActive = false;
  pitchStepId = null;
  pitchTourIdx = 0;
  publishPitchGuardContext();
  hideTourDockPitch();
  exitPitchTour(opts);
  // reselect patient, limpiarReporte, etc.
}
```

Order: resolver null **before** `clearPitchDemo` → `saveState`.

- [ ] **Step 6: Run sandbox tests — expect PASS**

```bash
node --test public/js/tour-pitch-demo-sandbox.test.mjs
```

- [ ] **Step 7: Commit**

```bash
git add public/js/tour-pitch-demo-seed.mjs public/js/tour-pitch.mjs public/js/app-state.mjs public/js/tour-pitch-demo-sandbox.test.mjs
git commit -m "fix(pitch-tour): never persist or leave empty patient list on skip"
```

---

### Task 9: CSS — minimized dock scroll

**Files:**
- Modify: `public/styles/modals.css`

- [ ] **Step 1: Verify rules exist** (lines ~341–370). If `#tour-dock-foot` hidden by generic collapsed rule, ensure pitch override keeps `display: flex`:

```css
body.pitch-tour-active #tour-dock.tour-dock-collapsed .tour-dock-foot {
  display: flex;
}
```

- [ ] **Step 2: Confirm `.tour-spotlight-pitch` ancestors do not set `pointer-events: none`** on `#main-area`.

- [ ] **Step 3: Commit** (if changed)

```bash
git add public/styles/modals.css
git commit -m "fix(pitch-tour): keep dock foot visible when pitch dock minimized"
```

---

### Task 10: Bundle + full test run

**Files:**
- Modify: `public/js/app.bundle.mjs` (via build)
- Modify: `package.json`

- [ ] **Step 1: Add new tests to `package.json` test script**

`public/js/tour-pitch-orchestrator.test.mjs`  
`public/js/tour-pitch-cultivo-reconcile.test.mjs`

- [ ] **Step 2: Rebuild UI bundle**

```bash
npm run build:ui
```

(Use the project's documented build command if different.)

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add package.json public/js/app.bundle.mjs public/js/app.bundle.mjs.map public/js/app.bundle.meta.json
git commit -m "chore: rebuild bundle after pitch tour remediation"
```

---

### Task 11: Manual acceptance checklist

- [ ] Paso ⑪: gráfica fullscreen, dock visible, sin scroll erróneo de página
- [ ] Paso ⑯ → ⑰: listado Word luego tablero Pase con pendientes
- [ ] Paso ⑱ → ⑲: chip Interconsulta + pestaña Nota
- [ ] Dock minimizado: scroll texto, sin spotlight, Siguiente funciona
- [ ] Cultivos: chips S/I/R/ESBL + hover ATB
- [ ] Omitir tour: pacientes reales vuelven al instante
- [ ] Finalizar en slide Cierre: confetti + modo normal

---

## Spec coverage checklist

| Spec § | Task |
|--------|------|
| §3 Orchestrator | Task 5 |
| §4.1 Chart step | Task 1, 6 |
| §4.2 Listado/Pase | Task 5 |
| §4.3 IC | Task 5 |
| §4.4 Wrap | Task 5 (leaveStep/enterStep), Task 11 manual |
| §5 Dock minimized | Task 3, 4, 9 |
| §5.4 Badge | Task 2 |
| §6 Cultivos | Task 7 |
| §6 Pendientes | Task 5 (seed in pase/cultivos) |
| §6 Hover ATB | Task 9 CSS verify |
| §7 exitPitchTour | Task 8 |
| §8 Tests | Tasks 1–8, 10 |
