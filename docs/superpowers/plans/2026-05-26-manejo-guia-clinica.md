# Guía clínica unificada (Manejo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Manejo sub-tabs Patologías / Infusiones / ATB with one **Guía clínica** tab (Patología | Infusión | Antibiótico modes), using **index → full-width reading** navigation and an inline pathology timeline—without changing clinical engines or Electrolitos.

**Architecture:** A small `manejo-guia-state.mjs` owns mode/view/entity session + legacy key migration. `manejo-guia.mjs` renders the shell (mode segment, single panel host). Mode-specific modules build compact indexes and reading views; pathology reading uses a testable `flattenPathologySteps()` timeline instead of card grids/modals. `manejo.mjs` keeps electrolitos + delegates `guia` to the shell.

**Tech Stack:** Vanilla ES modules (browser), Node test runner (`node --test`), existing manejo catalogs/calculators/cultivo bridge, CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-05-26-manejo-guia-clinica-design.md`

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `public/js/features/manejo-guia-state.mjs` | Create | Mode/view/entity persistence, legacy migration |
| `public/js/features/manejo-guia-state.test.mjs` | Create | Unit tests |
| `public/js/features/manejo-guia-steps.mjs` | Create | `flattenPathologySteps`, step labels |
| `public/js/features/manejo-guia-steps.test.mjs` | Create | Unit tests |
| `public/js/features/manejo-guia.mjs` | Create | Shell: segment, index/lectura host, `renderManejoGuia` |
| `public/js/features/manejo-guia-patologia.mjs` | Create | Patología índice + lectura timeline + inline SOME |
| `public/js/features/manejo-guia-infusion.mjs` | Create | Infusión índice + lectura (extract from protocolos) |
| `public/js/features/manejo-guia-atb.mjs` | Create | ATB índice + lectura (extract from ATB) |
| `public/js/features/manejo-guia-nav.mjs` | Create | `openGuiaPatologia`, `openGuiaInfusion`, `openGuiaAtb` |
| `public/js/features/manejo.mjs` | Modify | `MANEJO_SUBTABS`, delegate guía, export nav helpers |
| `public/js/features/manejo-patologias.mjs` | Modify | Thin re-exports / remove split UI (or delete render) |
| `public/styles/manejo-guia.css` | Create | Index rows, reading layout, timeline, sticky bar |
| `public/index.src.html` | Modify | Link `manejo-guia.css` after `manejo.css` |
| `public/index.html` | Modify | Same (built artifact) |
| `package.json` | Modify | Register new `*.test.mjs` files in `test` script |

---

## Phase 1 — State, shell, patología (highest value)

### Task 1: Guía session state + legacy migration

**Files:**
- Create: `public/js/features/manejo-guia-state.mjs`
- Create: `public/js/features/manejo-guia-state.test.mjs`
- Modify: `package.json` (append both test paths to `"test"`)

- [ ] **Step 1: Write failing tests**

Create `public/js/features/manejo-guia-state.test.mjs`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIA_MODES,
  getGuiaMode,
  setGuiaMode,
  getGuiaView,
  setGuiaView,
  getGuiaEntityId,
  setGuiaEntityId,
  navigateGuia,
  migrateLegacyManejoSubtab,
  resetGuiaStateForTests,
} from './manejo-guia-state.mjs';

test('GUIA_MODES includes patologia infusion atb', () => {
  assert.deepEqual(GUIA_MODES, ['patologia', 'infusion', 'atb']);
});

test('migrateLegacyManejoSubtab maps old subtabs', () => {
  resetGuiaStateForTests();
  assert.equal(migrateLegacyManejoSubtab('patologias'), 'patologia');
  assert.equal(migrateLegacyManejoSubtab('infusiones'), 'infusion');
  assert.equal(migrateLegacyManejoSubtab('protocolos'), 'infusion');
  assert.equal(migrateLegacyManejoSubtab('atb'), 'atb');
  assert.equal(migrateLegacyManejoSubtab('cad-ehh'), 'patologia');
  assert.equal(migrateLegacyManejoSubtab('electrolitos'), null);
});

test('navigateGuia sets mode view entity', () => {
  resetGuiaStateForTests();
  navigateGuia({ mode: 'patologia', view: 'lectura', entityId: 'hyperkalemia-acute' });
  assert.equal(getGuiaMode(), 'patologia');
  assert.equal(getGuiaView(), 'lectura');
  assert.equal(getGuiaEntityId(), 'hyperkalemia-acute');
});

test('setGuiaMode from lectura resets to indice', () => {
  resetGuiaStateForTests();
  navigateGuia({ mode: 'patologia', view: 'lectura', entityId: 'x' });
  setGuiaMode('infusion');
  assert.equal(getGuiaView(), 'indice');
  assert.equal(getGuiaEntityId(), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/features/manejo-guia-state.test.mjs`  
Expected: FAIL — cannot find module `./manejo-guia-state.mjs`

- [ ] **Step 3: Implement state module**

Create `public/js/features/manejo-guia-state.mjs`:

```javascript
export const GUIA_MODES = ['patologia', 'infusion', 'atb'];

var KEYS = {
  mode: 'manejoGuia.mode',
  view: 'manejoGuia.view',
  entityId: 'manejoGuia.entityId',
  fromPathologyId: 'manejoGuia.fromPathologyId',
  legacySubtab: 'manejoSubtab',
  legacyProto: 'manejoProtoSelectedId',
  legacyPathology: 'manejoPathologySelected',
};

/** In-memory fallback when sessionStorage unavailable (tests). */
var _mem = Object.create(null);

function read(key) {
  try {
    return sessionStorage.getItem(key);
  } catch (_e) {
    return _mem[key] != null ? String(_mem[key]) : null;
  }
}

function write(key, val) {
  try {
    if (val == null || val === '') sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(val));
  } catch (_e2) {
    if (val == null || val === '') delete _mem[key];
    else _mem[key] = String(val);
  }
}

export function resetGuiaStateForTests() {
  Object.keys(KEYS).forEach(function (k) {
    write(KEYS[k], null);
  });
  _mem = Object.create(null);
}

export function migrateLegacyManejoSubtab(legacyId) {
  if (legacyId === 'patologias' || legacyId === 'cad-ehh') return 'patologia';
  if (legacyId === 'infusiones' || legacyId === 'protocolos') return 'infusion';
  if (legacyId === 'atb') return 'atb';
  return null;
}

export function getGuiaMode() {
  var m = read(KEYS.mode);
  return GUIA_MODES.indexOf(m) >= 0 ? m : 'patologia';
}

export function setGuiaMode(mode) {
  if (GUIA_MODES.indexOf(mode) < 0) return;
  if (getGuiaMode() !== mode && getGuiaView() === 'lectura') {
    setGuiaView('indice');
    setGuiaEntityId('');
  }
  write(KEYS.mode, mode);
}

export function getGuiaView() {
  var v = read(KEYS.view);
  return v === 'lectura' ? 'lectura' : 'indice';
}

export function setGuiaView(view) {
  write(KEYS.view, view === 'lectura' ? 'lectura' : 'indice');
}

export function getGuiaEntityId() {
  return read(KEYS.entityId) || '';
}

export function setGuiaEntityId(id) {
  write(KEYS.entityId, id || '');
}

export function getGuiaFromPathologyId() {
  return read(KEYS.fromPathologyId) || '';
}

export function setGuiaFromPathologyId(id) {
  write(KEYS.fromPathologyId, id || '');
}

/** @param {{ mode?: string, view?: string, entityId?: string, fromPathologyId?: string }} patch */
export function navigateGuia(patch) {
  patch = patch || {};
  if (patch.mode) setGuiaMode(patch.mode);
  if (patch.view) setGuiaView(patch.view);
  if (patch.entityId != null) setGuiaEntityId(patch.entityId);
  if (patch.fromPathologyId != null) setGuiaFromPathologyId(patch.fromPathologyId);
}

/** Call once when opening guía tab after legacy subtab stored. */
export function hydrateGuiaFromLegacySession() {
  var legacy = read(KEYS.legacySubtab);
  var mode = migrateLegacyManejoSubtab(legacy);
  if (!mode) return;
  navigateGuia({ mode: mode, view: 'indice' });
  var proto = read(KEYS.legacyProto);
  var path = read(KEYS.legacyPathology);
  if (mode === 'patologia' && path) {
    navigateGuia({ view: 'lectura', entityId: path });
  } else if (mode === 'infusion' && proto) {
    navigateGuia({ view: 'lectura', entityId: proto });
  }
}
```

- [ ] **Step 4: Run tests**

Run: `node --test public/js/features/manejo-guia-state.test.mjs`  
Expected: PASS (4 tests)

- [ ] **Step 5: Register in package.json**

Append to the `"test"` script array:

```
public/js/features/manejo-guia-state.test.mjs
```

- [ ] **Step 6: Commit**

```bash
git add public/js/features/manejo-guia-state.mjs public/js/features/manejo-guia-state.test.mjs package.json
git commit -m "feat(manejo): add guía clínica session state module"
```

---

### Task 2: Pathology step flattening (timeline data)

**Files:**
- Create: `public/js/features/manejo-guia-steps.mjs`
- Create: `public/js/features/manejo-guia-steps.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenPathologySteps } from './manejo-guia-steps.mjs';
import { findPathologyById } from '../manejo-pathology-catalog.mjs';

test('flattenPathologySteps numbers globally across sections', () => {
  var entry = findPathologyById('hyperkalemia-acute');
  assert.ok(entry);
  var steps = flattenPathologySteps(entry);
  assert.ok(steps.length >= 3);
  assert.equal(steps[0].number, 1);
  assert.equal(steps[steps.length - 1].number, steps.length);
  assert.equal(steps[0].sectionTitle, 'Estabilización de membrana cardíaca');
});

test('flattenPathologySteps preserves item type', () => {
  var entry = findPathologyById('hyperkalemia-acute');
  var proto = flattenPathologySteps(entry).find(function (s) {
    return s.item.type === 'protocol';
  });
  assert.ok(proto);
  assert.equal(proto.item.protocolId, 'ca-gluconate-bolus');
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `node --test public/js/features/manejo-guia-steps.test.mjs`

- [ ] **Step 3: Implement**

```javascript
/**
 * @param {import('../manejo-pathology-catalog.mjs').ManejoPathologyEntry} entry
 * @returns {Array<{ number: number, sectionId: string, sectionTitle: string, item: object }>}
 */
export function flattenPathologySteps(entry) {
  var out = [];
  var n = 0;
  (entry.sections || []).forEach(function (section) {
    (section.items || []).forEach(function (item) {
      n += 1;
      out.push({
        number: n,
        sectionId: section.id,
        sectionTitle: section.title,
        item: item,
      });
    });
  });
  return out;
}

/** @param {string} tier */
export function tierChipLabel(tier) {
  if (tier === 'first-line') return '1.ª línea';
  if (tier === 'alternative') return 'Alternativa';
  return '';
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add public/js/features/manejo-guia-steps.mjs public/js/features/manejo-guia-steps.test.mjs package.json
git commit -m "feat(manejo): flatten pathology steps for guía timeline"
```

---

### Task 3: Base CSS — reading + index rows

**Files:**
- Create: `public/styles/manejo-guia.css`
- Modify: `public/index.src.html`
- Modify: `public/index.html`

- [ ] **Step 1: Add stylesheet link** (after `manejo.css`):

```html
<link rel="stylesheet" href="styles/manejo-guia.css">
```

- [ ] **Step 2: Create `manejo-guia.css`** with at minimum:

```css
/* Guía clínica — index + reading (single column) */
.manejo-guia-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.manejo-guia-mode-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.manejo-guia-reading {
  max-width: 72rem;
  width: 100%;
  margin: 0 auto;
}

.manejo-guia-reading-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 8px 0 12px;
  background: color-mix(in oklab, var(--bg) 92%, transparent);
  backdrop-filter: blur(6px);
}

.manejo-guia-back {
  font-size: 13px;
  font-weight: 600;
}

.manejo-guia-index-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid color-mix(in oklab, var(--border) 88%, transparent);
  border-radius: 10px;
  background: var(--surface, var(--card));
  text-align: left;
  cursor: pointer;
}

.manejo-guia-timeline-section h2 {
  margin: 20px 0 8px;
  padding-left: 10px;
  border-left: 3px solid var(--pathology-branch-accent, var(--accent, #2563eb));
  font-size: 15px;
  font-weight: 700;
}

.manejo-guia-step {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 10px;
  padding: 8px 0;
}

.manejo-guia-step-num {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--text-muted);
}

.manejo-guia-step-expand {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--surface-2, var(--surface)) 80%, transparent);
}

.manejo-guia-step-expand[hidden] {
  display: none !important;
}
```

- [ ] **Step 3: Manual smoke** — open app, confirm CSS loads (no 404 in network tab).

- [ ] **Step 4: Commit**

```bash
git add public/styles/manejo-guia.css public/index.src.html public/index.html
git commit -m "style(manejo): add guía clínica layout stylesheet"
```

---

### Task 4: Guía shell + wire `manejo.mjs` subtabs

**Files:**
- Create: `public/js/features/manejo-guia.mjs`
- Modify: `public/js/features/manejo.mjs`

- [ ] **Step 1: Create shell** `renderManejoGuia(panel, ctx)` where `ctx` includes `{ pid, patient, ui }`:

- Render `.manejo-guia-root`
- Mode bar: three buttons calling `setGuiaMode` + `renderManejo()` (or callback `ctx.rerender`)
- On mount: `hydrateGuiaFromLegacySession()`
- If `getGuiaView() === 'indice'`: delegate to `renderGuiaPatologiaIndex` / infusion / atb stubs (empty hint OK in this task)
- If `lectura`: delegate to reading renderers (stub “Lectura: {id}” OK until Task 5)

- [ ] **Step 2: Change `MANEJO_SUBTABS` in `manejo.mjs`:**

```javascript
const MANEJO_SUBTABS = [
  { id: 'electrolitos', label: 'Electrolitos' },
  { id: 'guia', label: 'Guía clínica' },
];
```

- [ ] **Step 3: Update `getActiveManejoSubtab` / migration:** if stored value is `patologias|infusiones|atb|protocolos|cad-ehh`, map to `guia` and call `hydrateGuiaFromLegacySession()`.

- [ ] **Step 4: `renderActiveManejoSubpanel`:** `guia` → `renderManejoGuia(panel, buildManejoGuiaContext())`; remove direct calls to `renderManejoPatologias`, `renderManejoProtocolos`, `renderManejoAtb` from subpanel switch (keep functions until Phase 2–3).

- [ ] **Step 5: Import** `renderManejoGuia` at top of `manejo.mjs`.

- [ ] **Step 6: Manual test** — Manejo shows 2 subtabs; Guía clínica shows mode segment; switching modes works.

- [ ] **Step 7: Commit**

```bash
git add public/js/features/manejo-guia.mjs public/js/features/manejo.mjs
git commit -m "feat(manejo): shell guía clínica tab with three modes"
```

---

### Task 5: Patología — compact index + reading timeline

**Files:**
- Create: `public/js/features/manejo-guia-patologia.mjs`
- Modify: `public/js/features/manejo-guia.mjs`
- Modify: `public/js/features/manejo.mjs` (expose `buildProtocolDetailPanel`, `findProtocolEntryById`, CAD block via `buildManejoPatologiasUi`)

- [ ] **Step 1: Index renderer** `renderGuiaPatologiaIndex(host, ctx)`:

- Reuse search input helper from `manejo.mjs` (`buildManejoSearchInput`) via ctx.ui
- Branch filter: reuse `getPathologyBranchFilter` / `setPathologyBranchFilter` from `manejo-patologias.mjs` (export if needed)
- Rows: `.manejo-guia-index-row` with title, branch label, step count badge — **no** `entry.summary` in list
- Click: `navigateGuia({ view: 'lectura', entityId: entry.id })` + rerender

- [ ] **Step 2: Reading renderer** `renderGuiaPatologiaReading(host, ctx)`:

- Sticky bar: back button → `navigateGuia({ view: 'indice', entityId: '' })`
- Lead: summary, `<details>` definition, CAD/EHH via `ctx.ui.buildPathologyCadEhhBlock`
- Timeline: group `flattenPathologySteps` by `sectionTitle` (render H2 once per section)
- Text items: paragraph
- Protocol/recommendation: compact row + tier chip + “Ver pedido SOME” toggles `.manejo-guia-step-expand` with `buildProtocolDetailPanel(proto, patient, { embed: true })` — **do not** call `openPathologyFocusModal`
- Footer link in expand: `navigateGuia({ mode: 'infusion', view: 'lectura', entityId: proto.id, fromPathologyId: entry.id })`
- Collapsible linked infusions, monitoring block, related chips → `navigateGuia({ view: 'lectura', entityId: rel.id })`

- [ ] **Step 3: Wire in `manejo-guia.mjs`** for mode `patologia`.

- [ ] **Step 4: Manual test checklist (patología)**

  - [ ] Index: select hiperpotasemia → full-width reading, no sidebar list visible
  - [ ] Step 1 visible without scrolling on 1440×900
  - [ ] Expand SOME inline under step — no modal
  - [ ] “Abrir en modo Infusión” switches mode + opens protocol reading (stub OK until Task 6)
  - [ ] Related pathology chip replaces content

- [ ] **Step 5: Commit**

```bash
git add public/js/features/manejo-guia-patologia.mjs public/js/features/manejo-guia.mjs public/js/features/manejo.mjs public/js/features/manejo-patologias.mjs
git commit -m "feat(manejo): patología guía index and reading timeline"
```

---

## Phase 2 — Infusión mode

### Task 6: Infusión index + reading

**Files:**
- Create: `public/js/features/manejo-guia-infusion.mjs`
- Modify: `public/js/features/manejo-guia.mjs`
- Modify: `public/js/features/manejo.mjs` (move/filter helpers or pass via ctx)

- [ ] **Step 1: Extract** logic from `renderManejoProtocolos` (lines ~2699+) into:

- `renderGuiaInfusionIndex` — single toolbar row (search, count, + Infusión, chips Favoritos/Recientes/Todos, category/use menus, calc toggle); insulin reference in `<details open=false>`; compact rows
- `renderGuiaInfusionReading` — reuse `buildProtocolDetailPanel`; sticky bar; favorite + edit actions in foot

- [ ] **Step 2: Reading view hides index** (shell already does); breadcrumb if `getGuiaFromPathologyId()` set: `Patología › {title} › {protocol}`

- [ ] **Step 3: `pathologiesLinkedToProtocol`** — link chips in reading foot → `navigateGuia({ mode: 'patologia', view: 'lectura', entityId })`

- [ ] **Step 4: Manual test** — favorites, recent, custom protocol editor modal still opens from index `+ Infusión`

- [ ] **Step 5: Commit**

```bash
git add public/js/features/manejo-guia-infusion.mjs public/js/features/manejo-guia.mjs public/js/features/manejo.mjs
git commit -m "feat(manejo): infusión mode in guía clínica"
```

---

## Phase 3 — Antibiótico mode

### Task 7: ATB index + reading (culture banner collapsible)

**Files:**
- Create: `public/js/features/manejo-guia-atb.mjs`
- Modify: `public/js/features/manejo-guia.mjs`
- Modify: `public/js/features/manejo.mjs`

- [ ] **Step 1: Extract** from `renderManejoAtb` (~3055+):

- Index: culture strip + `<details>` antibiograma; eGFR chip in search row; RIS chips only if isolate; family menu; compact drug rows with S/R/I badge
- Reading: indications → renal → SOME → culture summary (no `wireAtbRisHoverPanels` on body for primary UX; optional keep hover on index rows only)

- [ ] **Step 2: Wire mode `atb` in shell**

- [ ] **Step 3: Manual test** — patient with culture: RIS filter works; reading shows renal adjustment

- [ ] **Step 4: Commit**

```bash
git add public/js/features/manejo-guia-atb.mjs public/js/features/manejo-guia.mjs public/js/features/manejo.mjs
git commit -m "feat(manejo): ATB mode in guía clínica"
```

---

## Phase 4 — Navigation API, cleanup, regression

### Task 8: Unified navigation helpers + legacy call sites

**Files:**
- Create: `public/js/features/manejo-guia-nav.mjs`
- Modify: `public/js/features/manejo-patologias.mjs` (remove modal-first paths or delete unused render)
- Modify: `public/js/features/manejo.mjs`
- Grep: `setActiveManejoSubtab('infusiones'|'patologias'|'atb')`

- [ ] **Step 1: Implement**

```javascript
import { navigateGuia } from './manejo-guia-state.mjs';

export function openGuiaPatologia(pathologyId) {
  navigateGuia({ mode: 'patologia', view: 'lectura', entityId: pathologyId });
}

export function openGuiaInfusion(protocolId, fromPathologyId) {
  navigateGuia({
    mode: 'infusion',
    view: 'lectura',
    entityId: protocolId,
    fromPathologyId: fromPathologyId || '',
  });
}

export function openGuiaAtb(drugId, fromPathologyId) {
  navigateGuia({
    mode: 'atb',
    view: 'lectura',
    entityId: drugId,
    fromPathologyId: fromPathologyId || '',
  });
}
```

- [ ] **Step 2: Export from `manejo.mjs`** and replace:

- `openAtbDrug` → `openGuiaAtb` + `setActiveManejoSubtab('guia')` + `renderManejo`
- `setPathologySelectedId` + subtab patologias → `openGuiaPatologia`
- Footer “Ver en Infusiones” in pathology → `openGuiaInfusion`

- [ ] **Step 3: Run full test suite**

Run: `npm test`  
Expected: all tests PASS (including new guía tests)

- [ ] **Step 4: Commit**

```bash
git add public/js/features/manejo-guia-nav.mjs public/js/features/manejo.mjs public/js/features/manejo-patologias.mjs
git commit -m "feat(manejo): unified guía navigation API"
```

---

### Task 9: Remove dead split/modal paths + CSS trim

**Files:**
- Modify: `public/js/features/manejo-patologias.mjs` — remove `renderManejoPatologias` export if unused, or make it delegate to guía for backwards compat
- Modify: `public/js/features/manejo.mjs` — delete `renderManejoProtocolos` / `renderManejoAtb` bodies if fully moved (or keep thin wrappers throwing in dev)
- Modify: `public/styles/manejo.css` — add comment `/* guía: prefer manejo-guia.css */`; do not delete legacy rules until smoke passes

- [ ] **Step 1: Grep** `renderManejoPatologias|manejo-proto-split|openPathologyFocusModal` — zero required references from active paths

- [ ] **Step 2: Optional feature flag** `window.MANEJO_GUIA_V2 = true` default on; if off, fall back not required per spec (YAGNI — skip unless user asks)

- [ ] **Step 3: Manual regression matrix**

| Flow | Desktop | Mobile ≤899px |
|------|---------|----------------|
| Patología index → lectura → back | ✓ | ✓ |
| Expand SOME inline | ✓ | ✓ |
| Infusión favoritos / editor | ✓ | ✓ |
| ATB + cultivo + RIS | ✓ | ✓ |
| Electrolitos unchanged | ✓ | ✓ |
| Deep link legacy `manejoSubtab=infusiones` | opens guía infusión | ✓ |

- [ ] **Step 4: Commit**

```bash
git add public/js/features public/styles
git commit -m "chore(manejo): remove legacy guía split layouts"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Single Guía tab replaces 3 | Task 4 |
| Three modes | Task 4 |
| Index / lectura | Task 1, 4 |
| Patología timeline, no modal | Task 2, 5 |
| Inline SOME expand | Task 5 |
| Infusión simplified index + reading | Task 6 |
| ATB culture collapsible, no body RIS hover primary | Task 7 |
| Cross-nav | Task 8 |
| Electrolitos untouched | Task 4 (only subtabs array) |
| Session / legacy keys | Task 1, 4 |
| CSS reading 72ch / sticky bar | Task 3 |
| Tests | Task 1, 2 |

No TBD placeholders in plan steps.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-05-26-manejo-guia-clinica.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement in this session with checkpoints (`executing-plans`)

Which approach do you want?
