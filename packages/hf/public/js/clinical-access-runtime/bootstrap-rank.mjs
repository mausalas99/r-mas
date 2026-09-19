import { CLINICAL_RANKS } from '../../../lib/clinical-ranks.mjs';

/**
 * @param {Record<string, unknown>|null|undefined} settings
 * @param {string} [clientId]
 */
export function resolveClinicalRank(settings, clientId) {
  void clientId;
  const rank = settings && settings.clinicalRank ? String(settings.clinicalRank) : 'Team';
  return CLINICAL_RANKS.includes(rank) ? rank : 'Team';
}
