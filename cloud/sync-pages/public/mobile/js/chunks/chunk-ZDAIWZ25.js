import {
  CLOUD_LAB_BACKFILL_MUTATION_ID,
  CLOUD_PUSH_WARN_BODY_BYTES,
  CLOUD_PUSH_WARN_OP_BYTES,
  slimCloudOp,
  utf8JsonBytes
} from "/mobile/js/chunks/chunk-BTIFFDH4.js";

// public/js/features/cloud-sync/cloud-sync-error-text.mjs
var CLOUD_SYNC_CLIENT_NOT_READY = "El enlace con Nube no est\xE1 listo. Ve a Conexi\xF3n, confirma tu sala, y si persiste cierra sesi\xF3n y vuelve a entrar.";
function isCloudSyncNetworkErrorMessage(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  if (/^failed to fetch$/i.test(s) || /networkerror when attempting to fetch/i.test(s)) return true;
  if (/load failed|network request failed/i.test(s)) return true;
  if (/ERR_NETWORK_CHANGED/i.test(s)) return true;
  if (/sin red hacia nube/i.test(s)) return true;
  if (/no hubo respuesta de nube/i.test(s)) return true;
  return false;
}
function humanizeCloudSyncErrorMessage(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (isCloudSyncNetworkErrorMessage(s)) {
    if (/no hubo respuesta de nube/i.test(s)) {
      return "No hubo respuesta de Nube. Revisa la conexi\xF3n e int\xE9ntalo de nuevo.";
    }
    return "Sin red hacia Nube. Revisa Wi\u2011Fi / VPN e int\xE9ntalo de nuevo.";
  }
  return humanizeTechnicalSyncMessage(s);
}
function humanizeTechnicalSyncMessage(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/cliente nube no configurado/i.test(s)) {
    return CLOUD_SYNC_CLIENT_NOT_READY;
  }
  if (/cannot read properties of undefined/i.test(s)) {
    if (/reading 'pull'/i.test(s)) {
      return "El cliente de Nube no est\xE1 listo para descargar. Vuelve a Conexi\xF3n o reinicia R+.";
    }
    if (/reading 'push'/i.test(s)) {
      return "El cliente de Nube no est\xE1 listo para enviar. Vuelve a Conexi\xF3n o reinicia R+.";
    }
    return "Fallo interno al sincronizar. Reintenta o reinicia R+.";
  }
  if (/cannot read properties of null/i.test(s)) {
    return "Fallo interno al sincronizar. Reintenta o reinicia R+.";
  }
  if (/is not a function/i.test(s)) {
    return "El runtime de Nube no est\xE1 enlazado correctamente. Reconecta en Conexi\xF3n.";
  }
  if (/^TypeError:|^ReferenceError:/i.test(s)) {
    return "Fallo interno al sincronizar. Reintenta o reinicia R+.";
  }
  return s;
}
function cloudSyncErrorMessage(err, fallback) {
  const data = err && typeof err === "object" ? (
    /** @type {{ data?: { message?: string }, message?: string }} */
    err
  ) : null;
  const raw = String(data?.data?.message || data?.message || fallback).trim() || fallback;
  return humanizeCloudSyncErrorMessage(raw) || fallback;
}

// public/js/features/cloud-sync/cloud-sync-diagnostics.mjs
var MAX_ERRORS = 8;
var MAX_TRACE = 16;
var lastErrors = [];
var syncTrace = [];
var lastPullAt = null;
var lastPushAt = null;
var lastCycleAt = null;
var lastCycleOk = null;
var lastTransport = null;
var lastWsSignalAt = null;
var lastWsClose = null;
var lastWsError = null;
var lastWsUrl = null;
function recordCloudSyncError(entry) {
  const row = {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    op: String(entry && entry.op != null ? entry.op : "unknown"),
    code: String(entry && entry.code != null ? entry.code : ""),
    message: String(entry && entry.message != null ? entry.message : "")
  };
  lastErrors.unshift(row);
  if (lastErrors.length > MAX_ERRORS) lastErrors.length = MAX_ERRORS;
}
function recordCloudSyncTrace(boundary, data) {
  const row = {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    boundary: String(boundary || "unknown"),
    data: data && typeof data === "object" ? { ...data } : {}
  };
  syncTrace.unshift(row);
  if (syncTrace.length > MAX_TRACE) syncTrace.length = MAX_TRACE;
}
function clearCloudSyncErrors() {
  lastErrors.length = 0;
}
function clearCloudSyncWsFaults() {
  lastWsError = null;
  lastWsClose = null;
}
function noteCloudSyncCycle(ok) {
  lastCycleAt = (/* @__PURE__ */ new Date()).toISOString();
  lastCycleOk = !!ok;
  if (ok) clearCloudSyncErrors();
}
function noteCloudSyncPull() {
  lastPullAt = (/* @__PURE__ */ new Date()).toISOString();
}
function noteCloudSyncPush() {
  lastPushAt = (/* @__PURE__ */ new Date()).toISOString();
}
function noteCloudSyncTransport(transport) {
  if (transport === "ws" || transport === "poll" || transport === "offline") {
    lastTransport = transport;
    recordCloudSyncTrace("transport", { transport });
  }
}
function noteCloudSyncWsSignal(revision) {
  lastWsSignalAt = (/* @__PURE__ */ new Date()).toISOString();
  recordCloudSyncTrace("ws_revision", { revision: Number(revision) || 0 });
}
function handleCloudSyncWsOpen(url) {
  if (url) lastWsUrl = url;
  clearCloudSyncWsFaults();
  recordCloudSyncTrace("ws_open", { url: url || lastWsUrl || "" });
}
function handleCloudSyncWsError(info) {
  if (!info?.message) return;
  lastWsError = String(info.message);
  recordCloudSyncTrace("ws_error", { message: lastWsError });
}
function handleCloudSyncWsClose(info) {
  if (info?.code == null && !info?.reason) return;
  const payload = {
    code: Number(info.code) || 0,
    reason: String(info.reason || "")
  };
  lastWsClose = JSON.stringify(payload);
  recordCloudSyncTrace("ws_close", payload);
}
function noteCloudSyncWsLifecycle(info) {
  const url = String(info?.url || "").trim();
  if (info?.open) {
    handleCloudSyncWsOpen(url);
    return;
  }
  if (url) lastWsUrl = url;
  handleCloudSyncWsError(info);
  handleCloudSyncWsClose(info);
}
function cloudSyncErrorCode(err) {
  const row = err && typeof err === "object" ? (
    /** @type {{ data?: { error?: string }, status?: number }} */
    err
  ) : null;
  const code = String(row?.data?.error || "").trim();
  if (code) return code;
  if (row?.status != null) return String(row.status);
  return "";
}
function readOpPath(op) {
  if (!op || typeof op !== "object") return "";
  return String(
    /** @type {{ path?: string }} */
    op.path || ""
  ).trim();
}
function classifyCloudOpPath(path) {
  const p = String(path || "");
  if (!p) return "other";
  if (p === "clinicalOps") return "clinicalOps";
  if (p.startsWith("todos/")) return "pendientes";
  if (p.includes("/monitoreo")) return "signos";
  if (p.includes("/eventualidades")) return "eventualidades";
  if (p.includes("/fields")) return "censo";
  if (p.startsWith("agenda/")) return "agenda";
  if (p.startsWith("tombstones/")) return "delete";
  if (p.startsWith("labSidecars/")) return "labs";
  if (p.startsWith("patients/")) return "patient";
  return "other";
}
function summarizeCloudOutbox(entries) {
  const rows = Array.isArray(entries) ? entries : [];
  const byKind = {};
  const summary = rows.map(function(item) {
    const ops = Array.isArray(item.ops) ? item.ops : [];
    const paths = ops.map(readOpPath).filter(Boolean);
    const kinds = {};
    paths.forEach(function(path) {
      const kind = classifyCloudOpPath(path);
      kinds[kind] = (kinds[kind] || 0) + 1;
      byKind[kind] = (byKind[kind] || 0) + 1;
    });
    const enqueuedAt = Number(item.enqueuedAt || 0) || 0;
    let totalBytes = 0;
    let maxOpBytes = 0;
    let maxOpPath = "";
    for (let oi = 0; oi < ops.length; oi += 1) {
      const op = ops[oi];
      const bytes = utf8JsonBytes(slimCloudOp(op));
      totalBytes += bytes;
      if (bytes > maxOpBytes) {
        maxOpBytes = bytes;
        maxOpPath = readOpPath(op);
      }
    }
    return {
      clientMutationId: String(item.clientMutationId || ""),
      enqueuedAt: enqueuedAt || null,
      ageMs: enqueuedAt ? Math.max(0, Date.now() - enqueuedAt) : 0,
      baseRevision: item.baseRevision != null ? Number(item.baseRevision) : null,
      opCount: ops.length,
      totalBytes,
      maxOpBytes,
      maxOpPath: maxOpPath || null,
      paths: paths.slice(0, 16),
      kinds
    };
  });
  return { count: rows.length, byKind, entries: summary };
}
function isToxicCloudOutboxEntry(row) {
  if (!row || typeof row !== "object") return false;
  const totalBytes = Number(row.totalBytes) || 0;
  const maxOpBytes = Number(row.maxOpBytes) || 0;
  const opCount = Number(row.opCount) || 0;
  const id = String(row.clientMutationId || "");
  if (id === CLOUD_LAB_BACKFILL_MUTATION_ID && opCount > 1) return true;
  if (totalBytes > CLOUD_PUSH_WARN_BODY_BYTES) return true;
  if (maxOpBytes > CLOUD_PUSH_WARN_OP_BYTES) return true;
  return false;
}
function redactCloudSecrets(text) {
  return String(text || "").replace(/Bearer\s+[A-Za-z0-9._+/=-]+/gi, "Bearer ***").replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"***"').replace(/"Authorization"\s*:\s*"[^"]+"/gi, '"Authorization":"***"').replace(/"code"\s*:\s*"[A-Za-z0-9._+/=-]{8,}"/gi, '"code":"***"');
}
function boolOrNull(value) {
  return value == null ? null : !!value;
}
function buildDiagnosticsSnapshot(d) {
  const outbox = summarizeCloudOutbox(
    /** @type {Array<{ clientMutationId?: string, enqueuedAt?: number, baseRevision?: number, ops?: unknown[] }>} */
    d.outboxEntries
  );
  const roomSnapshot = d.roomSnapshot && typeof d.roomSnapshot === "object" ? { ...d.roomSnapshot } : null;
  return {
    status: String(d.status || "unknown"),
    detail: String(d.detail || ""),
    online: boolOrNull(d.online),
    bridgeConfigured: boolOrNull(d.bridgeConfigured),
    runtimeActive: boolOrNull(d.runtimeActive),
    cloudActive: boolOrNull(d.cloudActive),
    baseUrl: String(d.baseUrl || ""),
    tokenPresent: boolOrNull(d.tokenPresent),
    roomId: String(d.roomId || ""),
    revision: Number(d.revision || 0),
    roomSnapshot,
    localPatientCount: Number(d.localPatientCount || 0),
    outbox,
    lastPullAt,
    lastPushAt,
    lastCycleAt,
    lastCycleOk,
    transport: String(d.transport || lastTransport || "poll"),
    lastWsSignalAt,
    lastWsClose,
    lastWsError,
    lastWsUrl,
    syncTrace: syncTrace.map(function(e) {
      return { at: e.at, boundary: e.boundary, data: { ...e.data } };
    }),
    lastErrors: lastErrors.map(function(e) {
      return { at: e.at, op: e.op, code: e.code, message: e.message };
    })
  };
}
function getCloudSyncDiagnostics(deps) {
  const d = deps && typeof deps === "object" ? deps : {};
  return buildDiagnosticsSnapshot(d);
}
function hasActiveCloudNetworkFailure(diag) {
  const d = diag && typeof diag === "object" ? diag : getCloudSyncDiagnostics();
  const syncFailing = d.lastCycleOk === false || String(d.status || "") === "error";
  if (!syncFailing) return false;
  const messages = [
    String(d.detail || ""),
    ...Array.isArray(d.lastErrors) ? d.lastErrors.map((entry) => String(entry?.message || "")) : []
  ];
  return messages.some((message) => isCloudSyncNetworkErrorMessage(message));
}
function formatCloudDiagnosticsReport(diag) {
  const payload = diag && typeof diag === "object" ? diag : getCloudSyncDiagnostics();
  return redactCloudSecrets(JSON.stringify(payload, null, 2));
}

export {
  CLOUD_SYNC_CLIENT_NOT_READY,
  isCloudSyncNetworkErrorMessage,
  humanizeCloudSyncErrorMessage,
  humanizeTechnicalSyncMessage,
  cloudSyncErrorMessage,
  recordCloudSyncError,
  recordCloudSyncTrace,
  noteCloudSyncCycle,
  noteCloudSyncPull,
  noteCloudSyncPush,
  noteCloudSyncTransport,
  noteCloudSyncWsSignal,
  noteCloudSyncWsLifecycle,
  cloudSyncErrorCode,
  isToxicCloudOutboxEntry,
  getCloudSyncDiagnostics,
  hasActiveCloudNetworkFailure,
  formatCloudDiagnosticsReport
};
//# sourceMappingURL=/js/chunks/chunk-ZDAIWZ25.js.map
