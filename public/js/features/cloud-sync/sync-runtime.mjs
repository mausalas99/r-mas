/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

import { createSyncRuntimeCycle } from './sync-runtime-cycle.mjs';

/** @type {ReturnType<typeof createSyncRuntimeCycle> | null} */
let _activeRuntime = null;

/**
 * @param {{
 *   api: ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   outbox: ReturnType<import('./outbox.mjs').createOutbox>,
 *   getRoomId: () => string,
 *   getRevision: () => number,
 *   setRevision: (revision: number) => void,
 *   onStatus?: (status: CloudSyncStatus, detail?: string) => void,
 *   applyPullResult?: (result: unknown) => void | Promise<void>,
 * }} deps
 */
export function startCloudSyncRuntime(deps) {
  if (_activeRuntime) {
    _activeRuntime.stop();
    _activeRuntime = null;
  }
  _activeRuntime = createSyncRuntimeCycle({
    ...deps,
    onStop(handle) {
      if (_activeRuntime === handle) _activeRuntime = null;
    },
  });
  return _activeRuntime;
}

/** Stop the global runtime (e.g. logout). */
export function stopCloudSyncRuntime() {
  if (_activeRuntime) {
    _activeRuntime.stop();
    _activeRuntime = null;
  }
}
