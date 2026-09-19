import { mergeDietaItems, buildDietProposalText } from '../med-receta-core.mjs';
import { isRecetaProposalDismissed } from './estado-actual-meds-core.mjs';
import {
  applyDietaSuplementoPolicy,
  isDietaSuplemento,
  isDietaAyuno,
  isDietaParenteral,
  stripDietaMacroSuffixFromLabel,
} from './estado-actual-data.mjs';

const DIET_PENDING_KEYS = /** @type {const} */ (['dieta', 'kcal', 'proteinG']);

/**
 * Huella estable para comparar dieta confirmada vs SOME (ignora calóricos en suplemento/ayuno).
 * @param {unknown} dietaText
 * @param {unknown} kcal
 * @param {unknown} proteinG
 */
function dietMatchFingerprint(dietaText, kcal, proteinG) {
  var label = stripDietaMacroSuffixFromLabel(dietaText);
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
 * @param {unknown} dietaText
 */
function normalizedDietTypeLabel(dietaText) {
  var label = stripDietaMacroSuffixFromLabel(dietaText);
  if (isDietaSuplemento(label)) return 'SUPLEMENTO';
  if (isDietaAyuno(label)) return 'AYUNO';
  return label;
}

/**
 * @param {Record<string, unknown> | null | undefined} pendienteReceta
 */
export function hasActiveDietProposal(pendienteReceta) {
  return DIET_PENDING_KEYS.some(function (k) {
    return pendienteReceta && pendienteReceta[k] && String(pendienteReceta[k]).trim();
  });
}

function dietStateObjects(monitoreo) {
  var ec =
    monitoreo.estadoClinico && typeof monitoreo.estadoClinico === 'object' ? monitoreo.estadoClinico : {};
  var conf =
    monitoreo.confirmado && typeof monitoreo.confirmado === 'object' ? monitoreo.confirmado : {};
  return { ec, conf };
}

function mergedMatchesConfirmedDiet(ec, merged) {
  if (confirmedDietFingerprint(ec) === mergedDietFingerprint(merged)) return true;
  var mergedDietaText = String(merged.descripcion || '').trim() || buildDietProposalText(merged);
  if (normalizedDietTypeLabel(ec.dieta) === normalizedDietTypeLabel(mergedDietaText)) return true;
  return mergedDietFingerprint(merged) === confirmedDietFingerprint(ec);
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {{ force?: boolean } | undefined} opts
 * @param {{ descripcion?: string, kcal?: unknown, proteinG?: unknown } | null | undefined} [merged]
 */
export function shouldSkipDietProposal(monitoreo, opts, merged) {
  opts = opts || {};
  if (isRecetaProposalDismissed(monitoreo, 'dieta')) return true;
  if (!opts.force && hasActiveDietProposal(getPendienteReceta(monitoreo))) return true;
  var state = dietStateObjects(monitoreo);
  if (merged && mergedDietHasContent(merged) && mergedMatchesConfirmedDiet(state.ec, merged)) {
    return true;
  }
  if (!state.conf.dieta) return false;
  if (merged && mergedDietHasContent(merged)) return mergedMatchesConfirmedDiet(state.ec, merged);
  return true;
}

/**
 * Completa kcal/proteína pendientes desde SOME antes de confirmar (evita re-propuesta por macros vacíos).
 * @param {Record<string, unknown>} monitoreo
 * @param {{ dietas?: unknown[] } | null | undefined} recetaBlock
 */
function backfillPendingMacroField(pend, field, mergedValue) {
  if (String(pend[field] || '').trim()) return;
  if (mergedValue == null || mergedValue === '') return;
  pend[field] = String(mergedValue);
}

export function backfillDietPendingMacrosFromReceta(monitoreo, recetaBlock) {
  if (!monitoreo || !hasActiveDietProposal(getPendienteReceta(monitoreo))) return;
  if (!recetaBlock || !Array.isArray(recetaBlock.dietas) || !recetaBlock.dietas.length) return;
  var merged = mergedDietFromReceta(recetaBlock.dietas);
  if (!mergedDietHasContent(merged)) return;
  var pend = getPendienteReceta(monitoreo);
  if (!pend) return;
  var mergedDietaText = String(merged.descripcion || '').trim() || buildDietProposalText(merged);
  if (normalizedDietTypeLabel(pend.dieta) !== normalizedDietTypeLabel(mergedDietaText)) return;
  backfillPendingMacroField(pend, 'kcal', merged.kcal);
  backfillPendingMacroField(pend, 'proteinG', merged.proteinG);
}

/**
 * @param {Record<string, unknown>} monitoreo
 */
export function clearDietPending(monitoreo) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return;
  DIET_PENDING_KEYS.forEach(function (k) {
    monitoreo.pendienteReceta[k] = '';
  });
}

/**
 * @param {Record<string, unknown>} monitoreo
 */
export function clearDietOptions(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  delete monitoreo.dietOptions;
  delete monitoreo.dietOptionSelected;
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @returns {unknown[]}
 */
export function getDietOptions(monitoreo) {
  return Array.isArray(monitoreo && monitoreo.dietOptions) ? monitoreo.dietOptions : [];
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {unknown[]} candidates
 */
export function storeDietOptions(monitoreo, candidates) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  monitoreo.dietOptions = Array.isArray(candidates) ? candidates.slice() : [];
  monitoreo.dietOptionSelected = 0;
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {{ descripcion?: string, kcal?: unknown, proteinG?: unknown }} candidate
 */
export function writeDietProposalFromCandidate(monitoreo, candidate) {
  writeDietProposal(monitoreo, {
    descripcion: candidate.descripcion,
    kcal: candidate.kcal,
    proteinG: candidate.proteinG,
  });
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {number} index
 */
export function selectDietOption(monitoreo, index) {
  var options = getDietOptions(monitoreo);
  if (!options.length || index < 0 || index >= options.length) return false;
  monitoreo.dietOptionSelected = index;
  var candidate = options[index];
  writeDietProposalFromCandidate(monitoreo, candidate);
  return true;
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
  clearDietOptions(monitoreo);
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
function ensurePendienteRecetaObject(monitoreo) {
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') {
    monitoreo.pendienteReceta = {};
  }
  return monitoreo.pendienteReceta;
}

/**
 * @param {{ descripcion?: string, kcal?: unknown, proteinG?: unknown }} merged
 */
function resolveDietProposalText(merged) {
  var dietaText = String(merged.descripcion || '').trim() || buildDietProposalText(merged);
  dietaText = stripDietaMacroSuffixFromLabel(dietaText) || String(dietaText || '').trim();
  if (isDietaSuplemento(dietaText)) dietaText = 'SUPLEMENTO';
  return dietaText;
}

/**
 * @param {Record<string, unknown>} pendienteReceta
 * @param {{ kcal?: unknown, proteinG?: unknown }} merged
 * @param {string} dietaText
 */
function writeDietProposalMacros(pendienteReceta, merged, dietaText) {
  if (!applyDietaSuplementoPolicy(pendienteReceta) && !isDietaParenteral(dietaText)) {
    pendienteReceta.kcal = merged.kcal != null ? String(merged.kcal) : '';
    pendienteReceta.proteinG = merged.proteinG != null ? String(merged.proteinG) : '';
  } else if (isDietaParenteral(dietaText)) {
    pendienteReceta.kcal = merged.kcal != null ? String(merged.kcal) : '';
    pendienteReceta.proteinG = merged.proteinG != null ? String(merged.proteinG) : '';
    pendienteReceta.kcalKg = '';
  }
}

export function writeDietProposal(monitoreo, merged) {
  var pendienteReceta = ensurePendienteRecetaObject(monitoreo);
  var dietaText = resolveDietProposalText(merged);
  pendienteReceta.dieta = dietaText;
  writeDietProposalMacros(pendienteReceta, merged, dietaText);
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
