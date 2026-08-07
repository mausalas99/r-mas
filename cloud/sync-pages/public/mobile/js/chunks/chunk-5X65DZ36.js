// public/js/features/cloud-sync/constants.mjs
var CLOUD_BATCH_MUTATION_ID = "cloud-room-push";

// public/js/features/cloud-sync/cloud-op-slim.mjs
var CLOUD_LAB_MUTATION_MAX_BYTES = 512 * 1024;
var CLOUD_NOTE_MAX_BYTES = 256 * 1024;
var LAB_DROP_KEYS = /* @__PURE__ */ new Set([
  "pdf",
  "pdfBase64",
  "pdfData",
  "pdfBytes",
  "rawHtml",
  "html",
  "_raw"
]);
function utf8JsonBytes(value) {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}
function slimLabSetForCloud(set) {
  if (!set || typeof set !== "object") return set;
  const src = (
    /** @type {Record<string, unknown>} */
    set
  );
  const out = {};
  for (const key of Object.keys(src)) {
    if (LAB_DROP_KEYS.has(key)) continue;
    out[key] = src[key];
  }
  return out;
}
function fitLabSetToQuota(set, maxBytes = CLOUD_LAB_MUTATION_MAX_BYTES) {
  let out = slimLabSetForCloud(set);
  if (!out || typeof out !== "object") return out;
  if (utf8JsonBytes(out) <= maxBytes) return out;
  const row = (
    /** @type {Record<string, unknown>} */
    { ...out }
  );
  const text = String(row.sourceText || "");
  if (!text) {
    delete row.sourceText;
    return utf8JsonBytes(row) <= maxBytes ? row : null;
  }
  let lo = 0;
  let hi = text.length;
  let best = "";
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    row.sourceText = text.slice(0, mid);
    if (utf8JsonBytes(row) <= maxBytes) {
      best = /** @type {string} */
      row.sourceText;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (best) {
    row.sourceText = best;
    return row;
  }
  delete row.sourceText;
  return utf8JsonBytes(row) <= maxBytes ? row : null;
}
function maxBytesForPath(path) {
  return String(path || "").startsWith("labSidecars/") ? CLOUD_LAB_MUTATION_MAX_BYTES : CLOUD_NOTE_MAX_BYTES;
}
function slimCloudOp(op) {
  if (!op || typeof op !== "object") return op;
  const path = String(op.path || "");
  if (!path.startsWith("labSidecars/")) return op;
  const fitted = fitLabSetToQuota(op.value, CLOUD_LAB_MUTATION_MAX_BYTES);
  if (fitted == null) return null;
  return { ...op, value: fitted };
}
function sanitizeOpsForCloudPush(ops) {
  if (!Array.isArray(ops) || !ops.length) return { ops: [], dropped: 0 };
  const next = [];
  let dropped = 0;
  for (let i = 0; i < ops.length; i += 1) {
    const slimmed = slimCloudOp(
      /** @type {{ path?: string, value?: unknown }} */
      ops[i]
    );
    if (!slimmed || typeof slimmed !== "object") {
      dropped += 1;
      continue;
    }
    const path = String(slimmed.path || "");
    if (utf8JsonBytes(slimmed.value) > maxBytesForPath(path)) {
      dropped += 1;
      continue;
    }
    next.push(slimmed);
  }
  return { ops: next, dropped };
}

export {
  CLOUD_BATCH_MUTATION_ID,
  utf8JsonBytes,
  slimLabSetForCloud,
  sanitizeOpsForCloudPush
};
//# sourceMappingURL=/js/chunks/chunk-5X65DZ36.js.map
