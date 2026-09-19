# Manejo electrolítico, gasometría extendida y SOME — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detectar alteraciones electrolíticas/gasométricas al procesar labs; pestaña **Manejo** con reposición adulta + bloques SOME en MAYÚSCULAS; gasometría extendida en Tendencias → Gasometría; peso/talla/vía en Datos paciente.

**Architecture:** Motores puros `electrolyte-manejo.mjs` y `gaso-extended.mjs` con tests Node; UI en `features/manejo.mjs`; wiring en `pase-board.mjs`, `lab-panel.mjs`, `patients.mjs`. Spec: `docs/superpowers/specs/2026-05-25-manejo-electrolitos-gasometria-design.md`.

**Tech Stack:** JavaScript ESM, `node --test`, HTML partials + `npm run build:ui`, localStorage/LAN sync existente.

---

## File Structure

| File | Responsabilidad |
|---|---|
| `public/js/electrolyte-manejo.mjs` | Extracción labs, severidad, dosis, `someOrders`, reglas cruzadas |
| `public/js/electrolyte-manejo.test.mjs` | TDD fórmulas, vía, SOME uppercase, hiperK secuencia |
| `public/js/gaso-extended.mjs` | 6 pasos acid-base + oxigenación |
| `public/js/gaso-extended.test.mjs` | Winter, compensación, AG |
| `public/js/features/manejo.mjs` | Tab UI, clipboard, + Pendiente |
| `public/styles/manejo.css` | Tabla clínica |
| `public/partials/layout/app-body.html` | Shell tab Manejo |
| `public/js/features/expediente.mjs` | peso/talla/vía en Datos |
| `public/js/features/pase-board.mjs` | Tab order + switchInnerTab |
| `public/js/features/patients.mjs` | manejoPending auto-open (normal only) |
| `public/js/features/lab-panel.mjs` | Post-store detección + refresh Manejo |
| `public/js/lab-clinical-suggestions.mjs` | Solo Hb transfusion auto-pendiente |
| `public/js/features/tendencias.mjs` + `tend-group-modal.mjs` | Panel gaso extendido |
| `public/js/app-runtimes.mjs` + `app-shell.mjs` | Registro runtime |
| `public/js/features/chrome.mjs` | Label "Manejo" |
| `package.json` | Añadir nuevos `.test.mjs` al script `test` |

---

### Task 1: Campos paciente (peso, talla, vía)

**Files:**
- Modify: `public/js/features/expediente.mjs` (`buildPatientDemographicsCardHtml`)
- Modify: `public/js/app-shell.mjs` (`updatePatient` — sin uppercasing en peso/talla/vía)

- [ ] **Step 1: Añadir campos HTML en Datos**

En `buildPatientDemographicsCardHtml`, después de la fila edad/sexo, insertar:

```javascript
'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">' +
'<div class="field-group"><label>Peso (kg)</label><input type="text" inputmode="decimal" value="' + esc(patient.peso || '') + '" placeholder="60" oninput="updatePatient(\'peso\',this.value)"></div>' +
'<div class="field-group"><label>Talla (m)</label><input type="text" inputmode="decimal" value="' + esc(patient.talla || '') + '" placeholder="1.60" oninput="updatePatient(\'talla\',this.value)"></div>' +
'<div class="field-group"><label>Vía de acceso</label><select onchange="updatePatient(\'viaAcceso\',this.value)">' +
'<option value=""' + (!patient.viaAcceso ? ' selected' : '') + '>— No especificada —</option>' +
'<option value="periferica"' + (patient.viaAcceso==='periferica'?' selected':'') + '>EV periférica</option>' +
'<option value="cvc"' + (patient.viaAcceso==='cvc'?' selected':'') + '>CVC / catéter central</option>' +
'<option value="picc"' + (patient.viaAcceso==='picc'?' selected':'') + '>PICC</option>' +
'</select></div></div>' +
```

- [ ] **Step 2: Verificar persistencia**

`updatePatient` ya persiste campos arbitrarios en `patient` + `saveState()`. No uppercasing para `peso`, `talla`, `viaAcceso`.

- [ ] **Step 3: Commit**

```bash
git add public/js/features/expediente.mjs
git commit -m "feat: peso, talla y vía de acceso en datos del paciente"
```

---

### Task 2: Helpers SOME + extracción de labs (`electrolyte-manejo.mjs` base)

**Files:**
- Create: `public/js/electrolyte-manejo.mjs`
- Create: `public/js/electrolyte-manejo.test.mjs`
- Modify: `package.json` (añadir test file al script `test`)

- [ ] **Step 1: Write failing tests**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toSomeUpper,
  formatSomeBlock,
  parsePatientWeightKg,
  isCentralAccess,
  kLimitsForAccess,
} from './electrolyte-manejo.mjs';

test('toSomeUpper normaliza dilución y velocidad', () => {
  assert.equal(toSomeUpper('500 cc Sol. Salina 0.9%'), '500 CC SOL. SALINA 0.9%');
  assert.equal(toSomeUpper('50 cc/hr'), '50 CC/HR');
});

test('formatSomeBlock — todo mayúsculas', () => {
  const block = formatSomeBlock({
    medication: 'CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)',
    route: 'INTRAVENOSA',
    doseValue: 40,
    doseUnit: 'MEQ',
    dilution: '500 CC SOL. SALINA 0.9%',
    infusionRateMlHr: 50,
  });
  assert.match(block, /MEDICAMENTO: CLORURO DE POTASIO/);
  assert.match(block, /DILUCION: 500 CC SOL\. SALINA 0\.9%/);
  assert.match(block, /VELOCIDAD DE INFUSION: 50 CC\/HR/);
  assert.doesNotMatch(block, /Sol\. Salina/);
});

test('kLimitsForAccess — periférica vs CVC', () => {
  assert.deepEqual(kLimitsForAccess('periferica'), { maxMeqPerL: 40, maxMeqPerHr: 10 });
  assert.deepEqual(kLimitsForAccess('cvc'), { maxMeqPerL: 80, maxMeqPerHr: 40 });
  assert.equal(isCentralAccess('cvc'), true);
  assert.equal(isCentralAccess(''), false);
});

test('parsePatientWeightKg', () => {
  assert.equal(parsePatientWeightKg({ peso: '60' }), 60);
  assert.equal(parsePatientWeightKg({ peso: '' }), null);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test public/js/electrolyte-manejo.test.mjs`  
Expected: FAIL module not found

- [ ] **Step 3: Implement helpers**

```javascript
export function toSomeUpper(s) {
  return String(s == null ? '' : s).trim().toUpperCase();
}

export function formatSomeBlock(order) {
  const o = order || {};
  const lines = [
    'MEDICAMENTO: ' + toSomeUpper(o.medication),
    'VIA: ' + toSomeUpper(o.route || 'INTRAVENOSA'),
    'DOSIS: ' + String(o.doseValue) + ' ' + toSomeUpper(o.doseUnit || 'MEQ'),
    'DILUCION: ' + toSomeUpper(o.dilution || ''),
    'VELOCIDAD DE INFUSION: ' + String(o.infusionRateMlHr) + ' CC/HR',
  ];
  return lines.join('\n');
}

export function parsePatientWeightKg(patient) {
  const n = parseFloat(String(patient?.peso || '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isCentralAccess(via) {
  return String(via || '') === 'cvc';
}

export function kLimitsForAccess(viaAcceso) {
  if (isCentralAccess(viaAcceso)) return { maxMeqPerL: 80, maxMeqPerHr: 40 };
  return { maxMeqPerL: 40, maxMeqPerHr: 10 };
}

export function tbwFactor(patient) {
  return patient?.sexo === 'F' ? 0.5 : 0.6;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `node --test public/js/electrolyte-manejo.test.mjs`

- [ ] **Step 5: Add to package.json test script + commit**

```bash
git add public/js/electrolyte-manejo.mjs public/js/electrolyte-manejo.test.mjs package.json
git commit -m "feat: helpers SOME uppercase y límites por vía de acceso"
```

---

### Task 3: Motor K⁺ hipo/hiper + dilución

**Files:**
- Modify: `public/js/electrolyte-manejo.mjs`
- Modify: `public/js/electrolyte-manejo.test.mjs`

- [ ] **Step 1: Failing tests K hypo periférica vs CVC**

```javascript
import { buildPotassiumManejoRow } from './electrolyte-manejo.mjs';

test('hipokalemia moderada — 20 mEq en 500 mL, 10 mEq/h periférica', () => {
  const row = buildPotassiumManejoRow({
    k: 2.8,
    weightKg: 60,
    viaAcceso: 'periferica',
    egfr: 90,
  });
  assert.equal(row.direction, 'hypo');
  assert.equal(row.severity, 'moderada');
  assert.equal(row.someOrders[0].doseValue, 20);
  assert.match(row.someOrders[0].dilution, /500 CC/);
  assert.equal(row.someOrders[0].infusionRateMlHr, 50); // 10 mEq/h en 500 mL con 20 mEq total
});

test('hipokalemia — CVC permite mayor velocidad', () => {
  const row = buildPotassiumManejoRow({ k: 2.8, weightKg: 60, viaAcceso: 'cvc', egfr: 90 });
  assert.equal(row.someOrders[0].infusionRateMlHr, 100); // 20 mEq/h cap en 250 mL @ 80 mEq/L
});
```

- [ ] **Step 2: Implement `buildPotassiumManejoRow` + `buildHyperkalemiaOrders`**

Lógica clave:
- Severidad: `<2.5 grave`, `2.5–2.9 mod`, `3.0–3.4 leve`, `>5.5 hiper` (PDF).
- Hipo dosis: 20 mEq default; 40 si déficit >30; reducir 50% si eTFG <30.
- Volumen: `pickVolume(mEq, limits.maxMeqPerL)` → 250/500/1000 mL.
- Velocidad: `min(limits.maxMeqPerHr, mEqTotal)` → `infusionRateMlHr = round(mEqPerHr / mEqTotal * vol)`.
- Medication SOME: `CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)`.
- Hiper ≥6.0 o ≥5.5 con notas: secuencia `someOrders`:
  1. Ca gluconato 10–20 mL bolo
  2. Insulina 10 U (+ D50 50 mL si glu <250)
  3. Salbutamol nebul 10–20 mg (dilución `4 CC SOL. SALINA 0.9%`, frecuencia en clinicalNotes)

- [ ] **Step 3: Run tests + commit**

```bash
node --test public/js/electrolyte-manejo.test.mjs
git add public/js/electrolyte-manejo.mjs public/js/electrolyte-manejo.test.mjs
git commit -m "feat: reposición y hiperK con bloques SOME"
```

---

### Task 4: Na, Mg, P, Ca + orquestador

**Files:**
- Modify: `public/js/electrolyte-manejo.mjs`
- Modify: `public/js/electrolyte-manejo.test.mjs`

- [ ] **Step 1: Tests Na TBW, NaCl 3%, Mg, P, Ca corregido**

```javascript
import { evaluateElectrolyteManejo, correctedCalcium } from './electrolyte-manejo.mjs';

test('Na déficit — TBW 0.5 mujer', () => {
  const rows = evaluateElectrolyteManejo({
    parsedBySection: { ESC: { Na: 128 } },
    patient: { sexo: 'F', peso: '60', viaAcceso: '' },
    labSetId: '1', labFecha: '01/01/2026',
  });
  const na = rows.find((r) => r.electrolyte === 'Na');
  assert.ok(na.formulaResult.includes('mEq'));
});

test('Ca corregido con albúmina', () => {
  assert.equal(correctedCalcium(8.0, 2.0), 9.6);
});

test('Mg bajo + K bajo — banner crossRule', () => {
  const out = evaluateElectrolyteManejo({
    parsedBySection: { ESC: { K: 2.8, Mg: 1.2 } },
    patient: { peso: '70', viaAcceso: 'periferica' },
    labSetId: '1', labFecha: '01/01/2026',
  });
  assert.ok(out.crossAlerts.some((a) => /MAGNESIO PRIMERO/i.test(a)));
});
```

- [ ] **Step 2: Implement `evaluateElectrolyteManejo`**

Export principal:

```javascript
export function evaluateElectrolyteManejo(ctx) {
  const pb = ctx.parsedBySection || {};
  const esc = pb.ESC || {};
  const qs = pb.QS || {};
  const gases = pb.GASES || {};
  const egfr = numOrNull(qs.eTFG);
  const alb = numOrNull(qs.Alb) ?? numOrNull(qs.Albumina);
  const rows = [];
  const crossAlerts = [];

  // K, Na, Mg, P, Ca — builders por ion; skip si valor null
  // crossAlerts: Mg+K, Ca+P, eTFG<30 badge en rows

  return { rows, crossAlerts, hasAlterations: rows.length > 0 };
}
```

Implementar builders:
- `buildSodiumManejoRow` — hipo NaCl 3% mL = mEq/0.513; hiper free water deficit + D5W cc/hr
- `buildMagnesiumManejoRow` — 2–4 g grave en 100–250 mL
- `buildPhosphorusManejoRow` — 0.16–0.32 mmol/kg; fosfato sodio si K≥4
- `buildCalciumManejoRow` — gluconato 1–2 g si Ca corr <8.5

- [ ] **Step 3: Run tests + commit**

```bash
git commit -m "feat: motor electrolítico completo con reglas cruzadas"
```

---

### Task 5: Shell HTML tab Manejo + CSS

**Files:**
- Modify: `public/partials/layout/app-body.html`
- Create: `public/styles/manejo.css`
- Modify: `public/index.src.html` (link CSS si aplica patrón existente)

- [ ] **Step 1: Tab button después de Pendientes**

En `app-body.html`, inner-tab-bar:

```html
<button class="inner-tab" id="itab-manejo" onclick="switchInnerTab('manejo')">
  <!-- SVG opcional clipboard/pill -->
  Manejo
</button>
```

Y pane:

```html
<div id="itab-content-manejo" class="tab-content">
  <div id="manejo-container"></div>
</div>
```

- [ ] **Step 2: CSS básico**

`public/styles/manejo.css` — tabla `.manejo-table`, `.manejo-some-panel`, `.manejo-copy-btn`, badge `.manejo-dilution-warn`.

- [ ] **Step 3: Regenerar UI**

Run: `npm run build:ui`  
Expected: `public/index.html` actualizado

- [ ] **Step 4: Commit**

```bash
git add public/partials/layout/app-body.html public/styles/manejo.css public/index.src.html public/index.html
git commit -m "feat: shell HTML y CSS pestaña Manejo"
```

---

### Task 6: Feature UI `features/manejo.mjs`

**Files:**
- Create: `public/js/features/manejo.mjs`
- Modify: `public/js/app-runtimes.mjs`
- Modify: `public/js/app-shell.mjs` (import + register + window handler)

- [ ] **Step 1: Implement `renderManejo`**

Patrón como `todos.mjs`:

```javascript
import { evaluateElectrolyteManejo, formatSomeBlock, toSomeUpper } from '../electrolyte-manejo.mjs';
import { sortLabHistoryChronological } from '../lab-history-set.mjs';
import { storage } from '../storage.js';

export function registerManejoRuntime(partial) { Object.assign(rt, partial); }

export function renderManejo() {
  const container = document.getElementById('manejo-container');
  if (!container || !rt.getActiveId()) { /* empty state */ return; }

  const history = sortLabHistoryChronological(rt.ensureParsedLabHistory(rt.getActiveId()));
  const latest = history[0];
  if (!latest) { /* sin labs */ return; }

  const patient = rt.getPatientById(rt.getActiveId());
  const evalOut = evaluateElectrolyteManejo({
    parsedBySection: latest.parsedBySection,
    parsed: latest.parsed,
    patient,
    labSetId: latest.id,
    labFecha: latest.fecha,
  });

  // Clear manejoPending
  if (patient?.manejoPending) { patient.manejoPending = null; rt.saveState(); }

  // Render tabla + filas SOME expandibles + botones copy + addTodoFromManejo(row)
}
```

- [ ] **Step 2: Clipboard + add pendiente**

```javascript
async function copySomeText(text) {
  try {
    await navigator.clipboard.writeText(text);
    rt.showToast('Copiado', 'success');
  } catch (_e) {
    /* fallback textarea + execCommand */
  }
}

function addTodoFromManejo(row, someOrder) {
  const text = buildManejoTodoText(row, someOrder); // incluye MEQ, CC/HR, vía
  // storage.getTodos + dedup labRuleId + labFecha + emitLiveSyncTodoUpsert
}
```

- [ ] **Step 3: Wire runtime en app-runtimes + app-shell**

Import `renderManejo`, `registerManejoRuntime`; pasar `getPatientById`, `ensureParsedLabHistory`, `saveState`, `emitLiveSyncTodoUpsert`.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: UI pestaña Manejo con SOME clipboard y pendientes"
```

---

### Task 7: Tab wiring + chrome

**Files:**
- Modify: `public/js/features/pase-board.mjs`
- Modify: `public/js/features/chrome.mjs`

- [ ] **Step 1: pase-board — ids, switch, order**

Añadir `"manejo"` a arrays en `switchInnerTab`, `syncInnerTabVisualOnly`.

```javascript
if (tab === 'manejo') renderManejo();
```

`renderInnerTabs` order:
- Sala: manejo order 3 (después todo 2)
- Normal: manejo order 6 (después todo 5)

`openPaseSectionInNormal`:

```javascript
} else if (w === 'manejo') {
  switchAppTab('nota');
  switchInnerTab('manejo');
```

- [ ] **Step 2: chrome.mjs**

```javascript
if (inner === 'manejo') return 'Manejo';
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: wiring inner tab Manejo en expediente"
```

---

### Task 8: Detección post-lab + auto-apertura

**Files:**
- Modify: `public/js/features/lab-panel.mjs`
- Modify: `public/js/features/patients.mjs`
- Modify: `public/js/lab-clinical-suggestions.mjs`

- [ ] **Step 1: lab-panel — tras pushLabHistory**

```javascript
import { evaluateElectrolyteManejo } from '../electrolyte-manejo.mjs';

function applyManejoPending(patientId, parsed, parsedBySection, labSetId, labFecha) {
  const patient = patients.find((p) => String(p.id) === String(patientId));
  if (!patient) return;
  const out = evaluateElectrolyteManejo({ parsedBySection, parsed, patient, labSetId, labFecha });
  if (out.hasAlterations) {
    patient.manejoPending = { labSetId, detectedAt: new Date().toISOString() };
  }
  rt.refreshManejoPanel?.();
}
```

Llamar desde `autoStoreProcessedLabResult` después de `pushLabHistory`.

- [ ] **Step 2: Quitar auto-pendientes electrolitos**

En `LAB_CLINICAL_RULES`, dejar solo `hb-transfusion`. Actualizar `lab-clinical-suggestions.test.mjs`.

- [ ] **Step 3: patients.mjs auto-open (normal only)**

En `selectPatientCore`, antes de render todo:

```javascript
import { isPaseMode } from './chrome.mjs';
import { getUiDensity } from './chrome.mjs'; // según export existente

if (!isPaseMode() && getUiDensity() === 'normal') {
  const p = patients.find((pl) => String(pl.id) === String(id));
  if (p?.manejoPending?.labSetId) {
    rt.switchInnerTab('manejo');
  }
}
```

No cambiar default a `todo` si hay `manejoPending`.

- [ ] **Step 4: Tests + commit**

```bash
node --test public/js/lab-clinical-suggestions.test.mjs
git commit -m "feat: manejoPending al guardar labs y auto-apertura en modo normal"
```

---

### Task 9: Gasometría extendida

**Files:**
- Create: `public/js/gaso-extended.mjs`
- Create: `public/js/gaso-extended.test.mjs`
- Modify: `public/js/tend-group-modal.mjs` (panel arriba si `sectionKey === 'GASES'`)

- [ ] **Step 1: Failing tests**

```javascript
import { evaluateGasoExtended } from './gaso-extended.mjs';

test('Winter — acidosis metabólica HCO3 12 → PCO2 esperado 26', () => {
  const r = evaluateGasoExtended({ pH: 7.25, pCO2: 30, hco3: 12, na: 140, cl: 100, alb: 4 });
  assert.equal(r.steps.compensation.expectedPCO2, 26); // 1.5*12+8
});

test('identifica alcalosis respiratoria primaria asociada', () => {
  const r = evaluateGasoExtended({ pH: 7.2, pCO2: 25, hco3: 10, na: 140, cl: 105, alb: 4 });
  assert.match(r.steps.compensation.respiratoryNote, /ALCALOSIS RESPIRATORIA/i);
});
```

- [ ] **Step 2: Implement `evaluateGasoExtended`**

Reutilizar import dinámico o export público de `computeAnionGapValue_` desde `labs.js` (preferir export existente `computeAnionGap_` / `computeAnionGapValue_`).

Retornar:

```javascript
{
  steps: {
    ph: { label, value },
    primary: { disorder, type },
    compensation: { expectedPCO2, expectedHCO3Acute, expectedHCO3Chronic, respiratoryNote },
    anionGap: { value, corrected, interpretation },
    deltaDelta: { value, interpretation },
    oxygenation: { pfratio, aaGradient, note }, // fio2 default 0.21, overridable
  },
  summaryLines: string[],
}
```

- [ ] **Step 3: Panel en tend-group-modal**

Al abrir modal con `GASES`, render `#tend-gaso-extended-panel` con último set + input FiO₂ (0.21 default). Re-render al cambiar FiO₂.

- [ ] **Step 4: package.json + commit**

```bash
git commit -m "feat: interpretador gasométrico extendido en tendencias"
```

---

### Task 10: LAN sync + verificación final

**Files:**
- Modify: `public/js/features/lan-sync.mjs` (merge patient peso/talla/viaAcceso si faltan en merge)
- Modify: `public/js/app-boot-imports.test.mjs` (opcional smoke)

- [ ] **Step 1: LAN patient merge**

En merge de pacientes, copiar `peso`, `talla`, `viaAcceso` si el remoto trae valor y local vacío (mismo patrón que otros campos demográficos).

- [ ] **Step 2: Run full test suite**

Run: `npm test`  
Expected: all PASS

- [ ] **Step 3: Manual smoke**

1. Paciente con peso 60, vía CVC, K 2.8 en ESC → procesar lab → tab Manejo auto (modo normal)
2. Copiar bloque SOME → verificar MAYÚSCULAS
3. + Pendiente → texto enriquecido en Pendientes
4. Tendencias → Gasometría → panel 6 pasos visible
5. Modo Pase: NO auto-abrir Manejo

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: sync LAN campos manejo y verificación final"
```

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|---|---|
| peso/talla/vía Datos | Task 1 |
| SOME MAYÚSCULAS | Task 2 |
| K/Na/Mg/P/Ca hipo+hiper PDF | Tasks 3–4 |
| vía periférica vs CVC | Tasks 2–3 |
| cross alerts Mg→K, Ca→P, eTFG | Task 4 |
| Tab Manejo orden | Tasks 5, 7 |
| + Pendiente manual | Task 6 |
| manejoPending normal only | Task 8 |
| Quitar auto-pendientes electrolitos | Task 8 |
| Gaso extendida Tendencias | Task 9 |
| Hb transfusion auto pendiente | Task 8 (mantener) |

No placeholders TBD found.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-25-manejo-electrolitos-gasometria.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement tasks in this session with checkpoints

Which approach?
