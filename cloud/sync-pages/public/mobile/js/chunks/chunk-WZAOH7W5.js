// public/js/live-sync-membership.mjs
var MEMBERSHIP_KEY = "rpc-lan-room-membership";
var LAST_ROOM_KEY = "rpc-lan-last-room";
function getRoomMembership() {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !String(o.roomId || "").trim()) return null;
    return {
      roomId: String(o.roomId).trim(),
      label: String(o.label || o.roomId).trim(),
      joinedAt: String(o.joinedAt || "")
    };
  } catch {
    return null;
  }
}
function setRoomMembership({ roomId, label }) {
  const id = String(roomId || "").trim();
  if (!id) return;
  const payload = {
    roomId: id,
    label: String(label || id).trim(),
    joinedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(payload));
  localStorage.setItem(LAST_ROOM_KEY, id);
}
function clearRoomMembership() {
  try {
    localStorage.removeItem(MEMBERSHIP_KEY);
    localStorage.removeItem(LAST_ROOM_KEY);
  } catch (_e) {
    void _e;
  }
}
function migrateLastRoomToMembership() {
  if (getRoomMembership()) return;
  try {
    const id = String(localStorage.getItem(LAST_ROOM_KEY) || "").trim();
    if (!id) return;
    setRoomMembership({ roomId: id, label: id });
  } catch (_e) {
    void _e;
  }
}

export {
  getRoomMembership,
  setRoomMembership,
  clearRoomMembership,
  migrateLastRoomToMembership
};
//# sourceMappingURL=/js/chunks/chunk-WZAOH7W5.js.map
