/** EA registro manual — form markup, wiring, reset. */
import { getDefaultRegistroRecordedAt } from './estado-actual-registro-defaults.mjs';
import { VITAL_KEYS } from './estado-actual-panel-constants.mjs';
import { toDatetimeLocalValue } from './estado-actual-panel-format.mjs';
import {
  fillStandardGluList,
  syncEaGluMode,
  buildBombaRow,
} from './estado-actual-panel-glu.mjs';
import {
  buildVitalStackHtml,
  syncAllVitalAddButtonVisibility,
  collapseAllVitalStacks,
} from './estado-actual-panel-vitals.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import { wireFormInteractions } from './estado-actual-panel-registro-wire.mjs';
import { syncIoBalanceFromForm, clearIoFields, syncEaRegistroInsulinRescateFlag, syncEaRegistroInsulinPumpFlag } from './estado-actual-panel-registro-io.mjs';
import { applyEstadoActualParsedToForm } from './estado-actual-panel-registro-apply.mjs';

export { applyEstadoActualParsedToForm };

function buildRegistroVitalsSectionHtml(vitalFields) {
  return (
    '<section class="ea-registro-section" aria-labelledby="ea-vitals-section-lbl">' +
    '<div class="ea-registro-section-head">' +
    '<h4 id="ea-vitals-section-lbl" class="ea-registro-section-label">Signos vitales</h4>' +
    '<span class="ea-registro-section-hint">+1 lectura previa</span>' +
    '</div>' +
    '<div class="vitals-grid ea-vitals-grid">' +
    vitalFields +
    '</div>' +
    '</section>'
  );
}

function buildRegistroGluSectionHtml() {
  return (
    '<section class="ea-registro-section ea-glu-section" aria-labelledby="ea-glu-section-lbl">' +
    '<div class="ea-glu-mode-row lab-pref-row ea-registro-section-head">' +
    '<h4 class="ea-registro-section-label lab-pref-row-label" id="ea-glu-section-lbl">Glucometrías</h4>' +
    '<div class="ea-glu-mode-switch">' +
    '<span class="ea-glu-mode-switch-label" id="ea-bomba-enabled-lbl">Bomba</span>' +
    '<label class="rpc-switch">' +
    '<input type="checkbox" id="ea-bomba-enabled" class="rpc-switch-input" role="switch" aria-labelledby="ea-bomba-enabled-lbl">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span>' +
    '</label>' +
    '<button type="button" class="ea-btn ea-btn--ghost ea-glu-add-inline" id="ea-add-glu">+ Extra</button>' +
    '</div>' +
    '</div>' +
    '<div id="ea-glu-normal-block" class="ea-glu-pane ea-glu-block">' +
    '<div id="ea-glu-list" class="ea-glu-list"></div>' +
    '</div>' +
    '<div id="ea-bomba-block" class="ea-glu-pane ea-glu-block ea-bomba-block ea-glu-pane--off" hidden>' +
    '<p id="ea-bomba-algoritmo-hint" class="ea-bomba-algoritmo-hint ea-muted" hidden></p>' +
    '<div class="ea-glu-head">' +
    '<button type="button" class="ea-btn ea-btn--ghost" id="ea-add-bomba">+ Agregar</button>' +
    '</div>' +
    '<div id="ea-bomba-list" class="ea-glu-list"></div>' +
    '</div>' +
    '</section>'
  );
}

function buildRegistroIoSectionHtml() {
  return (
    '<section class="ea-registro-section" aria-labelledby="ea-io-section-lbl">' +
    '<div class="ea-registro-section-head">' +
    '<h4 id="ea-io-section-lbl" class="ea-registro-section-label">Ingresos / egresos</h4>' +
    '</div>' +
    '<div class="ea-io-grid">' +
    '<label class="ea-field">' +
    '<span class="ea-label ea-label--with-action">Ingresos (cc)' +
    '<button type="button" class="ea-btn ea-btn--ghost ea-io-nc-btn" data-ea-io-nc title="Marcar ingresos, egresos y balance como NC">NC</button>' +
    '</span>' +
    '<input type="text" class="ea-input" id="ea-io-ing" inputmode="text" autocomplete="off" placeholder="cc o NC">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Evacuaciones</span>' +
    '<input type="text" class="ea-input" id="ea-io-evac" inputmode="text" autocomplete="off" placeholder="NC, cc o texto">' +
    '</label>' +
    '<div class="ea-field ea-io-balance">' +
    '<span class="ea-label">Balance</span>' +
    '<span id="ea-balance-turno-live" class="ea-balance-live">—</span>' +
    '</div>' +
    '<label class="ea-field ea-field--full">' +
    '<span class="ea-label">Egresos (diuresis, drenajes, nefrostomías…)</span>' +
    '<input type="text" class="ea-input" id="ea-io-egr" inputmode="text" autocomplete="off" placeholder="DIURESIS NC, DRENAJE 50 CC, NEFRO IZQ 20 CC">' +
    '</label>' +
    '</div>' +
    '</section>'
  );
}

function buildRegistroFooterHtml() {
  return (
    '<footer class="ea-registro-modal-foot">' +
    '<button type="button" class="ea-btn ea-btn--ghost ea-registro-paste-btn" onclick="openEstadoActualPasteModal({ skipRegistro: true })">Pegar monitoreo</button>' +
    '<div class="ea-registro-modal-actions">' +
    '<button type="button" class="ea-btn ea-btn--ghost" onclick="closeEstadoActualRegistroModal()">Cancelar</button>' +
    '<button type="button" class="ea-btn ea-btn--success" onclick="registrarEstadoActualMedicion()">Registrar</button>' +
    '</div>' +
    '</footer>'
  );
}

export function buildRegistroFormMarkup() {
  var vitalFields = VITAL_KEYS.map(function (key) {
    return buildVitalStackHtml(key);
  }).join('');

  return (
    '<div class="ea-registro-shell">' +
    '<div class="ea-registro-form-scroll">' +
    '<form id="ea-form" class="ea-form ea-form--registro" onsubmit="return false;">' +
    '<div class="ea-registro-lead">' +
    '<p class="ea-registro-hint">Basta un dato para registrar · <span class="ea-registro-kbd-hint">⌘↵</span></p>' +
    '</div>' +
    '<label class="ea-field ea-field--datetime">' +
    '<span class="ea-label">Fecha y hora</span>' +
    '<input type="datetime-local" class="ea-input rpc-datetime-input" id="ea-recorded-at" value="' +
    toDatetimeLocalValue(getDefaultRegistroRecordedAt()) +
    '">' +
    '</label>' +
    buildRegistroVitalsSectionHtml(vitalFields) +
    buildRegistroGluSectionHtml() +
    buildRegistroIoSectionHtml() +
    '</form>' +
    '</div>' +
    buildRegistroFooterHtml() +
    '</div>'
  );
}

export function wireEaRegistroForm(monitoreo) {
  var form = document.getElementById('ea-form');
  wireFormInteractions(form);
  refreshRpcDateFields(form);
  syncEaRegistroInsulinRescateFlag(form);
  syncEaRegistroInsulinPumpFlag(form, monitoreo);
  var gluList = document.getElementById('ea-glu-list');
  if (gluList && !gluList.querySelector('.ea-glu-row')) fillStandardGluList(gluList);
  var bombaList = document.getElementById('ea-bomba-list');
  if (bombaList && !bombaList.querySelector('.ea-bomba-row')) bombaList.appendChild(buildBombaRow());
  syncEaGluMode(form);
}

export function syncEaRegistroGluMode() {
  syncEaGluMode(document.getElementById('ea-form'));
}

function clearVitalFormFields(form) {
  form.querySelectorAll('[data-ea-vital]').forEach(function (el) {
    if ('value' in el) el.value = '';
  });
  form.querySelectorAll('[data-ea-altered]').forEach(function (el) {
    if ('value' in el) el.value = '';
  });
  form.querySelectorAll('.ea-altered-slot').forEach(function (el) {
    el.classList.add('ea-altered-slot--hidden');
    el.hidden = true;
  });
  form.querySelectorAll('.ea-vital-box').forEach(function (el) {
    el.classList.remove('ea-vital-box--altered');
  });
  collapseAllVitalStacks(form);
}

function resetGluAndBombaFields() {
  var gluList = document.getElementById('ea-glu-list');
  if (gluList) fillStandardGluList(gluList);
  var bombaToggle = document.getElementById('ea-bomba-enabled');
  var bombaList = document.getElementById('ea-bomba-list');
  if (bombaToggle && 'checked' in bombaToggle) bombaToggle.checked = false;
  if (bombaList) {
    bombaList.innerHTML = '';
    bombaList.appendChild(buildBombaRow());
  }
}

/**
 * Abre el modal limpio: slots de glu estándar vacíos, sin IO ni vitales del historial.
 * @param {{ monitoreo?: ReturnType<typeof import('./estado-actual-data-model.mjs').emptyMonitoreo> } | null | undefined} [_patient]
 */
export function resetEaRegistroForm(_patient) {
  var form = document.getElementById('ea-form');
  if (!form) return;
  clearVitalFormFields(form);
  var recorded = document.getElementById('ea-recorded-at');
  if (recorded && 'value' in recorded) recorded.value = toDatetimeLocalValue(getDefaultRegistroRecordedAt());
  clearIoFields(form);
  resetGluAndBombaFields();
  syncEaRegistroInsulinPumpFlag(form, _patient && _patient.monitoreo ? _patient.monitoreo : null);
  syncEaGluMode(form);
  syncIoBalanceFromForm(form);
  syncAllVitalAddButtonVisibility(form);
}
