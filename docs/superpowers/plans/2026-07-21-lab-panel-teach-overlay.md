# Lab Panel Teach Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When SOME paste is empty or leaves unmapped studies, open a two-page teach wizard (select on SOME → edit analyte rows + live preview); on confirm apply lab lines like other panels, persist a PanelDef overlay, and sync it silently to the LAN room so peers parse the same labs without seeing the wizard.

**Architecture:** Immutable built-in `LAB_EXTENDED_PANEL_DEFS` plus a serializable overlay (patches + user panels). Effective registry feeds `parseExtendedLabPanels_`. Residual detector uses `parseSomeReportTables`. Wizard is lazy-loaded Hallmark UI. Overlay syncs as top-level room bundle field `labPanelOverlay` (LWW by `panelId`), not inside SQL clinicalOps.

**Tech Stack:** Electron renderer ESM, existing `labs-panel-*.mjs` / `labs-some-table-*.mjs`, LAN host-store bundle merge (`lan-squad/bundle-merge-sections.js`), `node --test` via `npm run test:one`, `npm run build:ui`.

**Spec:** [docs/superpowers/specs/2026-07-21-lab-panel-teach-overlay-design.md](../specs/2026-07-21-lab-panel-teach-overlay-design.md)

## Global Constraints

- Spanish UI copy only
- Reuse `PanelDef` / `parsePanelDef_` / `extraerConRangoPanel` — no parallel parser engine
- No new static imports in `app.js`, `app-shell.mjs`, or `app-runtimes.mjs` (lazy-load teach modal)
- Tier 1: complexity ≤15, function ≤80 lines, file ≤600 lines on touched/new files
- Tests: `npm run test:one -- <path>` only — never full `npm test` during implementation
- Peers never see a shared “parser admin” UI

---

## File map

| File | Responsibility |
|------|----------------|
| `public/js/labs-panel-overlay.mjs` | Pure: serialize/hydrate defs, merge overlay → effective `PanelDef[]`, LWW merge overlays |
| `public/js/labs-panel-overlay.test.mjs` | Unit tests for merge / hydrate / LWW |
| `public/js/labs-panel-overlay-store.mjs` | localStorage load/save + in-memory cache + `getEffectivePanelDefs()` |
| `public/js/labs-panel-parse.mjs` | Use effective defs inside `parseExtendedLabPanels_` |
| `public/js/labs-panel-residual.mjs` | Residual SOME candidates not covered by core/effective registry |
| `public/js/labs-panel-residual.test.mjs` | Detector tests |
| `public/js/labs-panel-teach-model.mjs` | Rows ↔ PanelDef ↔ preview lines (pure) |
| `public/js/labs-panel-teach-model.test.mjs` | Preview / row model tests |
| `public/js/features/lab-panel-teach-modal.mjs` | Wizard shell, open/close, confirm/discard, LAN enqueue |
| `public/js/features/lab-panel-teach-page-some.mjs` | Page 1: SOME visual + selection |
| `public/js/features/lab-panel-teach-page-rows.mjs` | Page 2: editable rows + live preview |
| `public/partials/chrome/overlays.html` | Modal markup (`lab-panel-teach-*`) |
| `public/styles/lab.css` | Teach wizard styles (Hallmark tokens) |
| `public/js/features/lab-panel-workbench.mjs` | After paste display: trigger A/B → open wizard |
| `public/js/lab-bulk-paste.mjs` | Allow “empty resLabs but SOME-like” path into teach (not hard fail) |
| `public/js/features/lan/lab-panel-overlay-sync.mjs` | Push/pull `labPanelOverlay` on room bundle |
| `lan-squad/bundle-merge-sections.js` | Merge `labPanelOverlay` LWW |
| `lan-squad/host-store/` (bundle helpers as needed) | Persist/serve `labPanelOverlay` on room |
| `docs/logic/logic-index.md` | One-line pointer to teach overlay |
| `.cursor/rules/project-context.mdc` | Changelog bullet on commit |

---

### Task 1: Overlay merge (pure)

**Files:**
- Create: `public/js/labs-panel-overlay.mjs`
- Create: `public/js/labs-panel-overlay.test.mjs`

**Interfaces:**
- `OverlayRecord = { panelId, baseSectionKey?, sectionKey, mode, gates: string[], fields, updatedAt, updatedBy }`
- `mergeLabPanelOverlayLww(localArr, incomingArr) → OverlayRecord[]`
- `overlayRecordToPanelDef(record) → PanelDef` (compile gate/pattern strings to `RegExp`)
- `applyOverlayToBuiltins(builtins, overlayArr) → PanelDef[]`
- `panelDefToOverlayPatch(def, { panelId, updatedAt, updatedBy, baseSectionKey? }) → OverlayRecord`

- [ ] **Step 1: Write failing tests**

```javascript
// public/js/labs-panel-overlay.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAB_EXTENDED_PANEL_DEFS } from './labs-panel-defs.mjs';
import {
  mergeLabPanelOverlayLww,
  applyOverlayToBuiltins,
  overlayRecordToPanelDef,
} from './labs-panel-overlay.mjs';

test('LWW keeps newer updatedAt per panelId', () => {
  var a = [{ panelId: 'builtin:TIR', sectionKey: 'TIR', mode: 'num', gates: ['TSH'], fields: [], updatedAt: 1, updatedBy: 'x' }];
  var b = [{ panelId: 'builtin:TIR', sectionKey: 'TIR', mode: 'num', gates: ['TSH', 'T4 LIBRE'], fields: [], updatedAt: 2, updatedBy: 'y' }];
  var m = mergeLabPanelOverlayLww(a, b);
  assert.equal(m.length, 1);
  assert.equal(m[0].gates.length, 2);
  assert.equal(m[0].updatedBy, 'y');
});

test('applyOverlayToBuiltins patches TIR labels', () => {
  var overlay = [{
    panelId: 'builtin:TIR',
    baseSectionKey: 'TIR',
    sectionKey: 'TIR',
    mode: 'num',
    gates: ['TSH'],
    fields: [{ key: 'TSH', labels: ['TSH', 'HORMONA ESTIMULANTE DE LA TIROIDES', 'TSH ULTRA'] }],
    updatedAt: 1,
    updatedBy: 'x',
  }];
  var eff = applyOverlayToBuiltins(LAB_EXTENDED_PANEL_DEFS, overlay);
  var tir = eff.find((d) => d.sectionKey === 'TIR' && d.mode === 'num');
  assert.ok(tir.fields.some((f) => f.key === 'TSH' && f.labels.includes('TSH ULTRA')));
});

test('user panel appends new sectionKey', () => {
  var overlay = [{
    panelId: 'user:abc',
    sectionKey: 'CUST',
    mode: 'num',
    gates: ['FOO MARKER'],
    fields: [{ key: 'Foo', labels: ['FOO MARKER'] }],
    updatedAt: 1,
    updatedBy: 'x',
  }];
  var eff = applyOverlayToBuiltins(LAB_EXTENDED_PANEL_DEFS, overlay);
  assert.ok(eff.some((d) => d.sectionKey === 'CUST'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:one -- public/js/labs-panel-overlay.test.mjs`  
Expected: FAIL (module missing)

- [ ] **Step 3: Implement `labs-panel-overlay.mjs`**

```javascript
// public/js/labs-panel-overlay.mjs — key exports (keep helpers ≤15 complexity)
export function mergeLabPanelOverlayLww(localArr, incomingArr) {
  var map = Object.create(null);
  function put(rec) {
    if (!rec || !rec.panelId) return;
    var prev = map[rec.panelId];
    if (!prev || Number(rec.updatedAt || 0) >= Number(prev.updatedAt || 0)) {
      map[rec.panelId] = rec;
    }
  }
  (localArr || []).forEach(put);
  (incomingArr || []).forEach(put);
  return Object.keys(map).map(function (k) { return map[k]; });
}

export function overlayRecordToPanelDef(rec) {
  var gates = (rec.gates || []).map(function (g) {
    return typeof g === 'string' ? new RegExp(escapeRe(g), 'i') : g;
  });
  var fields = (rec.fields || []).map(hydrateField);
  return { sectionKey: rec.sectionKey, mode: rec.mode || 'num', gates: gates, fields: fields };
}

export function applyOverlayToBuiltins(builtins, overlayArr) {
  var list = (builtins || []).map(cloneDef);
  (overlayArr || []).forEach(function (rec) {
    if (String(rec.panelId || '').indexOf('builtin:') === 0) {
      var idx = findBuiltinIndex(list, rec);
      if (idx >= 0) list[idx] = overlayRecordToPanelDef(rec);
      else list.push(overlayRecordToPanelDef(rec));
    } else {
      list.push(overlayRecordToPanelDef(rec));
    }
  });
  return list;
}
```

Implement `escapeRe`, `hydrateField`, `cloneDef`, `findBuiltinIndex` (match `baseSectionKey` + `mode`).

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:one -- public/js/labs-panel-overlay.test.mjs`

- [ ] **Step 5: Commit**

```bash
git add public/js/labs-panel-overlay.mjs public/js/labs-panel-overlay.test.mjs
git commit -m "$(cat <<'EOF'
feat(labs): pure PanelDef overlay merge + LWW

EOF
)"
```

---

### Task 2: Overlay store + wire `parseExtendedLabPanels_`

**Files:**
- Create: `public/js/labs-panel-overlay-store.mjs`
- Modify: `public/js/labs-panel-parse.mjs`
- Modify: `public/js/labs-panel-extended.test.mjs` (one test that patched label is used when store seeded)

**LS key:** `rpc-lab-panel-overlay` → JSON `{ overlays: OverlayRecord[] }`

- [ ] **Step 1: Failing test — parse uses store**

```javascript
// in labs-panel-extended.test.mjs
import { replaceLabPanelOverlayForTests, clearLabPanelOverlayForTests } from './labs-panel-overlay-store.mjs';

test('parseExtendedLabPanels_ honors overlay store patch', () => {
  replaceLabPanelOverlayForTests([{
    panelId: 'user:zz',
    sectionKey: 'CUST',
    mode: 'num',
    gates: ['MARCADOR ZZ'],
    fields: [{ key: 'Zz', labels: ['MARCADOR ZZ'] }],
    updatedAt: 1,
    updatedBy: 't',
  }]);
  try {
    var t = 'QUIMICA CLINICA\n' + someNum('MARCADOR ZZ', '9', 'ng/mL', '0 - 5');
    var lines = parseExtendedLabPanels_(t);
    assert.ok(lines.some((l) => l.startsWith('CUST\t') && /\bZz 9\*/.test(l)));
  } finally {
    clearLabPanelOverlayForTests();
  }
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement store**

```javascript
// public/js/labs-panel-overlay-store.mjs
import { LAB_EXTENDED_PANEL_DEFS } from './labs-panel-defs.mjs';
import { applyOverlayToBuiltins, mergeLabPanelOverlayLww } from './labs-panel-overlay.mjs';

var LS_KEY = 'rpc-lab-panel-overlay';
var memory = null;

export function loadLabPanelOverlays() {
  if (memory) return memory.slice();
  // read localStorage safely → memory
  return memory ? memory.slice() : [];
}

export function saveLabPanelOverlays(arr) {
  memory = (arr || []).slice();
  try { localStorage.setItem(LS_KEY, JSON.stringify({ overlays: memory })); } catch (_e) { /* ignore */ }
}

export function upsertLabPanelOverlay(record) {
  var next = mergeLabPanelOverlayLww(loadLabPanelOverlays(), [record]);
  saveLabPanelOverlays(next);
  return next;
}

export function getEffectivePanelDefs() {
  return applyOverlayToBuiltins(LAB_EXTENDED_PANEL_DEFS, loadLabPanelOverlays());
}

export function replaceLabPanelOverlayForTests(arr) { memory = (arr || []).slice(); }
export function clearLabPanelOverlayForTests() { memory = null; }
```

- [ ] **Step 4: Change `parseExtendedLabPanels_`**

```javascript
// labs-panel-parse.mjs
import { getEffectivePanelDefs } from './labs-panel-overlay-store.mjs';

export function parseExtendedLabPanels_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== 'string') return [];
  var defs = getEffectivePanelDefs();
  var out = [];
  for (var i = 0; i < defs.length; i++) {
    var line = parsePanelDef_(defs[i], textoBruto);
    if (line) out.push(line);
  }
  return mergeSectionLines_(out);
}
```

Keep exporting `parsePanelDef_` unchanged for teach preview.

- [ ] **Step 5: Run tests**

```bash
npm run test:one -- public/js/labs-panel-extended.test.mjs public/js/labs-panel-overlay.test.mjs
```

- [ ] **Step 6: Commit**

```bash
git add public/js/labs-panel-overlay-store.mjs public/js/labs-panel-parse.mjs public/js/labs-panel-extended.test.mjs
git commit -m "$(cat <<'EOF'
feat(labs): overlay store feeds parseExtendedLabPanels_

EOF
)"
```

---

### Task 3: Residual detector

**Files:**
- Create: `public/js/labs-panel-residual.mjs`
- Create: `public/js/labs-panel-residual.test.mjs`

**Logic:**
1. `parseSomeReportTables(texto)` → flatten numeric/qual rows with `estudio`, `resultado`, ref.
2. Build covered label set from `getEffectivePanelDefs()` field labels/patterns (uppercase).
3. Also treat rows belonging to core sections as covered when `estudio` matches known core names (GLUCOSA, HGB, …) — start with: if `procesarLabs` already emitted a section whose defs claim the label, mark covered; simpler v1: any label that `extraerConRangoPanel` would hit on any effective def field OR matches a hardcode deny-list of BH/QS/EGO headers.
4. Return `{ candidates: [{ id, label, value, min, max, qual, sco, selected }], coveredCount }`.

- [ ] **Step 1: Failing tests**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { findResidualSomeStudies } from './labs-panel-residual.mjs';
import { clearLabPanelOverlayForTests } from './labs-panel-overlay-store.mjs';

test('residual finds TSH when TIR gates would not yet matter — fixture without TIR labels stripped', () => {
  clearLabPanelOverlayForTests();
  // Use a made-up marker not in builtins
  var texto =
    'Nombre: X\nExpediente: 1\nQUIMICA CLINICA\n' +
    'MARCADOR RARO\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
    'MARCADOR RARO\t\n*\n12\nng/mL\t0 - 5\n';
  var r = findResidualSomeStudies(texto, { resLabs: [] });
  assert.ok(r.candidates.some((c) => /MARCADOR RARO/i.test(c.label)));
});

test('residual empty when only glucosa and QS would cover — skip if too coupled; assert no crash', () => {
  var r = findResidualSomeStudies('GLUCOSA EN SANGRE\n95\nmg/dL\t70 - 100\n', { resLabs: ['QS\tGlu 95'] });
  assert.ok(Array.isArray(r.candidates));
});
```

- [ ] **Step 2: Implement detector** using `parseSomeReportTables` from `labs-some-table-parse.mjs`; map row → candidate; filter if label matches any effective def label (substring/uppercase).

- [ ] **Step 3: Run** `npm run test:one -- public/js/labs-panel-residual.test.mjs`

- [ ] **Step 4: Commit**

```bash
git add public/js/labs-panel-residual.mjs public/js/labs-panel-residual.test.mjs
git commit -m "$(cat <<'EOF'
feat(labs): residual SOME study detector for teach wizard

EOF
)"
```

---

### Task 4: Teach model (rows → PanelDef → preview)

**Files:**
- Create: `public/js/labs-panel-teach-model.mjs`
- Create: `public/js/labs-panel-teach-model.test.mjs`

- [ ] **Step 1: Failing tests**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  candidatesToDraftRows,
  draftRowsToPanelDef,
  previewLinesFromDraft,
  suggestKeyFromLabel,
} from './labs-panel-teach-model.mjs';
import { parsePanelDef_ } from './labs-panel-parse.mjs';

test('suggestKeyFromLabel', () => {
  assert.equal(suggestKeyFromLabel('T4 LIBRE'), 'T4L');
  assert.equal(suggestKeyFromLabel('HEMOGLOBINA GLICOSILADA'), 'HbA1c');
});

test('draftRowsToPanelDef + parsePanelDef_ preview', () => {
  var rows = [{
    included: true,
    label: 'MARCADOR RARO',
    key: 'Rare',
    value: '12',
    min: 0,
    max: 5,
    mode: 'num',
  }];
  var def = draftRowsToPanelDef(rows, { sectionKey: 'CUST', mode: 'num', gates: ['MARCADOR RARO'] });
  var texto =
    'MARCADOR RARO\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nMARCADOR RARO\t\n*\n12\nng/mL\t0 - 5\n';
  var line = parsePanelDef_(def, texto);
  assert.match(line, /^CUST\t/);
  assert.match(line, /\bRare 12\*/);
  assert.deepEqual(previewLinesFromDraft(rows, { sectionKey: 'CUST', mode: 'num' }, texto), [line]);
});
```

For `suggestKeyFromLabel`, include a small map for known scaffold keys + fallback: strip non-alnum, camel-ish short token (max 8 chars).

- [ ] **Step 2: Implement model**

```javascript
export function draftRowsToPanelDef(rows, meta) {
  var fields = (rows || []).filter((r) => r.included).map((r) => {
    if ((meta.mode || 'num') === 'qual') {
      return { key: r.key, patterns: [new RegExp(escapeRe(r.label), 'i')] };
    }
    return { key: r.key, labels: [r.label].concat(r.extraLabels || []) };
  });
  var gates = (meta.gates && meta.gates.length)
    ? meta.gates.map((g) => new RegExp(escapeRe(g), 'i'))
    : fields.map((f) => new RegExp(escapeRe(f.labels ? f.labels[0] : f.key), 'i'));
  return { sectionKey: meta.sectionKey, mode: meta.mode || 'num', gates: gates, fields: fields };
}
```

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git add public/js/labs-panel-teach-model.mjs public/js/labs-panel-teach-model.test.mjs
git commit -m "$(cat <<'EOF'
feat(labs): teach draft rows → PanelDef preview model

EOF
)"
```

---

### Task 5: Modal markup + CSS (Hallmark)

**Files:**
- Modify: `public/partials/chrome/overlays.html` (add backdrop + modal after `lab-some-tables-modal`)
- Modify: `public/styles/lab.css`
- Run: `npm run build:ui` (assemble index)

- [ ] **Step 1: Add markup**

```html
<div id="lab-panel-teach-backdrop" class="modal-backdrop" hidden>
  <div class="modal lab-panel-teach-modal" role="dialog" aria-modal="true"
       aria-labelledby="lab-panel-teach-title" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h2 id="lab-panel-teach-title">Configurar lectura</h2>
      <button type="button" class="modal-close" id="lab-panel-teach-close" aria-label="Cerrar">×</button>
    </div>
    <div class="lab-panel-teach-step" data-teach-step="1" id="lab-panel-teach-step-1">
      <p class="lab-panel-teach-hint">Selecciona los estudios del pegado SOME que quieres mapear.</p>
      <div id="lab-panel-teach-some-list" class="lab-panel-teach-some-list"></div>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" id="lab-panel-teach-cancel">Descartar</button>
        <button type="button" class="btn-primary" id="lab-panel-teach-continue">Continuar</button>
      </div>
    </div>
    <div class="lab-panel-teach-step" data-teach-step="2" id="lab-panel-teach-step-2" hidden>
      <button type="button" class="btn-ghost lab-panel-teach-back" id="lab-panel-teach-back">← Volver al SOME</button>
      <div class="lab-panel-teach-meta">
        <label>Grupo <input id="lab-panel-teach-section" class="input" maxlength="12" /></label>
        <label>Modo
          <select id="lab-panel-teach-mode" class="input">
            <option value="num">Numérico</option>
            <option value="qual">Cualitativo</option>
          </select>
        </label>
      </div>
      <div id="lab-panel-teach-rows" class="lab-panel-teach-rows"></div>
      <button type="button" class="btn-ghost" id="lab-panel-teach-add-row">+ Añadir fila</button>
      <div class="lab-panel-teach-preview-wrap">
        <div class="label">Vista previa</div>
        <pre id="lab-panel-teach-preview" class="lab-panel-teach-preview"></pre>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" id="lab-panel-teach-cancel-2">Descartar</button>
        <button type="button" class="btn-primary" id="lab-panel-teach-confirm">Confirmar lectura</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: CSS in `lab.css`** using `--color-surface`, `--color-ink`, `--border`, `--font-mono`, `--radius-md`; dense table rows; selected SOME chips with accent border; dim covered rows (opacity 0.45).

- [ ] **Step 3: `npm run build:ui`** — confirm `#lab-panel-teach-backdrop` in `public/index.html`.

- [ ] **Step 4: Commit**

```bash
git add public/partials/chrome/overlays.html public/styles/lab.css public/index.html
git commit -m "$(cat <<'EOF'
feat(labs): teach wizard modal shell (Hallmark)

EOF
)"
```

---

### Task 6: Wizard pages + modal controller

**Files:**
- Create: `public/js/features/lab-panel-teach-page-some.mjs`
- Create: `public/js/features/lab-panel-teach-page-rows.mjs`
- Create: `public/js/features/lab-panel-teach-modal.mjs`

**API:**

```javascript
// openLabPanelTeachModal({
//   sourceText, resLabs, patient, onConfirm({ overlayRecord, previewLines, mergedResLabs })
// })
```

- [ ] **Step 1: Page 1 renderer** — render candidates + uncovered table rows from residual; checkbox toggles `selected`; covered rows shown muted without checkbox (or unchecked disabled).

- [ ] **Step 2: Page 2 renderer** — build draft rows from selected; wire inputs → `previewLinesFromDraft` on input; confirm builds `OverlayRecord` via `panelDefToOverlayPatch` / new `user:` uuid; `upsertLabPanelOverlay`; call `onConfirm`.

- [ ] **Step 3: Modal controller** — show step 1/2, back preserves draft by label key; Esc/close = discard; no LAN yet (hook stub `queueLabPanelOverlayLanSync(record)` empty export).

- [ ] **Step 4: Manual smoke** — in Electron later; for now unit-test pure paths already covered. Optional: tiny DOM-free test that `buildConfirmPayload(draft, meta, sourceText)` returns overlay + lines.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/lab-panel-teach-*.mjs
git commit -m "$(cat <<'EOF'
feat(labs): teach wizard pages + modal controller

EOF
)"
```

---

### Task 7: Wire paste triggers (A + B)

**Files:**
- Modify: `public/js/features/lab-panel-workbench.mjs` (`finalizeBulkLabPaste`)
- Modify: `public/js/lab-bulk-paste.mjs` (empty `resLabs` SOME-like still surfaces a teachable block)
- Modify: `public/js/lazy-feature-routes-handlers.mjs` or teach open via dynamic `import()` only from workbench

**Trigger helper** (new small file OK): `public/js/labs-panel-teach-trigger.mjs`

```javascript
export function shouldOpenLabPanelTeach(sourceText, result) {
  var resLabs = (result && result.resLabs) || [];
  var residual = findResidualSomeStudies(sourceText, { resLabs: resLabs });
  var empty = !resLabs.length;
  var partial = residual.candidates.length > 0;
  return { open: empty || partial, residual: residual, empty: empty };
}
```

- [ ] **Step 1: In `finalizeBulkLabPaste`, after `displayResult` resolved:**

```javascript
import { shouldOpenLabPanelTeach } from '../labs-panel-teach-trigger.mjs';

// after displayResult.sourceText assigned:
var teach = shouldOpenLabPanelTeach(displayResult.sourceText || text, displayResult);
if (teach.open) {
  void import('./lab-panel-teach-modal.mjs').then(function (mod) {
    mod.openLabPanelTeachModal({
      sourceText: displayResult.sourceText || text,
      resLabs: displayResult.resLabs || [],
      residual: teach.residual,
      patient: displayResult.patient,
      onConfirm: function (payload) {
        displayResult.resLabs = payload.mergedResLabs;
        labPanelBridge.renderOutput(displayResult);
        // re-store history set if applicable (reuse existing store helpers)
        rt.showToast('Lectura configurada', 'success');
      },
    });
  });
}
```

Still call `renderOutput` with whatever was parsed first (partial case), then open wizard; on confirm re-render with merged lines.

- [ ] **Step 2: Empty path** — when `displayPick` fails because `resLabs` empty but `looksLikeSomeLabReport(text)`, open teach with `resLabs: []` instead of only error toast.

- [ ] **Step 3: Run related tests**

```bash
npm run test:one -- public/js/labs-panel-extended.test.mjs public/js/labs-panel-residual.test.mjs public/js/labs-panel-teach-model.test.mjs
```

- [ ] **Step 4: `npm run build:ui`**

- [ ] **Step 5: Commit**

```bash
git add public/js/labs-panel-teach-trigger.mjs public/js/features/lab-panel-workbench.mjs public/js/lab-bulk-paste.mjs
git commit -m "$(cat <<'EOF'
feat(labs): open teach wizard on empty or residual SOME paste

EOF
)"
```

---

### Task 8: LAN sync `labPanelOverlay`

**Files:**
- Create: `public/js/features/lan/lab-panel-overlay-sync.mjs`
- Modify: `lan-squad/bundle-merge-sections.js` — `mergeLabPanelOverlaySection`
- Modify: host-store bundle factory / push payload builders so room bundle includes `labPanelOverlay` + `entityVersions.labPanelOverlay`
- Modify: orchestrator apply path to call `applyLabPanelOverlayFromBundle(merged)`
- Test: `public/js/labs-panel-overlay.test.mjs` already has LWW; add `lan-squad` focused test if there is an existing bundle-merge test file to extend

**Sync shape on room bundle:**

```javascript
{
  labPanelOverlay: OverlayRecord[],  // full array winner merge
  entityVersions: { labPanelOverlay: number, ... }
}
```

- [ ] **Step 1: Merge section**

```javascript
// lan-squad/bundle-merge-sections.js
const { mergeLabPanelOverlayLww } = require('../public/js/labs-panel-overlay.cjs');
// Prefer: duplicate tiny LWW in lan-squad/lab-panel-overlay-lww.js (CJS) to avoid requiring ESM from public/
```

**Do not** `require` renderer ESM from lan-squad. Instead create:

- Create: `lan-squad/lab-panel-overlay-lww.js` (CJS copy of LWW only — keep in sync with comment pointer to `labs-panel-overlay.mjs`)

OR put shared LWW in `lib/labs/lab-panel-overlay-lww.cjs` imported by both — prefer **`lib/labs/lab-panel-overlay-lww.cjs`** + thin re-export from renderer overlay module.

- [ ] **Step 2: Renderer sync module**

```javascript
// public/js/features/lan/lab-panel-overlay-sync.mjs
export function applyLabPanelOverlayFromBundle(bundle) {
  var arr = bundle && Array.isArray(bundle.labPanelOverlay) ? bundle.labPanelOverlay : null;
  if (!arr) return;
  var merged = mergeLabPanelOverlayLww(loadLabPanelOverlays(), arr);
  saveLabPanelOverlays(merged);
}

export function queueLabPanelOverlayLanSync(record) {
  upsertLabPanelOverlay(record);
  // dynamic import orchestrator helper to patch room bundle / push — fire-and-forget
  void import('../lan/orchestrator.mjs').then(function (orch) {
    if (typeof orch.enqueueLabPanelOverlayPush === 'function') {
      return orch.enqueueLabPanelOverlayPush(loadLabPanelOverlays());
    }
  }).catch(function () { /* offline ok */ });
}
```

Wire `enqueueLabPanelOverlayPush` in LAN façade to include overlays in next sync-bundle / dedicated PUT if pattern exists for `manejo`. Mirror the smallest existing “put room field” pattern in `host-router` / push modules (read `manejo` push and copy structure).

- [ ] **Step 3: On bundle apply** (`orchestrator-bundle-apply.mjs`) call `applyLabPanelOverlayFromBundle(merged)` after clinicalOps.

- [ ] **Step 4: Teach modal confirm** calls `queueLabPanelOverlayLanSync(record)` instead of stub.

- [ ] **Step 5: Tests** for CJS LWW + merge section if feasible; else renderer LWW + a source-presence test like other LAN wiring tests.

- [ ] **Step 6: Commit**

```bash
git add lib/labs/lab-panel-overlay-lww.cjs lan-squad/bundle-merge-sections.js \
  public/js/features/lan/lab-panel-overlay-sync.mjs \
  public/js/features/lan/orchestrator-bundle-apply.mjs \
  public/js/labs-panel-overlay.mjs \
  public/js/features/lab-panel-teach-modal.mjs
git commit -m "$(cat <<'EOF'
feat(lan): sync labPanelOverlay on room bundle (silent LWW)

EOF
)"
```

---

### Task 9: Tendencias fallback + docs

**Files:**
- Modify: `public/js/features/tendencias-constants.mjs` — `SECTION_LABELS` fallback already? If missing, ensure unknown `sectionKey` displays as the key string in UI (no crash).
- Modify: `docs/logic/logic-index.md`
- Modify: `.cursor/rules/project-context.mdc` changelog
- Modify: `docs/features/features-index.md` one line under labs

- [ ] **Step 1: Grep tendencias render for unknown section — harden null-safe label**

- [ ] **Step 2: Docs**

```markdown
# logic-index.md addition
| Lab panel teach overlay | `labs-panel-overlay*.mjs`, `features/lab-panel-teach-*.mjs`, room `labPanelOverlay` | User-taught PanelDef overlay + wizard |
```

- [ ] **Step 3: Changelog**

```markdown
- **2026-07-21** `labs-teach-overlay`: wizard 2 páginas para SOME residual; overlay PanelDef + sync LAN `labPanelOverlay`.
```

(Edit same-day `labs-panels` entry if still present instead of duplicating.)

- [ ] **Step 4: Commit**

```bash
git add public/js/features/tendencias-constants.mjs docs/logic/logic-index.md \
  docs/features/features-index.md .cursor/rules/project-context.mdc
git commit -m "$(cat <<'EOF'
docs(labs): teach overlay index + tendencias fallback

EOF
)"
```

---

### Task 10: Verification gate

- [ ] **Step 1: Targeted tests**

```bash
npm run test:one -- \
  public/js/labs-panel-overlay.test.mjs \
  public/js/labs-panel-extended.test.mjs \
  public/js/labs-panel-residual.test.mjs \
  public/js/labs-panel-teach-model.test.mjs
```

Expected: all PASS

- [ ] **Step 2: `npm run build:ui`**

- [ ] **Step 3: `npm run metrics:check`** (or `lint:tier1` on touched paths) — no debt regression

- [ ] **Step 4: Manual checklist (human)**

1. Paste SOME with only `MARCADOR RARO` → wizard page 1 opens  
2. Select → continue → edit key/group → preview updates  
3. Confirm → line appears in Labs output  
4. Paste same again → parses without wizard (or only other residuals)  
5. On LAN peer: after sync, paste same → parses without wizard; peer never saw config UI  

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Overlay on built-in PanelDefs | 1–2 |
| Effective registry in parseExtended | 2 |
| Trigger A empty + B residual | 3, 7 |
| Page 1 SOME select | 5–6 |
| Page 2 editable rows + live preview | 4–6 |
| Confirm → result + persist | 6–7 |
| LAN silent sync | 8 |
| Hallmark UI | 5 |
| Correct scaffolds + new panels | 1, 4, 6 |
| Tests / Tier 1 | 1–4, 10 |
| Docs | 9 |

## Out of scope (do not implement in this plan)

- Parser admin directory UI  
- Cloud sync  
- Manual always-visible “Configurar lectura” button (add only if trigger wiring makes it free)  
