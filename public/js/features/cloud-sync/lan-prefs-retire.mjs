/** One-shot clear of retired LAN preference keys (P3 graveyard). */
export const LAN_PREFS_RETIRE_FLAG = 'lan-prefs-retired-v1';

export const LAN_PREFS_RETIRE_KEYS = Object.freeze([
  'rpc-lan-shift-pin',
  'rpc-lan-ui-role',
  'rpc-lan-hide-disconnect-banner',
  'rpc-lan-lww-overwrite-toast',
]);

export function runLanPrefsRetireIfNeeded({ storage = localStorage, now = Date.now } = {}) {
  if (storage.getItem(LAN_PREFS_RETIRE_FLAG)) return { didRun: false };
  for (const k of LAN_PREFS_RETIRE_KEYS) storage.removeItem(k);
  storage.setItem(LAN_PREFS_RETIRE_FLAG, String(now()));
  return { didRun: true };
}
