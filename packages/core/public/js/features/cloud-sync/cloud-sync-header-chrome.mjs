/** Header ⇄ wifi icon — mirrors Conexión chip / runtime status. */

/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

const HEADER_MODIFIERS = ['idle', 'live', 'syncing', 'degraded', 'local'];

/**
 * @param {CloudSyncStatus | string} status
 * @param {'ws' | 'poll' | 'offline' | string} [transport]
 */
export function cloudHeaderSyncModifier(status, transport) {
  const key = String(status || 'idle');
  const mode = String(transport || 'poll');
  if (key === 'syncing') return 'syncing';
  if (key === 'error' || key === 'offline' || key === 'pending') return 'degraded';
  if (key === 'idle' && mode === 'ws') return 'live';
  if (key === 'idle' && mode === 'poll') return 'local';
  return 'idle';
}

/**
 * @param {CloudSyncStatus | string} status
 * @param {'ws' | 'poll' | 'offline' | string} [transport]
 */
export function applyHeaderTeamSyncVisual(status, transport) {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('btn-header-team-sync');
  if (!btn) return;
  const mod = cloudHeaderSyncModifier(status, transport);
  HEADER_MODIFIERS.forEach(function (name) {
    btn.classList.remove('btn-livesync-header--' + name);
  });
  btn.classList.add('btn-livesync-header--' + mod);
}
