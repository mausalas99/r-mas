import { loadPatientsBlob, savePatientsBlob } from '../adapters/sqlcipher.mjs';
import { appendClinicalChangeLog } from '../change-log.mjs';
import { applyPatientUpsert, applyPatientDelete } from '../transforms/patients.mjs';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ ok: boolean, error?: string, patients?: object[] }} transformed
 * @param {string} commandType
 * @param {string | null} patientId
 * @param {{ actorId?: string, source?: string, registro?: string | null }} meta
 */
function commitPatientsTransform(db, transformed, commandType, patientId, meta) {
  if (!transformed.ok) {
    return { ok: false, error: transformed.error || 'transform_failed' };
  }
  const run = db.transaction(() => {
    savePatientsBlob(db, transformed.patients);
    const changeId = appendClinicalChangeLog(db, {
      commandType,
      blobKeys: ['patients'],
      patientId,
      actorId: meta?.actorId || null,
      origin: meta?.source || 'ui',
      registro: meta?.registro || null,
    });
    return changeId;
  });
  const changeId = run();
  return {
    ok: true,
    changedKeys: ['patients'],
    changeId,
    patients: transformed.patients,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {object} command
 * @param {{ actorId?: string, source?: string }} [meta]
 */
export function runPatientUpsertCommand(db, command, meta = {}) {
  const patients = loadPatientsBlob(db);
  const transformed = applyPatientUpsert(patients, {
    patient: command?.patient && typeof command.patient === 'object' ? command.patient : {},
  });
  const patientId =
    transformed.ok && command?.patient?.id != null ? String(command.patient.id).trim() : null;
  return commitPatientsTransform(db, transformed, 'patient.upsert', patientId, meta);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {object} command
 * @param {{ actorId?: string, source?: string }} [meta]
 */
export function runPatientDeleteCommand(db, command, meta = {}) {
  const patientId = String(command?.patientId || '').trim();
  const patients = loadPatientsBlob(db);
  const registro = String(command?.registro || '').trim() || null;
  const transformed = applyPatientDelete(patients, { patientId });
  return commitPatientsTransform(
    db,
    transformed,
    'patient.delete',
    transformed.ok ? patientId : null,
    { ...meta, registro }
  );
}
