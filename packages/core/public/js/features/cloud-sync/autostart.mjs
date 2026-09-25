/**
 * Start Nube sync runtime on desktop boot when session already has room + token.
 */
import { isCloudSala } from './sala-allowlist.mjs';
import {
  getCloudSyncToken,
  getCloudSyncRoomId,
  getCloudSyncRevision,
  setCloudSyncRevision,
  setCloudSyncRoomId,
  setCloudSyncRoomSnapshot,
  getCloudSyncUrl,
} from './settings.mjs';
import { setCloudRoomConnected } from './nube-sync-policy.mjs';
import { createCloudSyncApi } from './api-client.mjs';
import { startSharedNubeRuntime } from './panel-conexion-runtime.mjs';
import { OUTBOX_STORAGE_KEY } from './outbox.mjs';

/** @returns {boolean} */
export function canAutostartCloudSync() {
  if (typeof globalThis !== 'undefined' && globalThis.__RPC_CLOUD_MOBILE__) return false;
  return !!getCloudSyncToken();
}

/**
 * @param {{ toast?: (msg: string, kind?: string) => void }} [opts]
 * @returns {Promise<ReturnType<typeof startSharedNubeRuntime> | null>}
 */
export async function autostartCloudSyncIfConfigured(opts) {
  if (!canAutostartCloudSync()) return null;
  const { getUserSala } = await import('./panel-clinical-context.mjs');
  if (!isCloudSala(getUserSala())) return null;

  try {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
  } catch {
    /* ignore */
  }

  const toast = typeof opts?.toast === 'function' ? opts.toast : function () {};
  const api = createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken,
  });

  // Always ensure-turn: sticky roomId must not pin a prior day/month room.
  const { ensureTurnRoom } = await import('./ensure-turn-room.mjs');
  await ensureTurnRoom({
    api,
    getSala: getUserSala,
    getToken: getCloudSyncToken,
    setCloudSyncRoomId,
    setCloudSyncRoomSnapshot,
    setCloudSyncRevision,
    onConnected: function () {
      setCloudRoomConnected(true);
    },
  });

  if (!getCloudSyncRoomId()) return null;
  setCloudRoomConnected(true);
  void import('./detach-stale-room-membership.mjs').then(function (mod) {
    return mod.detachLanLiveSyncForNube();
  });

  return startSharedNubeRuntime({
    getApi: function () {
      return api;
    },
    getCloudSyncRoomId,
    getCloudSyncToken,
    getCloudSyncRevision,
    setCloudSyncRevision,
    onStatus: function () {},
    toast,
  });
}
