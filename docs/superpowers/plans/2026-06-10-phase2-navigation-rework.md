# Premium UI Phase 2 — Navigation Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Expediente's two-level tab navigation with a single grouped-pill row, add an always-visible context header with a segmented mode selector (Sala · Interconsulta · Guardia · Pase), and add a ⌘K fuzzy command palette for sections and patients.

**Architecture:** All navigation state continues to flow through the existing maps and switch functions — `public/js/expediente-tabs.mjs` (group/section maps, target resolution) and `public/js/features/pase-board.mjs` (`switchInnerTab`, `switchConsolidatedTab`, `switchAppTab`). New pure modules (`expediente-group-row.mjs`, `fuzzy-match.mjs`, `command-palette-model.mjs`, `header-context.mjs` helpers) are unit-tested with `node:test`; thin DOM renderers consume them. The grouped row is wide-window-only (≥1100px); below that, CSS automatically falls back to the existing consolidated tabs + segment bars, which stay fully wired. The dead granular tab path is deleted first.

**Tech Stack:** Vanilla ESM, vanilla CSS with phase-1 tokens (`--elev-*`, `--state-*`, `--dur-*`, `--ease-out`, `--border-hairline`, `--focus-ring`, motion presets), `node:test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-10-premium-ui-audit-remediation-design.md` (Phase 2 section). The "desktop surface rollout" bullet of Phase 2 (restyling Expediente panes, Laboratorio, sidebar, boards, modals — one surface per commit) is **out of scope here** and gets its own plan after this merges. The J/K keyboard hint is deferred to that rollout plan; this plan surfaces only the ⌘K hint.

**Critical context for the implementer:**
- Work in the worktree `.worktrees/phase1-design-system`. Before Task 1, create the phase-2 branch off phase 1: `git switch -c feature/phase2-navigation` (phase 1 is complete on `feature/phase1-design-system`, including the `no-blur` Electron fix).
- `public/index.html` is GENERATED from `public/index.src.html` + `public/partials/` by `npm run build:ui`. Never edit `public/index.html` directly. After any partial/src change, rebuild and commit the regenerated bundle files (`public/index.html`, `public/js/app.bundle.*`, `public/js/chunks/`) together with the source change.
- `npm test` runs a HAND-MAINTAINED file list in `package.json`. Every new `*.test.mjs` file MUST be appended to that list or it will never run.
- Quick visual check: `node server.js` then open `http://localhost:3738`. Full app: `npm start`.
- New markup must be CSP-clean: no inline `style="..."` attributes on NEW elements, no eval. (Assigning `el.style.x` from JS is fine.)
- Repo idiom: `var`-style function bodies, Spanish UI strings hardcoded in markup/JS, `window.*` onclick globals registered via per-module `windowHandlers` exports aggregated in `public/js/app.js`.
- Line numbers below were verified against the branch at plan time. If an anchor has drifted, locate it by the quoted code, not the number.

---

### Task 1: Delete the unused granular tab code path

`useConsolidatedExpedienteTabs()` is hardcoded `true` (`public/js/expediente-tabs.mjs:154`), so every granular-mode branch is dead. The spec says delete it, not preserve it. The consolidated tabs + segment bars REMAIN (they are the narrow-window fallback).

**Files:**
- Modify: `public/js/expediente-tabs.mjs`
- Modify: `public/js/features/pase-board.mjs`
- Modify: `public/partials/layout/app-body.html`
- Modify: `public/js/expediente-tabs.test.mjs`

- [ ] **Step 1: Create the branch**

```bash
cd .worktrees/phase1-design-system
git switch -c feature/phase2-navigation
```

- [ ] **Step 2: Delete dead exports from `expediente-tabs.mjs`**

Delete these three blocks entirely:

1. The `useConsolidatedExpedienteTabs` function (~line 154):
```js
export function useConsolidatedExpedienteTabs(_settings) {
  return true;
}
```
2. The `mountGranularFlat()` function (~line 301, the whole function including its `CONSOLIDATED_TABS_SALA.forEach` tail).
3. The `GRANULAR_TABS` export (top of file, the array of 10 ids). Keep the private `GRANULAR_PANE_ORDER` — it drives pane mounting and is still used.

Then simplify `applyExpedientePaneLayout` (~line 360). Replace:

```js
export function applyExpedientePaneLayout(consolidated, settings) {
  var sala = isModeSala(settings);
  if (consolidated) {
    syncConsolidatedSegmentBarVisibility(settings || {});
  }
  var next = consolidated ? (sala ? 'consolidated-sala' : 'consolidated-inter') : 'granular';
  if (layoutMode === next) return;
  layoutMode = next;
  if (consolidated) {
    mountConsolidatedNested(settings || {});
    restoreDatosCollapsePreference();
    wireDatosCollapsePersistence();
    syncConsolidatedSegmentBarVisibility(settings || {});
  } else {
    mountGranularFlat();
  }
}
```

with:

```js
export function applyExpedientePaneLayout(settings) {
  var sala = isModeSala(settings);
  syncConsolidatedSegmentBarVisibility(settings || {});
  var next = sala ? 'consolidated-sala' : 'consolidated-inter';
  if (layoutMode === next) return;
  layoutMode = next;
  mountConsolidatedNested(settings || {});
  restoreDatosCollapsePreference();
  wireDatosCollapsePersistence();
  syncConsolidatedSegmentBarVisibility(settings || {});
}
```

- [ ] **Step 3: Remove the granular branches from `pase-board.mjs`**

Four sites, all anchored on `useConsolidatedExpedienteTabs`:

1. `expedienteCompositeTab` (~line 169): delete the line
   `if (!useConsolidatedExpedienteTabs(settings)) return granularTab;`
2. `syncInnerTabVisualOnly` (~line 1042): delete `var consolidated = useConsolidatedExpedienteTabs(settings);`, the `if (consolidated) { ... return; }` wrapper (keep its body as the function body), and the trailing `GRANULAR_TABS.forEach(...)` + bare `syncInnerTabIndicator(tab);` fallback. Result:

```js
export function syncInnerTabVisualOnly() {
  var settings = rt.getSettings();
  var tab = migrateGranularInner(rt.getActiveInner() || "todo", settings);
  syncConsolidatedInnerTabButtons(tab, settings);
  syncConsolidatedPaneVisibility(tab, settings);
  syncConsolidatedSegmentBars(tab, settings);
  syncInnerTabIndicator(tab, { consolidated: true, settings: settings });
}
```

3. `switchInnerTab` (~line 1194): delete `var consolidated = useConsolidatedExpedienteTabs(settings);` and replace every use of the `consolidated` variable in the function with the consolidated behavior (the `if (consolidated) {...} else { GRANULAR_TABS.forEach(...) }` block keeps only the consolidated body; `consolidated ? {...} : undefined` ternaries keep the object branch; `if (... && consolidated)` conditions drop the `consolidated` operand).
4. `renderInnerTabs` (~line 1275): delete `var consolidated = useConsolidatedExpedienteTabs(settings);`, delete the `.exp-granular-tab` forEach block, change `el.style.display = consolidated && !hideSalida ? "" : "none"` to `el.style.display = !hideSalida ? "" : "none"`, change `applyExpedientePaneLayout(consolidated, settings)` to `applyExpedientePaneLayout(settings)`, and unwrap the `if (consolidated) { ... }` block that follows (keep its body).

Then clean imports: remove `useConsolidatedExpedienteTabs`, `GRANULAR_TABS`, and `innerTabButtonId` from the import block (~lines 50–80). Verify nothing still references them:

```bash
grep -n "useConsolidatedExpedienteTabs\|GRANULAR_TABS\|innerTabButtonId\|mountGranularFlat" public/js/features/pase-board.mjs
```
Expected: no output. If `innerTabButtonId` still has a live usage outside the deleted branches, keep that import and report it in the task summary instead of forcing the deletion.

- [ ] **Step 4: Delete the granular tab buttons from the markup**

In `public/partials/layout/app-body.html` (~lines 425–457), delete the eight `<button ... class="inner-tab exp-granular-tab" ...>` elements (`itab-datos`, `itab-notas`, `itab-indica`, `itab-tend`, `itab-cult`, `itab-listado`, `itab-todo`, `itab-receta-hu`). Keep the four `exp-consolidated-tab` buttons and the `.inner-tab-bar` wrapper — they are the narrow fallback.

- [ ] **Step 5: Sweep remaining references**

```bash
grep -rn "exp-granular-tab" public/js public/styles public/partials --include="*.mjs" --include="*.css" --include="*.html" | grep -v bundle | grep -v "index.html"
```
Delete any CSS rules or JS selectors that only target `.exp-granular-tab` (e.g. the `document.querySelectorAll(".exp-granular-tab")` loop if still present). Expected after cleanup: no output.

Update `public/js/expediente-tabs.test.mjs`: delete any `it`/`assert` blocks that import or exercise `useConsolidatedExpedienteTabs` or `GRANULAR_TABS`; keep the rest.

- [ ] **Step 6: Build, test, verify**

```bash
npm run build:ui && npm test
```
Expected: build succeeds, all tests pass. Then `node server.js`, open `http://localhost:3738`: Expediente shows the 4 consolidated tabs + segment bars exactly as before, in both Sala and Interconsulta modes (toggle via Mi Perfil), light and dark. No console errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(nav): delete dead granular expediente tab path (consolidated is the only layout)"
```

---

### Task 2: Grouped-row model module (pure, TDD)

**Files:**
- Create: `public/js/expediente-group-row.mjs`
- Create: `public/js/expediente-group-row.test.mjs`
- Modify: `package.json` (test list)

- [ ] **Step 1: Write the failing test**

`public/js/expediente-group-row.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUP_LABELS,
  SECTION_LABELS,
  groupSections,
  buildGroupRowModel,
} from './expediente-group-row.mjs';

const SALA = { appMode: 'sala' };
const INTER = { appMode: 'interconsulta' };

test('groupSections: paciente is always Datos + Pendientes', () => {
  assert.deepEqual(groupSections('paciente', SALA), ['datos', 'todo']);
  assert.deepEqual(groupSections('paciente', INTER), ['datos', 'todo']);
});

test('groupSections: clinico follows mode', () => {
  assert.deepEqual(groupSections('clinico', SALA), ['estadoActual', 'historia', 'eventualidades']);
  assert.deepEqual(groupSections('clinico', INTER), ['notas', 'indica', 'vpo']);
});

test('groupSections: resultados and salida come from the existing maps', () => {
  assert.deepEqual(groupSections('resultados', SALA), ['tend', 'cult']);
  assert.deepEqual(groupSections('salida', SALA), ['listado', 'vpo', 'recetaHu']);
  assert.deepEqual(groupSections('salida', INTER), []);
});

test('buildGroupRowModel: active group and section reflect the granular target', () => {
  const model = buildGroupRowModel('tend', SALA);
  const ids = model.map((g) => g.id);
  assert.deepEqual(ids, ['paciente', 'clinico', 'resultados', 'salida']);
  const resultados = model.find((g) => g.id === 'resultados');
  assert.equal(resultados.active, true);
  assert.equal(resultados.sections.find((s) => s.id === 'tend').active, true);
  assert.equal(resultados.sections.find((s) => s.id === 'cult').active, false);
  assert.equal(model.find((g) => g.id === 'paciente').active, false);
});

test('buildGroupRowModel: paciente sections use the granular tab itself', () => {
  const model = buildGroupRowModel('todo', SALA);
  const pac = model.find((g) => g.id === 'paciente');
  assert.equal(pac.active, true);
  assert.equal(pac.sections.find((s) => s.id === 'todo').active, true);
  assert.equal(pac.sections.find((s) => s.id === 'datos').active, false);
});

test('labels exist for every section that can appear', () => {
  ['paciente', 'clinico', 'resultados', 'salida'].forEach((g) => {
    assert.ok(GROUP_LABELS[g], 'group label ' + g);
    [SALA, INTER].forEach((st) => {
      groupSections(g, st).forEach((s) => assert.ok(SECTION_LABELS[s], 'section label ' + s));
    });
  });
});
```

- [ ] **Step 2: Run it — expect failure**

```bash
node --test public/js/expediente-group-row.test.mjs
```
Expected: FAIL (`Cannot find module ... expediente-group-row.mjs`).

- [ ] **Step 3: Implement the module**

`public/js/expediente-group-row.mjs`:

```js
/**
 * Model for the grouped expediente navigation row (premium UI phase 2).
 * Pure: derives group pills + sections from the existing expediente maps so
 * Sala/Interconsulta differences and the mobile Salida rule are inherited.
 */
import {
  getConsolidatedTabs,
  getClinicoSections,
  getSalidaSections,
  RESULTADOS_SECTIONS,
  resolveConsolidatedTarget,
} from './expediente-tabs.mjs';

export var GROUP_LABELS = {
  paciente: 'Paciente',
  clinico: 'Clínico',
  resultados: 'Resultados',
  salida: 'Salida',
};

export var SECTION_LABELS = {
  datos: 'Datos',
  todo: 'Pendientes',
  notas: 'Nota de evolución',
  indica: 'Indicaciones',
  historia: 'Historia',
  estadoActual: 'Estado actual',
  eventualidades: 'Eventualidades',
  vpo: 'VPO',
  tend: 'Tendencias',
  cult: 'Cultivos',
  listado: 'Listado de problemas',
  recetaHu: 'Receta HU',
};

export function groupSections(group, settings) {
  if (group === 'paciente') return ['datos', 'todo'];
  if (group === 'clinico') return getClinicoSections(settings || {});
  if (group === 'resultados') return RESULTADOS_SECTIONS.slice();
  if (group === 'salida') return getSalidaSections(settings || {});
  return [];
}

export function buildGroupRowModel(activeGranular, settings) {
  var st = settings || {};
  var granular = activeGranular || 'todo';
  var target = resolveConsolidatedTarget(granular, st);
  return getConsolidatedTabs(st).map(function (group) {
    var activeGroup = group === target.tab;
    return {
      id: group,
      label: GROUP_LABELS[group] || group,
      active: activeGroup,
      sections: groupSections(group, st).map(function (section) {
        var activeSection = activeGroup
          ? target.section
            ? target.section === section
            : granular === section
          : false;
        return {
          id: section,
          label: SECTION_LABELS[section] || section,
          active: activeSection,
        };
      }),
    };
  });
}
```

Align `SECTION_LABELS` values with the visible labels in `public/partials/layout/app-body.html` segment-bar buttons if any differ (grep `data-exp-segment=` and reuse the exact button text).

- [ ] **Step 4: Run the test — expect pass**

```bash
node --test public/js/expediente-group-row.test.mjs
```
Expected: PASS (6 tests).

- [ ] **Step 5: Register the test and run the suite**

In `package.json`, find the `test` script's hand-maintained file list and append `public/js/expediente-group-row.test.mjs` next to `public/js/expediente-tabs.test.mjs`. Then `npm test` — expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add public/js/expediente-group-row.mjs public/js/expediente-group-row.test.mjs package.json
git commit -m "feat(nav): grouped-row model derived from expediente tab maps"
```

---

### Task 3: Grouped-row renderer, wiring, and CSS (with narrow fallback)

**Files:**
- Create: `public/js/features/expediente-group-row-ui.mjs`
- Create: `public/styles/group-row.css`
- Modify: `public/partials/layout/app-body.html` (add the row container)
- Modify: `public/index.src.html` (stylesheet link)
- Modify: `public/js/features/pase-board.mjs` (render call sites)

- [ ] **Step 1: Add the container to the markup**

In `public/partials/layout/app-body.html`, directly BEFORE `<div class="inner-tab-bar">` (inside `#patient-expediente-classic`, after the `#patient-ronda-fullbar` div), add:

```html
        <nav id="exp-group-row" class="exp-group-row" aria-label="Secciones del expediente"></nav>
```

- [ ] **Step 2: Implement the renderer**

`public/js/features/expediente-group-row-ui.mjs`:

```js
/**
 * Renders the grouped expediente nav row (#exp-group-row) from the pure model.
 * Wide windows only — CSS hides it <1100px and shows the classic two-level
 * bars instead, which stay fully synced by the existing code paths.
 * Selection goes through the existing window globals (switchConsolidatedTab /
 * switchInnerTab) so behavior is identical to the classic bars.
 */
import { buildGroupRowModel } from '../expediente-group-row.mjs';

var lastPointerType = 'mouse';
var touchExpandedGroup = null;
var resyncWired = false;

function rowEl() {
  return document.getElementById('exp-group-row');
}

export function renderExpedienteGroupRow(activeGranular, settings) {
  var row = rowEl();
  if (!row) return;
  if (!row._pointerWired) {
    row._pointerWired = true;
    row.addEventListener('pointerdown', function (ev) {
      lastPointerType = ev.pointerType || 'mouse';
    });
    row.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      var names = Array.prototype.slice.call(row.querySelectorAll('.exp-group-name'));
      var idx = names.indexOf(document.activeElement);
      if (idx === -1) return;
      ev.preventDefault();
      var next = names[(idx + (ev.key === 'ArrowRight' ? 1 : names.length - 1)) % names.length];
      if (next) next.focus();
    });
  }
  var model = buildGroupRowModel(activeGranular || 'todo', settings || {});
  row.textContent = '';
  model.forEach(function (group) {
    var pill = document.createElement('div');
    pill.className = 'exp-group-pill' + (group.active ? ' is-active' : '');
    if (!group.active && touchExpandedGroup === group.id) pill.classList.add('is-touch-expanded');
    pill.dataset.group = group.id;

    var name = document.createElement('button');
    name.type = 'button';
    name.className = 'exp-group-name';
    name.setAttribute('aria-expanded', group.active || touchExpandedGroup === group.id ? 'true' : 'false');
    name.setAttribute('aria-current', group.active ? 'true' : 'false');
    name.textContent = group.label;
    name.addEventListener('click', function () {
      // Touch: first tap expands the pill, second tap (or a section tap) selects.
      if (lastPointerType === 'touch' && !group.active && touchExpandedGroup !== group.id) {
        touchExpandedGroup = group.id;
        renderExpedienteGroupRow(activeGranular, settings);
        return;
      }
      touchExpandedGroup = null;
      if (typeof window.switchConsolidatedTab === 'function') window.switchConsolidatedTab(group.id);
    });
    pill.appendChild(name);

    var sections = document.createElement('div');
    sections.className = 'exp-group-sections';
    var inner = document.createElement('div');
    inner.className = 'exp-group-sections-inner';
    group.sections.forEach(function (section) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'exp-group-section' + (section.active ? ' is-active' : '');
      btn.dataset.section = section.id;
      btn.setAttribute('aria-pressed', section.active ? 'true' : 'false');
      btn.textContent = section.label;
      btn.addEventListener('click', function () {
        touchExpandedGroup = null;
        if (typeof window.switchInnerTab === 'function') window.switchInnerTab(section.id);
      });
      inner.appendChild(btn);
    });
    sections.appendChild(inner);
    pill.appendChild(sections);
    row.appendChild(pill);
  });
}

/** Re-sync classic bars/indicator when crossing the grouped-row breakpoint. */
export function wireGroupRowBreakpointResync(syncFn) {
  if (resyncWired || typeof window.matchMedia !== 'function') return;
  resyncWired = true;
  var mq = window.matchMedia('(min-width: 1100px)');
  var handler = function () {
    if (typeof syncFn === 'function') syncFn();
  };
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
  else if (typeof mq.addListener === 'function') mq.addListener(handler);
}
```

- [ ] **Step 3: Wire render calls into `pase-board.mjs`**

Add the import (next to the other `../` / `./` feature imports at the top):

```js
import {
  renderExpedienteGroupRow,
  wireGroupRowBreakpointResync,
} from './expediente-group-row-ui.mjs';
```

Then add a render call immediately after EVERY `syncConsolidatedSegmentBars(...)` call site (after Task 1 there are exactly three — in `syncInnerTabVisualOnly`, in `switchConsolidatedTab`'s same-composite early path, and in `switchInnerTab`):

```js
  renderExpedienteGroupRow(tab, settings);
```
(in `switchConsolidatedTab` the active variable is named `current`, use that). Verify coverage:

```bash
grep -n "syncConsolidatedSegmentBars(\|renderExpedienteGroupRow(" public/js/features/pase-board.mjs
```
Expected: each `syncConsolidatedSegmentBars(` line is followed within two lines by a `renderExpedienteGroupRow(` line.

In `renderInnerTabs`, after the `wireExpedienteDatosCollapseRender();` line, add:

```js
  var activeForGroupRow = migrateGranularInner(rt.getActiveInner() || "todo", settings);
  renderExpedienteGroupRow(activeForGroupRow, settings);
  wireGroupRowBreakpointResync(syncInnerTabVisualOnly);
```

- [ ] **Step 4: Write the CSS**

`public/styles/group-row.css` (new file, full contents):

```css
/* Grouped expediente navigation (premium UI phase 2).
 * Wide windows only; <1100px keeps the classic tabs + segment bars.
 * Expansion animates grid-template-columns 0fr -> 1fr (motion tokens). */

#exp-group-row {
  display: none;
}

@media (min-width: 1100px) {
  #patient-expediente-classic > .inner-tab-bar {
    display: none;
  }
  #patient-expediente-classic .exp-segment-bar {
    display: none !important; /* beats the inline display set by sync code */
  }
  #exp-group-row {
    display: flex;
    align-items: center;
    gap: calc(8px * var(--density-space, 1));
    padding: calc(6px * var(--density-space, 1)) calc(16px * var(--density-space, 1));
    background: var(--surface);
    flex-shrink: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
  }
}

.exp-group-pill {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 2px;
  border: var(--border-hairline);
  border-radius: var(--radius-pill);
  background: color-mix(in oklab, var(--surface) 92%, var(--bg));
}

.exp-group-pill.is-active {
  border-color: color-mix(in oklab, var(--action) 35%, transparent);
  background: color-mix(in oklab, var(--action) 7%, var(--surface));
  box-shadow: var(--elev-raised);
}

.exp-group-name {
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: calc(12.5px * var(--density-font, 1));
  font-weight: 600;
  line-height: 1.25;
  color: var(--text-muted);
  padding: calc(5px * var(--density-space, 1)) calc(10px * var(--density-space, 1));
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.exp-group-pill.is-active > .exp-group-name {
  color: var(--action);
}

.exp-group-name:hover {
  background: var(--state-hover-bg);
  color: var(--text);
}

.exp-group-name:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.exp-group-sections {
  display: grid;
  grid-template-columns: 0fr;
  transition: grid-template-columns var(--dur-normal) var(--ease-out);
}

.exp-group-sections-inner {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}

.exp-group-pill.is-active > .exp-group-sections,
.exp-group-pill.is-touch-expanded > .exp-group-sections,
.exp-group-pill:hover > .exp-group-sections,
.exp-group-pill:focus-within > .exp-group-sections {
  grid-template-columns: 1fr;
}

.exp-group-section {
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: calc(12px * var(--density-font, 1));
  font-weight: 600;
  line-height: 1.25;
  color: var(--text-muted);
  padding: calc(4px * var(--density-space, 1)) calc(9px * var(--density-space, 1));
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.exp-group-section:hover {
  background: var(--state-hover-bg);
  color: var(--text);
}

.exp-group-section.is-active {
  background: color-mix(in oklab, var(--action) 14%, var(--surface));
  color: var(--action);
}

.exp-group-section:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

html.dark .exp-group-pill {
  background: color-mix(in oklab, var(--surface) 88%, var(--bg));
}

html.high-contrast .exp-group-pill {
  background: var(--surface);
  border: 1px solid var(--border);
}

html.high-contrast .exp-group-pill.is-active {
  border-color: var(--color-accent);
}

html.motion-sobrio .exp-group-sections {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .exp-group-sections {
    transition: none !important;
  }
}
```

Add the stylesheet link in `public/index.src.html`, directly after the `expediente.css` line (~line 83):

```html
<link rel="stylesheet" href="/styles/group-row.css">
```

- [ ] **Step 5: Build and verify manually**

```bash
npm run build:ui && npm test && node server.js
```
At `http://localhost:3738` with the window ≥1100px wide:
- One pill row appears: Paciente · Clínico · Resultados (+ Salida in Sala mode); the OLD tab bar and segment bars are gone.
- Active group is expanded showing its sections; hovering another group expands it; clicking a group name jumps to its default section; clicking a section selects it; content panes behave exactly as before.
- Keyboard: Tab focuses pills (expand on focus), ←/→ moves between group names.
- Narrow the window below 1100px: classic tabs + segment bars come back, fully functional; the active tab/indicator is correct after crossing the breakpoint in both directions.
- Check Sala AND Interconsulta, light AND dark, density Pase mode untouched. No console errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(nav): grouped expediente row with hover/touch expansion and narrow fallback"
```

---

### Task 4: Context header (patient · bed · dx · path) — pure helpers TDD

**Files:**
- Create: `public/js/features/header-context.mjs`
- Create: `public/js/features/header-context.test.mjs`
- Modify: `public/partials/chrome/header.html`
- Modify: `public/styles/layout.css`
- Modify: `public/js/app-shell.mjs`, `public/js/features/pase-board.mjs`, `public/js/features/patients.mjs` (call sites)
- Modify: `package.json` (test list)

- [ ] **Step 1: Write the failing test**

`public/js/features/header-context.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHeaderPath, buildHeaderPatientLine } from './header-context.mjs';

const SALA = { appMode: 'sala' };
const INTER = { appMode: 'interconsulta' };

test('buildHeaderPath: app tabs map to their names', () => {
  assert.equal(buildHeaderPath('lab', 'todo', SALA), 'Laboratorio');
  assert.equal(buildHeaderPath('med', 'todo', SALA), 'Manejo');
  assert.equal(buildHeaderPath('agenda', 'todo', SALA), 'Agenda');
});

test('buildHeaderPath: expediente shows group › section', () => {
  assert.equal(buildHeaderPath('nota', 'tend', SALA), 'Resultados › Tendencias');
  assert.equal(buildHeaderPath('nota', 'notas', INTER), 'Clínico › Nota de evolución');
  assert.equal(buildHeaderPath('nota', 'todo', SALA), 'Paciente › Pendientes');
});

test('buildHeaderPatientLine: name · bed · truncated dx', () => {
  assert.equal(buildHeaderPatientLine(null), '');
  assert.equal(buildHeaderPatientLine({ nombre: 'García López', cuarto: '412' }), 'García López · 412');
  const longDx = { nombre: 'Pérez', cuarto: '', diagnosticosList: undefined };
  assert.equal(buildHeaderPatientLine(longDx), 'Pérez');
});
```

- [ ] **Step 2: Run it — expect module-not-found failure**

```bash
node --test public/js/features/header-context.test.mjs
```

- [ ] **Step 3: Implement**

`public/js/features/header-context.mjs`:

```js
/**
 * Always-visible clinical context in the header (premium UI phase 2):
 * active patient (name · bed · dx) + current navigation path.
 */
import { patients } from '../app-state.mjs';
import { resolveConsolidatedTarget } from '../expediente-tabs.mjs';
import { GROUP_LABELS, SECTION_LABELS } from '../expediente-group-row.mjs';
import { diagnosticosTextForCenso } from '../patient-diagnosticos.mjs';

export function buildHeaderPath(appTab, inner, settings) {
  if (appTab === 'lab') return 'Laboratorio';
  if (appTab === 'med') return 'Manejo';
  if (appTab === 'agenda') return 'Agenda';
  var granular = inner || 'todo';
  var target = resolveConsolidatedTarget(granular, settings || {});
  var path = GROUP_LABELS[target.tab] || 'Expediente';
  var section = target.section || (target.tab === 'paciente' ? granular : null);
  if (section && SECTION_LABELS[section]) path += ' › ' + SECTION_LABELS[section];
  return path;
}

export function buildHeaderPatientLine(p) {
  if (!p) return '';
  var parts = [String(p.nombre || '').trim() || 'Paciente'];
  var cuarto = String(p.cuarto || '').trim();
  if (cuarto) parts.push(cuarto);
  var dx = '';
  try {
    dx = String(diagnosticosTextForCenso(p.diagnosticosList) || '').trim();
  } catch (_e) {
    dx = '';
  }
  if (dx) parts.push(dx.length > 48 ? dx.slice(0, 47) + '…' : dx);
  return parts.join(' · ');
}

/** ctx: { getActiveId, getActiveAppTab, getActiveInner, getSettings } */
export function syncHeaderContext(ctx) {
  var patientEl = document.getElementById('header-context-patient');
  var pathEl = document.getElementById('header-context-path');
  if (!patientEl || !pathEl || !ctx) return;
  var id = typeof ctx.getActiveId === 'function' ? ctx.getActiveId() : null;
  var p =
    id == null
      ? null
      : patients.find(function (x) {
          return String(x.id) === String(id);
        }) || null;
  patientEl.textContent = buildHeaderPatientLine(p);
  patientEl.style.display = p ? '' : 'none';
  pathEl.textContent = buildHeaderPath(
    typeof ctx.getActiveAppTab === 'function' ? ctx.getActiveAppTab() : 'nota',
    typeof ctx.getActiveInner === 'function' ? ctx.getActiveInner() : 'todo',
    typeof ctx.getSettings === 'function' ? ctx.getSettings() : {}
  );
}
```

If `diagnosticosTextForCenso` lives at a different path, mirror the import used by `public/js/censo-build.mjs` (it imports from `./patient-diagnosticos.mjs`). If importing it drags in non-node-safe code for the test, split the dx lookup behind a `try` and have the test only cover name/cuarto cases (as written above).

- [ ] **Step 4: Run tests — expect pass, register in package.json**

```bash
node --test public/js/features/header-context.test.mjs
```
Then append `public/js/features/header-context.test.mjs` to the package.json test list and run `npm test`.

- [ ] **Step 5: Markup + CSS**

In `public/partials/chrome/header.html`, inside `<div class="header-center" aria-live="polite">`, after `<span id="estado-actual-meta" ...></span>`, add:

```html
    <span id="header-context" class="header-context">
      <span id="header-context-patient" class="header-context-patient"></span>
      <span id="header-context-path" class="header-context-path"></span>
    </span>
```

Append to `public/styles/layout.css`:

```css
/* Contexto clínico en header (premium UI phase 2) */
.header-context {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.header-context-patient {
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 32vw;
}

.header-context-path {
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .header-context-path {
    display: none;
  }
}
```

- [ ] **Step 6: Wire the sync calls**

Three call sites, each `import { syncHeaderContext } from './features/header-context.mjs';` (adjust relative path per file):

1. `public/js/app-shell.mjs` — at the END of `syncWorkContextChrome()` (line ~174): `syncHeaderContext(shellCtx);`
2. `public/js/features/pase-board.mjs` — in `switchInnerTab`, immediately after `rt.setActiveInner(tab);`: `syncHeaderContext(rt);` — and at the end of `switchAppTab` (line ~786): `syncHeaderContext(rt);`
3. `public/js/features/patients.mjs` — in `selectPatientCore`, after `rt.renderEstadoActualButton();`: `syncHeaderContext(rt);`

The `rt`/`shellCtx` objects in those files already expose `getActiveId` / `getActiveAppTab` / `getActiveInner` / `getSettings`; if one getter is missing on a given runtime object, `syncHeaderContext` degrades gracefully (guards are built in) — verify visually instead of refactoring runtimes.

- [ ] **Step 7: Build, verify, commit**

```bash
npm run build:ui && npm test && node server.js
```
Verify: selecting a patient shows "Nombre · cuarto · dx…" in the header center; switching sections/tabs updates the path ("Resultados › Tendencias", "Laboratorio", …); with no patient selected the patient span is hidden but the path still shows; nothing overlaps the date on a 1280px window.

```bash
git add -A
git commit -m "feat(nav): always-visible patient + path context in header"
```

---

### Task 5: Segmented mode selector (replaces the three header chips)

**Files:**
- Modify: `public/partials/chrome/header.html`
- Modify: `public/js/features/chrome.mjs` (`getWorkMode`, `syncHeaderModeSeg`, call in `setUiDensity` + `initChromeAppearance`; delete pase/guardia chip sync)
- Modify: `public/js/features/profile.mjs` (`setWorkModeFromHeader`, delete `syncHeaderAppModeChip`)
- Modify: `public/js/tour-targets.mjs`, `public/js/features/guardia-board.mjs` (stale chip references)
- Modify: `public/styles/layout.css` (replace chip styles)

- [ ] **Step 1: Replace the chips in the markup**

In `public/partials/chrome/header.html`, delete the three buttons `#header-guardia-mode-chip` (line ~19), `#header-pase-mode-chip` (line ~20), and `#header-app-mode-chip` (line ~21, including its `Modo: Sala` text and closing tag), and insert in their place:

```html
      <div id="header-mode-seg" class="header-mode-seg" role="group" aria-label="Modo de trabajo">
        <button type="button" class="header-mode-seg-btn" data-mode="sala" onclick="setWorkModeFromHeader('sala')" aria-pressed="false">Sala</button>
        <button type="button" class="header-mode-seg-btn" data-mode="interconsulta" onclick="setWorkModeFromHeader('interconsulta')" aria-pressed="false">Interconsulta</button>
        <button type="button" class="header-mode-seg-btn" data-mode="guardia" onclick="setWorkModeFromHeader('guardia')" aria-pressed="false">Guardia</button>
        <button type="button" class="header-mode-seg-btn" data-mode="pase" onclick="setWorkModeFromHeader('pase')" aria-pressed="false">Pase</button>
      </div>
```

Keep `#header-pase-breadcrumb` and `#btn-header-return-pase` — they are pase-detail navigation, not mode chips.

- [ ] **Step 2: Add `getWorkMode` + `syncHeaderModeSeg` to `chrome.mjs`**

Place directly after `isGuardiaMode()` (~line 245). `chrome.mjs` already has `isPaseMode`/`isGuardiaMode` and a module-level `runtime`; import `isModeSala` from `../mode-features.mjs` if not already imported:

```js
export function getWorkMode() {
  if (isGuardiaMode()) return 'guardia';
  if (isPaseMode()) return 'pase';
  var st = runtime && typeof runtime.getSettings === 'function' ? runtime.getSettings() : null;
  return isModeSala(st) ? 'sala' : 'interconsulta';
}

export function syncHeaderModeSeg() {
  var seg = document.getElementById('header-mode-seg');
  if (!seg) return;
  var mode = getWorkMode();
  seg.querySelectorAll('.header-mode-seg-btn').forEach(function (btn) {
    var on = btn.dataset.mode === mode;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
```

Add a `syncHeaderModeSeg();` call (a) at the end of `setUiDensity` (~line 401 — after it applies the density/mode change, before returning), and (b) inside `initChromeAppearance()` after `applyUiDensity();`.

Then delete `syncPaseModeHeaderChip` (~line 279) and the guardia-chip sync block that follows it (~lines 285–305, the code toggling `header-guardia-mode-chip--active`). Remove their call sites (`markOpenedDetailFromPaseBoard`, `clearPaseDetailEscape`, and wherever the guardia chip sync was invoked) — verify with:

```bash
grep -rn "syncPaseModeHeaderChip\|header-guardia-mode-chip\|header-pase-mode-chip\|header-app-mode-chip" public/js public/partials --include="*.mjs" --include="*.html" | grep -v bundle | grep -v index.html
```
Fix every hit: in `guardia-board.mjs` drop the chip lookups; in `tour-targets.mjs` retarget the tour step from the old chip selector to `#header-mode-seg` (keep the step's text meaningful — it now points at the mode selector). Expected after fixes: no output.

- [ ] **Step 3: Add `setWorkModeFromHeader` to `profile.mjs`**

`profile.mjs` already owns app-mode switching (`applyAppModeSwitchEffects`, `settingsRef`). Add imports from `./chrome.mjs` for `isPaseMode`, `isGuardiaMode`, `setUiDensity`, `syncHeaderModeSeg` (extend the existing import line if present), then add:

```js
export function setWorkModeFromHeader(mode) {
  var st = settingsRef();
  var current = isGuardiaMode()
    ? 'guardia'
    : isPaseMode()
      ? 'pase'
      : isModeSala(st)
        ? 'sala'
        : 'interconsulta';
  if (mode === current) {
    syncHeaderModeSeg();
    return;
  }
  if (mode === 'guardia') {
    if (typeof window.toggleGuardiaMode === 'function') window.toggleGuardiaMode();
    syncHeaderModeSeg();
    return;
  }
  if (mode === 'pase') {
    if (isGuardiaMode() && typeof window.toggleGuardiaMode === 'function') window.toggleGuardiaMode();
    setUiDensity('pase');
    syncHeaderModeSeg();
    return;
  }
  // sala / interconsulta: leave any overlay mode first
  if (isGuardiaMode() && typeof window.toggleGuardiaMode === 'function') window.toggleGuardiaMode();
  else if (isPaseMode()) setUiDensity('normal');
  var wantSala = mode === 'sala';
  if (wantSala !== isModeSala(st)) {
    st.appMode = wantSala ? 'sala' : 'interconsulta';
    localStorage.setItem('rpc-settings', JSON.stringify(st));
    applyAppModeSwitchEffects();
  }
  syncHeaderModeSeg();
}
```

Register it in `profile.mjs`'s `windowHandlers` export (same object that exposes the other header onclick globals). Delete `syncHeaderAppModeChip` (~line 359) and replace its call inside `applyAppModeSwitchEffects` with `syncHeaderModeSeg();`. If `toggleAppModeFromHeader` (~line 421) was only called by the deleted chip's onclick, delete it too (grep first; if the tour or tests call it, keep it and have it delegate to `setWorkModeFromHeader`).

- [ ] **Step 4: Replace the chip CSS**

In `public/styles/layout.css`, delete the `.header-app-mode-chip` rule blocks (~lines 422–432+) and the chip lines inside the responsive blocks (~lines 308, 334, 338) — replace chip selectors in shared rule lists with `.header-mode-seg` where the rule still makes sense (e.g. narrow-width hiding). Append:

```css
/* Selector de modo segmentado (premium UI phase 2) */
.header-mode-seg {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: var(--border-hairline);
  border-radius: var(--radius-pill);
  background: color-mix(in oklab, var(--surface) 92%, var(--bg));
}

.header-mode-seg-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 4px 9px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.header-mode-seg-btn:hover {
  background: var(--state-hover-bg);
  color: var(--text);
}

.header-mode-seg-btn.is-active {
  background: color-mix(in oklab, var(--action) 14%, var(--surface));
  color: var(--action);
}

.header-mode-seg-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* Narrow: collapse to the active mode; reveal on focus/tap-into */
@media (max-width: 1180px) {
  .header-mode-seg-btn:not(.is-active) {
    display: none;
  }
  .header-mode-seg:focus-within .header-mode-seg-btn {
    display: inline-flex;
  }
}
```

- [ ] **Step 5: Build, verify, commit**

```bash
npm run build:ui && npm test && node server.js
```
Verify the full matrix: Sala→Interconsulta reflows Expediente sections (and back); Guardia opens the guardia board and the segment shows Guardia active; leaving Guardia via Sala restores normal; Pase enters/exits pase density; ⌘P and ⌘⇧G shortcuts still work and the segment follows them; the segment state survives reload; the onboarding tour step that pointed at the old mode chip now highlights the segment without erroring. No console errors.

```bash
git add -A
git commit -m "feat(nav): segmented Sala/Interconsulta/Guardia/Pase mode selector replaces header chips"
```

---

### Task 6: Fuzzy matcher (pure, TDD)

**Files:**
- Create: `public/js/fuzzy-match.mjs`
- Create: `public/js/fuzzy-match.test.mjs`
- Modify: `package.json` (test list)

- [ ] **Step 1: Write the failing test**

`public/js/fuzzy-match.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldText, fuzzyScore, rankItems } from './fuzzy-match.mjs';

test('foldText strips accents and lowers', () => {
  assert.equal(foldText('García LÓPEZ'), 'garcia lopez');
});

test('fuzzyScore: every token must match as a subsequence', () => {
  assert.equal(fuzzyScore('xyz', 'Tendencias'), -Infinity);
  assert.equal(fuzzyScore('tend gar', 'Tendencias — Martínez'), -Infinity);
  assert.ok(fuzzyScore('tend gar', 'Tendencias — García') > 0);
});

test('fuzzyScore: word starts beat scattered letters', () => {
  const wordStart = fuzzyScore('tend', 'Tendencias');
  const scattered = fuzzyScore('tend', 'Datos del paciente'); // t..d scattered or absent
  assert.ok(wordStart > 0);
  assert.ok(scattered === -Infinity || wordStart > scattered);
});

test('rankItems sorts matches and drops non-matches', () => {
  const items = [
    { label: 'Tendencias — García' },
    { label: 'Tendencias — Martínez' },
    { label: 'Cultivos — García' },
    { label: 'Tendencias' },
  ];
  const ranked = rankItems('tend gar', items, (it) => it.label);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].item.label, 'Tendencias — García');
});
```

- [ ] **Step 2: Run — expect module-not-found failure**

```bash
node --test public/js/fuzzy-match.test.mjs
```

- [ ] **Step 3: Implement**

`public/js/fuzzy-match.mjs`:

```js
/**
 * Minimal accent-insensitive fuzzy matcher for the ⌘K palette.
 * Greedy subsequence per whitespace token; word-start and consecutive hits
 * score higher; all tokens must match or the result is -Infinity.
 */
export function foldText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function tokenScore(token, text) {
  var t = foldText(token);
  var hay = foldText(text);
  if (!t) return 0;
  var score = 0;
  var prevHit = -2;
  var hi = 0;
  for (var ti = 0; ti < t.length; ti++) {
    var ch = t[ti];
    var found = -1;
    for (; hi < hay.length; hi++) {
      if (hay[hi] === ch) {
        found = hi;
        break;
      }
    }
    if (found === -1) return -Infinity;
    var prev = found === 0 ? ' ' : hay[found - 1];
    var atWordStart = prev === ' ' || prev === '-' || prev === '—' || prev === '·';
    if (found === prevHit + 1) score += 4;
    else if (atWordStart) score += 3;
    else score += 1;
    prevHit = found;
    hi = found + 1;
  }
  return score - hay.length * 0.01;
}

export function fuzzyScore(query, text) {
  var tokens = String(query || '').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  var total = 0;
  for (var i = 0; i < tokens.length; i++) {
    var s = tokenScore(tokens[i], text);
    if (s === -Infinity) return -Infinity;
    total += s;
  }
  return total;
}

export function rankItems(query, items, getText) {
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var s = fuzzyScore(query, getText(items[i]));
    if (s !== -Infinity) out.push({ item: items[i], score: s });
  }
  out.sort(function (a, b) {
    return b.score - a.score;
  });
  return out;
}
```

- [ ] **Step 4: Run — expect pass; register; commit**

```bash
node --test public/js/fuzzy-match.test.mjs
```
Append `public/js/fuzzy-match.test.mjs` to the package.json test list, run `npm test`, then:

```bash
git add public/js/fuzzy-match.mjs public/js/fuzzy-match.test.mjs package.json
git commit -m "feat(nav): accent-insensitive fuzzy matcher for command palette"
```

---

### Task 7: Palette item model (pure, TDD)

**Files:**
- Create: `public/js/command-palette-model.mjs`
- Create: `public/js/command-palette-model.test.mjs`
- Modify: `package.json` (test list)

- [ ] **Step 1: Write the failing test**

`public/js/command-palette-model.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPaletteItems, rankPalette } from './command-palette-model.mjs';

const SALA = { appMode: 'sala' };
const PATIENTS = [
  { id: 1, nombre: 'García López, Juan', cuarto: '412' },
  { id: 2, nombre: 'Martínez, Ana', cuarto: '410' },
];

test('buildPaletteItems: sections, app tabs, patients, and combos', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  assert.ok(items.some((it) => it.kind === 'section' && it.section === 'tend'));
  assert.ok(items.some((it) => it.kind === 'app-tab' && it.tab === 'lab'));
  assert.ok(items.some((it) => it.kind === 'patient' && it.patientId === 1));
  assert.ok(
    items.some(
      (it) => it.kind === 'patient-section' && it.patientId === 1 && it.section === 'tend'
    )
  );
});

test('rankPalette: "tend gar" resolves to Tendencias of García', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  const top = rankPalette('tend gar', items, 12);
  assert.ok(top.length >= 1);
  assert.equal(top[0].kind, 'patient-section');
  assert.equal(top[0].patientId, 1);
  assert.equal(top[0].section, 'tend');
});

test('rankPalette: empty query lists patients and sections, capped', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  const top = rankPalette('', items, 12);
  assert.ok(top.length > 0 && top.length <= 12);
  assert.ok(top.every((it) => it.kind === 'patient' || it.kind === 'section'));
});
```

- [ ] **Step 2: Run — expect module-not-found failure**

```bash
node --test public/js/command-palette-model.test.mjs
```

- [ ] **Step 3: Implement**

`public/js/command-palette-model.mjs`:

```js
/**
 * ⌘K palette items: sections (current mode), app tabs, patients, and
 * section×patient combos ("tend gar" → Tendencias of García).
 * A launcher over existing stores/functions — no new data layer.
 */
import { getConsolidatedTabs } from './expediente-tabs.mjs';
import { groupSections, GROUP_LABELS, SECTION_LABELS } from './expediente-group-row.mjs';
import { rankItems } from './fuzzy-match.mjs';

export var APP_TAB_ITEMS = [
  { kind: 'app-tab', tab: 'lab', label: 'Laboratorio', hint: '' },
  { kind: 'app-tab', tab: 'med', label: 'Manejo', hint: '' },
  { kind: 'app-tab', tab: 'agenda', label: 'Agenda', hint: '' },
];

export function sectionEntries(settings) {
  var out = [];
  getConsolidatedTabs(settings || {}).forEach(function (group) {
    groupSections(group, settings).forEach(function (section) {
      out.push({
        section: section,
        label: SECTION_LABELS[section] || section,
        groupLabel: GROUP_LABELS[group] || group,
      });
    });
  });
  return out;
}

export function buildPaletteItems(settings, patientsList) {
  var items = [];
  var secs = sectionEntries(settings);
  secs.forEach(function (se) {
    items.push({ kind: 'section', section: se.section, label: se.label, hint: se.groupLabel });
  });
  APP_TAB_ITEMS.forEach(function (it) {
    items.push({ kind: 'app-tab', tab: it.tab, label: it.label, hint: '' });
  });
  (patientsList || []).forEach(function (p) {
    var name = String((p && p.nombre) || '').trim();
    if (!name) return;
    var cuarto = String((p && p.cuarto) || '').trim();
    items.push({ kind: 'patient', patientId: p.id, label: name, hint: cuarto });
    secs.forEach(function (se) {
      items.push({
        kind: 'patient-section',
        patientId: p.id,
        section: se.section,
        label: se.label + ' — ' + name,
        hint: cuarto,
      });
    });
  });
  return items;
}

export function rankPalette(query, items, limit) {
  var max = limit || 12;
  var q = String(query || '').trim();
  if (!q) {
    return items
      .filter(function (it) {
        return it.kind === 'patient' || it.kind === 'section';
      })
      .slice(0, max);
  }
  return rankItems(q, items, function (it) {
    return it.label;
  })
    .slice(0, max)
    .map(function (r) {
      return r.item;
    });
}
```

- [ ] **Step 4: Run — expect pass; register; commit**

```bash
node --test public/js/command-palette-model.test.mjs
```
Append `public/js/command-palette-model.test.mjs` to the package.json test list, run `npm test`, then:

```bash
git add public/js/command-palette-model.mjs public/js/command-palette-model.test.mjs package.json
git commit -m "feat(nav): palette item model with section x patient combos"
```

---

### Task 8: Command palette UI, ⌘K binding, glass styling, header hint

**Files:**
- Create: `public/js/features/command-palette.mjs`
- Create: `public/styles/cmdk.css`
- Modify: `public/styles/overlays.css` (add `.cmdk` to the glass selector lists)
- Modify: `public/index.src.html` (stylesheet link)
- Modify: `public/js/app.js` (windowHandlers aggregation)
- Modify: `public/js/app-shell.mjs` (⌘K binding + context)
- Modify: `public/partials/chrome/header.html` (⌘K hint button)

- [ ] **Step 1: Implement the palette feature module**

`public/js/features/command-palette.mjs`:

```js
/**
 * ⌘K command palette: fuzzy jump to sections and patients.
 * Keyboard-first glass overlay. Executes via existing globals/functions.
 */
import { patients } from '../app-state.mjs';
import { buildPaletteItems, rankPalette } from '../command-palette-model.mjs';
import { selectPatient } from './patients.mjs';

var ctx = null;
var dom = null;
var results = [];
var selectedIndex = 0;

export function setCommandPaletteContext(c) {
  ctx = c;
}

function settings() {
  return ctx && typeof ctx.getSettings === 'function' ? ctx.getSettings() : {};
}

function ensureDom() {
  if (dom) return dom;
  var backdrop = document.createElement('div');
  backdrop.className = 'cmdk-backdrop';
  backdrop.hidden = true;
  backdrop.addEventListener('click', closeCommandPalette);

  var panel = document.createElement('div');
  panel.className = 'cmdk';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Ir a sección o paciente');

  var input = document.createElement('input');
  input.className = 'cmdk-input';
  input.type = 'text';
  input.placeholder = 'Ir a… sección o paciente (ej. "tend gar")';
  input.setAttribute('aria-label', 'Buscar sección o paciente');

  var list = document.createElement('ul');
  list.className = 'cmdk-list';
  list.setAttribute('role', 'listbox');

  input.addEventListener('input', function () {
    renderResults(input.value);
  });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      moveSelection(1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      moveSelection(-1);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      if (results[selectedIndex]) executeItem(results[selectedIndex]);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      closeCommandPalette();
    }
  });

  panel.appendChild(input);
  panel.appendChild(list);
  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  dom = { backdrop: backdrop, panel: panel, input: input, list: list };
  return dom;
}

function moveSelection(delta) {
  if (!results.length) return;
  selectedIndex = (selectedIndex + delta + results.length) % results.length;
  syncSelection();
}

function syncSelection() {
  if (!dom) return;
  Array.prototype.forEach.call(dom.list.children, function (li, i) {
    li.classList.toggle('is-selected', i === selectedIndex);
    li.setAttribute('aria-selected', i === selectedIndex ? 'true' : 'false');
  });
  var sel = dom.list.children[selectedIndex];
  if (sel && typeof sel.scrollIntoView === 'function') sel.scrollIntoView({ block: 'nearest' });
}

function renderResults(query) {
  var d = ensureDom();
  var items = buildPaletteItems(settings(), patients);
  results = rankPalette(query, items, 12);
  selectedIndex = 0;
  d.list.textContent = '';
  results.forEach(function (item, i) {
    var li = document.createElement('li');
    li.className = 'cmdk-item' + (i === 0 ? ' is-selected' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    var label = document.createElement('span');
    label.className = 'cmdk-item-label';
    label.textContent = item.label;
    var hint = document.createElement('span');
    hint.className = 'cmdk-item-hint';
    hint.textContent = item.hint || '';
    li.appendChild(label);
    li.appendChild(hint);
    li.addEventListener('click', function () {
      executeItem(item);
    });
    d.list.appendChild(li);
  });
  if (!results.length) {
    var empty = document.createElement('li');
    empty.className = 'cmdk-empty';
    empty.textContent = 'Sin resultados';
    d.list.appendChild(empty);
  }
}

function executeItem(item) {
  closeCommandPalette();
  if (item.kind === 'app-tab') {
    if (typeof window.switchAppTab === 'function') window.switchAppTab(item.tab);
    return;
  }
  if (item.kind === 'section') {
    if (typeof window.switchInnerTab === 'function') window.switchInnerTab(item.section);
    return;
  }
  if (item.kind === 'patient') {
    selectPatient(item.patientId);
    return;
  }
  if (item.kind === 'patient-section') {
    selectPatient(item.patientId);
    if (typeof window.switchInnerTab === 'function') window.switchInnerTab(item.section);
  }
}

export function openCommandPalette() {
  var d = ensureDom();
  d.backdrop.hidden = false;
  d.panel.hidden = false;
  d.input.value = '';
  renderResults('');
  d.input.focus();
}

export function closeCommandPalette() {
  if (!dom) return;
  dom.backdrop.hidden = true;
  dom.panel.hidden = true;
}

export var windowHandlers = {
  openCommandPalette: openCommandPalette,
  closeCommandPalette: closeCommandPalette,
};
```

- [ ] **Step 2: Register globals and context**

In `public/js/app.js`, mirror the existing pattern (lines ~24–40): add

```js
import { windowHandlers as commandPaletteWindowHandlers } from './features/command-palette.mjs';
```

and include `commandPaletteWindowHandlers` in the same `Object.assign(window, ...)` (or equivalent spread) where `chromeWindowHandlers` etc. are applied.

In `public/js/app-shell.mjs`: add

```js
import { openCommandPalette, setCommandPaletteContext } from './features/command-palette.mjs';
```

and wherever `shellCtx` is initialized/assigned (the `Object.assign(shellCtx, ctx)` site, ~line 130), add after it:

```js
  setCommandPaletteContext(shellCtx);
```

- [ ] **Step 3: Bind ⌘K**

In `public/js/app-shell.mjs`, inside the `document.addEventListener('keydown', function(e) { var mod = e.metaKey || e.ctrlKey; if (mod) { ... } })` handler (~line 651), after the `key === '1' ... '5'` block, add:

```js
    if (key === 'k' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      openCommandPalette();
    }
```

Confirm no existing ⌘K binding conflicts:

```bash
grep -n "'k'" public/js/app-shell.mjs
```
Expected: only the new line.

- [ ] **Step 4: Header hint button**

In `public/partials/chrome/header.html`, at the START of `<div class="header-work-cluster" ...>` (before the pase breadcrumb), add:

```html
      <button type="button" id="btn-header-cmdk" class="header-cmdk-hint" onclick="openCommandPalette()" title="Ir a sección o paciente (⌘K)" aria-label="Ir a… (atajo Cmd K)"><kbd>⌘K</kbd><span class="header-cmdk-hint-label">Ir a…</span></button>
```

- [ ] **Step 5: CSS — `cmdk.css` + glass selectors**

First check the highest overlay z-index in use (`grep -n "z-index" public/styles/modals.css | sort -t: -k3 -n | tail -3`) and set the two z-index values below to sit above it.

`public/styles/cmdk.css` (new file, full contents — adjust only z-index per the check):

```css
/* ⌘K command palette (premium UI phase 2). Glass comes from overlays.css. */

.cmdk-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: color-mix(in oklab, var(--color-ink) 22%, transparent);
}

.cmdk {
  position: fixed;
  z-index: 1301;
  top: 14vh;
  left: 50%;
  transform: translateX(-50%);
  width: min(560px, calc(100vw - 32px));
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modal-in var(--dur-normal) var(--ease-out);
}

.cmdk[hidden],
.cmdk-backdrop[hidden] {
  display: none;
}

.cmdk-input {
  border: none;
  border-bottom: 1px solid var(--divider);
  background: transparent;
  font: inherit;
  font-size: 15px;
  color: var(--text);
  padding: 14px 16px;
  outline: none;
}

.cmdk-input::placeholder {
  color: var(--text-muted);
}

.cmdk-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  max-height: 46vh;
  overflow-y: auto;
}

.cmdk-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text);
}

.cmdk-item:hover,
.cmdk-item.is-selected {
  background: var(--state-hover-bg);
}

.cmdk-item.is-selected {
  box-shadow: inset 2px 0 0 var(--action);
}

.cmdk-item-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmdk-item-hint {
  color: var(--text-muted);
  font-size: 12px;
  flex-shrink: 0;
}

.cmdk-empty {
  padding: 14px 12px;
  color: var(--text-muted);
}

.header-cmdk-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: var(--border-hairline);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 11.5px;
  padding: 3px 9px;
  cursor: pointer;
}

.header-cmdk-hint kbd {
  font-family: inherit;
  font-size: 10.5px;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 4px;
  background: color-mix(in oklab, var(--surface) 90%, var(--bg));
}

.header-cmdk-hint:hover {
  background: var(--state-hover-bg);
  color: var(--text);
}

@media (max-width: 1080px) {
  .header-cmdk-hint-label {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cmdk {
    animation: none !important;
  }
}
```

Link it in `public/index.src.html` directly after the `overlays.css` line (~line 96):

```html
<link rel="stylesheet" href="/styles/cmdk.css">
```

In `public/styles/overlays.css`, add `.cmdk` to all THREE selector lists (the glass rule, the `@supports not` fallback, and the `html.no-blur` fallback) — e.g. the first becomes:

```css
.settings-dropdown,
.connection-dropdown,
.modal,
.toast,
.cmdk {
```

- [ ] **Step 6: Build, verify, commit**

```bash
npm run build:ui && npm test && node server.js
```
Verify: ⌘K (or Ctrl+K) opens the palette with patients+sections listed; typing `tend gar` puts "Tendencias — García…" first; Enter selects the patient AND lands on Tendencias; arrows + Enter work; Escape and backdrop click close; the header "⌘K Ir a…" button opens it; in the browser (blur capable) the panel is glass, and with `html.no-blur` (Electron) it's solid; works in dark mode. No console errors.

```bash
git add -A
git commit -m "feat(nav): cmd-k fuzzy palette for sections and patients with glass overlay"
```

---

### Task 9: Final verification sweep + changelog

**Files:**
- Modify: `docs/logs/agent-changelog.md`
- Modify: `docs/superpowers/plans/2026-06-10-phase2-navigation-rework.md` (check off)

- [ ] **Step 1: Full gates**

```bash
npm run build:ui && npm test && npm run metrics:check
```
Expected: all pass. `metrics:check` must not report new debt; if it flags the new files, fix the offending code (don't raise the ratchet).

- [ ] **Step 2: Manual smoke matrix (no CI yet — this is the safety net)**

In `node server.js` + browser AND in `npm start` (Electron):
- Surfaces: grouped row, classic fallback (<1100px), context header, mode selector, ⌘K palette.
- Matrix: Sala / Interconsulta × light / dark × wide / narrow. Plus: Guardia in/out, Pase in/out, high-contrast toggle, motion Sobrio (group expansion must not animate), patient with and without diagnosis.
- Electron specifically: confirm `html.no-blur` is applied (palette/modals solid, not laggy).

- [ ] **Step 3: Changelog + wrap**

Append an entry to `docs/logs/agent-changelog.md` following the existing format (date, scope `nav`, the four features, breaking-behavior note: header mode chips replaced by segmented selector; granular tab path removed).

```bash
git add -A
git commit -m "docs(logs): phase 2 navigation rework changelog"
```

Report completion. Merging `feature/phase2-navigation` (and the underlying phase 1 branch) into `main` is a user decision — use superpowers:finishing-a-development-branch.

---

## Out of scope (follow-up plans)

1. **Desktop surface rollout** (Expediente panes → Laboratorio → sidebar → Pase/Guardia boards → Manejo+Agenda → modals glass → tour/Learn hub; one surface per commit) — next plan, after this lands.
2. Phase 3 mobile/interno rollout, Phase 4 CI + test discovery, Phases 5–6 hardening — per the spec's phase order.
3. J/K hint in the header (verify the shortcut exists first; bundle with the surface rollout).
