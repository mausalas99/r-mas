/**
 * Interconsulta mode chrome (design handoff screen 10b).
 *
 * Reuses the same Resumen patient summary as Sala — this file only paints
 * the frame around it: a top bar and a consult-info band. The bar's layout
 * is deliberately NOT `wb-mode-frame` (band 1 used by Guardia): the
 * design spec calls for a 3-column CSS grid (`200px minmax(0,1fr) auto`)
 * at 52px, versus wb-mode-frame's flex layout at ~44px. Buttons still reuse
 * the shared `.wb-btn*` classes from workbench-kit.css for visual parity.
 *
 * "Generar nota" stays a real .docx-generation call (`window.generateWord`,
 * see notes-indicaciones.mjs) but is demoted from a primary action into an
 * overflow menu item here, per the 10b spec ("existe pero no ocupa lugar
 * visual").
 */
import { escHtml } from '../dom-escape.mjs';
import { isModeSala } from '../mode-features.mjs';
import { isGuardiaMode } from './chrome.mjs';
import { settingsRef } from './profile-runtime.mjs';
import { getPatients } from '../app-state.mjs';
import { getConsultInfo, renderConsultBandHtml } from './patient-dashboard/consult-band.mjs';

var rt = {
  getActiveId() {
    return null;
  },
  renderPatientList() {},
  showToast() {},
};

export function registerInterconsultaChromeRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

/** True when the app should show the 10b interconsulta frame (not Guardia). */
export function isInterconsultaModeActive() {
  return !isModeSala(settingsRef()) && !isGuardiaMode();
}

export function buildInterconsultaBarHtml() {
  return (
    '<div class="wb-ic-bar">' +
    '<div class="wb-ic-bar-name"><span class="wb-mode-frame-name">Interconsulta</span></div>' +
    '<div class="wb-ic-bar-mid"></div>' +
    '<div class="wb-ic-bar-actions">' +
    '<details class="wb-menu" data-wb-ic-menu>' +
    '<summary class="wb-btn wb-btn-secondary" aria-haspopup="menu" title="Más acciones">⋯</summary>' +
    '<div class="wb-menu-panel" role="menu">' +
    '<button type="button" class="wb-menu-item" role="menuitem" data-wb-ic-generar-nota>' +
    escHtml('Generar nota (.docx)') +
    '</button>' +
    '</div></details>' +
    '<button type="button" class="wb-btn wb-btn-secondary wb-btn-shortcut" data-wb-shortcut>⌘/</button>' +
    '<button type="button" class="wb-btn wb-btn-primary" data-wb-ic-primary>Actualizar pacientes</button>' +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {{ onPrimary?: () => void, onGenerarNota?: () => void, onShortcut?: () => void }} opts
 */
export function mountInterconsultaBar(container, opts) {
  if (!container) return undefined;
  container.innerHTML = buildInterconsultaBarHtml();
  var o = opts || {};

  var menu = container.querySelector('[data-wb-ic-menu]');
  var generarBtn = container.querySelector('[data-wb-ic-generar-nota]');
  if (generarBtn) {
    generarBtn.addEventListener('click', function () {
      if (menu) menu.open = false;
      if (typeof o.onGenerarNota === 'function') o.onGenerarNota();
    });
  }
  if (menu) {
    document.addEventListener('click', function (ev) {
      if (menu.open && !menu.contains(ev.target)) menu.open = false;
    });
  }

  var shortcutBtn = container.querySelector('[data-wb-shortcut]');
  if (shortcutBtn && typeof o.onShortcut === 'function') {
    shortcutBtn.addEventListener('click', o.onShortcut);
  }

  var primaryBtn = container.querySelector('[data-wb-ic-primary]');
  if (primaryBtn && typeof o.onPrimary === 'function') {
    primaryBtn.addEventListener('click', o.onPrimary);
  }

  return container;
}

function activeInterconsultaPatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return (
    getPatients().find(function (p) {
      return String(p.id) === String(id);
    }) || null
  );
}

/** Repaints the consult-info band for whichever patient is active. No-op when hidden. */
export function renderConsultBandForActivePatient() {
  var bandMount = document.getElementById('interconsulta-consult-band');
  if (!bandMount || bandMount.hidden) return;
  var patient = activeInterconsultaPatient();
  bandMount.innerHTML = patient ? renderConsultBandHtml(getConsultInfo(patient)) : '';
}

function refreshPatients() {
  if (typeof rt.renderPatientList === 'function') rt.renderPatientList();
  if (typeof rt.showToast === 'function') rt.showToast('Pacientes actualizados', 'success');
}

/** Shows/hides + (re)paints the 10b frame and band. Call on any mode or patient change. */
export function syncInterconsultaModeChrome() {
  var barMount = document.getElementById('interconsulta-mode-frame');
  var bandMount = document.getElementById('interconsulta-consult-band');
  var active = isInterconsultaModeActive();
  if (barMount) barMount.hidden = !active;
  if (bandMount) bandMount.hidden = !active;
  if (!active) return;
  if (barMount && !barMount.dataset.wbIcMounted) {
    mountInterconsultaBar(barMount, {
      onPrimary: refreshPatients,
      onGenerarNota: function () {
        if (typeof window !== 'undefined' && typeof window.generateWord === 'function') {
          window.generateWord();
        }
      },
    });
    barMount.dataset.wbIcMounted = '1';
  }
  renderConsultBandForActivePatient();
}
