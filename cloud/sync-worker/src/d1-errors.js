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
