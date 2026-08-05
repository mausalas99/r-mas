import {
  isClinicalLocalOnlyMode,
  readRpcSettings,
  setClinicalSyncModeLocalOnly
} from "/mobile/js/chunks/chunk-3566DTDN.js";
import {
  shouldShowNubePanel
} from "/mobile/js/chunks/chunk-6VYBWSQE.js";
import "/mobile/js/chunks/chunk-BRT2MMPP.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-LMOJUVZ4.js";

// public/js/features/clinical-sync-mode-settings.mjs
function toast(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function settingsSala() {
  const s = readRpcSettings();
  return String(s && s.clinicalSala || "").trim();
}
async function refreshChromeAfterLocalOnlyExit() {
  try {
    const { closeSettingsDropdown, syncTeamSyncHeaderButton } = await import("/mobile/js/chunks/settings-dropdown-B7UCU6M4.js");
    closeSettingsDropdown();
    syncTeamSyncHeaderButton();
  } catch (_e) {
    void _e;
  }
  try {
    const main = await import("/mobile/js/chunks/clinical-onboarding-main-LFHEK3VY.js");
    await main.refreshMainClinicalOnboardingIfNeeded();
  } catch (_e) {
    void _e;
  }
  try {
    const rot = await import("/mobile/js/chunks/clinical-rotation-entry-4KEGZ3XZ.js");
    if (typeof rot.syncClinicalRotationEntryChrome === "function") {
      rot.syncClinicalRotationEntryChrome();
    }
  } catch (_e) {
    void _e;
  }
  syncClinicalSyncModeSettingsUi();
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
    toast(
      shouldShowNubePanel(settingsSala()) ? "Ya usas sincronizaci\xF3n por Nube (\u21C4 Conexi\xF3n)." : "Ya usas guardia en red (LAN).",
      "info"
    );
    return;
  }
  if (shouldShowNubePanel(settingsSala())) {
    const okNube = window.confirm(
      "\xBFActivar sincronizaci\xF3n del turno?\n\nTu sala usa Nube (\u21C4 Conexi\xF3n), no LAN. Los expedientes en esta Mac se conservan."
    );
    if (!okNube) return;
    setClinicalSyncModeLocalOnly(false);
    await refreshChromeAfterLocalOnlyExit();
    toast("Sincronizaci\xF3n por Nube. Abre \u21C4 Conexi\xF3n para unirte a la sala del turno.", "success");
    return;
  }
  const ok = window.confirm(
    "\xBFActivar guardia en red (LAN)?\n\nConfigurar\xE1s usuario @usuario, sala y podr\xE1s usar Mi rotaci\xF3n y \u21C4 LiveSync. Los expedientes en esta Mac se conservan."
  );
  if (!ok) return;
  setClinicalSyncModeLocalOnly(false);
  try {
    const lan = await import("/mobile/js/chunks/lan-sync-C2VAOY3Q.js");
    if (typeof lan.ensureLanSyncRuntimeStarted === "function") {
      lan.ensureLanSyncRuntimeStarted();
    }
  } catch (err) {
    console.warn("[R+] LAN runtime after local-only exit:", err && err.message);
  }
  await refreshChromeAfterLocalOnlyExit();
  toast("Modo LAN activado. Completa tu perfil de guardia si R+ te lo pide.", "success");
}
var windowHandlers = {
  enableClinicalLanFromSettings,
  syncClinicalSyncModeSettingsUi
};
export {
  enableClinicalLanFromSettings,
  syncClinicalSyncModeSettingsUi,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/clinical-sync-mode-settings-UYTCNYWM.js.map
