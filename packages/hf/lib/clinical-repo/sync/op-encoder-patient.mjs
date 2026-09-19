/** Patient upsert/delete → cloud LWW ops (Worker-compatible). */

import {
  cloudOp,
  findPatient,
  isProjectablePatientId,
  pickCensusFields,
} from './op-encoder-shared.mjs';

const PATIENT_TYPES = new Set(['patient.upsert', 'patient.delete']);

/**
 * @param {{
 *   commandType: string,
 *   patientId?: string | null,
 *   patients?: object[],
 *   actorId?: string | null,
 *   fallbackUpdatedAt: string,
 *   registro?: string | null,
 * }} args
 * @returns {{ path: string, value: unknown, updatedAt: string, actorId: string }[]}
 */
function resolvePatientOpsInputs(args) {
  const patientId = String(args?.patientId || '').trim();
  const actorId = String(args?.actorId || '').trim() || 'local';
  const fallback = String(args?.fallbackUpdatedAt || '').trim() || new Date().toISOString();
  return { patientId, actorId, fallback };
}

function encodePatientDeleteOps(args, patientId, actorId, fallback) {
  const registro = String(args?.registro || '').trim();
  /** @type {{ deletedAt: string, registro?: string }} */
  const value = { deletedAt: fallback };
  if (registro) value.registro = registro;
  return [
    cloudOp({
      path: `tombstones/${patientId}`,
      value,
      updatedAt: fallback,
      actorId,
    }),
  ];
}

function encodePatientUpsertOps(args, patientId, actorId, fallback) {
  const patient = findPatient(args?.patients, patientId);
  if (!patient || typeof patient !== 'object') return [];
  const fields = pickCensusFields(/** @type {Record<string, unknown>} */ (patient));
  if (!Object.keys(fields).length) return [];

  const fieldsAt =
    String(/** @type {{ lanUpdatedAt?: unknown }} */ (patient).lanUpdatedAt || '').trim() || fallback;
  /** @type {{ path: string, value: unknown, updatedAt: string, actorId: string }[]} */
  const ops = [
    cloudOp({
      path: `entries/${patientId}/fields`,
      value: fields,
      updatedAt: fieldsAt,
      actorId,
    }),
  ];

  const registro = String(/** @type {{ registro?: unknown }} */ (patient).registro || '').trim();
  if (registro) {
    ops.push(
      cloudOp({
        path: `entries/${patientId}`,
        value: { id: patientId, registro },
        updatedAt: fieldsAt,
        actorId,
      })
    );
  }
  return ops;
}

export function encodePatientOps(args) {
  const commandType = String(args?.commandType || '');
  if (!PATIENT_TYPES.has(commandType)) return [];

  const { patientId, actorId, fallback } = resolvePatientOpsInputs(args);
  if (!isProjectablePatientId(patientId)) return [];

  if (commandType === 'patient.delete') {
    return encodePatientDeleteOps(args, patientId, actorId, fallback);
  }
  return encodePatientUpsertOps(args, patientId, actorId, fallback);
}

export { PATIENT_TYPES };
