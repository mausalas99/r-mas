# Indicaciones parser (meds + dietas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renombrar la pestaña **Medicamentos** a **Indicaciones**, parsear pegados SOME con `MEDICAMENTOS`, `MEDICAMENTOS P2` y `DIETAS` (omitir `CUIDADOS`/`ESTUDIOS`), autoselección SOAP, propuesta pendiente de dieta+kcal+proteinG en Estado Actual, y campo **Proteína (g/día)** persistido.

**Architecture:** Extender `med-receta-core.mjs` con `parseIndicacionesPaste` y helpers de dieta/SOAP; `medications.mjs` orquesta Receta + UI; `estado-actual-data.mjs` gana `proteinG`; `estado-actual-meds.mjs` + `estado-actual-panel.mjs` confirman el paquete nutricional; tests con `node --test`.

**Tech stack:** Electron renderer ESM (`.mjs`), vanilla JS, `npm test`, `npm run build:ui` para HTML parciales.

**Spec:** `docs/superpowers/specs/2026-06-10-indicaciones-parser-design.md`

---

## File map

| File | Rol |
|------|-----|
| `public/js/med-receta-core.mjs` | `parseIndicacionesPaste`, nutrientes dieta, `shouldAutoSelectSoap`, `mergeDietaItems`, `buildDietProposalText`; `parseMedicationPaste` delega |
| `public/js/med-receta-core.test.mjs` | Tests parser, dieta, autoselección SOAP |
| `public/js/features/estado-actual-data.mjs` | `proteinG` en `emptyEstadoClinico`, revisión cache, backfill |
| `public/js/features/estado-actual-data.test.mjs` | Backfill `proteinG` |
| `public/js/features/estado-actual-meds.mjs` | `DIET_PENDING_KEYS`, `confirmDietProposal`, ampliar `confirmAllMedProposals` |
| `public/js/features/estado-actual-meds.test.mjs` | Confirmación paquete dieta |
| `public/js/features/estado-actual-text.mjs` | Cláusula `+ N GR PROTEINA` |
| `public/js/features/estado-actual-text.test.mjs` | Texto con proteína |
| `public/js/features/estado-actual-panel.mjs` | Input proteinG, badges propuesta, `hasPendingEaProposals`, confirmar todo |
| `public/js/features/medications.mjs` | `procesarRecetaMed`, UI dieta, autoselección SOAP |
| `public/partials/layout/app-body.html` | Copy pestaña Indicaciones, placeholder textarea |
| `public/js/features/chrome.mjs` | i18n `appTab.med` → Indicaciones |
| `public/js/features/pase-board.mjs` | Título sección pase |

---

### Task 1: Nutrientes y filas DIETAS en el núcleo

**Files:**
- Modify: `public/js/med-receta-core.mjs`
- Modify: `public/js/med-receta-core.test.mjs`

- [ ] **Step 1: Test fallido — extracción kcal y proteinG**

Añadir al final de `med-receta-core.test.mjs`:

```javascript
import {
  extractDietNutrients,
  mergeDietaItems,
  buildDietProposalText,
} from './med-receta-core.mjs';

test('extractDietNutrients lee 2000 KCAL + 70 GR PROTEINA', () => {
  var n = extractDietNutrients('2000 KCAL + 70 GR PROTEINA');
  assert.equal(n.kcal, 2000);
  assert.equal(n.proteinG, 70);
});

test('extractDietNutrients acepta 70 G DE PROTEINA', () => {
  var n = extractDietNutrients('1500 KCAL + 70 G DE PROTEINA');
  assert.equal(n.kcal, 1500);
  assert.equal(n.proteinG, 70);
});

test('mergeDietaItems concatena descripciones y toma kcal/prot de última fila con patrón', () => {
  var merged = mergeDietaItems([
    { descripcionRaw: 'BLANDA', detalleRaw: '1200 KCAL', kcal: 1200, proteinG: null },
    { descripcionRaw: 'NORMAL PICADA', detalleRaw: '2000 KCAL + 70 GR PROTEINA', kcal: 2000, proteinG: 70 },
  ]);
  assert.equal(merged.descripcion, 'BLANDA · NORMAL PICADA');
  assert.equal(merged.kcal, 2000);
  assert.equal(merged.proteinG, 70);
});

test('buildDietProposalText resume dieta con macros', () => {
  var t = buildDietProposalText({
    descripcion: 'NORMAL PICADA ALTA EN FIBRA',
    kcal: 2000,
    proteinG: 70,
  });
  assert.match(t, /NORMAL PICADA/i);
  assert.match(t, /2000/i);
  assert.match(t, /70/i);
});
```

- [ ] **Step 2: Ejecutar test y verificar FAIL**

Run: `node --test public/js/med-receta-core.test.mjs -m "extractDietNutrients"`
Expected: FAIL — `extractDietNutrients is not exported`

- [ ] **Step 3: Implementar helpers en `med-receta-core.mjs`**

Añadir antes de `parseMedicationPaste`:

```javascript
function normalizeNutrientText(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function extractDietNutrients(detalleRaw) {
  var t = normalizeNutrientText(trimStr(detalleRaw));
  var kcalM = t.match(/(\d+)\s*KCAL\b/);
  var protM = t.match(/(\d+)\s*G(?:R)?\s*(?:DE\s+)?PROTEINA\b/);
  return {
    kcal: kcalM ? parseInt(kcalM[1], 10) : null,
    proteinG: protM ? parseInt(protM[1], 10) : null,
  };
}

export function mergeDietaItems(dietas) {
  var list = Array.isArray(dietas) ? dietas : [];
  var parts = [];
  var kcal = null;
  var proteinG = null;
  for (var i = 0; i < list.length; i += 1) {
    var d = list[i];
    if (!d) continue;
    var desc = trimStr(d.descripcionRaw);
    if (desc) parts.push(desc);
    if (d.kcal != null) kcal = d.kcal;
    if (d.proteinG != null) proteinG = d.proteinG;
  }
  return { descripcion: parts.join(' · '), kcal: kcal, proteinG: proteinG };
}

export function buildDietProposalText(merged) {
  var base = trimStr(merged && merged.descripcion);
  var bits = [];
  if (merged && merged.kcal != null) bits.push(String(merged.kcal) + ' kcal');
  if (merged && merged.proteinG != null) bits.push(String(merged.proteinG) + ' g prot');
  if (!bits.length) return base;
  if (!base) return bits.join(', ');
  return base + ' (' + bits.join(', ') + ')';
}
```

- [ ] **Step 4: Ejecutar tests del task**

Run: `node --test public/js/med-receta-core.test.mjs -m "extractDietNutrients|mergeDietaItems|buildDietProposalText"`
Expected: PASS

---

### Task 2: `parseIndicacionesPaste` y retrocompatibilidad

**Files:**
- Modify: `public/js/med-receta-core.mjs`
- Modify: `public/js/med-receta-core.test.mjs`

- [ ] **Step 1: Test fallido — pegado mixto del usuario**

Añadir fixture mínimo (1 cuidado, 1 dieta, 1 estudio, 2 meds, 1 med P2):

```javascript
import {
  parseIndicacionesPaste,
  looksLikeSomeIndicacionesPaste,
  shouldAutoSelectSoap,
} from './med-receta-core.mjs';

var SAMPLE_MIXED =
  '10/06/2026 06:25:37 a.m.\tCUIDADOS\tCUANTIFICAR BALANCE\t\tPOR TURNO\t\tNW\n' +
  '10/06/2026 06:27:36 a.m.\tDIETAS\tNORMAL PICADA ALTA EN FIBRA\t\t2000 KCAL + 70 GR PROTEINA\t\tNW\n' +
  '10/06/2026 06:27:48 a.m.\tESTUDIOS\tBIOMETRÍA HEMÁTICA\t\tEN AM\tUNICA VEZ\tNW\n' +
  '10/06/2026 06:26:12 a.m.\tMEDICAMENTOS\tACICLOVIR 200 MG TABLETA (*)\tVIA ORAL\t400 MG //\tCADA 12 HORAS\tNW\n' +
  '10/06/2026 06:26:39 a.m.\tMEDICAMENTOS P2\tDEXTROSA 50 % SOL INY 50 ML\tVIA INTRAVENOSA\t50 ML / VEL.INF: GLUCOSA <70\tPRN\tNW';

test('parseIndicacionesPaste separa meds, dieta y skipped', () => {
  var r = parseIndicacionesPaste(SAMPLE_MIXED);
  assert.equal(r.items.length, 2);
  assert.equal(r.dietas.length, 1);
  assert.equal(r.dietas[0].proteinG, 70);
  assert.equal(r.skippedSummary.cuidados, 1);
  assert.equal(r.skippedSummary.estudios, 1);
});

test('looksLikeSomeIndicacionesPaste true con solo DIETAS', () => {
  var line = '10/06/2026 06:27:36 a.m.\tDIETAS\tNORMAL\t\t2000 KCAL\t\tNW';
  assert.equal(looksLikeSomeIndicacionesPaste(line), true);
});

test('shouldAutoSelectSoap pre-marca MEROPENEM y DEXTROSA PRN', () => {
  assert.equal(
    shouldAutoSelectSoap({
      nombreRaw: 'MEROPENEM 1 G SOL INY',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '1 G //',
      frecuenciaRaw: 'CADA 8 HORAS',
    }),
    true
  );
  assert.equal(
    shouldAutoSelectSoap({
      nombreRaw: 'DEXTROSA 50 % SOL INY 50 ML',
      dosisRaw: '50 ML / VEL.INF: EN CASO DE GLUCOSA <70 MG/DL',
      frecuenciaRaw: 'PRN',
    }),
    true
  );
  assert.equal(
    shouldAutoSelectSoap({
      nombreRaw: 'SULFATO DE MAGNESIO 1 G SOL INY 10 ML',
      dosisRaw: '4 G DILUIR',
      frecuenciaRaw: 'UNICA VEZ',
    }),
    false
  );
});

test('parseMedicationPaste sigue devolviendo solo meds', () => {
  var r = parseMedicationPaste(SAMPLE_MIXED);
  assert.equal(r.items.length, 2);
  assert.equal(r.dietas, undefined);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `node --test public/js/med-receta-core.test.mjs -m "parseIndicacionesPaste"`
Expected: FAIL

- [ ] **Step 3: Implementar parser**

Reemplazar cuerpo de `parseMedicationPaste` para delegar:

```javascript
const INDICACIONES_MED_CLASSES = new Set(['MEDICAMENTOS', 'MEDICAMENTOS P2']);

function parseMedRow(cols, lineIndex, lineText) {
  var dosisRaw = trimStr(cols[4]);
  var dia = extractDiaTratamiento(dosisRaw);
  if (dia == null) dia = extractDiaTratamiento(lineText);
  return {
    id: 'med-' + Date.now().toString(36) + '-' + lineIndex + '-' + Math.random().toString(36).slice(2, 5),
    tipoRaw: trimStr(cols[1]).toUpperCase(),
    nombreRaw: trimStr(cols[2]),
    viaRaw: trimStr(cols[3]),
    dosisRaw: dosisRaw,
    frecuenciaRaw: trimStr(cols[5]),
    suspendido: false,
    diaTratamiento: dia,
  };
}

function parseDietaRow(cols, lineIndex) {
  var detalleRaw = trimStr(cols[4]);
  var nutrients = extractDietNutrients(detalleRaw);
  return {
    id: 'dieta-' + Date.now().toString(36) + '-' + lineIndex,
    descripcionRaw: trimStr(cols[2]),
    detalleRaw: detalleRaw,
    kcal: nutrients.kcal,
    proteinG: nutrients.proteinG,
    suspendido: false,
  };
}

export function parseIndicacionesPaste(text) {
  var lines = String(text || '')
    .split(/\r?\n/)
    .map(trimStr)
    .filter(Boolean);
  var items = [];
  var dietas = [];
  var fechas = [];
  var skipped = 0;
  var skippedSummary = { cuidados: 0, estudios: 0, other: 0 };
  for (var i = 0; i < lines.length; i += 1) {
    var cols = lines[i].split('\t');
    if (cols.length < 7) {
      skipped += 1;
      skippedSummary.other += 1;
      continue;
    }
    var tipo = trimStr(cols[1]).toUpperCase();
    var fd = parseFechaDMYFromTimestampCell(cols[0]);
    if (fd) fechas.push(fd);
    if (INDICACIONES_MED_CLASSES.has(tipo)) {
      items.push(parseMedRow(cols, i, lines[i]));
      continue;
    }
    if (tipo === 'DIETAS') {
      dietas.push(parseDietaRow(cols, i));
      continue;
    }
    skipped += 1;
    if (tipo === 'CUIDADOS') skippedSummary.cuidados += 1;
    else if (tipo === 'ESTUDIOS') skippedSummary.estudios += 1;
    else skippedSummary.other += 1;
  }
  return { items: items, dietas: dietas, fechas: fechas, skipped: skipped, skippedSummary: skippedSummary };
}

export function parseMedicationPaste(text) {
  var r = parseIndicacionesPaste(text);
  return { items: r.items, fechas: r.fechas, skipped: r.skipped };
}

export function looksLikeSomeIndicacionesPaste(text) {
  var raw = String(text || '');
  if (!raw.trim() || !/\t/.test(raw)) return false;
  var lines = raw.split(/\r?\n/).map(trimStr).filter(Boolean);
  for (var i = 0; i < lines.length; i += 1) {
    var cols = lines[i].split('\t');
    if (cols.length < 7) continue;
    var tipo = trimStr(cols[1]).toUpperCase();
    if (tipo === 'MEDICAMENTOS' || tipo === 'MEDICAMENTOS P2' || tipo === 'DIETAS') return true;
  }
  return false;
}

export function looksLikeSomeMedicationPaste(text) {
  return looksLikeSomeIndicacionesPaste(text);
}

export function shouldAutoSelectSoap(item) {
  if (!item || item.suspendido) return false;
  var nombre = trimStr(item.nombreRaw);
  if (classifyMedicationSoapCategory(nombre) !== 'otros') return true;
  var blob = normalizeNombreForSoapClassify(
    [nombre, item.dosisRaw, item.frecuenciaRaw].join(' ')
  );
  if (/\bINSULINA\b/.test(blob)) return true;
  if (/\b(GLARGINA|DEGLUDEC|DETEMIR|HUMANA\s+RAPIDA|NPH)\b/.test(blob)) return true;
  if (/\bDEXTROSA\s*50\b/.test(blob)) return true;
  if (/\bPRN\b/.test(String(item.frecuenciaRaw || '').toUpperCase())) {
    if (/\b(DESTROXTIS|GLUCOSA|GLUC\s*<|MG\/DL)\b/.test(blob)) return true;
  }
  return false;
}
```

- [ ] **Step 4: Run parser tests**

Run: `node --test public/js/med-receta-core.test.mjs`
Expected: all PASS

---

### Task 3: Campo `proteinG` en Estado Actual (datos)

**Files:**
- Modify: `public/js/features/estado-actual-data.mjs`
- Modify: `public/js/features/estado-actual-data.test.mjs`

- [ ] **Step 1: Test — emptyEstadoClinico incluye proteinG**

```javascript
test('emptyEstadoClinico incluye proteinG', () => {
  var ec = emptyEstadoClinico();
  assert.equal(ec.proteinG, '');
});
```

- [ ] **Step 2: Implementar**

En `emptyEstadoClinico()` añadir `proteinG: ''` junto a `kcal`.

En `buildEaMonitoreoRevision`, añadir `String(ec.proteinG || '')` en el `parts.push` de dieta/kcal.

En `ensureMonitoreo`, después de crear monitoreo vacío, backfill:

```javascript
function backfillEstadoClinico(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  var ec = monitoreo.estadoClinico;
  var template = emptyEstadoClinico();
  if (!ec || typeof ec !== 'object') {
    monitoreo.estadoClinico = Object.assign({}, template);
    return;
  }
  Object.keys(template).forEach(function (k) {
    if (ec[k] == null) ec[k] = template[k];
  });
  var pend = monitoreo.pendienteReceta;
  if (!pend || typeof pend !== 'object') monitoreo.pendienteReceta = emptyPendienteReceta();
  else {
    Object.keys(template).forEach(function (k) {
      if (pend[k] == null) pend[k] = '';
    });
  }
}
```

Llamar `backfillEstadoClinico(p.monitoreo)` al final de `ensureMonitoreo`.

- [ ] **Step 3: Run**

Run: `node --test public/js/features/estado-actual-data.test.mjs`
Expected: PASS

---

### Task 4: Confirmación paquete dieta en `estado-actual-meds.mjs`

**Files:**
- Modify: `public/js/features/estado-actual-meds.mjs`
- Modify: `public/js/features/estado-actual-meds.test.mjs`

- [ ] **Step 1: Test fallido**

```javascript
import { confirmDietProposal, hasPendingEaProposals } from './estado-actual-meds.mjs';
import { emptyMonitoreo } from './estado-actual-data.mjs';

test('confirmDietProposal copia dieta, kcal y proteinG', () => {
  var m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'NORMAL PICADA (2000 kcal, 70 g prot)';
  m.pendienteReceta.kcal = '2000';
  m.pendienteReceta.proteinG = '70';
  confirmDietProposal(m);
  assert.equal(m.estadoClinico.dieta, 'NORMAL PICADA (2000 kcal, 70 g prot)');
  assert.equal(m.estadoClinico.kcal, '2000');
  assert.equal(m.estadoClinico.proteinG, '70');
  assert.equal(m.pendienteReceta.dieta, '');
});

test('hasPendingEaProposals detecta dieta pendiente', () => {
  var m = emptyMonitoreo();
  m.pendienteReceta.proteinG = '70';
  assert.equal(hasPendingEaProposals(m.pendienteReceta), true);
});
```

- [ ] **Step 2: Implementar**

```javascript
export const DIET_PENDING_KEYS = /** @type {const} */ (['dieta', 'kcal', 'proteinG']);

export function hasPendingEaProposals(pendienteReceta) {
  var pend = pendienteReceta && typeof pendienteReceta === 'object' ? pendienteReceta : {};
  if (DIET_PENDING_KEYS.some(function (k) { return pend[k] && String(pend[k]).trim(); })) return true;
  return MED_FIELD_KEYS.some(function (k) { return pend[k] && String(pend[k]).trim(); });
}

export function confirmDietProposal(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== 'object') {
    monitoreo.estadoClinico = {};
  }
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return;
  DIET_PENDING_KEYS.forEach(function (k) {
    var pending = monitoreo.pendienteReceta[k];
    if (pending != null && String(pending).trim()) {
      monitoreo.estadoClinico[k] = String(pending).trim();
      monitoreo.pendienteReceta[k] = '';
    }
  });
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') monitoreo.confirmado = {};
  monitoreo.confirmado.dieta = true;
}

export function discardDietProposal(monitoreo) {
  if (!monitoreo || !monitoreo.pendienteReceta) return;
  DIET_PENDING_KEYS.forEach(function (k) { monitoreo.pendienteReceta[k] = ''; });
}
```

Renombrar `confirmAllMedProposals` internamente para llamar también `confirmDietProposal` si hay pendiente dieta, **o** al inicio de `confirmAllMedProposals`:

```javascript
if (DIET_PENDING_KEYS.some(function (k) { return monitoreo.pendienteReceta && monitoreo.pendienteReceta[k]; })) {
  confirmDietProposal(monitoreo);
}
```

- [ ] **Step 3: Run tests**

Run: `node --test public/js/features/estado-actual-meds.test.mjs`
Expected: PASS

---

### Task 5: Texto EA con proteína

**Files:**
- Modify: `public/js/features/estado-actual-text.mjs`
- Modify: `public/js/features/estado-actual-text.test.mjs`

- [ ] **Step 1: Test**

```javascript
test('buildEstadoActualText incluye GR PROTEINA cuando proteinG está definido', () => {
  var m = emptyMonitoreo();
  m.estadoClinico.dieta = 'NORMAL PICADA';
  m.estadoClinico.kcal = '2000';
  m.estadoClinico.proteinG = '70';
  var text = buildEstadoActualText(m, { patientPeso: 60 });
  assert.match(text, /\+ 70 GR PROTEINA/);
});
```

- [ ] **Step 2: Modificar cláusula `nmDiet`**

Tras construir `kcalDisplay`, añadir:

```javascript
var proteinClause =
  ec.proteinG != null && String(ec.proteinG).trim() !== ''
    ? ' + ' + num(ec.proteinG) + ' GR PROTEINA'
    : '';
var nmDiet =
  'DIETA ' +
  val(ec.dieta) +
  ' CALCULADA A ' +
  num(ec.kcalKg) +
  ' KCAL/KG (' +
  num(kcalDisplay) +
  ' KCAL)' +
  proteinClause +
  ' PARA PESO DE ' +
  num(weightKg != null ? weightKg : '') +
  ' KG';
```

- [ ] **Step 3: Run**

Run: `node --test public/js/features/estado-actual-text.test.mjs`
Expected: PASS

---

### Task 6: Panel EA — input proteína y propuestas

**Files:**
- Modify: `public/js/features/estado-actual-panel.mjs`

- [ ] **Step 1: Importar helpers**

```javascript
import {
  confirmDietProposal,
  discardDietProposal,
  hasPendingEaProposals,
  DIET_PENDING_KEYS,
} from './estado-actual-meds.mjs';
```

- [ ] **Step 2: Reemplazar `hasPendingMedProposals` local**

Usar `hasPendingEaProposals(pend)` en `renderEstadoClinicoSection` y para abrir `<details>`.

- [ ] **Step 3: Añadir input Proteína (g/día)**

Después del campo Kcal total:

```html
<label class="ea-field">
  <span class="ea-label">Proteína (g/día)</span>
  <input type="number" class="ea-input" data-ea-ec="proteinG" step="any" min="0" value="..." />
</label>
```

Si `pend.proteinG` o `pend.dieta` tienen valor, mostrar badge «Propuesta» en fila dieta (o junto a campos afectados).

- [ ] **Step 4: Handlers confirmar/descartar dieta**

Exportar en `windowHandlers`:

```javascript
export function confirmEaDietProposal() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  confirmDietProposal(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Dieta confirmada', patient);
}

export function discardEaDietProposal() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  discardDietProposal(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Propuesta de dieta descartada', patient);
}
```

Actualizar `confirmAllEaMedProposals` para usar `confirmAllMedProposals` + `confirmDietProposal` si aplica.

Añadir botones en sección dieta cuando hay propuesta:

```html
<button type="button" class="ea-btn ea-btn--primary" onclick="confirmEaDietProposal()">Confirmar dieta</button>
<button type="button" class="ea-btn" onclick="discardEaDietProposal()">Descartar</button>
```

- [ ] **Step 5: Verificar manualmente** (opcional en dev): pegado → Receta → EA muestra propuesta.

---

### Task 7: `procesarRecetaMed` y UI dieta

**Files:**
- Modify: `public/js/features/medications.mjs`

- [ ] **Step 1: Actualizar imports**

```javascript
import {
  parseIndicacionesPaste,
  looksLikeSomeIndicacionesPaste,
  shouldAutoSelectSoap,
  mergeDietaItems,
  buildDietProposalText,
  // ...existentes
} from '../med-receta-core.mjs';
import { isModeSala } from '../mode-features.mjs';
```

- [ ] **Step 2: Reemplazar `procesarRecetaMed`**

```javascript
export function procesarRecetaMed() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var ta = document.getElementById('med-input');
  var raw = ta ? ta.value : '';
  var parsed = parseIndicacionesPaste(raw || '');
  if (!parsed.items.length && !parsed.dietas.length) {
    if (!looksLikeSomeIndicacionesPaste(raw || '')) {
      rt.showToast(
        'No parece el bloque de SOME. Copia desde Fecha/hora con tabuladores (medicamentos, dietas…) y pégalo aquí.',
        'error'
      );
    } else {
      rt.showToast('No se encontraron filas MEDICAMENTOS ni DIETAS válidas', 'error');
    }
    return;
  }
  // fecha + persist block con dietas
  medRecetaByPatient[activeId] = {
    fechaActualizacion: fecha,
    items: parsed.items,
    dietas: parsed.dietas,
    pasteRaw: raw,
  };
  var sel = {};
  parsed.items.forEach(function (it) {
    if (shouldAutoSelectSoap(it)) sel[it.id] = true;
  });
  medNotaSelectionByPatient[activeId] = sel;

  if (isModeSala(rt.getSettings()) && parsed.dietas.length) {
    var patient = patients.find(function (p) { return p.id === activeId; });
    if (patient) {
      ensureMonitoreo(patient);
      var merged = mergeDietaItems(parsed.dietas);
      var m = patient.monitoreo;
      if (!m.pendienteReceta) m.pendienteReceta = {};
      m.pendienteReceta.dieta = buildDietProposalText(merged);
      if (merged.kcal != null) m.pendienteReceta.kcal = String(merged.kcal);
      if (merged.proteinG != null) m.pendienteReceta.proteinG = String(merged.proteinG);
    }
  }

  saveState();
  onRecetaMergedToProfile(activeId, medRecetaByPatient[activeId]);
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache('estadoActual');
  renderMedRecetaPanel();
  // toast con conteos + skippedSummary
}
```

- [ ] **Step 3: Tarjeta dieta en `renderMedRecetaPanel`**

Antes de la lista de meds, si `block.dietas && block.dietas.length`:

```javascript
var merged = mergeDietaItems(block.dietas);
var dietHtml =
  '<div class="med-receta-diet-card">' +
  '<div class="med-receta-diet-title">Dieta detectada</div>' +
  '<div>' + esc(merged.descripcion) + '</div>' +
  (merged.kcal != null ? '<div>' + esc(String(merged.kcal)) + ' kcal</div>' : '') +
  (merged.proteinG != null ? '<div>' + esc(String(merged.proteinG)) + ' g proteína</div>' : '') +
  '</div>';
```

Insertar `dietHtml` antes de `med-receta-wrap`.

- [ ] **Step 4: Actualizar `medPanelCacheKey`** para incluir `dietas.length`.

---

### Task 8: Renombrar pestaña a Indicaciones (copy visible)

**Files:**
- Modify: `public/partials/layout/app-body.html`
- Modify: `public/js/features/chrome.mjs`
- Modify: `public/js/features/pase-board.mjs`

- [ ] **Step 1: `app-body.html`**

- `data-i18n="appTab.med"` label: **Indicaciones**
- Empty state: «Selecciona un paciente para Indicaciones»
- Card title: «Indicaciones (paciente activo)»
- Textarea placeholder: «Pega el bloque del hospital (medicamentos, dietas…; tabuladores)…»

- [ ] **Step 2: `chrome.mjs`**

```javascript
'appTab.med': 'Indicaciones',
// tabLabel('med') return 'Indicaciones'
```

- [ ] **Step 3: `pase-board.mjs`**

Sección pase: `aria-label="Indicaciones"` y título botón **Indicaciones**.

- [ ] **Step 4: Build UI**

Run: `npm run build:ui`
Expected: `public/index.html` refleja cambios de `app-body.html`.

---

### Task 9: Verificación final

- [ ] **Step 1: Tests completos**

Run: `npm test`
Expected: all PASS

- [ ] **Step 2: Build**

Run: `npm run build:ui`
Expected: exit 0

- [ ] **Step 3: Métricas (archivos tocados)**

Run: `npm run metrics` (si disponible)
Expected: `totalScore <= baseline.totalScore`

- [ ] **Step 4: Commit** (cuando el usuario lo pida)

```bash
git add public/js/med-receta-core.mjs public/js/med-receta-core.test.mjs \
  public/js/features/medications.mjs public/js/features/estado-actual-*.mjs \
  public/partials/layout/app-body.html public/js/features/chrome.mjs \
  public/js/features/pase-board.mjs public/index.html docs/superpowers/
git commit -m "feat(indicaciones): parser SOME dietas + proteinG EA + tab rename"
```

Actualizar `.cursor/rules/project-context.mdc` changelog en el mismo commit.

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Parse MEDICAMENTOS / P2 / DIETAS | Task 2 |
| Skip CUIDADOS / ESTUDIOS | Task 2 |
| proteinG en EA | Task 3, 5, 6 |
| Propuesta pendiente dieta+kcal+proteinG | Task 4, 6, 7 |
| SOAP autoselección C | Task 2, 7 |
| Renombrar pestaña Indicaciones | Task 8 |
| UI tarjeta dieta + resumen omitidos | Task 7 |
| Tests pegado ejemplo | Task 2 |
| Texto EA + GR PROTEINA | Task 5 |
| Copiar solo meds | Sin cambio (ya en core) |

No gaps found.
