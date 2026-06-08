import {
  isDbMode
} from "/js/chunks/chunk-K6QXHWFW.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings,
  setClinicalSyncModeLocalOnly
} from "/js/chunks/chunk-M3F4WDAD.js";

// public/js/features/clinical-sync-mode-settings.mjs
function toast(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function syncClinicalSyncModeSettingsUi() {
  const wrap = document.getElementById("settings-clinical-sync-mode");
  if (!wrap) return;
  const show = isDbMode() && isClinicalLocalOnlyMode(readRpcSettings());
  wrap.hidden = !show;
}
async function enableClinicalLanFromSettings() {
  if (!isDbMode()) {
    toast("La base cl\xEDnica no est\xE1 activa.", "error");
    return;
  }
  if (!isClinicalLocalOnlyMode(readRpcSettings())) {
    toast("Ya usas guardia en red (LAN).", "info");
    return;
  }
  const ok = window.confirm(
    "\xBFActivar guardia en red (LAN)?\n\nConfigurar\xE1s usuario @usuario, sala y podr\xE1s usar Mi rotaci\xF3n y \u21C4 LiveSync. Los expedientes en esta Mac se conservan."
  );
  if (!ok) return;
  setClinicalSyncModeLocalOnly(false);
  try {
    const lan = await import("/js/chunks/lan-sync-45XGOF6A.js");
    if (typeof lan.ensureLanSyncRuntimeStarted === "function") {
      lan.ensureLanSyncRuntimeStarted();
    }
  } catch (err) {
    console.warn("[R+] LAN runtime after local-only exit:", err && err.message);
  }
  try {
    const { closeSettingsDropdown, syncTeamSyncHeaderButton } = await import("/js/chunks/settings-dropdown-PVY2ELFE.js");
    closeSettingsDropdown();
    syncTeamSyncHeaderButton();
  } catch (_e) {
  }
  try {
    const main = await import("/js/chunks/clinical-onboarding-main-PFST3IUE.js");
    await main.refreshMainClinicalOnboardingIfNeeded();
  } catch (_e) {
  }
  try {
    const rot = await import("/js/chunks/clinical-rotation-entry-F7V7E3LR.js");
    if (typeof rot.syncClinicalRotationEntryChrome === "function") {
      rot.syncClinicalRotationEntryChrome();
    }
  } catch (_e) {
  }
  syncClinicalSyncModeSettingsUi();
  toast("Modo LAN activado. Completa tu perfil de guardia si R+ te lo pide.", "success");
}
var windowHandlers = {
  enableClinicalLanFromSettings,
  syncClinicalSyncModeSettingsUi
};

export {
  syncClinicalSyncModeSettingsUi,
  enableClinicalLanFromSettings,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-CXFNWMYY.js.map
