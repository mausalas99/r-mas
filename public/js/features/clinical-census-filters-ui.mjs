export const CLINICAL_CENSUS_FILTERS_COLLAPSED_LS = 'rpc.clinicalCensusFiltersCollapsed';

/** @param {Storage|undefined} storage */
export function readCensusFiltersCollapsed(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS) === '1';
  } catch (_e) {
    return false;
  }
}

/** @param {boolean} collapsed @param {Storage|undefined} storage */
export function writeCensusFiltersCollapsed(collapsed, storage = globalThis.localStorage) {
  try {
    if (collapsed) storage?.setItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS, '1');
    else storage?.removeItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS);
  } catch (_e) {}
}
