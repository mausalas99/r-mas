/** Pure helpers for LAN host patient census rows (no transport/orchestrator imports). */

/** @param {object[]} rows @param {object[]} [localPatients] */
export function annotateLanHostPatientRows(rows, localPatients) {
  const localById = new Map();
  for (const p of localPatients || []) {
    if (p?.id) localById.set(String(p.id), p);
  }
  return (rows || [])
    .map(function (row) {
      const local = localById.get(String(row.id));
      return {
        row: row,
        local: local || null,
        status: local ? 'local' : 'ghost',
      };
    })
    .sort(function (a, b) {
      return String(a.row.nombre || '').localeCompare(String(b.row.nombre || ''), 'es');
    });
}
