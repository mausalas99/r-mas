import {
  isCloudBackoffError,
  isCloudUnreachableError,
  nextCloudPollDelayMs,
  cloudDrainPacer,
  jitterMs,
  CLOUD_POLL_ERROR_OVERLOAD_MAX_MS,
  CLOUD_REACHABILITY_PROBE_MS,
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
 *   probe?: () => Promise<unknown>,  cheap reachability check (GET /ping); resolves when the Worker answers
 *   onRecovered?: () => void,  first successful cycle after the Worker was unreachable
 * }} deps
 */
export function createCloudPollScheduler(deps) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timerId = null;
  let stopped = false;
  let errorStreak = 0;
  /** @type {number | undefined} */
  let maxErrorMs;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let probeId = null;
  /** When the Worker last came back after being unreachable (0 = not recently). */
  let recoveredAt = 0;
  let unreachableStreak = false;
  const drainPacer = deps.drainPacer ?? cloudDrainPacer;

  function stopProbe() {
    if (probeId != null) {
      clearTimeout(probeId);
      probeId = null;
    }
  }

  /** Unreachable: ping every ~10 s; the first answer runs the sync cycle now. */
  function startProbe() {
    if (stopped || probeId != null || typeof deps.probe !== 'function') return;
    probeId = setTimeout(function () {
      probeId = null;
      if (stopped || errorStreak === 0) return;
      Promise.resolve()
        .then(deps.probe)
        .then(
          function () {
            if (stopped || errorStreak === 0) return;
            clearTimer();
            void deps.syncCycle();
          },
          function () {
            startProbe();
          }
        );
    }, jitterMs(CLOUD_REACHABILITY_PROBE_MS));
  }

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
      // Right after an outage, peers are flushing what they queued offline: poll
      // at the active rate for a while, as if this device had just written.
      lastLocalWriteAt: Math.max(deps.getLastLocalWriteAt(), recoveredAt),
      mobile: deps.pollMobile,
      transport: deps.getTransportState?.() ?? 'poll',
      maxErrorMs,
    });
    scheduleNext(delay);
  }

  function noteSuccess() {
    stopProbe();
    const recovered = unreachableStreak;
    if (recovered) recoveredAt = Date.now();
    unreachableStreak = false;
    if (recovered) deps.onRecovered?.();
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
    const unreachable = isCloudUnreachableError(err);
    unreachableStreak = unreachableStreak || unreachable;
    armNextTimer(true);
    if (unreachable) startProbe();
  }

  function stop() {
    stopped = true;
    clearTimer();
    stopProbe();
  }

  return {
    armNextTimer,
    noteSuccess,
    noteFailure,
    stop,
    isRateLimitedError: isCloudBackoffError,
  };
}
