import { purgeClinicalUserMatchingCloudHandle } from './panel-admin-clinical-purge.mjs';
import { equiposDbApi } from './panel-admin-equipos-row-persist.mjs';

/**
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {string} cloudId
 */
async function deleteCloudEquiposUser(getApi, cloudId) {
  await getApi().adminDeleteUser(cloudId);
}

/**
 * @param {string} userId
 * @param {string} callerUserId
 * @param {boolean} cloudDeleted
 */
async function deleteLocalEquiposUser(userId, callerUserId, cloudDeleted) {
  const api = equiposDbApi();
  if (!api || typeof api.dbClinicalUserDelete !== 'function') {
    return {
      ok: cloudDeleted,
      cloudDeleted,
      error: cloudDeleted ? 'no_db_after_cloud' : 'no_db',
    };
  }
  const res = await api.dbClinicalUserDelete({ targetUserId: userId, callerUserId });
  if (!res?.ok) {
    return {
      ok: cloudDeleted,
      cloudDeleted,
      error: String(res?.error || 'delete_failed'),
    };
  }
  return { ok: true, cloudDeleted, localDeleted: true };
}

/** @param {string} userId @param {string} cloudId @param {string} callerUserId */
function isSelfPurgeTarget(userId, cloudId, callerUserId) {
  return Boolean(callerUserId && userId && userId === callerUserId);
}

/**
 * Delete one Equipos row target (Nube and/or clinical).
 * @param {{ userId: string, cloudId: string, handle: string }} target
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {string} callerUserId
 */
export async function purgeEquiposRowTarget(target, getApi, callerUserId) {
  const userId = String(target?.userId || '').trim();
  const cloudId = String(target?.cloudId || '').trim();
  const handle = String(target?.handle || '').trim();
  if (!userId && !cloudId) return { ok: false, skipped: true, error: 'empty' };
  if (isSelfPurgeTarget(userId, cloudId, callerUserId)) {
    return { ok: false, skipped: true, error: 'self' };
  }

  const cloudDeleted = Boolean(cloudId);
  if (cloudId) await deleteCloudEquiposUser(getApi, cloudId);
  if (userId) return deleteLocalEquiposUser(userId, callerUserId, cloudDeleted);
  if (cloudId && handle) await purgeClinicalUserMatchingCloudHandle(handle);
  return { ok: true, cloudDeleted, localDeleted: false };
}
