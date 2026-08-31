import {
  rewriteAbxDisplayText,
  collectDietasFromRecetaBlock,
} from '../med-receta-core.mjs';
import {
  MED_FIELD_KEYS,
  applyDietaSuplementoPolicy,
} from './estado-actual-data.mjs';
import {
  hasActiveDietProposal,
  shouldSkipDietProposal,
  tryAutoConfirmMatchingDiet,
  writeDietProposal,
  mergedDietFromReceta,
  mergedDietHasContent,
  clearDietPending,
  clearDietOptions,
  writeDietProposalFromCandidate,
  storeDietOptions,
  getDietOptions,
} from './estado-actual-meds-diet.mjs';
import { listDietCandidatesFromRecetaBlock } from '../med-receta-core.mjs';
import { stripDietaMacroSuffixFromLabel } from './estado-actual-data.mjs';
import {
  DIET_PENDING_KEYS,
  resolveManejoFechaActualizacion,
  resolveEaAbxFechaActualizacion,
  ensureAbxDiaAnchorDate,
  hasPendingEaProposals,
  ensureRecetaProposalDismissed,
  isRecetaProposalDismissed,
  clearRecetaProposalDismissed,
  clearRecetaProposalDismissedKey,
} from './estado-actual-meds-core.mjs';
import {
  medInstructionFragmentForSoap,
  bucketsFromRecetaItems,
} from './estado-actual-meds-receta-buckets.mjs';
import {
  allowedSoapFragmentsByCategory,
  pruneEstadoClinicoMedsFromReceta,
} from './estado-actual-meds-receta-prune.mjs';
import { buildMedDropdownOptions } from './estado-actual-meds-dropdown.mjs';

export {
  DIET_PENDING_KEYS,
  resolveManejoFechaActualizacion,
  resolveEaAbxFechaActualizacion,
  ensureAbxDiaAnchorDate,
  hasPendingEaProposals,
  medInstructionFragmentForSoap,
  bucketsFromRecetaItems,
  allowedSoapFragmentsByCategory,
  pruneEstadoClinicoMedsFromReceta,
  buildMedDropdownOptions,
};

function recetaItemsFromOpts(opts) {
  var id = opts && opts.activeId;
  var map = opts && opts.medRecetaByPatient;
  var block = id && map ? map[id] : null;
  return block && Array.isArray(block.items) ? block.items : [];
}

function advanceAbxTextForEa(text, fechaActualizacion, refDate, recetaItems) {
  if (!text) return text;
  return rewriteAbxDisplayText(String(text), fechaActualizacion, recetaItems, refDate);
}

function withAdvancedAbxEc(ec, fechaActualizacion, refDate, recetaItems) {
  if (!ec || !ec.abx || !String(ec.abx).trim()) return ec;
  var next = Object.assign({}, ec);
  next.abx = advanceAbxTextForEa(String(ec.abx), fechaActualizacion, refDate, recetaItems);
  return next;
}

/**
 * Estado clínico efectivo para texto SOAP: incluye propuestas pendientes no confirmadas.
 * @param {Record<string, unknown> | null | undefined} monitoreo
 * @returns {Record<string, unknown>}
 */
function mergePendingDietProposal(ec, pend, _conf) {
  if (!ec || typeof ec !== 'object') return ec;
  if (!hasActiveDietProposal(pend)) return ec;
  DIET_PENDING_KEYS.forEach(function (k) {
    var pending = pend[k];
    if (pending != null && String(pending).trim()) ec[k] = String(pending).trim();
  });
  applyDietaSuplementoPolicy(ec);
  return ec;
}

/**
 * Copia dieta detectada en Manejo (block.dietas) a propuesta pendiente de EA si aún no hay una.
 * @param {Record<string, unknown>} monitoreo
 * @param {{ dietas?: unknown[] } | null | undefined} recetaBlock
 * @param {{ force?: boolean } | undefined} [opts]
 * @returns {boolean}
 */
export function applyDietProposalFromRecetaBlock(monitoreo, recetaBlock, opts) {
  if (!monitoreo || !recetaBlock) return false;
  var candidates = listDietCandidatesFromRecetaBlock(recetaBlock);
  if (!candidates.length) return false;
  if (candidates.length > 1) {
    storeDietOptions(monitoreo, candidates);
    var selected = candidates[0];
    var merged = {
      descripcion: selected.descripcion,
      kcal: selected.kcal,
      proteinG: selected.proteinG,
    };
    if (!mergedDietHasContent(merged)) return false;
    if (tryAutoConfirmMatchingDiet(monitoreo, merged)) {
      clearDietOptions(monitoreo);
      return true;
    }
    if (shouldSkipDietProposal(monitoreo, opts, merged)) return false;
    writeDietProposalFromCandidate(monitoreo, selected);
    return true;
  }
  var merged = mergedDietFromReceta(collectDietasFromRecetaBlock(recetaBlock));
  clearDietOptions(monitoreo);
  if (!mergedDietHasContent(merged)) return false;
  if (tryAutoConfirmMatchingDiet(monitoreo, merged)) return true;
  if (shouldSkipDietProposal(monitoreo, opts, merged)) return false;
  writeDietProposal(monitoreo, merged);
  return true;
}

/**
 * Estado clínico para inputs del panel EA (incluye propuesta de dieta pendiente).
 * @param {Record<string, unknown> | null | undefined} monitoreo
 * @param {{ fechaActualizacion?: string, refDate?: Date }} [opts]
 */
export function estadoClinicoForDisplay(monitoreo, opts) {
  if (!monitoreo || typeof monitoreo !== 'object') return {};
  var fechaActualizacion =
    opts && opts.fechaActualizacion
      ? String(opts.fechaActualizacion).trim()
      : resolveEaAbxFechaActualizacion(opts && opts.activeId, opts && opts.medRecetaByPatient, monitoreo);
  var refDate = opts && opts.refDate;
  var ec =
    monitoreo.estadoClinico && typeof monitoreo.estadoClinico === 'object'
      ? Object.assign({}, monitoreo.estadoClinico)
      : {};
  var pend =
    monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object'
      ? monitoreo.pendienteReceta
      : {};
  var conf =
    monitoreo.confirmado && typeof monitoreo.confirmado === 'object' ? monitoreo.confirmado : {};
  mergePendingDietProposal(ec, pend, conf);
  return withAdvancedAbxEc(ec, fechaActualizacion, refDate, recetaItemsFromOpts(opts));
}

/**
 * @param {string} pending
 * @param {string} fechaActualizacion
 * @param {Date} [refDate]
 */
function pendingMedValueForText(key, pending, fechaActualizacion, refDate, recetaItems) {
  var val = String(pending).trim();
  return key === 'abx' ? advanceAbxTextForEa(val, fechaActualizacion, refDate, recetaItems) : val;
}

function mergePendingMedsForText(ec, pend, conf, fechaActualizacion, refDate, recetaItems) {
  for (var k of MED_FIELD_KEYS) {
    if (conf[k]) continue;
    var pending = pend[k];
    if (pending == null || !String(pending).trim()) continue;
    if (!ec[k] || !String(ec[k]).trim()) {
      ec[k] = pendingMedValueForText(k, String(pending), fechaActualizacion, refDate, recetaItems);
    }
  }
}

export function estadoClinicoForText(monitoreo, opts) {
  if (!monitoreo || typeof monitoreo !== 'object') return {};
  var fechaActualizacion =
    opts && opts.fechaActualizacion
      ? String(opts.fechaActualizacion).trim()
      : resolveEaAbxFechaActualizacion(opts && opts.activeId, opts && opts.medRecetaByPatient, monitoreo);
  var refDate = opts && opts.refDate;
  var ec = estadoClinicoForDisplay(monitoreo, opts);
  var pend =
    monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object'
      ? monitoreo.pendienteReceta
      : {};
  var conf =
    monitoreo.confirmado && typeof monitoreo.confirmado === 'object' ? monitoreo.confirmado : {};
  mergePendingMedsForText(ec, pend, conf, fechaActualizacion, refDate, recetaItemsFromOpts(opts));
  return ec;
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {Record<string, string>} buckets
 * @returns {boolean}
 */
export function syncConfirmedAbxFromReceta(monitoreo, buckets) {
  if (!monitoreo || !monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== 'object') return false;
  var conf =
    monitoreo.confirmado && typeof monitoreo.confirmado === 'object' ? monitoreo.confirmado : {};
  if (!conf.abx) return false;
  var next = buckets && buckets.abx != null ? String(buckets.abx).trim() : '';
  if (!next) return false;
  var cur = String(monitoreo.estadoClinico.abx || '').trim();
  if (cur === next) return false;
  /** @type {Record<string, string>} */ (monitoreo.estadoClinico).abx = next;
  return true;
}

/**
 * Aplica propuestas desde medicamentos marcados SOAP en la pestaña Receta.
 * @param {string | null | undefined} patientId
 * @param {Record<string, unknown>} monitoreo
 * @param {Record<string, { items?: unknown[] }>} medRecetaByPatient
 * @param {Record<string, Record<string, boolean>>} medNotaSelectionByPatient
 * @param {(nombreRaw: string) => string} classifyFn
 * @returns {boolean} true si se aplicó al menos una propuesta
 */
export function syncRecetaProposalsFromSoapSelection(
  patientId,
  monitoreo,
  medRecetaByPatient,
  medNotaSelectionByPatient,
  classifyFn
) {
  if (!patientId || !monitoreo) return false;
  var block = medRecetaByPatient ? medRecetaByPatient[patientId] : null;
  var items = block && Array.isArray(block.items) ? block.items : [];
  var fechaActualizacion = resolveManejoFechaActualizacion(patientId, medRecetaByPatient);
  var pruned = pruneEstadoClinicoMedsFromReceta(monitoreo, items, classifyFn, fechaActualizacion);
  var sel = medNotaSelectionByPatient && medNotaSelectionByPatient[patientId];
  var buckets = bucketsFromRecetaItems(items, sel || {}, classifyFn);
  applyRecetaProposal(monitoreo, buckets);
  var syncedAbx = syncConfirmedAbxFromReceta(monitoreo, buckets);
  var hasAny = MED_FIELD_KEYS.some(function (k) {
    return buckets[k] && String(buckets[k]).trim();
  });
  return pruned || hasAny || syncedAbx;
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {Record<string, string>} buckets
 */
export function applyRecetaProposal(monitoreo, buckets) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') {
    monitoreo.pendienteReceta = {};
  }
  for (var k of MED_FIELD_KEYS) {
    if (monitoreo.confirmado && monitoreo.confirmado[k]) continue;
    if (isRecetaProposalDismissed(monitoreo, k)) continue;
    var val = buckets && buckets[k];
    monitoreo.pendienteReceta[k] = val != null && String(val).trim() ? String(val).trim() : '';
  }
}

/**
 * Como applyRecetaProposal, pero una categoría ya confirmada también recibe
 * propuesta cuando la receta trae contenido distinto al confirmado (p. ej.
 * bomba de insulina o reposición de potasio agregados después de confirmar
 * NM). Solo la usa el envío explícito «Enviar a Estado Actual» — el sync
 * pasivo en segundo plano sigue respetando el bloqueo de applyRecetaProposal.
 * @param {Record<string, unknown>} monitoreo
 * @param {Record<string, string>} buckets
 */
export function applyRecetaProposalForce(monitoreo, buckets) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') {
    monitoreo.pendienteReceta = {};
  }
  var estadoClinico = monitoreo.estadoClinico && typeof monitoreo.estadoClinico === 'object' ? monitoreo.estadoClinico : {};
  for (var k of MED_FIELD_KEYS) {
    var val = buckets && buckets[k];
    var next = val != null && String(val).trim() ? String(val).trim() : '';
    var isConfirmed = !!(monitoreo.confirmado && monitoreo.confirmado[k]);
    if (isConfirmed) {
      var current = String(estadoClinico[k] || '').trim();
      if (!next || next === current) continue;
    } else if (isRecetaProposalDismissed(monitoreo, k)) {
      continue;
    }
    monitoreo.pendienteReceta[k] = next;
  }
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {string} key
 * @param {{ patientId?: string | null, medRecetaByPatient?: Record<string, { fechaActualizacion?: string }> } | undefined} [ctx]
 */
function pendingRecetaValueForKey(monitoreo, key) {
  return (
    monitoreo.pendienteReceta &&
    typeof monitoreo.pendienteReceta === 'object' &&
    monitoreo.pendienteReceta[key]
  );
}

function ensureEstadoClinicoObject(monitoreo) {
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== 'object') {
    monitoreo.estadoClinico = {};
  }
  return monitoreo.estadoClinico;
}

function ensureConfirmadoObject(monitoreo) {
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') {
    monitoreo.confirmado = {};
  }
  return monitoreo.confirmado;
}

function clearPendingRecetaKey(monitoreo, key) {
  if (monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === 'object') {
    monitoreo.pendienteReceta[key] = '';
  }
}

export function confirmMedField(monitoreo, key, ctx) {
  if (!monitoreo || !MED_FIELD_KEYS.includes(/** @type {typeof MED_FIELD_KEYS[number]} */ (key))) return;
  var estadoClinico = ensureEstadoClinicoObject(monitoreo);
  var pending = pendingRecetaValueForKey(monitoreo, key);
  if (pending != null && String(pending).trim()) {
    /** @type {Record<string, string>} */ (estadoClinico)[key] = String(pending).trim();
  }
  if (key === 'abx') {
    ensureAbxDiaAnchorDate(monitoreo, ctx && ctx.patientId, ctx && ctx.medRecetaByPatient);
  }
  var confirmado = ensureConfirmadoObject(monitoreo);
  /** @type {Record<string, boolean>} */ (confirmado)[key] = true;
  clearPendingRecetaKey(monitoreo, key);
  clearRecetaProposalDismissedKey(monitoreo, key);
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {string} key
 */
export function discardMedProposal(monitoreo, key) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return;
  if (MED_FIELD_KEYS.includes(/** @type {typeof MED_FIELD_KEYS[number]} */ (key))) {
    monitoreo.pendienteReceta[key] = '';
    ensureRecetaProposalDismissed(monitoreo)[key] = true;
  }
}

/**
 * @param {Record<string, unknown>} monitoreo
 */
export function confirmDietProposal(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== 'object') {
    monitoreo.estadoClinico = {};
  }
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return;
  DIET_PENDING_KEYS.forEach(function (k) {
    var pending = monitoreo.pendienteReceta[k];
    if (pending != null && String(pending).trim()) {
      /** @type {Record<string, string>} */ (monitoreo.estadoClinico)[k] = String(pending).trim();
      monitoreo.pendienteReceta[k] = '';
    }
  });
  applyDietaSuplementoPolicy(monitoreo.estadoClinico, monitoreo.pendienteReceta);
  if (monitoreo.estadoClinico.dieta) {
    var dietaClean = stripDietaMacroSuffixFromLabel(monitoreo.estadoClinico.dieta);
    if (dietaClean) monitoreo.estadoClinico.dieta = dietaClean;
  }
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== 'object') {
    monitoreo.confirmado = {};
  }
  /** @type {Record<string, boolean>} */ (monitoreo.confirmado).dieta = true;
  clearDietPending(monitoreo);
  clearDietOptions(monitoreo);
  clearRecetaProposalDismissedKey(monitoreo, 'dieta');
}

export function discardDietProposal(monitoreo) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return;
  DIET_PENDING_KEYS.forEach(function (k) {
    monitoreo.pendienteReceta[k] = '';
  });
  clearDietOptions(monitoreo);
  ensureRecetaProposalDismissed(monitoreo).dieta = true;
}

export function confirmAllMedProposals(monitoreo) {
  if (
    DIET_PENDING_KEYS.some(function (k) {
      return (
        monitoreo.pendienteReceta &&
        typeof monitoreo.pendienteReceta === 'object' &&
        monitoreo.pendienteReceta[k] &&
        String(monitoreo.pendienteReceta[k]).trim()
      );
    })
  ) {
    confirmDietProposal(monitoreo);
  }
  for (var k of MED_FIELD_KEYS) {
    if (
      monitoreo.pendienteReceta &&
      typeof monitoreo.pendienteReceta === 'object' &&
      monitoreo.pendienteReceta[k]
    ) {
      confirmMedField(monitoreo, k);
    }
  }
}
