/** @typedef {'census_delete' | 'versioned_delete' | 'outbox_delete'} LanPatientDeleteStep */

/**
 * Explicit delete transport order for host patient purge.
 * @param {boolean} hasCensusRow
 * @returns {LanPatientDeleteStep[]}
 */
export function resolveLanPatientDeleteSteps(hasCensusRow) {
  if (!hasCensusRow) return ['census_delete', 'census_delete'];
  return ['versioned_delete', 'census_delete', 'outbox_delete'];
}
