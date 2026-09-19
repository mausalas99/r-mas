/**
 * DOM wiring + persistence for the "Eventualidades" follow-up wizard —
 * mounted at `#exp-pane-eventualidades` (Sala only). Combines Consulta IC's
 * date-driven entry find/ensure flow (`consulta-ic-wire.mjs`) with Eval.
 * inicial's per-mount step/modal WeakMap pattern and field reducers
 * (`evaluacion-inicial-wire.mjs`/`evaluacion-inicial-data.mjs` — reused
 * directly, not copied, since they're pure functions keyed off the same
 * `exploracion`/`vexusInicial`/`usPulmonar`/`rxTorax`/`labsIngreso`
 * sub-shapes this entry uses).
 */
import { getPatients, getLabHistory, persistClinicalState } from '../../app-state.mjs';
import { scheduleCloudSyncPush } from '../cloud-sync/mutate-bridge.mjs';
import { rt } from '../app-tabs-runtime.mjs';
import { ensureCardio } from '../../../../lib/cardio/patient-cardio.mjs';
import {
  findEventualidadEntry,
  ensureEventualidadEntryForDate,
  listEventualidadDatesDesc,
} from '../../../../lib/cardio/eventualidad-seguimiento.mjs';
import { todayYmd } from './consulta-ic-data.mjs';
import { promptHistoryEditUnlock } from '../../history-edit-unlock.mjs';
import { wireCardioImageAttach } from './cardio-image-attach.mjs';
import { buildEventualidadSeguimientoHtml, EVENTUALIDAD_STEP_COUNT } from './eventualidad-seguimiento-html.mjs';
import {
  withSectionFieldChange,
  withUsPulmonarCampoChange,
  withUsPulmonarNotaChange,
  withRxToraxNotaChange,
  withRxToraxHallazgoToggle,
  findNearestLabSetForDate,
  withLabsIngresoAutofill,
} from './evaluacion-inicial-data.mjs';

var stateByMount = new WeakMap();

function getState(mount) {
  return stateByMount.get(mount) || { date: '', step: 0, modal: null, side: 'D', unlocked: false };
}

function isLocked(mount) {
  var st = getState(mount);
  return !!st.date && st.date !== todayYmd() && !st.unlocked;
}

/** Disables every field so a past-date entry can't be edited by accident. */
function applyLockToDom(mount) {
  if (!isLocked(mount)) return;
  mount.querySelectorAll('input, select, textarea').forEach(function (el) {
    if (el.hasAttribute('data-hf-consulta-date')) return;
    el.disabled = true;
  });
}

function wireHistoryEditUnlock(mount, patient) {
  var btn = mount.querySelector('[data-hf-history-edit="unlock"]');
  if (!btn) return;
  btn.addEventListener('click', async function () {
    if (!(await promptHistoryEditUnlock())) return;
    setState(mount, { unlocked: true });
    renderEventualidadSeguimientoPanel(mount);
  });
}

function setState(mount, patch) {
  stateByMount.set(mount, Object.assign({}, getState(mount), patch));
}

function activePatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return getPatients().find(function (p) { return String(p.id) === String(id); }) || null;
}

function persist() {
  persistClinicalState();
  scheduleCloudSyncPush();
}

function elValue(el) {
  return 'value' in el ? String(el.value) : '';
}

function currentEntry(mount, patient) {
  var st = getState(mount);
  var date = st.date || todayYmd();
  var before = findEventualidadEntry(patient.cardio, date);
  var entry = ensureEventualidadEntryForDate(patient, date);
  if (!before) persist();
  return entry;
}

/**
 * Reads the entry fresh from `patient.cardio.eventualidadesSeguimiento` at
 * event-handler call time (not a value captured at render time) — since
 * most edits below don't re-render, two edits in a row would otherwise both
 * compute their patch from the same stale render-time `entry` and the
 * second `persistEntry` call would silently clobber the first (mirrors
 * `evaluacion-inicial-wire.mjs` reading `patient.cardio.evaluacionInicial`
 * directly in every handler instead of a captured variable).
 */
function liveEntry(mount, patient) {
  return findEventualidadEntry(patient.cardio, getState(mount).date) || currentEntry(mount, patient);
}

function wireVisitDate(mount, patient) {
  var el = mount.querySelector('[data-hf-consulta-date]');
  if (!el) return;
  el.addEventListener('change', function () {
    var next = elValue(el).trim() || todayYmd();
    setState(mount, { date: next, step: 0, modal: null, unlocked: false });
    renderEventualidadSeguimientoPanel(mount);
  });
}

function wireSection(mount, patient, dataAttr, section) {
  mount.querySelectorAll('[data-' + dataAttr + ']').forEach(function (el) {
    var key = el.getAttribute('data-' + dataAttr);
    if (!key) return;
    var tag = (el.tagName || '').toUpperCase();
    var evt = tag === 'SELECT' || el.type === 'date' ? 'change' : 'input';
    el.addEventListener(evt, function () {
      var result = withSectionFieldChange(liveEntry(mount, patient), section, key, elValue(el));
      if (!result.changed) return;
      persistEntry(mount, patient, result.evaluacionInicial);
    });
  });
}

function wireTopLevelTextareas(mount, patient) {
  ['ecgIngreso', 'impresionDiagnostica', 'planTerapeutico'].forEach(function (key) {
    var el = mount.querySelector('[data-hf-ei="' + key + '"]');
    if (!el) return;
    el.addEventListener('input', function () {
      var next = Object.assign({}, liveEntry(mount, patient), { [key]: elValue(el) });
      persistEntry(mount, patient, next);
    });
  });
  ['feviEstimadaInicial', 'nau2hPostBolo', 'gastoUrinario6h'].forEach(function (key) {
    var el = mount.querySelector('[data-hf-ei="' + key + '"]');
    if (!el) return;
    el.addEventListener('input', function () {
      var raw = elValue(el);
      var next = Object.assign({}, liveEntry(mount, patient), { [key]: raw === '' ? null : Number(raw) });
      persistEntry(mount, patient, next);
    });
  });
}

function wireUsPulmonar(mount, patient) {
  ['lineasb', 'derrame', 'consolidacion'].forEach(function (fieldName) {
    var field = fieldName === 'lineasb' ? 'lineasB' : fieldName;
    mount.querySelectorAll('[data-hf-ei-uspulmonar-' + fieldName + ']').forEach(function (el) {
      var idx = Number(el.getAttribute('data-hf-ei-uspulmonar-' + fieldName));
      var tag = (el.tagName || '').toUpperCase();
      el.addEventListener(tag === 'SELECT' ? 'change' : 'input', function () {
        var result = withUsPulmonarCampoChange(liveEntry(mount, patient), idx, field, elValue(el));
        persistEntry(mount, patient, result.evaluacionInicial);
      });
    });
  });
  var notaEl = mount.querySelector('[data-hf-ei-uspulmonar="nota"]');
  if (notaEl) {
    notaEl.addEventListener('input', function () {
      var result = withUsPulmonarNotaChange(liveEntry(mount, patient), elValue(notaEl));
      persistEntry(mount, patient, result.evaluacionInicial);
    });
  }
}

function wireRxTorax(mount, patient) {
  mount.querySelectorAll('[data-hf-ei-rxtorax-hallazgo]').forEach(function (el) {
    var value = el.getAttribute('data-hf-ei-rxtorax-hallazgo');
    el.addEventListener('change', function () {
      var result = withRxToraxHallazgoToggle(liveEntry(mount, patient), value, !!el.checked);
      persistEntry(mount, patient, result.evaluacionInicial);
    });
  });
  var notaEl = mount.querySelector('[data-hf-ei-rxtorax="nota"]');
  if (notaEl) {
    notaEl.addEventListener('input', function () {
      var result = withRxToraxNotaChange(liveEntry(mount, patient), elValue(notaEl));
      persistEntry(mount, patient, result.evaluacionInicial);
    });
  }
}

function wireLabsIngresoFecha(mount, patient) {
  var fechaEl = mount.querySelector('[data-hf-ei-labs="fecha"]');
  if (!fechaEl) return;
  fechaEl.addEventListener('change', function () {
    var iso = elValue(fechaEl);
    var history = getLabHistory()[patient.id] || [];
    var set = findNearestLabSetForDate(history, iso);
    var next = withLabsIngresoAutofill(liveEntry(mount, patient), iso, set);
    persistEntry(mount, patient, next, { rerender: true });
  });
}

function wireStepNav(mount) {
  var backBtn = mount.querySelector('[data-hf-ev-step-action="back"]');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      var st = getState(mount);
      setState(mount, { step: Math.max(0, st.step - 1), modal: null });
      renderEventualidadSeguimientoPanel(mount);
    });
  }
  var nextBtn = mount.querySelector('[data-hf-ev-step-action="next"]');
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      var st = getState(mount);
      setState(mount, { step: Math.min(EVENTUALIDAD_STEP_COUNT - 1, st.step + 1), modal: null });
      renderEventualidadSeguimientoPanel(mount);
    });
  }
  mount.querySelectorAll('[data-hf-ev-step-jump]').forEach(function (el) {
    el.addEventListener('click', function () {
      setState(mount, { step: Number(el.getAttribute('data-hf-ev-step-jump')), modal: null });
      renderEventualidadSeguimientoPanel(mount);
    });
  });
}

function wireExplorationModal(mount) {
  mount.querySelectorAll('[data-hf-ei-modal-open]').forEach(function (el) {
    el.addEventListener('click', function () {
      setState(mount, { modal: el.getAttribute('data-hf-ei-modal-open'), side: 'D' });
      renderEventualidadSeguimientoPanel(mount);
    });
  });
  var closeBtn = mount.querySelector('[data-hf-ei-modal-action="close"]');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      setState(mount, { modal: null });
      renderEventualidadSeguimientoPanel(mount);
    });
  }
  var backdrop = mount.querySelector('[data-hf-ei-modal-backdrop]');
  if (backdrop) {
    backdrop.addEventListener('click', function () {
      setState(mount, { modal: null });
      renderEventualidadSeguimientoPanel(mount);
    });
  }
  mount.querySelectorAll('[data-hf-ei-uspulmonar-side]').forEach(function (el) {
    el.addEventListener('click', function () {
      setState(mount, { side: el.getAttribute('data-hf-ei-uspulmonar-side') });
      renderEventualidadSeguimientoPanel(mount);
    });
  });
}

/**
 * Persists a next-entry value into `patient.cardio.eventualidadesSeguimiento`.
 * No re-render by default — the edited control's own DOM value is already
 * correct, and re-rendering on every keystroke/select would steal focus
 * (same convention as `evaluacion-inicial-wire.mjs`). Pass `{rerender:true}`
 * only when another field's displayed value must change too (e.g. the labs
 * autofill).
 */
function persistEntry(mount, patient, nextEntry, opts) {
  patient.cardio.eventualidadesSeguimiento = upsertInPlace(patient.cardio.eventualidadesSeguimiento, nextEntry);
  persist();
  if (opts && opts.rerender) renderEventualidadSeguimientoPanel(mount);
}

function upsertInPlace(list, entry) {
  var out = Array.isArray(list) ? list.slice() : [];
  var idx = out.findIndex(function (r) { return r && r.date === entry.date; });
  if (idx >= 0) out[idx] = entry;
  else out.push(entry);
  return out;
}

function wireForm(mount, patient) {
  wireVisitDate(mount, patient);
  wireSection(mount, patient, 'hf-ei-expl', 'exploracion');
  wireSection(mount, patient, 'hf-ei-vexus', 'vexusInicial');
  wireTopLevelTextareas(mount, patient);
  wireUsPulmonar(mount, patient);
  wireRxTorax(mount, patient);
  wireLabsIngresoFecha(mount, patient);
  wireStepNav(mount);
  wireExplorationModal(mount);
  wireHistoryEditUnlock(mount, patient);
  wireCardioImageAttach(mount, {
    patientId: patient.id,
    visitModule: 'eventualidad',
    visitDate: getState(mount).date,
    locked: isLocked(mount),
  });
  applyLockToDom(mount);
}

/**
 * @param {HTMLElement|null|undefined} mount
 */
export function renderEventualidadSeguimientoPanel(mount) {
  if (!mount) return;
  var patient = activePatient();
  if (!patient) {
    mount.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  ensureCardio(patient);
  var st = getState(mount);
  if (!st.date) {
    st = Object.assign({}, st, { date: todayYmd() });
    setState(mount, { date: st.date });
  }
  var entry = currentEntry(mount, patient);
  if (!entry.labsIngreso || !entry.labsIngreso.fecha) {
    var history = getLabHistory()[patient.id] || [];
    var set = findNearestLabSetForDate(history, st.date);
    entry = withLabsIngresoAutofill(entry, st.date, set);
    patient.cardio.eventualidadesSeguimiento = upsertInPlace(patient.cardio.eventualidadesSeguimiento, entry);
    persist();
  }
  mount.innerHTML = buildEventualidadSeguimientoHtml({
    date: st.date,
    existingDates: listEventualidadDatesDesc(patient.cardio),
    entry: entry,
    step: st.step,
    modal: st.modal,
    side: st.side,
    locked: isLocked(mount),
  });
  wireForm(mount, patient);
}
