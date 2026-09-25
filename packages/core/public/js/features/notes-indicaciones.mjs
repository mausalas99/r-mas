import { esc, escAttr } from '../dom-escape.mjs';
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
  var dxs = note.diagnosticos || [''];
  var txs = note.tratamiento || [''];
  // One screen, no scroll: every .docx field in six equal boxes.
  document.getElementById('note-form').innerHTML = (
    '<div class="fit-screen">' +
    '<div class="fit-head">' +
    '<span class="fit-title">Nota de evolución</span>' +
    '<label class="fit-inline">Fecha<input type="text" value="' + esc(note.fecha) + '" data-oninput="updateNote" data-oninput-args=\'["fecha"]\' data-oninput-pass="value" placeholder="DD/MM/AAAA"></label>' +
    '<label class="fit-inline fit-inline--short">Hora<input type="text" value="' + esc(note.hora) + '" data-oninput="updateNote" data-oninput-args=\'["hora"]\' data-oninput-pass="value" placeholder="HH:MM"></label>' +
    '<span class="fit-spacer"></span>' +
    pastDocsButtonHtml('nota', note) +
    '<button type="button" class="wb-btn wb-btn-secondary" data-onclick="estadoActualEnviarANota" title="Llena Evolución y Signos vitales con el Estado actual">Traer de Estado actual</button>' +
    '<button type="button" class="wb-btn wb-btn-secondary rpc-doc-export" data-onclick="quickExportCurrentPatient" id="btn-quick-export-note">Salida rápida</button>' +
    '<button type="button" class="wb-btn wb-btn-primary rpc-doc-export" data-onclick="generateWord" id="btn-gen">Generar Nota (.docx)</button>' +
    '</div>' +
    '<div class="fit-grid nota-fit-grid">' +

    '<section class="fit-block" style="grid-area:s"><h4>Interrogatorio, exploración y estado mental</h4>' +
    '<textarea placeholder="Refiere / niega…" data-oninput="updateNote" data-oninput-args=\'["interrogatorio"]\' data-oninput-pass="value">' + esc(note.interrogatorio) + '</textarea></section>' +

    '<section class="fit-block" style="grid-area:o"><h4>Evolución · N / V / HD / HI / NM</h4>' +
    '<textarea placeholder="Estructura N / V / HD / HI / NM. Edita los formatos en Mi Perfil." data-oninput="updateNote" data-oninput-args=\'["evolucion"]\' data-oninput-pass="value">' + esc(note.evolucion) + '</textarea></section>' +

    '<section class="fit-block" style="grid-area:lab"><h4>Estudios auxiliares</h4>' +
    '<textarea placeholder="Fecha, luego un estudio por renglón" data-oninput="updateNote" data-oninput-args=\'["estudios"]\' data-oninput-pass="value">' + esc(note.estudios) + '</textarea></section>' +

    '<section class="fit-block" style="grid-area:dx"><h4>Diagnósticos<button type="button" class="wb-btn wb-btn-ghost wb-btn-sm" data-onclick="syncNoteDxFromCenso" title="Traer los diagnósticos del censo a la nota">Desde censo</button></h4>' +
    '<div class="fit-list list-rows" id="dx-list">' +
    dxs.map(function (dx, i) { return '<div class="list-row"><input type="text" value="' + esc(dx) + '" placeholder="Diagnóstico ' + (i + 1) + '" data-oninput="updateDx" data-oninput-args="[' + i + ']" data-oninput-pass="value" style="text-transform:uppercase;"><button class="btn-remove" data-onclick="removeDx" data-onclick-args="[' + i + ']"' + (dxs.length <= 1 ? ' style="visibility:hidden"' : '') + ' aria-label="Eliminar">×</button></div>'; }).join('') +
    '<button class="btn-add-row" data-onclick="addDx">+ Agregar diagnóstico</button></div></section>' +

    '<section class="fit-block" style="grid-area:tx"><h4>Tratamiento e indicaciones</h4>' +
    '<div class="fit-list list-rows" id="tx-list">' +
    txs.map(function (tx, i) { return '<div class="list-row"><span class="list-num">' + (i + 1) + '.</span><input type="text" value="' + esc(tx) + '" placeholder="Indicación, dosis, vía y periodicidad" data-oninput="updateTx" data-oninput-args="[' + i + ']" data-oninput-pass="value"><button class="btn-remove" data-onclick="removeTx" data-onclick-args="[' + i + ']"' + (txs.length <= 1 ? ' style="visibility:hidden"' : '') + ' aria-label="Eliminar">×</button></div>'; }).join('') +
    '<button class="btn-add-row" data-onclick="addTx">+ Agregar indicación</button></div></section>' +

    '<div class="fit-stack" style="grid-area:side">' +
    '<section class="fit-block"><h4>Signos vitales</h4><div class="fit-vitals">' +
    [['ta', 'T.A.', 'mmHg'], ['fr', 'F.R.', 'rpm'], ['fc', 'F.C.', 'lpm'], ['temp', 'Temp', '°C'], ['peso', 'Peso', 'kg']].map(function (v) {
      return '<label>' + v[1] + '<input type="text" value="' + esc(note[v[0]]) + '" placeholder="' + v[2] + '" data-oninput="updateNote" data-oninput-args=\'' + escAttr(JSON.stringify([v[0]])) + '\' data-oninput-pass="value"></label>';
    }).join('') +
    '</div></section>' +

    '<section class="fit-block"><h4>Firma</h4><div class="fit-pair">' +
    '<label>Médico tratante<input type="text" value="' + esc(note.medico) + '" placeholder="Nombre completo" data-oninput="updateNote" data-oninput-args=\'["medico"]\' data-oninput-pass="value"></label>' +
    '<label>Profesor responsable<input type="text" value="' + esc(note.profesor) + '" placeholder="Nombre completo" data-oninput="updateNote" data-oninput-args=\'["profesor"]\' data-oninput-pass="value"></label>' +
    '</div></section>' +
    '</div>' +

    '</div></div>'
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
    return { patient: patient, note: Object.assign({}, note, { anteriores: undefined }) };
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
      archiveCopy(note);
      persistClinicalState();
      renderNoteForm();
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
  var AREAS = { dieta: 'die', cuidados: 'cui', estudios: 'est', medicamentos: 'med', interconsultas: 'int' };
  // One screen, no scroll: header carries fecha/hora/médicos and the actions.
  document.getElementById('indica-form').innerHTML = (
    '<div class="fit-screen">' +
    '<div class="fit-head">' +
    '<span class="fit-title">Indicaciones</span>' +
    '<label class="fit-inline">Fecha<input type="text" value="' + esc(ind.fecha) + '" placeholder="DD/MM/AAAA" data-oninput="updateIndica" data-oninput-args=\'["fecha"]\' data-oninput-pass="value"></label>' +
    '<label class="fit-inline fit-inline--short">Hora<input type="text" value="' + esc(ind.hora) + '" placeholder="HH:MM" data-oninput="updateIndica" data-oninput-args=\'["hora"]\' data-oninput-pass="value"></label>' +
    '<label class="fit-inline fit-inline--grow">Médicos<textarea rows="1" placeholder="Grado y nombre" data-oninput="updateIndica" data-oninput-args=\'["medicos"]\' data-oninput-pass="value">' + esc(ind.medicos) + '</textarea></label>' +
    buildExtraTemplatesSelectorHtml() +
    pastDocsButtonHtml('indica', ind) +
    '<button type="button" class="wb-btn wb-btn-secondary rpc-doc-export" data-onclick="quickExportCurrentPatient" id="btn-quick-export-indica">Salida rápida</button>' +
    '<button type="button" class="wb-btn wb-btn-primary rpc-doc-export" data-onclick="generateIndicaciones" id="btn-gen-ind">Generar Indicaciones (.docx)</button>' +
    '</div>' +
    '<div class="fit-grid indica-fit-grid">' +
    SECTIONS.map(function(s){ return '<section class="fit-block" style="grid-area:' + AREAS[s.key] + '"><h4>' + s.label + '</h4><textarea placeholder="' + s.placeholder + '" data-oninput="updateIndica" data-oninput-args=\'' + escAttr(JSON.stringify([s.key])) + '\' data-oninput-pass="value">' + esc(ind[s.key]) + '</textarea></section>'; }).join('') +
    '<section class="fit-block" style="grid-area:otr"><h4>Otros<button type="button" class="wb-btn wb-btn-ghost wb-btn-sm" data-onclick="addOtro">+ Agregar sección</button></h4><div class="fit-list" id="otros-list">' +
    ((ind.otros || []).length
      ? ind.otros.map(function(o,i){ return '<div class="otros-item"><button class="btn-remove-otro" data-onclick="removeOtro" data-onclick-args="['+i+']" aria-label="Quitar sección">×</button><input type="text" placeholder="TÍTULO DE LA SECCIÓN" value="'+esc(o.titulo)+'" data-oninput="updateOtro" data-oninput-args=\''+escAttr(JSON.stringify([i,'titulo']))+'\' data-oninput-pass="value"><textarea rows="2" placeholder="Indicaciones..." data-oninput="updateOtro" data-oninput-args=\''+escAttr(JSON.stringify([i,'contenido']))+'\' data-oninput-pass="value">'+esc(o.contenido)+'</textarea></div>'; }).join('')
      : '<p class="fit-empty">Sin secciones extra.</p>') +
    '</div></section>' +
    '</div></div>'
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
    '<button type="button" class="wb-btn wb-btn-ghost" data-onclick="openIndicaFormatsFromProfile" title="Formatos en blanco. Plantillas guardadas: Ajustes → Plantillas.">Predeterminados…</button>';
  if (!arr.length) return predBtn;
  var opts = '<option value="">— Aplicar plantilla guardada —</option>' +
    arr.map(function(t){ return '<option value="' + esc(t.id) + '">' + esc(t.label || '(sin nombre)') + '</option>'; }).join('');
  return '<div class="indica-extra-tmpl">' +
    predBtn +
    '<select id="indica-extra-tmpl-select" aria-label="Seleccionar plantilla guardada">' + opts + '</select>' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-onclick="applyExtraTemplateFromIndica">Aplicar</button>' +
    '</div>';
}

function indicaHasExistingContent(target) {
  return (
    (target.dieta && target.dieta.trim()) ||
    (target.cuidados && target.cuidados.trim()) ||
    (target.medicamentos && target.medicamentos.trim())
  );
}

async function resolveExtraTemplateMergeMode(hasExisting) {
  if (!hasExisting) return 'replace';
  var result = await openConfirm({
    weight: 'consequence',
    title: 'Ya hay contenido en las indicaciones.',
    message: '¿Agregar la plantilla al final o reemplazar lo que hay?',
    confirmLabel: 'Agregar al final',
    secondaryLabel: 'Reemplazar',
  });
  if (result === 'confirm') return 'append';
  if (result === 'secondary') return 'replace';
  return null;
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

async function applyExtraTemplateFromIndica() {
  var sel = document.getElementById('indica-extra-tmpl-select');
  if (!sel || !sel.value) { rt.showToast('Elige una plantilla', 'error'); return; }
  if (!aid() || !getIndicaciones()[aid()]) { rt.showToast('Selecciona un paciente primero', 'error'); return; }
  var tmpl = ((rt.getSettings() || {}).extraTemplates || []).find(function(t){ return t.id === sel.value; });
  if (!tmpl) return;
  var target = getIndicaciones()[aid()];
  var mode = await resolveExtraTemplateMergeMode(indicaHasExistingContent(target));
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
    return { patient: patient, indicaciones: Object.assign({}, ind, { anteriores: undefined }) };
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
      archiveCopy(ind);
      persistClinicalState();
      renderIndicaForm();
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


// ── Anteriores ────────────────────────────────────────────────────────
// Each .docx generation keeps a read-only copy in `doc.anteriores`, one per
// fecha (a second export the same day replaces that day's copy).
var PAST_MAX = 30;
var PAST_FIELDS = {
  nota: [['interrogatorio', 'Interrogatorio, exploración y estado mental'], ['evolucion', 'Evolución'], ['vitales', 'Signos vitales'], ['estudios', 'Estudios auxiliares'], ['diagnosticos', 'Diagnósticos'], ['tratamiento', 'Tratamiento e indicaciones'], ['medico', 'Médico tratante'], ['profesor', 'Profesor responsable']],
  indica: [['medicos', 'Médicos'], ['dieta', 'Dieta'], ['cuidados', 'Cuidados'], ['estudios', 'Estudios'], ['medicamentos', 'Medicamentos'], ['interconsultas', 'Interconsultas'], ['otros', 'Otros']],
};

function archiveCopy(doc) {
  if (!doc) return;
  var snap = JSON.parse(JSON.stringify(doc));
  delete snap.anteriores;
  snap.guardada = new Date().toISOString();
  var day = snap.fecha || snap.guardada.slice(0, 10);
  var rest = (doc.anteriores || []).filter(function (a) { return (a.fecha || String(a.guardada).slice(0, 10)) !== day; });
  doc.anteriores = [snap].concat(rest).slice(0, PAST_MAX);
}

function pastDocsButtonHtml(kind, doc) {
  var n = (doc && doc.anteriores || []).length;
  return '<button type="button" class="wb-btn wb-btn-ghost" data-onclick="openPastDocs" data-onclick-args=\'' + escAttr(JSON.stringify([kind])) + '\'' +
    (n ? '' : ' disabled title="Se guarda una copia cada vez que generas el .docx"') + '>Anteriores (' + n + ')</button>';
}

function pastFieldText(kind, key, snap) {
  if (kind === 'nota' && key === 'vitales') {
    return [['ta', 'T.A.'], ['fr', 'F.R.'], ['fc', 'F.C.'], ['temp', 'Temp'], ['peso', 'Peso']]
      .filter(function (v) { return String(snap[v[0]] || '').trim(); })
      .map(function (v) { return v[1] + ' ' + snap[v[0]]; }).join(' · ');
  }
  var val = snap[key];
  if (key === 'otros') return (val || []).map(function (o) { return [o.titulo, o.contenido].filter(Boolean).join(': '); }).join('\n');
  if (Array.isArray(val)) return val.filter(function (x) { return String(x).trim(); }).map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n');
  return String(val || '').trim();
}

function pastDocHtml(kind, snap) {
  var rows = PAST_FIELDS[kind].map(function (f) {
    var t = pastFieldText(kind, f[0], snap);
    return t ? '<div class="past-doc-field"><h4>' + f[1] + '</h4><p>' + esc(t) + '</p></div>' : '';
  }).join('');
  return rows || '<p class="fit-empty">Copia vacía.</p>';
}

function openPastDocs(kind) {
  var doc = (kind === 'nota' ? getNotes() : getIndicaciones())[aid()];
  var list = (doc && doc.anteriores) || [];
  if (!list.length) return;
  var old = document.getElementById('past-docs-backdrop');
  if (old) old.remove();
  var bd = document.createElement('div');
  bd.id = 'past-docs-backdrop';
  bd.className = 'soap-modal-backdrop open';
  bd.innerHTML =
    '<div class="soap-modal wb-modal past-docs-modal" role="dialog" aria-modal="true" aria-labelledby="past-docs-title">' +
    '<header class="wb-modal-head"><h3 class="wb-modal-title" id="past-docs-title">' + (kind === 'nota' ? 'Notas de evolución anteriores' : 'Indicaciones anteriores') + '</h3>' +
    '<button type="button" class="wb-btn wb-btn-ghost wb-btn-icon wb-modal-close" data-past-close aria-label="Cerrar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button></header>' +
    '<div class="past-docs-layout"><nav class="past-docs-list">' +
    list.map(function (a, i) {
      var when = a.fecha || new Date(a.guardada).toLocaleDateString('es-MX');
      return '<button type="button" class="past-docs-item" data-past-idx="' + i + '">' + esc(when) + (a.hora ? ' <span>' + esc(a.hora) + '</span>' : '') + '</button>';
    }).join('') +
    '</nav><div class="past-docs-view wb-modal-body"></div></div>' +
    '</div>';
  document.body.appendChild(bd);
  var view = bd.querySelector('.past-docs-view');
  function show(i) {
    view.innerHTML = pastDocHtml(kind, list[i]);
    bd.querySelectorAll('[data-past-idx]').forEach(function (b) { b.classList.toggle('active', Number(b.getAttribute('data-past-idx')) === i); });
  }
  function close() { document.removeEventListener('keydown', onKey); bd.remove(); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  bd.addEventListener('click', function (e) {
    var t = /** @type {HTMLElement} */ (e.target);
    if (t === bd || t.closest('[data-past-close]')) return close();
    var item = t.closest('[data-past-idx]');
    if (item) show(Number(item.getAttribute('data-past-idx')));
  });
  show(0);
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
  archiveCopy,
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
  openPastDocs,
};
