import { formatLabsForCensoCompactBody } from './censo-labs-format-compact.mjs';

/**
 * Laboratorios de todo el día más reciente: texto completo (sin resumen ni truncado).
 * @param {unknown[]} sets
 * @returns {string[]}
 */
export function formatLabsForCensoCompact(sets) {
  return formatLabsForCensoCompactBody(sets);
}
