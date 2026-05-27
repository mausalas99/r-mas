# Optimización de rendimiento — laboratorio y tendencias — Spec de diseño

**Fecha:** 2026-05-26  
**Objetivo:** Reducir lag general en sesiones con estancias largas (20+ sets de laboratorio por paciente) mediante ventana de datos en vista compacta, cache de parseo/índices, render incremental en Tendencias y coalescing de trabajo en segundo plano — sin perder acceso al historial completo bajo demanda.

---

## 1. Contexto y problema

Con pacientes de estancia larga, el historial de laboratorio crece (20–50+ sets). Hoy la app se siente lenta de forma **general** (no solo al abrir Tendencias): pegar labs, cambiar paciente, auto-guardar y navegar el expediente tienen micro-pausas acumuladas.

**Causas identificadas en código:**

| Área | Comportamiento actual | Impacto |
|------|----------------------|---------|
| `ensureParsedLabHistory` | Recorre **todos** los sets del paciente en cada llamada; re-parsea y compara con `JSON.stringify`; puede disparar `saveState()` en lectura | Hot path compartido por Tendencias, Pase, lab panel, manejo |
| `renderTendenciasBody` | Rebuild completo: `innerHTML` + destruir todos los spark charts | Cada mutación de lab o cambio de prefs repinta todo |
| Catálogo de series | `history.filter` × analitos sobre historial completo | O(n sets × n analitos) por render |
| Sparks | Downsample a 48 puntos pero datos se calculan sobre historial entero | Trabajo innecesario en vista compacta |
| `refreshTendenciasOrCultivosPanel` | Llamado múltiples veces en cadena sin debounce | Varios paints por una acción |
| Persistencia | `saveState` serializa estado entero | Presión acumulada (fuera de scope de reformato) |

**Escala validada en brainstorming:** ~6 pacientes activos, varios con 20+ sets. El cuello de botella principal es **procesamiento por paciente**, no tamaño de lista lateral.

**Decisión de enfoque:** Opción **B — Cache + render incremental**, con ventana de UI de la opción A embebida. No implementar índices precomputados persistentes (opción C) en esta fase.

---

## 2. Decisiones validadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Vista compacta (spark) | **Últimos 5 valores** por analito |
| Valor destacado en card | **Último valor real** del historial completo (no limitado a ventana) |
| Flag anormal | Sobre último valor real + referencia del historial completo |
| Catálogo / elegibilidad en grid | Ventana de **12 sets** recientes para decidir cards visibles |
| Modal detalle + gráfica de estudio | Historial **completo** al abrir (lazy, no en render inicial) |
| Chart detalle | Sin límite; downsample solo si >100 puntos |
| Parseo | **Una vez por set** estable; invalidar al mutar set |
| Invalidación | `revision` monotónica por paciente al mutar historial |
| Render Tendencias | Incremental cuando estructura igual; full rebuild solo si prefs/secciones/ocultos cambian |
| Lista de pacientes | Sin cambios (6 pacientes no justifican virtualización) |
| Persistencia | Sin cambio de formato (localStorage); menos `saveState` en hot path |
| Archivar labs viejos | **Fuera de scope** |

---

## 3. Arquitectura

### 3.1 Módulo nuevo

| Módulo | Responsabilidad |
|--------|-----------------|
| `public/js/lab-history-cache.mjs` | Revision por paciente, ventanas de render, índice de series, wrapper de parse cacheado |
| `public/js/lab-history-cache.test.mjs` | Tests unitarios de ventanas, revision, índice |

### 3.2 Módulos modificados

| Módulo | Cambio |
|--------|--------|
| `public/js/lab-history-set.mjs` | Parse por set con skip si unchanged; `bumpLabHistoryRevision` en mutaciones; opción `deferSave` en parse de lectura |
| `public/js/features/tendencias.mjs` | Ventana spark/catalog; índice cacheado; render incremental; debounce refresh |
| `public/js/tend-core.mjs` | Exportar helpers reutilizables para índice (si conviene extraer de tendencias) |
| `public/js/app-runtimes.mjs` | Exponer `ensureParsedLabHistoryCached` como runtime |
| `public/js/features/lab-panel.mjs` | `bumpLabHistoryRevision` en add/delete/reprocess |
| `public/js/features/expediente.mjs` | Debounce en `refreshTendenciasOrCultivosPanel` |
| `public/js/lan-patient-merge.mjs` | Bump revision tras merge de labHistory |
| `package.json` | Registrar `lab-history-cache.test.mjs` |

### 3.3 Constantes

```js
export const TREND_SPARK_WINDOW = 5;      // puntos en spark compacto
export const TREND_CATALOG_WINDOW = 12;   // sets para elegibilidad en grid
export const TREND_DETAIL_DOWNSAMPLE = 100; // umbral en modal/gráfica full
export const TREND_REFRESH_DEBOUNCE_MS = 80;
```

Reemplaza `TREND_SPARK_MAX_POINTS = 48` en vista compacta (sparks usan ventana de 5, no downsample sobre historial entero).

### 3.4 Flujo de datos

```
Mutación labHistory (add/delete/reprocess/merge)
  → bumpLabHistoryRevision(patientId)
  → invalidar cache de índice Tendencias para ese paciente

renderTendencias()
  → ensureParsedLabHistoryCached(activeId)  // parse skip + no saveState en lectura
  → getTrendRenderWindow(history, 'catalog' | 'spark' | 'full')
  → buildTrendSeriesIndex(windowSets)     // una pasada, mapa por seriesKey
  → paint diferido (scheduleAfterPaint) + sparks en batch (6/rAF)

openTendDetail / tend-group-modal open
  → getTrendRenderWindow(history, 'full')
  → downsample solo si puntos > TREND_DETAIL_DOWNSAMPLE
```

---

## 4. Capa de cache y parseo (`lab-history-cache.mjs`)

### 4.1 Revision por paciente

- Mapa en memoria: `_labHistoryRevision[patientId] → number` (entero, incrementa en cada mutación).
- `bumpLabHistoryRevision(patientId)` — llamar desde:
  - Agregar set (`lab-panel`, bulk paste)
  - Eliminar set
  - Reprocesar set
  - Merge LAN de labHistory
  - Mantenimiento post-save que muta `resLabs`/`parsedBySection`

### 4.2 Parse cacheado

`ensureParsedLabHistoryCached(patientId, options)` delega a `ensureParsedLabHistory` con mejoras:

1. **Skip por set:** si el set tiene `_parseFingerprint` igual a hash estable de `resLabs` (+ `sourceText` si aplica) y ya tiene `parsedBySection`, no re-ejecutar `extractParsedValues` / `buildParsedBySectionFromResLabs`.
2. **Sin saveState en lectura:** opción `{ readOnly: true }` — normalizaciones menores se acumulan en cola o se persisten solo si `changed && !readOnly`.
3. **Solo paciente activo:** no invocar parse completo de pacientes inactivos salvo mantenimiento explícito.

### 4.3 Ventanas de render

```js
/**
 * @param {unknown[]} historyAsc  historial cronológico ascendente
 * @param {'spark'|'catalog'|'full'} mode
 */
export function getTrendRenderWindow(historyAsc, mode) {
  if (mode === 'full') return historyAsc;
  var n = mode === 'spark' ? TREND_SPARK_WINDOW : TREND_CATALOG_WINDOW;
  if (!historyAsc || historyAsc.length <= n) return historyAsc || [];
  return historyAsc.slice(-n);
}
```

- **`spark`:** últimos 5 sets (después de dedupe por serie en tendencias).
- **`catalog`:** últimos 12 sets para filtrar analitos con ≥2 puntos en ventana.
- **`full`:** todo el historial (modales).

Sets `Anterior` / migrados: incluidos en `full`; en ventana reciente solo si caen en los últimos N cronológicos.

### 4.4 Índice de series

`buildTrendSeriesIndex(catalogSpecs, windowSetsDesc, historyFull, getValueFn)` retorna:

```js
{
  "BH|hb": {
    setsDesc: [...],       // dedupe sobre windowSets
    setsDescFull: [...],   // dedupe sobre historyFull (para latest/ref)
    latest: number | null,
    ref: [lo, hi] | null,
    isAbnormal: boolean
  }
}
```

Elimina loops repetidos de `history.filter` en `renderTendenciasBody`.

---

## 5. Tendencias — comportamiento UI

### 5.1 Cards (vista compacta)

- **Nombre + valor grande:** último valor del historial **completo** (`setsDescFull[0]`).
- **Color anormal:** según ref + latest del historial completo.
- **Sparkline:** Chart.js con **máximo 5 puntos** de `getTrendRenderWindow(..., 'spark')`.
- **Elegibilidad card (≥2 puntos):** evaluar sobre ventana `catalog` (12 sets). Si hay ≥2 en ventana → card con spark. Si solo hay ≥2 en historial completo pero no en ventana → card visible, spark con 1–2 puntos recientes; tooltip o affordance “Ver histórico” (sin bloquear).

### 5.2 Secciones colapsadas

- Sin cambio: placeholder en lugar de canvas (no montar Chart.js).
- Sparks solo en secciones expandidas (comportamiento actual, conservar).

### 5.3 Modal detalle (`openTendDetail`)

- Al abrir: cargar series desde historial **full**.
- Chart con todos los puntos deduplicados; si >100, aplicar downsample existente (`downsampleTrendChartSeries` con `TREND_DETAIL_DOWNSAMPLE`).
- Tabla de valores (si existe en UI): todos los puntos.

### 5.4 Gráfica de estudio (`tend-group-modal.mjs`)

- Al abrir modal: `full` history (no precargar en render de grid).
- Sin reescritura del modal; solo cambiar fuente de datos a ventana full lazy.

### 5.5 Render incremental

Estado en módulo tendencias:

```js
var _tendRenderState = {
  key: null,           // patientId|revision|prefsHash|expandedSections
  seriesKeys: [],      // orden actual de cards
};
```

**Algoritmo:**

1. Calcular `renderKey` después de build de índice.
2. Si `renderKey === _tendRenderState.key` y solo cambió latest/spark data → actualizar DOM de cards afectadas + `chart.update()` en sparks existentes; **no** `container.innerHTML`.
3. Si cambió estructura (analitos visibles, orden secciones, prefs ocultos/anormales) → full rebuild (comportamiento actual).
4. Siempre: `destroyTendCardSortables` + remount solo en full rebuild.

**Debounced refresh:**

- `refreshTendenciasOrCultivosPanel` envuelto en debounce 80ms (leading: false, trailing: true).
- Múltiples llamadas tras pegar lab → un solo `renderTendencias`.

---

## 6. Integración transversal

### 6.1 Runtime

`app-runtimes.mjs` reemplaza o complementa `ensureParsedLabHistory` con `ensureParsedLabHistoryCached` en runtimes de tendencias, lab-panel, pase-board, manejo, expediente.

### 6.2 Mutaciones que deben bump revision

| Acción | Archivo |
|--------|---------|
| `addLabHistorySet` / auto-store | `lab-panel.mjs`, `lab-history-auto-store-*` |
| `deleteLabHistorySet` | `lab-panel.mjs` |
| `reprocessLabHistorySet` | `lab-panel.mjs` |
| Post-save maintenance que muta sets | `lab-history-set.mjs` |
| LAN merge labHistory | `lan-patient-merge.mjs` |

### 6.3 Superficies que se benefician sin UI nueva

- **Pase / ronda:** `findPaseLatestLabSend`, `buildRondaRecentLabsBlockHtml` — wrapper cached; siguen leyendo solo el set más reciente.
- **Panel historial lab:** listado de sets sin re-parsear si fingerprint válido.
- **Manejo / cultivos bridge:** menos trabajo en `ensureParsedLabHistory` al consultar historial.

---

## 7. Edge cases

| Caso | Comportamiento |
|------|----------------|
| 2 sets totales | Spark con 2 puntos; sin mensaje vacío |
| Filtro “solo anormales” | Filtrar por `isAbnormal` del índice (último valor real) |
| Cambio prefs BH/gaso extendido | Incluir prefs en `renderKey` → full rebuild |
| Usuario expande sección nueva | Montar sparks solo para cards newly visible (batch rAF) |
| Chart.js no disponible | Toast existente; cards siguen mostrando valor numérico |
| Cambio de paciente | Reset `_tendRenderState.key`; parse solo nuevo activo |
| `readOnly` parse falla normalización | Log en dev; no bloquear UI; persistir en próximo save explícito |

---

## 8. Pruebas

### 8.1 Unitarias (`lab-history-cache.test.mjs`)

- `getTrendRenderWindow`: modos spark/catalog/full; historial más corto que ventana.
- `bumpLabHistoryRevision`: incremento monotónico; independiente por paciente.
- Fingerprint skip: set unchanged no re-parsea (mock de extract/build).
- `buildTrendSeriesIndex`: latest y setsDesc coherentes con implementación de referencia en tend-core.

### 8.2 Ampliar `tend-core.test.mjs` (opcional)

- Downsample con umbral 100 en detalle.

### 8.3 Criterios de aceptación manual

Con paciente de **20+ sets**:

1. Abrir pestaña Tendencias: respuesta perceptiblemente más rápida vs baseline.
2. Agregar un set: UI no congelada >300ms en máquina de desarrollo típica.
3. Clic en card → modal muestra **todos** los puntos históricos.
4. Valor grande en card coincide con el último lab real (no solo ventana de 5).
5. Tras cambiar paciente y volver, datos coherentes (revision + cache).

---

## 9. Fuera de scope

- Archivar o paginar labHistory en almacenamiento.
- Virtual scroll en lista de pacientes o grid de analitos.
- Migrar persistencia a IndexedDB.
- Precomputar índices persistentes en disco (opción C).
- Reescritura completa de `tend-group-modal`.
- Optimización de `saveState` / compresión JSON (se beneficia indirectamente).

---

## 10. Orden de implementación sugerido

1. `lab-history-cache.mjs` + tests (ventanas, revision, índice).
2. Parse fingerprint + `readOnly` en `lab-history-set.mjs`.
3. Wire bump revision en mutaciones lab/LAN.
4. Tendencias: ventana spark 5 + índice + catalog window.
5. Debounce `refreshTendenciasOrCultivosPanel`.
6. Render incremental en tendencias.
7. Lazy full history en detalle / group modal.
8. Verificación manual con paciente 20+ sets.

---

## 11. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Cache stale tras mutación olvidada | Lista explícita de call sites para `bumpLabHistoryRevision`; test de integración ligero |
| Render incremental deja DOM inconsistente | Fallback a full rebuild si mismatch de `seriesKeys` |
| Latest valor distinto de ventana spark confunde | Documentar en UI; valor card siempre del historial full |
| `readOnly` retrasa persistencia de normalización | Persistir en `saveState` normal del flujo de edición lab |
