/**
 * Compat shim — clinical ops sync helpers live in clinical-ops-sync.mjs (Phase 3).
 */
export {
  isClinicalOpsLanAvailable,
  refreshClinicalOpsSnapshotCache,
  prepareClinicalOpsForLanSync,
  getCachedClinicalOpsSnapshot,
  collectClinicalOpsForLanSync,
  clinicalOpsMergeHadChanges,
  flushPendingClinicalOpsLanSnapshot,
  applyClinicalOpsLanSnapshot,
  mergeClinicalOpsFromSources,
  mergeClinicalOpsSnapshotsData,
} from './clinical-ops-sync.mjs';
