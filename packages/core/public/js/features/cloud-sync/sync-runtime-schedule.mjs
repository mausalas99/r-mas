import {
  isCloudBackoffError,
  nextCloudPollDelayMs,
  cloudDrainPacer,
  CLOUD_POLL_ERROR_OVERLOAD_MAX_MS,
} from './cloud-sync-timing.mjs';

/**
 * Adaptive poll timer + error backoff for cloud sync.
 * @param {{
 *   syncCycle: () => unknown,
 *   pendingCount: () => number,
 *   getLastLocalWriteAt: () => number,
 *   getTransportState?: () => 'ws' | 'poll' | 'offline',
 *   pollMobile?: boolean,
 *   drainPacer?: typeof cloudDrainPacer,
 * }} deps
 */
export function createCloudPollScheduler(deps) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timerId = null;
  let stopped = false;
  let errorStreak = 0;
  /** @type {number | undefined} */
  let maxErrorMs;
  const drainPacer = deps.drainPacer ?? cloudDrainPacer;

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
    const delay = nextCloudPollDelayMs({
      pending: deps.pendingCount() > 0,
      errored,
      errorStreak,
      lastLocalWriteAt: deps.getLastLocalWriteAt(),
      mobile: deps.pollMobile,
      transport: deps.getTransportState?.() ?? 'poll',
      maxErrorMs,
    });
    scheduleNext(delay);
  }

  function noteSuccess() {
    errorStreak = 0;
    maxErrorMs = undefined;
    armNextTimer(false);
  }

  /**
   * Overload-class errors (D1 saturated, room rate-limited) cap the backoff at
   * 2 minutes instead of 5 — the room usually recovers fast, and every
   * overload also backs off the AIMD drain pacer, since a whole-cycle failure
   * (drainCloudOps gave up, or the pull itself hit the Worker) is itself a
   * congestion signal. Unreachable (status 0) and permanent errors keep the
   * default 5-minute ceiling — retrying sooner cannot help either of those.
   * @param {unknown} err
   */
  function noteFailure(err) {
    errorStreak += 1;
    if (isCloudBackoffError(err)) {
      drainPacer.onCongested(err);
      maxErrorMs = CLOUD_POLL_ERROR_OVERLOAD_MAX_MS;
    } else {
      maxErrorMs = undefined;
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
    isRateLimitedError: isCloudBackoffError,
  };
}
