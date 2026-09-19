/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

import { createRoomSyncWs } from './room-sync-ws.mjs';
import { createCloudPollScheduler } from './sync-runtime-schedule.mjs';
import { cloudSyncErrorMessage } from './cloud-sync-error-text.mjs';
import { isCloudTransientServerError } from './cloud-sync-timing.mjs';
import { createPullPush, isCloudRevisionStaleError } from './sync-runtime-pull-push.mjs';
import {
  cloudSyncErrorCode,
  noteCloudSyncCycle,
  noteCloudSyncTransport,
  noteCloudSyncWsSignal,
  recordCloudSyncError,
  recordCloudSyncTrace,
} from './cloud-sync-diagnostics.mjs';

export { isCloudRevisionStaleError };

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
