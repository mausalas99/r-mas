/**
 * Cloud sync mutation bridge — maps local clinical state to worker LWW ops.
 */
import { isCloudSyncActive } from './lan-override.mjs';
import { getCloudSyncRoomId } from './settings.mjs';
import { lanNetworkProfile } from '../../lan-network-profile.mjs';
import { slimLabSetForCloud } from './cloud-op-slim.mjs';
import { CLOUD_PUSH_DEBOUNCE_MS, CLOUD_PUSH_DEBOUNCE_SLOW_MS } from './cloud-sync-timing.mjs';
import { labSetTimestamp, monitoreoUpdatedAt } from '../../lan-patient-merge.mjs';
import { patients } from '../../app-state.mjs';

function cloudPushDebounceMs() {
  return lanNetworkProfile.getNetworkProfile() === 'slow'
    ? CLOUD_PUSH_DEBOUNCE_SLOW_MS
    : CLOUD_PUSH_DEBOUNCE_MS;
}

/** @typedef {{ path: string, value: unknown, updatedAt: string, actorId: string }} CloudSyncOp */

export const CLOUD_BATCH_MUTATION_ID = 'cloud-room-push';

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

/** @param {CloudSyncOp[]} ops @param {string} patientId @param {object} patient @param {string} actorId @param {string} batchAt */
function pushClinicalBlockOps(ops, patientId, patient, actorId, batchAt) {
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
      ops.push(cloudOp({ path: `todos/${todo.id}`, value: todo, ...meta }));
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
    ops.push(...mapPatientEntryToOps(entries[i], meta));
  }
  ops.push(...mapBundleTodosToOps(bundle, meta));
  ops.push(...mapBundleAgendaToOps(bundle, meta));
  if (bundle.clinicalOps != null) {
    ops.push(cloudOp({ path: 'clinicalOps', value: bundle.clinicalOps, ...meta }));
  }
  return ops;
}

/** @param {CloudSyncOp[]} ops */
function enqueueOps(ops) {
  if (!bridgeRuntime?.outbox || !ops.length) return;
  bridgeRuntime.outbox.enqueue({
    clientMutationId: CLOUD_BATCH_MUTATION_ID,
    ops,
    baseRevision: bridgeRuntime.getRevision?.() ?? 0,
  });
  void bridgeRuntime.flush?.();
}

/** @type {ReturnType<typeof setTimeout> | null} */
let cloudPushTimer = null;

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
    const { ensureLanSyncPushBridgeWired, bridge } = await import('../lan/push-bridge.mjs');
    await ensureLanSyncPushBridgeWired();
    const meta = {
      actorId: resolveCloudActorId(bridgeRuntime),
      updatedAt: new Date().toISOString(),
    };
    ensureLiveCensusClocks(meta.updatedAt);
    const bundle = await bridge().buildLiveSyncBundleEnvelope(getCloudSyncRoomId());
    enqueueOps(mapBundleEnvelopeToOps(bundle, meta));
  } catch {
    // Best-effort enqueue; outbox persists for retry.
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
  enqueueOps([cloudOp({ path: `todos/${todo.id}`, value: row, ...meta })]);
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
  enqueueOps([
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
  enqueueOps([cloudOp({ path: `agenda/${eventObj.id}`, value: eventObj, ...meta })]);
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
  enqueueOps([
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
  enqueueOps([
    cloudOp({
      path: `tombstones/${patient.id}`,
      value: { registro: patient.registro || '', deletedAt: meta.updatedAt },
      ...meta,
    }),
  ]);
}
