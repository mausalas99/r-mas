/** EA registro — edit one historial row in place (Editar beside Eliminar). */
import { ensureMonitoreo } from './estado-actual-data.mjs';
import { VITAL_KEYS } from './estado-actual-panel-constants.mjs';
import { toDatetimeLocalValue } from './estado-actual-panel-format.mjs';
import { buildBombaRow, syncEaGluMode } from './estado-actual-panel-glu.mjs';
import { setVitalStackFromSeries } from './estado-actual-panel-vitals.mjs';
import {
  fillIoFields,
  syncIoBalanceFromForm,
  applyParsedVitals,
  applyParsedGlus,
} from './estado-actual-panel-registro.mjs';
import { findActivePatient } from './estado-actual-panel-core.mjs';
import { getEaPanelRuntime } from './estado-actual-panel-runtime.mjs';

/**
 * Edit mode: the form carries the historial row id being edited; modal labels follow.
 * @param {HTMLElement | null} form
 * @param {string | null | undefined} id
 */
export function setEaRegistroEditMode(form, id) {
  if (!form) return;
  if (id) form.setAttribute('data-ea-edit-id', String(id));
  else form.removeAttribute('data-ea-edit-id');
  var title = document.getElementById('ea-registro-title');
  if (title) title.textContent = id ? 'Editar medición' : 'Registrar medición';
  var submit = document.querySelector('.ea-registro-modal-actions .ea-btn--success');
  if (submit) submit.textContent = id ? 'Guardar cambios' : 'Registrar';
}

/** @param {HTMLElement | null} form */
export function getEaRegistroEditId(form) {
  return form ? form.getAttribute('data-ea-edit-id') || '' : '';
}

/**
 * @param {HTMLElement} form
 * @param {import('./estado-actual-data.mjs').MedicionHistorial} row
 */
function applyMedicionVitals(form, row) {
  var series = row.vitalSeries || {};
  var hasSeries = VITAL_KEYS.some(function (k) {
    return Array.isArray(series[k]) && series[k].length > 0;
  });
  if (hasSeries) {
    VITAL_KEYS.forEach(function (k) {
      setVitalStackFromSeries(form, k, Array.isArray(series[k]) ? series[k] : []);
    });
  } else {
    applyParsedVitals(form, row.vitals || {}, row.alteredAt || {});
  }
  // One input event is enough: the form wiring re-syncs every altered-time slot.
  var anyVital = form.querySelector('[data-ea-vital][data-ea-layer-idx]');
  if (anyVital) anyVital.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * @param {HTMLElement} form
 * @param {Array<{ value?: unknown, units?: unknown, time?: string }>} bomba
 */
function applyMedicionBomba(form, bomba) {
  var toggle = form.querySelector('#ea-bomba-enabled');
  if (toggle && 'checked' in toggle) toggle.checked = bomba.length > 0;
  var bombaList = form.querySelector('#ea-bomba-list');
  if (bombaList && bomba.length) {
    bombaList.innerHTML = '';
    bomba.forEach(function (b) {
      bombaList.appendChild(buildBombaRow(b));
    });
  }
  // Toggle was set by code, not by a change event: show the matching pane ourselves.
  syncEaGluMode(/** @type {HTMLFormElement} */ (form));
}

/**
 * Prefill the registro form from a stored historial row.
 * @param {import('./estado-actual-data.mjs').MedicionHistorial | null | undefined} row
 */
export function applyMedicionToForm(row) {
  var form = document.getElementById('ea-form');
  if (!form || !row) return;
  var recorded = form.querySelector('#ea-recorded-at');
  if (recorded && 'value' in recorded && row.recordedAt) recorded.value = toDatetimeLocalValue(row.recordedAt);
  applyMedicionVitals(form, row);
  applyMedicionBomba(form, Array.isArray(row.bombaInsulina) ? row.bombaInsulina : []);
  applyParsedGlus(form, Array.isArray(row.glucometrias) ? row.glucometrias : []);
  fillIoFields(form, row.io || {});
  syncIoBalanceFromForm(form);
}

/**
 * Open the registro modal prefilled with one historial row; Registrar then replaces it in place.
 * @param {string} id
 */
export function editarEstadoActualMedicion(id) {
  var patient = findActivePatient();
  if (!patient || !id) return;
  ensureMonitoreo(patient);
  var row = patient.monitoreo.historial.find(function (r) {
    return r && typeof r === 'object' && r.id === id;
  });
  if (!row) {
    getEaPanelRuntime().showToast('Medición no encontrada', 'error');
    return;
  }
  // Same entry point as the "Registro manual" button: builds + resets the form, then opens it.
  if (typeof window !== 'undefined' && typeof window.openEstadoActualRegistroModal === 'function') {
    window.openEstadoActualRegistroModal();
  }
  applyMedicionToForm(row);
  setEaRegistroEditMode(document.getElementById('ea-form'), id);
}
