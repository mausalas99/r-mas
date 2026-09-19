/** Perfil — save settings from modal form. */
import { getNotes, persistClinicalState } from "../app-state.mjs";
import { applyProfileToNoteIfEmpty } from "./notes-indicaciones.mjs";
import { renderNotaEvolucionPrimaryTab } from "./nota-evolucion/nota-evolucion-primary-tab.mjs";
import {
  getProfileRuntime,
  normalizeQuickOutputFormat,
  settingsRef,
} from "./profile-runtime.mjs";
import { loadSettings } from "./profile-load.mjs";

function readProfileField(id) {
  return (document.getElementById(id)?.value || "").trim();
}

function applyProfileFormToSettings(st) {
  st.doctorName = readProfileField("profile-doctor");
  st.cedulaProfesional = readProfileField("profile-cedula");
  st.profesorName = readProfileField("profile-profesor");
  st.censoEquipo = readProfileField("profile-censo-equipo");
  st.censoJefe = readProfileField("profile-censo-jefe");
  st.censoFimiLabel = readProfileField("profile-censo-fimi-label");
  st.censoFiuxLabel = readProfileField("profile-censo-fiux-label");
  st.grado = readProfileField("profile-grado");
  st.quickOutputFormat = normalizeQuickOutputFormat(st.quickOutputFormat);
}

export function saveSettings() {
  var st = settingsRef();
  applyProfileFormToSettings(st);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  var backfill = false;
  Object.keys(getNotes()).forEach(function (pid) {
    if (getNotes()[pid] && applyProfileToNoteIfEmpty(getNotes()[pid])) backfill = true;
  });
  if (backfill) persistClinicalState();
  loadSettings();
  if (getProfileRuntime().getActiveId()) renderNotaEvolucionPrimaryTab();
  getProfileRuntime().showToast("Perfil guardado ✓", "success");
}

export function saveQuickOutputFormat(format) {
  var st = settingsRef();
  st.quickOutputFormat = normalizeQuickOutputFormat(format);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  getProfileRuntime().showToast("Formato de salida rápida actualizado", "success");
}
