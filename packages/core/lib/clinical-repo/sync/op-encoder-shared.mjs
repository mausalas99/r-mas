/** Shared helpers for clinical-repo → cloud LWW op encoders. */

/** Packed into dedicated LWW paths — must not ride along on `fields`. */
export const FIELD_SKIP = new Set(['historiaClinica', 'id', 'monitoreo', 'eventualidades']);

/** @param {string} patientId */
export function isProjectablePatientId(patientId) {
  return Boolean(patientId) && !patientId.startsWith('demo-');
}

/**
 * @param {{ path: string, value: unknown, updatedAt: string, actorId: string }} fields
 * @returns {{ path: string, value: unknown, updatedAt: string, actorId: string }}
 */
export function cloudOp(fields) {
  return {
    path: fields.path,
    value: fields.value,
    updatedAt: fields.updatedAt,
    actorId: fields.actorId,
  };
}

/** @param {Record<string, unknown>} patient */
export function pickCensusFields(patient) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(patient || {})) {
    if (FIELD_SKIP.has(key) || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

/** @param {unknown} patients @param {string} patientId */
export function findPatient(patients, patientId) {
  const list = Array.isArray(patients) ? patients : [];
  for (let i = 0; i < list.length; i += 1) {
    const p = list[i];
    if (p && String(p.id || '').trim() === patientId) return p;
  }
  return null;
}
