/** Eventualidades blob → cloud LWW ops (Worker-compatible). */

const EVENTUALIDAD_TYPES = new Set([
  'eventualidad.upsert',
  'eventualidad.delete',
  'eventualidades.labs.set',
  'eventualidades.labs.merge',
]);

/**
 * @param {unknown} ev
 * @param {string} fallback
 */
function eventualidadesOpUpdatedAt(ev, fallback) {
  if (!ev || typeof ev !== 'object') return fallback;
  const at = String(/** @type {{ updatedAt?: unknown }} */ (ev).updatedAt || '').trim();
  return at || fallback;
}

/** @param {unknown} patients @param {string} patientId */
function findPatient(patients, patientId) {
  const list = Array.isArray(patients) ? patients : [];
  for (let i = 0; i < list.length; i += 1) {
    const p = list[i];
    if (p && String(p.id || '').trim() === patientId) return p;
  }
  return null;
}

/** @param {unknown} args */
function resolvePatientId(args) {
  return String(args?.patientId || '').trim();
}

/** @param {string} patientId */
function isProjectablePatientId(patientId) {
  return Boolean(patientId) && !patientId.startsWith('demo-');
}

/**
 * @param {{
 *   commandType: string,
 *   patientId: string,
 *   patients: object[],
 *   actorId?: string,
 *   fallbackUpdatedAt: string,
 * }} args
 * @returns {{ path: string, value: unknown, updatedAt: string, actorId: string }[]}
 */
export function encodeEventualidadesOps(args) {
  if (!EVENTUALIDAD_TYPES.has(String(args?.commandType || ''))) return [];
  const patientId = resolvePatientId(args);
  if (!isProjectablePatientId(patientId)) return [];
  const patient = findPatient(args?.patients, patientId);
  const ev = patient && patient.eventualidades;
  if (!ev) return [];
  const actorId = String(args?.actorId || '').trim() || 'local';
  const fallback = String(args?.fallbackUpdatedAt || '').trim() || new Date().toISOString();
  return [
    {
      path: `entries/${patientId}/eventualidades`,
      value: ev,
      updatedAt: eventualidadesOpUpdatedAt(ev, fallback),
      actorId,
    },
  ];
}

export { EVENTUALIDAD_TYPES };
