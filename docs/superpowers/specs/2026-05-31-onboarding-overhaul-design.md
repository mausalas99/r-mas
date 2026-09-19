# Overhaul de onboarding R+ — Spec de diseño

**Fecha:** 2026-05-31  
**Versión app de referencia:** 6.5.x (rama en desarrollo)  
**Referencias:** [Designer Up — 200+ onboarding flows](https://designerup.co/blog/i-studied-the-ux-ui-of-over-200-onboarding-flows-heres-everything-i-learned/); código actual en `tour-targets.mjs`, `settings-help.mjs`, `header.html` (intro + centro de ayuda).

**Objetivo:** Reorganizar el onboarding para que el residente de **Sala** obtenga una **primera victoria** clara (laboratorio procesado + paciente visible), mantenga un **tour largo** para perfiles poco tecnológicos, permita **pausar y retomar**, navegue **hacia atrás** sin romper estado, y concentre el aprendizaje en un hub **Aprender R+**. La integración **Neo** (app companion) queda fuera del hilo núcleo.

---

## 1. Problema actual

| Síntoma | Causa probable |
|---------|----------------|
| Sensación de desorden | Múltiples entradas (intro, tutorial completo, mini-tours Lab/Ajustes, presentación, import DEMO) en el mismo centro de ayuda |
| No enseña el “máximo potencial” de forma digerible | Tour lineal tipo catálogo de UI antes del valor (lab tardío; muchas pestañas seguidas) |
| Frustración en no-técnicos | Párrafos largos en intro; 21 pasos sin capítulos ni victorias intermedias |
| Neo mezclado con R+ base | Pasos Casiopea/Neo en medio del flujo Sala aunque requieren app companion instalada |
| Interrupciones del turno | Sin guardar paso; sin **Anterior**; reiniciar implica perder contexto |

---

## 2. Usuario y éxito

| Dimensión | Decisión |
|-----------|----------|
| Usuario primario | **Residente / interno de Sala** (ronda, varios pacientes, lab SOME diario) |
| Primera victoria | Pegar lab → **Procesar** → **ver paciente con resultados** en R+ |
| Profundidad | **Tour largo** casi completo (misma cobertura que hoy), **reordenado** y por **capítulos** |
| Interconsulta | Rama **secundaria**; intro mantiene **dos tarjetas iguales** con copy **más corto** |
| Perfil poco tecnológico | Copy imperativo, una idea por bloque, hitos por capítulo; no reducir cobertura del tour |

---

## 3. Principios (Designer Up aplicados a R+)

1. **Personalización:** bifurcación Sala / Interconsulta en intro (tarjetas equivalentes).
2. **Progressive disclosure:** capítulos; Neo como extensión opcional; módulos del hub = subrangos del tour.
3. **Primera victoria rápida dentro del tour largo:** Capítulo 1 completo antes de expediente avanzado.
4. **No “escape room”:** Omitir tutorial, Pausar, Continuar después; **Anterior** en todo paso no-acción.
5. **Idempotencia al retroceder:** no deshacer lab procesado; si el estado ya avanzó, permitir **Siguiente** con copy aclaratorio.

---

## 4. Enfoque de implementación

**Enfoque híbrido (3):** conservar motor actual (dock, spotlights, `applyTourTargetForStep`, demo DEMO PÉREZ) y añadir:

- `public/js/onboarding-curriculum.mjs` — metadatos de capítulos, módulos hub, flag `companion`
- Persistencia `rpc-guided-tour-progress` separada de `rpc-guided-tour-done-for-version`
- Hub **Aprender R+** unificado (absorbe mini-tours sueltos)

No se requiere migrar todo el copy del `switch` de `renderTourStep` al currículo en el primer PR; el currículo define **orden, capítulo y companion**; el copy puede migrarse por fases.

---

## 5. Arquitectura de información

### 5.1 Momentos de entrada

| Momento | Comportamiento |
|---------|----------------|
| Primera vez / nueva versión sin tour hecho | Modal **Bienvenido a R+** → elegir Sala o Interconsulta → iniciar tour |
| Tour en curso | Dock visible; banner **Continuar tutorial (paso X)** si hubo pausa |
| Siempre | **Ajustes → Aprender R+** (sustituye sección dispersa de tours en ayuda rápida) |

### 5.2 Hub «Aprender R+»

```
Aprender R+
├── [Continuar tutorial]          ← visible si rpc-guided-tour-progress válido
├── [Reiniciar tutorial · Sala]
├── [Tutorial · Interconsulta]
├── Módulos (entrada a paso inicial del rango)
│   ├── Laboratorio y pacientes      (Cap. 1)
│   ├── Expediente                   (Cap. 2)
│   ├── Clínico avanzado             (Cap. 3)
│   ├── Ronda y salida               (Cap. 4)
│   └── Equipo (LiveSync + móvil)    (Cap. 5)
├── Extensiones
│   └── Neo (app companion)
│       ├── Laboratorio → tablas SOME
│       └── Tendencias
└── Avanzado (colapsado)
    ├── Modo presentación / DEMO PÉREZ
    └── Tour pitch (atajo existente; sin cambio de disparador)
```

- Los **mini-tours** actuales `lab` y `ajustes` se **eliminan como botones sueltos**; su contenido queda cubierto por módulos o reinicio de capítulo.
- **Release notes** siguen siendo modal aparte; si el tour gana pasos en una versión, banner opcional en Aprender R+ («2 pasos nuevos») sin borrar progreso si `stepId` sigue en el currículo.

### 5.3 Intro modal

- **Dos tarjetas del mismo peso visual** (Sala / Interconsulta).
- Copy **corto**: qué lograrán (lab + expediente + equipo), duración orientativa (~15 min), DEMO PÉREZ no persiste.
- **Omitir tutorial** visible (como hoy).

---

## 6. Currículo tour Sala (núcleo R+)

### 6.1 Capítulos y orden de pasos

Los `stepId` existen en `tour-targets.mjs`; solo cambia el **orden** y la **pertenencia** a capítulo / companion.

| Capítulo | ID | Pasos (`stepId`) | Notas |
|----------|-----|------------------|-------|
| **1 · Paciente y laboratorio** | `ch-patient-lab` | `map_sidebar` → `map_tabs` → `map_lab_teaser` → `lab_bulk_separator` → `lab_parse` → `lab_view` → **`servicio_default`** | **Victoria:** lab procesado. **`servicio_default` al final del capítulo 1** — paso breve: confirmar servicio por defecto (p. ej. Medicina Interna) para priorización; cierra ingreso antes del expediente. **No** en Cap. 5. |
| **2 · Expediente** | `ch-chart` | `sala_expediente_tabs` → `historia_clinica` → `eventualidades` | Solo rama Sala |
| **3 · Clínico avanzado** | `ch-clinical-tools` | `sala_manejo` → `sala_tend` → `sala_tend_chart` | Sin pasos Neo |
| **4 · Ronda y salida** | `ch-round` | `estado_actual` → `sala_med` → `listado_problemas` | `estado_actual` sigue siendo ACTION_STEP |
| **5 · Equipo** | `ch-team` | `livesync_desktop` → `livesync_mobile` → `wrap` | Sin `servicio_default` aquí |

**Orden lineal resultante (19 pasos):**

`map_sidebar`, `map_tabs`, `map_lab_teaser`, `lab_bulk_separator`, `lab_parse`, `lab_view`, `servicio_default`, `sala_expediente_tabs`, `historia_clinica`, `eventualidades`, `sala_manejo`, `sala_tend`, `sala_tend_chart`, `estado_actual`, `sala_med`, `listado_problemas`, `livesync_desktop`, `livesync_mobile`, `wrap`

### 6.2 Extensión Neo (`companion: 'neo'`)

Pasos **fuera** de `getSalaTourSteps()` lineal:

| Módulo hub | `stepId` | Copy orientativo |
|------------|----------|------------------|
| Neo · Laboratorio | `sala_casiopea_lab` | Requiere Neo instalada; en tutorial el envío no abre Neo |
| Neo · Tendencias | `sala_casiopea_trends` | Idem; botón envío resaltado |

- Badge dock: **«Extensión · Neo»**, no cuenta en «Paso N de 19» del tour base.
- Mensaje explícito: *«R+ funciona sin Neo; esto es opcional si usas la app companion.»*

### 6.3 Tour Interconsulta

- Misma filosofía: **lab primero** (`map_*` … `lab_view`).
- Reordenar IC de forma análoga; **sin** pasos Neo en el hilo IC salvo requisito futuro.
- Orden de referencia actual a revisar en implementación: tras lab, `ic_expediente_tabs`, manejo/tendencias, SOAP/nota/indica, exports, profile, livesync, wrap.

### 6.4 Esquema currículo (`onboarding-curriculum.mjs`)

```js
// Forma conceptual (no API final congelada)
export const SALA_CHAPTERS = [
  { id: 'ch-patient-lab', title: 'Paciente y laboratorio', stepIds: [...] },
  // ...
];

export const NEO_COMPANION_MODULE = {
  companion: 'neo',
  title: 'Neo (app companion)',
  stepIds: ['sala_casiopea_lab', 'sala_casiopea_trends'],
};

export function getSalaTourSteps() {
  return SALA_CHAPTERS.flatMap((c) => c.stepIds);
}

export function getChapterForStep(stepId) { /* ... */ }
export function getModuleStartIndex(moduleId) { /* ... */ }
```

`tour-targets.mjs` conserva `TARGETS` y `ACTION_STEPS`; `SALA_STEPS` exportado se deriva del currículo o se mantiene sincronizado por test.

---

## 7. Dock y navegación

### 7.1 Controles

| Control | Acción |
|---------|--------|
| **← Anterior** | `index - 1`, `applyTourTargetForStep`, `renderTourStep`; deshabilitado en paso 0 |
| **Siguiente** | Oculto en `ACTION_STEPS` hasta acción del usuario |
| **Pausar y salir** | Escribe `rpc-guided-tour-progress`, oculta dock, muestra banner continuar |
| **Omitir tutorial** | `rpc-guided-tour-done-for-version` + limpiar progreso + cleanup demo |

### 7.2 Badge y progreso

- Formato: `Capítulo 2 · Expediente · Paso 4 de 7 · Sala`
- Barra o pills de 5 capítulos (tour base); Neo no incrementa el total base.
- Al completar Cap. 1: toast o línea en dock — *«Listo: DEMO PÉREZ ya tiene laboratorio en R+.»*

### 7.3 ACTION_STEPS (sin cambio de lista)

`lab_parse`, `estado_actual`, `servicio_default` (+ IC: `ic_nota`, `ic_indica`).

### 7.4 Idempotencia al retroceder (obligatorio)

| Regla | Detalle |
|-------|---------|
| Datos demo | No borrar `labHistory` / texto procesado al ir a paso anterior |
| `lab_parse` | Si el lab ya fue procesado, mostrar **Siguiente** y copy: *«Ya procesaste el ejemplo; puedes continuar.»* |
| Modales | Cerrar perfil/ajustes/conexión que el paso actual no requiera (lógica existente) |
| `servicio_default` | Si el servicio ya quedó guardado, permitir avanzar sin re-forzar guardado |

---

## 8. Persistencia

### 8.1 Claves `localStorage`

| Clave | Contenido | Cuándo se escribe |
|-------|-----------|-------------------|
| `rpc-guided-tour-done-for-version` | Versión normalizada (existente) | Completar tour u omitir |
| `rpc-guided-tour-progress` | `{ branch, stepId, chapterId, curriculumVersion, updatedAt }` | Pausar; opcional cada paso (debounce) |

Al completar u omitir el tour: borrar `rpc-guided-tour-progress` y escribir `rpc-guided-tour-done-for-version`.

### 8.2 Continuar tutorial

- Al cargar app: si hay progreso y no está done-for-version actual → banner + ítem **Continuar** en Aprender R+.
- Restaurar: rama, paso, re-seed demo si faltan DEMO PÉREZ/GARCÍA, `applyTourTargetForStep`, dock visible.

### 8.3 Nueva versión de app

- Si `curriculumVersion` o lista de `stepId` cambia: migrar progreso al paso más cercano válido o ofrecer reinicio solo del capítulo afectado.
- Release notes **no** reemplazan el tour; banner en Aprender R+ si hay pasos nuevos.

---

## 9. Copy y accesibilidad

- Imperativo: «Pega», «Pulsa Procesar», «Mira la columna izquierda».
- Máximo **2 párrafos** por paso; el segundo solo para matices (`font-size` muted).
- Intro: eliminar listados de todas las sub-pestañas; remitir al tour.
- `aria-live` en dock (existente); botones con `aria-label` para Anterior / Pausar.

---

## 10. Fuera de alcance (este overhaul)

- Rediseño visual completo del centro de ayuda (artículos / búsqueda) más allá de la sección Aprender R+.
- Cambios al tour **pitch** (disparador ⌥⌘⇧P, scrim pitch).
- Envío real a Neo durante cualquier tour (sigue bloqueado por guards existentes).
- Onboarding **in-app** just-in-time por feature (fase posterior; el hub de módulos lo habilita).

---

## 11. Archivos previstos

| Archivo | Cambio |
|---------|--------|
| `public/js/onboarding-curriculum.mjs` | **Nuevo** — capítulos, módulos, Neo companion |
| `public/js/onboarding-curriculum.test.mjs` | **Nuevo** — orden Sala, 19 pasos, Neo fuera del lineal, `servicio_default` tras `lab_view` |
| `public/js/tour-targets.mjs` | `SALA_STEPS` alineado al currículo; Neo solo en export companion |
| `public/js/features/settings-help.mjs` | Anterior, Pausar, persistencia, hub, intro copy, milestone cap. 1, idempotencia lab |
| `public/partials/chrome/header.html` | Sección Aprender R+; intro acortado |
| `public/styles/modals.css` o `help.css` | Estilos hub / barra capítulos |
| `public/js/tour-targets.test.mjs` | Actualizar orden y conteos |

---

## 12. Criterios de aceptación

1. Tour Sala inicia con sidebar + lab; **`servicio_default` es el último paso del Capítulo 1** (después de `lab_view`).
2. Pasos Neo **no** aparecen al avanzar Siguiente en el tour base; solo vía módulo Neo en Aprender R+.
3. **Anterior** y **Pausar** funcionan; **Continuar** restaura paso y rama.
4. Retroceder después de procesar lab **no** borra resultados; **Siguiente** disponible si ya procesado.
5. Centro de ayuda **no** lista mini-tours Lab/Ajustes sueltos; viven bajo Aprender R+.
6. Intro: dos tarjetas equivalentes, copy más corto que el actual.
7. Tests de currículo y orden de pasos en CI (`npm test`).

---

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| `settings-help.mjs` crece más | Extraer `onboarding-progress.mjs` y `onboarding-dock.mjs` si el PR supera ~400 líneas tocadas |
| Desincronía currículo vs `TARGETS` | Test único que compare `getSalaTourSteps()` con capítulos |
| Usuario pausa en ACTION_STEP | Guardar `stepId`; al continuar, re-evaluar idempotencia (lab ya procesado) |

---

## 14. Siguiente paso

Tras aprobación de este spec: invocar skill **writing-plans** → `docs/superpowers/plans/2026-05-31-onboarding-overhaul.md` con tareas TDD por fase (currículo → reorden → dock/persistencia → hub → copy → tests).
