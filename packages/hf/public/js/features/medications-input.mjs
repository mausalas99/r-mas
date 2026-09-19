import { getMedRecetaByPatient, persistClinicalState } from "../app-state.mjs";
import { isDemoPatientId } from "./medications-utils.mjs";

/** Guarda el pegado del textarea antes de cambiar de paciente. */
export function stashMedInputForPatient(patientId) {
  if (!patientId || isDemoPatientId(patientId)) return;
  var ta = document.getElementById("med-input");
  if (!ta) return;
  var raw = ta.value || "";
  var block = getMedRecetaByPatient()[patientId];
  if (!raw) {
    if (block) {
      delete block.pasteRaw;
      if (!block.items || !block.items.length) delete getMedRecetaByPatient()[patientId];
      else persistClinicalState();
    }
    return;
  }
  if (!block) getMedRecetaByPatient()[patientId] = { pasteRaw: raw };
  else block.pasteRaw = raw;
  persistClinicalState();
}

export function restoreMedInputForPatient(patientId) {
  var ta = document.getElementById("med-input");
  if (!ta) return;
  var block = patientId ? getMedRecetaByPatient()[patientId] : null;
  ta.value = block && block.pasteRaw ? block.pasteRaw : "";
}
