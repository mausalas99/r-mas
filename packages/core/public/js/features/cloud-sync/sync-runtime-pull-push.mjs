import { cloudPullProgress } from '../../clinical-session-context.mjs';
import { sanitizeOpsForCloudPush } from './cloud-op-slim.mjs';
import { drainCloudOps, recordRejectedCloudOps, MAX_OPS_PER_CHUNK } from './cloud-push-direct.mjs';
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
  dropPullValuesOlderThanPending(result, outbox?.list?.());
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
        // force: the silent path is debounced, and a fast pull ended before it painted.
        renderPatientList({ silent: true, force: true });
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
 * Drain a group of outbox rows' ops through the Worker, AIMD-paced. Each chunk
 * is removed from the outbox as soon as it's acked (or dropped by the
 * sanitizer) — a later chunk's failure leaves only the unsent ops behind,
 * not the whole group.
 *
 * @param {object} ctx
 * @param {string} roomId
 * @param {{ clientMutationId: string, baseRevision?: number, enqueuedAt?: number }} item wire-id source
 * @param {unknown[]} ops raw ops for the whole group
 * @param {(sent: number, total: number) => void} [onProgress]
 * @param {(chunk: unknown[]) => void} removeAcked drops a chunk's ops from their own rows
 */
async function pushWithStaleRetry(ctx, roomId, item, ops, onProgress, removeAcked) {
  const { applyServerRevision, pullLatest } = ctx;
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
      removeAcked(chunk);
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

/** @param {{ ops?: unknown[] }} row */
const rowOps = (row) => (Array.isArray(row?.ops) ? row.ops : []);

/**
 * Push several outbox rows as one op stream, so a burst of small rows (bulk
 * paste: census, clinicalOps, per-patient labs) shares POSTs instead of one
 * POST each against the Worker's per-room rate limit. Chunk size stays with
 * the AIMD pacer; acked ops are removed from their own row.
 *
 * @param {object} ctx
 * @param {string} roomId
 * @param {{ clientMutationId: string, baseRevision?: number, enqueuedAt?: number, ops: unknown[] }[]} rows
 * @param {(sent: number, total: number) => void} [onProgress]
 * @returns {Promise<unknown>} error, if any row is still pending after the attempt
 */
async function flushOutboxRows(ctx, roomId, rows, onProgress) {
  const { outbox, pace, applyServerRevision } = ctx;
  const item = rows[0];
  const owner = new Map();
  for (const row of rows) for (const op of rowOps(row)) owner.set(op, row.clientMutationId);
  /** @param {unknown[]} chunk */
  function removeAcked(chunk) {
    const byRow = new Map();
    for (const op of chunk) {
      const id = owner.get(op);
      if (!byRow.has(id)) byRow.set(id, []);
      byRow.get(id).push(op);
    }
    for (const [id, ops] of byRow) outbox.removeOps(id, ops);
  }
  try {
    const result = await pushWithStaleRetry(ctx, roomId, item, rows.flatMap(rowOps), onProgress, removeAcked);
    // Matches the row snapshots taken at the start of this flush — ops merged
    // into the same clientMutationId while this drain was in flight have a
    // different (path, updatedAt) and are not touched, so they survive.
    for (const row of rows) outbox.removeOps(row.clientMutationId, rowOps(row));
    pace.markLocalWrite();
    if (result?.revision != null) applyServerRevision(Number(result.revision));
    noteCloudSyncPush();
    recordCloudSyncTrace('push', {
      clientMutationId: item.clientMutationId,
      rows: rows.length,
      opCount: rows.reduce((sum, row) => sum + rowOps(row).length, 0),
      revision: result?.revision != null ? Number(result.revision) : null,
    });
    return null;
  } catch (err) {
    drainSyncedLabSidecarsFromOutbox(outbox);
    const ids = new Set(rows.map((row) => String(row?.clientMutationId || '')));
    const stillPending = outbox.list().some(function (row) {
      return ids.has(String(row?.clientMutationId || ''));
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
 * Rows for this turn: not-yet-tried non-lab rows first, so a live edit never
 * waits behind a lab backfill, then lab rows. Small rows are grouped up to one
 * chunk's worth of ops (one POST); the list is re-read every turn, so a live
 * edit enqueued mid-backfill still goes next. `solo` returns one row only —
 * used after a grouped push failed, so one stuck row can't block the rest.
 * @param {{ clientMutationId?: string, enqueuedAt?: number, ops?: unknown[] }[]} pending
 * @param {Set<string>} tried
 * @param {boolean} solo
 */
function pickNextOutboxRows(pending, tried, solo) {
  const live = [];
  const lab = [];
  for (const row of pending) {
    if (tried.has(outboxRowKey(row))) continue;
    (isLabSidecarOutboxMutationId(row.clientMutationId) ? lab : live).push(row);
  }
  const group = [];
  let ops = 0;
  for (const row of [...live, ...lab]) {
    if (group.length && (solo || ops + rowOps(row).length > MAX_OPS_PER_CHUNK)) break;
    group.push(row);
    ops += rowOps(row).length;
  }
  return group;
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
  let solo = false;
  for (;;) {
    const pending = outbox.list();
    const rows = pickNextOutboxRows(pending, tried, solo);
    if (!rows.length) break;
    const total = doneOps + pending.reduce((sum, row) => sum + rowOps(row).length, 0);
    const baseDone = doneOps;
    const err = await flushOutboxRows(ctx, roomId, rows, (sent) => {
      setStatus('syncing', `Enviando ${baseDone + sent}/${total} cambios`);
    });
    doneOps = baseDone + rows.reduce((sum, row) => sum + rowOps(row).length, 0);
    if (err && rows.length > 1) {
      // Retry the group's rows one by one, so the rest still go out.
      solo = true;
      continue;
    }
    for (const row of rows) tried.add(outboxRowKey(row));
    if (err && !firstErr) firstErr = err;
  }
  if (firstErr) {
    setStatus('error', cloudSyncErrorMessage(firstErr, 'No se pudo enviar un cambio a la nube.'));
    throw firstErr;
  }
}

/**
 * A pull must not overwrite a chart field this device still has a newer, unsent
 * write for in the outbox. Without this, a pull that lands between a save and its
 * push (a pull in flight, or the stale-retry pull inside a push) puts the room's
 * older value back on screen — and if the push re-collects from local state, the
 * edit is gone for good.
 *
 * Only whole-value fields with no merge of their own. `fields` merges per field
 * clock; monitoreo/eventualidades merge and re-push; labs never drop local sets.
 * An incoming value newer than the pending one still applies: the Worker will
 * reject our push as stale, so the room's value is the one that wins.
 */
const PENDING_WINS_FIELDS = ['note', 'indicaciones', 'medReceta', 'vpo', 'listadoProblemas', 'medPharmProfile'];
const ENTRY_FIELD_PATH = /^entries\/[^/]+\/([^/]+)$/;

/** @param {Array<{ ops?: unknown[] }>} outboxRows @returns {Map<string, string>} path → newest pending updatedAt */
function pendingAtByPath(outboxRows) {
  const out = new Map();
  for (const row of outboxRows || []) {
    for (const op of Array.isArray(row?.ops) ? row.ops : []) {
      const path = String(op?.path || '');
      const m = ENTRY_FIELD_PATH.exec(path);
      if (!m || !PENDING_WINS_FIELDS.includes(m[1])) continue;
      const at = String(op.updatedAt || '');
      if (at > (out.get(path) || '')) out.set(path, at);
    }
  }
  return out;
}

/**
 * Drop pulled values older than a pending local write, in place (ops and snapshot).
 * @param {{ ops?: unknown[], state?: { entries?: unknown[], entityVersions?: Record<string, { updatedAt?: string }> } } | null} result
 * @param {Array<{ ops?: unknown[] }>} outboxRows
 * @returns {number} values dropped
 */
export function dropPullValuesOlderThanPending(result, outboxRows) {
  const pending = pendingAtByPath(outboxRows);
  if (!pending.size || !result || typeof result !== 'object') return 0;
  const olderThanPending = (path, at) => pending.has(path) && String(at || '') < pending.get(path);
  let dropped = 0;
  if (Array.isArray(result.ops)) {
    const before = result.ops.length;
    result.ops = result.ops.filter((op) => !olderThanPending(String(op?.path || ''), op?.updatedAt));
    dropped = before - result.ops.length;
  }
  return dropped + dropSnapshotFieldsOlderThanPending(result.state, olderThanPending);
}

/**
 * @param {{ entries?: unknown[], entityVersions?: Record<string, { updatedAt?: string }> } | undefined} state
 * @param {(path: string, at: unknown) => boolean} olderThanPending
 */
function dropSnapshotFieldsOlderThanPending(state, olderThanPending) {
  let dropped = 0;
  const entries = Array.isArray(state?.entries) ? state.entries : [];
  const versions = state?.entityVersions || {};
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    for (const field of PENDING_WINS_FIELDS) {
      const path = `entries/${entry.id}/${field}`;
      // No version on record → keep today's behavior and apply it.
      if (!Object.hasOwn(entry, field) || !versions[path]) continue;
      if (!olderThanPending(path, versions[path].updatedAt)) continue;
      // Absent key = "not in this pull" for pull-apply (hasOwnProperty guards).
      delete entry[field];
      dropped += 1;
    }
  }
  return dropped;
}
