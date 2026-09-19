/** Registro IO / prefill helpers — extracted from estado-actual-panel-registro.mjs */
import {
  parseIoEgresoLine,
  parseIoIngresoField,
  serializeEgrPartsToFormText,
  diuresisValueFromParts,
  formatIoBalanceDisplay,
  sumIoTurnos,
  ioTurnoAggregate,
  formatIoTurnoTotal,
  ioTurnoEgresoValue,
  IO_EXTRA_SOURCE_KINDS,
} from './estado-actual-io.mjs';
import { patientHasInsulinRescatesInReceta } from './estado-actual-glu-rescue.mjs';
import { patientHasInsulinPumpInReceta } from '../insulin-pump-some-detect.mjs';
import { insulinPumpAlgorithmFromMonitoreo } from './estado-actual-insulin-pump.mjs';
import { getMedRecetaByPatient } from '../app-state.mjs';
import { getEaPanelRuntime } from './estado-actual-panel-runtime.mjs';
import { getEaFormOpenPatientId } from './estado-actual-panel-core.mjs';

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

export var IO_TURNO_IDS = ['t1', 't2', 't3'];

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
 * @param {HTMLElement} form
 * @param {'ing' | 'egr'} prefix
 * @param {Array<unknown>} values
 */
function fillIoTurnoInputs(form, prefix, values) {
  ioTurnoInputs(form, prefix).forEach(function (el, i) {
    if (el && 'value' in el) el.value = values[i] != null && values[i] !== '' ? String(values[i]) : '';
  });
}

/** Dropdown value that means "let me type a source that isn't in the list". */
export var IO_EXTRA_CUSTOM_VALUE = '__custom__';

/**
 * @param {HTMLElement} row
 * @returns {HTMLInputElement | null}
 */
export function ioExtraCustomInput(row) {
  return row.querySelector('[data-ea-io-extra-custom]');
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

/** Title-cases a stored uppercase source label for display (e.g. "ULTRAFILTRADO" -> "Ultrafiltrado"). */
function ioExtraLabelForDisplay(label) {
  var s = String(label || '');
  return s ? s.charAt(0) + s.slice(1).toLowerCase() : '';
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
    IO_EXTRA_SOURCE_KINDS.map(function (k) {
      return '<option value="' + k.kind + '">' + ioExtraLabelForDisplay(k.label) + '</option>';
    }).join('') +
    '<option value="' + IO_EXTRA_CUSTOM_VALUE + '">+ Otra…</option>';
  row.innerHTML =
    '<div class="ea-io-extra-kind-cell">' +
    '<select class="ea-input" data-ea-io-extra-kind>' + options + '</select>' +
    '<input type="text" class="ea-input" data-ea-io-extra-custom hidden placeholder="Nombre de la fuente" autocomplete="off">' +
    '</div>' +
    '<input type="text" class="ea-input" data-ea-io-extra-value inputmode="decimal" autocomplete="off" placeholder="cc o NC">' +
    '<button type="button" class="ea-btn ea-btn--ghost ea-btn--icon" data-ea-io-extra-remove title="Quitar" aria-label="Quitar fuente">×</button>';
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
  if (ingTotalEl) ingTotalEl.textContent = formatIoTurnoTotal(ingTotals);

  var egrPartsPerTurno = egrInputs.map(function (el) { return parseIoEgresoLine(el.value); });
  var egrTotals = sumIoTurnos(egrPartsPerTurno.map(ioTurnoEgresoValue));
  var egrTotalEl = form.querySelector('#ea-io-egr-total');
  if (egrTotalEl) egrTotalEl.textContent = formatIoTurnoTotal(egrTotals);

  ingInputs.concat(egrInputs).forEach(function (el) {
    var isNc = String(el.value || '').trim().toUpperCase() === 'NC';
    el.classList.toggle('ea-turno-input--nc', isNc);
    var ncBtn = el.closest('.ea-turno-box') && el.closest('.ea-turno-box').querySelector('[data-ea-io-turno-nc]');
    if (ncBtn) ncBtn.setAttribute('aria-pressed', String(isNc));
  });

  var combinedParts = [].concat.apply([], egrPartsPerTurno).concat(readIoExtraPartsFromForm(form));
  var aggregateIng = ioTurnoAggregate(ingTotals);
  var label = formatIoBalanceDisplay(aggregateIng, {
    ing: aggregateIng,
    egrParts: combinedParts,
    egr: diuresisValueFromParts(combinedParts),
  });
  out.textContent = label;
  out.classList.remove('ea-balance-live--pos', 'ea-balance-live--neg');
  if (/^\+\d/.test(String(label))) out.classList.add('ea-balance-live--pos');
  else if (/^-\d/.test(String(label))) out.classList.add('ea-balance-live--neg');
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
  fillEvacField(form.querySelector('#ea-io-evac'), io.evac);
  var extraList = form.querySelector('#ea-io-extra-list');
  if (extraList) {
    extraList.innerHTML = '';
    (Array.isArray(io.egrExtra) ? io.egrExtra : []).forEach(function (p) {
      extraList.appendChild(buildIoExtraRow(p));
    });
  }
}

/**
 * @param {HTMLElement} form
 */
export function clearIoFields(form) {
  fillIoTurnoInputs(form, 'ing', []);
  fillIoTurnoInputs(form, 'egr', []);
  var evac = form.querySelector('#ea-io-evac');
  if (evac && 'value' in evac) evac.value = '';
  var extraList = form.querySelector('#ea-io-extra-list');
  if (extraList) extraList.innerHTML = '';
}
