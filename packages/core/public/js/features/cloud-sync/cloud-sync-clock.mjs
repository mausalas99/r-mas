/**
 * Corrects local wall-clock skew against the Worker's `Date` response header, so a Mac
 * with the wrong system time still stamps LWW-comparable `updatedAt` values the Worker
 * accepts — instead of every push being rejected as stale forever.
 */

let offsetMs = 0;

/** @param {string | null | undefined} dateHeaderValue HTTP `Date` response header */
export function noteServerDate(dateHeaderValue) {
  const serverMs = Date.parse(String(dateHeaderValue || ''));
  if (Number.isFinite(serverMs)) offsetMs = serverMs - Date.now();
}

/** @returns {string} ISO timestamp adjusted by the last known server/local clock offset */
export function cloudSyncNowIso() {
  return new Date(Date.now() + offsetMs).toISOString();
}

/** @returns {number} */
export function getCloudSyncClockOffsetMs() {
  return offsetMs;
}

export function clearCloudSyncClockOffset() {
  offsetMs = 0;
}
