/**
 * Registro Congestión / POCUS modal — mirrors
 * `estado-actual-registro-modal.mjs`'s open/close/dismiss pattern. The form
 * markup is the same `renderPocusFormHtml` used before this was a modal;
 * `readPocusFormValues`/`saveCardioPocusDay` in `estado-actual-cardio-wire.mjs`
 * take any root element with `querySelector`, so passing the modal body
 * instead of the panel mount works without changes to those helpers.
 */
import { renderPocusFormHtml, renderPocusLogListHtml } from './estado-actual-cardio-html.mjs';
import { getPocusDay } from '../../../../lib/cardio/congestion.mjs';
import { saveCardioPocusDay } from './estado-actual-cardio-wire.mjs';
import { localYmdToday } from './estado-actual-cardio-data.mjs';
import { getEaPanelRuntime } from '../estado-actual-panel-runtime.mjs';

var state = { patient: null, persist: null, refresh: null };
var dismissWired = false;

function getBackdrop() {
  return document.getElementById('ea-congestion-backdrop');
}

function getBody() {
  return document.getElementById('ea-congestion-modal-body');
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
  body.querySelectorAll('[data-ea-cardio-action="edit-pocus-day"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var date = btn.getAttribute('data-date');
      openEaCongestionModal(state.patient, date, { persist: state.persist, refresh: state.refresh });
    });
  });
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
  body.innerHTML =
    renderPocusFormHtml(draft) +
    '<div class="modal-actions ea-registro-modal-actions">' +
    '<button type="button" class="btn-med-secondary btn-med-secondary--muted" data-ea-congestion-cancel>Cancelar</button>' +
    '<button type="button" class="btn-generate" data-ea-congestion-save>Guardar día</button>' +
    '</div>' +
    '<div class="ea-cardio-pocus-log">' +
    renderPocusLogListHtml(pocusByDay) +
    '</div>';
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
