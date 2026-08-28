import {
  showConfirmDialog
} from "/mobile/js/chunks/chunk-CBI7THZ4.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings,
  setClinicalSyncModeLocalOnly
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  shouldShowNubePanel
} from "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-QGV722W2.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-FLGCYVFI.js";

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
    const { closeSettingsDropdown, syncTeamSyncHeaderButton } = await import("/mobile/js/chunks/settings-dropdown-KB74A445.js");
    closeSettingsDropdown();
    syncTeamSyncHeaderButton();
  } catch (_e) {
    void _e;
  }
  try {
    const main = await import("/mobile/js/chunks/clinical-onboarding-main-JGMTC5M4.js");
    await main.refreshMainClinicalOnboardingIfNeeded();
  } catch (_e) {
    void _e;
  }
  try {
    const rot = await import("/mobile/js/chunks/clinical-rotation-entry-M5SNTRLZ.js");
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
    const okNube = await showConfirmDialog({
      id: "clinical-sync-mode-nube-confirm",
      title: "Activar sincronizaci\xF3n del turno",
      question: "Tu sala usa Nube (\u21C4 Conexi\xF3n), no LAN. Los expedientes en esta Mac se conservan.",
      confirmLabel: "Activar",
      cancelLabel: "Cancelar"
    });
    if (!okNube) return;
    setClinicalSyncModeLocalOnly(false);
    await refreshChromeAfterLocalOnlyExit();
    toast("Sincronizaci\xF3n por Nube. Abre \u21C4 Conexi\xF3n para unirte a la sala del turno.", "success");
    return;
  }
  const ok = await showConfirmDialog({
    id: "clinical-sync-mode-lan-confirm",
    title: "Activar guardia en red (LAN)",
    question: "Configurar\xE1s usuario @usuario, sala y podr\xE1s usar Mi rotaci\xF3n y \u21C4 LiveSync. Los expedientes en esta Mac se conservan.",
    confirmLabel: "Activar",
    cancelLabel: "Cancelar"
  });
  if (!ok) return;
  setClinicalSyncModeLocalOnly(false);
  try {
    const lan = await import("/mobile/js/chunks/mutate-bridge-KCVUIRYA.js");
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
//# sourceMappingURL=/js/chunks/clinical-sync-mode-settings-IMUDRFP3.js.map
