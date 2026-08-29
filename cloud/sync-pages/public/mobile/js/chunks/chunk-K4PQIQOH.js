import {
  CLOUD_BATCH_MUTATION_ID,
  noteCloudLabSidecarOpsSent,
  sanitizeOpsForCloudPush,
  utf8JsonBytes
} from "/mobile/js/chunks/chunk-BTIFFDH4.js";

// public/js/features/cloud-sync/push-mutation-id.mjs
function resolveCloudPushMutationId(entry) {
  const base = String(entry?.clientMutationId || "").trim();
  const stamp = Number(entry?.enqueuedAt) || Date.now();
  if (!base) return `cloud-push:${stamp}`;
  return `${base}:${stamp}`;
}

// public/js/features/cloud-sync/cloud-sync-timing.mjs
var CLOUD_POLL_IDLE_WS_MS = 9e4;
var CLOUD_POLL_MOBILE_IDLE_WS_MS = 6e4;
var CLOUD_POLL_ACTIVE_WS_MS = 3e4;
var CLOUD_POLL_IDLE_FALLBACK_MS = 2e4;
var CLOUD_POLL_MOBILE_IDLE_FALLBACK_MS = 25e3;
var CLOUD_POLL_ACTIVE_FALLBACK_MS = 8e3;
var CLOUD_POLL_ACTIVE_WINDOW_MS = 18e4;
var CLOUD_POLL_ERROR_MIN_MS = 3e4;
var CLOUD_POLL_ERROR_MAX_MS = 5 * 6e4;
var CLOUD_PUSH_DEBOUNCE_MS = 1500;
var CLOUD_PUSH_FIRST_MS = 600;
function nextCloudPollDelayMs(opts = {}) {
  const now = opts.now ?? Date.now();
  const streak = Math.max(0, Number(opts.errorStreak) || 0);
  if (opts.errored || streak > 0) {
    const exp = Math.min(
      CLOUD_POLL_ERROR_MAX_MS,
      CLOUD_POLL_ERROR_MIN_MS * Math.pow(2, Math.min(streak - 1, 4))
    );
    return exp;
  }
  const transport = opts.transport === "ws" ? "ws" : "poll";
  const idleMs = transport === "ws" ? opts.mobile ? CLOUD_POLL_MOBILE_IDLE_WS_MS : CLOUD_POLL_IDLE_WS_MS : opts.mobile ? CLOUD_POLL_MOBILE_IDLE_FALLBACK_MS : CLOUD_POLL_IDLE_FALLBACK_MS;
  const activeMs = transport === "ws" ? CLOUD_POLL_ACTIVE_WS_MS : CLOUD_POLL_ACTIVE_FALLBACK_MS;
  const lastWrite = Number(opts.lastLocalWriteAt) || 0;
  if (opts.pending || lastWrite && now - lastWrite < CLOUD_POLL_ACTIVE_WINDOW_MS) {
    return activeMs;
  }
  return idleMs;
}
function isCloudTransientServerError(err) {
  const status = Number(err && typeof err === "object" ? err.status : 0);
  return status === 502 || status === 503 || status === 504;
}
function isCloudRateLimitError(err) {
  const status = Number(err && typeof err === "object" ? err.status : 0);
  if (status === 429) return true;
  const msg = String(
    err && typeof err === "object" && (err.data?.message || err.message) || ""
  );
  return /rate.?limit|too many|429|demasiados intentos/i.test(msg);
}
function isCloudBackoffError(err) {
  return isCloudTransientServerError(err) || isCloudRateLimitError(err);
}
function retryAfterMsFromError(err, fallbackMs = CLOUD_POLL_ERROR_MIN_MS) {
  const headers = err && typeof err === "object" ? err.retryAfterMs : null;
  if (Number.isFinite(headers) && headers > 0) {
    return Math.min(CLOUD_POLL_ERROR_MAX_MS, Number(headers));
  }
  const ra = err && typeof err === "object" ? err.data?.retry_after : null;
  if (Number.isFinite(Number(ra))) {
    const sec = Number(ra);
    return Math.min(CLOUD_POLL_ERROR_MAX_MS, Math.max(CLOUD_POLL_ERROR_MIN_MS, sec * 1e3));
  }
  return fallbackMs;
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
    noteCloudLabSidecarOpsSent(chunks[i], sanitized.ops);
  }
  return { appliedOps, chunks: chunks.length };
}

export {
  CLOUD_PUSH_DEBOUNCE_MS,
  CLOUD_PUSH_FIRST_MS,
  nextCloudPollDelayMs,
  isCloudTransientServerError,
  isCloudBackoffError,
  retryAfterMsFromError,
  resolveCloudPushMutationId,
  CHUNK_BUDGET_BYTES,
  MAX_LAB_OPS_PER_CHUNK,
  MAX_OPS_PER_CHUNK,
  chunkCloudOps,
  pushCloudOpsDirect
};
//# sourceMappingURL=/js/chunks/chunk-K4PQIQOH.js.map
