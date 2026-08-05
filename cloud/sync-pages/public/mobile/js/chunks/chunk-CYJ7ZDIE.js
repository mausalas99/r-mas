import {
  lanNetworkProfile
} from "/mobile/js/chunks/chunk-WVOQEB7T.js";
import {
  LanClient
} from "/mobile/js/chunks/chunk-S4JF4KS2.js";

// public/js/features/lan/runtime.mjs
var lanClient = new LanClient();
var activeLiveSyncRoomId = "";
var activeLiveSyncRoomLabel = "";
var liveSyncPushTimer = null;
var liveSyncRevisionReconcileTimer = null;
var liveSyncOutboxFlushTimer = null;
var LIVE_SYNC_PUSH_DEBOUNCE_MS = 900;
var LIVE_SYNC_OUTBOX_FLUSH_MS = 6e4;
function getLiveSyncPushDebounceMs() {
  return lanNetworkProfile.getNetworkProfile() === "slow" ? 4e3 : 900;
}
function getReconcileCooldownMs() {
  return lanNetworkProfile.getNetworkProfile() === "slow" ? 3e4 : 1e4;
}
function getLanScanIntervalMs() {
  return lanNetworkProfile.getNetworkProfile() === "slow" ? 6e4 : 15e3;
}
var _lastDeltaSeqByRoom = /* @__PURE__ */ new Map();
function getLastDeltaSeq(roomId) {
  return _lastDeltaSeqByRoom.get(String(roomId)) ?? 0;
}
function setLastDeltaSeq(roomId, seq) {
  _lastDeltaSeqByRoom.set(String(roomId), Number(seq));
}
function resetLastDeltaSeq(roomId) {
  _lastDeltaSeqByRoom.delete(String(roomId));
}
function initLanSyncRuntime(deps) {
  if (deps && deps.lanClient) {
    try {
      if (typeof lanClient.disconnect === "function") lanClient.disconnect();
      else if (typeof lanClient.disconnectLiveChannel === "function") lanClient.disconnectLiveChannel();
    } catch (_e) {
      void _e;
    }
    lanClient = deps.lanClient;
  }
}
function getLanClient() {
  return lanClient;
}
function getActiveLiveSyncRoomId() {
  return activeLiveSyncRoomId;
}
function getActiveLiveSyncRoomLabel() {
  return activeLiveSyncRoomLabel;
}
function setActiveLiveSyncRoom(roomId, label) {
  activeLiveSyncRoomId = String(roomId || "").trim();
  if (label !== void 0) {
    activeLiveSyncRoomLabel = String(label || "").trim();
  }
}
function clearActiveLiveSyncRoom() {
  activeLiveSyncRoomId = "";
  activeLiveSyncRoomLabel = "";
}
function getLiveSyncPushTimer() {
  return liveSyncPushTimer;
}
function setLiveSyncPushTimer(timer) {
  liveSyncPushTimer = timer;
}
function getLiveSyncRevisionReconcileTimer() {
  return liveSyncRevisionReconcileTimer;
}
function setLiveSyncRevisionReconcileTimer(timer) {
  liveSyncRevisionReconcileTimer = timer;
}
function getLiveSyncOutboxFlushTimer() {
  return liveSyncOutboxFlushTimer;
}
function setLiveSyncOutboxFlushTimer(timer) {
  liveSyncOutboxFlushTimer = timer;
}
function getLanClientId() {
  try {
    var id = localStorage.getItem("rpc-lan-client-id");
    if (id && String(id).trim()) return String(id).trim();
    var gen = "lc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("rpc-lan-client-id", gen);
    return gen;
  } catch {
    return "lc_anon";
  }
}

export {
  lanClient,
  activeLiveSyncRoomId,
  activeLiveSyncRoomLabel,
  liveSyncPushTimer,
  liveSyncRevisionReconcileTimer,
  liveSyncOutboxFlushTimer,
  LIVE_SYNC_PUSH_DEBOUNCE_MS,
  LIVE_SYNC_OUTBOX_FLUSH_MS,
  getLiveSyncPushDebounceMs,
  getReconcileCooldownMs,
  getLanScanIntervalMs,
  getLastDeltaSeq,
  setLastDeltaSeq,
  resetLastDeltaSeq,
  initLanSyncRuntime,
  getLanClient,
  getActiveLiveSyncRoomId,
  getActiveLiveSyncRoomLabel,
  setActiveLiveSyncRoom,
  clearActiveLiveSyncRoom,
  getLiveSyncPushTimer,
  setLiveSyncPushTimer,
  getLiveSyncRevisionReconcileTimer,
  setLiveSyncRevisionReconcileTimer,
  getLiveSyncOutboxFlushTimer,
  setLiveSyncOutboxFlushTimer,
  getLanClientId
};
//# sourceMappingURL=/js/chunks/chunk-CYJ7ZDIE.js.map
