/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

import { sanitizeOpsForCloudPush } from './cloud-op-slim.mjs';
import { createCloudPollScheduler } from './sync-runtime-schedule.mjs';
import { resolveCloudPushMutationId } from './push-mutation-id.mjs';
import {
  cloudSyncErrorCode,
  noteCloudSyncCycle,
  noteCloudSyncPull,
  noteCloudSyncPush,
  recordCloudSyncError,
  recordCloudSyncTrace,
} from './cloud-sync-diagnostics.mjs';

/**
 * Map browser/Electron network noise to a short Spanish hint for Conexión.
 * @param {string} raw
 * @returns {string}
 */
export function humanizeCloudSyncErrorMessage(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^failed to fetch$/i.test(s) || /networkerror when attempting to fetch/i.test(s)) {
    return 'Sin red hacia Nube. Revisa Wi‑Fi / VPN e inténtalo de nuevo.';
  }
  if (/load failed|network request failed/i.test(s)) {
    return 'No hubo respuesta de Nube. Revisa la conexión e inténtalo de nuevo.';
  }
  return s;
}

/**
 * @param {unknown} err
 * @param {string} fallback
 */
function errorMessage(err, fallback) {
  const data = err && typeof err === 'object' ? /** @type {{ data?: { message?: string }, message?: string }} */ (err) : null;
  const raw = String(data?.data?.message || data?.message || fallback).trim() || fallback;
  return humanizeCloudSyncErrorMessage(raw) || fallback;
}

/** Concurrent Nube writers; Worker returns 409 revision_stale / conflict. */
const PUSH_STALE_RETRIES = 3;

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isCloudRevisionStaleError(err) {
  const data = err && typeof err === 'object' ? /** @type {{ data?: { error?: string } }} */ (err) : null;
  const code = String(data?.data?.error || '').trim();
  return code === 'revision_stale' || code === 'conflict';
}

/**
 * @param {import('./outbox.mjs').createOutbox extends () => infer O ? O : never} outbox
 * @param {(status: CloudSyncStatus, detail?: string) => void} setStatus
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
 * @param {(status: CloudSyncStatus, detail?: string) => void} setStatus
 * @param {ReturnType<typeof createOutboxSync>} outboxSync
 * @param {{ markLocalWrite: () => void }} pace
 */
function createPullPush(deps, setStatus, outboxSync, pace) {
  const { api, outbox, getRoomId, getRevision, setRevision, applyPullResult } = deps;

  /** @param {number} revision */
  function applyServerRevision(revision) {
    const next = Number(revision);
    if (!Number.isFinite(next) || next <= 0) return;
    const current = Number(getRevision() ?? 0);
    if (next <= current) return;
    setRevision(next);
  }

  async function pullLatest() {
    const roomId = getRoomId();
    if (!roomId) return;
    const since = getRevision() ?? 0;
    const result = await api.pull(roomId, since);
    if (result?.revision != null) applyServerRevision(Number(result.revision));
    if (applyPullResult) await applyPullResult(result);
    noteCloudSyncPull();
    recordCloudSyncTrace('pull', {
      since,
      revision: result?.revision != null ? Number(result.revision) : null,
      opsCount: Array.isArray(result?.ops) ? result.ops.length : 0,
    });
  }

  return createPullPushOps({
    api,
    outbox,
    getRoomId,
    getRevision,
    setStatus,
    outboxSync,
    pace,
    pullLatest,
    applyServerRevision,
  });
}

/**
 * @param {object} ctx
 */
function createPullPushOps(ctx) {
  const {
    api,
    outbox,
    getRoomId,
    getRevision,
    setStatus,
    outboxSync,
    pace,
    pullLatest,
    applyServerRevision,
  } = ctx;

  /**
   * @param {string} roomId
   * @param {{ clientMutationId: string, baseRevision?: number, enqueuedAt?: number }} item
   * @param {unknown[]} ops
   */
  async function pushWithStaleRetry(roomId, item, ops) {
    let lastErr;
    for (let attempt = 0; attempt <= PUSH_STALE_RETRIES; attempt++) {
      try {
        return await api.push(roomId, {
          clientMutationId: resolveCloudPushMutationId(item),
          ops,
          baseRevision: getRevision() ?? item.baseRevision ?? 0,
        });
      } catch (err) {
        lastErr = err;
        if (!isCloudRevisionStaleError(err) || attempt >= PUSH_STALE_RETRIES) throw err;
        await pullLatest();
      }
    }
    throw lastErr;
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
      const sanitized = sanitizeOpsForCloudPush(item.ops);
      if (!sanitized.ops.length) {
        outbox.remove(item.clientMutationId);
        continue;
      }
      try {
        const result = await pushWithStaleRetry(roomId, item, sanitized.ops);
        outbox.remove(item.clientMutationId);
        pace.markLocalWrite();
        if (result?.revision != null) applyServerRevision(Number(result.revision));
        if (result?.needPull) await pullLatest();
        noteCloudSyncPush();
        recordCloudSyncTrace('push', {
          clientMutationId: item.clientMutationId,
          opCount: sanitized.ops.length,
          revision: result?.revision != null ? Number(result.revision) : null,
        });
      } catch (err) {
        const msg = errorMessage(err, 'No se pudo enviar un cambio a la nube.');
        recordCloudSyncError({
          op: 'push',
          code: cloudSyncErrorCode(err),
          message: msg,
        });
        setStatus('error', msg);
        throw err;
      }
    }
  }

  return { pullLatest, flushOutbox };
}

/**
 * @param {object} ctx
 */
function createSyncCycleController(ctx) {
  const {
    stopped,
    getRoomId,
    setStatus,
    outboxSync,
    flushOutbox,
    pullLatest,
    failCycle,
    getScheduler,
    cycleInflightRef,
  } = ctx;

  /** Push-only while hidden; always re-arms the poll timer. */
  async function runHiddenCycle() {
    const scheduler = getScheduler();
    if (outboxSync.pendingCount() > 0 && navigator.onLine) {
      try {
        setStatus('syncing');
        await flushOutbox();
        outboxSync.refreshIdleStatus();
        scheduler.noteSuccess();
        noteCloudSyncCycle(true);
      } catch (err) {
        failCycle(err);
      }
      return;
    }
    scheduler.armNextTimer(false);
  }

  async function runSyncCycleBody() {
    const scheduler = getScheduler();
    try {
      setStatus('syncing');
      await flushOutbox();
      await pullLatest();
      outboxSync.refreshIdleStatus();
      scheduler.noteSuccess();
      noteCloudSyncCycle(true);
    } catch (err) {
      failCycle(err);
    }
  }

  async function syncCycle() {
    const scheduler = getScheduler();
    if (stopped()) return;
    if (!getRoomId()) {
      scheduler.armNextTimer(false);
      return;
    }
    const hidden =
      typeof document !== 'undefined' && document.visibilityState !== 'visible';
    if (hidden) {
      await runHiddenCycle();
      return;
    }
    if (!navigator.onLine) {
      setStatus(outboxSync.pendingCount() > 0 ? 'pending' : 'offline');
      scheduler.armNextTimer(false);
      return;
    }
    if (cycleInflightRef.current) return cycleInflightRef.current;
    cycleInflightRef.current = runSyncCycleBody().finally(function () {
      cycleInflightRef.current = null;
    });
    return cycleInflightRef.current;
  }

  return { syncCycle };
}

/**
 * @param {object} ctx
 */
function attachSyncRuntimeListeners(ctx) {
  const { syncCycle, scheduler, pace, outboxSync } = ctx;

  function onOnline() { void syncCycle(); }
  function onVisibility() {
    if (document.visibilityState === 'visible') void syncCycle();
  }
  /** Electron often keeps visibility=visible while unfocused — still pull on focus. */
  function onWindowFocus() { void syncCycle(); }

  function noteLocalMutation() {
    pace.markLocalWrite();
    scheduler.armNextTimer(false);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibility);
  }
  outboxSync.refreshIdleStatus();
  void syncCycle();
  scheduler.armNextTimer(false);

  return {
    noteLocalMutation,
    detach() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('focus', onWindowFocus);
        document.removeEventListener('visibilitychange', onVisibility);
      }
    },
  };
}

/**
 * @param {{
 *   api: ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   outbox: ReturnType<import('./outbox.mjs').createOutbox>,
 *   getRoomId: () => string,
 *   getRevision: () => number,
 *   setRevision: (revision: number) => void,
 *   onStatus?: (status: CloudSyncStatus, detail?: string) => void,
 *   applyPullResult?: (result: unknown) => void | Promise<void>,
 *   onStop?: (handle: { stop: () => void }) => void,
 *   pollMobile?: boolean,
 * }} deps
 */
export function createSyncRuntimeCycle(deps) {
  const { outbox, getRoomId, onStatus } = deps;
  let stopped = false;
  const cycleInflightRef = { current: null };
  /** @type {CloudSyncStatus} */
  let currentStatus = 'idle';
  /** @type {string} */
  let lastDetail = '';
  let lastLocalWriteAt = 0;

  /** @param {CloudSyncStatus} status @param {string} [detail] */
  function setStatus(status, detail) {
    currentStatus = status;
    if (status === 'error') lastDetail = String(detail || lastDetail || '').trim();
    else if (status === 'idle' || status === 'syncing') lastDetail = '';
    else if (detail) lastDetail = String(detail).trim();
    onStatus?.(status, lastDetail || undefined);
  }

  const pace = { markLocalWrite() { lastLocalWriteAt = Date.now(); } };
  const outboxSync = createOutboxSync(outbox, setStatus);
  const { pullLatest, flushOutbox } = createPullPush(deps, setStatus, outboxSync, pace);

  /** @type {ReturnType<typeof createCloudPollScheduler>} */
  let scheduler;

  /** @param {unknown} err */
  function failCycle(err) {
    const rateLimited = scheduler.isRateLimitedError(err);
    const msg = rateLimited
      ? 'Nube ocupada (límite de peticiones). Reintento automático más lento.'
      : errorMessage(err, 'Error de sincronización con la nube.');
    if (!rateLimited) {
      recordCloudSyncError({
        op: 'cycle',
        code: cloudSyncErrorCode(err),
        message: msg,
      });
    } else {
      recordCloudSyncTrace('rate_limit', { message: msg });
    }
    setStatus('error', msg);
    scheduler.noteFailure(err);
    noteCloudSyncCycle(false);
  }

  const cycleController = createSyncCycleController({
    stopped: () => stopped,
    getRoomId,
    setStatus,
    outboxSync,
    flushOutbox,
    pullLatest,
    failCycle,
    getScheduler: () => scheduler,
    cycleInflightRef,
  });

  scheduler = createCloudPollScheduler({
    syncCycle: cycleController.syncCycle,
    pendingCount: outboxSync.pendingCount,
    getLastLocalWriteAt: function () { return lastLocalWriteAt; },
    pollMobile: deps.pollMobile,
  });

  const listeners = attachSyncRuntimeListeners({
    syncCycle: cycleController.syncCycle,
    scheduler,
    pace,
    outboxSync,
  });

  const handle = {
    getStatus: () => currentStatus,
    getDetail: () => lastDetail,
    flushOutbox,
    syncCycle: cycleController.syncCycle,
    noteLocalMutation: listeners.noteLocalMutation,
    stop() {
      stopped = true;
      scheduler.stop();
      listeners.detach();
      deps.onStop?.(handle);
    },
  };
  return handle;
}
