/**
 * Search clinical_change_log for a registro (stored as `__reg:<registro>` in blob_keys),
 * then return every log row of the patient ids found. No patient names are read.
 * Writes JSON to Downloads.
 */
import fs from 'node:fs';
import path from 'node:path';

/** @param {{ app: import('electron').App, dbManager: object, registro: string }} deps */
export async function runFindRegistroInLog({ app, dbManager, registro }) {
  const reg = String(registro || '').trim();
  if (!reg) throw new Error('Falta el registro.');
  const rows = await dbManager.withTransaction((db) => {
    const ids = db
      .prepare(
        `SELECT DISTINCT patient_id FROM clinical_change_log
         WHERE patient_id IS NOT NULL AND blob_keys LIKE ?`
      )
      .all('%__reg:' + reg + '%')
      .map((r) => r.patient_id);
    if (!ids.length) return [];
    const marks = ids.map(() => '?').join(',');
    return db
      .prepare(
        `SELECT created_at, command_type, patient_id, origin, blob_keys
         FROM clinical_change_log WHERE patient_id IN (${marks}) ORDER BY id`
      )
      .all(...ids);
  });
  const outPath = path.join(app.getPath('downloads'), 'R-plus-busqueda-registro-' + reg + '.json');
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8');
  return { count: rows.length, path: outPath };
}
