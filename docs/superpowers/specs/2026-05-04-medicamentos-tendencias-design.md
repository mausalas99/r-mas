# Medicamentos (inclusión amplia + texto corto) y Tendencias (barras por estudio) — Spec de diseño

**Fecha:** 2026-05-04  
**Objetivo:** Ajustar la pestaña de Medicamentos para incluir cualquier fila válida marcada como `MEDICAMENTOS` aunque no esté en catálogo, añadir una segunda salida de texto libre enfocada en `NOMBRE DÍA N` solo para ATB, e incorporar barras de normalidad por estudio en Tendencias cuando exista rango de referencia.

---

## 1. Contexto y problema

El flujo actual de Medicamentos ya procesa recortes TSV del hospital y genera texto de egreso. Sin embargo, en uso real se requieren dos ajustes:

1. **Inclusión clínica amplia:** si una fila viene como `MEDICAMENTOS`, debe agregarse aunque el nombre no esté en catálogos internos.
2. **Salida corta clínica:** además del texto completo, se necesita una versión resumida con nombre del fármaco y día de tratamiento solo para antibióticos.

Además, en Tendencias se solicita una lectura visual rápida del valor actual contra su normalidad:

- Barra por estudio con su rango específico.
- Si no hay rango, no mostrar barra.

---

## 2. Reglas de negocio validadas

1. Toda fila válida cuyo tipo sea `MEDICAMENTOS` se agrega al listado; el catálogo no bloquea inclusión.
2. La clasificación por catálogo/tokens se mantiene para funciones derivadas (p. ej. ATB para SOAP o texto corto).
3. Se añade tolerancia de normalización de nombre para variantes frecuentes (por ejemplo, `ONDASETRON` / `ONDANSETRON`).
4. Se mantienen dos salidas de texto libre:
   - **Versión completa:** formato actual de receta/egreso.
   - **Versión corta:** solo nombre, y `DÍA N` únicamente si el medicamento clasifica como ATB y tiene día explícito.
5. En Tendencias, las barras son por estudio con su rango de referencia específico.
6. Si un estudio no tiene rango confiable, no se dibuja barra para ese estudio.

---

## 3. Diseño funcional — Medicamentos

### 3.1 Inclusión de medicamentos

- El parser conserva el criterio principal de inclusión por columna de tipo (`MEDICAMENTOS`) y estructura mínima de columnas.
- Los nombres fuera de catálogo pasan a lista activa como cualquier otro ítem.
- El catálogo sigue siendo auxiliar para:
  - clasificación clínica (ATB/analgesia/etc.),
  - acentos o ajustes de presentación.

### 3.2 Normalización de nombres frecuentes

- Añadir alias de corrección para variantes comunes de digitación (caso objetivo inicial: `ONDASETRON`).
- La normalización se aplica antes de clasificación, sin alterar la inclusión base.

### 3.3 Dos variantes de texto libre

- **Completa:** se mantiene `buildMedRecetaCopyText(items)` sin cambio de contrato.
- **Corta (nueva):**
  - base: `NOMBRE_NORMALIZADO`
  - si es ATB y `diaTratamiento` existe: `NOMBRE_NORMALIZADO DÍA N`
  - si no es ATB o ATB sin día explícito: solo nombre
- El copiado permite elegir variante completa o corta sin romper el botón actual de flujo.

---

## 4. Diseño funcional — Tendencias con barras por estudio

### 4.1 Modelo visual

- Cada estudio en tendencias puede renderizar una barra horizontal de referencia:
  - segmento bajo,
  - segmento normal (`min` a `max`),
  - segmento alto.
- El valor actual se representa con marcador posicional y etiqueta de valor/unidad.

### 4.2 Condiciones de render

- Barra visible solo si existe rango válido para ese estudio (`min/max` numéricos y coherentes).
- Si el estudio no tiene rango: mostrar únicamente el valor textual existente (sin barra).

### 4.3 Valores fuera de rango

- El marcador se limita al extremo de la barra para evitar desbordes.
- El estado sigue marcado como bajo o alto de manera explícita en estilo/etiqueta.

---

## 5. Componentes y puntos de cambio

- `public/js/med-receta-core.mjs`
  - normalización de alias de nombre,
  - constructor de texto corto (nuevo),
  - preservación de salida completa.
- `public/js/app.js`
  - UI/handlers para elegir y copiar versión completa o corta,
  - integración de barras de normalidad en sección Tendencias.
- `public/index.html` (solo si se requiere control visible nuevo)
  - selector/botón para variante de copia de medicamentos.
- Tests unitarios y/o de integración visual según cobertura actual.

---

## 6. Datos y flujo

### 6.1 Medicamentos

1. Pegado TSV.
2. Parseo por filas `MEDICAMENTOS`.
3. Normalización de nombre (incluye alias).
4. Clasificación clínica opcional (ATB u otras categorías).
5. Render de lista + salida completa y salida corta.
6. Copiado según variante elegida.

### 6.2 Tendencias

1. Cálculo/lectura de valor actual por estudio.
2. Resolución de rango de referencia de ese estudio.
3. Si rango válido: render barra + marcador.
4. Si rango ausente: render estándar sin barra.

---

## 7. Errores y casos límite

- Filas malformadas en pegado: se omiten y se reportan en contador de líneas omitidas (comportamiento actual).
- Nombres no reconocidos por catálogo: se incluyen de todos modos.
- ATB sin día explícito: en texto corto queda solo nombre.
- Estudio con unidad no numérica o rango incompleto: no se dibuja barra.

---

## 8. Pruebas requeridas

### 8.1 Medicamentos

- Caso `ONDASETRON` se incluye y se normaliza para clasificación esperada.
- Fármaco fuera de catálogo se incluye y aparece en salida completa.
- Salida corta:
  - ATB con día -> `NOMBRE DÍA N`
  - ATB sin día -> `NOMBRE`
  - no ATB -> `NOMBRE`

### 8.2 Tendencias

- Estudio con rango válido -> barra visible y posición correcta.
- Estudio sin rango -> sin barra.
- Valor por debajo/encima de rango -> marcador en extremo y estado correcto.

---

## 9. Criterios de aceptación

1. Ningún medicamento válido por tipo `MEDICAMENTOS` se pierde por falta de catálogo.
2. Existen dos copias de texto libre en Medicamentos (completa y corta) y la corta respeta `DÍA N` solo para ATB.
3. Tendencias muestra barras por estudio únicamente cuando hay rango disponible.
4. Los cambios no rompen el flujo actual de receta, SOAP, respaldo/importación ni visualización de tendencias existentes.

---

## 10. Autorrevisión del spec

- Sin placeholders `TODO/TBD`.
- Alcance acotado a dos frentes aprobados por usuario.
- Reglas de `DÍA N` y de barra sin rango expresadas de forma explícita y no ambigua.
