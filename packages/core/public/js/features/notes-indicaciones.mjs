import { writeRpcSettings } from '../clinical-settings.mjs';
// Expediente · nota evolución, indicaciones, Word
import { getPatients, getNotes, getIndicaciones, persistClinicalState } from "../app-state.mjs";
import { setAsyncButtonLoading } from "../ui-motion.mjs";
import {
  applyNotaFormatScaffoldIfEmpty,
  applyIndicacionesFormatScaffoldIfEmpty,
  applyMedicosFromGradoIfEmpty,
  gradoToMedicosLines,
} from "../profile-templates.mjs";
import {
  getFormatsEditMode,
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
import { stampDocUpdatedAt, mergeAnteriores, liveAnteriores, editAnterior, deleteAnterior, anteriorKey } from "../patient-merge.mjs";
import { scheduleCloudSyncPush } from "./cloud-sync/mutate-bridge.mjs";
import { drawNoteForm, drawIndicaForm, drawNoteDefaultsEditor, drawIndicaDefaultsEditor, drawPastDocsModal, drawPastNav, drawPastView } from "./notes-indicaciones-view.jsx";
import { parseIcSugerencias, applyIcSugerenciasToIndica, indicaDocHasContent } from "../ic-sugerencias-parse.mjs";

/** A saved edit: new edit clock (last write wins), then a debounced Nube push. */
function touchDoc(doc) {
  stampDocUpdatedAt(doc);
  scheduleCloudSyncPush();
}

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
    drawNoteDefaultsEditor(document.getElementById("note-form"), st);
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
  drawNoteForm(document.getElementById('note-form'), { note: note, dxs: dxs, txs: txs, pastCount: liveAnteriores(note).length });
  rt.syncOfflineButtonStates();
}

// ── Campos Dx/Tx ──────────────────────────────────────────────────────
function updateNote(field, value) { if (!getNotes()[aid()]) getNotes()[aid()]={}; getNotes()[aid()][field]=value; touchDoc(getNotes()[aid()]); persistClinicalState(); }
/** A note made without the list (new patient, IC) has no array yet: typed lines were lost. */
function noteList(field) {
  var note = getNotes()[aid()];
  if (!note) return null;
  if (!Array.isArray(note[field])) note[field] = [''];
  return note[field];
}
function updateDx(i, val) { var l = noteList('diagnosticos'); if (!l) return; l[i]=val.toUpperCase(); touchDoc(getNotes()[aid()]); persistClinicalState(); }
function addDx() { var l = noteList('diagnosticos'); if (!l) return; l.push(''); touchDoc(getNotes()[aid()]); persistClinicalState(); renderNoteForm(); }
function removeDx(i) { var l = noteList('diagnosticos'); if (!l||l.length<=1) return; l.splice(i,1); touchDoc(getNotes()[aid()]); persistClinicalState(); renderNoteForm(); }

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
  touchDoc(note);
  persistClinicalState();
  renderNoteForm();
  rt.showToast('Diagnósticos del censo en la nota', 'success');
}

function updateTx(i, val) { var l = noteList('tratamiento'); if (!l) return; l[i]=val; touchDoc(getNotes()[aid()]); persistClinicalState(); }
function addTx() { var l = noteList('tratamiento'); if (!l) return; l.push(''); touchDoc(getNotes()[aid()]); persistClinicalState(); renderNoteForm(); }
function removeTx(i) { var l = noteList('tratamiento'); if (!l||l.length<=1) return; l.splice(i,1); touchDoc(getNotes()[aid()]); persistClinicalState(); renderNoteForm(); }

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
    writeRpcSettings(st);
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
  .catch(function(e){
    if (!(e && e.reported)) rt.showToast('Error de conexión','error');
    if (typeof rt.onPitchTourDocFailed === 'function') rt.onPitchTourDocFailed('ic_nota');
  })
  .finally(function(){
    setAsyncButtonLoading(document.getElementById('btn-gen'), false);
    rt.decrementPendingJobs();
    rt.syncOfflineButtonStates();
  });
}

// ── Indicaciones ─────────────────────────────────────────────────────
function ensureIndicaDoc() {
  if (!getIndicaciones()[aid()]) {
    var today = new Date();
    getIndicaciones()[aid()] = { fecha:String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear(), hora:String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0'), medicos:'',dieta:'',cuidados:'',estudios:'',medicamentos:'',interconsultas:'',otros:[] };
    applyIndicacionesFormatScaffoldIfEmpty(getIndicaciones()[aid()], rt.getSettings() || {});
    persistClinicalState();
  }
  return getIndicaciones()[aid()];
}

function renderIndicaForm() {
  if (getFormatsEditMode() === "indica") {
    var st = rt.getSettings() || {};
    loadDraftFromSettings(st);
    drawIndicaDefaultsEditor(document.getElementById("indica-form"), st);
    return;
  }
  if (!getPatients().some(function (p) { return p.id === aid(); })) return;
  var ind = ensureIndicaDoc();
  if (applyMedicosFromGradoIfEmpty(ind, rt.getSettings() || {})) persistClinicalState();
  drawIndicaForm(document.getElementById('indica-form'), { ind: ind, templates: extraTemplates(), pastCount: liveAnteriores(ind).length });
  rt.syncOfflineButtonStates();
}

function updateIndica(field, value) { if (!getIndicaciones()[aid()]) return; getIndicaciones()[aid()][field]=value; touchDoc(getIndicaciones()[aid()]); persistClinicalState(); }

function updateOtro(i, field, value) { if (!getIndicaciones()[aid()]) return; getIndicaciones()[aid()].otros[i][field]=value; touchDoc(getIndicaciones()[aid()]); persistClinicalState(); }

function addOtro() {
  if (!getIndicaciones()[aid()]) return;
  getIndicaciones()[aid()].otros = getIndicaciones()[aid()].otros || [];
  getIndicaciones()[aid()].otros.push({ titulo:'', contenido:'' });
  touchDoc(getIndicaciones()[aid()]);
  persistClinicalState();
  renderIndicaForm();
}

function removeOtro(i) {
  if (!getIndicaciones()[aid()]) return;
  getIndicaciones()[aid()].otros.splice(i, 1);
  touchDoc(getIndicaciones()[aid()]);
  persistClinicalState();
  renderIndicaForm();
}

// ── Plantillas guardadas ──────────────────────────────────────────────
function extraTemplates() {
  var arr = (rt.getSettings() || {}).extraTemplates;
  return Array.isArray(arr) ? arr : [];
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
  touchDoc(target);
  persistClinicalState();
  renderIndicaForm();
  rt.addAuditEntry('extra-template-apply', 'ok', 1, tmpl.label || '');
  rt.showToast('Plantilla aplicada: ' + (tmpl.label || ''), 'success');
}

/** Paste anywhere: «SUGERENCIAS POR …» (interconsulta) → active patient's indicaciones. */
async function applyIcSugerenciasPaste(text) {
  var patient = getPatients().find(function (p) { return p.id === aid(); });
  if (!patient) { rt.showToast('Abre un paciente para pegar las sugerencias', 'error'); return false; }
  var parsed = parseIcSugerencias(text);
  var target = ensureIndicaDoc();
  var mode = await resolveExtraTemplateMergeMode(indicaDocHasContent(target));
  if (!mode) return false;
  applyIcSugerenciasToIndica(target, parsed, mode);
  touchDoc(target);
  persistClinicalState();
  if (typeof window.switchInnerTab === 'function') window.switchInnerTab('indica');
  if (document.getElementById('indica-form')) renderIndicaForm();
  rt.showToast('Sugerencias en Indicaciones de ' + (patient.nombre || 'paciente'), 'success');
  return true;
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
    writeRpcSettings(st);
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
  .catch(function(e){
    if (!(e && e.reported)) rt.showToast('Error de conexión','error');
    if (typeof rt.onPitchTourDocFailed === 'function') rt.onPitchTourDocFailed('ic_indica');
  })
  .finally(function(){
    setAsyncButtonLoading(document.getElementById('btn-gen-ind'), false);
    rt.decrementPendingJobs();
    rt.syncOfflineButtonStates();
  });
}


// ── Vista previa (Imprimir / PDF / .docx) ────────────────────────────
function pdfExport(fileName, html, btn, onDone) {
  if (guardDocExportBlocked({ isRpcOffline: rt.isRpcOffline, showToast: rt.showToast })) return;
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: 'Generando…' });
  rt.incrementPendingJobs();
  exportWithOutputDirFallback({
    url: '/generate-html-pdf',
    buildPayload: function () { return { html: html, fileName: fileName }; },
    defaultFileName: fileName,
    selectOutputDir: function () {
      return window.electronAPI && window.electronAPI.selectOutputDir ? window.electronAPI.selectOutputDir() : Promise.resolve(undefined);
    },
    saveOutputDir: function (dir) {
      if (!dir) return;
      var st = rt.getSettings() || {};
      st.outputDir = dir;
      writeRpcSettings(st);
      syncApprovedOutputDir(dir);
    },
    onSuccess: function (data) {
      rt.showToast('PDF guardado: ' + ((data && (data.fileName || data.path)) ? (data.fileName || String(data.path).split(/[/\\]/).pop()) : fileName), 'success');
      onDone();
    },
    onPrompt: function () { rt.showToast('Selecciona una carpeta para guardar el documento.', 'error'); },
    onCancel: function () { rt.showToast('No se guardó el documento: no se eligió carpeta.', 'error'); },
    onError: function (msg) { rt.showToast('Error: ' + msg, 'error'); },
  })
    .catch(function (e) { if (!(e && e.reported)) rt.showToast('Error de conexión', 'error'); })
    .finally(function () {
      setAsyncButtonLoading(btn, false);
      rt.decrementPendingJobs();
      rt.syncOfflineButtonStates();
    });
}

function slug(s) { return String(s || '').normalize('NFC').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/g, '_').slice(0, 80); }

// The preview module carries the hospital logos (48 KB): load it on the first click, not at boot.
async function previewDoc(kind) {
  if (rt.guardMobileDocExport()) return;
  var patient = getPatients().find(function (p) { return p.id === aid(); }); if (!patient) return;
  var isNota = kind === 'nota';
  var doc = (isNota ? getNotes() : getIndicaciones())[aid()]; if (!doc) return;
  if (isNota && ensureNoteDxFromPatientForExport(doc, patient)) persistClinicalState();
  var dp = await import("../doc-preview-html.mjs");
  var html = isNota ? dp.buildNotaPreviewHtml(patient, doc) : dp.buildIndicacionesPreviewHtml(patient, Object.assign({}, doc, { medicos: gradoToMedicosLines(doc.medicos) }));
  var fileName = (isNota ? 'Nota_Evolucion_' : 'Indicaciones_') + slug(patient.nombre || patient.registro) + '_' + slug(doc.fecha) + '_' + new Date().toTimeString().slice(0, 8).replace(/:/g, '-') + '.pdf';
  dp.openDocPreview({
    title: isNota ? 'Vista previa de la nota' : 'Vista previa de las indicaciones',
    html: html,
    onPrint: function () {
      archiveCopy(doc);
      persistClinicalState();
      (isNota ? renderNoteForm : renderIndicaForm)();
    },
    onDocx: function () { dp.closeDocPreview(); (isNota ? generateWord : generateIndicaciones)(); },
    onPdf: function (btn) {
      pdfExport(fileName, html, btn, function () {
        dp.closeDocPreview();
        archiveCopy(doc);
        persistClinicalState();
        (isNota ? renderNoteForm : renderIndicaForm)();
      });
    },
  });
}
function previewNota() { previewDoc('nota'); }
function previewIndicaciones() { previewDoc('indica'); }

// ── Anteriores ────────────────────────────────────────────────────────
// Each print or generation (PDF, .docx) keeps a read-only copy in `doc.anteriores`, one per
// fecha (a second export the same day replaces that day's copy).
function archiveCopy(doc) {
  if (!doc) return;
  var snap = JSON.parse(JSON.stringify(doc));
  delete snap.anteriores;
  snap.guardada = new Date().toISOString();
  doc.anteriores = mergeAnteriores([snap], doc.anteriores);
  touchDoc(doc); // edit clock + Nube push: without it a pull of the same updatedAt wipes the copy
}

var PAST_ARRAY_KEYS = ['diagnosticos', 'tratamiento'];

/** The edited fields of one past copy, read back from the edit form. */
function pastEditPatch(view, snap) {
  var patch = {};
  view.querySelectorAll('[data-past-f]').forEach(function (el) {
    var key = el.getAttribute('data-past-f');
    if (PAST_ARRAY_KEYS.indexOf(key) < 0 && !Array.isArray(snap[key])) { patch[key] = el.value; return; }
    var lines = el.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    patch[key] = lines.length ? lines : [''];
  });
  if (Array.isArray(snap.otros)) {
    patch.otros = snap.otros.map(function (o, i) {
      var t = view.querySelector('[data-past-otro-t="' + i + '"]');
      var c = view.querySelector('[data-past-otro-c="' + i + '"]');
      return Object.assign({}, o, { titulo: t ? t.value : o.titulo, contenido: c ? c.value : o.contenido });
    });
  }
  return patch;
}

function openPastDocs(kind) {
  var doc = (kind === 'nota' ? getNotes() : getIndicaciones())[aid()];
  if (!liveAnteriores(doc).length) return;
  var old = document.getElementById('past-docs-backdrop');
  if (old) old.remove();
  var bd = document.createElement('div');
  bd.id = 'past-docs-backdrop';
  bd.className = 'soap-modal-backdrop open';
  drawPastDocsModal(bd, kind);
  document.body.appendChild(bd);
  var nav = bd.querySelector('.past-docs-list');
  var view = bd.querySelector('.past-docs-view');
  var list = [];
  var cur = 0;
  function paint(i, editing) {
    list = liveAnteriores(doc);
    if (!list.length) return close();
    cur = Math.min(i, list.length - 1);
    drawPastNav(nav, list, cur);
    drawPastView(view, kind, list[cur], editing);
  }
  function changed() {
    touchDoc(doc);
    persistClinicalState();
    (kind === 'nota' ? renderNoteForm : renderIndicaForm)();
  }
  async function remove() {
    var result = await openConfirm({
      weight: 'destructive',
      title: '¿Eliminar esta copia anterior?',
      message: 'Se elimina también en tus otros dispositivos. No se puede deshacer.',
      confirmLabel: 'Eliminar',
    });
    if (result !== 'confirm' || !deleteAnterior(doc, anteriorKey(list[cur]))) return;
    changed();
    paint(cur);
  }
  function close() { document.removeEventListener('keydown', onKey); bd.remove(); }
  function onKey(e) { if (e.key === 'Escape' && !document.querySelector('[data-wb-confirm-backdrop]')) close(); }
  document.addEventListener('keydown', onKey);
  bd.addEventListener('click', function (e) {
    var t = /** @type {HTMLElement} */ (e.target);
    if (t === bd || t.closest('[data-past-close]')) return close();
    var item = t.closest('[data-past-idx]');
    if (item) return paint(Number(item.getAttribute('data-past-idx')));
    if (t.closest('[data-past-edit]')) return paint(cur, true);
    if (t.closest('[data-past-cancel]')) return paint(cur);
    if (t.closest('[data-past-del]')) return void remove();
    if (t.closest('[data-past-save]')) {
      if (editAnterior(doc, anteriorKey(list[cur]), pastEditPatch(view, list[cur]))) changed();
      paint(cur);
    }
  });
  paint(0);
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
  previewNota,
  previewIndicaciones,
  archiveCopy,
  applyIcSugerenciasPaste,
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
  previewNota,
  previewIndicaciones,
  applyExtraTemplateFromIndica,
  openPastDocs,
};
