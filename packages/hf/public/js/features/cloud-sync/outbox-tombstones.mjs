/**
 * Outbox helpers for Nube patient-delete tombstones — coalesce many deletes into one push.
 * Room push budget is per HTTP mutation (not bytes); one op per delete was burning the limit.
 */
import { CLOUD_TOMBSTONES_MUTATION_ID } from './constants.mjs';
import { cloudOp } from './mutate-bridge-ops.mjs';

/**
 * @param {string} clientMutationId
 */
export function isTombstoneOutboxMutationId(clientMutationId) {
  const id = String(clientMutationId || '').trim();
  if (!id) return false;
  if (id === CLOUD_TOMBSTONES_MUTATION_ID) return true;
  return id.startsWith('tombstones/');
}

/**
 * Slim LWW tombstone value — omit empty registro (Worker already falls back on deletedAt/updatedAt).
 * @param {string} patientId
 * @param {{ registro?: string, actorId: string, updatedAt: string }} meta
 */
export function buildCloudTombstoneOp(patientId, meta) {
  const pid = String(patientId || '').trim();
  const updatedAt = String(meta?.updatedAt || '').trim() || new Date().toISOString();
  const actorId = String(meta?.actorId || '').trim() || 'local';
  const registro = String(meta?.registro || '').trim();
  /** @type {{ deletedAt: string, registro?: string }} */
  const value = { deletedAt: updatedAt };
  if (registro) value.registro = registro;
  return cloudOp({
    path: `tombstones/${pid}`,
    value,
    actorId,
    updatedAt,
  });
}

/**
 * Keep latest op per tombstone path.
 * @param {unknown[]} ops
 */
export function coalesceTombstoneOps(ops) {
  /** @type {Map<string, unknown>} */
  const byPath = new Map();
  const list = Array.isArray(ops) ? ops : [];
  for (let i = 0; i < list.length; i += 1) {
    const op = list[i];
    const path = String(op && typeof op === 'object' ? /** @type {{ path?: string }} */ (op).path || '' : '');
    if (!path.startsWith('tombstones/')) continue;
    byPath.set(path, op);
  }
  return Array.from(byPath.values());
}

/**
 * @param {Array<{ clientMutationId?: string, ops?: unknown[], enqueuedAt?: number, baseRevision?: number }>} rows
 */
function partitionTombstoneRows(rows) {
  /** @type {typeof rows} */
  const other = [];
  /** @type {typeof rows} */
  const tombstoneRows = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (isTombstoneOutboxMutationId(row?.clientMutationId)) tombstoneRows.push(row);
    else other.push(row);
  }
  return { other, tombstoneRows };
}

/**
 * @param {Array<{ ops?: unknown[], enqueuedAt?: number, baseRevision?: number }>} tombstoneRows
 */
function foldTombstoneRows(tombstoneRows) {
  /** @type {unknown[]} */
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
    baseRevision: hasBase ? baseRevision : null,
  };
}

/**
 * @param {{ clientMutationId?: string, ops?: unknown[], enqueuedAt?: number, baseRevision?: number }} only
 * @param {unknown[]} other
 */
function maybeDedupeSingleBatch(only, other) {
  if (String(only.clientMutationId || '') !== CLOUD_TOMBSTONES_MUTATION_ID) return null;
  const before = Array.isArray(only.ops) ? only.ops.length : 0;
  const ops = coalesceTombstoneOps(Array.isArray(only.ops) ? only.ops : []);
  if (ops.length === before) return { rows: null, merged: 0 };
  return { rows: other.concat([{ ...only, ops }]), merged: 1 };
}

/**
 * Merge legacy `tombstones/<id>` rows + `cloud-tombstones` into one outbox entry.
 * @param {Array<{ clientMutationId?: string, ops?: unknown[], enqueuedAt?: number, baseRevision?: number }>} rows
 */
export function coalesceTombstoneOutboxRows(rows) {
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

  /** @type {{ clientMutationId: string, ops: unknown[], enqueuedAt: number, baseRevision?: number }} */
  const merged = {
    clientMutationId: CLOUD_TOMBSTONES_MUTATION_ID,
    ops: folded.ops,
    enqueuedAt: folded.enqueuedAt,
  };
  if (folded.baseRevision != null) merged.baseRevision = folded.baseRevision;
  return { rows: other.concat([merged]), merged: tombstoneRows.length };
}

/**
 * @param {{ list?: () => unknown[], replaceAll?: (rows: unknown[]) => void, clear?: () => void, enqueue?: Function }} outbox
 * @param {() => unknown[]} [listFn] — raw list when outbox.list is wrapped
 */
export function coalesceTombstonesInOutbox(outbox, listFn) {
  if (!outbox) return { merged: 0 };
  const read = typeof listFn === 'function' ? listFn : outbox.list;
  if (typeof read !== 'function') return { merged: 0 };
  const result = coalesceTombstoneOutboxRows(
    /** @type {Array<{ clientMutationId?: string, ops?: unknown[] }>} */ (read())
  );
  if (result.merged <= 0) return { merged: 0 };
  if (typeof outbox.replaceAll === 'function') {
    outbox.replaceAll(result.rows);
  } else if (typeof outbox.clear === 'function' && typeof outbox.enqueue === 'function') {
    outbox.clear();
    for (let i = 0; i < result.rows.length; i += 1) {
      outbox.enqueue(result.rows[i]);
    }
  }
  return { merged: result.merged };
}

/**
 * Wrap an outbox so `list()` folds legacy per-delete rows before flush/diagnostics.
 * @template {Record<string, unknown>} T
 * @param {T & { list: () => unknown[], replaceAll?: Function, clear?: Function, enqueue?: Function }} outbox
 * @returns {T}
 */
export function withTombstoneCoalesce(outbox) {
  if (!outbox || typeof outbox.list !== 'function') return outbox;
  const rawList = outbox.list.bind(outbox);
  return Object.assign(outbox, {
    list() {
      coalesceTombstonesInOutbox(outbox, rawList);
      return rawList();
    },
  });
}
