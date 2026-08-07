import { startCloudSyncRuntime, stopCloudSyncRuntime } from '../cloud-sync/sync-runtime.mjs';
import { createCloudSyncApi } from '../cloud-sync/api-client.mjs';
import { configureCloudMutateBridge } from '../cloud-sync/mutate-bridge.mjs';
import { applyCloudPullResult } from '../cloud-sync/pull-apply.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { createMemoryOutbox } from './outbox-memory.mjs';
import { filterOpsForCloudMobile } from './mutation-gate.mjs';
import {
  getCloudSyncUrl,
  getCloudSyncToken,
  getCloudSyncRoomId,
  getCloudSyncRevision,
  setCloudSyncRevision,
} from './session.mjs';

/** @type {ReturnType<typeof startCloudSyncRuntime> | null} */
let _runtime = null;

async function refreshCloudMobileCensusUi() {
  try {
    const access = await import('../../clinical-access-runtime.mjs');
    if (typeof access.finalizeMobileLanPatientCensus === 'function') {
      await access.finalizeMobileLanPatientCensus();
    }
  } catch {
    /* optional */
  }
}

/**
 * @param {{ onStatus?: (status: string, detail?: string) => void, toast?: (msg: string, kind?: string) => void }} deps
 */
export function startCloudMobileRuntime({ onStatus, toast }) {
  stopCloudMobileRuntime();
  const roomId = getCloudSyncRoomId();
  const token = getCloudSyncToken();
  if (!roomId || !token) return null;

  const api = createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken,
  });

  const outbox = createMemoryOutbox();
  const wrappedOutbox = {
    enqueue(item) {
      const ops = filterOpsForCloudMobile(item?.ops || []);
      if (!ops.length) return;
      outbox.enqueue({ ...item, ops });
    },
    list: outbox.list,
    remove: outbox.remove,
    clear: outbox.clear,
  };

  const runtime = startCloudSyncRuntime({
    api,
    outbox: wrappedOutbox,
    getRoomId: getCloudSyncRoomId,
    getRevision: getCloudSyncRevision,
    setRevision: setCloudSyncRevision,
    onStatus,
    pollMobile: true,
    applyPullResult: async (result) => {
      try {
        await applyCloudPullResult(result);
        await refreshCloudMobileCensusUi();
        try {
          const { showCloudMobileEmptyCensusBanner } = await import('./resolve-active-room.mjs');
          showCloudMobileEmptyCensusBanner();
          const patientsMod = await import('../patients.mjs');
          patientsMod.renderPatientList();
        } catch {
          /* optional */
        }
      } catch {
        toast?.('No se pudieron aplicar los cambios de la nube.', 'error');
      }
    },
    liveRoomWs: {
      getBaseUrl: getCloudSyncUrl,
      getToken: getCloudSyncToken,
    },
  });

  configureCloudMutateBridge({
    outbox: wrappedOutbox,
    getRevision: getCloudSyncRevision,
    noteEditing: () => runtime?.noteLocalMutation?.(),
    flush: () => {
      runtime?.noteLocalMutation?.();
      return runtime?.syncCycle();
    },
    getActorId: () =>
      String(
        clinicalSessionContext.user?.user_id ||
          clinicalSessionContext.user?.username ||
          'mobile'
      ),
  });

  void runtime.syncCycle();
  _runtime = runtime;
  return runtime;
}

export function stopCloudMobileRuntime() {
  stopCloudSyncRuntime();
  _runtime = null;
}
