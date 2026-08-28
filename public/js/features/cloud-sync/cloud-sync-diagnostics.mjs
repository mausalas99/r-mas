/** Nube sync diagnostics ring buffer and support report. */

import {
  utf8JsonBytes,
  slimCloudOp,
  CLOUD_PUSH_WARN_BODY_BYTES,
  CLOUD_PUSH_WARN_OP_BYTES,
} from './cloud-op-slim.mjs';
import { CLOUD_LAB_BACKFILL_MUTATION_ID } from './constants.mjs';
import { isCloudSyncNetworkErrorMessage } from './cloud-sync-error-text.mjs';

const MAX_ERRORS = 8;
const MAX_TRACE = 16;

/** @type {{ at: string, op: string, code: string, message: string }[]} */
const lastErrors = [];

/** @type {{ at: string, boundary: string, data: Record<string, unknown> }[]} */
const syncTrace = [];

/** @type {string | null} */
let lastPullAt = null;
/** @type {string | null} */
let lastPushAt = null;
/** @type {string | null} */
let lastCycleAt = null;
/** @type {boolean | null} */
let lastCycleOk = null;
/** @type {'ws' | 'poll' | 'offline' | null} */
let lastTransport = null;
/** @type {string | null} */
let lastWsSignalAt = null;
/** @type {string | null} */
let lastWsClose = null;
/** @type {string | null} */
let lastWsError = null;
/** @type {string | null} */
let lastWsUrl = null;

/**
 * @param {{ op?: string, code?: string, message?: string }} entry
 */
export function recordCloudSyncError(entry) {
  const row = {
    at: new Date().toISOString(),
    op: String(entry && entry.op != null ? entry.op : 'unknown'),
    code: String(entry && entry.code != null ? entry.code : ''),
    message: String(entry && entry.message != null ? entry.message : ''),
  };
  lastErrors.unshift(row);
  if (lastErrors.length > MAX_ERRORS) lastErrors.length = MAX_ERRORS;
}

/**
 * @param {string} boundary
 * @param {Record<string, unknown>} [data]
 */
export function recordCloudSyncTrace(boundary, data) {
  const row = {
    at: new Date().toISOString(),
    boundary: String(boundary || 'unknown'),
    data: data && typeof data === 'object' ? { ...data } : {},
  };
  syncTrace.unshift(row);
  if (syncTrace.length > MAX_TRACE) syncTrace.length = MAX_TRACE;
}

export function clearCloudSyncErrors() {
  lastErrors.length = 0;
}

export function clearCloudSyncWsFaults() {
  lastWsError = null;
  lastWsClose = null;
}

/** @param {boolean} ok */
export function noteCloudSyncCycle(ok) {
  lastCycleAt = new Date().toISOString();
  lastCycleOk = !!ok;
  if (ok) clearCloudSyncErrors();
}

export function noteCloudSyncPull() {
  lastPullAt = new Date().toISOString();
}

export function noteCloudSyncPush() {
  lastPushAt = new Date().toISOString();
}

/** @param {'ws' | 'poll' | 'offline'} transport */
export function noteCloudSyncTransport(transport) {
  if (transport === 'ws' || transport === 'poll' || transport === 'offline') {
    lastTransport = transport;
    recordCloudSyncTrace('transport', { transport });
  }
}

/** @param {number} revision */
export function noteCloudSyncWsSignal(revision) {
  lastWsSignalAt = new Date().toISOString();
  recordCloudSyncTrace('ws_revision', { revision: Number(revision) || 0 });
}

function handleCloudSyncWsOpen(url) {
  if (url) lastWsUrl = url;
  clearCloudSyncWsFaults();
  recordCloudSyncTrace('ws_open', { url: url || lastWsUrl || '' });
}

/**
 * @param {{ message?: string }} info
 */
function handleCloudSyncWsError(info) {
  if (!info?.message) return;
  lastWsError = String(info.message);
  recordCloudSyncTrace('ws_error', { message: lastWsError });
}

/**
 * @param {{ code?: number, reason?: string }} info
 */
function handleCloudSyncWsClose(info) {
  if (info?.code == null && !info?.reason) return;
  const payload = {
    code: Number(info.code) || 0,
    reason: String(info.reason || ''),
  };
  lastWsClose = JSON.stringify(payload);
  recordCloudSyncTrace('ws_close', payload);
}

/**
 * @param {{ url?: string, code?: number, reason?: string, message?: string }} info
 */
export function noteCloudSyncWsLifecycle(info) {
  const url = String(info?.url || '').trim();
  if (info?.open) {
    handleCloudSyncWsOpen(url);
    return;
  }
  if (url) lastWsUrl = url;
  handleCloudSyncWsError(info);
  handleCloudSyncWsClose(info);
}

export function clearCloudSyncDiagnostics() {
  clearCloudSyncErrors();
  syncTrace.length = 0;
  lastPullAt = null;
  lastPushAt = null;
  lastCycleAt = null;
  lastCycleOk = null;
  lastTransport = null;
  lastWsSignalAt = null;
  lastWsUrl = null;
  clearCloudSyncWsFaults();
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function cloudSyncErrorCode(err) {
  const row = err && typeof err === 'object' ? /** @type {{ data?: { error?: string }, status?: number }} */ (err) : null;
  const code = String(row?.data?.error || '').trim();
  if (code) return code;
  if (row?.status != null) return String(row.status);
  return '';
}

/**
 * @param {unknown} op
 * @returns {string}
 */
function readOpPath(op) {
  if (!op || typeof op !== 'object') return '';
  return String(/** @type {{ path?: string }} */ (op).path || '').trim();
}

/**
 * @param {string} path
 * @returns {string}
 */
export function classifyCloudOpPath(path) {
  const p = String(path || '');
  if (!p) return 'other';
  if (p === 'clinicalOps') return 'clinicalOps';
  if (p.startsWith('todos/')) return 'pendientes';
  if (p.includes('/monitoreo')) return 'signos';
  if (p.includes('/eventualidades')) return 'eventualidades';
  if (p.includes('/fields')) return 'censo';
  if (p.startsWith('agenda/')) return 'agenda';
  if (p.startsWith('tombstones/')) return 'delete';
  if (p.startsWith('labSidecars/')) return 'labs';
  if (p.startsWith('patients/')) return 'patient';
  return 'other';
}

/**
 * @param {Array<{ clientMutationId?: string, enqueuedAt?: number, baseRevision?: number, ops?: unknown[] }>} entries
 */
export function summarizeCloudOutbox(entries) {
  const rows = Array.isArray(entries) ? entries : [];
  const byKind = {};
  const summary = rows.map(function (item) {
    const ops = Array.isArray(item.ops) ? item.ops : [];
    const paths = ops.map(readOpPath).filter(Boolean);
    const kinds = {};
    paths.forEach(function (path) {
      const kind = classifyCloudOpPath(path);
      kinds[kind] = (kinds[kind] || 0) + 1;
      byKind[kind] = (byKind[kind] || 0) + 1;
    });
    const enqueuedAt = Number(item.enqueuedAt || 0) || 0;
    let totalBytes = 0;
    let maxOpBytes = 0;
    let maxOpPath = '';
    for (let oi = 0; oi < ops.length; oi += 1) {
      const op = ops[oi];
      // Measure the quota-fitted op (what actually goes on the wire), not the raw
      // stored value — a still-untrimmed lab set otherwise reads as "toxic" here
      // even though sanitizeOpsForCloudPush will shrink it to fit before sending.
      const bytes = utf8JsonBytes(slimCloudOp(op));
      totalBytes += bytes;
      if (bytes > maxOpBytes) {
        maxOpBytes = bytes;
        maxOpPath = readOpPath(op);
      }
    }
    return {
      clientMutationId: String(item.clientMutationId || ''),
      enqueuedAt: enqueuedAt || null,
      ageMs: enqueuedAt ? Math.max(0, Date.now() - enqueuedAt) : 0,
      baseRevision: item.baseRevision != null ? Number(item.baseRevision) : null,
      opCount: ops.length,
      totalBytes,
      maxOpBytes,
      maxOpPath: maxOpPath || null,
      paths: paths.slice(0, 16),
      kinds,
    };
  });
  return { count: rows.length, byKind, entries: summary };
}

/**
 * @param {{ totalBytes?: number, maxOpBytes?: number, clientMutationId?: string, opCount?: number }} row
 */
export function isToxicCloudOutboxEntry(row) {
  if (!row || typeof row !== 'object') return false;
  const totalBytes = Number(row.totalBytes) || 0;
  const maxOpBytes = Number(row.maxOpBytes) || 0;
  const opCount = Number(row.opCount) || 0;
  const id = String(row.clientMutationId || '');
  if (id === CLOUD_LAB_BACKFILL_MUTATION_ID && opCount > 1) return true;
  if (totalBytes > CLOUD_PUSH_WARN_BODY_BYTES) return true;
  if (maxOpBytes > CLOUD_PUSH_WARN_OP_BYTES) return true;
  return false;
}

/**
 * @param {Array<{ clientMutationId?: string, enqueuedAt?: number, baseRevision?: number, ops?: unknown[] }>} entries
 */
export function findWorstCloudOutboxEntry(entries) {
  const summary = summarizeCloudOutbox(entries);
  let worst = null;
  for (let i = 0; i < summary.entries.length; i += 1) {
    const row = summary.entries[i];
    if (!worst || Number(row.totalBytes) > Number(worst.totalBytes)) worst = row;
  }
  return worst;
}

/**
 * @param {Array<{ clientMutationId?: string, enqueuedAt?: number, baseRevision?: number, ops?: unknown[] }>} entries
 */
export function listToxicCloudOutboxEntries(entries) {
  const summary = summarizeCloudOutbox(entries);
  return summary.entries
    .filter(isToxicCloudOutboxEntry)
    .sort(function (a, b) {
      return Number(b.totalBytes) - Number(a.totalBytes);
    });
}

/**
 * @param {string} text
 */
export function redactCloudSecrets(text) {
  return String(text || '')
    .replace(/Bearer\s+[A-Za-z0-9._+/=-]+/gi, 'Bearer ***')
    .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"***"')
    .replace(/"Authorization"\s*:\s*"[^"]+"/gi, '"Authorization":"***"')
    .replace(/"code"\s*:\s*"[A-Za-z0-9._+/=-]{8,}"/gi, '"code":"***"');
}

/** @param {unknown} value */
function boolOrNull(value) {
  return value == null ? null : !!value;
}

/** @param {Record<string, unknown>} d */
function buildDiagnosticsSnapshot(d) {
  const outbox = summarizeCloudOutbox(
    /** @type {Array<{ clientMutationId?: string, enqueuedAt?: number, baseRevision?: number, ops?: unknown[] }>} */ (
      d.outboxEntries
    )
  );
  const roomSnapshot =
    d.roomSnapshot && typeof d.roomSnapshot === 'object' ? { ...d.roomSnapshot } : null;
  return {
    status: String(d.status || 'unknown'),
    detail: String(d.detail || ''),
    online: boolOrNull(d.online),
    bridgeConfigured: boolOrNull(d.bridgeConfigured),
    runtimeActive: boolOrNull(d.runtimeActive),
    cloudActive: boolOrNull(d.cloudActive),
    baseUrl: String(d.baseUrl || ''),
    tokenPresent: boolOrNull(d.tokenPresent),
    roomId: String(d.roomId || ''),
    revision: Number(d.revision || 0),
    roomSnapshot,
    localPatientCount: Number(d.localPatientCount || 0),
    outbox,
    lastPullAt,
    lastPushAt,
    lastCycleAt,
    lastCycleOk,
    transport: String(d.transport || lastTransport || 'poll'),
    lastWsSignalAt,
    lastWsClose,
    lastWsError,
    lastWsUrl,
    syncTrace: syncTrace.map(function (e) {
      return { at: e.at, boundary: e.boundary, data: { ...e.data } };
    }),
    lastErrors: lastErrors.map(function (e) {
      return { at: e.at, op: e.op, code: e.code, message: e.message };
    }),
  };
}

/**
 * @param {Record<string, unknown>} [deps]
 */
export function getCloudSyncDiagnostics(deps) {
  const d = deps && typeof deps === 'object' ? deps : {};
  return buildDiagnosticsSnapshot(d);
}

/**
 * True when sync is failing and recent errors look like transport/network (not auth/quota).
 * @param {ReturnType<typeof getCloudSyncDiagnostics>} [diag]
 */
export function hasActiveCloudNetworkFailure(diag) {
  const d = diag && typeof diag === 'object' ? diag : getCloudSyncDiagnostics();
  const syncFailing = d.lastCycleOk === false || String(d.status || '') === 'error';
  if (!syncFailing) return false;
  const messages = [
    String(d.detail || ''),
    ...(Array.isArray(d.lastErrors) ? d.lastErrors.map((entry) => String(entry?.message || '')) : []),
  ];
  return messages.some((message) => isCloudSyncNetworkErrorMessage(message));
}

/**
 * @param {ReturnType<typeof getCloudSyncDiagnostics>} diag
 */
export function formatCloudDiagnosticsReport(diag) {
  const payload = diag && typeof diag === 'object' ? diag : getCloudSyncDiagnostics();
  return redactCloudSecrets(JSON.stringify(payload, null, 2));
}
