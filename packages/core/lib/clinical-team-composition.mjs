/** @param {unknown} value */
function normalizeServiceKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** @typedef {{ r1: number, r2: number, r3: number }} TeamCompositionLimits */

/**
 * Historical caps (unused for enforcement). Teams accept any number of members.
 * Kept empty so create-form hints stay off.
 * @type {Record<string, TeamCompositionLimits>}
 */
export const TEAM_COMPOSITION_BY_SERVICE = {};

/** @param {string} service */
export function getTeamCompositionLimits(service) {
  const key = normalizeServiceKey(service);
  return TEAM_COMPOSITION_BY_SERVICE[key] || null;
}

/** Services where UX/Eme staff rotate to Interconsultas on off-call days. */
export const OFF_CALL_INTERCONSULTAS_SERVICES = new Set(['ux', 'eme']);

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

/** @param {string} service */
export function serviceUsesStructuredComposition(service) {
  return getTeamCompositionLimits(service) != null;
}
