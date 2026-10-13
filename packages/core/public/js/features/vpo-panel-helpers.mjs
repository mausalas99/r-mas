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
  var dialog = (key, title, body, copyAction, copyLabel) =>
    '<dialog class="vpo-dialog" data-vpo-dialog="' + key + '" aria-labelledby="vpo-dlg-' + key + '">' +
    '<div class="vpo-dialog-head"><h3 id="vpo-dlg-' + key + '" class="vpo-section-title">' + title + '</h3>' +
    '<button type="button" class="ea-io-link" data-vpo-close>Cerrar</button></div>' +
    body +
    (copyAction ? '<div class="vpo-calc-actions"><button type="button" class="wb-btn wb-btn-primary" data-vpo-action="' + copyAction + '">' + copyLabel + '</button></div>' : '') +
    '</dialog>';
  var ekgDialog = dialog(
    'ekg',
    'EKG',
    '<div class="vpo-inline-row">' +
      '<label class="ea-label" for="vpo-fc">FC (lpm)</label>' +
      '<input id="vpo-fc" class="ea-input vpo-fc-input" data-vpo-field="fcLpm" type="text" value="' + esc(state.fcLpm) + '">' +
      '<button type="button" class="ea-io-link" data-vpo-action="tomar-estado">Tomar de Estado actual</button>' +
      '</div>' +
      '<label class="ea-label" for="vpo-ekg">EKG</label>' +
      '<textarea id="vpo-ekg" class="ea-input" data-vpo-field="ekgText" rows="6">' + esc(state.ekgText) + '</textarea>',
    'copy-ekg',
    'Copiar EKG'
  );
  var farmDialog = dialog(
    'farm',
    'Fármacos perioperatorios',
    '<button type="button" class="ea-io-link" data-vpo-action="tomar-meds">Tomar de SOME</button>' +
      '<div class="vpo-farm-list">' + renderFarmacosList(state.farmacos) + '</div>',
    'copy-farm',
    'Copiar fármacos'
  );
  var dxDialog = dialog(
    'dx',
    'Diagnósticos',
    '<div class="vpo-calc-actions"><button type="button" class="ea-io-link" data-vpo-action="tomar-dx">Tomar de la nota</button>' +
      '<button type="button" class="ea-io-link" data-vpo-action="push-dx-datos">Enviar a Datos</button></div>' +
      renderDiagnosticosSection(state)
  );
  var rxDialog = dialog(
    'rx',
    'Rx de tórax',
    '<label class="ea-label" for="vpo-rx">Rx de tórax</label>' +
      '<textarea id="vpo-rx" class="ea-input" data-vpo-field="rxText" rows="6">' + esc(state.rxText) + '</textarea>',
    'copy-rx',
    'Copiar Rx'
  );

  return (
    '<div class="vpo-panel vpo-form rpc-form-stack">' +
    '<div class="vpo-columns">' +
    '<div class="vpo-col">' +
    vpoSection(
      'Riesgo preoperatorio',
      riesgoBody,
      ['ekg:EKG', 'rx:Rx de tórax', 'dx:Diagnósticos', 'farm:Fármacos', 'scales:Otras escalas']
        .map((b) => '<button type="button" class="wb-btn" data-vpo-open="' + b.split(':')[0] + '">' + b.split(':')[1] + '</button>')
        .join('') + '<button type="button" class="wb-btn" data-vpo-action="copy-risk">Copiar riesgos</button>' +
        '<button type="button" class="wb-btn wb-btn-primary" data-vpo-action="copy-full">Copiar valoración completa</button>'
    ) +
    '</div>' +
    '</div>' +
    ekgDialog + rxDialog + dxDialog + farmDialog +
    '</div>'
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
