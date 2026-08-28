import {
  chunkCloudOps,
  resolveCloudPushMutationId
} from "/mobile/js/chunks/chunk-7GCA7ASC.js";
import {
  applyLanPatientEntries
} from "/mobile/js/chunks/chunk-UVD5THI4.js";
import {
  removePatientLocally
} from "/mobile/js/chunks/chunk-QSGPRYI4.js";
import {
  showConfirmDialog
} from "/mobile/js/chunks/chunk-CBI7THZ4.js";
import {
  pruneOrphanTodos
} from "/mobile/js/chunks/chunk-4BZ6YQL3.js";
import {
  isClinicalScopeReadyForPatientApply,
  shouldEnforceTeamPatientMirror
} from "/mobile/js/chunks/chunk-6J2G5HNR.js";
import {
  drainSyncedLabSidecarsFromOutbox,
  resolveCloudActorId,
  splitLabBackfillInOutbox
} from "/mobile/js/chunks/chunk-WJVW5GRE.js";
import {
  cloudSyncErrorCode,
  cloudSyncErrorMessage,
  noteCloudSyncCycle,
  noteCloudSyncPull,
  noteCloudSyncPush,
  noteCloudSyncTransport,
  noteCloudSyncWsLifecycle,
  noteCloudSyncWsSignal,
  recordCloudSyncError,
  recordCloudSyncTrace
} from "/mobile/js/chunks/chunk-LF5B36KU.js";
import {
  getLabHistory,
  getSyncablePatients,
  persistClinicalState,
  scheduleIdleClinicalPersist
} from "/mobile/js/chunks/chunk-2LHILGVA.js";
import {
  storage
} from "/mobile/js/chunks/chunk-SJBIJKX4.js";
import {
  isCloudBackoffError,
  isCloudTransientServerError,
  nextCloudPollDelayMs,
  retryAfterMsFromError
} from "/mobile/js/chunks/chunk-6CYAI7OE.js";
import {
  cloudStateToLanEntries,
  createOpFold,
  foldCloudOp,
  noteCloudLabSidecarOpsSent,
  noteCloudLabSidecarsFromPullResult,
  opFoldToLanEntries,
  sanitizeOpsForCloudPush
} from "/mobile/js/chunks/chunk-4ALI7FVW.js";
import {
  buildLiveSyncPatientIdMap,
  bumpLabHistoryRevision,
  remapAgendaPatientIds,
  resolveCloudTodoLocalPatientId
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

// public/js/features/cloud-sync/room-sync-ws-internals.mjs
var RECONNECT_MIN_MS = 1e3;
var RECONNECT_MAX_MS = 3e4;
var SIGNAL_DEBOUNCE_MS = 300;
function buildRoomLiveWsUrl(deps) {
  const base = String(deps.getBaseUrl() || "").replace(/\/$/, "").replace(/^http/i, "ws");
  const roomId = String(deps.getRoomId() || "").trim();
  const token = String(deps.getToken() || "").trim();
  if (!base || !roomId || !token) return "";
  const revision = Number(deps.getRevision() || 0);
  const q = new URLSearchParams({
    access_token: token,
    revision: String(Number.isFinite(revision) ? revision : 0)
  });
  return `${base}/api/sync/v1/rooms/${encodeURIComponent(roomId)}/live?${q}`;
}
function createRoomWsSignalQueue(deps) {
  let signalTimer = null;
  let pendingRevision = 0;
  function flushSignal() {
    signalTimer = null;
    const rev = pendingRevision;
    pendingRevision = 0;
    if (!rev) return;
    const local = Number(deps.getRevision() || 0);
    if (rev > local) deps.onRevisionHint?.(rev);
  }
  function queueRevisionSignal(revision) {
    const rev = Number(revision);
    if (!Number.isFinite(rev) || rev <= 0) return;
    pendingRevision = Math.max(pendingRevision, rev);
    if (signalTimer) return;
    signalTimer = setTimeout(flushSignal, SIGNAL_DEBOUNCE_MS);
  }
  function handleMessage(raw) {
    try {
      const msg = JSON.parse(String(raw));
      const type = String(msg?.type || "");
      const rev = Number(msg?.revision);
      if (!Number.isFinite(rev) || rev <= 0) return;
      if (type === "revision") {
        queueRevisionSignal(rev);
        return;
      }
      if (type === "hello") {
        const local = Number(deps.getRevision() || 0);
        if (rev > local) queueRevisionSignal(rev);
      }
    } catch {
    }
  }
  function clear() {
    if (signalTimer) {
      clearTimeout(signalTimer);
      signalTimer = null;
    }
    pendingRevision = 0;
  }
  return { handleMessage, clear };
}
function wireRoomLiveSocket(ctx, url) {
  const redactedUrl = url.replace(/access_token=[^&]+/, "access_token=***");
  try {
    ctx.wsRef.current = new WebSocket(url);
    noteCloudSyncWsLifecycle({ url: redactedUrl });
  } catch (err) {
    noteCloudSyncWsLifecycle({
      url,
      message: err && typeof err === "object" ? String(err.message || err) : "WebSocket constructor failed"
    });
    ctx.scheduleReconnect();
    return;
  }
  const ws = ctx.wsRef.current;
  ws.onopen = function() {
    ctx.onOpen();
    noteCloudSyncWsLifecycle({ url: redactedUrl, open: true });
  };
  ws.onmessage = function(ev) {
    ctx.signal.handleMessage(ev.data);
  };
  ws.onclose = function(ev) {
    ctx.wsRef.current = null;
    noteCloudSyncWsLifecycle({
      code: ev?.code,
      reason: String(ev?.reason || "")
    });
    ctx.scheduleReconnect();
  };
  ws.onerror = function() {
    noteCloudSyncWsLifecycle({ message: "WebSocket error" });
  };
}
function readRoomWsTransportState(transport) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  return transport;
}
function roomWsClearReconnect(state) {
  if (state.reconnectTimer.current != null) {
    clearTimeout(state.reconnectTimer.current);
    state.reconnectTimer.current = null;
  }
}
function roomWsCloseSocket(state) {
  if (!state.wsRef.current) return;
  try {
    state.wsRef.current.close();
  } catch {
  }
  state.wsRef.current = null;
}
function roomWsConnect(state, deps) {
  if (state.stopped.current || typeof WebSocket === "undefined") return;
  const url = buildRoomLiveWsUrl(deps);
  if (!url) return;
  roomWsCloseSocket(state);
  wireRoomLiveSocket(
    {
      wsRef: state.wsRef,
      signal: state.signal,
      scheduleReconnect: function() {
        roomWsScheduleReconnect(state, deps);
      },
      onOpen: function() {
        state.reconnectDelay.current = RECONNECT_MIN_MS;
        state.setTransport("ws");
      }
    },
    url
  );
}
function roomWsScheduleReconnect(state, deps) {
  if (state.stopped.current) return;
  state.setTransport("poll");
  roomWsClearReconnect(state);
  state.reconnectTimer.current = setTimeout(function() {
    state.reconnectTimer.current = null;
    roomWsConnect(state, deps);
  }, state.reconnectDelay.current);
  state.reconnectDelay.current = Math.min(
    RECONNECT_MAX_MS,
    Math.floor(state.reconnectDelay.current * 1.5)
  );
}
function createRoomWsController(deps) {
  const wsRef = { current: (
    /** @type {WebSocket | null} */
    null
  ) };
  const reconnectTimer = { current: (
    /** @type {ReturnType<typeof setTimeout> | null} */
    null
  ) };
  const stopped = { current: false };
  const reconnectDelay = { current: RECONNECT_MIN_MS };
  const transport = { current: (
    /** @type {CloudSyncTransport} */
    "poll"
  ) };
  const signal = createRoomWsSignalQueue(deps);
  function setTransport(next) {
    if (transport.current === next) return;
    transport.current = next;
    deps.onTransportChange?.(next);
  }
  const state = {
    wsRef,
    reconnectTimer,
    stopped,
    reconnectDelay,
    transport,
    signal,
    setTransport
  };
  function getTransportState() {
    return readRoomWsTransportState(transport.current);
  }
  function armConnect() {
    reconnectDelay.current = RECONNECT_MIN_MS;
    roomWsConnect(state, deps);
  }
  function haltSocket(clearSignal) {
    roomWsClearReconnect(state);
    if (clearSignal) signal.clear();
    roomWsCloseSocket(state);
    setTransport("poll");
  }
  return {
    start() {
      stopped.current = false;
      armConnect();
    },
    stop() {
      stopped.current = true;
      haltSocket(true);
    },
    pause() {
      haltSocket(false);
    },
    resume() {
      if (!stopped.current) armConnect();
    },
    getTransportState
  };
}

// public/js/features/cloud-sync/room-sync-ws.mjs
function createRoomSyncWs(deps) {
  return createRoomWsController(deps);
}

// public/js/features/cloud-sync/sync-runtime-schedule.mjs
function createCloudPollScheduler(deps) {
  let timerId = null;
  let stopped = false;
  let errorStreak = 0;
  let forcedDelayMs = null;
  function clearTimer() {
    if (timerId != null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }
  function scheduleNext(delayMs2) {
    if (stopped) return;
    clearTimer();
    timerId = setTimeout(function() {
      timerId = null;
      void deps.syncCycle();
    }, delayMs2);
  }
  function armNextTimer(errored) {
    const delay = forcedDelayMs != null ? forcedDelayMs : nextCloudPollDelayMs({
      pending: deps.pendingCount() > 0,
      errored,
      errorStreak,
      lastLocalWriteAt: deps.getLastLocalWriteAt(),
      mobile: deps.pollMobile,
      transport: deps.getTransportState?.() ?? "poll"
    });
    forcedDelayMs = null;
    scheduleNext(delay);
  }
  function noteSuccess() {
    errorStreak = 0;
    armNextTimer(false);
  }
  function noteFailure(err) {
    errorStreak += 1;
    if (isCloudBackoffError(err)) {
      forcedDelayMs = retryAfterMsFromError(err);
    }
    armNextTimer(true);
  }
  function stop() {
    stopped = true;
    clearTimer();
  }
  return {
    armNextTimer,
    noteSuccess,
    noteFailure,
    stop,
    isRateLimitedError: isCloudBackoffError
  };
}

// public/js/features/cloud-sync/sync-runtime-pull-push.mjs
var PUSH_STALE_RETRIES = 3;
var PUSH_TRANSIENT_RETRIES = 3;
var PUSH_TRANSIENT_DELAY_MS = 2e3;
function delayMs(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}
function isCloudRevisionStaleError(err) {
  const data = err && typeof err === "object" ? (
    /** @type {{ data?: { error?: string } }} */
    err
  ) : null;
  const code = String(data?.data?.error || "").trim();
  return code === "revision_stale" || code === "conflict";
}
function createPullPush(deps, setStatus, outboxSync, pace) {
  const { api, outbox, getRoomId, getRevision, setRevision, applyPullResult, pollMobile } = deps;
  const applyServerRevision = (revision) => applyServerRevisionImpl(getRevision, setRevision, revision);
  const pullLatest = () => runPullLatest({
    api,
    outbox,
    getRoomId,
    getRevision,
    setRevision,
    applyPullResult,
    pollMobile,
    outboxSync,
    applyServerRevision
  });
  return createPullPushOps({
    api,
    outbox,
    getRoomId,
    getRevision,
    setStatus,
    outboxSync,
    pace,
    pullLatest,
    applyServerRevision
  });
}
function applyServerRevisionImpl(getRevision, setRevision, revision) {
  const next = Number(revision);
  if (!Number.isFinite(next) || next <= 0) return;
  const current = Number(getRevision() ?? 0);
  if (next <= current) return;
  setRevision(next);
}
function reconcileServerRevision(pctx, revision, since, opsCount) {
  const next = Number(revision);
  if (!Number.isFinite(next) || next <= 0) return;
  const sinceNum = Number(since) || 0;
  if (opsCount === 0 && sinceNum >= next) {
    pctx.setRevision(next);
    return;
  }
  pctx.applyServerRevision(next);
}
async function recordLabPullIngress(result) {
  try {
    const labDiag = await import("/mobile/js/chunks/lab-sync-diagnostics-2NA4QEXB.js");
    const raw = result?.state ? labDiag.countLabSidecarsInState(result.state) : { patients: 0, sets: 0 };
    const labOpsInPayload = labDiag.countLabOpsInPullResult(result);
    const labIngress = {
      needSnapshot: !!result?.needSnapshot,
      revision: result?.revision != null ? Number(result.revision) : null,
      opsCount: Array.isArray(result?.ops) ? result.ops.length : 0,
      labOpsInPayload,
      rawSidecars: raw,
      filteredSidecars: raw
    };
    labDiag.recordLabPullIngress(labIngress);
    return labIngress;
  } catch {
    return null;
  }
}
function pullOpsCount(result) {
  return Array.isArray(result?.ops) ? result.ops.length : 0;
}
async function finalizePull(pctx, result, since, opsCount, labIngress) {
  const { applyPullResult, outbox, outboxSync } = pctx;
  if (applyPullResult) await applyPullResult(result);
  noteCloudLabSidecarsFromPullResult(result);
  drainSyncedLabSidecarsFromOutbox(outbox);
  outboxSync.refreshIdleStatus();
  noteCloudSyncPull();
  recordCloudSyncTrace("pull", {
    since,
    revision: result?.revision != null ? Number(result.revision) : null,
    opsCount,
    labOpsInPayload: labIngress?.labOpsInPayload ?? null
  });
}
async function runPullLatest(pctx) {
  const { api, getRoomId, getRevision, pollMobile } = pctx;
  const roomId = getRoomId();
  if (!roomId) return;
  if (!api || typeof api.pull !== "function") {
    throw new Error("Cliente Nube no configurado");
  }
  const since = getRevision() ?? 0;
  const result = await api.pull(roomId, since, pollMobile ? { mobile: true } : void 0);
  const opsCount = pullOpsCount(result);
  if (result?.revision != null) {
    reconcileServerRevision(pctx, Number(result.revision), since, opsCount);
  }
  const labIngress = pollMobile ? await recordLabPullIngress(result) : null;
  await finalizePull(pctx, result, since, opsCount, labIngress);
}
function createPullPushOps(ctx) {
  async function flushOutbox() {
    return runFlushOutbox(ctx);
  }
  return { pullLatest: ctx.pullLatest, flushOutbox };
}
async function pushSingleWithStaleRetry(ctx, roomId, item, ops, chunkIndex) {
  const { api, getRevision, pullLatest } = ctx;
  if (!api || typeof api.push !== "function") {
    throw new Error("Cliente Nube no configurado");
  }
  const suffix = chunkIndex != null ? `:c${chunkIndex}` : "";
  let lastErr;
  let transientAttempts = 0;
  for (let attempt = 0; attempt <= PUSH_STALE_RETRIES; attempt++) {
    try {
      return await api.push(roomId, {
        clientMutationId: `${resolveCloudPushMutationId(item)}${suffix}`,
        ops,
        baseRevision: getRevision() ?? item.baseRevision ?? 0
      });
    } catch (err) {
      lastErr = err;
      if (isCloudTransientServerError(err) && transientAttempts < PUSH_TRANSIENT_RETRIES) {
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
async function pushWithStaleRetry(ctx, roomId, item, ops) {
  const { applyServerRevision, pullLatest } = ctx;
  const chunks = chunkCloudOps(ops);
  if (!chunks.length) return null;
  let lastResult = null;
  for (let i = 0; i < chunks.length; i += 1) {
    const sanitized = sanitizeOpsForCloudPush(chunks[i]);
    if (!sanitized.ops.length) continue;
    const chunkItem = {
      clientMutationId: item.clientMutationId,
      enqueuedAt: (item.enqueuedAt || Date.now()) + i,
      baseRevision: item.baseRevision
    };
    lastResult = await pushSingleWithStaleRetry(
      ctx,
      roomId,
      chunkItem,
      sanitized.ops,
      chunks.length > 1 ? i : void 0
    );
    if (lastResult?.revision != null) applyServerRevision(Number(lastResult.revision));
    noteCloudLabSidecarOpsSent(chunks[i], sanitized.ops);
    if (lastResult?.needPull) await pullLatest();
  }
  return lastResult;
}
async function flushOutboxItem(ctx, roomId, item) {
  const { outbox, pace, applyServerRevision } = ctx;
  const sanitized = sanitizeOpsForCloudPush(item.ops);
  if (sanitized.dropped > 0) {
    recordCloudSyncTrace("push_drop", {
      clientMutationId: item.clientMutationId,
      dropped: sanitized.dropped
    });
  }
  if (!sanitized.ops.length) {
    outbox.remove(item.clientMutationId);
    return null;
  }
  try {
    const result = await pushWithStaleRetry(ctx, roomId, item, sanitized.ops);
    outbox.remove(item.clientMutationId);
    noteCloudLabSidecarOpsSent(item.ops, sanitized.ops);
    pace.markLocalWrite();
    if (result?.revision != null) applyServerRevision(Number(result.revision));
    noteCloudSyncPush();
    recordCloudSyncTrace("push", {
      clientMutationId: item.clientMutationId,
      opCount: sanitized.ops.length,
      revision: result?.revision != null ? Number(result.revision) : null
    });
    return null;
  } catch (err) {
    drainSyncedLabSidecarsFromOutbox(outbox);
    const stillPending = outbox.list().some(function(row) {
      return String(row?.clientMutationId || "") === String(item.clientMutationId || "");
    });
    if (!stillPending) return null;
    recordCloudSyncError({
      op: "push",
      code: cloudSyncErrorCode(err),
      message: cloudSyncErrorMessage(err, "No se pudo enviar un cambio a la nube.")
    });
    return err;
  }
}
async function runFlushOutbox(ctx) {
  const { getRoomId, setStatus, outboxSync, outbox } = ctx;
  const roomId = getRoomId();
  if (!roomId) return;
  if (!navigator.onLine) {
    setStatus(outboxSync.pendingCount() > 0 ? "pending" : "offline");
    return;
  }
  splitLabBackfillInOutbox(outbox);
  const pending = outbox.list();
  if (pending.length === 0) return;
  setStatus("syncing");
  let firstErr = null;
  for (const item of pending) {
    const err = await flushOutboxItem(ctx, roomId, item);
    if (err && !firstErr) firstErr = err;
  }
  if (firstErr) {
    setStatus("error", cloudSyncErrorMessage(firstErr, "No se pudo enviar un cambio a la nube."));
    throw firstErr;
  }
}

// public/js/features/cloud-sync/sync-runtime-cycle.mjs
function createOutboxSync(outbox, setStatus) {
  function pendingCount() {
    return outbox.list().length;
  }
  function refreshIdleStatus() {
    if (!navigator.onLine) {
      setStatus(pendingCount() > 0 ? "pending" : "offline");
      return;
    }
    setStatus(pendingCount() > 0 ? "pending" : "idle");
  }
  return { pendingCount, refreshIdleStatus };
}
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
    cycleInflightRef
  } = ctx;
  async function runHiddenCycle() {
    const scheduler = getScheduler();
    if (outboxSync.pendingCount() > 0 && navigator.onLine) {
      try {
        setStatus("syncing");
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
      setStatus("syncing");
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
    const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
    if (hidden) {
      await runHiddenCycle();
      return;
    }
    if (!navigator.onLine) {
      setStatus(outboxSync.pendingCount() > 0 ? "pending" : "offline");
      scheduler.armNextTimer(false);
      return;
    }
    if (cycleInflightRef.current) return cycleInflightRef.current;
    cycleInflightRef.current = runSyncCycleBody().finally(function() {
      cycleInflightRef.current = null;
    });
    return cycleInflightRef.current;
  }
  return { syncCycle };
}
function attachSyncRuntimeListeners(ctx, opts = {}) {
  const { syncCycle, scheduler, pace, outboxSync, roomWs, setStatus, getCurrentStatus } = ctx;
  function onOnline() {
    void syncCycle();
  }
  function onVisibility() {
    if (document.visibilityState === "visible") {
      roomWs?.resume?.();
      void syncCycle();
    } else {
      roomWs?.pause?.();
    }
  }
  function onWindowFocus() {
    void syncCycle();
  }
  function noteLocalMutation() {
    pace.markLocalWrite();
    if (outboxSync.pendingCount() > 0 && getCurrentStatus() === "idle") {
      setStatus("pending");
    }
    scheduler.armNextTimer(false);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibility);
  }
  outboxSync.refreshIdleStatus();
  if (!opts.deferBootCycle) {
    void syncCycle();
  }
  scheduler.armNextTimer(false);
  return {
    noteLocalMutation,
    detach() {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("focus", onWindowFocus);
        document.removeEventListener("visibilitychange", onVisibility);
      }
    }
  };
}
function createSyncFailCycle(getScheduler, setStatus, pendingCount) {
  return function failCycle(err) {
    const scheduler = getScheduler();
    const transient = isCloudTransientServerError(err);
    const rate429 = Number(err && typeof err === "object" ? err.status : 0) === 429;
    const msg = rate429 ? "Nube ocupada (l\xEDmite de peticiones). Reintento autom\xE1tico m\xE1s lento." : transient ? "Servidor Nube saturado. Reintento autom\xE1tico en breve." : cloudSyncErrorMessage(err, "Error de sincronizaci\xF3n con la nube.");
    const backoff = transient || rate429 || scheduler.isRateLimitedError(err);
    if (backoff) {
      recordCloudSyncTrace("rate_limit", { message: msg });
    } else {
      recordCloudSyncError({
        op: "cycle",
        code: cloudSyncErrorCode(err),
        message: msg
      });
    }
    if (transient && pendingCount() === 0) {
      setStatus("idle");
    } else {
      setStatus("error", msg);
    }
    scheduler.noteFailure(err);
    noteCloudSyncCycle(false);
  };
}
function startLiveRoomSyncWs(deps, ctx) {
  if (!deps.liveRoomWs) return null;
  const roomWs = createRoomSyncWs({
    getBaseUrl: deps.liveRoomWs.getBaseUrl,
    getToken: deps.liveRoomWs.getToken,
    getRoomId: ctx.getRoomId,
    getRevision: deps.getRevision,
    onRevisionHint: function(revision) {
      noteCloudSyncWsSignal(revision);
      const local = Number(deps.getRevision() ?? 0);
      if (revision > local) void ctx.syncCycle();
      ctx.scheduler.armNextTimer(false);
    },
    onTransportChange: function(transport) {
      noteCloudSyncTransport(transport);
      ctx.scheduler.armNextTimer(false);
      ctx.onStatus?.(ctx.getCurrentStatus(), ctx.getLastDetail() || void 0);
    }
  });
  roomWs.start();
  return roomWs;
}
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
    listeners
  } = args;
  const handle = {
    getStatus: getCurrentStatus,
    getDetail: getLastDetail,
    getTransportState: function() {
      return roomWs?.getTransportState() ?? "poll";
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
    }
  };
  return handle;
}
function createSyncRuntimeCycle(deps) {
  const { outbox, getRoomId, onStatus } = deps;
  const stoppedRef = { stopped: false };
  const cycleInflightRef = { current: null };
  let currentStatus = "idle";
  let lastDetail = "";
  let lastLocalWriteAt = 0;
  function setStatus(status, detail) {
    currentStatus = status;
    if (status === "error") lastDetail = String(detail || lastDetail || "").trim();
    else if (status === "idle" || status === "syncing") lastDetail = "";
    else if (detail) lastDetail = String(detail).trim();
    onStatus?.(status, lastDetail || void 0);
  }
  const pace = { markLocalWrite() {
    lastLocalWriteAt = Date.now();
  } };
  const outboxSync = createOutboxSync(outbox, setStatus);
  const { pullLatest, flushOutbox } = createPullPush(deps, setStatus, outboxSync, pace);
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
    cycleInflightRef
  });
  let roomWs = null;
  scheduler = createCloudPollScheduler({
    syncCycle: cycleController.syncCycle,
    pendingCount: outboxSync.pendingCount,
    getLastLocalWriteAt: function() {
      return lastLocalWriteAt;
    },
    pollMobile: deps.pollMobile,
    getTransportState: function() {
      if (roomWs) return roomWs.getTransportState();
      return typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "poll";
    }
  });
  roomWs = startLiveRoomSyncWs(deps, {
    getRoomId,
    syncCycle: cycleController.syncCycle,
    scheduler,
    onStatus,
    getCurrentStatus: () => currentStatus,
    getLastDetail: () => lastDetail
  });
  const listeners = attachSyncRuntimeListeners(
    {
      syncCycle: cycleController.syncCycle,
      scheduler,
      pace,
      outboxSync,
      roomWs,
      setStatus,
      getCurrentStatus: () => currentStatus
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
    listeners
  });
}

// public/js/features/cloud-sync/sync-runtime.mjs
var _activeRuntime = null;
function startCloudSyncRuntime(deps) {
  if (_activeRuntime) {
    _activeRuntime.stop();
    _activeRuntime = null;
  }
  _activeRuntime = createSyncRuntimeCycle({
    ...deps,
    onStop(handle) {
      if (_activeRuntime === handle) _activeRuntime = null;
    }
  });
  return _activeRuntime;
}
function stopCloudSyncRuntime() {
  if (_activeRuntime) {
    _activeRuntime.stop();
    _activeRuntime = null;
  }
}

// public/js/features/cloud-sync/cloud-outbox-events.mjs
var CLOUD_OUTBOX_CHANGED_EVENT = "rpc-cloud-outbox-changed";
function notifyCloudOutboxChanged() {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent(CLOUD_OUTBOX_CHANGED_EVENT));
}

// public/js/features/cloud-mobile/outbox-memory.mjs
function createMemoryOutbox() {
  let rows = [];
  function enqueue(item) {
    const clientMutationId = String(item?.clientMutationId || "").trim();
    if (!clientMutationId) return;
    rows = rows.filter((row) => row.clientMutationId !== clientMutationId);
    const enqueuedAt = item.enqueuedAt != null && Number.isFinite(Number(item.enqueuedAt)) ? Number(item.enqueuedAt) : Date.now();
    rows.push({
      clientMutationId,
      ops: Array.isArray(item.ops) ? item.ops : [],
      ...item.baseRevision != null ? { baseRevision: Number(item.baseRevision) } : {},
      enqueuedAt
    });
    notifyCloudOutboxChanged();
  }
  function list() {
    return rows.slice();
  }
  function remove(clientMutationId) {
    const id = String(clientMutationId || "").trim();
    if (!id) return;
    const next = rows.filter((row) => row.clientMutationId !== id);
    if (next.length === rows.length) return;
    rows = next;
    notifyCloudOutboxChanged();
  }
  function clear() {
    if (rows.length === 0) return;
    rows = [];
    notifyCloudOutboxChanged();
  }
  function replaceAll(nextRows) {
    rows = Array.isArray(nextRows) ? nextRows.slice() : [];
    notifyCloudOutboxChanged();
  }
  return { enqueue, list, remove, clear, replaceAll };
}

// public/js/features/cloud-sync/remote-patient-delete-confirm.mjs
var DECLINED_LS = "rpc.declinedRemotePatientDeletes";
var DECLINED_ACTORS_LS = "rpc.declinedRemotePatientDeleteActors";
function readDeclinedRemoteDeletes(storage2 = globalThis.localStorage) {
  try {
    const raw = storage2?.getItem(DECLINED_LS);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function writeDeclinedRemoteDeletes(map, storage2 = globalThis.localStorage) {
  try {
    storage2?.setItem(DECLINED_LS, JSON.stringify(map || {}));
  } catch {
  }
}
function readDeclinedRemoteDeleteActors(storage2 = globalThis.localStorage) {
  try {
    const raw = storage2?.getItem(DECLINED_ACTORS_LS);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function writeDeclinedRemoteDeleteActors(map, storage2 = globalThis.localStorage) {
  try {
    storage2?.setItem(DECLINED_ACTORS_LS, JSON.stringify(map || {}));
  } catch {
  }
}
function resolveActorDisplayName(actorId) {
  const id = String(actorId || "").trim();
  if (!id || id === "local") return "otro equipo";
  const teams = clinicalSessionContext.teams || [];
  for (const team of teams) {
    const members = team?.members || [];
    for (const m of members) {
      if (m && String(m.user_id) === id) {
        const label = String(m.clinical_name || m.username || "").trim();
        if (label) return label;
      }
    }
  }
  return "un dispositivo (" + id.slice(0, 8) + "\u2026)";
}
function resolveTombstoneActorId(patientId, tombstoneMeta, entityVersions) {
  const meta = tombstoneMeta && typeof tombstoneMeta === "object" ? (
    /** @type {{ actorId?: string }} */
    tombstoneMeta
  ) : {};
  const fromMeta = String(meta.actorId || "").trim();
  if (fromMeta) return fromMeta;
  const ver = entityVersions && entityVersions[`tombstones/${patientId}`];
  return String(ver?.actorId || "").trim();
}
function resolveTombstoneDeletedAt(patientId, tombstoneMeta) {
  const meta = tombstoneMeta && typeof tombstoneMeta === "object" ? (
    /** @type {{ deletedAt?: string, updatedAt?: string }} */
    tombstoneMeta
  ) : {};
  return String(meta.deletedAt || meta.updatedAt || "").trim();
}
function patientExistsLocally(patientId) {
  const pid = String(patientId || "").trim();
  return getSyncablePatients().some((p) => p && String(p.id) === pid);
}
function patientLabel(patientId) {
  const p = getSyncablePatients().find((row) => row && String(row.id) === String(patientId));
  if (!p) return String(patientId);
  const name = String(p.nombre || "Paciente").trim() || "Paciente";
  const reg = String(p.registro || "").trim();
  return reg ? `${name} \xB7 ${reg}` : name;
}
function resolveConfirmActorLabel(pending) {
  const names = new Set(pending.map((row) => resolveActorDisplayName(row.actorId)));
  if (names.size === 1) return { label: [...names][0], plural: false };
  return { label: "varios usuarios", plural: true };
}
function buildRemoteDeleteConfirmOpts(pending) {
  const n = pending.length;
  const items = pending.slice(0, 8).map((row) => patientLabel(row.patientId));
  if (n > 8) items.push("\u2026 y " + (n - 8) + " m\xE1s");
  const { label: actor, plural } = resolveConfirmActorLabel(pending);
  if (n === 1) {
    return {
      title: "Quitar de esta Mac",
      question: actor + (plural ? " lo eliminaron" : " lo elimin\xF3") + " en Nube. Si confirmas, desaparece de este censo.",
      items,
      confirmLabel: "Eliminar aqu\xED",
      cancelLabel: "Conservar aqu\xED"
    };
  }
  return {
    title: "Quitar " + n + " pacientes de esta Mac",
    question: actor + (plural ? " los eliminaron" : " los elimin\xF3") + " en Nube. Si confirmas, desaparecen de este censo.",
    items,
    confirmLabel: "Eliminar aqu\xED",
    cancelLabel: "Conservar aqu\xED"
  };
}
var confirmQueue = null;
async function promptAndApplyRemotePatientDeletes(pending) {
  const rows = Array.isArray(pending) ? pending.filter((r) => r && r.patientId) : [];
  if (!rows.length) return { removed: false, declined: 0 };
  const ok = await showConfirmDialog({
    id: "remote-patient-delete-confirm",
    ...buildRemoteDeleteConfirmOpts(rows)
  });
  if (ok) {
    let removed = false;
    const declined2 = readDeclinedRemoteDeletes();
    const declinedActors2 = readDeclinedRemoteDeleteActors();
    for (const row of rows) {
      if (removePatientLocally(row.patientId)) removed = true;
      delete declined2[String(row.patientId)];
      delete declinedActors2[String(row.patientId)];
    }
    writeDeclinedRemoteDeletes(declined2);
    writeDeclinedRemoteDeleteActors(declinedActors2);
    if (removed) {
      persistClinicalState({ immediate: true });
      try {
        const { renderPatientList } = await import("/mobile/js/chunks/patients-LO6X2Z6Z.js");
        renderPatientList({ silent: true });
      } catch {
      }
    }
    return { removed, declined: 0 };
  }
  const declined = readDeclinedRemoteDeletes();
  const declinedActors = readDeclinedRemoteDeleteActors();
  for (const row of rows) {
    const at = String(row.deletedAt || "").trim() || "declined";
    declined[String(row.patientId)] = at;
    if (row.actorId) declinedActors[String(row.patientId)] = String(row.actorId);
  }
  writeDeclinedRemoteDeletes(declined);
  writeDeclinedRemoteDeleteActors(declinedActors);
  return { removed: false, declined: rows.length };
}
function listPendingRemoteDeletes() {
  const declined = readDeclinedRemoteDeletes();
  const declinedActors = readDeclinedRemoteDeleteActors();
  return Object.keys(declined).filter((patientId) => patientExistsLocally(patientId)).map((patientId) => ({
    patientId,
    label: patientLabel(patientId),
    deletedAt: String(declined[patientId] || ""),
    actorName: resolveActorDisplayName(declinedActors[patientId])
  }));
}
function pendingRemoteDeletesHtml(rows) {
  if (!rows.length) {
    return '<p class="cloud-sync-hint">No hay pacientes con eliminaci\xF3n remota pendiente.</p>';
  }
  const items = rows.map(
    (row) => '<li class="cloud-sync-pending-delete-row"><span class="cloud-sync-pending-delete-label">' + esc(row.label) + '</span><span class="cloud-sync-pending-delete-meta">' + esc(row.actorName) + (row.deletedAt ? " \xB7 " + esc(row.deletedAt) : "") + '</span><button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-cloud-action="review-remote-delete" data-patient-id="' + esc(row.patientId) + '" data-deleted-at="' + esc(row.deletedAt) + '">Revisar</button></li>'
  ).join("");
  return '<p class="cloud-sync-hint">Se mantuvieron en esta Mac despu\xE9s de rechazar una eliminaci\xF3n remota.</p><ul class="cloud-sync-pending-delete-list">' + items + "</ul>";
}
function scheduleRemotePatientDeleteConfirm(pending) {
  const rows = Array.isArray(pending) ? pending.slice() : [];
  if (!rows.length) return;
  confirmQueue = (confirmQueue || Promise.resolve()).then(() => promptAndApplyRemotePatientDeletes(rows)).catch(() => {
  }).then(() => {
    confirmQueue = null;
  });
}
function partitionCloudTombstonesForConfirm(tombstones, opts = {}) {
  const silentIds = [];
  const pendingConfirm = [];
  const declinedMap = readDeclinedRemoteDeletes();
  const localActorId = String(opts.localActorId || "").trim();
  const entityVersions = opts.entityVersions || {};
  const shouldApply = typeof opts.shouldApply === "function" ? opts.shouldApply : () => true;
  for (const patientId of Object.keys(tombstones || {})) {
    const meta = tombstones[patientId];
    if (!shouldApply(patientId, meta)) continue;
    const exists = patientExistsLocally(patientId);
    if (!exists) continue;
    const tombstoneActorId = resolveTombstoneActorId(patientId, meta, entityVersions);
    const deletedAt = resolveTombstoneDeletedAt(patientId, meta);
    if (localActorId && tombstoneActorId && localActorId === tombstoneActorId) {
      silentIds.push(patientId);
      continue;
    }
    if (deletedAt && String(declinedMap[patientId] || "") === deletedAt) {
      continue;
    }
    pendingConfirm.push({ patientId, deletedAt, actorId: tombstoneActorId });
  }
  return { silentIds, pendingConfirm };
}

// public/js/features/cloud-sync/pull-apply.mjs
var _labSyncDiagMod = null;
function loadLabSyncDiagMod() {
  if (!_labSyncDiagMod) {
    _labSyncDiagMod = import("/mobile/js/chunks/lab-sync-diagnostics-2NA4QEXB.js");
  }
  return _labSyncDiagMod;
}
async function recordLabPullDiagnostics(patientSync, raw, filtered) {
  try {
    const labDiag = await loadLabSyncDiagMod();
    labDiag.updateLabPullIngressFilter(filtered);
    let activePatientId = null;
    try {
      const rt = await import("/mobile/js/chunks/lab-panel-runtime-state-UH3SDKGL.js");
      activePatientId = rt.rt?.getActiveId?.() || null;
    } catch {
    }
    labDiag.recordLabPullApply({
      patientsUpdated: Number(patientSync?.added || 0) + Number(patientSync?.updated || 0),
      labSetsReceived: raw.sets,
      labSetsKeptAfterWindow: filtered.sets,
      activePatientId
    });
    labDiag.refreshLabMobileSyncDiagPanel(activePatientId);
  } catch {
  }
}
var _mobileLabWindowMod = null;
function loadMobileLabWindowMod() {
  if (!_mobileLabWindowMod) {
    _mobileLabWindowMod = import("/mobile/js/chunks/lab-history-window-RTC5TNUT.js");
  }
  return _mobileLabWindowMod;
}
function mergeCloudTodoIntoMap(row, byPatient, map) {
  const remotePid = String(row.patientId || "").trim();
  const id = String(row.id || "").trim();
  if (!remotePid || !id) return;
  const registro = String(row.registro || "").trim();
  const pid = resolveCloudTodoLocalPatientId(remotePid, registro, getSyncablePatients(), map);
  if (!pid) return;
  if (!getSyncablePatients().some(function(p) {
    return p && String(p.id) === String(pid);
  })) {
    return;
  }
  if (!byPatient[pid]) byPatient[pid] = storage.getTodos(pid).slice();
  const idx = byPatient[pid].findIndex(function(t) {
    return t && String(t.id) === id;
  });
  if (row._deleted) {
    if (idx >= 0) byPatient[pid].splice(idx, 1);
    return;
  }
  const stored = { ...row, patientId: pid };
  if (idx >= 0) byPatient[pid][idx] = stored;
  else byPatient[pid].push(stored);
}
function applyCloudTodosMap(todosMap, idMap) {
  const byPatient = {};
  const map = idMap && typeof idMap === "object" ? idMap : {};
  for (const todo of Object.values(todosMap || {})) {
    if (!todo || typeof todo !== "object") continue;
    mergeCloudTodoIntoMap(todo, byPatient, map);
  }
  const changedPatients = [];
  for (const pid of Object.keys(byPatient)) {
    storage.saveTodos(pid, byPatient[pid]);
    changedPatients.push(pid);
  }
  return changedPatients;
}
function applyCloudAgendaMap(agendaMap, idMap) {
  const live = Object.values(agendaMap || {}).filter(function(item) {
    return item && typeof item === "object" && !item._deleted;
  });
  storage.saveScheduledProcedures(remapAgendaPatientIds(live, idMap || {}));
}
function shouldApplyCloudTombstone(patientId, tombstoneMeta) {
  const pid = String(patientId || "").trim();
  if (!pid) return false;
  const reg = String(
    tombstoneMeta && typeof tombstoneMeta === "object" ? (
      /** @type {{ registro?: string }} */
      tombstoneMeta.registro || ""
    ) : ""
  ).trim();
  if (!reg) return true;
  return !getSyncablePatients().some(function(p) {
    return p && String(p.id || "") !== pid && String(p.registro || "").trim() === reg;
  });
}
function applyCloudTombstones(tombstones, entityVersions) {
  const { silentIds, pendingConfirm } = partitionCloudTombstonesForConfirm(tombstones || {}, {
    localActorId: resolveCloudActorId(),
    entityVersions: entityVersions || {},
    shouldApply: shouldApplyCloudTombstone
  });
  let removed = false;
  for (const patientId of silentIds) {
    if (removePatientLocally(patientId)) removed = true;
  }
  if (pendingConfirm.length) scheduleRemotePatientDeleteConfirm(pendingConfirm);
  return removed;
}
async function applyClinicalOpsSnapshot(clinicalOps) {
  if (clinicalOps == null) return false;
  try {
    const { isClinicalOpsSyncAvailable, applyClinicalOpsSnapshot: applyClinicalOpsSnapshot2, refreshClinicalOpsSnapshotCache } = await import("/mobile/js/chunks/clinical-ops-sync-S3XOKAM6.js");
    const { applyClinicalScopeFromOpsSnapshot } = await import("/mobile/js/chunks/clinical-access-runtime-7PNW7XFE.js");
    let applied = false;
    if (isClinicalOpsSyncAvailable()) {
      const result = await applyClinicalOpsSnapshot2(clinicalOps);
      if (result.ok) {
        await refreshClinicalOpsSnapshotCache();
        applied = true;
      }
    } else {
      applied = !!await applyClinicalScopeFromOpsSnapshot(clinicalOps);
    }
    if (applied) {
      const { hydrateClinicalTeamsAfterCloudPull } = await import("/mobile/js/chunks/clinical-ops-hydrate-54VVWZKH.js");
      await hydrateClinicalTeamsAfterCloudPull();
    }
    return applied;
  } catch {
    return false;
  }
}
function shouldSkipTeamScopeFilterOnCloudPull() {
  if (!shouldEnforceTeamPatientMirror()) return true;
  return !isClinicalScopeReadyForPatientApply();
}
function cloudPatientEntryApplyOpts() {
  return {
    skipTodos: true,
    skipTeamScopeFilter: shouldSkipTeamScopeFilterOnCloudPull()
  };
}
async function refreshCloudTodoUIs(patientIds) {
  const ids = Array.isArray(patientIds) ? patientIds : [];
  if (!ids.length) return;
  try {
    const mod = await import("/mobile/js/chunks/todos-refresh-JLRCJMX2.js");
    if (typeof mod.refreshTodoUIsForPatients === "function") {
      mod.refreshTodoUIsForPatients(ids);
    }
  } catch {
  }
}
async function pruneStoredMobileLabHistoryAfterPull() {
  const labWin = await loadMobileLabWindowMod();
  if (!labWin.shouldApplyMobileLabHistoryWindow()) return false;
  let changed = false;
  Object.keys(getLabHistory() || {}).forEach(function(pid) {
    const filtered = labWin.filterLabHistorySetsForMobileReference(getLabHistory()[pid]);
    const before = Array.isArray(getLabHistory()[pid]) ? getLabHistory()[pid].length : 0;
    if (filtered.length === before) return;
    if (filtered.length) getLabHistory()[pid] = filtered;
    else delete getLabHistory()[pid];
    bumpLabHistoryRevision(pid);
    changed = true;
  });
  return changed;
}
async function finalizeCloudPullPatientScope() {
  try {
    const access = await import("/mobile/js/chunks/clinical-access-runtime-7PNW7XFE.js");
    if (shouldEnforceTeamPatientMirror()) {
      if (typeof access.finalizeMobileLanPatientCensus === "function") {
        await access.finalizeMobileLanPatientCensus();
      }
      return;
    }
    const pruned = access.prunePatientsOutsideClinicalScope();
    if (pruned > 0 && typeof access.refreshDesktopPatientListAfterScopePrune === "function") {
      await access.refreshDesktopPatientListAfterScopePrune();
    }
  } catch {
  }
}
async function applyCloudState(state, opts) {
  if (!state) return { added: 0, updated: 0, removed: false };
  const labWin = await loadMobileLabWindowMod();
  let rawCounts = { patients: 0, sets: 0 };
  let filteredCounts = { patients: 0, sets: 0 };
  try {
    const labDiag = await loadLabSyncDiagMod();
    rawCounts = labDiag.countLabSidecarsInState(state);
  } catch {
  }
  const snapshot = labWin.filterCloudStateForMobileLabWindow(state);
  try {
    const labDiag = await loadLabSyncDiagMod();
    filteredCounts = labDiag.countLabSidecarsInState(snapshot);
  } catch {
  }
  await applyClinicalOpsSnapshot(snapshot.clinicalOps);
  const entries = cloudStateToLanEntries(snapshot);
  const idMap = buildLiveSyncPatientIdMap(entries, getSyncablePatients(), {});
  const patientSync = entries.length ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts()) : { added: 0, updated: 0 };
  let todoPatients = [];
  if (!opts?.skipTodos && snapshot.todos) todoPatients = applyCloudTodosMap(snapshot.todos, idMap);
  if (Array.isArray(snapshot.agenda)) {
    applyCloudAgendaMap(
      Object.fromEntries(
        snapshot.agenda.filter((item) => item && item.id).map((item) => [String(item.id), item])
      ),
      idMap
    );
  }
  const removed = applyCloudTombstones(
    snapshot.tombstones || {},
    /** @type {Record<string, { actorId?: string }>|undefined} */
    snapshot.entityVersions
  );
  pruneOrphanTodos(
    getSyncablePatients().map(function(p) {
      return p && p.id;
    })
  );
  await finalizeCloudPullPatientScope();
  await refreshCloudTodoUIs(todoPatients);
  const prunedLabs = await pruneStoredMobileLabHistoryAfterPull();
  if (patientSync.added || patientSync.updated || removed || prunedLabs) {
    persistClinicalState({ domains: ["patients"] });
    scheduleIdleClinicalPersist();
  }
  await recordLabPullDiagnostics(patientSync, rawCounts, filteredCounts);
  return { ...patientSync, removed };
}
async function applyFoldedCloudPull(fold, labCounts) {
  await applyClinicalOpsSnapshot(fold.clinicalOps);
  const entries = opFoldToLanEntries(fold);
  const idMap = buildLiveSyncPatientIdMap(entries, getSyncablePatients(), {});
  const patientSync = entries.length ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts()) : { added: 0, updated: 0 };
  const todoPatients = applyCloudTodosMap(fold.todos, idMap);
  applyCloudAgendaMap(fold.agenda, idMap);
  const removed = applyCloudTombstones(fold.tombstones);
  pruneOrphanTodos(
    getSyncablePatients().map(function(p) {
      return p && p.id;
    })
  );
  await finalizeCloudPullPatientScope();
  await refreshCloudTodoUIs(todoPatients);
  const prunedLabs = await pruneStoredMobileLabHistoryAfterPull();
  if (patientSync.added || patientSync.updated || removed || prunedLabs) {
    persistClinicalState({ domains: ["patients"] });
    scheduleIdleClinicalPersist();
  }
  await recordLabPullDiagnostics(
    patientSync,
    { patients: 0, sets: labCounts.rawLabOps },
    { patients: 0, sets: labCounts.filteredLabOps }
  );
  return { ...patientSync, removed };
}
function countLabSidecarOps(ops) {
  let n = 0;
  for (let i = 0; i < (ops || []).length; i += 1) {
    if (String(ops[i]?.path || "").startsWith("labSidecars/")) n += 1;
  }
  return n;
}
async function applyCloudOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return { added: 0, updated: 0, removed: false };
  const labWin = await loadMobileLabWindowMod();
  const rawLabOps = countLabSidecarOps(ops);
  const trimmedOps = labWin.filterCloudPullOpsForMobileLabWindow(ops);
  const filteredLabOps = countLabSidecarOps(trimmedOps);
  if (!trimmedOps.length) {
    const prunedLabs = await pruneStoredMobileLabHistoryAfterPull();
    if (prunedLabs) scheduleIdleClinicalPersist();
    return { added: 0, updated: 0, removed: false };
  }
  const fold = createOpFold();
  for (let i = 0; i < trimmedOps.length; i += 1) {
    foldCloudOp(fold, trimmedOps[i]);
  }
  labWin.filterOpFoldLabSidecarsForMobile(fold);
  return applyFoldedCloudPull(fold, { rawLabOps, filteredLabOps });
}
async function refreshSidebarAfterCloudPull(result) {
  if (!result?.added && !result?.updated && !result?.removed) return;
  try {
    const { renderPatientList } = await import("/mobile/js/chunks/patients-LO6X2Z6Z.js");
    renderPatientList({ silent: true });
  } catch {
  }
}
async function applyCloudPullResult(result) {
  if (!result || typeof result !== "object") return { added: 0, updated: 0, removed: false };
  const row = result;
  let applied = { added: 0, updated: 0, removed: false };
  if (row.needSnapshot && row.state) {
    applied = await applyCloudState(row.state);
  } else if (Array.isArray(row.ops) && row.ops.length) {
    applied = await applyCloudOps(row.ops);
  }
  await refreshSidebarAfterCloudPull(applied);
  return applied;
}

export {
  promptAndApplyRemotePatientDeletes,
  listPendingRemoteDeletes,
  pendingRemoteDeletesHtml,
  startCloudSyncRuntime,
  stopCloudSyncRuntime,
  CLOUD_OUTBOX_CHANGED_EVENT,
  createMemoryOutbox,
  applyCloudPullResult
};
//# sourceMappingURL=/js/chunks/chunk-DABJ4IMO.js.map
