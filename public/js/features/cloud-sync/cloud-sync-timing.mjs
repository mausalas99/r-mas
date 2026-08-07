/**
 * Free-tier request budget helpers.
 * With Room DO + WS: high safety poll when connected; moderate fallback when WS down.
 */

/** Safety poll while WS connected (primary updates via DO signal). */
export const CLOUD_POLL_IDLE_WS_MS = 90_000;
export const CLOUD_POLL_MOBILE_IDLE_WS_MS = 60_000;
export const CLOUD_POLL_ACTIVE_WS_MS = 30_000;

/** Fallback when WS unavailable. */
export const CLOUD_POLL_IDLE_FALLBACK_MS = 20_000;
export const CLOUD_POLL_MOBILE_IDLE_FALLBACK_MS = 25_000;
export const CLOUD_POLL_ACTIVE_FALLBACK_MS = 8_000;

/** @deprecated alias — use FALLBACK or WS constants */
export const CLOUD_POLL_IDLE_MS = CLOUD_POLL_IDLE_FALLBACK_MS;
export const CLOUD_POLL_MOBILE_IDLE_MS = CLOUD_POLL_MOBILE_IDLE_FALLBACK_MS;
export const CLOUD_POLL_ACTIVE_MS = CLOUD_POLL_ACTIVE_FALLBACK_MS;

export const CLOUD_POLL_ACTIVE_WINDOW_MS = 180_000;
export const CLOUD_POLL_ERROR_MIN_MS = 30_000;
export const CLOUD_POLL_ERROR_MAX_MS = 5 * 60_000;
export const CLOUD_PUSH_DEBOUNCE_MS = 1_500;
export const CLOUD_PUSH_FIRST_MS = 600;

/** @typedef {'ws' | 'poll' | 'offline'} CloudSyncTransport */

/**
 * @param {{
 *   pending?: boolean,
 *   errored?: boolean,
 *   errorStreak?: number,
 *   lastLocalWriteAt?: number,
 *   now?: number,
 *   mobile?: boolean,
 *   transport?: CloudSyncTransport,
 * }} opts
 */
export function nextCloudPollDelayMs(opts = {}) {
  const now = opts.now ?? Date.now();
  const streak = Math.max(0, Number(opts.errorStreak) || 0);
  if (opts.errored || streak > 0) {
    const exp = Math.min(
      CLOUD_POLL_ERROR_MAX_MS,
      CLOUD_POLL_ERROR_MIN_MS * Math.pow(2, Math.min(streak - 1, 4))
    );
    return exp;
  }

  const transport = opts.transport === 'ws' ? 'ws' : 'poll';
  const idleMs =
    transport === 'ws'
      ? opts.mobile
        ? CLOUD_POLL_MOBILE_IDLE_WS_MS
        : CLOUD_POLL_IDLE_WS_MS
      : opts.mobile
        ? CLOUD_POLL_MOBILE_IDLE_FALLBACK_MS
        : CLOUD_POLL_IDLE_FALLBACK_MS;
  const activeMs =
    transport === 'ws' ? CLOUD_POLL_ACTIVE_WS_MS : CLOUD_POLL_ACTIVE_FALLBACK_MS;

  const lastWrite = Number(opts.lastLocalWriteAt) || 0;
  if (opts.pending || (lastWrite && now - lastWrite < CLOUD_POLL_ACTIVE_WINDOW_MS)) {
    return activeMs;
  }
  return idleMs;
}

/** @param {unknown} err */
export function isCloudRateLimitError(err) {
  const status = Number(err && typeof err === 'object' ? err.status : 0);
  if (status === 429) return true;
  const msg = String(
    (err && typeof err === 'object' && (err.data?.message || err.message)) || ''
  );
  return /rate.?limit|too many|429|demasiados intentos/i.test(msg);
}

/**
 * @param {unknown} err
 * @param {number} [fallbackMs]
 */
export function retryAfterMsFromError(err, fallbackMs = CLOUD_POLL_ERROR_MIN_MS) {
  const headers = err && typeof err === 'object' ? err.retryAfterMs : null;
  if (Number.isFinite(headers) && headers > 0) {
    return Math.min(CLOUD_POLL_ERROR_MAX_MS, Number(headers));
  }
  const ra = err && typeof err === 'object' ? err.data?.retry_after : null;
  if (Number.isFinite(Number(ra))) {
    const sec = Number(ra);
    return Math.min(CLOUD_POLL_ERROR_MAX_MS, Math.max(CLOUD_POLL_ERROR_MIN_MS, sec * 1000));
  }
  return fallbackMs;
}
