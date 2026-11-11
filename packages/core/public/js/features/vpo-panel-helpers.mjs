import {
  ensureDuracionKey,
  ensureDiagnosticosList,
  autofillVitalsFromMonitoreoIfEmpty,
  setDiagnosticosList,
  importDiagnosticosFromPaste,
} from '../vpo-data.mjs';
import { ensurePatientDiagnosticos } from '../patient-diagnosticos.mjs';
import { markFieldInvalid, clearFieldInvalid } from '../ui-field-invalid.mjs';

/**
 * @param {object} state
 * @param {object|null} patient
 */
export function hydrateVpoPatientDefaults(state, patient) {
  if (!state.edad && patient && patient.edad) {
    var m = String(patient.edad).match(/(\d+)/);
    if (m) state.edad = m[1];
  }
  ensureDuracionKey(state);
  ensureDiagnosticosList(state);
  if (patient && !state.diagnosticosTouched) {
    var vpoDxEmpty = !(state.diagnosticosList || []).some(function (d) {
      return String(d).trim();
    });
    if (vpoDxEmpty) {
      ensurePatientDiagnosticos(patient);
      var fromPat = (patient.diagnosticosList || []).filter(function (d) {
        return String(d).trim();
      });
      if (fromPat.length) setDiagnosticosList(state, fromPat.concat(['']));
    }
  }
  autofillVitalsFromMonitoreoIfEmpty(state, patient || null);
}

/**
 * @param {HTMLElement} mount
 * @param {string} action
 * @param {object} state
 * @param {{
 *   showToast: function,
 *   scheduleSave: function,
 *   refreshDxListDom: function,
 *   commitDxList: function,
 * }} deps
 */
export function handleVpoDxDelegationAction(mount, action, state, deps) {
  if (action === 'dx-split-plus') {
    var ta = mount.querySelector('[data-vpo-dx-paste]');
    if (!importDiagnosticosFromPaste(state, ta ? ta.value : '')) {
      deps.showToast('Pega diagnósticos separados por +', 'error');
      markFieldInvalid(ta, 'Pega diagnósticos separados por +');
      return;
    }
    clearFieldInvalid(ta);
    if (ta) ta.value = '';
    deps.scheduleSave();
    deps.refreshDxListDom(mount, state);
    deps.showToast('Diagnósticos separados', 'success');
    return;
  }

  if (action === 'dx-add-row') {
    if (!state.diagnosticosList) state.diagnosticosList = [''];
    if (state.diagnosticosList[state.diagnosticosList.length - 1]) {
      state.diagnosticosList.push('');
    }
    deps.commitDxList(mount, state);
    var lastInput = mount.querySelector(
      '[data-vpo-dx-idx="' + (state.diagnosticosList.length - 1) + '"]'
    );
    if (lastInput) lastInput.focus();
  }
}

/**
 * @param {HTMLElement} mount
 * @param {HTMLElement} removeBtn
 * @param {object} state
 * @param {{ commitDxList: function }} deps
 */
export function handleVpoDxRemoveRow(mount, removeBtn, state, deps) {
  var idx = parseInt(removeBtn.getAttribute('data-vpo-dx-remove'), 10);
  if (!state.diagnosticosList || state.diagnosticosList.length <= 1) return;
  state.diagnosticosList.splice(idx, 1);
  if (!state.diagnosticosList.length) state.diagnosticosList = [''];
  deps.commitDxList(mount, state);
}
