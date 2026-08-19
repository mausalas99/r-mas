import { esc } from '../dom-escape.mjs';
// Expediente · nota evolución, indicaciones, Word
import { getPatients, getNotes, getIndicaciones, persistClinicalState } from "../app-state.mjs";
import { setAsyncButtonLoading } from "../ui-motion.mjs";
import {
  applyNotaFormatScaffoldIfEmpty,
  applyIndicacionesFormatScaffoldIfEmpty,
} from "../profile-templates.mjs";
import {
  getFormatsEditMode,
  buildNoteDefaultsEditorHtml,
  buildIndicaDefaultsEditorHtml,
  loadDraftFromSettings,
} from "../profile-formats-editor.mjs";
import {
  preloadNoteDxFromPatient,
  syncNoteDxFromPatient,
  ensureNoteDxFromPatientForExport,
} from "../patient-diagnosticos.mjs";
import {
  exportWithOutputDirFallback,
  guardDocExportBlocked,
  syncApprovedOutputDir,
} from "../document-export-client.mjs";
import { openConfirm } from "./workbench/confirm.mjs";

let rt = {
  getActiveId() { return null; },
  getSettings() { return /** @type {any} */ ({}); },
  showToast() {},
  syncOfflineButtonStates() {},
  guardMobileDocExport() { return false; },
  isRpcOffline() { return false; },
  incrementPendingJobs() {},
  decrementPendingJobs() {},
  requestDocumentJson() { return Promise.resolve(null); },
  handleDocumentGenerateResponse() { return Promise.resolve(null); },
  guidedTourAdvanceAfterNotaGenerated() {},
  guidedTourAdvanceAfterIndicaGenerated() {},
  onPitchTourDocFailed() {},
  addAuditEntry() {},
};

export function registerNotesIndicacionesRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}

function aid() {
  return rt.getActiveId();
}

// ── Prefill médico ─────────────────────────────────────────────────────
export function applyProfileToNoteIfEmpty(note) {
  if (!note) return false;
  var changed = false;
  if ((rt.getSettings() || {}).doctorName && !String(note.medico || '').trim()) {
    note.medico = (rt.getSettings() || {}).doctorName;
    changed = true;
  }
  if ((rt.getSettings() || {}).profesorName && !String(note.profesor || '').trim()) {
    note.profesor = (rt.getSettings() || {}).profesorName;
    changed = true;
  }
  return changed;
}

// ── Formulario Nota ───────────────────────────────────────────────────
function renderNoteForm() {
  if (getFormatsEditMode() === "nota") {
    var st = rt.getSettings() || {};
    loadDraftFromSettings(st);
    document.getElementById("note-form").innerHTML = buildNoteDefaultsEditorHtml(st);
    return;
  }
  var patient = getPatients().find(function (p) {
    return String(p.id) === String(aid());
  });
  if (!patient) return;
  if (aid()) {
    if (!getNotes()[aid()]) getNotes()[aid()] = {};
    var changed = applyProfileToNoteIfEmpty(getNotes()[aid()]);
    if (applyNotaFormatScaffoldIfEmpty(getNotes()[aid()], rt.getSettings() || {})) changed = true;
    if (changed) persistClinicalState();
  }
  var note = getNotes()[aid()] || {};
  var pid = aid();
  if (pid) {
    var pat = getPatients().find(function (p) {
      return String(p.id) === String(pid);
    });
    if (pat && preloadNoteDxFromPatient(note, pat)) persistClinicalState();
  }
  document.getElementById('note-form').innerHTML = (
    '<div class="card"><div class="card-header card-header--tone-slate"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha y Hora</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group"><label>Fecha</label><input type="text" value="' + esc(note.fecha) + '" oninput="updateNote(\'fecha\',this.value)" placeholder="DD/MM/AAAA"></div>' +
    '<div class="field-group"><label>Hora</label><input type="text" value="' + esc(note.hora) + '" oninput="updateNote(\'hora\',this.value)" placeholder="HH:MM"></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Resumen de Interrogatorio, Exploración Física y Estado Mental</div><div class="card-body"><div class="field-group"><textarea rows="5" placeholder="Ingresa el resumen de interrogatorio, exploración física y estado mental..." oninput="updateNote(\'interrogatorio\',this.value)">' + esc(note.interrogatorio) + '</textarea></div></div></div>' +

    '<div class="card"><div class="card-header card-header--tone-green"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Evolución y Actualización del Cuadro Clínico</div><div class="card-body"><div class="field-group"><textarea rows="7" placeholder="Estructura N / V / HD / HI / NM. Edita los formatos en Mi Perfil." oninput="updateNote(\'evolucion\',this.value)">' + esc(note.evolucion) + '</textarea></div></div></div>' +

    '<div class="card"><div class="card-header card-header--tone-indigo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>Resultados de Estudios Auxiliares</div><div class="card-body"><div class="field-group"><textarea rows="9" placeholder="FECHA (DD/MM/AA)&#10;QS&#10;BH&#10;EGO&#10;(una línea por renglón; sin valores de ejemplo)" oninput="updateNote(\'estudios\',this.value)">' + esc(note.estudios) + '</textarea></div></div></div>' +

    '<div class="card"><div class="card-header card-header--tone-rose card-header-row"><span style="display:flex;align-items:center;gap:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>Diagnóstico(s)</span><button type="button" class="card-header-ghost-btn" onclick="syncNoteDxFromCenso()" title="Traer diagnósticos del censo del paciente a la nota">Desde censo</button></div><div class="card-body">' +
    '<div class="list-rows" id="dx-list">' +
    (note.diagnosticos||['']).map(function(dx,i){ return '<div class="list-row"><input type="text" value="' + esc(dx) + '" placeholder="Diagnóstico ' + (i+1) + '" oninput="updateDx(' + i + ',this.value)" style="text-transform:uppercase;"><button class="btn-remove" onclick="removeDx(' + i + ')"' + ((note.diagnosticos||['']).length<=1?' style="visibility:hidden"':'') + ' aria-label="Eliminar">×</button></div>'; }).join('') +
    '</div><button class="btn-add-row" onclick="addDx()">+ Agregar diagnóstico</button></div></div>' +

    '<div class="card"><div class="card-header card-header--tone-amber"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Signos Vitales</div><div class="card-body"><div class="vitals-grid">' +
    '<div class="vital-box"><div class="vital-label">T.A.</div><input type="text" value="' + esc(note.ta) + '" placeholder="120/80" oninput="updateNote(\'ta\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">F.R.</div><input type="text" value="' + esc(note.fr) + '" placeholder="16" oninput="updateNote(\'fr\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">F.C.</div><input type="text" value="' + esc(note.fc) + '" placeholder="72" oninput="updateNote(\'fc\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">Temperatura</div><input type="text" value="' + esc(note.temp) + '" placeholder="36.6" oninput="updateNote(\'temp\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">Peso (kg)</div><input type="text" value="' + esc(note.peso) + '" placeholder="70.0" oninput="updateNote(\'peso\',this.value)"></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header card-header--tone-teal"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>Tratamiento e Indicaciones Médicas</div><div class="card-body">' +
    '<div class="list-rows" id="tx-list">' +
    (note.tratamiento||['']).map(function(tx,i){ return '<div class="list-row"><span class="list-num">' + (i+1) + '.</span><input type="text" value="' + esc(tx) + '" placeholder="Indicación, dosis, vía y periodicidad" oninput="updateTx(' + i + ',this.value)"><button class="btn-remove" onclick="removeTx(' + i + ')"' + ((note.tratamiento||['']).length<=1?' style="visibility:hidden"':'') + ' aria-label="Eliminar">×</button></div>'; }).join('') +
    '</div><button class="btn-add-row" onclick="addTx()">+ Agregar indicación</button></div></div>' +

    '<div class="card"><div class="card-header card-header--tone-violet"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Médico y Profesor</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group"><label>Médico Tratante</label><input type="text" value="' + esc(note.medico) + '" placeholder="Nombre completo" oninput="updateNote(\'medico\',this.value)"></div>' +
    '<div class="field-group"><label>Profesor Responsable</label><input type="text" value="' + esc(note.profesor) + '" placeholder="Nombre completo" oninput="updateNote(\'profesor\',this.value)"></div>' +
    '</div></div></div>' +

    '<div class="action-bar"><button type="button" class="btn-med-secondary rpc-doc-export" onclick="quickExportCurrentPatient()" id="btn-quick-export-note"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida rápida</button><button type="button" class="btn-generate rpc-doc-export" onclick="generateWord()" id="btn-gen"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Nota (.docx)</button></div>'
  );
  rt.syncOfflineButtonStates();
}

// ── Campos Dx/Tx ──────────────────────────────────────────────────────
function updateNote(field, value) { if (!getNotes()[aid()]) getNotes()[aid()]={}; getNotes()[aid()][field]=value; persistClinicalState(); }
function updateDx(i, val) { if (!getNotes()[aid()]) return; getNotes()[aid()].diagnosticos[i]=val.toUpperCase(); persistClinicalState(); }
function addDx() { if (!getNotes()[aid()]) return; getNotes()[aid()].diagnosticos.push(''); persistClinicalState(); renderNoteForm(); }
function removeDx(i) { if (!getNotes()[aid()]||getNotes()[aid()].diagnosticos.length<=1) return; getNotes()[aid()].diagnosticos.splice(i,1); persistClinicalState(); renderNoteForm(); }

/** Pull patient censo diagnoses into the open note (asks before overwrite). */
async function syncNoteDxFromCenso() {
  var pid = aid();
  if (!pid || !getNotes()[pid]) return;
  var pat = getPatients().find(function (p) {
    return String(p.id) === String(pid);
  });
  if (!pat) return;
  var note = getNotes()[pid];
  var hasNoteDx = (note.diagnosticos || []).some(function (d) {
    return String(d).trim();
  });
  if (hasNoteDx) {
    var result = await openConfirm({
      weight: 'consequence',
      title: '¿Reemplazar los diagnósticos de la nota con los del censo del paciente?',
      confirmLabel: 'Reemplazar',
    });
    if (result !== 'confirm') return;
  }
  if (!syncNoteDxFromPatient(note, pat, { mode: 'replace' })) {
    rt.showToast('No hay diagnósticos en el censo de este paciente.', 'info');
    return;
  }
  persistClinicalState();
  renderNoteForm();
  rt.showToast('Diagnósticos del censo en la nota ✓', 'success');
}

function updateTx(i, val) { if (!getNotes()[aid()]) return; getNotes()[aid()].tratamiento[i]=val; persistClinicalState(); }
function addTx() { if (!getNotes()[aid()]) return; getNotes()[aid()].tratamiento.push(''); persistClinicalState(); renderNoteForm(); }
function removeTx(i) { if (!getNotes()[aid()]||getNotes()[aid()].tratamiento.length<=1) return; getNotes()[aid()].tratamiento.splice(i,1); persistClinicalState(); renderNoteForm(); }

// ── Word nota ───────────────────────────────────────────────────────────
function generateWord() {
  if (rt.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt.isRpcOffline, showToast: rt.showToast })) return;
  var patient = getPatients().find(function(p){ return p.id===aid(); }); if (!patient) return;
  var note = getNotes()[aid()]; if (!note) return;
  if (ensureNoteDxFromPatientForExport(note, patient)) persistClinicalState();
  var btn = document.getElementById('btn-gen');
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: 'Generando…' });
  rt.incrementPendingJobs();
  function buildPayload() {
    return { patient: patient, note: note };
  }
  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) return Promise.resolve(undefined);
    return window.electronAPI.selectOutputDir();
  }
  function saveOutputDir(dir) {
    if (!dir) return;
    var st = rt.getSettings() || {};
    st.outputDir = dir;
    localStorage.setItem('rpc-settings', JSON.stringify(st));
    syncApprovedOutputDir(dir);
  }
  exportWithOutputDirFallback({
    url: '/generate',
    buildPayload: buildPayload,
    defaultFileName: 'nota.docx',
    selectOutputDir: selectOutputDir,
    saveOutputDir: saveOutputDir,
    onSuccess: function(data) {
      var name = (data && (data.fileName || data.path)) ? (data.fileName || String(data.path).split(/[/\\]/).pop()) : 'nota.docx';
      rt.showToast('Nota guardada: ' + name, 'success');
      rt.guidedTourAdvanceAfterNotaGenerated();
    },
    onPrompt: function() { rt.showToast('Selecciona una carpeta para guardar el documento.', 'error'); },
    onCancel: function() { rt.showToast('No se guardó el documento: no se eligió carpeta.', 'error'); },
    onError: function(msg) { rt.showToast('Error: ' + msg, 'error'); },
  })
  .catch(function(){
    rt.showToast('Error de conexión','error');
    if (typeof rt.onPitchTourDocFailed === 'function') rt.onPitchTourDocFailed('ic_nota');
  })
  .finally(function(){
    setAsyncButtonLoading(document.getElementById('btn-gen'), false);
    rt.decrementPendingJobs();
    rt.syncOfflineButtonStates();
  });
}

// ── Indicaciones ─────────────────────────────────────────────────────
function renderIndicaForm() {
  if (getFormatsEditMode() === "indica") {
    var st = rt.getSettings() || {};
    loadDraftFromSettings(st);
    document.getElementById("indica-form").innerHTML = buildIndicaDefaultsEditorHtml(st);
    return;
  }
  if (!getPatients().some(function (p) { return p.id === aid(); })) return;
  if (!getIndicaciones()[aid()]) {
    var today = new Date();
    getIndicaciones()[aid()] = { fecha:String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear(), hora:String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0'), medicos:'',dieta:'',cuidados:'',estudios:'',medicamentos:'',interconsultas:'',otros:[] };
    applyIndicacionesFormatScaffoldIfEmpty(getIndicaciones()[aid()], rt.getSettings() || {});
    persistClinicalState();
  }
  var ind = getIndicaciones()[aid()];
  var SECTIONS = [
    {key:'dieta',label:'Dieta',placeholder:'Escriba la dieta (una indicación por línea si aplica)…'},
    {key:'cuidados',label:'Cuidados',placeholder:'Signos vitales, balance, dispositivos, etc.…'},
    {key:'estudios',label:'Estudios',placeholder:'BH, QS, EGO, imágenes…'},
    {key:'medicamentos',label:'Medicamentos',placeholder:'Fármaco, dosis, vía y horario…'},
    {key:'interconsultas',label:'Interconsultas',placeholder:'Servicio y motivo de interconsulta…'},
  ];
  document.getElementById('indica-form').innerHTML = (
    '<div class="indica-meta-bar" role="group" aria-label="Fecha, hora y médicos">' +
    '<div class="field-group indica-meta-field"><label>Fecha</label><input type="text" value="' + esc(ind.fecha) + '" placeholder="DD/MM/AAAA" oninput="updateIndica(\'fecha\',this.value)"></div>' +
    '<div class="field-group indica-meta-field"><label>Hora</label><input type="text" value="' + esc(ind.hora) + '" placeholder="HH:MM" oninput="updateIndica(\'hora\',this.value)"></div>' +
    '<div class="field-group indica-meta-field indica-meta-field--medicos"><label>Médicos</label><textarea rows="2" placeholder="R3 NOMBRE APELLIDO" oninput="updateIndica(\'medicos\',this.value)">' + esc(ind.medicos) + '</textarea></div>' +
    '</div>' +

    buildExtraTemplatesSelectorHtml() +

    SECTIONS.map(function(s){ return '<div class="indica-section"><div class="indica-section-header">'+s.label+'</div><div class="indica-section-body"><textarea rows="3" placeholder="'+s.placeholder+'" oninput="updateIndica(\''+s.key+'\',this.value)">'+esc(ind[s.key])+'</textarea></div></div>'; }).join('') +

    '<div class="card"><div class="card-header card-header--tone-violet"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 4v16m8-8H4"/></svg>Otros</div><div class="card-body" style="display:flex;flex-direction:column;gap:10px;"><div id="otros-list">' +
    (ind.otros||[]).map(function(o,i){ return '<div class="otros-item"><button class="btn-remove-otro" onclick="removeOtro('+i+')">×</button><input type="text" placeholder="TÍTULO DE LA SECCIÓN" value="'+esc(o.titulo)+'" oninput="updateOtro('+i+',\'titulo\',this.value)"><textarea rows="2" placeholder="Indicaciones..." oninput="updateOtro('+i+',\'contenido\',this.value)">'+esc(o.contenido)+'</textarea></div>'; }).join('') +
    '</div><button class="btn-add-row" onclick="addOtro()">+ Agregar sección</button></div></div>' +

    '<div class="action-bar"><button type="button" class="btn-med-secondary rpc-doc-export" onclick="quickExportCurrentPatient()" id="btn-quick-export-indica"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida rápida</button><button type="button" class="btn-generate rpc-doc-export" onclick="generateIndicaciones()" id="btn-gen-ind"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Indicaciones (.docx)</button></div>'
  );
  rt.syncOfflineButtonStates();
}

function updateIndica(field, value) { if (!getIndicaciones()[aid()]) return; getIndicaciones()[aid()][field]=value; persistClinicalState(); }

function updateOtro(i, field, value) { if (!getIndicaciones()[aid()]) return; getIndicaciones()[aid()].otros[i][field]=value; persistClinicalState(); }

function addOtro() {
  if (!getIndicaciones()[aid()]) return;
  getIndicaciones()[aid()].otros = getIndicaciones()[aid()].otros || [];
  getIndicaciones()[aid()].otros.push({ titulo:'', contenido:'' });
  persistClinicalState();
  renderIndicaForm();
}

function removeOtro(i) {
  if (!getIndicaciones()[aid()]) return;
  getIndicaciones()[aid()].otros.splice(i, 1);
  persistClinicalState();
  renderIndicaForm();
}

// ── Plantillas guardadas ──────────────────────────────────────────────
function buildExtraTemplatesSelectorHtml() {
  var arr = ((rt.getSettings() || {}) && Array.isArray((rt.getSettings() || {}).extraTemplates)) ? (rt.getSettings() || {}).extraTemplates : [];
  var predBtn =
    '<button type="button" class="btn-med-secondary" onclick="openIndicaFormatsFromProfile()" title="Editar formatos en blanco de indicaciones">Predeterminados…</button>';
  if (!arr.length) {
    return (
      '<div class="indica-extra-tmpl">' +
      predBtn +
      '<span class="iet-hint">Plantillas guardadas: Ajustes → Plantillas. Formatos en blanco: Predeterminados…</span>' +
      '</div>'
    );
  }
  var opts = '<option value="">— Aplicar plantilla guardada —</option>' +
    arr.map(function(t){ return '<option value="' + esc(t.id) + '">' + esc(t.label || '(sin nombre)') + '</option>'; }).join('');
  return '<div class="indica-extra-tmpl">' +
    predBtn +
    '<select id="indica-extra-tmpl-select" aria-label="Seleccionar plantilla guardada">' + opts + '</select>' +
    '<button type="button" onclick="applyExtraTemplateFromIndica()">Aplicar</button>' +
    '</div>';
}

function indicaHasExistingContent(target) {
  return (
    (target.dieta && target.dieta.trim()) ||
    (target.cuidados && target.cuidados.trim()) ||
    (target.medicamentos && target.medicamentos.trim())
  );
}

function resolveExtraTemplateMergeMode(hasExisting) {
  if (!hasExisting) return 'replace';
  var ans = prompt(
    'Ya hay contenido en las indicaciones.\nEscribe R = reemplazar, A = agregar al final, C = cancelar.',
    'A'
  );
  var v = String(ans || '').trim().toUpperCase();
  if (v === 'C' || v === '') return null;
  return v === 'R' ? 'replace' : 'append';
}

function mergeIndicaField(current, addition, mode) {
  if (!addition) return current || '';
  if (mode === 'replace') return addition;
  if (!current) return addition;
  return current.replace(/\s+$/, '') + '\n' + addition;
}

function applyIndicaTemplateFields(target, tmpl, mode) {
  target.dieta = mergeIndicaField(target.dieta || '', tmpl.dieta || '', mode);
  target.cuidados = mergeIndicaField(target.cuidados || '', tmpl.cuidados || '', mode);
  target.medicamentos = mergeIndicaField(target.medicamentos || '', tmpl.medicamentos || '', mode);
}

function applyExtraTemplateFromIndica() {
  var sel = document.getElementById('indica-extra-tmpl-select');
  if (!sel || !sel.value) { rt.showToast('Elige una plantilla', 'error'); return; }
  if (!aid() || !getIndicaciones()[aid()]) { rt.showToast('Selecciona un paciente primero', 'error'); return; }
  var tmpl = ((rt.getSettings() || {}).extraTemplates || []).find(function(t){ return t.id === sel.value; });
  if (!tmpl) return;
  var target = getIndicaciones()[aid()];
  var mode = resolveExtraTemplateMergeMode(indicaHasExistingContent(target));
  if (!mode) return;
  applyIndicaTemplateFields(target, tmpl, mode);
  persistClinicalState();
  renderIndicaForm();
  rt.addAuditEntry('extra-template-apply', 'ok', 1, tmpl.label || '');
  rt.showToast('Plantilla aplicada: ' + (tmpl.label || ''), 'success');
}

// ── Word indicaciones ────────────────────────────────────────────────
function generateIndicaciones() {
  if (rt.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt.isRpcOffline, showToast: rt.showToast })) return;
  var patient = getPatients().find(function(p){ return p.id===aid(); }); if (!patient) return;
  var ind = getIndicaciones()[aid()]; if (!ind) return;
  var btn = document.getElementById('btn-gen-ind');
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: 'Generando…' });
  rt.incrementPendingJobs();
  function buildPayload() {
    return { patient: patient, indicaciones: ind };
  }
  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) return Promise.resolve(undefined);
    return window.electronAPI.selectOutputDir();
  }
  function saveOutputDir(dir) {
    if (!dir) return;
    var st = rt.getSettings() || {};
    st.outputDir = dir;
    localStorage.setItem('rpc-settings', JSON.stringify(st));
    syncApprovedOutputDir(dir);
  }
  exportWithOutputDirFallback({
    url: '/generate-indicaciones',
    buildPayload: buildPayload,
    defaultFileName: 'indicaciones.docx',
    selectOutputDir: selectOutputDir,
    saveOutputDir: saveOutputDir,
    onSuccess: function(data) {
      var name = (data && (data.fileName || data.path)) ? (data.fileName || String(data.path).split(/[/\\]/).pop()) : 'indicaciones.docx';
      rt.showToast('Indicaciones guardadas: ' + name, 'success');
      rt.guidedTourAdvanceAfterIndicaGenerated();
    },
    onPrompt: function() { rt.showToast('Selecciona una carpeta para guardar el documento.', 'error'); },
    onCancel: function() { rt.showToast('No se guardó el documento: no se eligió carpeta.', 'error'); },
    onError: function(msg) { rt.showToast('Error: ' + msg, 'error'); },
  })
  .catch(function(){
    rt.showToast('Error de conexión','error');
    if (typeof rt.onPitchTourDocFailed === 'function') rt.onPitchTourDocFailed('ic_indica');
  })
  .finally(function(){
    setAsyncButtonLoading(document.getElementById('btn-gen-ind'), false);
    rt.decrementPendingJobs();
    rt.syncOfflineButtonStates();
  });
}


export {
  renderNoteForm,
  updateNote,
  updateDx,
  addDx,
  removeDx,
  updateTx,
  addTx,
  removeTx,
  syncNoteDxFromCenso,
  generateWord,
  renderIndicaForm,
  updateIndica,
  updateOtro,
  addOtro,
  removeOtro,
  generateIndicaciones,
};

export const windowHandlers = {
  updateNote,
  updateDx,
  addDx,
  removeDx,
  updateTx,
  addTx,
  removeTx,
  syncNoteDxFromCenso,
  generateWord,
  renderIndicaForm,
  updateIndica,
  updateOtro,
  addOtro,
  removeOtro,
  generateIndicaciones,
  applyExtraTemplateFromIndica,
};
