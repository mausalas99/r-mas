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
  parseWeightKg,
  parseIoEgresoField,
  isIoNumericValue,
} from './estado-actual-data.mjs';
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

/** @type {readonly string[]} */
const VITAL_KEYS = ['tas', 'tad', 'fc', 'fr', 'temp', 'sat'];

/** @type {Record<string, string>} */
const VITAL_LABELS = {
  tas: 'TAS',
  tad: 'TAD',
  fc: 'FC',
  fr: 'FR',
  temp: 'Temp',
  sat: 'SatO₂',
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
  return (n > 0 ? '+' : '') + n + ' cc';
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
    '<span class="ea-label">Kcal total (auto)</span>' +
    '<input type="number" class="ea-input ea-input--readonly" data-ea-ec="kcal" step="any" value="' +
    escAttr(ec.kcal) +
    '" readonly tabindex="-1" aria-readonly="true">' +
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
  renderEstadoActualPanel({ syncHeavy: true });
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
  if (key === 'kcal') return;
  monitoreo.estadoClinico[key] = 'value' in el ? String(el.value) : '';
  if (key === 'kcalKg') {
    var snap = deriveSnapshot(monitoreo);
    var w = resolveDietWeightKg({
      patientPeso: patient.peso,
      pesoRef: monitoreo.estadoClinico.pesoRef,
    });
    syncDietKcalFromWeight(monitoreo.estadoClinico, w);
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
  }

  VITAL_KEYS.forEach(function (key) {
    var input = form.querySelector('[data-ea-vital="' + key + '"]');
    if (input) input.addEventListener('input', syncAlteredFields);
  });

  function syncIoBalance() {
    var ingEl = form.querySelector('#ea-io-ing');
    var egrEl = form.querySelector('#ea-io-egr');
    var out = form.querySelector('#ea-balance-turno-live');
    if (!ingEl || !egrEl || !out) return;
    var ing = parseNumOrNull(ingEl.value);
    var egr = parseIoEgresoField(egrEl.value);
    if (ing != null && isIoNumericValue(egr)) {
      var diff = ing - Number(egr);
      out.textContent = (diff > 0 ? '+' : '') + diff + ' cc';
    } else {
      out.textContent = '—';
    }
  }

  var ingEl = form.querySelector('#ea-io-ing');
  var egrEl = form.querySelector('#ea-io-egr');
  if (ingEl) ingEl.addEventListener('input', syncIoBalance);
  if (egrEl) egrEl.addEventListener('input', syncIoBalance);

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
function buildGluRow() {
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
  var removeBtn = row.querySelector('[data-ea-glu-remove]');
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      var list = row.parentElement;
      if (!list) return;
      if (list.querySelectorAll('.ea-glu-row').length <= 1) {
        var val = row.querySelector('[data-ea-glu-value]');
        var time = row.querySelector('[data-ea-glu-time]');
        if (val) val.value = '';
        if (time) time.value = '';
        return;
      }
      row.remove();
    });
  }
  return row;
}

/**
 * @param {ReturnType<typeof deriveSnapshot>} snapshot
 * @param {number} balTurno
 * @param {number} balGlobal
 */
function renderSnapshotSection(snapshot, balTurno, balGlobal) {
  var vitalsHtml = VITAL_KEYS.map(function (key) {
    var val = snapshot.vitals[key];
    var altered = snapshot.alteredAt && snapshot.alteredAt[key];
    var cls = 'ea-snapshot-item' + (altered ? ' ea-snapshot-item--altered' : '');
    var meta = altered ? '<span class="ea-snapshot-altered-at">' + altered + '</span>' : '';
    return (
      '<div class="' +
      cls +
      '">' +
      '<span class="ea-snapshot-label">' +
      VITAL_LABELS[key] +
      '</span>' +
      '<span class="ea-snapshot-value">' +
      displayValue(val) +
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
            return '<span class="ea-snapshot-glu-chip">' + displayValue(g.value) + ' mg/dL' + t + '</span>';
          })
          .join('')
      : '<span class="ea-muted">—</span>';

  return (
    '<section class="ea-section ea-card ea-snapshot-strip" id="ea-snapshot">' +
    '<div class="ea-snapshot-strip-head">' +
    '<h3 class="ea-section-title">Snapshot actual</h3>' +
    '<p class="ea-muted ea-snapshot-hint">Último valor registrado por parámetro</p>' +
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
    ' cc</span></div>' +
    '<div><span class="ea-snapshot-label">Egresos</span><span class="ea-snapshot-io-val">' +
    displayValue(snapshot.io.egr) +
    ' cc</span></div>' +
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
      var glus = Array.isArray(row.glucometrias) ? row.glucometrias : [];
      glus.forEach(function (g) {
        if (g && g.value != null && g.value !== '') {
          parts.push('Glu ' + g.value + (g.time ? ' @ ' + g.time : ''));
        }
      });
      var io = row.io || {};
      if (io.ing != null && io.ing !== '') parts.push('Ing ' + io.ing);
      if (io.egr != null && io.egr !== '') parts.push('Egr ' + io.egr);
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

function buildFormSection() {
  var vitalFields = VITAL_KEYS.map(function (key) {
    return (
      '<div class="vital-box ea-vital-box" data-ea-vital-box="' +
      key +
      '">' +
      '<div class="vital-label">' +
      '<span class="ea-vital-name">' +
      VITAL_LABELS[key] +
      '</span>' +
      '<span class="ea-vital-unit">' +
      (VITAL_UNITS[key] || '') +
      '</span></div>' +
      '<input type="number" class="ea-vital-input" data-ea-vital="' +
      key +
      '" step="any" inputmode="decimal" placeholder="—" aria-label="' +
      VITAL_LABELS[key] +
      '">' +
      '<div class="ea-altered-slot ea-altered-slot--hidden" data-ea-altered-wrap="' +
      key +
      '" hidden>' +
      '<span class="ea-altered-label">Alterado</span>' +
      '<input type="time" class="ea-altered-time-input" data-ea-altered="' +
      key +
      '" aria-label="Hora ' +
      VITAL_LABELS[key] +
      ' alterado">' +
      '</div></div>'
    );
  }).join('');

  return (
    '<section class="ea-section ea-card ea-form-card">' +
    '<h3 class="ea-section-title">Registrar medición</h3>' +
    '<form id="ea-form" class="ea-form" onsubmit="return false;">' +
    '<label class="ea-field ea-field--datetime">' +
    '<span class="ea-label">Fecha y hora del registro</span>' +
    '<input type="datetime-local" class="ea-input" id="ea-recorded-at" value="' +
    toDatetimeLocalValue(new Date()) +
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
    '<label class="ea-field">' +
    '<span class="ea-label">Egresos (cc o NC)</span>' +
    '<input type="text" class="ea-input" id="ea-io-egr" inputmode="text" autocomplete="off" placeholder="cc o NC">' +
    '</label>' +
    '<div class="ea-field ea-io-balance">' +
    '<span class="ea-label">Balance turno</span>' +
    '<span id="ea-balance-turno-live" class="ea-balance-live">—</span>' +
    '</div>' +
    '</div>' +
    '<div class="ea-form-actions">' +
    '<button type="button" class="ea-btn ea-btn--primary" onclick="registrarEstadoActualMedicion()">Registrar</button>' +
    '</div>' +
    '</form>' +
    '</section>'
  );
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
    renderEstadoClinicoSection(monitoreo, activeId, patient) +
    buildFormSection() +
    renderSnapshotSection(snapshot, balTurno, balGlobal) +
    renderHistorialSection(Array.isArray(monitoreo.historial) ? monitoreo.historial : []) +
    '<div id="ea-charts-mount" class="ea-charts-mount"><p class="ea-muted ea-charts-loading">Cargando tendencias…</p></div>' +
    '<section class="ea-section ea-card">' +
    '<div class="ea-texto-head">' +
    '<h3 class="ea-section-title">Texto Estado Actual</h3>' +
    '<button type="button" class="ea-btn ea-btn--ghost" onclick="regenerarEstadoActualTexto()">Regenerar</button>' +
    '</div>' +
    '<textarea id="ea-texto" class="ea-texto" rows="8" placeholder="Generando texto…"></textarea>' +
    '</section>' +
    '</div>';

  restoreEaPanelUiState(mount, eaUiState);

  var gluList = mount.querySelector('#ea-glu-list');
  if (gluList) gluList.appendChild(buildGluRow());

  var form = mount.querySelector('#ea-form');
  wireFormInteractions(form);
  wireEstadoClinicoInteractions(mount, patient);

  var chartsMount = mount.querySelector('#ea-charts-mount');
  var finishDeferred = function () {
    syncEstadoActualTextarea(monitoreo, patient);
    if (chartsMount) renderEstadoActualCharts(/** @type {HTMLElement} */ (chartsMount), monitoreo);
    if (onReady) onReady();
  };

  if (opts.syncHeavy) {
    finishDeferred();
    return;
  }

  scheduleAfterPaint(function () {
    scheduleIdle(finishDeferred);
  });
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

  var alteredDefaults = buildAlteredAtDefaults(vitals, defaultTime);
  /** @type {Record<string, string>} */
  var alteredAt = {};
  Object.keys(alteredDefaults).forEach(function (key) {
    var el = form.querySelector('[data-ea-altered="' + key + '"]');
    var val = el && 'value' in el && el.value ? String(el.value) : alteredDefaults[key];
    if (val) alteredAt[key] = val;
  });

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

  return {
    id: Date.now().toString() + '-ea',
    recordedAt: recordedAt,
    vitals: vitals,
    alteredAt: alteredAt,
    glucometrias: glucometrias,
    io: {
      ing: parseNumOrNull(ingEl && 'value' in ingEl ? ingEl.value : ''),
      egr: parseIoEgresoField(egrEl && 'value' in egrEl ? egrEl.value : ''),
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
  renderEstadoActualPanel({ syncHeavy: true });
  rt.showToast('Medición registrada ✓', 'success');
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
};
