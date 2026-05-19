# R+ — Modularización app.js + HTML por dominio — Spec de diseño

**Fecha:** 2026-05-19  
**Estado:** Aprobado (brainstorming)  
**Relación:** Evoluciona y actualiza el alcance de `2026-04-13-code-optimization-design.md` al tamaño actual del código (~14.7k líneas en `app.js`, ~5.8k en `index.html`).

---

## 1. Resumen

Subdividir la aplicación en **módulos por dominio** (vertical slices), con archivos de lógica de **~800–1 000 líneas**, HTML/CSS fuente modular ensamblado por un **build ligero**, y **ES modules nativos** (sin bundler).

**Objetivos (prioridad):**

1. **IA / contexto** — ningún archivo de feature deba superar ~1 000 líneas; `app.js` como orquestador < 300 líneas al finalizar.
2. **Mantenibilidad humana** — un bug de “Laboratorio” o “LAN” mapea a una carpeta/archivo acotado.
3. **Calidad** — extraer lógica pura con tests antes de mover DOM; PRs pequeños y reversibles.

**Enfoque:** vertical slice (dominio) con **disciplina extract-test-move** (como los `*-core.mjs` existentes).

**Alcance UI:** `public/js/app.js` + `public/index.html` (markup y CSS inline) + script `build:ui`.  
**No incluye** en la primera tanda: bundler, eliminación masiva de `onclick`, reescritura de `labs.js`, ni features/UX nuevas mezcladas en el refactor.

---

## 2. Estado actual

| Artefacto | Líneas aprox. | Notas |
|-----------|---------------|--------|
| `public/js/app.js` | ~14 700 | Estado global, LAN, pacientes, lab UI, notas, ajustes, atajos |
| `public/index.html` | ~5 800 | Markup + ~4 500 líneas CSS en `<style>` |
| `public/js/labs.js` | ~2 600 | Parsing (ya separado; oleada posterior opcional) |
| `public/js/storage.js` | ~470 | Persistencia |
| `public/js/*.mjs` | varios | Cores ya testeados (`med-receta-core`, `tend-core`, `lan-client`, …) |

La app se sirve en `http://localhost:3738` (Electron). `app.js` es `type="module"`. Los handlers inline del HTML dependen de `Object.assign(window, { … })` al final de `app.js`.

---

## 3. Arquitectura objetivo

```
public/
├── index.html              # GENERADO — no editar a mano
├── index.src.html          # shell: head, scripts, <!-- @include partials/... -->
├── tokens.css
├── styles/
│   ├── base.css
│   ├── layout.css
│   ├── sidebar.css
│   ├── lab.css
│   ├── expediente.css
│   ├── modals.css
│   ├── settings.css
│   └── mobile.css
├── partials/
│   ├── chrome/             # header, update banners, LAN dropdown shell
│   ├── sidebar/
│   ├── main/               # pestañas lab, expediente, medicamentos, agenda
│   └── modals/
└── js/
    ├── app.js              # bootstrap + window bridge (< 300 líneas al final)
    ├── app-state.mjs       # estado en memoria + saveState + migraciones boot
    ├── storage.js
    ├── labs.js
    └── features/
        ├── chrome.mjs
        ├── lan-sync.mjs
        ├── patients.mjs
        ├── expediente.mjs
        ├── lab-panel.mjs
        ├── notes-indicaciones.mjs
        ├── diagrams.mjs      # o diagrams-a.mjs / diagrams-b.mjs si > 1 000
        ├── agenda.mjs
        ├── soap-estado.mjs
        ├── settings-help.mjs
        ├── platform.mjs
        └── productivity.mjs

scripts/
    └── build-ui.mjs        # ensambla index.src.html + valida includes
```

**Reglas:**

- Fuente de verdad: `partials/`, `styles/`, `js/features/`, `index.src.html`.
- `index.html` generado se commitea; el runtime de Electron no exige build en dev salvo que se editen partials.
- Features **no se importan entre sí**; solo `app-state.mjs`, `storage.js`, y módulos `*-core.mjs` existentes.
- Toda mutación de colecciones en memoria y `storage.saveAll` pasa por `app-state.mjs` (`saveState()`).

---

## 4. Capa de estado (`app-state.mjs`)

**Fase 0 obligatoria** antes de mover features.

Exporta (como mínimo):

- Referencias mutables: `patients`, `notes`, `indicaciones`, `labHistory`, `medRecetaByPatient`, `listadoProblemas`, `settings`, `activeId`, `activeAppTab`, `activeInner`, flags de LAN/LiveSync usados globalmente.
- `saveState()` — único punto que llama `storage.saveAll` y dispara `scheduleLiveSyncPush` / mantenimiento de lab history post-guardado.
- Migraciones de arranque hoy en IIFE de `app.js` (p. ej. lab history migration) si aún viven en el monolito.

Las features importan desde `app-state.mjs`; **no** redeclaran `var patients`.

---

## 5. Mapa de features JS

Cada fila ≈ un módulo objetivo de **800–1 000 líneas**. Origen principal según marcadores `// ──` en `app.js`.

| Módulo | Responsabilidad | Origen aproximado en `app.js` |
|--------|-----------------|-------------------------------|
| `chrome.mjs` | Tema, alto contraste, densidad Normal/Pase, i18n `t()`, zoom | 2642–2797, parte de 2798–5246 |
| `lan-sync.mjs` | LAN client, LiveSync merge/push, panel conexión | 154–805, UI panel LAN |
| `patients.mjs` | Lista, pin/archivo, ronda J/K, tarjetas, modal paciente, borrar | 5247–6023, 11189–11685 |
| `expediente.mjs` | Cultivos tabla, pane expediente, listado problemas UI | 1850–2592, 11726–12293 |
| `lab-panel.mjs` | Panel lab, multilab, historial UI, dedupe review | 10128–10665 |
| `notes-indicaciones.mjs` | Nota, indicaciones, generación Word | 11707–12355 |
| `diagrams.mjs` | Diagramas (port Laboratoriazo) | 12356–13595 (~1 240 → partir en dos archivos si al mover supera 1 000) |
| `agenda.mjs` | Agenda semanal procedimientos | lógica agenda (usa `procedure-agenda-week.mjs`) |
| `soap-estado.mjs` | Modal SOAP, Estado Actual | 10666–11188 |
| `settings-help.mjs` | Ajustes, tour guiado, ayuda, release notes, mini tours | 6024–6628, 6629–8610 (subset ayuda/tours) |
| `platform.mjs` | pendingJobs, offline, idle lock, privacidad, backup JSON, auto-updater UI | 7352–8610, 13596–14067 |
| `productivity.mjs` | Undo, focus mode, búsqueda unificada, plantillas extra, atajos Block F | 14068–14475 |

**Ya extraídos (mantener, ampliar tests):** `labs.js`, `storage.js`, `lan-client.mjs`, `tend-core.mjs`, `med-receta-core.mjs`, y el resto de `public/js/*.mjs` con tests en `npm test`.

### Puente `window` (sin cambiar HTML al inicio)

Cada feature exporta:

```js
export const windowHandlers = {
  toggleTheme,
  pasteLabs,
  // solo las que el HTML llama hoy
};
```

`app.js`:

```js
import { windowHandlers as labHandlers } from './features/lab-panel.mjs';
Object.assign(window, labHandlers);
```

**Cero renombres** de funciones en partials hasta una fase opcional posterior (`data-action`).

### Disciplina por PR (extract → test → move)

1. Identificar funciones puras del bloque → mover a `*-core.mjs` existente o nuevo + test.
2. Mover DOM/eventos al `features/*.mjs` importando `app-state`.
3. Registrar `windowHandlers` en `app.js`.
4. `npm test` + smoke manual del slice (tabla §8).
5. Opcional en el mismo PR o el siguiente: partial HTML + CSS del mismo dominio.

---

## 6. Orden de oleadas

```
Fase 0   app-state.mjs + scripts build-ui (esqueleto)
Fase 1   chrome.mjs
Fase 2   lan-sync.mjs
Fase 3   patients.mjs
Fase 4   lab-panel.mjs
Fase 5   expediente.mjs + notes-indicaciones.mjs  (paralelizable en 2 PRs)
Fase 6   soap-estado.mjs + agenda.mjs
Fase 7   settings-help.mjs + platform.mjs
Fase 8   productivity.mjs + diagrams.mjs
```

- Máximo **1–2 features por PR**.
- Sin feature flags: comportamiento idéntico; diff = mover código + imports.
- **Fase 9 (opcional, post app.js):** dividir `labs.js` por familia de parser si sigue siendo cuello de botella para IA.

---

## 7. HTML y CSS

### 7.1 Build UI

`scripts/build-ui.mjs`:

- Resuelve `<!-- @include path/to/partial.html -->` recursivo desde `public/`.
- Falla si include roto o `id` duplicado en el documento ensamblado.
- Escribe `public/index.html` con banner: `<!-- generated by build-ui; edit index.src.html -->`.
- Modo `--check`: exit ≠ 0 si el generado difiere del archivo en disco (CI / prebuild).

### 7.2 Partials (alineados a features)

```
partials/chrome/       update-banner, min-version, header, connection dropdown
partials/sidebar/      aside, patient-list, app-tabs
partials/main/         lab, expediente, medicamentos, agenda
partials/modals/       paciente, SOAP, estado-actual, tendencias, lab-prefs, …
partials/settings/     dropdown ajustes (si no vive en chrome)
```

Cada oleada JS **puede** incluir el partial equivalente; no es bloqueante para extraer JS primero.

### 7.3 CSS

Extraer el bloque `<style>` de `index.html` a `styles/*.css` enlazados desde `index.src.html`. Mantener `tokens.css` como fuente de design tokens. Preservar orden de hojas para no alterar especificidad.

### 7.4 npm scripts

```json
"build:ui": "node scripts/build-ui.mjs",
"build:ui:check": "node scripts/build-ui.mjs --check",
"prebuild:mac": "npm run build:ui && node scripts/fetch-python-mac.js",
"prebuild:win": "npm run build:ui && node scripts/fetch-python.js"
```

En desarrollo diario: ejecutar `build:ui` solo al tocar `index.src.html` o `partials/`.

---

## 8. Verificación

### Automático (cada PR)

- `npm test`
- `npm run build:ui:check` si el PR toca `index.src.html`, `partials/` o `styles/`
- Ningún archivo nuevo en `features/` > ~1 000 líneas

### Smoke manual por slice

| Slice | Comprobar |
|-------|-----------|
| chrome | tema claro/oscuro, densidad Normal/Pase, etiquetas i18n en ajustes |
| lan-sync | unir sala, sincronizar paciente, desconectar |
| patients | crear, archivar, pin, ronda J/K, eliminar |
| lab-panel | pegar labs, historial, multilab |
| expediente | pestañas, cultivos, listado problemas |
| notes | nota Word, indicaciones |
| agenda | semana procedimientos, crear/editar evento |
| settings/platform | backup JSON, idle lock, buscar actualizaciones |
| productivity | ⌘/Ctrl+K búsqueda, undo, plantillas extra |

**Criterio de oleada completa:** paridad funcional con el commit anterior; sin cambios de producto en el mismo PR.

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Estado inconsistente entre features | Fase 0 `app-state.mjs`; prohibido redeclarar colecciones globales |
| `onclick` no resuelve | `windowHandlers` por feature; registro central en `app.js` |
| HTML generado desactualizado | `build:ui:check` en prebuild / CI |
| Imports circulares | features solo importan `app-state` + cores |
| PR demasiado grande | 1–2 módulos por PR; `diagrams` en dos archivos si hace falta |

---

## 10. Fuera de alcance (primera tanda)

| Ítem | Qué se pospone | Fase sugerida después |
|------|----------------|------------------------|
| Bundler (Vite/webpack) | Tree-shaking, HMR unificado, TS | Solo si se adopta TypeScript o muchos chunks lazy |
| Sustituir `onclick` por delegación | HTML sin inline handlers, CSP estricta | Oleada opcional dedicada |
| Partir `labs.js` | Parsers en archivos < 1 000 líneas para IA | Fase 9 |
| Features / UX nuevas | Evitar depurar refactor + producto a la vez | Tras cerrar fase 8 |

**No se pierde** con esta exclusión: modularización de `app.js`, HTML/CSS fuente partido, tests en cores, y objetivo principal de contexto IA en la UI de la app.

---

## 11. Criterios de éxito

- `app.js` < 300 líneas (solo bootstrap + `Object.assign(window, …)` + orden de `init`).
- Ningún `features/*.mjs` > ~1 000 líneas (salvo excepción documentada y temporal).
- `index.html` generado; CSS fuera del monolito inline.
- `npm test` verde en cada PR de oleada.
- Checklist smoke §8 pasada por el slice tocado.

---

## 12. Próximo paso

Tras revisión de este spec por el usuario: invocar skill **writing-plans** para el plan de implementación fase por fase (PRs, archivos tocados, tests).
