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
  syncIdleLockSelectUi,
  syncPreimportBackupUi,
} from "./platform.mjs";
import { maybeShowReleaseNotesFor } from "./settings-help.mjs";
import { notes, saveState } from "../app-state.mjs";
import { renderNoteForm, applyProfileToNoteIfEmpty } from "./notes-indicaciones.mjs";
import { renderEstadoActualButton } from "./soap-estado.mjs";
import { renderRoundOverviewPanels } from "./patients.mjs";
import { isModeSala } from "../mode-features.mjs";
import { isManejoSectionHidden, migrateGranularInner } from "../expediente-tabs.mjs";
import { switchInnerTab, renderInnerTabs, getActiveInnerTab } from "./pase-board.mjs";
import { renderPatientDataPane } from "./expediente.mjs";

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

export function registerProfileRuntime(partial) {
  if (partial && typeof partial === "object") Object.assign(rt, partial);
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
      g: st.grado || "",
      di: st.defaultDieta || "",
      cu: st.defaultCuidados || "",
      me: st.defaultMedicamentos || "",
      od: st.outputDir || "",
      qf: normalizeQuickOutputFormat(st.quickOutputFormat),
    });
  } catch (_e) {
    return String(Math.random());
  }
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
    if (typeof syncSettingsLanHostDiskSection === "function") syncSettingsLanHostDiskSection();
    rt.syncWorkContextChrome();
    return;
  }
  var st = settingsRef();
  var docEl = document.getElementById("profile-doctor");
  var cedEl = document.getElementById("profile-cedula");
  var proEl = document.getElementById("profile-profesor");
  var grEl = document.getElementById("profile-grado");
  if (docEl) docEl.value = st.doctorName || "";
  if (cedEl) cedEl.value = st.cedulaProfesional || "";
  if (proEl) proEl.value = st.profesorName || "";
  if (grEl) grEl.value = st.grado || "";
  var modeSala = document.getElementById("app-mode-sala");
  var modeInter = document.getElementById("app-mode-inter");
  if (modeSala && modeInter) {
    if ((st.appMode || "sala") === "sala") modeSala.checked = true;
    else modeInter.checked = true;
  }
  var srvEl = document.getElementById("settings-default-servicio");
  if (srvEl) srvEl.value = st.defaultServicio || "";
  var medTpl = st.medicosPlantilla || {};
  ["profesor", "r4", "r2", "r1a", "r1b"].forEach(function (k) {
    var el = document.getElementById("settings-medico-" + k);
    if (el) el.value = medTpl[k] || "";
  });
  var lbl = document.getElementById("profile-toggle-label");
  if (lbl) {
    if (st.doctorName || st.grado) {
      var parts = [];
      if (st.doctorName) parts.push(st.doctorName);
      if (st.grado) parts.push(st.grado);
      lbl.textContent = parts.join(" · ");
    } else {
      lbl.textContent = "Mi Perfil";
    }
  }
  var dEl = document.getElementById("profile-preview-dieta-txt");
  var cEl = document.getElementById("profile-preview-cuidados-txt");
  var mEl = document.getElementById("profile-preview-meds-txt");
  function preview(val) {
    return val ? val.slice(0, 40) + (val.length > 40 ? "…" : "") : "(vacío)";
  }
  if (dEl) dEl.textContent = preview(st.defaultDieta);
  if (cEl) cEl.textContent = preview(st.defaultCuidados);
  if (mEl) mEl.textContent = preview(st.defaultMedicamentos);
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
          if (prev && v && prev !== v) {
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
  syncHideClinicoTabUI();
  syncIdleLockSelectUi();
  syncPreimportBackupUi();
  if (typeof syncSettingsLanHostDiskSection === "function") syncSettingsLanHostDiskSection();
  rt.syncWorkContextChrome();
}

export function saveSettings() {
  var st = settingsRef();
  st.doctorName = (document.getElementById("profile-doctor").value || "").trim();
  st.cedulaProfesional = (document.getElementById("profile-cedula").value || "").trim();
  st.profesorName = (document.getElementById("profile-profesor").value || "").trim();
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

export function applyAppModeSwitchEffects() {
  var current = getActiveInnerTab();
  var nowSala = isModeSala(settingsRef());
  if (nowSala && (current === "notas" || current === "indica")) switchInnerTab("manejo");
  else if (!nowSala && current === "listado") switchInnerTab("recetaHu");
  renderInnerTabs();
  renderEstadoActualButton();
  if (rt.getActiveId()) {
    if (!nowSala) renderNoteForm();
    if (getActiveInnerTab() === "datos" || getActiveInnerTab() === "todo") renderPatientDataPane();
  }
  rt.syncWorkContextChrome();
  if (isPaseMode()) renderRoundOverviewPanels();
  rt.showToast("Modo cambiado a " + (nowSala ? "Sala" : "Interconsulta"), "success");
}

export function onAppModeChange() {
  var sala = document.getElementById("app-mode-sala");
  var st = settingsRef();
  st.appMode = sala && sala.checked ? "sala" : "interconsulta";
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  applyAppModeSwitchEffects();
}

export function toggleHeaderWorkMode() {
  var st = settingsRef();
  st.appMode = isModeSala(st) ? "interconsulta" : "sala";
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  var modeSalaEl = document.getElementById("app-mode-sala");
  var modeInterEl = document.getElementById("app-mode-inter");
  if (modeSalaEl && modeInterEl) {
    if (isModeSala(st)) modeSalaEl.checked = true;
    else modeInterEl.checked = true;
  }
  applyAppModeSwitchEffects();
}

export function openProfileModal() {
  var modal = document.getElementById("profile-modal");
  if (!modal) return;
  loadSettings();
  modal.classList.add("open");
  setTimeout(function () {
    var first = document.getElementById("profile-doctor");
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

export function openTemplatesModal() {
  var st = settingsRef();
  document.getElementById("tmpl-dieta").value = st.defaultDieta || "";
  document.getElementById("tmpl-cuidados").value = st.defaultCuidados || "";
  document.getElementById("tmpl-meds").value = st.defaultMedicamentos || "";
  document.getElementById("templates-modal").style.display = "flex";
}

export function closeTemplatesModal() {
  document.getElementById("templates-modal").style.display = "none";
}

export function saveTemplates() {
  var st = settingsRef();
  st.defaultDieta = document.getElementById("tmpl-dieta").value.trim();
  st.defaultCuidados = document.getElementById("tmpl-cuidados").value.trim();
  st.defaultMedicamentos = document.getElementById("tmpl-meds").value.trim();
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  closeTemplatesModal();
  loadSettings();
  rt.showToast("Plantillas guardadas ✓", "success");
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
  var cb = document.getElementById("settings-hide-manejo-section");
  if (!cb) cb = document.getElementById("settings-hide-clinico-tab");
  if (cb) cb.checked = isHideManejoSectionEnabled();
}

/** @deprecated alias */
export function syncHideClinicoTabUI() {
  syncHideManejoSectionUI();
}

export function applyHideManejoSectionEffects() {
  var settings = settingsRef();
  var current = getActiveInnerTab();
  if (current) {
    var migrated = migrateGranularInner(current, settings);
    if (migrated !== current) switchInnerTab(migrated);
  }
  renderInnerTabs();
  rt.syncWorkContextChrome();
}

/** @deprecated alias */
export function applyHideClinicoTabEffects() {
  applyHideManejoSectionEffects();
}

export function setHideManejoSection(enabled) {
  var st = settingsRef();
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
  openTemplatesModal,
  saveSettings,
  closeTemplatesModal,
  saveTemplates,
};
