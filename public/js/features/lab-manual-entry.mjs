/**
 * Modal: labs externos — elegir tipo, llenar celdas, guardar al historial.
 */
import { listManualLabTypes, fieldsForManualLabType, getManualLabType } from '../labs-manual-catalog.mjs';
import { synthesizeManualResLabs } from '../labs-manual-synthesize.mjs';
import { saveState } from '../app-state.mjs';
import { esc } from '../dom-escape.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import { registerLabPanelRuntime, rt } from './lab-panel-runtime-state.mjs';
import { pushExternalLabHistory, finalizeLabHistoryImport } from './lab-panel-workbench-store.mjs';
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

function selectedSectionKey() {
  var sel = document.getElementById('lab-manual-type');
  return sel ? String(sel.value || '').trim() : '';
}

function fillTypeSelect() {
  var sel = document.getElementById('lab-manual-type');
  if (!sel) return;
  var types = listManualLabTypes();
  var prev = sel.value;
  sel.innerHTML = types
    .map(function (t) {
      var label = String(t.label || t.sectionKey);
      var key = String(t.sectionKey || '');
      // Avoid "Biometría (BH) (BH)" when label already includes the key.
      if (key && label.indexOf('(' + key + ')') === -1) {
        label = label + ' (' + key + ')';
      }
      return '<option value="' + esc(t.sectionKey) + '">' + esc(label) + '</option>';
    })
    .join('');
  if (prev && getManualLabType(prev)) sel.value = prev;
  else if (types.length) sel.value = types[0].sectionKey;
}

function renderFieldGrid() {
  var host = document.getElementById('lab-manual-fields');
  if (!host) return;
  var key = selectedSectionKey();
  var fields = fieldsForManualLabType(key);
  if (!fields.length) {
    host.innerHTML = '<p class="lab-manual-empty">Sin campos para este tipo.</p>';
    return;
  }
  host.innerHTML = fields
    .map(function (fld) {
      var inputType = fld.mode === 'qual' ? 'text' : 'text';
      var inputMode = fld.mode === 'num' ? ' decimal' : '';
      return (
        '<label class="lab-manual-field">' +
        '<span class="lab-manual-field-label">' +
        esc(fld.label) +
        '</span>' +
        '<input type="' +
        inputType +
        '" class="profile-input lab-manual-field-input" data-field-key="' +
        esc(fld.key) +
        '" data-field-mode="' +
        esc(fld.mode) +
        '" autocomplete="off" spellcheck="false"' +
        (inputMode ? ' inputmode="decimal"' : '') +
        ' />' +
        '</label>'
      );
    })
    .join('');
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

export function openLabManualEntryModal() {
  var modal = document.getElementById('lab-manual-entry-modal');
  if (!modal) return;
  var patientId = getActiveId();
  var patient = getActivePatient();
  if (!patientId || !patient) {
    rt.showToast('Selecciona un paciente para agregar labs externos', 'error');
    return;
  }

  fillTypeSelect();
  renderFieldGrid();
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
  saveState({ immediate: true });
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
