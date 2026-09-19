import {
  filterLabSidecarMapForMobileReference,
  isLabSetWithinMobileHistoryWindow
} from "/mobile/js/chunks/chunk-N3UTXQGG.js";
import {
  isCloudMobileClient
} from "/mobile/js/chunks/chunk-OXN2ZL25.js";

// public/js/features/cloud-mobile/lab-history-window.mjs
function shouldApplyMobileLabHistoryWindow() {
  return isCloudMobileClient();
}
function filterCloudStateForMobileLabWindow(state, opts) {
  if (!state || typeof state !== "object") return state;
  if (!shouldApplyMobileLabHistoryWindow()) return state;
  const labSidecars = state.labSidecars;
  if (!labSidecars || typeof labSidecars !== "object") return state;
  const nextSidecars = {};
  Object.keys(labSidecars).forEach(function(patientId) {
    const filtered = filterLabSidecarMapForMobileReference(
      /** @type {Record<string, unknown>} */
      labSidecars[patientId],
      opts
    );
    if (Object.keys(filtered).length) nextSidecars[patientId] = filtered;
  });
  return { ...state, labSidecars: nextSidecars };
}
function filterOpFoldLabSidecarsForMobile(fold, opts) {
  if (!fold || !shouldApplyMobileLabHistoryWindow()) return;
  const map = fold.labSidecars;
  if (!map || typeof map !== "object") return;
  Object.keys(map).forEach(function(patientId) {
    const filtered = filterLabSidecarMapForMobileReference(map[patientId], opts);
    if (Object.keys(filtered).length) map[patientId] = filtered;
    else delete map[patientId];
  });
}
function filterCloudPullOpsForMobileLabWindow(ops, opts) {
  if (!shouldApplyMobileLabHistoryWindow() || !Array.isArray(ops)) return ops;
  return ops.filter(function(op) {
    if (!op || typeof op !== "object") return false;
    const path = String(
      /** @type {{ path?: unknown }} */
      op.path || ""
    );
    if (!path.startsWith("labSidecars/")) return true;
    return isLabSetWithinMobileHistoryWindow(
      /** @type {{ value?: unknown }} */
      op.value,
      opts && opts.now,
      opts && opts.days
    );
  });
}

export {
  shouldApplyMobileLabHistoryWindow,
  filterCloudStateForMobileLabWindow,
  filterOpFoldLabSidecarsForMobile,
  filterCloudPullOpsForMobileLabWindow
};
//# sourceMappingURL=/js/chunks/chunk-YVT3SP6T.js.map
