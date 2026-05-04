# Tendencias por sección de laboratorio (estudio) — Spec de diseño

**Fecha:** 2026-05-04  
**Decisión:** Enfoque 1 — cada serie de tendencia es el par **(sección/panel, analito)**; la UI agrupa las gráficas por tipo de estudio. No se mezclan valores del mismo nombre analítico provenientes de paneles distintos (p. ej. Hto en biometría frente a Hto en gasometría).

**Relación con otros specs:** El documento `2026-05-04-medicamentos-tendencias-design.md` describe barras de referencia por estudio en la vista de tendencias; este spec define **qué datos entran en cada gráfica** y **cómo se agrupan** por sección. La implementación debe alinear barras/referencias con la clave de serie `(sección, analito)` definida aquí.

---

## 1. Contexto y problema

Hoy `extractParsedValues` aplana resultados a un objeto `parsed` con claves globales (`Hb`, `Hto`, `Na`, …) tomando cada analito de **una** sección fija (p. ej. `Hto` solo desde `BH`). La pestaña **Expediente → Tendencias** dibuja una mini-gráfica por clave global y ordena puntos en el tiempo sin distinguir panel de origen cuando el mismo analito podría existir en otro bloque (p. ej. gasometría).

**Problema clínico:** Comparar en una sola serie valores de **distintos estudios** (misma etiqueta analítica, distinto contexto metodológico o muestra) induce lecturas incorrectas.

**Objetivo:** Cada gráfica de tendencia corresponde a **un solo estudio de laboratorio** (sección del tabular: BH, QS, ESC, PFHs, GASES, …). Si existen dos fuentes válidas para el mismo nombre (p. ej. Hto en BH y Hto en GASES), son **dos series independientes** con tarjetas y datos no mezclados.

---

## 2. Reglas de negocio

1. **Identidad de serie:** `seriesId` estable = combinación de `sectionKey` + `fieldKey`, donde `sectionKey` es el token de bloque del parser (alineado con `parsearSecciones`: BH, QS, ESC, PFHs, GASES, etc.) y `fieldKey` es el token del analito en esa sección.
2. **Elegibilidad para gráfica:** Se muestra mini-gráfica (y detalle al pulsar) solo si existen **al menos dos puntos temporales** con valor numérico finito para **esa misma** `(sectionKey, fieldKey)` tras deduplicación (ver §5).
3. **Agrupación UI:** Las tarjetas se listan bajo **encabezados por sección** (orden de sección definido en producto; por defecto orden clínico habitual: BH → QS → ESC → PFHs → GASES → otros reconocidos).
4. **Sin mezcla entre secciones:** Ningún `Chart.js` dataset mezcla puntos de dos `sectionKey` distintos para el mismo `fieldKey`.
5. **Compatibilidad:** Cualquier código que aún consuma `parsed` plano debe seguir funcionando durante la transición: o bien se mantiene `parsed` como vista derivada “legacy” con la semántica actual documentada, o se actualizan todos los consumidores en el mismo cambio. La implementación elige una sola estrategia y la lista en el plan (preferencia: **una sola migración** que actualice consumidores internos para evitar doble verdad).

---

## 3. Modelo de datos

### 3.1 Parseo por sección

- Reutilizar `parsearSecciones(resLabs)` como fuente de verdad por conjunto del historial.
- Añadir estructura explícita por sección, por ejemplo `parsedBySection` (mapa `sectionKey` → mapa `fieldKey` → `{ val: number, ab: boolean }` o `number | null` según convenga el código existente).
- **Ampliación de mapeo:** Los analitos que deben tendirse y que solo aparecen en secciones no contempladas hoy (p. ej. Hto u otros en GASES según formatos reales) se incorporan al **catálogo de series** (§3.2), no se descartan por quedar fuera del objeto plano legacy.

### 3.2 Catálogo de series tendibles

- Lista declarativa de entradas: `{ sectionKey, fieldKey, label?, unit?, refMin?, refMax? }`.
- `label` visible en UI: por defecto `fieldKey` + sufijo corto de estudio si hay riesgo de homónimos (p. ej. “Hto (biometría)” vs “Hto (gasometría)”).
- Rangos y unidades: si difieren por sección, el catálogo lleva referencia **por serie**; si no hay rango para esa serie, no se muestra barra de normalidad (coherente con el spec de barras por estudio).

### 3.3 Historial (`labHistory`)

- Cada elemento sigue teniendo `resLabs`, `fecha`, `hora`, `id`.
- Tras parseo: `parsedBySection` (nombre final acordado en implementación) persistido o regenerado en `ensureParsedLabHistory` de forma análoga a `parsed` hoy.
- Opción explícita descartada en diseño: inferir sección solo por heurística de nombre sin anclaje al bloque del TSV; la sección debe salir del **bloque** del informe.

---

## 4. UI — Expediente → Tendencias

1. Contenedor principal con **subsecciones** (título = nombre legible de la sección, p. ej. “Biometría hemática”, “Gasometría”).
2. Dentro de cada subsección, **rejilla** de tarjetas solo para series elegibles (regla §2.2).
3. Tarjeta: nombre del analito + unidad; valor último; color de anormalidad según rango de **esa** serie; mini-gráfica con eje temporal como hoy (`buildTendChartLabels` o equivalente sobre los conjuntos filtrados por sección).
4. Modal de detalle: mismo `seriesId`, mismos datasets; título deja claro sección + analito.

**Fase posterior (fuera del MVP de este spec si hace falta recortar):** acordeón colapsable por sección para reducir scroll en pacientes con muchos paneles.

---

## 5. Deduplicación y tiempo

- Extender la lógica tipo `dedupeTrendSetsForParam` a **`dedupeTrendSetsForSeries(sectionKey, fieldKey, setsDesc)`**: misma fecha/hora resuelta (o clave fecha/hora raw si no parsea) y mismo valor numérico ⇒ un solo punto; conservar la aparición más reciente como hoy.
- Orden temporal: reutilizar `sortLabHistoryChronological` a nivel de conjunto; la serie toma solo conjuntos donde exista valor para esa `(sectionKey, fieldKey)`.

---

## 6. Alcance y no objetivos

**Incluido**

- Tendencias y modal de detalle en `public/js/app.js` (y estilos asociados si hace falta).
- Parseo ampliado + catálogo de series + agrupación por sección.
- Datos de demo / textos de tour que asuman un solo “Hto” genérico.

**No incluido (salvo decisión explícita posterior)**

- Cultivos en la misma vista de tendencias numéricas de laboratorio (sigue siendo dominio de la pestaña Cultivos).
- Exportación Word de tendencias por sección (si no existe, no se exige en este cambio).

---

## 7. Pruebas de aceptación

1. Historial con dos conjuntos: BH con Hto 40 y 42; GASES con Hto 25 y 28 ⇒ **dos** tarjetas bajo grupos distintos, cada una con dos puntos, sin mezclar valores entre gráficas.
2. Conjunto que solo tiene BH sin GASES ⇒ solo aparece la serie BH correspondiente; no se crean tarjetas vacías para GASES.
3. Misma fecha dos extracciones distintas con mismo valor en la misma sección y analito ⇒ un solo punto tras dedupe.
4. Tras recargar la app, pacientes con historial antiguo sin `parsedBySection` ⇒ migración/regeneración al cargar sin pérdida de conjuntos.

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Doble verdad entre `parsed` plano y `parsedBySection` | Un solo cambio que actualice consumidores o capa derivada única documentada. |
| Formatos donde el token de sección no coincide con el catálogo | Lista explícita de `sectionKey` admitidos para tendencias; secciones desconocidas sin catálogo no generan series hasta ampliar mapeo. |
| Rangos distintos por misma etiqueta | Catálogo por `seriesId`; fallback solo cuando clínica y producto acuerden equivalencia. |

---

## 9. Siguiente paso de proceso

Tras revisión y aprobación de este archivo por el usuario, crear el plan de implementación con la skill **writing-plans** (sin código hasta entonces).
