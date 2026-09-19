# Tour pitch — remediación (flujo, dock, demo, seguridad) — Spec de diseño

**Fecha:** 2026-05-28  
**Relacionado:** `2026-05-28-pitch-tour-design.md` (spec original del tour)  
**Objetivo:** Corregir bugs reportados en el tour pitch de presentación: pasos 13/18/IC/cierre, dock minimizado, datos demo (cultivos, pendientes, hover ATB), y pérdida de pacientes reales al omitir el tour.

---

## 1. Decisiones validadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Alcance | Tour completo: flujo de pasos + dock + datos demo + seguridad al omitir |
| Enfoque técnico | **Orquestador centralizado** en `tour-pitch.mjs` (no parches aislados por paso) |
| Omitir / cerrar tour | Restauración **inmediata** de pacientes reales; borrar todo rastro demo (localStorage / sessionStorage / flags) |
| Dock minimizado | Panel compacto con **texto scrollable**; app **totalmente usable**; **sin spotlight** mientras esté minimizado |
| Badge del dock | Alineado al **callout** cuando existe (p. ej. `⑰ Modo Pase`); slides sin callout → `Pitch · Intro` / `Pitch · El problema` / `Pitch · Cierre` |
| Progreso `Paso N de 29` | **Eliminado** del badge (la numeración del guion es el callout) |

---

## 2. Problemas reportados → causa raíz

| Síntoma | Causa probable |
|---------|----------------|
| Paso 13 (gráfica): dock detrás del modal; spotlight mal; scroll incorrecto | `scrollIntoView` de página en `scrollPitchTendChartIntoView`; z-index dock vs modal; spotlight aplicado antes de que el modal esté listo |
| Paso 13 minimizado: sin filtro pero tour no enfoca “Gráfica” | Política spotlight no distingue dock colapsado; no hay re-aplicación de UI al cambiar paso sin spotlight |
| Paso 18/19: UI no cambia a Modo Pase | Badge “Paso 18” = Listado (⑯); Modo Pase es paso 19 (⑰). Además `applyPitchPaseModeStep` puede no desactivar round overview ni invalidar cache del tablero |
| Salto / IC no visible | Transición `pitch_switch_interconsulta` → `ic_expediente_tabs` reutiliza estado de pase/listado |
| Paso 28/29 no cierra bien | Verificar cadena `pitch_seguridad` → `wrap` → `stopPitchTour`; enrutado `guidedTourClickNext` / `skipGuidedTour` ya delega a pitch si activo |
| Cultivos sin chips S/I/R/ESBL | `pitch_lab_ready` ejecuta `procesarReporte()` y puede sobrescribir entradas de `buildPitchLabHistoryEntries()` sin `sourceText` |
| Pendientes “Sin pendientes” | `seedPitchDemoTodos` puede no ejecutarse antes de la vista que los muestra, o cache de pase |
| Hover ATB no visible con tour | Stacking context del spotlight vs panel `.atb-ris-hover-panel` |
| Omitir tour borra pacientes reales | `clearPitchDemo` sin backup en memoria ni sandbox → `setPatients([])` o lista demo-only persistida |

---

## 3. Arquitectura — orquestador

### 3.1 API interna (`tour-pitch.mjs`)

```
startPitchTour()
  └─ seed + aislamiento + backup sandbox
  └─ enterStep(pitch_intro)

pitchTourClickNext()
  └─ leaveStep(current)
  └─ enterStep(next)
  └─ renderPitchTourStep()
  └─ applyVisuals(next, { dockCollapsed })

skipPitchTour() / stopPitchTour()
  └─ exitPitchTour()
```

| Función | Responsabilidad |
|---------|-----------------|
| `leaveStep(id)` | Cierra modales/dropdowns del paso saliente; si sale de `pitch_modo_pase` → densidad `normal` + invalidar cache pase |
| `enterStep(id)` | Side effects de UI: tabs, innerTab, densidad, modales, seed demo; **no** aplica spotlight |
| `applyVisuals(id, opts)` | Spotlight + posición dock **solo si** `!opts.dockCollapsed` y dock expandido |
| `exitPitchTour()` | Cleanup atómico de persistencia y UI (ver §6) |

### 3.2 Reglas globales

1. **Spotlight:** activo solo con dock **expandido**. Minimizado → `clearPitchSpotlights()`; callout visible en `#tour-dock-body`.
2. **Scroll:** política por paso en targets (`scrollPolicy`); pasos modal → **sin** `scrollIntoView` de página.
3. **Badge:** `#tour-step-badge` = `calloutLabel` si existe; slides sin callout usan etiquetas fijas (§5).
4. **Persistencia:** `setPersistPatientsResolver(null)` **antes** de cualquier `saveState` en salida.

### 3.3 Metadatos en `PITCH_TARGETS`

Campos opcionales nuevos:

```js
{
  scrollPolicy: 'none' | 'target' | 'modal-body',  // default 'target'
  pitchModal: 'tendChart' | 'labSomeTables' | 'estadoPaste',  // ya existe
  setDensity: 'normal' | 'pase',  // ya en pitch_modo_pase
}
```

Ejemplos:

| Paso | `scrollPolicy` | Notas |
|------|----------------|-------|
| `sala_tend_chart` | `none` | Modal ya abierto; dock `top-left` fijo |
| `pitch_modo_pase` | `target` | Scroll suave a `#pase-board-scroll` |
| `listado_problemas` | `target` | Densidad `normal`, inner tab listado |

### 3.4 Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `public/js/tour-pitch.mjs` | Orquestador `leaveStep` / `enterStep` / `applyVisuals` / `exitPitchTour` |
| `public/js/tour-pitch-targets.mjs` | Metadatos `scrollPolicy` |
| `public/js/tour-pitch-demo-seed.mjs` | `reconcilePitchCultivoHistory()`; guardas en `clearPitchDemo` |
| `public/js/features/settings-help.mjs` | `setTourDockCollapsed` notifica al pitch |
| `public/styles/modals.css` | Validar dock minimizado pitch (scroll cuerpo) |
| `public/js/tour-pitch-*.test.mjs` | Tests nuevos (§7) |

---

## 4. Flujo de pasos — fixes concretos

### 4.1 ⑩ Tendencias → ⑪ Gráfica (`sala_tend` → `sala_tend_chart`)

1. `enterStep`: abrir modal (`openTendGroupModal('bh')` con fallback `'qs'`).
2. `scrollPolicy: 'none'` — eliminar scroll de página en `scrollPitchTendChartIntoView`.
3. `applyVisuals` (dock expandido): tras `requestAnimationFrame` ×2, spotlight en `#tend-group-modal` (head + plot + canvas); dock `tour-dock--pitch-front` + `dockFixedCorner: 'top-left'`.
4. Target = modal ya abierto, **no** el botón “Gráfica” de la sección tendencias.

### 4.2 ⑯ Listado → ⑰ Modo Pase (`listado_problemas` → `pitch_modo_pase`)

**`enterStep('listado_problemas')`:**

- `setUiDensity('normal')`
- `setRoundOverviewMode(false)`
- `switchAppTab('nota')` + `switchInnerTab('listado')`
- `seedPitchListadoIfNeeded()` + `renderListadoForm()`
- Body class `pitch-step-listado` (sin `pitch-step-pase-mode`)

**`enterStep('pitch_modo_pase')`:**

1. `setRoundOverviewMode(false)` *(añadir — hoy falta)*
2. `clearPaseDetailEscape()`
3. `setUiDensity('pase')` **antes** de `switchAppTab('nota')`
4. `invalidatePaseBoardCache()` — evitar early-return sin render
5. `seedPitchDemoTodos()`
6. `switchAppTab('nota')` → muestra `#appcontent-pase`, oculta `#appcontent-nota`
7. `syncPaseModeHeaderChip()` + `renderPaseBoard()`
8. Body class `pitch-step-pase-mode`

**`leaveStep('pitch_modo_pase')`:** al pulsar Siguiente, revertir densidad y quitar `pitch-step-pase-mode` antes de Interconsulta.

### 4.3 ⑱ Interconsulta → ⑲ Expediente IC

**`enterStep('pitch_switch_interconsulta')`:**

- `switchAppModeForPitch('interconsulta')`
- Delay ~360ms para `applyAppModeSwitchEffects`
- Spotlight en `#header-app-mode-chip` (solo dock expandido)

**`enterStep('ic_expediente_tabs')`:**

- Modo IC ya activo
- `switchAppTab('nota')` → `switchInnerTab('notas')` → `renderNoteForm()`
- No reutilizar inner tab listado/pase

### 4.4 ㉖ Respaldos → Cierre (`pitch_seguridad` → `wrap`)

- `enterStep('wrap')`: slide fullscreen; ocultar dock; botón “Finalizar” vía `guidedTourClickNext()` → `pitchTourClickNext()` → `stopPitchTour({ celebrate: true })`.
- Test de integración: avanzar desde `pitch_seguridad` a `wrap` y finalizar restaura pacientes reales.
- Copy opcional: diferenciar ㉖ de pasos LiveSync (sin cambiar orden).

---

## 5. Dock minimizado

### 5.1 Comportamiento

| Estado | Spotlight | Navegación app | Dock |
|--------|-----------|----------------|------|
| Expandido | Sí (según paso) | Bloqueada fuera del dock (pointer-events) | Callout + cuerpo + foot |
| Minimizado | **No** | **Libre** | Badge/callout + cuerpo scrollable + foot |

### 5.2 `setTourDockCollapsed(collapsed)` (`settings-help.mjs`)

Si `document.body.classList.contains('pitch-tour-active')`:

- `collapsed === true` → export/hook `onPitchDockCollapsedChange(true)` en tour-pitch → `clearPitchSpotlights()`
- `collapsed === false` → `applyVisuals(pitchStepId, { dockCollapsed: false })`
- Siempre: `schedulePitchDockPlacement()`

### 5.3 CSS (`modals.css`)

Validar reglas existentes bajo `body.pitch-tour-active #tour-dock.tour-dock-collapsed`:

- `#tour-dock-body`: `max-height: min(42vh, 320px)`; `overflow-y: auto`
- `#tour-dock-foot`: visible (Siguiente / Omitir)
- Contenedor dock: `pointer-events: none`; `.tour-dock-inner`: `pointer-events: auto`

### 5.4 Badge

| Paso | Texto badge |
|------|-------------|
| Con `calloutLabel` | Texto del callout (p. ej. `⑰ Modo Pase`) |
| `pitch_intro` | `Pitch · Intro` |
| `pitch_problem_laboratoriazo` | `Pitch · El problema` |
| `wrap` | `Pitch · Cierre` |

---

## 6. Datos demo

### 6.1 Cultivos — `reconcilePitchCultivoHistory()`

Nueva función en `tour-pitch-demo-seed.mjs`:

- Upsert de entradas `PITCH_CULTIVO_LAB_SPECS` en `labHistory['demo-pitch']` por `id`
- Conservar `sourceText: spec.report` (requerido para chips S/I/R/ESBL vía `extractSensCrudasForGermFromSource`)
- Llamar desde `enterStep('pitch_cultivos')` **después** de cualquier procesamiento de lab en pasos anteriores
- `invalidateCultivosTableCache()` + `bumpLabHistoryRevision('demo-pitch')` + `renderCultivosTable()`

### 6.2 Pendientes

- `seedPitchDemoTodos()` en `seedPitchDemo` (ya existe)
- Re-seed defensivo en `enterStep('pitch_modo_pase')` y `enterStep('pitch_cultivos')`
- Tablero pase lee `storage.getTodos(pid)` — debe mostrar ≥4 pendientes para DEMO PÉREZ

### 6.3 Hover antibiograma

- Mantener `z-index: 104600` en `.atb-ris-hover-panel.is-open` con `pitch-tour-active`
- Spotlight no debe aplicar `pointer-events: none` en ancestros de `.cult-atb-ris-chip-wrap`
- Verificar en paso `pitch_cultivos` con dock expandido

---

## 7. Seguridad al omitir / cerrar — `exitPitchTour()`

Orden estricto:

```
1. setPersistPatientsResolver(null)
2. restored = restorePitchPatientsBackup() || readPitchSandboxBackup()?.patients
3. if (restored?.length) setPatients(restored)
   else setPatients(filterOutDemoPatients(current))  // NUNCA []
4. clearPitchDemoTodos()
5. delete demo keys (notes, labHistory, listado, meds, agenda demo, …)
6. clearPitchSandboxBackup()
7. markPitchTourSessionActive(false)
8. setPitchPatientIsolation(false)
9. saveState({ immediate: true })
10. renderPatientList() + reselect paciente real activo
11. UI cleanup: density normal, modo sala, modales, dock, body classes
```

### 7.1 Guardas

- **`patientsForPersistence`:** si aislamiento activo y resolver devuelve `undefined` o array vacío → no escribir lista demo-only a disco
- **`recoverPitchTourPatientsOnBoot`:** reforzar — si solo demos o lista vacía y hay sandbox → restaurar
- **`skipGuidedTour`** y slide “Omitir tour”: deben llamar `skipPitchTour()` cuando pitch activo (ya enruta en `settings-help.mjs`)

### 7.2 Qué se limpia / qué no

| Clave | Acción |
|-------|--------|
| `sessionStorage` `rpc-pitch-tour-sandbox-v1` | remove |
| `sessionStorage` `rpc-pitch-tour-active` | remove |
| `localStorage` `rpc-todos` keys `demo-pitch*` | remove |
| `localStorage` `rpc-pitch-tour-unlock` | **conservar** |

---

## 8. Tests

| Área | Archivo / caso |
|------|----------------|
| Listado → Pase | `enterStep('listado_problemas')` luego `enterStep('pitch_modo_pase')` → densidad pase, `#appcontent-pase` visible |
| Gráfica sin scroll página | `sala_tend_chart` + `scrollPolicy: 'none'` → no `document.scrollIntoView` |
| Cultivos | Tras simular lab process, `reconcilePitchCultivoHistory` mantiene `sourceText` y filas con chips |
| Sandbox skip | Solo backup en sessionStorage → restaura pacientes reales |
| Sandbox skip | Nunca deja `patients.length === 0` si había reales antes del tour |
| Badge | `renderPitchTourStep` en `pitch_modo_pase` → badge `⑰ Modo Pase` |
| Dock colapsado | `applyVisuals(..., { dockCollapsed: true })` → sin clases `tour-spotlight-pitch` |
| Cierre | `pitch_seguridad` → `wrap` → `stopPitchTour` → lista real restaurada |

---

## 9. Fuera de alcance

- Cambiar el orden o número de pasos del guion (sigue 29 pasos lineales)
- Barra de progreso visual “N/29” (fase 2 si se pide)
- Publicar el tour pitch en builds de producción
- Refactor completo a state machine en módulo separado (opción C descartada)

---

## 10. Criterios de aceptación

1. Paso ⑪: modal gráfica visible; dock encima del backdrop (no detrás); sin scroll de página erróneo; spotlight en modal con dock expandido.
2. Paso ⑰: transición visible a tablero Modo Pase con pendientes demo; badge muestra `⑰ Modo Pase`.
3. Paso ⑱→⑲: cambio a Interconsulta visible; expediente IC en pestaña Nota.
4. Dock minimizado: texto scrollable; app navegable; sin spotlight; Siguiente/Omitir funcionan.
5. Cultivos: chips S/I/R/ESBL visibles; hover ATB funciona con tour activo.
6. Omitir o finalizar tour: pacientes reales restaurados de inmediato; nada demo persistido.
7. Cierre (`wrap` → Finalizar): confetti + toast + estado app normal.
