// Panel Estado Actual (Sala) — formulario, historial, snapshot, texto
import { patients, medRecetaByPatient, medNotaSelectionByPatient, saveState } from '../app-state.mjs';
import {
  ensureMonitoreo,
  migratePatientMonitoreo,
  deriveSnapshot,
  balanceTurno,
  balanceGlobalHistorico,
  appendMedicion,
  removeMedicion,
  MED_FIELD_KEYS,
  buildEaMonitoreoRevision,
  resolveDietWeightKg,
  syncDietKcalFromWeight,
  computeDietKcalTotal,
  computeDietKcalKgFromTotal,
  parseWeightKg,
  isIoNumericValue,
} from './estado-actual-data.mjs';
import {
  parseIoEgresoLine,
  parseIoEvacField,
  serializeEgrPartsToFormText,
  diuresisValueFromParts,
  computeIoBalanceFromIngEgr,
  formatEgresoPartForText,
  formatEvacForText,
  formatBalanceLive,
  toEaSalidaText,
} from './estado-actual-io.mjs';
import { isVitalAltered, buildAlteredAtDefaults, isGlucometriaMarkedAltered } from './estado-actual-ranges.mjs';
import { buildEstadoActualText } from './estado-actual-text.mjs';
import {
  confirmMedField,
  discardMedProposal,
  confirmAllMedProposals,
  confirmDietProposal,
  discardDietProposal,
  hasPendingEaProposals,
  DIET_PENDING_KEYS,
  estadoClinicoForDisplay,
  estadoClinicoForText,
  syncRecetaProposalsFromSoapSelection,
} from './estado-actual-meds.mjs';
import { renderMedCategoryGrid, wireMedCategoryGrid } from './estado-actual-med-ui.mjs';
import { classifyMedicationSoapCategory } from '../med-receta-core.mjs';
import { renderEstadoActualBar } from './soap-estado.mjs';
import {
  buildEaHistorialChartsRevision,
  renderEaChartsSummarySection,
} from './estado-actual-charts.mjs';
import {
  getDefaultRegistroRecordedAt,
  collectGlucometriasForRegistroWindow,
  STANDARD_GLUCOMETRIA_TIMES,
} from './estado-actual-registro-defaults.mjs';
import { getVitalExtraStorageKey, getBaseVitalKey } from './estado-actual-vital-extras.mjs';
import {
  MAX_VITAL_LAYERS_IN_FORM,
  MAX_VITAL_READINGS_PER_DAY,
  vitalSeriesFromMedicion,
  vitalSeriesToLegacyFields,
  countVitalReadingsInRegistroWindow,
  collectBombaInsulinaForRegistroWindow,
} from './estado-actual-vital-series.mjs';

var _eaPanelCache = { shellKey: '', dataKey: '' };

export function invalidateEaPanelCache() {
  _eaPanelCache.shellKey = '';
  _eaPanelCache.dataKey = '';
}

/** @type {readonly string[]} */
const VITAL_KEYS = ['tas', 'tad', 'fc', 'fr', 'temp', 'sat'];

/** @type {Record<string, string>} */
const VITAL_LABELS = {
  tas: 'TAS',
  tad: 'TAD',
  fc: 'FC',
  fr: 'FR',
  temp: 'Temp',
  sat: 'Saturación',
};

/** @type {Record<string, string>} */
const VITAL_UNITS = {
  tas: 'mmHg',
  tad: 'mmHg',
  fc: 'lpm',
  fr: 'rpm',
  temp: '°C',
  sat: '%',
};

/** @type {readonly string[]} */
const SOPORTE_OPTIONS = ['Aire ambiente', 'Puntillas nasales', 'Alto flujo', 'VM no invasiva'];

let rt = {
  getActiveId() {
    return null;
  },
  showToast() {},
  onMedicionRegistered() {},
  getSettings() {
    return {};
  },
  switchConsolidatedTab() {},
  copyToClipboardSafe(_text) {
    return Promise.resolve(false);
  },
};

export function registerEstadoActualPanelRuntime(ctx) {
  if (!ctx || typeof ctx !== 'object') return;
  Object.assign(rt, ctx);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * @param {string | null | undefined} savedAt
 * @returns {string}
 */
export function formatEaSavedLabel(savedAt) {
  if (!savedAt) return '';
  var d = new Date(savedAt);
  if (isNaN(d.getTime())) return '';
  return (
    'Guardado ' +
    pad2(d.getDate()) +
    '/' +
    pad2(d.getMonth() + 1) +
    ' ' +
    pad2(d.getHours()) +
    ':' +
    pad2(d.getMinutes())
  );
}

/**
 * @param {Date | string | number} [when]
 * @returns {string}
 */
export function toDatetimeLocalValue(when) {
  var d = when == null ? new Date() : when instanceof Date ? when : new Date(when);
  if (isNaN(d.getTime())) return '';
  return (
    d.getFullYear() +
    '-' +
    pad2(d.getMonth() + 1) +
    '-' +
    pad2(d.getDate()) +
    'T' +
    pad2(d.getHours()) +
    ':' +
    pad2(d.getMinutes())
  );
}

/**
 * @param {string} localValue
 * @returns {string}
 */
export function datetimeLocalToIso(localValue) {
  if (!localValue || !String(localValue).trim()) return new Date().toISOString();
  var d = new Date(localValue);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * @param {string} iso
 * @returns {string}
 */
export function isoToHHmm(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseNumOrNull(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  var n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function displayValue(value) {
  return value != null && value !== '' ? String(value) : '—';
}

/**
 * @param {unknown} n
 * @returns {string}
 */
function displayBalance(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return formatBalanceLive(n);
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(s) {
  return escHtml(s).replace(/'/g, '&#39;');
}

/** Number inputs reject non-numeric value attributes (e.g. legacy demo strings). */
function escAttrNumeric(s) {
  const raw = String(s ?? '').trim();
  if (!raw) return '';
  const n = Number(raw);
  return Number.isFinite(n) ? escAttr(String(n)) : '';
}

function hasDietProposal(pendienteReceta) {
  return DIET_PENDING_KEYS.some(function (k) {
    return pendienteReceta && pendienteReceta[k] && String(pendienteReceta[k]).trim();
  });
}

/**
 * @param {ReturnType<typeof emptyMonitoreo>} monitoreo
 * @param {string | null} activeId
 */
function renderEstadoClinicoSection(monitoreo, activeId, patient) {
  var pend = monitoreo.pendienteReceta || {};
  var dietPending = hasDietProposal(pend);
  var ec = estadoClinicoForDisplay(monitoreo);
  var snapshot = deriveSnapshot(monitoreo);
  var dietWeight = resolveDietWeightKg({
    patientPeso: patient && patient.peso,
    pesoRef: ec.pesoRef,
  });
  var kcalDisplay = ec.kcal;
  if ((!dietPending || !String(pend.kcal || '').trim()) && dietWeight != null) {
    var kcalComputed = computeDietKcalTotal(ec.kcalKg, dietWeight);
    if (kcalComputed != null) kcalDisplay = String(kcalComputed);
  }
  var dietWeightHint =
    dietWeight != null
      ? 'Peso para cálculo: ' + dietWeight + ' kg (datos del paciente)'
      : 'Peso para cálculo: — (captura peso en Datos del paciente)';
  var anyPending = hasPendingEaProposals(pend);

  var medFieldsHtml = renderMedCategoryGrid(monitoreo, activeId, medRecetaByPatient);

  var soporteOpts = SOPORTE_OPTIONS.map(function (opt) {
    var sel = ec.soporte === opt ? ' selected' : '';
    return '<option value="' + escAttr(opt) + '"' + sel + '>' + escHtml(opt) + '</option>';
  }).join('');

  return (
    '<details class="ea-estado-clinico ea-card"' +
    (anyPending ? ' open' : '') +
    '>' +
    '<summary>Estado clínico general</summary>' +
    '<div class="ea-clinico-body">' +
    '<div class="ea-clinico-grid">' +
    '<div class="ea-clinico-vitals-row">' +
    '<label class="ea-field">' +
    '<span class="ea-label">FOUR (/16)</span>' +
    '<input type="number" class="ea-input" data-ea-ec="four" min="0" max="16" step="1" value="' +
    escAttrNumeric(ec.four) +
    '">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Esferas</span>' +
    '<input type="number" class="ea-input" data-ea-ec="esferas" min="0" step="1" value="' +
    escAttrNumeric(ec.esferas) +
    '">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Soporte respiratorio</span>' +
    '<select class="ea-input" data-ea-ec="soporte">' +
    soporteOpts +
    '</select>' +
    '</label>' +
    '</div>' +
    '<div class="ea-clinico-nutrition-row">' +
    '<label class="ea-field ea-field--dieta">' +
    '<span class="ea-label">Dieta' +
    (dietPending ? ' <span class="ea-pendiente-badge">Propuesta</span>' : '') +
    '</span>' +
    '<input type="text" class="ea-input" data-ea-ec="dieta" value="' +
    escAttr(ec.dieta) +
    '">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Kcal/kg</span>' +
    '<input type="number" class="ea-input" data-ea-ec="kcalKg" step="any" value="' +
    escAttr(ec.kcalKg) +
    '">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Kcal total</span>' +
    '<input type="number" class="ea-input" data-ea-ec="kcal" step="any" min="0" value="' +
    escAttr(kcalDisplay) +
    '" placeholder="Total">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Proteína (g/día)</span>' +
    '<input type="number" class="ea-input" data-ea-ec="proteinG" step="any" min="0" value="' +
    escAttr(ec.proteinG) +
    '" placeholder="Gramos">' +
    '</label>' +
    '</div>' +
    (dietPending
      ? '<div class="ea-diet-proposal-bar">' +
        '<span class="ea-diet-proposal-lead">Dieta importada desde SOME — revisa los valores y confirma o descarta.</span>' +
        '<div class="ea-diet-proposal-actions">' +
        '<button type="button" class="ea-btn ea-btn--primary" onclick="confirmEaDietProposal()">Confirmar dieta</button>' +
        '<button type="button" class="ea-btn" onclick="discardEaDietProposal()">Descartar</button>' +
        '</div></div>'
      : '') +
    '</div>' +
    '<p class="ea-diet-weight-hint">' +
    escHtml(dietWeightHint) +
    '</p>' +
    '<div class="ea-clinico-med-grid">' +
    medFieldsHtml +
    '</div>' +
    (anyPending
      ? '<div class="ea-clinico-actions">' +
        '<button type="button" class="ea-btn ea-btn--primary" onclick="confirmAllEaMedProposals()">Confirmar todas las propuestas</button>' +
        '</div>'
      : '') +
    '</div>' +
    '</details>'
  );
}

/**
 * @param {{ monitoreo?: unknown } | null | undefined} patient
 * @returns {string}
 */
function getEstadoActualTextForPatient(patient) {
  if (!patient || !patient.monitoreo) return '';
  return generateEstadoActualText(patient.monitoreo, patient);
}

function persistEstadoClinicoAndRefresh(monitoreo, toastMsg, patient) {
  saveState();
  renderEstadoActualPanel({ dataOnly: true, refreshClinico: true, skipChartsSummary: true });
  if (toastMsg) rt.showToast(toastMsg, 'success');
}

function persistEstadoClinicoLight(monitoreo, patient) {
  saveState();
}

/**
 * @param {HTMLElement | null} mount
 */
function captureEaPanelUiState(mount) {
  if (!mount) return { clinicoOpen: false, historialOpen: false };
  var det = mount.querySelector('.ea-estado-clinico');
  var hist = mount.querySelector('.ea-historial');
  return {
    clinicoOpen: !!(det && det.open),
    historialOpen: !!(hist && hist.open),
  };
}

/**
 * @param {HTMLElement | null} mount
 * @param {{ clinicoOpen?: boolean, historialOpen?: boolean }} state
 */
function restoreEaPanelUiState(mount, state) {
  if (!mount || !state) return;
  if (state.clinicoOpen) {
    var det = mount.querySelector('.ea-estado-clinico');
    if (det) det.open = true;
  }
  if (state.historialOpen) {
    var hist = mount.querySelector('.ea-historial');
    if (hist) hist.open = true;
  }
}

function applyEstadoClinicoFieldChange(el, monitoreo, patient) {
  var key = el.getAttribute('data-ea-ec');
  if (!key || !monitoreo.estadoClinico) return;
  monitoreo.estadoClinico[key] = 'value' in el ? String(el.value) : '';
  var w = resolveDietWeightKg({
    patientPeso: patient.peso,
    pesoRef: monitoreo.estadoClinico.pesoRef,
  });
  var panel = document.getElementById('exp-pane-estado-actual');
  if (key === 'kcalKg') {
    if (syncDietKcalFromWeight(monitoreo.estadoClinico, w)) {
      var kcalInput = panel && panel.querySelector('[data-ea-ec="kcal"]');
      if (kcalInput && 'value' in kcalInput) kcalInput.value = String(monitoreo.estadoClinico.kcal || '');
    }
  } else if (key === 'kcal') {
    var kg = computeDietKcalKgFromTotal(monitoreo.estadoClinico.kcal, w);
    if (kg != null) {
      monitoreo.estadoClinico.kcalKg = String(kg);
      var kcalKgInput = panel && panel.querySelector('[data-ea-ec="kcalKg"]');
      if (kcalKgInput && 'value' in kcalKgInput) kcalKgInput.value = String(kg);
    }
  }
  persistEstadoClinicoLight(monitoreo, patient);
}

function wireEstadoClinicoInteractions(mount, patient) {
  if (!mount || !patient) return;
  var monitoreo = patient.monitoreo;

  mount.querySelectorAll('[data-ea-ec]').forEach(function (el) {
    var tag = (el.tagName || '').toUpperCase();
    if (tag === 'SELECT') {
      el.addEventListener('change', function () {
        applyEstadoClinicoFieldChange(el, monitoreo, patient);
      });
      return;
    }
    el.addEventListener('input', function () {
      applyEstadoClinicoFieldChange(el, monitoreo, patient);
    });
  });

  wireMedCategoryGrid(mount, {
    monitoreo: monitoreo,
    patient: patient,
    medRecetaByPatient: medRecetaByPatient,
    getActiveId: function () {
      return rt.getActiveId();
    },
    saveState: saveState,
    syncTextarea: function () {},
  });
}

function findActivePatient() {
  var activeId = rt.getActiveId();
  if (!activeId) return null;
  return (
    patients.find(function (p) {
      return p.id === activeId;
    }) || null
  );
}

/**
 * @param {ReturnType<typeof emptyMonitoreo>} monitoreo
 * @param {{ peso?: unknown } | null | undefined} [patient]
 */
function generateEstadoActualText(monitoreo, patient) {
  var snapshot = deriveSnapshot(monitoreo);
  var weightKg = resolveDietWeightKg({
    patientPeso: patient && patient.peso,
    pesoRef: monitoreo.estadoClinico && monitoreo.estadoClinico.pesoRef,
  });
  if (monitoreo.estadoClinico) syncDietKcalFromWeight(monitoreo.estadoClinico, weightKg);
  return buildEstadoActualText(
    estadoClinicoForText(monitoreo),
    snapshot,
    { balanceTurno: balanceTurno(monitoreo) },
    { patientPeso: patient && patient.peso }
  );
}

function wireFormInteractions(form) {
  if (!form) return;

  function syncAlteredFields() {
    function syncLayer(baseKey, layerIdx) {
      var boxKey = vitalLayerBoxKey(baseKey, layerIdx);
      var input = form.querySelector(
        '[data-ea-vital="' + baseKey + '"][data-ea-layer-idx="' + layerIdx + '"]'
      );
      var wrap = form.querySelector('[data-ea-altered-wrap="' + boxKey + '"]');
      var box = form.querySelector('[data-ea-vital-box="' + boxKey + '"]');
      if (!input || !wrap) return;
      var val = input.value;
      var showSlot = String(val).trim() !== '';
      var altered = showSlot && isVitalAltered(baseKey, val);
      wrap.classList.toggle('ea-altered-slot--hidden', !altered);
      wrap.hidden = !altered;
      if (box) box.classList.toggle('ea-vital-box--altered', altered);
    }
    form.querySelectorAll('[data-ea-vital][data-ea-layer-idx]').forEach(function (input) {
      var baseKey = input.getAttribute('data-ea-vital') || '';
      var layerIdx = input.getAttribute('data-ea-layer-idx') || '0';
      syncLayer(baseKey, layerIdx);
    });
    syncAllVitalAddButtonVisibility(form);
  }

  function syncIoBalance() {
    syncIoBalanceFromForm(form);
  }

  if (!form.dataset.eaRegistroFormWired) {
    form.dataset.eaRegistroFormWired = '1';

    form.addEventListener('click', function (ev) {
      var target = /** @type {HTMLElement | null} */ (ev.target);
      if (!target || !form.contains(target)) return;

      var addBtn = target.closest('[data-ea-vital-add]');
      if (addBtn) {
        var vitalKey = addBtn.getAttribute('data-ea-vital-add');
        if (!vitalKey) return;
        var patient = findActivePatient();
        var hist =
          patient && patient.monitoreo && Array.isArray(patient.monitoreo.historial)
            ? patient.monitoreo.historial
            : [];
        expandVitalNextLayer(form, vitalKey, hist);
        return;
      }

      if (target.id === 'ea-add-glu' || target.closest('#ea-add-glu')) {
        var gluList = form.querySelector('#ea-glu-list');
        if (gluList) gluList.appendChild(buildGluRow());
        return;
      }

      if (target.id === 'ea-add-bomba' || target.closest('#ea-add-bomba')) {
        var bombaList = form.querySelector('#ea-bomba-list');
        if (bombaList) bombaList.appendChild(buildBombaRow());
      }
    });

    form.addEventListener('change', function (ev) {
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
    });

    form.addEventListener('input', function (ev) {
      var target = /** @type {HTMLElement | null} */ (ev.target);
      if (!target) return;
      if (target.matches('[data-ea-vital][data-ea-layer-idx]')) syncAlteredFields();
      else if (
        target.matches('[data-ea-glu-value], [data-ea-glu-rescue-units], [data-ea-glu-post-rescue-value]')
      ) {
        var gluRow = target.closest('.ea-glu-row');
        if (gluRow) syncGluRowAltered(/** @type {HTMLElement} */ (gluRow));
      } else if (
        target.id === 'ea-io-ing' ||
        target.id === 'ea-io-egr' ||
        target.id === 'ea-io-evac'
      ) {
        syncIoBalance();
      }
    });

    form.addEventListener('keydown', function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
        ev.preventDefault();
        registrarEstadoActualMedicion();
      }
    });
  }

  syncAlteredFields();
  syncIoBalance();
}

/**
 * @returns {HTMLDivElement}
 */
function focusNextGluValueOrIo(row) {
  var list = row.parentElement;
  if (!list) return;
  if (row.classList.contains('ea-glu-row--standard')) {
    var standardRows = list.querySelectorAll('.ea-glu-row--standard');
    for (var si = 0; si < standardRows.length; si++) {
      if (standardRows[si] !== row) continue;
      if (si < standardRows.length - 1) {
        var nextStd = standardRows[si + 1].querySelector('[data-ea-glu-value]');
        if (nextStd && 'focus' in nextStd) {
          nextStd.focus();
          return;
        }
      }
      break;
    }
  } else {
    var next = row.nextElementSibling;
    var nextFocus = next && next.querySelector('[data-ea-glu-value]');
    if (nextFocus && 'focus' in nextFocus) {
      nextFocus.focus();
      return;
    }
  }
  var ioIng = document.getElementById('ea-io-ing');
  if (ioIng && 'focus' in ioIng) ioIng.focus();
}

function gluRescueFieldsHtml() {
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

function syncGluRowAltered(row) {
  var alteredEl = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-ea-glu-altered]'));
  var wrap = row.querySelector('[data-ea-glu-rescue-wrap]');
  var valueEl = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-ea-glu-value]'));
  if (!alteredEl || !wrap) return;
  var altered = !!alteredEl.checked;
  var hasValue = !!(valueEl && String(valueEl.value).trim() !== '');
  var showRescue = altered && hasValue;
  wrap.classList.toggle('ea-glu-rescue-wrap--hidden', !showRescue);
  wrap.hidden = !showRescue;
  row.classList.toggle('ea-glu-row--altered', showRescue);
}

function wireGluRowAltered(row) {
  var alteredEl = row.querySelector('[data-ea-glu-altered]');
  var valueEl = row.querySelector('[data-ea-glu-value]');
  if (alteredEl) {
    alteredEl.addEventListener('change', function () {
      syncGluRowAltered(row);
    });
  }
  if (valueEl) {
    valueEl.addEventListener('input', function () {
      syncGluRowAltered(row);
    });
  }
  syncGluRowAltered(row);
}

function wireGluRowKeyboard(row) {
  var valueEl = row.querySelector('[data-ea-glu-value]');
  if (!valueEl) return;
  valueEl.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    if (row.classList.contains('ea-glu-row--extra')) {
      var list = row.parentElement;
      var extraRows = list ? list.querySelectorAll('.ea-glu-row--extra') : [];
      if (row === extraRows[extraRows.length - 1]) {
        var newRow = buildGluRow();
        if (list) list.appendChild(newRow);
        var focusEl = newRow.querySelector('[data-ea-glu-value]');
        if (focusEl && 'focus' in focusEl) focusEl.focus();
        return;
      }
    }
    focusNextGluValueOrIo(row);
  });
  var timeEl = row.querySelector('[data-ea-glu-time]:not([type="hidden"])');
  if (timeEl) {
    timeEl.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      if (valueEl && 'focus' in valueEl) valueEl.focus();
    });
  }
}

/**
 * @param {{ value?: number, time?: string, altered?: boolean, rescueUnits?: number, postRescueValue?: number } | null | undefined} [data]
 * @param {{ standardTime?: string } | null | undefined} [opts]
 * @returns {HTMLDivElement}
 */
function buildGluRow(data, opts) {
  opts = opts || {};
  var standardTime = opts.standardTime ? String(opts.standardTime) : '';
  var isStandard = !!standardTime;
  var row = document.createElement('div');
  row.className = 'ea-glu-row' + (isStandard ? ' ea-glu-row--standard' : ' ea-glu-row--extra');
  if (isStandard) row.setAttribute('data-ea-glu-standard', standardTime);
  if (isStandard) {
    row.innerHTML =
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
      '</div>';
  } else {
    row.innerHTML =
      '<input type="time" class="ea-input ea-input--time ea-glu-time-input" data-ea-glu-time aria-label="Hora de glucometría">' +
      '<input type="number" class="ea-input ea-glu-value-input" data-ea-glu-value min="0" step="1" placeholder="mg/dL" inputmode="numeric" aria-label="Glucometría">' +
      '<button type="button" class="ea-btn ea-btn--ghost ea-btn--icon ea-glu-remove-btn" data-ea-glu-remove title="Quitar fila" aria-label="Quitar glucometría">×</button>' +
      '<div class="ea-glu-row-meta">' +
      gluRescueFieldsHtml() +
      '</div>';
  }
  var val = row.querySelector('[data-ea-glu-value]');
  var time = row.querySelector('[data-ea-glu-time]');
  var alteredEl = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-ea-glu-altered]'));
  var rescueEl = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-ea-glu-rescue-units]'));
  var postRescueEl = /** @type {HTMLInputElement | null} */ (
    row.querySelector('[data-ea-glu-post-rescue-value]')
  );
  if (data) {
    if (val && data.value != null && 'value' in val) val.value = String(data.value);
    if (!isStandard && time && data.time && 'value' in time) time.value = String(data.time);
    if (alteredEl && data.altered) alteredEl.checked = true;
    if (rescueEl && data.rescueUnits != null && data.rescueUnits !== '') {
      rescueEl.value = String(data.rescueUnits);
    }
    if (postRescueEl && data.postRescueValue != null && data.postRescueValue !== '') {
      postRescueEl.value = String(data.postRescueValue);
    }
  }
  var removeBtn = row.querySelector('[data-ea-glu-remove]');
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      row.remove();
    });
  }
  wireGluRowAltered(row);
  wireGluRowKeyboard(row);
  return row;
}

/**
 * @param {HTMLElement | null} gluList
 * @param {Array<{ value?: number, time?: string, altered?: boolean, rescueUnits?: number, postRescueValue?: number }>} [prefill]
 */
function fillStandardGluList(gluList, prefill) {
  if (!gluList) return;
  /** @type {Map<string, { value?: number, time?: string }>} */
  var byTime = new Map();
  (prefill || []).forEach(function (g) {
    var t = g.time != null ? String(g.time) : '';
    if (t) byTime.set(t, g);
  });
  gluList.innerHTML = '';
  gluList.classList.add('ea-glu-list--slots');
  STANDARD_GLUCOMETRIA_TIMES.forEach(function (slotTime) {
    gluList.appendChild(buildGluRow(byTime.get(slotTime), { standardTime: slotTime }));
  });
}

/**
 * @param {{ value?: number, units?: number, time?: string } | null | undefined} [data]
 * @returns {HTMLDivElement}
 */
/**
 * Muestra glucometrías normales o bloque bomba (mutuamente excluyentes).
 * @param {HTMLFormElement | null | undefined} form
 */
function syncEaGluMode(form) {
  if (!form) return;
  var toggle = form.querySelector('#ea-bomba-enabled');
  var normalBlock = form.querySelector('#ea-glu-normal-block');
  var bombaBlock = form.querySelector('#ea-bomba-block');
  if (!toggle || !normalBlock || !bombaBlock) return;
  var bombaOn = /** @type {HTMLInputElement} */ (toggle).checked;
  normalBlock.hidden = bombaOn;
  bombaBlock.hidden = !bombaOn;
  normalBlock.classList.toggle('ea-glu-pane--off', bombaOn);
  bombaBlock.classList.toggle('ea-glu-pane--off', !bombaOn);
  if (bombaOn) {
    var bombaList = form.querySelector('#ea-bomba-list');
    if (bombaList && !bombaList.querySelector('.ea-bomba-row')) {
      bombaList.appendChild(buildBombaRow());
    }
  } else {
    var gluList = form.querySelector('#ea-glu-list');
    if (gluList && !gluList.querySelector('.ea-glu-row')) {
      fillStandardGluList(gluList);
    }
  }
}

function buildBombaRow(data) {
  var row = document.createElement('div');
  row.className = 'ea-bomba-row';
  row.innerHTML =
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Glu</span>' +
    '<input type="number" class="ea-input" data-ea-bomba-value min="0" step="1" placeholder="mg/dL">' +
    '</label>' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Unidades</span>' +
    '<input type="number" class="ea-input" data-ea-bomba-units min="0" step="0.1" placeholder="U">' +
    '</label>' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Hora</span>' +
    '<input type="time" class="ea-input ea-input--time" data-ea-bomba-time>' +
    '</label>' +
    '<button type="button" class="ea-btn ea-btn--ghost ea-btn--icon" data-ea-bomba-remove title="Quitar" aria-label="Quitar registro bomba">×</button>';
  if (data) {
    var val = row.querySelector('[data-ea-bomba-value]');
    var units = row.querySelector('[data-ea-bomba-units]');
    var time = row.querySelector('[data-ea-bomba-time]');
    if (val && data.value != null && 'value' in val) val.value = String(data.value);
    if (units && data.units != null && 'value' in units) units.value = String(data.units);
    if (time && data.time && 'value' in time) time.value = String(data.time);
  }
  var removeBtn = row.querySelector('[data-ea-bomba-remove]');
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      var list = row.parentElement;
      if (!list) return;
      if (list.querySelectorAll('.ea-bomba-row').length <= 1) {
        var valEl = row.querySelector('[data-ea-bomba-value]');
        var unitsEl = row.querySelector('[data-ea-bomba-units]');
        var timeEl = row.querySelector('[data-ea-bomba-time]');
        if (valEl) valEl.value = '';
        if (unitsEl) unitsEl.value = '';
        if (timeEl) timeEl.value = '';
        return;
      }
      row.remove();
    });
  }
  return row;
}

/**
 * @param {unknown[]} historial
 * @param {string} vitalKey
 * @returns {Array<{ value: number, time?: string }>}
 */
function mergeVitalSeriesFromHistorial(historial, vitalKey) {
  var hist = Array.isArray(historial) ? historial : [];
  /** @type {Array<{ value: number, time?: string }>} */
  var out = [];
  for (var i = 0; i < hist.length; i++) {
    var list = vitalSeriesFromMedicion(hist[i])[vitalKey] || [];
    for (var j = 0; j < list.length; j++) {
      var rd = list[j];
      var dup = out.some(function (x) {
        return x.value === rd.value && (x.time || '') === (rd.time || '');
      });
      if (!dup) out.push(rd);
    }
  }
  return out.slice(-MAX_VITAL_READINGS_PER_DAY);
}

/**
 * @param {ReturnType<typeof import('./estado-actual-parser.mjs').parseEstadoActualPaste>} parsed
 */
export function applyEstadoActualParsedToForm(parsed) {
  var form = document.getElementById('ea-form');
  if (!form || !parsed || !parsed.ok) return;

  VITAL_KEYS.forEach(function (key) {
    /** @type {Array<{ value: number, time?: string }>} */
    var readings = [];
    if (parsed.vitals[key] != null && parsed.vitals[key] !== '') {
      readings.push({
        value: Number(parsed.vitals[key]),
        time: parsed.alteredAt[key] ? String(parsed.alteredAt[key]) : undefined,
      });
    }
    var extraKey = getVitalExtraStorageKey(key);
    if (parsed.vitals[extraKey] != null && parsed.vitals[extraKey] !== '') {
      readings.push({
        value: Number(parsed.vitals[extraKey]),
        time: parsed.alteredAt[extraKey] ? String(parsed.alteredAt[extraKey]) : undefined,
      });
    }
    setVitalStackFromSeries(form, key, readings.slice(0, MAX_VITAL_LAYERS_IN_FORM));
  });

  var gluList = form.querySelector('#ea-glu-list');
  if (gluList && parsed.glucometrias.length) {
    var standardSet = new Set(STANDARD_GLUCOMETRIA_TIMES);
    var standardGlus = [];
    var extraGlus = [];
    parsed.glucometrias.forEach(function (g) {
      var t = g.time != null ? String(g.time) : '';
      if (t && standardSet.has(t)) standardGlus.push(g);
      else extraGlus.push(g);
    });
    fillStandardGluList(gluList, standardGlus);
    extraGlus.forEach(function (g) {
      gluList.appendChild(buildGluRow(g));
    });
  }

  var ingEl = document.getElementById('ea-io-ing');
  var egrEl = document.getElementById('ea-io-egr');
  if (ingEl && parsed.io.ing != null && 'value' in ingEl) ingEl.value = String(parsed.io.ing);
  if (egrEl) {
    if (parsed.io.egrParts && parsed.io.egrParts.length && 'value' in egrEl) {
      egrEl.value = serializeEgrPartsToFormText(parsed.io.egrParts);
    } else if (parsed.io.egr != null && 'value' in egrEl) {
      egrEl.value = typeof parsed.io.egr === 'number' ? String(parsed.io.egr) : String(parsed.io.egr);
    }
  }

  var evacEl = document.getElementById('ea-io-evac');
  if (evacEl && parsed.io.evac != null && 'value' in evacEl) {
    evacEl.value = typeof parsed.io.evac === 'number' ? String(parsed.io.evac) : String(parsed.io.evac);
  }

  syncIoBalanceFromForm(form);

  if (parsed.soporteHint) {
    var patient = findActivePatient();
    if (patient) {
      ensureMonitoreo(patient);
      if (!patient.monitoreo.estadoClinico) patient.monitoreo.estadoClinico = {};
      patient.monitoreo.estadoClinico.soporte = parsed.soporteHint;
      var soporteSel = document.querySelector('[data-ea-ec="soporte"]');
      if (soporteSel && 'value' in soporteSel) soporteSel.value = parsed.soporteHint;
      persistEstadoClinicoLight(patient.monitoreo, patient);
    }
  }
}

/**
 * @param {HTMLElement | null} form
 */
function syncIoBalanceFromForm(form) {
  if (!form) return;
  var ingEl = form.querySelector('#ea-io-ing');
  var egrEl = form.querySelector('#ea-io-egr');
  var out = form.querySelector('#ea-balance-turno-live');
  if (!ingEl || !egrEl || !out) return;
  var ing = parseNumOrNull(ingEl.value);
  var egrParts = parseIoEgresoLine(egrEl.value);
  var bal = computeIoBalanceFromIngEgr(ing, { egrParts: egrParts, egr: diuresisValueFromParts(egrParts) });
  out.textContent = formatBalanceLive(bal);
}

/**
 * @param {ReturnType<typeof deriveSnapshot>} snapshot
 * @param {number} balTurno
 * @param {number} balGlobal
 */
/**
 * @param {{ ing?: unknown, egr?: unknown, egrParts?: Array<{ label?: string, value?: unknown }>, evac?: unknown }} io
 * @returns {string}
 */
function formatSnapshotEgresos(io) {
  io = io || {};
  if (Array.isArray(io.egrParts) && io.egrParts.length) {
    return escHtml(io.egrParts.map(formatEgresoPartForText).join(' · '));
  }
  var egr = io.egr;
  if (egr == null || egr === '') return '—';
  if (isIoNumericValue(egr)) return escHtml(String(egr) + ' CC (DIURESIS)');
  return escHtml(toEaSalidaText(egr));
}

function renderSnapshotSection(snapshot, balTurno, balGlobal) {
  var vitalsHtml = VITAL_KEYS.map(function (key) {
    var val = snapshot.vitals[key];
    var altered = snapshot.alteredAt && snapshot.alteredAt[key];
    var cls = 'ea-snapshot-item' + (altered ? ' ea-snapshot-item--altered' : '');
    var meta = altered ? '<span class="ea-snapshot-altered-at">' + altered + '</span>' : '';
    var fakeMed = {
      vitals: snapshot.vitals,
      alteredAt: snapshot.alteredAt,
      vitalSeries: snapshot.vitalSeries,
    };
    var series = vitalSeriesFromMedicion(fakeMed)[key] || [];
    var display =
      series.length > 0
        ? series
            .map(function (rd) {
              var bit = displayValue(rd.value);
              if (rd.time) bit += ' @ ' + escHtml(rd.time);
              return bit;
            })
            .join(' · ')
        : displayValue(val);
    return (
      '<div class="' +
      cls +
      '">' +
      '<span class="ea-snapshot-label">' +
      VITAL_LABELS[key] +
      '</span>' +
      '<span class="ea-snapshot-value">' +
      display +
      '</span>' +
      '<span class="ea-snapshot-unit">' +
      (VITAL_UNITS[key] || '') +
      '</span>' +
      meta +
      '</div>'
    );
  }).join('');

  var gluHtml = '<span class="ea-muted">—</span>';
  if (snapshot.bombaInsulina && snapshot.bombaInsulina.length) {
    gluHtml = snapshot.bombaInsulina
      .map(function (b) {
        var t = b.time ? ' <span class="ea-snapshot-glu-time">' + b.time + '</span>' : '';
        var u =
          b.units != null && b.units !== '' && Number(b.units) !== 0
            ? ' <span class="ea-snapshot-glu-units">(' + displayValue(b.units) + ' U)</span>'
            : '';
        return (
          '<span class="ea-snapshot-glu-chip ea-snapshot-glu-chip--bomba">' +
          displayValue(b.value) +
          ' MG/DL' +
          u +
          t +
          '</span>'
        );
      })
      .join('');
  } else if (snapshot.glucometrias && snapshot.glucometrias.length) {
    gluHtml = snapshot.glucometrias
      .map(function (g) {
        var t = g.time ? ' <span class="ea-snapshot-glu-time">' + g.time + '</span>' : '';
        var rescue =
          g.rescueUnits != null && g.rescueUnits !== '' && Number(g.rescueUnits) !== 0
            ? ' <span class="ea-snapshot-glu-rescue">(' + displayValue(g.rescueUnits) + ' U rescate)</span>'
            : '';
        var postRescue =
          g.postRescueValue != null && g.postRescueValue !== ''
            ? ' <span class="ea-snapshot-glu-post">→ ' + displayValue(g.postRescueValue) + ' MG/DL</span>'
            : '';
        var alteredCls = isGlucometriaMarkedAltered(g) ? ' ea-snapshot-glu-chip--altered' : '';
        return (
          '<span class="ea-snapshot-glu-chip' +
          alteredCls +
          '">' +
          displayValue(g.value) +
          ' MG/DL' +
          rescue +
          postRescue +
          t +
          '</span>'
        );
      })
      .join('');
  }

  return (
    '<section class="ea-section ea-card ea-snapshot-strip ea-snapshot-strip--primary" id="ea-snapshot">' +
    '<div class="ea-snapshot-strip-body">' +
    '<div class="ea-snapshot-zone">' +
    '<h4 class="ea-snapshot-zone-title">Signos vitales</h4>' +
    '<div class="ea-snapshot-vitals">' +
    vitalsHtml +
    '</div>' +
    '</div>' +
    '<div class="ea-snapshot-zone">' +
    '<h4 class="ea-snapshot-zone-title">Glucometrías</h4>' +
    '<div class="ea-snapshot-glu">' +
    gluHtml +
    '</div>' +
    '</div>' +
    '<div class="ea-snapshot-zone">' +
    '<h4 class="ea-snapshot-zone-title">Balance hídrico</h4>' +
    '<div class="ea-snapshot-io">' +
    '<div><span class="ea-snapshot-label">Ingresos</span><span class="ea-snapshot-io-val">' +
    displayValue(snapshot.io.ing) +
    ' CC</span></div>' +
    '<div class="ea-snapshot-io-egr">' +
    '<span class="ea-snapshot-label">Egresos</span>' +
    '<span class="ea-snapshot-io-val">' +
    formatSnapshotEgresos(snapshot.io) +
    '</span></div>' +
    (snapshot.io.evac != null && snapshot.io.evac !== ''
      ? '<div><span class="ea-snapshot-label">Evacuaciones</span><span class="ea-snapshot-io-val">' +
        escHtml(formatEvacForText(snapshot.io.evac)) +
        '</span></div>'
      : '') +
    '<div><span class="ea-snapshot-label">Turno</span><span class="ea-snapshot-io-val">' +
    displayBalance(balTurno) +
    '</span></div>' +
    '<div><span class="ea-snapshot-label">Global</span><span class="ea-snapshot-io-val">' +
    displayBalance(balGlobal) +
    '</span></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</section>'
  );
}

/**
 * @param {Array<{ id?: string, recordedAt?: string, vitals?: Record<string, unknown>, glucometrias?: Array<{ value?: unknown, time?: string }>, io?: { ing?: unknown, egr?: unknown } }>} historial
 */
function renderHistorialSection(historial) {
  var sorted = historial.slice().sort(function (a, b) {
    return String(b.recordedAt || '').localeCompare(String(a.recordedAt || ''));
  });
  var recent = sorted.slice(0, 8);
  if (!recent.length) {
    return (
      '<details class="ea-section ea-card ea-historial" id="ea-historial">' +
      '<summary class="ea-historial-summary">Historial reciente</summary>' +
      '<p class="ea-muted ea-historial-empty">Sin mediciones registradas.</p>' +
      '</details>'
    );
  }

  var rows = recent
    .map(function (row) {
      var d = new Date(row.recordedAt || '');
      var when = isNaN(d.getTime())
        ? '—'
        : pad2(d.getDate()) +
          '/' +
          pad2(d.getMonth() + 1) +
          ' ' +
          pad2(d.getHours()) +
          ':' +
          pad2(d.getMinutes());
      var parts = [];
      var rowSeries = vitalSeriesFromMedicion(row);
      VITAL_KEYS.forEach(function (vk) {
        var list = rowSeries[vk] || [];
        for (var rsi = 0; rsi < list.length; rsi++) {
          var rd = list[rsi];
          var part = (VITAL_LABELS[vk] || vk) + ' ' + rd.value;
          if (rd.time) part += ' @ ' + rd.time;
          parts.push(part);
        }
      });
      var bombas = Array.isArray(row.bombaInsulina) ? row.bombaInsulina : [];
      if (bombas.length) {
        bombas.forEach(function (b) {
          if (!b || typeof b !== 'object') return;
          if (b.value == null || b.value === '') return;
          var bp = 'Bomba Glu ' + b.value;
          if (b.units != null && b.units !== '') bp += ' (' + b.units + ' U)';
          if (b.time) bp += ' @ ' + b.time;
          parts.push(bp);
        });
      } else {
        var glus = Array.isArray(row.glucometrias) ? row.glucometrias : [];
        glus.forEach(function (g) {
          if (g && g.value != null && g.value !== '') {
            var gp = 'Glu ' + g.value;
            if (g.altered) gp += ' alterada';
            if (g.rescueUnits != null && g.rescueUnits !== '' && Number(g.rescueUnits) !== 0) {
              gp += ' (' + g.rescueUnits + ' U rescate)';
            }
            if (g.postRescueValue != null && g.postRescueValue !== '') {
              gp += ' → DXT ' + g.postRescueValue;
            }
            parts.push(gp + (g.time ? ' @ ' + g.time : ''));
          }
        });
      }
      var io = row.io || {};
      if (io.ing != null && io.ing !== '') parts.push('Ing ' + io.ing);
      if (Array.isArray(io.egrParts) && io.egrParts.length) {
        parts.push(
          io.egrParts
            .map(function (p) {
              return formatEgresoPartForText(p);
            })
            .join(', ')
        );
      } else if (io.egr != null && io.egr !== '') {
        parts.push('Egr ' + io.egr);
      }
      if (io.evac != null && io.evac !== '') parts.push('Evac ' + formatEvacForText(io.evac));
      var summary = parts.length ? parts.join(' · ') : 'Registro vacío';
      return (
        '<li class="ea-historial-row">' +
        '<div class="ea-historial-main">' +
        '<span class="ea-historial-when">' +
        when +
        '</span>' +
        '<span class="ea-historial-summary">' +
        summary +
        '</span>' +
        '</div>' +
        '<button type="button" class="ea-btn ea-btn--ghost ea-btn--danger" onclick="eliminarEstadoActualMedicion(\'' +
        String(row.id || '').replace(/'/g, "\\'") +
        '\')">Eliminar</button>' +
        '</li>'
      );
    })
    .join('');

  return (
    '<details class="ea-section ea-card ea-historial" id="ea-historial">' +
    '<summary class="ea-historial-summary">Historial reciente' +
    '<span class="ea-historial-count">' +
    recent.length +
    '</span></summary>' +
    '<ul class="ea-historial-list">' +
    rows +
    '</ul>' +
    '</details>'
  );
}

/**
 * @param {string} key
 * @param {string} [labelOverride]
 * @param {{ tempPlus?: boolean } | undefined} [opts]
 * @returns {string}
 */
function vitalLayerBoxKey(baseKey, layerIdx) {
  return baseKey + '__L' + layerIdx;
}

function buildVitalChipHtml(baseKey, labelOverride, opts) {
  opts = opts || {};
  var label = labelOverride || VITAL_LABELS[baseKey] || baseKey;
  var layerIdx = opts.layerIdx != null ? opts.layerIdx : 0;
  var boxKey = vitalLayerBoxKey(baseKey, layerIdx);
  var unit = VITAL_UNITS[baseKey] || '';
  var labelHtml =
    '<div class="vital-label">' +
    '<span class="ea-vital-name">' +
    label +
    '</span>' +
    '<span class="ea-vital-unit">' +
    unit +
    '</span></div>';
  return (
    '<div class="vital-box ea-vital-box ea-vital-chip" data-ea-vital-box="' +
    boxKey +
    '">' +
    labelHtml +
    '<div class="ea-vital-value-wrap">' +
    '<input type="number" class="ea-vital-input" data-ea-vital="' +
    baseKey +
    '" data-ea-layer-idx="' +
    layerIdx +
    '" step="any" inputmode="decimal" placeholder="—" aria-label="' +
    label +
    '">' +
    '</div>' +
    '<div class="ea-altered-slot ea-altered-slot--hidden" data-ea-altered-wrap="' +
    boxKey +
    '" hidden>' +
    '<span class="ea-altered-label">Alterado</span>' +
    '<input type="time" class="ea-altered-time-input" data-ea-altered="' +
    boxKey +
    '" aria-label="Hora ' +
    label +
    ' alterado">' +
    '</div></div>'
  );
}

/**
 * @param {string} vitalKey
 * @returns {string}
 */
function buildVitalStackHtml(vitalKey) {
  var label = VITAL_LABELS[vitalKey] || vitalKey;
  var slots = '';
  for (var li = 0; li < MAX_VITAL_LAYERS_IN_FORM; li++) {
    slots +=
      '<div class="ea-vital-slot" data-ea-layer="' +
      li +
      '"' +
      (li > 0 ? ' hidden' : '') +
      '>' +
      buildVitalChipHtml(vitalKey, label, { layerIdx: li }) +
      '</div>';
  }
  return (
    '<div class="ea-vital-stack" data-ea-vital-stack="' +
    vitalKey +
    '" data-ea-layer-count="1">' +
    slots +
    '<button type="button" class="ea-vital-add-btn ea-temp-add-btn" data-ea-vital-add="' +
    vitalKey +
    '" hidden title="Otra lectura de ' +
    label +
    ' (máx. ' +
    MAX_VITAL_READINGS_PER_DAY +
    '/día)">+1</button>' +
    '<div class="ea-vital-prev-badge" data-ea-vital-prev-view hidden>' +
    '<span class="ea-vital-prev-summary" data-ea-vital-prev-summary></span>' +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {HTMLElement} stack
 * @returns {number}
 */
function getVitalStackLayerCount(stack) {
  return Math.min(
    MAX_VITAL_LAYERS_IN_FORM,
    Math.max(1, Number(stack.getAttribute('data-ea-layer-count') || '1'))
  );
}

/**
 * @param {HTMLElement} stack
 * @param {number} count
 */
function setVitalStackLayerCount(stack, count) {
  stack.setAttribute('data-ea-layer-count', String(count));
  stack.classList.toggle('ea-vital-stack--multi', count > 1);
  stack.classList.toggle('ea-vital-stack--dual', count > 1);
}

/**
 * @param {HTMLElement | null} form
 * @param {string} vitalKey
 */
function updateVitalStackLayerVisibility(form, vitalKey) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return;
  var count = getVitalStackLayerCount(stack);
  var active = count - 1;
  for (var li = 0; li < MAX_VITAL_LAYERS_IN_FORM; li++) {
    var slot = stack.querySelector('[data-ea-layer="' + li + '"]');
    if (!slot) continue;
    var on = li === active;
    slot.hidden = !on;
    slot.style.visibility = '';
    slot.style.pointerEvents = '';
    slot.style.zIndex = '';
  }
  var prevBadge = stack.querySelector('[data-ea-vital-prev-view]');
  if (prevBadge) prevBadge.hidden = count <= 1;
}

/**
 * @param {HTMLElement | null} form
 * @param {string} vitalKey
 */
function syncVitalPrevSummary(form, vitalKey) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return;
  var summary = stack.querySelector('[data-ea-vital-prev-summary]');
  if (!summary) return;
  var count = getVitalStackLayerCount(stack);
  var unit = VITAL_UNITS[vitalKey] || '';
  /** @type {string[]} */
  var parts = [];
  for (var li = 0; li < count - 1; li++) {
    var input = stack.querySelector(
      '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + li + '"]'
    );
    var boxKey = vitalLayerBoxKey(vitalKey, li);
    var timeEl = stack.querySelector('[data-ea-altered="' + boxKey + '"]');
    var val = input && 'value' in input ? String(input.value).trim() : '';
    if (!val) continue;
    var time = timeEl && 'value' in timeEl && timeEl.value ? String(timeEl.value) : '';
    parts.push(val + (unit ? ' ' + unit : '') + (time ? ' @ ' + time : ''));
  }
  summary.textContent = parts.length ? parts.join(' · ') : '—';
}

/**
 * @param {HTMLElement | null} form
 * @param {string} vitalKey
 */
function syncVitalAddButtonVisibility(form, vitalKey) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return;
  var addBtn = stack.querySelector('[data-ea-vital-add="' + vitalKey + '"]');
  if (!addBtn) return;
  var count = getVitalStackLayerCount(stack);
  var active = count - 1;
  var activeInput = stack.querySelector(
    '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + active + '"]'
  );
  var hasVal =
    activeInput && 'value' in activeInput && String(activeInput.value).trim() !== '';
  var atFormMax = count >= MAX_VITAL_LAYERS_IN_FORM;
  addBtn.hidden = !hasVal || atFormMax;
  if (atFormMax) {
    addBtn.title = 'Máximo ' + MAX_VITAL_LAYERS_IN_FORM + ' lecturas en este registro';
  }
}

/**
 * @param {HTMLElement | null} form
 */
function syncAllVitalAddButtonVisibility(form) {
  VITAL_KEYS.forEach(function (key) {
    syncVitalAddButtonVisibility(form, key);
  });
}

/**
 * @param {HTMLElement | null} form
 * @param {string} vitalKey
 * @param {unknown} [historial]
 */
function expandVitalNextLayer(form, vitalKey, historial) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return;
  var count = getVitalStackLayerCount(stack);
  if (count >= MAX_VITAL_LAYERS_IN_FORM) {
    rt.showToast('Máximo ' + MAX_VITAL_LAYERS_IN_FORM + ' lecturas por signo en este registro', 'error');
    return;
  }
  var hist = historial || [];
  var inWindow = countVitalReadingsInRegistroWindow(hist, vitalKey);
  if (inWindow + count >= MAX_VITAL_READINGS_PER_DAY) {
    rt.showToast(
      'Máximo ' + MAX_VITAL_READINGS_PER_DAY + ' lecturas de ' + (VITAL_LABELS[vitalKey] || vitalKey) + ' en el turno',
      'error'
    );
    return;
  }
  var active = count - 1;
  var activeInput = stack.querySelector(
    '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + active + '"]'
  );
  if (!activeInput || !('value' in activeInput) || !String(activeInput.value).trim()) {
    rt.showToast('Captura el valor actual antes de agregar otra lectura', 'error');
    return;
  }
  setVitalStackLayerCount(stack, count + 1);
  updateVitalStackLayerVisibility(form, vitalKey);
  syncVitalPrevSummary(form, vitalKey);
  syncVitalAddButtonVisibility(form, vitalKey);
  var nextInput = stack.querySelector(
    '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + count + '"]'
  );
  if (nextInput && 'focus' in nextInput) nextInput.focus();
}

/**
 * @param {HTMLElement | null} form
 * @param {string} vitalKey
 * @param {number} [layerCount]
 */
function setVitalStackFromSeries(form, vitalKey, readings, layerCount) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return;
  var list = Array.isArray(readings) ? readings.slice(0, MAX_VITAL_LAYERS_IN_FORM) : [];
  var count = layerCount != null ? layerCount : Math.max(1, list.length);
  count = Math.min(MAX_VITAL_LAYERS_IN_FORM, count);
  setVitalStackLayerCount(stack, count);
  for (var li = 0; li < MAX_VITAL_LAYERS_IN_FORM; li++) {
    var input = stack.querySelector(
      '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + li + '"]'
    );
    var boxKey = vitalLayerBoxKey(vitalKey, li);
    var timeEl = stack.querySelector('[data-ea-altered="' + boxKey + '"]');
    var rd = list[li];
    if (input && 'value' in input) input.value = rd && rd.value != null ? String(rd.value) : '';
    if (timeEl && 'value' in timeEl) timeEl.value = rd && rd.time ? String(rd.time) : '';
  }
  updateVitalStackLayerVisibility(form, vitalKey);
  syncVitalPrevSummary(form, vitalKey);
  syncVitalAddButtonVisibility(form, vitalKey);
}

/**
 * @param {HTMLElement | null} form
 * @param {string} vitalKey
 */
function collapseVitalStack(form, vitalKey) {
  setVitalStackFromSeries(form, vitalKey, [], 1);
}

/**
 * @param {HTMLElement | null} form
 */
function collapseAllVitalStacks(form) {
  VITAL_KEYS.forEach(function (key) {
    collapseVitalStack(form, key);
  });
}

/**
 * @param {HTMLElement | null} form
 * @param {string} vitalKey
 * @returns {Array<{ value: number, time?: string }>}
 */
function readVitalSeriesFromStack(form, vitalKey) {
  /** @type {Array<{ value: number, time?: string }>} */
  var out = [];
  if (!form) return out;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return out;
  var count = getVitalStackLayerCount(stack);
  for (var li = 0; li < count; li++) {
    var input = stack.querySelector(
      '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + li + '"]'
    );
    var boxKey = vitalLayerBoxKey(vitalKey, li);
    var timeEl = stack.querySelector('[data-ea-altered="' + boxKey + '"]');
    if (!input || !('value' in input)) continue;
    var raw = String(input.value).trim();
    if (!raw) continue;
    var n = Number(raw);
    if (!Number.isFinite(n)) continue;
    var time =
      timeEl && 'value' in timeEl && timeEl.value ? String(timeEl.value) : undefined;
    out.push({ value: n, time: time });
  }
  return out;
}

/**
 * @param {HTMLElement} form
 * @param {ReturnType<typeof emptyMonitoreo>} monitoreo
 */
function prefillRegistroFormFromMonitoreo(form, monitoreo) {
  var hist = Array.isArray(monitoreo.historial) ? monitoreo.historial : [];
  var snap = deriveSnapshot(monitoreo);

  VITAL_KEYS.forEach(function (key) {
    var readings = mergeVitalSeriesFromHistorial(hist, key);
    if (readings.length) {
      setVitalStackFromSeries(form, key, readings);
    } else {
      collapseVitalStack(form, key);
    }
  });

  var io = snap.io || {};
  var ingEl = form.querySelector('#ea-io-ing');
  var egrEl = form.querySelector('#ea-io-egr');
  var evacEl = form.querySelector('#ea-io-evac');
  if (ingEl && io.ing != null && io.ing !== '' && 'value' in ingEl) ingEl.value = String(io.ing);
  if (egrEl) {
    if (io.egrParts && io.egrParts.length && 'value' in egrEl) {
      egrEl.value = serializeEgrPartsToFormText(io.egrParts);
    } else if (io.egr != null && io.egr !== '' && 'value' in egrEl) {
      egrEl.value = typeof io.egr === 'number' ? String(io.egr) : String(io.egr);
    }
  }
  if (evacEl && io.evac != null && io.evac !== '' && 'value' in evacEl) {
    evacEl.value = typeof io.evac === 'number' ? String(io.evac) : String(io.evac);
  }

  var bombaToggle = form.querySelector('#ea-bomba-enabled');
  var bombaList = form.querySelector('#ea-bomba-list');
  var bombas = collectBombaInsulinaForRegistroWindow(hist);
  if (bombaToggle && 'checked' in bombaToggle) {
    bombaToggle.checked = bombas.length > 0;
  }
  if (bombaList) {
    bombaList.innerHTML = '';
    if (bombas.length) {
      bombas.forEach(function (b) {
        bombaList.appendChild(buildBombaRow(b));
      });
    } else {
      bombaList.appendChild(buildBombaRow());
    }
  }

  var gluList = form.querySelector('#ea-glu-list');
  if (gluList) {
    if (!bombaToggle || !bombaToggle.checked) {
      var glus = collectGlucometriasForRegistroWindow(
        Array.isArray(monitoreo.historial) ? monitoreo.historial : []
      );
      fillStandardGluList(gluList, glus);
      var standardSet = new Set(STANDARD_GLUCOMETRIA_TIMES);
      glus.forEach(function (g) {
        var t = g.time != null ? String(g.time) : '';
        if (t && !standardSet.has(t)) gluList.appendChild(buildGluRow(g));
      });
    } else {
      gluList.innerHTML = '';
      fillStandardGluList(gluList);
    }
  }

  syncEaGluMode(form);
  syncAllVitalAddButtonVisibility(form);
}

export function buildRegistroFormMarkup() {
  var vitalFields = VITAL_KEYS.map(function (key) {
    return buildVitalStackHtml(key);
  }).join('');

  return (
    '<div class="ea-registro-shell">' +
    '<div class="ea-registro-form-scroll">' +
    '<form id="ea-form" class="ea-form ea-form--registro" onsubmit="return false;">' +
    '<p class="ea-registro-hint ea-muted">Cierre <strong>00:00</strong>. Ningún campo es obligatorio; basta un dato para registrar. Glu estándar: 08:00 y 16:00 ayer, 00:00 hoy. <span class="ea-registro-kbd-hint">⌘↵ registrar</span></p>' +
    '<label class="ea-field ea-field--datetime">' +
    '<span class="ea-label">Fecha y hora del registro</span>' +
    '<input type="datetime-local" class="ea-input rpc-datetime-input" id="ea-recorded-at" value="' +
    toDatetimeLocalValue(getDefaultRegistroRecordedAt()) +
    '">' +
    '</label>' +
    '<div class="vitals-grid ea-vitals-grid">' +
    vitalFields +
    '</div>' +
    '<div class="ea-glu-section">' +
    '<div class="ea-glu-mode-row lab-pref-row">' +
    '<span class="lab-pref-row-label" id="ea-glu-section-lbl">Glucometrías</span>' +
    '<div class="ea-glu-mode-switch">' +
    '<span class="ea-glu-mode-switch-label" id="ea-bomba-enabled-lbl">Bomba de insulina</span>' +
    '<label class="rpc-switch">' +
    '<input type="checkbox" id="ea-bomba-enabled" class="rpc-switch-input" role="switch" aria-labelledby="ea-bomba-enabled-lbl">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span>' +
    '</label>' +
    '</div>' +
    '</div>' +
    '<div id="ea-glu-normal-block" class="ea-glu-pane ea-glu-block">' +
    '<div class="ea-glu-head">' +
    '<button type="button" class="ea-btn ea-btn--ghost" id="ea-add-glu">+ Agregar</button>' +
    '</div>' +
    '<div id="ea-glu-list" class="ea-glu-list"></div>' +
    '</div>' +
    '<div id="ea-bomba-block" class="ea-glu-pane ea-glu-block ea-bomba-block ea-glu-pane--off" hidden>' +
    '<div class="ea-glu-head">' +
    '<button type="button" class="ea-btn ea-btn--ghost" id="ea-add-bomba">+ Agregar</button>' +
    '</div>' +
    '<div id="ea-bomba-list" class="ea-glu-list"></div>' +
    '</div>' +
    '</div>' +
    '<div class="ea-io-grid">' +
    '<label class="ea-field">' +
    '<span class="ea-label">Ingresos (cc)</span>' +
    '<input type="number" class="ea-input" id="ea-io-ing" min="0" step="1">' +
    '</label>' +
    '<label class="ea-field ea-field--full">' +
    '<span class="ea-label">Egresos (diuresis, drenajes, nefrostomías…)</span>' +
    '<input type="text" class="ea-input" id="ea-io-egr" inputmode="text" autocomplete="off" placeholder="DIURESIS NC, DRENAJE 50 CC, NEFRO IZQ 20 CC">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Evacuaciones</span>' +
    '<input type="text" class="ea-input" id="ea-io-evac" inputmode="text" autocomplete="off" placeholder="NC, cc o texto">' +
    '</label>' +
    '<div class="ea-field ea-io-balance">' +
    '<span class="ea-label">Balance turno</span>' +
    '<span id="ea-balance-turno-live" class="ea-balance-live">—</span>' +
    '</div>' +
    '</div>' +
    '</form>' +
    '</div>' +
    '<footer class="ea-registro-modal-foot">' +
    '<button type="button" class="ea-btn ea-btn--ghost ea-registro-paste-btn" onclick="openEstadoActualPasteModal({ skipRegistro: true })">Pegar monitoreo</button>' +
    '<div class="ea-registro-modal-actions">' +
    '<button type="button" class="ea-btn ea-btn--ghost" onclick="closeEstadoActualRegistroModal()">Cancelar</button>' +
    '<button type="button" class="ea-btn ea-btn--primary" onclick="registrarEstadoActualMedicion()">Registrar</button>' +
    '</div>' +
    '</footer>' +
    '</div>'
  );
}

/**
 * Conecta listeners del formulario de registro (modal).
 */
export function wireEaRegistroForm() {
  var form = document.getElementById('ea-form');
  wireFormInteractions(form);
  var gluList = document.getElementById('ea-glu-list');
  if (gluList && !gluList.querySelector('.ea-glu-row')) {
    fillStandardGluList(gluList);
  }
  var bombaList = document.getElementById('ea-bomba-list');
  if (bombaList && !bombaList.querySelector('.ea-bomba-row')) {
    bombaList.appendChild(buildBombaRow());
  }
  syncEaGluMode(form);
}

/** Sincroniza visibilidad glu normal vs bomba (p. ej. al reabrir modal con formulario conservado). */
export function syncEaRegistroGluMode() {
  syncEaGluMode(document.getElementById('ea-form'));
}

/**
 * Limpia el formulario de registro (cierre 00:00, glu estándar vacías).
 * @param {{ monitoreo?: ReturnType<typeof emptyMonitoreo> } | null | undefined} [_patient]
 * @param {{ prefill?: boolean } | null | undefined} [opts]
 */
export function resetEaRegistroForm(_patient, opts) {
  opts = opts || {};
  var form = document.getElementById('ea-form');
  if (!form) return;
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
  var recorded = document.getElementById('ea-recorded-at');
  if (recorded && 'value' in recorded) {
    recorded.value = toDatetimeLocalValue(getDefaultRegistroRecordedAt());
  }
  var ing = document.getElementById('ea-io-ing');
  var egr = document.getElementById('ea-io-egr');
  var evac = document.getElementById('ea-io-evac');
  if (ing && 'value' in ing) ing.value = '';
  if (egr && 'value' in egr) egr.value = '';
  if (evac && 'value' in evac) evac.value = '';
  var gluList = document.getElementById('ea-glu-list');
  if (gluList) fillStandardGluList(gluList);
  var bombaToggle = document.getElementById('ea-bomba-enabled');
  var bombaBlock = document.getElementById('ea-bomba-block');
  var bombaList = document.getElementById('ea-bomba-list');
  if (bombaToggle && 'checked' in bombaToggle) bombaToggle.checked = false;
  if (bombaList) {
    bombaList.innerHTML = '';
    bombaList.appendChild(buildBombaRow());
  }

  if (opts.prefill && _patient && _patient.monitoreo) {
    prefillRegistroFormFromMonitoreo(form, _patient.monitoreo);
  }

  syncEaGluMode(form);
  syncIoBalanceFromForm(form);
  syncAllVitalAddButtonVisibility(form);
}

function buildEaShellKey(activeId, monitoreo) {
  return String(activeId || '') + '|' + buildEaMonitoreoRevision(monitoreo, activeId, medRecetaByPatient);
}

function buildEaDataKey(monitoreo, activeId) {
  return buildEaMonitoreoRevision(monitoreo, activeId, medRecetaByPatient);
}

function patchEaPanelDynamicSections(mount, patient, monitoreo, patchOpts) {
  patchOpts = patchOpts || {};
  var snapshot = deriveSnapshot(monitoreo);
  var balTurno = balanceTurno(monitoreo);
  var balGlobal = balanceGlobalHistorico(monitoreo);
  var savedLabel = formatEaSavedLabel(monitoreo.textoGuardado && monitoreo.textoGuardado.savedAt);

  if (patchOpts.refreshClinico) {
    var clinicoDet = mount.querySelector('.ea-estado-clinico');
    if (clinicoDet) {
      clinicoDet.outerHTML = renderEstadoClinicoSection(monitoreo, rt.getActiveId(), patient);
      wireEstadoClinicoInteractions(mount, patient);
    }
  }

  var snapEl = mount.querySelector('#ea-snapshot');
  if (snapEl) {
    snapEl.outerHTML = renderSnapshotSection(snapshot, balTurno, balGlobal);
  }
  var histEl = mount.querySelector('#ea-historial');
  if (histEl) {
    var histWasOpen = histEl.open;
    histEl.outerHTML = renderHistorialSection(Array.isArray(monitoreo.historial) ? monitoreo.historial : []);
    if (histWasOpen) {
      var newHist = mount.querySelector('#ea-historial');
      if (newHist) newHist.open = true;
    }
  }
  var meta = mount.querySelector('#ea-meta-guardado');
  if (meta) meta.textContent = savedLabel;
  if (!patchOpts.skipChartsSummary) {
    var chartsSummary = mount.querySelector('#ea-charts-summary');
    if (chartsSummary) {
      var chartsRev = buildEaHistorialChartsRevision(monitoreo);
      if (mount._eaChartsSummaryRev !== chartsRev) {
        mount._eaChartsSummaryRev = chartsRev;
        chartsSummary.outerHTML = renderEaChartsSummarySection(monitoreo);
      }
    }
  }
}

export function renderEstadoActualPanel(opts) {
  opts = opts || {};
  var onReady = typeof opts.onReady === 'function' ? opts.onReady : null;
  var mount = document.getElementById('exp-pane-estado-actual');
  if (!mount) {
    if (onReady) onReady();
    return;
  }

  var patient = findActivePatient();
  if (!patient) {
    syncEaCopyFab(false);
    invalidateEaPanelCache();
    mount.innerHTML =
      '<div class="estado-actual-panel ea-empty">' +
      '<p class="ea-muted">Selecciona un paciente para registrar monitoreo.</p>' +
      '</div>';
    if (onReady) onReady();
    return;
  }

  migratePatientMonitoreo(patient);
  ensureMonitoreo(patient);
  var monitoreo = patient.monitoreo;
  var activeId = rt.getActiveId();
  syncRecetaProposalsFromSoapSelection(
    activeId,
    monitoreo,
    medRecetaByPatient,
    medNotaSelectionByPatient,
    classifyMedicationSoapCategory
  );
  var snapshot = deriveSnapshot(monitoreo);
  var balTurno = balanceTurno(monitoreo);
  var balGlobal = balanceGlobalHistorico(monitoreo);
  var savedLabel = formatEaSavedLabel(monitoreo.textoGuardado && monitoreo.textoGuardado.savedAt);
  var shellKey = buildEaShellKey(activeId, monitoreo);
  var dataKey = buildEaDataKey(monitoreo, activeId);

  if (
    mount.querySelector('.estado-actual-panel') &&
    _eaPanelCache.shellKey === shellKey &&
    (opts.dataOnly || _eaPanelCache.dataKey !== dataKey)
  ) {
    if (_eaPanelCache.dataKey === dataKey && !opts.dataOnly) {
      syncEaCopyFab(true);
      if (onReady) onReady();
      return;
    }
    patchEaPanelDynamicSections(mount, patient, monitoreo, {
      refreshClinico: !!opts.refreshClinico,
      skipChartsSummary: !!opts.skipChartsSummary,
    });
    _eaPanelCache.dataKey = dataKey;
    syncEaCopyFab(true);
    if (onReady) onReady();
    return;
  }

  if (
    mount.querySelector('.estado-actual-panel') &&
    _eaPanelCache.shellKey === shellKey &&
    _eaPanelCache.dataKey === dataKey &&
    !opts.force
  ) {
    syncEaCopyFab(true);
    if (onReady) onReady();
    return;
  }

  var eaUiState = captureEaPanelUiState(mount);

  mount.innerHTML =
    '<div class="estado-actual-panel">' +
    '<div class="ea-action-bar">' +
    '<div class="ea-action-bar__cluster" role="group" aria-label="Acciones de monitoreo">' +
    '<button type="button" class="ea-btn ea-btn--primary" onclick="openEstadoActualRegistroModal()">Registro manual</button>' +
    '<button type="button" class="ea-btn ea-btn--ghost" onclick="estadoActualGuardar()">Guardar</button>' +
    '</div>' +
    '<span id="ea-meta-guardado" class="ea-meta-guardado">' +
    savedLabel +
    '</span>' +
    '</div>' +
    renderSnapshotSection(snapshot, balTurno, balGlobal) +
    renderEstadoClinicoSection(monitoreo, activeId, patient) +
    renderHistorialSection(Array.isArray(monitoreo.historial) ? monitoreo.historial : []) +
    renderEaChartsSummarySection(monitoreo) +
    '</div>';

  restoreEaPanelUiState(mount, eaUiState);

  wireEstadoClinicoInteractions(mount, patient);

  _eaPanelCache.shellKey = shellKey;
  _eaPanelCache.dataKey = dataKey;
  syncEaCopyFab(true);
  if (onReady) onReady();
}

export function navigateToEstadoActualPanel() {
  if (typeof rt.switchInnerTab === 'function') {
    rt.switchInnerTab('estadoActual');
    return;
  }
  rt.switchConsolidatedTab('clinico');
}

function parseFormMedicion() {
  var form = document.getElementById('ea-form');
  if (!form) return null;

  var recordedLocal = /** @type {HTMLInputElement | null} */ (document.getElementById('ea-recorded-at'));
  var recordedAt = datetimeLocalToIso(recordedLocal ? recordedLocal.value : '');
  var defaultTime = isoToHHmm(recordedAt);

  /** @type {Record<string, Array<{ value: number, time?: string }>>} */
  var vitalSeries = {};
  VITAL_KEYS.forEach(function (key) {
    vitalSeries[key] = readVitalSeriesFromStack(form, key);
  });
  var legacy = vitalSeriesToLegacyFields(vitalSeries);
  var vitals = legacy.vitals;
  var alteredAt = legacy.alteredAt;
  VITAL_KEYS.forEach(function (key) {
    var list = vitalSeries[key] || [];
    for (var li = 0; li < list.length; li++) {
      var rd = list[li];
      if (rd.time) {
        if (li === list.length - 1) alteredAt[key] = rd.time;
        else if (li === list.length - 2 && key === 'temp') alteredAt.tempPeak = rd.time;
        else if (li === list.length - 2) alteredAt[getVitalExtraStorageKey(key)] = rd.time;
      } else if (li === list.length - 1 && isVitalAltered(key, rd.value)) {
        alteredAt[key] = defaultTime;
      }
    }
  });

  var bombaToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('ea-bomba-enabled'));
  var bombaOn = !!(bombaToggle && bombaToggle.checked);

  /** @type {Array<{ value: number, time: string, altered?: boolean, rescueUnits?: number, postRescueValue?: number }>} */
  var glucometrias = [];
  if (!bombaOn) {
    form.querySelectorAll('.ea-glu-row').forEach(function (row) {
      var valEl = row.querySelector('[data-ea-glu-value]');
      var timeEl = row.querySelector('[data-ea-glu-time]');
      var alteredEl = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-ea-glu-altered]'));
      var rescueEl = row.querySelector('[data-ea-glu-rescue-units]');
      var postRescueEl = row.querySelector('[data-ea-glu-post-rescue-value]');
      var value = parseNumOrNull(valEl && 'value' in valEl ? valEl.value : '');
      if (value == null) return;
      var slotTime = row.getAttribute('data-ea-glu-standard');
      var time =
        slotTime ||
        (timeEl && 'value' in timeEl && timeEl.value ? String(timeEl.value) : defaultTime);
      /** @type {{ value: number, time: string, altered?: boolean, rescueUnits?: number, postRescueValue?: number }} */
      var entry = { value: value, time: time };
      if (alteredEl && alteredEl.checked) {
        entry.altered = true;
        var rescueUnits = parseNumOrNull(rescueEl && 'value' in rescueEl ? rescueEl.value : '');
        if (rescueUnits != null && rescueUnits > 0) entry.rescueUnits = rescueUnits;
        var postRescueValue = parseNumOrNull(
          postRescueEl && 'value' in postRescueEl ? postRescueEl.value : ''
        );
        if (postRescueValue != null) entry.postRescueValue = postRescueValue;
      }
      glucometrias.push(entry);
    });
  }

  /** @type {Array<{ value: number, units: number, time: string }>} */
  var bombaInsulina = [];
  if (bombaOn) {
    form.querySelectorAll('.ea-bomba-row').forEach(function (row) {
      var valEl = row.querySelector('[data-ea-bomba-value]');
      var unitsEl = row.querySelector('[data-ea-bomba-units]');
      var timeEl = row.querySelector('[data-ea-bomba-time]');
      var value = parseNumOrNull(valEl && 'value' in valEl ? valEl.value : '');
      if (value == null) return;
      var units = parseNumOrNull(unitsEl && 'value' in unitsEl ? unitsEl.value : '');
      var time =
        timeEl && 'value' in timeEl && timeEl.value ? String(timeEl.value) : defaultTime;
      bombaInsulina.push({
        value: value,
        units: units != null ? units : 0,
        time: time,
      });
    });
  }

  var ingEl = document.getElementById('ea-io-ing');
  var egrEl = document.getElementById('ea-io-egr');
  var evacEl = document.getElementById('ea-io-evac');
  var egrRaw = egrEl && 'value' in egrEl ? String(egrEl.value) : '';
  var egrParts = parseIoEgresoLine(egrRaw);

  return {
    id: Date.now().toString() + '-ea',
    recordedAt: recordedAt,
    vitals: vitals,
    vitalSeries: vitalSeries,
    alteredAt: alteredAt,
    glucometrias: glucometrias,
    bombaInsulina: bombaInsulina,
    io: {
      ing: parseNumOrNull(ingEl && 'value' in ingEl ? ingEl.value : ''),
      egr: diuresisValueFromParts(egrParts),
      egrParts: egrParts,
      evac: parseIoEvacField(evacEl && 'value' in evacEl ? evacEl.value : ''),
    },
  };
}

export function registrarEstadoActualMedicion() {
  var patient = findActivePatient();
  if (!patient) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  ensureMonitoreo(patient);
  var medicion = parseFormMedicion();
  if (!medicion) {
    rt.showToast('Formulario no disponible', 'error');
    return;
  }
  var result = appendMedicion(patient.monitoreo, medicion);
  if (!result.ok) {
    rt.showToast('No se pudo registrar la medición', 'error');
    return;
  }
  syncDietKcalFromWeight(
    patient.monitoreo.estadoClinico,
    resolveDietWeightKg({
      patientPeso: patient.peso,
      pesoRef: patient.monitoreo.estadoClinico && patient.monitoreo.estadoClinico.pesoRef,
    })
  );
  saveState();
  resetEaRegistroForm(null);
  if (rt.invalidateInnerTabRenderCache) rt.invalidateInnerTabRenderCache('estadoActual');
  if (typeof window.closeEstadoActualRegistroModal === 'function') window.closeEstadoActualRegistroModal();
  renderEstadoActualPanel({ syncHeavy: true, dataOnly: true });
  rt.showToast('Medición registrada ✓', 'success');
  if (typeof rt.onMedicionRegistered === 'function') rt.onMedicionRegistered();
}

export function ensureEaRegistroModalForm() {
  var body = document.getElementById('ea-registro-modal-body');
  if (!body) return;
  if (
    !body.querySelector('#ea-form') ||
    !body.querySelector('.ea-registro-shell') ||
    !body.querySelector('[data-ea-vital-stack="tas"]')
  ) {
    body.innerHTML = buildRegistroFormMarkup();
  }
  wireEaRegistroForm();
}

/**
 * @param {string} id
 */
export function eliminarEstadoActualMedicion(id) {
  var patient = findActivePatient();
  if (!patient || !id) return;
  ensureMonitoreo(patient);
  removeMedicion(patient.monitoreo, id);
  saveState();
  renderEstadoActualPanel({ syncHeavy: true });
  rt.showToast('Medición eliminada', 'success');
}

/**
 * @param {ReturnType<typeof findActivePatient>} patient
 * @param {string} text
 */
function persistEstadoActualTexto(patient, text) {
  if (!patient || !patient.monitoreo) return;
  patient.monitoreo.textoGuardado = {
    text: text,
    savedAt: new Date().toISOString(),
  };
  saveState();
  renderEstadoActualBar();
  var meta = document.getElementById('ea-meta-guardado');
  if (meta && patient.monitoreo.textoGuardado.savedAt) {
    meta.textContent = formatEaSavedLabel(patient.monitoreo.textoGuardado.savedAt);
  }
}

export function estadoActualGuardar() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  var text = getEstadoActualTextForPatient(patient);
  if (!text.trim()) {
    rt.showToast('No hay texto para guardar', 'error');
    return;
  }
  persistEstadoActualTexto(patient, text);
  rt.showToast('Estado Actual guardado ✓', 'success');
}

export async function estadoActualGuardarCopiar() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  var text = getEstadoActualTextForPatient(patient);
  if (!text.trim()) {
    rt.showToast('No hay texto para guardar', 'error');
    return;
  }
  persistEstadoActualTexto(patient, text);
  var ok = await rt.copyToClipboardSafe(text);
  rt.showToast(
    ok ? 'Estado Actual guardado y copiado ✓' : 'Guardado, pero no se pudo copiar',
    ok ? 'success' : 'error'
  );
}

var eaCopyFabBound = false;

function ensureEaCopyFabController() {
  var fab = document.getElementById('ea-copy-fab');
  if (!fab || eaCopyFabBound) return;
  eaCopyFabBound = true;
  if (fab.parentElement !== document.body) document.body.appendChild(fab);
  fab.removeAttribute('onclick');
  fab.addEventListener(
    'mousedown',
    function (e) {
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
  fab.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (fab.hidden) return;
    void copiarEstadoActualTexto();
  });
}

export function syncEaCopyFab(show) {
  ensureEaCopyFabController();
  var visible = !!show;
  var fab = document.getElementById('ea-copy-fab');
  if (fab) {
    if (visible) {
      fab.removeAttribute('hidden');
      fab.style.display = 'flex';
      fab.setAttribute('aria-hidden', 'false');
    } else {
      fab.setAttribute('hidden', '');
      fab.style.display = 'none';
      fab.setAttribute('aria-hidden', 'true');
    }
  }
  document.documentElement.classList.toggle('ea-copy-fab-active', visible);
}

export function eaHasCopyableContent() {
  var patient = findActivePatient();
  if (!patient) return false;
  var text = getEstadoActualTextForPatient(patient);
  return !!String(text || '').trim();
}

export async function copiarEstadoActualTexto() {
  var patient = findActivePatient();
  if (!patient) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  ensureMonitoreo(patient);
  var text = getEstadoActualTextForPatient(patient);
  if (!text.trim()) {
    rt.showToast('No hay texto para copiar', 'error');
    return;
  }
  var ok = await rt.copyToClipboardSafe(text);
  rt.showToast(ok ? 'Texto copiado al portapapeles ✓' : 'No se pudo copiar', ok ? 'success' : 'error');
}

/**
 * @param {string} key
 */
export function confirmEaMedField(key) {
  var patient = findActivePatient();
  if (!patient || !key) return;
  ensureMonitoreo(patient);
  confirmMedField(patient.monitoreo, key);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Propuesta confirmada', patient);
}

/**
 * @param {string} key
 */
export function discardEaMedProposal(key) {
  var patient = findActivePatient();
  if (!patient || !key) return;
  ensureMonitoreo(patient);
  discardMedProposal(patient.monitoreo, key);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Propuesta descartada', patient);
}

export function confirmEaDietProposal() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  confirmDietProposal(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Dieta confirmada', patient);
}

export function discardEaDietProposal() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  discardDietProposal(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Propuesta de dieta descartada', patient);
}

export function confirmAllEaMedProposals() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  confirmAllMedProposals(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, 'Propuestas confirmadas', patient);
}

export function toggleEaEstadoClinico() {
  var details = document.querySelector('.ea-estado-clinico');
  if (details && 'open' in details) details.open = !details.open;
}

export const windowHandlers = {
  registrarEstadoActualMedicion,
  eliminarEstadoActualMedicion,
  estadoActualGuardar,
  estadoActualGuardarCopiar,
  copiarEstadoActualTexto,
  confirmEaMedField,
  discardEaMedProposal,
  confirmEaDietProposal,
  discardEaDietProposal,
  confirmAllEaMedProposals,
  toggleEaEstadoClinico,
  applyEstadoActualParsedToForm,
};
