import { randomUUID } from 'node:crypto';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   commandType: string,
 *   blobKeys: string[],
 *   patientId?: string | null,
 *   actorId?: string | null,
 * }} row
 * @returns {string} change_id
 */
export function appendClinicalChangeLog(db, row) {
  const changeId = 'chg_' + randomUUID().replace(/-/g, '');
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO clinical_change_log
      (change_id, command_type, blob_keys, patient_id, actor_id, created_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`
  ).run(
    changeId,
    String(row.commandType || ''),
    JSON.stringify(Array.isArray(row.blobKeys) ? row.blobKeys : []),
    row.patientId != null ? String(row.patientId) : null,
    row.actorId != null ? String(row.actorId) : null,
    createdAt
  );
  return changeId;
}
