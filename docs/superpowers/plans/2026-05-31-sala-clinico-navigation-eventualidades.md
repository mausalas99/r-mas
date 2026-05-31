# Sala Clínico Navigation + Eventualidades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize modo Sala expediente so Clínico contains Historia Clínica → Estado actual → Eventualidades → Manejo; hide Historia in Interconsulta; add Eventualidades panel.

**Architecture:** Extend `expediente-tabs.mjs` maps and segment visibility; move `#exp-pane-estado-actual` under Clínico `estadoActual` segment; new `eventualidades-panel.mjs` with patient-scoped entries. Ship independently before HC form redesign.

**Spec:** `docs/superpowers/specs/2026-05-31-historia-clinica-institutional-format-design.md` (Navigation + Eventualidades sections)

**Tech Stack:** Node built-in test runner, vanilla JS modules, existing `pase-board.mjs` inner tab renderer.

---

## File map

| File | Responsibility |
|------|----------------|
| `public/js/expediente-tabs.mjs` | Sala tab list, clinico sections, resolve targets |
| `public/js/expediente-tabs.test.mjs` | Regression tests |
| `public/partials/layout/app-body.html` | Segment buttons + `itab-eventualidades` mount |
| `public/index.html` | Keep in sync if duplicated |
| `public/js/features/pase-board.mjs` | Render `eventualidades`, mount EA under clinico |
| `public/js/features/eventualidades-panel.mjs` | **Create** — list + add entries |
| `public/js/features/eventualidades-panel.test.mjs` | **Create** — sort + append |
| `public/js/app-runtimes.mjs` | Register runtime if needed |
| `package.json` | Add test path |

---

### Task 1: Expediente tabs — Sala without top Estado actual

**Files:**
- Modify: `public/js/expediente-tabs.mjs`
- Modify: `public/js/expediente-tabs.test.mjs`

- [ ] **Step 1: Update failing tests**

In `public/js/expediente-tabs.test.mjs`, change:

```js
test('CONSOLIDATED_TABS_SALA includes estadoActual between clinico and resultados', () => {
  assert.deepEqual(CONSOLIDATED_TABS_SALA, [
    'paciente',
    'clinico',
    'resultados',
    'salida',
  ]);
});

test("resolveConsolidatedTarget estadoActual sala routes to clinico segment", () => {
  assert.deepEqual(resolveConsolidatedTarget('estadoActual', SALA), {
    tab: 'clinico',
    section: 'estadoActual',
  });
});

test('getClinicoSections sala order', () => {
  assert.deepEqual(getClinicoSections(SALA), [
    'historia',
    'estadoActual',
    'eventualidades',
    'manejo',
  ]);
});

test('getClinicoSections inter has no historia', () => {
  assert.deepEqual(getClinicoSections(INTER), ['notas', 'indica', 'vpo', 'manejo']);
});
```

- [ ] **Step 2: Run tests**

Run: `node --test public/js/expediente-tabs.test.mjs`  
Expected: FAIL on `CONSOLIDATED_TABS_SALA` and `getClinicoSections`

- [ ] **Step 3: Implement `expediente-tabs.mjs`**

```js
export const CONSOLIDATED_TABS_SALA = ['paciente', 'clinico', 'resultados', 'salida'];

export const CLINICO_SECTIONS_SALA = ['historia', 'estadoActual', 'eventualidades', 'manejo'];

// granularToConsolidatedMap — sala branch:
if (sala) map.estadoActual = { tab: 'clinico', section: 'estadoActual' };

// paneMountSpec:
estadoActual: { composite: 'clinico', selector: '#exp-pane-estado-actual' },
eventualidades: { composite: 'clinico', selector: '#exp-pane-eventualidades' },

// syncConsolidatedSegmentBarVisibility:
// - historia: visible sala only (already)
// - add estadoActual, eventualidades buttons: display sala ? '' : 'none'
// - remove itab-estadoActual top tab display (delete style toggle on #itab-estadoActual or never show)

// defaultGranularForConsolidatedTab('clinico', sala) => 'historia'
```

- [ ] **Step 4: Run tests**

Run: `node --test public/js/expediente-tabs.test.mjs`  
Expected: PASS

---

### Task 2: HTML — segments and mounts

**Files:**
- Modify: `public/partials/layout/app-body.html`
- Modify: `public/index.html` (if expediente block is duplicated)

- [ ] **Step 1: Rename label**

`exp-segment-historia` text: **Historia Clínica** (not Historia ingreso).

- [ ] **Step 2: Add segment buttons** (after historia, before manejo):

```html
<button type="button" class="exp-segment-btn rpc-subtab" id="exp-segment-estadoActual"
  data-exp-segment="estadoActual" ... onclick="switchInnerTab('estadoActual')">Estado actual</button>
<button type="button" class="exp-segment-btn rpc-subtab" id="exp-segment-eventualidades"
  data-exp-segment="eventualidades" ... onclick="switchInnerTab('eventualidades')">Eventualidades</button>
```

- [ ] **Step 3: Move estado actual mount inside clinico body**

Place `#exp-pane-estado-actual` and new `#exp-pane-eventualidades` inside `.exp-segment-body--clinico` (sibling panes, toggled by `switchInnerTab`).

Remove or hide top-level `#itab-estadoActual` consolidated button.

- [ ] **Step 4: Manual smoke**

Run app → modo Sala → Clínico shows 4 segments in order; top bar has no Estado actual tab.

---

### Task 3: Pase board — render routing

**Files:**
- Modify: `public/js/features/pase-board.mjs`

- [ ] **Step 1: Add `eventualidades` to inner tab render switch**

Import `renderEventualidadesPanel` from `./eventualidades-panel.mjs`.

Case `'eventualidades'`: call renderer into `#exp-pane-eventualidades`.

Case `'estadoActual'`: ensure `renderEstadoActualPanel` targets `#exp-pane-estado-actual` (may already work via mount move).

- [ ] **Step 2: Invalidate cache keys**

Add `eventualidades` to `invalidateInnerTabRenderCache` usage when patient changes.

---

### Task 4: Eventualidades panel

**Files:**
- Create: `public/js/features/eventualidades-panel.mjs`
- Create: `public/js/features/eventualidades-panel.test.mjs`
- Modify: `package.json` test script (append test path)

- [ ] **Step 1: Write failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendEventualidad, sortEntriesDesc } from './eventualidades-panel.mjs';

test('appendEventualidad adds id and ISO at', () => {
  const base = { entries: [] };
  const next = appendEventualidad(base, 'Caída en baño', 'client-1');
  assert.equal(next.entries.length, 1);
  assert.match(next.entries[0].id, /^ev_/);
  assert.ok(next.entries[0].at);
  assert.equal(next.entries[0].text, 'Caída en baño');
});

test('sortEntriesDesc newest first', () => {
  const entries = [
    { id: 'a', at: '2026-01-01T00:00:00.000Z', text: 'old' },
    { id: 'b', at: '2026-06-01T00:00:00.000Z', text: 'new' },
  ];
  assert.equal(sortEntriesDesc(entries)[0].id, 'b');
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test public/js/features/eventualidades-panel.test.mjs`

- [ ] **Step 3: Implement minimal module + UI**

**Save path (required):** Use `lanPushPatientVersioned` with `changedKeys: ['eventualidades']`, `expectedVersion` from host `GET /patients` row (same pattern as `lanPushPatientArchived`). Never append via raw `saveState` alone when LAN REST is configured. On success, merge `out.data` into the local `patients[]` row and `rememberLiveSyncEntity('patient', ...)`.

```js
export function appendEventualidad(store, text, clientId) {
  const t = String(text || '').trim();
  if (!t) return store;
  const entry = {
    id: 'ev_' + Date.now().toString(36),
    at: new Date().toISOString(),
    text: t,
    clientId: clientId || undefined,
  };
  const entries = Array.isArray(store?.entries) ? store.entries.slice() : [];
  entries.push(entry);
  return { entries };
}

export function sortEntriesDesc(entries) {
  return (entries || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export function renderEventualidadesPanel(mountEl, patient, rt) {
  // list + textarea + Agregar; persist patient.eventualidades via saveState / LAN patient PUT
}
```

Wire save through existing patient update path in `patients.mjs` or `saveState` callback passed via runtime.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Bundle**

Run: `npm run bundle:renderer`

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| Sala top tabs without EA | Task 1 |
| Clínico segment order | Task 1–2 |
| Inter sin historia | Task 1 tests |
| Eventualidades panel | Task 4 |
| Rename Historia Clínica | Task 2 |

**Gaps:** LAN sync for `patient.eventualidades` — verify in Task 4 against `lan-sync.mjs` patient push; add sub-step if patient mutations already sync whole patient object.

---

## Verification

```bash
node --test public/js/expediente-tabs.test.mjs public/js/features/eventualidades-panel.test.mjs
npm run bundle:renderer
```

Manual: Sala → Clínico → each segment renders; Inter → no Historia Clínica segment.
