/**
 * Skip resending a cloud op whose exact (path, updatedAt) was already tried — win or
 * lose, the Worker's LWW outcome for that value is deterministic (`lww.js isNewerVersion`
 * ties go to rejection), so resending it every push cycle forever only repeats the same
 * rejection. A genuine new local edit gets a new `updatedAt` and bypasses this guard.
 */

const ECHO_INDEX_KEY = 'rpc-cloud-sync-echo-index';

/** @returns {Record<string, string>} */
function readEchoIndex() {
  try {
    const raw = localStorage.getItem(ECHO_INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, string>} idx */
function writeEchoIndex(idx) {
  try {
    localStorage.setItem(ECHO_INDEX_KEY, JSON.stringify(idx));
  } catch (e) {
    console.warn('[cloud-sync-echo-guard] failed to write ' + ECHO_INDEX_KEY, e);
  }
}

/** @param {{ path?: unknown, updatedAt?: unknown }} op */
export function wasCloudOpAlreadyAttempted(op) {
  const path = String(op?.path || '').trim();
  const at = String(op?.updatedAt || '').trim();
  if (!path || !at) return false;
  return readEchoIndex()[path] === at;
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
  try {
    localStorage.removeItem(ECHO_INDEX_KEY);
  } catch {
    /* best effort */
  }
}
