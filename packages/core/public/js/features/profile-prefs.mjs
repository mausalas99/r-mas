/** Perfil — Manejo tab and listado AI prompt preferences. */
import { isManejoSectionHidden, migrateGranularInner } from "../expediente-tabs.mjs";
import { renderListadoForm } from "./expediente.mjs";
import { resolveGlobalFn } from "./resolve-global-fn.mjs";
import {
  getProfileRuntime,
  persistSettingsToLocalStorage,
  settingsRef,
} from "./profile-runtime.mjs";

export function isHideManejoSectionEnabled() {
  return isManejoSectionHidden(settingsRef());
}

/** @deprecated alias */
export function isHideClinicoTabEnabled() {
  return isHideManejoSectionEnabled();
}

export function syncHideManejoSectionUI() {
  var row =
    document.getElementById("settings-hide-manejo-section")?.closest("label") ||
    document.getElementById("settings-hide-clinico-tab")?.closest("label");
  if (row) row.style.display = "none";
}

/** @deprecated alias */
export function syncHideClinicoTabUI() {
  syncHideManejoSectionUI();
}

export function ensureClinicoTabConsistency() {
  var settings = settingsRef();
  var getActiveInnerTabFn = resolveGlobalFn("getActiveInnerTab");
  var current = getActiveInnerTabFn ? getActiveInnerTabFn() : null;
  if (!current) return;
  var migrated = migrateGranularInner(current, settings);
  if (migrated !== current) {
    var switchInnerTabFn = resolveGlobalFn("switchInnerTab");
    if (switchInnerTabFn) switchInnerTabFn(migrated);
  }
}

export function applyHideManejoSectionEffects() {
  ensureClinicoTabConsistency();
  var renderInnerTabsFn = resolveGlobalFn("renderInnerTabs");
  if (renderInnerTabsFn) renderInnerTabsFn();
  getProfileRuntime().syncWorkContextChrome();
}

/** @deprecated alias */
export function applyHideClinicoTabEffects() {
  applyHideManejoSectionEffects();
}

export function setHideManejoSection(_enabled) {
  syncHideManejoSectionUI();
}

/** @deprecated alias — mismo control, solo oculta Manejo en interconsulta */
export function setHideClinicoTab(enabled) {
  setHideManejoSection(enabled);
}

export function isHideListadoProblemasAiPromptEnabled() {
  var st = settingsRef();
  if (!st || st.hideListadoProblemasAiPrompt === undefined) return true;
  return !!st.hideListadoProblemasAiPrompt;
}

export function syncHideListadoProblemasAiPromptUI() {
  var cb = document.getElementById("settings-hide-listado-ai-prompt");
  if (cb) cb.checked = isHideListadoProblemasAiPromptEnabled();
}

export function setHideListadoProblemasAiPrompt(enabled) {
  var st = settingsRef();
  st.hideListadoProblemasAiPrompt = !!enabled;
  persistSettingsToLocalStorage();
  syncHideListadoProblemasAiPromptUI();
  renderListadoForm();
  getProfileRuntime().showToast(
    enabled
      ? "Botón «Copiar prompt IA» oculto en listado de problemas."
      : "Botón «Copiar prompt IA» visible en listado de problemas.",
    "success"
  );
}
