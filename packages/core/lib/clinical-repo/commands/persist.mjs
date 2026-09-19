import { saveClinicalBlobValues } from '../adapters/blobs.mjs';
import { appendClinicalChangeLog } from '../change-log.mjs';
import { pickPersistSnapshot } from '../transforms/persist-snapshot.mjs';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {object} command
 * @param {{ actorId?: string, source?: string }} [meta]
 */
export function runPersistSnapshotCommand(db, command, meta = {}) {
  const picked = pickPersistSnapshot(command || {});
  if (!picked.ok) {
    return { ok: false, error: picked.error || 'empty_snapshot' };
  }

  const run = db.transaction(() => {
    saveClinicalBlobValues(db, picked.snapshot);
    const changeId = appendClinicalChangeLog(db, {
      commandType: 'clinical.persistSnapshot',
      blobKeys: picked.changedKeys,
      patientId: null,
      actorId: meta?.actorId || null,
      origin: meta?.source || 'ui',
    });
    return changeId;
  });

  const changeId = run();
  return {
    ok: true,
    changedKeys: picked.changedKeys,
    changeId,
    ...picked.snapshot,
  };
}
