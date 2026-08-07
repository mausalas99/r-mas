import {
  isClinicalLocalOnlyMode,
  readRpcSettings,
  setClinicalSyncModeLocalOnly
} from "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import {
  shouldShowNubePanel
} from "/mobile/js/chunks/chunk-T2MO3KS5.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-GRJDNRYE.js";

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
    const { closeSettingsDropdown, syncTeamSyncHeaderButton } = await import("/mobile/js/chunks/settings-dropdown-JLUDVC3V.js");
    closeSettingsDropdown();
    syncTeamSyncHeaderButton();
  } catch (_e) {
    void _e;
  }
  try {
    const main = await import("/mobile/js/chunks/clinical-onboarding-main-6UO2PEEB.js");
    await main.refreshMainClinicalOnboardingIfNeeded();
  } catch (_e) {
    void _e;
  }
  try {
    const rot = await import("/mobile/js/chunks/clinical-rotation-entry-QSY6PLN3.js");
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
    const lan = await import("/mobile/js/chunks/mutate-bridge-AKDBX5VY.js");
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
//# sourceMappingURL=/js/chunks/clinical-sync-mode-settings-4KE2YMZX.js.map
