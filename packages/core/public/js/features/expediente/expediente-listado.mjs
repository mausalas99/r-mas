// Listado de problemas UI + docx export
import { getPatients, getListadoProblemas, persistClinicalState } from '../../app-state.mjs';
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
import { rt, aid, esc } from './expediente-runtime.mjs';
import { escAttr } from '../../dom-escape.mjs';

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
  persistClinicalState();
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
function _renderListadoRow(seccion, p, idx) {
  return (
    '<div class="listado-row" data-id="' + esc(p.id) + '" data-seccion="' + seccion + '">' +
      '<div class="listado-num listado-drag-handle" title="Arrastra para reordenar" aria-label="Arrastrar para reordenar">' + (idx + 1) + '</div>' +
      '<input type="date" class="rpc-date-input" value="' + esc(p.fecha || '') + '" data-oninput="updateProblemaField" data-oninput-args=\'' + escAttr(JSON.stringify([seccion, String(p.id), 'fecha'])) + '\' data-oninput-pass="value" aria-label="Fecha del problema">' +
      '<textarea rows="1" placeholder="Descripción del problema" data-oninput="updateProblemaField" data-oninput-args=\'' + escAttr(JSON.stringify([seccion, String(p.id), 'descripcion'])) + '\' data-oninput-pass="value" aria-label="Descripción">' + esc(p.descripcion || '') + '</textarea>' +
      '<button class="btn-remove-listado" data-onclick="removeProblemaUI" data-onclick-args=\'' + escAttr(JSON.stringify([seccion, String(p.id)])) + '\' aria-label="Quitar problema" title="Quitar">×</button>' +
    '</div>'
  );
}
function _renderListadoSeccion(seccion, label, lst) {
  var arr = lst[seccion] || [];
  var rows = arr.length
    ? arr.map(function(p, i){ return _renderListadoRow(seccion, p, i); }).join('')
    : '<div class="listado-empty">Sin problemas ' + label.toLowerCase() + '.</div>';
  return (
    '<div class="listado-group" data-seccion-group="' + seccion + '">' +
      '<div class="listado-group-title">' + label + ' (' + arr.length + ')</div>' +
      '<div class="listado-group-body listado-sort-zone" data-seccion-rows="' + seccion + '">' +
        rows +
      '</div>' +
      '<button type="button" class="listado-add-row listado-link" data-onclick="addProblemaUI" data-onclick-args=\'' + escAttr(JSON.stringify([seccion])) + '\'>+ Agregar problema ' + label.toLowerCase().replace(/s$/, '') + '</button>' +
    '</div>'
  );
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
        persistClinicalState();
      }
    });
    _listadoSortables.push(sortable);
  });
}

function renderListadoForm() {
  var c = document.getElementById('listado-form');
  if (!c) return;
  destroyListadoSortables();
  if (!aid()) { c.innerHTML = ''; return; }
  var patient = getPatients().find(function(p){ return p.id === aid(); });
  if (!patient) { c.innerHTML = ''; return; }
  var lst = ensureListadoForActive();
  var patientLine = [
    patient.nombre,
    patient.registro ? ('Reg. ' + patient.registro) : '',
    [patient.edad, patient.sexo].filter(Boolean).join('/'),
    (patient.cuarto || patient.cama) ? ('Cto ' + [patient.cuarto, patient.cama].filter(Boolean).join('-')) : '',
  ].filter(Boolean).map(esc).join(' · ');
  c.innerHTML = (
    '<div class="listado-layout">' +
      '<div class="listado-main">' +
        _renderListadoSeccion('activos', 'Activos', lst) +
        _renderListadoSeccion('inactivos', 'Inactivos', lst) +
      '</div>' +
      '<div class="listado-side">' +
        '<div class="listado-patient-line">' + patientLine + '</div>' +
        '<div class="listado-meta">' +
          '<div class="listado-meta-title">Fecha y hora</div>' +
          '<div class="listado-meta-grid-2">' +
            '<input type="text" class="listado-input" value="' + esc(lst.fecha) + '" placeholder="DD/MM/AAAA" data-oninput="updateListadoMeta" data-oninput-args=\'["fecha"]\' data-oninput-pass="value" aria-label="Fecha del listado">' +
            '<input type="text" class="listado-input" value="' + esc(lst.hora) + '" placeholder="HH:MM" data-oninput="updateListadoMeta" data-oninput-args=\'["hora"]\' data-oninput-pass="value" aria-label="Hora del listado">' +
          '</div>' +
        '</div>' +
        _renderListadoMedicosCard(lst) +
        '<div class="listado-actions">' +
          '<button type="button" class="listado-link rpc-doc-export" data-onclick="quickExportCurrentPatient" id="btn-quick-export-listado">Salida rápida</button>' +
          (isHideListadoProblemasAiPromptEnabled()
            ? ''
            : '<button type="button" class="listado-link" data-onclick="copyListadoProblemasAiPrompt" title="Copia el prompt para usar en un chat de IA">Copiar prompt IA</button>') +
          '<button type="button" class="wb-btn wb-btn-primary wb-btn-block rpc-doc-export" data-onclick="generateListado" id="btn-gen-listado">Generar Listado (.docx)</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
  refreshRpcDateFields(c);
  c.querySelectorAll('.listado-row textarea').forEach(_autoGrowTextarea);
  bindListadoTextareaPointerIsolation(c);
  mountListadoSortables();
}
function updateListadoMeta(field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  lst[field] = value;
  persistClinicalState();
}
function updateProblemaField(seccion, id, field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  var arr = lst[seccion] || [];
  var p = arr.find(function(x){ return x.id === id; });
  if (!p) return;
  p[field] = value;
  persistClinicalState();
}
function addProblemaUI(seccion) {
  var lst = ensureListadoForActive(); if (!lst) return;
  getListadoProblemas()[aid()] = listadoAddProblema(lst, seccion, { fecha: '', descripcion: '' });
  persistClinicalState();
  renderListadoForm();
  setTimeout(function(){
    var rows = document.querySelectorAll('[data-seccion-rows="' + seccion + '"] .listado-row textarea');
    if (rows.length) rows[rows.length - 1].focus();
  }, 0);
}
function removeProblemaUI(seccion, id) {
  var lst = ensureListadoForActive(); if (!lst) return;
  getListadoProblemas()[aid()] = listadoRemoveProblema(lst, seccion, id);
  persistClinicalState();
  renderListadoForm();
}
function _renderListadoMedicosCard(lst) {
  var meds = getMedicosForListado(lst);
  function row(key, label, full) {
    return (
      '<label class="listado-field-group' + (full ? ' listado-field-group--full' : '') + '">' + label +
      '<input type="text" class="listado-input" value="' + esc(meds[key] || '') + '" data-oninput="updateListadoMedico" data-oninput-args=\'' + escAttr(JSON.stringify([key])) + '\' data-oninput-pass="value">' +
      '</label>'
    );
  }
  return (
    '<div class="listado-meta">' +
      '<div class="listado-meta-title">Médicos (firma)</div>' +
      '<div class="listado-meta-hint">Pre-llena desde Mi Perfil</div>' +
      '<div class="listado-medicos-grid">' +
        row('profesor', 'Profesor', true) +
        row('r4',       'R4') +
        row('r2',       'R2') +
        row('r1a',      'R1 (1)') +
        row('r1b',      'R1 (2)') +
      '</div>' +
    '</div>'
  );
}

async function copyListadoProblemasAiPrompt() {
  var ok = await rt.copyToClipboardSafe(LISTADO_PROBLEMAS_AI_PROMPT);
  rt.showToast(ok ? 'Prompt copiado al portapapeles ✓' : 'No se pudo copiar el prompt', ok ? 'success' : 'error');
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
  .catch(function(){ rt.showToast('Error de conexión', 'error'); })
  .finally(function(){
    setAsyncButtonLoading(document.getElementById('btn-gen-listado'), false);
    rt.decrementPendingJobs();
    rt.syncOfflineButtonStates();
  });
}

export {
  renderListadoForm,
  generateListado,
  updateListadoMeta,
  updateProblemaField,
  addProblemaUI,
  removeProblemaUI,
  copyListadoProblemasAiPrompt,
  _autoGrowTextarea,
  updateListadoMedico,
};
