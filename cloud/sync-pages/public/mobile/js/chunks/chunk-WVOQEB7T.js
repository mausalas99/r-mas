// public/js/lan-network-profile.mjs
var RTT_SLOW_THRESHOLD_MS = 500;
var RTT_FAST_THRESHOLD_MS = 200;
var FAST_TO_SLOW_COUNT = 3;
var SLOW_TO_FAST_COUNT = 5;
var FAST_TO_OFFLINE_FAIL_COUNT = 5;
var SLOW_TO_OFFLINE_FAIL_COUNT = 3;
function createPingHandlers(state, notify) {
  function transition(newProfile) {
    if (newProfile === state.profile) return;
    state.profile = newProfile;
    state.consecutiveSlowCount = 0;
    state.consecutiveFastCount = 0;
    state.consecutiveFailCount = 0;
    notify(state.profile);
  }
  function recordPingSuccess(rttMs) {
    if (state.profile === "offline") return;
    state.lastRttMs = Number(rttMs) || 0;
    state.consecutiveFailCount = 0;
    if (rttMs > RTT_SLOW_THRESHOLD_MS) {
      state.consecutiveSlowCount++;
      state.consecutiveFastCount = 0;
      if (state.profile === "fast" && state.consecutiveSlowCount >= FAST_TO_SLOW_COUNT) {
        transition("slow");
      }
    } else if (rttMs < RTT_FAST_THRESHOLD_MS) {
      state.consecutiveFastCount++;
      state.consecutiveSlowCount = 0;
      if (state.profile === "slow" && state.consecutiveFastCount >= SLOW_TO_FAST_COUNT) {
        transition("fast");
      }
    } else {
      state.consecutiveFastCount = 0;
      state.consecutiveSlowCount = 0;
    }
  }
  function recordPingFailure() {
    if (state.profile === "offline") return;
    state.consecutiveFailCount++;
    state.consecutiveSlowCount = 0;
    state.consecutiveFastCount = 0;
    const threshold = state.profile === "slow" ? SLOW_TO_OFFLINE_FAIL_COUNT : FAST_TO_OFFLINE_FAIL_COUNT;
    if (state.consecutiveFailCount >= threshold) {
      transition("offline");
    }
  }
  return { transition, recordPingSuccess, recordPingFailure };
}
function createReconnectHandlers(state, notify) {
  function userInitiatedReconnect() {
    return new Promise(function(resolve) {
      if (state.profile !== "offline") {
        resolve(state.profile);
        return;
      }
      state.reconnectResolve = resolve;
    });
  }
  function _simulatePingResult(ok, rttMs) {
    if (ok) {
      state.profile = rttMs <= RTT_SLOW_THRESHOLD_MS ? "fast" : "slow";
      state.lastRttMs = Number(rttMs) || 0;
      state.consecutiveFailCount = 0;
      const newProfile = state.profile;
      notify(newProfile);
      if (state.reconnectResolve) {
        state.reconnectResolve(newProfile);
        state.reconnectResolve = null;
      }
    } else if (state.reconnectResolve) {
      state.reconnectResolve("offline");
      state.reconnectResolve = null;
    }
  }
  function resetProfile() {
    state.profile = "fast";
    state.consecutiveSlowCount = 0;
    state.consecutiveFastCount = 0;
    state.consecutiveFailCount = 0;
    state.lastRttMs = 0;
    if (state.reconnectResolve) {
      state.reconnectResolve("fast");
      state.reconnectResolve = null;
    }
  }
  return { userInitiatedReconnect, _simulatePingResult, resetProfile };
}
function createNetworkProfile() {
  const state = {
    profile: "fast",
    consecutiveSlowCount: 0,
    consecutiveFastCount: 0,
    consecutiveFailCount: 0,
    lastRttMs: 0,
    reconnectResolve: null
  };
  const subscribers = /* @__PURE__ */ new Set();
  function notify(newProfile) {
    for (const cb of subscribers) {
      try {
        cb(newProfile);
      } catch (_e) {
        void _e;
      }
    }
  }
  const ping = createPingHandlers(state, notify);
  const reconnect = createReconnectHandlers(state, notify);
  return {
    recordPingSuccess: ping.recordPingSuccess,
    recordPingFailure: ping.recordPingFailure,
    recordRttSample: ping.recordPingSuccess,
    getNetworkProfile: () => state.profile,
    getLastRttMs: () => state.lastRttMs,
    subscribeNetworkProfile(cb) {
      subscribers.add(cb);
      return function unsubscribe() {
        subscribers.delete(cb);
      };
    },
    userInitiatedReconnect: reconnect.userInitiatedReconnect,
    resetProfile: reconnect.resetProfile,
    _simulatePingResult: reconnect._simulatePingResult
  };
}
var lanNetworkProfile = createNetworkProfile();

export {
  lanNetworkProfile
};
//# sourceMappingURL=/js/chunks/chunk-WVOQEB7T.js.map
