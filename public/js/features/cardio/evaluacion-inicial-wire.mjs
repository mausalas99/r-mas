/**
 * DOM wiring + persistence for "Eval. inicial" (Document 2) — mounted at
 * `#exp-pane-evaluacion-inicial` (Sala only, see `expediente-tabs.mjs` and
 * `expediente-inner-cache.mjs`). Mirrors `estado-actual-cardio-wire.mjs`'s
 * persist pattern (`persistClinicalState()` + `scheduleCloudSyncPush()`) and
 * reuses its `applyCardioFieldChange` for the two canonical top-level
 * `patient.cardio` fields this screen edits in place (etiología, fenotipo —
 * both `data-ea-cardio`, same attribute the Identidad card already uses).
 */
import { getPatients, getLabHistory, persistClinicalState } from '../../app-state.mjs';
import { scheduleCloudSyncPush } from '../cloud-sync/mutate-bridge.mjs';
import { rt } from '../app-tabs-runtime.mjs';
import { ensureCardio } from '../../../../lib/cardio/patient-cardio.mjs';
import { upsertPocusDay } from '../../../../lib/cardio/congestion.mjs';
import { applyCardioFieldChange } from './estado-actual-cardio-wire.mjs';
import { addMedicamentoPrevioRow, removeMedicamentoPrevioRow, updateMedicamentoPrevioField } from './hf-field-kit.mjs';
import { buildEvaluacionInicialHtml, EVALUACION_INICIAL_STEP_COUNT, composeDurationValue } from './evaluacion-inicial-html.mjs';
import {
  normalizeEvaluacionInicial,
  withTopLevelFieldChange,
  withSectionFieldChange,
  withUsPulmonarCampoChange,
  withUsPulmonarNotaChange,
  withRxToraxNotaChange,
  withRxToraxHallazgoToggle,
  buildCongestionSyncRecord,
  findNearestLabSetForDate,
  withLabsIngresoAutofill,
  isTopLevelStringKey,
  isTopLevelNumberKey,
  isTopLevelTriKey,
} from './evaluacion-inicial-data.mjs';

/**
 * Current wizard step per mount, so re-renders triggered by field edits
 * (e.g. adding/removing a medicamento previo row) keep the user on the same
 * step instead of snapping back to step 0. The mount node persists across
 * tab hide/show (see `expediente-inner-cache.mjs`'s render cache), so this
 * is only reset when a fresh `<div>` mount is created (patient/mode switch).
 */
var stepByMount = new WeakMap();

function getStep(mount) {
  return stepByMount.get(mount) || 0;
}

function setStep(mount, step) {
  stepByMount.set(mount, Math.max(0, Math.min(EVALUACION_INICIAL_STEP_COUNT - 1, step)));
}

function activePatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return getPatients().find(function (p) {
    return String(p.id) === String(id);
  }) || null;
}

function persist() {
  persistClinicalState();
  scheduleCloudSyncPush();
}

function elValue(el) {
  return 'value' in el ? String(el.value) : '';
}

function wireTopLevel(mount, patient) {
  mount.querySelectorAll('[data-hf-ei]').forEach(function (el) {
    var key = el.getAttribute('data-hf-ei');
    if (!key || (!isTopLevelStringKey(key) && !isTopLevelNumberKey(key) && !isTopLevelTriKey(key))) return;
    var tag = (el.tagName || '').toUpperCase();
    var evt = tag === 'SELECT' || el.type === 'date' ? 'change' : 'input';
    el.addEventListener(evt, function () {
      var result = withTopLevelFieldChange(patient.cardio.evaluacionInicial, key, elValue(el));
      if (!result.changed) return;
      patient.cardio.evaluacionInicial = result.evaluacionInicial;
      persist();
    });
  });
}

// Duration pickers (e.g. "tiempo de evolución") post as two split inputs
// (data-hf-ei-duration-n / -duration-unit) instead of the plain [data-hf-ei]
// text field, so they compose back into one string before writing.
function wireDurationFields(mount, patient) {
  var numberEls = mount.querySelectorAll('[data-hf-ei-duration-n]');
  numberEls.forEach(function (numberEl) {
    var key = numberEl.getAttribute('data-hf-ei-duration-n');
    var unitEl = mount.querySelector('[data-hf-ei-duration-unit="' + key + '"]');
    if (!key || !unitEl) return;
    var handler = function () {
      var composed = composeDurationValue(numberEl.value, unitEl.value);
      var result = withTopLevelFieldChange(patient.cardio.evaluacionInicial, key, composed);
      if (!result.changed) return;
      patient.cardio.evaluacionInicial = result.evaluacionInicial;
      persist();
    };
    numberEl.addEventListener('input', handler);
    unitEl.addEventListener('change', handler);
  });
}

function wireSection(mount, patient, dataAttr, section) {
  mount.querySelectorAll('[data-' + dataAttr + ']').forEach(function (el) {
    var key = el.getAttribute('data-' + dataAttr);
    if (!key) return;
    var tag = (el.tagName || '').toUpperCase();
    var evt = tag === 'SELECT' || el.type === 'date' ? 'change' : 'input';
    el.addEventListener(evt, function () {
      var result = withSectionFieldChange(patient.cardio.evaluacionInicial, section, key, elValue(el));
      if (!result.changed) return;
      patient.cardio.evaluacionInicial = result.evaluacionInicial;
      persist();
    });
  });
}

/**
 * "Fecha de labs" autofills the rest of `labsIngreso` from the nearest lab
 * paste on or before that date, instead of the doctor re-typing values
 * already parsed by the SOME-paste pipeline.
 */
function wireLabsIngresoFecha(mount, patient) {
  var fechaEl = mount.querySelector('[data-hf-ei-labs="fecha"]');
  if (!fechaEl) return;
  fechaEl.addEventListener('change', function () {
    var iso = elValue(fechaEl);
    var history = getLabHistory()[patient.id] || [];
    var set = findNearestLabSetForDate(history, iso);
    patient.cardio.evaluacionInicial = withLabsIngresoAutofill(patient.cardio.evaluacionInicial, iso, set);
    persist();
    renderEvaluacionInicialPanel(mount);
  });
}

function wireUsPulmonar(mount, patient) {
  ['lineasb', 'derrame', 'consolidacion'].forEach(function (fieldName) {
    var field = fieldName === 'lineasb' ? 'lineasB' : fieldName;
    mount.querySelectorAll('[data-hf-ei-uspulmonar-' + fieldName + ']').forEach(function (el) {
      var idx = Number(el.getAttribute('data-hf-ei-uspulmonar-' + fieldName));
      var tag = (el.tagName || '').toUpperCase();
      el.addEventListener(tag === 'SELECT' ? 'change' : 'input', function () {
        var result = withUsPulmonarCampoChange(patient.cardio.evaluacionInicial, idx, field, elValue(el));
        patient.cardio.evaluacionInicial = result.evaluacionInicial;
        persist();
      });
    });
  });
  var notaEl = mount.querySelector('[data-hf-ei-uspulmonar="nota"]');
  if (notaEl) {
    notaEl.addEventListener('input', function () {
      var result = withUsPulmonarNotaChange(patient.cardio.evaluacionInicial, elValue(notaEl));
      patient.cardio.evaluacionInicial = result.evaluacionInicial;
      persist();
    });
  }
}

function wireRxTorax(mount, patient) {
  mount.querySelectorAll('[data-hf-ei-rxtorax-hallazgo]').forEach(function (el) {
    var value = el.getAttribute('data-hf-ei-rxtorax-hallazgo');
    el.addEventListener('change', function () {
      var result = withRxToraxHallazgoToggle(patient.cardio.evaluacionInicial, value, !!el.checked);
      patient.cardio.evaluacionInicial = result.evaluacionInicial;
      persist();
    });
  });
  var notaEl = mount.querySelector('[data-hf-ei-rxtorax="nota"]');
  if (notaEl) {
    notaEl.addEventListener('input', function () {
      var result = withRxToraxNotaChange(patient.cardio.evaluacionInicial, elValue(notaEl));
      patient.cardio.evaluacionInicial = result.evaluacionInicial;
      persist();
    });
  }
}

function wireCanonicalCardioFields(mount, patient) {
  mount.querySelectorAll('[data-ea-cardio]').forEach(function (el) {
    el.addEventListener('change', function () {
      applyCardioFieldChange(el, patient, persist, function () {});
    });
  });
}

function wireMedicamentosPrevios(mount, patient) {
  mount.querySelectorAll('[data-hf-medprevio-field]').forEach(function (el) {
    var field = el.getAttribute('data-hf-medprevio-field');
    var id = el.getAttribute('data-hf-medprevio-id');
    el.addEventListener('input', function () {
      patient.cardio.evaluacionInicial.medicamentosPrevios = updateMedicamentoPrevioField(
        patient.cardio.evaluacionInicial.medicamentosPrevios,
        id,
        field,
        elValue(el)
      );
      persist();
    });
  });
  var addBtn = mount.querySelector('[data-hf-medprevio-action="add"]');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      patient.cardio.evaluacionInicial.medicamentosPrevios = addMedicamentoPrevioRow(
        patient.cardio.evaluacionInicial.medicamentosPrevios
      );
      persist();
      renderEvaluacionInicialPanel(mount);
    });
  }
  mount.querySelectorAll('[data-hf-medprevio-action="remove"]').forEach(function (el) {
    el.addEventListener('click', function () {
      var id = el.getAttribute('data-hf-medprevio-id');
      patient.cardio.evaluacionInicial.medicamentosPrevios = removeMedicamentoPrevioRow(
        patient.cardio.evaluacionInicial.medicamentosPrevios,
        id
      );
      persist();
      renderEvaluacionInicialPanel(mount);
    });
  });
}

function wireCongestionSync(mount, patient) {
  var btn = mount.querySelector('[data-hf-ei-action="sync-congestion"]');
  if (!btn) return;
  btn.addEventListener('click', function () {
    syncEvaluacionInicialToPocusDay(patient);
    persist();
  });
}

/**
 * Congestion-score step: writes this intake's VExUS/date snapshot into
 * `patient.cardio.pocusByDay` via `upsertPocusDay()`, keyed to the intake's
 * `fecha` — reuses the existing congestion-score mechanism instead of a
 * parallel store. No-op when `fecha` is blank.
 * @param {{ cardio?: Record<string, any> }} patient
 */
export function syncEvaluacionInicialToPocusDay(patient) {
  if (!patient || !patient.cardio) return;
  var record = buildCongestionSyncRecord(patient.cardio.evaluacionInicial);
  if (!record.date) return;
  patient.cardio.pocusByDay = upsertPocusDay(patient.cardio.pocusByDay, record);
}

function wireStepNav(mount) {
  var backBtn = mount.querySelector('[data-hf-ei-step-action="back"]');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      setStep(mount, getStep(mount) - 1);
      renderEvaluacionInicialPanel(mount);
    });
  }
  var nextBtn = mount.querySelector('[data-hf-ei-step-action="next"]');
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      setStep(mount, getStep(mount) + 1);
      renderEvaluacionInicialPanel(mount);
    });
  }
}

function wireEvaluacionInicialForm(mount, patient) {
  wireTopLevel(mount, patient);
  wireDurationFields(mount, patient);
  wireSection(mount, patient, 'hf-ei-trat', 'tratamientoPrevio');
  wireSection(mount, patient, 'hf-ei-expl', 'exploracion');
  wireSection(mount, patient, 'hf-ei-vexus', 'vexusInicial');
  wireSection(mount, patient, 'hf-ei-labs', 'labsIngreso');
  wireLabsIngresoFecha(mount, patient);
  wireUsPulmonar(mount, patient);
  wireRxTorax(mount, patient);
  wireCanonicalCardioFields(mount, patient);
  wireMedicamentosPrevios(mount, patient);
  wireCongestionSync(mount, patient);
  wireStepNav(mount);
}

/**
 * @param {HTMLElement|null|undefined} mount
 */
export function renderEvaluacionInicialPanel(mount) {
  if (!mount) return;
  var patient = activePatient();
  if (!patient) {
    mount.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  ensureCardio(patient);
  patient.cardio.evaluacionInicial = normalizeEvaluacionInicial(patient.cardio.evaluacionInicial);
  mount.innerHTML = buildEvaluacionInicialHtml(patient.cardio.evaluacionInicial, patient.cardio, getStep(mount));
  wireEvaluacionInicialForm(mount, patient);
}
