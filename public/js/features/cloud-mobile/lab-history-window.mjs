/**
 * R+ Móvil / iPad: historial de labs reciente (referencia rápida, sin cargar todo el turno).
 */
import { isCloudMobileClient } from './origin.mjs';
export {
  MOBILE_LAB_HISTORY_DAYS,
  mobileLabHistoryCutoffMs,
  parseLabSetFechaToMs,
  inferLabSetMsFromId,
  resolveLabSetMs,
  isLabSetWithinMobileHistoryWindow,
  filterLabHistorySetsForMobileReference,
  filterLabSidecarMapForMobileReference,
} from '../../../../lib/lab-mobile-history-window.mjs';

import {
  filterLabSidecarMapForMobileReference,
  isLabSetWithinMobileHistoryWindow,
} from '../../../../lib/lab-mobile-history-window.mjs';

export function shouldApplyMobileLabHistoryWindow() {
  return isCloudMobileClient();
}

/**
 * @param {Record<string, unknown> | null | undefined} state
 * @param {{ now?: Date, days?: number }} [opts]
 */
export function filterCloudStateForMobileLabWindow(state, opts) {
  if (!state || typeof state !== 'object') return state;
  if (!shouldApplyMobileLabHistoryWindow()) return state;
  const labSidecars = state.labSidecars;
  if (!labSidecars || typeof labSidecars !== 'object') return state;
  /** @type {Record<string, Record<string, unknown>>} */
  const nextSidecars = {};
  Object.keys(labSidecars).forEach(function (patientId) {
    const filtered = filterLabSidecarMapForMobileReference(
      /** @type {Record<string, unknown>} */ (labSidecars[patientId]),
      opts
    );
    if (Object.keys(filtered).length) nextSidecars[patientId] = filtered;
  });
  return { ...state, labSidecars: nextSidecars };
}

/**
 * @param {import('../cloud-sync/pull-apply-state.mjs').OpFold} fold
 * @param {{ now?: Date, days?: number }} [opts]
 */
export function filterOpFoldLabSidecarsForMobile(fold, opts) {
  if (!fold || !shouldApplyMobileLabHistoryWindow()) return;
  const map = fold.labSidecars;
  if (!map || typeof map !== 'object') return;
  Object.keys(map).forEach(function (patientId) {
    const filtered = filterLabSidecarMapForMobileReference(map[patientId], opts);
    if (Object.keys(filtered).length) map[patientId] = filtered;
    else delete map[patientId];
  });
}

/**
 * @param {unknown[]} ops
 * @param {{ now?: Date, days?: number }} [opts]
 */
export function filterCloudPullOpsForMobileLabWindow(ops, opts) {
  if (!shouldApplyMobileLabHistoryWindow() || !Array.isArray(ops)) return ops;
  return ops.filter(function (op) {
    if (!op || typeof op !== 'object') return false;
    const path = String(/** @type {{ path?: unknown }} */ (op).path || '');
    if (!path.startsWith('labSidecars/')) return true;
    return isLabSetWithinMobileHistoryWindow(
      /** @type {{ value?: unknown }} */ (op).value,
      opts && opts.now,
      opts && opts.days
    );
  });
}
