# Onboarding Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the Sala guided tour for a lab-first “first win,” split Neo into an optional companion module, add chapter progress + back/pause/resume, and consolidate learning entry points under **Aprender R+**.

**Architecture:** New `onboarding-curriculum.mjs` owns step order, chapters, and hub module metadata; `onboarding-progress.mjs` owns `localStorage` read/write. `tour-targets.mjs` keeps DOM targets; `getSalaTourSteps()` re-exports from curriculum. `settings-help.mjs` gains dock navigation and idempotent action steps; help UI moves tours into one hub section.

**Tech Stack:** Vanilla JS (ES modules), Node built-in test runner, existing `#tour-dock` / spotlight classes, `npm run build:ui` for bundle sync.

**Spec:** `docs/superpowers/specs/2026-05-31-onboarding-overhaul-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `public/js/onboarding-curriculum.mjs` | **Create** — `SALA_CHAPTERS`, `IC_CHAPTERS`, `NEO_COMPANION`, `CURRICULUM_VERSION`, helpers |
| `public/js/onboarding-curriculum.test.mjs` | **Create** — order, 19 Sala steps, Neo excluded from base, `servicio_default` after `lab_view` |
| `public/js/onboarding-progress.mjs` | **Create** — `GUIDED_TOUR_PROGRESS_LS_KEY`, load/save/clear, migrate invalid `stepId` |
| `public/js/onboarding-progress.test.mjs` | **Create** — round-trip JSON, clear on complete |
| `public/js/tour-targets.mjs` | Import Sala/IC step arrays from curriculum; remove inline `SALA_STEPS` / reorder |
| `public/js/tour-targets.test.mjs` | Replace assertions for new order (21→19 Sala, no Neo in base) |
| `public/js/features/settings-help.mjs` | Prev/pause/resume, chapter badge, cap.1 milestone, idempotency, Neo mode, hub handlers |
| `public/partials/chrome/header.html` | Aprender R+ hub; shorter intro; remove loose mini-tour buttons |
| `public/styles/modals.css` | `.help-learn-hub`, `.tour-chapter-pills`, dock foot layout |
| `package.json` | Add new `*.test.mjs` paths to `"test"` script |
| `public/js/app.bundle.mjs` | Regenerate via `npm run build:ui` after JS changes |

---

## Reviewer mitigations (incorporated)

| Riesgo | Mitigación en código |
|--------|----------------------|
| **Resume con modales abiertos** (spotlight detrás de Ajustes/Perfil) | `resetTourUiBeforeResume()` antes de `applyTourTargetForStep` en resume y en `startOnboarding(..., { resumeStepId })` — Task 4 Step 3b |
| **`ReferenceError` en hub** si ayuda se abre antes de boot | Registrar handlers solo en `settingsHelpWindowHandlers` (asignados en `app.js` línea 82 vía `Object.assign(window, …)` al cargar el módulo). **No** usar `window.startTourModule = …` tardío en settings-help — Task 7 Step 2 |
| **CI / `node --test` + ESM** | Los `.mjs` ya se usan en el repo (`tour-targets.test.mjs`, etc.). Task 9: correr `node --version` y `npm test`; si falla, añadir `"type": "module"` solo si hiciera falta (hoy no debería) |

**Fortalezas confirmadas (no cambiar enfoque):** TDD en curriculum/progress primero; Task 5 idempotencia; Task 6 `guidedTourMode = 'neo'` fuera del lineal de 19 pasos.

---

### Task 1: Onboarding curriculum module

**Files:**
- Create: `public/js/onboarding-curriculum.mjs`
- Create: `public/js/onboarding-curriculum.test.mjs`
- Modify: `package.json` (add test file to `"test"`)

- [ ] **Step 1: Write the failing test**

Create `public/js/onboarding-curriculum.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRICULUM_VERSION,
  getSalaTourSteps,
  getInterconsultaTourSteps,
  getNeoCompanionSteps,
  getChapterForStep,
  getChapterProgressLabel,
  HUB_MODULES,
} from './onboarding-curriculum.mjs';

test('getSalaTourSteps has 19 base steps without Neo', () => {
  const steps = getSalaTourSteps();
  assert.equal(steps.length, 19);
  assert.ok(!steps.includes('sala_casiopea_lab'));
  assert.ok(!steps.includes('sala_casiopea_trends'));
  assert.equal(steps[0], 'map_sidebar');
  assert.equal(steps.indexOf('lab_view'), 5);
  assert.equal(steps.indexOf('servicio_default'), 6);
  assert.equal(steps.indexOf('sala_expediente_tabs'), 7);
  assert.equal(steps[steps.length - 1], 'wrap');
});

test('getNeoCompanionSteps is separate', () => {
  assert.deepEqual(getNeoCompanionSteps(), ['sala_casiopea_lab', 'sala_casiopea_trends']);
});

test('getChapterForStep maps servicio_default to ch-patient-lab', () => {
  const ch = getChapterForStep('servicio_default', 'sala');
  assert.equal(ch.id, 'ch-patient-lab');
  assert.match(ch.title, /Paciente|laboratorio/i);
});

test('getChapterProgressLabel for step in chapter 2', () => {
  const label = getChapterProgressLabel('historia_clinica', 'sala');
  assert.match(label.chapterTitle, /Expediente/);
  assert.ok(label.stepInChapter >= 1);
  assert.ok(label.chapterSteps >= 1);
});

test('HUB_MODULES includes neo extension', () => {
  const neo = HUB_MODULES.find((m) => m.id === 'neo-lab');
  assert.ok(neo);
  assert.equal(neo.companion, 'neo');
});

test('getInterconsultaTourSteps still lab-first and no Neo', () => {
  const steps = getInterconsultaTourSteps();
  assert.equal(steps.indexOf('lab_parse'), steps.indexOf('map_lab_teaser') + 2);
  assert.ok(!steps.includes('sala_casiopea_lab'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/onboarding-curriculum.test.mjs`  
Expected: FAIL — cannot find module `./onboarding-curriculum.mjs`

- [ ] **Step 3: Write minimal implementation**

Create `public/js/onboarding-curriculum.mjs`:

```js
export const CURRICULUM_VERSION = 1;

export const SALA_CHAPTERS = [
  {
    id: 'ch-patient-lab',
    title: 'Paciente y laboratorio',
    stepIds: [
      'map_sidebar',
      'map_tabs',
      'map_lab_teaser',
      'lab_bulk_separator',
      'lab_parse',
      'lab_view',
      'servicio_default',
    ],
  },
  {
    id: 'ch-chart',
    title: 'Expediente',
    stepIds: ['sala_expediente_tabs', 'historia_clinica', 'eventualidades'],
  },
  {
    id: 'ch-clinical-tools',
    title: 'Clínico avanzado',
    stepIds: ['sala_manejo', 'sala_tend', 'sala_tend_chart'],
  },
  {
    id: 'ch-round',
    title: 'Ronda y salida',
    stepIds: ['estado_actual', 'sala_med', 'listado_problemas'],
  },
  {
    id: 'ch-team',
    title: 'Equipo',
    stepIds: ['livesync_desktop', 'livesync_mobile', 'wrap'],
  },
];

/** Interconsulta: lab block first (sin Neo; sin servicio_default en v1). */
export const IC_CHAPTERS = [
  {
    id: 'ch-ic-lab',
    title: 'Paciente y laboratorio',
    stepIds: [
      'map_sidebar',
      'map_tabs',
      'map_lab_teaser',
      'lab_bulk_separator',
      'lab_parse',
      'lab_view',
    ],
  },
  {
    id: 'ch-ic-chart',
    title: 'Expediente y clínico',
    stepIds: [
      'ic_expediente_tabs',
      'sala_manejo',
      'sala_tend',
      'sala_tend_chart',
      'sala_soap',
      'sala_med',
      'ic_nota',
      'ic_indica',
    ],
  },
  {
    id: 'ch-ic-settings',
    title: 'Ajustes y perfil',
    stepIds: ['ic_exports', 'profile'],
  },
  {
    id: 'ch-ic-team',
    title: 'Equipo',
    stepIds: ['livesync_desktop', 'livesync_mobile', 'wrap'],
  },
];

export const NEO_COMPANION = {
  companion: 'neo',
  title: 'Neo (app companion)',
  stepIds: ['sala_casiopea_lab', 'sala_casiopea_trends'],
};

export const HUB_MODULES = [
  { id: 'mod-ch1', chapterId: 'ch-patient-lab', label: 'Laboratorio y pacientes', branch: 'sala' },
  { id: 'mod-ch2', chapterId: 'ch-chart', label: 'Expediente', branch: 'sala' },
  { id: 'mod-ch3', chapterId: 'ch-clinical-tools', label: 'Clínico avanzado', branch: 'sala' },
  { id: 'mod-ch4', chapterId: 'ch-round', label: 'Ronda y salida', branch: 'sala' },
  { id: 'mod-ch5', chapterId: 'ch-team', label: 'Equipo (LiveSync + móvil)', branch: 'sala' },
  { id: 'neo-lab', companion: 'neo', label: 'Neo · Laboratorio', startStepId: 'sala_casiopea_lab', branch: 'sala' },
  { id: 'neo-trends', companion: 'neo', label: 'Neo · Tendencias', startStepId: 'sala_casiopea_trends', branch: 'sala' },
];

function chaptersForBranch(branch) {
  return branch === 'interconsulta' ? IC_CHAPTERS : SALA_CHAPTERS;
}

export function getSalaTourSteps() {
  return SALA_CHAPTERS.flatMap((c) => c.stepIds.slice());
}

export function getInterconsultaTourSteps() {
  return IC_CHAPTERS.flatMap((c) => c.stepIds.slice());
}

export function getNeoCompanionSteps() {
  return NEO_COMPANION.stepIds.slice();
}

export function getChapterForStep(stepId, branch) {
  const chapters = chaptersForBranch(branch);
  for (const ch of chapters) {
    if (ch.stepIds.includes(stepId)) return ch;
  }
  if (NEO_COMPANION.stepIds.includes(stepId)) return { id: 'ch-neo', title: NEO_COMPANION.title };
  return { id: 'unknown', title: '' };
}

export function getChapterProgressLabel(stepId, branch) {
  const ch = getChapterForStep(stepId, branch);
  const chapters = chaptersForBranch(branch);
  const chapter = chapters.find((c) => c.id === ch.id);
  if (!chapter) {
    const neoIdx = NEO_COMPANION.stepIds.indexOf(stepId);
    return {
      chapterTitle: NEO_COMPANION.title,
      stepInChapter: neoIdx + 1,
      chapterSteps: NEO_COMPANION.stepIds.length,
      chapterIndex: 0,
      chapterCount: 1,
      isCompanion: true,
    };
  }
  const stepInChapter = chapter.stepIds.indexOf(stepId) + 1;
  return {
    chapterTitle: chapter.title,
    stepInChapter,
    chapterSteps: chapter.stepIds.length,
    chapterIndex: chapters.findIndex((c) => c.id === chapter.id) + 1,
    chapterCount: chapters.length,
    isCompanion: false,
  };
}

export function getFirstStepIdForChapter(chapterId, branch) {
  const ch = chaptersForBranch(branch).find((c) => c.id === chapterId);
  return ch && ch.stepIds.length ? ch.stepIds[0] : null;
}

export function isValidStepForBranch(stepId, branch, mode) {
  if (mode === 'neo') return NEO_COMPANION.stepIds.includes(stepId);
  const steps = branch === 'interconsulta' ? getInterconsultaTourSteps() : getSalaTourSteps();
  return steps.includes(stepId);
}
```

Add to `package.json` `"test"` array (append):

`public/js/onboarding-curriculum.test.mjs`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test public/js/onboarding-curriculum.test.mjs`  
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/onboarding-curriculum.mjs public/js/onboarding-curriculum.test.mjs package.json
git commit -m "feat(onboarding): add curriculum module with Sala chapters and Neo split"
```

---

### Task 2: Wire tour-targets to curriculum

**Files:**
- Modify: `public/js/tour-targets.mjs`
- Modify: `public/js/tour-targets.test.mjs`

- [ ] **Step 1: Write the failing test**

Replace the first test in `public/js/tour-targets.test.mjs` with:

```js
test('getSalaTourSteps orden overhaul: lab primero, servicio tras lab_view, sin Neo', () => {
  const steps = getSalaTourSteps();
  assert.equal(steps.length, 19);
  assert.equal(steps.indexOf('servicio_default'), steps.indexOf('lab_view') + 1);
  assert.equal(steps.indexOf('sala_expediente_tabs'), steps.indexOf('servicio_default') + 1);
  assert.ok(!steps.includes('sala_casiopea_lab'));
  assert.ok(!steps.includes('sala_casiopea_trends'));
  assert.equal(steps[steps.length - 1], 'wrap');
});
```

Remove obsolete assertions that reference Neo indices and `steps.length === 21`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/tour-targets.test.mjs`  
Expected: FAIL on length 19 or servicio index

- [ ] **Step 3: Update tour-targets.mjs**

At top of `public/js/tour-targets.mjs`, add:

```js
import {
  getSalaTourSteps as curriculumSalaSteps,
  getInterconsultaTourSteps as curriculumIcSteps,
  getNeoCompanionSteps,
} from './onboarding-curriculum.mjs';

export { getNeoCompanionSteps };
```

Remove the inline `SALA_STEPS` and `INTERCONSULTA_STEPS` arrays. Change exports:

```js
export function getSalaTourSteps() {
  return curriculumSalaSteps();
}

export function getInterconsultaTourSteps() {
  return curriculumIcSteps();
}
```

Keep `TARGETS`, `ACTION_STEPS`, `getTourTarget`, `getTourSteps` unchanged.

- [ ] **Step 4: Run tests**

Run: `node --test public/js/tour-targets.test.mjs public/js/onboarding-curriculum.test.mjs`  
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/tour-targets.mjs public/js/tour-targets.test.mjs
git commit -m "feat(onboarding): derive Sala/IC tour order from curriculum"
```

---

### Task 3: Progress persistence module

**Files:**
- Create: `public/js/onboarding-progress.mjs`
- Create: `public/js/onboarding-progress.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `public/js/onboarding-progress.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIDED_TOUR_PROGRESS_LS_KEY,
  loadTourProgress,
  saveTourProgress,
  clearTourProgress,
} from './onboarding-progress.mjs';

const mem = new Map();

test('save and load round-trip', () => {
  const storage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k),
  };
  saveTourProgress(
    { branch: 'sala', stepId: 'lab_view', chapterId: 'ch-patient-lab', mode: 'base' },
    storage,
  );
  const p = loadTourProgress(storage);
  assert.equal(p.stepId, 'lab_view');
  assert.equal(p.branch, 'sala');
});

test('clearTourProgress removes key', () => {
  const storage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k),
  };
  mem.set(GUIDED_TOUR_PROGRESS_LS_KEY, '{}');
  clearTourProgress(storage);
  assert.equal(loadTourProgress(storage), null);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test public/js/onboarding-progress.test.mjs`

- [ ] **Step 3: Implement**

Create `public/js/onboarding-progress.mjs`:

```js
import { CURRICULUM_VERSION, isValidStepForBranch } from './onboarding-curriculum.mjs';

export const GUIDED_TOUR_PROGRESS_LS_KEY = 'rpc-guided-tour-progress';

export function loadTourProgress(storage = localStorage) {
  try {
    const raw = storage.getItem(GUIDED_TOUR_PROGRESS_LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !p.stepId || !p.branch) return null;
    const mode = p.mode === 'neo' ? 'neo' : 'base';
    if (!isValidStepForBranch(p.stepId, p.branch, mode)) return null;
    return p;
  } catch (_e) {
    return null;
  }
}

export function saveTourProgress(payload, storage = localStorage) {
  const body = {
    branch: payload.branch,
    stepId: payload.stepId,
    chapterId: payload.chapterId || null,
    mode: payload.mode === 'neo' ? 'neo' : 'base',
    curriculumVersion: CURRICULUM_VERSION,
    updatedAt: Date.now(),
  };
  storage.setItem(GUIDED_TOUR_PROGRESS_LS_KEY, JSON.stringify(body));
}

export function clearTourProgress(storage = localStorage) {
  try {
    storage.removeItem(GUIDED_TOUR_PROGRESS_LS_KEY);
  } catch (_e) {}
}
```

Add `public/js/onboarding-progress.test.mjs` to `package.json` `"test"`.

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add public/js/onboarding-progress.mjs public/js/onboarding-progress.test.mjs package.json
git commit -m "feat(onboarding): add tour progress localStorage helpers"
```

---

### Task 4: Dock — Anterior, Pausar, Continuar, chapter badge

**Files:**
- Modify: `public/partials/chrome/header.html` (dock foot buttons)
- Modify: `public/styles/modals.css`
- Modify: `public/js/features/settings-help.mjs`

- [ ] **Step 1: Update dock HTML**

In `header.html` `#tour-dock` `.tour-dock-foot`, add before skip:

```html
<button type="button" class="btn-tour-prev" id="tour-btn-prev" onclick="guidedTourClickPrev()" disabled>Anterior</button>
<button type="button" class="btn-tour-pause" id="tour-btn-pause" onclick="guidedTourPause()">Pausar</button>
```

- [ ] **Step 2: Import progress + curriculum in settings-help.mjs**

```js
import {
  getChapterProgressLabel,
  getChapterForStep,
  getFirstStepIdForChapter,
  getNeoCompanionSteps,
} from '../onboarding-curriculum.mjs';
import {
  loadTourProgress,
  saveTourProgress,
  clearTourProgress,
} from '../onboarding-progress.mjs';
```

Add state: `var guidedTourMode = 'base';` (`'base' | 'neo'`).

Update `getGuidedTourSteps()`:

```js
function getGuidedTourSteps() {
  if (guidedTourMode === 'neo') return getNeoCompanionSteps();
  return getTourSteps(guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala');
}
```

- [ ] **Step 3: Implement `guidedTourClickPrev`**

```js
function guidedTourClickPrev() {
  if (!guidedTourActive || miniTourActive) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourStepId);
  if (i <= 0) return;
  clearAllTourSpotlights();
  tourStepId = steps[i - 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourStepId);
  renderTourStep();
  persistTourProgressDebounced();
}
```

Add `guidedTourClickPrev`, `guidedTourPause` to `settingsHelpWindowHandlers` (mismo patrón que `guidedTourClickNext`).

- [ ] **Step 3b: `resetTourUiBeforeResume()` (obligatorio antes de restaurar paso)**

Centralizar cierre de capas que tapan el spotlight. Llamar desde `resumeGuidedTourFromProgress()` y al inicio de `startOnboarding` cuando `opts.resumeStepId` está definido:

```js
function resetTourUiBeforeResume() {
  clearAllTourSpotlights();
  clearTourSoapButtonHighlight();
  if (typeof closeSettingsDropdown === 'function') closeSettingsDropdown();
  if (typeof closeConnectionDropdown === 'function') closeConnectionDropdown();
  rt.closeProfileModal();
  closeLabSomeTablesModal();
  closeLabBulkTourHintModal();
  closeSesionIngresoTrendsSendModal();
  closeTendGroupModal();
  closeSOAPModal();
  hideTourIntroModal();
  closeQuickHelp();
}
```

Luego: `setUiDensity('normal')`, alinear `appMode` con rama (`applyAppModeSwitchEffects` si aplica), `requestAnimationFrame` o `setTimeout(0)` antes de `applyTourTargetForStep(resumeStepId)` para que el DOM haya cerrado modales.

- [ ] **Step 4: Implement `guidedTourPause` and resume**

```js
function guidedTourPause() {
  if (!guidedTourActive) return;
  var ch = getChapterForStep(tourStepId, guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala');
  saveTourProgress({
    branch: guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala',
    stepId: tourStepId,
    chapterId: ch.id,
    mode: guidedTourMode,
  });
  guidedTourActive = false;
  publishTourGuardContext();
  hideTourDock();
  rt.showToast('Tutorial pausado. Continúa desde Aprender R+.', 'info');
  syncLearnHubContinueVisibility();
}

export function resumeGuidedTourFromProgress() {
  var p = loadTourProgress();
  if (!p) return false;
  guidedTourBranch = p.branch === 'interconsulta' ? 'interconsulta' : 'sala';
  guidedTourMode = p.mode === 'neo' ? 'neo' : 'base';
  resetTourUiBeforeResume();
  startOnboarding(guidedTourBranch, { resumeStepId: p.stepId, skipIntro: true });
  return true;
}
```

Extend `startOnboarding(branch, opts)` to accept `opts.resumeStepId` and `opts.skipIntro`: seed demo, set `guidedTourActive = true`, jump to step instead of always `steps[0]`.

On each `guidedTourClickNext` / `guidedTourAdvanceAfter`, call `persistTourProgressDebounced()`.

In `completeGuidedTourWithCelebration` and `skipGuidedTour`, call `clearTourProgress()`.

- [ ] **Step 5: Update `renderTourStep` badge**

Replace `setBadge` usage:

```js
var prog = getChapterProgressLabel(
  tourStepId,
  guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala',
);
var sub = prog.isCompanion
  ? 'Extensión · Neo · Paso ' + prog.stepInChapter + ' de ' + prog.chapterSteps
  : 'Cap. ' + prog.chapterIndex + '/' + prog.chapterCount + ' · ' + prog.chapterTitle
    + ' · Paso ' + prog.stepInChapter + '/' + prog.chapterSteps;
setBadge(sub);
```

Sync `#tour-btn-prev.disabled = (guidedTourStepIndex() <= 0)`.

- [ ] **Step 6: Chapter 1 completion toast**

In `guidedTourClickNext`, when leaving `servicio_default` (last step of ch-patient-lab), before advancing:

```js
if (tourStepId === 'servicio_default' && guidedTourMode === 'base' && guidedTourBranch !== 'interconsulta') {
  rt.showToast('Listo: DEMO PÉREZ ya tiene laboratorio en R+.', 'success');
}
```

- [ ] **Step 7: Manual smoke**

Run app, start Sala tour, verify Anterior/Pausar/Continuar.

- [ ] **Step 8: Commit**

```bash
git add public/partials/chrome/header.html public/styles/modals.css public/js/features/settings-help.mjs
git commit -m "feat(onboarding): dock prev/pause/resume and chapter badges"
```

---

### Task 5: Idempotent ACTION_STEPS (lab_parse, servicio_default)

**Files:**
- Modify: `public/js/features/settings-help.mjs`

- [ ] **Step 1: Add helper**

```js
function demoLabAlreadyProcessedForTour() {
  var id = DEMO_PATIENT_ID;
  var hist = labHistory && labHistory[id];
  return !!(hist && (Array.isArray(hist) ? hist.length : Object.keys(hist).length));
}

function syncTourActionNextButton() {
  var nextBtn = document.getElementById('tour-btn-next');
  if (!nextBtn || !guidedTourActive) return;
  if (tourStepId === 'lab_parse' && demoLabAlreadyProcessedForTour()) {
    nextBtn.style.display = '';
    nextBtn.disabled = false;
    nextBtn.textContent = 'Siguiente';
  }
  if (tourStepId === 'servicio_default') {
    var st = rt.getSettings();
    if (st && String(st.defaultServicio || '').trim()) {
      nextBtn.style.display = '';
      nextBtn.textContent = 'Siguiente';
    }
  }
}
```

Call `syncTourActionNextButton()` at end of `renderTourStep` and after `guidedTourAdvanceAfter('lab_parse')`.

- [ ] **Step 2: Adjust `lab_parse` case copy in `renderTourStep`**

When `demoLabAlreadyProcessedForTour()`, append muted line: *Ya procesaste el ejemplo; puedes continuar.*

- [ ] **Step 3: Commit**

```bash
git add public/js/features/settings-help.mjs
git commit -m "feat(onboarding): idempotent Siguiente on lab_parse and servicio_default"
```

---

### Task 6: Neo companion tour mode + hub module entry

**Files:**
- Modify: `public/js/features/settings-help.mjs`

- [ ] **Step 1: `startNeoCompanionTour(startStepId)`**

```js
export function startNeoCompanionTour(startStepId) {
  if (guidedTourActive) {
    rt.showToast('Finaliza el tutorial actual primero.', 'error');
    return;
  }
  guidedTourMode = 'neo';
  guidedTourBranch = 'sala';
  startOnboarding('sala', { resumeStepId: startStepId || 'sala_casiopea_lab', skipIntro: true });
}
```

Ensure `getGuidedTourSteps()` uses neo steps; badge shows companion label (Task 4).

- [ ] **Step 2: Neo steps copy prefix in renderTourStep**

For `sala_casiopea_lab` / `sala_casiopea_trends`, prepend muted: *R+ funciona sin Neo; módulo opcional.*

- [ ] **Step 3: Commit**

```bash
git add public/js/features/settings-help.mjs
git commit -m "feat(onboarding): Neo companion tour mode separate from base Sala"
```

---

### Task 7: Aprender R+ hub UI

**Files:**
- Modify: `public/partials/chrome/header.html`
- Modify: `public/styles/modals.css`
- Modify: `public/js/features/settings-help.mjs`

- [ ] **Step 1: Replace help tour section in `header.html`**

Remove standalone buttons for mini-tours Lab/Ajustes and duplicate “Tutorial guiado”. Insert:

```html
<div class="help-learn-hub" id="help-learn-hub">
  <h4 class="help-learn-title">Aprender R+</h4>
  <button type="button" class="help-tour-btn help-learn-continue" id="btn-learn-continue" style="display:none;" onclick="resumeGuidedTourFromProgress()">Continuar tutorial</button>
  <button type="button" class="help-tour-btn" onclick="resetAndStartOnboarding()">Reiniciar tutorial · Sala</button>
  <button type="button" class="help-tour-btn" onclick="startHelpTourInterconsulta()">Tutorial · Interconsulta</button>
  <p class="help-learn-sub">Módulos</p>
  <button type="button" class="help-tour-btn" onclick="startTourModule('ch-patient-lab')">Laboratorio y pacientes</button>
  <!-- ch-chart, ch-clinical-tools, ch-round, ch-team -->
  <p class="help-learn-sub">Extensiones</p>
  <button type="button" class="help-tour-btn" onclick="startNeoCompanionTour('sala_casiopea_lab')">Neo · Laboratorio</button>
  <button type="button" class="help-tour-btn" onclick="startNeoCompanionTour('sala_casiopea_trends')">Neo · Tendencias</button>
  <details class="help-learn-advanced">
    <summary>Avanzado</summary>
    <!-- presentation, import DEMO, pitch button if unlocked -->
  </details>
</div>
```

Mirror same block in `public/index.src.html` if project builds from src.

- [ ] **Step 2: Implement hub handlers + register on `settingsHelpWindowHandlers`**

**No** asignar funciones sueltas en `window` dentro de settings-help. Añadir al objeto exportado (patrón existente en `app.js`):

```js
export const settingsHelpWindowHandlers = {
  // ...existing...
  guidedTourClickPrev,
  guidedTourPause,
  resumeGuidedTourFromProgress,
  startTourModule,
  startHelpTourInterconsulta,
  startNeoCompanionTour,
};
```

Implementación:

```js
function startTourModule(chapterId) {
  var branch = chapterId.startsWith('ch-ic') ? 'interconsulta' : 'sala';
  var stepId = getFirstStepIdForChapter(chapterId, branch);
  if (!stepId) return;
  if (guidedTourActive) {
    rt.showToast('Finaliza o pausa el tutorial actual primero.', 'error');
    return;
  }
  guidedTourMode = 'base';
  resetTourUiBeforeResume();
  startOnboarding(branch, { resumeStepId: stepId, skipIntro: true });
}

function startHelpTourInterconsulta() {
  closeQuickHelp();
  showTourIntroModal(); // o forzar rama IC: guidedTourIntroChooseInterconsulta()
}
```

HTML sigue usando `onclick="startTourModule('ch-patient-lab')"` — nombre global disponible tras carga síncrona de `app.js`. Si el botón pudiera mostrarse antes del bundle: deshabilitar `#help-quick-backdrop` hasta `DOMContentLoaded` (ya es modal cerrado; riesgo bajo).

Verificar `public/js/features/settings-help-imports.test.mjs` incluye los nuevos exports si ese test lista handlers obligatorios.

- [ ] **Step 3: `syncLearnHubContinueVisibility` on open help**

Call from `openQuickHelp()`:

```js
var btn = document.getElementById('btn-learn-continue');
if (btn) btn.style.display = loadTourProgress() ? '' : 'none';
```

- [ ] **Step 4: Settings dropdown CTA**

Update `settings-help-cta-hint` text to mention **Aprender R+** only.

- [ ] **Step 5: Commit**

```bash
git add public/partials/chrome/header.html public/styles/modals.css public/js/features/settings-help.mjs public/index.src.html
git commit -m "feat(onboarding): Aprender R+ hub replaces scattered tour buttons"
```

---

### Task 8: Shorter intro modal copy

**Files:**
- Modify: `public/partials/chrome/header.html` (and `index.src.html`)

- [ ] **Step 1: Replace intro lead and card bodies**

`intro-lead` (~2 líneas): DEMO PÉREZ, ~15 min, pausable, no guarda datos reales.

Sala card: lab primero → expediente → equipo; quitar listado de sub-pestañas.

Interconsulta card: lab → expediente → Word/receta → sync.

Keep two equal cards; keep Omitir.

- [ ] **Step 2: Commit**

```bash
git add public/partials/chrome/header.html public/index.src.html
git commit -m "docs(ui): shorten onboarding intro copy"
```

---

### Task 9: Bundle, full test, release note line

**Files:**
- Modify: `docs/RELEASE_NOTES_6.5.0.txt` (or current version file)
- Modify: `public/js/app.bundle.mjs` via build

- [ ] **Step 1: Verify Node test runner + run full tests**

Run:

```bash
node --version   # debe ser ≥18 (test runner ESM nativo para .mjs)
node --test public/js/onboarding-curriculum.test.mjs public/js/onboarding-progress.test.mjs
npm test
```

Expected: PASS. Si `Cannot use import statement outside a module`, confirmar que los nuevos archivos usan extensión `.mjs` y rutas listadas en `package.json` `"test"` (mismo patrón que `public/js/tour-targets.test.mjs`).

- [ ] **Step 2: Rebuild UI bundle**

Run: `npm run build:ui`  
Expected: `app.bundle.mjs` includes new imports

- [ ] **Step 3: Add release note bullet**

One line: onboarding reorder, Aprender R+ hub, pause/resume, Neo optional module.

- [ ] **Step 4: Commit**

```bash
git add docs/RELEASE_NOTES_6.5.0.txt public/js/app.bundle.mjs public/js/app.bundle.mjs.map public/js/app.bundle.meta.json
git commit -m "chore: bundle and release notes for onboarding overhaul"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Sala 19 steps, servicio after lab_view | 1, 2 |
| Neo outside base linear | 1, 2, 6 |
| Anterior / Pausar / Continuar | 3, 4, 7 |
| Idempotent lab back-nav | 5 |
| Aprender R+ hub, no loose mini-tours | 7 |
| Shorter intro, two cards | 8 |
| Chapter badge + cap.1 toast | 4 |
| IC lab-first, no Neo | 1 |
| Tests in CI | 1–3, 9 |
| Pitch unchanged | 7 (advanced only) |

## Manual test checklist

- [ ] Fresh profile: intro → Sala → complete cap.1 through servicio_default → toast victoria
- [ ] Pausar en paso 10 → reload → Continuar tutorial restores step
- [ ] **Resume:** pausar en paso con `openProfile` / Ajustes abierto → Continuar → spotlight visible (sin modal encima)
- [ ] Anterior from expediente no borra lab en DEMO PÉREZ
- [ ] Anterior a `lab_parse` con lab ya procesado → **Siguiente** visible (Task 5)
- [ ] Base tour never shows Neo steps; Neo module opens 2-step companion
- [ ] Help hub has no “Laboratorio (breve)” / “Ajustes (breve)” top-level buttons
