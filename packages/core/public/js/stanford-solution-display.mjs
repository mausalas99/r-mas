/**
 * Agrupa la Solución Stanford en Estado Actual (NM) y en Manejo, en una sola
 * línea (igual patrón que la reposición de potasio).
 */
import { formatMedicationSoapShort } from './med-receta-core.mjs';
import {
  isStanfordSolutionMedicationItem,
  patientHasStanfordSolutionMeds,
  stanfordSolutionItemsFromList,
} from './stanford-solution-detect.mjs';

export const STANFORD_SOLUTION_NM_PREFIX = 'SOLUCIÓN STANFORD:';
export const STANFORD_SOLUTION_GROUP_ID = '__stanford_solution_group__';

export {
  isStanfordSolutionMedicationItem,
  patientHasStanfordSolutionMeds,
  stanfordSolutionItemsFromList,
} from './stanford-solution-detect.mjs';

/**
 * @param {unknown[]} items
 * @returns {string}
 */
function stanfordSolutionClause(items) {
  var parts = stanfordSolutionItemsFromList(items).map(function (it) {
    return formatMedicationSoapShort(it);
  });
  return STANFORD_SOLUTION_NM_PREFIX + ' ' + parts.join(' + ');
}

/**
 * @param {unknown[]} allItems
 * @param {unknown[]} soapSelected
 * @returns {string | null}
 */
export function stanfordSolutionNmSoapFragment(allItems, soapSelected) {
  if (!patientHasStanfordSolutionMeds(allItems)) return null;
  var selected = Array.isArray(soapSelected) ? soapSelected : [];
  var stSelected = selected.filter(isStanfordSolutionMedicationItem);
  if (!stSelected.length) return null;
  return stanfordSolutionClause(stSelected);
}

/**
 * @param {unknown} item
 * @param {unknown[]} allItems
 * @returns {boolean}
 */
export function skipRecetaItemForStanfordSolutionBucket(item, allItems) {
  if (!patientHasStanfordSolutionMeds(allItems)) return false;
  return isStanfordSolutionMedicationItem(item);
}

/**
 * Fila fusionada de Solución Stanford en Manejo (5 medicamentos en una sola línea).
 * @param {unknown[]} allItems
 * @param {(s: string) => string} escFn
 * @returns {string}
 */
export function stanfordSolutionGroupMedLabelHtml(allItems, escFn) {
  return escFn(stanfordSolutionClause(stanfordSolutionItemsFromList(allItems)));
}

/**
 * @param {string} patientId
 * @param {unknown[]} items
 * @param {(patientId: string, itemId: string) => boolean} isSelectedFn
 * @returns {boolean}
 */
export function isStanfordSolutionGroupSoapSelected(patientId, items, isSelectedFn) {
  var stItems = stanfordSolutionItemsFromList(items);
  if (!stItems.length) return false;
  return stItems.some(function (it) {
    return isSelectedFn(patientId, String(/** @type {{ id?: unknown }} */ (it).id || ''));
  });
}

/**
 * @param {unknown[]} items
 * @param {(itemId: string) => boolean} isSuspendedFn
 * @returns {boolean}
 */
export function isStanfordSolutionGroupSuspended(items, isSuspendedFn) {
  var stItems = stanfordSolutionItemsFromList(items);
  if (!stItems.length) return false;
  return stItems.every(function (it) {
    return isSuspendedFn(String(/** @type {{ id?: unknown }} */ (it).id || ''));
  });
}
