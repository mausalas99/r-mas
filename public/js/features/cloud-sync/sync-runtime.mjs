/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

const POLL_MS = 15_000;

/**
 * @param {{
 *   api: ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   outbox: ReturnType<import('./outbox.mjs').createOutbox>,
 *   getRoomId: () => string,
 *   getRevision: () => number,
 *   setRevision: (revision: number) => void,
 *   onStatus?: (status: CloudSyncStatus) => void,
 *   applyPullResult?: (result: unknown) => void | Promise<void>,
 * }} deps
 */
export function startCloudSyncRuntime({
  api,
  outbox,
  getRoomId,
  getRevision,
  setRevision,
  onStatus,
  applyPullResult,
}) {
  /** @type {ReturnType<typeof setInterval> | null} */
  let intervalId = null;
  /** @type {CloudSyncStatus} */
  let currentStatus = 'idle';
  let stopped = false;

  /** @param {CloudSyncStatus} status */
  function setStatus(status) {
    currentStatus = status;
    onStatus?.(status);
  }

  function pendingCount() {
    return outbox.list().length;
  }

  function refreshIdleStatus() {
    if (!navigator.onLine) {
      setStatus(pendingCount() > 0 ? 'pending' : 'offline');
      return;
    }
    setStatus(pendingCount() > 0 ? 'pending' : 'idle');
  }

  async function pullLatest() {
    const roomId = getRoomId();
    if (!roomId) return;

    const since = getRevision() ?? 0;
    const result = await api.pull(roomId, since);
    if (result?.revision != null) {
      setRevision(Number(result.revision));
    }
    if (applyPullResult) {
      await applyPullResult(result);
    }
  }

  async function flushOutbox() {
    const roomId = getRoomId();
    if (!roomId) return;

    if (!navigator.onLine) {
      setStatus(pendingCount() > 0 ? 'pending' : 'offline');
      return;
    }

    const pending = outbox.list();
    if (pending.length === 0) return;

    setStatus('syncing');

    for (const item of pending) {
      try {
        const result = await api.push(roomId, {
          clientMutationId: item.clientMutationId,
          ops: item.ops,
          baseRevision: item.baseRevision ?? getRevision(),
        });
        outbox.remove(item.clientMutationId);
        if (result?.revision != null) {
          setRevision(Number(result.revision));
        }
        if (result?.needPull) {
          await pullLatest();
        }
      } catch {
        setStatus('error');
        return;
      }
    }
  }

  async function syncCycle() {
    if (stopped) return;
    if (document.visibilityState !== 'visible') return;

    const roomId = getRoomId();
    if (!roomId) return;

    if (!navigator.onLine) {
      setStatus(pendingCount() > 0 ? 'pending' : 'offline');
      return;
    }

    try {
      setStatus('syncing');
      await flushOutbox();
      await pullLatest();
      refreshIdleStatus();
    } catch {
      setStatus('error');
    }
  }

  function onOnline() {
    syncCycle();
  }

  intervalId = setInterval(syncCycle, POLL_MS);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
  }

  refreshIdleStatus();

  return {
    getStatus: () => currentStatus,
    flushOutbox,
    syncCycle,
    stop() {
      stopped = true;
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
      }
    },
  };
}
