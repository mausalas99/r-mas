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

function formatTodayDMY(refDate) {
  var d = refDate instanceof Date ? refDate : new Date();
  return (
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    d.getFullYear()
  );
}

/**
 * Fecha ancla para avanzar DIA de antibióticos en EA: Manejo primero, luego ancla local.
 * @param {string | null | undefined} activeId
 * @param {Record<string, { fechaActualizacion?: string }>} [medRecetaByPatient]
 * @param {Record<string, unknown> | null | undefined} [monitoreo]
 */
export function resolveEaAbxFechaActualizacion(activeId, medRecetaByPatient, monitoreo) {
  var manejo = resolveManejoFechaActualizacion(activeId, medRecetaByPatient);
  if (manejo) return manejo;
  if (monitoreo && monitoreo.abxDiaAnchorDate) {
    return String(monitoreo.abxDiaAnchorDate).trim();
  }
  return '';
}

/**
 * Persiste ancla local cuando no hay fecha de Manejo (p. ej. ATB manual en EA).
 * @param {Record<string, unknown>} monitoreo
 * @param {string | null | undefined} activeId
 * @param {Record<string, { fechaActualizacion?: string }>} [medRecetaByPatient]
 * @param {Date} [refDate]
 */
export function ensureAbxDiaAnchorDate(monitoreo, activeId, medRecetaByPatient, refDate) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  var manejo = resolveManejoFechaActualizacion(activeId, medRecetaByPatient);
  if (manejo) {
    monitoreo.abxDiaAnchorDate = manejo;
    return;
  }
  if (monitoreo.abxDiaAnchorDate && String(monitoreo.abxDiaAnchorDate).trim()) return;
  monitoreo.abxDiaAnchorDate = formatTodayDMY(refDate);
}

/**
 * @param {Record<string, unknown> | null | undefined} pendienteReceta
 * @returns {boolean}
 */
/**
 * @param {Record<string, unknown>} monitoreo
 * @returns {Record<string, boolean>}
 */
export function ensureRecetaProposalDismissed(monitoreo) {
  if (!monitoreo.recetaProposalDismissed || typeof monitoreo.recetaProposalDismissed !== 'object') {
    monitoreo.recetaProposalDismissed = {};
  }
  return /** @type {Record<string, boolean>} */ (monitoreo.recetaProposalDismissed);
}

/**
 * @param {Record<string, unknown> | null | undefined} monitoreo
 * @param {string} key
 */
export function isRecetaProposalDismissed(monitoreo, key) {
  var dismissed = monitoreo && monitoreo.recetaProposalDismissed;
  return dismissed && typeof dismissed === 'object' && dismissed[key];
}

/**
 * @param {Record<string, unknown> | null | undefined} monitoreo
 */
export function clearRecetaProposalDismissed(monitoreo) {
  if (monitoreo && monitoreo.recetaProposalDismissed) {
    delete monitoreo.recetaProposalDismissed;
  }
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {string} key
 */
export function clearRecetaProposalDismissedKey(monitoreo, key) {
  if (!monitoreo || !key || !monitoreo.recetaProposalDismissed) return;
  delete monitoreo.recetaProposalDismissed[key];
}

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
