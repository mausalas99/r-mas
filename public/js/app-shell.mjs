/**
 * Shell de aplicación: chrome de contexto, toast, modales, export clínico, atajos y arranque diferido.
 */
import { storage } from './storage.js';
import { syncHeaderContext } from './features/header-context.mjs';
import { openCommandPalette, setCommandPaletteContext } from './features/command-palette.mjs';
import { ensurePatientAccesos, syncLegacyAccesoFields } from './patient-accesos.mjs';
import { dateInputValueToAccesoFecha } from './patient-date-fields.mjs';
import { isRpcDatePopoverOpen, closeRpcDatePopover } from './rpc-date-picker.mjs';
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
import {
  createModalDismissRegistry,
  isRpcOverlayVisible,
  getOverlayZIndex,
} from './modal-dismiss.mjs';
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
import { openEntregaModal } from './features/clinical-entrega.mjs';
import {
  configureLanFromMobileJoin,
  closeConnectionDropdown,
  openConnectionDropdown,
} from './features/lan-sync.mjs';
import {
  loadSettings,
  closeProfileModal,
  openProfileModal,
  toggleProfileSection,
  closeTemplatesModal,
} from './features/profile.mjs';
import { closeClinicoUnlockModal } from './clinico-access.mjs';
import {
  closeSOAPModal,
} from './features/soap-estado.mjs';
import {
  closeProcedureAgendaModal,
} from './features/agenda.mjs';
import {
  chartsShellCloseProxies,
} from './lazy-feature-routes.mjs';
import { closeLabSomeTablesModal } from './features/lab-some-tables-modal.mjs';
import { closeLabBulkPreviewModal } from './features/lab-bulk-preview-modal.mjs';
import {
  closeSesionIngresoSendModal,
} from './features/sesion-ingreso-send-modal.mjs';
import {
  closeSesionIngresoTrendsSendModal,
} from './features/sesion-ingreso-trends-send-modal.mjs';
import {
  closeUnifiedSearch,
  closeExtraTemplatesManager,
  initProductivityKeyboardShortcuts,
} from './features/productivity.mjs';
import {
  resolveAppVersionForTour,
  normalizeTourVersionLabel,
  markGuidedTourVersionDone,
  initGuidedTourGate,
  hideTourIntroModal,
  closeLabBulkTourHintModal,
} from './features/settings-help/tour-engine.mjs';
import {
  syncTeamSyncHeaderButton,
  closeSettingsDropdown,
  toggleSettingsDropdown,
} from './features/settings-help/settings-dropdown.mjs';
import { closeQuickHelp } from './features/settings-help/help-content.mjs';
import { closeReleaseNotes } from './features/settings-help/release-notes.mjs';
import { hideUpdateModal } from './features/platform/updater.mjs';
import {
  closeWipeDataModal,
  initRpcServerHealthWatch,
  initIdleLockFeature,
} from './features/platform/offline.mjs';
import { initGoalGFeatures } from './features/platform/import-backup.mjs';
import {
  renderPatientList,
  closeModal,
  confirmCloseAddPatientModal,
  renderRoundOverviewPanels,
} from './features/patients.mjs';
import {
  switchAppTab,
  openPaseSectionInNormal,
  renderPaseBoard,
} from './features/pase-board.mjs';
import { renderProcedureAgendaPanel } from './features/agenda.mjs';
import { patients, saveState } from './app-state.mjs';
import { showToast } from './ui-toast.mjs';

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
  } catch (_wipeBoot) {}
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
  } catch (_e) {}
  syncTeamSyncHeaderButton();
  try {
    var v = await resolveAppVersionForTour();
    window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
    markGuidedTourVersionDone();
  } catch (_bootVer) {}
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
        } catch (_ePrune) {}
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

var modalDismiss = createModalDismissRegistry();
var modalDismissInited = false;

function initModalDismiss() {
  if (modalDismissInited) return;
  var dynamicBackdropIds = [
    'lab-dedupe-backdrop',
    'soap-confirm-backdrop',
    'dup-confirm-backdrop',
    'lab-conflict-backdrop',
    'exp-advice-backdrop',
    'tend-gaso-ext-backdrop',
  ];

  function el(id) {
    return document.getElementById(id);
  }

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('update-modal-backdrop'));
    },
    close: hideUpdateModal,
    backdropEl: function () {
      return el('update-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('tend-detail-backdrop'));
    },
    close: chartsShellCloseProxies.closeTendDetail,
    backdropEl: function () {
      return el('tend-detail-backdrop');
    },
    panelSelector: '#tend-detail-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var bd = el('tend-group-backdrop');
      if (bd && bd.getAttribute('aria-hidden') === 'false') return true;
      return chartsShellCloseProxies.isTendGroupModalOpen();
    },
    close: chartsShellCloseProxies.closeTendGroupModal,
    backdropEl: function () {
      return el('tend-group-backdrop');
    },
    panelSelector: '#tend-group-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('rpc-wipe-modal');
      return m && m.getAttribute('aria-hidden') === 'false';
    },
    close: closeWipeDataModal,
    backdropEl: function () {
      return el('rpc-wipe-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('soap-modal-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeSOAPModal,
    backdropEl: function () {
      return el('soap-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('procedure-agenda-modal');
      return m && m.classList.contains('open');
    },
    close: closeProcedureAgendaModal,
    backdropEl: function () {
      return el('procedure-agenda-modal');
    },
    panelSelector: '.modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('modal');
      return m && m.classList.contains('open');
    },
    close: closeModal,
    confirmClose: confirmCloseAddPatientModal,
    backdropEl: function () {
      return el('modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('profile-modal');
      return m && m.classList.contains('open');
    },
    close: closeProfileModal,
    backdropEl: function () {
      return el('profile-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('templates-modal'));
    },
    close: closeTemplatesModal,
    backdropEl: function () {
      return el('templates-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('extra-templates-modal'));
    },
    close: closeExtraTemplatesManager,
    backdropEl: function () {
      return el('extra-templates-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('unified-search-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeUnifiedSearch,
    backdropEl: function () {
      return el('unified-search-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('help-quick-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeQuickHelp,
    backdropEl: function () {
      return el('help-quick-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('release-notes-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeReleaseNotes,
    backdropEl: function () {
      return el('release-notes-backdrop');
    },
    panelSelector: '.release-notes-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('tend-hidden-modal-backdrop');
      return b && b.classList.contains('open');
    },
    close: chartsShellCloseProxies.closeTendHiddenModal,
    backdropEl: function () {
      return el('tend-hidden-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('lab-display-prefs-backdrop');
      return b && b.classList.contains('open');
    },
    close: chartsShellCloseProxies.closeLabDisplayPrefsModal,
    backdropEl: function () {
      return el('lab-display-prefs-backdrop');
    },
    panelSelector: '.lab-display-prefs-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('lab-bulk-preview-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeLabBulkPreviewModal,
    backdropEl: function () {
      return el('lab-bulk-preview-backdrop');
    },
    panelSelector: '.lab-bulk-preview-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('lab-bulk-tour-hint-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeLabBulkTourHintModal,
    backdropEl: function () {
      return el('lab-bulk-tour-hint-backdrop');
    },
    panelSelector: '.lab-bulk-tour-hint-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('clinico-unlock-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeClinicoUnlockModal,
    backdropEl: function () {
      return el('clinico-unlock-backdrop');
    },
    panelSelector: '.clinico-unlock-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('lab-some-tables-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeLabSomeTablesModal,
    backdropEl: function () {
      return el('lab-some-tables-backdrop');
    },
    panelSelector: '.lab-some-tables-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('sesion-ingreso-send-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeSesionIngresoSendModal,
    backdropEl: function () {
      return el('sesion-ingreso-send-backdrop');
    },
    panelSelector: '.sesion-ingreso-send-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('sesion-ingreso-trends-send-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeSesionIngresoTrendsSendModal,
    backdropEl: function () {
      return el('sesion-ingreso-trends-send-backdrop');
    },
    panelSelector: '.sesion-ingreso-send-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('onboarding-intro-backdrop');
      return b && b.classList.contains('open');
    },
    close: hideTourIntroModal,
    backdropEl: function () {
      return el('onboarding-intro-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var c = el('connection-dropdown');
      return c && c.classList.contains('open');
    },
    close: closeConnectionDropdown,
    backdropEl: function () {
      return el('connection-dropdown-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var s = el('settings-dropdown');
      return s && s.classList.contains('open');
    },
    close: closeSettingsDropdown,
    backdropEl: function () {
      return el('settings-dropdown-backdrop');
    }
  });

  // Diálogos dinámicos (lab dedupe, confirmaciones): registrados al final para
  // que Escape los cierre antes que modales estáticos cuando están visibles.
  modalDismiss.register({
    isOpen: function () {
      return dynamicBackdropIds.some(function (id) {
        var node = el(id);
        return isRpcOverlayVisible(node);
      });
    },
    close: function () {
      var top = null;
      var bestZ = -1;
      dynamicBackdropIds.forEach(function (id) {
        var node = el(id);
        var z = getOverlayZIndex(node);
        if (z > bestZ) {
          bestZ = z;
          top = node;
        }
      });
      if (!top) return;
      if (top.id === 'tend-gaso-ext-backdrop') {
        top.style.display = 'none';
        top.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('tend-gaso-ext-open');
        return;
      }
      top.remove();
    },
    backdropEl: function () {
      var best = null;
      var bestZ = -1;
      dynamicBackdropIds.forEach(function (id) {
        var node = el(id);
        var z = getOverlayZIndex(node);
        if (z > bestZ) {
          bestZ = z;
          best = node;
        }
      });
      return best;
    },
    panelSelector: '.lab-conflict-modal, .tend-gaso-ext-dialog, [role="dialog"]',
  });

  /* Calendario R+: Esc debe cerrar el popover antes que el modal de agenda u otros. */
  modalDismiss.register({
    isOpen: isRpcDatePopoverOpen,
    close: closeRpcDatePopover,
  });

  modalDismiss.init();
  modalDismissInited = true;

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('lab-conflict-backdrop')) return;
    if (dynamicBackdropIds.indexOf(t.id) === -1) return;
    t.remove();
  });
}

document.addEventListener('keydown', function(e) {
  var mod = e.metaKey || e.ctrlKey;
  if (mod) {
    var key = e.key.toLowerCase();
    if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5') {
      e.preventDefault();
      if (isPaseMode()) {
        if (key === '1') openPaseSectionInNormal('labs');
        if (key === '2') openPaseSectionInNormal('expediente');
        if (key === '3') openPaseSectionInNormal('med');
        if (key === '4' || key === '5') openPaseSectionInNormal('agenda');
      } else {
        if (key === '1') switchAppTab('lab');
        if (key === '2') switchAppTab('nota');
        if (key === '3') switchAppTab('med');
        if (key === '4' || key === '5') switchAppTab('agenda');
      }
    }
    if (key === 'k' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      openCommandPalette();
    }
    if (key === 'p' && !e.altKey) {
      e.preventDefault();
      if (e.shiftKey) toggleProfileSection();
      else if (isGuardiaMode()) setUiDensity('normal');
      else setUiDensity(getUiDensity() === 'normal' ? 'pase' : 'normal');
    }
    if (key === 'g' && e.shiftKey && !e.altKey) {
      e.preventDefault();
      toggleGuardiaMode();
    }
    if (e.key === ',' && !e.shiftKey && !e.altKey) {
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
      var dd = document.getElementById('settings-dropdown');
      if (dd && dd.classList.contains('open')) closeSettingsDropdown();
      else toggleSettingsDropdown();
    }
    if (e.key === ',' && e.shiftKey && !e.altKey) {
      var tag2 = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
      if (tag2 === 'INPUT' || tag2 === 'TEXTAREA' || tag2 === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
      window.__rpcPreferImportOverwrite = !window.__rpcPreferImportOverwrite;
      showToast(
        window.__rpcPreferImportOverwrite
          ? 'Importación: conflictos → sobrescribir (⌘⇧, o Ctrl+Shift+, de nuevo para apagar).'
          : 'Importación: se preguntará en cada conflicto.',
        window.__rpcPreferImportOverwrite ? 'success' : 'info'
      );
    }
  }
}, true);


function updatePatient(field, value) {
  if (shellCtx.getActiveId() == null) return;
  var pid = String(shellCtx.getActiveId());
  var p = patients.find(function (pl) {
    return String(pl.id) === pid;
  });
  if (!p) return;
  var next =
    field === 'nombre' || field === 'area' || field === 'servicio'
      ? String(value || '').toUpperCase()
      : value;
  if (String(p[field] || '') === String(next || '')) return;
  p[field] = next;
  if (field === 'fiuxFecha' || field === 'fimiFecha') {
    next = dateInputValueToAccesoFecha(value) || String(value || '').trim();
  }
  if (field === 'viaAcceso' || field === 'accesoFecha') {
    ensurePatientAccesos(p);
    var accRow =
      p.accesosList.find(function (a) {
        return String(a && a.via || '').trim();
      }) || p.accesosList[0];
    if (field === 'viaAcceso') accRow.via = String(next || '').trim();
    else accRow.fecha = String(next || '').trim();
    syncLegacyAccesoFields(p);
  }
  saveState();
  renderPatientList();
  syncWorkContextChrome();
  if (isPaseMode()) {
    renderPaseBoard();
    renderRoundOverviewPanels();
    if (shellCtx.getActiveAppTab() === 'agenda') renderProcedureAgendaPanel();
  }
}

export function rpcPrefersReducedMotion() {
  try {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch (_e) {
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
  window.appShell.openEntregaModal = openEntregaModal;
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
  _rpcDeferInit(initGoalGFeatures);
  _rpcDeferInit(initGuidedTourGate);
  if (isMobileWeb()) {
    void initMobileWebBoot();
  } else {
    _rpcDeferInit(initMobileWebBoot);
  }
  _rpcDeferInit(initRpcServerHealthWatch);
  _rpcDeferInit(initIdleLockFeature);
}

export function scheduleDeferredUiInits() {
  _rpcDeferInit(initProductivityKeyboardShortcuts);
}

wireShellExportRuntimes();
