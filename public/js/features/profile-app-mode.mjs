/** Perfil — app mode (Sala / Inter / Guardia) switching. */
import {
  isGuardiaMode,
  toggleGuardiaMode,
  syncHeaderModeSeg,
  toggleHeaderModeSegExpand,
  collapseHeaderModeSeg,
} from "./chrome.mjs";
import { syncCensoExportButtonVisibility } from "../censo-export.mjs";
import { isModeSala } from "../mode-features.mjs";
import { migrateGranularInner } from "../expediente-tabs.mjs";
import { renderNotaEvolucionPrimaryTab } from "./nota-evolucion/nota-evolucion-primary-tab.mjs";
import { renderEstadoActualButton } from "./soap-estado.mjs";
import { renderPatientList } from "./patients.mjs";
import {
  switchInnerTab,
  getActiveInnerTab,
  refreshExpedienteForAppModeChange,
} from "./expediente-navigation.mjs";
import { renderPatientDataPane } from "./expediente.mjs";
import {
  getProfileRuntime,
  invalidateLoadSettingsSnapshot,
  persistSettingsToLocalStorage,
  settingsRef,
  syncAppModeRadioControls,
} from "./profile-runtime.mjs";
import { syncProfileModalLayout } from "./profile-load.mjs";

/**
 * Loaded lazily (not a top-level import) so the 10b Interconsulta chrome
 * stays out of the eager boot payload — it only matters once a user
 * actually switches into Interconsulta mode.
 */
function syncInterconsultaModeChrome() {
  import("./interconsulta-mode-chrome.mjs").then(function (mod) {
    mod.syncInterconsultaModeChrome();
  });
}

function reconcileActiveInnerForAppMode(nowSala) {
  var settings = settingsRef();
  var current = getActiveInnerTab() || "todo";
  var migrated = migrateGranularInner(current, settings);
  if (migrated !== current) {
    switchInnerTab(migrated, { forceRender: true });
    return;
  }
  if (nowSala && (current === "notas" || current === "indica")) {
    switchInnerTab("estadoActual", { forceRender: true });
  } else if (!nowSala && current === "listado") {
    switchInnerTab("recetaHu", { forceRender: true });
  }
}

export function applyAppModeSwitchEffects() {
  var nowSala = isModeSala(settingsRef());
  try {
    reconcileActiveInnerForAppMode(nowSala);
    syncAppModeRadioControls();
    refreshExpedienteForAppModeChange();
    renderEstadoActualButton();
    syncCensoExportButtonVisibility();
    syncHeaderModeSeg();
    var rt = getProfileRuntime();
    if (rt.getActiveId()) {
      if (typeof rt.rebuildEstudiosFromLabHistory === "function") {
        rt.rebuildEstudiosFromLabHistory(rt.getActiveId());
      }
      if (!nowSala) renderNotaEvolucionPrimaryTab();
      var inner = getActiveInnerTab();
      if (inner === "datos" || inner === "todo") renderPatientDataPane();
    }
    rt.syncWorkContextChrome();
    renderPatientList();
    syncInterconsultaModeChrome();
    rt.showToast("Modo cambiado a " + (nowSala ? "Sala" : "Interconsulta"), "success");
  } catch (err) {
    console.error("[R+] applyAppModeSwitchEffects:", err);
    getProfileRuntime().showToast("No se pudo actualizar la vista al cambiar de modo.", "error");
  }
}

export function onAppModeChange() {
  var sala = document.getElementById("app-mode-sala");
  var st = settingsRef();
  st.appMode = sala && sala.checked ? "sala" : "interconsulta";
  invalidateLoadSettingsSnapshot();
  syncProfileModalLayout();
  persistSettingsToLocalStorage();
  applyAppModeSwitchEffects();
}

export function toggleHeaderWorkMode() {
  var st = settingsRef();
  st.appMode = isModeSala(st) ? "interconsulta" : "sala";
  invalidateLoadSettingsSnapshot();
  syncAppModeRadioControls();
  applyAppModeSwitchEffects();
  persistSettingsToLocalStorage();
}

export function setWorkModeFromHeader(mode) {
  var st = settingsRef();
  var current = isGuardiaMode() ? "guardia" : isModeSala(st) ? "sala" : "interconsulta";
  if (mode === current) {
    toggleHeaderModeSegExpand();
    syncHeaderModeSeg();
    syncInterconsultaModeChrome();
    return;
  }
  if (mode === "guardia") {
    toggleGuardiaMode();
    collapseHeaderModeSeg();
    syncHeaderModeSeg();
    syncInterconsultaModeChrome();
    return;
  }
  if (isGuardiaMode()) toggleGuardiaMode();
  var wantSala = mode === "sala";
  if (wantSala !== isModeSala(st)) {
    st.appMode = wantSala ? "sala" : "interconsulta";
    invalidateLoadSettingsSnapshot();
    syncAppModeRadioControls();
    applyAppModeSwitchEffects();
    persistSettingsToLocalStorage();
  }
  collapseHeaderModeSeg();
  syncHeaderModeSeg();
  syncInterconsultaModeChrome();
}
