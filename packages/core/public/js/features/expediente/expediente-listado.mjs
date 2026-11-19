// Listado de problemas UI + docx export
import { writeRpcSettings } from '../../clinical-settings.mjs';
import { getPatients, getListadoProblemas, persistClinicalState } from '../../app-state.mjs';
import { scheduleCloudSyncPush } from '../cloud-sync/mutate-bridge.mjs';
import { setAsyncButtonLoading } from '../../ui-motion.mjs';
import {
  exportWithOutputDirFallback,
  guardDocExportBlocked,
  syncApprovedOutputDir,
} from '../../document-export-client.mjs';
import { refreshRpcDateFields } from '../../rpc-date-picker.mjs';
import {
  emptyListado,
  addProblema as listadoAddProblema,
  removeProblema as listadoRemoveProblema,
} from '../../listado-problemas-core.mjs';
import { LISTADO_PROBLEMAS_AI_PROMPT } from '../../listado-problemas-ai-prompt.mjs';
import { isHideListadoProblemasAiPromptEnabled } from '../profile.mjs';
import { rt, aid } from './expediente-runtime.mjs';
import { drawListadoForm } from './expediente-listado-view.jsx';

var _listadoSortables = [];

function getMedicosForListado(lst) {
  var tpl = (rt.getSettings() || {}).medicosPlantilla || {};
  var override = (lst && lst.medicos) || {};
  function pick(k) { return (override[k] && override[k].trim()) ? override[k] : (tpl[k] || ''); }
  return {
    profesor: pick('profesor'),
    r4:       pick('r4'),
    r2:       pick('r2'),
    r1a:      pick('r1a'),
    r1b:      pick('r1b'),
  };
}

function updateListadoMedico(field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  if (!lst.medicos) lst.medicos = {};
  lst.medicos[field] = value;
  saveListado();
}

// ── Listado sala ─────────────────────────────────────────────────────-
// Listado de Problemas (Task 8) — UI completa con drag-and-drop y autosave.
function _todayDDMMYYYY() {
  var d = new Date();
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
}
function _nowHHMM() {
  var d = new Date();
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function ensureListadoForActive() {
  if (!aid()) return null;
  if (!getListadoProblemas()[aid()]) {
    getListadoProblemas()[aid()] = emptyListado(_todayDDMMYYYY(), _nowHHMM());
  }
  // Defensive: ensure arrays exist (en caso de datos corruptos).
  var l = getListadoProblemas()[aid()];
  if (!Array.isArray(l.activos)) l.activos = [];
  if (!Array.isArray(l.inactivos)) l.inactivos = [];
  return l;
}
function saveListado() {
  persistClinicalState();
  scheduleCloudSyncPush();
}
function _autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 240) + 'px';
}

function bindListadoTextareaPointerIsolation(root) {
  var scope = root || document;
  scope.querySelectorAll('.listado-row textarea').forEach(function (ta) {
    if (ta.dataset.listadoPointerBound === '1') return;
    ta.dataset.listadoPointerBound = '1';
    ['mousedown', 'touchstart', 'pointerdown'].forEach(function (type) {
      ta.addEventListener(type, function (e) {
        e.stopPropagation();
      });
    });
    // Grow as the user types (was inline oninput="...; _autoGrowTextarea(this)").
    ta.addEventListener('input', function () {
      _autoGrowTextarea(ta);
    });
  });
}
function destroyListadoSortables() {
  _listadoSortables.forEach(function (s) {
    try {
      if (s && typeof s.destroy === 'function') s.destroy();
    } catch (_e) { void _e; }
  });
  _listadoSortables = [];
}

function syncListadoOrderFromDom(seccion) {
  var lst = ensureListadoForActive();
  if (!lst || !seccion) return;
  var zone = document.querySelector(
    '#listado-form [data-seccion-rows="' + seccion + '"]'
  );
  if (!zone) return;
  var arr = (lst[seccion] || []).slice();
  var byId = Object.create(null);
  for (var i = 0; i < arr.length; i++) byId[arr[i].id] = arr[i];
  var newArr = [];
  zone.querySelectorAll('.listado-row[data-id]').forEach(function (row) {
    var id = row.getAttribute('data-id');
    if (id && byId[id]) newArr.push(byId[id]);
  });
  if (!newArr.length || newArr.length !== arr.length) return;
  getListadoProblemas()[aid()] = Object.assign({}, lst, { [seccion]: newArr });
}

function refreshListadoRowNumbers(seccion) {
  var zone = document.querySelector(
    '#listado-form [data-seccion-rows="' + seccion + '"]'
  );
  if (!zone) return;
  zone.querySelectorAll('.listado-row').forEach(function (row, idx) {
    var num = row.querySelector('.listado-num');
    if (num) num.textContent = String(idx + 1);
  });
}

function mountListadoSortables() {
  destroyListadoSortables();
  var SortableCtor = typeof globalThis !== 'undefined' ? globalThis.Sortable : null;
  if (!SortableCtor || typeof SortableCtor.create !== 'function') return;
  var scrollRoot = document.getElementById('listado-form');
  document.querySelectorAll('#listado-form [data-seccion-rows]').forEach(function (zone) {
    var seccion = zone.getAttribute('data-seccion-rows');
    if (!seccion || !zone.querySelector('.listado-row')) return;
    var sortable = SortableCtor.create(zone, {
      animation: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      draggable: '.listado-row',
      handle: '.listado-drag-handle',
      filter: 'textarea, input, button, a[href], select',
      preventOnFilter: true,
      delay: 0,
      delayOnTouchOnly: true,
      direction: 'vertical',
      forceFallback: true,
      fallbackClass: 'listado-drag-hovercard',
      fallbackOnBody: true,
      fallbackTolerance: 4,
      swapThreshold: 0.65,
      invertedSwapThreshold: 0.58,
      scroll: scrollRoot || true,
      bubbleScroll: true,
      scrollSensitivity: 54,
      scrollSpeed: 9,
      onEnd: function (evt) {
        if (evt.oldIndex === evt.newIndex && evt.from === evt.to) return;
        syncListadoOrderFromDom(seccion);
        refreshListadoRowNumbers(seccion);
        saveListado();
      }
    });
    _listadoSortables.push(sortable);
  });
}

function renderListadoForm() {
  var c = document.getElementById('listado-form');
  if (!c) return;
  destroyListadoSortables();
  if (!aid()) { drawListadoForm(c, null); return; }
  var patient = getPatients().find(function(p){ return p.id === aid(); });
  if (!patient) { drawListadoForm(c, null); return; }
  var lst = ensureListadoForActive();
  drawListadoForm(c, {
    patient: patient,
    lst: lst,
    medicos: getMedicosForListado(lst),
    hideAiPrompt: isHideListadoProblemasAiPromptEnabled(),
  });
  refreshRpcDateFields(c);
  c.querySelectorAll('.listado-row textarea').forEach(_autoGrowTextarea);
  bindListadoTextareaPointerIsolation(c);
  mountListadoSortables();
}
function updateListadoMeta(field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  lst[field] = value;
  saveListado();
}
function updateProblemaField(seccion, id, field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  var arr = lst[seccion] || [];
  var p = arr.find(function(x){ return x.id === id; });
  if (!p) return;
  p[field] = value;
  saveListado();
}
function addProblemaUI(seccion) {
  var lst = ensureListadoForActive(); if (!lst) return;
  getListadoProblemas()[aid()] = listadoAddProblema(lst, seccion, { fecha: '', descripcion: '' });
  saveListado();
  renderListadoForm();
  setTimeout(function(){
    var rows = document.querySelectorAll('[data-seccion-rows="' + seccion + '"] .listado-row textarea');
    if (rows.length) rows[rows.length - 1].focus();
  }, 0);
}
function removeProblemaUI(seccion, id) {
  var lst = ensureListadoForActive(); if (!lst) return;
  getListadoProblemas()[aid()] = listadoRemoveProblema(lst, seccion, id);
  saveListado();
  renderListadoForm();
}
async function copyListadoProblemasAiPrompt() {
  var ok = await rt.copyToClipboardSafe(LISTADO_PROBLEMAS_AI_PROMPT);
  rt.showToast(ok ? 'Prompt copiado al portapapeles' : 'No se pudo copiar el prompt', ok ? 'success' : 'error');
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

function generateListado() {
  if (rt.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt.isRpcOffline, showToast: rt.showToast })) return;
  if (!aid()) { rt.showToast('Selecciona un paciente primero', 'error'); return; }
  var patient = getPatients().find(function(p){ return p.id === aid(); });
  if (!patient) return;
  var lst = ensureListadoForActive(); if (!lst) return;
  var hasProblems = (lst.activos && lst.activos.length) || (lst.inactivos && lst.inactivos.length);
  if (!hasProblems) {
    rt.showToast('Agrega al menos un problema antes de generar.', 'error');
    return;
  }
  var medicos = getMedicosForListado(lst);
  var btn = document.getElementById('btn-gen-listado');
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: 'Generando…' });
  rt.incrementPendingJobs();
  function buildPayload() {
    return { patient: patient, listado: lst, medicos: medicos };
  }
  exportWithOutputDirFallback({
    url: '/generate-listado',
    buildPayload: buildPayload,
    defaultFileName: 'listado.docx',
    selectOutputDir: selectOutputDir,
    saveOutputDir: saveOutputDir,
    onSuccess: function(data) {
      var name = (data && (data.fileName || data.path)) ? (data.fileName || String(data.path).split(/[/\\]/).pop()) : 'listado.docx';
      rt.showToast('Listado guardado: ' + name, 'success');
    },
    onPrompt: function() { rt.showToast('Selecciona una carpeta para guardar el documento.', 'error'); },
    onCancel: function() { rt.showToast('No se guardó el documento: no se eligió carpeta.', 'error'); },
    onError: function(msg) { rt.showToast('Error: ' + msg, 'error'); },
  })
  .catch(function(e){ if (!(e && e.reported)) rt.showToast('Error de conexión', 'error'); })
  .finally(function(){
    setAsyncButtonLoading(document.getElementById('btn-gen-listado'), false);
    rt.decrementPendingJobs();
    rt.syncOfflineButtonStates();
  });
}

function slug(x) { return String(x || '').normalize('NFC').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/g, '_').slice(0, 80); }

// The preview module carries the hospital logo (48 KB): load it on the first click, not at boot.
async function previewListado() {
  if (rt.guardMobileDocExport()) return;
  if (!aid()) { rt.showToast('Selecciona un paciente primero', 'error'); return; }
  var patient = getPatients().find(function(p){ return p.id === aid(); });
  var lst = ensureListadoForActive();
  if (!patient || !lst) return;
  if (!(lst.activos && lst.activos.length) && !(lst.inactivos && lst.inactivos.length)) {
    rt.showToast('Agrega al menos un problema antes de generar.', 'error');
    return;
  }
  var dp = await import('../../doc-preview-html.mjs');
  var html = dp.buildListadoPreviewHtml(patient, lst, getMedicosForListado(lst));
  var fileName = 'Listado_Problemas_' + slug(patient.nombre || patient.registro) + '_' + slug(lst.fecha) + '_' + new Date().toTimeString().slice(0, 8).replace(/:/g, '-') + '.pdf';
  dp.openDocPreview({
    title: 'Vista previa del listado',
    html: html,
    onDocx: function() { dp.closeDocPreview(); generateListado(); },
    onPdf: function(btn) {
      if (guardDocExportBlocked({ isRpcOffline: rt.isRpcOffline, showToast: rt.showToast })) return;
      setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: 'Generando…' });
      rt.incrementPendingJobs();
      exportWithOutputDirFallback({
        url: '/generate-html-pdf',
        buildPayload: function() { return { html: html, fileName: fileName }; },
        defaultFileName: fileName,
        selectOutputDir: selectOutputDir,
        saveOutputDir: saveOutputDir,
        onSuccess: function(data) {
          rt.showToast('PDF guardado: ' + ((data && (data.fileName || data.path)) ? (data.fileName || String(data.path).split(/[/\\]/).pop()) : fileName), 'success');
          dp.closeDocPreview();
        },
        onPrompt: function() { rt.showToast('Selecciona una carpeta para guardar el documento.', 'error'); },
        onCancel: function() { rt.showToast('No se guardó el documento: no se eligió carpeta.', 'error'); },
        onError: function(msg) { rt.showToast('Error: ' + msg, 'error'); },
      })
      .catch(function(e){ if (!(e && e.reported)) rt.showToast('Error de conexión', 'error'); })
      .finally(function(){
        setAsyncButtonLoading(btn, false);
        rt.decrementPendingJobs();
        rt.syncOfflineButtonStates();
      });
    },
  });
}

export {
  renderListadoForm,
  generateListado,
  previewListado,
  updateListadoMeta,
  updateProblemaField,
  addProblemaUI,
  removeProblemaUI,
  copyListadoProblemasAiPrompt,
  _autoGrowTextarea,
  updateListadoMedico,
};
