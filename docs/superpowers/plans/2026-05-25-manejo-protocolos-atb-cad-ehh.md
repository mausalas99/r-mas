# Manejo — Protocolos, ATB y CAD/EHH — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extender **Manejo** con cuatro sub-pestañas (Electrolitos, Protocolos, ATB, CAD/EHH): catálogo copiable, calculadoras clínicas, ATB curado con sugerencias desde cultivos, y protocolo ADA CAD/EHH con lectura de laboratorio.

**Architecture:** Motores puros en `public/js/manejo-*.mjs`; UI orquestada en `features/manejo.mjs`; reutilizar `splitResLabsByTipo`, `parseCultivo_`, `parsePatientWeightKg`. Spec: `docs/superpowers/specs/2026-05-25-manejo-protocolos-atb-cad-ehh-design.md`.

**Tech Stack:** JavaScript ESM, `node --test`, `npm run build:ui`, CSS `manejo.css`.

---

## File Structure

| File | Responsabilidad |
|------|-----------------|
| `public/js/manejo-calculators.mjs` | Funciones puras vanco, bic HU, albumina, hipertónica, insulina, sedación, levetiracetam |
| `public/js/manejo-calculators.test.mjs` | TDD calculadoras |
| `public/js/manejo-protocols-catalog.mjs` | Array `MANEJO_PROTOCOLS` (~40 ítems) |
| `public/js/manejo-atb-catalog.mjs` | Array `MANEJO_ATB_DRUGS` (~30 fármacos) |
| `public/js/manejo-atb-suggest.mjs` | `classifyAtbForIsolate`, `buildGlobalAlerts`, mapa abrev→id |
| `public/js/manejo-atb-suggest.test.mjs` | BLEE/VRE/S fixtures |
| `public/js/manejo-cultivo-bridge.mjs` | `getCultureContextForManejo(labHistory, opts)` |
| `public/js/manejo-cultivo-bridge.test.mjs` | Aislamientos positivos desde chunks |
| `public/js/manejo-cad-ehh.mjs` | `evaluateCadEhh`, checklists CAD/EHH |
| `public/js/manejo-cad-ehh.test.mjs` | Modos cad/ehh/indeterminate |
| `public/js/features/manejo.mjs` | Sub-tabs, render por panel, pendientes genéricos |
| `public/styles/manejo.css` | Sub-nav, chips, ATB compatible/caution |
| `public/partials/layout/app-body.html` | `aria-label` Manejo clínico |
| `public/js/features/chrome.mjs` | Label sub-tab si aplica |
| `public/js/features/settings-help.mjs` | Entrada ayuda Manejo ampliado |
| `package.json` | Añadir 4 archivos `.test.mjs` al script `test` |

---

### Task 1: Sub-pestañas Manejo (shell sin regresión electrolitos)

**Files:**
- Modify: `public/js/features/manejo.mjs`
- Modify: `public/styles/manejo.css`
- Modify: `public/partials/layout/app-body.html` (solo `aria-label` en `#itab-manejo`)

- [ ] **Step 1: Constantes y estado de sub-tab**

Al inicio de `manejo.mjs`, después de imports:

```javascript
const MANEJO_SUBTABS = [
  { id: 'electrolitos', label: 'Electrolitos' },
  { id: 'protocolos', label: 'Protocolos' },
  { id: 'atb', label: 'ATB' },
  { id: 'cad-ehh', label: 'CAD/EHH' },
];
const MANEJO_SUBTAB_KEY = 'manejoSubtab';

function getActiveManejoSubtab() {
  try {
    var s = sessionStorage.getItem(MANEJO_SUBTAB_KEY);
    if (MANEJO_SUBTABS.some(function (t) { return t.id === s; })) return s;
  } catch (_e) {}
  return 'electrolitos';
}

function setActiveManejoSubtab(id) {
  try { sessionStorage.setItem(MANEJO_SUBTAB_KEY, id); } catch (_e) {}
}
```

- [ ] **Step 2: Extraer render electrolitos**

Renombrar el cuerpo actual de `renderManejo` (desde banner peso/vía hasta `container.appendChild(root)`) a función interna `renderManejoElectrolitos(panelEl, pid, patient)`.

- [ ] **Step 3: Nuevo `renderManejo` con sub-nav**

```javascript
export function renderManejo() {
  var container = document.getElementById('manejo-container');
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var pid = aid();
  if (!pid) {
    var emp = document.createElement('p');
    emp.className = 'manejo-empty';
    emp.textContent = 'Selecciona un paciente para ver el manejo clínico.';
    container.appendChild(emp);
    return;
  }

  var active = getActiveManejoSubtab();
  var root = document.createElement('div');
  root.className = 'manejo-root';

  var nav = document.createElement('nav');
  nav.className = 'manejo-subtabs';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Secciones de manejo');

  var panelsWrap = document.createElement('div');
  panelsWrap.className = 'manejo-subpanels';

  MANEJO_SUBTABS.forEach(function (tab) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-subtab' + (tab.id === active ? ' manejo-subtab--active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.id === active ? 'true' : 'false');
    btn.textContent = tab.label;
    btn.addEventListener('click', function () {
      setActiveManejoSubtab(tab.id);
      renderManejo();
    });
    nav.appendChild(btn);

    var panel = document.createElement('div');
    panel.className = 'manejo-subpanel';
    panel.id = 'manejo-panel-' + tab.id;
    panel.hidden = tab.id !== active;
    panel.setAttribute('role', 'tabpanel');
    if (tab.id === active) {
      if (tab.id === 'electrolitos') renderManejoElectrolitos(panel, pid, findPatient(pid));
      else if (tab.id === 'protocolos') renderManejoProtocolos(panel, pid, findPatient(pid));
      else if (tab.id === 'atb') renderManejoAtb(panel, pid, findPatient(pid));
      else if (tab.id === 'cad-ehh') renderManejoCadEhh(panel, pid, findPatient(pid));
    } else {
      panel.textContent = '';
    }
    panelsWrap.appendChild(panel);
  });

  root.appendChild(nav);
  root.appendChild(panelsWrap);
  container.appendChild(root);
}
```

Añadir stubs vacíos `renderManejoProtocolos`, `renderManejoAtb`, `renderManejoCadEhh` que muestren `<p class="manejo-hint">En construcción</p>` hasta Tasks 3–6.

- [ ] **Step 4: CSS sub-tabs**

En `manejo.css`:

```css
.manejo-subtabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.manejo-subtab {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border, #334155);
  background: transparent;
  font-size: 13px;
  cursor: pointer;
}
.manejo-subtab--active {
  background: var(--accent, #0d9488);
  color: #fff;
  border-color: transparent;
}
.manejo-subpanel[hidden] { display: none; }
```

- [ ] **Step 5: Actualizar aria-label**

En `app-body.html`, botón `#itab-manejo`:

```html
aria-label="Manejo clínico: electrolitos, protocolos, ATB, CAD/EHH"
```

- [ ] **Step 6: Verificar electrolitos**

Abrir app → paciente con lab alterado → Manejo → Electrolitos: tarjetas iguales que antes.

- [ ] **Step 7: Commit**

```bash
git add public/js/features/manejo.mjs public/styles/manejo.css public/partials/layout/app-body.html
git commit -m "feat(manejo): sub-tabs shell for electrolitos, protocolos, ATB, CAD/EHH"
```

---

### Task 2: Calculadoras (`manejo-calculators.mjs`)

**Files:**
- Create: `public/js/manejo-calculators.mjs`
- Create: `public/js/manejo-calculators.test.mjs`
- Modify: `package.json` (añadir ambos al script `test`)

- [ ] **Step 1: Write failing tests**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcVancoDose,
  calcBicHuBalanceada,
  calcAlbuminParacentesis,
  calcHypertonicVolume,
  calcInsulinUnitsPerHour,
  calcLevetiracetamLoad,
} from './manejo-calculators.mjs';

test('calcVancoDose 80 kg 25 mg/kg', () => {
  var r = calcVancoDose({ weightKg: 80, mgPerKg: 25 });
  assert.equal(r.totalMg, 2000);
  assert.equal(r.volumeCc, 400);
  assert.match(r.copyLine, /2000.*400.*GLUCOSADO/i);
});

test('calcBicHuBalanceada bic px 10', () => {
  var r = calcBicHuBalanceada({ weightKg: 70, bicPx: 10 });
  assert.equal(r.meqTotal, Math.round((24 - 10) * 70 * 0.3 / 8.5));
  assert.equal(r.thirds.length, 3);
});

test('calcAlbuminParacentesis 12 L', () => {
  var r = calcAlbuminParacentesis({ litersRemoved: 12 });
  assert.equal(r.grams, 96);
  assert.equal(r.ampoules20pct, 10);
});

test('calcHypertonicVolume con peso', () => {
  assert.equal(calcHypertonicVolume({ weightKg: 70, useWeightRule: true }).volumeCc, 210);
});

test('calcInsulinUnitsPerHour 0.1 u/kg/h 60 kg', () => {
  assert.equal(calcInsulinUnitsPerHour({ weightKg: 60, unitsPerKgPerHour: 0.1 }).unitsPerHour, 6);
});

test('calcLevetiracetamLoad 70 kg', () => {
  assert.equal(calcLevetiracetamLoad({ weightKg: 70 }).totalMg, 4200);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
node --test public/js/manejo-calculators.test.mjs
```

- [ ] **Step 3: Implement**

```javascript
/** @param {{ weightKg: number, mgPerKg: number, label?: string }} p */
export function calcVancoDose(p) {
  var w = Number(p.weightKg);
  var mgKg = Number(p.mgPerKg);
  var totalMg = Math.round(w * mgKg);
  var volumeCc = Math.round(totalMg / 5);
  var copyLine =
    'Vancomicina ' + totalMg + ' mg diluir en ' + volumeCc +
    ' cc glucosado 5% para 2 h cada 12 h';
  return { totalMg, volumeCc, copyLine };
}

export function calcBicHuBalanceada(p) {
  var meq = (24 - Number(p.bicPx)) * Number(p.weightKg) * 0.3 / 8.5;
  var rounded = Math.round(meq);
  var third = Math.round(rounded / 3);
  return {
    meqTotal: rounded,
    thirds: [
      { phase: 'bolo', meq: third, note: 'Sin diluir' },
      { phase: '4h', meq: third, note: 'Diluido balanceada HU' },
      { phase: '24h', meq: third, note: 'Infusión titular 24 h' },
    ],
    copyLine: 'Balanceada HU total ~' + rounded + ' mEq (3 tercios: ' + third + '/' + third + '/' + third + ')',
  };
}

export function calcAlbuminParacentesis(p) {
  var L = Number(p.litersRemoved);
  var grams = Math.round(L * 8);
  var ampoules20pct = Math.ceil(grams / 10);
  return {
    grams,
    ampoules20pct,
    copyLine: grams + ' g albumina (~' + ampoules20pct + ' amp 20%) tras ' + L + ' L',
  };
}

export function calcHypertonicVolume(p) {
  if (p.useWeightRule && p.weightKg != null) {
    return { volumeCc: Math.round(Number(p.weightKg) * 3), copyLine: 'Hipertónica: pasar ' + Math.round(p.weightKg * 3) + ' cc (3 cc/kg)' };
  }
  return { volumeCc: 100, copyLine: 'Hipertónica: 100 cc SS 0.9% + 3 amp NaCl 17.7% en 20 min' };
}

export function calcInsulinUnitsPerHour(p) {
  var u = Number(p.weightKg) * Number(p.unitsPerKgPerHour);
  return { unitsPerHour: Math.round(u * 10) / 10, copyLine: 'Insulina regular ' + p.unitsPerKgPerHour + ' U/kg/h → ' + (Math.round(u * 10) / 10) + ' U/h' };
}

export function calcLevetiracetamLoad(p) {
  var mg = Math.round(Number(p.weightKg) * 60);
  return { totalMg: mg, copyLine: 'Levetiracetam ' + mg + ' mg (60 mg/kg) en 100 cc SS 0.9%' };
}

/** Map calculatorId → runner */
export const MANEJO_CALCULATORS = {
  'vanco-load': (inputs) => calcVancoDose({ ...inputs, mgPerKg: inputs.mgPerKg ?? 25 }),
  'vanco-maint': (inputs) => calcVancoDose({ ...inputs, mgPerKg: inputs.mgPerKg ?? 17.5 }),
  'bic-hu-balanceada': calcBicHuBalanceada,
  'albumin-paracentesis': calcAlbuminParacentesis,
  'hypertonic-volume': calcHypertonicVolume,
  'insulin-u-kg-h': calcInsulinUnitsPerHour,
  'levetiracetam-load': calcLevetiracetamLoad,
};
```

(Añadir `calcSedationMgPerHour` en el mismo archivo con rangos midazolam/propofol/dexmed según spec.)

- [ ] **Step 4: Run tests — PASS**

```bash
node --test public/js/manejo-calculators.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add public/js/manejo-calculators.mjs public/js/manejo-calculators.test.mjs package.json
git commit -m "feat(manejo): clinical calculator pure functions"
```

---

### Task 3: Catálogo protocolos + UI Protocolos

**Files:**
- Create: `public/js/manejo-protocols-catalog.mjs`
- Modify: `public/js/features/manejo.mjs` — `renderManejoProtocolos`, helpers tarjeta

- [ ] **Step 1: Crear catálogo**

Archivo `manejo-protocols-catalog.mjs` exporta:

```javascript
export const MANEJO_PROTOCOL_CATEGORIES = [
  { id: 'vasopresores', label: 'Vasopresores' },
  { id: 'cardiovascular', label: 'Cardiovascular' },
  // ... todas las del spec
];

export const MANEJO_PROTOCOLS = [
  {
    id: 'nore-standard',
    category: 'vasopresores',
    title: 'Noradrenalina',
    indicationText: '16 mg en 125 cc glucosado 5%. Iniciar 5 mcg/min y titular.',
    calculatorId: null,
    copyTemplate: 'NORE: 16 MG EN 125 CC DE GLUCOSADO AL 5%, INICIAR A 5 MCG/MIN Y TITULAR',
    notes: ['Permitir titular'],
  },
  {
    id: 'vanco-load',
    category: 'fluidos-electrolitos',
    title: 'Vancomicina — carga',
    indicationText: '20–30 mg/kg. Cada 5 mg = 1 ml. Infusión 2 h c/12 h.',
    calculatorId: 'vanco-load',
    copyTemplate: '',
    notes: ['Niveles antes de 4ª dosis (mantenimiento)'],
  },
  // ... completar TODOS los ítems del spec (lista equipo + sedación IOT + Stanford única)
];
```

Completar manualmente los ~35–40 ítems con textos del chat/spec (vasopresina, nitro, IAM, midazolam, propofol, dexmed, levetiracetam, balanceada HU, amiodarona, buprenorfina, Ca, hipertónica, salbutamol, carboximaltosa, venofer, plaquetas, furo, albumina, Mg, bicarb VO, sedación IOT, etc.).

- [ ] **Step 2: Helper pendiente genérico**

En `manejo.mjs`:

```javascript
function addManejoGenericPendiente(ruleId, text, labFechaNorm) {
  var pid = aid();
  if (!pid) return;
  var ruleScoped = 'manejo:' + ruleId;
  var todos = storage.getTodos(pid);
  if (!shouldAddLabSuggestionTodo(todos, ruleScoped, labFechaNorm || '')) {
    rt.showToast('Ya hay un pendiente abierto para esta fila.', '');
    return;
  }
  var nowIso = new Date().toISOString();
  var entry = {
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6),
    text: text,
    completed: false,
    priority: 'media',
    createdAt: nowIso,
    updatedAt: nowIso,
    labRuleId: ruleScoped,
    labFecha: labFechaNorm || '',
  };
  todos.push(entry);
  storage.saveTodos(pid, todos);
  rt.emitLiveSyncTodoUpsert(pid, entry);
  rt.refreshAllTodoUIs();
  rt.showToast('Pendiente agregado', 'success');
}
```

- [ ] **Step 3: `buildProtocolCard(entry, patient, labFechaNorm)`**

- Chips categoría
- `indicationText`
- Si `calculatorId`: inputs (peso desde `patient.peso`, campos number según calc), botón **Calcular**, área resultado, **Copiar** = `copyTemplate` + línea calculadora
- Botones Copiar / + Pendiente (`manejo-proto:{id}`, `Proto: {title}`)

- [ ] **Step 4: `renderManejoProtocolos`**

- Barra chips filtro (toggle `data-category`)
- Input búsqueda (`filter` por title + indicationText)
- Grid `manejo-cards` con tarjetas filtradas
- Sin paciente / sin match: hints

- [ ] **Step 5: Manual smoke** — Protocolos → NORE copia texto; vanco con peso 80 calcula 400 cc.

- [ ] **Step 6: Commit**

```bash
git add public/js/manejo-protocols-catalog.mjs public/js/features/manejo.mjs public/styles/manejo.css
git commit -m "feat(manejo): protocol catalog and Protocolos sub-tab UI"
```

---

### Task 4: Puente cultivos (`manejo-cultivo-bridge.mjs`)

**Files:**
- Create: `public/js/manejo-cultivo-bridge.mjs`
- Create: `public/js/manejo-cultivo-bridge.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing test** (fixture de `labs-cultivo.test.mjs` hemocultivo pseudomonas)

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCultureContextForManejo } from './manejo-cultivo-bridge.mjs';

test('aislamiento positivo pseudomonas en historial mock', () => {
  var hist = [{
    fecha: '14/02/2026',
    hora: '14:00',
    resLabs: [/* pegar bloque HEMOCULTIVO + pseudomonas del test labs-cultivo */],
  }];
  var ctx = getCultureContextForManejo(hist, { maxAgeDays: 14 });
  assert.ok(ctx.isolates.length >= 1);
  assert.match(ctx.isolates[0].organismo, /pseudomonas/i);
});
```

- [ ] **Step 2: Implement bridge**

Importar `splitResLabsByTipo` desde `lab-history-set.mjs`, `parseCultivo_` desde `labs.js`, `sortLabHistoryChronological` desde `tend-core.mjs`.

Lógica:

1. Ordenar historial cronológico.
2. Por cada set, `splitResLabsByTipo(set.resLabs).cultivo` → unir líneas.
3. Partir en chunks `\n\n+`; primera línea = header.
4. Negativo si `cultureBlockLooksNegative` (copiar función de expediente o importar si se extrae a util compartido).
5. `parseCultivo_(chunk, norm(chunk))` para `risSummary` / texto compacto.
6. Extraer `sensKeys` con S: regex `S:\s*([A-Z0-9/,.\s-]+)` del output de parseCultivo_.
7. Filtrar por fecha ≤ 14 días (`parseFechaLabToMs`).
8. `globalAlerts` desde markers únicos (BLEE, VRE, …).

Export:

```javascript
export function getCultureContextForManejo(labHistory, opts) {
  opts = opts || {};
  var maxDays = opts.maxAgeDays == null ? 14 : opts.maxAgeDays;
  return { isolates: [], globalAlerts: [], activeIsolateIndex: 0 };
}
```

- [ ] **Step 3: Run test PASS**

- [ ] **Step 4: Commit**

```bash
git add public/js/manejo-cultivo-bridge.mjs public/js/manejo-cultivo-bridge.test.mjs package.json
git commit -m "feat(manejo): culture context bridge for ATB suggestions"
```

---

### Task 5: ATB catálogo + suggest + UI

**Files:**
- Create: `public/js/manejo-atb-catalog.mjs`
- Create: `public/js/manejo-atb-suggest.mjs`
- Create: `public/js/manejo-atb-suggest.test.mjs`
- Modify: `public/js/features/manejo.mjs` — `renderManejoAtb`
- Modify: `public/styles/manejo.css` — `.manejo-atb--compatible`, `--caution`

- [ ] **Step 1: Tests suggest**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAtbForIsolate } from './manejo-atb-suggest.mjs';
import { MANEJO_ATB_DRUGS } from './manejo-atb-catalog.mjs';

test('BLEE cautions ceftriaxona', () => {
  var drug = MANEJO_ATB_DRUGS.find((d) => d.id === 'ceftriaxona');
  var r = classifyAtbForIsolate(drug, {
    markers: ['BLEE'],
    sensKeys: [],
    organismo: 'Klebsiella pneumoniae',
  });
  assert.equal(r.status, 'caution');
});

test('MERO S → compatible', () => {
  var drug = MANEJO_ATB_DRUGS.find((d) => d.id === 'meropenem');
  var r = classifyAtbForIsolate(drug, {
    markers: [],
    sensKeys: ['MERO'],
    organismo: 'Pseudomonas aeruginosa',
  });
  assert.equal(r.status, 'compatible');
});
```

- [ ] **Step 2: Catálogo ATB** — 30 entradas con `someAbbrev` alineado a abreviaciones de `labs.js` (`MERO`, `CIPRO`, `VANCO`, `LINEZ`, `PIP/TAZO`, `CFTX`, `FEP`, `CAZ`, `DAPTO`, …). Textos de dosis desde `atb.pdf` (curación manual).

- [ ] **Step 3: `manejo-atb-suggest.mjs`**

```javascript
const BLEE_CAUTION_IDS = new Set(['ceftriaxona', 'cefotaxima', 'ceftazidima']);
const VRE_CAUTION_IDS = new Set(['vancomicina']);
const CARBAPENEM_CAUTION_IDS = new Set(['meropenem', 'imipenem']);

export function classifyAtbForIsolate(drug, isolate) {
  if (!drug || !isolate) return { status: 'neutral', reasons: [] };
  var reasons = [];
  var markers = isolate.markers || [];
  if (markers.indexOf('BLEE') !== -1 && BLEE_CAUTION_IDS.has(drug.id)) {
    reasons.push('BLEE: evitar cefalosporinas 3ª gen');
  }
  if (markers.indexOf('VRE') !== -1 && VRE_CAUTION_IDS.has(drug.id)) {
    reasons.push('VRE: vancomicina no indicada');
  }
  if (markers.some((m) => /^(KPC|NDM|VIM|IMP|Carb-R|CRE)$/.test(m)) && CARBAPENEM_CAUTION_IDS.has(drug.id)) {
    reasons.push('Carbapenemasa: evitar carbapenems');
  }
  if (reasons.length) return { status: 'caution', reasons };
  var sens = isolate.sensKeys || [];
  var hit = (drug.someAbbrev || []).some((ab) => sens.indexOf(ab) !== -1);
  if (hit) return { status: 'compatible', reasons: ['S en antibiograma'] };
  return { status: 'neutral', reasons: [] };
}

export function buildGlobalAlerts(markers) {
  var out = [];
  if (markers.indexOf('BLEE') !== -1) out.push('BLEE: evitar cefalosporinas 3ª gen');
  if (markers.indexOf('VRE') !== -1) out.push('VRE: preferir linezolid/daptomicina según antibiograma');
  return out;
}
```

- [ ] **Step 4: UI ATB**

`renderManejoAtb`:

1. `getCultureContextForManejo(rt.ensureParsedLabHistory(pid))`
2. Banner: selector `<select>` si `isolates.length > 1`; lista alertas globales
3. Disclaimer: *Sugerencia orientativa; confirmar clínicamente.*
4. Filtro familia + búsqueda
5. Tarjetas con clase `manejo-atb--{status}`; Copiar = `name + adultDose + renalNote`; Pendiente `ATB: {name}`

- [ ] **Step 5: Run tests + commit**

```bash
node --test public/js/manejo-atb-suggest.test.mjs
git add public/js/manejo-atb-catalog.mjs public/js/manejo-atb-suggest.mjs public/js/manejo-atb-suggest.test.mjs public/js/features/manejo.mjs public/styles/manejo.css package.json
git commit -m "feat(manejo): ATB catalog with culture-assisted suggestions"
```

---

### Task 6: CAD/EHH motor + UI

**Files:**
- Create: `public/js/manejo-cad-ehh.mjs`
- Create: `public/js/manejo-cad-ehh.test.mjs`
- Modify: `public/js/features/manejo.mjs` — `renderManejoCadEhh`
- Modify: `package.json`

- [ ] **Step 1: Tests**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCadEhh, CAD_EHH_THRESHOLDS } from './manejo-cad-ehh.mjs';

test('modo cad: glucosa alta + acidosis', () => {
  var r = evaluateCadEhh({
    labs: { glucoseMgDl: 450, ph: 7.1, hco3: 12, ketonesPositive: true },
  });
  assert.equal(r.suggestedMode, 'cad');
});

test('modo ehh: glucosa muy alta sin acidosis', () => {
  var r = evaluateCadEhh({
    labs: { glucoseMgDl: 600, ph: 7.38, hco3: 22, ketonesPositive: false },
  });
  assert.equal(r.suggestedMode, 'ehh');
});
```

- [ ] **Step 2: Implement `evaluateCadEhh`**

Constantes:

```javascript
export const CAD_EHH_THRESHOLDS = {
  ehhGlucoseMgDl: 500,
  cadGlucoseMgDl: 250,
  cadPh: 7.3,
  cadHco3: 18,
  ehhPhMin: 7.25,
};
```

Extraer labs desde `parsedBySection` / `parsed` (reutilizar helpers de `electrolyte-manejo` para glucosa/K o copiar `extractNumericFromParsed` mínimo).

Exportar `CAD_CHECKLIST` y `EHH_CHECKLIST` arrays `{ id, phase, text, copyLine }`.

`resolutionChecks`: comparar pH, HCO3, glucosa con umbrales spec.

- [ ] **Step 3: UI `renderManejoCadEhh`**

- Toggle 3 botones CAD | EHH | Indeterminado (default `evaluateCadEhh().suggestedMode`)
- Bloque último lab + checks ✓/○
- Acordeón fases; Copiar por ítem
- Calculadoras insulina + líquidos (embed `MANEJO_CALCULATORS`)
- Pendiente: `manejo-cad:{stepId}`

- [ ] **Step 4: Tests PASS + commit**

```bash
git add public/js/manejo-cad-ehh.mjs public/js/manejo-cad-ehh.test.mjs public/js/features/manejo.mjs package.json
git commit -m "feat(manejo): CAD/EHH protocol panel with lab-assisted mode"
```

---

### Task 7: Ayuda, build UI y verificación final

**Files:**
- Modify: `public/js/features/settings-help.mjs`
- Run: `npm test`, `npm run build:ui`

- [ ] **Step 1: Entrada ayuda**

En el array de topics de ayuda, actualizar o añadir sección **Manejo clínico** describiendo las 4 sub-pestañas, ATB orientativo, CAD/EHH.

- [ ] **Step 2: `npm test`**

```bash
npm test
```

Expected: todos los tests PASS incluyendo los 4 nuevos.

- [ ] **Step 3: `npm run build:ui`**

```bash
npm run build:ui
```

Expected: `public/index.html` regenerado con cambios de `app-body.html`.

- [ ] **Step 4: Commit**

```bash
git add public/js/features/settings-help.mjs public/index.html
git commit -m "docs(help): manejo sub-tabs protocols ATB CAD/EHH"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| 4 sub-pestañas | Task 1 |
| sessionStorage `manejoSubtab` | Task 1 |
| Catálogo protocolos + categorías | Task 3 |
| Calculadoras v1 | Task 2, usadas en 3 y 6 |
| ATB ~30 fármacos | Task 5 |
| Cultivos B (S, alertas, selector) | Task 4 + 5 |
| CAD/EHH checklist + labs | Task 6 |
| Copiar + Pendiente | Tasks 3, 5, 6 |
| Tests motores | Tasks 2, 4, 5, 6 |
| Ayuda | Task 7 |
| aria-label Manejo clínico | Task 1 |

---

## Risks (recordatorio implementación)

- No auto-insertar en nota de evolución.
- Catálogo ATB/protocolos: revisión médica al curar textos desde PDFs.
- Si `detectMarcasResistenciaCultivo` no es exportable, duplicar llamada vía `parseCultivo_` output o exportar helper mínimo desde `labs.js` en Task 4.
