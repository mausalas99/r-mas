import { QUOTAS } from './quotas.js';
import { mergeClinicalOpsLww } from './clinical-ops-lww.js';
import { mergeMonitoreo } from '../../../lib/monitoreo-merge.mjs';
import { mergeCardioDailyLww } from './cardioDaily-lww.js';
import { mergeNeumoStudiesLww } from './neumoStudies-lww.js';

/** @returns {import('./lww.js').RoomSyncState} */
export function emptyState() {
  return {
    revision: 0,
    entries: [],
    entityVersions: {},
    todos: {},
    agenda: [],
    clinicalOps: null,
    labSidecars: {},
    tombstones: {},
  };
}

/**
 * @typedef {{ revision: number, entries: object[], entityVersions: Record<string, { updatedAt: string, actorId: string }>, todos: Record<string, unknown>, agenda: unknown[], clinicalOps: unknown, labSidecars: Record<string, Record<string, unknown>>, tombstones?: Record<string, { registroFp?: string, registro?: string, deletedAt: string, actorId?: string }> }} RoomSyncState
 * @typedef {{ path: string, value: unknown, updatedAt: string, actorId: string }} SyncOp
 * @typedef {{ op: SyncOp, reason: string }} RejectedOp
 */

/** @param {SyncOp} op @param {{ updatedAt: string, actorId: string } | undefined} current */
function isNewerVersion(op, current) {
  if (!current) return true;
  const atCmp = String(op.updatedAt).localeCompare(String(current.updatedAt));
  if (atCmp > 0) return true;
  if (atCmp < 0) return false;
  return String(op.actorId).localeCompare(String(current.actorId)) > 0;
}

/** @param {RoomSyncState} state @param {string} patientId */
function findEntryIndex(state, patientId) {
  return state.entries.findIndex((e) => e && e.id === patientId);
}

/** @param {RoomSyncState} state */
function countLivePatients(state) {
  return state.entries.filter((e) => e && e.id).length;
}

/** @param {RoomSyncState} state @param {string} patientId */
function isTombstoned(state, patientId) {
  return !!(state.tombstones && state.tombstones[patientId]);
}

/** @param {RoomSyncState} state @param {string} patientId */
function getTombstoneDeletedAt(state, patientId) {
  const meta = state.tombstones?.[patientId];
  const ver = state.entityVersions[`tombstones/${patientId}`];
  return String(meta?.deletedAt || ver?.updatedAt || '');
}

/** @param {string} path identity op: `entries/{id}` root or `entries/{id}/fields` */
function isPatientIdentityOpPath(path) {
  return /^entries\/[^/]+(\/fields)?$/.test(path);
}

/**
 * Matching key for re-admit detection. `registroFp` is a one-way fingerprint the
 * client attaches once a room has E2EE (public/js/features/cloud-sync/crypto.mjs's
 * fingerprintValue) — the Worker never reads the real chart number. `registro`
 * plaintext is the fallback for a room with no DEK yet (encryptOpsForPush is a
 * no-op there, so no fingerprint ever gets attached) and for reading a tombstone
 * row written before this shipped (see applyTombstone).
 * @param {unknown} value
 */
function registroMatchKeyFromValue(value) {
  if (!value || typeof value !== 'object') return '';
  const row = /** @type {{ registroFp?: string, registro?: string }} */ (value);
  return String(row.registroFp || row.registro || '').trim();
}

/** @param {SyncOp} op */
function registroFromEntryOp(op) {
  // Note: an op's OWN value for a `fields`-path op IS the flat fields object
  // directly (never nested one level further under a `.fields` key) — the
  // nesting into `entry.fields.*` only happens once lww merges it into state.
  // A `row.fields?.registro` fallback on the op itself would always be empty.
  return registroMatchKeyFromValue(op.value);
}

/** @param {RoomSyncState} state @param {string} patientId */
function clearPatientTombstone(state, patientId) {
  if (!state.tombstones || !state.tombstones[patientId]) return;
  delete state.tombstones[patientId];
}

/**
 * Explicit census re-admit (any actor) clears a delete tombstone when newer.
 * Tombstones only block stale sync sidecars/todos — not intentional alta.
 * Only identity ops (`entries/{id}` root or `/fields`) count as a re-admit: a
 * content op (note, monitoreo, …) from a device that edited offline before it
 * saw the alta must not reborn the patient as a nameless shell.
 * @param {RoomSyncState} state @param {string} patientId @param {SyncOp} op
 */
function tryClearTombstoneForResurrection(state, patientId, op) {
  if (!isTombstoned(state, patientId)) return;
  if (!isPatientIdentityOpPath(op.path)) return;
  const tombAt = getTombstoneDeletedAt(state, patientId);
  if (tombAt && String(op.updatedAt).localeCompare(tombAt) < 0) return;
  clearPatientTombstone(state, patientId);
}

/** @param {RoomSyncState} state @param {string} registroKey @param {SyncOp} op @param {string} [exceptPatientId] */
function clearRegistroTombstonesForReAdmit(state, registroKey, op, exceptPatientId) {
  const reg = String(registroKey || '').trim();
  if (!reg || !state.tombstones) return;
  const opAt = String(op.updatedAt || '');
  for (const pid of Object.keys(state.tombstones)) {
    if (exceptPatientId && pid === exceptPatientId) continue;
    const meta = state.tombstones[pid];
    if (registroMatchKeyFromValue(meta) !== reg) continue;
    const tombAt = getTombstoneDeletedAt(state, pid);
    if (tombAt && opAt.localeCompare(tombAt) < 0) continue;
    delete state.tombstones[pid];
  }
}

/** @param {RoomSyncState} state @param {string} path `entries/{id}…` or `labSidecars/{id}/…` of a deleted patient */
function isTombstonedTarget(state, path) {
  const m = /^(?:entries|labSidecars)\/([^/]+)/.exec(path);
  return !!m && isTombstoned(state, m[1]);
}

/** @param {RoomSyncState} state @param {SyncOp} op */
function maybeResurrectPatientFromOp(state, op) {
  const entryMatch = /^entries\/([^/]+)/.exec(op.path);
  if (!entryMatch) return;
  const patientId = entryMatch[1];
  tryClearTombstoneForResurrection(state, patientId, op);
  const registro = registroFromEntryOp(op);
  if (registro) clearRegistroTombstonesForReAdmit(state, registro, op, patientId);
}

/** @param {RoomSyncState} state @param {string} patientId @param {Record<string, unknown>} stub */
function upsertEntryStub(state, patientId, stub) {
  if (isTombstoned(state, patientId)) return;
  const idx = findEntryIndex(state, patientId);
  if (idx >= 0) {
    state.entries[idx] = { ...state.entries[idx], ...stub, id: patientId };
    return;
  }
  if (countLivePatients(state) >= QUOTAS.maxLivePatients) {
    throw new QuotaExceededError('quota_exceeded', `Límite de pacientes en sala (${QUOTAS.maxLivePatients}).`);
  }
  state.entries.push({ id: patientId, ...stub });
}

/** @param {RoomSyncState} state @param {string} patientId @param {string} field @param {unknown} value */
function setEntryField(state, patientId, field, value) {
  if (isTombstoned(state, patientId)) return;
  const idx = findEntryIndex(state, patientId);
  if (idx < 0) {
    if (countLivePatients(state) >= QUOTAS.maxLivePatients) {
      throw new QuotaExceededError('quota_exceeded', `Límite de pacientes en sala (${QUOTAS.maxLivePatients}).`);
    }
    state.entries.push({ id: patientId, [field]: value });
    return;
  }
  state.entries[idx] = { ...state.entries[idx], [field]: value };
}

/** @param {unknown} value */
function isEncryptedEnvelope(value) {
  return !!value && typeof value === 'object' && /** @type {any} */ (value).enc === 1;
}

/**
 * Entry fields that merge instead of a blind LWW replace (which wipes whichever
 * side loses the updatedAt race). monitoreo: vitals historial + estado actual.
 * cardioDaily: R+ HF pocusByDay/rondasByDay, union by date (core never sends it).
 * neumoStudies: R+ Neumo spirometry/pleural studies, union by id (core never sends it).
 *
 * Encrypted envelope: the Worker cannot read either side to merge — same bypass
 * as clinicalOps in applyOpToState below. Newest op replaces whole; the client
 * merged before push (pull, decrypt, merge, push the full union).
 */
const ENTRY_FIELD_MERGERS = {
  monitoreo: mergeMonitoreo,
  cardioDaily: mergeCardioDailyLww,
  neumoStudies: mergeNeumoStudiesLww,
};

/** @param {RoomSyncState} state @param {string} patientId @param {'monitoreo'|'cardioDaily'|'neumoStudies'} field @param {unknown} value */
function setMergedEntryField(state, patientId, field, value) {
  if (isTombstoned(state, patientId)) return;
  const idx = findEntryIndex(state, patientId);
  if (idx < 0) {
    if (countLivePatients(state) >= QUOTAS.maxLivePatients) {
      throw new QuotaExceededError('quota_exceeded', `Límite de pacientes en sala (${QUOTAS.maxLivePatients}).`);
    }
    state.entries.push({ id: patientId, [field]: value });
    return;
  }
  const current = state.entries[idx][field];
  const merged =
    current && !isEncryptedEnvelope(value) && !isEncryptedEnvelope(current)
      ? ENTRY_FIELD_MERGERS[field](current, value)
      : value;
  state.entries[idx] = { ...state.entries[idx], [field]: merged };
}

const MERGED_ENTRY_PATH = /^entries\/([^/]+)\/(monitoreo|cardioDaily|neumoStudies)$/;

/** Key-order-proof compare: merge output order may differ from stored order. */
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  }
  return v;
}

/**
 * An op older than the stored monitoreo/cardioDaily clock still may carry rows
 * the server lacks. Merge it in; keep the stored (newer) entityVersion. Returns
 * the merged op when the stored value changed, else null (caller reports it stale).
 * @param {RoomSyncState} state @param {SyncOp} op
 */
function mergeStaleEntryField(state, op) {
  const m = MERGED_ENTRY_PATH.exec(op.path);
  if (!m || isTombstoned(state, m[1])) return null;
  const idx = findEntryIndex(state, m[1]);
  if (idx < 0) return null;
  const field = /** @type {'monitoreo'|'cardioDaily'|'neumoStudies'} */ (m[2]);
  const merge = ENTRY_FIELD_MERGERS[field];
  const current = state.entries[idx][field];
  if (!current || isEncryptedEnvelope(current) || isEncryptedEnvelope(op.value)) return null;
  const merged = merge(current, op.value);
  // merge fills defaults, so compare against current merged with itself, not raw current
  const baseline = merge(current, current);
  if (JSON.stringify(canonical(merged)) === JSON.stringify(canonical(baseline))) return null;
  state.entries[idx] = { ...state.entries[idx], [field]: merged };
  return { ...op, value: merged };
}

/** @param {RoomSyncState} state @param {string} itemId @param {unknown} value */
function upsertAgendaItem(state, itemId, value) {
  const idx = state.agenda.findIndex((item) => item && item.id === itemId);
  const row = typeof value === 'object' && value !== null ? { ...value, id: itemId } : { id: itemId, value };
  if (idx >= 0) {
    state.agenda[idx] = row;
  } else {
    state.agenda.push(row);
  }
}

/** @param {RoomSyncState} state @param {string} patientId */
function wipePatientSidecars(state, patientId) {
  if (state.labSidecars && state.labSidecars[patientId]) {
    delete state.labSidecars[patientId];
  }
  const todos = state.todos || {};
  for (const tid of Object.keys(todos)) {
    const row = todos[tid];
    if (row && String(row.patientId || '').trim() === patientId) {
      delete todos[tid];
    }
  }
  if (Array.isArray(state.agenda) && state.agenda.length) {
    state.agenda = state.agenda.filter(function (item) {
      return !(item && String(item.patientId || '').trim() === patientId);
    });
  }
}

/** @param {RoomSyncState} state @param {string} patientId @param {SyncOp} op */
function applyTombstone(state, patientId, op) {
  const idx = findEntryIndex(state, patientId);
  if (idx >= 0) {
    state.entries.splice(idx, 1);
  }
  wipePatientSidecars(state, patientId);
  if (!state.tombstones) state.tombstones = {};
  const meta =
    typeof op.value === 'object' && op.value !== null
      ? /** @type {{ registroFp?: string, registro?: string, deletedAt?: string }} */ (op.value)
      : {};
  // Stored under registroFp going forward — the client (Part A, encryptOpsForPush)
  // already swapped the real chart number for its one-way fingerprint before this
  // op ever reached the Worker. A tombstone written before this shipped still has
  // a plaintext `registro` on disk; registroMatchKeyFromValue reads that as a
  // fallback, but it is never written again here. Accepted edge case, not fixed:
  // a patient discharged before this ships and re-admitted after won't auto-clear
  // their old tombstone (fresh entry instead — no data loss, just not de-duped).
  state.tombstones[patientId] = {
    registroFp: registroMatchKeyFromValue(meta) || undefined,
    deletedAt: meta.deletedAt || op.updatedAt,
    actorId: op.actorId,
  };
}

/** @param {RoomSyncState} state @param {SyncOp} op */
function applyOpToState(state, op) {
  const { path, value } = op;
  maybeResurrectPatientFromOp(state, op);

  if (path === 'agenda') {
    state.agenda = Array.isArray(value) ? value.slice() : [];
    return;
  }

  if (path === 'clinicalOps') {
    // Encrypted envelope: client already merged before push; Worker stores opaque blob.
    if (isEncryptedEnvelope(value)) {
      state.clinicalOps = value;
    } else {
      state.clinicalOps = mergeClinicalOpsLww(state.clinicalOps, value);
    }
    return;
  }

  const entryRoot = /^entries\/([^/]+)$/.exec(path);
  if (entryRoot) {
    const patientId = entryRoot[1];
    const stub = typeof value === 'object' && value !== null ? value : { id: patientId };
    upsertEntryStub(state, patientId, stub);
    return;
  }

  const entryField =
    /^entries\/([^/]+)\/(note|indicaciones|historiaClinica|eventualidades|monitoreo|cardioDaily|neumoStudies|cardioSummary|medReceta|vpo|listadoProblemas|medPharmProfile|fields)$/.exec(
      path
    );
  if (entryField) {
    const [, entryPatientId, field] = entryField;
    if (field in ENTRY_FIELD_MERGERS) {
      setMergedEntryField(state, entryPatientId, field, value);
    } else {
      setEntryField(state, entryPatientId, field, value);
    }
    return;
  }

  const labSidecar = /^labSidecars\/([^/]+)\/([^/]+)$/.exec(path);
  if (labSidecar) {
    const [, patientId, setId] = labSidecar;
    if (isTombstoned(state, patientId)) return;
    if (!state.labSidecars[patientId]) state.labSidecars[patientId] = {};
    state.labSidecars[patientId][setId] = value;
    return;
  }

  const todoMatch = /^todos\/([^/]+)$/.exec(path);
  if (todoMatch) {
    const todoVal = value && typeof value === 'object' ? /** @type {{ patientId?: string }} */ (value) : null;
    const todoPatientId = String((todoVal && todoVal.patientId) || '').trim();
    if (todoPatientId && isTombstoned(state, todoPatientId)) return;
    state.todos[todoMatch[1]] = value;
    return;
  }

  const agendaItem = /^agenda\/([^/]+)$/.exec(path);
  if (agendaItem) {
    upsertAgendaItem(state, agendaItem[1], value);
    return;
  }

  const tombstone = /^tombstones\/([^/]+)$/.exec(path);
  if (tombstone) {
    applyTombstone(state, tombstone[1], op);
    return;
  }

  const err = new Error(`unsupported path: ${path}`);
  err.code = 'unsupported_path';
  throw err;
}

export class QuotaExceededError extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Apply mutation ops with per-path LWW. Does not bump `revision` (server-owned).
 * @param {RoomSyncState} state
 * @param {SyncOp[]} ops
 * @returns {{ state: RoomSyncState, applied: SyncOp[], rejected: RejectedOp[] }}
 */
export function applyOps(state, ops) {
  const list = Array.isArray(ops) ? ops : [];
  /** @type {RejectedOp[]} */
  const staleRejected = [];
  let hasFresh = false;
  for (const op of list) {
    if (MERGED_ENTRY_PATH.test(op.path)) {
      hasFresh = true; // stale merged entry fields may still merge; decided in the main loop
    } else if (!isNewerVersion(op, state.entityVersions[op.path])) {
      staleRejected.push({ op, reason: 'stale' });
    } else {
      hasFresh = true;
    }
  }
  if (!hasFresh) {
    return { state, applied: [], rejected: staleRejected };
  }

  const next = {
    ...state,
    entries: state.entries.map((e) => ({ ...e })),
    entityVersions: { ...state.entityVersions },
    todos: { ...state.todos },
    agenda: state.agenda.map((item) =>
      typeof item === 'object' && item !== null ? { ...item } : item
    ),
    labSidecars: Object.fromEntries(
      Object.entries(state.labSidecars || {}).map(([pid, sets]) => [
        pid,
        { ...sets },
      ])
    ),
    tombstones: { ...(state.tombstones || {}) },
  };

  /** @type {SyncOp[]} */
  const applied = [];
  /** @type {RejectedOp[]} */
  const rejected = [];

  for (const op of list) {
    try {
      const current = next.entityVersions[op.path];
      if (!isNewerVersion(op, current)) {
        const mergedOp = mergeStaleEntryField(next, op);
        if (mergedOp) applied.push(mergedOp);
        else rejected.push({ op, reason: 'stale' });
        continue;
      }

      applyOpToState(next, op);
      // A chart op for a patient still deleted after the op was a no-op here. Counting it
      // as applied would broadcast it, and a peer applying it recreates the patient.
      if (isTombstonedTarget(next, op.path)) {
        rejected.push({ op, reason: 'tombstoned' });
        continue;
      }
      next.entityVersions[op.path] = {
        updatedAt: op.updatedAt,
        actorId: op.actorId,
      };
      applied.push(op);
    } catch (err) {
      if (err instanceof QuotaExceededError || err?.code === 'unsupported_path') {
        rejected.push({ op, reason: err.code || 'unsupported_path' });
        continue;
      }
      throw err;
    }
  }

  return { state: next, applied, rejected };
}
