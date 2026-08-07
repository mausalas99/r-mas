/**
 * Cloud sync LWW op builders — maps patient/bundle shapes to worker ops.
 */
import { slimLabSetForCloud } from './cloud-op-slim.mjs';
import { labSetTimestamp, monitoreoUpdatedAt } from '../../lan-patient-merge.mjs';

/** @typedef {{ path: string, value: unknown, updatedAt: string, actorId: string }} CloudSyncOp */

/** Packed into dedicated LWW paths — must not ride along on `fields` with a fresh batch clock. */
export const FIELD_SKIP = new Set(['historiaClinica', 'id', 'monitoreo', 'eventualidades']);

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
export function cloudOp(fields) {
  return {
    path: fields.path,
    value: fields.value,
    updatedAt: fields.updatedAt,
    actorId: fields.actorId,
  };
}

/** @param {CloudSyncOp[]} ops @param {string} patientId @param {object} patient @param {string} actorId */
export function pushCensusFieldsOp(ops, patientId, patient, actorId) {
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
export function pushCloudLiveClinicalOps(ops, patientId, patient, actorId, batchAt) {
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

/** @param {object} bundle */
function registroByPatientIdFromBundle(bundle) {
  const out = {};
  const entries = Array.isArray(bundle?.entries) ? bundle.entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const pid = String(entry?.patient?.id || '').trim();
    const reg = String(entry?.patient?.registro || '').trim();
    if (pid && reg) out[pid] = reg;
  }
  return out;
}

/** @param {object} bundle @param {{ actorId: string, updatedAt: string }} meta */
function mapBundleTodosToOps(bundle, meta) {
  const ops = [];
  const regByPid = registroByPatientIdFromBundle(bundle);
  const todos = bundle.todos && typeof bundle.todos === 'object' ? bundle.todos : {};
  for (const pid of Object.keys(todos)) {
    const list = Array.isArray(todos[pid]) ? todos[pid] : [];
    for (let j = 0; j < list.length; j += 1) {
      const todo = list[j];
      if (!todo?.id) continue;
      const patientId = String(pid || todo.patientId || '').trim();
      const registro = String(todo.registro || regByPid[patientId] || '').trim();
      const row = { ...todo, patientId };
      if (registro) row.registro = registro;
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

/**
 * @param {object} bundle — livesync:bundle envelope
 * @param {{ actorId: string, updatedAt: string }} meta
 * @returns {CloudSyncOp[]}
 */
export function mapBundleEnvelopeToOps(bundle, meta) {
  if (!bundle) return [];
  const ops = [];
  const entries = Array.isArray(bundle.entries) ? bundle.entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    ops.push(...mapPatientEntryToCloudBundleOps(entries[i], meta));
  }
  ops.push(...mapBundleTodosToOps(bundle, meta));
  ops.push(...mapBundleAgendaToOps(bundle, meta));
  // clinicalOps lives in sala-scoped rooms via pushClinicalOpsForSala — never stamp it
  // with census bundle "now" (LWW whole-doc replace could wipe team assignments).
  return ops;
}

/** @param {CloudSyncOp[]} ops */
export function countPatientEntryOps(ops) {
  let count = 0;
  for (let i = 0; i < ops.length; i += 1) {
    if (String(ops[i]?.path || '').startsWith('entries/')) count += 1;
  }
  return count;
}

/**
 * Sidecar op — upserts sala_interno_access in Worker D1 (not LWW room state).
 * @param {{ sala?: string, access_token?: string, is_active?: number, rotated_at?: string|null, rotated_by?: string|null }} row
 */
export function buildInternoAccessUpsertOp(row) {
  const sala = String(row?.sala || '').trim();
  return {
    type: 'internoAccessUpsert',
    sala,
    accessToken: String(row?.access_token || ''),
    isActive: Number(row?.is_active) === 1,
    rotatedAt: row?.rotated_at ? String(row.rotated_at) : null,
    rotatedBy: row?.rotated_by ? String(row.rotated_by) : null,
  };
}

/**
 * Stable mutation id per sala + rotation clock (retry-safe).
 * @param {{ sala?: string, access_token?: string, is_active?: number, rotated_at?: string|null, rotated_by?: string|null }} row
 */
export function internoAccessMutationId(row) {
  const sala = String(row?.sala || '').trim();
  const rotatedAt = String(row?.rotated_at || '').trim();
  const active = Number(row?.is_active) === 1 ? '1' : '0';
  return `internoAccess/${sala}/${rotatedAt || 'na'}/${active}`;
}

/** @param {CloudSyncOp[]} ops */
export function hasNonEntryCloudOps(ops) {
  for (let i = 0; i < ops.length; i += 1) {
    const path = String(ops[i]?.path || '');
    if (!path.startsWith('entries/')) return true;
  }
  return false;
}
