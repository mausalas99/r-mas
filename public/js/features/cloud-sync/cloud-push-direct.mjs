import { sanitizeOpsForCloudPush, utf8JsonBytes } from './cloud-op-slim.mjs';
import { resolveCloudPushMutationId } from './push-mutation-id.mjs';
import { CLOUD_BATCH_MUTATION_ID } from './constants.mjs';

/** Target well under worker pull snapshot budget and browser payload limits. */
const CHUNK_BUDGET_BYTES = 180 * 1024;

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
  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];
    const bytes = utf8JsonBytes(op);
    if (current.length && currentBytes + bytes > CHUNK_BUDGET_BYTES) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(op);
    currentBytes += bytes;
  }
  if (current.length) chunks.push(current);
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
    const result = await api.push(roomId, {
      clientMutationId: `${resolveCloudPushMutationId(item)}:chunk${i}`,
      ops: sanitized.ops,
      baseRevision: getRevision() ?? 0,
    });
    if (result?.revision != null) {
      const next = Number(result.revision);
      const current = Number(getRevision() ?? 0);
      if (Number.isFinite(next) && next > current) setRevision(next);
    }
    appliedOps += sanitized.ops.length;
  }
  return { appliedOps, chunks: chunks.length };
}
