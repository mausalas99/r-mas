// Panel Estado Actual (Sala) — formulario, historial, snapshot, texto
import { patients, medRecetaByPatient, saveState } from '../app-state.mjs';
import {
  ensureMonitoreo,
  migratePatientMonitoreo,
  deriveSnapshot,
  balanceTurno,
  balanceGlobalHistorico,
  appendMedicion,
  removeMedicion,
  MED_FIELD_KEYS,
  resolveDietWeightKg,
  syncDietKcalFromWeight,
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
import { isVitalAltered, buildAlteredAtDefaults } from './estado-actual-ranges.mjs';
import { buildEstadoActualText } from './estado-actual-text.mjs';
import {
  buildMedDropdownOptions,
  confirmMedField,
  discardMedProposal,
  confirmAllMedProposals,
} from './estado-actual-meds.mjs';
import { classifyMedicationSoapCategory } from '../med-receta-core.mjs';
import { renderEstadoActualBar } from './soap-estado.mjs';
import { renderEstadoActualCharts } from './estado-actual-charts.mjs';
import { scheduleAfterPaint, scheduleIdle } from '../deferred-work.mjs';
import {
  getDefaultRegistroRecordedAt,
  collectGlucometriasForRegistroWindow,
} from './estado-actual-registro-defaults.mjs';

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

/** @type {Record<string, string>} */
const MED_FIELD_LABELS = {
  analgesia: 'Analgesia',
  abx: 'Antibióticos',
  antihta: 'AntiHTA / diuréticos',
  vasop: 'Vasopresores',
};

let rt = {
  getActiveId() {
    return null;
  },
  showToast() {},
  getSettings() {
    return {};
  },
  switchConsolidatedTab() {},
  copyToClipboardSafe(_text) {
    return Promise.resolve(false);
  },
};

export function registerEstadoActualPanelRuntime(partial) {
  if (!partial || typeof partial !== 'object') return;
  Object.assign(rt, partial);
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

function hasPendingMedProposals(pendienteReceta) {
  return MED_FIELD_KEYS.some(function (k) {
    return pendienteReceta && pendienteReceta[k] && String(pendienteReceta[k]).trim();
  });
}

/**
 * @param {ReturnType<typeof emptyMonitoreo>} monitoreo
 * @param {string | null} activeId
 */
function renderEstadoClinicoSection(monitoreo, activeId, patient) {
  var ec = monitoreo.estadoClinico || {};
  var snapshot = deriveSnapshot(monitoreo);
  var dietWeight = resolveDietWeightKg({
    patientPeso: patient && patient.peso,
    pesoRef: ec.pesoRef,
  });
  syncDietKcalFromWeight(ec, dietWeight);
  var dietWeightHint =
    dietWeight != null
      ? 'Peso para cálculo: ' + dietWeight + ' kg (datos del paciente)'
      : 'Peso para cálculo: — (captura peso en Datos del paciente)';
  var pend = monitoreo.pendienteReceta || {};
  var anyPending = hasPendingMedProposals(pend);

  var medFieldsHtml = MED_FIELD_KEYS.map(function (key) {
    var options = buildMedDropdownOptions(
      activeId,
      key,
      medRecetaByPatient,
      classifyMedicationSoapCategory
    );
    var currentVal = ec[key] != null ? String(ec[key]) : '';
    var pendingVal = pend[key] != null ? String(pend[key]).trim() : '';
    var badge = pendingVal
      ? '<span class="ea-pendiente-badge">Propuesta receta</span>'
      : monitoreo.confirmado && monitoreo.confirmado[key]
        ? '<span class="ea-confirmed-badge">Confirmado</span>'
        : '';

    var selectOpts =
      '<option value="">— Seleccionar de receta —</option>' +
      options
        .map(function (opt) {
          var sel = opt === currentVal ? ' selected' : '';
          return '<option value="' + escAttr(opt) + '"' + sel + '>' + escHtml(opt) + '</option>';
        })
        .join('');

    return (
      '<div class="ea-clinico-med-field" data-ea-med-key="' +
      key +
      '">' +
      '<div class="ea-clinico-med-head">' +
      '<span class="ea-label">' +
      MED_FIELD_LABELS[key] +
      '</span>' +
      badge +
      '</div>' +
      '<select class="ea-input" data-ea-med-select="' +
      key +
      '">' +
      selectOpts +
      '</select>' +
      '<input type="text" class="ea-input" data-ea-med-input="' +
      key +
      '" value="' +
      escAttr(currentVal) +
      '" placeholder="Texto manual">' +
      (pendingVal
        ? '<div class="ea-pendiente-preview" title="Propuesta pendiente">' +
          escHtml(pendingVal) +
          '</div>' +
          '<div class="ea-clinico-med-actions">' +
          '<button type="button" class="ea-btn ea-btn--primary" onclick="confirmEaMedField(\'' +
          key +
          '\')">Confirmar</button>' +
          '<button type="button" class="ea-btn ea-btn--ghost" onclick="discardEaMedProposal(\'' +
          key +
          '\')">Descartar</button>' +
          '</div>'
        : '') +
      '</div>'
    );
  }).join('');

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
    '<label class="ea-field">' +
    '<span class="ea-label">FOUR (/16)</span>' +
    '<input type="number" class="ea-input" data-ea-ec="four" min="0" max="16" step="1" value="' +
    escAttr(ec.four) +
    '">' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Esferas</span>' +
    '<input type="number" class="ea-input" data-ea-ec="esferas" min="0" step="1" value="' +
    escAttr(ec.esferas) +
    '">' +
    '</label>' +
    '<label class="ea-field ea-field--full">' +
    '<span class="ea-label">Soporte respiratorio</span>' +
    '<select class="ea-input" data-ea-ec="soporte">' +
    soporteOpts +
    '</select>' +
    '</label>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Dieta</span>' +
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
    escAttr(ec.kcal) +
    '" placeholder="Total">' +
    '</label>' +
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

function syncEstadoActualTextarea(monitoreo, patient) {
  var texto = generateEstadoActualText(monitoreo, patient);
  var ta = document.getElementById('ea-texto');
  if (ta && 'value' in ta) ta.value = texto;
}

function persistEstadoClinicoAndRefresh(monitoreo, toastMsg, patient) {
  saveState();
  syncEstadoActualTextarea(monitoreo, patient);
  renderEstadoActualPanel({ syncHeavy: true, dataOnly: true, refreshClinico: true });
  if (toastMsg) rt.showToast(toastMsg, 'success');
}

function persistEstadoClinicoLight(monitoreo, patient) {
  saveState();
  syncEstadoActualTextarea(monitoreo, patient);
}

/**
 * @param {HTMLElement | null} mount
 */
function captureEaPanelUiState(mount) {
  if (!mount) return { clinicoOpen: false };
  var det = mount.querySelector('.ea-estado-clinico');
  return { clinicoOpen: !!(det && det.open) };
}

/**
 * @param {HTMLElement | null} mount
 * @param {{ clinicoOpen?: boolean }} state
 */
function restoreEaPanelUiState(mount, state) {
  if (!mount || !state || !state.clinicoOpen) return;
  var det = mount.querySelector('.ea-estado-clinico');
  if (det) det.open = true;
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
    syncDietKcalFromWeight(monitoreo.estadoClinico, w);
    var kcalInput = panel && panel.querySelector('[data-ea-ec="kcal"]');
    if (kcalInput && 'value' in kcalInput) kcalInput.value = String(monitoreo.estadoClinico.kcal || '');
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

  mount.querySelectorAll('[data-ea-med-select]').forEach(function (el) {
    el.addEventListener('change', function () {
      var key = el.getAttribute('data-ea-med-select');
      if (!key || !('value' in el) || !el.value) return;
      if (!monitoreo.estadoClinico) monitoreo.estadoClinico = {};
      monitoreo.estadoClinico[key] = String(el.value);
      if (!monitoreo.confirmado) monitoreo.confirmado = {};
      monitoreo.confirmado[key] = true;
      if (monitoreo.pendienteReceta) monitoreo.pendienteReceta[key] = '';
      var input = mount.querySelector('[data-ea-med-input="' + key + '"]');
      if (input && 'value' in input) input.value = String(el.value);
      persistEstadoClinicoAndRefresh(monitoreo, 'Campo actualizado', patient);
    });
  });

  mount.querySelectorAll('[data-ea-med-input]').forEach(function (el) {
    el.addEventListener('change', function () {
      var key = el.getAttribute('data-ea-med-input');
      if (!key || !('value' in el)) return;
      if (!monitoreo.estadoClinico) monitoreo.estadoClinico = {};
      monitoreo.estadoClinico[key] = String(el.value);
      if (!monitoreo.confirmado) monitoreo.confirmado = {};
      monitoreo.confirmado[key] = true;
      if (monitoreo.pendienteReceta) monitoreo.pendienteReceta[key] = '';
      persistEstadoClinicoAndRefresh(monitoreo, 'Campo actualizado', patient);
    });
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
    monitoreo.estadoClinico,
    snapshot,
    { balanceTurno: balanceTurno(monitoreo) },
    { patientPeso: patient && patient.peso }
  );
}

function wireFormInteractions(form) {
  if (!form) return;

  function syncAlteredFields() {
    VITAL_KEYS.forEach(function (key) {
      var input = form.querySelector('[data-ea-vital="' + key + '"]');
      var wrap = form.querySelector('[data-ea-altered-wrap="' + key + '"]');
      var box = form.querySelector('[data-ea-vital-box="' + key + '"]');
      if (!input || !wrap) return;
      var altered = isVitalAltered(key, input.value);
      wrap.classList.toggle('ea-altered-slot--hidden', !altered);
      wrap.hidden = !altered;
      if (box) box.classList.toggle('ea-vital-box--altered', altered);
    });
    var peakInput = form.querySelector('[data-ea-vital="tempPeak"]');
    var peakWrap = form.querySelector('[data-ea-altered-wrap="tempPeak"]');
    var peakBox = form.querySelector('[data-ea-vital-box="tempPeak"]');
    if (peakInput && peakWrap) {
      var peakVal = peakInput.value;
      var showPeak = String(peakVal).trim() !== '';
      var peakFever = showPeak && isVitalAltered('temp', peakVal);
      peakWrap.classList.toggle('ea-altered-slot--hidden', !showPeak);
      peakWrap.hidden = !showPeak;
      if (peakBox) peakBox.classList.toggle('ea-vital-box--altered', peakFever);
    }
    syncTempAddButtonVisibility(form);
  }

  VITAL_KEYS.forEach(function (key) {
    var input = form.querySelector('[data-ea-vital="' + key + '"]');
    if (input) input.addEventListener('input', syncAlteredFields);
  });
  var peakInput0 = form.querySelector('[data-ea-vital="tempPeak"]');
  if (peakInput0) peakInput0.addEventListener('input', syncAlteredFields);

  var addTempBtn = form.querySelector('#ea-add-temp');
  if (addTempBtn && !addTempBtn.dataset.eaTempWired) {
    addTempBtn.dataset.eaTempWired = '1';
    addTempBtn.addEventListener('click', function () {
      expandTempSecondSlot(form);
    });
  }

  function syncIoBalance() {
    syncIoBalanceFromForm(form);
  }

  var ingEl = form.querySelector('#ea-io-ing');
  var egrEl = form.querySelector('#ea-io-egr');
  var evacEl = form.querySelector('#ea-io-evac');
  if (ingEl) ingEl.addEventListener('input', syncIoBalance);
  if (egrEl) egrEl.addEventListener('input', syncIoBalance);
  if (evacEl) evacEl.addEventListener('input', syncIoBalance);

  var addGluBtn = form.querySelector('#ea-add-glu');
  var gluList = form.querySelector('#ea-glu-list');
  if (addGluBtn && gluList) {
    addGluBtn.addEventListener('click', function () {
      gluList.appendChild(buildGluRow());
    });
  }

  syncAlteredFields();
  syncIoBalance();
}

/**
 * @returns {HTMLDivElement}
 */
function wireGluRowKeyboard(row) {
  row.querySelectorAll('[data-ea-glu-value], [data-ea-glu-time]').forEach(function (el) {
    el.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      var list = row.parentElement;
      if (!list) return;
      var rows = list.querySelectorAll('.ea-glu-row');
      if (row === rows[rows.length - 1]) {
        var newRow = buildGluRow();
        list.appendChild(newRow);
        var focusEl = newRow.querySelector('[data-ea-glu-value]');
        if (focusEl && 'focus' in focusEl) focusEl.focus();
      } else {
        var next = row.nextElementSibling;
        var nextFocus = next && next.querySelector('[data-ea-glu-value]');
        if (nextFocus && 'focus' in nextFocus) nextFocus.focus();
      }
    });
  });
}

/**
 * @param {{ value?: number, time?: string } | null | undefined} [data]
 * @returns {HTMLDivElement}
 */
function buildGluRow(data) {
  var row = document.createElement('div');
  row.className = 'ea-glu-row';
  row.innerHTML =
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Glu</span>' +
    '<input type="number" class="ea-input" data-ea-glu-value min="0" step="1" placeholder="mg/dL">' +
    '</label>' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Hora</span>' +
    '<input type="time" class="ea-input ea-input--time" data-ea-glu-time>' +
    '</label>' +
    '<button type="button" class="ea-btn ea-btn--ghost ea-btn--icon" data-ea-glu-remove title="Quitar fila" aria-label="Quitar glucometría">×</button>';
  if (data) {
    var val = row.querySelector('[data-ea-glu-value]');
    var time = row.querySelector('[data-ea-glu-time]');
    if (val && data.value != null && 'value' in val) val.value = String(data.value);
    if (time && data.time && 'value' in time) time.value = String(data.time);
  }
  var removeBtn = row.querySelector('[data-ea-glu-remove]');
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      var list = row.parentElement;
      if (!list) return;
      if (list.querySelectorAll('.ea-glu-row').length <= 1) {
        var valEl = row.querySelector('[data-ea-glu-value]');
        var timeEl = row.querySelector('[data-ea-glu-time]');
        if (valEl) valEl.value = '';
        if (timeEl) timeEl.value = '';
        return;
      }
      row.remove();
    });
  }
  wireGluRowKeyboard(row);
  return row;
}

/**
 * @param {ReturnType<typeof import('./estado-actual-parser.mjs').parseEstadoActualPaste>} parsed
 */
export function applyEstadoActualParsedToForm(parsed) {
  var form = document.getElementById('ea-form');
  if (!form || !parsed || !parsed.ok) return;

  VITAL_KEYS.forEach(function (key) {
    var el = form.querySelector('[data-ea-vital="' + key + '"]');
    var v = parsed.vitals[key];
    if (el && v != null && 'value' in el) el.value = String(v);
  });

  VITAL_KEYS.forEach(function (key) {
    var wrap = form.querySelector('[data-ea-altered-wrap="' + key + '"]');
    var box = form.querySelector('[data-ea-vital-box="' + key + '"]');
    var timeEl = form.querySelector('[data-ea-altered="' + key + '"]');
    var vitalEl = form.querySelector('[data-ea-vital="' + key + '"]');
    var alteredTime = parsed.alteredAt[key];
    var altered = !!(alteredTime || (vitalEl && isVitalAltered(key, vitalEl.value)));
    if (wrap) {
      wrap.classList.toggle('ea-altered-slot--hidden', !altered);
      wrap.hidden = !altered;
    }
    if (box) box.classList.toggle('ea-vital-box--altered', altered);
    if (timeEl && alteredTime && 'value' in timeEl) timeEl.value = alteredTime;
  });

  var peakEl = form.querySelector('[data-ea-vital="tempPeak"]');
  if (peakEl && parsed.vitals.tempPeak != null && 'value' in peakEl) {
    peakEl.value = String(parsed.vitals.tempPeak);
  }
  var peakTimeEl = form.querySelector('[data-ea-altered="tempPeak"]');
  if (peakTimeEl && parsed.alteredAt.tempPeak && 'value' in peakTimeEl) {
    peakTimeEl.value = parsed.alteredAt.tempPeak;
  }
  if (parsed.vitals.tempPeak != null && form) expandTempSecondSlot(form);

  var gluList = form.querySelector('#ea-glu-list');
  if (gluList && parsed.glucometrias.length) {
    gluList.innerHTML = '';
    parsed.glucometrias.forEach(function (g) {
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
    var display = displayValue(val);
    if (key === 'temp') {
      var peak = snapshot.vitals.tempPeak;
      if (peak != null && peak !== '' && String(peak) !== String(val)) {
        display =
          displayValue(val) +
          ' · pico ' +
          displayValue(peak) +
          (snapshot.alteredAt && snapshot.alteredAt.tempPeak
            ? ' @ ' + escHtml(snapshot.alteredAt.tempPeak)
            : '');
      }
    }
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

  var gluHtml =
    snapshot.glucometrias && snapshot.glucometrias.length
      ? snapshot.glucometrias
          .map(function (g) {
            var t = g.time ? ' <span class="ea-snapshot-glu-time">' + g.time + '</span>' : '';
            return '<span class="ea-snapshot-glu-chip">' + displayValue(g.value) + ' MG/DL' + t + '</span>';
          })
          .join('')
      : '<span class="ea-muted">—</span>';

  return (
    '<section class="ea-section ea-card ea-snapshot-strip ea-snapshot-strip--primary" id="ea-snapshot">' +
    '<div class="ea-snapshot-strip-head">' +
    '<div class="ea-snapshot-strip-head-text">' +
    '<h3 class="ea-section-title">Snapshot actual</h3>' +
    '<p class="ea-muted ea-snapshot-hint">Resumen del monitoreo · las tendencias están debajo</p>' +
    '</div>' +
    '<div class="ea-snapshot-actions">' +
    '<button type="button" class="ea-btn ea-btn--primary" onclick="openEstadoActualRegistroModal()">Registro manual</button>' +
    '<button type="button" class="ea-btn ea-btn--ghost" onclick="openEstadoActualPasteModal()">Pegar monitoreo</button>' +
    '</div>' +
    '</div>' +
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
      '<section class="ea-section ea-card" id="ea-historial">' +
      '<h3 class="ea-section-title">Historial reciente</h3>' +
      '<p class="ea-muted">Sin mediciones registradas.</p>' +
      '</section>'
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
      var vit = row.vitals || {};
      VITAL_KEYS.forEach(function (k) {
        if (vit[k] != null && vit[k] !== '') parts.push(VITAL_LABELS[k] + ' ' + vit[k]);
      });
      if (vit.tempPeak != null && vit.tempPeak !== '' && String(vit.tempPeak) !== String(vit.temp)) {
        var peakPart = 'Pico ' + vit.tempPeak;
        if (row.alteredAt && row.alteredAt.tempPeak) peakPart += ' @ ' + row.alteredAt.tempPeak;
        parts.push(peakPart);
      }
      var glus = Array.isArray(row.glucometrias) ? row.glucometrias : [];
      glus.forEach(function (g) {
        if (g && g.value != null && g.value !== '') {
          parts.push('Glu ' + g.value + (g.time ? ' @ ' + g.time : ''));
        }
      });
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
      if (io.evac != null && io.evac !== '') parts.push('Evac ' + io.evac);
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
    '<section class="ea-section ea-card" id="ea-historial">' +
    '<h3 class="ea-section-title">Historial reciente</h3>' +
    '<ul class="ea-historial-list">' +
    rows +
    '</ul>' +
    '</section>'
  );
}

/**
 * @param {string} key
 * @param {string} [labelOverride]
 * @param {{ tempPlus?: boolean } | undefined} [opts]
 * @returns {string}
 */
function buildVitalChipHtml(key, labelOverride, opts) {
  opts = opts || {};
  var label = labelOverride || VITAL_LABELS[key] || key;
  var boxKey = key === 'tempPeak' ? 'tempPeak' : key;
  var unit = VITAL_UNITS[key === 'tempPeak' ? 'temp' : key] || '';
  var tempPlusBtn = opts.tempPlus
    ? '<button type="button" class="ea-temp-add-btn" id="ea-add-temp" title="Segunda temperatura (pico febril)">+1</button>'
    : '';
  var labelHtml = opts.tempPlus
    ? '<div class="vital-label ea-vital-label-row">' +
      '<div class="ea-vital-label-text">' +
      '<span class="ea-vital-name">' +
      label +
      '</span>' +
      '<span class="ea-vital-unit">' +
      unit +
      '</span></div>' +
      tempPlusBtn +
      '</div>'
    : '<div class="vital-label">' +
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
    key +
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

function buildTempStackHtml() {
  return (
    '<div class="ea-temp-stack" data-ea-temp-stack>' +
    '<div class="ea-temp-stack-slots">' +
    '<div class="ea-temp-slot ea-temp-slot--primary" data-ea-temp-slot="primary">' +
    buildVitalChipHtml('temp', undefined, { tempPlus: true }) +
    '<div class="ea-temp-prev-view" data-ea-temp-prev-view hidden>' +
    '<span class="ea-temp-prev-summary" data-ea-temp-prev-summary></span>' +
    '</div>' +
    '</div>' +
    '<div class="ea-temp-slot ea-temp-slot--peak" data-ea-temp-slot="peak" hidden>' +
    buildVitalChipHtml('tempPeak', 'Pico') +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {HTMLElement | null} form
 */
function syncTempPrevSummary(form) {
  if (!form) return;
  var summary = form.querySelector('[data-ea-temp-prev-summary]');
  var primaryInput = form.querySelector('[data-ea-temp-slot="primary"] [data-ea-vital="temp"]');
  var timeEl = form.querySelector('[data-ea-temp-slot="primary"] [data-ea-altered="temp"]');
  if (!summary) return;
  var val = primaryInput && 'value' in primaryInput ? String(primaryInput.value).trim() : '';
  if (!val) {
    summary.textContent = '—';
    return;
  }
  var time = timeEl && 'value' in timeEl && timeEl.value ? String(timeEl.value) : '';
  summary.textContent = val + ' °C' + (time ? ' @ ' + time : '');
}

/**
 * @param {HTMLElement | null} form
 */
function syncTempAddButtonVisibility(form) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-temp-stack]');
  var addBtn = form.querySelector('#ea-add-temp');
  var primaryInput = form.querySelector('[data-ea-temp-slot="primary"] [data-ea-vital="temp"]');
  if (!addBtn) return;
  var dual = stack && stack.classList.contains('ea-temp-stack--dual');
  var hasVal = primaryInput && 'value' in primaryInput && String(primaryInput.value).trim() !== '';
  addBtn.hidden = dual || !hasVal;
}

/**
 * @param {HTMLElement | null} form
 */
function expandTempSecondSlot(form) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-temp-stack]');
  var primarySlot = form.querySelector('[data-ea-temp-slot="primary"]');
  var peakSlot = form.querySelector('[data-ea-temp-slot="peak"]');
  var prevView = form.querySelector('[data-ea-temp-prev-view]');
  var primaryChip = primarySlot && primarySlot.querySelector('[data-ea-vital-box="temp"]');
  if (!stack || !primarySlot || !peakSlot) return;
  syncTempPrevSummary(form);
  stack.classList.add('ea-temp-stack--dual');
  if (primaryChip) primaryChip.hidden = true;
  if (prevView) prevView.hidden = false;
  peakSlot.hidden = false;
  syncTempAddButtonVisibility(form);
  var peakInput = peakSlot.querySelector('[data-ea-vital="tempPeak"]');
  if (peakInput && 'focus' in peakInput) peakInput.focus();
}

/**
 * @param {HTMLElement | null} form
 */
function collapseTempStack(form) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-temp-stack]');
  var primarySlot = form.querySelector('[data-ea-temp-slot="primary"]');
  var peakSlot = form.querySelector('[data-ea-temp-slot="peak"]');
  var prevView = form.querySelector('[data-ea-temp-prev-view]');
  var primaryChip = primarySlot && primarySlot.querySelector('[data-ea-vital-box="temp"]');
  if (stack) stack.classList.remove('ea-temp-stack--dual');
  if (primaryChip) primaryChip.hidden = false;
  if (prevView) prevView.hidden = true;
  if (peakSlot) {
    peakSlot.hidden = true;
    var peakInput = peakSlot.querySelector('[data-ea-vital="tempPeak"]');
    var peakTime = peakSlot.querySelector('[data-ea-altered="tempPeak"]');
    if (peakInput && 'value' in peakInput) peakInput.value = '';
    if (peakTime && 'value' in peakTime) peakTime.value = '';
  }
  syncTempAddButtonVisibility(form);
}

/**
 * @param {HTMLElement} form
 * @param {ReturnType<typeof emptyMonitoreo>} monitoreo
 */
function prefillRegistroFormFromMonitoreo(form, monitoreo) {
  var snap = deriveSnapshot(monitoreo);
  var vit = snap.vitals || {};
  var alt = snap.alteredAt || {};

  VITAL_KEYS.forEach(function (key) {
    var el = form.querySelector('[data-ea-vital="' + key + '"]');
    if (el && vit[key] != null && vit[key] !== '' && 'value' in el) el.value = String(vit[key]);
  });

  var peakEl = form.querySelector('[data-ea-vital="tempPeak"]');
  if (peakEl && vit.tempPeak != null && vit.tempPeak !== '' && 'value' in peakEl) {
    peakEl.value = String(vit.tempPeak);
  }

  VITAL_KEYS.forEach(function (key) {
    var wrap = form.querySelector('[data-ea-altered-wrap="' + key + '"]');
    var box = form.querySelector('[data-ea-vital-box="' + key + '"]');
    var timeEl = form.querySelector('[data-ea-altered="' + key + '"]');
    var vitalEl = form.querySelector('[data-ea-vital="' + key + '"]');
    var alteredTime = alt[key];
    var altered = !!(alteredTime || (vitalEl && isVitalAltered(key, vitalEl.value)));
    if (wrap) {
      wrap.classList.toggle('ea-altered-slot--hidden', !altered);
      wrap.hidden = !altered;
    }
    if (box) box.classList.toggle('ea-vital-box--altered', altered);
    if (timeEl && alteredTime && 'value' in timeEl) timeEl.value = alteredTime;
  });

  var peakWrap = form.querySelector('[data-ea-altered-wrap="tempPeak"]');
  var peakBox = form.querySelector('[data-ea-vital-box="tempPeak"]');
  var peakTimeEl = form.querySelector('[data-ea-altered="tempPeak"]');
  if (peakEl && vit.tempPeak != null && vit.tempPeak !== '') {
    expandTempSecondSlot(form);
    if (peakWrap) {
      var showPeak = String(peakEl.value).trim() !== '';
      peakWrap.classList.toggle('ea-altered-slot--hidden', !showPeak);
      peakWrap.hidden = !showPeak;
      if (peakTimeEl && alt.tempPeak && 'value' in peakTimeEl) peakTimeEl.value = alt.tempPeak;
      if (peakBox) peakBox.classList.toggle('ea-vital-box--altered', showPeak && isVitalAltered('temp', peakEl.value));
    }
  } else {
    collapseTempStack(form);
  }

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

  var gluList = form.querySelector('#ea-glu-list');
  if (gluList) {
    var glus = collectGlucometriasForRegistroWindow(
      Array.isArray(monitoreo.historial) ? monitoreo.historial : []
    );
    gluList.innerHTML = '';
    if (glus.length) {
      glus.forEach(function (g) {
        gluList.appendChild(buildGluRow(g));
      });
    } else {
      gluList.appendChild(buildGluRow());
    }
  }

  syncTempAddButtonVisibility(form);
}

export function buildRegistroFormMarkup() {
  var vitalFields = VITAL_KEYS.map(function (key) {
    if (key === 'temp') return buildTempStackHtml();
    return buildVitalChipHtml(key);
  }).join('');

  return (
    '<div class="ea-registro-shell">' +
    '<div class="ea-registro-form-scroll">' +
    '<form id="ea-form" class="ea-form ea-form--registro" onsubmit="return false;">' +
    '<p class="ea-registro-hint ea-muted">Cierre de turno: <strong>00:00 de hoy</strong>. Signos e I/O del snapshot; glucometrías desde ayer 08:00.</p>' +
    '<label class="ea-field ea-field--datetime">' +
    '<span class="ea-label">Fecha y hora del registro</span>' +
    '<input type="datetime-local" class="ea-input" id="ea-recorded-at" value="' +
    toDatetimeLocalValue(getDefaultRegistroRecordedAt()) +
    '">' +
    '</label>' +
    '<div class="vitals-grid ea-vitals-grid">' +
    vitalFields +
    '</div>' +
    '<div class="ea-glu-block">' +
    '<div class="ea-glu-head">' +
    '<span class="ea-label">Glucometrías</span>' +
    '<button type="button" class="ea-btn ea-btn--ghost" id="ea-add-glu">+ Agregar</button>' +
    '</div>' +
    '<div id="ea-glu-list" class="ea-glu-list"></div>' +
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
    '<button type="button" class="ea-btn ea-btn--ghost" onclick="closeEstadoActualRegistroModal()">Cancelar</button>' +
    '<button type="button" class="ea-btn ea-btn--primary" onclick="registrarEstadoActualMedicion()">Registrar</button>' +
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
    gluList.appendChild(buildGluRow());
  }
}

/**
 * Limpia y prellena el formulario de registro (cierre 00:00 + turno previo).
 * @param {{ monitoreo?: ReturnType<typeof emptyMonitoreo> } | null | undefined} [patient]
 */
export function resetEaRegistroForm(patient) {
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
  collapseTempStack(form);
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
  if (gluList) {
    gluList.innerHTML = '';
    gluList.appendChild(buildGluRow());
  }

  if (patient && patient.monitoreo) {
    prefillRegistroFormFromMonitoreo(form, patient.monitoreo);
  }

  syncIoBalanceFromForm(form);
  syncTempAddButtonVisibility(form);
}

function buildEaShellKey(activeId, monitoreo) {
  var ec = (monitoreo && monitoreo.estadoClinico) || {};
  return [
    String(activeId || ''),
    String(ec.soporte || ''),
    String(ec.dieta || ''),
    String(ec.pesoRef || ''),
    String(ec.kcalKg || ''),
    String(ec.kcal || ''),
  ].join('|');
}

function buildEaDataKey(monitoreo) {
  var h = Array.isArray(monitoreo.historial) ? monitoreo.historial : [];
  var parts = ['h' + h.length];
  for (var i = 0; i < Math.min(4, h.length); i += 1) {
    var row = h[i];
    parts.push(String(row.id || '') + '@' + String(row.recordedAt || ''));
  }
  var tg =
    monitoreo.textoGuardado && monitoreo.textoGuardado.savedAt
      ? String(monitoreo.textoGuardado.savedAt)
      : '';
  parts.push('t' + tg);
  return parts.join('|');
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
    histEl.outerHTML = renderHistorialSection(Array.isArray(monitoreo.historial) ? monitoreo.historial : []);
  }
  var meta = mount.querySelector('#ea-meta-guardado');
  if (meta) meta.textContent = savedLabel;

  syncEstadoActualTextarea(monitoreo, patient);
}

function finishEaChartsAndReady(mount, monitoreo, patient, onReady, syncHeavy) {
  var chartsMount = mount.querySelector('#ea-charts-mount');
  var finishDeferred = function () {
    syncEstadoActualTextarea(monitoreo, patient);
    if (chartsMount) renderEstadoActualCharts(/** @type {HTMLElement} */ (chartsMount), monitoreo);
    if (onReady) onReady();
  };
  if (syncHeavy) {
    finishDeferred();
    return;
  }
  scheduleAfterPaint(function () {
    scheduleIdle(finishDeferred);
  });
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
  var snapshot = deriveSnapshot(monitoreo);
  var balTurno = balanceTurno(monitoreo);
  var balGlobal = balanceGlobalHistorico(monitoreo);
  var savedLabel = formatEaSavedLabel(monitoreo.textoGuardado && monitoreo.textoGuardado.savedAt);
  var activeId = rt.getActiveId();
  var shellKey = buildEaShellKey(activeId, monitoreo);
  var dataKey = buildEaDataKey(monitoreo);

  if (
    mount.querySelector('.estado-actual-panel') &&
    _eaPanelCache.shellKey === shellKey &&
    (opts.dataOnly || _eaPanelCache.dataKey !== dataKey)
  ) {
    if (_eaPanelCache.dataKey === dataKey && !opts.dataOnly) {
      syncEstadoActualTextarea(monitoreo, patient);
      if (onReady) onReady();
      return;
    }
    patchEaPanelDynamicSections(mount, patient, monitoreo, {
      refreshClinico: !!opts.refreshClinico,
    });
    _eaPanelCache.dataKey = dataKey;
    finishEaChartsAndReady(mount, monitoreo, patient, onReady, !!opts.syncHeavy);
    return;
  }

  if (
    mount.querySelector('.estado-actual-panel') &&
    _eaPanelCache.shellKey === shellKey &&
    _eaPanelCache.dataKey === dataKey &&
    !opts.force
  ) {
    syncEstadoActualTextarea(monitoreo, patient);
    if (onReady) onReady();
    return;
  }

  var eaUiState = captureEaPanelUiState(mount);

  mount.innerHTML =
    '<div class="estado-actual-panel">' +
    '<header class="ea-panel-header ea-card">' +
    '<div class="ea-action-bar">' +
    '<button type="button" class="ea-btn" onclick="estadoActualCopiar()">Copiar</button>' +
    '<button type="button" class="ea-btn ea-btn--primary" onclick="estadoActualGuardarCopiar()">Guardar y copiar</button>' +
    '<span id="ea-meta-guardado" class="ea-meta-guardado">' +
    savedLabel +
    '</span>' +
    '</div></header>' +
    renderSnapshotSection(snapshot, balTurno, balGlobal) +
    '<section class="ea-section ea-card ea-charts-section">' +
    '<h3 class="ea-section-title">Tendencias</h3>' +
    '<div id="ea-charts-mount" class="ea-charts-mount"><p class="ea-muted ea-charts-loading">Cargando tendencias…</p></div>' +
    '</section>' +
    renderEstadoClinicoSection(monitoreo, activeId, patient) +
    renderHistorialSection(Array.isArray(monitoreo.historial) ? monitoreo.historial : []) +
    '<section class="ea-section ea-card">' +
    '<div class="ea-texto-head">' +
    '<h3 class="ea-section-title">Texto Estado Actual</h3>' +
    '<button type="button" class="ea-btn ea-btn--ghost" onclick="regenerarEstadoActualTexto()">Regenerar</button>' +
    '</div>' +
    '<textarea id="ea-texto" class="ea-texto" rows="8" placeholder="Generando texto…"></textarea>' +
    '</section>' +
    '</div>';

  restoreEaPanelUiState(mount, eaUiState);

  wireEstadoClinicoInteractions(mount, patient);

  _eaPanelCache.shellKey = shellKey;
  _eaPanelCache.dataKey = dataKey;
  finishEaChartsAndReady(mount, monitoreo, patient, onReady, !!opts.syncHeavy);
}

export function navigateToEstadoActualPanel() {
  rt.switchConsolidatedTab('estadoActual');
}

function parseFormMedicion() {
  var form = document.getElementById('ea-form');
  if (!form) return null;

  var recordedLocal = /** @type {HTMLInputElement | null} */ (document.getElementById('ea-recorded-at'));
  var recordedAt = datetimeLocalToIso(recordedLocal ? recordedLocal.value : '');
  var defaultTime = isoToHHmm(recordedAt);

  /** @type {Record<string, number | null>} */
  var vitals = {};
  VITAL_KEYS.forEach(function (key) {
    var el = form.querySelector('[data-ea-vital="' + key + '"]');
    vitals[key] = parseNumOrNull(el && 'value' in el ? el.value : '');
  });

  var peakEl = form.querySelector('[data-ea-vital="tempPeak"]');
  var tempPeak = parseNumOrNull(peakEl && 'value' in peakEl ? peakEl.value : '');
  if (tempPeak != null) vitals.tempPeak = tempPeak;

  var alteredDefaults = buildAlteredAtDefaults(vitals, defaultTime);
  /** @type {Record<string, string>} */
  var alteredAt = {};
  Object.keys(alteredDefaults).forEach(function (key) {
    var el = form.querySelector('[data-ea-altered="' + key + '"]');
    var val = el && 'value' in el && el.value ? String(el.value) : alteredDefaults[key];
    if (val) alteredAt[key] = val;
  });

  if (tempPeak != null) {
    var peakTimeEl = form.querySelector('[data-ea-altered="tempPeak"]');
    var peakTime =
      peakTimeEl && 'value' in peakTimeEl && peakTimeEl.value
        ? String(peakTimeEl.value)
        : isVitalAltered('temp', tempPeak)
          ? defaultTime
          : '';
    if (peakTime) alteredAt.tempPeak = peakTime;
  }

  /** @type {Array<{ value: number | null, time: string }>} */
  var glucometrias = [];
  form.querySelectorAll('.ea-glu-row').forEach(function (row) {
    var valEl = row.querySelector('[data-ea-glu-value]');
    var timeEl = row.querySelector('[data-ea-glu-time]');
    var value = parseNumOrNull(valEl && 'value' in valEl ? valEl.value : '');
    if (value == null) return;
    var time =
      timeEl && 'value' in timeEl && timeEl.value ? String(timeEl.value) : defaultTime;
    glucometrias.push({ value: value, time: time });
  });

  var ingEl = document.getElementById('ea-io-ing');
  var egrEl = document.getElementById('ea-io-egr');
  var evacEl = document.getElementById('ea-io-evac');
  var egrRaw = egrEl && 'value' in egrEl ? String(egrEl.value) : '';
  var egrParts = parseIoEgresoLine(egrRaw);

  return {
    id: Date.now().toString() + '-ea',
    recordedAt: recordedAt,
    vitals: vitals,
    alteredAt: alteredAt,
    glucometrias: glucometrias,
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
    rt.showToast('Agrega al menos un signo vital, glucometría o I/O', 'error');
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
  if (rt.invalidateInnerTabRenderCache) rt.invalidateInnerTabRenderCache('estadoActual');
  if (typeof window.closeEstadoActualRegistroModal === 'function') window.closeEstadoActualRegistroModal();
  renderEstadoActualPanel({ syncHeavy: true, dataOnly: true });
  rt.showToast('Medición registrada ✓', 'success');
}

export function ensureEaRegistroModalForm() {
  var body = document.getElementById('ea-registro-modal-body');
  if (!body) return;
  if (
    !body.querySelector('#ea-form') ||
    !body.querySelector('.ea-registro-shell') ||
    !body.querySelector('.ea-vital-label-row')
  ) {
    body.innerHTML = buildRegistroFormMarkup();
    wireEaRegistroForm();
  }
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

export async function estadoActualCopiar() {
  if (!rt.getActiveId()) return;
  var ta = document.getElementById('ea-texto');
  var text = ta && 'value' in ta ? String(ta.value) : '';
  if (!text.trim()) {
    rt.showToast('No hay texto para copiar', 'error');
    return;
  }
  var ok = await rt.copyToClipboardSafe(text);
  rt.showToast(ok ? 'Estado Actual copiado al portapapeles ✓' : 'No se pudo copiar', ok ? 'success' : 'error');
}

export async function estadoActualGuardarCopiar() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  var ta = document.getElementById('ea-texto');
  var text = ta && 'value' in ta ? String(ta.value) : '';
  if (!text.trim()) {
    rt.showToast('No hay texto para guardar', 'error');
    return;
  }
  patient.monitoreo.textoGuardado = {
    text: text,
    savedAt: new Date().toISOString(),
  };
  saveState();
  renderEstadoActualBar();
  var meta = document.getElementById('ea-meta-guardado');
  if (meta) meta.textContent = formatEaSavedLabel(patient.monitoreo.textoGuardado.savedAt);
  var ok = await rt.copyToClipboardSafe(text);
  rt.showToast(
    ok ? 'Estado Actual guardado y copiado ✓' : 'Guardado, pero no se pudo copiar',
    ok ? 'success' : 'error'
  );
}

export function regenerarEstadoActualTexto() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  syncEstadoActualTextarea(patient.monitoreo, patient);
  rt.showToast('Texto regenerado desde datos actuales', 'success');
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
  estadoActualCopiar,
  estadoActualGuardarCopiar,
  regenerarEstadoActualTexto,
  confirmEaMedField,
  discardEaMedProposal,
  confirmAllEaMedProposals,
  toggleEaEstadoClinico,
  applyEstadoActualParsedToForm,
};
