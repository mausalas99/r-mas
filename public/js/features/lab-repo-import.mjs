import { registerLabPanelRuntime, rt } from './lab-panel-runtime-state.mjs';
import {
  buildLabRepoPreviewBlocks,
  buildLabRepoBulkText,
  shouldSilentImportLabRepo,
} from './lab-repo-import-gate.mjs';
import { openLabBulkPreviewModal } from './lab-bulk-preview-modal.mjs';
import { finalizeBulkLabPaste } from './lab-panel-workbench.mjs';

function defaultDateRange() {
  var hasta = new Date();
  var desde = new Date(hasta.getTime() - 48 * 60 * 60 * 1000);
  return { desde: desde, hasta: hasta };
}

function toDatetimeLocalValue(d) {
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

function getActivePatient() {
  return typeof rt.getActivePatient === 'function' ? rt.getActivePatient() : null;
}

function getRegistroInitial() {
  var p = getActivePatient();
  return p && p.registro ? String(p.registro).trim() : '';
}

function registroReadOnly() {
  return !!getRegistroInitial();
}

function readLabRepoImportFields() {
  var registroEl = document.getElementById('lab-repo-registro');
  var desdeEl = document.getElementById('lab-repo-desde');
  var hastaEl = document.getElementById('lab-repo-hasta');
  if (!registroEl || !desdeEl || !hastaEl) return null;
  return {
    registro: String(registroEl.value || '').trim(),
    desde: String(desdeEl.value || '').trim(),
    hasta: String(hastaEl.value || '').trim(),
  };
}

function validateLabRepoImportFields(fields) {
  if (!fields) return false;
  if (!fields.registro) {
    rt.showToast('Indica el registro', 'error');
    return false;
  }
  if (!fields.desde || !fields.hasta) {
    rt.showToast('Indica el rango de fechas', 'error');
    return false;
  }
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== 'function') {
    rt.showToast('Importación del repositorio solo en la app de escritorio', 'warn');
    return false;
  }
  return true;
}

function setLabRepoImportBusy(busy) {
  var btnImport = document.getElementById('lab-repo-import-confirm');
  if (!btnImport) return;
  btnImport.disabled = busy;
  btnImport.setAttribute('aria-disabled', busy ? 'true' : 'false');
}

function toastLabRepoFetchOutcome(studies, errors) {
  if (!studies.length && errors.length) {
    rt.showToast('No se pudo conectar al repositorio de laboratorio', 'error');
    return false;
  }
  if (!studies.length) {
    rt.showToast('Sin estudios en el rango seleccionado', 'info');
    return false;
  }
  return true;
}

function finishLabRepoImport(studies, registro, errors) {
  var blocks = buildLabRepoPreviewBlocks(studies, rt.findPatientByRegistro);
  var active = getActivePatient();
  var gate = shouldSilentImportLabRepo({
    blocks: blocks,
    fetchErrors: errors || [],
    requestedRegistro: registro,
    activePatientRegistro: active && active.registro ? String(active.registro) : '',
    activePatientId: rt.getActiveId ? rt.getActiveId() : null,
  });
  var text = buildLabRepoBulkText(studies);
  var totalOk = blocks.reduce(function (n, b) {
    return n + (b.okReportCount || 0);
  }, 0);

  closeLabRepoImportModal();
  if (gate.silent) {
    finalizeBulkLabPaste(text, blocks, totalOk);
    return;
  }

  openLabBulkPreviewModal({
    blocks: blocks,
    sourceText: text,
    onConfirm: function () {
      finalizeBulkLabPaste(text, blocks, totalOk);
    },
  });
}

export function registerLabRepoImportRuntime(ctx) {
  registerLabPanelRuntime(ctx);
}

export function openLabRepoImportModal() {
  var modal = document.getElementById('lab-repo-import-modal');
  if (!modal) return;
  var registroEl = document.getElementById('lab-repo-registro');
  var desdeEl = document.getElementById('lab-repo-desde');
  var hastaEl = document.getElementById('lab-repo-hasta');
  if (!registroEl || !desdeEl || !hastaEl) return;

  var range = defaultDateRange();
  var registro = getRegistroInitial();
  registroEl.value = registro;
  registroEl.readOnly = registroReadOnly();
  if (registroReadOnly()) {
    registroEl.setAttribute('aria-readonly', 'true');
  } else {
    registroEl.removeAttribute('aria-readonly');
  }
  desdeEl.value = toDatetimeLocalValue(range.desde);
  hastaEl.value = toDatetimeLocalValue(range.hasta);

  modal.hidden = false;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  registroEl.focus();
}

export function closeLabRepoImportModal() {
  var modal = document.getElementById('lab-repo-import-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.hidden = true;
}

export async function confirmLabRepoImport() {
  var fields = readLabRepoImportFields();
  if (!validateLabRepoImportFields(fields)) return;

  setLabRepoImportBusy(true);
  rt.showToast('Consultando repositorio…', 'info');
  try {
    var res = await window.electronAPI.labRepoFetch(fields);
    var studies = (res && res.studies) || [];
    var errors = (res && res.errors) || [];
    if (!toastLabRepoFetchOutcome(studies, errors)) return;
    finishLabRepoImport(studies, fields.registro, errors);
  } catch (_unused) {
    void _unused;
    rt.showToast('Error al consultar el repositorio', 'error');
  } finally {
    setLabRepoImportBusy(false);
  }
}
