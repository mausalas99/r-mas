import { medNotaSelectionByPatient } from "../app-state.mjs";

export function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isDemoPatientId(patientId) {
  return String(patientId || "").indexOf("demo-") === 0;
}

export function manejoDiaOpts(fechaActualizacion) {
  var fecha = String(fechaActualizacion || "").trim();
  return fecha ? { fechaActualizacion: fecha } : undefined;
}

export function getMedNotaSelMap(patientId) {
  if (!medNotaSelectionByPatient[patientId]) medNotaSelectionByPatient[patientId] = {};
  return medNotaSelectionByPatient[patientId];
}

export function isMedNotaSelected(patientId, itemId) {
  return !!getMedNotaSelMap(patientId)[String(itemId || "")];
}

export function setMedActiveLeadVisible(visible) {
  var lead = document.getElementById("med-active-lead");
  if (lead) lead.hidden = !visible;
}

export function setMedDiaBtnVisible(visible) {
  var btn = document.getElementById("med-dia-btn");
  if (btn) btn.hidden = !visible;
}
