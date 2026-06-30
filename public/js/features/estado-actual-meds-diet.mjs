import { mergeDietaItems, buildDietProposalText } from '../med-receta-core.mjs';
import {
  applyDietaSuplementoPolicy,
  isDietaSuplemento,
  isDietaAyuno,
  normalizeDietaTypeLabel,
} from './estado-actual-data.mjs';

const DIET_PENDING_KEYS = /** @type {const} */ (['dieta', 'kcal', 'proteinG']);

/**
 * Huella estable para comparar dieta confirmada vs SOME (ignora calóricos en suplemento/ayuno).
 * @param {unknown} dietaText
 * @param {unknown} kcal
 * @param {unknown} proteinG
 */
function dietMatchFingerprint(dietaText, kcal, proteinG) {
  var label = normalizeDietaTypeLabel(dietaText);
  if (isDietaSuplemento(label)) return 'SUPLEMENTO||';
  if (isDietaAyuno(label)) return 'AYUNO||';
  var k = kcal != null && kcal !== '' ? String(kcal) : '';
  var p = proteinG != null && proteinG !== '' ? String(proteinG) : '';
  return label + '|' + k + '|' + p;
}

/**
 * @param {Record<string, unknown>} ec
 */
function confirmedDietFingerprint(ec) {
  return dietMatchFingerprint(ec.dieta, ec.kcal, ec.proteinG);
}

/**
 * @param {{ descripcion?: unknown, kcal?: unknown, proteinG?: unknown }} merged
 */
function mergedDietFingerprint(merged) {
  var dietaText = String(merged.descripcion || '').trim() || buildDietProposalText(merged);
  return dietMatchFingerprint(dietaText, merged.kcal, merged.proteinG);
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
    if (confirmedDietFingerprint(ec) === mergedDietFingerprint(merged)) return true;
  }
  if (!conf.dieta) return false;
  if (merged && mergedDietHasContent(merged)) {
    return mergedDietFingerprint(merged) === confirmedDietFingerprint(ec);
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
  if (confirmedDietFingerprint(ec) !== mergedDietFingerprint(merged)) return false;
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
