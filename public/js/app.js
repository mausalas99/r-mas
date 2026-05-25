import { storage } from './storage.js';
import { initAppState, patients } from './app-state.mjs';
import {
  registerAppRuntimeContext,
  registerAllFeatureRuntimes,
  runInitialFeatureBoot,
  wasV3MigratedThisBoot,
} from './app-runtimes.mjs';
import {
  registerAppShellContext,
  appShellWindowHandlers,
  showToast,
  scheduleDeferredShellInits,
  scheduleDeferredUiInits,
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
import { windowHandlers as soapEstadoWindowHandlers } from './features/soap-estado.mjs';
import { windowHandlers as agendaWindowHandlers } from './features/agenda.mjs';
import { windowHandlers as expedienteWindowHandlers } from './features/expediente.mjs';
import { windowHandlers as notesIndicacionesWindowHandlers } from './features/notes-indicaciones.mjs';
import { productivityWindowHandlers } from './features/productivity.mjs';
import { settingsHelpWindowHandlers } from './features/settings-help.mjs';
import { platformWindowHandlers } from './features/platform.mjs';
import { tendenciasWindowHandlers, seedTendHiddenDefaults } from './features/tendencias.mjs';
import { todosWindowHandlers } from './features/todos.mjs';
import { windowHandlers as paseBoardWindowHandlers, syncMainAppTabA11y, renderInnerTabs, initTabBarMotion } from './features/pase-board.mjs';
import { medicationsWindowHandlers } from './features/medications.mjs';
import { profileWindowHandlers } from './features/profile.mjs';

const allWindowHandlers = Object.assign(
  {},
  chromeWindowHandlers,
  lanWindowHandlers,
  patientsWindowHandlers,
  labPanelWindowHandlers,
  soapEstadoWindowHandlers,
  agendaWindowHandlers,
  expedienteWindowHandlers,
  notesIndicacionesWindowHandlers,
  productivityWindowHandlers,
  settingsHelpWindowHandlers,
  platformWindowHandlers,
  tendenciasWindowHandlers,
  todosWindowHandlers,
  paseBoardWindowHandlers,
  medicationsWindowHandlers,
  profileWindowHandlers,
  appShellWindowHandlers
);

try {
  Object.assign(window, allWindowHandlers);
} catch (assignErr) {
  console.error('[R+] No se pudieron registrar handlers en window:', assignErr);
}

initAppState();

var activeId = null;
var activeInner = 'todo';
var activeAppTab = 'lab';
var settings = storage.getSettings();

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

try {
  registerAllFeatureRuntimes();
  runInitialFeatureBoot();
} catch (bootErr) {
  console.error('[R+] Error registrando runtimes de features:', bootErr);
}

function runDomBoot() {
  try {
    var todayEl = document.getElementById('today-date');
    if (todayEl) {
      todayEl.textContent = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    renderPatientList();
    if (patients.length > 0) selectPatient(patients[0].id);
    else renderLabHistoryPanel();
    loadSettings();
    syncWorkContextChrome();
    seedTendHiddenDefaults();
    syncMainAppTabA11y(activeAppTab);
    renderInnerTabs();
    initTabBarMotion();
    if (wasV3MigratedThisBoot()) {
      setTimeout(function () {
        try {
          showToast('R+ 3.0 — Sala activado por defecto. Cambia en Mi Perfil → Aplicación.');
        } catch (_e) {}
      }, 800);
    }
    scheduleDeferredShellInits();
    scheduleDeferredUiInits();
    _rpcDeferInit(initSidebarAutoHide);
    _rpcDeferInit(initPatientModalEnterSave);
    syncProfileSectionVisibility();
  } catch (domErr) {
    console.error('[R+] Error en arranque de UI:', domErr);
  }
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
