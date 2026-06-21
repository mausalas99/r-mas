import { mergeDietaItems, buildDietProposalText } from '../med-receta-core.mjs';
import { applyDietaSuplementoPolicy } from './estado-actual-data.mjs';

const DIET_PENDING_KEYS = /** @type {const} */ (['dieta', 'kcal', 'proteinG']);

/**
 * @param {Record<string, unknown> | null | undefined} pendienteReceta
 */
export function hasActiveDietProposal(pendienteReceta) {
  return DIET_PENDING_KEYS.some(function (k) {
    return pendienteReceta && pendienteReceta[k] && String(pendienteReceta[k]).trim();
  });
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {{ force?: boolean } | undefined} opts
 */
function getPendienteReceta(monitoreo) {
  return monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object'
    ? monitoreo.pendienteReceta
    : null;
}

export function shouldSkipDietProposal(monitoreo, opts) {
  opts = opts || {};
  if (!opts.force && hasActiveDietProposal(getPendienteReceta(monitoreo))) return true;
  var ec =
    monitoreo.estadoClinico && typeof monitoreo.estadoClinico === 'object' ? monitoreo.estadoClinico : {};
  var conf =
    monitoreo.confirmado && typeof monitoreo.confirmado === 'object' ? monitoreo.confirmado : {};
  if (opts.force) return !!(conf.dieta && String(ec.dieta || '').trim());
  return !!(conf.dieta || String(ec.dieta || '').trim());
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {{ descripcion?: string, kcal?: unknown, proteinG?: unknown }} merged
 */
export function writeDietProposal(monitoreo, merged) {
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') {
    monitoreo.pendienteReceta = {};
  }
  var dietaText = String(merged.descripcion || '').trim() || buildDietProposalText(merged);
  monitoreo.pendienteReceta.dieta = dietaText;
  if (!applyDietaSuplementoPolicy(monitoreo.pendienteReceta)) {
    if (merged.kcal != null) monitoreo.pendienteReceta.kcal = String(merged.kcal);
    if (merged.proteinG != null) monitoreo.pendienteReceta.proteinG = String(merged.proteinG);
  }
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') {
    monitoreo.confirmado = {};
  }
  /** @type {Record<string, boolean>} */ (monitoreo.confirmado).dieta = false;
}

/**
 * @param {unknown[]} dietas
 */
export function mergedDietFromReceta(dietas) {
  return mergeDietaItems(dietas);
}

/**
 * @param {{ descripcion?: string, kcal?: unknown, proteinG?: unknown }} merged
 */
export function mergedDietHasContent(merged) {
  var desc = String(merged.descripcion || '').trim();
  return !!(desc || merged.kcal != null || merged.proteinG != null);
}
