/** EA registro manual — form markup, wiring, reset. */
import { getMedRecetaByPatient } from '../app-state.mjs';
import { storage } from '../storage.js';
import { setTodoDialysisSkippedToday } from './todos-mutations.mjs';
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
  sumIoTurnos,
  ioTurnoAggregate,
  ioTurnoEgresoValue,
  IO_EXTRA_SOURCE_KINDS,
  IO_TURNO_EVENT_KINDS,
  ioTurnosBreakdown,
  evacFromTurnos,
} from './estado-actual-io.mjs';
import { persistEstadoClinicoLight } from './estado-actual-panel-clinico.mjs';
import { VITAL_KEYS } from './estado-actual-panel-constants.mjs';
import { findActivePatient, getEaFormOpenPatientId } from './estado-actual-panel-core.mjs';
import { toDatetimeLocalValue } from './estado-actual-panel-format.mjs';
import {
  fillStandardGluList,
  syncEaGluMode,
  buildBombaRow,
  addBombaRow,
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
import { setEaRegistroEditMode } from './estado-actual-panel-registro-edit.mjs';
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

var IO_TURNO_IDS = ['t1', 't2', 't3'];

/**
 * @param {HTMLElement} form
 * @param {'ing' | 'egr'} prefix
 * @returns {HTMLInputElement[]}
 */
function ioTurnoInputs(form, prefix) {
  return IO_TURNO_IDS.map(function (t) {
    return form.querySelector('#ea-io-' + prefix + '-' + t);
  });
}

/**
 * @param {HTMLElement | null} btn
 */
function toggleIoTurnoNc(btn) {
  if (!btn) return;
  var box = btn.closest('.ea-turno-box');
  var input = box && box.querySelector('input');
  if (!input || !('value' in input)) return;
  var isNc = String(input.value || '').trim().toUpperCase() === 'NC';
  input.value = isNc ? '' : 'NC';
}

/**
 * @param {HTMLElement} form
 * @param {HTMLElement} target
 * @returns {boolean} true si el click era el botón NC de un turno (ya manejado)
 */
function tryHandleIoTurnoNcClick(form, target) {
  var btn = target.matches('[data-ea-io-turno-nc]') ? target : target.closest('[data-ea-io-turno-nc]');
  if (!btn) return false;
  toggleIoTurnoNc(/** @type {HTMLElement} */ (btn));
  syncIoBalanceFromForm(form);
  return true;
}

/**
 * Fuentes cuantificables sueltas (fuera de T1/T2/T3): una fila por fuente,
 * con su propio selector de tipo — ultrafiltrado, drenaje, toracocentesis.
 * @param {HTMLElement | null} form
 * @returns {import('./estado-actual-io.mjs').IoEgresoPart[]}
 */
export function readIoExtraPartsFromForm(form) {
  if (!form) return [];
  var rows = form.querySelectorAll('[data-ea-io-extra-row]');
  var parts = [];
  rows.forEach(function (row) {
    var kindEl = row.querySelector('[data-ea-io-extra-kind]');
    var valueEl = row.querySelector('[data-ea-io-extra-value]');
    var kind = kindEl && 'value' in kindEl ? kindEl.value : '';
    var meta;
    if (kind === IO_EXTRA_CUSTOM_VALUE) {
      var customEl = ioExtraCustomInput(row);
      var name = customEl && 'value' in customEl ? String(customEl.value).trim() : '';
      meta = name ? { kind: 'custom', label: name.toUpperCase() } : null;
    } else {
      meta = IO_EXTRA_SOURCE_KINDS.find(function (k) { return k.kind === kind; });
    }
    if (!meta) return;
    var parsed = parseIoIngresoField(valueEl && 'value' in valueEl ? valueEl.value : '');
    parts.push({ kind: meta.kind, label: meta.label, value: parsed == null ? 'NC' : parsed });
  });
  return parts;
}

/**
 * @param {HTMLElement | null} form
 */
export function syncIoBalanceFromForm(form) {
  if (!form) return;
  var ingInputs = ioTurnoInputs(form, 'ing');
  var egrInputs = ioTurnoInputs(form, 'egr');
  var out = form.querySelector('#ea-balance-turno-live');
  if (ingInputs.some(function (el) { return !el; }) || egrInputs.some(function (el) { return !el; }) || !out) return;

  var ingValues = ingInputs.map(function (el) { return parseIoIngresoField(el.value); });
  var ingTotals = sumIoTurnos(ingValues);
  var ingTotalEl = form.querySelector('#ea-io-ing-total');
  if (ingTotalEl) ingTotalEl.textContent = ioRowTotalText(ingInputs, ingTotals);

  var egrPartsPerTurno = egrInputs.map(function (el) { return parseIoEgresoLine(el.value); });
  var egrTotals = sumIoTurnos(egrPartsPerTurno.map(ioTurnoEgresoValue));
  var egrTotalEl = form.querySelector('#ea-io-egr-total');
  if (egrTotalEl) egrTotalEl.textContent = ioRowTotalText(egrInputs, egrTotals);

  ingInputs.concat(egrInputs).forEach(function (el) {
    if (!el) return;
    var isNc = String(el.value || '').trim().toUpperCase() === 'NC';
    el.classList.toggle('ea-turno-input--nc', isNc);
    var ncBtn = el.closest('.ea-turno-box') && el.closest('.ea-turno-box').querySelector('[data-ea-io-turno-nc]');
    if (ncBtn) ncBtn.setAttribute('aria-pressed', String(isNc));
  });

  var extraParts = readIoExtraPartsFromForm(form);
  syncIoTableDerivedCells(form, ingInputs, egrInputs);
  var combinedParts = [].concat.apply([], egrPartsPerTurno).concat(extraParts);
  var aggregateIng = ioTurnoAggregate(ingTotals);
  var label = formatIoBalanceDisplay(aggregateIng, {
    ing: aggregateIng,
    egrParts: combinedParts,
    egr: diuresisValueFromParts(combinedParts),
  });
  var touched = ingInputs.concat(egrInputs).some(hasIoValue) || extraParts.length > 0;
  out.textContent = touched ? String(label).replace(/\s*CC$/i, '') : '—';
  out.classList.remove('ea-balance-live--pos', 'ea-balance-live--neg');
  if (/^\+\d/.test(String(label))) out.classList.add('ea-balance-live--pos');
  else if (/^-\d/.test(String(label))) out.classList.add('ea-balance-live--neg');
}

function hasIoValue(el) {
  return !!el && String(el.value || '').trim() !== '';
}

/** Empty row → «—»; all NC → «NC»; otherwise the plain sum (the head already says cc). */
function ioRowTotalText(inputs, totals) {
  if (!inputs.some(hasIoValue)) return '—';
  return totals.count ? String(totals.sum) : 'NC';
}

function signedBalance(bal) {
  if (typeof bal === 'number') return (bal > 0 ? '+' : '') + bal;
  return bal === 'NC' ? 'NC' : '—';
}

/** Per-turn balance under each turn column. */
function syncIoTableDerivedCells(form, ingInputs, egrInputs) {
  var rows = ioTurnosBreakdown({
    ingTurnos: ingInputs.map(function (el) { return el.value; }),
    egrTurnos: egrInputs.map(function (el) { return el.value; }),
  });
  rows.forEach(function (r, i) {
    var el = form.querySelector('#ea-io-bal-' + IO_TURNO_IDS[i]);
    if (!el) return;
    el.textContent = signedBalance(r.bal);
    el.classList.toggle('ea-balance-live--pos', typeof r.bal === 'number' && r.bal > 0);
    el.classList.toggle('ea-balance-live--neg', typeof r.bal === 'number' && r.bal < 0);
  });
}

/**
 * @param {HTMLElement} form
 * @param {'ing' | 'egr' | 'evac'} prefix
 * @param {Array<unknown>} values
 */
function fillIoTurnoInputs(form, prefix, values) {
  ioTurnoInputs(form, prefix).forEach(function (el, i) {
    if (el && 'value' in el) el.value = values[i] != null && values[i] !== '' ? String(values[i]) : '';
  });
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
 * @param {{ ing?: unknown, egr?: unknown, egrParts?: unknown[], egrExtra?: Array<{ kind: string, value: unknown }>, evac?: unknown, ingTurnos?: unknown[], egrTurnos?: unknown[] }} io
 */
export function fillIoFields(form, io) {
  io = io || {};
  if (Array.isArray(io.ingTurnos) && io.ingTurnos.length) {
    fillIoTurnoInputs(form, 'ing', io.ingTurnos);
  } else if (io.ing != null && io.ing !== '') {
    fillIoTurnoInputs(form, 'ing', [io.ing]);
  }
  if (Array.isArray(io.egrTurnos) && io.egrTurnos.length) {
    fillIoTurnoInputs(form, 'egr', io.egrTurnos);
  } else {
    var legacyEgrText =
      io.egrParts && io.egrParts.length
        ? serializeEgrPartsToFormText(io.egrParts)
        : io.egr != null && io.egr !== ''
          ? String(io.egr)
          : '';
    if (legacyEgrText) fillIoTurnoInputs(form, 'egr', [legacyEgrText]);
  }
  var hasEvacTurnos = Array.isArray(io.evacTurnos) && io.evacTurnos.length;
  fillEvacField(form.querySelector('#ea-io-evac'), hasEvacTurnos ? evacFromTurnos(io.evacTurnos) : io.evac);
  fillIoRowList(form.querySelector('#ea-io-extra-list'), io.egrExtra, buildIoExtraRow);
  fillIoRowList(form.querySelector('#ea-io-event-list'), io.eventos, buildIoEventRow);
}

function fillIoRowList(list, rows, buildRow) {
  if (!list) return;
  list.innerHTML = '';
  (Array.isArray(rows) ? rows : []).forEach(function (r) {
    list.appendChild(buildRow(r));
  });
}

/**
 * @param {HTMLElement} form
 */
export function clearIoFields(form) {
  fillIoTurnoInputs(form, 'ing', []);
  fillIoTurnoInputs(form, 'egr', []);
  var evacEl = form.querySelector('#ea-io-evac');
  if (evacEl && 'value' in evacEl) evacEl.value = '';
  var extraList = form.querySelector('#ea-io-extra-list');
  if (extraList) extraList.innerHTML = '';
  var eventList = form.querySelector('#ea-io-event-list');
  if (eventList) eventList.innerHTML = '';
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

/** @returns {boolean} true si el click era el botón "No se realizó hoy" de hemodiálisis (ya manejado) */
function tryHandleHemodialisisNoFueClick(form, target) {
  var noFueBtn = target.closest('[data-ea-hemodialisis-no-fue]');
  if (!noFueBtn) return false;
  var pendId = noFueBtn.getAttribute('data-ea-hemodialisis-no-fue');
  if (pendId) setTodoDialysisSkippedToday(pendId);
  var lead = noFueBtn.closest('.ea-registro-hint--hemodialisis');
  if (lead) lead.remove();
  return true;
}

/** @returns {boolean} true si el click era "+" de una capa de signo vital (ya manejado) */
function tryHandleVitalAddClick(form, target) {
  var addBtn = target.closest('[data-ea-vital-add]');
  if (!addBtn) return false;
  var vitalKey = addBtn.getAttribute('data-ea-vital-add');
  if (vitalKey) {
    expandVitalNextLayer(form, vitalKey);
    syncAlteredFields(form);
  }
  return true;
}

/** @returns {boolean} true si el click era "+" de una glucometría (ya manejado) */
function tryHandleGluAddClick(form, target) {
  if (target.id !== 'ea-add-glu' && !target.closest('#ea-add-glu')) return false;
  var gluList = form.querySelector('#ea-glu-list');
  if (gluList) {
    gluList.appendChild(buildGluRow());
    applyRegistroTabSkipAttributes(form);
  }
  return true;
}

/** @returns {boolean} true si el click era "+" de una bomba de insulina (ya manejado) */
function tryHandleBombaAddClick(form, target) {
  if (target.id !== 'ea-add-bomba' && !target.closest('#ea-add-bomba')) return false;
  addBombaRow(form.querySelector('#ea-bomba-list'));
  return true;
}

/** «+ Otra fuente» / «+ Evento» are pickers: choosing a type adds its row, then the picker resets. */
function tryHandleIoAddPick(form, target) {
  var isExtra = target.id === 'ea-add-io-extra';
  if (!isExtra && !target.matches('[data-ea-io-event-add]')) return false;
  var kind = /** @type {HTMLSelectElement} */ (target).value;
  /** @type {HTMLSelectElement} */ (target).value = '';
  if (!kind) return true;
  var list = form.querySelector(isExtra ? '#ea-io-extra-list' : '#ea-io-event-list');
  if (!list) return true;
  var row = isExtra ? buildIoExtraRow({ kind: kind }) : buildIoEventRow({ kind: kind });
  list.appendChild(row);
  if (isExtra && kind === IO_EXTRA_CUSTOM_VALUE) {
    /** @type {HTMLSelectElement} */ (row.querySelector('[data-ea-io-extra-kind]')).value = kind;
    syncIoExtraCustomField(row);
  } else {
    var first = row.querySelector('input:not([hidden])');
    if (first) first.focus();
  }
  syncIoBalanceFromForm(form);
  return true;
}

var FORM_CLICK_HANDLERS = [
  tryHandleHemodialisisNoFueClick,
  tryHandleIoTurnoNcClick,
  tryHandleVitalAddClick,
  tryHandleGluAddClick,
  tryHandleBombaAddClick,
];

function handleFormClick(form, ev) {
  var target = /** @type {HTMLElement | null} */ (ev.target);
  if (!target || !form.contains(target)) return;
  for (var i = 0; i < FORM_CLICK_HANDLERS.length; i++) {
    if (FORM_CLICK_HANDLERS[i](form, target)) return;
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
    return;
  }
  if (tryHandleIoAddPick(form, target)) return;
  if (target.matches('[data-ea-io-extra-kind]')) syncIoBalanceFromForm(form);
}

function handleFormInput(form, ev) {
  var target = /** @type {HTMLElement | null} */ (ev.target);
  if (!target) return;
  if (target.matches('[data-ea-vital][data-ea-layer-idx]')) syncAlteredFields(form);
  else if (target.id === 'ea-recorded-at') syncAlteredFields(form);
  else if (target.matches('[data-ea-glu-value], [data-ea-glu-rescue-units], [data-ea-glu-post-rescue-value]')) {
    var gluRow = target.closest('.ea-glu-row');
    if (gluRow) syncGluRowAltered(/** @type {HTMLElement} */ (gluRow));
  } else if (
    target.matches('[data-ea-io-turno], [data-ea-io-extra-value], [data-ea-io-extra-custom], [data-ea-io-event-row] select')
  ) {
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
export function applyParsedVitals(form, vitals, alteredAt) {
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
export function applyParsedGlus(form, glucometrias) {
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
    '<div class="ea-bomba-head" aria-hidden="true"><span>Hora</span><span>mg/dL</span><span>U</span><span></span></div>' +
    '<div id="ea-bomba-list" class="ea-bomba-list"></div>' +
    '<button type="button" class="ea-io-link" id="ea-add-bomba">+ Hora</button>' +
    '</div>' +
    '</section>'
  );
}

function buildIoTurnoBoxHtml(prefix, turno, inputmode, placeholder, label) {
  var id = 'ea-io-' + prefix + '-' + turno;
  return (
    '<div class="ea-turno-box">' +
    '<input type="text" aria-label="' +
    label +
    ' ' +
    turno.toUpperCase() +
    '" id="' +
    id +
    '" inputmode="' +
    inputmode +
    '" autocomplete="off" placeholder="' +
    placeholder +
    '" data-ea-io-turno="' +
    prefix +
    '">' +
    '<button type="button" class="ea-turno-nc-btn" data-ea-io-turno-nc aria-pressed="false" title="Marcar ' +
    turno.toUpperCase() +
    ' como NC">NC</button>' +
    '</div>'
  );
}

/** Title-cases a stored uppercase source label for display (e.g. "ULTRAFILTRADO" -> "Ultrafiltrado"). */
function ioExtraLabelForDisplay(label) {
  var s = String(label || '');
  return s ? s.charAt(0) + s.slice(1).toLowerCase() : '';
}

/** Dropdown value that means "let me type a source that isn't in the list". */
var IO_EXTRA_CUSTOM_VALUE = '__custom__';

function ioExtraCustomInput(row) {
  return row.querySelector('[data-ea-io-extra-custom]');
}

/** Swaps the dropdown for the "name this source" field (and back) — only one is ever shown. */
function setIoExtraCustomVisible(row, isCustom) {
  var selectEl = row.querySelector('[data-ea-io-extra-kind]');
  var customEl = ioExtraCustomInput(row);
  if (!selectEl || !customEl) return;
  selectEl.hidden = isCustom;
  customEl.hidden = !isCustom;
}

/** Same swap, plus focuses the name field — for when the user just picked "+ Otra…". */
export function syncIoExtraCustomField(row) {
  var selectEl = row.querySelector('[data-ea-io-extra-kind]');
  if (!selectEl) return;
  var isCustom = selectEl.value === IO_EXTRA_CUSTOM_VALUE;
  setIoExtraCustomVisible(row, isCustom);
  if (isCustom) {
    var customEl = ioExtraCustomInput(row);
    if (customEl) customEl.focus();
  }
}

/**
 * @param {{ kind?: string, label?: string, value?: unknown } | null | undefined} [data]
 * @returns {HTMLDivElement}
 */
export function buildIoExtraRow(data) {
  data = data || {};
  var row = document.createElement('div');
  row.className = 'ea-io-extra-row';
  row.setAttribute('data-ea-io-extra-row', '');
  var options =
    '<option value="">Tipo de fuente…</option>' +
    IO_EXTRA_SOURCE_KINDS.map(function (k) {
      return '<option value="' + k.kind + '">' + ioExtraLabelForDisplay(k.label) + '</option>';
    }).join('') +
    '<option value="' + IO_EXTRA_CUSTOM_VALUE + '">+ Otra…</option>';
  row.innerHTML =
    '<div class="ea-io-row-name">' +
    '<select data-ea-io-extra-kind aria-label="Fuente">' + options + '</select>' +
    '<input type="text" class="ea-input" data-ea-io-extra-custom hidden placeholder="Nombre" autocomplete="off">' +
    '<button type="button" class="ea-io-remove" data-ea-io-extra-remove title="Quitar" aria-label="Quitar fuente">×</button>' +
    '</div>' +
    '<input type="text" class="ea-input" data-ea-io-extra-value inputmode="decimal" autocomplete="off" placeholder="cc" aria-label="Volumen">';
  var kindEl = row.querySelector('[data-ea-io-extra-kind]');
  var customEl = ioExtraCustomInput(row);
  var known = data.kind && IO_EXTRA_SOURCE_KINDS.find(function (k) { return k.kind === data.kind; });
  if (kindEl && known) {
    kindEl.value = known.kind;
  } else if (kindEl && data.label) {
    kindEl.value = IO_EXTRA_CUSTOM_VALUE;
    if (customEl) customEl.value = ioExtraLabelForDisplay(data.label);
  }
  if (kindEl) setIoExtraCustomVisible(row, kindEl.value === IO_EXTRA_CUSTOM_VALUE);
  var valueEl = row.querySelector('[data-ea-io-extra-value]');
  if (valueEl && data.value != null && data.value !== '') valueEl.value = String(data.value);
  var removeBtn = row.querySelector('[data-ea-io-extra-remove]');
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      var form = row.closest('form');
      row.remove();
      syncIoBalanceFromForm(form);
    });
  }
  if (kindEl) {
    kindEl.addEventListener('change', function () {
      syncIoExtraCustomField(row);
    });
  }
  return row;
}

/**
 * Eventos del turno — p. ej. T2 en hemodiálisis (turno NC) o un reto de furosemida
 * con la uresis a las 2 h.
 * @param {HTMLElement | null} form
 * @returns {Array<{ turno: string, kind: string, detail: string, ml: string }>}
 */
export function readIoEventsFromForm(form) {
  if (!form) return [];
  var out = [];
  form.querySelectorAll('[data-ea-io-event-row]').forEach(function (row) {
    var get = function (sel) {
      var el = row.querySelector(sel);
      return el && 'value' in el ? String(el.value).trim() : '';
    };
    var kind = get('[data-ea-io-event-kind]');
    if (!kind) return;
    out.push({
      turno: get('[data-ea-io-event-turno]'),
      kind: kind,
      detail: get('[data-ea-io-event-detail]'),
      ml: get('[data-ea-io-event-ml]'),
    });
  });
  return out;
}

/** Placeholders per event type; NC-type events mark an empty turn as NC. */
function syncIoEventRow(row, markNc) {
  var kindEl = row.querySelector('[data-ea-io-event-kind]');
  var meta = IO_TURNO_EVENT_KINDS.find(function (k) { return kindEl && k.kind === kindEl.value; });
  var detailEl = row.querySelector('[data-ea-io-event-detail]');
  var mlEl = row.querySelector('[data-ea-io-event-ml]');
  if (detailEl) {
    detailEl.hidden = !!meta && !meta.detail;
    detailEl.placeholder = (meta && meta.detail) || 'Detalle';
  }
  if (mlEl) {
    mlEl.hidden = !(meta && meta.ml);
    mlEl.placeholder = (meta && meta.ml) || '';
  }
  var form = row.closest('form');
  var turnoEl = row.querySelector('[data-ea-io-event-turno]');
  if (!form || !turnoEl) return;
  if (!markNc || !meta || !meta.nc) {
    syncIoBalanceFromForm(form);
    return;
  }
  ['ing', 'egr'].forEach(function (prefix) {
    var input = form.querySelector('#ea-io-' + prefix + '-' + turnoEl.value);
    if (input && 'value' in input && !String(input.value).trim()) input.value = 'NC';
  });
  syncIoBalanceFromForm(form);
}

/**
 * @param {{ turno?: string, kind?: string, detail?: string, ml?: unknown } | null | undefined} [data]
 * @returns {HTMLDivElement}
 */
export function buildIoEventRow(data) {
  data = data || {};
  var row = document.createElement('div');
  row.className = 'ea-io-extra-row ea-io-event-row';
  row.setAttribute('data-ea-io-event-row', '');
  row.innerHTML =
    '<div class="ea-io-row-name">' +
    '<select data-ea-io-event-kind aria-label="Evento">' +
    '<option value="">Evento…</option>' +
    IO_TURNO_EVENT_KINDS.map(function (k) {
      return '<option value="' + k.kind + '">' + k.short + '</option>';
    }).join('') +
    '</select>' +
    '<button type="button" class="ea-io-remove" data-ea-io-event-remove title="Quitar" aria-label="Quitar evento">×</button>' +
    '</div>' +
    '<select class="ea-input" data-ea-io-event-turno aria-label="Turno">' +
    IO_TURNO_IDS.map(function (t) { return '<option value="' + t + '">' + t.toUpperCase() + '</option>'; }).join('') +
    '</select>' +
    '<input type="text" class="ea-input" data-ea-io-event-detail autocomplete="off" aria-label="Detalle">' +
    '<input type="text" class="ea-input" data-ea-io-event-ml inputmode="decimal" autocomplete="off" aria-label="Volumen">';
  var set = function (sel, v) {
    var el = row.querySelector(sel);
    if (el && v != null && v !== '') el.value = String(v);
  };
  set('[data-ea-io-event-turno]', data.turno || 't1');
  set('[data-ea-io-event-kind]', data.kind);
  set('[data-ea-io-event-detail]', data.detail);
  set('[data-ea-io-event-ml]', data.ml);
  syncIoEventRow(row, false);
  row.addEventListener('change', function (ev) {
    if (ev.target && ev.target.matches('select')) syncIoEventRow(row, true);
  });
  var removeBtn = row.querySelector('[data-ea-io-event-remove]');
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      var form = row.closest('form');
      row.remove();
      syncIoBalanceFromForm(form);
    });
  }
  return row;
}

function ioTableRowHtml(label, cellsHtml, totalHtml, cls) {
  return (
    '<div class="ea-io-table-row' + (cls ? ' ' + cls : '') + '">' +
    '<span class="ea-io-table-label">' + label + '</span>' +
    cellsHtml +
    '<span class="ea-turno-total">' + totalHtml + '</span>' +
    '</div>'
  );
}

function ioTurnoCellsHtml(prefix, label, inputmode, placeholder) {
  return IO_TURNO_IDS.map(function (t) {
    return buildIoTurnoBoxHtml(prefix, t, inputmode, placeholder, label);
  }).join('');
}

/**
 * Balance hídrico as one table: columns are the turns, rows go from what
 * counts in the balance (ingresos, egresos, otras fuentes) to the balance
 * itself, then what only annotates it (evacuaciones, eventos).
 */
function buildRegistroIoSectionHtml() {
  var cols = IO_TURNO_IDS.map(function (t) {
    return '<span class="ea-io-table-head">' + t.toUpperCase() + '</span>';
  }).join('');
  return (
    '<section class="ea-registro-section" aria-labelledby="ea-io-section-lbl">' +
    '<div class="ea-registro-section-head">' +
    '<h4 id="ea-io-section-lbl" class="ea-registro-section-label">Balance hídrico <span class="ea-muted">cc</span></h4>' +
    '</div>' +
    '<div class="ea-io-grid ea-io-table">' +
    ioTableRowHtml('', cols, 'Total', 'ea-io-table-row--head') +
    ioTableRowHtml('Ingresos', ioTurnoCellsHtml('ing', 'Ingresos', 'decimal', ''), '<span id="ea-io-ing-total">—</span>') +
    ioTableRowHtml('Egresos', ioTurnoCellsHtml('egr', 'Egresos', 'text', ''), '<span id="ea-io-egr-total">—</span>') +
    '<div id="ea-io-extra-list" class="ea-io-extra-list"></div>' +
    ioTableRowHtml(
      'Evacuaciones',
      '<span></span><span></span><span></span>',
      '<input type="text" class="ea-input" id="ea-io-evac" autocomplete="off" aria-label="Evacuaciones de los 3 turnos">'
    ) +
    ioTableRowHtml(
      'Balance',
      IO_TURNO_IDS.map(function (t) {
        return '<span class="ea-io-bal" id="ea-io-bal-' + t + '">—</span>';
      }).join(''),
      '<span id="ea-balance-turno-live" class="ea-balance-live">—</span>',
      'ea-io-table-row--balance'
    ) +
    '<div id="ea-io-event-list" class="ea-io-extra-list ea-io-event-list"></div>' +
    '<div class="ea-io-adds">' +
    '<select class="ea-io-link" id="ea-add-io-extra" aria-label="Agregar fuente">' +
    '<option value="">+ Otra fuente</option>' +
    IO_EXTRA_SOURCE_KINDS.map(function (k) {
      return '<option value="' + k.kind + '">' + ioExtraLabelForDisplay(k.label) + '</option>';
    }).join('') +
    '<option value="' + IO_EXTRA_CUSTOM_VALUE + '">Otra…</option>' +
    '</select>' +
    '<select class="ea-io-link" data-ea-io-event-add aria-label="Agregar evento">' +
    '<option value="">+ Evento</option>' +
    IO_TURNO_EVENT_KINDS.map(function (k) {
      return '<option value="' + k.kind + '">' + ioExtraLabelForDisplay(k.label) + '</option>';
    }).join('') +
    '</select>' +
    '</div>' +
    '</div>' +
    '</section>'
  );
}

/**
 * Pendiente de hemodiálisis abierto que no fue silenciado hoy — dispara el
 * recordatorio en el registro para que se documente el ultrafiltrado, o se
 * marque que no se realizó.
 * @param {string | null | undefined} activeId
 * @returns {{ id: string } | null}
 */
export function findOpenHemodialisisReminder(activeId) {
  if (!activeId) return null;
  var today = new Date().toISOString().slice(0, 10);
  var todos = storage.getTodos(activeId) || [];
  return (
    todos.find(function (t) {
      return (
        t &&
        !t.completed &&
        /^Procedimiento: HEMODIALISIS\b/i.test(String(t.text || '')) &&
        t.dialysisSkippedOn !== today
      );
    }) || null
  );
}

function buildRegistroLeadHtml(activeId) {
  var reminder = findOpenHemodialisisReminder(activeId);
  var reminderHtml = reminder
    ? '<div class="ea-registro-hint ea-registro-hint--hemodialisis">' +
      '<span>Hay hemodiálisis indicada. Registra el ultrafiltrado en egresos.</span>' +
      '<button type="button" class="ea-btn ea-btn--ghost" data-ea-hemodialisis-no-fue="' +
      reminder.id +
      '">No se realizó hoy</button>' +
      '</div>'
    : '';
  return reminderHtml ? '<div class="ea-registro-lead">' + reminderHtml + '</div>' : '';
}

function buildRegistroFooterHtml() {
  return (
    '<footer class="ea-registro-modal-foot wb-modal-foot">' +
    '<button type="button" class="wb-btn wb-btn-ghost ea-registro-paste-btn" style="margin-right:auto" data-onclick="openEstadoActualPasteModal" data-onclick-args=\'[{"skipRegistro":true}]\'>Pegar monitoreo</button>' +
    '<button type="button" class="wb-btn wb-btn-secondary wb-btn-lg" data-onclick="closeEstadoActualRegistroModal">Cancelar</button>' +
    '<button type="button" class="wb-btn wb-btn-primary wb-btn-lg ea-registro-submit" data-onclick="registrarEstadoActualMedicion">Registrar</button>' +
    '</footer>'
  );
}

export function buildRegistroFormMarkup() {
  var vitalFields = VITAL_KEYS.map(function (key) {
    return buildVitalStackHtml(key);
  }).join('');
  var activeId = getEaFormOpenPatientId();
  if (activeId == null) activeId = getEaPanelRuntime().getActiveId();

  return (
    '<div class="ea-registro-shell">' +
    '<div class="ea-registro-form-scroll wb-modal-body">' +
    '<form id="ea-form" class="ea-form ea-form--registro" data-prevent-submit>' +
    buildRegistroLeadHtml(activeId) +
    '<div class="ea-registro-top">' +
    '<label class="ea-field ea-field--datetime">' +
    '<span class="ea-label">Fecha y hora</span>' +
    '<input type="datetime-local" class="ea-input rpc-datetime-input" id="ea-recorded-at" value="' +
    toDatetimeLocalValue(getDefaultRegistroRecordedAt()) +
    '">' +
    '</label>' +
    '<p class="ea-registro-hint">Basta un dato para registrar · <span class="ea-registro-kbd-hint">⌘↵</span></p>' +
    '</div>' +
    '<div class="ea-registro-cols">' +
    '<div class="ea-registro-col">' +
    buildRegistroVitalsSectionHtml(vitalFields) +
    buildRegistroGluSectionHtml() +
    '</div>' +
    '<div class="ea-registro-col">' +
    buildRegistroIoSectionHtml() +
    '</div>' +
    '</div>' +
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
  setEaRegistroEditMode(form, null);
  clearVitalFormFields(form);
  var recorded = document.getElementById('ea-recorded-at');
  if (recorded && 'value' in recorded) {
    recorded.value = toDatetimeLocalValue(getDefaultRegistroRecordedAt());
    recorded.dispatchEvent(new Event('rpc-datetime-sync'));
  }
  clearIoFields(form);
  resetGluAndBombaFields();
  syncEaRegistroInsulinPumpFlag(form, _patient && _patient.monitoreo ? _patient.monitoreo : null);
  syncEaGluMode(form);
  syncIoBalanceFromForm(form);
  syncAllVitalAddButtonVisibility(form);
}
