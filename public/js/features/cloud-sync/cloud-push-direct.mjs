import { sanitizeOpsForCloudPush, utf8JsonBytes } from './cloud-op-slim.mjs';
import { resolveCloudPushMutationId } from './push-mutation-id.mjs';
import { CLOUD_BATCH_MUTATION_ID } from './constants.mjs';
import { noteCloudLabSidecarOpsSent } from './cloud-lab-sidecar-index.mjs';
import { noteCloudMedRecetaOpsSent } from './cloud-med-receta-index.mjs';
import {
  cloudDrainPacer,
  CLOUD_DRAIN_MAX_CONGESTION_EVENTS,
  isCloudBackoffError,
} from './cloud-sync-timing.mjs';
import { recordCloudSyncError } from './cloud-sync-diagnostics.mjs';
import { noteCloudOpsAttempted } from './cloud-sync-echo-guard.mjs';

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
 * @param {number} [maxOps] Worker op cap per chunk — the AIMD pacer shrinks this on congestion.
 * @returns {unknown[][]}
 */
export function chunkCloudOps(ops, maxOps = MAX_OPS_PER_CHUNK) {
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
    const opCap = current.length >= maxOps;
    const byteCap = current.length > 0 && currentBytes + bytes > CHUNK_BUDGET_BYTES;
    if (labCap || opCap || byteCap) flush();
    current.push(op);
    currentBytes += bytes;
  }
  flush();
  return chunks;
}

/**
 * Drain `ops` through `sendChunk`, sized and paced by the AIMD `pacer` (shared
 * with every other drain against the same D1 — see cloudDrainPacer). Chunk
 * size is re-cut from `pacer.chunkOps()` on every pass, so a congested drain
 * shrinks mid-flight instead of retrying the same oversized chunk.
 *
 * On a backoff-class error (D1 overload, rate limit) the pacer backs off,
 * the drain waits a jittered gap, and the same remaining ops are re-cut and
 * retried — up to `CLOUD_DRAIN_MAX_CONGESTION_EVENTS` times, after which it
 * throws so the cycle-level backoff (sync-runtime-schedule.mjs) takes over.
 * Any other error (permanent, or stale retries exhausted inside `sendChunk`)
 * throws immediately.
 *
 * @param {{
 *   ops: unknown[],
 *   sendChunk: (chunk: unknown[], attempt: number) => Promise<unknown>,
 *   onChunkAcked?: (chunk: unknown[], result: unknown) => unknown | Promise<unknown>,
 *   onProgress?: (sent: number, total: number) => void,
 *   pacer?: ReturnType<typeof import('./cloud-sync-timing.mjs').createDrainPacer>,
 *   delay?: (ms: number) => Promise<void>,
 * }} opts
 */
export async function drainCloudOps({
  ops,
  sendChunk,
  onChunkAcked,
  onProgress,
  pacer = cloudDrainPacer,
  delay = delayMs,
}) {
  const total = Array.isArray(ops) ? ops.length : 0;
  let remaining = Array.isArray(ops) ? ops.slice() : [];
  let sent = 0;
  let attempt = 0;
  let congestionEvents = 0;
  let lastResult = null;

  while (remaining.length) {
    const chunk = chunkCloudOps(remaining, pacer.chunkOps())[0] || [];
    if (!chunk.length) break;
    attempt += 1;
    let result;
    try {
      result = await sendChunk(chunk, attempt);
    } catch (err) {
      if (isCloudBackoffError(err) && congestionEvents < CLOUD_DRAIN_MAX_CONGESTION_EVENTS) {
        congestionEvents += 1;
        pacer.onCongested(err);
        await delay(pacer.gapMs());
        continue;
      }
      throw err;
    }
    pacer.onClean();
    remaining = remaining.slice(chunk.length);
    sent += chunk.length;
    if (onChunkAcked) await onChunkAcked(chunk, result);
    onProgress?.(sent, total);
    lastResult = result;
    if (remaining.length) await delay(pacer.gapMs());
  }
  return lastResult;
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
  let appliedOps = 0;
  let staleRejected = 0;
  let chunksSent = 0;

  /** @param {unknown[]} chunk @param {number} attempt */
  async function sendChunk(chunk, attempt) {
    const sanitized = sanitizeOpsForCloudPush(chunk);
    if (!sanitized.ops.length) return { sanitized, pushResult: null };
    const item = { clientMutationId: CLOUD_BATCH_MUTATION_ID, enqueuedAt: Date.now() };
    const pushResult = await api.push(roomId, {
      // Unique per attempt so a chunk re-cut smaller after congestion never
      // collides with the Worker's cached response for an earlier attempt.
      clientMutationId: `${resolveCloudPushMutationId(item)}:a${attempt}:${Date.now()}`,
      ops: sanitized.ops,
      baseRevision: getRevision() ?? 0,
    });
    return { sanitized, pushResult };
  }

  await drainCloudOps({
    ops,
    sendChunk,
    onChunkAcked(chunk, { sanitized, pushResult }) {
      chunksSent += 1;
      if (!pushResult) return;
      noteCloudOpsAttempted(sanitized.ops);
      if (pushResult.revision != null) {
        const next = Number(pushResult.revision);
        const current = Number(getRevision() ?? 0);
        if (Number.isFinite(next) && next > current) setRevision(next);
      }
      const { stale: chunkStale } = recordRejectedCloudOps(pushResult);
      staleRejected += chunkStale;
      appliedOps += sanitized.ops.length - chunkStale;
      noteCloudLabSidecarOpsSent(chunk, sanitized.ops);
      noteCloudMedRecetaOpsSent(sanitized.ops);
    },
  });

  return { appliedOps, chunks: chunksSent, staleRejected };
}
