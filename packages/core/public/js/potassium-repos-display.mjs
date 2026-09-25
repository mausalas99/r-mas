/**
 * Agrupa reposición de potasio IV en Estado Actual (NM).
 */
import {
  isPotassiumReposMedicationItem,
  patientHasPotassiumReposMeds,
  potassiumReposDurationClause,
  potassiumReposItemsFromList,
  potassiumReposTotalMeQ,
} from './potassium-repos-detect.mjs';

export const POTASSIUM_REPOS_NM_PREFIX = 'REPOSICIÓN DE POTASIO';
export const POTASSIUM_REPOS_GROUP_ID = '__potassium_repos_group__';

export {
  isPotassiumReposMedicationItem,
  patientHasPotassiumReposMeds,
  potassiumReposItemsFromList,
  isPotassiumReposCarrierMedicationItem,
  potassiumReposDurationClause,
  potassiumReposTotalMeQ,
} from './potassium-repos-detect.mjs';

/**
 * @param {number} n
 * @returns {string}
 */
function formatMeQTotal(n) {
  var rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/**
 * @param {unknown[]} allItems
 * @param {unknown[]} soapSelected
 * @returns {string | null}
 */
export function potassiumReposNmSoapFragment(allItems, soapSelected) {
  if (!patientHasPotassiumReposMeds(allItems)) return null;
  var selected = Array.isArray(soapSelected) ? soapSelected : [];
  var kSelected = selected.filter(isPotassiumReposMedicationItem);
  if (!kSelected.length) return null;
  var clause = POTASSIUM_REPOS_NM_PREFIX;
  var total = potassiumReposTotalMeQ(kSelected);
  if (total != null) clause += ' ' + formatMeQTotal(total) + ' MEQ';
  var duration = potassiumReposDurationClause(allItems);
  if (duration) clause += ' ' + duration;
  return clause;
}

/**
 * @param {unknown} item
 * @param {unknown[]} allItems
 * @returns {boolean}
 */
export function skipRecetaItemForPotassiumReposBucket(item, allItems) {
  if (!patientHasPotassiumReposMeds(allItems)) return false;
  return isPotassiumReposMedicationItem(item);
}

/**
 * Fila fusionada de reposición de K en Manejo (KCl + KPO4 + carrier ocultos en una sola línea).
 * @param {unknown[]} allItems
 * @param {(s: string) => string} escFn
 * @returns {string}
 */
export function potassiumReposGroupMedLabelHtml(allItems, escFn) {
  var items = potassiumReposItemsFromList(allItems);
  var clause = POTASSIUM_REPOS_NM_PREFIX;
  var total = potassiumReposTotalMeQ(items);
  if (total != null) clause += ' ' + formatMeQTotal(total) + ' MEQ';
  var duration = potassiumReposDurationClause(allItems);
  if (duration) clause += ' ' + duration;
  return escFn(clause);
}

/**
 * @param {string} patientId
 * @param {unknown[]} items
 * @param {(patientId: string, itemId: string) => boolean} isSelectedFn
 * @returns {boolean}
 */
export function isPotassiumReposGroupSoapSelected(patientId, items, isSelectedFn) {
  var kItems = potassiumReposItemsFromList(items);
  if (!kItems.length) return false;
  return kItems.some(function (it) {
    return isSelectedFn(patientId, String(/** @type {{ id?: unknown }} */ (it).id || ''));
  });
}

/**
 * @param {unknown[]} items
 * @param {(itemId: string) => boolean} isSuspendedFn
 * @returns {boolean}
 */
export function isPotassiumReposGroupSuspended(items, isSuspendedFn) {
  var kItems = potassiumReposItemsFromList(items);
  if (!kItems.length) return false;
  return kItems.every(function (it) {
    return isSuspendedFn(String(/** @type {{ id?: unknown }} */ (it).id || ''));
  });
}
