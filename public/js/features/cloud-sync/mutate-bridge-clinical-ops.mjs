/**
 * Dedicated clinicalOps LWW push helpers for Nube (extracted from mutate-bridge).
 */
import { isCloudSyncActive } from './lan-override.mjs';
import { enqueueCloudClinicalOpsValue } from './mutate-bridge.mjs';
import {
  getCachedClinicalOpsSnapshot,
  isClinicalOpsLanAvailable,
  prepareClinicalOpsForLanSync,
} from '../../clinical-ops-sync.mjs';

/** @returns {Promise<unknown|null>} */
export async function snapshotClinicalOpsForCloud() {
  try {
    if (isClinicalOpsLanAvailable()) await prepareClinicalOpsForLanSync();
    return getCachedClinicalOpsSnapshot();
  } catch {
    return null;
  }
}

/** Dedicated clinicalOps LWW push when teams/profile change under Nube. */
export async function pushCloudClinicalOpsNow() {
  if (!isCloudSyncActive()) return { ok: false, reason: 'bridge_inactive' };
  const clinicalOps = await snapshotClinicalOpsForCloud();
  if (clinicalOps == null) return { ok: false, reason: 'no_snapshot' };
  if (!enqueueCloudClinicalOpsValue(clinicalOps)) {
    return { ok: false, reason: 'bridge_inactive' };
  }
  return { ok: true };
}
