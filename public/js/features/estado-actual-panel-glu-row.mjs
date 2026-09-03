/** Glu row DOM builders — extracted from estado-actual-panel-glu.mjs */
import { EXTRA_GLUCOMETRIA_TIMES } from './estado-actual-registro-defaults.mjs';

export function gluRescueFieldsHtml() {
  return (
    '<label class="ea-glu-altered-toggle">' +
    '<input type="checkbox" class="ea-glu-altered-input" data-ea-glu-altered aria-label="Glucometría alterada">' +
    '<span>Alterada</span>' +
    '</label>' +
    '<div class="ea-glu-rescue-wrap ea-glu-rescue-wrap--hidden" data-ea-glu-rescue-wrap hidden>' +
    '<div class="ea-glu-rescue-box">' +
    '<span class="ea-glu-rescue-box-title">Rescate</span>' +
    '<div class="ea-glu-rescue-box-fields">' +
    '<label class="ea-glu-rescue-field">' +
    '<span class="ea-label">Unidades</span>' +
    '<span class="ea-input-affix">' +
    '<input type="number" class="ea-input ea-glu-rescue-input" data-ea-glu-rescue-units min="0" step="0.5" placeholder="0" inputmode="decimal" aria-label="Unidades de rescate">' +
    '<span class="ea-input-affix-suffix" aria-hidden="true">U</span>' +
    '</span>' +
    '</label>' +
    '<label class="ea-glu-rescue-field">' +
    '<span class="ea-label">DXT post-rescate</span>' +
    '<span class="ea-input-affix">' +
    '<input type="number" class="ea-input ea-glu-post-rescue-input" data-ea-glu-post-rescue-value min="0" step="1" placeholder="0" inputmode="numeric" aria-label="Destroxía post-rescate">' +
    '<span class="ea-input-affix-suffix" aria-hidden="true">mg/dL</span>' +
    '</span>' +
    '</label>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {string} standardTime
 */
export function buildStandardGluRowHtml(standardTime) {
  return (
    '<span class="ea-glu-time-badge">' +
    standardTime +
    '</span>' +
    '<input type="number" class="ea-input ea-glu-value-input" data-ea-glu-value min="0" step="1" placeholder="mg/dL" inputmode="numeric" aria-label="Glucometría ' +
    standardTime +
    '">' +
    '<input type="hidden" data-ea-glu-time value="' +
    standardTime +
    '">' +
    '<div class="ea-glu-row-meta">' +
    gluRescueFieldsHtml() +
    '</div>'
  );
}

function extraGluTimeOptionsHtml() {
  var html = '<option value=""></option>';
  for (var i = 0; i < EXTRA_GLUCOMETRIA_TIMES.length; i++) {
    html += '<option value="' + EXTRA_GLUCOMETRIA_TIMES[i] + '">' + EXTRA_GLUCOMETRIA_TIMES[i] + '</option>';
  }
  return html;
}

export function buildExtraGluRowHtml() {
  return (
    '<select class="ea-input ea-input--time ea-glu-time-input" data-ea-glu-time aria-label="Hora de glucometría">' +
    extraGluTimeOptionsHtml() +
    '</select>' +
    '<input type="number" class="ea-input ea-glu-value-input" data-ea-glu-value min="0" step="1" placeholder="mg/dL" inputmode="numeric" aria-label="Glucometría">' +
    '<button type="button" class="ea-btn ea-btn--ghost ea-btn--icon ea-glu-remove-btn" data-ea-glu-remove title="Quitar fila" aria-label="Quitar glucometría">×</button>' +
    '<div class="ea-glu-row-meta">' +
    gluRescueFieldsHtml() +
    '</div>'
  );
}

/**
 * @param {HTMLDivElement} row
 * @param {{ value?: number, time?: string, altered?: boolean, rescueUnits?: number, postRescueValue?: number } | null | undefined} data
 * @param {boolean} isStandard
 */
function applyGluRescueFields(row, data) {
  var alteredEl = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-ea-glu-altered]'));
  var rescueEl = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-ea-glu-rescue-units]'));
  var postRescueEl = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-ea-glu-post-rescue-value]'));
  if (alteredEl && data.altered) alteredEl.checked = true;
  if (rescueEl && data.rescueUnits != null && data.rescueUnits !== '') rescueEl.value = String(data.rescueUnits);
  if (postRescueEl && data.postRescueValue != null && data.postRescueValue !== '') {
    postRescueEl.value = String(data.postRescueValue);
  }
}

export function fillGluRowData(row, data, isStandard) {
  if (!data) return;
  var val = row.querySelector('[data-ea-glu-value]');
  var time = row.querySelector('[data-ea-glu-time]');
  if (val && data.value != null && 'value' in val) val.value = String(data.value);
  if (!isStandard && time && data.time && 'value' in time) time.value = String(data.time);
  applyGluRescueFields(row, data);
}

/**
 * @param {HTMLElement} list
 * @param {HTMLElement} row
 */
export function focusNextStandardGluOrIo(list, row) {
  var standardRows = list.querySelectorAll('.ea-glu-row--standard');
  for (var si = 0; si < standardRows.length; si++) {
    if (standardRows[si] !== row) continue;
    if (si < standardRows.length - 1) {
      var nextStd = standardRows[si + 1].querySelector('[data-ea-glu-value]');
      if (nextStd && 'focus' in nextStd) {
        nextStd.focus();
        return true;
      }
    }
    break;
  }
  return false;
}

/**
 * @param {HTMLElement} row
 */
export function focusSiblingGluOrIo(row) {
  var next = row.nextElementSibling;
  var nextFocus = next && next.querySelector('[data-ea-glu-value]');
  if (nextFocus && 'focus' in nextFocus) {
    nextFocus.focus();
    return true;
  }
  var ioIng = document.getElementById('ea-io-ing');
  if (ioIng && 'focus' in ioIng) ioIng.focus();
  return true;
}
