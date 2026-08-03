/**
 * Slim cloud mutation ops so lab sidecars fit Free-pilot quotas.
 * Keep in sync with cloud/sync-worker/src/quotas.js
 *
 * Lab pipeline: PDF → parse → discard PDF. Only text (`sourceText` + `resLabs`)
 * remains locally; Nube never carries PDF/binary. If a text set still exceeds
 * the lab mutation quota, truncate `sourceText` (keep structured `resLabs`).
 */
export const CLOUD_LAB_MUTATION_MAX_BYTES = 512 * 1024;
export const CLOUD_NOTE_MAX_BYTES = 256 * 1024;

/** Binary / temp artifacts — never sync (PDF is parse-only and deleted locally). */
const LAB_DROP_KEYS = new Set([
  'pdf',
  'pdfBase64',
  'pdfData',
  'pdfBytes',
  'rawHtml',
  'html',
  '_raw',
]);

/** @param {unknown} value */
export function utf8JsonBytes(value) {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Copy lab set without PDF/binary keys. Keeps sourceText (parsed SOME text).
 * @param {unknown} set
 */
export function slimLabSetForCloud(set) {
  if (!set || typeof set !== 'object') return set;
  const src = /** @type {Record<string, unknown>} */ (set);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of Object.keys(src)) {
    if (LAB_DROP_KEYS.has(key)) continue;
    out[key] = src[key];
  }
  return out;
}

/**
 * If set exceeds maxBytes, shrink/drop sourceText until it fits (resLabs stay).
 * @param {unknown} set
 * @param {number} maxBytes
 */
export function fitLabSetToQuota(set, maxBytes = CLOUD_LAB_MUTATION_MAX_BYTES) {
  let out = slimLabSetForCloud(set);
  if (!out || typeof out !== 'object') return out;
  if (utf8JsonBytes(out) <= maxBytes) return out;

  const row = /** @type {Record<string, unknown>} */ ({ ...out });
  const text = String(row.sourceText || '');
  if (!text) {
    delete row.sourceText;
    return utf8JsonBytes(row) <= maxBytes ? row : null;
  }

  // Binary search max sourceText length that still fits.
  let lo = 0;
  let hi = text.length;
  let best = '';
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    row.sourceText = text.slice(0, mid);
    if (utf8JsonBytes(row) <= maxBytes) {
      best = /** @type {string} */ (row.sourceText);
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

/** @param {string} path */
function maxBytesForPath(path) {
  return String(path || '').startsWith('labSidecars/')
    ? CLOUD_LAB_MUTATION_MAX_BYTES
    : CLOUD_NOTE_MAX_BYTES;
}

/**
 * @param {{ path?: string, value?: unknown } | null | undefined} op
 */
export function slimCloudOp(op) {
  if (!op || typeof op !== 'object') return op;
  const path = String(op.path || '');
  if (!path.startsWith('labSidecars/')) return op;
  const fitted = fitLabSetToQuota(op.value, CLOUD_LAB_MUTATION_MAX_BYTES);
  if (fitted == null) return null;
  return { ...op, value: fitted };
}

/**
 * Slim + drop ops that still exceed worker quotas (poison pills).
 * @param {unknown[]} ops
 * @returns {{ ops: unknown[], dropped: number }}
 */
export function sanitizeOpsForCloudPush(ops) {
  if (!Array.isArray(ops) || !ops.length) return { ops: [], dropped: 0 };
  const next = [];
  let dropped = 0;
  for (let i = 0; i < ops.length; i += 1) {
    const slimmed = slimCloudOp(/** @type {{ path?: string, value?: unknown }} */ (ops[i]));
    if (!slimmed || typeof slimmed !== 'object') {
      dropped += 1;
      continue;
    }
    const path = String(slimmed.path || '');
    if (utf8JsonBytes(slimmed.value) > maxBytesForPath(path)) {
      dropped += 1;
      continue;
    }
    next.push(slimmed);
  }
  return { ops: next, dropped };
}
