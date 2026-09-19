/**
 * Mount + wiring for the "Consulta IC" screen (Document 1 — outpatient HF
 * follow-up visit, Part C Phase 4). Full-panel mount + delegated
 * change/click listeners, following `medications-cardio-mount.mjs`'s
 * pattern (not the modal-embedded pattern of `estado-actual-cardio-wire.mjs`,
 * since this screen is its own Clínico segment, not a card modal).
 */
import { ensureCardio } from '../../../../lib/cardio/patient-cardio.mjs';
import { prefillFromImportedLabs } from '../../../../lib/cardio/hf-labs.mjs';
import { persistClinicalState } from '../../app-state.mjs';
import { scheduleCloudSyncPush } from '../cloud-sync/mutate-bridge.mjs';
import { findPatientById } from '../estado-actual-panel-core.mjs';
import { rt } from '../app-tabs-runtime.mjs';
import { switchAppTab } from '../app-tabs.mjs';
import {
  addComorbilidadRow,
  removeComorbilidadRow,
  updateComorbilidadField,
} from './hf-field-kit.mjs';
import {
  todayYmd,
  findConsultaEntry,
  ensureConsultaEntryForDate,
  listConsultaDatesDesc,
  parseTriState,
  buildLabHistoryForPrefill,
  upsertConsultaEntry,
  upsertLabSnapshot,
  emptyLabSnapshot,
  latestTwoSnapshots,
  upsertEchoStudy,
  emptyEchoStudy,
  latestTwoEchoStudies,
  upsertScoreEntry,
  emptyScoreEntry,
  latestTwoScores,
} from './consulta-ic-data.mjs';
import { renderConsultaIcHtml, CONSULTA_IC_STEP_COUNT, WORKUP_GROUP_COUNT } from './consulta-ic-html.mjs';
import { promptHistoryEditUnlock } from '../../history-edit-unlock.mjs';
import { wireCardioImageAttach } from './cardio-image-attach.mjs';

var CONTAINER_ID = 'consulta-ic-container';

var currentDate = null;
var unlocked = false;

function isLocked() {
  return !!currentDate && currentDate !== todayYmd() && !unlocked;
}

/** Disables every field so a past-date entry can't be edited by accident. */
function applyLockToDom(el) {
  if (!isLocked()) return;
  el.querySelectorAll('input, select, textarea').forEach(function (field) {
    if (field.hasAttribute('data-hf-consulta-date')) return;
    field.disabled = true;
  });
}
var labDraft = {};
var echoDraft = {};
var scoreDraft = {};
var cerrarConsultaDraft = {};

/**
 * Current wizard step per container, so re-renders triggered by field edits
 * keep the user on the same step instead of snapping back to step 0 (same
 * WeakMap-by-mount technique as `evaluacion-inicial-wire.mjs`, since a full
 * `innerHTML` re-render on every change would otherwise wipe any DOM-held
 * step state).
 */
var stepByContainer = new WeakMap();

function getStep(el) {
  return stepByContainer.get(el) || 0;
}

function setStep(el, step) {
  stepByContainer.set(el, Math.max(0, Math.min(CONSULTA_IC_STEP_COUNT - 1, step)));
}

/** Which of the workup's 9 subsystem tabs (Paso 3) is showing — same
 * per-container WeakMap pattern as `stepByContainer`. */
var workupTabByContainer = new WeakMap();

function getWorkupTab(el) {
  return workupTabByContainer.get(el) || 0;
}

function setWorkupTab(el, tab) {
  workupTabByContainer.set(el, Math.max(0, Math.min(WORKUP_GROUP_COUNT - 1, tab)));
}

/** Which glance-card modal (labs/eco table or entry form, scores) is open,
 * or null — same WeakMap-by-container pattern, so a re-render triggered by
 * a field edit inside the modal doesn't close it. */
var modalByContainer = new WeakMap();

function getModal(el) {
  return modalByContainer.get(el) || null;
}

function setModal(el, key) {
  modalByContainer.set(el, key || null);
}

function resetDrafts() {
  labDraft = {};
  echoDraft = {};
  scoreDraft = {};
  cerrarConsultaDraft = {};
}

function currentPatient() {
  var activeId = rt.getActiveId();
  if (!activeId) return null;
  var patient = findPatientById(activeId);
  if (!patient) return null;
  ensureCardio(patient);
  return patient;
}

function persist() {
  persistClinicalState();
  scheduleCloudSyncPush();
}

function persistAndRerender() {
  persist();
  renderConsultaIc();
}

function container() {
  return document.getElementById(CONTAINER_ID);
}

function buildLabsCtx(patient) {
  var latest = latestTwoSnapshots(patient.cardio.labSnapshots);
  if (!labDraft.date) labDraft.date = currentDate;
  return { previo: latest.previo, actual: latest.actual, draft: labDraft };
}

function buildEchoCtx(patient) {
  var latest = latestTwoEchoStudies(patient.cardio.echoStudies);
  if (!echoDraft.date) echoDraft.date = currentDate;
  return { previo: latest.previo, actual: latest.actual, draft: echoDraft };
}

function buildScoresCtx(patient) {
  var latest = latestTwoScores(patient.cardio.scores);
  if (!scoreDraft.date) scoreDraft.date = currentDate;
  return { previo: latest.previo, actual: latest.actual, draft: scoreDraft };
}

function handleVisitDateChange(target) {
  var next = String(target.value || '').trim() || todayYmd();
  if (next === currentDate) return;
  currentDate = next;
  unlocked = false;
  resetDrafts();
  var patient = currentPatient();
  if (!patient) return;
  var before = findConsultaEntry(patient.cardio, currentDate);
  ensureConsultaEntryForDate(patient, currentDate);
  if (!before) persist();
  renderConsultaIc();
}

function handleConsultaFieldChange(patient, target) {
  var key = target.getAttribute('data-hf-consulta');
  if (!key) return;
  var patch = { date: currentDate };
  patch[key] = 'value' in target ? String(target.value) : '';
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, patch);
  persist();
}

/** TA is entered as two number inputs (sistólica/diastólica) but stored as
 * one string field (`entry.ta`, e.g. "120/80") — reads both siblings from
 * the same field container and joins them back together. Not
 * `handleConsultaFieldChange`: that handler assumes one stored key per
 * input, TA needs two inputs merged into one. */
function handleConsultaTaChange(patient, target) {
  var container = target.closest('.ea-field') || target.parentElement;
  var inputs = (container || document).querySelectorAll('[data-hf-consulta-ta]');
  var sis = '';
  var dia = '';
  inputs.forEach(function (input) {
    var part = input.getAttribute('data-hf-consulta-ta');
    var v = String(input.value || '').trim();
    if (part === 'sistolica') sis = v;
    else if (part === 'diastolica') dia = v;
  });
  var patch = { date: currentDate };
  patch.ta = sis && dia ? sis + '/' + dia : sis || dia || '';
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, patch);
  persist();
}

function handleConsultaTriChange(patient, target) {
  var key = target.getAttribute('data-hf-consulta-tri');
  if (!key) return;
  var patch = { date: currentDate };
  patch[key] = parseTriState(String(target.value));
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, patch);
  persist();
}

function handleConsultaSubjChange(patient, target) {
  var key = target.getAttribute('data-hf-consulta-subj');
  if (!key) return;
  var subjetivo = {};
  subjetivo[key] = String(target.value || '');
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, { date: currentDate, subjetivo: subjetivo });
  persist();
}

function handleConsultaObjChange(patient, target) {
  var key = target.getAttribute('data-hf-consulta-obj');
  if (!key) return;
  var objetivo = {};
  objetivo[key] = String(target.value || '');
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, { date: currentDate, objetivo: objetivo });
  persist();
}

function handleConsultaObjTriChange(patient, target) {
  var key = target.getAttribute('data-hf-consulta-obj-tri');
  if (!key) return;
  var objetivo = {};
  objetivo[key] = parseTriState(String(target.value));
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, { date: currentDate, objetivo: objetivo });
  persist();
}

function handleConsultaGdmtChange(patient, target) {
  var key = target.getAttribute('data-hf-consulta-gdmt');
  if (!key) return;
  var gdmt = {};
  gdmt[key] = parseTriState(String(target.value));
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, {
    date: currentDate,
    gdmtMaxTolerada: gdmt,
  });
  persist();
}

function handleConsultaDosisTituladaChange(patient, target) {
  var key = target.getAttribute('data-hf-consulta-dosis-titulada');
  if (!key) return;
  var dosisTitulada = {};
  dosisTitulada[key] = String(target.value || '');
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, {
    date: currentDate,
    dosisTitulada: dosisTitulada,
  });
  persist();
}

function handleWorkupChange(patient, target, tri) {
  var attr = tri ? 'data-hf-workup-tri' : 'data-hf-workup';
  var path = target.getAttribute(attr);
  if (!path) return;
  var parts = path.split('.');
  var section = parts[0];
  var field = parts[1];
  if (!patient.cardio.workup[section]) return;
  patient.cardio.workup[section][field] = tri ? parseTriState(String(target.value)) : String(target.value);
  persist();
}

function handleDeviceChange(patient, target, tri) {
  var attr = tri ? 'data-hf-device-tri' : 'data-hf-device';
  var key = target.getAttribute(attr);
  if (!key) return;
  patient.cardio.device[key] = tri ? parseTriState(String(target.value)) : String(target.value);
  persist();
}

function handleComorbFieldChange(patient, target) {
  var field = target.getAttribute('data-hf-comorb-field');
  var id = target.getAttribute('data-hf-comorb-id');
  if (!field || !id) return;
  var entry = findConsultaEntry(patient.cardio, currentDate) || {};
  var rows = updateComorbilidadField(entry.comorbilidades, id, field, target.value);
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, {
    date: currentDate,
    comorbilidades: rows,
  });
  persist();
}

function handleCerrarConsultaDateChange(target) {
  cerrarConsultaDraft.date = target.value;
}

function handleDraftFieldChange(target) {
  if (target.hasAttribute('data-hf-lab-new')) {
    labDraft[target.getAttribute('data-hf-lab-new')] = target.value;
    return true;
  }
  if (target.hasAttribute('data-hf-echo-new')) {
    echoDraft[target.getAttribute('data-hf-echo-new')] = target.value;
    return true;
  }
  if (target.hasAttribute('data-hf-score-new')) {
    scoreDraft[target.getAttribute('data-hf-score-new')] = target.value;
    return true;
  }
  return false;
}

function handleChange(ev) {
  var target = ev.target;
  if (!target || !target.getAttribute) return;
  var patient = currentPatient();
  if (!patient) return;

  if (target.hasAttribute('data-hf-consulta-date')) return handleVisitDateChange(target);
  if (target.hasAttribute('data-hf-consulta-ta')) return handleConsultaTaChange(patient, target);
  if (target.hasAttribute('data-hf-cerrar-consulta-date')) return handleCerrarConsultaDateChange(target);
  if (target.hasAttribute('data-hf-consulta')) return handleConsultaFieldChange(patient, target);
  if (target.hasAttribute('data-hf-consulta-tri')) return handleConsultaTriChange(patient, target);
  if (target.hasAttribute('data-hf-consulta-subj')) return handleConsultaSubjChange(patient, target);
  if (target.hasAttribute('data-hf-consulta-obj-tri')) return handleConsultaObjTriChange(patient, target);
  if (target.hasAttribute('data-hf-consulta-obj')) return handleConsultaObjChange(patient, target);
  if (target.hasAttribute('data-hf-consulta-gdmt')) return handleConsultaGdmtChange(patient, target);
  if (target.hasAttribute('data-hf-consulta-dosis-titulada')) return handleConsultaDosisTituladaChange(patient, target);
  if (target.hasAttribute('data-hf-workup')) return handleWorkupChange(patient, target, false);
  if (target.hasAttribute('data-hf-workup-tri')) return handleWorkupChange(patient, target, true);
  if (target.hasAttribute('data-hf-device')) return handleDeviceChange(patient, target, false);
  if (target.hasAttribute('data-hf-device-tri')) return handleDeviceChange(patient, target, true);
  if (target.hasAttribute('data-hf-comorb-field')) return handleComorbFieldChange(patient, target);
  handleDraftFieldChange(target);
}

function handleComorbAction(patient, btn) {
  var action = btn.getAttribute('data-hf-comorb-action');
  var entry = findConsultaEntry(patient.cardio, currentDate) || {};
  var rows;
  if (action === 'add') {
    rows = addComorbilidadRow(entry.comorbilidades);
  } else if (action === 'remove') {
    rows = removeComorbilidadRow(entry.comorbilidades, btn.getAttribute('data-hf-comorb-id'));
  } else {
    return;
  }
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, {
    date: currentDate,
    comorbilidades: rows,
  });
  persistAndRerender();
}

function numOrNull(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (s === '') return null;
  var n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function handleLabAction(patient, btn) {
  var action = btn.getAttribute('data-hf-lab-action');
  if (action === 'prefill') {
    var patientId = rt.getActiveId();
    var proposed = prefillFromImportedLabs(buildLabHistoryForPrefill(patientId));
    labDraft = Object.assign({}, labDraft, proposed);
    renderConsultaIc();
    return;
  }
  if (action === 'save') {
    var date = labDraft.date || currentDate;
    var values = {};
    Object.keys(emptyLabSnapshot().values).forEach(function (key) {
      values[key] = numOrNull(labDraft[key]);
    });
    patient.cardio.labSnapshots = upsertLabSnapshot(patient.cardio.labSnapshots, { date: date, values: values });
    labDraft = {};
    setModal(container(), null);
    persistAndRerender();
  }
}

var ECHO_ENUM_OR_TEXT_KEYS = [
  'it',
  'im',
  'iao',
  'ip',
  'estenosis',
  'estenosisSeveridad',
  'vciColapso',
  'dopplerHepaticas',
  'pulsatilidadPorta',
  'dopplerRenal',
  'vexus',
  'patronPulmonar',
  'lineasBPorCampo',
  'nota',
];

var ECHO_TRI_KEYS = ['feviRecuperada'];

function handleEchoAction(patient, btn) {
  if (btn.getAttribute('data-hf-echo-action') !== 'save') return;
  var date = echoDraft.date || currentDate;
  var defaults = emptyEchoStudy();
  var row = { date: date };
  Object.keys(defaults).forEach(function (key) {
    if (key === 'date') return;
    if (ECHO_TRI_KEYS.indexOf(key) >= 0) {
      row[key] = parseTriState(String(echoDraft[key] || ''));
      return;
    }
    row[key] = ECHO_ENUM_OR_TEXT_KEYS.indexOf(key) >= 0 ? String(echoDraft[key] || '') : numOrNull(echoDraft[key]);
  });
  patient.cardio.echoStudies = upsertEchoStudy(patient.cardio.echoStudies, row);
  echoDraft = {};
  setModal(container(), null);
  persistAndRerender();
}

function handleScoreAction(patient, btn) {
  if (btn.getAttribute('data-hf-score-action') !== 'save') return;
  var date = scoreDraft.date || currentDate;
  var defaults = emptyScoreEntry();
  var row = { date: date, nyha: String(scoreDraft.nyha || '') };
  Object.keys(defaults).forEach(function (key) {
    if (key === 'date' || key === 'nyha') return;
    row[key] = numOrNull(scoreDraft[key]);
  });
  patient.cardio.scores = upsertScoreEntry(patient.cardio.scores, row);
  scoreDraft = {};
  setModal(container(), null);
  persistAndRerender();
}

function handleStepAction(el, btn) {
  var action = btn.getAttribute('data-hf-consulta-step-action');
  if (action === 'back') setStep(el, getStep(el) - 1);
  else if (action === 'next') setStep(el, getStep(el) + 1);
  else return;
  renderConsultaIc();
}

/** Step pills — jump directly to any step (no linear gate), same
 * setStep()/render mechanism as Atrás/Siguiente above. */
function handleStepJump(el, btn) {
  setStep(el, Number(btn.getAttribute('data-hf-consulta-step-jump')) || 0);
  renderConsultaIc();
}

function handleWorkupTabClick(el, btn) {
  setWorkupTab(el, Number(btn.getAttribute('data-hf-workup-tab')) || 0);
  renderConsultaIc();
}

function handleModalOpen(el, btn) {
  var key = btn.getAttribute('data-hf-modal-open');
  setModal(el, key);
  if (key === 'labs-new' && !Object.keys(labDraft).length) {
    var proposed = prefillFromImportedLabs(buildLabHistoryForPrefill(rt.getActiveId()));
    labDraft = Object.assign({}, labDraft, proposed);
  }
  renderConsultaIc();
}

function handleModalClose(el) {
  setModal(el, null);
  renderConsultaIc();
}

/**
 * "Cerrar consulta" seam for Track D (Agenda/Directorio migration): saves
 * `entry.proximaConsultaFecha` (ISO date string) and `entry.cerrada = true`
 * on the consulta entry, then broadcasts `'hf:consulta-cerrada'` on
 * `document` with `detail: { patientId, proximaConsultaFecha }` — the
 * contract Track D listens to. Cancelling the date prompt (closing the
 * modal without confirming) leaves the consulta open and fires nothing.
 */
function handleCerrarConsultaConfirm(patient) {
  var fecha = String(cerrarConsultaDraft.date || '').trim();
  if (!fecha) return;
  patient.cardio.consultas = upsertConsultaEntry(patient.cardio.consultas, {
    date: currentDate,
    proximaConsultaFecha: fecha,
    cerrada: true,
  });
  cerrarConsultaDraft = {};
  setModal(container(), null);
  persist();
  renderConsultaIc();
  document.dispatchEvent(
    new CustomEvent('hf:consulta-cerrada', { detail: { patientId: patient.id, proximaConsultaFecha: fecha } })
  );
}

async function handleClick(ev) {
  var target = ev.target;
  // Click directly on the modal backdrop (not a descendant) dismisses it —
  // same "click outside the dialog" convention as `estado-actual-congestion-modal.mjs`.
  if (target && target.hasAttribute && target.hasAttribute('data-hf-modal-backdrop')) {
    return handleModalClose(container());
  }
  var btn = target && target.closest
    ? target.closest(
        'button[data-hf-comorb-action], button[data-hf-lab-action], button[data-hf-echo-action], button[data-hf-score-action], ' +
          'button[data-hf-consulta-step-action], button[data-hf-consulta-step-jump], button[data-hf-workup-tab], button[data-hf-modal-open], button[data-hf-modal-close], ' +
          'button[data-hf-goto-manejo], button[data-hf-cerrar-consulta], button[data-hf-cerrar-consulta-confirm], button[data-hf-history-edit]'
      )
    : null;
  if (!btn) return;
  if (btn.hasAttribute('data-hf-history-edit')) {
    if (!(await promptHistoryEditUnlock())) return;
    unlocked = true;
    return renderConsultaIc();
  }
  if (btn.hasAttribute('data-hf-consulta-step-action')) return handleStepAction(container(), btn);
  if (btn.hasAttribute('data-hf-consulta-step-jump')) return handleStepJump(container(), btn);
  if (btn.hasAttribute('data-hf-workup-tab')) return handleWorkupTabClick(container(), btn);
  if (btn.hasAttribute('data-hf-modal-open')) return handleModalOpen(container(), btn);
  if (btn.hasAttribute('data-hf-modal-close')) return handleModalClose(container());
  if (btn.hasAttribute('data-hf-goto-manejo')) return switchAppTab('med');
  if (btn.hasAttribute('data-hf-cerrar-consulta')) {
    setModal(container(), 'cerrar-consulta');
    return renderConsultaIc();
  }
  var patient = currentPatient();
  if (!patient) return;
  if (btn.hasAttribute('data-hf-comorb-action')) return handleComorbAction(patient, btn);
  if (btn.hasAttribute('data-hf-lab-action')) return handleLabAction(patient, btn);
  if (btn.hasAttribute('data-hf-echo-action')) return handleEchoAction(patient, btn);
  if (btn.hasAttribute('data-hf-score-action')) return handleScoreAction(patient, btn);
  if (btn.hasAttribute('data-hf-cerrar-consulta-confirm')) return handleCerrarConsultaConfirm(patient);
}

function handleEscape(ev) {
  if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
  var el = container();
  if (el && getModal(el)) {
    handleModalClose(el);
    ev.preventDefault();
  }
}

var escapeWired = false;

function wireContainerOnce(el) {
  if (el.dataset.hfConsultaWired === '1') return;
  el.dataset.hfConsultaWired = '1';
  el.addEventListener('change', handleChange);
  el.addEventListener('click', handleClick);
  if (!escapeWired) {
    escapeWired = true;
    document.addEventListener('keydown', handleEscape, true);
  }
}

/**
 * Renders (or clears) the Consulta IC screen for the active patient. Safe to
 * call on every segment activation, matching `renderVpo()`/`renderIndicaForm()`'s
 * render-on-every-pass convention for Clínico granular tabs.
 */
export function renderConsultaIc() {
  var el = container();
  if (!el) return;
  var patient = currentPatient();
  if (!patient) {
    el.innerHTML = '';
    return;
  }
  if (!currentDate) currentDate = todayYmd();
  var before = findConsultaEntry(patient.cardio, currentDate);
  var entry = ensureConsultaEntryForDate(patient, currentDate);
  if (!before) persist();

  el.innerHTML = renderConsultaIcHtml({
    patient: patient,
    entry: entry,
    existingDates: listConsultaDatesDesc(patient.cardio),
    workup: patient.cardio.workup,
    workupTab: getWorkupTab(el),
    device: patient.cardio.device,
    labs: buildLabsCtx(patient),
    echo: buildEchoCtx(patient),
    scores: buildScoresCtx(patient),
    fantasticos: patient.cardio.fantasticos,
    step: getStep(el),
    openModal: getModal(el),
    cerrarConsultaDraft: cerrarConsultaDraft,
    locked: isLocked(),
  });
  wireContainerOnce(el);
  wireCardioImageAttach(el, {
    patientId: patient.id,
    visitModule: 'consultaIc',
    visitDate: currentDate,
    locked: isLocked(),
  });
  applyLockToDom(el);
}

export function clearConsultaIcDraftState() {
  currentDate = null;
  unlocked = false;
  resetDrafts();
}
