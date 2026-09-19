/**
 * Registro Congestión / POCUS modal — mirrors
 * `estado-actual-registro-modal.mjs`'s open/close/dismiss pattern. The
 * form fields are split into 2 steps (`renderPocusStep1Html`/
 * `renderPocusStep2Html`) so each screen fits 1280×800 without scrolling —
 * same step-nav pattern as `evaluacion-inicial-html.mjs`/-wire.mjs
 * (Atrás/Siguiente buttons, "Paso X de Y" indicator). Both steps' fields
 * stay in the DOM the whole time (the off-step one is just `hidden`), so
 * `readPocusFormValues`/`saveCardioPocusDay` in `estado-actual-cardio-wire.mjs`
 * keep reading/saving the whole record in one pass, unchanged.
 */
import { renderPocusStep1Html, renderPocusStep2Html, renderPocusLogListHtml } from './estado-actual-cardio-html.mjs';
import { getPocusDay } from '../../../../lib/cardio/congestion.mjs';
import { saveCardioPocusDay } from './estado-actual-cardio-wire.mjs';
import { localYmdToday } from './estado-actual-cardio-data.mjs';
import { getEaPanelRuntime } from '../estado-actual-panel-runtime.mjs';

/**
 * 6MWT reading for the given date from `patient.cardio.scores` (hf-scores.mjs)
 * — that store, not the POCUS day record, is canonical for scores.
 * @param {unknown} scores
 * @param {string} date
 */
function sixMwtForDate(scores, date) {
  var list = Array.isArray(scores) ? scores : [];
  var row = list.find(function (r) {
    return r && r.date === date;
  });
  return row && row.sixMwtMeters != null ? row.sixMwtMeters : '';
}

var state = { patient: null, persist: null, refresh: null };
var dismissWired = false;

// 2-step wizard (see module doc): step 0 = clinical eval + VCI/VExUS +
// Stevenson + the legacy free-text lung-pattern fields (grouped here for
// headroom — see estado-actual-cardio-html.mjs), step 1 = 8-zone lung-US
// grid + note. Same Atrás/Siguiente + "Paso X de Y" pattern as
// `evaluacion-inicial-html.mjs`. Both steps' field markup stays in the DOM
// at all times — `setCongestionStep` only toggles `hidden`, so save keeps
// reading the whole body in one pass.
var CONGESTION_STEP_TITLES = ['Evaluación clínica y VExUS', 'US pulmonar y nota'];
var CONGESTION_STEP_COUNT = CONGESTION_STEP_TITLES.length;

function getBackdrop() {
  return document.getElementById('ea-congestion-backdrop');
}

function getBody() {
  return document.getElementById('ea-congestion-modal-body');
}

/**
 * @param {HTMLElement} body
 * @param {number} step 0-based, clamped into range.
 */
function setCongestionStep(body, step) {
  var s = Math.max(0, Math.min(CONGESTION_STEP_COUNT - 1, step));
  var isLast = s === CONGESTION_STEP_COUNT - 1;
  for (var i = 0; i < CONGESTION_STEP_COUNT; i++) {
    var panel = body.querySelector('[data-ea-congestion-step="' + i + '"]');
    if (panel) panel.style.display = i === s ? '' : 'none';
  }
  var head = body.querySelector('[data-ea-congestion-step-head]');
  if (head) {
    head.textContent = CONGESTION_STEP_TITLES[s] + ' — Paso ' + (s + 1) + ' de ' + CONGESTION_STEP_COUNT;
  }
  // `.ea-btn`/`.btn-generate` set `display: inline-flex` with no
  // `:not([hidden])` guard, so the `hidden` attribute alone doesn't hide
  // them (CSS `display` wins over the UA `[hidden]` style) — set the
  // inline style directly instead, same as the step panels below.
  var backBtn = body.querySelector('[data-ea-congestion-step-action="back"]');
  if (backBtn) backBtn.style.display = s === 0 ? 'none' : '';
  var nextBtn = body.querySelector('[data-ea-congestion-step-action="next"]');
  if (nextBtn) nextBtn.style.display = isLast ? 'none' : '';
  var saveBtn = body.querySelector('[data-ea-congestion-save]');
  if (saveBtn) saveBtn.style.display = isLast ? '' : 'none';
  body.setAttribute('data-ea-congestion-current-step', String(s));
}

function wireModalBody(body) {
  var saveBtn = body.querySelector('[data-ea-congestion-save]');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      saveCardioPocusDay(body, state.patient, state.persist, function () {
        if (typeof state.refresh === 'function') state.refresh();
        getEaPanelRuntime().showToast('Congestión / POCUS guardado', 'success');
        closeEaCongestionModal();
      });
    });
  }
  var cancelBtn = body.querySelector('[data-ea-congestion-cancel]');
  if (cancelBtn) cancelBtn.addEventListener('click', closeEaCongestionModal);
  var backBtn = body.querySelector('[data-ea-congestion-step-action="back"]');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      setCongestionStep(body, Number(body.getAttribute('data-ea-congestion-current-step')) - 1);
    });
  }
  var nextBtn = body.querySelector('[data-ea-congestion-step-action="next"]');
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      setCongestionStep(body, Number(body.getAttribute('data-ea-congestion-current-step')) + 1);
    });
  }
  body.querySelectorAll('[data-ea-cardio-action="edit-pocus-day"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var date = btn.getAttribute('data-date');
      openEaCongestionModal(state.patient, date, { persist: state.persist, refresh: state.refresh });
    });
  });
  setCongestionStep(body, 0);
}

/**
 * @param {{ cardio?: Record<string, any> }} patient
 * @param {string | null} [editingDate] date of a saved day to pre-fill, or
 *   null/undefined to start a fresh draft for today.
 * @param {{ persist: () => void, refresh: () => void }} deps
 */
export function openEaCongestionModal(patient, editingDate, deps) {
  var backdrop = getBackdrop();
  var body = getBody();
  if (!backdrop || !body || !patient || !patient.cardio) return;
  state.patient = patient;
  state.persist = deps.persist;
  state.refresh = deps.refresh;
  var pocusByDay = Array.isArray(patient.cardio.pocusByDay) ? patient.cardio.pocusByDay : [];
  var draft = (editingDate && getPocusDay(pocusByDay, editingDate)) || { date: localYmdToday() };
  draft = Object.assign({}, draft, {
    sixMwtMeters: sixMwtForDate(patient.cardio.scores, draft.date),
  });
  body.innerHTML =
    '<div class="ea-registro-form-scroll">' +
    '<div class="hf-ei-step-head" data-ea-congestion-step-head style="font-weight:600;margin-bottom:8px"></div>' +
    '<div data-ea-congestion-step="0">' +
    renderPocusStep1Html(draft) +
    '</div>' +
    '<div data-ea-congestion-step="1">' +
    renderPocusStep2Html(draft) +
    // Collapsed by default (native <details>, no extra scroll container) —
    // the log was the other big height contributor on step 2 at 1280×800;
    // it doesn't need to be open by default while entering today's exam.
    '<details class="ea-cardio-pocus-log">' +
    '<summary class="ea-label" style="cursor:pointer">Historial (' +
    pocusByDay.length +
    ')</summary>' +
    renderPocusLogListHtml(pocusByDay) +
    '</details>' +
    '</div>' +
    '</div>' +
    '<footer class="ea-registro-modal-foot">' +
    '<div class="modal-actions ea-registro-modal-actions">' +
    '<button type="button" class="btn-med-secondary btn-med-secondary--muted" data-ea-congestion-cancel>Cancelar</button>' +
    '<button type="button" class="ea-btn" data-ea-congestion-step-action="back">Atrás</button>' +
    '<button type="button" class="ea-btn ea-btn--primary" data-ea-congestion-step-action="next">Siguiente</button>' +
    '<button type="button" class="btn-generate" data-ea-congestion-save>Guardar día</button>' +
    '</div>' +
    '</footer>';
  wireModalBody(body);
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  var first = body.querySelector('[data-ea-cardio-pocus="date"]');
  if (first && 'focus' in first) first.focus();
}

export function closeEaCongestionModal() {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  state.patient = null;
  state.persist = null;
  state.refresh = null;
}

function handleEaCongestionEscape(ev) {
  if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
  var backdrop = getBackdrop();
  if (backdrop && backdrop.classList.contains('open')) {
    closeEaCongestionModal();
    ev.preventDefault();
    ev.stopPropagation();
  }
}

/** Escape y clic fuera. */
export function wireEaCongestionModalDismiss() {
  if (dismissWired) return;
  dismissWired = true;
  document.addEventListener('keydown', handleEaCongestionEscape, true);
  var backdrop = getBackdrop();
  if (backdrop) {
    backdrop.addEventListener('click', function (ev) {
      if (!backdrop.classList.contains('open')) return;
      if (ev.target !== backdrop) return;
      closeEaCongestionModal();
    });
  }
}

export const windowHandlers = {
  closeEaCongestionModal,
};
