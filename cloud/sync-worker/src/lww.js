import { QUOTAS } from './quotas.js';

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
 * @typedef {{ revision: number, entries: object[], entityVersions: Record<string, { updatedAt: string, actorId: string }>, todos: Record<string, unknown>, agenda: unknown[], clinicalOps: unknown, labSidecars: Record<string, Record<string, unknown>>, tombstones?: Record<string, { registro?: string, deletedAt: string }> }} RoomSyncState
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
      ? /** @type {{ registro?: string, deletedAt?: string }} */ (op.value)
      : {};
  state.tombstones[patientId] = {
    registro: meta.registro,
    deletedAt: meta.deletedAt || op.updatedAt,
  };
}

/** @param {RoomSyncState} state @param {SyncOp} op */
function applyOpToState(state, op) {
  const { path, value } = op;

  if (path === 'agenda') {
    state.agenda = Array.isArray(value) ? value.slice() : [];
    return;
  }

  if (path === 'clinicalOps') {
    state.clinicalOps = value;
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
    /^entries\/([^/]+)\/(note|indicaciones|historiaClinica|eventualidades|monitoreo|fields)$/.exec(
      path
    );
  if (entryField) {
    setEntryField(state, entryField[1], entryField[2], value);
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

  for (const op of ops) {
    try {
      const current = next.entityVersions[op.path];
      if (!isNewerVersion(op, current)) {
        rejected.push({ op, reason: 'stale' });
        continue;
      }

      applyOpToState(next, op);
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
