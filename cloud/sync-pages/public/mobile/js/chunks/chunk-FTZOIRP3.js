import {
  resolveCloudPushMutationId
} from "/mobile/js/chunks/chunk-3ETJLEUF.js";
import {
  CLOUD_BATCH_MUTATION_ID,
  sanitizeOpsForCloudPush,
  utf8JsonBytes
} from "/mobile/js/chunks/chunk-CO6ZSBF2.js";

// public/js/features/cloud-sync/cloud-push-direct.mjs
var CHUNK_BUDGET_BYTES = 180 * 1024;
function chunkCloudOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return [];
  const chunks = [];
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
async function pushCloudOpsDirect(api, roomId, ops, getRevision, setRevision) {
  const chunks = chunkCloudOps(ops);
  let appliedOps = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    const sanitized = sanitizeOpsForCloudPush(chunks[i]);
    if (!sanitized.ops.length) continue;
    const item = {
      clientMutationId: CLOUD_BATCH_MUTATION_ID,
      enqueuedAt: Date.now() + i
    };
    const result = await api.push(roomId, {
      clientMutationId: `${resolveCloudPushMutationId(item)}:chunk${i}`,
      ops: sanitized.ops,
      baseRevision: getRevision() ?? 0
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

export {
  chunkCloudOps,
  pushCloudOpsDirect
};
//# sourceMappingURL=/js/chunks/chunk-FTZOIRP3.js.map
