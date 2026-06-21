/**
 * Shell de aplicación: chrome de contexto, toast, modales, export clínico, atajos y arranque diferido.
 */
import { storage } from './storage.js';
import { syncHeaderContext } from './features/header-context.mjs';
import { openCommandPalette, setCommandPaletteContext } from './features/command-palette.mjs';
import { ensurePatientAccesos, syncLegacyAccesoFields } from './patient-accesos.mjs';
import { dateInputValueToAccesoFecha } from './patient-date-fields.mjs';
import { parseLanJoinQuery } from './lan-join-link.mjs';
import { renderGuardiaCensusGrid, syncGuardiaCensusPanelVisibility } from './clinical-access-runtime.mjs';
import { isMobileWeb, syncMobileBarebonesChrome } from './mobile-web.mjs';
import { clearWebSessionClinicalMemory } from './app-state.mjs';
import { wipeSessionClinicalStorage } from './session-clinical-wipe.mjs';
import {
  persistMobilePairingFromSearch,
  restoreMobilePairingFromStorage,
  resolveStoredMobileRoomId,
} from './mobile-lan-query-persist.mjs';
import { scheduleMobileLanWork } from './mobile-lan-boot.mjs';
import { tryMountClinicalTeamInviteBrowserGate } from './clinical-team-invite.mjs';
import { prefillRegistrationFromUrlParams } from './features/clinical-registration.mjs';
import {
  applyMobileSharerContextFromUrl,
  hydrateMobileSharerSessionFromSettings,
} from './mobile-sharer-sync.mjs';
import {
  registerDocumentExportRuntime,
  saveOutputDirSelection,
} from './document-export-client.mjs';
import {
  quickExportCurrentPatient,
  registerClinicalQuickExportRuntime,
} from './clinical-quick-export.mjs';
import { showToast } from './ui-toast.mjs';
import { initModalDismiss } from './app-shell-modals.mjs';
import {
  getUiDensity,
  isPaseMode,
  isGuardiaMode,
  setUiDensity,
  syncPaseReturnHeaderBtn,
  syncHeaderModeSeg,
  toggleGuardiaMode,
} from './features/chrome.mjs';
import { renderGuardiaBoard, syncGuardiaModeButtonVisibility } from './features/guardia-board.mjs';
import {
  configureLanFromMobileJoin,
  closeConnectionDropdown,
} from './features/lan-sync.mjs';
import {
  loadSettings,
  toggleProfileSection,
} from './features/profile.mjs';
import {
  initProductivityKeyboardShortcuts,
} from './features/productivity.mjs';
import {
  ensureEntregaLoaded,
  ensurePlatformLoaded,
  ensureSettingsHelpLoaded,
  shellCloseSettingsDropdown,
  shellSyncTeamSyncHeaderButton,
  shellToggleSettingsDropdown,
} from './lazy-feature-routes.mjs';
import {
  renderPatientList,
  renderRoundOverviewPanels,
} from './features/patients.mjs';
import {
  switchAppTab,
  openPaseSectionInNormal,
  renderPaseBoard,
} from './features/pase-board.mjs';
import { renderProcedureAgendaPanel } from './features/agenda.mjs';
import { patients, saveState } from './app-state.mjs';

const shellCtx = {
  getActiveId() { return null; },
  getActiveAppTab() { return 'lab'; },
  getActiveInner() { return 'todo'; },
  getSettings() { return {}; },
};

export function registerAppShellContext(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(shellCtx, ctx);
  setCommandPaletteContext(shellCtx);
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
  registerClinicalQuickExportRuntime({
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
  syncPaseReturnHeaderBtn();
  syncGuardiaModeButtonVisibility();
  syncGuardiaCensusPanelVisibility(shellCtx.getSettings());
  renderGuardiaCensusGrid(shellCtx.getSettings());
  if (isGuardiaMode()) renderGuardiaBoard(shellCtx.getSettings());
  syncHeaderContext(shellCtx);
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

function setMobileBootBanner(visible, text) {
  if (!isMobileWeb()) return;
  var el = document.getElementById('rpc-mobile-boot-banner');
  if (!el) return;
  if (text) el.textContent = text;
  el.classList.toggle('is-visible', !!visible);
}

async function initMobileWebBoot() {
  tryMountClinicalTeamInviteBrowserGate();
  if (!isMobileWeb()) return;
  try {
    wipeSessionClinicalStorage({ includeLanSession: false });
    clearWebSessionClinicalMemory();
  } catch (_wipeBoot) {
    void _wipeBoot;
  }
  setMobileBootBanner(true, 'Cargando R+ Móvil…');
  persistMobilePairingFromSearch(location.search, location.origin);
  restoreMobilePairingFromStorage();
  prefillRegistrationFromUrlParams();
  applyMobileSharerContextFromUrl();
  hydrateMobileSharerSessionFromSettings();
  closeConnectionDropdown();
  syncMobileBarebonesChrome();
  try {
    document.title = 'R+ Móvil';
  } catch (_e) {
    void _e;
  }
  shellSyncTeamSyncHeaderButton();
  try {
    var settingsMod = await ensureSettingsHelpLoaded();
    var v = await settingsMod.resolveAppVersionForTour();
    window.__RPC_APP_VERSION__ = settingsMod.normalizeTourVersionLabel(v);
    settingsMod.markGuidedTourVersionDone();
  } catch (_bootVer) {
    void _bootVer;
  }
  var intro = document.getElementById('onboarding-intro-backdrop');
  if (intro) {
    intro.classList.remove('open');
    intro.setAttribute('aria-hidden', 'true');
  }
  var parsed = parseLanJoinQuery(location.search, location.origin);
  var storedRoomId = resolveStoredMobileRoomId();
  var roomId = String(parsed.roomId || storedRoomId || '').trim();
  if (!window._rpcMobileLanSettledWired) {
    window._rpcMobileLanSettledWired = true;
    document.addEventListener('rpc-mobile-lan-sync-settled', function () {
      setMobileBootBanner(false);
      void (async function () {
        try {
          const access = await import('./clinical-access-runtime.mjs');
          if (typeof access.finalizeMobileLanPatientCensus === 'function') {
            await access.finalizeMobileLanPatientCensus();
          }
        } catch (_ePrune) {
          void _ePrune;
        }
      })();
    });
  }
  setMobileBootBanner(false);
  scheduleMobileLanWork(function () {
    setMobileBootBanner(true, 'Sincronizando con el anfitrión…');
    if (!parsed.teamCode) {
      var savedCfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() : null;
      if (savedCfg && savedCfg.teamCode && savedCfg.hostUrl) {
        configureLanFromMobileJoin(savedCfg.hostUrl, savedCfg.teamCode, roomId);
      } else {
        setMobileBootBanner(false);
      }
      return;
    }
    var hostUrl = String(parsed.hostUrl || location.origin || '')
      .trim()
      .replace(/\/+$/, '');
    if (!hostUrl) {
      setMobileBootBanner(false);
      return;
    }
    configureLanFromMobileJoin(hostUrl, parsed.teamCode, roomId);
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

var shellKeyboardWired = false;

function shellShortcutFromTypingField(e) {
  var tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (e.target && e.target.isContentEditable)
  );
}

function handleShellDigitShortcut(key) {
  if (isPaseMode()) {
    if (key === '1') openPaseSectionInNormal('labs');
    if (key === '2') openPaseSectionInNormal('expediente');
    if (key === '3') openPaseSectionInNormal('med');
    if (key === '4' || key === '5') openPaseSectionInNormal('agenda');
    return;
  }
  if (key === '1') switchAppTab('lab');
  if (key === '2') switchAppTab('nota');
  if (key === '3') switchAppTab('med');
  if (key === '4' || key === '5') switchAppTab('agenda');
}

function handleShellSettingsCommaShortcut() {
  var dd = document.getElementById('settings-dropdown');
  if (dd && dd.classList.contains('open')) shellCloseSettingsDropdown();
  else shellToggleSettingsDropdown();
}

function handleShellImportOverwriteShortcut() {
  window.__rpcPreferImportOverwrite = !window.__rpcPreferImportOverwrite;
  showToast(
    window.__rpcPreferImportOverwrite
      ? 'Importación: conflictos → sobrescribir (⌘⇧, o Ctrl+Shift+, de nuevo para apagar).'
      : 'Importación: se preguntará en cada conflicto.',
    window.__rpcPreferImportOverwrite ? 'success' : 'info'
  );
}

function handleShellNamedShortcut(e, key) {
  if (key === 'k' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    openCommandPalette();
    return true;
  }
  if (key === 'p' && !e.altKey) {
    e.preventDefault();
    if (e.shiftKey) toggleProfileSection();
    else if (isGuardiaMode()) setUiDensity('normal');
    else setUiDensity(getUiDensity() === 'normal' ? 'pase' : 'normal');
    return true;
  }
  if (key === 'g' && e.shiftKey && !e.altKey) {
    e.preventDefault();
    toggleGuardiaMode();
    return true;
  }
  return false;
}

function handleShellCommaShortcut(e) {
  if (e.key !== ',') return false;
  if (shellShortcutFromTypingField(e)) return true;
  e.preventDefault();
  if (!e.shiftKey && !e.altKey) handleShellSettingsCommaShortcut();
  else if (e.shiftKey && !e.altKey) handleShellImportOverwriteShortcut();
  return true;
}

function onShellModifierKeydown(e) {
  var key = e.key.toLowerCase();
  if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5') {
    e.preventDefault();
    handleShellDigitShortcut(key);
    return;
  }
  if (handleShellNamedShortcut(e, key)) return;
  handleShellCommaShortcut(e);
}

function initShellKeyboardShortcuts() {
  if (shellKeyboardWired) return;
  shellKeyboardWired = true;
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.metaKey || e.ctrlKey) onShellModifierKeydown(e);
    },
    true
  );
}




function normalizePatientFieldValue(field, value) {
  if (field === 'nombre' || field === 'area' || field === 'servicio') {
    return String(value || '').toUpperCase();
  }
  if (field === 'fiuxFecha' || field === 'fimiFecha') {
    return dateInputValueToAccesoFecha(value) || String(value || '').trim();
  }
  return value;
}

function applyPatientAccesoField(p, field, next) {
  if (field !== 'viaAcceso' && field !== 'accesoFecha') return;
  ensurePatientAccesos(p);
  var accRow =
    p.accesosList.find(function (a) {
      return String((a && a.via) || '').trim();
    }) || p.accesosList[0];
  if (field === 'viaAcceso') accRow.via = String(next || '').trim();
  else accRow.fecha = String(next || '').trim();
  syncLegacyAccesoFields(p);
}

function refreshPatientChromeAfterUpdate() {
  saveState();
  renderPatientList();
  syncWorkContextChrome();
  if (!isPaseMode()) return;
  renderPaseBoard();
  renderRoundOverviewPanels();
  if (shellCtx.getActiveAppTab() === 'agenda') renderProcedureAgendaPanel();
}

function updatePatient(field, value) {
  if (shellCtx.getActiveId() == null) return;
  var pid = String(shellCtx.getActiveId());
  var p = patients.find(function (pl) {
    return String(pl.id) === pid;
  });
  if (!p) return;
  var next = normalizePatientFieldValue(field, value);
  if (String(p[field] || '') === String(next || '')) return;
  p[field] = next;
  applyPatientAccesoField(p, field, next);
  refreshPatientChromeAfterUpdate();
}

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
  showToast,
  syncWorkContextChrome,
  setMedTabAttention,
  initModalDismiss,
};

export const appShellWindowHandlers = {
  onDefaultServicioBlur,
  onMedicoTemplateBlur,
  chooseOutputDir,
  updatePatient,
  quickExportCurrentPatient,
};

/** Expose clinical handoff entry points on window.appShell. */
export function installClinicalAppShell() {
  if (typeof window === 'undefined') return;
  window.appShell = window.appShell || {};
  void ensureEntregaLoaded().then(function (mod) {
    window.appShell.openEntregaModal = mod.openEntregaModal;
  });
}

function _rpcDeferInit(fn) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(
      function () {
        try {
          fn();
        } catch (e) {
          console.error('deferInit error:', e && e.message);
        }
      },
      { timeout: 1500 }
    );
  } else {
    setTimeout(function () {
      try {
        fn();
      } catch (e) {
        console.error('deferInit error:', e && e.message);
      }
    }, 200);
  }
}

export function scheduleDeferredShellInits() {
  _rpcDeferInit(installClinicalAppShell);
  _rpcDeferInit(function () {
    void ensurePlatformLoaded().then(function (mod) {
      mod.initGoalGFeatures();
    });
  });
  _rpcDeferInit(function () {
    void ensureSettingsHelpLoaded().then(function (mod) {
      mod.initGuidedTourGate();
    });
  });
  if (isMobileWeb()) {
    void initMobileWebBoot();
  } else {
    _rpcDeferInit(initMobileWebBoot);
  }
  _rpcDeferInit(function () {
    void ensurePlatformLoaded().then(function (mod) {
      mod.initRpcServerHealthWatch();
      mod.initIdleLockFeature();
    });
  });
}

export function scheduleDeferredUiInits() {
  _rpcDeferInit(initProductivityKeyboardShortcuts);
  _rpcDeferInit(initShellKeyboardShortcuts);
}

wireShellExportRuntimes();
