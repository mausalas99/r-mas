/**
 * Heredar pacientes: disponible en ventana previa al cierre de mes o tras nueva rotación.
 */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { isIncomingPreviewWindow } from '../clinical-rotation.mjs';
import { isRotationRejoinPending } from '../clinical-rotation-rejoin-modal.mjs';

/**
 * @param {{ preview_start_at?: string, effective_at?: string }|null|undefined} cycle
 * @param {Date} [now]
 */
export function isInheritPatientsHandoffWindow(cycle, now = new Date()) {
  if (isRotationRejoinPending()) return true;
  return isIncomingPreviewWindow(cycle, now);
}

/** @param {Date} [now] */
export function shouldShowInheritPatientsUi(now = new Date()) {
  const cycle = clinicalSessionContext.scopeContext?.cycle ?? null;
  return isInheritPatientsHandoffWindow(cycle, now);
}
