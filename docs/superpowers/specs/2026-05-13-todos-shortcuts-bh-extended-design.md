# Pendientes, Shortcuts y Línea blanca extendida — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los steps usan checkboxes (`- [ ]`) para tracking.

**Fecha:** 2026-05-13
**Goal:** Tres mejoras independientes a R+ en un solo spec coordinado:

1. **Pendientes** — to-do list per-paciente dentro del Expediente con prioridades.
2. **Shortcuts** — rework: `CMD+3` → Medicamentos, `CMD+P` → Mi Perfil.
3. **Línea blanca extendida** — parsear todos los campos de BH (incluido frotis manual); excluir absolutos de células blancas y porcentajes del texto consolidado; mostrar todo en tendencias (con porcentajes ocultos por default).

**Architecture:**
- Cambios localizados en `public/js/storage.js`, `public/index.html`, `public/js/app.js`, `public/js/labs.js`.
- Nuevo storage namespace `rpc-todos` (no migración destructiva).
- Una sola fuente de verdad para los campos textuales de BH (constante `BH_TEXT_FIELDS`).
- Tests Node `--test` para parser BH y storage de pendientes.
- Render seguro de UI (DOM API, sin `innerHTML` con datos de usuario).

**Workflow de ramas:**
- Implementación se hace sobre `main`.
- Tras cada feature merged a `main`, propagar a `beta/live-sync` (merge `main` → `beta/live-sync`) para que la beta no quede atrás.

**Tech Stack:**
- HTML/CSS en `public/index.html`.
- JavaScript (ESM) en `public/js/`.
- `localStorage` para persistencia.
- Sin dependencias nuevas.

---

## Feature 1 — Pendientes

### Modelo de datos

```javascript
// localStorage['rpc-todos']
{
  '<patientId>': [
    {
      id: '<uuid o timestamp string>',
      text: '<texto del pendiente>',
      completed: <boolean>,
      priority: 'alta' | 'normal' | 'baja',
      createdAt: '<ISO 8601 string>'
    }
  ]
}
```

### Storage helpers (en `public/js/storage.js`)

- `getTodos(patientId)`:
  - Si no hay map → `[]`.
  - Normaliza shape: cada todo siempre tiene `id`, `text` (string), `completed` (bool), `priority` (default `'normal'`), `createdAt` (default a string vacío si falta).
- `saveTodos(patientId, todos)`:
  - Si `patientId.startsWith('demo-')` → no escribe (consistencia con el resto del módulo).
  - Lee el map completo, sobrescribe la entrada del paciente, persiste.

### Inner tab "Pendientes"

- HTML en `public/index.html`:
  - `<button class="inner-tab" id="itab-todo" onclick="switchInnerTab('todo')">…SVG checklist… Pendientes</button>` dentro de `.inner-tab-bar`.
  - `<div id="itab-content-todo" class="tab-content"><div id="todo-form"></div></div>` dentro de `.patient-view`.
- Orden visual dinámico vía CSS `order` (la regla `.inner-tab-bar` ya es `display: flex`). `renderInnerTabs` setea `element.style.order` numérico en cada `.inner-tab` según el modo, sin mutar el DOM:
  - **Sala:** `datos(1) | pendientes(2) | tend(3) | cult(4) | listado(5)` (notas/indica con `display: none`).
  - **Interconsulta:** `pendientes(1) | notas(2) | indica(3) | tend(4) | cult(5)` (datos/listado con `display: none`).

### Render (`renderTodoForm` en `app.js`)

- Header: `<input type="text">` para nuevo texto + `<select>` con prioridad (alta/normal/baja, default normal) + botón "Agregar". Enter agrega.
- Lista de pendientes con sort:
  - Incompletos primero, completados al final.
  - Dentro de cada grupo: por prioridad (alta → normal → baja).
  - Dentro de cada prioridad: por `createdAt` descendente.
- Cada item: chip de prioridad (color), texto, checkbox completado, botón borrar.
- **Render seguro:** se construye con `document.createElement` y `textContent`. Nunca `innerHTML` con texto de usuario.
- Vacío: "Sin pendientes. Agrega el primero arriba."

### Handlers (en `app.js`, expuestos a `window`)

- `addTodo()` — lee input + select; genera `id` = `String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6)` (timestamp + nonce corto para evitar colisión si se agregan dos en el mismo ms); push al array; persiste; re-renderiza; limpia input.
- `toggleTodo(id)` — flip `completed`; persiste; re-renderiza.
- `deleteTodo(id)` — filter; persiste; re-renderiza.
- `setTodoPriority(id, priority)` — actualiza prioridad; persiste; re-renderiza.

### Estilos (en `public/index.html` CSS)

- Chip de prioridad:
  - `alta` → punto `--danger` (rojo).
  - `normal` → punto `--text-muted` (neutro).
  - `baja` → punto gris claro.
- Item completado: `text-decoration: line-through`, color `--text-muted`.

### Edge cases

- Sin paciente activo: mostrar "Selecciona un paciente.".
- Cambio de paciente con tab Pendientes activa: re-render (hook ya existe en `app.js:2084`, se extiende para `'todo'`).
- Borrado de paciente: la entrada del map se purga (igual que `rpc-notes`, `rpc-indicaciones`).

### Tests (`public/js/storage.test.mjs`, nuevo)

Node `--test` con `assert/strict`:
- `getTodos` retorna `[]` para paciente nuevo.
- `getTodos` normaliza `priority` faltante a `'normal'`.
- `getTodos` retorna `[]` si el JSON guardado es inválido (graceful).
- `saveTodos` no escribe para `patientId` que empiece con `demo-`.
- `saveTodos` preserva entradas de otros pacientes en el map.

Agregar `public/js/storage.test.mjs` al script `test` de `package.json` (no estaba en intento previo).

---

## Feature 2 — Shortcuts rework

### Cambio de handler (en `app.js` ≈ línea 6730)

```javascript
var mod = e.metaKey || e.ctrlKey;
if (mod) {
  var key = e.key.toLowerCase();
  if (key === '1' || key === '2' || key === '3' || key === '4' || key === 'p') {
    e.preventDefault();
    if (key === '1') switchAppTab('lab');
    if (key === '2') switchAppTab('nota');
    if (key === '3') switchAppTab('med');
    if (key === '4') {
      var dd = document.getElementById('settings-dropdown');
      if (dd && !dd.classList.contains('open')) toggleSettingsDropdown();
    }
    if (key === 'p') toggleProfileSection();  // toggle: abre o cierra el modal de Mi Perfil
  }
}
```

### Help text actualizado (en `app.js` ≈ línea 3694)

```
Ctrl/⌘ + 1 — Laboratorio
Ctrl/⌘ + 2 — Expediente
Ctrl/⌘ + 3 — Medicamentos
Ctrl/⌘ + 4 — Ajustes
Ctrl/⌘ + P — Abrir Mi Perfil
Esc — Cerrar modal o el centro de ayuda
```

### Notas

- `CMD+P` está libre en Electron por default (no choca con Print).
- Toggle de perfil reutiliza `toggleProfileSection()` ya definida (`app.js:2404`).
- Verificación manual con teclado físico al final del feature (no test unitario para DOM events).

---

## Feature 3 — Línea blanca extendida en BH

### Campos parseados (clave interna → patrones de match)

| Clave | Patrones (case-insensitive, ancla inicio de palabra) | Origen |
|---|---|---|
| `RBC` | `RBC`, `ERITROCITOS`, `HEMATIES` | BH auto |
| `Hb` (existente) | `HGB`, `HEMOGLOBINA` | BH auto |
| `Hto` (existente) | `HCT`, `HEMATOCRITO` | BH auto |
| `VCM` (existente) | `MCV`, `VCM` | BH auto |
| `HCM` (existente) | `MCH` (sin `MCHC`), `HCM` (sin `CHCM`) | BH auto |
| `CHCM` | `MCHC`, `CHCM` | BH auto |
| `RDW` | `RDW` | BH auto |
| `Leu` (existente) | `WBC`, `LEUCOCITOS` | BH auto |
| `Neu` (existente) | `NEU` que no termine en `%` | BH auto |
| `NeuPct` | `NEU%`, `NEUTROFILOS%` | BH auto |
| `Lin` | `LYM`, `LINFOCITOS` (sin `%` ni `ATIPICOS`) | BH auto |
| `LinPct` | `LYM%`, `LINFOCITOS%` | BH auto |
| `Mono` | `MONO` (sin `%`) | BH auto |
| `MonoPct` | `MONO%`, `MONOCITOS%` | BH auto |
| `Eos` (existente) | `EOS` (sin `%`) | BH auto |
| `EosPct` | `EOS%`, `EOSINOFILOS%` | BH auto |
| `Baso` | `BASO` (sin `%`) | BH auto |
| `BasoPct` | `BASO%`, `BASOFILOS%` | BH auto |
| `Plt` (existente) | `PLT`, `PLAQUETAS` | BH auto |
| `MPV` | `MPV`, `VPM` | BH auto |
| `Bandas` | `BANDAS`, `CAYADOS` | Frotis manual |
| `Mielo` | `MIELOCITOS` | Frotis manual |
| `Metamielo` | `METAMIELOCITOS` | Frotis manual |
| `Promielo` | `PROMIELOCITOS` | Frotis manual |
| `Blastos` | `BLASTOS` | Frotis manual |
| `Atipicos` | `LINFOCITOS ATIPICOS`, `VARIANTES`, `ATIPICOS` | Frotis manual |

Regex distingue `%` con anclaje explícito al final del token o presencia de la cadena `%`. Para los manuales de frotis, el parser actual ya identifica el bloque `FROTIS DE SANGRE PERIFERICA`; se extiende la búsqueda dentro de ese bloque para capturar los conteos numéricos asociados.

### Filtro de texto consolidado (en `app.js`)

Constante única:

```javascript
var BH_TEXT_FIELDS = ['RBC', 'Hb', 'Hto', 'VCM', 'HCM', 'CHCM', 'RDW', 'Leu', 'Plt', 'MPV'];
```

El generador de la línea de texto `BH\tcampo1 valor1 campo2 valor2 ...` solo emite estos campos, en este orden. Todos los demás (absolutos blancos, %, frotis manual) se quedan en `parsed.BH` para tendencias pero no aparecen en el texto pegable.

### Catálogo de tendencias (en `app.js`)

Extender `TEND_SERIES_CATALOG`:

```javascript
{ sectionKey: 'BH', fieldKey: 'RBC',       cardTitle: 'Eritrocitos' },
{ sectionKey: 'BH', fieldKey: 'CHCM',      cardTitle: 'CHCM' },
{ sectionKey: 'BH', fieldKey: 'RDW',       cardTitle: 'RDW' },
{ sectionKey: 'BH', fieldKey: 'Lin',       cardTitle: 'Linfocitos' },
{ sectionKey: 'BH', fieldKey: 'Mono',      cardTitle: 'Monocitos' },
{ sectionKey: 'BH', fieldKey: 'Baso',      cardTitle: 'Basófilos' },
{ sectionKey: 'BH', fieldKey: 'MPV',       cardTitle: 'VPM' },
{ sectionKey: 'BH', fieldKey: 'Bandas',    cardTitle: 'Bandas' },
{ sectionKey: 'BH', fieldKey: 'Mielo',     cardTitle: 'Mielocitos' },
{ sectionKey: 'BH', fieldKey: 'Metamielo', cardTitle: 'Metamielocitos' },
{ sectionKey: 'BH', fieldKey: 'Promielo',  cardTitle: 'Promielocitos' },
{ sectionKey: 'BH', fieldKey: 'Blastos',   cardTitle: 'Blastos' },
{ sectionKey: 'BH', fieldKey: 'Atipicos',  cardTitle: 'Linfocitos atípicos' },
// Porcentajes parseados pero ocultos por default
{ sectionKey: 'BH', fieldKey: 'NeuPct',  cardTitle: 'Neutrófilos %',  hiddenByDefault: true },
{ sectionKey: 'BH', fieldKey: 'LinPct',  cardTitle: 'Linfocitos %',   hiddenByDefault: true },
{ sectionKey: 'BH', fieldKey: 'MonoPct', cardTitle: 'Monocitos %',    hiddenByDefault: true },
{ sectionKey: 'BH', fieldKey: 'EosPct',  cardTitle: 'Eosinófilos %',  hiddenByDefault: true },
{ sectionKey: 'BH', fieldKey: 'BasoPct', cardTitle: 'Basófilos %',    hiddenByDefault: true },
```

Lógica de `hiddenByDefault`:
- Al cargar la app, sembrar `localStorage['rpc-tend-hidden-series']` con los `<sectionKey>:<fieldKey>` marcados solo si la clave **aún no existe** (no sobrescribe preferencias del usuario).
- Una vez sembrado, el usuario puede mostrarlos manualmente desde la barra de "ocultos" sin tocar parser.

### Tests (`public/js/labs-bh-extended.test.mjs`, nuevo)

Node `--test` con `assert/strict`:
- **Bloque BH del lab real** (texto provisto por el usuario): verifica que `parsed.BH` contiene TODAS las claves esperadas con los valores numéricos correctos (incluidos `MCHC`, `RDW`, `Lin`, `Mono`, `Baso`, `MPV`, etc.).
- **Texto consolidado emitido**: contiene solo los campos de `BH_TEXT_FIELDS`, en ese orden; no contiene `Neu`, `Lin`, `Mono`, `Eos`, `Baso` ni ningún `%`.
- **NEU vs NEU%**: cada uno cae en su clave correcta sin colisiones.
- **Bloque FROTIS de sangre periférica** con bandas/mielo/blastos: estos campos terminan en `parsed.BH` (no en el texto del frotis observacional).

Agregar `public/js/labs-bh-extended.test.mjs` al script `test` de `package.json`.

### Migración / backward-compat

- Lab sets ya guardados se re-parsean automáticamente vía `ensureParsedLabHistory(activeId)` cuando se abren → ganan los campos nuevos sin migración explícita.
- Si el usuario ya tenía preferencias de "ocultos" en trends, se respetan; el siembre de `hiddenByDefault` solo aplica si la clave no existía.

---

## Estrategia de testing general

- **TDD por feature**: escribir el test que falla, implementar mínimo, refactorizar.
- `npm test` debe incluir los nuevos archivos (`storage.test.mjs`, `labs-bh-extended.test.mjs`).
- Verificación manual al cierre: arrancar `npm start`, validar shortcuts, agregar pendientes con cada prioridad, pegar el lab real provisto y revisar texto + tendencias.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Regex de `NEU` matchea `NEU%` por accidente | Tests específicos NEU vs NEU%; anclaje explícito en el regex |
| Cambio de orden de tabs rompe estado activo (`activeInner`) | El orden cambia solo visualmente (CSS order o reordenamiento DOM); las claves de estado no cambian |
| XSS en pendientes | Render con `document.createElement` + `textContent`, nunca interpolación HTML |
| Storage `rpc-todos` corrupto | `safeParseObject` ya da `{}` por default; tests validan |
| Sembrar `hiddenByDefault` sobre preferencias del usuario | Solo se siembra si la clave no existe en localStorage |
| `beta/live-sync` queda atrás de `main` | Después de cada feature, merge `main` → `beta/live-sync` con `--no-ff` |
