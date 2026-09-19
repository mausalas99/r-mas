# Medicamentos + Tendencias (barras por estudio) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**  
1) Garantizar que toda fila válida de tipo `MEDICAMENTOS` se incluya aunque no esté en catálogo.  
2) Añadir una salida corta de texto libre con formato `NOMBRE DÍA N` solo para ATB con día explícito.  
3) Mostrar en Tendencias barras de normalidad por estudio cuando exista rango de referencia; si no hay rango, no mostrar barra.

**Spec de referencia:** `docs/superpowers/specs/2026-05-04-medicamentos-tendencias-design.md`

---

## File map

- `public/js/med-receta-core.mjs`  
  Normalización de nombres, clasificación ATB robusta, nueva salida corta.
- `public/js/med-receta-core.test.mjs`  
  Pruebas de inclusión amplia, alias (`ONDASETRON`) y formato corto.
- `public/js/app.js`  
  Integración UI de variante de copia y render de barras en Tendencias.
- `public/index.html` (si aplica)  
  Selector/botón para alternar copia completa/corta.

---

## Task 1: Cobertura de pruebas para medicamentos (primero tests)

**Files:**
- Modify: `public/js/med-receta-core.test.mjs`

- [ ] **Step 1: Test de inclusión sin catálogo**
  - Agregar caso con medicamento no contemplado en listas internas.
  - Verificar que `parseMedicationPaste(...)` lo incluye en `items`.

- [ ] **Step 2: Test de alias ONDASETRON**
  - Caso con `ONDASETRON ...`.
  - Verificar clasificación equivalente a `ONDANSETRON` (analgesia/antiemético) o salida normalizada esperada.

- [ ] **Step 3: Test de salida corta**
  - Introducir tests para nueva función (p. ej. `buildMedRecetaShortCopyText(items)`):
    - ATB con día -> `NOMBRE DÍA N`
    - ATB sin día -> `NOMBRE`
    - no ATB -> `NOMBRE`

- [ ] **Step 4: Ejecutar tests (esperar FAIL inicial)**
  - Run: `npm test`

---

## Task 2: Implementación en núcleo de medicamentos

**Files:**
- Modify: `public/js/med-receta-core.mjs`

- [ ] **Step 1: Alias de normalización**
  - Crear capa simple de alias para nombres frecuentes (mínimo `ONDASETRON` -> `ONDANSETRON` para clasificación).
  - Aplicar alias antes de `classifyMedicationSoapCategory(...)`.

- [ ] **Step 2: Mantener inclusión amplia**
  - Confirmar que el parser solo filtre por estructura mínima + tipo `MEDICAMENTOS`.
  - No agregar bloqueos por catálogo.

- [ ] **Step 3: Nueva salida corta**
  - Implementar función para construir texto corto:
    - base: nombre expandido/normalizado.
    - agregar `DÍA N` solo si `classifyMedicationSoapCategory(nombreRaw) === 'abx'` y `diaTratamiento != null`.
  - Mantener intacta la salida completa existente.

- [ ] **Step 4: Ejecutar tests**
  - Run: `npm test`
  - Esperado: PASS en pruebas nuevas y regresión.

---

## Task 3: UI para copiar versión completa o corta

**Files:**
- Modify: `public/js/app.js`
- Modify: `public/index.html` (si no existe control equivalente)

- [ ] **Step 1: Exponer opción de variante de copia**
  - Añadir control mínimo (toggle/select/botón secundario) en panel de Medicamentos.
  - Opción por defecto: versión completa (no romper flujo actual).

- [ ] **Step 2: Copiado condicionado por variante**
  - En `copiarMedicamentosAlPortapapeles`, elegir entre:
    - texto completo actual,
    - texto corto nuevo.
  - Reutilizar toasts actuales de éxito/error.

- [ ] **Step 3: Verificación manual rápida**
  - Caso con mezcla de ATB/no ATB y con/sin día.
  - Confirmar contenido exacto en portapapeles.

---

## Task 4: Tendencias con barras por estudio

**Files:**
- Modify: `public/js/app.js`
- (Opcional) estilos existentes en el mismo archivo o CSS ya utilizado por tendencias.

- [ ] **Step 1: Identificar punto de render de tendencias**
  - Localizar función que pinta cada estudio/valor en la vista de tendencias.

- [ ] **Step 2: Resolver rango por estudio**
  - Reusar fuente actual de rangos (si existe).
  - Validar `min/max` numéricos y consistentes.

- [ ] **Step 3: Render de barra**
  - Dibujar barra horizontal por estudio con marcador de valor.
  - Mostrar barra solo cuando el rango exista.
  - Sin rango: conservar solo texto/valor actual.

- [ ] **Step 4: Manejo de extremos**
  - Clamp visual del marcador al inicio/fin.
  - Señal clara de bajo/alto en estilo o etiqueta.

- [ ] **Step 5: Verificación manual**
  - Estudio con rango y valor normal.
  - Estudio con rango y valor alto/bajo.
  - Estudio sin rango (sin barra).

---

## Task 5: QA final y cierre técnico

**Files:**
- Modify: según ajustes de QA

- [ ] **Step 1: Test suite completa**
  - Run: `npm test`

- [ ] **Step 2: Lints en archivos tocados**
  - Revisar `ReadLints` en archivos editados.

- [ ] **Step 3: Smoke test funcional**
  - Medicamentos:
    - pegar listado,
    - procesar receta,
    - copiar completa,
    - copiar corta.
  - Tendencias:
    - confirmar barras por estudio con rango,
    - confirmar ausencia de barras sin rango.

---

## Spec coverage checklist

- [ ] Inclusión de todo `MEDICAMENTOS` sin dependencia de catálogo.
- [ ] Tolerancia a alias de nombre (`ONDASETRON`).
- [ ] Dos variantes de texto libre (completa + corta).
- [ ] `DÍA N` solo para ATB.
- [ ] Barras de tendencia por estudio con rango.
- [ ] Sin barra cuando no haya rango.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-04-medicamentos-tendencias-plan.md`.

Opciones para ejecutar:

1. **Subagent-Driven (recomendado):** ejecutar task por task con revisión entre fases.  
2. **Inline Execution:** ejecutar todo en esta misma sesión con checkpoints manuales.

Indica cuál prefieres y empiezo implementación.
