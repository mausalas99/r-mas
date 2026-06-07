/**
 * LAN network profile — 3-state RTT machine (fast / slow / offline).
 *
 * Thresholds and hysteresis:
 *   FAST → SLOW  : RTT > 500ms for 3 consecutive pings
 *   SLOW → FAST  : RTT < 200ms for 5 consecutive pings  (resets on any slow ping)
 *   FAST → OFFLINE: ping failure × 5 consecutive
 *   SLOW → OFFLINE: ping failure × 3 consecutive
 *   OFFLINE → * : only via userInitiatedReconnect()
 */

const RTT_SLOW_THRESHOLD_MS = 500;
const RTT_FAST_THRESHOLD_MS = 200;
const FAST_TO_SLOW_COUNT = 3;
const SLOW_TO_FAST_COUNT = 5;
const FAST_TO_OFFLINE_FAIL_COUNT = 5;
const SLOW_TO_OFFLINE_FAIL_COUNT = 3;

export function createNetworkProfile() {
  let profile = 'fast';
  let consecutiveSlowCount = 0;
  let consecutiveFastCount = 0;
  let consecutiveFailCount = 0;
  let lastRttMs = 0;
  const subscribers = new Set();
  let reconnectResolve = null;

  function notify(newProfile) {
    for (const cb of subscribers) {
      try { cb(newProfile); } catch (_) {}
    }
  }

  function transition(newProfile) {
    if (newProfile === profile) return;
    profile = newProfile;
    consecutiveSlowCount = 0;
    consecutiveFastCount = 0;
    consecutiveFailCount = 0;
    notify(profile);
  }

  function recordPingSuccess(rttMs) {
    if (profile === 'offline') return;
    lastRttMs = Number(rttMs) || 0;
    consecutiveFailCount = 0;

    if (rttMs > RTT_SLOW_THRESHOLD_MS) {
      consecutiveSlowCount++;
      consecutiveFastCount = 0; // reset fast counter on any slow ping
      if (profile === 'fast' && consecutiveSlowCount >= FAST_TO_SLOW_COUNT) {
        transition('slow');
      }
    } else if (rttMs < RTT_FAST_THRESHOLD_MS) {
      consecutiveFastCount++;
      consecutiveSlowCount = 0;
      if (profile === 'slow' && consecutiveFastCount >= SLOW_TO_FAST_COUNT) {
        transition('fast');
      }
    } else {
      // In the middle range (200-500ms): don't change counters for either transition
      consecutiveFastCount = 0;
      consecutiveSlowCount = 0;
    }
  }

  function recordPingFailure() {
    if (profile === 'offline') return;
    consecutiveFailCount++;
    consecutiveSlowCount = 0;
    consecutiveFastCount = 0;
    const threshold = profile === 'slow' ? SLOW_TO_OFFLINE_FAIL_COUNT : FAST_TO_OFFLINE_FAIL_COUNT;
    if (consecutiveFailCount >= threshold) {
      transition('offline');
    }
  }

  function recordRttSample(rttMs) {
    // RTT from non-ping sources (bundle PUT, reconcile GET) — use same logic as ping
    recordPingSuccess(rttMs);
  }

  function getNetworkProfile() {
    return profile;
  }

  function getLastRttMs() {
    return lastRttMs;
  }

  function subscribeNetworkProfile(cb) {
    subscribers.add(cb);
    return function unsubscribe() { subscribers.delete(cb); };
  }

  function resetProfile() {
    profile = 'fast';
    consecutiveSlowCount = 0;
    consecutiveFastCount = 0;
    consecutiveFailCount = 0;
    lastRttMs = 0;
    if (reconnectResolve) {
      reconnectResolve('fast');
      reconnectResolve = null;
    }
  }

  /**
   * User-initiated reconnect: the caller does one ping and reports result.
   * Returns a Promise that resolves to the new profile ('fast' | 'slow' | 'offline').
   *
   * In production, panel.mjs calls this, then passes the ping result via
   * _simulatePingResult (or directly by calling recordPingSuccess/Failure).
   * The promise resolves on the next profile update (or stays offline on failure).
   */
  function userInitiatedReconnect() {
    return new Promise(function (resolve) {
      if (profile !== 'offline') {
        resolve(profile);
        return;
      }
      reconnectResolve = resolve;
    });
  }

  /**
   * For tests and panel integration: report the ping result for an in-flight
   * userInitiatedReconnect(). Also calls recordPingSuccess/Failure.
   *
   * @param {boolean} ok
   * @param {number} rttMs
   */
  function _simulatePingResult(ok, rttMs) {
    if (ok) {
      // Temporarily lift from offline to evaluate the ping
      profile = rttMs <= RTT_SLOW_THRESHOLD_MS ? 'fast' : 'slow';
      lastRttMs = Number(rttMs) || 0;
      consecutiveFailCount = 0;
      const newProfile = profile;
      notify(newProfile);
      if (reconnectResolve) {
        reconnectResolve(newProfile);
        reconnectResolve = null;
      }
    } else {
      if (reconnectResolve) {
        reconnectResolve('offline');
        reconnectResolve = null;
      }
    }
  }

  return {
    recordPingSuccess,
    recordPingFailure,
    recordRttSample,
    getNetworkProfile,
    getLastRttMs,
    subscribeNetworkProfile,
    userInitiatedReconnect,
    resetProfile,
    _simulatePingResult,
  };
}

/** Production singleton. Wired in orchestrator.mjs / panel.mjs at boot. */
export const lanNetworkProfile = createNetworkProfile();
