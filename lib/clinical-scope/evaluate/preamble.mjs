import { isIncomingPreviewWindow } from '../incoming-preview.mjs';
import { toMillis } from './scope-utils.mjs';

/** @param {object} ctx @returns {object|null} */
export function evaluateScopeIdentity(ctx) {
  const { currentUser, targetPatient, deny } = ctx;
  if (!currentUser?.user_id || !targetPatient?.id) {
    return deny('Usuario o paciente no identificado');
  }
  return null;
}

/** @param {object} ctx @returns {object|null} */
export function evaluateScopeIncomingPreview(ctx) {
  const { patientId, assignments, cycle, now, allow } = ctx;
  if (!isIncomingPreviewWindow(cycle, now)) return null;
  const incoming = assignments.find((a) => String(a.patient_id) === patientId);
  if (!incoming) return null;
  const effectiveMs = toMillis(incoming.effective_at);
  const nowMs = toMillis(now);
  if (Number.isFinite(effectiveMs) && Number.isFinite(nowMs) && nowMs < effectiveMs) {
    return allow(
      'Vista previa Incoming: lectura permitida hasta vigencia',
      true,
      false,
      { incomingPreview: true }
    );
  }
  return null;
}
