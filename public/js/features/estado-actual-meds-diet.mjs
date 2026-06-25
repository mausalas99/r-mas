import { mergeDietaItems, buildDietProposalText, dietProposalFingerprint } from '../med-receta-core.mjs';
import { applyDietaSuplementoPolicy, isDietaSuplemento } from './estado-actual-data.mjs';

const DIET_PENDING_KEYS = /** @type {const} */ (['dieta', 'kcal', 'proteinG']);

/**
 * @param {Record<string, unknown>} ec
 */
function confirmedDietFingerprint(ec) {
  return (
    String(ec.dieta != null ? ec.dieta : '')
      .trim()
      .toUpperCase() +
    '|' +
    (ec.kcal != null && ec.kcal !== '' ? String(ec.kcal) : '') +
    '|' +
    (ec.proteinG != null && ec.proteinG !== '' ? String(ec.proteinG) : '')
  );
}

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
 * @param {{ descripcion?: string, kcal?: unknown, proteinG?: unknown } | null | undefined} [merged]
 */
export function shouldSkipDietProposal(monitoreo, opts, merged) {
  opts = opts || {};
  if (!opts.force && hasActiveDietProposal(getPendienteReceta(monitoreo))) return true;
  var ec =
    monitoreo.estadoClinico && typeof monitoreo.estadoClinico === 'object' ? monitoreo.estadoClinico : {};
  var conf =
    monitoreo.confirmado && typeof monitoreo.confirmado === 'object' ? monitoreo.confirmado : {};
  if (merged && mergedDietHasContent(merged)) {
    if (confirmedDietFingerprint(ec) === dietProposalFingerprint(merged)) return true;
  }
  if (!conf.dieta) return false;
  if (opts.force && merged && mergedDietHasContent(merged)) {
    return dietProposalFingerprint(merged) === confirmedDietFingerprint(ec);
  }
  return true;
}

/**
 * @param {Record<string, unknown>} monitoreo
 */
function clearDietPending(monitoreo) {
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return;
  DIET_PENDING_KEYS.forEach(function (k) {
    monitoreo.pendienteReceta[k] = '';
  });
}

/**
 * Estado clínico ya coincide con SOME — marcar confirmada sin re-propuesta (evita wipe diario).
 * @param {Record<string, unknown>} monitoreo
 * @param {{ descripcion?: string, kcal?: unknown, proteinG?: unknown }} merged
 * @returns {boolean} true si se auto-confirmó
 */
export function tryAutoConfirmMatchingDiet(monitoreo, merged) {
  if (!monitoreo || !merged || !mergedDietHasContent(merged)) return false;
  var ec =
    monitoreo.estadoClinico && typeof monitoreo.estadoClinico === 'object' ? monitoreo.estadoClinico : {};
  var conf =
    monitoreo.confirmado && typeof monitoreo.confirmado === 'object' ? monitoreo.confirmado : {};
  if (conf.dieta) return false;
  if (confirmedDietFingerprint(ec) !== dietProposalFingerprint(merged)) return false;
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') {
    monitoreo.confirmado = {};
  }
  /** @type {Record<string, boolean>} */ (monitoreo.confirmado).dieta = true;
  clearDietPending(monitoreo);
  return true;
}

/**
 * Edición manual en EA — tratar como confirmada y descartar propuesta pendiente.
 * @param {Record<string, unknown>} monitoreo
 */
export function markDietAsManuallyConfirmed(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') {
    monitoreo.confirmado = {};
  }
  /** @type {Record<string, boolean>} */ (monitoreo.confirmado).dieta = true;
  clearDietPending(monitoreo);
}

/**
 * @param {Record<string, unknown>} monitoreo
 */
function getPendienteReceta(monitoreo) {
  return monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object'
    ? monitoreo.pendienteReceta
    : null;
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
  if (isDietaSuplemento(dietaText)) dietaText = 'SUPLEMENTO';
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
