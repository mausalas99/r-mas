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
import { setCloudRoomConnected } from './lan-override.mjs';
import { createCloudSyncApi } from './api-client.mjs';
import { startSharedNubeRuntime } from './panel-conexion-runtime.mjs';
import { pushCloudCensusNow } from './mutate-bridge.mjs';
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
  void import('./detach-lan-for-nube.mjs').then(function (mod) {
    return mod.detachLanLiveSyncForNube();
  });

  const runtime = startSharedNubeRuntime({
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

  void (async function seedCensusWithRetries() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (attempt > 0) {
        await new Promise(function (resolve) {
          setTimeout(resolve, 2000);
        });
      }
      const result = await pushCloudCensusNow();
      if (result?.ok) {
        console.info('[R+] Nube censo subido:', result.entryOps, 'pacientes');
        break;
      }
      if (result?.reason === 'no_local_patients' || result?.reason === 'bridge_inactive') break;
      if (attempt === 7) {
        console.warn('[R+] Nube: no se pudo subir el censo tras varios intentos.');
      }
    }
    // Census push no longer stamps clinicalOps — publish teams/assignments so iPad
    // team-mirror can keep charts (same path as Conexión connect).
    try {
      const { syncCloudClinicalOpsOnConnect } = await import('./cloud-clinical-ops-sala.mjs');
      await syncCloudClinicalOpsOnConnect();
    } catch (err) {
      console.warn('[R+] Nube clinicalOps seed:', err?.message || err);
    }
  })();

  return runtime;
}
