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
 * @param {object} state
 * @param {function} esc
 * @param {function} vpoSection
 * @param {function} renderRiskScalesOnlyBody
 * @param {function} renderDiagnosticosSection
 * @param {function} renderFarmacosList
 */
export function buildVpoPanelInnerHtml(
  state,
  esc,
  vpoSection,
  renderRiskScalesOnlyBody,
  renderDiagnosticosSection,
  renderFarmacosList
) {
  var riesgoBody = renderRiskScalesOnlyBody(state);
  var ekgBody =
    '<div class="vpo-inline-row">' +
    '<label class="ea-label" for="vpo-fc">FC (lpm)</label>' +
    '<input id="vpo-fc" class="ea-input vpo-fc-input" data-vpo-field="fcLpm" type="text" value="' +
    esc(state.fcLpm) +
    '">' +
    '<button type="button" class="ea-io-link" data-vpo-action="tomar-estado">Tomar de Estado actual</button>' +
    '</div>' +
    '<label class="ea-label" for="vpo-ekg">EKG</label>' +
    '<textarea id="vpo-ekg" class="ea-input" data-vpo-field="ekgText" rows="3">' +
    esc(state.ekgText) +
    '</textarea>' +
    '<label class="ea-label" for="vpo-rx">Rx tórax</label>' +
    '<textarea id="vpo-rx" class="ea-input" data-vpo-field="rxText" rows="3">' +
    esc(state.rxText) +
    '</textarea>';

  return (
    '<div class="vpo-panel vpo-form rpc-form-stack">' +
    '<div class="vpo-columns">' +
    '<div class="vpo-col">' +
    vpoSection('Riesgo preoperatorio', riesgoBody, '<button type="button" class="ea-io-link" data-vpo-action="copy-risk">Copiar riesgos</button>') +
    vpoSection(
      'Diagnósticos',
      renderDiagnosticosSection(state),
      '<button type="button" class="ea-io-link" data-vpo-action="tomar-dx">Tomar de la nota</button>' +
        '<button type="button" class="ea-io-link" data-vpo-action="push-dx-datos">Enviar a Datos</button>'
    ) +
    '</div>' +
    '<div class="vpo-col">' +
    vpoSection(
      'EKG y Rx tórax',
      ekgBody,
      '<button type="button" class="ea-io-link" data-vpo-action="copy-ekg">Copiar EKG</button>' +
        '<button type="button" class="ea-io-link" data-vpo-action="copy-rx">Copiar Rx</button>'
    ) +
    vpoSection(
      'Fármacos perioperatorios',
      '<div class="vpo-farm-list">' + renderFarmacosList(state.farmacos) + '</div>',
      '<button type="button" class="ea-io-link" data-vpo-action="tomar-meds">Tomar de SOME</button>' +
        '<button type="button" class="ea-io-link" data-vpo-action="ir-med">Ir a Medicamentos</button>' +
        '<button type="button" class="ea-io-link" data-vpo-action="copy-farm">Copiar</button>'
    ) +
    '</div>' +
    '</div>' +
    '<div class="vpo-actions">' +
    '<button type="button" class="wb-btn wb-btn-primary" data-vpo-action="copy-full">Copiar valoración completa</button>' +
    '</div></div>'
  );
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
