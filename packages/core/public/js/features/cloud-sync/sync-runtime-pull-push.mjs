import { cloudPullProgress } from '../../clinical-session-context.mjs';
import { sanitizeOpsForCloudPush } from './cloud-op-slim.mjs';
import { drainCloudOps, recordRejectedCloudOps } from './cloud-push-direct.mjs';
import { nextWireIdStamp, resolveCloudPushMutationId } from './push-mutation-id.mjs';
import { cloudSyncErrorMessage } from './cloud-sync-error-text.mjs';
import {
  noteCloudLabSidecarsFromPullResult,
  noteCloudLabSidecarOpsSent,
  isLabSidecarOutboxMutationId,
} from './cloud-lab-sidecar-index.mjs';
import {
  noteCloudMedRecetaFromPullResult,
  noteCloudMedRecetaOpsSent,
} from './cloud-med-receta-index.mjs';
import { drainSyncedLabSidecarsFromOutbox, splitLabBackfillInOutbox } from './outbox-lab.mjs';
import { noteCloudOpsAttempted } from './cloud-sync-echo-guard.mjs';
import {
  cloudSyncErrorCode,
  noteCloudSyncPull,
  noteCloudSyncPush,
  recordCloudSyncError,
  recordCloudSyncTrace,
} from './cloud-sync-diagnostics.mjs';

/** Concurrent Nube writers; Worker returns 409 revision_stale / conflict. */
const PUSH_STALE_RETRIES = 3;

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isCloudRevisionStaleError(err) {
  const data = err && typeof err === 'object' ? /** @type {{ data?: { error?: string } }} */ (err) : null;
  const code = String(data?.data?.error || '').trim();
  return code === 'revision_stale' || code === 'conflict';
}

/**
 * @param {object} deps
 * @param {(status: import('./sync-runtime-cycle.mjs').CloudSyncStatus, detail?: string) => void} setStatus
 * @param {{ pendingCount: () => number, refreshIdleStatus: () => void }} outboxSync
 * @param {{ markLocalWrite: () => void }} pace
 */
export function createPullPush(deps, setStatus, outboxSync, pace) {
  const { api, outbox, getRoomId, getRevision, setRevision, applyPullResult, pollMobile } = deps;

  const applyServerRevision = (revision) => applyServerRevisionImpl(getRevision, setRevision, revision);
  const pullLatest = () =>
    runPullLatest({
      api,
      outbox,
      getRoomId,
      getRevision,
      setRevision,
      applyPullResult,
      pollMobile,
      outboxSync,
      applyServerRevision,
    });

  return createPullPushOps({
    api,
    outbox,
    getRoomId,
    getRevision,
    setStatus,
    outboxSync,
    pace,
    pullLatest,
    applyServerRevision,
  });
}

/**
 * @param {() => number} getRevision
 * @param {(revision: number) => void} setRevision
 * @param {number} revision
 */
function applyServerRevisionImpl(getRevision, setRevision, revision) {
  const next = Number(revision);
  if (!Number.isFinite(next) || next <= 0) return;
  const current = Number(getRevision() ?? 0);
  if (next <= current) return;
  setRevision(next);
}

/**
 * `locked` (set by api-client) means this device could not open part of the
 * payload, so pull-apply dropped it. Holding the revision back is what keeps
 * those ops inside the next pull's `since` window — they come back on their
 * own once the room DEK loads. Advancing would lose them for good.
 * @param {object} pctx
 * @param {number} revision
 * @param {number} since
 * @param {number} opsCount
 * @param {boolean} [locked]
 */
function reconcileServerRevision(pctx, revision, since, opsCount, locked) {
  if (locked) {
    recordCloudSyncTrace('pull_locked', { since, opsCount });
    return;
  }
  const next = Number(revision);
  if (!Number.isFinite(next) || next <= 0) return;
  const sinceNum = Number(since) || 0;
  if (opsCount === 0 && sinceNum >= next) {
    pctx.setRevision(next);
    return;
  }
  pctx.applyServerRevision(next);
}

/** @param {unknown} result */
async function recordLabPullIngress(result) {
  try {
    const labDiag = await import('../cloud-mobile/lab-sync-diagnostics.mjs');
    const raw = result?.state ? labDiag.countLabSidecarsInState(result.state) : { patients: 0, sets: 0 };
    const labOpsInPayload = labDiag.countLabOpsInPullResult(result);
    const labIngress = {
      needSnapshot: !!result?.needSnapshot,
      revision: result?.revision != null ? Number(result.revision) : null,
      opsCount: Array.isArray(result?.ops) ? result.ops.length : 0,
      labOpsInPayload: labOpsInPayload,
      rawSidecars: raw,
      filteredSidecars: raw,
    };
    labDiag.recordLabPullIngress(labIngress);
    return labIngress;
  } catch {
    return null;
  }
}

/** @param {unknown} result */
function pullOpsCount(result) {
  return Array.isArray(result?.ops) ? result.ops.length : 0;
}

/**
 * @param {object} pctx
 * @param {unknown} result
 * @param {number} since
 * @param {number} opsCount
 * @param {unknown} labIngress
 */
async function finalizePull(pctx, result, since, opsCount, labIngress) {
  const { applyPullResult, outbox, outboxSync } = pctx;
  if (applyPullResult) await applyPullResult(result);
  noteCloudLabSidecarsFromPullResult(result);
  noteCloudMedRecetaFromPullResult(result);
  drainSyncedLabSidecarsFromOutbox(outbox);
  outboxSync.refreshIdleStatus();
  noteCloudSyncPull();
  recordCloudSyncTrace('pull', {
    since,
    revision: result?.revision != null ? Number(result.revision) : null,
    opsCount,
    labOpsInPayload: labIngress?.labOpsInPayload ?? null,
  });
}

/** @param {object} pctx */
async function runPullLatest(pctx) {
  const { api, getRoomId, getRevision, pollMobile } = pctx;
  const roomId = getRoomId();
  if (!roomId) return;
  if (!api || typeof api.pull !== 'function') {
    throw new Error('Cliente Nube no configurado');
  }
  const since = getRevision() ?? 0;
  // since === 0 means this client has no local revision yet — a fresh room
  // join, about to pull the whole history. The sidebar sits empty for that
  // whole round trip; "Descargando pacientes…" replaces "Sin pacientes aún"
  // for real reasons while this is true, not because there truly are none.
  const freshJoin = since === 0;
  if (freshJoin) {
    cloudPullProgress.freshInFlight = true;
    if (typeof document !== 'undefined') {
      try {
        const { renderPatientList } = await import('../patients.mjs');
        renderPatientList({ silent: true });
      } catch {
        /* list optional during boot */
      }
    }
  }
  try {
    const result = await api.pull(roomId, since, pollMobile ? { mobile: true } : undefined);
    const opsCount = pullOpsCount(result);
    if (result?.revision != null) {
      reconcileServerRevision(pctx, Number(result.revision), since, opsCount, !!result.locked);
    }
    const labIngress = pollMobile ? await recordLabPullIngress(result) : null;
    await finalizePull(pctx, result, since, opsCount, labIngress);
  } finally {
    if (freshJoin) cloudPullProgress.freshInFlight = false;
  }
}

/**
 * @param {object} ctx
 */
function createPullPushOps(ctx) {
  async function flushOutbox() {
    return runFlushOutbox(ctx);
  }

  return { pullLatest: ctx.pullLatest, flushOutbox };
}

/**
 * Push one already-sized chunk. Stale/conflict (409) retries here, right after
 * a fresh pull — a backoff-class error (503/D1-overload/429) is NOT retried
 * here; it throws back to drainCloudOps, which re-cuts the whole drain smaller
 * via the AIMD pacer instead of hammering the same oversized chunk.
 *
 * @param {object} ctx
 * @param {string} roomId
 * @param {{ clientMutationId: string, baseRevision?: number, enqueuedAt?: number }} item
 * @param {unknown[]} chunk raw (pre-sanitize) ops for this chunk
 * @param {number} attempt running attempt count across the whole drain
 */
async function pushSingleWithStaleRetry(ctx, roomId, item, chunk, attempt) {
  const { api, getRevision, pullLatest } = ctx;
  if (!api || typeof api.push !== 'function') {
    throw new Error('Cliente Nube no configurado');
  }
  const sanitized = sanitizeOpsForCloudPush(chunk);
  if (!sanitized.ops.length) return { sanitized, pushResult: null };
  let lastErr;
  for (let staleAttempt = 0; staleAttempt <= PUSH_STALE_RETRIES; staleAttempt += 1) {
    try {
      const pushResult = await api.push(roomId, {
        // Unique per drain attempt — a chunk re-cut smaller after congestion
        // never collides with the Worker's cached response for an earlier one.
        clientMutationId: `${resolveCloudPushMutationId(item)}:a${attempt}:${nextWireIdStamp()}`,
        ops: sanitized.ops,
        baseRevision: getRevision() ?? item.baseRevision ?? 0,
      });
      return { sanitized, pushResult };
    } catch (err) {
      lastErr = err;
      if (!isCloudRevisionStaleError(err) || staleAttempt >= PUSH_STALE_RETRIES) throw err;
      await pullLatest();
    }
  }
  throw lastErr;
}

/**
 * Drain one outbox row's ops through the Worker, AIMD-paced. Each chunk is
 * removed from the outbox as soon as it's acked (or dropped by the
 * sanitizer) — a later chunk's failure leaves only the unsent ops behind,
 * not the whole row.
 *
 * @param {object} ctx
 * @param {string} roomId
 * @param {{ clientMutationId: string, baseRevision?: number, enqueuedAt?: number }} item
 * @param {unknown[]} ops raw ops for the whole row
 * @param {(sent: number, total: number) => void} [onProgress]
 */
async function pushWithStaleRetry(ctx, roomId, item, ops, onProgress) {
  const { applyServerRevision, pullLatest, outbox } = ctx;
  if (!Array.isArray(ops) || !ops.length) return null;
  let lastResult = null;
  let totalDropped = 0;
  await drainCloudOps({
    ops,
    sendChunk: (chunk, attempt) => pushSingleWithStaleRetry(ctx, roomId, item, chunk, attempt),
    onProgress,
    async onChunkAcked(chunk, { sanitized, pushResult }) {
      totalDropped += sanitized.dropped;
      // Removed whether it was actually sent or fully dropped by the
      // sanitizer (echoed/poison ops must not come back forever).
      outbox.removeOps(item.clientMutationId, chunk);
      if (!pushResult) return;
      noteCloudOpsAttempted(sanitized.ops);
      recordRejectedCloudOps(pushResult);
      if (pushResult.revision != null) applyServerRevision(Number(pushResult.revision));
      noteCloudLabSidecarOpsSent(chunk, sanitized.ops);
      noteCloudMedRecetaOpsSent(sanitized.ops);
      lastResult = pushResult;
      if (pushResult.needPull) await pullLatest();
    },
  });
  if (totalDropped > 0) {
    recordCloudSyncTrace('push_drop', {
      clientMutationId: item.clientMutationId,
      dropped: totalDropped,
    });
  }
  return lastResult;
}

/**
 * @param {object} ctx
 * @param {string} roomId
 * @param {{ clientMutationId: string, baseRevision?: number, enqueuedAt?: number, ops: unknown[] }} item
 * @param {(sent: number, total: number) => void} [onProgress]
 * @returns {Promise<unknown>} error, if the item is still pending after the attempt
 */
async function flushOutboxItem(ctx, roomId, item, onProgress) {
  const { outbox, pace, applyServerRevision } = ctx;
  try {
    const result = await pushWithStaleRetry(ctx, roomId, item, item.ops, onProgress);
    // Matches the row snapshot taken at the start of this flush — ops merged
    // into the same clientMutationId while this drain was in flight have a
    // different (path, updatedAt) and are not touched, so they survive.
    outbox.removeOps(item.clientMutationId, item.ops);
    pace.markLocalWrite();
    if (result?.revision != null) applyServerRevision(Number(result.revision));
    noteCloudSyncPush();
    recordCloudSyncTrace('push', {
      clientMutationId: item.clientMutationId,
      opCount: Array.isArray(item.ops) ? item.ops.length : 0,
      revision: result?.revision != null ? Number(result.revision) : null,
    });
    return null;
  } catch (err) {
    drainSyncedLabSidecarsFromOutbox(outbox);
    const stillPending = outbox.list().some(function (row) {
      return String(row?.clientMutationId || '') === String(item.clientMutationId || '');
    });
    if (!stillPending) return null;
    recordCloudSyncError({
      op: 'push',
      code: cloudSyncErrorCode(err),
      message: cloudSyncErrorMessage(err, 'No se pudo enviar un cambio a la nube.'),
    });
    return err;
  }
}

/** @param {{ clientMutationId?: string, enqueuedAt?: number }} row */
function outboxRowKey(row) {
  return `${row?.clientMutationId ?? ''}@${row?.enqueuedAt ?? ''}`;
}

/**
 * First not-yet-tried non-lab row wins the turn, so a live edit never waits
 * behind a lab backfill; falls back to the first not-yet-tried row otherwise.
 * @param {{ clientMutationId?: string, enqueuedAt?: number }[]} pending
 * @param {Set<string>} tried
 */
function pickNextOutboxRow(pending, tried) {
  let fallback = null;
  for (const row of pending) {
    if (tried.has(outboxRowKey(row))) continue;
    if (!isLabSidecarOutboxMutationId(row.clientMutationId)) return row;
    if (!fallback) fallback = row;
  }
  return fallback;
}

/** @param {object} ctx */
async function runFlushOutbox(ctx) {
  const { getRoomId, setStatus, outboxSync, outbox } = ctx;
  const roomId = getRoomId();
  if (!roomId) return;
  if (!navigator.onLine) {
    setStatus(outboxSync.pendingCount() > 0 ? 'pending' : 'offline');
    return;
  }
  splitLabBackfillInOutbox(outbox);
  if (outbox.list().length === 0) return;
  setStatus('syncing');
  /** One stuck row (e.g. one patient's oversized batch) must not block every other row. */
  let firstErr = null;
  let doneOps = 0;
  // Re-list and re-pick every turn, instead of looping one snapshot, so a row
  // enqueued (or merged with new ops) after this flush started is seen and
  // preferred on the very next turn — not only after a lab backfill drains.
  const tried = new Set();
  for (;;) {
    const pending = outbox.list();
    const item = pending.length ? pickNextOutboxRow(pending, tried) : null;
    if (!item) break;
    tried.add(outboxRowKey(item));
    const total = doneOps + pending.reduce(
      (sum, row) => sum + (Array.isArray(row?.ops) ? row.ops.length : 0),
      0
    );
    const baseDone = doneOps;
    const err = await flushOutboxItem(ctx, roomId, item, (sent) => {
      setStatus('syncing', `Enviando ${baseDone + sent}/${total} cambios`);
    });
    doneOps = baseDone + (Array.isArray(item.ops) ? item.ops.length : 0);
    if (err && !firstErr) firstErr = err;
  }
  if (firstErr) {
    setStatus('error', cloudSyncErrorMessage(firstErr, 'No se pudo enviar un cambio a la nube.'));
    throw firstErr;
  }
}
