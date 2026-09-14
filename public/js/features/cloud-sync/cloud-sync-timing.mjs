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
/** Overload (D1/rate-limit) backoff caps lower than a generic/permanent error — the
 * room usually recovers fast, and a shorter ceiling drains the backlog sooner. */
export const CLOUD_POLL_ERROR_OVERLOAD_MAX_MS = 120_000;
export const CLOUD_PUSH_DEBOUNCE_MS = 1_500;
export const CLOUD_PUSH_FIRST_MS = 600;

/** Backfill patients outside the active Filtros after this delay, once the priority set is pushed. */
export const CLOUD_LAB_BACKFILL_DEFERRED_MS = 5_000;

/** @typedef {'ws' | 'poll' | 'offline'} CloudSyncTransport */

/**
 * Equal jitter: half the base delay fixed, half random. Never zero, so a
 * whole ward reconnecting after an outage does not retry on the same clock.
 * @param {number} baseMs
 * @param {() => number} [random]
 */
export function jitterMs(baseMs, random = Math.random) {
  const half = baseMs / 2;
  return half + random() * half;
}

/**
 * @param {number} streak
 * @param {number} [maxErrorMs]
 * @param {() => number} [random]
 */
function errorBackoffDelayMs(streak, maxErrorMs, random) {
  const cap = Number.isFinite(maxErrorMs) ? Number(maxErrorMs) : CLOUD_POLL_ERROR_MAX_MS;
  const exp = Math.min(cap, CLOUD_POLL_ERROR_MIN_MS * Math.pow(2, Math.min(streak - 1, 4)));
  return jitterMs(exp, random);
}

/**
 * @param {{
 *   pending?: boolean,
 *   errored?: boolean,
 *   errorStreak?: number,
 *   lastLocalWriteAt?: number,
 *   now?: number,
 *   mobile?: boolean,
 *   transport?: CloudSyncTransport,
 *   random?: () => number,
 *   maxErrorMs?: number,
 * }} opts
 */
export function nextCloudPollDelayMs(opts = {}) {
  const now = opts.now ?? Date.now();
  const streak = Math.max(0, Number(opts.errorStreak) || 0);
  if (opts.errored || streak > 0) {
    return errorBackoffDelayMs(streak, opts.maxErrorMs, opts.random);
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

/** D1 overload, matched on the Worker's 500/503 message body. */
const D1_OVERLOAD_MESSAGE_RE = /overloaded|queued for too long|SQLITE_BUSY/i;

/** @param {unknown} err */
export function isCloudTransientServerError(err) {
  const status = Number(err && typeof err === 'object' ? err.status : 0);
  if (status === 502 || status === 503 || status === 504) return true;
  if (status === 500) {
    const msg = String(
      (err && typeof err === 'object' && (err.data?.message || err.message)) || ''
    );
    return D1_OVERLOAD_MESSAGE_RE.test(msg);
  }
  return false;
}

/**
 * Errors a retry can never fix: bad request, auth/permission, not found,
 * payload too large, client too old, or a 409 that isn't a revision race.
 * @param {unknown} err
 */
export function isCloudPermanentError(err) {
  const status = Number(err && typeof err === 'object' ? err.status : 0);
  if (status === 400 || status === 401 || status === 403 || status === 404 ||
      status === 413 || status === 426) {
    return true;
  }
  if (status === 409) {
    const code = err && typeof err === 'object' ? err.data?.error : null;
    return code !== 'revision_stale' && code !== 'conflict';
  }
  return false;
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

/** @param {unknown} err */
export function isCloudBackoffError(err) {
  return isCloudTransientServerError(err) || isCloudRateLimitError(err);
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

/**
 * AIMD (TCP-style) pacing for draining the outbox against a free-tier D1
 * that overloads on bursts. Chunk size backs off fast (halve) and recovers
 * slow (+1) on congestion; the inter-chunk gap mirrors it (double / -250ms).
 * Floor of 4 ops keeps a full 319-op backlog under the 120-pushes/min room
 * limit (319/4 = 80 pushes); 319/2 = 160 would trip it.
 */
export const CLOUD_CWND_MAX_OPS = 16;
export const CLOUD_CWND_MIN_OPS = 4;
export const CLOUD_CHUNK_GAP_MIN_MS = 250;
export const CLOUD_CHUNK_GAP_MAX_MS = 8_000;
/** Congestion events tolerated within one drain before bailing to cycle-level backoff. */
export const CLOUD_DRAIN_MAX_CONGESTION_EVENTS = 6;

/**
 * @param {{ random?: () => number }} [opts]
 */
export function createDrainPacer(opts = {}) {
  const random = opts.random;
  let cwnd = CLOUD_CWND_MAX_OPS;
  let gap = CLOUD_CHUNK_GAP_MIN_MS;
  return {
    chunkOps() {
      return cwnd;
    },
    gapMs() {
      return jitterMs(gap, random);
    },
    onClean() {
      cwnd = Math.min(CLOUD_CWND_MAX_OPS, cwnd + 1);
      gap = Math.max(CLOUD_CHUNK_GAP_MIN_MS, gap - CLOUD_CHUNK_GAP_MIN_MS);
    },
    /** @param {unknown} err */
    onCongested(err) {
      cwnd = Math.max(CLOUD_CWND_MIN_OPS, Math.floor(cwnd / 2));
      gap = Math.min(CLOUD_CHUNK_GAP_MAX_MS, Math.max(gap * 2, retryAfterMsFromError(err, 0)));
    },
  };
}

/**
 * Shared by the outbox drain and the direct push — both hit the same D1, so
 * one backs off for both. State persists for the session (never resets to
 * 16 on a new cycle), same as a TCP congestion window across segments.
 */
export const cloudDrainPacer = createDrainPacer();
