import {
  isCloudTransientServerError
} from "/mobile/js/chunks/chunk-6CYAI7OE.js";
import {
  CLOUD_BATCH_MUTATION_ID,
  noteCloudLabSidecarOpsPushed,
  sanitizeOpsForCloudPush,
  utf8JsonBytes
} from "/mobile/js/chunks/chunk-SRMOQLQ5.js";

// public/js/features/cloud-sync/push-mutation-id.mjs
function resolveCloudPushMutationId(entry) {
  const base = String(entry?.clientMutationId || "").trim();
  const stamp = Number(entry?.enqueuedAt) || Date.now();
  if (!base) return `cloud-push:${stamp}`;
  return `${base}:${stamp}`;
}

// public/js/features/cloud-sync/cloud-push-direct.mjs
var DIRECT_PUSH_TRANSIENT_RETRIES = 3;
var DIRECT_PUSH_TRANSIENT_DELAY_MS = 2e3;
function delayMs(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}
var CHUNK_BUDGET_BYTES = 180 * 1024;
var MAX_LAB_OPS_PER_CHUNK = 6;
var MAX_OPS_PER_CHUNK = 16;
function isLabSidecarOp(op) {
  return String(op?.path || "").startsWith("labSidecars/");
}
function countLabSidecarOps(ops) {
  let n = 0;
  for (let i = 0; i < ops.length; i += 1) {
    if (isLabSidecarOp(ops[i])) n += 1;
  }
  return n;
}
function chunkCloudOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return [];
  const chunks = [];
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
    const labCap = isLabSidecarOp(op) && current.length > 0 && countLabSidecarOps(current) >= MAX_LAB_OPS_PER_CHUNK;
    const opCap = current.length >= MAX_OPS_PER_CHUNK;
    const byteCap = current.length > 0 && currentBytes + bytes > CHUNK_BUDGET_BYTES;
    if (labCap || opCap || byteCap) flush();
    current.push(op);
    currentBytes += bytes;
  }
  flush();
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
    let transientAttempts = 0;
    let result;
    for (; ; ) {
      try {
        result = await api.push(roomId, {
          clientMutationId: `${resolveCloudPushMutationId(item)}:chunk${i}`,
          ops: sanitized.ops,
          baseRevision: getRevision() ?? 0
        });
        break;
      } catch (err) {
        if (isCloudTransientServerError(err) && transientAttempts < DIRECT_PUSH_TRANSIENT_RETRIES) {
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
    noteCloudLabSidecarOpsPushed(sanitized.ops);
  }
  return { appliedOps, chunks: chunks.length };
}

export {
  resolveCloudPushMutationId,
  CHUNK_BUDGET_BYTES,
  MAX_LAB_OPS_PER_CHUNK,
  MAX_OPS_PER_CHUNK,
  chunkCloudOps,
  pushCloudOpsDirect
};
//# sourceMappingURL=/js/chunks/chunk-HT2CLYXO.js.map
