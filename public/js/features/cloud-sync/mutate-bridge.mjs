/**
 * Cloud sync mutation bridge — maps local clinical state to worker LWW ops.
 */
import { isCloudSyncActive } from './lan-override.mjs';
import {
  getCloudSyncRoomId,
  getCloudSyncRevision,
  setCloudSyncRevision,
  getCloudSyncUrl,
  getCloudSyncToken,
} from './settings.mjs';
import { lanNetworkProfile } from '../../lan-network-profile.mjs';
import { CLOUD_PUSH_DEBOUNCE_MS, CLOUD_PUSH_DEBOUNCE_SLOW_MS } from './cloud-sync-timing.mjs';
import { patients } from '../../app-state.mjs';
import { CLOUD_BATCH_MUTATION_ID } from './constants.mjs';
import { recordCloudSyncError } from './cloud-sync-diagnostics.mjs';
import {
  cloudOp,
  countPatientEntryOps,
  hasNonEntryCloudOps,
  mapBundleEnvelopeToOps,
  mapPatientEntryToCloudBundleOps,
  pushCensusFieldsOp,
  labSetId,
  pickCensusFields,
  mapPatientEntryToOps,
  mapPatientEntryToCensusSeedOps,
} from './mutate-bridge-ops.mjs';

export { CLOUD_BATCH_MUTATION_ID };
export { pushCloudClinicalOpsNow } from './mutate-bridge-clinical-ops.mjs';
export {
  labSetId,
  pickCensusFields,
  mapPatientEntryToOps,
  mapPatientEntryToCensusSeedOps,
  mapPatientEntryToCloudBundleOps,
  mapBundleEnvelopeToOps,
};

function cloudPushDebounceMs() {
  return lanNetworkProfile.getNetworkProfile() === 'slow'
    ? CLOUD_PUSH_DEBOUNCE_SLOW_MS
    : CLOUD_PUSH_DEBOUNCE_MS;
}

/** @type {{ outbox?: import('./outbox.mjs').createOutbox extends (...args: any) => infer R ? R : never, getRevision?: () => number, flush?: () => void | Promise<void>, getActorId?: () => string } | null} */
let bridgeRuntime = null;

/** @param {NonNullable<typeof bridgeRuntime>} deps */
export function configureCloudMutateBridge(deps) {
  bridgeRuntime = deps;
}

export function isCloudMutateBridgeConfigured() {
  return !!(bridgeRuntime && bridgeRuntime.outbox);
}

/** @param {{ actorId?: string, getActorId?: () => string }} [meta] */
export function resolveCloudActorId(meta) {
  const fromMeta = String(meta?.actorId || meta?.getActorId?.() || '').trim();
  if (fromMeta) return fromMeta;
  const fromBridge = String(bridgeRuntime?.getActorId?.() || '').trim();
  return fromBridge || 'local';
}

/**
 * @param {string} clientMutationId
 * @param {import('./mutate-bridge-ops.mjs').CloudSyncOp[]} ops
 */
function enqueueEntityOps(clientMutationId, ops) {
  if (!bridgeRuntime?.outbox || !ops.length) return;
  const id = String(clientMutationId || '').trim();
  if (!id) return;
  bridgeRuntime.outbox.enqueue({
    clientMutationId: id,
    ops,
    baseRevision: bridgeRuntime.getRevision?.() ?? 0,
  });
  void bridgeRuntime.flush?.();
}

/** @param {unknown} clinicalOps @returns {boolean} */
export function enqueueCloudClinicalOpsValue(clinicalOps) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox || clinicalOps == null) return false;
  enqueueEntityOps('clinicalOps', [cloudOp({
    path: 'clinicalOps',
    value: clinicalOps,
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: new Date().toISOString(),
  })]);
  return true;
}

/** @param {import('./mutate-bridge-ops.mjs').CloudSyncOp[]} ops */
function enqueueOps(ops) {
  enqueueEntityOps(CLOUD_BATCH_MUTATION_ID, ops);
}

/** @type {ReturnType<typeof setTimeout> | null} */
let cloudPushTimer = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let cloudCensusRetryTimer = null;

let cloudCensusPushRetries = 0;

const CLOUD_CENSUS_PUSH_MAX_RETRIES = 16;

// Do not echo-push census on rpc-clinical-ops-synced — that re-stamped clinicalOps/census
// after every pull merge and could hide charts when the sidebar re-filtered by team.

function scheduleCloudCensusPushRetry() {
  if (cloudCensusPushRetries >= CLOUD_CENSUS_PUSH_MAX_RETRIES) return;
  cloudCensusPushRetries += 1;
  if (cloudCensusRetryTimer) clearTimeout(cloudCensusRetryTimer);
  cloudCensusRetryTimer = setTimeout(function () {
    cloudCensusRetryTimer = null;
    scheduleCloudSyncPush();
  }, 1500);
}

/** @returns {boolean} true when cloud path handled */
export function maybeScheduleCloudSyncPush() {
  if (!isCloudSyncActive()) return false;
  scheduleCloudSyncPush();
  return true;
}

export function scheduleCloudSyncPush() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  if (cloudPushTimer) clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(function () {
    cloudPushTimer = null;
    void pushCloudBundleOps();
  }, cloudPushDebounceMs());
}

/**
 * Floor clock for patients that never got a real edit — lets empty-room seed emit
 * `fields` without beating a peer who typed a real nombre (was Date.now() before).
 */
const CENSUS_SEED_CLOCK = '2000-01-01T00:00:00.000Z';

/**
 * One-time census clock on live patients so empty-room seed can emit `fields`.
 * Must mutate `patients` (buildPatientEntry shallow-copies) so later pushes reuse the same clock.
 */
function ensureLiveCensusClocks(_nowIso) {
  for (let i = 0; i < patients.length; i += 1) {
    const patient = patients[i];
    if (!patient || typeof patient !== 'object') continue;
    if (!String(patient.lanUpdatedAt || '').trim()) patient.lanUpdatedAt = CENSUS_SEED_CLOCK;
  }
}

async function pushCloudBundleOps() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  if (!getCloudSyncRoomId()) return;
  try {
    const meta = {
      actorId: resolveCloudActorId(bridgeRuntime),
      updatedAt: new Date().toISOString(),
    };
    ensureLiveCensusClocks(meta.updatedAt);
    const {
      collectPatientEntriesForCloudPush,
      collectTodosMapForCloudPush,
      collectAgendaForCloudPush,
    } = await import('./cloud-census-collect.mjs');
    const entries = await collectPatientEntriesForCloudPush();
    const ops = mapBundleEnvelopeToOps(
      {
        entries,
        todos: collectTodosMapForCloudPush(),
        agenda: collectAgendaForCloudPush(),
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
    console.warn('[R+] cloud census push:', err?.message || err);
  }
}

/** Direct census seed — bypasses LAN bundle timing; used on desktop boot / ⇄ connect. */
export async function pushCloudCensusNow() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) {
    return { ok: false, reason: 'bridge_inactive' };
  }
  if (!getCloudSyncRoomId()) return { ok: false, reason: 'no_room' };
  if (!patients.length) return { ok: false, reason: 'no_local_patients' };

  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: new Date().toISOString(),
  };
  ensureLiveCensusClocks(meta.updatedAt);

  const { collectPatientEntriesForCloudPush } = await import('./cloud-census-collect.mjs');
  const entries = await collectPatientEntriesForCloudPush();
  /** @type {import('./mutate-bridge-ops.mjs').CloudSyncOp[]} */
  const ops = [];
  for (let i = 0; i < entries.length; i += 1) {
    ops.push(...mapPatientEntryToCloudBundleOps(entries[i], meta));
  }

  const entryOps = countPatientEntryOps(ops);
  if (!entryOps) {
    return {
      ok: false,
      reason: 'no_entry_ops',
      localPatients: patients.length,
      collectedEntries: entries.length,
    };
  }

  try {
    const { createCloudSyncApi } = await import('./api-client.mjs');
    const { pushCloudOpsDirect } = await import('./cloud-push-direct.mjs');
    const api = createCloudSyncApi({
      getBaseUrl: getCloudSyncUrl,
      getToken: getCloudSyncToken,
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
    recordCloudSyncError({
      op: 'census',
      code: 'push_failed',
      message,
    });
    return { ok: false, reason: 'push_failed', message };
  }
}

/**
 * @param {string} patientId
 * @param {object} todo
 */
export function enqueueCloudTodoUpsert(patientId, todo) {
  if (!isCloudSyncActive() || !todo?.id || !bridgeRuntime?.outbox) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(todo.updatedAt || new Date().toISOString()),
  };
  const row = { ...todo, patientId: String(patientId || todo.patientId || '').trim() };
  enqueueEntityOps(`todos/${todo.id}`, [cloudOp({ path: `todos/${todo.id}`, value: row, ...meta })]);
}

/**
 * @param {string} patientId
 * @param {object} todoRef
 * @param {string} [updatedAt]
 */
export function enqueueCloudTodoDelete(patientId, todoRef, updatedAt) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  const todo = todoRef && typeof todoRef === 'object' ? todoRef : { id: todoRef };
  const eid = String(todo.id || '').trim();
  if (!eid) return;
  // Fresh delete clock only — equal clocks make Worker LWW reject the delete.
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(updatedAt || new Date().toISOString()),
  };
  enqueueEntityOps(`todos/${eid}`, [
    cloudOp({
      path: `todos/${eid}`,
      value: { id: eid, patientId, _deleted: true, updatedAt: meta.updatedAt },
      ...meta,
    }),
  ]);
}

/** @param {object} eventObj */
export function enqueueCloudAgendaUpsert(eventObj) {
  if (!isCloudSyncActive() || !eventObj?.id || !bridgeRuntime?.outbox) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(eventObj.updatedAt || new Date().toISOString()),
  };
  enqueueEntityOps(`agenda/${eventObj.id}`, [
    cloudOp({ path: `agenda/${eventObj.id}`, value: eventObj, ...meta }),
  ]);
}

/** @param {string} id @param {string} [updatedAt] */
export function enqueueCloudAgendaDelete(id, updatedAt) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  const eid = String(id || '').trim();
  if (!eid) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(updatedAt || new Date().toISOString()),
  };
  enqueueEntityOps(`agenda/${eid}`, [
    cloudOp({
      path: `agenda/${eid}`,
      value: { id: eid, _deleted: true, updatedAt: meta.updatedAt },
      ...meta,
    }),
  ]);
}

/** Push census fields for a newly admitted patient (clears Nube tombstones via LWW). */
export function enqueueCloudPatientAdmit(patient) {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox || !patient?.id) return;
  const pid = String(patient.id).trim();
  if (!pid || pid.indexOf('demo-') === 0) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(patient.lanUpdatedAt || new Date().toISOString()),
  };
  /** @type {import('./mutate-bridge-ops.mjs').CloudSyncOp[]} */
  const ops = [];
  pushCensusFieldsOp(ops, pid, patient, meta.actorId);
  const registro = String(patient.registro || '').trim();
  if (registro) {
    ops.push(
      cloudOp({
        path: `entries/${pid}`,
        value: { id: pid, registro },
        ...meta,
      })
    );
  }
  if (!ops.length) return;
  enqueueOps(ops);
  scheduleCloudSyncPush();
}

/** @param {object} patient */
export function enqueueCloudPatientDelete(patient) {
  if (!isCloudSyncActive() || !patient?.id || !bridgeRuntime?.outbox) return;
  if (String(patient.id).indexOf('demo-') === 0) return;
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: new Date().toISOString(),
  };
  enqueueEntityOps(`tombstones/${patient.id}`, [
    cloudOp({
      path: `tombstones/${patient.id}`,
      value: { registro: patient.registro || '', deletedAt: meta.updatedAt },
      ...meta,
    }),
  ]);
}
