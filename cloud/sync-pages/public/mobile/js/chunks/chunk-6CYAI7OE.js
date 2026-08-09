// public/js/features/cloud-sync/cloud-sync-timing.mjs
var CLOUD_POLL_IDLE_WS_MS = 9e4;
var CLOUD_POLL_MOBILE_IDLE_WS_MS = 6e4;
var CLOUD_POLL_ACTIVE_WS_MS = 3e4;
var CLOUD_POLL_IDLE_FALLBACK_MS = 2e4;
var CLOUD_POLL_MOBILE_IDLE_FALLBACK_MS = 25e3;
var CLOUD_POLL_ACTIVE_FALLBACK_MS = 8e3;
var CLOUD_POLL_ACTIVE_WINDOW_MS = 18e4;
var CLOUD_POLL_ERROR_MIN_MS = 3e4;
var CLOUD_POLL_ERROR_MAX_MS = 5 * 6e4;
var CLOUD_PUSH_DEBOUNCE_MS = 1500;
var CLOUD_PUSH_FIRST_MS = 600;
function nextCloudPollDelayMs(opts = {}) {
  const now = opts.now ?? Date.now();
  const streak = Math.max(0, Number(opts.errorStreak) || 0);
  if (opts.errored || streak > 0) {
    const exp = Math.min(
      CLOUD_POLL_ERROR_MAX_MS,
      CLOUD_POLL_ERROR_MIN_MS * Math.pow(2, Math.min(streak - 1, 4))
    );
    return exp;
  }
  const transport = opts.transport === "ws" ? "ws" : "poll";
  const idleMs = transport === "ws" ? opts.mobile ? CLOUD_POLL_MOBILE_IDLE_WS_MS : CLOUD_POLL_IDLE_WS_MS : opts.mobile ? CLOUD_POLL_MOBILE_IDLE_FALLBACK_MS : CLOUD_POLL_IDLE_FALLBACK_MS;
  const activeMs = transport === "ws" ? CLOUD_POLL_ACTIVE_WS_MS : CLOUD_POLL_ACTIVE_FALLBACK_MS;
  const lastWrite = Number(opts.lastLocalWriteAt) || 0;
  if (opts.pending || lastWrite && now - lastWrite < CLOUD_POLL_ACTIVE_WINDOW_MS) {
    return activeMs;
  }
  return idleMs;
}
function isCloudTransientServerError(err) {
  const status = Number(err && typeof err === "object" ? err.status : 0);
  return status === 502 || status === 503 || status === 504;
}
function isCloudRateLimitError(err) {
  const status = Number(err && typeof err === "object" ? err.status : 0);
  if (status === 429) return true;
  const msg = String(
    err && typeof err === "object" && (err.data?.message || err.message) || ""
  );
  return /rate.?limit|too many|429|demasiados intentos/i.test(msg);
}
function isCloudBackoffError(err) {
  return isCloudTransientServerError(err) || isCloudRateLimitError(err);
}
function retryAfterMsFromError(err, fallbackMs = CLOUD_POLL_ERROR_MIN_MS) {
  const headers = err && typeof err === "object" ? err.retryAfterMs : null;
  if (Number.isFinite(headers) && headers > 0) {
    return Math.min(CLOUD_POLL_ERROR_MAX_MS, Number(headers));
  }
  const ra = err && typeof err === "object" ? err.data?.retry_after : null;
  if (Number.isFinite(Number(ra))) {
    const sec = Number(ra);
    return Math.min(CLOUD_POLL_ERROR_MAX_MS, Math.max(CLOUD_POLL_ERROR_MIN_MS, sec * 1e3));
  }
  return fallbackMs;
}

export {
  CLOUD_PUSH_DEBOUNCE_MS,
  CLOUD_PUSH_FIRST_MS,
  nextCloudPollDelayMs,
  isCloudTransientServerError,
  isCloudBackoffError,
  retryAfterMsFromError
};
//# sourceMappingURL=/js/chunks/chunk-6CYAI7OE.js.map
