# Tendencias — gráfica por estudio + tabla copiable — Spec de diseño

**Fecha:** 2026-05-18  
**Estado:** Aprobado (brainstorming)  
**Relación:** Extiende `2026-05-04-tendencias-por-seccion-laboratorio-design.md`

---

## 1. Resumen

En **Expediente → Tendencias**, cada encabezado de estudio (BH, QS, ESC, …) gana un botón que abre un modal con dos pestañas:

1. **Gráficas** — paneles por familia de unidad (% / absolutos / gases), varias series con toggle, colores personalizables.
2. **Tabla** — matriz analitos × columnas temporales; ocultar filas/columnas; copiar **PNG** (default) o **texto TSV**.

Las mini-gráficas (sparks) por analito **se mantienen**. La lógica de tiempo/dedupe se centraliza y corrige para permitir **varios puntos el mismo día** si la **hora** difiere.

**Referencias:** Ya integradas desde SOME (`refsBySection` por set, vía `buildRefsBySectionFromReport`); respaldo orientativo (`TEND_REF`) solo si el informe no trae rango. La vista agrupada usa la misma cadena `tendRefFromLabSet` → `tendRefForSeries`.

---

## 2. Ubicación y entrada

| Elemento | Comportamiento |
|----------|----------------|
| Botón en `tend-section-toggle` | Icono gráfica múltiple + tooltip «Gráfica del estudio» |
| Visibilidad | Solo si el estudio tiene ≥1 serie con ≥2 puntos tras dedupe |
| Evento | `stopPropagation` — no colapsa la sección |
| Sparks | Sin cambios de layout |

---

## 3. Modal

- Ancho: `min(95vw, 900px)`; alto ~`80vh`.
- Título: etiqueta legible del estudio (`TEND_SECTION_LABELS`).
- Pestañas: **Gráficas** | **Tabla** (primera activa por defecto).

### 3.1 Pestaña Gráficas

- **Paneles** automáticos por familia:
  - **Gases** — `sectionKey === 'GASES'`
  - **Porcentajes** — unidad `%` o sufijos `Pct` en catálogo
  - **Absolutos** — resto numérico del estudio
- Panel sin series elegibles (≥2 puntos) → no renderizar.
- Cada panel: Chart.js `line`, una dataset por analito visible.
- **Toggle** por serie (leyenda clickeable + chips).
- **Color** editable por serie; persistencia **global** (`localStorage`).
- **Series activas** por defecto: recordar por `patientId + sectionKey`; si no hay historial → todas con ≥2 puntos.
- **Eje X:** etiqueta de **día** (`DD/MM`); si hay >1 punto el mismo día calendario → **offset fraccional en X** (puntos no superpuestos); tooltip incluye `HH:MM`.
- **Sin barra vertical de rango** en gráfica multi-serie (escalas distintas).
- Anormalidad: por punto, `tendRefFromLabSet(set, section, field)`; fallback `tendRefForSeries` hasta ese set.

### 3.2 Pestaña Tabla

- **Una matriz:** filas = analitos del estudio con datos; columnas = sets deduplicados (misma regla que gráficas).
- Encabezado columna: `DD/MM` o `DD/MM HH:MM` si hay varias del mismo día.
- Celdas: valor formateado; `*` si anormal según ref del set de esa columna.
- **Ocultar** filas/columnas (checkbox o toggle) antes de copiar.
- **Copiar** → PNG solo celdas visibles (patrón `copiarDiagrama` / canvas).
- **Copiar como texto** → TSV (tabs), filas/columnas visibles.

---

## 4. Tiempo y deduplicación (global)

- **Clave de dedupe:** `parseFechaLabToMs(fecha, hora)` + valor + `sectionKey` + `fieldKey` (comportamiento actual con hora en ms).
- **Fusionar** solo si fecha+hora+valor coinciden (misma sección/analito).
- **Mismo día, hora distinta** → puntos y columnas separados.
- Funciones en **`tend-core.mjs`**; consumidas por sparks, detalle y modal agrupado.
- **`buildTendChartLabels`** / eje Chart: evolucionar a `buildTrendAxisMeta(setsAsc)` con offsets para Chart.js (escala lineal o categorías con jitter).

---

## 5. Referencias SOME

| Contexto | Función |
|----------|---------|
| Sparks / filtro anormales | `tendRefForSeries(history, section, field, latestSet)` |
| Punto en gráfica agrupada | `tendRefFromLabSet(set, section, field)` por set del punto |
| Tabla | Ref del set de la columna |
| Respaldo | `tendRefOrientative` |

Historial sin `refsBySection`: rellenar en `ensureParsedLabHistory` desde `sourceText` (ya existente).

---

## 6. Persistencia (`tend-prefs.mjs`)

| Clave LS | Alcance |
|----------|---------|
| Colores serie | Global: `sectionKey\|fieldKey` → `#hex` |
| Series visibles gráfica agrupada | `patientId\|sectionKey` → `fieldKey[]` |
| Tabla ocultos | `patientId\|sectionKey` → `{ hiddenRows, hiddenCols }` |

Claves existentes de sparks (`TEND_HIDDEN_SERIES_LS`, etc.) sin cambio.

---

## 7. Modularización

| Módulo | Rol |
|--------|-----|
| `tend-core.mjs` | Tiempo, dedupe, familias, eje X, datos tabla/gráfica |
| `tend-prefs.mjs` | localStorage colores/toggles/ocultos tabla |
| `tend-export.mjs` | PNG + TSV de tabla |
| `tend-group-modal.mjs` | UI modal, Chart.js multi-serie, pestañas |
| `tend-spark.mjs` | (Fase 2 opcional) migrar `renderTendencias` desde `app.js` |
| `app.js` | Imports + re-export `window` para `onclick` |

**Regla:** código nuevo no se añade masivamente a `app.js`.

---

## 8. No objetivos (v1)

- Modo Pase / proyección fullscreen dedicada.
- Export Word de tendencias agrupadas.
- Editar rangos de referencia en UI.

---

## 9. Criterios de aceptación

1. Botón en encabezado BH (con datos) abre modal con Gráficas y Tabla.
2. Dos labs mismo día distinta hora → dos puntos (offset X) y dos columnas.
3. Misma fecha+hora+valor → un punto/columna.
4. Toggles/colores persisten según §6.
5. Copiar PNG/texto respeta filas/columnas ocultas.
6. Anormalidad usa ref SOME del set cuando existe.
7. `npm test` incluye `tend-core.test.mjs` en verde.
8. Sparks y modal detalle 1-serie siguen operativos.

---

## 10. Siguiente paso

Plan: `docs/superpowers/plans/2026-05-18-tendencias-grafica-estudio-tabla.md`
