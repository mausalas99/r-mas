/**
 * Dedicated clinicalOps LWW push helpers for Nube (extracted from mutate-bridge).
 */
import { isCloudSyncActive } from './nube-sync-policy.mjs';
import { enqueueCloudClinicalOpsValue } from './mutate-bridge.mjs';
import {
  getCachedClinicalOpsSnapshot,
  isClinicalOpsLanAvailable,
  prepareClinicalOpsForLanSync,
} from '../../clinical-ops-sync.mjs';
import { getCloudSyncRoomSnapshot } from './settings.mjs';

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/** @returns {Promise<unknown|null>} */
export async function snapshotClinicalOpsForCloud() {
  try {
    const sala = String(getCloudSyncRoomSnapshot()?.sala || '').trim();
    const api = dbApi();
    if (sala && api && typeof api.dbClinicalOpsExport === 'function') {
      const res = await api.dbClinicalOpsExport({ sala });
      if (res?.snapshot) return res.snapshot;
    }
    if (isClinicalOpsLanAvailable()) await prepareClinicalOpsForLanSync();
    return getCachedClinicalOpsSnapshot();
  } catch {
    return null;
  }
}

/** Dedicated clinicalOps LWW push when teams/profile change under Nube. */
export async function pushCloudClinicalOpsNow() {
  if (!isCloudSyncActive()) return { ok: false, reason: 'bridge_inactive' };
  const { pushClinicalOpsForSalas, listLocalTeamSalas, pushClinicalOpsForSala } = await import(
    './cloud-clinical-ops-sala.mjs'
  );
  const salas = await listLocalTeamSalas();
  if (salas.length) {
    return pushClinicalOpsForSalas(salas);
  }
  const sala = String(getCloudSyncRoomSnapshot()?.sala || '').trim();
  if (sala) return pushClinicalOpsForSala(sala);

  const clinicalOps = await snapshotClinicalOpsForCloud();
  if (clinicalOps == null) return { ok: false, reason: 'no_snapshot' };
  if (!enqueueCloudClinicalOpsValue(clinicalOps)) {
    return { ok: false, reason: 'bridge_inactive' };
  }
  return { ok: true };
}
