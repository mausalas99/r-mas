/**
 * Per-user "datos para documentos" settings, stored at `settings/{userId}`.
 * Only the owner may write it. Pull hands it back to the owner alone, as
 * `userSettings: { [userId]: value }`. It never rides in `ops` or in the
 * WebSocket broadcast, so other room members never see it.
 */

const SETTINGS_PATH = /^settings\/([^/]+)$/;

/** @param {unknown} path @returns {string} owner user id, or '' when not a settings path */
export function userSettingsPathOwner(path) {
  const m = SETTINGS_PATH.exec(String(path || ''));
  return m ? m[1] : '';
}

/** @param {{ path?: unknown }[]} ops */
export function stripUserSettingsOps(ops) {
  return ops.filter((op) => !userSettingsPathOwner(op?.path));
}

/**
 * The caller's own settings value from a batch of ops. Newest updatedAt wins.
 * @param {{ path?: unknown, value?: unknown, updatedAt?: unknown }[]} ops
 * @param {string} userId
 */
export function ownUserSettingsFromOps(ops, userId) {
  if (!userId) return {};
  let best = null;
  for (const op of ops) {
    if (userSettingsPathOwner(op?.path) !== userId) continue;
    if (!best || String(op.updatedAt) >= String(best.updatedAt)) best = op;
  }
  return best ? { [userId]: best.value } : {};
}

/** @param {{ userSettings?: Record<string, unknown> }} state @param {string} userId */
export function ownUserSettingsFromState(state, userId) {
  if (!userId) return {};
  const value = state?.userSettings?.[userId];
  return value === undefined ? {} : { [userId]: value };
}

/** @param {{ userSettings?: unknown }} state */
export function stateWithoutUserSettings(state) {
  // eslint-disable-next-line no-unused-vars
  const { userSettings: _all, ...rest } = state;
  return rest;
}
