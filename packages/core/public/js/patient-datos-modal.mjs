/**
 * Modal de datos del paciente (expediente → pestaña Paciente).
 */

import { migrateGranularInner } from './expediente-tabs.mjs';
import { rt } from './features/app-tabs-runtime.mjs';

var dismissWired = false;
/** @type {{ appTab: string, innerTab: string } | null} */
var datosModalRestore = null;

function captureDatosModalRestoreIfNeeded() {
  var backdrop = getBackdrop();
  if (backdrop && backdrop.classList.contains('open')) return;
  if (typeof rt.getActiveAppTab !== 'function' || typeof rt.getActiveInner !== 'function') return;
  datosModalRestore = {
    appTab: rt.getActiveAppTab(),
    innerTab: rt.getActiveInner() || 'todo',
  };
}

function restoreDatosModalContext() {
  if (!datosModalRestore) return;
  var ctx = datosModalRestore;
  datosModalRestore = null;
  var settings = typeof rt.getSettings === 'function' ? rt.getSettings() : {};
  var targetInner = migrateGranularInner(ctx.innerTab || 'todo', settings);
  if (
    typeof rt.switchAppTab === 'function' &&
    ctx.appTab &&
    typeof rt.getActiveAppTab === 'function' &&
    rt.getActiveAppTab() !== ctx.appTab
  ) {
    rt.switchAppTab(ctx.appTab);
  }
  if (typeof rt.setActiveInner === 'function' && typeof rt.getActiveInner === 'function') {
    var currentInner = migrateGranularInner(rt.getActiveInner() || 'todo', settings);
    if (currentInner !== targetInner) {
      rt.setActiveInner(targetInner);
      if (typeof rt.syncInnerTabVisualOnly === 'function') rt.syncInnerTabVisualOnly();
    }
  }
}

function getBackdrop() {
  return document.getElementById('exp-datos-modal-backdrop');
}

function getMount() {
  return document.getElementById('exp-datos-modal-mount');
}

function getPanesHost() {
  return document.getElementById('expediente-panes-host');
}

function ensureDatosPaneInModal() {
  var pane = document.getElementById('itab-content-datos');
  var mount = getMount();
  if (!pane || !mount) return;
  if (pane.parentElement !== mount) {
    mount.appendChild(pane);
    pane.classList.remove('tab-content');
    pane.classList.add('exp-segment-panel', 'active');
  }
  pane.hidden = false;
}

function returnDatosPaneToHost() {
  var pane = document.getElementById('itab-content-datos');
  var host = getPanesHost();
  if (!pane || !host || pane.parentElement === host) return;
  host.appendChild(pane);
  pane.classList.add('tab-content');
  pane.classList.remove('exp-segment-panel', 'active');
  pane.hidden = true;
}

export function closePatientDatosModal() {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  returnDatosPaneToHost();
  restoreDatosModalContext();
  if (typeof rt.refreshExpedienteAfterPatientSelect === 'function') {
    rt.refreshExpedienteAfterPatientSelect();
  }
}

/**
 * @param {string|number|null|undefined} [patientId] When set, render that patient (not only activeId).
 */
export function openPatientDatosModal(patientId) {
  captureDatosModalRestoreIfNeeded();
  var backdrop = getBackdrop();
  if (!backdrop) return;
  ensureDatosPaneInModal();
  if (typeof window !== 'undefined' && typeof window.renderPatientDataPane === 'function') {
    window.renderPatientDataPane(patientId);
  }
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  var closeBtn = backdrop.querySelector('.exp-datos-modal-close');
  if (closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus();
}

/** Open datos modal for a specific patient (caller should selectPatient first). */
export function openPatientDatosModalForPatient(patientId) {
  openPatientDatosModal(patientId);
}

function wirePatientDatosModal() {
  if (dismissWired) return;
  dismissWired = true;

  var backdrop = getBackdrop();
  if (!backdrop) return;

  backdrop.addEventListener('click', function (ev) {
    if (!backdrop.classList.contains('open')) return;
    if (ev.target !== backdrop) return;
    closePatientDatosModal();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    var bd = getBackdrop();
    if (!bd || !bd.classList.contains('open')) return;
    closePatientDatosModal();
  });
}

export function wirePatientDatosModalOnce() {
  wirePatientDatosModal();
  var pane = document.getElementById('itab-content-datos');
  if (pane && !pane.closest('#exp-datos-modal-mount')) {
    pane.hidden = true;
    pane.classList.remove('active');
  }
}

export const patientDatosModalWindowHandlers = {
  openPatientDatosModal,
  openPatientDatosModalForPatient,
  closePatientDatosModal,
};
