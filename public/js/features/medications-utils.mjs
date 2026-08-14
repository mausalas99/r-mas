import { getMedNotaSelectionByPatient } from "../app-state.mjs";
import { isDemoPatientId } from '../demo-patient.mjs';

import { esc } from '../dom-escape.mjs';
export { esc, isDemoPatientId };

export function manejoDiaOpts(fechaActualizacion) {
  var fecha = String(fechaActualizacion || "").trim();
  return fecha ? { fechaActualizacion: fecha } : undefined;
}

export function getMedNotaSelMap(patientId) {
  if (!getMedNotaSelectionByPatient()[patientId]) getMedNotaSelectionByPatient()[patientId] = {};
  return getMedNotaSelectionByPatient()[patientId];
}

export function isMedNotaSelected(patientId, itemId) {
  return !!getMedNotaSelMap(patientId)[String(itemId || "")];
}

export function setMedActiveLeadVisible(visible) {
  var lead = document.getElementById("med-active-lead");
  if (lead) lead.hidden = !visible;
}
