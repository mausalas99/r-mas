# Tendencias — gráfica por estudio + tabla copiable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir en Expediente → Tendencias un botón por estudio que abre un modal (gráficas multi-serie por familia de unidad + tabla copiable PNG/TSV), centralizando tiempo/dedupe en módulos `tend-*` sin inflar `app.js`.

**Architecture:** Extraer lógica pura a `tend-core.mjs` y preferencias a `tend-prefs.mjs`; UI del modal en `tend-group-modal.mjs`; export en `tend-export.mjs`. `app.js` importa, pasa contexto (`activeId`, `ensureParsedLabHistory`, `esc`) y re-exporta a `window`. Referencias: `tendRefFromLabSet` / `tendRefForSeries` (SOME + respaldo orientativo).

**Tech Stack:** Vanilla JS ES modules, Chart.js 4.x, `localStorage`, `node --test`, patrón PNG de `copiarDiagrama` en `app.js`.

**Spec:** `docs/superpowers/specs/2026-05-18-tendencias-grafica-estudio-tabla-design.md`

---

## File map

| Archivo | Acción |
|---------|--------|
| `public/js/tend-core.mjs` | Crear — dedupe, eje X con offset, familias, builders tabla/gráfica |
| `public/js/tend-core.test.mjs` | Crear — tests unitarios |
| `public/js/tend-prefs.mjs` | Crear — colores globales, toggles por paciente+estudio, ocultos tabla |
| `public/js/tend-prefs.test.mjs` | Crear — tests prefs |
| `public/js/tend-export.mjs` | Crear — PNG + TSV desde DOM tabla |
| `public/js/tend-group-modal.mjs` | Crear — modal, pestañas, Chart.js panels |
| `public/js/app.js` | Modificar — imports, delegar dedupe/labels, botón sección, exports |
| `public/index.html` | Modificar — shell modal `#tend-group-backdrop`, estilos `.tend-group-*` |
| `package.json` | Modificar — añadir tests al script `npm test` |

**Fase 2 (opcional, mismo epic si el diff es manejable):** `public/js/tend-spark.mjs` — mover `renderTendencias` + modal detalle desde `app.js`.

---

## Task 1: `tend-core.mjs` — tests primero

**Files:**
- Create: `public/js/tend-core.test.mjs`
- Create: `public/js/tend-core.mjs` (stubs mínimos al inicio)

- [ ] **Step 1: Registrar test en package.json**

En `package.json`, dentro del script `test`, añadir al final de la lista de archivos `.mjs`:

```
public/js/tend-core.test.mjs public/js/tend-prefs.test.mjs
```

- [ ] **Step 2: Escribir tests de dedupe (mismo día, horas distintas)**

Crear `public/js/tend-core.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeTrendSetsForSeries,
  buildTrendAxisMeta,
  classifyTendPanelFamily,
  buildSectionTableModel
} from './tend-core.mjs';

function mockSet(fecha, hora, sectionKey, fieldKey, val) {
  return {
    fecha,
    hora,
    parsedBySection: {
      [sectionKey]: { [fieldKey]: { val: String(val), ab: false } }
    }
  };
}

test('dedupe: mismo día distinta hora → dos sets', () => {
  const sets = [
    mockSet('18/05/2026', '03:24', 'BH', 'Hb', 12),
    mockSet('18/05/2026', '14:00', 'BH', 'Hb', 11.5)
  ];
  const out = dedupeTrendSetsForSeries(sets, 'BH', 'Hb');
  assert.equal(out.length, 2);
});

test('dedupe: misma fecha hora y valor → uno', () => {
  const sets = [
    mockSet('18/05/2026', '03:24', 'BH', 'Hb', 12),
    mockSet('18/05/2026', '03:24', 'BH', 'Hb', 12)
  ];
  const out = dedupeTrendSetsForSeries(sets, 'BH', 'Hb');
  assert.equal(out.length, 1);
});

test('buildTrendAxisMeta: mismo día → x distintos', () => {
  const sets = [
    mockSet('18/05/2026', '03:24', 'BH', 'Hb', 12),
    mockSet('18/05/2026', '14:00', 'BH', 'Hb', 11.5)
  ];
  const meta = buildTrendAxisMeta(sets);
  assert.equal(meta.points.length, 2);
  assert.notEqual(meta.points[0].x, meta.points[1].x);
  assert.match(meta.points[0].dayLabel, /18\/05/);
});

test('classifyTendPanelFamily: gases y porcentajes', () => {
  assert.equal(classifyTendPanelFamily('GASES', 'pH', '%'), 'gases');
  assert.equal(classifyTendPanelFamily('BH', 'NeuPct', '%'), 'percent');
  assert.equal(classifyTendPanelFamily('BH', 'Hb', 'g/dL'), 'absolute');
});
```

- [ ] **Step 3: Ejecutar tests (deben fallar)**

```bash
cd /Users/mauriciosalas/R+
node --test public/js/tend-core.test.mjs
```

Expected: FAIL — cannot find module or export missing.

---

## Task 2: Implementar `tend-core.mjs`

**Files:**
- Create: `public/js/tend-core.mjs`
- Modify: `public/js/app.js` (solo al final de Task 5 — reemplazo de llamadas)

- [ ] **Step 1: Copiar utilidades de tiempo desde `app.js`**

Mover (exportar) desde `app.js` líneas ~1093–1178 y helpers usados:

- `TEND_MESES_MAP`, `normalizeFechaLabHistory`, `normalizeHoraLabHistory`, `applyHoraToMs`, `parseFechaLabToMs`, `sortLabHistoryChronological`

Importar en `tend-core.mjs` sin dependencia de DOM.

- [ ] **Step 2: `getSetTrendValueForSeries` + dedupe**

```javascript
export function getSetTrendValueForSeries(set, sectionKey, fieldKey) {
  if (!set || !set.parsedBySection) return null;
  var pb = set.parsedBySection;
  if (!pb[sectionKey]) return null;
  var raw = pb[sectionKey][fieldKey];
  if (raw == null || raw === '') return null;
  var v = Number(typeof raw === 'object' ? raw.val : raw);
  return isFinite(v) ? v : null;
}

export function dedupeTrendSetsForSeries(setsDesc, sectionKey, fieldKey) {
  var seen = Object.create(null);
  var out = [];
  for (var i = 0; i < (setsDesc || []).length; i++) {
    var s = setsDesc[i];
    var v = getSetTrendValueForSeries(s, sectionKey, fieldKey);
    if (v == null || !isFinite(v)) continue;
    var ms = parseFechaLabToMs(s.fecha, s.hora);
    var key =
      typeof ms === 'number' && isFinite(ms)
        ? 't:' + ms + '|v:' + v + '|' + sectionKey + '|' + fieldKey
        : 'f:' + String(s.fecha) + '|h:' + normalizeHoraLabHistory(s.hora) + '|v:' + v + '|' + sectionKey + '|' + fieldKey;
    if (seen[key]) continue;
    seen[key] = true;
    out.push(s);
  }
  return out;
}
```

- [ ] **Step 3: `buildTrendAxisMeta` (eje X con offset)**

```javascript
/** setsAsc: cronológico ascendente (más antiguo primero). */
export function buildTrendAxisMeta(setsAsc) {
  var dayCounts = Object.create(null);
  var points = (setsAsc || []).map(function (s, idx) {
    if (s.fecha === 'Anterior') {
      return { set: s, x: idx, dayLabel: 'Ant.', tooltipTime: '' };
    }
    var ms = parseFechaLabToMs(s.fecha, s.hora);
    var d = new Date(ms);
    var dayKey = isFinite(d.getTime())
      ? d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
      : 'raw:' + String(s.fecha);
    dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    var n = dayCounts[dayKey];
    var dd = isFinite(d.getTime())
      ? String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')
      : String(s.fecha).slice(0, 12);
    var hora = normalizeHoraLabHistory(s.hora);
    var jitter = n > 1 ? (n - 1) * 0.12 : 0; // offset mismo día
    return {
      set: s,
      x: idx + jitter,
      dayLabel: dd,
      tooltipTime: hora ? hora.slice(0, 5) : ''
    };
  });
  return {
    points: points,
    labels: points.map(function (p) {
      return p.tooltipTime ? p.dayLabel + ' ' + p.tooltipTime : p.dayLabel;
    })
  };
}

/** Compat sparks: delegar a meta.labels */
export function buildTendChartLabels(setsAsc) {
  return buildTrendAxisMeta(setsAsc).labels;
}
```

- [ ] **Step 4: Familias y modelo de tabla**

```javascript
export function classifyTendPanelFamily(sectionKey, fieldKey, unit) {
  if (sectionKey === 'GASES') return 'gases';
  var u = String(unit || '').trim();
  if (u === '%' || /pct$/i.test(fieldKey)) return 'percent';
  return 'absolute';
}

/** Columnas compartidas por estudio (unión de sets con al menos un valor en la sección). */
export function buildSectionTableModel(historyAsc, sectionKey, catalogSpecs, getValue) {
  var colSets = [];
  var seenCol = Object.create(null);
  historyAsc.forEach(function (set) {
    var ms = parseFechaLabToMs(set.fecha, set.hora);
    var colKey =
      typeof ms === 'number' && isFinite(ms)
        ? 't:' + ms
        : 'f:' + set.fecha + '|h:' + normalizeHoraLabHistory(set.hora);
    if (seenCol[colKey]) return;
    var hasAny = catalogSpecs.some(function (sp) {
      return getValue(set, sp.fieldKey) != null;
    });
    if (!hasAny) return;
    seenCol[colKey] = true;
    colSets.push(set);
  });
  var rows = catalogSpecs.map(function (sp) {
    return {
      fieldKey: sp.fieldKey,
      label: sp.cardTitle || sp.fieldKey,
      unit: sp.unit || '',
      values: colSets.map(function (set) {
        return getValue(set, sp.fieldKey);
      })
    };
  });
  return { columns: colSets, rows: rows };
}
```

- [ ] **Step 5: Ejecutar tests**

```bash
node --test public/js/tend-core.test.mjs
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add public/js/tend-core.mjs public/js/tend-core.test.mjs package.json
git commit -m "feat(tendencias): extraer tend-core con dedupe y eje temporal"
```

---

## Task 3: `tend-prefs.mjs`

**Files:**
- Create: `public/js/tend-prefs.mjs`
- Create: `public/js/tend-prefs.test.mjs`

- [ ] **Step 1: Tests prefs**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  seriesColorKey,
  readSeriesColor,
  writeSeriesColor,
  readGroupVisibleFields,
  writeGroupVisibleFields
} from './tend-prefs.mjs';

const mem = Object.create(null);
global.localStorage = {
  getItem: (k) => mem[k] ?? null,
  setItem: (k, v) => { mem[k] = String(v); }
};

test('colores globales por section|field', () => {
  writeSeriesColor('BH', 'Hb', '#ff0000');
  assert.equal(readSeriesColor('BH', 'Hb'), '#ff0000');
  assert.equal(seriesColorKey('BH', 'Hb'), 'BH|Hb');
});

test('visibles por paciente+sección', () => {
  writeGroupVisibleFields('p1', 'BH', ['Hb', 'Hto']);
  assert.deepEqual(readGroupVisibleFields('p1', 'BH'), ['Hb', 'Hto']);
});
```

- [ ] **Step 2: Implementar**

Claves LS:

- `rpc-tend-series-colors` → objeto `{ "BH|Hb": "#10b981", ... }`
- `rpc-tend-group-visible` → `{ "patientId|BH": ["Hb","Hto"] }`
- `rpc-tend-group-table-hidden` → `{ "patientId|BH": { rows: [], cols: [] } }`

Paleta por defecto: rotar 8 colores distintos por índice de serie si no hay color guardado.

- [ ] **Step 3: Run tests + commit**

```bash
node --test public/js/tend-prefs.test.mjs
git add public/js/tend-prefs.mjs public/js/tend-prefs.test.mjs
git commit -m "feat(tendencias): preferencias colores y toggles tend-prefs"
```

---

## Task 4: Cablear `app.js` → `tend-core` (sin modal aún)

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Import**

```javascript
import {
  dedupeTrendSetsForSeries,
  getSetTrendValueForSeries,
  buildTendChartLabels,
  buildTrendAxisMeta,
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory
} from './tend-core.mjs';
```

- [ ] **Step 2: Eliminar definiciones duplicadas** de las funciones importadas (bloque ~1092–1178, `getSetTrendValueForSeries`, `dedupeTrendSetsForSeries`, `buildTendChartLabels`).

- [ ] **Step 3: Re-exportar `sortLabHistoryChronological` si otros módulos en app lo usan** — ya está en el mismo archivo; mantener uso interno vía import.

- [ ] **Step 4: Smoke manual**

```bash
npm start
```

Abrir paciente con ≥2 labs → Expediente → Tendencias: sparks y modal detalle deben renderizar igual.

- [ ] **Step 5: Commit**

```bash
git add public/js/app.js
git commit -m "refactor(tendencias): app.js usa tend-core para tiempo y dedupe"
```

---

## Task 5: `tend-export.mjs` — PNG y TSV

**Files:**
- Create: `public/js/tend-export.mjs`

- [ ] **Step 1: `buildTableTsv(visibleModel)`**

```javascript
export function buildTableTsv(model) {
  var lines = [];
  var header = ['Analito', ...model.columns.map(colLabel)];
  lines.push(header.join('\t'));
  model.rows.forEach(function (row) {
    if (row.hidden) return;
    lines.push([row.label, ...row.cells.map(function (c) { return c.text; })].join('\t'));
  });
  return lines.join('\n');
}

function colLabel(set) {
  // DD/MM o DD/MM HH:MM — recibir label precomputado en model.columns[i].header
}
```

- [ ] **Step 2: `copyTableAsPng(tableElement, title)`**

Reutilizar lógica de `copiarDiagrama` (`app.js` ~12839): canvas blanco, título gris, `html2canvas` alternativa si no hay SVG: dibujar tabla con `foreignObject` o clonar `table` a canvas vía `drawWindow` pattern.

Implementación mínima v1: clonar `#tend-group-table` visible a canvas con:

```javascript
export async function copyTableAsPng(tableEl, title) {
  // usar mismo SCALE=2, fillStyle #fff, draw tabla con librería ligera
  // o importar función compartida exportada desde tend-export:
  // rasterizeDomElement(el, title) extraída de copiarDiagrama
}
```

**Refactor recomendado:** extraer `rasterizeElementToPng(el, title)` desde `copiarDiagrama` a `tend-export.mjs` y hacer que `copiarDiagrama` la llame (cambio pequeño en `app.js`).

- [ ] **Step 3: Commit**

```bash
git add public/js/tend-export.mjs public/js/app.js
git commit -m "feat(tendencias): export PNG/TSV para tabla agrupada"
```

---

## Task 6: HTML + CSS del modal

**Files:**
- Modify: `public/index.html` (junto a `#tend-detail-backdrop`, ~5174)

- [ ] **Step 1: Markup**

```html
<div id="tend-group-backdrop" class="tend-group-backdrop" style="display:none" onclick="if(event.target===this)closeTendGroupModal()">
  <div id="tend-group-modal" role="dialog" aria-modal="true" aria-labelledby="tend-group-title">
    <header class="tend-group-header">
      <h2 id="tend-group-title"></h2>
      <button type="button" onclick="closeTendGroupModal()" aria-label="Cerrar">×</button>
    </header>
    <nav class="tend-group-tabs" role="tablist">
      <button type="button" role="tab" data-tab="charts" class="active" onclick="setTendGroupTab('charts')">Gráficas</button>
      <button type="button" role="tab" data-tab="table" onclick="setTendGroupTab('table')">Tabla</button>
    </nav>
    <div id="tend-group-panel-charts" class="tend-group-panel" role="tabpanel"></div>
    <div id="tend-group-panel-table" class="tend-group-panel" role="tabpanel" hidden>
      <div id="tend-group-table-wrap"></div>
      <div class="tend-group-table-actions">
        <button type="button" class="btn-primary" onclick="copyTendGroupTablePng()">Copiar</button>
        <button type="button" class="btn-secondary" onclick="copyTendGroupTableText()">Copiar como texto</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: CSS** (bloque ~3495 tend-section)

Estilos: `.tend-group-backdrop`, `.tend-group-modal` (max-width 900px), `.tend-group-panel-family`, `.tend-group-legend`, `.tend-group-table` sticky header, filas ocultas `.is-hidden`, botón `.tend-section-chart-btn` en header de sección.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "ui(tendencias): shell modal gráfica por estudio"
```

---

## Task 7: `tend-group-modal.mjs`

**Files:**
- Create: `public/js/tend-group-modal.mjs`
- Modify: `public/js/app.js`

- [ ] **Step 1: Factory con contexto inyectado**

```javascript
export function createTendGroupModal(deps) {
  // deps: {
  //   getActiveId, getHistory, getCatalogForSection,
  //   tendRefFromLabSet, tendRefForSeries,
  //   tendUnitForSeries, esc, Chart, showToast
  // }
  return {
    open(sectionKey),
    close(),
    setTab(name),
    copyTablePng(),
    copyTableText()
  };
}
```

- [ ] **Step 2: `open(sectionKey)`**

1. `history = sortLabHistoryChronological(deps.getHistory())`
2. Filtrar `catalogSpecs` del estudio con ≥2 puntos (`dedupeTrendSetsForSeries`)
3. Cargar visibles desde `readGroupVisibleFields(patientId, sectionKey)` o default all
4. Render paneles por familia (`classifyTendPanelFamily`)
5. Por panel: Chart.js `type:'line'`, `scales.x.type:'linear'`, datos `{x, y}` desde `buildTrendAxisMeta`
6. Leyenda: checkbox + input `type=color` → `writeSeriesColor`

- [ ] **Step 3: Pestaña tabla**

`buildSectionTableModel` + render `<table id="tend-group-table">` con checkboxes ocultar fila/columna → `writeGroupTableHidden`

Anormalidad celda:

```javascript
function isAbnormal(set, sectionKey, fieldKey, val) {
  var ref = deps.tendRefFromLabSet(set, sectionKey, fieldKey)
    || deps.tendRefForSeries(history, sectionKey, fieldKey, set);
  if (!ref || val == null) return false;
  return val < ref[0] || val > ref[1];
}
```

- [ ] **Step 4: Integrar en `app.js`**

```javascript
import { createTendGroupModal } from './tend-group-modal.mjs';

var tendGroupModal = createTendGroupModal({
  getActiveId: () => activeId,
  getHistory: () => ensureParsedLabHistory(activeId),
  tendRefFromLabSet,
  tendRefForSeries,
  tendUnitForSeries,
  esc,
  Chart,
  showToast
});

function openTendGroupModal(sectionKey) {
  tendGroupModal.open(sectionKey);
}
function closeTendGroupModal() { tendGroupModal.close(); }
// ... setTendGroupTab, copyTendGroupTablePng, copyTendGroupTableText
```

Añadir al objeto `window` export final (~14040).

- [ ] **Step 5: Commit**

```bash
git add public/js/tend-group-modal.mjs public/js/app.js
git commit -m "feat(tendencias): modal gráfica agrupada y tabla por estudio"
```

---

## Task 8: Botón en encabezado de sección

**Files:**
- Modify: `public/js/app.js` — función `renderTendencias` (~12379)

- [ ] **Step 1: Añadir botón en HTML del toggle**

Dentro del `htmlParts.push` del `tend-section-toggle`, después de `tend-section-count`:

```javascript
'<button type="button" class="tend-section-chart-btn" title="Gráfica del estudio" aria-label="Gráfica del estudio" onclick="event.stopPropagation();openTendGroupModal(\'' +
  safeAttrJsString(sectionKey) +
  '\')">' + /* svg multi-line */ + '</button>'
```

Solo si `list.length > 0`.

- [ ] **Step 2: Verificación manual**

- Paciente con BH 2+ fechas → botón visible → modal abre.
- Clic en chevron de sección no dispara modal.
- Sparks siguen visibles.

- [ ] **Step 3: Commit**

```bash
git add public/js/app.js public/index.html
git commit -m "feat(tendencias): botón gráfica del estudio en encabezado"
```

---

## Task 9: Regresión y release

**Files:**
- Modify: `docs/RELEASE_NOTES_*.txt` (si aplica versión)

- [ ] **Step 1: Suite completa**

```bash
cd /Users/mauriciosalas/R+
npm test
```

Expected: all PASS including `tend-core.test.mjs`, `tend-prefs.test.mjs`.

- [ ] **Step 2: Checklist manual**

| # | Caso | OK |
|---|------|-----|
| 1 | Dos labs mismo día distinta hora → 2 puntos en gráfica agrupada | |
| 2 | Copiar PNG tabla respeta ocultos | |
| 3 | Copiar texto TSV pega en Excel | |
| 4 | Colores persisten al cambiar paciente y volver | |
| 5 | Filtro solo anormales sparks sigue OK con ref SOME | |
| 6 | Modal detalle 1 serie + vbar sin regresión | |

- [ ] **Step 3: Commit notas (opcional)**

```bash
git add docs/RELEASE_NOTES_3.4.4.txt
git commit -m "docs: release notes gráfica tendencias por estudio"
```

---

## Task 10 (opcional): Migrar sparks a `tend-spark.mjs`

**Files:**
- Create: `public/js/tend-spark.mjs`
- Modify: `public/js/app.js`

- [ ] Mover `renderTendencias`, `openTendDetail`, `closeTendDetail`, `sparkCharts`, controles ocultos — pasar mismas deps que modal.
- [ ] Reducir `app.js` ~800 líneas.
- [ ] `npm test` + smoke Tendencias.

Hacer **solo** si Tasks 1–9 están estables; no bloquea el feature.

---

## Plan self-review (spec coverage)

| Requisito spec | Task |
|----------------|------|
| Botón por estudio | 8 |
| Pestañas Gráficas/Tabla | 6, 7 |
| Paneles por familia | 2, 7 |
| Toggle + colores global / visibles por paciente | 3, 7 |
| Eje X offset mismo día | 2 |
| Dedupe fecha+hora | 2, 4 |
| Tabla + ocultar + PNG/TSV | 5, 7 |
| Ref SOME | 7 (usa funciones existentes) |
| Sparks sin cambio | 4, 8 |
| Modularización | 2–7, 10 opcional |
| Tests | 1, 3, 9 |

Sin placeholders TBD.

---

## Execution handoff

Plan guardado en `docs/superpowers/plans/2026-05-18-tendencias-grafica-estudio-tabla.md`.  
Spec en `docs/superpowers/specs/2026-05-18-tendencias-grafica-estudio-tabla-design.md`.

**Opciones de ejecución:**

1. **Subagent-Driven (recomendado)** — un subagente por task, revisión entre tasks.
2. **Inline** — implementar en esta sesión task por task con checkpoints.

¿Con cuál quieres que arranque la implementación?
