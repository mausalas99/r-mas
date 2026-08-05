// public/js/features/lan/lan-sync-bridge-globals.mjs
function createLanSyncBridgeGlobal(key) {
  return {
    get() {
      return globalThis[key];
    },
    set(value) {
      globalThis[key] = value;
    }
  };
}
var LAN_SYNC_PUSH_BRIDGE_KEY = "__LAN_SYNC_PUSH_BRIDGE__";
var LAN_SYNC_ROOM_BRIDGE_KEY = "__LAN_SYNC_ROOM_BRIDGE__";
var LAN_SYNC_TRANSPORT_DEPS_KEY = "__LAN_SYNC_TRANSPORT_DEPS__";
var pushBridgeGlobal = createLanSyncBridgeGlobal(LAN_SYNC_PUSH_BRIDGE_KEY);
var roomBridgeGlobal = createLanSyncBridgeGlobal(LAN_SYNC_ROOM_BRIDGE_KEY);
var transportDepsGlobal = createLanSyncBridgeGlobal(LAN_SYNC_TRANSPORT_DEPS_KEY);
var lanSyncPushBridgeGlobal = pushBridgeGlobal.get;
var setLanSyncPushBridgeGlobal = pushBridgeGlobal.set;
var lanSyncRoomBridgeGlobal = roomBridgeGlobal.get;
var setLanSyncRoomBridgeGlobal = roomBridgeGlobal.set;
var lanSyncTransportDepsGlobal = transportDepsGlobal.get;
var setLanSyncTransportDepsGlobal = transportDepsGlobal.set;

// public/js/features/lan/push-bridge.mjs
var pushBridge = null;
var pushBridgeWirePromise = null;
function registerLanSyncPushBridge(deps) {
  pushBridge = deps && typeof deps === "object" ? deps : null;
  if (pushBridge && typeof globalThis !== "undefined") {
    setLanSyncPushBridgeGlobal(pushBridge);
  }
}
function ensureLanSyncPushBridgeWired() {
  if (pushBridge) return Promise.resolve();
  if (typeof globalThis !== "undefined") {
    var cached = lanSyncPushBridgeGlobal();
    if (cached && typeof cached === "object") {
      pushBridge = cached;
      return Promise.resolve();
    }
  }
  if (!pushBridgeWirePromise) {
    pushBridgeWirePromise = import("/mobile/js/chunks/orchestrator-Q4NPZP3T.js").then(function() {
      if (!pushBridge && typeof globalThis !== "undefined") {
        var g = lanSyncPushBridgeGlobal();
        if (g && typeof g === "object") pushBridge = g;
      }
    });
  }
  return pushBridgeWirePromise;
}
function bridge() {
  if (!pushBridge && typeof globalThis !== "undefined") {
    var cached = lanSyncPushBridgeGlobal();
    if (cached && typeof cached === "object") pushBridge = cached;
  }
  if (!pushBridge) {
    throw new Error("lan-sync-push: registerLanSyncPushBridge() not called");
  }
  return pushBridge;
}

export {
  lanSyncRoomBridgeGlobal,
  setLanSyncRoomBridgeGlobal,
  lanSyncTransportDepsGlobal,
  setLanSyncTransportDepsGlobal,
  registerLanSyncPushBridge,
  ensureLanSyncPushBridgeWired,
  bridge
};
//# sourceMappingURL=/js/chunks/chunk-DIWJYISZ.js.map
