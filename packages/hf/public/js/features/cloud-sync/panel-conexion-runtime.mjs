import { startCloudSyncRuntime } from './sync-runtime.mjs';
import { OUTBOX_STORAGE_KEY } from './outbox.mjs';
import { createMemoryOutbox } from '../cloud-mobile/outbox-memory.mjs';
import { configureCloudMutateBridge, scheduleInitialCloudSeed } from './mutate-bridge.mjs';
import { applyCloudPullResult } from './pull-apply.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { getCloudSyncClientId } from './client-id.mjs';
import { getCloudSyncUrl } from './settings.mjs';
import { withTombstoneCoalesce } from './outbox-tombstones.mjs';

/** @type {ReturnType<typeof createOutbox> | null} */
let sharedOutbox = null;

/** @type {ReturnType<typeof startCloudSyncRuntime> | null} */
let sharedRuntime = null;

function ensureSharedOutbox() {
  if (sharedOutbox) return sharedOutbox;
  try {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
  } catch {
    /* ignore bloated legacy outbox */
  }
  sharedOutbox = withTombstoneCoalesce(createMemoryOutbox());
  return sharedOutbox;
}

/**
 * @param {{
 *   getApi: () => ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   getCloudSyncRoomId: () => string,
 *   getCloudSyncToken: () => string,
 *   getCloudSyncRevision: () => number,
 *   setCloudSyncRevision: (revision: number) => void,
 *   onStatus?: (status: string) => void,
 *   toast?: (msg: string, kind?: string) => void,
 * }} deps
 */
export function startSharedNubeRuntime(deps) {
  const roomId = deps.getCloudSyncRoomId();
  const token = deps.getCloudSyncToken();
  if (!roomId || !token) return null;
  const api = deps.getApi();
  if (!api || typeof api.pull !== 'function' || typeof api.push !== 'function') return null;
  if (sharedRuntime) {
    sharedRuntime.stop();
    sharedRuntime = null;
  }
  ensureSharedOutbox();
  const toast = typeof deps.toast === 'function' ? deps.toast : function () {};
  sharedRuntime = startCloudSyncRuntime({
    api,
    outbox: sharedOutbox,
    getRoomId: deps.getCloudSyncRoomId,
    getRevision: deps.getCloudSyncRevision,
    setRevision: deps.setCloudSyncRevision,
    onStatus: deps.onStatus || function () {},
    applyPullResult: async function (result) {
      try {
        await applyCloudPullResult(result);
      } catch {
        toast('No se pudieron aplicar los cambios de la nube.', 'error');
      }
    },
    liveRoomWs: {
      getBaseUrl: getCloudSyncUrl,
      getToken: deps.getCloudSyncToken,
    },
    deferBootCycle: true,
  });
  configureCloudMutateBridge({
    outbox: sharedOutbox,
    getRevision: deps.getCloudSyncRevision,
    noteEditing: function () {
      sharedRuntime?.noteLocalMutation?.();
    },
    // Same path as "Forzar sincronización": push outbox + pull peers (not push-only).
    flush: function () {
      sharedRuntime?.noteLocalMutation?.();
      return sharedRuntime?.syncCycle();
    },
    getActorId: function () {
      return String(clinicalSessionContext.user?.user_id || getCloudSyncClientId() || 'local');
    },
  });
  void import('./detach-stale-room-membership.mjs').then(function (mod) {
    return mod.detachLanLiveSyncForNube();
  });
  void (async function runInitialCloudSyncAndPrune() {
    try {
      await sharedRuntime?.syncCycle();
    } catch {
      /* pull optional on connect */
    }
    try {
      await scheduleInitialCloudSeed();
    } catch {
      /* seed optional on connect */
    }
    try {
      // Brief pause after census/lab commit — avoids stacked writes + 503 on equipos push.
      await new Promise(function (resolve) {
        setTimeout(resolve, 4000);
      });
      // Teams live in sala rooms (not only the census room) — seed pull+push on connect
      // so peers see equipos without waiting for a local Mi rotación edit.
      const { syncCloudClinicalOpsOnConnect } = await import('./cloud-clinical-ops-sala.mjs');
      await syncCloudClinicalOpsOnConnect();
    } catch {
      /* clinicalOps directory optional */
    }
    try {
      const access = await import('../../clinical-access-runtime.mjs');
      const pruned = access.prunePatientsOutsideClinicalScope?.() || 0;
      if (pruned > 0 && typeof access.refreshDesktopPatientListAfterScopePrune === 'function') {
        await access.refreshDesktopPatientListAfterScopePrune();
      }
    } catch {
      /* scope prune optional */
    }
  })();
  return sharedRuntime;
}

export function stopSharedNubeRuntime() {
  if (sharedRuntime) {
    sharedRuntime.stop();
    sharedRuntime = null;
  }
}

export function getSharedNubeRuntime() {
  return sharedRuntime;
}

export function getSharedNubeOutbox() {
  return sharedOutbox;
}

/**
 * @param {{
 *   getApi: () => ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   getCloudSyncRoomId: () => string,
 *   getCloudSyncToken: () => string,
 *   getCloudSyncRevision: () => number,
 *   setCloudSyncRevision: (revision: number) => void,
 *   onStatus: (status: string) => void,
 *   toast: (msg: string, kind?: string) => void,
 * }} deps
 */
export function createNubeRuntime(deps) {
  function stopRuntime() {
    stopSharedNubeRuntime();
  }

  function startRuntime() {
    startSharedNubeRuntime(deps);
  }

  return { startRuntime, stopRuntime };
}
