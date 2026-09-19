/**
 * Panel Receta MED (procesamiento, SOAP, copia) — barrel.
 */
import { registerMedicationsRuntime } from "./medications-runtime-state.mjs";
import { stashMedInputForPatient } from "./medications-input.mjs";
import { openMedRecetaPasteModal, closeMedRecetaPasteModal } from "./medications-paste-modal.mjs";
import { renderMedRecetaPanel } from "./medications-panel-render.mjs";
import {
  toggleMedRecetaSuspendido,
  toggleMedRecetaParaNota,
  toggleMedRecetaInsulinRescateParaNota,
  toggleMedRecetaInsulinRescateSuspendido,
  toggleMedRecetaInsulinPrandialParaNota,
  toggleMedRecetaInsulinPrandialSuspendido,
  setMedRecetaSoapCategory,
  limpiarManejoActual,
  mediAnadirATratamiento,
  mediLlevarASOAP,
  procesarRecetaMed,
  limpiarRecetaInput,
  copiarMedicamentosAlPortapapeles,
  setMedOutputTab,
} from "./medications-actions.mjs";
import {
  registerMedPharmProfileRuntime,
  medPharmProfileWindowHandlers,
} from "./med-pharm-profile-panel.mjs";
import {
  openMedEgresoModal,
  closeMedEgresoModal,
  setMedEgresoModalTab,
  copiarMedEgresoModalTexto,
} from "./medications-egreso-modal.mjs";

export { registerMedicationsRuntime, registerMedPharmProfileRuntime };
export { stashMedInputForPatient };
export { openMedRecetaPasteModal, closeMedRecetaPasteModal };
export { renderMedRecetaPanel };
export { openMedEgresoModal, closeMedEgresoModal, setMedEgresoModalTab, copiarMedEgresoModalTexto };
export {
  toggleMedRecetaSuspendido,
  toggleMedRecetaParaNota,
  toggleMedRecetaInsulinRescateParaNota,
  toggleMedRecetaInsulinRescateSuspendido,
  toggleMedRecetaInsulinPrandialParaNota,
  toggleMedRecetaInsulinPrandialSuspendido,
  setMedRecetaSoapCategory,
  limpiarManejoActual,
  mediAnadirATratamiento,
  mediLlevarASOAP,
  procesarRecetaMed,
  limpiarRecetaInput,
  copiarMedicamentosAlPortapapeles,
  setMedOutputTab,
};

export const medicationsWindowHandlers = {
  procesarRecetaMed,
  openMedRecetaPasteModal,
  closeMedRecetaPasteModal,
  limpiarRecetaInput,
  copiarMedicamentosAlPortapapeles,
  setMedOutputTab,
  toggleMedRecetaSuspendido,
  toggleMedRecetaParaNota,
  toggleMedRecetaInsulinRescateParaNota,
  toggleMedRecetaInsulinRescateSuspendido,
  toggleMedRecetaInsulinPrandialParaNota,
  toggleMedRecetaInsulinPrandialSuspendido,
  setMedRecetaSoapCategory,
  limpiarManejoActual,
  mediAnadirATratamiento,
  mediLlevarASOAP,
  openMedEgresoModal,
  closeMedEgresoModal,
  setMedEgresoModalTab,
  copiarMedEgresoModalTexto,
  ...medPharmProfileWindowHandlers,
};
