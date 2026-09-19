# R+ UI Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 independent UI improvements: abbreviated lab date format, patient form layout fix, global dark mode, and auto-updater progress banner.

**Architecture:** All renderer changes are in the single `public/index.html` file. The auto-updater progress feature requires a new `preload.js` (contextBridge IPC bridge) and changes to `main.js`. Tasks are independent and each produces a working, testable state.

**Tech Stack:** Electron 28+, electron-updater, vanilla JS, CSS custom properties, contextBridge/ipcRenderer/ipcMain.

---

## File Map

| File | Role | Change Type |
|------|------|-------------|
| `public/index.html` | Single-page renderer UI | Modify (Tasks 1, 2, 3, 4) |
| `main.js` | Electron main process | Modify (Task 4) |
| `preload.js` | New IPC bridge (contextBridge) | Create (Task 4) |

---

## Task 1: Fecha de Labs — Formato Abreviado DD/MM

**Files:**
- Modify: `public/index.html:987`

### What to change

In `enviarLabsANota()`, line 987 pushes the full date string (`DD/MM/YYYY`) as the first line of the labs text sent to the nota. Change it to use only the first 5 characters (`DD/MM`).

- [ ] **Step 1: Locate and edit the date line in `enviarLabsANota()`**

Open `public/index.html` and find line 987 (inside `enviarLabsANota()`):

```js
// BEFORE (line 987):
if (activeLab.patient && activeLab.patient.fecha) lines.push(activeLab.patient.fecha);

// AFTER:
if (activeLab.patient && activeLab.patient.fecha) lines.push(activeLab.patient.fecha.slice(0, 5));
```

The `.slice(0, 5)` on `"10/04/2026"` yields `"10/04"`. Storage is untouched — `activeLab.patient.fecha` still holds the full `DD/MM/YYYY` string.

- [ ] **Step 2: Verify manually**

1. Run the app: `npm start` (or however you launch — the Express server starts on port 3738 automatically from `main.js`)
2. Paste a lab report in the Laboratorio tab and click Procesar
3. Click "Enviar a nota"
4. Switch to Nota de Evolución → the Estudios textarea should now show `10/04` (not `10/04/2026`) at the top

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "fix: lab date format abbreviated to DD/MM in enviarLabsANota"
```

---

## Task 2: Form "Agregar Paciente" — Edad/Sexo en fila propia

**Files:**
- Modify: `public/index.html:314-358`

The modal has two independent sections where Edad+Sexo need to be moved to their own row:
- **Section A** (`#modal-prefilled`): shown when adding patient from a lab report — lines 314–332
- **Section B** (`#modal-manual-full`): shown for manual entry — lines 343–358

### Section A — Prefilled block

- [ ] **Step 1: Replace the 3-column grid in `#modal-prefilled`**

Find this block (lines 314–332):

```html
      <div class="modal-section" style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;">
        <div class="field-group"><label>Nombre</label><input id="m-nombre" type="text" style="text-transform:uppercase;"></div>
        <div class="field-group"><label>Registro</label><input id="m-registro" type="text"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="field-group"><label>Edad</label>
            <div style="display:flex;gap:4px;">
              <input id="m-edad-num" type="text" placeholder="0" style="width:50px;min-width:0;">
              <select id="m-edad-unit" style="flex:1;min-width:0;">
                <option value="años">Años</option>
                <option value="meses">Meses</option>
                <option value="días">Días</option>
              </select>
            </div>
          </div>
          <div class="field-group"><label>Sexo</label>
            <select id="m-sexo-ro"><option value="F">F</option><option value="M">M</option></select>
          </div>
        </div>
      </div>
```

Replace with:

```html
      <div class="modal-section" style="display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:10px;">
        <div class="field-group"><label>Nombre</label><input id="m-nombre" type="text" style="text-transform:uppercase;"></div>
        <div class="field-group"><label>Registro</label><input id="m-registro" type="text"></div>
      </div>
      <div class="modal-section" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="field-group"><label>Edad</label>
          <div style="display:flex;gap:4px;">
            <input id="m-edad-num" type="text" placeholder="0" style="width:50px;min-width:0;">
            <select id="m-edad-unit" style="flex:1;min-width:0;">
              <option value="años">Años</option>
              <option value="meses">Meses</option>
              <option value="días">Días</option>
            </select>
          </div>
        </div>
        <div class="field-group"><label>Sexo</label>
          <select id="m-sexo-ro"><option value="F">F</option><option value="M">M</option></select>
        </div>
      </div>
```

### Section B — Manual entry block

- [ ] **Step 2: Replace the 3-column grid in `#modal-manual-full`**

Find this block (lines 343–358):

```html
        <div style="display:grid;grid-template-columns:1fr 1fr 60px;gap:10px;margin-bottom:12px;">
          <div class="field-group"><label>Registro</label><input id="m-registro-manual" type="text" placeholder="0000000-0"></div>
          <div class="field-group"><label>Edad</label>
            <div style="display:flex;gap:4px;">
              <input id="m-edad-manual-num" type="text" placeholder="0" style="width:50px;min-width:0;">
              <select id="m-edad-manual-unit" style="flex:1;min-width:0;">
                <option value="años">Años</option>
                <option value="meses">Meses</option>
                <option value="días">Días</option>
              </select>
            </div>
          </div>
          <div class="field-group"><label>Sexo</label>
            <select id="m-sexo"><option value="F">F</option><option value="M">M</option></select>
          </div>
        </div>
```

Replace with:

```html
        <div style="margin-bottom:12px;">
          <div class="field-group"><label>Registro</label><input id="m-registro-manual" type="text" placeholder="0000000-0"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div class="field-group"><label>Edad</label>
            <div style="display:flex;gap:4px;">
              <input id="m-edad-manual-num" type="text" placeholder="0" style="width:50px;min-width:0;">
              <select id="m-edad-manual-unit" style="flex:1;min-width:0;">
                <option value="años">Años</option>
                <option value="meses">Meses</option>
                <option value="días">Días</option>
              </select>
            </div>
          </div>
          <div class="field-group"><label>Sexo</label>
            <select id="m-sexo"><option value="F">F</option><option value="M">M</option></select>
          </div>
        </div>
```

- [ ] **Step 3: Verify manually**

1. Launch the app, click "+ Agregar" → modal should show Nombre full-width on row 1, then Edad and Sexo side-by-side on row 2, with comfortable field widths and no scroll.
2. Process a lab report → click "Agregar Paciente" from the lab banner → same layout in the prefilled section.

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "fix: move edad/sexo to their own row in add patient modal"
```

---

## Task 3: Dark Mode Global

**Files:**
- Modify: `public/index.html` — CSS block (~line 23), `<header>` (~line 189), init JS (~line 899)

Dark mode uses `html.dark { }` CSS variable overrides + a toggle button in the header + `localStorage` persistence. No new files needed.

### Step 1 — Add dark CSS variables

- [ ] **Step 1: Add `html.dark` block immediately after the closing `}` of `:root` (after line 23)**

Find:
```css
    --shadow-md:    0 4px 6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
```

Insert after the closing `}` of `:root` (between `:root { }` and `* { }`):

```css
  html.dark {
    --primary:      #3B82F6;
    --action:       #60A5FA;
    --action-hover: #3B82F6;
    --bg:           #0F1117;
    --surface:      #1A1D27;
    --border:       #2D3142;
    --text:         #E2E8F0;
    --text-muted:   #94A3B8;
    --error:        #F87171;
    --success:      #4ADE80;
    --lab-chip-bg:  #1E3A5F;
    --lab-chip-txt: #93C5FD;
    --shadow:       0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
    --shadow-md:    0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3);
  }
  html.dark .patient-card:hover { background: #1a2744; }
  html.dark .patient-card.active { background: #1e2f55; border-left-color: var(--action); }
  html.dark .dcard-copy:hover { border-color: var(--action); color: var(--action); background: #1e3a5f; }
  html.dark .dcard-copy.copied { border-color: #4ade80; color: #4ade80; background: #14532d; }
```

### Step 2 — Add the toggle button in the header

- [ ] **Step 2: Add the ☀️/🌙 toggle button to `<header>`**

Find (line 189–192):
```html
<header>
  <h1>R+</h1>
  <span id="today-date"></span>
</header>
```

Replace with:
```html
<header>
  <h1>R+</h1>
  <span id="today-date"></span>
  <button id="theme-toggle" onclick="toggleTheme()" style="background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background 0.15s;flex-shrink:0;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'" title="Cambiar tema">☀️</button>
</header>
```

### Step 3 — Add theme init and toggle JS

- [ ] **Step 3: Add theme initialization and `toggleTheme()` function**

Find (line 899–901):
```js
document.getElementById('today-date').textContent =
  new Date().toLocaleDateString('es-MX', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
renderPatientList();
```

Insert BEFORE that block (at the top of the `<script>` initialization section):
```js
// ── Theme ──────────────────────────────────────────────────────────
(function() {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

function toggleTheme() {
  var isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-toggle').textContent = isDark ? '🌙' : '☀️';
}

// Set correct icon on load
(function() {
  if (document.documentElement.classList.contains('dark')) {
    document.getElementById('theme-toggle').textContent = '🌙';
  }
})();
```

- [ ] **Step 4: Verify dark mode**

1. Launch the app. Click the ☀️ button in the header — the app should switch to dark mode (`--bg: #0F1117`).
2. Click again — should return to light mode.
3. Enable dark mode, close the app, reopen — should remember dark mode preference.
4. Process a lab report → check the dcard SVG diagrams invert correctly with the filter.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat: add global dark mode with CSS vars, toggle button, and localStorage persistence"
```

---

## Task 4: Auto-Updater con Progreso de Descarga

**Files:**
- Create: `preload.js`
- Modify: `main.js:1` (add requires), `main.js:22-27` (add preload to webPreferences), `main.js:52-70` (replace updater events + add ipcMain listener)
- Modify: `public/index.html` — add banner HTML before `</body>`, add banner CSS, add IPC listener JS

This task requires a new `preload.js` because `contextIsolation: true` and `nodeIntegration: false` — the renderer can't use `require('electron')` directly. The preload script exposes a safe API via `contextBridge`.

### Step 1 — Create preload.js

- [ ] **Step 1: Create `preload.js` in the project root**

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateProgress: function(cb) {
    ipcRenderer.on('update-progress', function(_e, pct) { cb(pct); });
  },
  onUpdateReady: function(cb) {
    ipcRenderer.on('update-ready', function(_e, version) { cb(version); });
  },
  installUpdate: function() {
    ipcRenderer.send('install-update');
  },
});
```

### Step 2 — Wire preload into main.js

- [ ] **Step 2: Update `main.js` — add requires and register preload**

Find line 1:
```js
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
```

Replace with:
```js
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
```

Find the `webPreferences` block (lines 22–27):
```js
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: true,
      spellcheck: false,
    },
```

Replace with:
```js
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: true,
      spellcheck: false,
    },
```

### Step 3 — Replace auto-updater event handlers in main.js

- [ ] **Step 3: Replace the `update-downloaded` listener and add `download-progress` + IPC handler**

Find the full updater events block (lines 52–70):
```js
// ── Auto-updater events ───────────────────────────────────────────
autoUpdater.on('update-downloaded', (info) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Actualización lista',
    message: `R+ v${info.version} descargada.`,
    detail: '¿Instalar y reiniciar ahora?',
    buttons: ['Instalar y reiniciar', 'Más tarde'],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', (err) => {
  console.error('AutoUpdater error:', err.message);
});
```

Replace with:
```js
// ── Auto-updater events ───────────────────────────────────────────
autoUpdater.on('download-progress', (p) => {
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-progress', Math.round(p.percent));
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-ready', info.version);
});

autoUpdater.on('error', (err) => {
  console.error('AutoUpdater error:', err.message);
});

ipcMain.on('install-update', () => autoUpdater.quitAndInstall());
```

### Step 4 — Add update banner HTML to the renderer

- [ ] **Step 4: Add the update banner element as the first child of `<body>`**

Find (line 187–189):
```html
</head>
<body>

<header>
```

Replace with:
```html
</head>
<body>

<div id="update-banner" style="display:none;background:#166534;color:#bbf7d0;padding:8px 16px;font-size:13px;font-weight:600;align-items:center;gap:12px;flex-shrink:0;">
  <span id="update-banner-text">Descargando actualización…</span>
  <div id="update-progress-track" style="flex:1;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;overflow:hidden;">
    <div id="update-progress-fill" style="height:100%;width:0%;background:#4ade80;border-radius:2px;transition:width 0.3s;"></div>
  </div>
  <div id="update-actions" style="display:none;gap:8px;flex-shrink:0;">
    <button onclick="installUpdate()" style="background:white;color:#166534;border:none;border-radius:5px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Instalar y reiniciar</button>
    <button onclick="document.getElementById('update-banner').style.display='none'" style="background:transparent;color:#bbf7d0;border:1px solid rgba(255,255,255,0.4);border-radius:5px;padding:4px 12px;font-size:12px;cursor:pointer;font-family:inherit;">Más tarde</button>
  </div>
</div>

<header>
```

### Step 5 — Add IPC listener JS in the renderer

- [ ] **Step 5: Add the IPC listener and `installUpdate()` function to the renderer script**

Find near the bottom of `<script>`, just before `</script>` (around line 1544):
```js
</script>
```

Insert before `</script>`:
```js
// ── Auto-updater UI ───────────────────────────────────────────────
function installUpdate() {
  if (window.electronAPI) window.electronAPI.installUpdate();
}

if (window.electronAPI) {
  window.electronAPI.onUpdateProgress(function(pct) {
    var banner = document.getElementById('update-banner');
    banner.style.display = 'flex';
    document.getElementById('update-banner-text').textContent = 'Descargando actualización… ' + pct + '%';
    document.getElementById('update-progress-fill').style.width = pct + '%';
  });

  window.electronAPI.onUpdateReady(function(version) {
    var banner = document.getElementById('update-banner');
    banner.style.display = 'flex';
    document.getElementById('update-progress-track').style.display = 'none';
    document.getElementById('update-banner-text').textContent = 'R+ v' + version + ' lista para instalar.';
    document.getElementById('update-actions').style.display = 'flex';
  });
}
```

- [ ] **Step 6: Verify IPC wiring**

Since triggering a real update requires a GitHub release, verify the wiring with a quick smoke test:

1. Launch the app with `npm start` (Electron dev mode)
2. Open DevTools (View → Toggle Developer Tools)
3. In the DevTools console, run:
   ```js
   // Simulate update-progress event from main
   // (only works if preload is loaded — check window.electronAPI exists)
   console.log(typeof window.electronAPI); // should print "object", not "undefined"
   ```
4. If `window.electronAPI` is `object`, the contextBridge is wired correctly.
5. To simulate the banner visually, paste in the console:
   ```js
   document.getElementById('update-banner').style.display = 'flex';
   document.getElementById('update-banner-text').textContent = 'Descargando actualización… 47%';
   document.getElementById('update-progress-fill').style.width = '47%';
   ```
   Banner should appear at the top, pushing the header down.

- [ ] **Step 7: Commit**

```bash
git add preload.js main.js public/index.html
git commit -m "feat: auto-updater progress banner with IPC bridge (preload.js)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Task 1 = fecha labs, Task 2 = form layout, Task 3 = dark mode, Task 4 = updater progress. All 4 spec requirements covered.
- [x] **No placeholders:** All steps contain actual code, no TBD/TODO.
- [x] **Type consistency:** `window.electronAPI` used consistently in Tasks 4 Steps 4 and 5. `installUpdate()` defined in Step 5 and called in Step 4 banner HTML.
- [x] **IPC bridge:** `contextIsolation: true` requires preload.js — accounted for in Task 4 Step 1.
- [x] **Dark mode hardcoded colors:** `.patient-card:hover`, `.patient-card.active`, `.dcard-copy` overrides included in Task 3 Step 1.
- [x] **Banner display:flex conflict:** Banner starts `display:none`, JS sets `display:flex`. No conflict — only one value active at a time.
