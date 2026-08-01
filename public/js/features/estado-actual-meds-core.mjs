/**
 * Core estado-actual meds helpers (fecha, pending checks).
 */
import { MED_FIELD_KEYS } from './estado-actual-data.mjs';

export const DIET_PENDING_KEYS = /** @type {const} */ (['dieta', 'kcal', 'proteinG']);

/**
 * @param {string | null | undefined} activeId
 * @param {Record<string, { fechaActualizacion?: string }>} [medRecetaByPatient]
 */
export function resolveManejoFechaActualizacion(activeId, medRecetaByPatient) {
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  return block && block.fechaActualizacion ? String(block.fechaActualizacion).trim() : '';
}

/**
 * @param {Record<string, unknown> | null | undefined} pendienteReceta
 * @returns {boolean}
 */
export function hasPendingEaProposals(pendienteReceta) {
  var pend = pendienteReceta && typeof pendienteReceta === 'object' ? pendienteReceta : {};
  if (
    DIET_PENDING_KEYS.some(function (k) {
      return pend[k] && String(pend[k]).trim();
    })
  ) {
    return true;
  }
  return MED_FIELD_KEYS.some(function (k) {
    return pend[k] && String(pend[k]).trim();
  });
}
