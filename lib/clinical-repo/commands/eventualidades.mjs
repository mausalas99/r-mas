import { loadPatientsBlob, savePatientsBlob } from '../adapters/sqlcipher.mjs';
import { appendClinicalChangeLog } from '../change-log.mjs';
import {
  applyEventualidadUpsert,
  applyEventualidadDelete,
  applyEventualidadesLabsSet,
  applyEventualidadesLabsMerge,
} from '../transforms/eventualidades.mjs';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ ok: boolean, error?: string, patients?: object[] }} transformed
 * @param {string} commandType
 * @param {string} patientId
 * @param {{ actorId?: string, source?: string }} meta
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
export function runEventualidadesCommand(db, command, meta = {}) {
  const type = String(command?.type || '');
  const patientId = String(command?.patientId || '').trim();
  if (!patientId) return { ok: false, error: 'patient_not_found' };
  const patients = loadPatientsBlob(db);

  if (type === 'eventualidad.upsert') {
    const transformed = applyEventualidadUpsert(patients, {
      patientId,
      entry: command.entry && typeof command.entry === 'object' ? command.entry : {},
    });
    return commitPatientsTransform(db, transformed, type, patientId, meta);
  }
  if (type === 'eventualidad.delete') {
    const transformed = applyEventualidadDelete(patients, {
      patientId,
      entryId: String(command.entryId || ''),
    });
    return commitPatientsTransform(db, transformed, type, patientId, meta);
  }
  if (type === 'eventualidades.labs.set') {
    const transformed = applyEventualidadesLabsSet(patients, {
      patientId,
      text: command.text,
    });
    return commitPatientsTransform(db, transformed, type, patientId, meta);
  }
  if (type === 'eventualidades.labs.merge') {
    const transformed = applyEventualidadesLabsMerge(patients, {
      patientId,
      text: command.text,
    });
    return commitPatientsTransform(db, transformed, type, patientId, meta);
  }
  return { ok: false, error: 'unknown_command' };
}
