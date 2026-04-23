# Actualizaciones R+ — Fase 1 (modal, progreso, notas, posponer) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir el flujo exclusivo del banner superior por un **modal centrado** (referencia tipo GameHub) con versión, notas de release cuando existan, progreso con **MB descargados / total** y velocidad, estados de copy claros, errores con **reintentar** y enlace opcional, posponer aviso por versión con `localStorage`, e indicador **“Novedades”** tras actualizar; manteniendo `autoInstallOnAppQuit` y la comprobación manual existente.

**Architecture:** El proceso principal (`main.js`) envía cargas IPC enriquecidas (`update-available` con metadatos serializables, `update-progress` con `percent`, `transferred`, `total`, `bytesPerSecond` según `electron-updater`). `preload.js` reexpone callbacks tipados al renderer. La UI vive en `public/index.html` (modal + backdrop) y `public/js/app.js` (máquina de estados); la formateo de bytes/velocidad se concentra en `public/js/update-helpers.mjs` con pruebas `node:test`. El banner actual puede ocultarse o reducirse a reserva: el plan asume **modal como superficie principal** y banner **no mostrado** para el flujo feliz (opcional dejar banner solo para toasts “ya estás actualizado” si se prefiere).

**Tech Stack:** Electron 41, `electron-updater` 6.x, Express server local (`localhost:3738`), renderer ES modules, IPC `contextBridge`, Node built-in `node:test` para helpers.

**Fuente de requisitos:** `docs/superpowers/specs/2026-04-23-actualizaciones-y-producto-roadmap-design.md` — Parte 1, secciones A–D (E y canales beta quedan fuera de esta fase).

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `main.js` | Ensamblar payloads IPC de updater, replay `pendingUpdate`, handler `open-external`, opcional serialización de `releaseNotes` |
| `preload.js` | Exponer listeners y `openExternal` / `installUpdate` |
| `public/index.html` | Marcado y CSS del modal de actualización, z-index sobre el resto |
| `public/js/update-helpers.mjs` | `formatBytes`, `formatProgressLabel` (MB/MB, velocidad) |
| `public/js/update-helpers.test.mjs` | Pruebas de helpers |
| `public/js/app.js` | Orquestación UI: abrir/cerrar modal, snooze, novedades al cambiar versión |
| `package.json` | Script `test` para ejecutar `node --test` |
| `docs/superpowers/specs/2026-04-23-actualizaciones-y-producto-roadmap-design.md` | Sin cambios; solo referencia |

---

### Task 1: Helpers de formato (MB, velocidad) y script de prueba

**Files:**
- Create: `public/js/update-helpers.mjs`
- Create: `public/js/update-helpers.test.mjs`
- Modify: `package.json` (añadir script `test`)

- [ ] **Step 1: Crear `public/js/update-helpers.mjs`**

```javascript
/**
 * @param {number} bytes
 * @returns {string} Ej. "12.3 MB"
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${Math.round(mb)} MB`;
  if (mb >= 10) return `${mb.toFixed(1)} MB`;
  return `${mb.toFixed(2)} MB`;
}

/**
 * @param {number} bytesPerSecond
 * @returns {string} Ej. "1.2 MB/s" o "—" si no aplica
 */
export function formatSpeed(bytesPerSecond) {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '—';
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Etiqueta tipo "Descargando 37.3 MB / 59.2 MB · 1.1 MB/s"
 * @param {{ transferred: number, total: number, bytesPerSecond?: number }} p
 */
export function formatProgressLine(p) {
  const t = formatBytes(p.transferred || 0);
  const tot = formatBytes(p.total || 0);
  const sp = formatSpeed(p.bytesPerSecond);
  return `Descargando ${t} / ${tot} · ${sp}`;
}
```

- [ ] **Step 2: Crear `public/js/update-helpers.test.mjs`**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, formatSpeed, formatProgressLine } from './update-helpers.mjs';

test('formatBytes redondea MB legibles', () => {
  assert.match(formatBytes(39258624), /37\.\d+ MB/);
  assert.match(formatBytes(62075776), /59\.\d+ MB/);
});

test('formatSpeed devuelve — sin tasa', () => {
  assert.equal(formatSpeed(0), '—');
  assert.equal(formatSpeed(-1), '—');
});

test('formatProgressLine concatena partes', () => {
  const s = formatProgressLine({
    transferred: 10 * 1024 * 1024,
    total: 20 * 1024 * 1024,
    bytesPerSecond: 1024 * 1024,
  });
  assert.ok(s.includes('Descargando'));
  assert.ok(s.includes('/'));
});
```

- [ ] **Step 3: Ejecutar pruebas**

Run: `node --test public/js/update-helpers.test.mjs`  
Expected: tres tests `pass`

- [ ] **Step 4: Añadir script en `package.json`**

Dentro de `"scripts"`:

```json
"test": "node --test public/js/update-helpers.test.mjs"
```

- [ ] **Step 5: Commit**

```bash
git add public/js/update-helpers.mjs public/js/update-helpers.test.mjs package.json
git commit -m "test: helpers de formato para progreso de actualización"
```

---

### Task 2: IPC enriquecido desde `main.js` y `open-external`

**Files:**
- Modify: `main.js`
- Modify: `preload.js`

- [ ] **Step 1: Reemplazar el bloque de caché y eventos del autoUpdater** (mantener `let pendingUpdate` pero con forma ampliada; reemplazar handlers `update-available`, `download-progress`, `update-downloaded` y el replay dentro de `did-finish-load`).

Añadir función auxiliar para normalizar notas (GitHub puede enviar string o arreglo):

```javascript
function serializeReleaseNotes(info) {
  if (info == null) return '';
  const n = info.releaseNotes;
  if (n == null) return '';
  if (typeof n === 'string') return n;
  if (Array.isArray(n)) {
    return n
      .map((x) => (typeof x === 'string' ? x : x && x.note ? String(x.note) : ''))
      .filter(Boolean)
      .join('\n');
  }
  return String(n);
}
```

Sustituir el handler `update-available`:

```javascript
autoUpdater.on('update-available', (info) => {
  const payload = {
    version: info.version,
    releaseNotes: serializeReleaseNotes(info),
  };
  pendingUpdate = { type: 'available', ...payload };
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-available', payload);
});
```

Sustituir `download-progress`:

```javascript
autoUpdater.on('download-progress', (p) => {
  const payload = {
    percent: Math.round(p.percent),
    transferred: p.transferred,
    total: p.total,
    bytesPerSecond: p.bytesPerSecond,
  };
  pendingUpdate = { type: 'progress', ...payload };
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-progress', payload);
});
```

`update-downloaded` (mantener versión en payload para coherencia):

```javascript
autoUpdater.on('update-downloaded', (info) => {
  const payload = { version: info.version };
  pendingUpdate = { type: 'ready', ...payload };
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-ready', payload);
});
```

Dentro de `did-finish-load`, ajustar el replay:

```javascript
if (pendingUpdate) {
  if (pendingUpdate.type === 'available')
    mainWindow.webContents.send('update-available', {
      version: pendingUpdate.version,
      releaseNotes: pendingUpdate.releaseNotes || '',
    });
  else if (pendingUpdate.type === 'progress')
    mainWindow.webContents.send('update-progress', {
      percent: pendingUpdate.percent,
      transferred: pendingUpdate.transferred,
      total: pendingUpdate.total,
      bytesPerSecond: pendingUpdate.bytesPerSecond,
    });
  else if (pendingUpdate.type === 'ready')
    mainWindow.webContents.send('update-ready', { version: pendingUpdate.version });
}
```

- [ ] **Step 2: Registrar IPC `open-external`** (después de los demás `ipcMain`):

```javascript
const { shell } = require('electron');
// ya importado arriba — no duplicar import

ipcMain.handle('open-external', async (_e, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
  await shell.openExternal(url);
  return true;
});
```

- [ ] **Step 3: Actualizar `preload.js`**

Sustituir `onUpdateAvailable` para pasar el objeto completo:

```javascript
onUpdateAvailable: function(cb) {
  ipcRenderer.on('update-available', function(_e, payload) { cb(payload); });
},
onUpdateProgress: function(cb) {
  ipcRenderer.on('update-progress', function(_e, payload) { cb(payload); });
},
onUpdateReady: function(cb) {
  ipcRenderer.on('update-ready', function(_e, payload) { cb(payload); });
},
openExternal: function(url) {
  return ipcRenderer.invoke('open-external', url);
},
```

- [ ] **Step 4: Verificación manual rápida**

Run: `npm start`  
Expected: la app arranca sin errores en consola del proceso principal. No es necesario que haya actualización real.

- [ ] **Step 5: Commit**

```bash
git add main.js preload.js
git commit -m "feat(updater): IPC con progreso en bytes y notas de release"
```

---

### Task 3: Modal y estilos en `index.html`

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Añadir CSS** (después de estilos existentes del `#update-banner`, ~línea 73) para backdrop + modal, usando variables `var(--surface)`, `var(--border)`, `var(--text)` para tema claro/oscuro:

```css
#update-modal-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(15, 17, 23, 0.55);
  z-index: 100000;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
html.dark #update-modal-backdrop { background: rgba(0, 0, 0, 0.65); }
#update-modal {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  color: var(--text);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border);
  padding: 22px 24px 20px;
  position: relative;
}
#update-modal h2 { font-size: 17px; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
#update-modal .version-pill {
  font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px;
  background: var(--lab-chip-bg); color: var(--lab-chip-txt);
}
#update-modal .release-notes {
  font-size: 13px; color: var(--text-muted); line-height: 1.45;
  max-height: 120px; overflow-y: auto; margin: 0 0 14px 0; white-space: pre-wrap;
}
#update-modal .release-notes:empty { display: none; }
#update-modal .update-state-msg { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; min-height: 1.3em; }
#update-modal .progress-wrap { height: 10px; background: var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 8px; }
#update-modal .progress-fill { height: 100%; width: 0%; background: var(--action); border-radius: 6px; transition: width 0.25s ease; }
#update-modal .progress-label { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
#update-modal .modal-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
#update-modal button { font-family: inherit; font-size: 13px; cursor: pointer; border-radius: 8px; padding: 8px 14px; }
#update-modal .btn-primary { background: var(--action); color: white; border: none; font-weight: 600; }
#update-modal .btn-primary:hover { background: var(--action-hover); }
#update-modal .btn-secondary { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
#update-modal .btn-link { background: none; border: none; color: var(--action); text-decoration: underline; padding: 8px 6px; font-size: 12px; }
#update-modal .error-box { font-size: 13px; color: var(--error); margin-bottom: 10px; }
```

- [ ] **Step 2: Insertar marcado del modal** justo después del `#update-banner` (antes de `<header>`):

```html
<div id="update-modal-backdrop" aria-hidden="true">
  <div id="update-modal" role="dialog" aria-modal="true" aria-labelledby="update-modal-title">
    <h2 id="update-modal-title">Nueva versión<span class="version-pill" id="update-modal-version-pill" style="display:none;"></span></h2>
    <div class="release-notes" id="update-modal-notes"></div>
    <div class="update-state-msg" id="update-modal-state"></div>
    <div class="error-box" id="update-modal-error" style="display:none;"></div>
    <div class="progress-wrap" id="update-modal-progress-wrap">
      <div class="progress-fill" id="update-modal-progress-fill"></div>
    </div>
    <div class="progress-label" id="update-modal-progress-label"></div>
    <div class="modal-actions" id="update-modal-actions-primary"></div>
    <div class="modal-actions" id="update-modal-actions-secondary" style="margin-top:8px;justify-content:flex-start;"></div>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat(updater): modal de actualización en index.html"
```

---

### Task 4: Lógica de UI y snooze en `app.js`

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Añadir import** al inicio del archivo (junto a los demás imports):

```javascript
import { formatProgressLine } from './update-helpers.mjs';
```

- [ ] **Step 2: Añadir constantes y helpers** (antes del bloque `// ── Auto-updater UI ──`):

```javascript
var UPDATE_SNOOZE_KEY = 'rplus-update-snooze-until';
var UPDATE_DISMISS_VER_KEY = 'rplus-update-dismiss-version';
var LAST_SEEN_VERSION_KEY = 'rplus-last-seen-app-version';

function getUpdateSnoozeUntil() {
  var raw = localStorage.getItem(UPDATE_SNOOZE_KEY);
  var n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function setUpdateSnooze(hours) {
  var h = hours || 24;
  localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + h * 3600000));
}

function isSnoozeActiveForVersion(version) {
  var dismissed = localStorage.getItem(UPDATE_DISMISS_VER_KEY);
  if (dismissed !== version) return false;
  return Date.now() < getUpdateSnoozeUntil();
}

function markDismissedVersion(version) {
  localStorage.setItem(UPDATE_DISMISS_VER_KEY, version || '');
  setUpdateSnooze(24);
}

function showUpdateModal() {
  var el = document.getElementById('update-modal-backdrop');
  if (!el) return;
  el.style.display = 'flex';
  el.setAttribute('aria-hidden', 'false');
}

function hideUpdateModal() {
  var el = document.getElementById('update-modal-backdrop');
  if (!el) return;
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
}

function renderUpdateError(msg) {
  var box = document.getElementById('update-modal-error');
  var state = document.getElementById('update-modal-state');
  var wrap = document.getElementById('update-modal-progress-wrap');
  if (box) { box.style.display = 'block'; box.textContent = msg || 'Error desconocido'; }
  if (state) state.textContent = '';
  if (wrap) wrap.style.display = 'none';
  var actions = document.getElementById('update-modal-actions-primary');
  if (actions) {
    actions.innerHTML = '';
    var retry = document.createElement('button');
    retry.className = 'btn-primary';
    retry.textContent = 'Reintentar';
    retry.onclick = function() {
      if (window.electronAPI && window.electronAPI.checkForUpdates) window.electronAPI.checkForUpdates();
    };
    actions.appendChild(retry);
    var close = document.createElement('button');
    close.className = 'btn-secondary';
    close.textContent = 'Cerrar';
    close.onclick = function() { hideUpdateModal(); };
    actions.appendChild(close);
  }
  showUpdateModal();
}
```

- [ ] **Step 3: Reemplazar el bloque completo** `if (window.electronAPI) { ... onUpdateAvailable ... }` por una versión que:

  1. En `onUpdateAvailable(payload)`: si `isSnoozeActiveForVersion(payload.version)`, return; resetear panel de error; mostrar modal con título “Nueva versión”, pill con `v${payload.version}`, `#update-modal-notes` con `payload.releaseNotes`, estado “Conectando…” luego “Descargando…”, barra visible, botones “Más tarde” (llama `markDismissedVersion` + `hideUpdateModal`) y opcional “Ver seguridad” que abre `https://github.com/mausalas99/r-mas/releases` con `electronAPI.openExternal` si existe.
  2. En `onUpdateProgress(payload)`: actualizar barra `payload.percent`, etiqueta con `formatProgressLine(payload)`, estado “Descargando…”.
  3. En `onUpdateReady(payload)`: barra al 100 % o ocultar barra; texto “Listo para instalar”; botones “Instalar y reiniciar” (`installUpdate`) y “Instalar al cerrar” (solo `hideUpdateModal` + copy que indica que se instalará al salir gracias a `autoInstallOnAppQuit`).
  4. `onUpdateNotAvailable`: puede mantener toast existente **o** modal breve “R+ está actualizado” — elegir una sola vía; recomendado: **toast** `showToast` sin modal para no interrumpir.
  5. `onUpdateError`: llamar `renderUpdateError(msg)`.

- [ ] **Step 4: Tras `getAppVersion` / arranque** (donde ya se rellena `#settings-app-version`), comparar con `LAST_SEEN_VERSION_KEY`: si cambió y la versión anterior existía, mostrar `showToast('Actualizado a v' + current + '. Novedades en Ajustes.', 'success')` o un banner pequeño; guardar `localStorage.setItem(LAST_SEEN_VERSION_KEY, current)`.

Ubicación sugerida: buscar en `app.js` dónde se asigna `settings-app-version` (p. ej. tras `electronAPI.getAppVersion()`) y añadir la comparación allí.

- [ ] **Step 5: Ejecutar pruebas de helpers**

Run: `npm test`  
Expected: todos los tests pasan.

- [ ] **Step 6: Verificación manual**

Run: `npm start`  
Acciones: menú “Buscar actualizaciones…”.  
Expected: sin actualización pendiente, comportamiento de toast o mensaje no bloqueante; si en un entorno de prueba se fuerza `update-available` (opcional, no obligatorio en esta verificación), el modal muestra datos coherentes.

- [ ] **Step 7: Commit**

```bash
git add public/js/app.js
git commit -m "feat(updater): modal con progreso MB, snooze y errores reintentables"
```

---

### Task 5: Banner legado y accesibilidad mínima

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js` (si hace falta ocultar banner por defecto)

- [ ] **Step 1: Decidir uso del `#update-banner`**

Opción recomendada: dejar el nodo en DOM pero **no** usarlo en el flujo feliz (todo por modal). Eliminar o simplificar listeners que solo actualizan el banner si ya no se usan, **o** mantener el banner solo para el mensaje “R+ está actualizado” durante 3 s (si se retira el toast). Documentar la decisión en el mensaje de commit.

- [ ] **Step 2: Añadir foco al modal**

Al `showUpdateModal`, enfocar el primer botón primario o el título con `tabindex="-1"` y `.focus()` si procede (una línea tras mostrar el backdrop).

- [ ] **Step 3: Commit**

```bash
git add public/index.html public/js/app.js
git commit -m "chore(updater): banner vs modal y foco en diálogo"
```

---

### Task 6: Documentar rollback manual

**Files:**
- Modify: `README.md` (si existe en la raíz) **o** crear entrada breve solo si ya hay sección de releases

- [ ] **Step 1: Localizar `README.md`**

Si existe, añadir subsección **“Reinstalar una versión anterior”** con pasos: descargar release anterior desde GitHub `r-mas`, desinstalar o sobrescribir según SO, y en macOS recordatorio de firma/código.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rollback manual de actualizaciones R+"
```

Si no hay README, omitir este task y anotar en el PR que falta documentación de rollback.

---

## Autorrevisión del plan

1. **Cobertura del spec (Parte 1 A–D):** Modal y presentación (A), MB/total y velocidad + estados de copy (B), instalar ahora / al cerrar y posponer por versión (C), errores con reintentar y enlace educativo (D). **No cubierto en esta fase:** canales beta, versión mínima remota, telemetría (E).
2. **Placeholders:** Sin TBD; URLs y claves de `localStorage` están definidas.
3. **Consistencia de tipos:** Los payloads son objetos `{ version, releaseNotes }`, `{ percent, transferred, total, bytesPerSecond }`, `{ version }` en ready; preload y main alineados.
4. **Huecos:** Las notas de release dependen de que `electron-builder` / GitHub publiquen `releaseNotes` en el feed; si vienen vacías, el bloque de notas queda oculto por CSS `:empty`.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-23-actualizaciones-fase1-modal.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Despachar un subagente por task, revisar entre tasks, iteración rápida.

**2. Inline Execution** — Ejecutar tasks en esta sesión con executing-plans, por lotes con checkpoints.

**¿Cuál preferís?**
