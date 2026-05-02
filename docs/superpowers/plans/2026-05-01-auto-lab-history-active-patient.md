# Auto-lab History for Active Patient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al procesar un reporte de laboratorio, guardar automaticamente el set en `labHistory` solo si hay paciente activo, para alimentar Tendencias sin requerir "Enviar a nota".

**Architecture:** Extraer la logica de deduplicacion y comparacion de sets a un modulo pequeno reutilizable y testeable con `node:test`, exponerlo en `window` para consumo desde `app.js`, y enganchar una auto-ingesta en `procesarReporte()`. Se mantiene intacta la semantica de "Enviar a nota" para escribir `estudios`.

**Tech Stack:** Electron, JS vanilla (`public/js/app.js`), Node test runner (`node --test`), Chart.js (sin cambios).

---

## File Structure

- Create: `public/js/lab-history-auto-store-core.mjs`  
  Responsabilidad: helpers puros de normalizacion/comparacion/deduplicacion para sets de labs.
- Create: `public/js/lab-history-auto-store-core.test.mjs`  
  Responsabilidad: pruebas unitarias TDD de los helpers puros.
- Modify: `public/index.html`  
  Responsabilidad: cargar el modulo core antes de `app.js` y exponer API global estable.
- Modify: `public/js/app.js`  
  Responsabilidad: integrar auto-ingesta al flujo `procesarReporte()` usando helpers core; refrescar historial/tendencias; no tocar flujo de nota.
- Modify: `package.json`  
  Responsabilidad: ampliar `npm test` para correr la nueva suite.

---

### Task 1: Crear modulo core y pruebas en rojo (TDD)

**Files:**
- Create: `public/js/lab-history-auto-store-core.mjs`
- Create: `public/js/lab-history-auto-store-core.test.mjs`
- Test: `public/js/lab-history-auto-store-core.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLabLine,
  normalizeLabLines,
  areLabSetsEquivalent,
  isDuplicateAgainstLatest,
} from './lab-history-auto-store-core.mjs';

test('normalizeLabLine colapsa espacios y trim', () => {
  assert.equal(normalizeLabLine('  Hb   12.1   g/dL  '), 'Hb 12.1 g/dL');
});

test('areLabSetsEquivalent detecta igualdad semantica', () => {
  const a = ['Hb  12.1 g/dL', 'Cr 1.0 mg/dL'];
  const b = [' Hb 12.1 g/dL ', 'Cr   1.0 mg/dL'];
  assert.equal(areLabSetsEquivalent(a, b), true);
});

test('isDuplicateAgainstLatest true cuando coincide fecha/hora/labs', () => {
  const latest = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  const incoming = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  assert.equal(isDuplicateAgainstLatest(latest, incoming), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/lab-history-auto-store-core.test.mjs`  
Expected: FAIL with "Cannot find module './lab-history-auto-store-core.mjs'" or missing export errors.

- [ ] **Step 3: Write minimal implementation**

```javascript
export function normalizeLabLine(line) {
  return String(line == null ? '' : line).replace(/\s+/g, ' ').trim();
}

export function normalizeLabLines(lines) {
  return (lines || []).map(normalizeLabLine).filter(Boolean);
}

export function areLabSetsEquivalent(a, b) {
  const aa = normalizeLabLines(a);
  const bb = normalizeLabLines(b);
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}

function normalizeDate(v) {
  return String(v == null ? '' : v).trim();
}

function normalizeTime(v) {
  return String(v == null ? '' : v).trim();
}

export function isDuplicateAgainstLatest(latest, incoming) {
  if (!latest || !incoming) return false;
  if (normalizeDate(latest.fecha) !== normalizeDate(incoming.fecha)) return false;
  if (normalizeTime(latest.hora) !== normalizeTime(incoming.hora)) return false;
  return areLabSetsEquivalent(latest.resLabs || [], incoming.resLabs || []);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test public/js/lab-history-auto-store-core.test.mjs`  
Expected: PASS for all three tests.

- [ ] **Step 5: Commit**

```bash
git add public/js/lab-history-auto-store-core.mjs public/js/lab-history-auto-store-core.test.mjs
git commit -m "test: add core lab auto-store dedupe coverage"
```

---

### Task 2: Exponer core en browser y ampliar cobertura TDD

**Files:**
- Modify: `public/js/lab-history-auto-store-core.mjs`
- Modify: `public/js/lab-history-auto-store-core.test.mjs`
- Modify: `public/index.html`
- Test: `public/js/lab-history-auto-store-core.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
test('isDuplicateAgainstLatest false cuando cambia hora', () => {
  const latest = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  const incoming = { fecha: '01/05/2026', hora: '10:00', resLabs: ['Hb 12.1'] };
  assert.equal(isDuplicateAgainstLatest(latest, incoming), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/lab-history-auto-store-core.test.mjs`  
Expected: FAIL if time normalization/comparison is incomplete.

- [ ] **Step 3: Write minimal implementation + browser exposure**

```javascript
// at end of lab-history-auto-store-core.mjs
const api = {
  normalizeLabLine,
  normalizeLabLines,
  areLabSetsEquivalent,
  isDuplicateAgainstLatest,
};

if (typeof window !== 'undefined') {
  window.LabAutoStoreCore = api;
}
```

```html
<!-- in public/index.html, before app.js -->
<script type="module" src="js/lab-history-auto-store-core.mjs"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test public/js/lab-history-auto-store-core.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/lab-history-auto-store-core.mjs public/js/lab-history-auto-store-core.test.mjs public/index.html
git commit -m "feat: expose lab auto-store core for browser and tests"
```

---

### Task 3: Integrar auto-ingesta en `app.js` con guardas y dedupe

**Files:**
- Modify: `public/js/app.js`
- Test: `public/js/lab-history-auto-store-core.test.mjs`

- [ ] **Step 1: Write the failing test (integration contract in unit form)**

```javascript
test('isDuplicateAgainstLatest false cuando cambia cualquier linea', () => {
  const latest = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1', 'Cr 1.0'] };
  const incoming = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1', 'Cr 1.1'] };
  assert.equal(isDuplicateAgainstLatest(latest, incoming), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/lab-history-auto-store-core.test.mjs`  
Expected: FAIL if comparator still allows false positives.

- [ ] **Step 3: Write minimal implementation in app flow**

```javascript
function isDuplicateLatestLabSet(patientId, resLabs, fecha, hora) {
  var list = labHistory[patientId] || [];
  if (!list.length) return false;
  var latest = list[list.length - 1];
  var incoming = { fecha: fecha || '', hora: hora || '', resLabs: resLabs || [] };

  if (window.LabAutoStoreCore && typeof window.LabAutoStoreCore.isDuplicateAgainstLatest === 'function') {
    return window.LabAutoStoreCore.isDuplicateAgainstLatest(latest, incoming);
  }

  return false;
}

function autoStoreProcessedLabResult(result) {
  if (!activeId) return;
  if (!result || !result.resLabs || !result.resLabs.length) return;
  var fecha = (result.patient && result.patient.fecha) ? result.patient.fecha : '';
  var hora = '';
  if (isDuplicateLatestLabSet(activeId, result.resLabs, fecha, hora)) {
    showToast('Resultado ya registrado en historial', 'success');
    return;
  }
  pushLabHistory(activeId, result.resLabs, fecha, hora);
  saveState();
  renderLabHistoryPanel();
  if (activeInner === 'tend' && activeAppTab === 'nota') renderTendencias();
}

// inside procesarReporte(), after renderOutput and renderDiagramas:
autoStoreProcessedLabResult(result);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test public/js/lab-history-auto-store-core.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/app.js public/js/lab-history-auto-store-core.test.mjs
git commit -m "feat: auto-store processed labs for active patient"
```

---

### Task 4: Ejecutar suite completa, smoke manual, docs de verificacion

**Files:**
- Modify: `package.json`
- Test: `public/js/update-helpers.test.mjs`
- Test: `public/js/lab-history-auto-store-core.test.mjs`

- [ ] **Step 1: Write the failing test command wiring**

```json
{
  "scripts": {
    "test": "node --test public/js/update-helpers.test.mjs public/js/lab-history-auto-store-core.test.mjs"
  }
}
```

- [ ] **Step 2: Run test to verify it fails (before script update)**

Run: `npm test`  
Expected: only existing test runs; new suite absent (coverage gap).

- [ ] **Step 3: Write minimal implementation**

```json
{
  "scripts": {
    "test": "node --test public/js/update-helpers.test.mjs public/js/lab-history-auto-store-core.test.mjs"
  }
}
```

- [ ] **Step 4: Run tests and smoke checks**

Run:
- `npm test`
- `npm start`

Expected:
- Test runner reports PASS in both suites.
- Manual smoke:
  1) paciente activo + procesar => historial agrega set;
  2) reprocesar igual => no duplica;
  3) sin paciente activo => no agrega historial;
  4) "Enviar a nota" sigue escribiendo `estudios`.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore: include auto-store lab tests in npm test"
```

---

## Spec Self-Review

- **Spec coverage:**  
  - Auto-ingesta con paciente activo: Task 3.  
  - No guardar sin activo: Task 3 (guard clause).  
  - Mantener "Enviar a nota": Task 3 (sin tocar `checkStudiosAndInsertLabs`).  
  - Deduplicacion inmediata: Tasks 1-3.  
  - Orden cronologico existente: Task 3 reutiliza `pushLabHistory` + render actual, sin cambiar ordenadores.
- **Placeholder scan:** no hay "TODO/TBD"; cada paso incluye archivos, comandos y codigo.
- **Type consistency:** `LabAutoStoreCore.isDuplicateAgainstLatest` se usa de forma consistente entre tests, modulo y `app.js`.
