/** Canonical clinical sala labels (registration, teams, LAN rooms, DB CHECK). */
export const CLINICAL_SALA_VALUES = ['Unidad IC'];

/**
 * @param {{ values?: string[], allowNull?: boolean }} [opts]
 */
export function clinicalSalaSqlCheck(opts = {}) {
  const values = opts.values || CLINICAL_SALA_VALUES;
  const allowNull = opts.allowNull !== false;
  const list = values.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(', ');
  if (allowNull) return `CHECK(sala IN (${list}) OR sala IS NULL)`;
  return `CHECK(sala IN (${list}))`;
}
