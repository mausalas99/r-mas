/**
 * Free-tier request budget helpers.
 * Cloudflare Free ≈ 100k Worker req/day — prefer fewer polls + coalesced pushes.
 */

/** Idle pull while focused (was 20s; 45s keeps ~10 users × 12h well under 100k). */
export const CLOUD_POLL_IDLE_MS = 45_000;
/** Temporary faster poll after local edits / successful push. */
export const CLOUD_POLL_ACTIVE_MS = 20_000;
/** How long "active" mode lasts after a local write. */
export const CLOUD_POLL_ACTIVE_WINDOW_MS = 90_000;
/** Error / 429 backoff bounds. */
export const CLOUD_POLL_ERROR_MIN_MS = 30_000;
export const CLOUD_POLL_ERROR_MAX_MS = 5 * 60_000;
/** Coalesce desktop edits before building a cloud push (LAN stays at ~900ms). */
export const CLOUD_PUSH_DEBOUNCE_MS = 3_000;
export const CLOUD_PUSH_DEBOUNCE_SLOW_MS = 5_000;

/**
 * @param {{ pending?: boolean, errored?: boolean, errorStreak?: number, lastLocalWriteAt?: number, now?: number }} opts
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
  const lastWrite = Number(opts.lastLocalWriteAt) || 0;
  if (opts.pending || (lastWrite && now - lastWrite < CLOUD_POLL_ACTIVE_WINDOW_MS)) {
    return CLOUD_POLL_ACTIVE_MS;
  }
  return CLOUD_POLL_IDLE_MS;
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
  if (Number.isFinite(headers) && headers > 0) return Math.min(CLOUD_POLL_ERROR_MAX_MS, Number(headers));
  const ra = err && typeof err === 'object' ? err.data?.retry_after : null;
  if (Number.isFinite(Number(ra))) {
    const sec = Number(ra);
    return Math.min(CLOUD_POLL_ERROR_MAX_MS, Math.max(CLOUD_POLL_ERROR_MIN_MS, sec * 1000));
  }
  return fallbackMs;
}
