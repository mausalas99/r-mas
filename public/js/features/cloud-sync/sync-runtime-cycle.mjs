/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

/**
 * @param {import('./outbox.mjs').createOutbox extends () => infer O ? O : never} outbox
 * @param {(status: CloudSyncStatus) => void} setStatus
 */
function createOutboxSync(outbox, setStatus) {
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

  return { pendingCount, refreshIdleStatus };
}

/**
 * @param {object} deps
 * @param {(status: CloudSyncStatus) => void} setStatus
 * @param {ReturnType<typeof createOutboxSync>} outboxSync
 */
function createPullPush(deps, setStatus, outboxSync) {
  const { api, outbox, getRoomId, getRevision, setRevision, applyPullResult } = deps;

  async function pullLatest() {
    const roomId = getRoomId();
    if (!roomId) return;
    const since = getRevision() ?? 0;
    const result = await api.pull(roomId, since);
    if (result?.revision != null) setRevision(Number(result.revision));
    if (applyPullResult) await applyPullResult(result);
  }

  async function flushOutbox() {
    const roomId = getRoomId();
    if (!roomId) return;
    if (!navigator.onLine) {
      setStatus(outboxSync.pendingCount() > 0 ? 'pending' : 'offline');
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
        if (result?.revision != null) setRevision(Number(result.revision));
        if (result?.needPull) await pullLatest();
      } catch {
        setStatus('error');
        return;
      }
    }
  }

  return { pullLatest, flushOutbox };
}

/**
 * @param {{
 *   api: ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   outbox: ReturnType<import('./outbox.mjs').createOutbox>,
 *   getRoomId: () => string,
 *   getRevision: () => number,
 *   setRevision: (revision: number) => void,
 *   onStatus?: (status: CloudSyncStatus) => void,
 *   applyPullResult?: (result: unknown) => void | Promise<void>,
 *   onStop?: (handle: { stop: () => void }) => void,
 * }} deps
 */
export function createSyncRuntimeCycle(deps) {
  const { outbox, getRoomId, onStatus } = deps;
  /** @type {ReturnType<typeof setInterval> | null} */
  let intervalId = null;
  let stopped = false;
  let cycleInflight = null;
  /** @type {CloudSyncStatus} */
  let currentStatus = 'idle';

  /** @param {CloudSyncStatus} status */
  function setStatus(status) {
    currentStatus = status;
    onStatus?.(status);
  }

  const outboxSync = createOutboxSync(outbox, setStatus);
  const { pullLatest, flushOutbox } = createPullPush(deps, setStatus, outboxSync);

  async function syncCycle() {
    if (stopped) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (!getRoomId()) return;
    if (!navigator.onLine) {
      setStatus(outboxSync.pendingCount() > 0 ? 'pending' : 'offline');
      return;
    }
    if (cycleInflight) return cycleInflight;
    cycleInflight = (async () => {
      try {
        setStatus('syncing');
        await flushOutbox();
        await pullLatest();
        outboxSync.refreshIdleStatus();
      } catch {
        setStatus('error');
      } finally {
        cycleInflight = null;
      }
    })();
    return cycleInflight;
  }

  function onOnline() { void syncCycle(); }
  function onVisibility() {
    if (document.visibilityState === 'visible') void syncCycle();
  }

  intervalId = setInterval(() => void syncCycle(), 20_000);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
  }
  outboxSync.refreshIdleStatus();

  const handle = {
    getStatus: () => currentStatus,
    flushOutbox,
    syncCycle,
    stop() {
      stopped = true;
      if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
        document.removeEventListener('visibilitychange', onVisibility);
      }
      deps.onStop?.(handle);
    },
  };
  return handle;
}
