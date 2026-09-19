/**
 * Forensic audit events for Nube key management operations.
 * Call these from room-dek.mjs when DEK/wrap events occur.
 */

export const DEK_EVENTS = {
  DEK_CREATED: 'nube.dek.created',
  WRAP_PUT: 'nube.dek.wrap_put',
  WRAP_GET: 'nube.dek.wrap_get',
  WRAP_FAILED: 'nube.dek.wrap_failed',
  BACKFILL_SWEPT: 'nube.dek.backfill_swept',
};

function auditApi() {
  return typeof window !== 'undefined' ? window.rplusDb || window.electronAPI : null;
}

/**
 * Append a DEK key-management event to the local forensic audit chain.
 * Best-effort: never throws, never blocks sync.
 *
 * @param {string} eventType - one of DEK_EVENTS
 * @param {Record<string, unknown>} [meta]
 */
export async function auditDekEvent(eventType, meta = {}) {
  const api = auditApi();
  if (!api || typeof api.dbAuditAppend !== 'function') return;
  try {
    await api.dbAuditAppend({ eventType, meta });
  } catch {
    /* intentionally swallowed — audit must not block sync */
  }
}
