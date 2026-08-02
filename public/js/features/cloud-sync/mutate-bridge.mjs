/**
 * Cloud sync mutation bridge — maps local clinical state to worker LWW ops.
 */
import { isCloudSyncActive } from './lan-override.mjs';
import { getCloudSyncRoomId } from './settings.mjs';
import { getLiveSyncPushDebounceMs } from '../lan/runtime.mjs';

/** @typedef {{ path: string, value: unknown, updatedAt: string, actorId: string }} CloudSyncOp */

export const CLOUD_BATCH_MUTATION_ID = 'cloud-room-push';

const FIELD_SKIP = new Set(['historiaClinica', 'id']);

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

/**
 * @param {object} entry — buildPatientEntry shape
 * @param {{ actorId: string, updatedAt: string }} meta
 * @returns {CloudSyncOp[]}
 */
export function mapPatientEntryToOps(entry, meta) {
  if (!entry?.patient?.id) return [];
  const patientId = String(entry.patient.id).trim();
  if (!patientId || patientId.indexOf('demo-') === 0) return [];

  const ops = [];
  const fields = pickCensusFields(entry.patient);
  if (Object.keys(fields).length) {
    ops.push(cloudOp({ path: `entries/${patientId}/fields`, value: fields, ...meta }));
  }
  ops.push(cloudOp({ path: `entries/${patientId}/note`, value: entry.note || {}, ...meta }));
  ops.push(
    cloudOp({ path: `entries/${patientId}/indicaciones`, value: entry.indicaciones || {}, ...meta })
  );
  if (entry.patient.historiaClinica) {
    ops.push(
      cloudOp({
        path: `entries/${patientId}/historiaClinica`,
        value: entry.patient.historiaClinica,
        ...meta,
      })
    );
  }

  const labs = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  for (let i = 0; i < labs.length; i += 1) {
    const setId = labSetId(labs[i], i);
    if (!setId) continue;
    ops.push(cloudOp({ path: `labSidecars/${patientId}/${setId}`, value: labs[i], ...meta }));
  }
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
  }, getLiveSyncPushDebounceMs());
}

async function pushCloudBundleOps() {
  if (!isCloudSyncActive() || !bridgeRuntime?.outbox) return;
  if (!getCloudSyncRoomId()) return;
  try {
    const { ensureLanSyncPushBridgeWired, bridge } = await import('../lan/push-bridge.mjs');
    await ensureLanSyncPushBridgeWired();
    const bundle = await bridge().buildLiveSyncBundleEnvelope(getCloudSyncRoomId());
    const meta = {
      actorId: resolveCloudActorId(bridgeRuntime),
      updatedAt: new Date().toISOString(),
    };
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
