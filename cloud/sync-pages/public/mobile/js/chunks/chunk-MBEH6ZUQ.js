import {
  CLOUD_BATCH_MUTATION_ID,
  slimLabSetForCloud
} from "/mobile/js/chunks/chunk-LYZOIXV3.js";
import {
  labSetTimestamp,
  monitoreoUpdatedAt,
  patients
} from "/mobile/js/chunks/chunk-JZ2SPQIK.js";
import {
  getCachedClinicalOpsSnapshot,
  isClinicalOpsLanAvailable,
  prepareClinicalOpsForLanSync
} from "/mobile/js/chunks/chunk-IAZG4W3U.js";
import {
  lanNetworkProfile
} from "/mobile/js/chunks/chunk-WVOQEB7T.js";
import {
  isCloudSyncActive
} from "/mobile/js/chunks/chunk-6VYBWSQE.js";
import {
  getCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRevision
} from "/mobile/js/chunks/chunk-BRT2MMPP.js";

// public/js/features/cloud-sync/cloud-sync-timing.mjs
var CLOUD_POLL_IDLE_MS = 45e3;
var CLOUD_POLL_MOBILE_IDLE_MS = 3e4;
var CLOUD_POLL_ACTIVE_MS = 2e4;
var CLOUD_POLL_ACTIVE_WINDOW_MS = 9e4;
var CLOUD_POLL_ERROR_MIN_MS = 3e4;
var CLOUD_POLL_ERROR_MAX_MS = 5 * 6e4;
var CLOUD_PUSH_DEBOUNCE_MS = 3e3;
var CLOUD_PUSH_DEBOUNCE_SLOW_MS = 5e3;
function nextCloudPollDelayMs(opts = {}) {
  const now = opts.now ?? Date.now();
  const streak = Math.max(0, Number(opts.errorStreak) || 0);
  if (opts.errored || streak > 0) {
    const exp = Math.min(
      CLOUD_POLL_ERROR_MAX_MS,
      CLOUD_POLL_ERROR_MIN_MS * Math.pow(2, Math.min(streak - 1, 4))
    );
    return exp;
  }
  const lastWrite = Number(opts.lastLocalWriteAt) || 0;
  if (opts.pending || lastWrite && now - lastWrite < CLOUD_POLL_ACTIVE_WINDOW_MS) {
    return CLOUD_POLL_ACTIVE_MS;
  }
  if (opts.mobile) {
    return CLOUD_POLL_MOBILE_IDLE_MS;
  }
  return CLOUD_POLL_IDLE_MS;
}
function isCloudRateLimitError(err) {
  const status = Number(err && typeof err === "object" ? err.status : 0);
  if (status === 429) return true;
  const msg = String(
    err && typeof err === "object" && (err.data?.message || err.message) || ""
  );
  return /rate.?limit|too many|429|demasiados intentos/i.test(msg);
}
function retryAfterMsFromError(err, fallbackMs = CLOUD_POLL_ERROR_MIN_MS) {
  const headers = err && typeof err === "object" ? err.retryAfterMs : null;
  if (Number.isFinite(headers) && headers > 0) return Math.min(CLOUD_POLL_ERROR_MAX_MS, Number(headers));
  const ra = err && typeof err === "object" ? err.data?.retry_after : null;
  if (Number.isFinite(Number(ra))) {
    const sec = Number(ra);
    return Math.min(CLOUD_POLL_ERROR_MAX_MS, Math.max(CLOUD_POLL_ERROR_MIN_MS, sec * 1e3));
  }
  return fallbackMs;
}

// public/js/features/cloud-sync/mutate-bridge.mjs
function cloudPushDebounceMs() {
  return lanNetworkProfile.getNetworkProfile() === "slow" ? CLOUD_PUSH_DEBOUNCE_SLOW_MS : CLOUD_PUSH_DEBOUNCE_MS;
}
var FIELD_SKIP = /* @__PURE__ */ new Set(["historiaClinica", "id", "monitoreo", "eventualidades"]);
function noteOpUpdatedAt(note, fallback) {
  if (!note || typeof note !== "object") return fallback;
  const row = note;
  const at = String(row.updatedAt || row.savedAt || "").trim();
  return at || fallback;
}
function fieldsOpUpdatedAt(patient) {
  return String(patient?.lanUpdatedAt || "").trim();
}
function monitoreoOpUpdatedAt(monitoreo) {
  return String(monitoreoUpdatedAt(monitoreo) || "").trim();
}
function historiaOpUpdatedAt(hc, fallback) {
  if (!hc || typeof hc !== "object") return fallback;
  const row = hc;
  const at = String(row.data?.meta?.updatedAt || row.updatedAt || "").trim();
  return at || fallback;
}
function eventualidadesOpUpdatedAt(ev, fallback) {
  if (!ev || typeof ev !== "object") return fallback;
  const row = ev;
  const at = String(row.updatedAt || "").trim();
  return at || fallback;
}
var bridgeRuntime = null;
function configureCloudMutateBridge(deps) {
  bridgeRuntime = deps;
}
function resolveCloudActorId(meta) {
  const fromMeta = String(meta?.actorId || meta?.getActorId?.() || "").trim();
  if (fromMeta) return fromMeta;
  const fromBridge = String(bridgeRuntime?.getActorId?.() || "").trim();
  return fromBridge || "local";
}
function labSetId(set, index) {
  const row = set && typeof set === "object" ? set : {};
  return String(row.id || row.fecha || `idx-${index}`).trim();
}
function pickCensusFields(patient) {
  const out = {};
  for (const [key, value] of Object.entries(patient || {})) {
    if (FIELD_SKIP.has(key) || value === void 0) continue;
    out[key] = value;
  }
  return out;
}
function cloudOp(fields) {
  return {
    path: fields.path,
    value: fields.value,
    updatedAt: fields.updatedAt,
    actorId: fields.actorId
  };
}
function pushCensusFieldsOp(ops, patientId, patient, actorId) {
  const fieldsAt = fieldsOpUpdatedAt(patient);
  const fields = pickCensusFields(patient);
  if (!fieldsAt || !Object.keys(fields).length) return;
  ops.push(
    cloudOp({
      path: `entries/${patientId}/fields`,
      value: fields,
      actorId,
      updatedAt: fieldsAt
    })
  );
}
function pushCloudLiveClinicalOps(ops, patientId, patient, actorId, batchAt) {
  const monAt = monitoreoOpUpdatedAt(patient.monitoreo);
  if (monAt && patient.monitoreo) {
    ops.push(
      cloudOp({
        path: `entries/${patientId}/monitoreo`,
        value: patient.monitoreo,
        actorId,
        updatedAt: monAt
      })
    );
  }
  if (patient.eventualidades) {
    ops.push(
      cloudOp({
        path: `entries/${patientId}/eventualidades`,
        value: patient.eventualidades,
        actorId,
        updatedAt: eventualidadesOpUpdatedAt(patient.eventualidades, batchAt)
      })
    );
  }
}
function pushClinicalBlockOps(ops, patientId, patient, actorId, batchAt) {
  pushCloudLiveClinicalOps(ops, patientId, patient, actorId, batchAt);
  if (patient.historiaClinica) {
    ops.push(
      cloudOp({
        path: `entries/${patientId}/historiaClinica`,
        value: patient.historiaClinica,
        actorId,
        updatedAt: historiaOpUpdatedAt(patient.historiaClinica, batchAt)
      })
    );
  }
}
function pushDocOps(ops, patientId, entry, actorId, batchAt) {
  ops.push(
    cloudOp({
      path: `entries/${patientId}/note`,
      value: entry.note || {},
      actorId,
      updatedAt: noteOpUpdatedAt(entry.note, batchAt)
    })
  );
  ops.push(
    cloudOp({
      path: `entries/${patientId}/indicaciones`,
      value: entry.indicaciones || {},
      actorId,
      updatedAt: noteOpUpdatedAt(entry.indicaciones, batchAt)
    })
  );
}
function pushLabSidecarOps(ops, patientId, labs, actorId, batchAt) {
  for (let i = 0; i < labs.length; i += 1) {
    const setId = labSetId(labs[i], i);
    if (!setId) continue;
    const labAt = String(labSetTimestamp(labs[i]) || "").trim() || batchAt;
    ops.push(
      cloudOp({
        path: `labSidecars/${patientId}/${setId}`,
        value: slimLabSetForCloud(labs[i]),
        actorId,
        updatedAt: labAt
      })
    );
  }
}
function mapPatientEntryToOps(entry, meta) {
  if (!entry?.patient?.id) return [];
  const patientId = String(entry.patient.id).trim();
  if (!patientId || patientId.indexOf("demo-") === 0) return [];
  const actorId = meta.actorId;
  const batchAt = meta.updatedAt;
  const ops = [];
  pushCensusFieldsOp(ops, patientId, entry.patient, actorId);
  pushClinicalBlockOps(ops, patientId, entry.patient, actorId, batchAt);
  pushDocOps(ops, patientId, entry, actorId, batchAt);
  const labs = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  pushLabSidecarOps(ops, patientId, labs, actorId, batchAt);
  return ops;
}
function mapPatientEntryToCensusSeedOps(entry, meta) {
  if (!entry?.patient?.id) return [];
  const patientId = String(entry.patient.id).trim();
  if (!patientId || patientId.indexOf("demo-") === 0) return [];
  const ops = [];
  pushCensusFieldsOp(ops, patientId, entry.patient, meta.actorId);
  return ops;
}
function mapPatientEntryToCloudBundleOps(entry, meta) {
  if (!entry?.patient?.id) return [];
  const patientId = String(entry.patient.id).trim();
  if (!patientId || patientId.indexOf("demo-") === 0) return [];
  const ops = [];
  pushCensusFieldsOp(ops, patientId, entry.patient, meta.actorId);
  pushCloudLiveClinicalOps(ops, patientId, entry.patient, meta.actorId, meta.updatedAt);
  return ops;
}
function mapBundleTodosToOps(bundle, meta) {
  const ops = [];
  const todos = bundle.todos && typeof bundle.todos === "object" ? bundle.todos : {};
  for (const pid of Object.keys(todos)) {
    const list = Array.isArray(todos[pid]) ? todos[pid] : [];
    for (let j = 0; j < list.length; j += 1) {
      const todo = list[j];
      if (!todo?.id) continue;
      ops.push(cloudOp({ path: `todos/${todo.id}`, value: todo, ...meta }));
    }
  }
  return ops;
}
function mapBundleAgendaToOps(bundle, meta) {
  const ops = [];
  const agenda = Array.isArray(bundle.agenda) ? bundle.agenda : [];
  for (let k = 0; k < agenda.length; k += 1) {
    const item = agenda[k];
    if (!item?.id) continue;
    ops.push(cloudOp({ path: `agenda/${item.id}`, value: item, ...meta }));
  }
  return ops;
}
function mapBundleEnvelopeToOps(bundle, meta) {
  if (!bundle) return [];
  const ops = [];
  const entries = Array.isArray(bundle.entries) ? bundle.entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    ops.push(...mapPatientEntryToCloudBundleOps(entries[i], meta));
  }
  ops.push(...mapBundleTodosToOps(bundle, meta));
  ops.push(...mapBundleAgendaToOps(bundle, meta));
  if (bundle.clinicalOps != null) {
    ops.push(cloudOp({ path: "clinicalOps", value: bundle.clinicalOps, ...meta }));
  }
  return ops;
}
function enqueueEntityOps(clientMutationId, ops) {
  if (!bridgeRuntime?.outbox || !ops.length) return;
  const id = String(clientMutationId || "").trim();
  if (!id) return;
  bridgeRuntime.outbox.enqueue({
    clientMutationId: id,
    ops,
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
var cloudCensusRetryTimer = null;
var cloudCensusPushRetries = 0;
var CLOUD_CENSUS_PUSH_MAX_RETRIES = 16;
if (typeof document !== "undefined" && !globalThis.__RPC_CLOUD_CENSUS_PUSH_LISTENER__) {
  globalThis.__RPC_CLOUD_CENSUS_PUSH_LISTENER__ = true;
  document.addEventListener("rpc-clinical-ops-synced", function() {
    if (isCloudSyncActive()) scheduleCloudSyncPush();
  });
}
function countPatientEntryOps(ops) {
  let count = 0;
  for (let i = 0; i < ops.length; i += 1) {
    if (String(ops[i]?.path || "").startsWith("entries/")) count += 1;
  }
  return count;
}
function hasNonEntryCloudOps(ops) {
  for (let i = 0; i < ops.length; i += 1) {
    const path = String(ops[i]?.path || "");
    if (!path.startsWith("entries/")) return true;
  }
  return false;
}
function scheduleCloudCensusPushRetry() {
  if (cloudCensusPushRetries >= CLOUD_CENSUS_PUSH_MAX_RETRIES) return;
  cloudCensusPushRetries += 1;
  if (cloudCensusRetryTimer) clearTimeout(cloudCensusRetryTimer);
  cloudCensusRetryTimer = setTimeout(function() {
    cloudCensusRetryTimer = null;
    scheduleCloudSyncPush();
  }, 1500);
}
function maybeScheduleCloudSyncPush() {
  if (!isCloudSyncActive()) return false;
  scheduleCloudSyncPush();
  return true;
}
function scheduleCloudSyncPush() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  if (cloudPushTimer) clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(function() {
    cloudPushTimer = null;
    void pushCloudBundleOps();
  }, cloudPushDebounceMs());
}
function ensureLiveCensusClocks(nowIso) {
  for (let i = 0; i < patients.length; i += 1) {
    const patient = patients[i];
    if (!patient || typeof patient !== "object") continue;
    if (!String(patient.lanUpdatedAt || "").trim()) patient.lanUpdatedAt = nowIso;
  }
}
async function pushCloudBundleOps() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  if (!getCloudSyncRoomId()) return;
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
    } = await import("/mobile/js/chunks/cloud-census-collect-36WASPPX.js");
    const { snapshotClinicalOpsForCloud: snapshotClinicalOpsForCloud2 } = await import("/mobile/js/chunks/mutate-bridge-clinical-ops-XFBLZVPU.js");
    const entries = await collectPatientEntriesForCloudPush();
    const clinicalOps = await snapshotClinicalOpsForCloud2();
    const ops = mapBundleEnvelopeToOps(
      {
        entries,
        todos: collectTodosMapForCloudPush(),
        agenda: collectAgendaForCloudPush(),
        clinicalOps
      },
      meta
    );
    const entryOps = countPatientEntryOps(ops);
    const otherOps = hasNonEntryCloudOps(ops);
    if (!entryOps && !otherOps && patients.length > 0) {
      if (cloudCensusPushRetries < CLOUD_CENSUS_PUSH_MAX_RETRIES) {
        scheduleCloudCensusPushRetry();
        return;
      }
    } else {
      cloudCensusPushRetries = 0;
    }
    if (!ops.length) return;
    enqueueOps(ops);
  } catch (err) {
    console.warn("[R+] cloud census push:", err?.message || err);
  }
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
  const { collectPatientEntriesForCloudPush } = await import("/mobile/js/chunks/cloud-census-collect-36WASPPX.js");
  const entries = await collectPatientEntriesForCloudPush();
  const ops = [];
  for (let i = 0; i < entries.length; i += 1) {
    ops.push(...mapPatientEntryToCloudBundleOps(entries[i], meta));
  }
  const { snapshotClinicalOpsForCloud: snapshotClinicalOpsForCloud2 } = await import("/mobile/js/chunks/mutate-bridge-clinical-ops-XFBLZVPU.js");
  const clinicalOps = await snapshotClinicalOpsForCloud2();
  if (clinicalOps != null) {
    ops.push(cloudOp({ path: "clinicalOps", value: clinicalOps, ...meta }));
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
    const { createCloudSyncApi } = await import("/mobile/js/chunks/api-client-OD2WW23Z.js");
    const { pushCloudOpsDirect } = await import("/mobile/js/chunks/cloud-push-direct-FDSISAMZ.js");
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
    return { ok: false, reason: "push_failed", message: err?.message || String(err) };
  }
}
function enqueueCloudTodoUpsert(patientId, todo) {
  if (!isCloudSyncActive() || !todo?.id || !bridgeRuntime?.outbox) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(todo.updatedAt || (/* @__PURE__ */ new Date()).toISOString())
  };
  const row = { ...todo, patientId: String(patientId || todo.patientId || "").trim() };
  enqueueEntityOps(`todos/${todo.id}`, [cloudOp({ path: `todos/${todo.id}`, value: row, ...meta })]);
}
function enqueueCloudTodoDelete(patientId, todoRef, updatedAt) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  const todo = todoRef && typeof todoRef === "object" ? todoRef : { id: todoRef };
  const eid = String(todo.id || "").trim();
  if (!eid) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(updatedAt || todo.updatedAt || (/* @__PURE__ */ new Date()).toISOString())
  };
  enqueueEntityOps(`todos/${eid}`, [
    cloudOp({
      path: `todos/${eid}`,
      value: { id: eid, patientId, _deleted: true, updatedAt: meta.updatedAt },
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
function enqueueCloudPatientDelete(patient) {
  if (!isCloudSyncActive() || !patient?.id || !bridgeRuntime?.outbox) return;
  if (String(patient.id).indexOf("demo-") === 0) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  enqueueEntityOps(`tombstones/${patient.id}`, [
    cloudOp({
      path: `tombstones/${patient.id}`,
      value: { registro: patient.registro || "", deletedAt: meta.updatedAt },
      ...meta
    })
  ]);
}

// public/js/features/cloud-sync/mutate-bridge-clinical-ops.mjs
async function snapshotClinicalOpsForCloud() {
  try {
    if (isClinicalOpsLanAvailable()) await prepareClinicalOpsForLanSync();
    return getCachedClinicalOpsSnapshot();
  } catch {
    return null;
  }
}
async function pushCloudClinicalOpsNow() {
  if (!isCloudSyncActive()) return { ok: false, reason: "bridge_inactive" };
  const clinicalOps = await snapshotClinicalOpsForCloud();
  if (clinicalOps == null) return { ok: false, reason: "no_snapshot" };
  if (!enqueueCloudClinicalOpsValue(clinicalOps)) {
    return { ok: false, reason: "bridge_inactive" };
  }
  return { ok: true };
}

export {
  nextCloudPollDelayMs,
  isCloudRateLimitError,
  retryAfterMsFromError,
  snapshotClinicalOpsForCloud,
  pushCloudClinicalOpsNow,
  configureCloudMutateBridge,
  resolveCloudActorId,
  labSetId,
  pickCensusFields,
  mapPatientEntryToOps,
  mapPatientEntryToCensusSeedOps,
  mapPatientEntryToCloudBundleOps,
  mapBundleEnvelopeToOps,
  enqueueCloudClinicalOpsValue,
  maybeScheduleCloudSyncPush,
  scheduleCloudSyncPush,
  pushCloudCensusNow,
  enqueueCloudTodoUpsert,
  enqueueCloudTodoDelete,
  enqueueCloudAgendaUpsert,
  enqueueCloudAgendaDelete,
  enqueueCloudPatientDelete
};
//# sourceMappingURL=/js/chunks/chunk-MBEH6ZUQ.js.map
