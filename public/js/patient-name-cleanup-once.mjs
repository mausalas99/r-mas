/**
 * Pure matcher for the one-time Red-tab cleanup in app-runtimes.mjs — finds
 * local patients whose exact name matches a known list, case/whitespace
 * insensitive. Kept separate from app-runtimes.mjs (no colocated test there;
 * it drags in the full boot import graph) so this bit of logic stays tested.
 * @param {Array<{ id?: string, nombre?: string }>} patients
 * @param {string[]} names
 */
export function findPatientsByExactNames(patients, names) {
  const wanted = new Set(names.map((n) => String(n).trim().toUpperCase()));
  return (Array.isArray(patients) ? patients : []).filter(
    (p) => p && wanted.has(String(p.nombre || '').trim().toUpperCase())
  );
}
