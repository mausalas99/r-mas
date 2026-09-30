/**
 * Boot-time removal of dead `localStorage` keys. Idempotent, no version flag:
 * every launch runs it, so a user who skips the release that moved these
 * stores to IndexedDB still gets cleaned. Runs before unlock and the first
 * Nube pull, because a full quota makes their writes fail. Removing a key
 * frees space even when the quota is already full.
 */
export const DEAD_LOCAL_STORAGE_KEYS = [
  'rpc-undo-stack', // now IndexedDB `rplus-undo`
  'rpc-preimport-backup', // restore point only; deleted, not migrated
  'rpc-cloud-sync-lab-fp-index', // IDB-backed caches; a miss only costs a resend
  'rpc-cloud-sync-lab-poison',
  'rpc-cloud-sync-med-receta-fp-index',
  'rpc-cloud-sync-echo-index',
];

/** @param {Pick<Storage, 'removeItem'> | undefined} [ls] */
export function sweepDeadLocalStorageKeys(ls = globalThis.localStorage) {
  if (!ls) return;
  for (const key of DEAD_LOCAL_STORAGE_KEYS) {
    try {
      ls.removeItem(key);
    } catch {
      /* storage disabled: nothing to free */
    }
  }
}
