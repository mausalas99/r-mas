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
import { resolveGlobalFn } from "./resolve-global-fn.mjs";

function readProfileField(id) {
  return (document.getElementById(id)?.value || "").trim();
}

/** Only fields present on screen are written (Cédula left the form; keep what is stored). */
function applyIfPresent(st, key, id) {
  if (document.getElementById(id)) st[key] = readProfileField(id);
}

function applyProfileFormToSettings(st) {
  applyIfPresent(st, "doctorName", "profile-doctor");
  applyIfPresent(st, "cedulaProfesional", "profile-cedula");
  st.profesorName = readProfileField("profile-profesor");
  st.medicosPlantilla = Object.assign({}, st.medicosPlantilla);
  ["profesor", "r4", "r2", "r1a", "r1b"].forEach(function (k) {
    st.medicosPlantilla[k] = readProfileField("settings-medico-" + k);
  });
  st.censoSala = readProfileField("profile-censo-sala");
  st.censoTorre = st.censoSala === "torre" ? "Torre HU" : "";
  st.censoFimiLabel = readProfileField("profile-censo-fimi-label");
  st.grado = readProfileField("profile-grado");
  st.quickOutputFormat = normalizeQuickOutputFormat(st.quickOutputFormat);
}

/** @param {{ silent?: boolean }} [opts] silent: autosave from Ajustes › Perfil, no toast */
export function saveSettings(opts) {
  var st = settingsRef();
  applyProfileFormToSettings(st);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  var backfill = false;
  Object.keys(getNotes()).forEach(function (pid) {
    if (getNotes()[pid] && applyProfileToNoteIfEmpty(getNotes()[pid])) backfill = true;
  });
  if (backfill) persistClinicalState();
  loadSettings();
  // Panes that show the doctor name must redraw with the new value.
  var invalidate = resolveGlobalFn("invalidateInnerTabRenderCache");
  if (invalidate) invalidate();
  if (getProfileRuntime().getActiveId()) renderNotaEvolucionPrimaryTab();
  if (!opts?.silent) getProfileRuntime().showToast("Perfil guardado ✓", "success");
}

export function saveQuickOutputFormat(format) {
  var st = settingsRef();
  st.quickOutputFormat = normalizeQuickOutputFormat(format);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  getProfileRuntime().showToast("Formato de salida rápida actualizado", "success");
}
