/** Worker pull: trim lab sidecars to recent calendar days (keep payloads light). */
export {
  MOBILE_LAB_HISTORY_DAYS,
  mobileLabHistoryCutoffMs,
  isLabSetWithinMobileHistoryWindow,
  filterLabHistorySetsForMobileReference,
  filterLabSidecarMapForMobileReference,
  resolveLabSetMs,
} from '../../../lib/lab-mobile-history-window.mjs';

import { filterLabSidecarMapForMobileReference } from '../../../lib/lab-mobile-history-window.mjs';

/**
 * @param {Record<string, Record<string, unknown>> | null | undefined} labSidecars
 * @param {Date} [now]
 */
export function filterLabSidecarsForMobilePull(labSidecars, now = new Date()) {
  if (!labSidecars || typeof labSidecars !== 'object') return {};
  /** @type {Record<string, Record<string, unknown>>} */
  const out = {};
  for (const [patientId, sets] of Object.entries(labSidecars)) {
    if (!sets || typeof sets !== 'object') continue;
    const kept = filterLabSidecarMapForMobileReference(sets, { now });
    if (Object.keys(kept).length) out[patientId] = kept;
  }
  return out;
}

/**
 * @param {import('./lww.js').RoomSyncState} state
 * @param {Date} [now]
 */
export function filterRoomStateLabSidecarsForMobile(state, now = new Date()) {
  if (!state || typeof state !== 'object') return state;
  return {
    ...state,
    labSidecars: filterLabSidecarsForMobilePull(state.labSidecars, now),
  };
}
