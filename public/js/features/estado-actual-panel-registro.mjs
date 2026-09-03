/** EA registro manual — form markup, wiring, reset. */
import { getMedRecetaByPatient } from '../app-state.mjs';
import { patientHasInsulinPumpInReceta } from '../insulin-pump-some-detect.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import { ensureMonitoreo } from './estado-actual-data.mjs';
import { patientHasInsulinRescatesInReceta } from './estado-actual-glu-rescue.mjs';
import { insulinPumpAlgorithmFromMonitoreo } from './estado-actual-insulin-pump.mjs';
import {
  parseIoEgresoLine,
  parseIoIngresoField,
  serializeEgrPartsToFormText,
  diuresisValueFromParts,
  formatIoBalanceDisplay,
} from './estado-actual-io.mjs';
import { persistEstadoClinicoLight } from './estado-actual-panel-clinico.mjs';
import { VITAL_KEYS } from './estado-actual-panel-constants.mjs';
import { findActivePatient, getEaFormOpenPatientId } from './estado-actual-panel-core.mjs';
import { toDatetimeLocalValue } from './estado-actual-panel-format.mjs';
import {
  fillStandardGluList,
  syncEaGluMode,
  buildBombaRow,
  buildGluRow,
  syncGluRowAltered,
} from './estado-actual-panel-glu.mjs';
import {
  applyRegistroTabSkipAttributes,
  handleRegistroTabKeydown,
} from './estado-actual-panel-registro-tab.mjs';
import { getEaPanelRuntime } from './estado-actual-panel-runtime.mjs';
import {
  buildVitalStackHtml,
  syncAllVitalAddButtonVisibility,
  collapseAllVitalStacks,
  expandVitalNextLayer,
  vitalLayerBoxKey,
  setVitalStackFromSeries,
} from './estado-actual-panel-vitals.mjs';
import { isVitalAltered } from './estado-actual-ranges.mjs';
import {
  getDefaultRegistroRecordedAt,
  isTurnCloseHm,
  STANDARD_GLUCOMETRIA_TIMES,
} from './estado-actual-registro-defaults.mjs';
import { getVitalExtraStorageKey } from './estado-actual-vital-extras.mjs';
import { MAX_VITAL_LAYERS_IN_FORM } from './estado-actual-vital-series.mjs';

/**
 * @param {HTMLElement | null} form
 */
export function syncEaRegistroInsulinRescateFlag(form) {
  if (!form) return;
  var activeId = getEaFormOpenPatientId();
  if (activeId == null) activeId = getEaPanelRuntime().getActiveId();
  var block = activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null;
  var hasRescates = patientHasInsulinRescatesInReceta(block);
  form.classList.toggle('ea-form--no-insulin-rescates', !hasRescates);
}

/**
 * Marca el formulario cuando SOME indica bomba de insulina (algoritmo activo).
 * @param {HTMLElement | null} form
 * @param {Record<string, unknown> | null | undefined} [monitoreo]
 */
export function syncEaRegistroInsulinPumpFlag(form, monitoreo) {
  if (!form) return;
  var activeId = getEaFormOpenPatientId();
  if (activeId == null) activeId = getEaPanelRuntime().getActiveId();
  var block = activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null;
  var alg = insulinPumpAlgorithmFromMonitoreo(monitoreo);
  var hasPump = alg != null || patientHasInsulinPumpInReceta(block);
  form.classList.toggle('ea-form--insulin-pump-some', hasPump);
  var algEl = form.querySelector('#ea-bomba-algoritmo-hint');
  if (algEl) {
    algEl.textContent = alg != null ? 'BOMBA DE INSULINA EN ALGORITMO ' + alg : '';
    algEl.hidden = alg == null;
  }
}

/**
 * @param {HTMLElement | null} form
 */
export function applyIoNcMode(form) {
  if (!form) return;
  var ingEl = form.querySelector('#ea-io-ing');
  var egrEl = form.querySelector('#ea-io-egr');
  if (ingEl && 'value' in ingEl) ingEl.value = 'NC';
  if (egrEl && 'value' in egrEl) egrEl.value = 'DIURESIS NC';
  syncIoBalanceFromForm(form);
}

/**
 * @param {HTMLElement | null} form
 */
export function syncIoBalanceFromForm(form) {
  if (!form) return;
  var ingEl = form.querySelector('#ea-io-ing');
  var egrEl = form.querySelector('#ea-io-egr');
  var out = form.querySelector('#ea-balance-turno-live');
  if (!ingEl || !egrEl || !out) return;
  var ing = parseIoIngresoField(ingEl.value);
  if (ing === 'NC' && String(egrEl.value || '').trim().toUpperCase() !== 'DIURESIS NC') {
    egrEl.value = 'DIURESIS NC';
  }
  var egrParts = parseIoEgresoLine(egrEl.value);
  var label = formatIoBalanceDisplay(ing, {
    ing: ing,
    egrParts: egrParts,
    egr: diuresisValueFromParts(egrParts),
  });
  out.textContent = label;
  out.classList.remove('ea-balance-live--pos', 'ea-balance-live--neg');
  if (/^\+\d/.test(String(label))) out.classList.add('ea-balance-live--pos');
  else if (/^-\d/.test(String(label))) out.classList.add('ea-balance-live--neg');
}

/**
 * @param {HTMLElement | null} egrEl
 * @param {{ egrParts?: unknown[], egr?: unknown }} io
 */
export function fillEgrField(egrEl, io) {
  if (!egrEl || !('value' in egrEl)) return;
  if (io.egrParts && io.egrParts.length) {
    egrEl.value = serializeEgrPartsToFormText(io.egrParts);
  } else if (io.egr != null && io.egr !== '') {
    egrEl.value = typeof io.egr === 'number' ? String(io.egr) : String(io.egr);
  }
}

/**
 * @param {HTMLElement | null} evacEl
 * @param {unknown} evac
 */
export function fillEvacField(evacEl, evac) {
  if (!evacEl || evac == null || evac === '' || !('value' in evacEl)) return;
  evacEl.value = typeof evac === 'number' ? String(evac) : String(evac);
}

/**
 * @param {HTMLElement} form
 * @param {{ ing?: unknown, egr?: unknown, egrParts?: unknown[], evac?: unknown }} io
 */
export function fillIoFields(form, io) {
  io = io || {};
  var ingEl = form.querySelector('#ea-io-ing');
  var egrEl = form.querySelector('#ea-io-egr');
  var evacEl = form.querySelector('#ea-io-evac');
  if (ingEl && io.ing != null && io.ing !== '' && 'value' in ingEl) ingEl.value = String(io.ing);
  fillEgrField(egrEl, io);
  fillEvacField(evacEl, io.evac);
}

/**
 * @param {HTMLElement} form
 */
export function clearIoFields(form) {
  var ing = form.querySelector('#ea-io-ing');
  var egr = form.querySelector('#ea-io-egr');
  var evac = form.querySelector('#ea-io-evac');
  if (ing && 'value' in ing) ing.value = '';
  if (egr && 'value' in egr) egr.value = '';
  if (evac && 'value' in evac) evac.value = '';
}

function defaultAlteredTimeFromForm(form) {
  var recEl = form.querySelector('#ea-recorded-at');
  if (!recEl || !('value' in recEl) || !recEl.value) return '';
  var match = String(recEl.value).match(/T(\d{2}):(\d{2})/);
  if (!match) return '';
  return match[1] + ':' + match[2];
}

function syncAlteredFields(form) {
  var defaultTime = defaultAlteredTimeFromForm(form);
  function syncLayer(baseKey, layerIdx) {
    var boxKey = vitalLayerBoxKey(baseKey, layerIdx);
    var input = form.querySelector('[data-ea-vital="' + baseKey + '"][data-ea-layer-idx="' + layerIdx + '"]');
    var wrap = form.querySelector('[data-ea-altered-wrap="' + boxKey + '"]');
    var box = form.querySelector('[data-ea-vital-box="' + boxKey + '"]');
    var timeEl = form.querySelector('[data-ea-altered="' + boxKey + '"]');
    if (!input || !wrap) return;
    var val = input.value;
    var altered = String(val).trim() !== '' && isVitalAltered(baseKey, val);
    wrap.classList.toggle('ea-altered-slot--hidden', !altered);
    wrap.hidden = !altered;
    if (box) box.classList.toggle('ea-vital-box--altered', altered);
    if (altered && timeEl && 'value' in timeEl && !String(timeEl.value).trim() && defaultTime && !isTurnCloseHm(defaultTime)) {
      timeEl.value = defaultTime;
    }
  }
  form.querySelectorAll('[data-ea-vital][data-ea-layer-idx]').forEach(function (input) {
    syncLayer(input.getAttribute('data-ea-vital') || '', input.getAttribute('data-ea-layer-idx') || '0');
  });
  syncAllVitalAddButtonVisibility(form);
}

function handleFormClick(form, ev) {
  var target = /** @type {HTMLElement | null} */ (ev.target);
  if (!target || !form.contains(target)) return;
  if (target.matches('[data-ea-io-nc]') || target.closest('[data-ea-io-nc]')) {
    applyIoNcMode(form);
    return;
  }
  var addBtn = target.closest('[data-ea-vital-add]');
  if (addBtn) {
    var vitalKey = addBtn.getAttribute('data-ea-vital-add');
    if (!vitalKey) return;
    expandVitalNextLayer(form, vitalKey);
    syncAlteredFields(form);
    return;
  }
  if (target.id === 'ea-add-glu' || target.closest('#ea-add-glu')) {
    var gluList = form.querySelector('#ea-glu-list');
    if (gluList) {
      gluList.appendChild(buildGluRow());
      applyRegistroTabSkipAttributes(form);
    }
    return;
  }
  if (target.id === 'ea-add-bomba' || target.closest('#ea-add-bomba')) {
    var bombaList = form.querySelector('#ea-bomba-list');
    if (bombaList) bombaList.appendChild(buildBombaRow());
  }
}

function handleFormChange(form, ev) {
  var target = /** @type {HTMLElement | null} */ (ev.target);
  if (!target) return;
  if (target.id === 'ea-bomba-enabled') {
    syncEaGluMode(form);
    return;
  }
  if (target.matches('[data-ea-glu-altered]')) {
    var gluRow = target.closest('.ea-glu-row');
    if (gluRow) syncGluRowAltered(/** @type {HTMLElement} */ (gluRow));
  }
}

function handleFormInput(form, ev) {
  var target = /** @type {HTMLElement | null} */ (ev.target);
  if (!target) return;
  if (target.matches('[data-ea-vital][data-ea-layer-idx]')) syncAlteredFields(form);
  else if (target.id === 'ea-recorded-at') syncAlteredFields(form);
  else if (target.matches('[data-ea-glu-value], [data-ea-glu-rescue-units], [data-ea-glu-post-rescue-value]')) {
    var gluRow = target.closest('.ea-glu-row');
    if (gluRow) syncGluRowAltered(/** @type {HTMLElement} */ (gluRow));
  } else if (target.id === 'ea-io-ing' || target.id === 'ea-io-egr' || target.id === 'ea-io-evac') {
    syncIoBalanceFromForm(form);
  }
}

/**
 * @param {HTMLElement | null} form
 */
export function wireFormInteractions(form) {
  if (!form) return;
  if (!form.dataset.eaRegistroFormWired) {
    form.dataset.eaRegistroFormWired = '1';
    form.addEventListener('click', function (ev) {
      handleFormClick(form, ev);
    });
    form.addEventListener('change', function (ev) {
      handleFormChange(form, ev);
    });
    form.addEventListener('input', function (ev) {
      handleFormInput(form, ev);
    });
    form.addEventListener('keydown', function (ev) {
      handleRegistroTabKeydown(form, ev);
    });
  }
  applyRegistroTabSkipAttributes(form);
  syncAlteredFields(form);
  syncIoBalanceFromForm(form);
}

/**
 * @param {HTMLElement} form
 * @param {Record<string, unknown>} vitals
 * @param {Record<string, string>} alteredAt
 */
function applyParsedVitals(form, vitals, alteredAt) {
  VITAL_KEYS.forEach(function (key) {
    /** @type {Array<{ value: number, time?: string }>} */
    var readings = [];
    if (vitals[key] != null && vitals[key] !== '') {
      readings.push({ value: Number(vitals[key]), time: alteredAt[key] ? String(alteredAt[key]) : undefined });
    }
    var extraKey = getVitalExtraStorageKey(key);
    if (vitals[extraKey] != null && vitals[extraKey] !== '') {
      readings.push({
        value: Number(vitals[extraKey]),
        time: alteredAt[extraKey] ? String(alteredAt[extraKey]) : undefined,
      });
    }
    setVitalStackFromSeries(form, key, readings.slice(0, MAX_VITAL_LAYERS_IN_FORM));
  });
}

/**
 * @param {HTMLElement} form
 * @param {Array<{ time?: string }>} glucometrias
 */
function applyParsedGlus(form, glucometrias) {
  var gluList = form.querySelector('#ea-glu-list');
  if (!gluList || !glucometrias.length) return;
  var standardSet = new Set(STANDARD_GLUCOMETRIA_TIMES);
  var standardGlus = [];
  var extraGlus = [];
  glucometrias.forEach(function (g) {
    var t = g.time != null ? String(g.time) : '';
    if (t && standardSet.has(t)) standardGlus.push(g);
    else extraGlus.push(g);
  });
  fillStandardGluList(gluList, standardGlus);
  extraGlus.forEach(function (g) {
    gluList.appendChild(buildGluRow(g));
  });
}

/**
 * @param {string | undefined} soporteHint
 */
function applyParsedSoporte(soporteHint) {
  if (!soporteHint) return;
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  if (!patient.monitoreo.estadoClinico) patient.monitoreo.estadoClinico = {};
  patient.monitoreo.estadoClinico.soporte = soporteHint;
  var soporteSel = document.querySelector('[data-ea-ec="soporte"]');
  if (soporteSel && 'value' in soporteSel) soporteSel.value = soporteHint;
  persistEstadoClinicoLight(patient.monitoreo, patient);
}

/**
 * @param {ReturnType<typeof import('./estado-actual-parser.mjs').parseEstadoActualPaste>} parsed
 */
export function applyEstadoActualParsedToForm(parsed) {
  var form = document.getElementById('ea-form');
  if (!form || !parsed || !parsed.ok) return;
  applyParsedVitals(form, parsed.vitals, parsed.alteredAt);
  applyParsedGlus(form, parsed.glucometrias);
  fillIoFields(form, parsed.io);
  syncIoBalanceFromForm(form);
  applyParsedSoporte(parsed.soporteHint);
}

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
