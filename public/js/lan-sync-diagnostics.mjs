/** LAN sync diagnostics ring buffer and support report (IM-09). */

const MAX_ERRORS = 5;

/** @type {{ at: string, op: string, code: string, message: string }[]} */
const lastErrors = [];

/**
 * @param {{ op?: string, code?: string, message?: string }} entry
 */
export function recordLanSyncError(entry) {
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
 * @param {Record<string, unknown>} [deps]
 */
export function getLanSyncDiagnostics(deps) {
  const d = deps && typeof deps === 'object' ? deps : {};
  return {
    hostUrl: String(d.hostUrl || ''),
    pingAt: d.pingAt != null ? d.pingAt : null,
    pingStatus: d.pingStatus != null ? d.pingStatus : null,
    wsSync: !!d.wsSync,
    wsLive: !!d.wsLive,
    liveRoomId: String(d.liveRoomId || ''),
    roomId: String(d.roomId || ''),
    phase: String(d.phase || 'offline'),
    bundleRevision: Number(d.bundleRevision || 0),
    outboxCount: Number(d.outboxCount || 0),
    pinnedHost: String(d.pinnedHost || ''),
    teamCodeAligned: d.teamCodeAligned == null ? null : !!d.teamCodeAligned,
    lastErrors: lastErrors.map(function (e) {
      return { at: e.at, op: e.op, code: e.code, message: e.message };
    }),
  };
}

/**
 * Redact bearer tokens and team codes from a string.
 * @param {string} text
 */
export function redactLanSecrets(text) {
  return String(text || '')
    .replace(/Bearer\s+[A-Za-z0-9._+/=-]+/gi, 'Bearer ***')
    .replace(/"teamCode"\s*:\s*"[^"]*"/gi, '"teamCode":"***"')
    .replace(/teamCode[=:]\s*[A-Za-z0-9._+/=-]+/gi, 'teamCode=***')
    .replace(/"code"\s*:\s*"[A-Za-z0-9._+/=-]{8,}"/gi, '"code":"***"');
}

/**
 * @param {ReturnType<typeof getLanSyncDiagnostics>} diag
 */
export function formatDiagnosticsReport(diag) {
  const payload = diag && typeof diag === 'object' ? diag : getLanSyncDiagnostics();
  return redactLanSecrets(JSON.stringify(payload, null, 2));
}
