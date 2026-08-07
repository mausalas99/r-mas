import {
  cloudStateToLanEntries,
  createOpFold,
  foldCloudOp,
  opFoldToLanEntries
} from "/mobile/js/chunks/chunk-ZOXS3A7B.js";
import {
  resolveCloudPushMutationId
} from "/mobile/js/chunks/chunk-AZX47ZAL.js";
import {
  applyLanPatientEntries,
  isClinicalScopeReadyForLanPatientApply,
  removePatientLocally,
  shouldEnforceTeamPatientMirror
} from "/mobile/js/chunks/chunk-V7RKRU36.js";
import {
  cloudSyncErrorCode,
  isCloudRateLimitError,
  nextCloudPollDelayMs,
  noteCloudSyncCycle,
  noteCloudSyncPull,
  noteCloudSyncPush,
  recordCloudSyncError,
  recordCloudSyncTrace,
  retryAfterMsFromError
} from "/mobile/js/chunks/chunk-WWZFTPFJ.js";
import {
  patients,
  saveState
} from "/mobile/js/chunks/chunk-NFDNC4E2.js";
import {
  sanitizeOpsForCloudPush
} from "/mobile/js/chunks/chunk-5X65DZ36.js";
import {
  storage
} from "/mobile/js/chunks/chunk-MWVG4DXC.js";

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
  function scheduleNext(delayMs) {
    if (stopped) return;
    clearTimer();
    timerId = setTimeout(function() {
      timerId = null;
      void deps.syncCycle();
    }, delayMs);
  }
  function armNextTimer(errored) {
    const delay = forcedDelayMs != null ? forcedDelayMs : nextCloudPollDelayMs({
      pending: deps.pendingCount() > 0,
      errored,
      errorStreak,
      lastLocalWriteAt: deps.getLastLocalWriteAt(),
      mobile: deps.pollMobile
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
    if (isCloudRateLimitError(err)) {
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
    isRateLimitedError: isCloudRateLimitError
  };
}

// public/js/features/cloud-sync/sync-runtime-cycle.mjs
function humanizeCloudSyncErrorMessage(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^failed to fetch$/i.test(s) || /networkerror when attempting to fetch/i.test(s)) {
    return "Sin red hacia Nube. Revisa Wi\u2011Fi / VPN e int\xE9ntalo de nuevo.";
  }
  if (/load failed|network request failed/i.test(s)) {
    return "No hubo respuesta de Nube. Revisa la conexi\xF3n e int\xE9ntalo de nuevo.";
  }
  return s;
}
function errorMessage(err, fallback) {
  const data = err && typeof err === "object" ? (
    /** @type {{ data?: { message?: string }, message?: string }} */
    err
  ) : null;
  const raw = String(data?.data?.message || data?.message || fallback).trim() || fallback;
  return humanizeCloudSyncErrorMessage(raw) || fallback;
}
var PUSH_STALE_RETRIES = 3;
function isCloudRevisionStaleError(err) {
  const data = err && typeof err === "object" ? (
    /** @type {{ data?: { error?: string } }} */
    err
  ) : null;
  const code = String(data?.data?.error || "").trim();
  return code === "revision_stale" || code === "conflict";
}
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
function createPullPush(deps, setStatus, outboxSync, pace) {
  const { api, outbox, getRoomId, getRevision, setRevision, applyPullResult } = deps;
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
    recordCloudSyncTrace("pull", {
      since,
      revision: result?.revision != null ? Number(result.revision) : null,
      opsCount: Array.isArray(result?.ops) ? result.ops.length : 0
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
    applyServerRevision
  });
}
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
    applyServerRevision
  } = ctx;
  async function pushWithStaleRetry(roomId, item, ops) {
    let lastErr;
    for (let attempt = 0; attempt <= PUSH_STALE_RETRIES; attempt++) {
      try {
        return await api.push(roomId, {
          clientMutationId: resolveCloudPushMutationId(item),
          ops,
          baseRevision: getRevision() ?? item.baseRevision ?? 0
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
      setStatus(outboxSync.pendingCount() > 0 ? "pending" : "offline");
      return;
    }
    const pending = outbox.list();
    if (pending.length === 0) return;
    setStatus("syncing");
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
        recordCloudSyncTrace("push", {
          clientMutationId: item.clientMutationId,
          opCount: sanitized.ops.length,
          revision: result?.revision != null ? Number(result.revision) : null
        });
      } catch (err) {
        const msg = errorMessage(err, "No se pudo enviar un cambio a la nube.");
        recordCloudSyncError({
          op: "push",
          code: cloudSyncErrorCode(err),
          message: msg
        });
        setStatus("error", msg);
        throw err;
      }
    }
  }
  return { pullLatest, flushOutbox };
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
function attachSyncRuntimeListeners(ctx) {
  const { syncCycle, scheduler, pace, outboxSync } = ctx;
  function onOnline() {
    void syncCycle();
  }
  function onVisibility() {
    if (document.visibilityState === "visible") void syncCycle();
  }
  function onWindowFocus() {
    void syncCycle();
  }
  function noteLocalMutation() {
    pace.markLocalWrite();
    scheduler.armNextTimer(false);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibility);
  }
  outboxSync.refreshIdleStatus();
  void syncCycle();
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
function createSyncRuntimeCycle(deps) {
  const { outbox, getRoomId, onStatus } = deps;
  let stopped = false;
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
  function failCycle(err) {
    const rateLimited = scheduler.isRateLimitedError(err);
    const msg = rateLimited ? "Nube ocupada (l\xEDmite de peticiones). Reintento autom\xE1tico m\xE1s lento." : errorMessage(err, "Error de sincronizaci\xF3n con la nube.");
    if (!rateLimited) {
      recordCloudSyncError({
        op: "cycle",
        code: cloudSyncErrorCode(err),
        message: msg
      });
    } else {
      recordCloudSyncTrace("rate_limit", { message: msg });
    }
    setStatus("error", msg);
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
    cycleInflightRef
  });
  scheduler = createCloudPollScheduler({
    syncCycle: cycleController.syncCycle,
    pendingCount: outboxSync.pendingCount,
    getLastLocalWriteAt: function() {
      return lastLocalWriteAt;
    },
    pollMobile: deps.pollMobile
  });
  const listeners = attachSyncRuntimeListeners({
    syncCycle: cycleController.syncCycle,
    scheduler,
    pace,
    outboxSync
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
    }
  };
  return handle;
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

// public/js/features/cloud-sync/pull-apply.mjs
function applyCloudTodosMap(todosMap) {
  const byPatient = {};
  for (const todo of Object.values(todosMap || {})) {
    if (!todo || typeof todo !== "object") continue;
    const row = todo;
    const pid = String(row.patientId || "").trim();
    const id = String(row.id || "").trim();
    if (!pid || !id) continue;
    if (!byPatient[pid]) byPatient[pid] = storage.getTodos(pid).slice();
    const idx = byPatient[pid].findIndex(function(t) {
      return t && String(t.id) === id;
    });
    if (row._deleted) {
      if (idx >= 0) byPatient[pid].splice(idx, 1);
      continue;
    }
    if (idx >= 0) byPatient[pid][idx] = row;
    else byPatient[pid].push(row);
  }
  const changedPatients = [];
  for (const pid of Object.keys(byPatient)) {
    storage.saveTodos(pid, byPatient[pid]);
    changedPatients.push(pid);
  }
  return changedPatients;
}
function applyCloudAgendaMap(agendaMap) {
  const live = Object.values(agendaMap || {}).filter(function(item) {
    return item && typeof item === "object" && !item._deleted;
  });
  storage.saveScheduledProcedures(live);
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
  return !patients.some(function(p) {
    return p && String(p.id || "") !== pid && String(p.registro || "").trim() === reg;
  });
}
function applyCloudTombstones(tombstones) {
  let removed = false;
  for (const patientId of Object.keys(tombstones || {})) {
    if (!shouldApplyCloudTombstone(patientId, tombstones[patientId])) continue;
    if (removePatientLocally(patientId)) removed = true;
  }
  return removed;
}
async function applyClinicalOpsSnapshot(clinicalOps) {
  if (clinicalOps == null) return false;
  try {
    const { isClinicalOpsLanAvailable, applyClinicalOpsLanSnapshot, refreshClinicalOpsSnapshotCache } = await import("/mobile/js/chunks/clinical-ops-sync-QL5EWC73.js");
    const { applyClinicalScopeFromLanOpsSnapshot } = await import("/mobile/js/chunks/clinical-access-runtime-AE6KBGJD.js");
    let applied = false;
    if (isClinicalOpsLanAvailable()) {
      const result = await applyClinicalOpsLanSnapshot(clinicalOps);
      if (result.ok) {
        await refreshClinicalOpsSnapshotCache();
        applied = true;
      }
    } else {
      applied = !!await applyClinicalScopeFromLanOpsSnapshot(clinicalOps);
    }
    if (applied) {
      const { hydrateClinicalTeamsAfterCloudPull } = await import("/mobile/js/chunks/clinical-ops-hydrate-HFUSPBER.js");
      await hydrateClinicalTeamsAfterCloudPull();
    }
    return applied;
  } catch {
    return false;
  }
}
function shouldSkipTeamScopeFilterOnCloudPull() {
  if (!shouldEnforceTeamPatientMirror()) return true;
  return !isClinicalScopeReadyForLanPatientApply();
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
    const mod = await import("/mobile/js/chunks/todos-refresh-CRN7D3FN.js");
    if (typeof mod.refreshTodoUIsForPatients === "function") {
      mod.refreshTodoUIsForPatients(ids);
    }
  } catch {
  }
}
async function finalizeCloudPullPatientScope() {
  try {
    const access = await import("/mobile/js/chunks/clinical-access-runtime-AE6KBGJD.js");
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
  await applyClinicalOpsSnapshot(state.clinicalOps);
  const entries = cloudStateToLanEntries(state);
  const patientSync = entries.length ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts()) : { added: 0, updated: 0 };
  let todoPatients = [];
  if (!opts?.skipTodos && state.todos) todoPatients = applyCloudTodosMap(state.todos);
  if (Array.isArray(state.agenda)) {
    storage.saveScheduledProcedures(state.agenda.filter((item) => item && !item._deleted));
  }
  const removed = applyCloudTombstones(state.tombstones || {});
  await finalizeCloudPullPatientScope();
  await refreshCloudTodoUIs(todoPatients);
  if (patientSync.added || patientSync.updated || removed) {
    saveState({ immediate: true });
  }
  return { ...patientSync, removed };
}
async function applyCloudOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return { added: 0, updated: 0, removed: false };
  const fold = createOpFold();
  for (let i = 0; i < ops.length; i += 1) {
    foldCloudOp(fold, ops[i]);
  }
  await applyClinicalOpsSnapshot(fold.clinicalOps);
  const entries = opFoldToLanEntries(fold);
  const patientSync = entries.length ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts()) : { added: 0, updated: 0 };
  const todoPatients = applyCloudTodosMap(fold.todos);
  applyCloudAgendaMap(fold.agenda);
  const removed = applyCloudTombstones(fold.tombstones);
  await finalizeCloudPullPatientScope();
  await refreshCloudTodoUIs(todoPatients);
  if (patientSync.added || patientSync.updated || removed) {
    saveState({ immediate: true });
  }
  return { ...patientSync, removed };
}
async function refreshSidebarAfterCloudPull(result) {
  if (!result?.added && !result?.updated && !result?.removed) return;
  try {
    const { renderPatientList } = await import("/mobile/js/chunks/patients-DT4CP2TY.js");
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
  humanizeCloudSyncErrorMessage,
  startCloudSyncRuntime,
  stopCloudSyncRuntime,
  applyCloudPullResult
};
//# sourceMappingURL=/js/chunks/chunk-MJCSL5KX.js.map
