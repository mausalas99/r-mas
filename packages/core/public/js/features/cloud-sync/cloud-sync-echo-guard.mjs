/**
 * Skip resending a cloud op whose exact (path, updatedAt) was already tried — win or
 * lose, the Worker's LWW outcome for that value is deterministic (`lww.js isNewerVersion`
 * ties go to rejection), so resending it every push cycle forever only repeats the same
 * rejection. A genuine new local edit gets a new `updatedAt` and bypasses this guard.
 */
import { createIdbBackedSlot } from './idb-index-store.mjs';

const ECHO_INDEX_KEY = 'rpc-cloud-sync-echo-index';

const slot = createIdbBackedSlot(ECHO_INDEX_KEY, () => ({}));

/** Test-only: force the in-memory index back to empty. */
export function __resetEchoGuardForTests() {
  slot.resetForTests();
}

// Grows one entry per synced path, never pruned on delete — bound it by
// serialized size so it can't alone bloat past a reasonable footprint.
// Evicting a stale entry just means that op gets resent once more, never
// wrongly skipped.
const ECHO_INDEX_MAX_BYTES = 1_000_000;

/** @param {Record<string, string>} idx */
function trimEchoIndex(idx) {
  let keys = Object.keys(idx);
  let size = JSON.stringify(idx).length;
  while (keys.length && size > ECHO_INDEX_MAX_BYTES) {
    const avgBytes = size / keys.length;
    const removeCount = Math.min(keys.length, Math.max(1, Math.ceil(((size - ECHO_INDEX_MAX_BYTES) / avgBytes) * 1.1)));
    for (let i = 0; i < removeCount; i += 1) delete idx[keys[i]];
    keys = Object.keys(idx);
    size = JSON.stringify(idx).length;
  }
  return idx;
}

/** @returns {Record<string, string>} */
function readEchoIndex() {
  const idx = slot.read();
  return idx && typeof idx === 'object' ? idx : {};
}

/** @param {Record<string, string>} idx */
function writeEchoIndex(idx) {
  slot.write(trimEchoIndex(idx));
}

/** @param {{ path?: unknown, updatedAt?: unknown }} op */
export function wasCloudOpAlreadyAttempted(op) {
  const path = String(op?.path || '').trim();
  const at = String(op?.updatedAt || '').trim();
  if (!path || !at) return false;
  return readEchoIndex()[path] === at;
}

/**
 * Batch form of `wasCloudOpAlreadyAttempted` — reads the echo index once for
 * the whole array instead of once per op. Drop the already-attempted ops at
 * enqueue time (not only at wire time) so the persisted outbox row is the
 * delta too, not the whole census re-collected every edit.
 * @param {unknown[]} ops
 * @returns {unknown[]}
 */
export function filterCloudOpsNotAttempted(ops) {
  if (!Array.isArray(ops) || !ops.length) return [];
  const idx = readEchoIndex();
  return ops.filter((op) => {
    const path = String(op?.path || '').trim();
    const at = String(op?.updatedAt || '').trim();
    if (!path || !at) return true;
    return idx[path] !== at;
  });
}

/** Call once a push actually got a response (applied or rejected) for these ops. */
export function noteCloudOpsAttempted(ops) {
  if (!Array.isArray(ops) || !ops.length) return;
  const idx = readEchoIndex();
  let changed = false;
  for (const op of ops) {
    const path = String(op?.path || '').trim();
    const at = String(op?.updatedAt || '').trim();
    if (!path || !at || idx[path] === at) continue;
    idx[path] = at;
    changed = true;
  }
  if (changed) writeEchoIndex(idx);
}

export function clearCloudSyncEchoGuard() {
  slot.write({});
}
