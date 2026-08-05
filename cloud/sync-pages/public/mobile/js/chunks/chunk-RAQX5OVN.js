import {
  resolveCloudPushMutationId
} from "/mobile/js/chunks/chunk-CV62ZWIZ.js";
import {
  applyLanPatientEntries,
  removePatientLocally
} from "/mobile/js/chunks/chunk-OJH7L2CJ.js";
import {
  shouldEnforceTeamPatientMirror,
  shouldUseElevatedPatientCensus
} from "/mobile/js/chunks/chunk-NW6K73WP.js";
import {
  isCloudRateLimitError,
  nextCloudPollDelayMs,
  retryAfterMsFromError
} from "/mobile/js/chunks/chunk-MBEH6ZUQ.js";
import {
  sanitizeOpsForCloudPush
} from "/mobile/js/chunks/chunk-LYZOIXV3.js";
import {
  saveState
} from "/mobile/js/chunks/chunk-JZ2SPQIK.js";
import {
  storage
} from "/mobile/js/chunks/chunk-76D6GOCM.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-LMOJUVZ4.js";

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
        if (result?.revision != null) setRevision(Number(result.revision));
        if (result?.needPull) await pullLatest();
      } catch (err) {
        setStatus("error", errorMessage(err, "No se pudo enviar un cambio a la nube."));
        throw err;
      }
    }
  }
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
  return { pullLatest, flushOutbox };
}
function createSyncRuntimeCycle(deps) {
  const { outbox, getRoomId, onStatus } = deps;
  let stopped = false;
  let cycleInflight = null;
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
  async function syncCycle() {
    if (stopped) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      if (deps.pollMobile) {
        scheduler.armNextTimer(false);
      }
      return;
    }
    if (!getRoomId()) return;
    if (!navigator.onLine) {
      setStatus(outboxSync.pendingCount() > 0 ? "pending" : "offline");
      scheduler.armNextTimer(false);
      return;
    }
    if (cycleInflight) return cycleInflight;
    cycleInflight = runSyncCycleBody().finally(function() {
      cycleInflight = null;
    });
    return cycleInflight;
  }
  async function runSyncCycleBody() {
    try {
      setStatus("syncing");
      await flushOutbox();
      await pullLatest();
      outboxSync.refreshIdleStatus();
      scheduler.noteSuccess();
    } catch (err) {
      if (scheduler.isRateLimitedError(err)) {
        setStatus("error", "Nube ocupada (l\xEDmite de peticiones). Reintento autom\xE1tico m\xE1s lento.");
      } else {
        setStatus("error", errorMessage(err, "Error de sincronizaci\xF3n con la nube."));
      }
      scheduler.noteFailure(err);
    }
  }
  scheduler = createCloudPollScheduler({
    syncCycle,
    pendingCount: outboxSync.pendingCount,
    getLastLocalWriteAt: function() {
      return lastLocalWriteAt;
    },
    pollMobile: deps.pollMobile
  });
  function onOnline() {
    void syncCycle();
  }
  function onVisibility() {
    if (document.visibilityState === "visible") void syncCycle();
  }
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
  }
  outboxSync.refreshIdleStatus();
  scheduler.armNextTimer(false);
  const handle = {
    getStatus: () => currentStatus,
    getDetail: () => lastDetail,
    flushOutbox,
    syncCycle,
    stop() {
      stopped = true;
      scheduler.stop();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        document.removeEventListener("visibilitychange", onVisibility);
      }
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

// public/js/features/cloud-sync/pull-apply-state.mjs
var ENTRY_SKIP_KEYS = /* @__PURE__ */ new Set([
  "id",
  "note",
  "indicaciones",
  "historiaClinica",
  "eventualidades",
  "monitoreo",
  "fields"
]);
function assembleLabHistoryFromSidecars(sidecarMap) {
  if (!sidecarMap || typeof sidecarMap !== "object") return [];
  return Object.values(sidecarMap).filter((row) => row && typeof row === "object");
}
function buildPatientFromCloudEntry(entry) {
  const patientId = String(entry.id).trim();
  const fields = entry.fields;
  const patient = {
    id: patientId,
    ...fields && typeof fields === "object" ? fields : {}
  };
  for (const [key, value] of Object.entries(entry)) {
    if (ENTRY_SKIP_KEYS.has(key)) continue;
    patient[key] = value;
  }
  if (entry.historiaClinica) patient.historiaClinica = entry.historiaClinica;
  if (entry.eventualidades) patient.eventualidades = entry.eventualidades;
  if (entry.monitoreo) patient.monitoreo = entry.monitoreo;
  return patient;
}
function cloudEntryToLanEntry(entry, labSidecarsForPatient) {
  if (!entry?.id) return null;
  const note = entry.note;
  const indicaciones = entry.indicaciones;
  return {
    patient: buildPatientFromCloudEntry(entry),
    note: note && typeof note === "object" ? note : {},
    indicaciones: indicaciones && typeof indicaciones === "object" ? indicaciones : {},
    labHistory: assembleLabHistoryFromSidecars(labSidecarsForPatient)
  };
}
function cloudStateToLanEntries(state) {
  const labSidecars = state?.labSidecars && typeof state.labSidecars === "object" ? state.labSidecars : {};
  const rows = Array.isArray(state?.entries) ? state.entries : [];
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    const pid = String(rows[i]?.id || "").trim();
    const lanEntry = cloudEntryToLanEntry(rows[i], labSidecars[pid] || {});
    if (lanEntry) out.push(lanEntry);
  }
  return out;
}
function createOpFold() {
  return {
    entries: /* @__PURE__ */ new Map(),
    labSidecars: {},
    todos: {},
    agenda: {},
    clinicalOps: void 0,
    tombstones: {}
  };
}
function foldEntryRoot(fold, pid, value) {
  const prev = fold.entries.get(pid) || { id: pid };
  fold.entries.set(pid, { ...prev, ...value && typeof value === "object" ? value : {}, id: pid });
}
function foldEntryField(fold, pid, field, value) {
  const prev = fold.entries.get(pid) || { id: pid };
  prev[field] = value;
  fold.entries.set(pid, prev);
}
function foldLabSidecar(fold, patientId, setId, value) {
  if (!fold.labSidecars[patientId]) fold.labSidecars[patientId] = {};
  fold.labSidecars[patientId][setId] = value;
}
function foldAgendaList(fold, value) {
  const list = Array.isArray(value) ? value : [];
  for (let i = 0; i < list.length; i += 1) {
    if (list[i]?.id) fold.agenda[String(list[i].id)] = list[i];
  }
}
function foldCloudOp(fold, op) {
  const path = String(op?.path || "");
  const value = op?.value;
  const entryRoot = /^entries\/([^/]+)$/.exec(path);
  if (entryRoot) {
    foldEntryRoot(fold, entryRoot[1], value);
    return;
  }
  const entryField = /^entries\/([^/]+)\/(note|indicaciones|historiaClinica|eventualidades|monitoreo|fields)$/.exec(
    path
  );
  if (entryField) {
    foldEntryField(fold, entryField[1], entryField[2], value);
    return;
  }
  const labSidecar = /^labSidecars\/([^/]+)\/([^/]+)$/.exec(path);
  if (labSidecar) {
    foldLabSidecar(fold, labSidecar[1], labSidecar[2], value);
    return;
  }
  const todoMatch = /^todos\/([^/]+)$/.exec(path);
  if (todoMatch) {
    fold.todos[todoMatch[1]] = value;
    return;
  }
  const agendaItem = /^agenda\/([^/]+)$/.exec(path);
  if (agendaItem) {
    fold.agenda[agendaItem[1]] = value;
    return;
  }
  if (path === "agenda") {
    foldAgendaList(fold, value);
    return;
  }
  if (path === "clinicalOps") {
    fold.clinicalOps = value;
    return;
  }
  const tombstone = /^tombstones\/([^/]+)$/.exec(path);
  if (tombstone) {
    fold.tombstones[tombstone[1]] = value;
  }
}
function opFoldToLanEntries(fold) {
  const out = [];
  for (const entry of fold.entries.values()) {
    const pid = String(entry.id || "").trim();
    const lanEntry = cloudEntryToLanEntry(entry, fold.labSidecars[pid] || {});
    if (lanEntry) out.push(lanEntry);
  }
  return out;
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
function applyCloudTombstones(tombstones) {
  let removed = false;
  for (const patientId of Object.keys(tombstones || {})) {
    if (removePatientLocally(patientId)) removed = true;
  }
  return removed;
}
async function applyClinicalOpsSnapshot(clinicalOps) {
  if (clinicalOps == null) return false;
  try {
    const { isClinicalOpsLanAvailable, applyClinicalOpsLanSnapshot, refreshClinicalOpsSnapshotCache } = await import("/mobile/js/chunks/clinical-ops-sync-4EUAUEKK.js");
    const { applyClinicalScopeFromLanOpsSnapshot } = await import("/mobile/js/chunks/clinical-access-runtime-D353YS2C.js");
    if (isClinicalOpsLanAvailable()) {
      const result = await applyClinicalOpsLanSnapshot(clinicalOps);
      if (result.ok) {
        await refreshClinicalOpsSnapshotCache();
        return true;
      }
      return false;
    }
    return applyClinicalScopeFromLanOpsSnapshot(clinicalOps);
  } catch {
    return false;
  }
}
function shouldSkipTeamScopeFilterOnCloudPull() {
  if (shouldEnforceTeamPatientMirror()) return false;
  const user = clinicalSessionContext.user;
  return shouldUseElevatedPatientCensus(user);
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
    const mod = await import("/mobile/js/chunks/todos-refresh-YU6GA6NI.js");
    if (typeof mod.refreshTodoUIsForPatients === "function") {
      mod.refreshTodoUIsForPatients(ids);
    }
  } catch {
  }
}
async function finalizeCloudPullPatientScope() {
  try {
    const access = await import("/mobile/js/chunks/clinical-access-runtime-D353YS2C.js");
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
async function applyCloudPullResult(result) {
  if (!result || typeof result !== "object") return { added: 0, updated: 0, removed: false };
  const row = result;
  if (row.needSnapshot && row.state) {
    return applyCloudState(row.state);
  }
  if (Array.isArray(row.ops) && row.ops.length) {
    return applyCloudOps(row.ops);
  }
  return { added: 0, updated: 0, removed: false };
}

export {
  humanizeCloudSyncErrorMessage,
  startCloudSyncRuntime,
  stopCloudSyncRuntime,
  applyCloudPullResult
};
//# sourceMappingURL=/js/chunks/chunk-RAQX5OVN.js.map
