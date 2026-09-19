/**
 * One-shot retirement of LAN room snapshot / host-patient-map fossils (P3).
 * Silent — no toast (Nube-only since 8.0.5).
 */
export const LAN_BLOB_RETIRE_FLAG = 'lan-blobs-retired-v810';

export const LAN_BLOB_LS_KEYS = [
  'rpc-lan-room-snapshots',
  'rpc-lan-host-patient-map',
];

export const LAN_BLOB_DB_KEYS = ['lanRoomSnapshots', 'lanHostPatientMap'];

/**
 * @param {{
 *   storage?: Storage,
 *   pruneDbBlobs?: (keys: string[]) => void | Promise<void>,
 *   now?: () => number,
 * }} [deps]
 */
export async function runLanBlobRetireIfNeeded(deps = {}) {
  const storage = deps.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!storage) return { didRun: false, reason: 'no_storage' };
  if (storage.getItem(LAN_BLOB_RETIRE_FLAG)) return { didRun: false, reason: 'already' };

  for (const key of LAN_BLOB_LS_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  if (typeof deps.pruneDbBlobs === 'function') {
    try {
      await deps.pruneDbBlobs(LAN_BLOB_DB_KEYS.slice());
    } catch {
      /* best-effort */
    }
  }

  const now = typeof deps.now === 'function' ? deps.now : Date.now;
  storage.setItem(LAN_BLOB_RETIRE_FLAG, String(now()));
  return { didRun: true };
}
