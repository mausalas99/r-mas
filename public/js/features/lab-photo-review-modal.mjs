/**
 * Modal: revisar/editar filas leídas por OCR de una foto de lab externo
 * antes de guardarlas. Nada se guarda hasta que el usuario confirma — la
 * lectura OCR no es perfecta y estos son datos clínicos.
 */
import { listManualLabTypes } from '../labs-manual-catalog.mjs';
import { synthesizeManualResLab } from '../labs-manual-synthesize.mjs';
import { persistClinicalState } from '../app-state.mjs';
import { esc } from '../dom-escape.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import { rt } from './lab-panel-runtime-state.mjs';
import { pushExternalLabHistory, finalizeLabHistoryImport } from './lab-panel-workbench-store.mjs';
import {
  renderLabHistoryPanel,
  loadLabHistorySetIntoOutput,
  setLabHistorySelectedSetId,
} from './lab-panel-history.mjs';

var state = { rows: [], fileName: '', rawText: '' };
var fieldOptionsCache = null;

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

function getActiveId() {
  return typeof rt.getActiveId === 'function' ? rt.getActiveId() : null;
}

function buildFieldOptions() {
  if (fieldOptionsCache) return fieldOptionsCache;
  var opts = [];
  listManualLabTypes().forEach(function (t) {
    t.fields.forEach(function (f) {
      opts.push({ value: t.sectionKey + '::' + f.key, label: f.label + ' (' + t.sectionKey + ')' });
    });
  });
  fieldOptionsCache = opts;
  return opts;
}

function fieldOptionsHtml(selectedValue) {
  var opts = buildFieldOptions();
  var html = '<option value=""' + (selectedValue ? '' : ' selected') + '>— sin mapear —</option>';
  html += opts
    .map(function (o) {
      return (
        '<option value="' +
        esc(o.value) +
        '"' +
        (o.value === selectedValue ? ' selected' : '') +
        '>' +
        esc(o.label) +
        '</option>'
      );
    })
    .join('');
  return html;
}

function renderRows() {
  var host = document.getElementById('lab-photo-review-rows');
  if (!host) return;
  if (!state.rows.length) {
    host.innerHTML = '<p class="lab-manual-empty">No se reconocieron filas.</p>';
    return;
  }
  host.innerHTML = state.rows
    .map(function (row) {
      var selectedValue = row.matchedSectionKey && row.matchedKey ? row.matchedSectionKey + '::' + row.matchedKey : '';
      var checked = !!selectedValue;
      return (
        '<div class="lab-photo-review-row">' +
        '<input type="checkbox" class="lab-photo-row-include"' +
        (checked ? ' checked' : '') +
        ' title="Incluir esta fila" />' +
        '<span class="lab-photo-review-raw" title="' +
        esc(row.rawLine) +
        '">' +
        esc(row.rawName) +
        '</span>' +
        '<select class="profile-input lab-photo-row-field">' +
        fieldOptionsHtml(selectedValue) +
        '</select>' +
        '<input type="text" class="profile-input lab-photo-row-value" value="' +
        esc(row.resultado) +
        '" inputmode="decimal" autocomplete="off" spellcheck="false" />' +
        '<span class="lab-photo-review-unit">' +
        esc(row.unidades || '') +
        '</span>' +
        '</div>'
      );
    })
    .join('');
}

export function openLabPhotoReviewModal(rows, meta) {
  var modal = document.getElementById('lab-photo-review-modal');
  if (!modal) return;
  var m = meta && typeof meta === 'object' ? meta : {};
  state.rows = Array.isArray(rows) ? rows : [];
  state.fileName = String(m.fileName || '');
  state.rawText = String(m.rawText || '');

  renderRows();

  var fechaEl = document.getElementById('lab-photo-fecha');
  var horaEl = document.getElementById('lab-photo-hora');
  refreshRpcDateFields(modal);
  if (fechaEl) {
    fechaEl.value = toDateInputValue(new Date());
    fechaEl.dispatchEvent(new Event('rpc-date-refresh'));
  }
  if (horaEl) horaEl.value = '';

  modal.hidden = false;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

export function closeLabPhotoReviewModal() {
  var modal = document.getElementById('lab-photo-review-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.hidden = true;
  state.rows = [];
  state.fileName = '';
  state.rawText = '';
}

export function confirmLabPhotoReview() {
  var patientId = getActiveId();
  if (!patientId) {
    rt.showToast('Selecciona un paciente', 'error');
    return;
  }
  var fechaEl = document.getElementById('lab-photo-fecha');
  var horaEl = document.getElementById('lab-photo-hora');
  var fecha = fechaFromDateInput(fechaEl && fechaEl.value);
  if (!fecha) {
    rt.showToast('Indica la fecha del estudio', 'error');
    return;
  }
  var hora = horaEl ? String(horaEl.value || '').trim() : '';

  var host = document.getElementById('lab-photo-review-rows');
  var valuesBySection = Object.create(null);
  if (host) {
    host.querySelectorAll('.lab-photo-review-row').forEach(function (rowEl) {
      var checkbox = rowEl.querySelector('.lab-photo-row-include');
      if (!checkbox || !checkbox.checked) return;
      var select = rowEl.querySelector('.lab-photo-row-field');
      var value = select ? String(select.value || '') : '';
      if (!value) return;
      var parts = value.split('::');
      var sectionKey = parts[0];
      var key = parts[1];
      if (!sectionKey || !key) return;
      var input = rowEl.querySelector('.lab-photo-row-value');
      var raw = input ? input.value : '';
      if (!valuesBySection[sectionKey]) valuesBySection[sectionKey] = {};
      valuesBySection[sectionKey][key] = raw;
    });
  }

  var resLabs = [];
  Object.keys(valuesBySection).forEach(function (sectionKey) {
    var chunk = synthesizeManualResLab(sectionKey, valuesBySection[sectionKey]);
    if (chunk) resLabs.push(chunk);
  });
  if (!resLabs.length) {
    rt.showToast('Marca al menos un estudio con su campo correspondiente', 'error');
    return;
  }

  if (typeof rt.pushUndoSnapshot === 'function') {
    rt.pushUndoSnapshot('Labs por foto');
  }

  var sourceText =
    '[foto OCR' + (state.fileName ? ' · ' + state.fileName : '') + ']\n\n' + state.rawText;

  var set = pushExternalLabHistory(patientId, {
    resLabs: resLabs,
    fecha: fecha,
    hora: hora,
    sectionKey: 'FOTO',
    origin: 'foto',
    sourceText: sourceText,
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

  closeLabPhotoReviewModal();
  rt.showToast('Labs de foto guardados ✓', 'success');
}

export var windowHandlers = {
  closeLabPhotoReviewModal: closeLabPhotoReviewModal,
  confirmLabPhotoReview: confirmLabPhotoReview,
};
