import { sanitizeOpsForCloudPush } from './cloud-op-slim.mjs';
import { chunkCloudOps } from './cloud-push-direct.mjs';
import { resolveCloudPushMutationId } from './push-mutation-id.mjs';
import { cloudSyncErrorMessage } from './cloud-sync-error-text.mjs';
import { isCloudTransientServerError } from './cloud-sync-timing.mjs';
import {
  noteCloudLabSidecarsFromPullResult,
  noteCloudLabSidecarOpsPushed,
} from './cloud-lab-sidecar-index.mjs';
import { drainSyncedLabSidecarsFromOutbox, splitLabBackfillInOutbox } from './outbox-lab.mjs';
import {
  cloudSyncErrorCode,
  noteCloudSyncPull,
  noteCloudSyncPush,
  recordCloudSyncError,
  recordCloudSyncTrace,
} from './cloud-sync-diagnostics.mjs';

/** Concurrent Nube writers; Worker returns 409 revision_stale / conflict. */
const PUSH_STALE_RETRIES = 3;
/** Transient 502/503/504 from saturated Worker / D1. */
const PUSH_TRANSIENT_RETRIES = 3;
const PUSH_TRANSIENT_DELAY_MS = 2000;

/**
 * @param {number} ms
 */
function delayMs(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

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
 * @param {object} pctx
 * @param {number} revision
 * @param {number} since
 * @param {number} opsCount
 */
function reconcileServerRevision(pctx, revision, since, opsCount) {
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
  const result = await api.pull(roomId, since, pollMobile ? { mobile: true } : undefined);
  const opsCount = pullOpsCount(result);
  if (result?.revision != null) {
    reconcileServerRevision(pctx, Number(result.revision), since, opsCount);
  }
  const labIngress = pollMobile ? await recordLabPullIngress(result) : null;
  await finalizePull(pctx, result, since, opsCount, labIngress);
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
 * @param {object} ctx
 * @param {string} roomId
 * @param {{ clientMutationId: string, baseRevision?: number, enqueuedAt?: number }} item
 * @param {unknown[]} ops
 * @param {number} [chunkIndex]
 */
async function pushSingleWithStaleRetry(ctx, roomId, item, ops, chunkIndex) {
  const { api, getRevision, pullLatest } = ctx;
  if (!api || typeof api.push !== 'function') {
    throw new Error('Cliente Nube no configurado');
  }
  const suffix = chunkIndex != null ? `:c${chunkIndex}` : '';
  let lastErr;
  let transientAttempts = 0;
  for (let attempt = 0; attempt <= PUSH_STALE_RETRIES; attempt++) {
    try {
      return await api.push(roomId, {
        clientMutationId: `${resolveCloudPushMutationId(item)}${suffix}`,
        ops,
        baseRevision: getRevision() ?? item.baseRevision ?? 0,
      });
    } catch (err) {
      lastErr = err;
      if (isCloudTransientServerError(err) && transientAttempts < PUSH_TRANSIENT_RETRIES) {
        transientAttempts += 1;
        await delayMs(PUSH_TRANSIENT_DELAY_MS * transientAttempts);
        continue;
      }
      if (!isCloudRevisionStaleError(err) || attempt >= PUSH_STALE_RETRIES) throw err;
      await pullLatest();
    }
  }
  throw lastErr;
}

/**
 * @param {object} ctx
 * @param {string} roomId
 * @param {{ clientMutationId: string, baseRevision?: number, enqueuedAt?: number }} item
 * @param {unknown[]} ops
 */
async function pushWithStaleRetry(ctx, roomId, item, ops) {
  const { applyServerRevision, pullLatest } = ctx;
  const chunks = chunkCloudOps(ops);
  if (!chunks.length) return null;
  let lastResult = null;
  for (let i = 0; i < chunks.length; i += 1) {
    const sanitized = sanitizeOpsForCloudPush(chunks[i]);
    if (!sanitized.ops.length) continue;
    const chunkItem = {
      clientMutationId: item.clientMutationId,
      enqueuedAt: (item.enqueuedAt || Date.now()) + i,
      baseRevision: item.baseRevision,
    };
    lastResult = await pushSingleWithStaleRetry(
      ctx,
      roomId,
      chunkItem,
      sanitized.ops,
      chunks.length > 1 ? i : undefined,
    );
    if (lastResult?.revision != null) applyServerRevision(Number(lastResult.revision));
    noteCloudLabSidecarOpsPushed(sanitized.ops);
    if (lastResult?.needPull) await pullLatest();
  }
  return lastResult;
}

/**
 * @param {object} ctx
 * @param {string} roomId
 * @param {{ clientMutationId: string, baseRevision?: number, enqueuedAt?: number, ops: unknown[] }} item
 * @returns {Promise<unknown>} error, if the item is still pending after the attempt
 */
async function flushOutboxItem(ctx, roomId, item) {
  const { outbox, pace, applyServerRevision } = ctx;
  const sanitized = sanitizeOpsForCloudPush(item.ops);
  if (sanitized.dropped > 0) {
    recordCloudSyncTrace('push_drop', {
      clientMutationId: item.clientMutationId,
      dropped: sanitized.dropped,
    });
  }
  if (!sanitized.ops.length) {
    outbox.remove(item.clientMutationId);
    return null;
  }
  try {
    const result = await pushWithStaleRetry(ctx, roomId, item, sanitized.ops);
    outbox.remove(item.clientMutationId);
    noteCloudLabSidecarOpsPushed(sanitized.ops);
    pace.markLocalWrite();
    if (result?.revision != null) applyServerRevision(Number(result.revision));
    noteCloudSyncPush();
    recordCloudSyncTrace('push', {
      clientMutationId: item.clientMutationId,
      opCount: sanitized.ops.length,
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
  const pending = outbox.list();
  if (pending.length === 0) return;
  setStatus('syncing');
  /** One stuck row (e.g. one patient's oversized batch) must not block every other row. */
  let firstErr = null;
  for (const item of pending) {
    const err = await flushOutboxItem(ctx, roomId, item);
    if (err && !firstErr) firstErr = err;
  }
  if (firstErr) {
    setStatus('error', cloudSyncErrorMessage(firstErr, 'No se pudo enviar un cambio a la nube.'));
    throw firstErr;
  }
}
