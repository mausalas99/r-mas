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
import { slimLabSetForCloud } from './cloud-op-slim.mjs';
import { CLOUD_PUSH_DEBOUNCE_MS, CLOUD_PUSH_DEBOUNCE_SLOW_MS } from './cloud-sync-timing.mjs';
import { labSetTimestamp, monitoreoUpdatedAt } from '../../lan-patient-merge.mjs';
import { patients } from '../../app-state.mjs';
import { CLOUD_BATCH_MUTATION_ID } from './constants.mjs';
import { recordCloudSyncError } from './cloud-sync-diagnostics.mjs';

export { CLOUD_BATCH_MUTATION_ID };
export { pushCloudClinicalOpsNow } from './mutate-bridge-clinical-ops.mjs';

function cloudPushDebounceMs() {
  return lanNetworkProfile.getNetworkProfile() === 'slow'
    ? CLOUD_PUSH_DEBOUNCE_SLOW_MS
    : CLOUD_PUSH_DEBOUNCE_MS;
}

/** @typedef {{ path: string, value: unknown, updatedAt: string, actorId: string }} CloudSyncOp */

/** Packed into dedicated LWW paths — must not ride along on `fields` with a fresh batch clock. */
const FIELD_SKIP = new Set(['historiaClinica', 'id', 'monitoreo', 'eventualidades']);

/** @param {unknown} note @param {string} fallback */
function noteOpUpdatedAt(note, fallback) {
  if (!note || typeof note !== 'object') return fallback;
  /** @type {{ updatedAt?: unknown, savedAt?: unknown }} */
  const row = note;
  const at = String(row.updatedAt || row.savedAt || '').trim();
  return at || fallback;
}

/** @param {unknown} patient */
function fieldsOpUpdatedAt(patient) {
  return String(patient?.lanUpdatedAt || '').trim();
}

/** @param {unknown} monitoreo */
function monitoreoOpUpdatedAt(monitoreo) {
  return String(monitoreoUpdatedAt(monitoreo) || '').trim();
}

/** @param {unknown} hc @param {string} fallback */
function historiaOpUpdatedAt(hc, fallback) {
  if (!hc || typeof hc !== 'object') return fallback;
  /** @type {{ data?: { meta?: { updatedAt?: unknown } }, updatedAt?: unknown }} */
  const row = hc;
  const at = String(row.data?.meta?.updatedAt || row.updatedAt || '').trim();
  return at || fallback;
}

/** @param {unknown} ev @param {string} fallback */
function eventualidadesOpUpdatedAt(ev, fallback) {
  if (!ev || typeof ev !== 'object') return fallback;
  /** @type {{ updatedAt?: unknown }} */
  const row = ev;
  const at = String(row.updatedAt || '').trim();
  return at || fallback;
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

/** @param {unknown} set @param {number} index */
export function labSetId(set, index) {
  const row = set && typeof set === 'object' ? set : {};
  return String(row.id || row.fecha || `idx-${index}`).trim();
}

/** @param {Record<string, unknown>} patient */
export function pickCensusFields(patient) {
  const out = {};
  for (const [key, value] of Object.entries(patient || {})) {
    if (FIELD_SKIP.has(key) || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

/**
 * @param {{ path: string, value: unknown, updatedAt: string, actorId: string }} fields
 * @returns {CloudSyncOp}
 */
function cloudOp(fields) {
  return {
    path: fields.path,
    value: fields.value,
    updatedAt: fields.updatedAt,
    actorId: fields.actorId,
  };
}

/** @param {CloudSyncOp[]} ops @param {string} patientId @param {object} patient @param {string} actorId */
function pushCensusFieldsOp(ops, patientId, patient, actorId) {
  const fieldsAt = fieldsOpUpdatedAt(patient);
  const fields = pickCensusFields(patient);
  // Only emit when the census clock is set — never stamp fields with the batch "now"
  // (that let unrelated lab/note pushes overwrite cuarto/cama on the server).
  if (!fieldsAt || !Object.keys(fields).length) return;
  ops.push(
    cloudOp({
      path: `entries/${patientId}/fields`,
      value: fields,
      actorId,
      updatedAt: fieldsAt,
    })
  );
}

/** Monitoreo + eventualidades only (no HC) — fits debounced Nube bundle without note/lab quota blow-up. */
function pushCloudLiveClinicalOps(ops, patientId, patient, actorId, batchAt) {
  const monAt = monitoreoOpUpdatedAt(patient.monitoreo);
  if (monAt && patient.monitoreo) {
    ops.push(
      cloudOp({
        path: `entries/${patientId}/monitoreo`,
        value: patient.monitoreo,
        actorId,
        updatedAt: monAt,
      })
    );
  }
  if (patient.eventualidades) {
    ops.push(
      cloudOp({
        path: `entries/${patientId}/eventualidades`,
        value: patient.eventualidades,
        actorId,
        updatedAt: eventualidadesOpUpdatedAt(patient.eventualidades, batchAt),
      })
    );
  }
}

/** @param {CloudSyncOp[]} ops @param {string} patientId @param {object} patient @param {string} actorId @param {string} batchAt */
function pushClinicalBlockOps(ops, patientId, patient, actorId, batchAt) {
  pushCloudLiveClinicalOps(ops, patientId, patient, actorId, batchAt);
  if (patient.historiaClinica) {
    ops.push(
      cloudOp({
        path: `entries/${patientId}/historiaClinica`,
        value: patient.historiaClinica,
        actorId,
        updatedAt: historiaOpUpdatedAt(patient.historiaClinica, batchAt),
      })
    );
  }
}

/** @param {CloudSyncOp[]} ops @param {string} patientId @param {object} entry @param {string} actorId @param {string} batchAt */
function pushDocOps(ops, patientId, entry, actorId, batchAt) {
  ops.push(
    cloudOp({
      path: `entries/${patientId}/note`,
      value: entry.note || {},
      actorId,
      updatedAt: noteOpUpdatedAt(entry.note, batchAt),
    })
  );
  ops.push(
    cloudOp({
      path: `entries/${patientId}/indicaciones`,
      value: entry.indicaciones || {},
      actorId,
      updatedAt: noteOpUpdatedAt(entry.indicaciones, batchAt),
    })
  );
}

/** @param {CloudSyncOp[]} ops @param {string} patientId @param {unknown[]} labs @param {string} actorId @param {string} batchAt */
function pushLabSidecarOps(ops, patientId, labs, actorId, batchAt) {
  for (let i = 0; i < labs.length; i += 1) {
    const setId = labSetId(labs[i], i);
    if (!setId) continue;
    const labAt = String(labSetTimestamp(labs[i]) || '').trim() || batchAt;
    // Text stays (PDF already discarded after parse). Slim strips any stray binary keys.
    ops.push(
      cloudOp({
        path: `labSidecars/${patientId}/${setId}`,
        value: slimLabSetForCloud(labs[i]),
        actorId,
        updatedAt: labAt,
      })
    );
  }
}

/**
 * @param {object} entry — buildPatientEntry shape
 * @param {{ actorId: string, updatedAt: string }} meta
 * @returns {CloudSyncOp[]}
 */
export function mapPatientEntryToOps(entry, meta) {
  if (!entry?.patient?.id) return [];
  const patientId = String(entry.patient.id).trim();
  if (!patientId || patientId.indexOf('demo-') === 0) return [];

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

/**
 * Slim census seed — fields (+ clinicalOps separately). Skips labs/notes to fit quotas.
 * @param {object} entry
 * @param {{ actorId: string, updatedAt: string }} meta
 * @returns {CloudSyncOp[]}
 */
export function mapPatientEntryToCensusSeedOps(entry, meta) {
  if (!entry?.patient?.id) return [];
  const patientId = String(entry.patient.id).trim();
  if (!patientId || patientId.indexOf('demo-') === 0) return [];
  const ops = [];
  pushCensusFieldsOp(ops, patientId, entry.patient, meta.actorId);
  return ops;
}

/**
 * Debounced Nube bundle: census fields + estado actual / eventualidades (not notes/labs/HC).
 * @param {object} entry
 * @param {{ actorId: string, updatedAt: string }} meta
 * @returns {CloudSyncOp[]}
 */
export function mapPatientEntryToCloudBundleOps(entry, meta) {
  if (!entry?.patient?.id) return [];
  const patientId = String(entry.patient.id).trim();
  if (!patientId || patientId.indexOf('demo-') === 0) return [];
  const ops = [];
  pushCensusFieldsOp(ops, patientId, entry.patient, meta.actorId);
  pushCloudLiveClinicalOps(ops, patientId, entry.patient, meta.actorId, meta.updatedAt);
  return ops;
}

/**
 * @param {object} bundle — livesync:bundle envelope
 * @param {{ actorId: string, updatedAt: string }} meta
 * @returns {CloudSyncOp[]}
 */

/** @param {object} bundle @param {{ actorId: string, updatedAt: string }} meta */
function mapBundleTodosToOps(bundle, meta) {
  const ops = [];
  const todos = bundle.todos && typeof bundle.todos === 'object' ? bundle.todos : {};
  for (const pid of Object.keys(todos)) {
    const list = Array.isArray(todos[pid]) ? todos[pid] : [];
    for (let j = 0; j < list.length; j += 1) {
      const todo = list[j];
      if (!todo?.id) continue;
      const patientId = String(pid || todo.patientId || '').trim();
      const row = { ...todo, patientId };
      const todoAt = String(row.updatedAt || meta.updatedAt).trim() || meta.updatedAt;
      ops.push(
        cloudOp({
          path: `todos/${todo.id}`,
          value: row,
          actorId: meta.actorId,
          updatedAt: todoAt,
        })
      );
    }
  }
  return ops;
}

/** @param {object} bundle @param {{ actorId: string, updatedAt: string }} meta */
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

export function mapBundleEnvelopeToOps(bundle, meta) {
  if (!bundle) return [];
  const ops = [];
  const entries = Array.isArray(bundle.entries) ? bundle.entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    ops.push(...mapPatientEntryToCloudBundleOps(entries[i], meta));
  }
  ops.push(...mapBundleTodosToOps(bundle, meta));
  ops.push(...mapBundleAgendaToOps(bundle, meta));
  if (bundle.clinicalOps != null) {
    ops.push(cloudOp({ path: 'clinicalOps', value: bundle.clinicalOps, ...meta }));
  }
  return ops;
}

/**
 * @param {string} clientMutationId
 * @param {CloudSyncOp[]} ops
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

/** @param {CloudSyncOp[]} ops */
function enqueueOps(ops) {
  enqueueEntityOps(CLOUD_BATCH_MUTATION_ID, ops);
}

/** @type {ReturnType<typeof setTimeout> | null} */
let cloudPushTimer = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let cloudCensusRetryTimer = null;

let cloudCensusPushRetries = 0;

const CLOUD_CENSUS_PUSH_MAX_RETRIES = 16;

if (typeof document !== 'undefined' && !globalThis.__RPC_CLOUD_CENSUS_PUSH_LISTENER__) {
  globalThis.__RPC_CLOUD_CENSUS_PUSH_LISTENER__ = true;
  document.addEventListener('rpc-clinical-ops-synced', function () {
    if (isCloudSyncActive()) scheduleCloudSyncPush();
  });
}

/** @param {CloudSyncOp[]} ops */
function countPatientEntryOps(ops) {
  let count = 0;
  for (let i = 0; i < ops.length; i += 1) {
    if (String(ops[i]?.path || '').startsWith('entries/')) count += 1;
  }
  return count;
}

/** @param {CloudSyncOp[]} ops */
function hasNonEntryCloudOps(ops) {
  for (let i = 0; i < ops.length; i += 1) {
    const path = String(ops[i]?.path || '');
    if (!path.startsWith('entries/')) return true;
  }
  return false;
}

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
 * One-time census clock on live patients so empty-room seed can emit `fields`.
 * Must mutate `patients` (buildPatientEntry shallow-copies) so later pushes reuse the same clock.
 */
function ensureLiveCensusClocks(nowIso) {
  for (let i = 0; i < patients.length; i += 1) {
    const patient = patients[i];
    if (!patient || typeof patient !== 'object') continue;
    if (!String(patient.lanUpdatedAt || '').trim()) patient.lanUpdatedAt = nowIso;
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
    const { snapshotClinicalOpsForCloud } = await import('./mutate-bridge-clinical-ops.mjs');
    const entries = await collectPatientEntriesForCloudPush();
    const clinicalOps = await snapshotClinicalOpsForCloud();
    const ops = mapBundleEnvelopeToOps(
      {
        entries,
        todos: collectTodosMapForCloudPush(),
        agenda: collectAgendaForCloudPush(),
        clinicalOps,
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
  /** @type {CloudSyncOp[]} */
  const ops = [];
  for (let i = 0; i < entries.length; i += 1) {
    ops.push(...mapPatientEntryToCloudBundleOps(entries[i], meta));
  }
  const { snapshotClinicalOpsForCloud } = await import('./mutate-bridge-clinical-ops.mjs');
  const clinicalOps = await snapshotClinicalOpsForCloud();
  if (clinicalOps != null) {
    ops.push(cloudOp({ path: 'clinicalOps', value: clinicalOps, ...meta }));
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
  const meta = {
    actorId: resolveCloudActorId(bridgeRuntime),
    updatedAt: String(updatedAt || todo.updatedAt || new Date().toISOString()),
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
