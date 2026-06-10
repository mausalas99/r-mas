/** Normalize sync-bundle entry → patient census row. */

/**
 * @param {object|null|undefined} entry
 * @returns {object|null}
 */
export function extractPatientFromBundleEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.patient && entry.patient.id) {
    return { ...entry.patient };
  }
  const id = String(entry.id || '').trim();
  if (!id || id.indexOf('demo-') === 0) return null;
  return {
    id: id,
    nombre: entry.nombre || entry.name || '',
    registro: entry.registro || '',
    sala: entry.sala || '',
    cuarto: entry.cuarto || '',
    cama: entry.cama || '',
    servicio: entry.servicio || '',
    area: entry.area || '',
    edad: entry.edad || '',
    sexo: entry.sexo || '',
    archived: entry.archived,
    registeredByUserId: entry.registeredByUserId,
    registeredAt: entry.registeredAt,
    updatedAt: entry.updatedAt,
    lanUpdatedAt: entry.lanUpdatedAt,
  };
}
