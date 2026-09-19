# Estado Actual — Monitoreo estructurado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Sala's text-only Estado Actual with a dedicated expediente tab for structured vitals/glu/I-O capture, derived snapshot, auto SOAP text, trend charts, and medication confirmation — with full app migration off `patient.estadoActual`.

**Architecture:** Six focused modules under `public/js/features/estado-actual-*.mjs` plus `patient.monitoreo` data model. Expediente gets a new top-level tab `estadoActual` (Sala only). Chart.js reused from lab trends. `soap-estado.mjs` keeps Interconsulta SOAP modal only.

**Tech Stack:** Vanilla ES modules, Node test runner (`node --test`), Chart.js (already on page), existing `saveState` / `expediente-tabs.mjs` / `med-receta-core.mjs`.

**Spec:** `docs/superpowers/specs/2026-05-26-estado-actual-monitoreo-design.md`

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `public/js/features/estado-actual-data.mjs` | Create | Model defaults, migration, snapshot/balance derivations, historial CRUD helpers |
| `public/js/features/estado-actual-data.test.mjs` | Create | Unit tests for data layer |
| `public/js/features/estado-actual-ranges.mjs` | Create | SV normal ranges + altered detection |
| `public/js/features/estado-actual-ranges.test.mjs` | Create | Range tests |
| `public/js/features/estado-actual-text.mjs` | Create | `buildEstadoActualText()` from spec |
| `public/js/features/estado-actual-text.test.mjs` | Create | Text generation tests |
| `public/js/features/estado-actual-charts.mjs` | Create | Chart.js render/destroy for SV, glu, I/O |
| `public/js/features/estado-actual-charts.test.mjs` | Create | Pure chart data prep tests (no DOM) |
| `public/js/features/estado-actual-meds.mjs` | Create | Receta proposals, confirm/discard, dropdown options |
| `public/js/features/estado-actual-meds.test.mjs` | Create | Med integration tests |
| `public/js/features/estado-actual-panel.mjs` | Create | Panel UI render + event wiring |
| `public/js/features/soap-estado.mjs` | Modify | Sala paths → navigate to tab; keep Interconsulta modal |
| `public/js/expediente-tabs.mjs` | Modify | Add `estadoActual` consolidated tab (Sala) |
| `public/js/expediente-tabs.test.mjs` | Modify | Tab visibility tests |
| `public/partials/layout/app-body.html` | Modify | Tab button + pane `#exp-pane-estado-actual` |
| `public/index.html` | Modify | Mirror app-body tab/pane if not partial-only |
| `public/styles/estado-actual.css` | Create | Panel layout, altered vital styling, charts |
| `public/styles/base.css` or `public/index.html` | Modify | Link new CSS |
| `public/js/features/medications.mjs` | Modify | Sala: send to Estado Actual panel |
| `public/js/lan-patient-merge.mjs` | Modify | Merge `monitoreo` on LAN sync |
| `public/js/features/lan-sync.mjs` | Modify | Include `monitoreo` in entry payload if serialized there |
| `public/js/app-runtimes.mjs` | Modify | Register panel runtime + window handlers |
| `public/js/app.js` | Modify | Import panel window handlers |
| `public/js/tour-targets.mjs` | Modify | Point tour to `#itab-estadoActual` |
| `public/js/features/settings-help.mjs` | Modify | Help copy |
| `public/js/features/pase-board.mjs` | Modify | Tab order + `textoGuardado` reference |
| `public/js/ui-tab-motion.mjs` | Modify | Map `estadoActual` granular tab if needed |
| `package.json` | Modify | Register new `*.test.mjs` files in `test` script |

---

### Task 1: Data model + migration + derivations

**Files:**
- Create: `public/js/features/estado-actual-data.mjs`
- Create: `public/js/features/estado-actual-data.test.mjs`
- Modify: `package.json` (add test file to `test` script)

- [ ] **Step 1: Write failing tests**

Create `public/js/features/estado-actual-data.test.mjs`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMonitoreo,
  migratePatientMonitoreo,
  deriveSnapshot,
  balanceTurno,
  balanceGlobalHistorico,
  appendMedicion,
  medicionHasCoreData,
} from './estado-actual-data.mjs';

test('emptyMonitoreo returns stable shape', () => {
  const m = emptyMonitoreo();
  assert.deepEqual(m.historial, []);
  assert.equal(m.textoGuardado.text, '');
  assert.equal(m.confirmado.abx, false);
});

test('migratePatientMonitoreo moves legacy estadoActual', () => {
  const p = {
    id: 'p1',
    estadoActual: { text: 'N: FOUR 15/16', savedAt: '2026-05-26T10:00:00.000Z' },
  };
  migratePatientMonitoreo(p);
  assert.ok(p.monitoreo);
  assert.equal(p.monitoreo.textoGuardado.text, 'N: FOUR 15/16');
  assert.equal(p.estadoActual, undefined);
});

test('deriveSnapshot picks latest non-null per field', () => {
  const m = emptyMonitoreo();
  m.historial = [
    { id: 'a', recordedAt: '2026-05-26T08:00:00.000Z', vitals: { fc: 80 }, glucometrias: [], io: {} },
    { id: 'b', recordedAt: '2026-05-26T14:00:00.000Z', vitals: { fc: 92, fr: 18 }, glucometrias: [], io: {} },
  ];
  const snap = deriveSnapshot(m);
  assert.equal(snap.vitals.fc, 92);
  assert.equal(snap.vitals.fr, 18);
});

test('balanceTurno and balanceGlobalHistorico', () => {
  const m = emptyMonitoreo();
  m.historial = [
    { id: '1', recordedAt: '2026-05-26T06:00:00.000Z', vitals: {}, glucometrias: [], io: { ing: 500, egr: 300 } },
    { id: '2', recordedAt: '2026-05-26T14:00:00.000Z', vitals: {}, glucometrias: [], io: { ing: 600, egr: 450 } },
  ];
  assert.equal(balanceTurno(m), 150);
  assert.equal(balanceGlobalHistorico(m), 350);
});

test('medicionHasCoreData rejects empty entry', () => {
  assert.equal(medicionHasCoreData({ vitals: {}, glucometrias: [], io: {} }), false);
  assert.equal(medicionHasCoreData({ vitals: { fc: 80 }, glucometrias: [], io: {} }), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/features/estado-actual-data.test.mjs`

Expected: FAIL — cannot find module `./estado-actual-data.mjs`

- [ ] **Step 3: Implement `estado-actual-data.mjs`**

Create `public/js/features/estado-actual-data.mjs`:

```javascript
const MED_FIELD_KEYS = ['analgesia', 'abx', 'antihta', 'vasop'];

export function emptyEstadoClinico() {
  return {
    four: '',
    esferas: '',
    analgesia: '',
    abx: '',
    antihta: '',
    vasop: '',
    soporte: '',
    dieta: '',
    kcalKg: '',
    kcal: '',
    pesoRef: '',
  };
}

export function emptyMonitoreo() {
  const confirmado = {};
  const pendienteReceta = {};
  MED_FIELD_KEYS.forEach((k) => {
    confirmado[k] = false;
    pendienteReceta[k] = '';
  });
  return {
    estadoClinico: emptyEstadoClinico(),
    confirmado,
    pendienteReceta,
    historial: [],
    textoGuardado: { text: '', savedAt: null },
  };
}

export function migratePatientMonitoreo(patient) {
  if (!patient || typeof patient !== 'object') return;
  if (patient.monitoreo) {
    if (patient.estadoActual) delete patient.estadoActual;
    return;
  }
  const legacy = patient.estadoActual;
  patient.monitoreo = emptyMonitoreo();
  if (legacy && typeof legacy === 'object') {
    patient.monitoreo.textoGuardado = {
      text: String(legacy.text || ''),
      savedAt: legacy.savedAt || null,
    };
  }
  delete patient.estadoActual;
}

export function ensureMonitoreo(patient) {
  migratePatientMonitoreo(patient);
  if (!patient.monitoreo) patient.monitoreo = emptyMonitoreo();
  return patient.monitoreo;
}

function sortedHistorial(monitoreo) {
  return [...(monitoreo.historial || [])].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
}

export function deriveSnapshot(monitoreo) {
  const snap = { vitals: {}, glucometrias: [], io: {} };
  for (const row of sortedHistorial(monitoreo)) {
    const v = row.vitals || {};
    ['tas', 'tad', 'fc', 'fr', 'temp', 'sat', 'peso'].forEach((k) => {
      if (v[k] != null && v[k] !== '') snap.vitals[k] = v[k];
    });
    if (Array.isArray(row.glucometrias) && row.glucometrias.length) {
      snap.glucometrias = row.glucometrias;
    }
    const io = row.io || {};
    if (io.ing != null && io.ing !== '') snap.io.ing = io.ing;
    if (io.egr != null && io.egr !== '') snap.io.egr = io.egr;
  }
  return snap;
}

export function balanceTurno(monitoreo) {
  const hist = sortedHistorial(monitoreo);
  for (let i = hist.length - 1; i >= 0; i -= 1) {
    const io = hist[i].io || {};
    const ing = Number(io.ing);
    const egr = Number(io.egr);
    if (!Number.isFinite(ing) || !Number.isFinite(egr)) continue;
    return ing - egr;
  }
  return null;
}

export function balanceGlobalHistorico(monitoreo) {
  let total = 0;
  let any = false;
  for (const row of sortedHistorial(monitoreo)) {
    const io = row.io || {};
    const ing = Number(io.ing);
    const egr = Number(io.egr);
    if (!Number.isFinite(ing) || !Number.isFinite(egr)) continue;
    total += ing - egr;
    any = true;
  }
  return any ? total : null;
}

export function medicionHasCoreData(medicion) {
  const v = medicion.vitals || {};
  if (['tas', 'tad', 'fc', 'fr', 'temp', 'sat', 'peso'].some((k) => v[k] != null && v[k] !== '')) return true;
  if ((medicion.glucometrias || []).some((g) => g && g.value != null && g.value !== '')) return true;
  const io = medicion.io || {};
  if (io.ing != null && io.ing !== '') return true;
  if (io.egr != null && io.egr !== '') return true;
  return false;
}

export function appendMedicion(monitoreo, medicion) {
  if (!medicionHasCoreData(medicion)) {
    return { ok: false, error: 'empty' };
  }
  monitoreo.historial = monitoreo.historial || [];
  monitoreo.historial.push({
    id: medicion.id || `med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: medicion.recordedAt || new Date().toISOString(),
    vitals: medicion.vitals || {},
    glucometrias: medicion.glucometrias || [],
    io: medicion.io || {},
  });
  return { ok: true };
}

export function removeMedicion(monitoreo, id) {
  monitoreo.historial = (monitoreo.historial || []).filter((r) => r.id !== id);
}

export function mergeMonitoreo(local, remote) {
  if (!local) return remote ? structuredClone(remote) : emptyMonitoreo();
  if (!remote) return structuredClone(local);
  const out = structuredClone(local.historial.length >= remote.historial.length ? local : remote);
  const other = out === local ? remote : local;
  out.textoGuardado =
    String(local.textoGuardado?.savedAt || '') >= String(remote.textoGuardado?.savedAt || '')
      ? structuredClone(local.textoGuardado)
      : structuredClone(remote.textoGuardado);
  MED_FIELD_KEYS.forEach((k) => {
    if (other.confirmado?.[k] && !out.confirmado[k]) {
      out.estadoClinico[k] = other.estadoClinico[k];
      out.confirmado[k] = true;
    }
  });
  return out;
}
```

Add to `package.json` `"test"` array:

```json
"public/js/features/estado-actual-data.test.mjs"
```

- [ ] **Step 4: Run tests**

Run: `node --test public/js/features/estado-actual-data.test.mjs`

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add public/js/features/estado-actual-data.mjs public/js/features/estado-actual-data.test.mjs package.json
git commit -m "feat(estado-actual): add monitoreo data model, migration, and balance derivations"
```

---

### Task 2: SV normal ranges + altered detection

**Files:**
- Create: `public/js/features/estado-actual-ranges.mjs`
- Create: `public/js/features/estado-actual-ranges.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { isVitalAltered, buildAlteredAtDefaults } from './estado-actual-ranges.mjs';

test('isVitalAltered flags out-of-range FR', () => {
  assert.equal(isVitalAltered('fr', 28), true);
  assert.equal(isVitalAltered('fr', 16), false);
});

test('isVitalAltered evaluates TA components separately', () => {
  assert.equal(isVitalAltered('tas', 88), true);
  assert.equal(isVitalAltered('tad', 52), true);
});

test('buildAlteredAtDefaults only includes altered keys', () => {
  const altered = buildAlteredAtDefaults({ fr: 28, fc: 80 }, '11:40');
  assert.equal(altered.fr, '11:40');
  assert.equal(altered.fc, undefined);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test public/js/features/estado-actual-ranges.test.mjs`

- [ ] **Step 3: Implement ranges module**

```javascript
const RANGES = {
  tas: { min: 90, max: 140 },
  tad: { min: 60, max: 90 },
  fc: { min: 60, max: 100 },
  fr: { min: 12, max: 20 },
  temp: { min: 36.0, max: 37.5 },
  sat: { min: 94, max: Infinity },
};

export function isVitalAltered(key, raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  const r = RANGES[key];
  if (!r) return false;
  return n < r.min || n > r.max;
}

export function buildAlteredAtDefaults(vitals, defaultTime) {
  const out = {};
  Object.keys(RANGES).forEach((k) => {
    if (isVitalAltered(k, vitals[k])) out[k] = defaultTime;
  });
  return out;
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add public/js/features/estado-actual-ranges.mjs public/js/features/estado-actual-ranges.test.mjs package.json
git commit -m "feat(estado-actual): add SV normal ranges and altered detection"
```

---

### Task 3: SOAP text generation

**Files:**
- Create: `public/js/features/estado-actual-text.mjs`
- Create: `public/js/features/estado-actual-text.test.mjs`

- [ ] **Step 1: Write failing test**

Port logic from `soap-estado.mjs` `buildSOAPText()` — test expects no `S:` line and `___` placeholders:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEstadoActualText } from './estado-actual-text.mjs';
import { emptyMonitoreo, deriveSnapshot } from './estado-actual-data.mjs';

test('buildEstadoActualText uses placeholders and omits S line', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.four = '15';
  m.historial.push({
    id: '1',
    recordedAt: '2026-05-26T08:00:00.000Z',
    vitals: { tas: 120, tad: 80, fc: 82 },
    glucometrias: [{ value: 140, time: '08:00' }],
    io: { ing: 500, egr: 300 },
  });
  const text = buildEstadoActualText(m.estadoClinico, deriveSnapshot(m), { balanceTurno: 200, balanceGlobal: 200 });
  assert.doesNotMatch(text, /^S:/m);
  assert.match(text, /FOUR 15\/16/);
  assert.match(text, /TA 120\/80/);
  assert.match(text, /GLUCOMETRÍAS CAPILARES \(140/);
  assert.match(text, /BALANCE \+200 CC/);
  assert.match(text, /ANALGESIA: ___/);
});
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement `buildEstadoActualText`**

Copy string templates from `public/js/features/soap-estado.mjs:229-325` into a pure function:

```javascript
function num(v) {
  return v !== '' && v != null ? String(v) : '___';
}
function val(v) {
  return v ? String(v).toUpperCase() : '___';
}

export function buildEstadoActualText(estadoClinico, snapshot, balances) {
  const ec = estadoClinico || {};
  const v = snapshot?.vitals || {};
  const ing = snapshot?.io?.ing;
  const egr = snapshot?.io?.egr;
  const balance =
    balances?.balanceTurno != null
      ? (balances.balanceTurno > 0 ? '+' : '') + balances.balanceTurno
      : '___';
  const soporteMap = {
    'Aire ambiente': 'AL AIRE AMBIENTE',
    'Puntillas nasales': 'POR PUNTILLAS NASALES',
    'Alto flujo': 'POR ALTO FLUJO',
    'VM no invasiva': 'CON VENTILACIÓN MECÁNICA NO INVASIVA',
  };
  const soporte = soporteMap[ec.soporte] || 'AL AIRE AMBIENTE';
  const gluParts = (snapshot?.glucometrias || []).map((g) => num(g.value));
  while (gluParts.length < 3) gluParts.push('___');

  const lines = [
    'N: FOUR ' + num(ec.four) + '/16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN ' + num(ec.esferas) + ' ESFERAS, ALERTA || ANALGESIA CON ' + val(ec.analgesia),
    'V: FR ' + num(v.fr) + ' RPM, SATO2 ' + num(v.sat) + '% ' + soporte + ' | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS',
    'HD: ESTABLE, TA ' + num(v.tas) + '/' + num(v.tad) + ' MMHG, FC ' + num(v.fc) + ' LPM || ANTIHIPERTENSIVOS: ' + val(ec.antihta || 'NINGUNO') + ' || VASOPRESORES: ' + val(ec.vasop || 'NINGUNO'),
    'HI: AFEBRIL, TEMPERATURA ' + num(v.temp) + ' °C || ANTIBIÓTICOS: ' + val(ec.abx || 'NINGUNO'),
    'NM: DIETA ' + val(ec.dieta) + ' CALCULADA A ' + num(ec.kcalKg) + ' KCAL/KG (' + num(ec.kcal) + ' KCAL) PARA PESO DE ' + num(v.peso || ec.pesoRef) + ' KG || INGRESOS ' + num(ing) + ' CC, EGRESOS ' + num(egr) + ' CC, BALANCE ' + balance + ' CC || GLUCOMETRÍAS CAPILARES (' + gluParts.join(', ') + ' MG/DL) || RESCATES DE INSULINA DISPONIBLES, NO APLICADOS ACTUALMENTE',
  ];
  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(estado-actual): add auto-generated SOAP text builder"
```

---

### Task 4: Expediente tab + pane shell (Sala only)

**Files:**
- Modify: `public/js/expediente-tabs.mjs`
- Modify: `public/js/expediente-tabs.test.mjs`
- Modify: `public/partials/layout/app-body.html`
- Modify: `public/index.html` (if tab bar duplicated)
- Create: `public/styles/estado-actual.css`
- Modify: CSS import in `public/index.html`

- [ ] **Step 1: Add failing tab test**

In `expediente-tabs.test.mjs`:

```javascript
import { CONSOLIDATED_TABS_SALA } from './expediente-tabs.mjs';

test('CONSOLIDATED_TABS_SALA includes estadoActual between clinico and resultados', () => {
  assert.deepEqual(CONSOLIDATED_TABS_SALA, ['paciente', 'clinico', 'estadoActual', 'resultados', 'salida']);
});
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Update expediente-tabs**

Export mode-specific tab lists:

```javascript
export const CONSOLIDATED_TABS_SALA = ['paciente', 'clinico', 'estadoActual', 'resultados', 'salida'];
export const CONSOLIDATED_TABS_INTER = ['paciente', 'clinico', 'resultados', 'salida'];

export function getConsolidatedTabs(settings) {
  return isModeSala(settings) ? CONSOLIDATED_TABS_SALA : CONSOLIDATED_TABS_INTER;
}
```

Replace internal uses of `CONSOLIDATED_TABS` with `getConsolidatedTabs(settings)` in `syncConsolidatedTabBar`, `switchConsolidatedTab` handlers, etc.

Add to `granularToConsolidatedMap`:

```javascript
estadoActual: { tab: 'estadoActual', section: null },
```

Add `defaultGranularForConsolidatedTab` entry: `estadoActual: 'estadoActual'`.

In `app-body.html` after `#itab-clinico` button, add (Sala-only via JS display):

```html
<button type="button" class="inner-tab exp-consolidated-tab" id="itab-estadoActual"
  onclick="switchConsolidatedTab('estadoActual')" style="display:none;" aria-label="Estado Actual">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  Estado Actual
</button>
```

In `#expediente-panes-host`, add pane:

```html
<div id="itab-content-estadoActual" class="tab-content exp-composite-pane">
  <div id="exp-pane-estado-actual" class="estado-actual-panel-mount"></div>
</div>
```

Create minimal `public/styles/estado-actual.css` with `.estado-actual-panel-mount { display:flex; flex-direction:column; gap:16px; }`.

- [ ] **Step 4: Run expediente-tabs tests — expect PASS**

Run: `node --test public/js/expediente-tabs.test.mjs`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(estado-actual): add Sala-only expediente tab and pane mount"
```

---

### Task 5: Panel UI — form, historial, snapshot, copy/save

**Files:**
- Create: `public/js/features/estado-actual-panel.mjs`
- Modify: `public/js/app-runtimes.mjs`
- Modify: `public/js/app.js`
- Modify: `public/js/features/expediente.mjs` (call `renderEstadoActualPanel` on tab switch)
- Modify: `public/styles/estado-actual.css`

- [ ] **Step 1: Create panel module skeleton**

`estado-actual-panel.mjs` exports:

```javascript
export function registerEstadoActualPanelRuntime(partial) { /* assign rt */ }
export function renderEstadoActualPanel() { /* main render */ }
export function navigateToEstadoActualPanel() { /* switchConsolidatedTab + render */ }
export const windowHandlers = {
  registrarEstadoActualMedicion,
  eliminarEstadoActualMedicion,
  estadoActualCopiar,
  estadoActualGuardarCopiar,
  regenerarEstadoActualTexto,
};
```

Render sections per spec §4:
1. Action bar with `#ea-meta-guardado`
2. `<details class="ea-estado-clinico">` placeholder (Task 7 fills meds)
3. `#ea-snapshot` read-only grid from `deriveSnapshot()` + balances
4. `#ea-form-registro` with vitals, dynamic glu rows (`+ Agregar glucometría`), I/O, `#ea-recorded-at`
5. `#ea-historial-reciente` last 8 rows with delete
6. `#ea-texto` textarea + Regenerar button

On **Registrar**:
- Parse form → build `medicion` object
- Call `buildAlteredAtDefaults(vitals, HH:mm from recordedAt)`
- `appendMedicion(monitoreo, medicion)` → if fail toast error
- `saveState()` → regenerate text → re-render charts section stub

Wire `renderEstadoActualBar()` in `soap-estado.mjs` to read `monitoreo.textoGuardado.savedAt`.

- [ ] **Step 2: Register runtime in `app-runtimes.mjs`**

```javascript
import { registerEstadoActualPanelRuntime, renderEstadoActualPanel, windowHandlers as eaHandlers } from './features/estado-actual-panel.mjs';

registerEstadoActualPanelRuntime({
  getActiveId, showToast, getSettings,
  switchConsolidatedTab, copyToClipboardSafe,
});
```

Merge `eaHandlers` into app window exports in `app.js`.

- [ ] **Step 3: Redirect header button (Sala)**

In `soap-estado.mjs` `openEstadoActualModal()`:

```javascript
import { isModeSala } from '../mode-features.mjs';

export function openEstadoActualModal() {
  if (!rt.getActiveId()) { rt.showToast('Selecciona un paciente primero', 'error'); return; }
  if (isModeSala(rt.getSettings())) {
    rt.navigateToEstadoActualPanel?.();
    return;
  }
  // existing Interconsulta modal path unchanged
}
```

Pass `navigateToEstadoActualPanel` via `registerSoapEstadoRuntime`.

- [ ] **Step 4: Manual smoke test**

1. Start app, mode Sala, select patient
2. Click green Estado Actual button → lands on new tab
3. Register FC=82 → snapshot shows FC, historial has 1 row
4. Copiar puts text in clipboard

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(estado-actual): panel form, historial, snapshot, copy/save actions"
```

---

### Task 6: Trend charts (SV, glu, I/O)

**Files:**
- Create: `public/js/features/estado-actual-charts.mjs`
- Create: `public/js/features/estado-actual-charts.test.mjs`
- Modify: `estado-actual-panel.mjs`
- Modify: `estado-actual.css`

- [ ] **Step 1: Write failing test for chart data prep (pure)**

```javascript
import { buildIoChartData, buildVitalsSeries } from './estado-actual-charts.mjs';

test('buildIoChartData produces turn balance and global line', () => {
  const hist = [
    { recordedAt: '2026-05-26T06:00:00.000Z', io: { ing: 500, egr: 300 } },
    { recordedAt: '2026-05-26T14:00:00.000Z', io: { ing: 600, egr: 450 } },
  ];
  const d = buildIoChartData(hist);
  assert.equal(d.turnBalance[0], 200);
  assert.equal(d.globalBalance[1], 350);
});
```

- [ ] **Step 2: Implement data builders + Chart render**

`buildIoChartData`, `buildVitalsSeries`, `buildGluSeries` as pure functions.

`renderEstadoActualCharts(mountEl, monitoreo, Chart)` destroys prior instances stored on `mountEl._eaCharts`, renders 3 canvases:
- SV: line charts by family (min 2 points or show empty state)
- Glu: single line from flattened glu points sorted by datetime
- I/O: grouped bars ing/egr + dashed line global balance (see mockup)

Call from `renderEstadoActualPanel()` after historial changes.

- [ ] **Step 3: Run tests — expect PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(estado-actual): SV, glu, and I/O trend charts"
```

---

### Task 7: Medications integration + estado clínico colapsable

**Files:**
- Create: `public/js/features/estado-actual-meds.mjs`
- Create: `public/js/features/estado-actual-meds.test.mjs`
- Modify: `public/js/features/medications.mjs`
- Modify: `estado-actual-panel.mjs`

- [ ] **Step 1: Write failing med tests**

```javascript
import { applyRecetaProposal, confirmMedField, buildMedDropdownOptions } from './estado-actual-meds.mjs';
import { emptyMonitoreo } from './estado-actual-data.mjs';

test('applyRecetaProposal skips confirmed fields', () => {
  const m = emptyMonitoreo();
  m.confirmado.abx = true;
  m.estadoClinico.abx = 'ERTAPENEM 1G';
  applyRecetaProposal(m, { abx: 'MEROPENEM 1G' });
  assert.equal(m.estadoClinico.abx, 'ERTAPENEM 1G');
  assert.equal(m.pendienteReceta.abx, '');
});

test('confirmMedField copies pendiente to estadoClinico', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.abx = 'CEFTRIAXONA 1G';
  confirmMedField(m, 'abx');
  assert.equal(m.estadoClinico.abx, 'CEFTRIAXONA 1G');
  assert.equal(m.confirmado.abx, true);
});
```

- [ ] **Step 2: Implement meds module**

`buildMedDropdownOptions(activeId, category)` pulls from `medRecetaByPatient` items where `classifyMedicationSoapCategory` matches and not suspended.

`applyRecetaProposal(monitoreo, buckets)` sets `pendienteReceta` for non-confirmed keys only.

- [ ] **Step 3: Update medications.mjs Sala path**

Replace `volcarRecetaMedASoap()` body when `isModeSala()`:

```javascript
import { isModeSala } from '../mode-features.mjs';
import { applyRecetaProposal, bucketsFromRecetaItems } from './estado-actual-meds.mjs';
import { ensureMonitoreo } from './estado-actual-data.mjs';

// instead of mergeSoapMedField + openSOAPModalDirect:
const patient = patients.find(p => p.id === activeId);
ensureMonitoreo(patient);
applyRecetaProposal(patient.monitoreo, buckets);
saveState();
rt.navigateToEstadoActualPanel?.();
rt.showToast('Propuesta en Estado Actual — confirma en Estado clínico general', 'success');
```

Update button label to **Enviar a Estado Actual** in Sala.

- [ ] **Step 4: Render estado clínico section in panel**

`<details class="ea-estado-clinico">` with selects for abx/analgesia/antihta/vasop + manual inputs for four/esferas/soporte/dieta/kcal. Badge `.ea-pendiente-badge` when `pendienteReceta[k]` non-empty. Buttons confirm/discard per field.

- [ ] **Step 5: Run tests + commit**

```bash
git commit -m "feat(estado-actual): medication proposals, confirmation, filtered dropdowns"
```

---

### Task 8: App-wide migration cleanup

**Files:**
- Modify: `public/js/features/soap-estado.mjs`
- Modify: `public/js/storage.js` or patient load path in `app-state.mjs`
- Modify: `public/styles/modals.css` (remove `data-estado-actual-mode` rules after Sala path gone)
- Modify: `public/js/features/pase-board.mjs`

- [ ] **Step 1: Call migrate on patient load**

Where patients are hydrated (grep `patients =` load in `app-state.mjs` or storage import), map:

```javascript
import { migratePatientMonitoreo } from './features/estado-actual-data.mjs';
patients.forEach(migratePatientMonitoreo);
```

- [ ] **Step 2: Update `renderEstadoActualBar`**

Read `patient.monitoreo.textoGuardado.savedAt` instead of `patient.estadoActual`.

- [ ] **Step 3: Remove Sala SOAP modal mode**

Delete or guard `data-estado-actual-mode` attribute setting in Sala paths. Keep `estadoActualOnlyCopy` / `estadoActualSaveAndCopy` delegating to panel handlers in Sala.

- [ ] **Step 4: Grep cleanup**

Run: `rg "estadoActual" public/js --glob '*.{js,mjs}'`

Replace remaining reads with `monitoreo.textoGuardado` or remove dead code.

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(estado-actual): migrate legacy estadoActual to monitoreo app-wide"
```

---

### Task 9: LAN sync + export

**Files:**
- Modify: `public/js/lan-patient-merge.mjs`
- Modify: `public/js/features/lan-sync.mjs` (if entry shape defined there)
- Create: `public/js/lan-patient-merge.test.mjs` (if missing) or extend existing

- [ ] **Step 1: Add monitoreo merge test**

```javascript
import { mergeMonitoreo } from './features/estado-actual-data.mjs';

test('mergeMonitoreo keeps longer historial', () => {
  const a = emptyMonitoreo();
  a.historial = [{ id: '1' }];
  const b = emptyMonitoreo();
  b.historial = [{ id: '1' }, { id: '2' }];
  const merged = mergeMonitoreo(a, b);
  assert.equal(merged.historial.length, 2);
});
```

- [ ] **Step 2: Wire LAN entry merge**

In `mergePatientEntry`, after picking patient fields, merge monitoreo:

```javascript
import { mergeMonitoreo, migratePatientMonitoreo } from './features/estado-actual-data.mjs';

migratePatientMonitoreo(first.patient);
migratePatientMonitoreo(second.patient);
patient.monitoreo = mergeMonitoreo(first.patient.monitoreo, second.patient.monitoreo);
```

Add `monitoreoTimestamp(monitoreo)` to `entryUpdatedAt` parts using latest `historial[].recordedAt` or `textoGuardado.savedAt`.

- [ ] **Step 3: Run LAN merge tests**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(estado-actual): include monitoreo in LAN patient merge"
```

---

### Task 10: Help, tour, tests registration, final verification

**Files:**
- Modify: `public/js/tour-targets.mjs`
- Modify: `public/js/tour-targets.test.mjs`
- Modify: `public/js/features/settings-help.mjs`
- Modify: `public/js/features/pase-board.mjs` (`setOrder` for `#itab-estadoActual`)
- Modify: `package.json` (all new test files)

- [ ] **Step 1: Update tour target**

```javascript
estado_actual: { appTab: 'expediente', selector: '#itab-estadoActual', focus: false, ... }
```

- [ ] **Step 2: Update help text** — describe new tab, structured entry, trends, med confirmation.

- [ ] **Step 3: Register all test files in package.json**

Ensure these are in `"test"` script:
- `estado-actual-data.test.mjs`
- `estado-actual-ranges.test.mjs`
- `estado-actual-text.test.mjs`
- `estado-actual-charts.test.mjs`
- `estado-actual-meds.test.mjs`

- [ ] **Step 4: Run full test suite**

Run: `npm test`

Expected: all tests PASS

- [ ] **Step 5: Final commit**

```bash
git commit -m "docs(estado-actual): update tour/help and register tests"
```

---

## Spec coverage checklist

| Spec § | Task |
|---|---|
| §3 Model `patient.monitoreo` | Task 1, 8 |
| §4 UI panel layout | Task 4, 5, 7 |
| §5 SV ranges / altered | Task 2, 5 |
| §6 Charts SV/glu/I/O | Task 6 |
| §7 Medications hybrid | Task 7 |
| §8 Auto text + placeholders | Task 3, 5 |
| §9 App migration | Task 8, 9 |
| §10 Edge cases | Task 1 (`medicionHasCoreData`), Task 5 (toasts) |
| §11 Testing | All tasks |
| §12 Out of scope v1 | Not planned |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-26-estado-actual-monitoreo.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — implement tasks in this session with checkpoints

Which approach do you want?
