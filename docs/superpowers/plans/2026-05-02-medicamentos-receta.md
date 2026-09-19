# Medicamentos + Receta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir la pestaña **Medicamentos** con pegado TSV hospitalario, botón **Receta** que sobrescribe el estado del paciente activo, lista con **Suspender**, **Copiar** al portapapeles como Laboratorio, y núcleo probado por tests.

**Architecture:** Estado `medRecetaByPatient` en `localStorage` (paralelo a `labHistory` pero un solo documento por paciente: `fechaActualizacion` + `items[]`). Lógica pura en `public/js/med-receta-core.mjs`; `app.js` importa, pinta UI y llama `saveState`. Respaldo/import incluye la nueva clave para no perder datos.

**Tech stack:** Electron renderer, vanilla JS, `node --test` para `*.test.mjs`, mismo estilo que `lab-history-auto-store-core.mjs`.

**Spec de referencia:** `docs/superpowers/specs/2026-05-02-medicamentos-receta-design.md`

---

## File map

| File | Rol |
|------|-----|
| `public/js/med-receta-core.mjs` | Parseo TSV, extracción de fecha mayoritaria, `DIA#`, generación de línea de egreso, `buildMedRecetaCopyText(items)`. |
| `public/js/med-receta-core.test.mjs` | Tests dorados (pegado de ejemplo → ítems; ítems → líneas de egreso; fecha; `DIA#`). |
| `public/js/storage.js` | `getMedRecetaByPatient`, `saveMedRecetaByPatient`, extender `saveAll` con quinto argumento. |
| `public/js/app.js` | Variable global, `saveState`, `switchAppTab`, `selectPatient`, borrado paciente, respaldo/import/export, UI handlers. |
| `public/index.html` | Tercer `app-tab`, `#appcontent-med`, textarea, lista, preview, botones Receta/Copiar. |
| `package.json` | Añadir `med-receta-core.test.mjs` al script `test`. |

---

### Task 1: Persistencia en `storage.js`

**Files:**
- Modify: `public/js/storage.js`
- Modify: `public/js/app.js` (solo las líneas del paso 5)

- [ ] **Step 1: Añadir getters/setters y ampliar `saveAll`**

En `public/js/storage.js`, después de `saveLabHistory`, añadir:

```javascript
  getMedRecetaByPatient() {
    return safeParseObject(localStorage.getItem('rpc-medRecetaByPatient'));
  },

  saveMedRecetaByPatient(medRecetaByPatient) {
    const persist = {};
    Object.keys(medRecetaByPatient || {}).forEach(k => {
      if (medRecetaByPatient[k] && !k.startsWith('demo-')) persist[k] = medRecetaByPatient[k];
    });
    localStorage.setItem('rpc-medRecetaByPatient', JSON.stringify(persist));
  },
```

Reemplazar el cuerpo de `saveAll` para que firma y cuerpo sean:

```javascript
  saveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient) {
    this.savePatients(patients);
    this.saveNotes(notes);
    this.saveIndicaciones(indicaciones);
    this.saveLabHistory(labHistory);
    this.saveMedRecetaByPatient(medRecetaByPatient || {});
  },
```

Actualizar el JSDoc de `saveAll` para documentar el quinto parámetro.

- [ ] **Step 2: Inicializar variable en `app.js` y actualizar `saveState`**

Junto a `var labHistory = storage.getLabHistory();` (aprox. línea 32), añadir:

```javascript
var medRecetaByPatient = storage.getMedRecetaByPatient();
```

Reemplazar `saveState`:

```javascript
function saveState() {
  storage.saveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient);
}
```

- [ ] **Step 3: Ejecutar tests existentes (regresión)**

Run: `npm test`  
Expected: todas pasan (aún no hay tests de receta).

- [ ] **Step 4: Commit**

```bash
git add public/js/storage.js public/js/app.js
git commit -m "feat(storage): medRecetaByPatient + saveAll fifth arg"
```

---

### Task 2: Núcleo `med-receta-core.mjs` — parseo y fecha

**Files:**
- Create: `public/js/med-receta-core.mjs`
- Create: `public/js/med-receta-core.test.mjs` (solo tests de parseo en este task)
- Modify: `package.json` (script `test`)

- [ ] **Step 1: Test fallido — parseo de una línea y fecha**

Crear `public/js/med-receta-core.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMedicationPaste, resolveFechaActualizacion } from './med-receta-core.mjs';

test('parseMedicationPaste extrae nombre, via, dosis, frecuencia y diaTratamiento null sin DIA#', () => {
  var line =
    '02/05/2026 08:31:32 a.m.\tMEDICAMENTOS\tENOXAPARINA 40 MG SOL INY 0.4 ML (+*)\tVIA SUBCUTANEA\t40 MG //\tCADA 24 HORAS\tNW';
  var r = parseMedicationPaste(line);
  assert.equal(r.skipped, 0);
  assert.equal(r.items.length, 1);
  var it = r.items[0];
  assert.equal(it.nombreRaw, 'ENOXAPARINA 40 MG SOL INY 0.4 ML (+*)');
  assert.equal(it.viaRaw, 'VIA SUBCUTANEA');
  assert.equal(it.dosisRaw, '40 MG //');
  assert.equal(it.frecuenciaRaw, 'CADA 24 HORAS');
  assert.equal(it.diaTratamiento, null);
});

test('parseMedicationPaste lee DIA# en dosis', () => {
  var line =
    '02/05/2026 08:31:38 a.m.\tMEDICAMENTOS\tMETRONIDAZOL 500 MG SOL INY 100 ML (*)\tVIA INTRAVENOSA\t500 MG // *DIA# 3*\tCADA 8 HORAS\tNW';
  var r = parseMedicationPaste(line);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].diaTratamiento, 3);
});

test('resolveFechaActualizacion usa moda de fechas dd/mm/yyyy', () => {
  assert.equal(resolveFechaActualizacion(['02/05/2026', '02/05/2026', '03/05/2026'], '09/05/2026'), '02/05/2026');
});

test('resolveFechaActualizacion cae en fallback si vacío', () => {
  assert.equal(resolveFechaActualizacion([], '09/05/2026'), '09/05/2026');
});
```

Añadir a `package.json` en `scripts.test`:

```json
"test": "node --test public/js/update-helpers.test.mjs public/js/lab-history-auto-store-core.test.mjs public/js/med-receta-core.test.mjs"
```

Run: `npm test`  
Expected: FAIL (módulo o export faltante).

- [ ] **Step 2: Implementar parseo mínimo en `med-receta-core.mjs`**

Crear `public/js/med-receta-core.mjs` con:

```javascript
function trimStr(v) {
  return String(v == null ? '' : v).trim();
}

export function parseFechaDMYFromTimestampCell(cell) {
  var t = trimStr(cell);
  var m = t.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  return m ? m[1] : '';
}

export function extractDiaTratamiento(dosisRaw) {
  var t = trimStr(dosisRaw);
  var m = t.match(/\*?\s*DIA#\s*(\d+)\s*\*?/i);
  return m ? parseInt(m[1], 10) : null;
}

export function parseMedicationPaste(text) {
  var lines = String(text || '')
    .split(/\r?\n/)
    .map(trimStr)
    .filter(Boolean);
  var items = [];
  var fechas = [];
  var skipped = 0;
  for (var i = 0; i < lines.length; i += 1) {
    var cols = lines[i].split('\t');
    if (cols.length < 7) {
      skipped += 1;
      continue;
    }
    var tipo = trimStr(cols[1]).toUpperCase();
    if (tipo !== 'MEDICAMENTOS') {
      skipped += 1;
      continue;
    }
    var fd = parseFechaDMYFromTimestampCell(cols[0]);
    if (fd) fechas.push(fd);
    var dosisRaw = trimStr(cols[4]);
    items.push({
      id: 'med-' + Date.now().toString(36) + '-' + i,
      nombreRaw: trimStr(cols[2]),
      viaRaw: trimStr(cols[3]),
      dosisRaw: dosisRaw,
      frecuenciaRaw: trimStr(cols[5]),
      suspendido: false,
      diaTratamiento: extractDiaTratamiento(dosisRaw),
    });
  }
  return { items: items, fechas: fechas, skipped: skipped };
}

export function resolveFechaActualizacion(fechas, fallbackDMY) {
  var list = (fechas || []).filter(Boolean);
  if (!list.length) return trimStr(fallbackDMY) || '';
  var counts = Object.create(null);
  for (var i = 0; i < list.length; i += 1) {
    var k = list[i];
    counts[k] = (counts[k] || 0) + 1;
  }
  var best = list[0];
  var bestN = 0;
  Object.keys(counts).forEach(function (k) {
    if (counts[k] > bestN) {
      bestN = counts[k];
      best = k;
    }
  });
  return best;
}
```

Run: `npm test`  
Expected: los cuatro tests de este archivo pasan.

- [ ] **Step 3: Commit**

```bash
git add public/js/med-receta-core.mjs public/js/med-receta-core.test.mjs package.json
git commit -m "feat(med-receta): parse TSV hospitalario + fecha + DIA#"
```

---

### Task 3: Núcleo — generación de línea de egreso y texto copiable

**Files:**
- Modify: `public/js/med-receta-core.mjs`
- Modify: `public/js/med-receta-core.test.mjs`

- [ ] **Step 1: Tests dorados de salida (fallan hasta implementar)**

Añadir al final de `med-receta-core.test.mjs`:

```javascript
import { formatMedicationEgresoLine, buildMedRecetaCopyText } from './med-receta-core.mjs';

test('formatMedicationEgresoLine — ENOXAPARINA programada SC', () => {
  var line = formatMedicationEgresoLine({
    nombreRaw: 'ENOXAPARINA 40 MG SOL INY 0.4 ML (+*)',
    viaRaw: 'VIA SUBCUTANEA',
    dosisRaw: '40 MG //',
    frecuenciaRaw: 'CADA 24 HORAS',
    diaTratamiento: null,
  });
  assert.equal(
    line,
    'ENOXAPARINA 40 MG SOLUCIÓN INYECTABLE || APLICAR 40 MG VÍA SUBCUTÁNEA CADA 24 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.'
  );
});

test('formatMedicationEgresoLine — METRONIDAZOL con día 3', () => {
  var line = formatMedicationEgresoLine({
    nombreRaw: 'METRONIDAZOL 500 MG SOL INY 100 ML (*)',
    viaRaw: 'VIA INTRAVENOSA',
    dosisRaw: '500 MG // *DIA# 3*',
    frecuenciaRaw: 'CADA 8 HORAS',
    diaTratamiento: 3,
  });
  assert.equal(
    line,
    'METRONIDAZOL 500 MG SOLUCIÓN INYECTABLE || ADMINISTRAR 500 MG VÍA INTRAVENOSA CADA 8 HORAS (DÍA 3 DE TRATAMIENTO).'
  );
});

test('formatMedicationEgresoLine — ONDANSETRON PRN', () => {
  var line = formatMedicationEgresoLine({
    nombreRaw: 'ONDANSETRON 8 MG SOL INY 4 ML',
    viaRaw: 'VIA INTRAVENOSA',
    dosisRaw: '8 MG // CRITERIO PRN: EN CASO DE NAUSEAS O VÓMITO, CADA 8 HRS',
    frecuenciaRaw: 'PRN',
    diaTratamiento: null,
  });
  assert.equal(
    line,
    'ONDANSETRÓN 8 MG SOLUCIÓN INYECTABLE || ADMINISTRAR 8 MG VÍA INTRAVENOSA CADA 8 HORAS EN CASO DE NÁUSEA O VÓMITO.'
  );
});

test('buildMedRecetaCopyText une con línea en blanco entre activos y omite suspendidos', () => {
  var items = [
    {
      nombreRaw: 'ENOXAPARINA 40 MG SOL INY 0.4 ML (+*)',
      viaRaw: 'VIA SUBCUTANEA',
      dosisRaw: '40 MG //',
      frecuenciaRaw: 'CADA 24 HORAS',
      diaTratamiento: null,
      suspendido: false,
    },
    {
      nombreRaw: 'LOSARTAN 50 MG COMPRIMIDO (*)',
      viaRaw: 'VIA ORAL',
      dosisRaw: '50 MG //',
      frecuenciaRaw: 'CADA 24 HORAS',
      diaTratamiento: null,
      suspendido: true,
    },
    {
      nombreRaw: 'OMEPRAZOL 40 MG SOL INY 10 ML (*)',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '40 MG //',
      frecuenciaRaw: 'CADA 24 HORAS',
      diaTratamiento: null,
      suspendido: false,
    },
  ];
  var t = buildMedRecetaCopyText(items);
  assert.ok(t.indexOf('ENOXAPARINA') !== -1);
  assert.ok(t.indexOf('LOSARTAN') === -1);
  assert.ok(t.indexOf('OMEPRAZOL') !== -1);
  assert.ok(t.indexOf('\n\n') !== -1);
});
```

Run: `npm test`  
Expected: FAIL en los nuevos tests.

- [ ] **Step 2: Implementar `formatMedicationEgresoLine` y `buildMedRecetaCopyText`**

Añadir a `med-receta-core.mjs` (el implementador completa mapas de nombre y lógica PRN para **todos** los ejemplos del spec; mínimo estos tres tests deben pasar):

Reglas obligatorias:
- Normalizar vía: `VIA INTRAVENOSA` → `VÍA INTRAVENOSA`; `VIA ORAL` → `VÍA ORAL`; `VIA SUBCUTANEA` → `VÍA SUBCUTÁNEA`.
- Verbo: oral → `TOMAR`; intravenosa → `ADMINISTRAR`; subcutánea → `APLICAR`.
- Expandir `SOL INY` → `SOLUCIÓN INYECTABLE` en el **nombre** mostrado; `COMPRIMIDO` puede quedar `TABLETA` donde el ejemplo lo exige (p. ej. losartán).
- Quitar marcadores hospitalarios del nombre en salida: `(+*)`, `(*)` cuando corresponda al estilo del ejemplo.
- PRN: si `frecuenciaRaw` es `PRN` o `dosisRaw` contiene `CRITERIO PRN`, no añadir “SIN SUSPENDER HASTA NUEVO AVISO”; construir criterio desde texto (NAUSEAS → NÁUSEA, etc.).
- Programado: añadir `, SIN SUSPENDER HASTA NUEVO AVISO.` al final (como en los ejemplos).
- `diaTratamiento !== null`: clausura `(DÍA N DE TRATAMIENTO).` sin la frase de sin suspender si el spec de ejemplo así lo muestra (metronidazol).

```javascript
export function formatMedicationEgresoLine(item) {
  // implementación completa en código real — los tests dorados del spec deben incluir
  // al menos las 12 líneas del ejemplo del usuario cuando se amplíe la batería.
  throw new Error('implementar');
}

export function buildMedRecetaCopyText(items) {
  var list = (items || []).filter(function (it) {
    return it && !it.suspendido;
  });
  var lines = list.map(function (it) {
    return formatMedicationEgresoLine(it);
  });
  return lines.join('\n\n');
}
```

Sustituir el `throw` por la lógica real hasta que `npm test` pase.

- [ ] **Step 3 (opcional recomendado): Ampliar tests con el bloque completo del spec**

Copiar las 12 líneas de entrada del spec y los 12 renglones esperados en tests adicionales (un test por fila o un snapshot). Run: `npm test` — Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add public/js/med-receta-core.mjs public/js/med-receta-core.test.mjs
git commit -m "feat(med-receta): formato egreso + copy text"
```

---

### Task 4: UI en `index.html`

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Tercer tab y contenedor**

Dentro de `.app-tabs`, **después** del botón Expediente, insertar:

```html
      <button class="app-tab" id="apptab-med" onclick="switchAppTab('med')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.5 4.04 3 5.5l7 7Z"/></svg>
        Medicamentos
      </button>
```

Después del cierre de `#appcontent-lab` (el `</div>` que cierra el bloque scrollable grande), **antes** de `#appcontent-nota`, insertar `#appcontent-med` con estructura análoga a lab:

- Card “Listado del hospital” con `<textarea id="med-input" rows="10">` y label “Pega aquí el texto copiado del sistema”.
- Debajo del textarea, botón principal **Receta** (`onclick="procesarRecetaMed()"` o nombre que definas en app.js) y opcional **Limpiar**.
- Card “Medicamentos (paciente activo)” con:
  - `<p id="med-hint">` para estado sin paciente / sin datos.
  - `<p id="med-fecha-actualizacion">` para “Actualizado: dd/mm/yyyy”.
  - `<div id="med-items-list">` para filas con checkbox Suspender.
- Card “Texto para nota de egreso” con:
  - `<pre id="med-output">` o `div` con estilo monoespaciado.
  - Botón **Copiar** `onclick="copiarMedicamentosAlPortapapeles()"` estilado como el Copiar morado de resultados de lab (`#lab-output-section` header).

- [ ] **Step 2: Commit**

```bash
git add public/index.html
git commit -m "feat(ui): pestaña Medicamentos + Receta + Copiar"
```

---

### Task 5: Lógica en `app.js` — tabs, Receta, copiar, render

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Import del núcleo**

Junto a los demás `import`:

```javascript
import {
  parseMedicationPaste,
  resolveFechaActualizacion,
  buildMedRecetaCopyText,
} from './med-receta-core.mjs';
```

- [ ] **Step 2: Extender `switchAppTab`**

Añadir toggles para `apptab-med` y `#appcontent-med` (display flex/none coherente con lab). Si `tab === 'med'`, llamar `renderMedRecetaPanel()`.

Actualizar líneas que hacen solo lab/nota:

```javascript
document.getElementById('apptab-lab').classList.toggle('active', tab === 'lab');
document.getElementById('apptab-nota').classList.toggle('active', tab === 'nota');
document.getElementById('apptab-med').classList.toggle('active', tab === 'med');
document.getElementById('appcontent-lab').style.display  = tab === 'lab'  ? 'flex' : 'none';
document.getElementById('appcontent-med').style.display  = tab === 'med'  ? 'flex' : 'none';
document.getElementById('appcontent-nota').style.display = tab === 'nota' ? 'flex' : 'none';
if (tab === 'lab') renderLabHistoryPanel();
if (tab === 'med') renderMedRecetaPanel();
```

- [ ] **Step 3: Implementar `renderMedRecetaPanel`**

- Sin `activeId`: mostrar hint “Selecciona un paciente…”, vaciar lista y salida.
- Con paciente sin entrada en `medRecetaByPatient`: hint tipo “Pega el listado y pulsa Receta”.
- Con datos: pintar `med-fecha-actualizacion`, lista de ítems con checkbox `suspendido` que llame `toggleMedRecetaSuspendido(itemId)` (re-render + `saveState`).
- Rellenar `#med-output` con `buildMedRecetaCopyText(items)` para previsualización.

- [ ] **Step 4: Implementar `procesarRecetaMed`**

```javascript
function procesarRecetaMed() {
  if (!activeId) {
    showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var raw = document.getElementById('med-input') && document.getElementById('med-input').value;
  var parsed = parseMedicationPaste(raw || '');
  if (!parsed.items.length) {
    showToast('No se encontraron medicamentos válidos', 'error');
    return;
  }
  var today = new Date();
  var fallback =
    String(today.getDate()).padStart(2, '0') +
    '/' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '/' +
    today.getFullYear();
  var fecha = resolveFechaActualizacion(parsed.fechas, fallback);
  medRecetaByPatient[activeId] = {
    fechaActualizacion: fecha,
    items: parsed.items,
  };
  saveState();
  renderMedRecetaPanel();
  showToast('Receta actualizada (' + parsed.items.length + ' medicamentos)', 'success');
  if (parsed.skipped > 0) {
    showToast('Omitidas ' + parsed.skipped + ' líneas', 'success');
  }
}
```

- [ ] **Step 5: Implementar `copiarMedicamentosAlPortapapeles`**

Patrón análogo a `copiarLabsAlPortapapeles`:

```javascript
function copiarMedicamentosAlPortapapeles() {
  if (!activeId || !medRecetaByPatient[activeId]) {
    showToast('No hay medicamentos procesados', 'error');
    return;
  }
  var items = medRecetaByPatient[activeId].items || [];
  var text = buildMedRecetaCopyText(items);
  if (!text.trim()) {
    showToast('No hay medicamentos activos para copiar', 'error');
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(function () {
      showToast('Medicamentos copiados al portapapeles ✓', 'success');
    })
    .catch(function () {
      showToast('Error al copiar al portapapeles', 'error');
    });
}
```

- [ ] **Step 6: Enlazar `selectPatient` y `deletePatient`**

En `selectPatient`, tras `renderLabHistoryPanel()`, añadir `renderMedRecetaPanel()`.

En `deletePatient`, tras borrar `labHistory[id]`, añadir:

```javascript
if (medRecetaByPatient && medRecetaByPatient[id]) delete medRecetaByPatient[id];
```

- [ ] **Step 7: Exponer funciones globales si hace falta**

Si `index.html` usa `onclick="..."`, añadir al objeto expuesto en `preload`/`window` **o** asignar en `app.js`:

```javascript
window.procesarRecetaMed = procesarRecetaMed;
window.copiarMedicamentosAlPortapapeles = copiarMedicamentosAlPortapapeles;
```

(Usar el mismo patrón que `copiarLabsAlPortapapeles` en este proyecto.)

- [ ] **Step 8: `npm test` y prueba manual en Electron**

Run: `npm test`  
Manual: seleccionar paciente → pestaña Medicamentos → pegar bloque del spec → Receta → Copiar.

- [ ] **Step 9: Commit**

```bash
git add public/js/app.js
git commit -m "feat(app): Medicamentos tab, Receta, copiar, render"
```

---

### Task 6: Respaldo, import y export de paciente

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: `buildFullBackupPayload`**

En `data`, añadir:

```javascript
medRecetaByPatient: storage.getMedRecetaByPatient(),
```

- [ ] **Step 2: Import respaldo completo `onBackupFileChosen`**

Después de `rpc-labHistory`:

```javascript
localStorage.setItem('rpc-medRecetaByPatient', JSON.stringify(payload.data.medRecetaByPatient || {}));
```

- [ ] **Step 3: `buildPatientEntry` y `applyImportEntry`**

Incluir `medReceta: medRecetaByPatient[patientId] || null` en el entry exportable si aplica.

En `applyImportEntry`, al asignar `labHistory`, asignar:

```javascript
medRecetaByPatient[existing.id] = entry.medReceta || null;
```

Si `entry.medReceta` es null, usar `delete medRecetaByPatient[existing.id]` o dejar undefined según consistencia.

Para `newId`, igual con `entry.medReceta`.

Actualizar copias de seguridad en `importEntriesWithConflicts` (`medRecetaByPatientBefore` + restore si cancel).

- [ ] **Step 4: `exportActivePatientBackup` payload**

Añadir:

```javascript
medReceta: medRecetaByPatient[activeId] || null,
```

- [ ] **Step 5: `onPatientBackupFileChosen`**

Al importar, asignar `medRecetaByPatient[targetId] = payload.medReceta` (validar forma: objeto con `fechaActualizacion` e `items`).

- [ ] **Step 6: Commit**

```bash
git add public/js/app.js
git commit -m "feat(backup): incluir medReceta en respaldo e import"
```

---

## Spec coverage (autorrevisión)

| Requisito spec | Task |
|----------------|------|
| Pestaña Medicamentos | Task 4, 5 |
| Textarea + Receta sobrescribe | Task 5 |
| Copiar todo como labs | Task 5 |
| Suspender excluye de copia | Task 3 `buildMedRecetaCopyText`, Task 5 UI |
| DIA# solo explícito | Task 2 |
| Un estado por paciente, sobrescribe | Task 5 |
| Fecha mayoritaria / fallback hoy | Task 2, 5 |
| Sin paciente, mensajes guía | Task 5 |
| Pruebas unitarias | Task 2–3 |

## Placeholder scan

Sin TBD: implementación de `formatMedicationEgresoLine` debe ser código real completo, no stub, antes de cerrar Task 3.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-02-medicamentos-receta.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach do you want?
