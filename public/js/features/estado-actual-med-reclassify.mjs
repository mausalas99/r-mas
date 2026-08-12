/**
 * Reclasificar propuestas de medicamentos en EA (soapCatOverride en receta + re-sync).
 */
import {
  classifyMedicationSoapCategory,
  effectiveSoapCategory,
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

function movePendingTextOnly(monitoreo, fromKey, toKey) {
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== 'object') return false;
  var text = String(monitoreo.pendienteReceta[fromKey] || '').trim();
  if (!text) return false;
  monitoreo.pendienteReceta[fromKey] = '';
  var existing = String(monitoreo.pendienteReceta[toKey] || '').trim();
  monitoreo.pendienteReceta[toKey] = existing ? existing + ' | ' + text : text;
  clearRecetaProposalDismissedKey(monitoreo, fromKey);
  clearRecetaProposalDismissedKey(monitoreo, toKey);
  return true;
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
export function reclassifyEaMedProposal(ctx) {
  var fromKey = String(ctx.fromKey || '').trim();
  var toKey = String(ctx.toKey || '').trim();
  if (!fromKey || !toKey || fromKey === toKey) return false;
  if (MED_FIELD_KEYS.indexOf(/** @type {typeof MED_FIELD_KEYS[number]} */ (fromKey)) < 0) return false;
  if (MED_FIELD_KEYS.indexOf(/** @type {typeof MED_FIELD_KEYS[number]} */ (toKey)) < 0) return false;

  var patientId = ctx.patientId;
  var block = patientId && ctx.medRecetaByPatient ? ctx.medRecetaByPatient[patientId] : null;
  var items = block && Array.isArray(block.items) ? block.items : [];
  var sel =
    patientId && ctx.medNotaSelectionByPatient ? ctx.medNotaSelectionByPatient[patientId] || {} : {};
  var classifyFn = classifyMedicationSoapCategory;
  var moved = 0;

  items.forEach(function (it) {
    if (!it || !sel[it.id] || it.suspendido) return;
    var cat = effectiveSoapCategory(it, classifyFn);
    if (!bucketKeyMatches(fromKey, cat)) return;
    applySoapCategoryOverride(it, toKey, classifyFn);
    moved += 1;
  });

  if (moved === 0) return movePendingTextOnly(ctx.monitoreo, fromKey, toKey);

  clearRecetaProposalDismissedKey(ctx.monitoreo, fromKey);
  clearRecetaProposalDismissedKey(ctx.monitoreo, toKey);
  syncRecetaProposalsFromSoapSelection(
    patientId,
    ctx.monitoreo,
    ctx.medRecetaByPatient,
    ctx.medNotaSelectionByPatient,
    classifyFn
  );
  return moved > 0;
}
