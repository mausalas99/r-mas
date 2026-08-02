export class SyncError extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** @param {SyncError|Error} err */
export function syncErrorStatus(err) {
  const code = err?.code || 'error';
  if (code === 'conflict' || code === 'revision_stale' || code === 'quota_exceeded') return 409;
  if (code === 'invalid_credentials' || code === 'unauthorized') return 401;
  if (
    code === 'invalid_token' ||
    code === 'auth_required' ||
    code === 'forbidden' ||
    code === 'not_member'
  ) {
    return 403;
  }
  if (code === 'not_found') return 404;
  if (code === 'not_implemented') return 501;
  if (code === 'payload_too_large') return 413;
  if (code === 'error') return 500;
  return 400;
}

/** @param {SyncError|Error} err */
export function jsonSyncError(err) {
  return {
    error: err?.code || 'error',
    message: err?.message || 'Error en sync.',
  };
}
