/**
 * Shell de aplicación: chrome de contexto, toast, modales, export clínico, atajos y arranque diferido.
 */
import { renderGuardiaCensusGrid, syncGuardiaCensusPanelVisibility } from './clinical-access-runtime.mjs';
import {
  registerDocumentExportRuntime,
  saveOutputDirSelection,
} from './document-export-client.mjs';
import {
  isGuardiaMode,
  syncHeaderModeSeg,
} from './features/chrome.mjs';
import { syncGuardiaModeButtonVisibility } from './features/guardia-mode-button.mjs';
import { ensureGuardiaBoardLoaded } from './lazy-feature-routes.mjs';
import {
  loadSettings,
} from './features/profile.mjs';
import {
  scheduleDeferredShellInits as scheduleDeferredShellInitsImpl,
  scheduleDeferredUiInits as scheduleDeferredUiInitsImpl,
} from './app-shell-deferred.mjs';
import { createPatientUpdateHandler } from './app-shell-patient-update.mjs';

/** @type {typeof import('./ui-toast.mjs').showToast | null} */
let showToastImpl = null;
let showToastLoadPromise = null;

function loadShowToast() {
  if (showToastImpl) return Promise.resolve(showToastImpl);
  if (!showToastLoadPromise) {
    showToastLoadPromise = import('./ui-toast.mjs').then(function (mod) {
      showToastImpl = mod.showToast;
      return showToastImpl;
    });
  }
  return showToastLoadPromise;
}

/**
 * @param {string} msg
 * @param {'success'|'error'|'warn'|'info'|'ok'|''} [type]
 */
export function showToast(msg, type) {
  if (showToastImpl) {
    showToastImpl(msg, type);
    return;
  }
  void loadShowToast().then(function (fn) {
    fn(msg, type);
  });
}

if (typeof window !== 'undefined') {
  window.showToast = showToast;
  window.__hybridDemoSheet = function () {
    return import('./ui-overlay.mjs').then(function (mod) {
      return mod.mountHybridDemoSheet();
    });
  };
}

const shellCtx = {
  getActiveId() { return null; },
  getActiveAppTab() { return 'nota'; },
  getActiveInner() { return 'resumen'; },
  getSettings() { return {}; },
};

export function initModalDismiss() {
  void import('./app-shell-modals.mjs').then(function (mod) {
    mod.initModalDismiss();
  });
}

function quickExportCurrentPatientLazy() {
  var args = arguments;
  void import('./clinical-quick-export.mjs').then(function (mod) {
    mod.quickExportCurrentPatient.apply(null, args);
  });
}

export function registerAppShellContext(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(shellCtx, ctx);
  void import('./features/command-palette.mjs').then(function (mod) {
    mod.setCommandPaletteContext(shellCtx);
  });
  wireShellExportRuntimes();
}

function wireShellExportRuntimes() {
  registerDocumentExportRuntime({
    showToast,
    getSettings: function () {
      return shellCtx.getSettings();
    },
    loadSettings,
  });
  void import('./clinical-quick-export.mjs').then(function (mod) {
    mod.registerClinicalQuickExportRuntime({
      getActiveId: function () {
        return shellCtx.getActiveId();
      },
      getActiveInner: function () {
        return shellCtx.getActiveInner();
      },
      getSettings: function () {
        return shellCtx.getSettings();
      },
      showToast,
    });
  });
}

function syncActivePatientContextBar() {
  /* Paciente activo solo en la barra lateral; no repetir en el header */
}

function syncMedPatientGate() {
  var empty = document.getElementById('med-empty-guided');
  var shell = document.getElementById('med-active-shell');
  if (!empty || !shell) return;
  var showEmpty = shellCtx.getActiveAppTab() === 'med' && !shellCtx.getActiveId();
  empty.style.display = showEmpty ? 'flex' : 'none';
  shell.style.display = showEmpty ? 'none' : 'flex';
}

function setMedTabAttention(on) {
  var tab = document.getElementById('apptab-med');
  if (tab) tab.classList.toggle('app-tab-attention', !!on);
}

function syncWorkContextChrome() {
  syncActivePatientContextBar();
  syncHeaderModeSeg();
  syncMedPatientGate();
  syncGuardiaModeButtonVisibility();
  syncGuardiaCensusPanelVisibility(shellCtx.getSettings());
  renderGuardiaCensusGrid(shellCtx.getSettings());
  if (isGuardiaMode()) {
    void ensureGuardiaBoardLoaded().then(function (mod) {
      mod.renderGuardiaBoard(shellCtx.getSettings());
    });
  }
  void import('./features/header-context.mjs').then(function (mod) {
    mod.syncHeaderContext(shellCtx);
  });
}

function chooseOutputDir() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
    showToast('Función no disponible en este entorno', 'error');
    return;
  }
  window.electronAPI.selectOutputDir().then(function (dir) {
    if (!dir) return;
    saveOutputDirSelection(dir);
    showToast('Carpeta actualizada ✓', 'success');
  });
}

function onDefaultServicioBlur() {
  var el = document.getElementById('settings-default-servicio');
  if (!el) return;
  var v = (el.value || '').trim().toUpperCase();
  el.value = v;
  shellCtx.getSettings().defaultServicio = v;
  localStorage.setItem('rpc-settings', JSON.stringify(shellCtx.getSettings()));
  var w = document.getElementById('default-servicio-warning');
  var looksAbbrev = v.length > 0 && v.length <= 3 && /^[A-Z]+$/.test(v);
  if (w) w.style.display = looksAbbrev ? 'block' : 'none';
}

function onMedicoTemplateBlur() {
  var keys = ['profesor', 'r4', 'r2', 'r1a', 'r1b'];
  var tpl = {};
  keys.forEach(function (k) {
    var inp = document.getElementById('settings-medico-' + k);
    tpl[k] = inp ? (inp.value || '').trim() : '';
  });
  shellCtx.getSettings().medicosPlantilla = tpl;
  localStorage.setItem('rpc-settings', JSON.stringify(shellCtx.getSettings()));
}

var patientHandlers = createPatientUpdateHandler(shellCtx, syncWorkContextChrome);

export function rpcPrefersReducedMotion() {
  try {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

/** @deprecated import from document-export-client.mjs */
export {
  guardMobileDocExport,
  requestDocumentJson,
  handleDocumentGenerateResponse,
} from './document-export-client.mjs';

/** @deprecated import from features/chrome.mjs */
export { launchConfetti } from './features/chrome.mjs';

/** @deprecated import from features/patients.mjs */
export {
  applyDefaultsToNewPatient,
  applyDefaultsToNewIndicaciones,
} from './features/patients.mjs';

export {
  syncWorkContextChrome,
  setMedTabAttention,
};

export const appShellWindowHandlers = {
  onDefaultServicioBlur,
  onMedicoTemplateBlur,
  chooseOutputDir,
  updatePatient: patientHandlers.updatePatient,
  quickExportCurrentPatient: quickExportCurrentPatientLazy,
};

export function scheduleDeferredShellInits() {
  scheduleDeferredShellInitsImpl(showToast);
}

export function scheduleDeferredUiInits() {
  scheduleDeferredUiInitsImpl(showToast);
}
