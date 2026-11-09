/** @type {readonly string[]} */
export const VITAL_BASE_KEYS = ['tas', 'tad', 'fc', 'fr', 'temp', 'sat'];

/**
 * Clave en `vitals` / `alteredAt` para la lectura adicional (+1).
 * @param {string} baseKey
 * @returns {string}
 */
export function getVitalExtraStorageKey(baseKey) {
  return baseKey === 'temp' ? 'tempPeak' : baseKey + 'Extra';
}
