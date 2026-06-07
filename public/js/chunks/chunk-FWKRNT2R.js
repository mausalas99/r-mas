// public/js/lan-sync-state.mjs
var RoomSyncPhase = Object.freeze({
  offline: "offline",
  configured: "configured",
  joining: "joining",
  catching_up: "catching_up",
  live: "live",
  degraded: "degraded"
});
var VALID_PHASES = new Set(Object.values(RoomSyncPhase));
var phaseByRoom = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
function notify(roomId, phase, meta) {
  const detail = { roomId, phase, meta: meta ?? null };
  listeners.forEach(function(cb) {
    try {
      cb(detail);
    } catch (_e) {
    }
  });
}
function getRoomSyncPhase(roomId) {
  const id = roomId != null ? String(roomId).trim() : "";
  if (!id) return RoomSyncPhase.offline;
  const entry = phaseByRoom.get(id);
  return entry ? entry.phase : RoomSyncPhase.offline;
}
function setRoomSyncPhase(roomId, phase, meta) {
  const id = String(roomId || "").trim();
  const p = String(phase || "").trim();
  if (!id || !VALID_PHASES.has(p)) return;
  const prev = phaseByRoom.get(id);
  const nextMeta = meta ?? null;
  if (prev && prev.phase === p && prev.meta === nextMeta) return;
  phaseByRoom.set(id, { phase: p, meta: nextMeta });
  notify(id, p, nextMeta);
}
function clearRoomSyncPhase(roomId) {
  const id = String(roomId || "").trim();
  if (!id || !phaseByRoom.has(id)) return;
  phaseByRoom.delete(id);
  notify(id, RoomSyncPhase.offline, null);
}
function subscribeRoomSyncPhase(cb) {
  if (typeof cb !== "function") return function() {
  };
  listeners.add(cb);
  return function unsubscribe() {
    listeners.delete(cb);
  };
}

export {
  RoomSyncPhase,
  getRoomSyncPhase,
  setRoomSyncPhase,
  clearRoomSyncPhase,
  subscribeRoomSyncPhase
};
//# sourceMappingURL=/js/chunks/chunk-FWKRNT2R.js.map
