/** Nube sync diagnostics ring buffer and support report. */

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

/** @param {boolean} ok */
export function noteCloudSyncCycle(ok) {
  lastCycleAt = new Date().toISOString();
  lastCycleOk = !!ok;
}

export function noteCloudSyncPull() {
  lastPullAt = new Date().toISOString();
}

export function noteCloudSyncPush() {
  lastPushAt = new Date().toISOString();
}

export function clearCloudSyncDiagnostics() {
  lastErrors.length = 0;
  syncTrace.length = 0;
  lastPullAt = null;
  lastPushAt = null;
  lastCycleAt = null;
  lastCycleOk = null;
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
    return {
      clientMutationId: String(item.clientMutationId || ''),
      enqueuedAt: enqueuedAt || null,
      ageMs: enqueuedAt ? Math.max(0, Date.now() - enqueuedAt) : 0,
      baseRevision: item.baseRevision != null ? Number(item.baseRevision) : null,
      opCount: ops.length,
      paths: paths.slice(0, 16),
      kinds,
    };
  });
  return { count: rows.length, byKind, entries: summary };
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

/**
 * @param {Record<string, unknown>} [deps]
 */
export function getCloudSyncDiagnostics(deps) {
  const d = deps && typeof deps === 'object' ? deps : {};
  const outbox = summarizeCloudOutbox(
    /** @type {Array<{ clientMutationId?: string, enqueuedAt?: number, baseRevision?: number, ops?: unknown[] }>} */ (
      d.outboxEntries
    )
  );
  return {
    status: String(d.status || 'unknown'),
    detail: String(d.detail || ''),
    online: d.online == null ? null : !!d.online,
    bridgeConfigured: d.bridgeConfigured == null ? null : !!d.bridgeConfigured,
    runtimeActive: d.runtimeActive == null ? null : !!d.runtimeActive,
    cloudActive: d.cloudActive == null ? null : !!d.cloudActive,
    baseUrl: String(d.baseUrl || ''),
    tokenPresent: d.tokenPresent == null ? null : !!d.tokenPresent,
    roomId: String(d.roomId || ''),
    revision: Number(d.revision || 0),
    roomSnapshot: d.roomSnapshot && typeof d.roomSnapshot === 'object' ? { ...d.roomSnapshot } : null,
    localPatientCount: Number(d.localPatientCount || 0),
    outbox,
    lastPullAt,
    lastPushAt,
    lastCycleAt,
    lastCycleOk,
    syncTrace: syncTrace.map(function (e) {
      return { at: e.at, boundary: e.boundary, data: { ...e.data } };
    }),
    lastErrors: lastErrors.map(function (e) {
      return { at: e.at, op: e.op, code: e.code, message: e.message };
    }),
  };
}

/**
 * @param {ReturnType<typeof getCloudSyncDiagnostics>} diag
 */
export function formatCloudDiagnosticsReport(diag) {
  const payload = diag && typeof diag === 'object' ? diag : getCloudSyncDiagnostics();
  return redactCloudSecrets(JSON.stringify(payload, null, 2));
}
