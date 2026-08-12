// public/js/features/cloud-sync/lan-blob-retire.mjs
var LAN_BLOB_RETIRE_FLAG = "lan-blobs-retired-v810";
var LAN_BLOB_LS_KEYS = [
  "rpc-lan-room-snapshots",
  "rpc-lan-host-patient-map"
];
var LAN_BLOB_DB_KEYS = ["lanRoomSnapshots", "lanHostPatientMap"];
async function runLanBlobRetireIfNeeded(deps = {}) {
  const storage = deps.storage || (typeof localStorage !== "undefined" ? localStorage : null);
  if (!storage) return { didRun: false, reason: "no_storage" };
  if (storage.getItem(LAN_BLOB_RETIRE_FLAG)) return { didRun: false, reason: "already" };
  for (const key of LAN_BLOB_LS_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
    }
  }
  if (typeof deps.pruneDbBlobs === "function") {
    try {
      await deps.pruneDbBlobs(LAN_BLOB_DB_KEYS.slice());
    } catch {
    }
  }
  const now = typeof deps.now === "function" ? deps.now : Date.now;
  storage.setItem(LAN_BLOB_RETIRE_FLAG, String(now()));
  return { didRun: true };
}
export {
  LAN_BLOB_DB_KEYS,
  LAN_BLOB_LS_KEYS,
  LAN_BLOB_RETIRE_FLAG,
  runLanBlobRetireIfNeeded
};
//# sourceMappingURL=/js/chunks/lan-blob-retire-QVYHGNGT.js.map
