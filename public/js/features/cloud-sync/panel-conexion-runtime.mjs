import { startCloudSyncRuntime } from './sync-runtime.mjs';
import { createOutbox } from './outbox.mjs';
import { configureCloudMutateBridge } from './mutate-bridge.mjs';
import { applyCloudPullResult } from './pull-apply.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { getLanClientId } from '../lan/runtime.mjs';

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
  /** @type {ReturnType<typeof startCloudSyncRuntime> | null} */
  let runtime = null;

  function stopRuntime() {
    if (runtime) {
      runtime.stop();
      runtime = null;
    }
  }

  function startRuntime() {
    stopRuntime();
    const roomId = deps.getCloudSyncRoomId();
    if (!roomId || !deps.getCloudSyncToken()) return;
    const outbox = createOutbox();
    runtime = startCloudSyncRuntime({
      api: deps.getApi(),
      outbox,
      getRoomId: deps.getCloudSyncRoomId,
      getRevision: deps.getCloudSyncRevision,
      setRevision: deps.setCloudSyncRevision,
      onStatus: deps.onStatus,
      applyPullResult: async function (result) {
        try {
          await applyCloudPullResult(result);
        } catch {
          deps.toast('No se pudieron aplicar los cambios de la nube.', 'error');
        }
      },
    });
    configureCloudMutateBridge({
      outbox,
      getRevision: deps.getCloudSyncRevision,
      flush: function () { return runtime?.flushOutbox(); },
      getActorId: function () {
        return String(clinicalSessionContext.user?.user_id || getLanClientId() || 'local');
      },
    });
    void runtime.syncCycle();
  }

  return { startRuntime, stopRuntime };
}
