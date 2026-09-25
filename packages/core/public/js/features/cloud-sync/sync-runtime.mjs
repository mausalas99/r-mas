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
 *   pollMobile?: boolean,
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

/**
 * Re-pull right away instead of waiting for the next scheduled poll (up to 90s).
 * For the one moment this matters: a room's decrypt key just loaded for the
 * first time on this device, racing the runtime's own first pull on connect —
 * without this nudge, whatever that first pull silently dropped as unreadable
 * ciphertext sits invisible until the next poll fires (see MISTAKES.md 2026-09-17).
 */
export function nudgeCloudSyncRuntime() {
  void _activeRuntime?.syncCycle();
}
