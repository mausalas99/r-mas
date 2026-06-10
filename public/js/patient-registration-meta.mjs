/**
 * Who registered a patient on this device / LAN census.
 * Immutable after first stamp — LAN merge keeps earliest registrar.
 */

/**
 * @param {object} patient
 * @param {{ user_id?: string }|null|undefined} user
 * @returns {object}
 */
export function stampPatientRegistrationMeta(patient, user) {
  if (!patient) return patient;
  const uid = String(user?.user_id || '').trim();
  if (!uid) return patient;
  if (!patient.registeredByUserId) {
    patient.registeredByUserId = uid;
  }
  if (!patient.registeredAt) {
    patient.registeredAt = new Date().toISOString();
  }
  return patient;
}

/**
 * @param {object} target
 * @param {object|null|undefined} source
 */
export function mergePatientRegistrationMeta(target, source) {
  if (!target || !source) return;
  const srcUid = String(source.registeredByUserId || '').trim();
  const tgtUid = String(target.registeredByUserId || '').trim();
  if (!tgtUid && srcUid) {
    target.registeredByUserId = srcUid;
  }
  const srcAt = String(source.registeredAt || '').trim();
  const tgtAt = String(target.registeredAt || '').trim();
  if (!tgtAt && srcAt) {
    target.registeredAt = srcAt;
  } else if (tgtAt && srcAt) {
    const srcMs = new Date(srcAt).getTime();
    const tgtMs = new Date(tgtAt).getTime();
    if (Number.isFinite(srcMs) && Number.isFinite(tgtMs) && srcMs < tgtMs) {
      target.registeredAt = srcAt;
    }
  }
}
