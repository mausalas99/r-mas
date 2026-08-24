import { sanitizeOpsForCloudPush, utf8JsonBytes } from './cloud-op-slim.mjs';
import { resolveCloudPushMutationId } from './push-mutation-id.mjs';
import { CLOUD_BATCH_MUTATION_ID } from './constants.mjs';
import { noteCloudLabSidecarOpsSent } from './cloud-lab-sidecar-index.mjs';
import { isCloudTransientServerError } from './cloud-sync-timing.mjs';

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
  for (let i = 0; i < chunks.length; i += 1) {
    const sanitized = sanitizeOpsForCloudPush(chunks[i]);
    if (!sanitized.ops.length) continue;
    const item = {
      clientMutationId: CLOUD_BATCH_MUTATION_ID,
      enqueuedAt: Date.now() + i,
    };
    let transientAttempts = 0;
    let result;
    for (;;) {
      try {
        result = await api.push(roomId, {
          clientMutationId: `${resolveCloudPushMutationId(item)}:chunk${i}`,
          ops: sanitized.ops,
          baseRevision: getRevision() ?? 0,
        });
        break;
      } catch (err) {
        if (
          isCloudTransientServerError(err) &&
          transientAttempts < DIRECT_PUSH_TRANSIENT_RETRIES
        ) {
          transientAttempts += 1;
          await delayMs(DIRECT_PUSH_TRANSIENT_DELAY_MS * transientAttempts);
          continue;
        }
        throw err;
      }
    }
    if (result?.revision != null) {
      const next = Number(result.revision);
      const current = Number(getRevision() ?? 0);
      if (Number.isFinite(next) && next > current) setRevision(next);
    }
    appliedOps += sanitized.ops.length;
    noteCloudLabSidecarOpsSent(chunks[i], sanitized.ops);
  }
  return { appliedOps, chunks: chunks.length };
}
