/** R+ Móvil: misma UI que escritorio en navegador (Safari/iPad), sin exportación Word. */

import { isMobileWeb as isMobileWebFromFlags } from './mobile-web-detect.mjs';
import { isMobileWebModePersisted } from './mobile-query-persist.mjs';

function mobileRuntimeGlobal() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof window !== 'undefined') return window;
  return null;
}

export function isMobileWeb() {
  return isMobileWebFromFlags() || isMobileWebModePersisted();
}

export function activateMobileWebRoot() {
  var g = mobileRuntimeGlobal();
  if (g) g.__RPC_MOBILE_WEB__ = true;
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('rpc-mobile-web');
}

/** @returns {boolean} true si se bloqueó la acción */
export function blockIfMobileDocExport() {
  if (!isMobileWeb()) return false;
  return true;
}

export function mobileDocExportToast(showToastFn) {
  if (typeof showToastFn === 'function') {
    showToastFn(
      'En R+ Móvil no se generan documentos (.docx). Usa la app de escritorio para Word y salida rápida.',
      'error'
    );
  }
}

/** Pestañas principales visibles en R+ Móvil (iPad / Safari). */
export const MOBILE_MAIN_APP_TABS = ['lab', 'nota'];

/** @param {string} tab */
export function normalizeMobileAppTab(tab) {
  if (!isMobileWeb()) return tab;
  if (tab === 'lan') tab = 'lab';
  if (tab === 'lab' || tab === 'nota') return tab;
  if (tab === 'med' || tab === 'agenda') return 'nota';
  return 'lab';
}

function hideMobileChromeByIds(ids) {
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function dismissMobileLearningChrome() {
  var learnBackdrop = document.getElementById('learn-hub-backdrop');
  if (learnBackdrop) {
    learnBackdrop.classList.remove('open');
    learnBackdrop.setAttribute('aria-hidden', 'true');
  }
  var tourDock = document.getElementById('tour-dock');
  if (tourDock) tourDock.classList.remove('tour-dock-visible');
  var introBackdrop = document.getElementById('onboarding-intro-backdrop');
  if (introBackdrop) introBackdrop.classList.remove('open');
}

function ensureMobileAppTabAllowed() {
  void import('./features/pase-board-runtime.mjs')
    .then(function (mod) {
      var rt = mod.rt;
      if (!rt || typeof rt.getActiveAppTab !== 'function') return;
      var cur = rt.getActiveAppTab();
      var tabKey = cur === 'lan' ? 'lab' : cur;
      var normalized = normalizeMobileAppTab(tabKey);
      if (normalized === tabKey) return;
      return import('./features/pase-board-app-tabs.mjs').then(function (tabs) {
        if (typeof tabs.switchAppTab === 'function') tabs.switchAppTab(normalized);
      });
    })
    .catch(function () {
      /* optional */
    });
}

/** Oculta chrome de escritorio (censo, perfil, ajustes, pestaña Salida). */
export function syncMobileBarebonesChrome() {
  if (!isMobileWeb() || typeof document === 'undefined') return;
  var hideIds = [
    'btn-export-censo-header',
    'profile-toggle-btn',
    'btn-open-settings',
    'itab-salida',
    'sidebar-censo-export-wrap',
    'btn-header-team-sync',
    'lab-input-section',
    'lab-diagrams-section',
    'lab-banner',
    'btn-header-cmdk',
    'btn-header-shortcuts',
    'btn-open-learn',
    'help-learn-hub',
    'learn-hub-backdrop',
    'tour-dock',
    'onboarding-intro-backdrop',
    'apptab-med',
    'apptab-agenda',
    'appcontent-med',
    'appcontent-agenda',
  ];
  hideMobileChromeByIds(hideIds);
  dismissMobileLearningChrome();
  var salidaBar = document.getElementById('exp-segment-salida');
  if (salidaBar) salidaBar.style.display = 'none';
  var brand = document.getElementById('app-brand');
  if (brand) {
    brand.removeAttribute('onclick');
    brand.removeAttribute('onkeydown');
    brand.removeAttribute('role');
    brand.removeAttribute('tabindex');
    brand.title = 'R+ Móvil';
    brand.setAttribute('aria-label', 'R+ Móvil');
  }
  closeSettingsDropdownIfPresent();
  closeProfileModalIfPresent();
  var todayDate = document.getElementById('today-date');
  if (todayDate) todayDate.style.display = 'none';
  var headerPath = document.getElementById('header-context-path');
  if (headerPath) headerPath.style.display = 'none';
  syncMobileLabReferenceChrome();
  ensureMobileAppTabAllowed();
}

function syncMobileLabReferenceHeaderState() {
  var selectEl = document.getElementById('lab-history-date-select');
  var cardHeader = document.querySelector('#lab-output-section > .card-header');
  var picker = document.querySelector('.lab-history-date-picker');
  var pickerLabel = document.querySelector('.lab-history-date-picker-label');
  var cardTitle = document.querySelector('#lab-output-section .lab-output-card-title');
  var hasStudies = !!(selectEl && !selectEl.hidden);

  if (cardTitle) {
    cardTitle.setAttribute('aria-hidden', 'true');
    cardTitle.style.display = 'none';
  }
  if (cardHeader) {
    cardHeader.style.display = hasStudies ? '' : 'none';
    cardHeader.style.flexDirection = 'column';
  }
  if (picker) picker.style.display = hasStudies ? '' : 'none';
  if (pickerLabel) {
    pickerLabel.textContent = 'Día';
    pickerLabel.classList.add('visually-hidden');
  }
  var outSec = document.getElementById('lab-output-section');
  if (outSec) outSec.classList.toggle('is-mobile-lab-empty', !hasStudies);
}

/** iPad / R+ Móvil: solo historial reciente + resultados (sin pegar SOME ni diagramas). */
export function syncMobileLabReferenceChrome() {
  if (!isMobileWeb() || typeof document === 'undefined') return;
  document.documentElement.classList.add('rpc-mobile-lab-reference');
  ['lab-input-section', 'lab-diagrams-section', 'lab-banner'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  var outSec = document.getElementById('lab-output-section');
  if (outSec) {
    outSec.style.display = 'flex';
    outSec.style.flexDirection = 'column';
  }
  syncMobileLabReferenceHeaderState();
  hideMobileLabWorkbenchChrome();
}

/** Refresca el panel de labs tras sync Nube en móvil. */
export function refreshMobileLabReferencePanel() {
  if (!isMobileWeb()) return;
  syncMobileLabReferenceChrome();
  void import('./lazy-feature-routes.mjs')
    .then(function (routes) {
      return routes.ensureLabsLoaded();
    })
    .then(function (mod) {
      if (mod && typeof mod.renderLabHistoryPanel === 'function') {
        mod.renderLabHistoryPanel();
      }
    })
    .catch(function () {
      /* optional */
    });
}

function hideMobileLabWorkbenchChrome() {
  var moreMenu = document.querySelector('.lab-output-more');
  if (moreMenu) moreMenu.hidden = true;
  var copyFab = document.getElementById('lab-copy-fab');
  if (copyFab) {
    copyFab.hidden = true;
    copyFab.style.display = 'none';
  }
}

function closeSettingsDropdownIfPresent() {
  var bg = document.getElementById('settings-dropdown-backdrop');
  var dd = document.getElementById('settings-dropdown');
  if (bg) bg.classList.remove('open');
  if (dd) dd.classList.remove('open');
  document.body.classList.remove('settings-dropdown-open');
}

function closeProfileModalIfPresent() {
  var modal = document.getElementById('profile-modal');
  if (modal) modal.classList.remove('open');
}
