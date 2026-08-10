import {
  recordCloudSyncError
} from "/mobile/js/chunks/chunk-EHHIMUZG.js";
import {
  labHistory,
  patients
} from "/mobile/js/chunks/chunk-H66E52WF.js";
import {
  CLOUD_PUSH_DEBOUNCE_MS,
  CLOUD_PUSH_FIRST_MS
} from "/mobile/js/chunks/chunk-6CYAI7OE.js";
import {
  CLOUD_BATCH_MUTATION_ID,
  CLOUD_LAB_BACKFILL_MUTATION_ID,
  CLOUD_TOMBSTONES_MUTATION_ID,
  buildDirtyLabSidecarOpsForPatient,
  buildInternoAccessUpsertOp,
  cloudOp,
  coalesceLabSidecarOps,
  countPatientEntryOps,
  filterCloudLabSidecarOps,
  hasNonEntryCloudOps,
  internoAccessMutationId,
  isCloudLabSidecarPath,
  isLabSidecarOutboxMutationId,
  mapBundleEnvelopeToOps,
  mapPatientEntryToCloudBundleOps,
  parseCloudLabSidecarPath,
  pushCensusFieldsOp
} from "/mobile/js/chunks/chunk-F52EEXUB.js";
import {
  registroForPatientId,
  stampCloudTodoRow
} from "/mobile/js/chunks/chunk-GJK2JHBF.js";
import {
  isCloudSyncActive
} from "/mobile/js/chunks/chunk-CAVI7UGR.js";
import {
  getCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncRoomSnapshot,
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRevision
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";
import {
  getCachedClinicalOpsSnapshot,
  isClinicalOpsLanAvailable,
  prepareClinicalOpsForLanSync
} from "/mobile/js/chunks/chunk-PIQOYX4G.js";

// public/js/features/cloud-sync/outbox-lab.mjs
function pruneLabSidecarOpsFromOutboxRows(rows) {
  const input = Array.isArray(rows) ? rows : [];
  const next = [];
  let removedOps = 0;
  let removedEntries = 0;
  for (let i = 0; i < input.length; i += 1) {
    const row = input[i];
    const id = String(row?.clientMutationId || "");
    if (isLabSidecarOutboxMutationId(id)) {
      removedOps += Array.isArray(row.ops) ? row.ops.length : 0;
      removedEntries += 1;
      continue;
    }
    const ops = Array.isArray(row.ops) ? row.ops : [];
    const kept = ops.filter(function(op) {
      return !op || typeof op !== "object" || !isCloudLabSidecarPath(String(op.path || ""));
    });
    removedOps += ops.length - kept.length;
    if (!kept.length) {
      removedEntries += 1;
      continue;
    }
    next.push({ ...row, ops: kept });
  }
  return { rows: next, removedOps, removedEntries };
}
function drainSyncedLabOpsFromOutboxRows(rows) {
  const input = Array.isArray(rows) ? rows : [];
  const next = [];
  let removedOps = 0;
  let removedEntries = 0;
  for (let i = 0; i < input.length; i += 1) {
    const row = input[i];
    const id = String(row?.clientMutationId || "");
    let ops = coalesceLabSidecarOps(Array.isArray(row.ops) ? row.ops : []);
    ops = filterCloudLabSidecarOps(ops);
    const before = Array.isArray(row.ops) ? row.ops.length : 0;
    removedOps += before - ops.length;
    if (!ops.length) {
      removedEntries += 1;
      continue;
    }
    next.push({ ...row, ops });
  }
  return { rows: next, removedOps, removedEntries };
}
function splitLabBackfillOutboxRows(rows) {
  const input = Array.isArray(rows) ? rows : [];
  const next = [];
  let splitOps = 0;
  for (let i = 0; i < input.length; i += 1) {
    const row = input[i];
    const id = String(row?.clientMutationId || "");
    if (id !== CLOUD_LAB_BACKFILL_MUTATION_ID) {
      next.push(row);
      continue;
    }
    const ops = Array.isArray(row.ops) ? row.ops : [];
    if (!ops.length) continue;
    const byPatient = {};
    for (let j = 0; j < ops.length; j += 1) {
      const op = ops[j];
      const path = String(op?.path || "");
      const parsed = parseCloudLabSidecarPath(path);
      if (!parsed) continue;
      const pid = parsed.patientId;
      if (!byPatient[pid]) byPatient[pid] = [];
      byPatient[pid].push(op);
    }
    const patientIds = Object.keys(byPatient);
    if (!patientIds.length) continue;
    splitOps += ops.length;
    for (let k = 0; k < patientIds.length; k += 1) {
      const pid = patientIds[k];
      const patientOps = byPatient[pid];
      if (!patientOps.length) continue;
      next.push({
        clientMutationId: `labSidecars/${pid}`,
        ops: patientOps,
        enqueuedAt: row.enqueuedAt,
        baseRevision: row.baseRevision
      });
    }
  }
  return { rows: next, splitOps };
}
function splitLabBackfillInOutbox(outbox) {
  if (!outbox || typeof outbox.list !== "function") return { splitOps: 0 };
  const result = splitLabBackfillOutboxRows(
    /** @type {Array<{ clientMutationId?: string, ops?: unknown[] }>} */
    outbox.list()
  );
  if (result.splitOps <= 0) return { splitOps: 0 };
  if (typeof outbox.replaceAll === "function") {
    outbox.replaceAll(result.rows);
  } else if (typeof outbox.clear === "function" && typeof outbox.enqueue === "function") {
    outbox.clear();
    for (let i = 0; i < result.rows.length; i += 1) {
      outbox.enqueue(result.rows[i]);
    }
  }
  return { splitOps: result.splitOps };
}
function pruneLabSidecarsFromOutbox(outbox) {
  if (!outbox || typeof outbox.list !== "function") {
    return { removedOps: 0, removedEntries: 0 };
  }
  const result = pruneLabSidecarOpsFromOutboxRows(
    /** @type {Array<{ clientMutationId?: string, ops?: unknown[] }>} */
    outbox.list()
  );
  if (typeof outbox.replaceAll === "function") {
    outbox.replaceAll(result.rows);
  } else if (typeof outbox.clear === "function" && typeof outbox.enqueue === "function") {
    outbox.clear();
    for (let i = 0; i < result.rows.length; i += 1) {
      outbox.enqueue(result.rows[i]);
    }
  }
  return { removedOps: result.removedOps, removedEntries: result.removedEntries };
}
function drainSyncedLabSidecarsFromOutbox(outbox) {
  if (!outbox || typeof outbox.list !== "function") {
    return { removedOps: 0, removedEntries: 0 };
  }
  const result = drainSyncedLabOpsFromOutboxRows(
    /** @type {Array<{ clientMutationId?: string, ops?: unknown[] }>} */
    outbox.list()
  );
  if (result.removedOps <= 0) return result;
  if (typeof outbox.replaceAll === "function") {
    outbox.replaceAll(result.rows);
  } else if (typeof outbox.clear === "function" && typeof outbox.enqueue === "function") {
    outbox.clear();
    for (let i = 0; i < result.rows.length; i += 1) {
      outbox.enqueue(result.rows[i]);
    }
  }
  return { removedOps: result.removedOps, removedEntries: result.removedEntries };
}
function prepareOutboxOpsForEnqueue(clientMutationId, ops) {
  let next = coalesceLabSidecarOps(Array.isArray(ops) ? ops : []);
  next = filterCloudLabSidecarOps(next);
  return next;
}

// public/js/features/cloud-sync/outbox-tombstones.mjs
function isTombstoneOutboxMutationId(clientMutationId) {
  const id = String(clientMutationId || "").trim();
  if (!id) return false;
  if (id === CLOUD_TOMBSTONES_MUTATION_ID) return true;
  return id.startsWith("tombstones/");
}
function buildCloudTombstoneOp(patientId, meta) {
  const pid = String(patientId || "").trim();
  const updatedAt = String(meta?.updatedAt || "").trim() || (/* @__PURE__ */ new Date()).toISOString();
  const actorId = String(meta?.actorId || "").trim() || "local";
  const registro = String(meta?.registro || "").trim();
  const value = { deletedAt: updatedAt };
  if (registro) value.registro = registro;
  return cloudOp({
    path: `tombstones/${pid}`,
    value,
    actorId,
    updatedAt
  });
}
function coalesceTombstoneOps(ops) {
  const byPath = /* @__PURE__ */ new Map();
  const list = Array.isArray(ops) ? ops : [];
  for (let i = 0; i < list.length; i += 1) {
    const op = list[i];
    const path = String(op && typeof op === "object" ? (
      /** @type {{ path?: string }} */
      op.path || ""
    ) : "");
    if (!path.startsWith("tombstones/")) continue;
    byPath.set(path, op);
  }
  return Array.from(byPath.values());
}
function partitionTombstoneRows(rows) {
  const other = [];
  const tombstoneRows = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (isTombstoneOutboxMutationId(row?.clientMutationId)) tombstoneRows.push(row);
    else other.push(row);
  }
  return { other, tombstoneRows };
}
function foldTombstoneRows(tombstoneRows) {
  const allOps = [];
  let enqueuedAt = Number.POSITIVE_INFINITY;
  let baseRevision = Number.POSITIVE_INFINITY;
  let hasBase = false;
  for (let i = 0; i < tombstoneRows.length; i += 1) {
    const row = tombstoneRows[i];
    const ops = Array.isArray(row.ops) ? row.ops : [];
    for (let j = 0; j < ops.length; j += 1) allOps.push(ops[j]);
    const at = Number(row.enqueuedAt);
    if (Number.isFinite(at) && at < enqueuedAt) enqueuedAt = at;
    if (row.baseRevision == null || !Number.isFinite(Number(row.baseRevision))) continue;
    hasBase = true;
    const br = Number(row.baseRevision);
    if (br < baseRevision) baseRevision = br;
  }
  return {
    ops: coalesceTombstoneOps(allOps),
    enqueuedAt: Number.isFinite(enqueuedAt) ? enqueuedAt : Date.now(),
    baseRevision: hasBase ? baseRevision : null
  };
}
function maybeDedupeSingleBatch(only, other) {
  if (String(only.clientMutationId || "") !== CLOUD_TOMBSTONES_MUTATION_ID) return null;
  const before = Array.isArray(only.ops) ? only.ops.length : 0;
  const ops = coalesceTombstoneOps(Array.isArray(only.ops) ? only.ops : []);
  if (ops.length === before) return { rows: null, merged: 0 };
  return { rows: other.concat([{ ...only, ops }]), merged: 1 };
}
function coalesceTombstoneOutboxRows(rows) {
  const input = Array.isArray(rows) ? rows : [];
  const { other, tombstoneRows } = partitionTombstoneRows(input);
  if (!tombstoneRows.length) return { rows: input, merged: 0 };
  if (tombstoneRows.length === 1) {
    const deduped = maybeDedupeSingleBatch(tombstoneRows[0], other);
    if (deduped) {
      if (!deduped.rows) return { rows: input, merged: 0 };
      return { rows: deduped.rows, merged: deduped.merged };
    }
  }
  const folded = foldTombstoneRows(tombstoneRows);
  if (!folded.ops.length) return { rows: other, merged: tombstoneRows.length };
  const merged = {
    clientMutationId: CLOUD_TOMBSTONES_MUTATION_ID,
    ops: folded.ops,
    enqueuedAt: folded.enqueuedAt
  };
  if (folded.baseRevision != null) merged.baseRevision = folded.baseRevision;
  return { rows: other.concat([merged]), merged: tombstoneRows.length };
}
function coalesceTombstonesInOutbox(outbox, listFn) {
  if (!outbox) return { merged: 0 };
  const read = typeof listFn === "function" ? listFn : outbox.list;
  if (typeof read !== "function") return { merged: 0 };
  const result = coalesceTombstoneOutboxRows(
    /** @type {Array<{ clientMutationId?: string, ops?: unknown[] }>} */
    read()
  );
  if (result.merged <= 0) return { merged: 0 };
  if (typeof outbox.replaceAll === "function") {
    outbox.replaceAll(result.rows);
  } else if (typeof outbox.clear === "function" && typeof outbox.enqueue === "function") {
    outbox.clear();
    for (let i = 0; i < result.rows.length; i += 1) {
      outbox.enqueue(result.rows[i]);
    }
  }
  return { merged: result.merged };
}
function withTombstoneCoalesce(outbox) {
  if (!outbox || typeof outbox.list !== "function") return outbox;
  const rawList = outbox.list.bind(outbox);
  return Object.assign(outbox, {
    list() {
      coalesceTombstonesInOutbox(outbox, rawList);
      return rawList();
    }
  });
}

// public/js/features/cloud-sync/mutate-bridge.mjs
function cloudPushDebounceMs() {
  return CLOUD_PUSH_DEBOUNCE_MS;
}
var bridgeRuntime = null;
function configureCloudMutateBridge(deps) {
  bridgeRuntime = deps;
}
function isCloudMutateBridgeConfigured() {
  return !!(bridgeRuntime && bridgeRuntime.outbox);
}
function resolveCloudActorId(meta) {
  const fromMeta = String(meta?.actorId || meta?.getActorId?.() || "").trim();
  if (fromMeta) return fromMeta;
  const fromBridge = String(bridgeRuntime?.getActorId?.() || "").trim();
  return fromBridge || "local";
}
function enqueueEntityOps(clientMutationId, ops) {
  if (!bridgeRuntime?.outbox || !ops.length) return;
  const id = String(clientMutationId || "").trim();
  if (!id) return;
  const prepared = prepareOutboxOpsForEnqueue(id, ops);
  if (!prepared.length) return;
  bridgeRuntime.outbox.enqueue({
    clientMutationId: id,
    ops: prepared,
    baseRevision: bridgeRuntime.getRevision?.() ?? 0
  });
  void bridgeRuntime.flush?.();
}
function enqueueCloudClinicalOpsValue(clinicalOps) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox || clinicalOps == null) return false;
  enqueueEntityOps("clinicalOps", [cloudOp({
    path: "clinicalOps",
    value: clinicalOps,
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  })]);
  return true;
}
function enqueueOps(ops) {
  enqueueEntityOps(CLOUD_BATCH_MUTATION_ID, ops);
}
var cloudPushTimer = null;
var tombstoneFlushTimer = null;
var cloudCensusRetryTimer = null;
var cloudCensusPushRetries = 0;
var initialCloudSeedScheduled = false;
var CLOUD_CENSUS_PUSH_MAX_RETRIES = 16;
function scheduleCloudCensusPushRetry() {
  if (cloudCensusPushRetries >= CLOUD_CENSUS_PUSH_MAX_RETRIES) return;
  cloudCensusPushRetries += 1;
  if (cloudCensusRetryTimer) clearTimeout(cloudCensusRetryTimer);
  cloudCensusRetryTimer = setTimeout(function() {
    cloudCensusRetryTimer = null;
    scheduleCloudSyncPush();
  }, 800);
}
function maybeScheduleCloudSyncPush() {
  if (!isCloudSyncActive()) return false;
  scheduleCloudSyncPush();
  return true;
}
function scheduleCloudSyncPush() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  bridgeRuntime.noteEditing?.();
  const delay = cloudPushTimer ? cloudPushDebounceMs() : CLOUD_PUSH_FIRST_MS;
  if (cloudPushTimer) clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(function() {
    cloudPushTimer = null;
    void pushCloudBundleOps();
  }, delay);
}
function scheduleTombstoneFlush() {
  if (!bridgeRuntime?.outbox) return;
  bridgeRuntime.noteEditing?.();
  const delay = tombstoneFlushTimer ? cloudPushDebounceMs() : CLOUD_PUSH_FIRST_MS;
  if (tombstoneFlushTimer) clearTimeout(tombstoneFlushTimer);
  tombstoneFlushTimer = setTimeout(function() {
    tombstoneFlushTimer = null;
    void bridgeRuntime?.flush?.();
  }, delay);
}
var CENSUS_SEED_CLOCK = "2000-01-01T00:00:00.000Z";
function ensureLiveCensusClocks(_nowIso) {
  for (let i = 0; i < patients.length; i += 1) {
    const patient = patients[i];
    if (!patient || typeof patient !== "object") continue;
    if (!String(patient.lanUpdatedAt || "").trim()) patient.lanUpdatedAt = CENSUS_SEED_CLOCK;
  }
}
async function enqueueCloudBundleOps() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return false;
  if (!getCloudSyncRoomId()) return false;
  try {
    const meta = {
      actorId: resolveCloudActorId(bridgeRuntime),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    ensureLiveCensusClocks(meta.updatedAt);
    const {
      collectPatientEntriesForCloudPush,
      collectTodosMapForCloudPush,
      collectAgendaForCloudPush
    } = await import("/mobile/js/chunks/cloud-census-collect-HBSILKCD.js");
    const entries = await collectPatientEntriesForCloudPush();
    const ops = mapBundleEnvelopeToOps(
      {
        entries,
        todos: collectTodosMapForCloudPush(),
        agenda: collectAgendaForCloudPush()
      },
      meta
    );
    const entryOps = countPatientEntryOps(ops);
    const otherOps = hasNonEntryCloudOps(ops);
    if (!entryOps && !otherOps && patients.length > 0) {
      if (cloudCensusPushRetries < CLOUD_CENSUS_PUSH_MAX_RETRIES) {
        scheduleCloudCensusPushRetry();
        return false;
      }
    } else {
      cloudCensusPushRetries = 0;
    }
    if (!ops.length) return false;
    enqueueOps(ops);
    return true;
  } catch (err) {
    console.warn("[R+] cloud census push:", err?.message || err);
    return false;
  }
}
async function pushCloudBundleOps() {
  await enqueueCloudBundleOps();
}
async function enqueueCloudLabSidecarsBackfill() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return false;
  if (!getCloudSyncRoomId()) return false;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const { collectPatientEntriesForCloudPush } = await import("/mobile/js/chunks/cloud-census-collect-HBSILKCD.js");
  const entries = await collectPatientEntriesForCloudPush();
  let enqueued = false;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const patientId = String(entry?.patient?.id || "").trim();
    if (!patientId) continue;
    const ops = buildDirtyLabSidecarOpsForPatient(
      patientId,
      Array.isArray(entry.labHistory) ? entry.labHistory : [],
      meta
    );
    if (!ops.length) continue;
    enqueueEntityOps(`labSidecars/${patientId}`, ops);
    enqueued = true;
  }
  return enqueued;
}
async function scheduleInitialCloudSeed() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox || !getCloudSyncRoomId()) return;
  if (initialCloudSeedScheduled) return;
  initialCloudSeedScheduled = true;
  await enqueueCloudBundleOps();
  await enqueueCloudLabSidecarsBackfill();
  await bridgeRuntime.flush?.();
}
async function pushCloudCensusNow() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) {
    return { ok: false, reason: "bridge_inactive" };
  }
  if (!getCloudSyncRoomId()) return { ok: false, reason: "no_room" };
  if (!patients.length) return { ok: false, reason: "no_local_patients" };
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  ensureLiveCensusClocks(meta.updatedAt);
  const { collectPatientEntriesForCloudPush } = await import("/mobile/js/chunks/cloud-census-collect-HBSILKCD.js");
  const entries = await collectPatientEntriesForCloudPush();
  const ops = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    ops.push(...mapPatientEntryToCloudBundleOps(entry, meta));
  }
  const entryOps = countPatientEntryOps(ops);
  if (!entryOps) {
    return {
      ok: false,
      reason: "no_entry_ops",
      localPatients: patients.length,
      collectedEntries: entries.length
    };
  }
  try {
    const { createCloudSyncApi } = await import("/mobile/js/chunks/api-client-AG6QZENB.js");
    const { pushCloudOpsDirect } = await import("/mobile/js/chunks/cloud-push-direct-B4EHUQJQ.js");
    const api = createCloudSyncApi({
      getBaseUrl: getCloudSyncUrl,
      getToken: getCloudSyncToken
    });
    const pushed = await pushCloudOpsDirect(
      api,
      getCloudSyncRoomId(),
      ops,
      getCloudSyncRevision,
      setCloudSyncRevision
    );
    return { ok: true, entryOps, totalOps: ops.length, pushed };
  } catch (err) {
    const message = err?.message || String(err);
    void import("/mobile/js/chunks/lab-sync-diagnostics-N2NF2HQL.js").then(function(labDiag) {
      labDiag.recordLabPushAttempt({ setCount: ops.length, ok: false, reason: message, totalOps: ops.length });
    }).catch(function() {
    });
    recordCloudSyncError({
      op: "census",
      code: "push_failed",
      message
    });
    return { ok: false, reason: "push_failed", message };
  }
}
async function pushCloudLabSidecarsNow() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) {
    return { ok: false, reason: "bridge_inactive" };
  }
  if (!getCloudSyncRoomId()) return { ok: false, reason: "no_room" };
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const { collectPatientEntriesForCloudPush } = await import("/mobile/js/chunks/cloud-census-collect-HBSILKCD.js");
  const entries = await collectPatientEntriesForCloudPush();
  const ops = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const patientId = String(entry?.patient?.id || "").trim();
    if (!patientId) continue;
    ops.push(
      ...buildDirtyLabSidecarOpsForPatient(
        patientId,
        Array.isArray(entry.labHistory) ? entry.labHistory : [],
        meta
      )
    );
  }
  if (!ops.length) return { ok: false, reason: "no_lab_ops" };
  try {
    const { createCloudSyncApi } = await import("/mobile/js/chunks/api-client-AG6QZENB.js");
    const { pushCloudOpsDirect } = await import("/mobile/js/chunks/cloud-push-direct-B4EHUQJQ.js");
    const api = createCloudSyncApi({
      getBaseUrl: getCloudSyncUrl,
      getToken: getCloudSyncToken
    });
    const pushed = await pushCloudOpsDirect(
      api,
      getCloudSyncRoomId(),
      ops,
      getCloudSyncRevision,
      setCloudSyncRevision
    );
    void import("/mobile/js/chunks/lab-sync-diagnostics-N2NF2HQL.js").then(function(labDiag) {
      labDiag.recordLabPushAttempt({
        setCount: ops.length,
        ok: true,
        totalOps: ops.length
      });
    });
    return { ok: true, labOps: ops.length, totalOps: ops.length, pushed };
  } catch (err) {
    const message = err?.message || String(err);
    void import("/mobile/js/chunks/lab-sync-diagnostics-N2NF2HQL.js").then(function(labDiag) {
      labDiag.recordLabPushAttempt({
        setCount: ops.length,
        ok: false,
        reason: message,
        totalOps: ops.length
      });
    });
    recordCloudSyncError({
      op: "labSidecars",
      code: "push_failed",
      message
    });
    return { ok: false, reason: "push_failed", message };
  }
}
function enqueueCloudTodoUpsert(patientId, todo) {
  if (!isCloudSyncActive() || !todo?.id || !bridgeRuntime?.outbox) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(todo.updatedAt || (/* @__PURE__ */ new Date()).toISOString())
  };
  const row = stampCloudTodoRow(patientId, todo, patients);
  enqueueEntityOps(`todos/${todo.id}`, [cloudOp({ path: `todos/${todo.id}`, value: row, ...meta })]);
}
function enqueueCloudTodoDelete(patientId, todoRef, updatedAt) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  const todo = todoRef && typeof todoRef === "object" ? todoRef : { id: todoRef };
  const eid = String(todo.id || "").trim();
  if (!eid) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(updatedAt || (/* @__PURE__ */ new Date()).toISOString())
  };
  const pid = String(patientId || "").trim();
  const registro = registroForPatientId(patients, pid);
  const tomb = { id: eid, patientId: pid, _deleted: true, updatedAt: meta.updatedAt };
  if (registro) tomb.registro = registro;
  enqueueEntityOps(`todos/${eid}`, [
    cloudOp({
      path: `todos/${eid}`,
      value: tomb,
      ...meta
    })
  ]);
}
function enqueueCloudAgendaUpsert(eventObj) {
  if (!isCloudSyncActive() || !eventObj?.id || !bridgeRuntime?.outbox) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(eventObj.updatedAt || (/* @__PURE__ */ new Date()).toISOString())
  };
  enqueueEntityOps(`agenda/${eventObj.id}`, [
    cloudOp({ path: `agenda/${eventObj.id}`, value: eventObj, ...meta })
  ]);
}
function enqueueCloudAgendaDelete(id, updatedAt) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  const eid = String(id || "").trim();
  if (!eid) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(updatedAt || (/* @__PURE__ */ new Date()).toISOString())
  };
  enqueueEntityOps(`agenda/${eid}`, [
    cloudOp({
      path: `agenda/${eid}`,
      value: { id: eid, _deleted: true, updatedAt: meta.updatedAt },
      ...meta
    })
  ]);
}
function enqueueCloudLabSidecarsForPatient(patientId) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  const pid = String(patientId || "").trim();
  if (!pid || pid.indexOf("demo-") === 0) return;
  const labs = Array.isArray(labHistory[pid]) ? labHistory[pid] : [];
  if (!labs.length) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const ops = buildDirtyLabSidecarOpsForPatient(pid, labs, meta);
  if (!ops.length) return;
  enqueueEntityOps(`labSidecars/${pid}`, ops);
  void import("/mobile/js/chunks/lab-sync-diagnostics-N2NF2HQL.js").then(function(labDiag) {
    labDiag.recordLabPushAttempt({
      patientId: pid,
      setCount: labs.length,
      ok: true,
      totalOps: ops.length
    });
  });
}
function enqueueCloudPatientAdmit(patient) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox || !patient?.id) return;
  const pid = String(patient.id).trim();
  if (!pid || pid.indexOf("demo-") === 0) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(patient.lanUpdatedAt || (/* @__PURE__ */ new Date()).toISOString())
  };
  const ops = [];
  pushCensusFieldsOp(ops, pid, patient, meta.actorId);
  const registro = String(patient.registro || "").trim();
  if (registro) {
    ops.push(
      cloudOp({
        path: `entries/${pid}`,
        value: { id: pid, registro },
        ...meta
      })
    );
  }
  if (!ops.length) return;
  enqueueOps(ops);
  scheduleCloudSyncPush();
}
function enqueueCloudPatientDelete(patient) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox || !patient?.id) return;
  const pid = String(patient.id).trim();
  if (!pid || pid.indexOf("demo-") === 0) return;
  const prepared = buildMergedTombstoneOps(pid, patient.registro || "");
  if (!prepared) return;
  bridgeRuntime.outbox.enqueue(prepared);
  scheduleTombstoneFlush();
}
function buildMergedTombstoneOps(pid, registro) {
  const outbox = bridgeRuntime?.outbox;
  if (!outbox) return null;
  const existing = findCloudTombstonesEntry(outbox);
  const ops = coalesceTombstoneOps([
    ...Array.isArray(existing?.ops) ? existing.ops : [],
    buildCloudTombstoneOp(pid, {
      registro,
      actorId: resolveCloudActorId(bridgeRuntime),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    })
  ]);
  const prepared = prepareOutboxOpsForEnqueue(CLOUD_TOMBSTONES_MUTATION_ID, ops);
  if (!prepared.length) return null;
  return {
    clientMutationId: CLOUD_TOMBSTONES_MUTATION_ID,
    ops: prepared,
    baseRevision: existing?.baseRevision != null ? Number(existing.baseRevision) : bridgeRuntime.getRevision?.() ?? 0,
    ...existing?.enqueuedAt != null ? { enqueuedAt: Number(existing.enqueuedAt) } : {}
  };
}
function findCloudTombstonesEntry(outbox) {
  const rows = outbox.list();
  for (let i = 0; i < rows.length; i += 1) {
    if (String(rows[i]?.clientMutationId || "") === CLOUD_TOMBSTONES_MUTATION_ID) return rows[i];
  }
  return null;
}
function enqueueInternoAccessUpsert(row) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox || !row?.sala) return false;
  const op = buildInternoAccessUpsertOp(row);
  enqueueEntityOps(internoAccessMutationId(row), [op]);
  void bridgeRuntime.flush?.();
  return true;
}

// public/js/features/cloud-sync/mutate-bridge-clinical-ops.mjs
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
async function snapshotClinicalOpsForCloud() {
  try {
    const sala = String(getCloudSyncRoomSnapshot()?.sala || "").trim();
    const api = dbApi();
    if (sala && api && typeof api.dbClinicalOpsExport === "function") {
      const res = await api.dbClinicalOpsExport({ sala });
      if (res?.snapshot) return res.snapshot;
    }
    if (isClinicalOpsLanAvailable()) await prepareClinicalOpsForLanSync();
    return getCachedClinicalOpsSnapshot();
  } catch {
    return null;
  }
}
async function pushCloudClinicalOpsNow() {
  if (!isCloudSyncActive()) return { ok: false, reason: "bridge_inactive" };
  const { pushClinicalOpsForSalas, listLocalTeamSalas, pushClinicalOpsForSala } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-VJALSVZ3.js");
  const salas = await listLocalTeamSalas();
  if (salas.length) {
    return pushClinicalOpsForSalas(salas);
  }
  const sala = String(getCloudSyncRoomSnapshot()?.sala || "").trim();
  if (sala) return pushClinicalOpsForSala(sala);
  const clinicalOps = await snapshotClinicalOpsForCloud();
  if (clinicalOps == null) return { ok: false, reason: "no_snapshot" };
  if (!enqueueCloudClinicalOpsValue(clinicalOps)) {
    return { ok: false, reason: "bridge_inactive" };
  }
  return { ok: true };
}

export {
  splitLabBackfillInOutbox,
  pruneLabSidecarsFromOutbox,
  drainSyncedLabSidecarsFromOutbox,
  withTombstoneCoalesce,
  snapshotClinicalOpsForCloud,
  pushCloudClinicalOpsNow,
  configureCloudMutateBridge,
  isCloudMutateBridgeConfigured,
  resolveCloudActorId,
  enqueueCloudClinicalOpsValue,
  maybeScheduleCloudSyncPush,
  scheduleCloudSyncPush,
  enqueueCloudLabSidecarsBackfill,
  scheduleInitialCloudSeed,
  pushCloudCensusNow,
  pushCloudLabSidecarsNow,
  enqueueCloudTodoUpsert,
  enqueueCloudTodoDelete,
  enqueueCloudAgendaUpsert,
  enqueueCloudAgendaDelete,
  enqueueCloudLabSidecarsForPatient,
  enqueueCloudPatientAdmit,
  enqueueCloudPatientDelete,
  enqueueInternoAccessUpsert
};
//# sourceMappingURL=/js/chunks/chunk-OGX35Y32.js.map
