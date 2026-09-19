/**
 * Outbox helpers for Nube lab sidecars — prune, drain synced, coalesce entries.
 */
import {
  coalesceLabSidecarOps,
  filterCloudLabSidecarOps,
  isCloudLabSidecarPath,
  isLabSidecarOutboxMutationId,
  parseCloudLabSidecarPath,
} from './cloud-lab-sidecar-index.mjs';
import { CLOUD_LAB_BACKFILL_MUTATION_ID } from './constants.mjs';

/**
 * @param {Array<{ clientMutationId?: string, ops?: unknown[], enqueuedAt?: number, baseRevision?: number }>} rows
 */
export function pruneLabSidecarOpsFromOutboxRows(rows) {
  const input = Array.isArray(rows) ? rows : [];
  /** @type {typeof input} */
  const next = [];
  let removedOps = 0;
  let removedEntries = 0;

  for (let i = 0; i < input.length; i += 1) {
    const row = input[i];
    const id = String(row?.clientMutationId || '');
    if (isLabSidecarOutboxMutationId(id)) {
      removedOps += Array.isArray(row.ops) ? row.ops.length : 0;
      removedEntries += 1;
      continue;
    }
    const ops = Array.isArray(row.ops) ? row.ops : [];
    const kept = ops.filter(function (op) {
      return !op || typeof op !== 'object' || !isCloudLabSidecarPath(String(op.path || ''));
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

/**
 * Remove lab ops whose fingerprint already matches the server index (post-pull / post-push).
 * @param {Array<{ clientMutationId?: string, ops?: unknown[], enqueuedAt?: number, baseRevision?: number }>} rows
 */
export function drainSyncedLabOpsFromOutboxRows(rows) {
  const input = Array.isArray(rows) ? rows : [];
  /** @type {typeof input} */
  const next = [];
  let removedOps = 0;
  let removedEntries = 0;

  for (let i = 0; i < input.length; i += 1) {
    const row = input[i];
    const id = String(row?.clientMutationId || '');
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

/** @param {unknown[]} ops @returns {Record<string, unknown[]>} */
function groupLabBackfillOpsByPatient(ops) {
  /** @type {Record<string, unknown[]>} */
  const byPatient = {};
  for (let j = 0; j < ops.length; j += 1) {
    const op = ops[j];
    const path = String(op?.path || '');
    const parsed = parseCloudLabSidecarPath(path);
    if (!parsed) continue;
    const pid = parsed.patientId;
    if (!byPatient[pid]) byPatient[pid] = [];
    byPatient[pid].push(op);
  }
  return byPatient;
}

/**
 * @param {{ clientMutationId?: string, ops?: unknown[], enqueuedAt?: number, baseRevision?: number }} row
 * @returns {{ rows: unknown[], splitOps: number } | null} null when the row is not a lab-backfill row
 */
function splitOneLabBackfillRow(row) {
  const id = String(row?.clientMutationId || '');
  if (id !== CLOUD_LAB_BACKFILL_MUTATION_ID) return null;
  const ops = Array.isArray(row.ops) ? row.ops : [];
  if (!ops.length) return { rows: [], splitOps: 0 };
  const byPatient = groupLabBackfillOpsByPatient(ops);
  const patientIds = Object.keys(byPatient);
  if (!patientIds.length) return { rows: [], splitOps: 0 };
  const rows = [];
  for (let k = 0; k < patientIds.length; k += 1) {
    const pid = patientIds[k];
    const patientOps = byPatient[pid];
    if (!patientOps.length) continue;
    rows.push({
      clientMutationId: `labSidecars/${pid}`,
      ops: patientOps,
      enqueuedAt: row.enqueuedAt,
      baseRevision: row.baseRevision,
    });
  }
  return { rows, splitOps: ops.length };
}

/**
 * Legacy single-row lab backfill blocks partial retry — split into per-patient rows.
 * @param {Array<{ clientMutationId?: string, ops?: unknown[], enqueuedAt?: number, baseRevision?: number }>} rows
 */
export function splitLabBackfillOutboxRows(rows) {
  const input = Array.isArray(rows) ? rows : [];
  /** @type {typeof input} */
  const next = [];
  let splitOps = 0;

  for (let i = 0; i < input.length; i += 1) {
    const row = input[i];
    const split = splitOneLabBackfillRow(row);
    if (!split) {
      next.push(row);
      continue;
    }
    next.push(...split.rows);
    splitOps += split.splitOps;
  }

  return { rows: next, splitOps };
}

/**
 * @param {{ list: () => unknown[], replaceAll?: (rows: unknown[]) => void, clear?: () => void, enqueue?: Function }} outbox
 */
export function splitLabBackfillInOutbox(outbox) {
  if (!outbox || typeof outbox.list !== 'function') return { splitOps: 0 };
  const result = splitLabBackfillOutboxRows(
    /** @type {Array<{ clientMutationId?: string, ops?: unknown[] }>} */ (outbox.list())
  );
  if (result.splitOps <= 0) return { splitOps: 0 };
  if (typeof outbox.replaceAll === 'function') {
    outbox.replaceAll(result.rows);
  } else if (typeof outbox.clear === 'function' && typeof outbox.enqueue === 'function') {
    outbox.clear();
    for (let i = 0; i < result.rows.length; i += 1) {
      outbox.enqueue(result.rows[i]);
    }
  }
  return { splitOps: result.splitOps };
}

/**
 * @param {{ list: () => unknown[], replaceAll?: (rows: unknown[]) => void, clear?: () => void, enqueue?: Function }} outbox
 */
export function pruneLabSidecarsFromOutbox(outbox) {
  if (!outbox || typeof outbox.list !== 'function') {
    return { removedOps: 0, removedEntries: 0 };
  }
  const result = pruneLabSidecarOpsFromOutboxRows(
    /** @type {Array<{ clientMutationId?: string, ops?: unknown[] }>} */ (outbox.list())
  );
  if (typeof outbox.replaceAll === 'function') {
    outbox.replaceAll(result.rows);
  } else if (typeof outbox.clear === 'function' && typeof outbox.enqueue === 'function') {
    outbox.clear();
    for (let i = 0; i < result.rows.length; i += 1) {
      outbox.enqueue(result.rows[i]);
    }
  }
  return { removedOps: result.removedOps, removedEntries: result.removedEntries };
}

/**
 * @param {{ list: () => unknown[], replaceAll?: (rows: unknown[]) => void, clear?: () => void, enqueue?: Function }} outbox
 */
export function drainSyncedLabSidecarsFromOutbox(outbox) {
  if (!outbox || typeof outbox.list !== 'function') {
    return { removedOps: 0, removedEntries: 0 };
  }
  const result = drainSyncedLabOpsFromOutboxRows(
    /** @type {Array<{ clientMutationId?: string, ops?: unknown[] }>} */ (outbox.list())
  );
  if (result.removedOps <= 0) return result;
  if (typeof outbox.replaceAll === 'function') {
    outbox.replaceAll(result.rows);
  } else if (typeof outbox.clear === 'function' && typeof outbox.enqueue === 'function') {
    outbox.clear();
    for (let i = 0; i < result.rows.length; i += 1) {
      outbox.enqueue(result.rows[i]);
    }
  }
  return { removedOps: result.removedOps, removedEntries: result.removedEntries };
}

/**
 * Coalesce + filter lab ops before persisting an outbox row.
 * @param {string} clientMutationId
 * @param {unknown[]} ops
 */
export function prepareOutboxOpsForEnqueue(clientMutationId, ops) {
  let next = coalesceLabSidecarOps(Array.isArray(ops) ? ops : []);
  next = filterCloudLabSidecarOps(next);
  return next;
}
