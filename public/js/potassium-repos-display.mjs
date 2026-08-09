/**
 * Agrupa reposición de potasio IV en Estado Actual (NM).
 */
import { formatMedicationSoapShort } from './med-receta-format.mjs';
import {
  isPotassiumReposMedicationItem,
  patientHasPotassiumReposMeds,
  potassiumReposDurationClause,
} from './potassium-repos-detect.mjs';

export const POTASSIUM_REPOS_NM_PREFIX = 'REPOSICIÓN DE POTASIO';

export {
  isPotassiumReposMedicationItem,
  patientHasPotassiumReposMeds,
  potassiumReposItemsFromList,
  isPotassiumReposCarrierMedicationItem,
  potassiumReposDurationClause,
} from './potassium-repos-detect.mjs';

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
  var parts = kSelected.map(function (it) {
    return formatMedicationSoapShort(/** @type {Parameters<typeof formatMedicationSoapShort>[0]} */ (it));
  });
  var clause = POTASSIUM_REPOS_NM_PREFIX + ': ' + parts.join(', ');
  var duration = potassiumReposDurationClause(allItems);
  if (duration) clause += ' (' + duration + ')';
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
