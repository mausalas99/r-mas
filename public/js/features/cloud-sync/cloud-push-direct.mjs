import { sanitizeOpsForCloudPush, utf8JsonBytes } from './cloud-op-slim.mjs';
import { resolveCloudPushMutationId } from './push-mutation-id.mjs';
import { CLOUD_BATCH_MUTATION_ID } from './constants.mjs';
import { noteCloudLabSidecarOpsSent } from './cloud-lab-sidecar-index.mjs';
import { isCloudTransientServerError } from './cloud-sync-timing.mjs';
import { recordCloudSyncError } from './cloud-sync-diagnostics.mjs';
import { noteCloudOpsAttempted } from './cloud-sync-echo-guard.mjs';

const DIRECT_PUSH_TRANSIENT_RETRIES = 3;
const DIRECT_PUSH_TRANSIENT_DELAY_MS = 2000;

/**
 * @param {number} ms
 */
function delayMs(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

/** Target well under worker pull snapshot budget and browser payload limits. */
export const CHUNK_BUDGET_BYTES = 180 * 1024;

/** D1 SQLITE_TOOBIG guard — cap lab sidecars per push mutation. */
export const MAX_LAB_OPS_PER_CHUNK = 6;

/**
 * Worker `QUOTAS.maxOpsPerMutation` — must stay ≤ that or push returns
 * «Demasiadas operaciones en un push».
 */
export const MAX_OPS_PER_CHUNK = 16;

/** @param {unknown} op */
function isLabSidecarOp(op) {
  return String(op?.path || '').startsWith('labSidecars/');
}

/** @param {unknown[]} ops */
function countLabSidecarOps(ops) {
  let n = 0;
  for (let i = 0; i < ops.length; i += 1) {
    if (isLabSidecarOp(ops[i])) n += 1;
  }
  return n;
}

/**
 * @param {unknown[]} ops
 * @returns {unknown[][]}
 */
export function chunkCloudOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return [];
  /** @type {unknown[][]} */
  const chunks = [];
  /** @type {unknown[]} */
  let current = [];
  let currentBytes = 0;

  function flush() {
    if (!current.length) return;
    chunks.push(current);
    current = [];
    currentBytes = 0;
  }

  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];
    const bytes = utf8JsonBytes(op);
    const labCap =
      isLabSidecarOp(op) && current.length > 0 && countLabSidecarOps(current) >= MAX_LAB_OPS_PER_CHUNK;
    const opCap = current.length >= MAX_OPS_PER_CHUNK;
    const byteCap = current.length > 0 && currentBytes + bytes > CHUNK_BUDGET_BYTES;
    if (labCap || opCap || byteCap) flush();
    current.push(op);
    currentBytes += bytes;
  }
  flush();
  return chunks;
}

/**
 * Push one sanitized chunk, retrying transient server errors with backoff.
 *
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @param {ReturnType<typeof sanitizeOpsForCloudPush>} sanitized
 * @param {number} chunkIndex
 * @param {() => number} getRevision
 */
async function pushChunkWithRetry(api, roomId, sanitized, chunkIndex, getRevision) {
  const item = {
    clientMutationId: CLOUD_BATCH_MUTATION_ID,
    enqueuedAt: Date.now() + chunkIndex,
  };
  let transientAttempts = 0;
  for (;;) {
    try {
      return await api.push(roomId, {
        clientMutationId: `${resolveCloudPushMutationId(item)}:chunk${chunkIndex}`,
        ops: sanitized.ops,
        baseRevision: getRevision() ?? 0,
      });
    } catch (err) {
      if (isCloudTransientServerError(err) && transientAttempts < DIRECT_PUSH_TRANSIENT_RETRIES) {
        transientAttempts += 1;
        await delayMs(DIRECT_PUSH_TRANSIENT_DELAY_MS * transientAttempts);
        continue;
      }
      throw err;
    }
  }
}

const REJECT_REASON_LABEL = {
  quota_exceeded: 'límite de la sala',
};

/**
 * The Worker reports per-op rejections inside an HTTP 200 body (`result.rejected`),
 * not as an HTTP error — a caller that ignores it loses data silently (e.g. a room
 * over quota drops every new patient with no error anywhere). Reads `result.rejected`
 * and records a Conexión diagnostic per reason so nothing is dropped unlogged.
 *
 * @param {{ rejected?: Array<{ op?: unknown, reason?: string }> }} result
 * @returns {{ stale: number, other: number }}
 */
export function recordRejectedCloudOps(result) {
  const rejected = Array.isArray(result?.rejected) ? result.rejected : [];
  let stale = 0;
  /** @type {Map<string, number>} */
  const otherByReason = new Map();
  for (const r of rejected) {
    const reason = String(r?.reason || '');
    if (reason === 'stale') {
      stale += 1;
    } else if (reason) {
      otherByReason.set(reason, (otherByReason.get(reason) || 0) + 1);
    }
  }
  if (stale > 0) {
    // The Worker's clock rejected these as older than what it already has — usually a
    // system clock lagging behind the room's other devices. Surfaced here (not thrown):
    // callers are a shared funnel for census/labs/clinicalOps that each have their own
    // retry semantics, so we record it for the Conexión diagnostics panel instead of
    // failing the whole push.
    recordCloudSyncError({
      op: 'push',
      code: 'stale_rejected',
      message: `${stale} operación(es) rechazada(s) por reloj desactualizado`,
    });
  }
  let other = 0;
  for (const [reason, count] of otherByReason) {
    other += count;
    const label = REJECT_REASON_LABEL[reason] || reason;
    recordCloudSyncError({
      op: 'push',
      code: reason,
      message: `${count} operación(es) rechazada(s) por ${label}`,
    });
  }
  return { stale, other };
}

/**
 * Push ops straight to the Worker (no localStorage outbox).
 *
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @param {unknown[]} ops
 * @param {() => number} getRevision
 * @param {(revision: number) => void} setRevision
 */
export async function pushCloudOpsDirect(api, roomId, ops, getRevision, setRevision) {
  const chunks = chunkCloudOps(ops);
  let appliedOps = 0;
  let staleRejected = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    const sanitized = sanitizeOpsForCloudPush(chunks[i]);
    if (!sanitized.ops.length) continue;
    const result = await pushChunkWithRetry(api, roomId, sanitized, i, getRevision);
    noteCloudOpsAttempted(sanitized.ops);
    if (result?.revision != null) {
      const next = Number(result.revision);
      const current = Number(getRevision() ?? 0);
      if (Number.isFinite(next) && next > current) setRevision(next);
    }
    const { stale: chunkStale } = recordRejectedCloudOps(result);
    staleRejected += chunkStale;
    appliedOps += sanitized.ops.length - chunkStale;
    noteCloudLabSidecarOpsSent(chunks[i], sanitized.ops);
  }
  return { appliedOps, chunks: chunks.length, staleRejected };
}
