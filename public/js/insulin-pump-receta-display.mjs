import {
  detectInsulinPumpAlgorithmFromRecetaItems,
  formatInsulinPumpAlgoritmoLabel,
  isInsulinIvMedicationItem,
} from './insulin-pump-some-detect.mjs';

/**
 * @param {unknown[]} allItems
 * @param {unknown[]} soapSelectedItems
 * @returns {string | null}
 */
export function insulinPumpNmSoapFragment(allItems, soapSelectedItems) {
  var alg = detectInsulinPumpAlgorithmFromRecetaItems(allItems);
  if (alg == null) return null;
  var selected = Array.isArray(soapSelectedItems) ? soapSelectedItems : [];
  var hasInsulinSoap = selected.some(function (it) {
    return isInsulinIvMedicationItem(it);
  });
  if (!hasInsulinSoap) return null;
  return formatInsulinPumpAlgoritmoLabel(alg);
}

/**
 * @param {unknown} item
 * @param {unknown[]} allItems
 * @returns {boolean}
 */
export function skipRecetaItemForNmSoapBucket(item, allItems) {
  var alg = detectInsulinPumpAlgorithmFromRecetaItems(allItems);
  if (alg == null) return false;
  return isInsulinIvMedicationItem(item);
}
