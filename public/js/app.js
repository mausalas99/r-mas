import { storage } from './storage.js';
import { isDbMode } from './db-storage-bridge.mjs';
import { ensureClinicalDbUnlocked, dbUnlockWindowHandlers } from './features/db-unlock.mjs';
import { bootHydrateFromDb, initAppState, patients, setSaveStateHooks, flushSaveState } from './app-state.mjs';
import { recoverPresentationPatientsOnBoot } from './presentation-mode.mjs';
import './censo-export.mjs';
import {
  registerAppRuntimeContext,
  registerAllFeatureRuntimes,
  runInitialFeatureBoot,
  wasV3MigratedThisBoot,
} from './app-runtimes.mjs';
import { isMobileWeb } from './mobile-web.mjs';
import {
  registerAppShellContext,
  appShellWindowHandlers,
  showToast,
  scheduleDeferredShellInits,
  scheduleDeferredUiInits,
  initModalDismiss,
  syncWorkContextChrome,
} from './app-shell.mjs';
import { attachProfileSettingsGetter, loadSettings, syncProfileSectionVisibility } from './features/profile.mjs';
import { windowHandlers as chromeWindowHandlers } from './features/chrome.mjs';
import { windowHandlers as lanWindowHandlers } from './features/lan-sync.mjs';
import {
  windowHandlers as patientsWindowHandlers,
  renderPatientList,
  selectPatient,
  initSidebarAutoHide,
  initPatientModalEnterSave,
} from './features/patients.mjs';
import { windowHandlers as labPanelWindowHandlers, renderLabHistoryPanel } from './features/lab-panel.mjs';
import { windowHandlers as labBulkPreviewWindowHandlers } from './features/lab-bulk-preview-modal.mjs';
import { windowHandlers as labHistoryBatchCopyWindowHandlers } from './features/lab-history-batch-copy-modal.mjs';
import { windowHandlers as soapEstadoWindowHandlers } from './features/soap-estado.mjs';
import { windowHandlers as estadoActualPanelWindowHandlers } from './features/estado-actual-panel.mjs';
import { windowHandlers as estadoActualPasteWindowHandlers } from './features/estado-actual-paste-modal.mjs';
import { windowHandlers as driveImportWindowHandlers } from './features/drive-import-modal.mjs';
import { windowHandlers as estadoActualRegistroWindowHandlers } from './features/estado-actual-registro-modal.mjs';
import { windowHandlers as agendaWindowHandlers } from './features/agenda.mjs';
import { windowHandlers as expedienteWindowHandlers } from './features/expediente.mjs';
import { windowHandlers as notesIndicacionesWindowHandlers } from './features/notes-indicaciones.mjs';
import { productivityWindowHandlers } from './features/productivity.mjs';
import {
  settingsHelpWindowHandlersLazy,
  platformWindowHandlersLazy,
} from './lazy-feature-routes.mjs';
import { tendenciasWindowHandlers, seedTendHiddenDefaults } from './features/tendencias.mjs';
import { todosWindowHandlers } from './features/todos.mjs';
import { recetaHuWindowHandlers } from './features/receta-hu.mjs';
import { windowHandlers as paseBoardWindowHandlers, syncMainAppTabA11y, renderInnerTabs, initTabBarMotion } from './features/pase-board.mjs';
import { medicationsWindowHandlers } from './features/medications.mjs';
import {
  profileWindowHandlers,
  hydrateProfileSettings,
  toggleHeaderWorkMode,
} from './features/profile.mjs';
import { initRpcDatePicker } from './rpc-date-picker.mjs';
import {
  initClinicalAccessRuntime,
  resumeClinicalSession,
} from './clinical-access-runtime.mjs';
import { windowHandlers as clinicalRegistrationWindowHandlers } from './features/clinical-registration.mjs';
import {
  windowHandlers as clinicalRotationEntryHandlers,
  wireClinicalRotationEntryControls,
  syncClinicalRotationEntryChrome,
} from './features/clinical-rotation-entry.mjs';
import { windowHandlers as clinicalSyncModeSettingsHandlers } from './features/clinical-sync-mode-settings.mjs';
import { wireClinicalTeamsControls } from './features/clinical-teams.mjs';
import { tryMountClinicalTeamInviteBrowserGate } from './clinical-team-invite.mjs';
import { syncGuardiaModeButtonVisibility } from './features/guardia-board.mjs';
import { resolveClinicalClientId } from './clinical-settings.mjs';
import { runBootSteps } from './boot/boot-steps.mjs';

const allWindowHandlers = Object.assign(
  {},
  dbUnlockWindowHandlers,
  chromeWindowHandlers,
  lanWindowHandlers,
  patientsWindowHandlers,
  labPanelWindowHandlers,
  labBulkPreviewWindowHandlers,
  labHistoryBatchCopyWindowHandlers,
  soapEstadoWindowHandlers,
  estadoActualPanelWindowHandlers,
  estadoActualPasteWindowHandlers,
  driveImportWindowHandlers,
  estadoActualRegistroWindowHandlers,
  agendaWindowHandlers,
  expedienteWindowHandlers,
  notesIndicacionesWindowHandlers,
  productivityWindowHandlers,
  settingsHelpWindowHandlersLazy,
  platformWindowHandlersLazy,
  tendenciasWindowHandlers,
  todosWindowHandlers,
  recetaHuWindowHandlers,
  paseBoardWindowHandlers,
  medicationsWindowHandlers,
  profileWindowHandlers,
  clinicalRegistrationWindowHandlers,
  clinicalRotationEntryHandlers,
  clinicalSyncModeSettingsHandlers,
  appShellWindowHandlers,
  {
    showToast,
    loadSettings,
    resumeClinicalSession: function () {
      return resumeClinicalSession(settings, getClinicalClientId());
    },
  }
);

try {
  Object.assign(window, allWindowHandlers);
} catch (assignErr) {
  console.error('[R+] No se pudieron registrar handlers en window:', assignErr);
}

const appStateReady = (async function loadClinicalStateOnBoot() {
  if (isDbMode()) {
    const unlockResult = await ensureClinicalDbUnlocked();
    if (unlockResult && unlockResult.unlocked) {
      await bootHydrateFromDb();
      try {
        const { flushPendingClinicalOpsLanSnapshot } = await import('./clinical-ops-lan.mjs');
        const flushed = await flushPendingClinicalOpsLanSnapshot();
        if (flushed.changed && typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent('rpc-clinical-ops-synced'));
        }
      } catch (_eOps) {}
    } else {
      console.warn(
        '[R+] Clinical DB not ready at boot:',
        (unlockResult && unlockResult.reason) || 'locked'
      );
      initAppState();
    }
  } else {
    initAppState();
  }
})();

setSaveStateHooks({
  onSaveResult(result) {
    if (!result || result.ok) {
      if (result && result.level === 'warn') {
        showToast(
          'El almacenamiento local está casi lleno. Archiva pacientes egresados, exporta un respaldo y elimina duplicados de labs.',
          'error'
        );
      }
      return;
    }
    if (result.code === 'QUOTA_EXCEEDED') {
      showToast(
        'No se pudo guardar: almacenamiento local lleno. Exporta un respaldo JSON, archiva o elimina historial de labs antes de seguir.',
        'error'
      );
    }
  },
});

window.addEventListener('beforeunload', function () {
  flushSaveState();
});
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') flushSaveState();
});

var activeId = null;
var activeInner = 'todo';
var activeAppTab = 'lab';
var settings = hydrateProfileSettings(storage.getSettings());

attachProfileSettingsGetter(function () {
  return settings;
});

registerAppShellContext({
  getActiveId: function () {
    return activeId;
  },
  getActiveAppTab: function () {
    return activeAppTab;
  },
  getActiveInner: function () {
    return activeInner;
  },
  getSettings: function () {
    return settings;
  },
});

registerAppRuntimeContext({
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  getActiveAppTab: function () {
    return activeAppTab;
  },
  setActiveAppTab: function (v) {
    activeAppTab = v;
  },
  getActiveInner: function () {
    return activeInner;
  },
  setActiveInner: function (v) {
    activeInner = v;
  },
  getSettings: function () {
    return settings;
  },
});

async function registerFeatureRuntimesForBoot() {
  if (isMobileWeb()) {
    void registerAllFeatureRuntimes();
    runInitialFeatureBoot();
    return;
  }
  await registerAllFeatureRuntimes();
  runInitialFeatureBoot();
}

appStateReady
  .then(async function () {
    try {
      await registerFeatureRuntimesForBoot();
    } catch (bootErr) {
      console.error('[R+] Error registrando runtimes de features:', bootErr);
    }
  })
  .catch(async function (stateErr) {
    console.error('[R+] Error cargando estado clínico:', stateErr);
    try {
      initAppState();
      await registerFeatureRuntimesForBoot();
    } catch (bootErr) {
      console.error('[R+] Error registrando runtimes de features:', bootErr);
    }
  });

function getClinicalClientId() {
  return resolveClinicalClientId(settings);
}

function syncHeaderTodayDate() {
  var todayEl = document.getElementById('today-date');
  if (!todayEl) return;
  var d = new Date();
  var long = d.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  var compact = d.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  var narrow = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 920px)').matches;
  todayEl.textContent = narrow ? compact : long;
  todayEl.title = long;
}

const CLINICAL_DB_BOOT_STEPS = [
  {
    id: 'clinical-access-init',
    async run(ctx) {
      await initClinicalAccessRuntime(ctx.settings, ctx.getClinicalClientId());
    },
  },
  {
    id: 'onboarding-dynamic-import',
    async run() {
      loadSettings();
      const mod = await import('./features/clinical-onboarding-main.mjs');
      await mod.showMainClinicalOnboarding();
    },
  },
  {
    id: 'clinical-teams-dynamic-import',
    async run(ctx) {
      wireClinicalRotationEntryControls();
      wireClinicalTeamsControls();
      syncClinicalRotationEntryChrome();
      syncGuardiaModeButtonVisibility();
      ctx.teamsMod = await import('./features/clinical-teams.mjs');
    },
  },
  {
    id: 'consume-team-join-url',
    async run(ctx) {
      const teamsMod = ctx.teamsMod;
      if (teamsMod && typeof teamsMod.consumeClinicalTeamJoinFromUrl === 'function') {
        await teamsMod.consumeClinicalTeamJoinFromUrl();
      }
    },
  },
];

function runDomBoot() {
  appStateReady.then(function () {
    runDomBootAfterState();
  }).catch(function () {
    runDomBootAfterState();
  });
}

function runDomBootAfterState() {
  try {
    tryMountClinicalTeamInviteBrowserGate();
    if (recoverPresentationPatientsOnBoot()) {
      showToast('Se restauró tu lista de pacientes tras el modo presentación.', 'info');
    }
    initModalDismiss();
    syncHeaderTodayDate();
    if (!window._rpcHeaderDateResizeWired) {
      window._rpcHeaderDateResizeWired = true;
      window.addEventListener('resize', syncHeaderTodayDate);
    }
    loadSettings();
    syncWorkContextChrome();
    seedTendHiddenDefaults();
    syncMainAppTabA11y(activeAppTab);
    renderInnerTabs();
    initTabBarMotion();
    if (
      wasV3MigratedThisBoot() &&
      !isMobileWeb() &&
      !(window.electronAPI && typeof window.electronAPI.isLanDevPeer === 'function' && window.electronAPI.isLanDevPeer())
    ) {
      setTimeout(function () {
        try {
          showToast('R+ 3.0 — Sala activado por defecto. Cambia en Mi Perfil → Aplicación.');
        } catch (_e) {}
      }, 800);
    }
    scheduleDeferredShellInits();
    scheduleDeferredUiInits();
    initRpcDatePicker();
    _rpcDeferInit(initSidebarAutoHide);
    _rpcDeferInit(initPatientModalEnterSave);
    syncProfileSectionVisibility();
    wireHeaderAppModeChip();
    function finishPatientListBoot() {
      void import('./clinical-access-runtime.mjs')
        .then(function (mod) {
          if (typeof mod.refreshClinicalPatientListForScope === 'function') {
            return mod.refreshClinicalPatientListForScope();
          }
          renderPatientList();
        })
        .catch(function () {
          renderPatientList();
        })
        .then(function () {
          if (patients.length > 0) selectPatient(patients[0].id);
          else renderLabHistoryPanel();
        });
    }
    if (isDbMode()) {
      void runBootSteps(CLINICAL_DB_BOOT_STEPS, {
        settings,
        getClinicalClientId,
        teamsMod: null,
      })
        .then(finishPatientListBoot)
        .catch(function (err) {
          console.warn('[R+] Clinical access runtime init:', err && err.message);
          finishPatientListBoot();
        });
    } else {
      finishPatientListBoot();
    }
  } catch (domErr) {
    console.error('[R+] Error en arranque de UI:', domErr);
  }
}

function wireHeaderAppModeChip() {
  var chip = document.getElementById('header-app-mode-chip');
  if (!chip || chip._rpcModeChipWired) return;
  chip._rpcModeChipWired = true;
  chip.addEventListener('click', function (ev) {
    ev.preventDefault();
    toggleHeaderWorkMode();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runDomBoot);
} else {
  runDomBoot();
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
