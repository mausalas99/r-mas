import {
  closeConnectionDropdown,
  isMobileWeb
} from "/js/chunks/chunk-3CMAB4PJ.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings
} from "/js/chunks/chunk-2VGC7OB3.js";

// public/js/features/settings-help/runtime.mjs
var defaults = {
  getSettings() {
    return (
      /** @type {any} */
      {}
    );
  },
  getActiveInner() {
    return null;
  },
  getActiveId() {
    return null;
  },
  setActiveId() {
  },
  switchInnerTab() {
  },
  renderInnerTabs() {
  },
  renderEstadoActualButton() {
  },
  renderEstadoActualBar() {
  },
  switchAppTab() {
  },
  showToast() {
  },
  launchConfetti() {
  },
  syncPreimportBackupUi() {
  },
  syncSettingsLanHostDiskSection() {
  },
  closeProfileModal() {
  },
  openProfileModal() {
  },
  renderMedRecetaPanel() {
  },
  renderListadoForm() {
  },
  openAddModalFromLabPatient() {
  },
  refreshAllTodoUIs() {
  },
  refreshExpedienteAfterPatientSelect() {
  }
};
var state = { rt: { ...defaults } };
function getSettingsHelpRuntime() {
  return state.rt;
}
function registerSettingsHelpRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(state.rt, ctx);
  import("/js/chunks/presentation-mode-2HGSBP3R.js").then(function(mod) {
    if (typeof mod.registerPresentationRuntime === "function") {
      mod.registerPresentationRuntime(state.rt);
    }
  }).catch(function(err) {
    console.warn("[settings-help] presentation runtime", err);
  });
}

// public/js/features/settings-help/settings-dropdown.mjs
function toggleSettingsSection() {
  toggleSettingsDropdown();
}
function syncSettingsDropdownA11y(open) {
  var dd = document.getElementById("settings-dropdown");
  var bg = document.getElementById("settings-dropdown-backdrop");
  if (!dd) return;
  dd.setAttribute("aria-hidden", open ? "false" : "true");
  if (bg) bg.setAttribute("aria-hidden", open ? "false" : "true");
  var trigger = document.getElementById("btn-open-settings");
  if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
}
function focusSettingsDropdownEntry() {
  var dd = document.getElementById("settings-dropdown");
  if (!dd) return;
  var target = dd.querySelector(".btn-settings-help-primary") || dd.querySelector("button, summary, [href], input, select, textarea");
  if (target && typeof target.focus === "function") target.focus();
}
function toggleSettingsDropdown() {
  if (isMobileWeb()) return;
  closeConnectionDropdown();
  var dd = document.getElementById("settings-dropdown");
  var bg = document.getElementById("settings-dropdown-backdrop");
  if (!dd) return;
  var open = dd.classList.contains("open");
  var nextOpen = !open;
  dd.classList.toggle("open", nextOpen);
  if (bg) bg.classList.toggle("open", nextOpen);
  syncSettingsDropdownA11y(nextOpen);
  if (nextOpen) {
    getSettingsHelpRuntime().syncPreimportBackupUi();
    getSettingsHelpRuntime().syncSettingsLanHostDiskSection();
    void import("/js/chunks/clinical-sync-mode-settings-TGSVL22G.js").then((m) => {
      if (typeof m.syncClinicalSyncModeSettingsUi === "function") {
        m.syncClinicalSyncModeSettingsUi();
      }
    }).catch(() => {
    });
    focusSettingsDropdownEntry();
  }
}
function closeSettingsDropdown() {
  var dd = document.getElementById("settings-dropdown");
  var bg = document.getElementById("settings-dropdown-backdrop");
  var trigger = document.getElementById("btn-open-settings");
  if (dd) dd.classList.remove("open");
  if (bg) bg.classList.remove("open");
  syncSettingsDropdownA11y(false);
  if (trigger && typeof trigger.focus === "function") trigger.focus();
}
function expandSettingsAccordionBackupSync() {
  var det = document.getElementById("settings-accordion-backup-sync");
  if (det) det.open = true;
}
function syncTeamSyncHeaderButton() {
  var btn = document.getElementById("btn-header-team-sync");
  if (!btn) return;
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    btn.style.display = "none";
    return;
  }
  var desktop = !!(window.electronAPI && typeof window.electronAPI.getAppVersion === "function");
  btn.style.display = desktop || isMobileWeb() ? "flex" : "none";
}
function ensureSettingsDropdownOpen() {
  var dd = document.getElementById("settings-dropdown");
  if (dd && !dd.classList.contains("open")) toggleSettingsDropdown();
}

export {
  getSettingsHelpRuntime,
  registerSettingsHelpRuntime,
  toggleSettingsSection,
  toggleSettingsDropdown,
  closeSettingsDropdown,
  expandSettingsAccordionBackupSync,
  syncTeamSyncHeaderButton,
  ensureSettingsDropdownOpen
};
//# sourceMappingURL=/js/chunks/chunk-O2OKXKS2.js.map
