/**
 * Agrupa reposición de potasio IV en Estado Actual (NM).
 */
import {
  isPotassiumReposMedicationItem,
  patientHasPotassiumReposMeds,
  potassiumReposDurationClause,
  potassiumReposTotalMeQ,
} from './potassium-repos-detect.mjs';

export const POTASSIUM_REPOS_NM_PREFIX = 'REPOSICIÓN DE POTASIO';

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
