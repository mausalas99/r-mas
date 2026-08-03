import {
  isCloudRateLimitError,
  nextCloudPollDelayMs,
  retryAfterMsFromError,
} from './cloud-sync-timing.mjs';

/**
 * Adaptive poll timer + error backoff for cloud sync.
 * @param {{
 *   syncCycle: () => unknown,
 *   pendingCount: () => number,
 *   getLastLocalWriteAt: () => number,
 * }} deps
 */
export function createCloudPollScheduler(deps) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timerId = null;
  let stopped = false;
  let errorStreak = 0;
  /** @type {number | null} */
  let forcedDelayMs = null;

  function clearTimer() {
    if (timerId != null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function scheduleNext(delayMs) {
    if (stopped) return;
    clearTimer();
    timerId = setTimeout(function () {
      timerId = null;
      void deps.syncCycle();
    }, delayMs);
  }

  /** @param {boolean} [errored] */
  function armNextTimer(errored) {
    const delay =
      forcedDelayMs != null
        ? forcedDelayMs
        : nextCloudPollDelayMs({
            pending: deps.pendingCount() > 0,
            errored,
            errorStreak,
            lastLocalWriteAt: deps.getLastLocalWriteAt(),
          });
    forcedDelayMs = null;
    scheduleNext(delay);
  }

  function noteSuccess() {
    errorStreak = 0;
    armNextTimer(false);
  }

  /** @param {unknown} err */
  function noteFailure(err) {
    errorStreak += 1;
    if (isCloudRateLimitError(err)) {
      forcedDelayMs = retryAfterMsFromError(err);
    }
    armNextTimer(true);
  }

  function stop() {
    stopped = true;
    clearTimer();
  }

  return {
    armNextTimer,
    noteSuccess,
    noteFailure,
    stop,
    isRateLimitedError: isCloudRateLimitError,
  };
}
