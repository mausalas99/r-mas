/** Perfil, modo Sala/Inter, plantillas y carga guardada del modal de usuario. */

import {
  syncFontZoomButtons,
  syncHighContrastButtons,
  syncUiDensityButtons,
  isPaseMode,
} from "./chrome.mjs";
import { syncSettingsLanHostDiskSection } from "./lan-sync.mjs";
import {
  syncUpdateChannelUI,
  syncUpdateTelemetryUI,
  syncHardwareAccelerationUI,
} from "./platform/updater.mjs";
import { syncIdleLockSelectUi } from "./platform/offline.mjs";
import { syncPreimportBackupUi } from "./platform/import-backup.mjs";
import { syncDbSecuritySectionUi } from "./db-unlock.mjs";
import { syncApprovedOutputDir } from "../document-export-client.mjs";
import {
  maybeShowReleaseNotesFor,
  initReleaseNotesDevPreviewIfEnabled,
  RELEASE_NOTES_DEV_FORCE_SHOW,
} from "./settings-help/release-notes.mjs";
import { notes, saveState } from "../app-state.mjs";
import {
  renderNoteForm,
  renderIndicaForm,
  applyProfileToNoteIfEmpty,
} from "./notes-indicaciones.mjs";
import { renderEstadoActualButton } from "./soap-estado.mjs";
import { renderRoundOverviewPanels } from "./patients.mjs";
import { isModeSala } from "../mode-features.mjs";
import { syncCensoExportButtonVisibility } from "../censo-export.mjs";
import { isManejoSectionHidden, migrateGranularInner } from "../expediente-tabs.mjs";
import { isManejoTabGloballyHidden } from "../clinical-product-policy.mjs";
import {
  isClinicoUnlocked,
  openClinicoUnlockModal,
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
} from "../clinico-access.mjs";
import {
  switchInnerTab,
  switchAppTab,
  renderInnerTabs,
  getActiveInnerTab,
  refreshExpedienteForAppModeChange,
} from "./pase-board.mjs";
import { renderPatientDataPane, renderListadoForm } from "./expediente.mjs";
import {
  ensureProfileTemplateDefaults,
  resetProfileTemplatesToBlank,
} from "../profile-templates.mjs";
import { syncClinicalRotationEntryChrome } from "./clinical-rotation-entry.mjs";
import { isDbMode } from "../db-storage-bridge.mjs";
import {
  setFormatsEditMode,
  clearFormatsEditMode,
  getFormatsEditMode,
  loadDraftFromSettings,
  applyDraftToSettings,
  updateDefaultFormatField,
  resetDraftToBlank,
} from "../profile-formats-editor.mjs";

/** @type {{
 *   showToast(msg: string, type?: string): void,
 *   syncWorkContextChrome(): void,
 *   getActiveId(): string|null,
 * }} */
var rt = {
  showToast() {},
  syncWorkContextChrome() {},
  getActiveId() {
    return null;
  },
};

export function registerProfileRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}

var profileGetSettings = function () {
  return /** @type {Record<string, unknown>} */ ({});
};

export function attachProfileSettingsGetter(getter) {
  profileGetSettings = getter;
}

function settingsRef() {
  return profileGetSettings();
}

/** @type {null|string} */
var _lastLoadSettingsSnapshot = null;

export function normalizeQuickOutputFormat(format) {
  var normalized = String(format || "").trim().toLowerCase();
  if (normalized !== "html" && normalized !== "txt" && normalized !== "docx") return "docx";
  return normalized;
}

function _buildLoadSettingsSnapshot() {
  var st = settingsRef();
  if (!st) return "";
  try {
    return JSON.stringify({
      d: st.doctorName || "",
      c: st.cedulaProfesional || "",
      p: st.profesorName || "",
      r2: st.residenteR2 || "",
      r1: st.residenteR1 || "",
      r1a: st.residenteR1a || "",
      r1b: st.residenteR1b || "",
      cs: st.censoSala || "",
      ct: st.censoTorre || "",
      g: st.grado || "",
      di: st.defaultDieta || "",
      cu: st.defaultCuidados || "",
      me: st.defaultMedicamentos || "",
      ne: st.defaultNotaEvolucion || "",
      ns: st.defaultNotaEstudios || "",
      od: st.outputDir || "",
      qf: normalizeQuickOutputFormat(st.quickOutputFormat),
      am: st.appMode || "sala",
    });
  } catch (_e) {
    return String(Math.random());
  }
}

function invalidateLoadSettingsSnapshot() {
  _lastLoadSettingsSnapshot = null;
}

function persistSettingsToLocalStorage() {
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(settingsRef()));
  } catch (_e) {
    rt.showToast(
      "No se pudo guardar en el almacenamiento local. El modo puede no persistir al recargar.",
      "error"
    );
  }
}

function syncAppModeRadioControls() {
  var st = settingsRef();
  var modeSala = document.getElementById("app-mode-sala");
  var modeInter = document.getElementById("app-mode-inter");
  if (!modeSala || !modeInter) return;
  if ((st.appMode || "sala") === "sala") modeSala.checked = true;
  else modeInter.checked = true;
}

export function loadSettings() {
  var snapshot = _buildLoadSettingsSnapshot();
  var snapshotUnchanged =
    _lastLoadSettingsSnapshot !== null && _lastLoadSettingsSnapshot === snapshot;
  _lastLoadSettingsSnapshot = snapshot;
  if (snapshotUnchanged) {
    syncFontZoomButtons();
    syncHighContrastButtons();
    syncUiDensityButtons();
    syncUpdateChannelUI();
    syncUpdateTelemetryUI();
    syncHideClinicoTabUI();
    syncHideListadoProblemasAiPromptUI();
    ensureClinicoTabConsistency();
    if (typeof syncSettingsLanHostDiskSection === "function") syncSettingsLanHostDiskSection();
    syncAppModeRadioControls();
    syncCensoExportButtonVisibility();
    syncClinicalRotationEntryChrome();
    syncProfileModalLayout();
    rt.syncWorkContextChrome();
    return;
  }
  var st = settingsRef();
  var docEl = document.getElementById("profile-doctor");
  var cedEl = document.getElementById("profile-cedula");
  var r2El = document.getElementById("profile-r2");
  var r1aEl = document.getElementById("profile-r1a");
  var r1bEl = document.getElementById("profile-r1b");
  var maestroEl = document.getElementById("profile-maestro");
  var censoSalaEl = document.getElementById("profile-censo-sala");
  var censoFimiLabelEl = document.getElementById("profile-censo-fimi-label");
  var proEl = document.getElementById("profile-profesor");
  var grEl = document.getElementById("profile-grado");
  if (docEl) docEl.value = st.doctorName || "";
  if (cedEl) cedEl.value = st.cedulaProfesional || "";
  if (proEl) proEl.value = st.profesorName || "";
  if (r2El) r2El.value = st.residenteR2 || "";
  if (r1aEl) r1aEl.value = st.residenteR1a || st.residenteR1 || "";
  if (r1bEl) r1bEl.value = st.residenteR1b || "";
  if (maestroEl) maestroEl.value = st.profesorName || "";
  if (censoSalaEl) {
    var ubic = st.censoSala || "";
    if (!ubic && st.censoTorre) ubic = "torre";
    if (/^torre/i.test(ubic) && ubic !== "torre") ubic = "torre";
    censoSalaEl.value = ubic;
  }
  if (censoFimiLabelEl) censoFimiLabelEl.value = st.censoFimiLabel || "";
  if (grEl) grEl.value = st.grado || "";
  syncAppModeRadioControls();
  var srvEl = document.getElementById("settings-default-servicio");
  if (srvEl) srvEl.value = st.defaultServicio || "";
  var medTpl = st.medicosPlantilla || {};
  ["profesor", "r4", "r2", "r1a", "r1b"].forEach(function (k) {
    var el = document.getElementById("settings-medico-" + k);
    if (el) el.value = medTpl[k] || "";
  });
  var lbl = document.getElementById("profile-toggle-label");
  var profileTitle = "Mi Perfil";
  if (lbl) {
    if (st.doctorName || st.grado) {
      var parts = [];
      if (st.doctorName) parts.push(st.doctorName);
      if (st.grado) parts.push(st.grado);
      profileTitle = parts.join(" · ");
      lbl.textContent = profileTitle;
    } else {
      lbl.textContent = profileTitle;
    }
  }
  var profileBtn = document.getElementById("profile-toggle-btn");
  if (profileBtn) {
    profileBtn.setAttribute("title", profileTitle);
    profileBtn.setAttribute("aria-label", profileTitle);
  }
  var dirEl = document.getElementById("settings-output-dir");
  if (dirEl) {
    if (st.outputDir) {
      var pathParts = st.outputDir.replace(/\\/g, "/").split("/");
      dirEl.textContent = pathParts[pathParts.length - 1] || st.outputDir;
      dirEl.title = st.outputDir;
    } else {
      dirEl.textContent = "Descargas (predeterminado)";
      dirEl.title = "";
    }
    syncApprovedOutputDir(st.outputDir || "");
  }
  var quickFormatEl = document.getElementById("settings-quick-output-format");
  if (quickFormatEl)
    quickFormatEl.value = normalizeQuickOutputFormat(st.quickOutputFormat);
  var verEl = document.getElementById("settings-app-version");
  if (verEl) {
    if (window.electronAPI && typeof window.electronAPI.getAppVersion === "function") {
      window.electronAPI
        .getAppVersion()
        .then(function (v) {
          verEl.textContent = v || "—";
          var LAST_SEEN_VERSION_KEY = "rplus-last-seen-app-version";
          var prev = localStorage.getItem(LAST_SEEN_VERSION_KEY);
          if (RELEASE_NOTES_DEV_FORCE_SHOW) {
            initReleaseNotesDevPreviewIfEnabled(v);
          } else if (prev && v && prev !== v) {
            rt.showToast(
              "Actualizado a v" +
                v +
                ". Consulta Ajustes o el menú para buscar actualizaciones.",
              "success"
            );
            maybeShowReleaseNotesFor(v, prev);
          }
          if (v) localStorage.setItem(LAST_SEEN_VERSION_KEY, v);
        })
        .catch(function () {
          verEl.textContent = "—";
        });
    } else {
      verEl.textContent = "Web / desarrollo";
    }
  }
  var hintEl = document.getElementById("settings-updates-hint");
  if (hintEl) hintEl.classList.toggle("is-visible", !!window.electronAPI);
  var udEl = document.getElementById("settings-user-data-path");
  var udHint = document.getElementById("settings-userdata-web-hint");
  var udBtn = document.getElementById("settings-open-userdata-btn");
  if (window.electronAPI && typeof window.electronAPI.getUserDataPath === "function") {
    if (udHint) udHint.classList.remove("is-visible");
    if (udBtn) udBtn.disabled = false;
    window.electronAPI
      .getUserDataPath()
      .then(function (p) {
        if (udEl) {
          udEl.textContent = p || "—";
          udEl.title = p || "";
        }
      })
      .catch(function () {
        if (udEl) udEl.textContent = "—";
      });
  } else {
    if (udEl) udEl.textContent = "Navegador / modo desarrollo";
    if (udHint) udHint.classList.add("is-visible");
    if (udBtn) udBtn.disabled = true;
  }
  syncFontZoomButtons();
  syncHighContrastButtons();
  syncUiDensityButtons();
  syncUpdateChannelUI();
  syncUpdateTelemetryUI();
  syncHardwareAccelerationUI();
  syncHideClinicoTabUI();
  syncHideListadoProblemasAiPromptUI();
  ensureClinicoTabConsistency();
  syncIdleLockSelectUi();
  syncDbSecuritySectionUi();
  syncPreimportBackupUi();
  if (typeof syncSettingsLanHostDiskSection === "function") syncSettingsLanHostDiskSection();
  syncCensoExportButtonVisibility();
  syncClinicalRotationEntryChrome();
  syncProfileModalLayout();
  rt.syncWorkContextChrome();
}

/** Oculta secciones de Sala / clínica según modo y base de datos. */
export function syncProfileModalLayout() {
  var st = settingsRef();
  var sala = isModeSala(st);
  var salida = document.getElementById("profile-salida-section");
  var bridge = document.getElementById("profile-clinical-bridge");
  var servicioWrap = document.getElementById("profile-default-servicio-wrap");
  if (salida) salida.hidden = !sala;
  if (bridge) bridge.hidden = !isDbMode();
  if (servicioWrap) servicioWrap.hidden = !sala;
}

export function saveSettings() {
  var st = settingsRef();
  st.doctorName = (document.getElementById("profile-doctor").value || "").trim();
  st.cedulaProfesional = (document.getElementById("profile-cedula").value || "").trim();
  st.profesorName = (document.getElementById("profile-profesor").value || "").trim();
  st.residenteR2 = (document.getElementById("profile-r2")?.value || "").trim();
  st.residenteR1a = (document.getElementById("profile-r1a")?.value || "").trim();
  st.residenteR1b = (document.getElementById("profile-r1b")?.value || "").trim();
  st.residenteR1 = st.residenteR1a;
  st.censoSala = (document.getElementById("profile-censo-sala")?.value || "").trim();
  st.censoTorre = st.censoSala === "torre" ? "Torre HU" : "";
  st.censoFimiLabel = (document.getElementById("profile-censo-fimi-label")?.value || "").trim();
  st.profesorName = (document.getElementById("profile-maestro")?.value || document.getElementById("profile-profesor")?.value || "").trim();
  st.grado = (document.getElementById("profile-grado").value || "").trim();
  st.quickOutputFormat = normalizeQuickOutputFormat(st.quickOutputFormat);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  var backfill = false;
  Object.keys(notes).forEach(function (pid) {
    if (notes[pid] && applyProfileToNoteIfEmpty(notes[pid])) backfill = true;
  });
  if (backfill) saveState();
  loadSettings();
  if (rt.getActiveId()) renderNoteForm();
  rt.showToast("Perfil guardado ✓", "success");
}

export function syncHeaderAppModeChip() {
  var chip = document.getElementById("header-app-mode-chip");
  if (!chip) return;
  var sala = isModeSala(settingsRef());
  chip.textContent = sala ? "Modo: Sala" : "Modo: Interconsulta";
  chip.title = sala
    ? "Pulsa para cambiar a Interconsulta (Nota de evolución, Indicaciones…). Ajustes finos en Mi Perfil."
    : "Pulsa para cambiar a Sala (Estado actual, Listado de problemas…). Ajustes finos en Mi Perfil.";
  chip.classList.toggle("mode-sala", sala);
  chip.classList.toggle("mode-inter", !sala);
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
    switchInnerTab(isManejoTabGloballyHidden() ? "historia" : "manejo", { forceRender: true });
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
    syncHeaderAppModeChip();
    if (rt.getActiveId()) {
      if (!nowSala) renderNoteForm();
      var inner = getActiveInnerTab();
      if (inner === "datos" || inner === "todo") renderPatientDataPane();
    }
    rt.syncWorkContextChrome();
    if (isPaseMode()) renderRoundOverviewPanels();
    rt.showToast("Modo cambiado a " + (nowSala ? "Sala" : "Interconsulta"), "success");
  } catch (err) {
    console.error("[R+] applyAppModeSwitchEffects:", err);
    rt.showToast("No se pudo actualizar la vista al cambiar de modo.", "error");
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

export function openProfileModal() {
  var modal = document.getElementById("profile-modal");
  if (!modal) return;
  loadSettings();
  syncProfileModalLayout();
  modal.classList.add("open");
  setTimeout(function () {
    var first =
      document.getElementById("app-mode-sala") ||
      document.getElementById("profile-doctor");
    if (first) first.focus();
  }, 80);
}

export function closeProfileModal() {
  var modal = document.getElementById("profile-modal");
  if (modal) modal.classList.remove("open");
}

export function toggleProfileSection() {
  var modal = document.getElementById("profile-modal");
  if (!modal) return;
  if (modal.classList.contains("open")) closeProfileModal();
  else openProfileModal();
}

export function syncProfileSectionVisibility() {
  /* No-op desde 3.0 */
}

export function openProfileFromHeader(ev) {
  if (ev) ev.preventDefault();
  openProfileModal();
}

function ensureInterconsultaModeForFormats() {
  var st = settingsRef();
  if (!isModeSala(st)) return;
  st.appMode = "interconsulta";
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  var modeSalaEl = document.getElementById("app-mode-sala");
  var modeInterEl = document.getElementById("app-mode-inter");
  if (modeInterEl) modeInterEl.checked = true;
  if (modeSalaEl) modeSalaEl.checked = false;
  renderInnerTabs();
  syncHeaderAppModeChip();
  rt.syncWorkContextChrome();
}

function syncDraftFromFormatEditorDom() {
  var map = [
    ["fmt-default-nota-evolucion", "notaEvolucion"],
    ["fmt-default-nota-estudios", "notaEstudios"],
    ["fmt-default-ind-dieta", "dieta"],
    ["fmt-default-ind-cuidados", "cuidados"],
    ["fmt-default-ind-medicamentos", "medicamentos"],
    ["fmt-default-ind-estudios", "estudios"],
    ["fmt-default-ind-interconsultas", "interconsultas"],
  ];
  map.forEach(function (pair) {
    var el = document.getElementById(pair[0]);
    if (el) updateDefaultFormatField(pair[1], el.value);
  });
}

function scrollFormatsEditorIntoView() {
  requestAnimationFrame(function () {
    var root =
      getFormatsEditMode() === "indica"
        ? document.getElementById("indica-form")
        : document.getElementById("note-form");
    if (root) root.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export function openNoteFormatsFromProfile() {
  closeProfileModal();
  var st = settingsRef();
  ensureProfileTemplateDefaults(st);
  ensureInterconsultaModeForFormats();
  loadDraftFromSettings(st);
  setFormatsEditMode("nota");
  switchAppTab("nota");
  switchInnerTab("notas");
  renderNoteForm();
  scrollFormatsEditorIntoView();
}

export function openIndicaFormatsFromProfile() {
  closeProfileModal();
  var st = settingsRef();
  ensureProfileTemplateDefaults(st);
  ensureInterconsultaModeForFormats();
  loadDraftFromSettings(st);
  setFormatsEditMode("indica");
  switchAppTab("nota");
  switchInnerTab("indica");
  renderIndicaForm();
  scrollFormatsEditorIntoView();
}

/** @deprecated — redirige a la pestaña Nota */
export function openTemplatesModal() {
  openNoteFormatsFromProfile();
}

export function closeTemplatesModal() {
  var m = document.getElementById("templates-modal");
  if (m) m.style.display = "none";
}

export function saveTemplates() {
  saveDefaultFormatsFromEditor();
}

export function saveDefaultFormatsFromEditor() {
  syncDraftFromFormatEditorDom();
  var st = settingsRef();
  applyDraftToSettings(st);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  rt.showToast("Formatos guardados ✓", "success");
}

export function exitFormatsEditor() {
  var was = getFormatsEditMode();
  clearFormatsEditMode();
  if (was === "nota") renderNoteForm();
  else if (was === "indica") renderIndicaForm();
}

export function resetProfileTemplates() {
  var st = settingsRef();
  resetProfileTemplatesToBlank(st);
  resetDraftToBlank();
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  var mode = getFormatsEditMode();
  if (mode === "nota") renderNoteForm();
  else if (mode === "indica") renderIndicaForm();
  rt.showToast("Formatos restablecidos (plantillas en blanco)", "success");
}

/** @param {Record<string, unknown>} st */
export function hydrateProfileSettings(st) {
  if (!st || typeof st !== "object") return st;
  ensureProfileTemplateDefaults(st);
  if (st.hideListadoProblemasAiPrompt === undefined) {
    st.hideListadoProblemasAiPrompt = true;
  }
  return st;
}

export function saveQuickOutputFormat(format) {
  var st = settingsRef();
  st.quickOutputFormat = normalizeQuickOutputFormat(format);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  rt.showToast("Formato de salida rápida actualizado", "success");
}

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
  if (row) row.style.display = isManejoTabGloballyHidden() ? "none" : "";
  var cb = document.getElementById("settings-hide-manejo-section");
  if (!cb) cb = document.getElementById("settings-hide-clinico-tab");
  if (cb) cb.checked = isHideManejoSectionEnabled();
}

/** @deprecated alias */
export function syncHideClinicoTabUI() {
  syncHideManejoSectionUI();
}

export function ensureClinicoTabConsistency() {
  var settings = settingsRef();
  var current = getActiveInnerTab();
  if (!current) return;
  var migrated = migrateGranularInner(current, settings);
  if (migrated !== current) switchInnerTab(migrated);
}

export function applyHideManejoSectionEffects() {
  ensureClinicoTabConsistency();
  renderInnerTabs();
  rt.syncWorkContextChrome();
}

/** @deprecated alias */
export function applyHideClinicoTabEffects() {
  applyHideManejoSectionEffects();
}

export function setHideManejoSection(enabled) {
  if (isManejoTabGloballyHidden()) {
    syncHideManejoSectionUI();
    rt.showToast("Manejo no está disponible en esta versión de R+.", "info");
    return;
  }
  var st = settingsRef();
  if (!enabled && !isClinicoUnlocked(st)) {
    syncHideManejoSectionUI();
    openClinicoUnlockModal(function () {
      var next = settingsRef();
      next.clinicoUnlocked = true;
      next.hideManejoSection = false;
      delete next.hideClinicoTab;
      localStorage.setItem("rpc-settings", JSON.stringify(next));
      syncHideManejoSectionUI();
      applyHideManejoSectionEffects();
      rt.showToast("Guía clínica disponible en el expediente.", "success");
    });
    return;
  }
  st.hideManejoSection = !!enabled;
  if (enabled) st.hideClinicoTab = true;
  else delete st.hideClinicoTab;
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  syncHideManejoSectionUI();
  applyHideManejoSectionEffects();
  rt.showToast(
    enabled
      ? "Manejo oculto en Clínico (Nota e Indicaciones siguen disponibles)."
      : "Manejo visible en el expediente.",
    "success"
  );
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
  rt.showToast(
    enabled
      ? "Botón «Copiar prompt IA» oculto en listado de problemas."
      : "Botón «Copiar prompt IA» visible en listado de problemas.",
    "success"
  );
}

export const profileWindowHandlers = {
  toggleProfileSection,
  openProfileFromHeader,
  openProfileModal,
  closeProfileModal,
  onAppModeChange,
  toggleHeaderWorkMode,
  saveQuickOutputFormat,
  setHideManejoSection,
  setHideClinicoTab,
  setHideListadoProblemasAiPrompt,
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
  openTemplatesModal,
  openNoteFormatsFromProfile,
  openIndicaFormatsFromProfile,
  saveDefaultFormatsFromEditor,
  exitFormatsEditor,
  updateDefaultFormatField,
  resetProfileTemplates,
  saveSettings,
  closeTemplatesModal,
  saveTemplates,
};
