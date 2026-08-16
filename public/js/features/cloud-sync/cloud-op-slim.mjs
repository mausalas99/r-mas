/**
 * Slim cloud mutation ops so lab sidecars fit Free-pilot quotas.
 * Keep in sync with cloud/sync-worker/src/quotas.js
 *
 * Lab pipeline: PDF → parse → discard PDF. Nube prefers SOME `sourceText`
 * so every client quietly re-parses; `resLabs` is the fallback when SOME
 * is missing or over quota.
 */
import { markCloudLabOpPoison } from './cloud-lab-sidecar-index.mjs';
import { looksLikeSomeLabReport } from '../../labs-report-refs.mjs';

/**
 * Must stay under cloud-push-direct.mjs CHUNK_BUDGET_BYTES (180KB) so any single
 * slimmed op always fits alone in a push chunk. A larger value here can produce
 * an op that can never be sent — permanent «payload_too_large», stuck outbox.
 */
export const CLOUD_LAB_MUTATION_MAX_BYTES = 150 * 1024;
export const CLOUD_NOTE_MAX_BYTES = 256 * 1024;
/** Align with cloud/sync-worker/src/quotas.js maxMutationBodyBytes (220KB). */
export const CLOUD_PUSH_WARN_BODY_BYTES = 200 * 1024;
export const CLOUD_PUSH_WARN_OP_BYTES = 180 * 1024;

/** Lab sidecar fields allowed on Nube. */
export const CLOUD_LAB_SET_ALLOWLIST = ['id', 'fecha', 'hora', 'resLabs', 'bhExtras', 'sourceText'];

/** @param {unknown} value */
export function utf8JsonBytes(value) {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * SOME report when present; otherwise parsed labs. Non-SOME paste stays local.
 * @param {unknown} set
 */
export function slimLabSetForCloud(set) {
  if (!set || typeof set !== 'object') return set;
  const src = /** @type {Record<string, unknown>} */ (set);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of CLOUD_LAB_SET_ALLOWLIST) {
    if (key === 'sourceText') continue;
    if (!(key in src)) continue;
    out[key] = src[key];
  }
  const some = String(src.sourceText || '');
  if (some.trim() && looksLikeSomeLabReport(some)) out.sourceText = some;
  return out;
}

/**
 * Shrink resLabs lines until the set fits the quota.
 * @param {Record<string, unknown>} row
 * @param {number} maxBytes
 */
function fitResLabsToQuota(row, maxBytes) {
  const lines = Array.isArray(row.resLabs) ? row.resLabs.map((line) => String(line || '')) : [];
  if (!lines.length) return utf8JsonBytes(row) <= maxBytes ? row : null;

  let lo = 0;
  let hi = lines.length;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const trial = { ...row, resLabs: lines.slice(0, mid) };
    if (utf8JsonBytes(trial) <= maxBytes) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (!best) return null;
  return { ...row, resLabs: lines.slice(0, best) };
}

/**
 * If set exceeds maxBytes, drop bhExtras then trim resLabs until it fits.
 * @param {unknown} set
 * @param {number} maxBytes
 */
export function fitLabSetToQuota(set, maxBytes = CLOUD_LAB_MUTATION_MAX_BYTES) {
  let out = slimLabSetForCloud(set);
  if (!out || typeof out !== 'object') return out;
  if (utf8JsonBytes(out) <= maxBytes) return out;

  const row = /** @type {Record<string, unknown>} */ ({ ...out });
  if (row.sourceText) {
    const someOnly = { ...row };
    delete someOnly.resLabs;
    delete someOnly.bhExtras;
    if (utf8JsonBytes(someOnly) <= maxBytes) return someOnly;
    delete row.sourceText;
    if (utf8JsonBytes(row) <= maxBytes) return row;
  }
  if (row.bhExtras) {
    delete row.bhExtras;
    if (utf8JsonBytes(row) <= maxBytes) return row;
  }
  return fitResLabsToQuota(row, maxBytes);
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
      const dropPath = String(ops[i]?.path || '');
      if (dropPath.startsWith('labSidecars/')) markCloudLabOpPoison(dropPath);
      continue;
    }
    const path = String(slimmed.path || '');
    if (utf8JsonBytes(slimmed.value) > maxBytesForPath(path)) {
      dropped += 1;
      if (path.startsWith('labSidecars/')) markCloudLabOpPoison(path);
      continue;
    }
    next.push(slimmed);
  }
  return { ops: next, dropped };
}
