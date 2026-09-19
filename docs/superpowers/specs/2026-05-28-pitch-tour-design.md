# Tour pitch (presentación) — Spec de diseño

**Fecha:** 2026-05-28  
**Versión app de referencia:** 6.3.x  
**Objetivo:** Tercer tour in-app, oculto, lineal (~28 pasos), para pitch presencial de 12–15 min. Recorre R+ con datos demo completos, guía visual fuerte para la audiencia, sin Manejo clínico. Build local; no destinado a publicar en GitHub (revertible).

---

## 1. Contexto

R+ ya tiene:

- Tour guiado **Sala** e **Interconsulta** (`tour-targets.mjs`, `settings-help.mjs`)
- Mini-tours Laboratorio y Ajustes
- Paciente `demo-onboarding` (DEMO PÉREZ), dock `#tour-dock`, clases `tour-spotlight-action` / `tour-spotlight-soap`

El **tour pitch** es independiente: no altera `rpc-guided-tour-done-for-version` ni la bienvenida por versión.

---

## 2. Decisiones validadas

| Tema | Decisión |
|------|----------|
| Relación con tours existentes | Tercer tour nuevo; no reemplaza Sala/IC |
| Disparador | Atajo **⌥⌘⇧P** → `localStorage['rpc-pitch-tour-unlock']=1` → botón en Ajustes → Ayuda |
| Flujo de modos | Lineal; cambio automático Sala → Interconsulta en paso dedicado |
| Manejo clínico | **Excluido** (sin paso ni copy que prometa Electrolitos/ATB/CAD) |
| Interconsulta documentos | **Sí** Nota .docx, Indicaciones .docx, Receta HU |
| Datos demo | Seed completo al iniciar (labs, cultivos S/I/R, EA 3 días, notas, etc.) |
| Guía visual | **Reforzada** vs tour normal (scrim + spotlight pitch + callouts numerados) |
| Distribución | Solo build local del presentador; revertir borrando módulos pitch |

---

## 3. Guía visual para audiencia (requisito central)

El pitch se proyecta o se comparte pantalla: la UI debe **señalar inequívocamente** qué mirar en cada paso.

### 3.1 Capas

| Capa | Elemento | Comportamiento |
|------|----------|----------------|
| Scrim | `#tour-pitch-scrim` | Overlay fijo `rgba(0,0,0,0.45)` sobre toda la app; `z-index` justo debajo de spotlights |
| Spotlight primario | `.tour-spotlight-pitch` | Outline 3px verde clínico (`#0d9488` / `#2dd4bf` dark), offset 4px, pulso más lento y visible que `tour-spotlight-action` |
| Spotlight secundario | `.tour-spotlight-pitch-secondary` | Outline punteado tenue para zonas de contexto (p. ej. barra de pestañas cuando el foco es un botón) |
| Callout en dock | `#tour-dock-body .tour-pitch-callout` | Línea destacada: **「①」** + frase corta (“Mira el recuadro verde”) alineada al `calloutLabel` del paso |
| Dock | `#tour-dock` | Clase `tour-dock--pitch`: borde acento, badge “Pitch · Paso N de 28” |
| Scroll | `scrollIntoView({ block: 'center' })` | Siempre al aplicar paso |

### 3.2 Reglas por paso (`tour-pitch-targets.mjs`)

Cada paso define:

```js
{
  selector: '#lab-output-section',      // CSS; puede ser lista separada por coma
  secondarySelector: '#main-area',     // opcional
  spotlight: 'primary' | 'secondary' | 'both',
  dockLeft: true,                      // evita tapar CTAs arriba-derecha
  calloutLabel: '① Resultados procesados',
  scrim: true,                         // default true en pitch
}
```

- **Siempre** aplicar spotlight al menos al `selector` principal.
- Pasos de **mapa amplio** (`aside`, `#main-area`): spotlight en región completa + callout “① Barra lateral”.
- Pasos con **modal** (Tablas SOME, gráfica tendencias): abrir modal en `applyPitchTourStep` y spotlight al botón o panel interior.
- Al cambiar paso: `clearPitchTourVisuals()` quita scrim, clases pitch y spotlights legacy.

### 3.3 Contraste con tour normal

| | Tour Sala/IC | Tour pitch |
|---|--------------|------------|
| Scrim | No | Sí |
| Clase spotlight | action/soap | `tour-spotlight-pitch` |
| Callout numerado en dock | No | Sí |
| Pulso | Estándar | Más grande / lento |

Reutilizar `applyTourTargetForStep` **no** es obligatorio; preferir `applyPitchTourStep` en `tour-pitch.mjs` copiando la navegación (tabs, modales) para no acoplar `guidedTourActive`.

---

## 4. Arquitectura de módulos

| Módulo | Responsabilidad |
|--------|-----------------|
| `tour-pitch-steps.mjs` | `PITCH_TOUR_STEPS` (28 ids), metadatos callout |
| `tour-pitch-targets.mjs` | Targets + `getPitchTourTarget(stepId)` |
| `tour-pitch-demo-seed.mjs` | `seedPitchDemo()`, `clearPitchDemo()` |
| `tour-pitch.mjs` | Estado, atajo unlock, start/stop/next, scrim/spotlight, cambio modo, Modo Pase |
| `settings-help.mjs` | Botón condicional; delegación mínima si hace falta export |
| `modals.css` | Estilos scrim + `tour-spotlight-pitch*` + `tour-dock--pitch` |
| `index.html` o `overlays.html` | `#tour-pitch-scrim` (vacío, toggled por JS) |

**Guards:** extender `tour-guards.mjs` con `pitchTourActive` / `stepId` para bloquear envío Neo en pasos pitch equivalentes.

---

## 5. Guion de 28 pasos

Badge: `Pitch · Paso N de 28`. Leyenda: **S** = Siguiente, **A** = acción opcional, **M** = mutación UI automática.

| # | id | Modo | Tipo | Foco visual (callout) | Contenido |
|---|-----|------|------|------------------------|-----------|
| 1 | `pitch_intro` | Sala | S | — (sin scrim o scrim ligero) | Problema + propuesta (3 bullets); sin instalación |
| 2 | `map_sidebar` | Sala | S | ① Lista de pacientes | DEMO PÉREZ + DEMO GARCÍA |
| 3 | `map_tabs` | Sala | S | ② Pestañas principales | Lab · Expediente · Meds · Agenda |
| 4 | `pitch_mode_chips` | Sala | S | ③ Modo de trabajo | Chips Sala / Interconsulta |
| 5 | `map_lab_teaser` | Sala | S | ④ Cuadro SOME | Texto 2 días pre-cargado |
| 6 | `lab_bulk_separator` | Sala | S | ⑤ Separador multipaciente | Hint modal opcional |
| 7 | `pitch_lab_ready` | Sala | S | ⑥ Resultados + diagramas | Labs ya en historial; sin “Procesar” |
| 8 | `sala_casiopea_lab` | Sala | S | ⑦ Tablas SOME | Botón resaltado; Neo bloqueado |
| 9 | `sala_expediente_tabs` | Sala | S | ⑧ Pestañas expediente | Sin mencionar Manejo |
| 10 | `pitch_cultivos` | Sala | S | ⑨ Cultivos + antibiograma | S / I / R / ESBL visibles |
| 11 | `sala_tend` | Sala | S | ⑩ Tendencias | Mini-gráficas |
| 12 | `sala_tend_chart` | Sala | S/A | ⑪ Gráfica pantalla completa | Modal opcional |
| 13 | `sala_casiopea_trends` | Sala | S | ⑫ Enviar a Neo (tendencias) | |
| 14 | `estado_actual` | Sala | S | ⑬ Estado Actual | Gráficas 3 días |
| 15 | `pitch_pegar_monitoreo` | Sala | S/A | ⑭ Pegar monitoreo | Botón resaltado |
| 16 | `sala_med` | Sala | S | ⑮ Medicamentos | Receta demo |
| 17 | `listado_problemas` | Sala | S/A | ⑯ Listado de problemas | |
| 18 | `pitch_modo_pase` | Sala | M+S | ⑰ Modo Pase | `setUiDensity('pase')` |
| 19 | `pitch_switch_interconsulta` | IC | M | ⑱ Cambio a Interconsulta | Auto `appMode` |
| 20 | `ic_expediente_tabs` | IC | S | ⑲ Expediente IC | Nota · Indica · Salida |
| 21 | `ic_nota` | IC | A | ⑳ Generar Nota | Prellenada; dockLeft |
| 22 | `ic_indica` | IC | A | ㉑ Generar Indicaciones | Prellenada; dockLeft |
| 23 | `pitch_receta_hu` | IC | S | ㉒ Receta HU | PDF demo |
| 24 | `pitch_agenda` | IC | S | ㉓ Agenda | 1–2 eventos demo |
| 25 | `livesync_desktop` | IC | S | ㉔ Sala en vivo | ⇄ |
| 26 | `livesync_mobile` | IC | S | ㉕ R+ Móvil | |
| 27 | `pitch_seguridad` | IC | S | ㉖ Respaldos y datos | Ajustes |
| 28 | `wrap` | Sala* | S | — | Cierre; restaurar Normal + modo Sala |

---

## 6. Seed de datos demo

### 6.1 Cultivos (`pitch_cultivos`)

Inyectar en historial de labs de DEMO PÉREZ (vía `procesarLabs` sobre texto SOME compuesto):

1. **HEMOCULTIVO** — *Pseudomonas aeruginosa* — ATB con **R** (ej. CAZ), **I** (FEP), **S** (CIP, MERO, PIP/TAZO).
2. **UROCULTIVO** — *Klebsiella pneumoniae* — **ESBL** + mezcla S/R.
3. **CATÉTER** o **LÍQUIDO PERITONEAL** — segundo aislamiento con perfil distinto.

Validar en test: salida parseada contiene marcadores `S`, `I`, `R` y resumen condensado ATB.

### 6.2 Estado Actual (`estado_actual`)

`patient.monitoreo.historial` con **3 días calendario** (hoy, ayer, anteayer) y **≥8 mediciones** totales:

- Por día: 2–3 `recordedAt` ISO con `vitals` (tas, tad, fc, fr, temp, sat), `glucometrias[]` con hora, `io.ing`/`io.egr`.
- Tendencia visible en glucosas y al menos un SV.
- `estadoClinico` con campos de ejemplo (analgesia, abx, dieta).

Test: `historialSortedAsc` abarca ≥3 fechas distintas (día local) y ≥8 entradas con `medicionHasCoreData`.

### 6.3 Otros seeds

- Nota: evolución + diagnósticos ficticios (DEMO PÉREZ).
- Indicaciones: texto de órdenes listo para .docx.
- Meds, listado peritonitis, receta HU, agenda, pendientes — reutilizar helpers existentes donde aplique.

---

## 7. Disparador y cleanup

- **Unlock:** `⌥⌘⇧P` en `platform.mjs` o `app-shell.mjs` (evitar conflicto con atajos existentes).
- **Botón:** `#btn-start-pitch-tour` en settings help; `display:none` hasta unlock.
- **Stop/Omitir:** `clearPitchDemo()` + quitar scrim/spotlights + restaurar `uiDensity` y preferiblemente `appMode: 'sala'`.
- **Persistencia:** no escribir `GUIDED_TOUR_LS_KEY`.

---

## 8. Pruebas

- `tour-pitch-demo-seed.test.mjs` — cultivos S/I/R; historial EA 3 días.
- `tour-pitch-targets.test.mjs` — cada paso tiene selector + calloutLabel.
- Manual: activar unlock → iniciar tour → verificar scrim + spotlight verde en cada paso.

---

## 9. Reversión

Eliminar: `tour-pitch*.mjs`, estilos pitch, `#tour-pitch-scrim`, cableado en settings/platform/index, tests. No tocar pasos Sala/IC existentes salvo exports compartidos.
