import {
  getSettingsHelpRuntime
} from "/js/chunks/chunk-XQD76GCT.js";
import {
  closeConnectionDropdown,
  isMobileWeb
} from "/js/chunks/chunk-DNQEP2KV.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings
} from "/js/chunks/chunk-M3F4WDAD.js";

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
    void import("/js/chunks/clinical-sync-mode-settings-VNJB5TJM.js").then((m) => {
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
  toggleSettingsSection,
  toggleSettingsDropdown,
  closeSettingsDropdown,
  expandSettingsAccordionBackupSync,
  syncTeamSyncHeaderButton,
  ensureSettingsDropdownOpen
};
//# sourceMappingURL=/js/chunks/chunk-NGXTIUNL.js.map
