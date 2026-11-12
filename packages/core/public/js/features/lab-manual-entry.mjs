/**
 * Modal: labs externos — elegir tipo, llenar celdas, guardar al historial.
 */
import { listManualLabTypes, fieldsForManualLabType, getManualLabType } from '../labs-manual-catalog.mjs';
import { synthesizeManualResLabs } from '../labs-manual-synthesize.mjs';
import { persistClinicalState } from '../app-state.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import { registerLabPanelRuntime, rt } from './lab-panel-runtime-state.mjs';
import { pushExternalLabHistory, finalizeLabHistoryImport } from './lab-panel-workbench-store.mjs';
import { closeLabPasteModal } from './lab-paste-modal.mjs';
import {
  renderLabHistoryPanel,
  loadLabHistorySetIntoOutput,
  setLabHistorySelectedSetId,
} from './lab-panel-history.mjs';

function toDateInputValue(d) {
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function fechaFromDateInput(isoDay) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDay || '').trim());
  if (!m) return '';
  return m[3] + '/' + m[2] + '/' + m[1];
}

function getActivePatient() {
  return typeof rt.getActivePatient === 'function' ? rt.getActivePatient() : null;
}

function getActiveId() {
  return typeof rt.getActiveId === 'function' ? rt.getActiveId() : null;
}

/** Preact view loads on first use: the modal is not on the boot path. */
function loadView() {
  return import('./lab-manual-entry-view.jsx');
}

function selectedSectionKey() {
  var sel = document.getElementById('lab-manual-type');
  return sel ? String(sel.value || '').trim() : '';
}

async function fillTypeSelect() {
  var sel = document.getElementById('lab-manual-type');
  if (!sel) return;
  var types = listManualLabTypes();
  var prev = sel.value;
  var view = await loadView();
  view.drawLabManualTypeOptions(sel, types);
  if (prev && getManualLabType(prev)) sel.value = prev;
  else if (types.length) sel.value = types[0].sectionKey;
}

async function renderFieldGrid() {
  var host = document.getElementById('lab-manual-fields');
  if (!host) return;
  var key = selectedSectionKey();
  var fields = fieldsForManualLabType(key);
  (await loadView()).drawLabManualFieldGrid(host, fields);
}

function readValuesFromGrid() {
  var host = document.getElementById('lab-manual-fields');
  /** @type {Record<string, string>} */
  var out = Object.create(null);
  if (!host) return out;
  host.querySelectorAll('.lab-manual-field-input').forEach(function (el) {
    if (!(el instanceof HTMLInputElement)) return;
    var k = el.getAttribute('data-field-key');
    if (!k) return;
    out[k] = el.value;
  });
  return out;
}

function syncModalChrome() {
  var patient = getActivePatient();
  var meta = document.getElementById('lab-manual-patient-meta');
  if (meta) {
    meta.textContent = patient
      ? String(patient.nombre || 'Sin nombre') +
        (patient.registro ? ' · Reg. ' + String(patient.registro) : '')
      : '';
  }
}

export function registerLabManualEntryRuntime(ctx) {
  registerLabPanelRuntime(ctx);
}

export async function openLabManualEntryModal() {
  var modal = document.getElementById('lab-manual-entry-modal');
  if (!modal) return;
  var patientId = getActiveId();
  var patient = getActivePatient();
  if (!patientId || !patient) {
    rt.showToast('Selecciona un paciente para agregar labs externos', 'error');
    return;
  }

  // Opened from inside "Pegar SOME": the modal registry ranks the paste modal
  // above this one, so its focus trap would pull every keystroke back into
  // #lab-input. Hand off like Procesar does.
  closeLabPasteModal();
  await fillTypeSelect();
  await renderFieldGrid();
  syncModalChrome();

  var fechaEl = document.getElementById('lab-manual-fecha');
  var horaEl = document.getElementById('lab-manual-hora');
  refreshRpcDateFields(modal);
  if (fechaEl) {
    fechaEl.value = toDateInputValue(new Date());
    fechaEl.dispatchEvent(new Event('rpc-date-refresh'));
  }
  if (horaEl) horaEl.value = '';

  var typeSel = document.getElementById('lab-manual-type');
  if (typeSel && !typeSel.dataset.wired) {
    typeSel.dataset.wired = '1';
    typeSel.addEventListener('change', renderFieldGrid);
  }

  modal.hidden = false;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  if (typeSel) typeSel.focus();
}

export function closeLabManualEntryModal() {
  var modal = document.getElementById('lab-manual-entry-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.hidden = true;
}

export function confirmLabManualEntry() {
  var patientId = getActiveId();
  if (!patientId) {
    rt.showToast('Selecciona un paciente', 'error');
    return;
  }
  var sectionKey = selectedSectionKey();
  if (!getManualLabType(sectionKey)) {
    rt.showToast('Elige un tipo de estudio', 'error');
    return;
  }
  var fechaEl = document.getElementById('lab-manual-fecha');
  var horaEl = document.getElementById('lab-manual-hora');
  var fecha = fechaFromDateInput(fechaEl && fechaEl.value);
  if (!fecha) {
    rt.showToast('Indica la fecha del estudio', 'error');
    return;
  }
  var hora = horaEl ? String(horaEl.value || '').trim() : '';
  var resLabs = synthesizeManualResLabs(sectionKey, readValuesFromGrid());
  if (!resLabs.length) {
    rt.showToast('Llena al menos un valor', 'error');
    return;
  }

  if (typeof rt.pushUndoSnapshot === 'function') {
    rt.pushUndoSnapshot('Labs externos (' + sectionKey + ')');
  }

  var set = pushExternalLabHistory(patientId, {
    resLabs: resLabs,
    fecha: fecha,
    hora: hora,
    sectionKey: sectionKey,
  });
  if (!set) {
    rt.showToast('No se pudo guardar el estudio', 'error');
    return;
  }

  finalizeLabHistoryImport(patientId);
  persistClinicalState({ immediate: true });
  setLabHistorySelectedSetId(patientId, set.id);
  loadLabHistorySetIntoOutput(set.id, { silent: true });
  renderLabHistoryPanel();
  if (typeof rt.refreshTendenciasOrCultivosPanel === 'function') {
    rt.refreshTendenciasOrCultivosPanel();
  }
  if (typeof rt.ensureParsedLabHistory === 'function') {
    rt.ensureParsedLabHistory(patientId);
  }

  closeLabManualEntryModal();
  rt.showToast('Lab externo guardado · ' + sectionKey + ' ✓', 'success');
}

export var windowHandlers = {
  openLabManualEntryModal: openLabManualEntryModal,
  closeLabManualEntryModal: closeLabManualEntryModal,
  confirmLabManualEntry: confirmLabManualEntry,
};
