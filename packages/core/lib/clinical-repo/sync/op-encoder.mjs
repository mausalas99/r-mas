import { encodeEventualidadesOps, EVENTUALIDAD_TYPES } from './op-encoder-eventualidades.mjs';
import { encodePatientOps, PATIENT_TYPES } from './op-encoder-patient.mjs';
import { encodePersistSnapshotOps } from './op-encoder-persist.mjs';

/**
 * @param {{
 *   commandType: string,
 *   patientId?: string | null,
 *   patients?: object[],
 *   blobKeys?: string[],
 *   blobs?: Record<string, unknown>,
 *   actorId?: string | null,
 *   fallbackUpdatedAt: string,
 *   registro?: string | null,
 * }} args
 */
function runEventualidadesEncoder(args, commandType) {
  return encodeEventualidadesOps({
    commandType,
    patientId: String(args?.patientId || ''),
    patients: Array.isArray(args?.patients) ? args.patients : [],
    actorId: args?.actorId || 'local',
    fallbackUpdatedAt: args.fallbackUpdatedAt,
  });
}

function runPatientEncoder(args, commandType) {
  return encodePatientOps({
    commandType,
    patientId: args?.patientId,
    patients: Array.isArray(args?.patients) ? args.patients : [],
    actorId: args?.actorId || 'local',
    fallbackUpdatedAt: args.fallbackUpdatedAt,
    registro: args?.registro,
  });
}

function runPersistSnapshotEncoder(args, commandType) {
  return encodePersistSnapshotOps({
    commandType,
    blobKeys: Array.isArray(args?.blobKeys) ? args.blobKeys : [],
    blobs: args?.blobs && typeof args.blobs === 'object' ? args.blobs : {},
    actorId: args?.actorId || 'local',
    fallbackUpdatedAt: args.fallbackUpdatedAt,
  });
}

export function encodeClinicalChangeOps(args) {
  const commandType = String(args?.commandType || '');
  if (EVENTUALIDAD_TYPES.has(commandType)) {
    return runEventualidadesEncoder(args, commandType);
  }
  if (PATIENT_TYPES.has(commandType)) {
    return runPatientEncoder(args, commandType);
  }
  if (commandType === 'clinical.persistSnapshot') {
    return runPersistSnapshotEncoder(args, commandType);
  }
  return [];
}
