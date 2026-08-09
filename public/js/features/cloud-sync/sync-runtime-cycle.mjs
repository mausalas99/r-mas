/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

import { sanitizeOpsForCloudPush } from './cloud-op-slim.mjs';
import { chunkCloudOps } from './cloud-push-direct.mjs';
import { createRoomSyncWs } from './room-sync-ws.mjs';
import { createCloudPollScheduler } from './sync-runtime-schedule.mjs';
import { resolveCloudPushMutationId } from './push-mutation-id.mjs';
import { cloudSyncErrorMessage } from './cloud-sync-error-text.mjs';
import { isCloudTransientServerError } from './cloud-sync-timing.mjs';
import {
  noteCloudLabSidecarsFromPullResult,
  noteCloudLabSidecarOpsPushed,
} from './cloud-lab-sidecar-index.mjs';
import { drainSyncedLabSidecarsFromOutbox, splitLabBackfillInOutbox } from './outbox-lab.mjs';
import {
  cloudSyncErrorCode,
  noteCloudSyncCycle,
  noteCloudSyncPull,
  noteCloudSyncPush,
  noteCloudSyncTransport,
  noteCloudSyncWsSignal,
  recordCloudSyncError,
  recordCloudSyncTrace,
} from './cloud-sync-diagnostics.mjs';

/** Concurrent Nube writers; Worker returns 409 revision_stale / conflict. */
const PUSH_STALE_RETRIES = 3;
/** Transient 502/503/504 from saturated Worker / D1. */
const PUSH_TRANSIENT_RETRIES = 3;
const PUSH_TRANSIENT_DELAY_MS = 2000;

/**
 * @param {number} ms
 */
function delayMs(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

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
  const { api, outbox, getRoomId, getRevision, setRevision, applyPullResult, pollMobile } = deps;

  /** @param {number} revision */
  function applyServerRevision(revision) {
    const next = Number(revision);
    if (!Number.isFinite(next) || next <= 0) return;
    const current = Number(getRevision() ?? 0);
    if (next <= current) return;
    setRevision(next);
  }

  /** @param {number} revision @param {number} since @param {number} opsCount */
  function reconcileServerRevision(revision, since, opsCount) {
    const next = Number(revision);
    if (!Number.isFinite(next) || next <= 0) return;
    const sinceNum = Number(since) || 0;
    if (opsCount === 0 && sinceNum >= next) {
      setRevision(next);
      return;
    }
    applyServerRevision(next);
  }

  async function pullLatest() {
    const roomId = getRoomId();
    if (!roomId) return;
    if (!api || typeof api.pull !== 'function') {
      throw new Error('Cliente Nube no configurado');
    }
    const since = getRevision() ?? 0;
    const result = await api.pull(roomId, since, pollMobile ? { mobile: true } : undefined);
    const opsCount = Array.isArray(result?.ops) ? result.ops.length : 0;
    if (result?.revision != null) {
      reconcileServerRevision(Number(result.revision), since, opsCount);
    }
    let labIngress = null;
    if (pollMobile) {
      try {
        const labDiag = await import('../cloud-mobile/lab-sync-diagnostics.mjs');
        const raw = result?.state ? labDiag.countLabSidecarsInState(result.state) : { patients: 0, sets: 0 };
        const labOpsInPayload = labDiag.countLabOpsInPullResult(result);
        labIngress = {
          needSnapshot: !!result?.needSnapshot,
          revision: result?.revision != null ? Number(result.revision) : null,
          opsCount: Array.isArray(result?.ops) ? result.ops.length : 0,
          labOpsInPayload: labOpsInPayload,
          rawSidecars: raw,
          filteredSidecars: raw,
        };
        labDiag.recordLabPullIngress(labIngress);
      } catch {
        /* optional */
      }
    }
    if (applyPullResult) await applyPullResult(result);
    noteCloudLabSidecarsFromPullResult(result);
    drainSyncedLabSidecarsFromOutbox(outbox);
    outboxSync.refreshIdleStatus();
    noteCloudSyncPull();
    recordCloudSyncTrace('pull', {
      since,
      revision: result?.revision != null ? Number(result.revision) : null,
      opsCount: Array.isArray(result?.ops) ? result.ops.length : 0,
      labOpsInPayload: labIngress?.labOpsInPayload ?? null,
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
   * @param {number} [chunkIndex]
   */
  async function pushSingleWithStaleRetry(roomId, item, ops, chunkIndex) {
    if (!api || typeof api.push !== 'function') {
      throw new Error('Cliente Nube no configurado');
    }
    const suffix = chunkIndex != null ? `:c${chunkIndex}` : '';
    let lastErr;
    let transientAttempts = 0;
    for (let attempt = 0; attempt <= PUSH_STALE_RETRIES; attempt++) {
      try {
        return await api.push(roomId, {
          clientMutationId: `${resolveCloudPushMutationId(item)}${suffix}`,
          ops,
          baseRevision: getRevision() ?? item.baseRevision ?? 0,
        });
      } catch (err) {
        lastErr = err;
        if (
          isCloudTransientServerError(err) &&
          transientAttempts < PUSH_TRANSIENT_RETRIES
        ) {
          transientAttempts += 1;
          await delayMs(PUSH_TRANSIENT_DELAY_MS * transientAttempts);
          continue;
        }
        if (!isCloudRevisionStaleError(err) || attempt >= PUSH_STALE_RETRIES) throw err;
        await pullLatest();
      }
    }
    throw lastErr;
  }

  /**
   * @param {string} roomId
   * @param {{ clientMutationId: string, baseRevision?: number, enqueuedAt?: number }} item
   * @param {unknown[]} ops
   */
  async function pushWithStaleRetry(roomId, item, ops) {
    const chunks = chunkCloudOps(ops);
    if (!chunks.length) return null;
    let lastResult = null;
    for (let i = 0; i < chunks.length; i += 1) {
      const sanitized = sanitizeOpsForCloudPush(chunks[i]);
      if (!sanitized.ops.length) continue;
      const chunkItem = {
        clientMutationId: item.clientMutationId,
        enqueuedAt: (item.enqueuedAt || Date.now()) + i,
        baseRevision: item.baseRevision,
      };
      lastResult = await pushSingleWithStaleRetry(
        roomId,
        chunkItem,
        sanitized.ops,
        chunks.length > 1 ? i : undefined,
      );
      if (lastResult?.revision != null) applyServerRevision(Number(lastResult.revision));
      noteCloudLabSidecarOpsPushed(sanitized.ops);
      if (lastResult?.needPull) await pullLatest();
    }
    return lastResult;
  }

  async function flushOutbox() {
    const roomId = getRoomId();
    if (!roomId) return;
    if (!navigator.onLine) {
      setStatus(outboxSync.pendingCount() > 0 ? 'pending' : 'offline');
      return;
    }
    splitLabBackfillInOutbox(outbox);
    const pending = outbox.list();
    if (pending.length === 0) return;
    setStatus('syncing');
    for (const item of pending) {
      const sanitized = sanitizeOpsForCloudPush(item.ops);
      if (sanitized.dropped > 0) {
        recordCloudSyncTrace('push_drop', {
          clientMutationId: item.clientMutationId,
          dropped: sanitized.dropped,
        });
      }
      if (!sanitized.ops.length) {
        outbox.remove(item.clientMutationId);
        continue;
      }
      try {
        const result = await pushWithStaleRetry(roomId, item, sanitized.ops);
        outbox.remove(item.clientMutationId);
        noteCloudLabSidecarOpsPushed(sanitized.ops);
        pace.markLocalWrite();
        if (result?.revision != null) applyServerRevision(Number(result.revision));
        noteCloudSyncPush();
        recordCloudSyncTrace('push', {
          clientMutationId: item.clientMutationId,
          opCount: sanitized.ops.length,
          revision: result?.revision != null ? Number(result.revision) : null,
        });
      } catch (err) {
        drainSyncedLabSidecarsFromOutbox(outbox);
        const stillPending = outbox.list().some(function (row) {
          return String(row?.clientMutationId || '') === String(item.clientMutationId || '');
        });
        if (!stillPending) continue;
        const msg = cloudSyncErrorMessage(err, 'No se pudo enviar un cambio a la nube.');
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
      const pending = outboxSync.pendingCount() > 0;
      if (pending) {
        await flushOutbox();
        await pullLatest();
      } else {
        await pullLatest();
        await flushOutbox();
      }
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
 * @param {{ deferBootCycle?: boolean }} [opts]
 */
function attachSyncRuntimeListeners(ctx, opts = {}) {
  const { syncCycle, scheduler, pace, outboxSync, roomWs, setStatus, getCurrentStatus } = ctx;

  function onOnline() { void syncCycle(); }
  function onVisibility() {
    if (document.visibilityState === 'visible') {
      roomWs?.resume?.();
      void syncCycle();
    } else {
      roomWs?.pause?.();
    }
  }
  /** Electron often keeps visibility=visible while unfocused — still pull on focus. */
  function onWindowFocus() { void syncCycle(); }

  function noteLocalMutation() {
    pace.markLocalWrite();
    if (outboxSync.pendingCount() > 0 && getCurrentStatus() === 'idle') {
      setStatus('pending');
    }
    scheduler.armNextTimer(false);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibility);
  }
  outboxSync.refreshIdleStatus();
  if (!opts.deferBootCycle) {
    void syncCycle();
  }
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
 * @param {() => ReturnType<typeof createCloudPollScheduler>} getScheduler
 * @param {(status: CloudSyncStatus, detail?: string) => void} setStatus
 */
function createSyncFailCycle(getScheduler, setStatus, pendingCount) {
  return function failCycle(err) {
    const scheduler = getScheduler();
    const transient = isCloudTransientServerError(err);
    const rate429 = Number(err && typeof err === 'object' ? err.status : 0) === 429;
    const msg = rate429
      ? 'Nube ocupada (límite de peticiones). Reintento automático más lento.'
      : transient
        ? 'Servidor Nube saturado. Reintento automático en breve.'
        : cloudSyncErrorMessage(err, 'Error de sincronización con la nube.');
    const backoff = transient || rate429 || scheduler.isRateLimitedError(err);
    if (backoff) {
      recordCloudSyncTrace('rate_limit', { message: msg });
    } else {
      recordCloudSyncError({
        op: 'cycle',
        code: cloudSyncErrorCode(err),
        message: msg,
      });
    }
    if (transient && pendingCount() === 0) {
      setStatus('idle');
    } else {
      setStatus('error', msg);
    }
    scheduler.noteFailure(err);
    noteCloudSyncCycle(false);
  };
}

/**
 * @param {object} deps
 * @param {object} ctx
 */
function startLiveRoomSyncWs(deps, ctx) {
  if (!deps.liveRoomWs) return null;
  const roomWs = createRoomSyncWs({
    getBaseUrl: deps.liveRoomWs.getBaseUrl,
    getToken: deps.liveRoomWs.getToken,
    getRoomId: ctx.getRoomId,
    getRevision: deps.getRevision,
    onRevisionHint: function (revision) {
      noteCloudSyncWsSignal(revision);
      const local = Number(deps.getRevision() ?? 0);
      if (revision > local) void ctx.syncCycle();
      ctx.scheduler.armNextTimer(false);
    },
    onTransportChange: function (transport) {
      noteCloudSyncTransport(transport);
      ctx.scheduler.armNextTimer(false);
      ctx.onStatus?.(ctx.getCurrentStatus(), ctx.getLastDetail() || undefined);
    },
  });
  roomWs.start();
  return roomWs;
}

/**
 * @param {object} args
 */
function buildSyncRuntimeHandle(args) {
  const {
    deps,
    stoppedRef,
    getCurrentStatus,
    getLastDetail,
    flushOutbox,
    syncCycle,
    noteLocalMutation,
    roomWs,
    scheduler,
    listeners,
  } = args;
  const handle = {
    getStatus: getCurrentStatus,
    getDetail: getLastDetail,
    getTransportState: function () {
      return roomWs?.getTransportState() ?? 'poll';
    },
    flushOutbox,
    syncCycle,
    noteLocalMutation,
    stop() {
      stoppedRef.stopped = true;
      roomWs?.stop();
      scheduler.stop();
      listeners.detach();
      deps.onStop?.(handle);
    },
  };
  return handle;
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
 *   liveRoomWs?: { getBaseUrl: () => string, getToken: () => string },
 *   deferBootCycle?: boolean,
 * }} deps
 */
export function createSyncRuntimeCycle(deps) {
  const { outbox, getRoomId, onStatus } = deps;
  const stoppedRef = { stopped: false };
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

  const failCycle = createSyncFailCycle(
    () => scheduler,
    setStatus,
    outboxSync.pendingCount
  );

  const cycleController = createSyncCycleController({
    stopped: () => stoppedRef.stopped,
    getRoomId,
    setStatus,
    outboxSync,
    flushOutbox,
    pullLatest,
    failCycle,
    getScheduler: () => scheduler,
    cycleInflightRef,
  });

  /** @type {ReturnType<typeof createRoomSyncWs> | null} */
  let roomWs = null;

  scheduler = createCloudPollScheduler({
    syncCycle: cycleController.syncCycle,
    pendingCount: outboxSync.pendingCount,
    getLastLocalWriteAt: function () { return lastLocalWriteAt; },
    pollMobile: deps.pollMobile,
    getTransportState: function () {
      if (roomWs) return roomWs.getTransportState();
      return typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'poll';
    },
  });

  roomWs = startLiveRoomSyncWs(deps, {
    getRoomId,
    syncCycle: cycleController.syncCycle,
    scheduler,
    onStatus,
    getCurrentStatus: () => currentStatus,
    getLastDetail: () => lastDetail,
  });

  const listeners = attachSyncRuntimeListeners(
    {
      syncCycle: cycleController.syncCycle,
      scheduler,
      pace,
      outboxSync,
      roomWs,
      setStatus,
      getCurrentStatus: () => currentStatus,
    },
    { deferBootCycle: deps.deferBootCycle }
  );

  return buildSyncRuntimeHandle({
    deps,
    stoppedRef,
    getCurrentStatus: () => currentStatus,
    getLastDetail: () => lastDetail,
    flushOutbox,
    syncCycle: cycleController.syncCycle,
    noteLocalMutation: listeners.noteLocalMutation,
    roomWs,
    scheduler,
    listeners,
  });
}
