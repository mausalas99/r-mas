# Quick Wins v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three features to R+: (1) a persistent "Mi Perfil" settings panel in the sidebar that auto-fills doctor names and default indications; (2) smart multi-date lab insertion with an auto-detect modal; (3) an interactive onboarding banner for first-time users.

**Architecture:** All changes are in `public/index.html` (a single ~1730-line monolithic file containing HTML, CSS, and JS inline). New features add global JS variables, new functions, and small HTML fragments — following the existing pattern. No new files needed.

**Tech Stack:** Vanilla JS, HTML, CSS, Electron (no build step, no bundler, no test framework). Manual verification is the testing approach.

---

## File Map

| File | What changes |
|------|-------------|
| `public/index.html` | All changes: new CSS styles, new HTML in sidebar and body, new JS functions, small edits to existing functions |

---

## Task 1: Settings — HTML structure in sidebar

**Files:**
- Modify: `public/index.html` — `<aside>` block (around line 265–271) and `<style>` block

- [ ] **Step 1: Add CSS for Mi Perfil section**

  In `<style>`, add before the closing `</style>` tag (around line 232):

  ```css
  /* ── Mi Perfil ─────────────────────────────────────────── */
  .profile-section { border-top: 1px solid var(--border); flex-shrink: 0; }
  .profile-toggle {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; background: none; border: none; cursor: pointer;
    font-family: inherit; color: var(--text-muted); font-size: 12px; font-weight: 500;
    transition: background 0.15s;
  }
  .profile-toggle:hover { background: var(--border); }
  .profile-toggle-left { display: flex; align-items: center; gap: 6px; }
  .profile-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
  .profile-field-label {
    color: var(--text-muted); font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;
  }
  .profile-input {
    width: 100%; background: var(--bg); border: 1px solid var(--border);
    border-radius: 5px; padding: 5px 8px; color: var(--text);
    font-size: 11px; font-family: inherit; box-sizing: border-box;
  }
  .profile-input:focus { outline: none; border-color: var(--action); box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
  .profile-divider { border: none; border-top: 1px solid var(--border); margin: 4px 0; }
  .profile-defaults-title {
    color: var(--text-muted); font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;
  }
  .profile-default-preview {
    background: var(--bg); border: 1px solid var(--border); border-radius: 5px;
    padding: 5px 8px; font-size: 10px; color: var(--text-muted); font-style: italic; margin-bottom: 4px;
  }
  .profile-default-preview .preview-label { font-style: normal; font-weight: 600; color: var(--text-muted); margin-bottom: 2px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
  .btn-edit-templates {
    width: 100%; background: var(--lab-chip-bg); color: var(--action);
    border: none; border-radius: 5px; padding: 5px; font-size: 11px;
    font-family: inherit; cursor: pointer; margin-top: 4px; font-weight: 600;
  }
  .btn-edit-templates:hover { opacity: 0.85; }
  .btn-save-profile {
    width: 100%; background: var(--action); color: white; border: none;
    border-radius: 5px; padding: 6px; font-size: 11px; font-family: inherit;
    cursor: pointer; font-weight: 700; margin-top: 4px;
  }
  .btn-save-profile:hover { background: var(--action-hover); }
  /* Templates modal */
  .templates-modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9990;
    display: flex; align-items: center; justify-content: center;
  }
  .templates-modal {
    background: var(--surface); border-radius: 10px; padding: 20px;
    width: 90%; max-width: 440px; display: flex; flex-direction: column; gap: 12px;
    box-shadow: var(--shadow-md);
  }
  .templates-modal h3 { font-size: 15px; color: var(--text); }
  .templates-modal label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; display: block; margin-bottom: 4px; }
  .templates-modal textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 7px 10px; font-size: 12px; font-family: inherit; color: var(--text); resize: vertical; min-height: 60px; box-sizing: border-box; }
  .templates-modal textarea:focus { outline: none; border-color: var(--action); }
  .templates-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
  ```

- [ ] **Step 2: Add Mi Perfil HTML to sidebar and templates modal to body**

  Replace the current `<aside>` block (lines 265–271):
  ```html
  <aside>
    <div class="sidebar-header">
      <h2>Pacientes</h2>
      <button class="btn-add" onclick="openAddModal()">+ Agregar</button>
    </div>
    <div class="patient-list" id="patient-list"></div>
  </aside>
  ```
  With:
  ```html
  <aside>
    <div class="sidebar-header">
      <h2>Pacientes</h2>
      <button class="btn-add" onclick="openAddModal()">+ Agregar</button>
    </div>
    <div class="patient-list" id="patient-list"></div>
    <div class="profile-section" id="profile-section">
      <button class="profile-toggle" onclick="toggleProfileSection()" id="profile-toggle-btn">
        <div class="profile-toggle-left">
          <span>👤</span>
          <span id="profile-toggle-label">Mi Perfil</span>
        </div>
        <span id="profile-toggle-arrow">▾</span>
      </button>
      <div class="profile-body" id="profile-body" style="display:none;">
        <div>
          <div class="profile-field-label">Médico Tratante</div>
          <input class="profile-input" id="profile-doctor" type="text" placeholder="Dr. Nombre Apellido">
        </div>
        <div>
          <div class="profile-field-label">Profesor / Responsable</div>
          <input class="profile-input" id="profile-profesor" type="text" placeholder="Dr. Nombre Apellido">
        </div>
        <div>
          <div class="profile-field-label">Grado / Servicio</div>
          <input class="profile-input" id="profile-grado" type="text" placeholder="R3MI · Medicina Interna">
        </div>
        <hr class="profile-divider">
        <div class="profile-defaults-title">Indicaciones por defecto</div>
        <div class="profile-default-preview" id="profile-preview-dieta">
          <div class="preview-label">Dieta</div>
          <span id="profile-preview-dieta-txt">(vacío)</span>
        </div>
        <div class="profile-default-preview" id="profile-preview-cuidados">
          <div class="preview-label">Cuidados</div>
          <span id="profile-preview-cuidados-txt">(vacío)</span>
        </div>
        <div class="profile-default-preview" id="profile-preview-meds">
          <div class="preview-label">Medicamentos</div>
          <span id="profile-preview-meds-txt">(vacío)</span>
        </div>
        <button class="btn-edit-templates" onclick="openTemplatesModal()">✏️ Editar plantillas…</button>
        <button class="btn-save-profile" onclick="saveSettings()">Guardar perfil</button>
      </div>
    </div>
  </aside>
  ```

  Also add before the closing `</body>` tag (right before `<script>`):
  ```html
  <!-- Templates modal -->
  <div class="templates-modal-backdrop" id="templates-modal" style="display:none;">
    <div class="templates-modal">
      <h3>Plantillas de indicaciones por defecto</h3>
      <div>
        <label>Dieta</label>
        <textarea id="tmpl-dieta" rows="3" placeholder="DIETA NORMAL DIABÉTICA…"></textarea>
      </div>
      <div>
        <label>Cuidados</label>
        <textarea id="tmpl-cuidados" rows="3" placeholder="CSV c/8h, glucometrías c/6h…"></textarea>
      </div>
      <div>
        <label>Medicamentos</label>
        <textarea id="tmpl-meds" rows="3" placeholder="(vacío por defecto)"></textarea>
      </div>
      <div class="templates-modal-actions">
        <button class="btn-cancel" onclick="closeTemplatesModal()">Cancelar</button>
        <button class="btn-save" onclick="saveTemplates()">Guardar plantillas</button>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 3: Verify HTML renders**

  Open `http://localhost:3738` in the browser. The sidebar should show a "Mi Perfil" section at the bottom with a ▾ toggle. Clicking it should... do nothing yet (JS not wired). No JS errors in console.

- [ ] **Step 4: Commit**

  ```bash
  git add public/index.html
  git commit -m "feat: add Mi Perfil sidebar HTML and CSS structure"
  ```

---

## Task 2: Settings — JS logic

**Files:**
- Modify: `public/index.html` — `<script>` block

- [ ] **Step 1: Add `settings` global variable**

  After the existing globals (around line 958, after `var activeLab = null;`), add:

  ```javascript
  var settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  ```

- [ ] **Step 2: Add `loadSettings()` function**

  Add after the `saveState()` function (around line 1038):

  ```javascript
  // ── Settings ──────────────────────────────────────────────────────
  function loadSettings() {
    if (!settings) settings = {};
    var docEl = document.getElementById('profile-doctor');
    var proEl = document.getElementById('profile-profesor');
    var grEl  = document.getElementById('profile-grado');
    if (docEl) docEl.value = settings.doctorName || '';
    if (proEl) proEl.value = settings.profesorName || '';
    if (grEl)  grEl.value  = settings.grado || '';
    // Update toggle label
    var lbl = document.getElementById('profile-toggle-label');
    if (lbl && settings.doctorName) {
      var parts = [];
      if (settings.doctorName) parts.push(settings.doctorName);
      if (settings.grado) parts.push(settings.grado);
      lbl.textContent = parts.join(' · ');
    }
    // Update previews
    var dEl = document.getElementById('profile-preview-dieta-txt');
    var cEl = document.getElementById('profile-preview-cuidados-txt');
    var mEl = document.getElementById('profile-preview-meds-txt');
    if (dEl) dEl.textContent = settings.defaultDieta    ? (settings.defaultDieta.slice(0,40) + (settings.defaultDieta.length>40?'…':''))    : '(vacío)';
    if (cEl) cEl.textContent = settings.defaultCuidados ? (settings.defaultCuidados.slice(0,40) + (settings.defaultCuidados.length>40?'…':'')) : '(vacío)';
    if (mEl) mEl.textContent = settings.defaultMedicamentos ? (settings.defaultMedicamentos.slice(0,40) + (settings.defaultMedicamentos.length>40?'…':'')) : '(vacío)';
  }

  function saveSettings() {
    settings.doctorName    = (document.getElementById('profile-doctor').value   || '').trim();
    settings.profesorName  = (document.getElementById('profile-profesor').value || '').trim();
    settings.grado         = (document.getElementById('profile-grado').value    || '').trim();
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
    loadSettings();
    showToast('Perfil guardado ✓', 'success');
  }

  function toggleProfileSection() {
    var body  = document.getElementById('profile-body');
    var arrow = document.getElementById('profile-toggle-arrow');
    var open  = body.style.display !== 'none';
    body.style.display  = open ? 'none' : 'flex';
    arrow.textContent   = open ? '▾' : '▴';
  }

  function openTemplatesModal() {
    var m = document.getElementById('templates-modal');
    document.getElementById('tmpl-dieta').value    = settings.defaultDieta    || '';
    document.getElementById('tmpl-cuidados').value = settings.defaultCuidados || '';
    document.getElementById('tmpl-meds').value     = settings.defaultMedicamentos || '';
    m.style.display = 'flex';
  }

  function closeTemplatesModal() {
    document.getElementById('templates-modal').style.display = 'none';
  }

  function saveTemplates() {
    settings.defaultDieta         = document.getElementById('tmpl-dieta').value.trim();
    settings.defaultCuidados      = document.getElementById('tmpl-cuidados').value.trim();
    settings.defaultMedicamentos  = document.getElementById('tmpl-meds').value.trim();
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
    closeTemplatesModal();
    loadSettings();
    showToast('Plantillas guardadas ✓', 'success');
  }

  function applyDefaultsToNewPatient(patientId) {
    if (!settings.doctorName && !settings.profesorName) return;
    if (!notes[patientId]) return;
    if (settings.doctorName   && !notes[patientId].medico)   notes[patientId].medico   = settings.doctorName;
    if (settings.profesorName && !notes[patientId].profesor) notes[patientId].profesor = settings.profesorName;
  }

  function applyDefaultsToNewIndicaciones(patientId) {
    if (!indicaciones[patientId]) return;
    if (settings.defaultDieta        && !indicaciones[patientId].dieta)         indicaciones[patientId].dieta         = settings.defaultDieta;
    if (settings.defaultCuidados     && !indicaciones[patientId].cuidados)      indicaciones[patientId].cuidados      = settings.defaultCuidados;
    if (settings.defaultMedicamentos && !indicaciones[patientId].medicamentos)  indicaciones[patientId].medicamentos  = settings.defaultMedicamentos;
  }
  ```

- [ ] **Step 3: Hook defaults into `savePatient()`**

  In `savePatient()`, after the line `notes[patient.id] = { ... };` (around line 1241) and `indicaciones[patient.id] = { ... };` (around line 1242), add two calls:

  ```javascript
  applyDefaultsToNewPatient(patient.id);
  applyDefaultsToNewIndicaciones(patient.id);
  ```

  The section should look like:
  ```javascript
  notes[patient.id] = { fecha:fecha, hora:hora, interrogatorio:'', evolucion:'', estudios:'', diagnosticos:[''], tratamiento:[''], ta:'', fr:'', fc:'', temp:'', peso:'', medico:'', profesor:'' };
  indicaciones[patient.id] = { fecha:fecha, hora:hora, medicos:'', dieta:'', cuidados:'', estudios:'', medicamentos:'', interconsultas:'', otros:[] };
  applyDefaultsToNewPatient(patient.id);
  applyDefaultsToNewIndicaciones(patient.id);
  ```

- [ ] **Step 4: Call `loadSettings()` on startup**

  After the existing startup calls at the bottom of the script (around line 983, after `renderPatientList()`):

  ```javascript
  renderPatientList();
  if (patients.length > 0) selectPatient(patients[0].id);
  loadSettings();   // ← add this line
  ```

- [ ] **Step 5: Verify settings feature end-to-end**

  1. Open `http://localhost:3738`
  2. Click "Mi Perfil" in sidebar → panel expands
  3. Enter doctor name, grado, and save → toast appears, label in toggle updates
  4. Reload → fields persist
  5. Add a new patient → in the Nota tab, "Médico Tratante" field is pre-filled
  6. Click "Editar plantillas…" → modal opens, fill Dieta, save → toast appears
  7. Add another patient → in Indicaciones tab, Dieta field is pre-filled

- [ ] **Step 6: Commit**

  ```bash
  git add public/index.html
  git commit -m "feat: Mi Perfil settings panel — persist doctor defaults and auto-fill new patients"
  ```

---

## Task 3: Multilab — smart lab slot detection

**Files:**
- Modify: `public/index.html` — `<script>` and `<style>` blocks

- [ ] **Step 1: Add CSS for conflict modal**

  Add to `<style>` block (before `</style>`):

  ```css
  /* ── Lab conflict modal ───────────────────────────────── */
  .lab-conflict-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 9995;
    display: flex; align-items: center; justify-content: center;
  }
  .lab-conflict-modal {
    background: var(--surface); border-radius: 10px; padding: 20px;
    width: 90%; max-width: 400px; box-shadow: var(--shadow-md);
    display: flex; flex-direction: column; gap: 14px;
  }
  .lab-conflict-modal h3 { font-size: 14px; font-weight: 700; color: var(--text); }
  .lab-conflict-modal p  { font-size: 13px; color: var(--text-muted); line-height: 1.5; }
  .lab-conflict-actions  { display: flex; flex-direction: column; gap: 8px; }
  .btn-conflict-primary {
    background: #166534; color: #bbf7d0; border: none; border-radius: 7px;
    padding: 10px 14px; font-size: 13px; font-weight: 700; font-family: inherit;
    cursor: pointer; text-align: left; transition: background 0.15s;
  }
  .btn-conflict-primary:hover { background: #14532d; }
  .btn-conflict-secondary {
    background: var(--bg); color: var(--text); border: 1px solid var(--border);
    border-radius: 7px; padding: 10px 14px; font-size: 13px; font-family: inherit;
    cursor: pointer; text-align: left; transition: background 0.15s;
  }
  .btn-conflict-secondary:hover { background: var(--border); }
  .btn-conflict-cancel {
    background: none; border: none; color: var(--text-muted); font-size: 12px;
    font-family: inherit; cursor: pointer; padding: 4px; align-self: center;
  }
  ```

- [ ] **Step 2: Add multilab JS functions**

  Add the following functions after `enviarLabsANota()` (around line 1127):

  ```javascript
  // ── Multilab ──────────────────────────────────────────────────────
  function buildLabLines() {
    // Builds the array of lines from activeLab (same logic as enviarLabsANota)
    var lines = [];
    if (activeLab.patient && activeLab.patient.fecha) {
      var fechaRaw = activeLab.patient.fecha;
      var mesesMap = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12',jan:'01',apr:'04',aug:'08',dec:'12'};
      var mFechaLab = fechaRaw.trim().match(/([A-Za-z]{3})\s+(\d{1,2})\s+\d{4}/);
      var monNum = mFechaLab && mesesMap[mFechaLab[1].toLowerCase()];
      var todayFb = new Date();
      var fbStr = String(todayFb.getDate()).padStart(2,'0')+'/'+String(todayFb.getMonth()+1).padStart(2,'0');
      lines.push(monNum ? mFechaLab[2].padStart(2,'0') + '/' + monNum : fbStr);
    }
    activeLab.resLabs.forEach(function(entry) {
      var cleaned = entry.replace(/\t/g, ' ').replace(/\*+/g, '').replace(/  +/g, ' ').trim();
      lines.push(cleaned);
    });
    return lines;
  }

  function checkStudiosAndInsertLabs() {
    var lines = buildLabLines();
    var existing = (notes[activeId] && notes[activeId].estudios) ? notes[activeId].estudios : '';
    var existingLines = existing.split('\n');
    // "Recent block" is considered empty if line index 3 (Fecha 2, 0-indexed) is blank/missing
    var recentDate = existingLines[3] ? existingLines[3].trim() : '';
    if (!recentDate) {
      // Slot is free — write directly to slots 3-7
      insertLabsAsRecent(lines);
    } else {
      // Recent block has data — show conflict modal
      showLabConflictModal(lines, recentDate);
    }
  }

  function insertLabsAsRecent(lines) {
    if (!notes[activeId]) notes[activeId] = {};
    // Get existing lines or start fresh
    var existing = (notes[activeId].estudios || '').split('\n');
    // Preserve anterior block (slots 0-2) and overwrite slots 3-7
    var anterior = existing.slice(0, 3);
    // Pad anterior if shorter than 3 lines
    while (anterior.length < 3) anterior.push('');
    var newLines = anterior.concat(lines);
    notes[activeId].estudios = newLines.join('\n');
    saveState();
    var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
    if (el) el.value = notes[activeId].estudios;
    showToast('Labs enviados a la nota ✓', 'success');
    switchAppTab('nota');
  }

  function insertLabsAsAnteriorThenRecent(newLines) {
    if (!notes[activeId]) notes[activeId] = {};
    var existing = (notes[activeId].estudios || '').split('\n');
    // Move current recent (slots 3-7) → anterior (slots 0-2), using slots 3,4,5 as anterior date/QS/ESC
    var anteriorDate = existing[3] || '';
    var anteriorQS   = existing[5] || ''; // slot 5 = QS reciente → QS anterior
    var anteriorESC  = existing[6] || ''; // slot 6 = ESC reciente → ESC anterior
    var anteriorBlock = [anteriorDate, anteriorQS, anteriorESC];
    var combined = anteriorBlock.concat(newLines);
    notes[activeId].estudios = combined.join('\n');
    saveState();
    var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
    if (el) el.value = notes[activeId].estudios;
    showToast('Fecha anterior guardada + nuevos labs agregados ✓', 'success');
    switchAppTab('nota');
  }

  function showLabConflictModal(newLines, existingDate) {
    var backdrop = document.createElement('div');
    backdrop.className = 'lab-conflict-backdrop';
    backdrop.id = 'lab-conflict-backdrop';
    backdrop.innerHTML = (
      '<div class="lab-conflict-modal">' +
      '<h3>Los estudios ya tienen datos</h3>' +
      '<p>El bloque reciente ya tiene labs del <strong>' + esc(existingDate) + '</strong>. ¿Qué hago con los nuevos labs?</p>' +
      '<div class="lab-conflict-actions">' +
      '<button class="btn-conflict-primary" id="btn-conflict-move">📋 Mover anterior + agregar reciente<br><span style="font-size:11px;font-weight:400;opacity:0.8;">Los labs actuales pasan al bloque anterior y los nuevos quedan como recientes</span></button>' +
      '<button class="btn-conflict-secondary" id="btn-conflict-replace">🔄 Reemplazar fecha reciente<br><span style="font-size:11px;font-weight:400;opacity:0.7;">Los labs actuales se borran, se escriben los nuevos</span></button>' +
      '<button class="btn-conflict-cancel" id="btn-conflict-cancel">Cancelar</button>' +
      '</div></div>'
    );
    document.body.appendChild(backdrop);
    document.getElementById('btn-conflict-move').onclick = function() {
      document.body.removeChild(backdrop);
      insertLabsAsAnteriorThenRecent(newLines);
    };
    document.getElementById('btn-conflict-replace').onclick = function() {
      document.body.removeChild(backdrop);
      // Replace only slots 3-7 (recent block)
      if (!notes[activeId]) notes[activeId] = {};
      var existing = (notes[activeId].estudios || '').split('\n');
      var anterior = existing.slice(0, 3);
      while (anterior.length < 3) anterior.push('');
      notes[activeId].estudios = anterior.concat(newLines).join('\n');
      saveState();
      var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
      if (el) el.value = notes[activeId].estudios;
      showToast('Fecha reciente reemplazada ✓', 'success');
      switchAppTab('nota');
    };
    document.getElementById('btn-conflict-cancel').onclick = function() {
      document.body.removeChild(backdrop);
    };
  }
  ```

- [ ] **Step 3: Replace `enviarLabsANota()` body to call `checkStudiosAndInsertLabs()`**

  Replace the existing `enviarLabsANota()` function. Find this block (lines 1094–1126):

  ```javascript
  function enviarLabsANota() {
    if (!activeLab || !activeLab.resLabs || !activeLab.resLabs.length) {
      showToast('No hay resultados procesados', 'error'); return;
    }
    if (!activeId) {
      if (!patients.length) { showToast('Agrega un paciente primero', 'error'); return; }
      if (patients.length === 1) { selectPatient(patients[0].id); }
      else { openLabPatientPicker(); return; }
    }
    // Format: strip \t → space, strip * markers, join sections with \n
    var lines = [];
    if (activeLab.patient && activeLab.patient.fecha) {
      var fechaRaw = activeLab.patient.fecha;
      var mesesMap = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12',jan:'01',apr:'04',aug:'08',dec:'12'};
      var mFechaLab = fechaRaw.trim().match(/([A-Za-z]{3})\s+(\d{1,2})\s+\d{4}/);
      var monNum = mFechaLab && mesesMap[mFechaLab[1].toLowerCase()];
      var todayFb = new Date(); var fbStr = String(todayFb.getDate()).padStart(2,'0')+'/'+String(todayFb.getMonth()+1).padStart(2,'0');
      lines.push(monNum ? mFechaLab[2].padStart(2,'0') + '/' + monNum : fbStr);
    }
    activeLab.resLabs.forEach(function(entry) {
      var cleaned = entry.replace(/\t/g, ' ').replace(/\*+/g, '').replace(/  +/g, ' ').trim();
      lines.push(cleaned);
    });
    var texto = lines.join('\n');
    if (!notes[activeId]) notes[activeId] = {};
    notes[activeId].estudios = texto;
    saveState();
    // Update textarea live if note-form is rendered
    var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
    if (el) el.value = texto;
    showToast('Labs enviados a la nota ✓', 'success');
    switchAppTab('nota');
  }
  ```

  Replace with:

  ```javascript
  function enviarLabsANota() {
    if (!activeLab || !activeLab.resLabs || !activeLab.resLabs.length) {
      showToast('No hay resultados procesados', 'error'); return;
    }
    if (!activeId) {
      if (!patients.length) { showToast('Agrega un paciente primero', 'error'); return; }
      if (patients.length === 1) { selectPatient(patients[0].id); }
      else { openLabPatientPicker(); return; }
    }
    // Check if we need to handle 2 date blocks
    checkStudiosAndInsertLabs();
  }
  ```

  > **Note:** The `pendingLab` flow in `savePatient()` calls `enviarLabsANota()` after setting `activeLab`. This still works because `checkStudiosAndInsertLabs()` uses `activeLab`.

- [ ] **Step 4: Verify multilab end-to-end**

  **Scenario A — First labs (empty slot):**
  1. Add a patient, go to Laboratorio, paste a lab report, click Procesar
  2. Click "Enviar a nota" → should go directly to Nota tab, labs in estudios textarea, no modal

  **Scenario B — Second labs (occupied slot):**
  1. Same patient, go back to Laboratorio, paste a second report, click Procesar
  2. Click "Enviar a nota" → conflict modal appears with existing date shown
  3. Click "Mover anterior + agregar reciente" → check estudios textarea: first labs at start, new labs after
  4. Repeat scenario B but click "Reemplazar fecha reciente" → only new labs remain in recent slots

  **Scenario C — Cancel:**
  5. Click "Enviar a nota" with occupied slot → click cancel → modal closes, estudios unchanged

- [ ] **Step 5: Commit**

  ```bash
  git add public/index.html
  git commit -m "feat: multilab smart slot detection — auto-detect conflict and show choice modal"
  ```

---

## Task 4: Onboarding — HTML structure + CSS

**Files:**
- Modify: `public/index.html` — `<style>` block and body HTML

- [ ] **Step 1: Add onboarding CSS**

  Add to `<style>` block (before `</style>`):

  ```css
  /* ── Onboarding ───────────────────────────────────────── */
  #onboarding-banner {
    background: #1e3a5f; color: #bfdbfe; padding: 10px 20px;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; gap: 12px; border-bottom: 1px solid #1d4ed8;
    flex-wrap: wrap;
  }
  #onboarding-banner .ob-text { font-size: 13px; font-weight: 500; flex: 1; min-width: 200px; }
  #onboarding-banner .ob-text strong { color: white; }
  #onboarding-banner .ob-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .btn-ob-next {
    background: #2563eb; color: white; border: none; border-radius: 6px;
    padding: 6px 14px; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer;
  }
  .btn-ob-next:hover { background: #1d4ed8; }
  .btn-ob-skip {
    background: transparent; color: #93c5fd; border: 1px solid rgba(147,197,253,0.4);
    border-radius: 6px; padding: 6px 10px; font-size: 12px; font-family: inherit; cursor: pointer;
  }
  .btn-ob-skip:hover { background: rgba(255,255,255,0.1); }
  /* Confetti particle */
  @keyframes confetti-fall {
    0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  .confetti-piece {
    position: fixed; width: 8px; height: 8px; border-radius: 2px;
    animation: confetti-fall 2.5s ease-in forwards;
    pointer-events: none; z-index: 99999;
  }
  ```

- [ ] **Step 2: Add onboarding banner HTML**

  Inside the `<div class="app-tabs">` block (around line 253), add the banner **after** the closing `</div>` of `.app-tabs` and before `<div class="app">`:

  ```html
  <!-- Onboarding banner — hidden until first launch -->
  <div id="onboarding-banner" style="display:none;">
    <div class="ob-text" id="ob-text">
      <strong>Bienvenido a R+.</strong> Hemos cargado un paciente de ejemplo para mostrarte el flujo.
    </div>
    <div class="ob-actions">
      <button class="btn-ob-next" id="ob-next-btn" onclick="onboardingNext()">Empezar →</button>
      <button class="btn-ob-skip" onclick="skipOnboarding()">Omitir tutorial</button>
    </div>
  </div>
  ```

- [ ] **Step 3: Verify HTML**

  Temporarily add `style="display:flex;"` to the banner in the HTML source, reload → the blue banner should appear below the tabs. Remove the temporary inline style.

- [ ] **Step 4: Commit**

  ```bash
  git add public/index.html
  git commit -m "feat: onboarding banner HTML and CSS structure"
  ```

---

## Task 5: Onboarding — JS logic

**Files:**
- Modify: `public/index.html` — `<script>` block

- [ ] **Step 1: Add onboarding constants**

  After the globals (after `var activeLab = null;`), add:

  ```javascript
  var onboardingStep = 0; // 0 = inactive, 1 = welcome, 2 = parse, 3 = send, 4 = generate

  var DEMO_PATIENT_ID = 'demo-onboarding';

  var DEMO_LAB_REPORT = 'LABORATORIO CLÍNICO — Hospital General\n' +
    'Paciente: DEMO PÉREZ Juan\nFecha: Apr 11 2026\n\n' +
    'BIOMETRÍA HEMÁTICA\n' +
    'Hemoglobina: 11.4 g/dL\nHematocrito: 34.8%\nVCM: 86 fL\nHCM: 28.2 pg\n' +
    'Leucocitos: 4.92 x10³/µL\nNeutrófilos: 2.76 x10³/µL\nEosinófilos: 0.275 x10³/µL\nPlaquetas: 198 x10³/µL\n\n' +
    'QUÍMICA SANGUÍNEA\n' +
    'Glucosa: 190 mg/dL\nCreatinina: 1.8 mg/dL\nBUN: 28 mg/dL\nPCR: 0.3 mg/dL\n' +
    'Ácido Úrico: 6.2 mg/dL\nTriglicéridos: 153 mg/dL\nColesterol Total: 166 mg/dL\n\n' +
    'ELECTROLITOS SÉRICOS\n' +
    'Sodio: 139.8 mEq/L\nCloro: 105 mEq/L\nPotasio: 3.2 mEq/L\nCalcio: 7.9 mg/dL\nFósforo: 3.4 mg/dL\n\n' +
    'PERFIL DE FUNCIÓN HEPÁTICA\n' +
    'Albúmina: 2.5 g/dL\nAST: 11 U/L\nALT: 6 U/L\nFosfatasa Alcalina: 103 U/L\n' +
    'Bilirrubina Total: 0.3 mg/dL\nBilirrubina Directa: 0.1 mg/dL\nBilirrubina Indirecta: 0.2 mg/dL\n' +
    'LDH: 120 U/L\nAmilasa: 25 U/L';
  ```

- [ ] **Step 2: Add core onboarding functions**

  Add after the `loadSettings()` block:

  ```javascript
  // ── Onboarding ────────────────────────────────────────────────────
  function startOnboarding() {
    // Create demo patient (not persisted in localStorage)
    var today = new Date();
    var fecha = String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear();
    var hora  = String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
    var demoPatient = {
      id: DEMO_PATIENT_ID, nombre: 'DEMO PÉREZ', nombre2: 'Juan',
      registro: '0000001', edad: '67 años', sexo: 'M',
      area: 'MEDICINA INTERNA', servicio: 'MEDICINA INTERNA',
      cuarto: '101', cama: '1', fromLab: false, isDemo: true
    };
    notes[DEMO_PATIENT_ID]        = { fecha:fecha, hora:hora, interrogatorio:'', evolucion:'', estudios:'', diagnosticos:['DM2, IRC estadio 3, HAS'], tratamiento:[''], ta:'', fr:'', fc:'', temp:'', peso:'', medico:'', profesor:'' };
    indicaciones[DEMO_PATIENT_ID] = { fecha:fecha, hora:hora, medicos:'', dieta:'', cuidados:'', estudios:'', medicamentos:'', interconsultas:'', otros:[] };
    // Prepend demo patient (don't save to localStorage)
    patients.unshift(demoPatient);
    onboardingStep = 1;
    renderPatientList();
    selectPatient(DEMO_PATIENT_ID);
    switchAppTab('lab');
    // Pre-fill lab input with demo report
    document.getElementById('lab-input').value = DEMO_LAB_REPORT;
    // Show banner step 1
    var banner = document.getElementById('onboarding-banner');
    banner.style.display = 'flex';
    document.getElementById('ob-text').innerHTML = '<strong>Bienvenido a R+.</strong> Hemos cargado un paciente de ejemplo. Sigue los pasos para conocer el flujo completo.';
    document.getElementById('ob-next-btn').textContent = 'Empezar →';
    document.getElementById('ob-next-btn').style.display = 'inline-block';
  }

  function onboardingNext() {
    if (onboardingStep === 1) {
      // Move to step 2: parse labs
      onboardingStep = 2;
      switchAppTab('lab');
      document.getElementById('ob-text').innerHTML = '<strong>Paso 1 de 3</strong> — Haz click en <strong>"Procesar"</strong> para extraer los valores de laboratorio del reporte de ejemplo.';
      document.getElementById('ob-next-btn').style.display = 'none'; // auto-advances
    }
  }

  function onboardingAdvanceAfterParse() {
    if (onboardingStep !== 2) return;
    onboardingStep = 3;
    document.getElementById('ob-text').innerHTML = '<strong>Paso 2 de 3</strong> — Excelente. Ahora haz click en <strong>"Enviar a nota"</strong> para cargar los labs en la nota del paciente.';
  }

  function onboardingAdvanceAfterSend() {
    if (onboardingStep !== 3) return;
    onboardingStep = 4;
    document.getElementById('ob-text').innerHTML = '<strong>Paso 3 de 3</strong> — Los labs ya están en la nota. Llena los campos clínicos y haz click en <strong>"Generar Nota (.docx)"</strong>.';
  }

  function finishOnboarding() {
    if (onboardingStep !== 4) return;
    onboardingStep = 0;
    localStorage.setItem('rpc-onboarding-done', '1');
    document.getElementById('ob-text').innerHTML = '<strong>🎉 ¡Listo!</strong> Ya sabes usar R+. Ahora agrega a tus propios pacientes.';
    document.getElementById('ob-next-btn').textContent = 'Cerrar tutorial';
    document.getElementById('ob-next-btn').style.display = 'inline-block';
    document.getElementById('ob-next-btn').onclick = function() {
      destroyDemoAndClose();
    };
    launchConfetti();
  }

  function skipOnboarding() {
    onboardingStep = 0;
    localStorage.setItem('rpc-onboarding-done', '1');
    destroyDemoAndClose();
  }

  function destroyDemoAndClose() {
    // Remove demo patient from in-memory array (was never in localStorage)
    patients = patients.filter(function(p) { return p.id !== DEMO_PATIENT_ID; });
    delete notes[DEMO_PATIENT_ID];
    delete indicaciones[DEMO_PATIENT_ID];
    if (activeId === DEMO_PATIENT_ID) {
      activeId = patients.length ? patients[0].id : null;
    }
    document.getElementById('onboarding-banner').style.display = 'none';
    document.getElementById('lab-input').value = '';
    limpiarReporte();
    renderPatientList();
    if (activeId) selectPatient(activeId);
    else { document.getElementById('patient-view').style.display = 'none'; document.getElementById('empty-state').style.display = 'flex'; }
  }

  function launchConfetti() {
    var colors = ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#fb7185'];
    for (var i = 0; i < 40; i++) {
      (function(i) {
        setTimeout(function() {
          var el = document.createElement('div');
          el.className = 'confetti-piece';
          el.style.left = (Math.random() * 100) + 'vw';
          el.style.top  = '-10px';
          el.style.background = colors[Math.floor(Math.random() * colors.length)];
          el.style.animationDelay = (Math.random() * 0.5) + 's';
          el.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
          document.body.appendChild(el);
          setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 3500);
        }, i * 40);
      })(i);
    }
  }
  ```

- [ ] **Step 3: Hook `onboardingAdvanceAfterParse()` into `renderOutput()`**

  In `renderOutput()` (around line 1139–1160), after `activeLab = result;`, add:

  ```javascript
  activeLab = result;
  onboardingAdvanceAfterParse(); // ← add this line
  ```

- [ ] **Step 4: Hook `onboardingAdvanceAfterSend()` into `insertLabsAsRecent()` and `insertLabsAsAnteriorThenRecent()`**

  In `insertLabsAsRecent()`, before the `showToast(...)` call, add:
  ```javascript
  onboardingAdvanceAfterSend();
  ```

  In `insertLabsAsAnteriorThenRecent()`, before the `showToast(...)` call, add:
  ```javascript
  onboardingAdvanceAfterSend();
  ```

  Also handle the "replace" branch in `showLabConflictModal()` (inside the `btn-conflict-replace` onclick), before `showToast(...)`:
  ```javascript
  onboardingAdvanceAfterSend();
  ```

- [ ] **Step 5: Hook `finishOnboarding()` into `generateWord()`**

  In `generateWord()` (around line 1332), in the `.then` success handler, add:

  ```javascript
  .then(function(d){
    if(d.ok) {
      showToast('Nota guardada: '+d.fileName,'success');
      finishOnboarding(); // ← add this line
    } else {
      showToast('Error: '+d.error,'error');
    }
  })
  ```

- [ ] **Step 6: Auto-start onboarding on first load**

  Replace the startup block at the bottom of the script:

  ```javascript
  renderPatientList();
  if (patients.length > 0) selectPatient(patients[0].id);
  loadSettings();
  ```

  With:

  ```javascript
  renderPatientList();
  if (patients.length > 0) selectPatient(patients[0].id);
  loadSettings();
  // Auto-start onboarding on first launch (no patients yet and not done before)
  if (!localStorage.getItem('rpc-onboarding-done') && patients.length === 0) {
    startOnboarding();
  }
  ```

  Also add a "Ver tutorial" button to the Mi Perfil section. In the `profile-body` div HTML (from Task 1 Step 2), add after `.btn-save-profile`:

  ```html
  <button class="btn-edit-templates" style="margin-top:2px;" onclick="resetAndStartOnboarding()">🎓 Ver tutorial</button>
  ```

  And add the function to JS (after `skipOnboarding()`):

  ```javascript
  function resetAndStartOnboarding() {
    localStorage.removeItem('rpc-onboarding-done');
    // Clean up any leftover demo patient
    patients = patients.filter(function(p){ return p.id !== DEMO_PATIENT_ID; });
    delete notes[DEMO_PATIENT_ID]; delete indicaciones[DEMO_PATIENT_ID];
    startOnboarding();
  }
  ```

- [ ] **Step 7: Verify onboarding end-to-end**

  1. Clear localStorage (`localStorage.clear()` in console), reload
  2. "DEMO PÉREZ" should appear selected, lab report pre-filled, banner shows "Bienvenido"
  3. Click "Empezar →" → banner text changes to "Paso 1 de 3 — Haz click en Procesar"
  4. Click "Procesar" → labs parse, banner text changes to "Paso 2 de 3"
  5. Click "Enviar a nota" → goes to Nota tab, banner text changes to "Paso 3 de 3"
  6. Click "Generar Nota (.docx)" → confetti + "¡Listo!" banner + "Cerrar tutorial" button
  7. Click "Cerrar tutorial" → banner disappears, demo patient removed from sidebar
  8. Reload → no demo patient, no banner, `rpc-onboarding-done` is `'1'` in localStorage
  9. Open Mi Perfil → click "Ver tutorial" → tutorial restarts from scratch

- [ ] **Step 8: Commit**

  ```bash
  git add public/index.html
  git commit -m "feat: interactive onboarding with demo patient, step banner, and confetti"
  ```

---

## Task 6: Final QA pass and version bump

**Files:**
- Modify: `public/index.html` — version string in header
- Modify: `package.json` — version bump to 1.4.0

- [ ] **Step 1: Bump version in `package.json`**

  Change `"version": "1.3.6"` → `"version": "1.4.0"`.

- [ ] **Step 2: Bump version display in `index.html`**

  Find the header version string (e.g. `v1.3.6` near the `<header>` or `<span id="today-date">`) and update to `v1.4.0`.

  Check with:
  ```bash
  grep -n "1\.3\." public/index.html | head -10
  ```

- [ ] **Step 3: Full smoke test**

  Run through this checklist:
  - [ ] Settings: save profile → reload → values persist
  - [ ] Settings: new patient inherits doctor defaults
  - [ ] Settings: new patient indicaciones inherits dieta/cuidados defaults
  - [ ] Multilab: first lab → no modal, goes straight to nota
  - [ ] Multilab: second lab → modal appears with correct existing date
  - [ ] Multilab: "Mover anterior" → estudios textarea shows previous labs in slots 0-2, new in 3+
  - [ ] Multilab: "Reemplazar" → only new labs in estudios
  - [ ] Onboarding: fresh localStorage → demo patient loads + banner
  - [ ] Onboarding: complete flow → confetti + dismiss → demo patient gone
  - [ ] Onboarding: "Omitir" → demo gone immediately
  - [ ] Onboarding: "Ver tutorial" in Mi Perfil → restarts correctly
  - [ ] Dark mode: all new elements render correctly in dark theme
  - [ ] Existing features: generate note/indicaciones DOCX still works

- [ ] **Step 4: Commit version bump**

  ```bash
  git add public/index.html package.json
  git commit -m "chore: bump version to 1.4.0 for Quick Wins v2 release"
  ```

---

## Self-Review Notes

- `buildLabLines()` duplicates the date formatting from the old `enviarLabsANota()`. This is intentional — extracting it into a shared helper avoids touching unrelated code paths (the `savePatient()` pendingLab flow still calls `enviarLabsANota()` which now routes through `checkStudiosAndInsertLabs()` → `buildLabLines()`).
- The demo patient is inserted into `patients[]` in memory but never written to `localStorage`. `saveState()` is called during onboarding (when the user sends labs), which would persist the demo. To prevent this, `saveState()` should skip the demo patient. Add this guard to `saveState()`:

  ```javascript
  function saveState() {
    localStorage.setItem('rpc-patients', JSON.stringify(patients.filter(function(p){ return !p.isDemo; })));
    localStorage.setItem('rpc-notes', JSON.stringify(notes));
    localStorage.setItem('rpc-indicaciones', JSON.stringify(indicaciones));
  }
  ```

  This fix is part of **Task 5 Step 2** — add it when implementing `startOnboarding()`. The `notes` and `indicaciones` entries for the demo ID are harmless in localStorage since the patient won't appear on reload.
