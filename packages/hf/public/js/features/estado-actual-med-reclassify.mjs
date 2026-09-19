/**
 * Reclasificar propuestas de medicamentos en EA (soapCatOverride en receta + re-sync).
 *
 * Panel refresh re-runs syncRecetaProposalsFromSoapSelection. Moving pendiente text
 * without soapCatOverride (and without the item selected for SOAP) is undone by
 * auto-classification — so we stamp overrides, keep items SOAP-selected, then sync.
 */
import {
  classifyMedicationSoapCategory,
  effectiveSoapCategory,
  formatMedicationSoapShort,
  SOAP_DESTINATION_KEYS,
} from '../med-receta-core.mjs';
import { MED_FIELD_KEYS } from './estado-actual-data.mjs';
import { clearRecetaProposalDismissedKey } from './estado-actual-meds-core.mjs';
import { syncRecetaProposalsFromSoapSelection } from './estado-actual-meds.mjs';

function bucketKeyMatches(fieldKey, soapCat) {
  if (fieldKey === soapCat) return true;
  return fieldKey === 'diureticos' && soapCat === 'diuretico';
}

function fieldKeyToSoapOverrideKey(fieldKey) {
  return fieldKey === 'diureticos' ? 'diuretico' : fieldKey;
}

function applySoapCategoryOverride(item, targetFieldKey, classifyFn) {
  if (!item) return;
  var cat = fieldKeyToSoapOverrideKey(String(targetFieldKey || '').trim());
  var autoCat = classifyFn(item.nombreRaw, item.dosisRaw, item.frecuenciaRaw, item.viaRaw);
  if (!cat || SOAP_DESTINATION_KEYS.indexOf(cat) < 0 || cat === autoCat) delete item.soapCatOverride;
  else item.soapCatOverride = cat;
}

function isSelected(sel, item) {
  if (!item || !sel) return false;
  if (sel[item.id]) return true;
  return !!sel[String(item.id)];
}

function markSelected(sel, item) {
  if (!sel || !item || item.id == null) return;
  sel[item.id] = true;
  sel[String(item.id)] = true;
}

function pendingLines(monitoreo, fromKey) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') {
    return [];
  }
  return String(monitoreo.pendienteReceta[fromKey] || '')
    .split(' | ')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}

function itemMatchesPendingLine(it, line) {
  if (!it || !line) return false;
  var frag = String(formatMedicationSoapShort(it) || '').trim();
  if (frag && frag === line) return true;
  var nombre = String(it.nombreRaw || '')
    .trim()
    .toUpperCase();
  var upper = line.toUpperCase();
  return !!(nombre && upper.indexOf(nombre) === 0);
}

/**
 * Prefer SOAP-selected items in the source bucket; fall back to any non-suspended
 * match (by category or pending text).
 */
function collectItemsToReclassify(items, sel, fromKey, classifyFn, lines) {
  var selected = [];
  var unselected = [];
  items.forEach(function (it) {
    if (!it || it.suspendido) return;
    var cat = effectiveSoapCategory(it, classifyFn);
    var inBucket = bucketKeyMatches(fromKey, cat);
    var inPending =
      !inBucket &&
      lines.some(function (line) {
        return itemMatchesPendingLine(it, line);
      });
    if (!inBucket && !inPending) return;
    if (isSelected(sel, it)) selected.push(it);
    else unselected.push(it);
  });
  return selected.length ? selected : unselected;
}

/**
 * @param {{
 *   patientId?: string | null,
 *   fromKey: string,
 *   toKey: string,
 *   monitoreo: Record<string, unknown>,
 *   medRecetaByPatient: Record<string, { items?: unknown[] }>,
 *   medNotaSelectionByPatient: Record<string, Record<string, boolean>>,
 * }} ctx
 * @returns {boolean}
 */
function isValidFieldKeyPair(fromKey, toKey) {
  if (!fromKey || !toKey || fromKey === toKey) return false;
  if (MED_FIELD_KEYS.indexOf(/** @type {typeof MED_FIELD_KEYS[number]} */ (fromKey)) < 0) return false;
  if (MED_FIELD_KEYS.indexOf(/** @type {typeof MED_FIELD_KEYS[number]} */ (toKey)) < 0) return false;
  return true;
}

function recetaItemsForPatient(medRecetaByPatient, patientId) {
  var block = patientId && medRecetaByPatient ? medRecetaByPatient[patientId] : null;
  return block && Array.isArray(block.items) ? block.items : [];
}

function resolveSelectionBucket(medNotaSelectionByPatient, patientId) {
  if (
    !medNotaSelectionByPatient[patientId] ||
    typeof medNotaSelectionByPatient[patientId] !== 'object'
  ) {
    medNotaSelectionByPatient[patientId] = {};
  }
  return medNotaSelectionByPatient[patientId];
}

export function reclassifyEaMedProposal(ctx) {
  var fromKey = String(ctx.fromKey || '').trim();
  var toKey = String(ctx.toKey || '').trim();
  if (!isValidFieldKeyPair(fromKey, toKey)) return false;

  var patientId = ctx.patientId;
  if (!patientId || !ctx.medNotaSelectionByPatient) return false;
  var items = recetaItemsForPatient(ctx.medRecetaByPatient, patientId);
  var sel = resolveSelectionBucket(ctx.medNotaSelectionByPatient, patientId);
  var classifyFn = classifyMedicationSoapCategory;
  var lines = pendingLines(ctx.monitoreo, fromKey);
  var targets = collectItemsToReclassify(items, sel, fromKey, classifyFn, lines);

  if (!targets.length) return false;

  targets.forEach(function (it) {
    applySoapCategoryOverride(it, toKey, classifyFn);
    markSelected(sel, it);
  });

  clearRecetaProposalDismissedKey(ctx.monitoreo, fromKey);
  clearRecetaProposalDismissedKey(ctx.monitoreo, toKey);
  syncRecetaProposalsFromSoapSelection(
    patientId,
    ctx.monitoreo,
    ctx.medRecetaByPatient,
    ctx.medNotaSelectionByPatient,
    classifyFn
  );
  return true;
}
