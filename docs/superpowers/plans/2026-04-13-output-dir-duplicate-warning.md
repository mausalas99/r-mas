# Carpeta configurable + Avisos de duplicado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users choose where DOCX files are saved (instead of hardcoded ~/Downloads) and warn before creating duplicate patients.

**Architecture:** Two independent features sharing one release. Output dir: IPC dialog → localStorage → POST body → server validates & uses. Duplicate detection: normalize name/registro → compare against existing patients → confirmation modal before save. Both features add text to existing onboarding steps.

**Tech Stack:** Electron (main/preload IPC), Express (server.js), vanilla JS (public/index.html), localStorage persistence.

---

## File Map

| File | Responsibility | Changes |
|------|---------------|---------|
| `main.js` | Electron main process | Add `select-output-dir` IPC handler |
| `preload.js` | Context bridge | Expose `selectOutputDir()` |
| `server.js` | Express API | Both endpoints: read `outputDir` from body, validate, use or fallback |
| `public/index.html` | All UI + logic | Mi Perfil output dir section, fetch `outputDir` in body, `normalize()`, `findDuplicatePatient()`, duplicate confirmation modal, onboarding text updates |
| `package.json` | Version | Bump `1.7.1` → `1.8.0` |
| `README.md` | Docs | Document both features |

---

### Task 1: IPC handler for folder selection (main.js + preload.js)

**Files:**
- Modify: `main.js:101-103` (after existing IPC handlers)
- Modify: `preload.js:22-24` (inside `electronAPI` object)

- [ ] **Step 1: Add IPC handler in main.js**

In `main.js`, after line 103 (`ipcMain.handle('get-app-version', () => app.getVersion());`), add:

```javascript
ipcMain.handle('select-output-dir', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return undefined;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Elegir carpeta para documentos',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return undefined;
  return result.filePaths[0];
});
```

- [ ] **Step 2: Expose in preload.js**

In `preload.js`, after the `getAppVersion` method (line 23) and before the closing `});`, add:

```javascript
  selectOutputDir: function() {
    return ipcRenderer.invoke('select-output-dir');
  },
```

The full `electronAPI` object will now have 8 methods: `onUpdateAvailable`, `onUpdateProgress`, `onUpdateReady`, `onUpdateNotAvailable`, `onUpdateError`, `installUpdate`, `getAppVersion`, `selectOutputDir`.

- [ ] **Step 3: Verify the app starts without errors**

Run: `npm start`

Expected: App launches, no console errors. The new IPC channel is registered but not yet called from UI.

- [ ] **Step 4: Commit**

```bash
git add main.js preload.js
git commit -m "feat: add select-output-dir IPC handler for folder picker dialog"
```

---

### Task 2: Server-side outputDir support (server.js)

**Files:**
- Modify: `server.js:67-91` (both POST endpoints)

- [ ] **Step 1: Modify /generate endpoint to accept outputDir**

Replace lines 67-78 in `server.js` (the entire `/generate` handler) with:

```javascript
appExpress.post('/generate', async (req, res) => {
  const { patient, note, outputDir } = req.body;
  if (!patient || !note) return res.status(400).json({ error: 'Missing patient or note' });
  const dest = outputDir || DOWNLOADS;
  if (!fs.existsSync(dest)) return res.status(400).json({ error: 'La carpeta seleccionada ya no existe. Cambia la ruta en Mi Perfil.' });
  try { fs.accessSync(dest, fs.constants.W_OK); } catch (_) {
    return res.status(400).json({ error: 'No se puede escribir en la carpeta seleccionada.' });
  }
  try {
    const buf = await runPython('generate_note.py', JSON.stringify({ patient, note }));
    const fileName = `Nota_Evolucion_${safeName(patient.nombre)}_${safeName(note.fecha||'')}.docx`;
    fs.writeFileSync(path.join(dest, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

- [ ] **Step 2: Modify /generate-indicaciones endpoint to accept outputDir**

Replace lines 80-91 in `server.js` (the entire `/generate-indicaciones` handler) with:

```javascript
appExpress.post('/generate-indicaciones', async (req, res) => {
  const { patient, indicaciones, outputDir } = req.body;
  if (!patient || !indicaciones) return res.status(400).json({ error: 'Missing patient or indicaciones' });
  const dest = outputDir || DOWNLOADS;
  if (!fs.existsSync(dest)) return res.status(400).json({ error: 'La carpeta seleccionada ya no existe. Cambia la ruta en Mi Perfil.' });
  try { fs.accessSync(dest, fs.constants.W_OK); } catch (_) {
    return res.status(400).json({ error: 'No se puede escribir en la carpeta seleccionada.' });
  }
  try {
    const buf = await runPython('generate_indicaciones.py', JSON.stringify({ patient, indicaciones }));
    const fileName = `Indicaciones_${safeName(patient.nombre)}_${safeName(indicaciones.fecha||'')}.docx`;
    fs.writeFileSync(path.join(dest, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

- [ ] **Step 3: Verify endpoints still work without outputDir**

Run: `npm start`

Generate a DOCX (nota or indicaciones) for any patient. It should still save to `~/Downloads` since no `outputDir` is sent yet.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: accept optional outputDir in /generate and /generate-indicaciones endpoints"
```

---

### Task 3: Mi Perfil UI for output folder (public/index.html)

**Files:**
- Modify: `public/index.html:609-611` (Mi Perfil body HTML)
- Modify: `public/index.html:1657-1683` (loadSettings function)
- Modify: `public/index.html:1685-1698` (saveSettings function)

- [ ] **Step 1: Add output folder section HTML in Mi Perfil**

In `public/index.html`, find line 609 (the closing `</div>` after `profile-preview-meds-txt`). After it (before the `<button class="btn-edit-templates" onclick="openTemplatesModal()">` on line 610), insert:

```html
        <hr class="profile-divider">
        <div class="profile-defaults-title">Carpeta de documentos</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span id="profile-output-dir" style="font-size:13px;color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="">Descargas (predeterminado)</span>
          <button type="button" class="btn-edit-templates" style="margin:0;white-space:nowrap;" onclick="chooseOutputDir()">Cambiar</button>
        </div>
```

- [ ] **Step 2: Add chooseOutputDir function**

In `public/index.html`, after the `saveSettings()` function (after line 1698), add:

```javascript
function chooseOutputDir() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
    showToast('Función no disponible en este entorno', 'error');
    return;
  }
  window.electronAPI.selectOutputDir().then(function(dir) {
    if (!dir) return;
    settings.outputDir = dir;
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
    loadSettings();
    showToast('Carpeta actualizada ✓', 'success');
  });
}
```

- [ ] **Step 3: Update loadSettings to display the output dir**

In `public/index.html`, at the end of `loadSettings()` (before the closing `}` on line 1683), add:

```javascript
  var dirEl = document.getElementById('profile-output-dir');
  if (dirEl) {
    if (settings.outputDir) {
      var parts = settings.outputDir.split('/');
      dirEl.textContent = parts[parts.length - 1] || settings.outputDir;
      dirEl.title = settings.outputDir;
    } else {
      dirEl.textContent = 'Descargas (predeterminado)';
      dirEl.title = '';
    }
  }
```

- [ ] **Step 4: Verify Mi Perfil shows the output dir section**

Run: `npm start`

Open Mi Perfil → should see "Carpeta de documentos" section with "Descargas (predeterminado)" and a "Cambiar" button. Click "Cambiar" → native folder dialog opens. Select a folder → label updates to folder name with tooltip showing full path.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat: add output folder chooser UI in Mi Perfil"
```

---

### Task 4: Send outputDir in fetch calls (public/index.html)

**Files:**
- Modify: `public/index.html:2650` (generateWord fetch)
- Modify: `public/index.html:3175` (generateIndicaciones fetch)

- [ ] **Step 1: Update generateWord to send outputDir**

In `public/index.html`, find the `generateWord()` function (around line 2646). Replace the fetch call on line 2650:

```javascript
  fetch('/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient:patient,note:note})})
```

with:

```javascript
  fetch('/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient:patient,note:note,outputDir:settings.outputDir||''})})
```

- [ ] **Step 2: Update generateIndicaciones to send outputDir**

In `public/index.html`, find the `generateIndicaciones()` function (around line 3171). Replace the fetch call on line 3175:

```javascript
  fetch('/generate-indicaciones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient:patient,indicaciones:ind})})
```

with:

```javascript
  fetch('/generate-indicaciones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient:patient,indicaciones:ind,outputDir:settings.outputDir||''})})
```

- [ ] **Step 3: End-to-end test**

Run: `npm start`

1. Open Mi Perfil → set output folder to Desktop (or any custom folder)
2. Generate a Nota de Evolución → DOCX should appear in the chosen folder (not Downloads)
3. Generate Indicaciones → DOCX should appear in the chosen folder
4. Remove the `outputDir` from settings (clear it by deleting `rpc-settings` from localStorage in DevTools, then reload) → DOCX should go to Downloads again

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: send outputDir in /generate and /generate-indicaciones fetch calls"
```

---

### Task 5: Duplicate patient detection + confirmation modal (public/index.html)

**Files:**
- Modify: `public/index.html:2521-2571` (savePatient function)

- [ ] **Step 1: Add normalize and findDuplicatePatient functions**

In `public/index.html`, before the `savePatient()` function (before line 2521), add:

```javascript
function normalizeName(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findDuplicatePatient(nombre, registro) {
  var nombreNorm = normalizeName(nombre);
  return patients.find(function(p) {
    if (p.isDemo) return false;
    if (registro && p.registro && registro === p.registro) return true;
    return normalizeName(p.nombre) === nombreNorm;
  });
}
```

- [ ] **Step 2: Add duplicate confirmation modal function**

Immediately after the two functions above, add:

```javascript
function showDuplicateWarning(existing, onConfirm) {
  var fecha = notes[existing.id] ? notes[existing.id].fecha : '';
  var body = '<strong>' + existing.nombre + '</strong>';
  body += '<br>Cto. ' + (existing.cuarto || '—') + ' Cama ' + (existing.cama || '—');
  if (existing.registro) body += '<br>Registro: ' + existing.registro;
  if (fecha) body += '<br>Ingreso: ' + fecha;
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'dup-confirm-backdrop';
  backdrop.innerHTML =
    '<div class="lab-conflict-modal">' +
    '<h3>Paciente similar encontrado</h3>' +
    '<p>' + body + '</p>' +
    '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">' +
    '<button onclick="document.getElementById(\'dup-confirm-backdrop\').remove()" style="background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:#1f2937;">Cancelar</button>' +
    '<button id="dup-confirm-btn" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Agregar de todas formas</button>' +
    '</div></div>';
  document.body.appendChild(backdrop);
  document.getElementById('dup-confirm-btn').onclick = function() {
    document.getElementById('dup-confirm-backdrop').remove();
    onConfirm();
  };
}
```

- [ ] **Step 3: Refactor savePatient to check for duplicates**

The current `savePatient()` function validates fields, then creates the patient and saves. We need to split it so the duplicate check happens after validation but before creation.

In `public/index.html`, find `savePatient()` (line 2521). Replace the entire function with:

```javascript
function savePatient() {
  var isFromLab = document.getElementById('modal-prefilled').style.display !== 'none';
  var nombre, registro, edad, sexo;
  if (isFromLab) {
    nombre   = (document.getElementById('m-nombre').value||'').trim().toUpperCase();
    registro = (document.getElementById('m-registro').value||'').trim();
    var edNum = (document.getElementById('m-edad-num').value||'').trim();
    var edUnit = document.getElementById('m-edad-unit').value || 'años';
    edad = edNum ? (edNum + ' ' + edUnit) : '';
    sexo = document.getElementById('m-sexo-ro').value || 'F';
  } else {
    nombre   = (document.getElementById('m-nombre-manual').value||'').trim().toUpperCase();
    registro = (document.getElementById('m-registro-manual').value||'').trim();
    var edNumM = (document.getElementById('m-edad-manual-num').value||'').trim();
    var edUnitM = document.getElementById('m-edad-manual-unit').value || 'años';
    edad = edNumM ? (edNumM + ' ' + edUnitM) : '';
    sexo     = document.getElementById('m-sexo').value;
  }
  if (!nombre) { showToast('Ingresa el nombre del paciente','error'); return; }
  var area     = (document.getElementById('m-area').value||'').trim().toUpperCase();
  var servicio = (document.getElementById('m-servicio').value||'').trim().toUpperCase();
  var cuarto   = (document.getElementById('m-cuarto').value||'').trim();
  var cama     = (document.getElementById('m-cama').value||'').trim();
  if (!cuarto || !cama) { showToast('Ingresa cuarto y cama','error'); return; }

  var dup = findDuplicatePatient(nombre, registro);
  if (dup) {
    showDuplicateWarning(dup, function() {
      commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab);
    });
    return;
  }
  commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab);
}

function commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab) {
  var today = new Date();
  var fecha = String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear();
  var hora  = String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
  var patient = { id:Date.now().toString(36)+Math.random().toString(36).slice(2), nombre:nombre, registro:registro, edad:edad, sexo:sexo, area:area, servicio:servicio, cuarto:cuarto, cama:cama, fromLab:isFromLab };
  notes[patient.id] = { fecha:fecha, hora:hora, interrogatorio:'', evolucion:'', estudios:'', diagnosticos:[''], tratamiento:[''], ta:'', fr:'', fc:'', temp:'', peso:'', medico:'', profesor:'' };
  indicaciones[patient.id] = { fecha:fecha, hora:hora, medicos:'', dieta:'', cuidados:'', estudios:'', medicamentos:'', interconsultas:'', otros:[] };
  applyDefaultsToNewPatient(patient.id);
  applyDefaultsToNewIndicaciones(patient.id);
  patients.push(patient);
  saveState(); closeModal();
  var pendingLab = null;
  if (isFromLab) {
    pendingLab = activeLab;
    activeLab = null;
    document.getElementById('lab-banner').style.display = 'none';
    document.getElementById('lab-output-section').style.display = 'none';
    document.getElementById('lab-output-box').innerHTML = '';
    document.getElementById('lab-input').value = '';
    switchAppTab('nota');
  }
  renderPatientList(); selectPatient(patient.id); showToast('Paciente agregado','success');
  if (pendingLab) {
    activeLab = pendingLab;
    enviarLabsANota();
    activeLab = null;
  }
}
```

- [ ] **Step 4: Test duplicate detection**

Run: `npm start`

1. Add a patient "JUAN GARCÍA" in Cto. 101 Cama 1
2. Try to add another "JUAN GARCIA" (no accent) → should show duplicate warning modal with existing patient info
3. Click "Cancelar" → modal closes, form stays open with data intact
4. Click "Agregar Paciente" again → warning again → click "Agregar de todas formas" → patient is created
5. Try adding a patient with same registro as an existing one → should also trigger warning
6. Add a patient with a completely different name/registro → should save directly without warning

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat: warn before creating duplicate patients by name or registro"
```

---

### Task 6: Onboarding text updates (public/index.html)

**Files:**
- Modify: `public/index.html:1843-1846` (TOUR_STEP_MAP text)
- Modify: `public/index.html:1878-1881` (TOUR_STEP_PROFILE text)

- [ ] **Step 1: Update TOUR_STEP_MAP text**

In `public/index.html`, find the `TOUR_STEP_MAP` case in `renderTourStep()` (around line 1843). Replace the `bodyEl.innerHTML` line:

```javascript
      bodyEl.innerHTML = 'A la <strong>izquierda</strong> está la lista de pacientes (el demo <strong>DEMO PÉREZ</strong> no se guarda). Arriba alterna <strong>Laboratorio</strong> (reportes y gráficas) y <strong>Expediente</strong> (nota clínica, indicaciones y tendencias).';
```

with:

```javascript
      bodyEl.innerHTML = 'A la <strong>izquierda</strong> está la lista de pacientes (el demo <strong>DEMO PÉREZ</strong> no se guarda). Arriba alterna <strong>Laboratorio</strong> (reportes y gráficas) y <strong>Expediente</strong> (nota clínica, indicaciones y tendencias). Si agregas un paciente con nombre o registro similar a uno existente, la app te avisará.';
```

- [ ] **Step 2: Update TOUR_STEP_PROFILE text**

In `public/index.html`, find the `TOUR_STEP_PROFILE` case in `renderTourStep()` (around line 1878). Replace the `bodyEl.innerHTML` line:

```javascript
      bodyEl.innerHTML = 'En <strong>Mi Perfil</strong> (abajo en la barra lateral) guardas médico, grado y textos por defecto para pacientes nuevos.';
```

with:

```javascript
      bodyEl.innerHTML = 'En <strong>Mi Perfil</strong> (abajo en la barra lateral) guardas médico, grado y textos por defecto para pacientes nuevos. Aquí también puedes elegir dónde se guardan tus documentos.';
```

- [ ] **Step 3: Verify onboarding changes**

Run: `npm start`

Open Mi Perfil → click "Ver tutorial" → step through the tour:
- Step 1 (vista general): should mention duplicate patient warning
- Step 8 (perfil): should mention document folder configuration

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: update onboarding text to mention output dir and duplicate warnings"
```

---

### Task 7: Version bump + README (package.json + README.md)

**Files:**
- Modify: `package.json:3` (version field)
- Modify: `README.md:46` (requirements section)

- [ ] **Step 1: Bump version in package.json**

In `package.json`, change line 3:

```json
  "version": "1.7.1",
```

to:

```json
  "version": "1.8.0",
```

- [ ] **Step 2: Update README.md**

In `README.md`, replace line 46:

```markdown
Los documentos generados se guardan automáticamente en tu carpeta **Descargas**. Puedes hacer una **copia de seguridad** de tus datos desde la app: **Mi Perfil → Exportar copia de seguridad** (archivo JSON).
```

with:

```markdown
Los documentos generados se guardan en tu carpeta **Descargas** por defecto. Puedes cambiar la carpeta de salida desde **Mi Perfil → Carpeta de documentos → Cambiar**. Al agregar un paciente, la app te avisará si ya existe uno con el mismo nombre o registro. Puedes hacer una **copia de seguridad** de tus datos desde la app: **Mi Perfil → Exportar copia de seguridad** (archivo JSON).
```

- [ ] **Step 3: Verify version bump triggers onboarding**

Run: `npm start`

On launch, the onboarding intro modal should appear automatically (because version changed from 1.7.1 to 1.8.0 and `rpc-guided-tour-done-for-version` no longer matches).

- [ ] **Step 4: Commit**

```bash
git add package.json README.md
git commit -m "chore: bump version to 1.8.0, update README with new features"
```
