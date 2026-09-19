/**
 * No per-rank caps — admin / join may add any number of users.
 * @param {string} _service
 * @param {string} _rank
 * @param {Array<{ rank?: string }>} _members
 * @returns {string|null}
 */
export function validateTeamRankSlot(_service, _rank, _members) {
  return null;
}
