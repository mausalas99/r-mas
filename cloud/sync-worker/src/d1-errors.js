/** Same class of message the client treats as transient (cloud-sync-timing.mjs). */
const D1_OVERLOAD_MESSAGE_RE = /overloaded|queued for too long|SQLITE_BUSY/i;

/**
 * Detect D1 overload ("D1 DB is overloaded", queue timeouts, SQLITE_BUSY) —
 * distinct from a real bug: the caller should retry, not surface a 500.
 * @param {unknown} err
 */
export function isD1OverloadError(err) {
  const msg = String(
    err && typeof err === 'object' && 'message' in err
      ? /** @type {{ message?: unknown }} */ (err).message
      : err || ''
  );
  return D1_OVERLOAD_MESSAGE_RE.test(msg);
}

/**
 * Detect D1 / SQLite unique / primary-key constraint failures.
 * @param {unknown} err
 */
export function isD1UniqueConstraintError(err) {
  const msg = String(
    err && typeof err === 'object' && 'message' in err
      ? /** @type {{ message?: unknown }} */ (err).message
      : err || ''
  );
  return /UNIQUE constraint failed|SQLITE_CONSTRAINT_PRIMARYKEY|SQLITE_CONSTRAINT/i.test(msg);
}

/**
 * @param {unknown} err
 * @returns {'revision' | 'client_mutation_id' | 'other'}
 */
export function d1UniqueConstraintTarget(err) {
  const msg = String(
    err && typeof err === 'object' && 'message' in err
      ? /** @type {{ message?: unknown }} */ (err).message
      : err || ''
  );
  if (/client_mutation_id|idx_mutations_client/i.test(msg)) return 'client_mutation_id';
  if (/mutations\.room_id,\s*mutations\.revision|PRIMARYKEY/i.test(msg)) return 'revision';
  return 'other';
}
