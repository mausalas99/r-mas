// public/js/features/cloud-sync/lan-prefs-retire.mjs
var LAN_PREFS_RETIRE_FLAG = "lan-prefs-retired-v1";
var LAN_PREFS_RETIRE_KEYS = Object.freeze([
  "rpc-lan-shift-pin",
  "rpc-lan-ui-role",
  "rpc-lan-hide-disconnect-banner",
  "rpc-lan-lww-overwrite-toast"
]);
function runLanPrefsRetireIfNeeded({ storage = localStorage, now = Date.now } = {}) {
  if (storage.getItem(LAN_PREFS_RETIRE_FLAG)) return { didRun: false };
  for (const k of LAN_PREFS_RETIRE_KEYS) storage.removeItem(k);
  storage.setItem(LAN_PREFS_RETIRE_FLAG, String(now()));
  return { didRun: true };
}
export {
  LAN_PREFS_RETIRE_FLAG,
  LAN_PREFS_RETIRE_KEYS,
  runLanPrefsRetireIfNeeded
};
//# sourceMappingURL=/js/chunks/lan-prefs-retire-ZUIGQTUG.js.map
