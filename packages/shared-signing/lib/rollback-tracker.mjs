export const DEFAULT_MAX_CONSECUTIVE_FAILURES = 2;

/**
 * Pure state transition for boot-success tracking. The caller owns
 * persisting `state` across boots (each app has its own storage) — this
 * module never touches disk.
 * @param {{lastGoodVersion?: string, failures?: Record<string, number>} | undefined} state
 * @param {{version: string, success: boolean}} outcome
 */
export function recordBootOutcome(state, { version, success }) {
  const failures = { ...(state?.failures || {}) };
  if (success) {
    delete failures[version];
    return { lastGoodVersion: version, failures };
  }
  failures[version] = (failures[version] || 0) + 1;
  return { lastGoodVersion: state?.lastGoodVersion, failures };
}

/**
 * @param {{failures?: Record<string, number>} | undefined} state
 * @param {string} version
 * @param {number} [maxConsecutiveFailures]
 */
export function shouldRollback(state, version, maxConsecutiveFailures = DEFAULT_MAX_CONSECUTIVE_FAILURES) {
  return (state?.failures?.[version] || 0) >= maxConsecutiveFailures;
}
