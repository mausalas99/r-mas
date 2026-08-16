import {
  parseCloudMobileInviteSearch
} from "/mobile/js/chunks/chunk-OBGB2GI4.js";
import {
  getCloudSyncRoomId,
  getCloudSyncToken,
  setCloudSyncRemember,
  setCloudSyncRoomSnapshot,
  setCloudSyncToken
} from "/mobile/js/chunks/chunk-NPUSZB5W.js";

// public/js/features/cloud-mobile/session.mjs
var CLOUD_MOBILE_PAIRING_KEY = "rpc-cloud-mobile-pairing";
var JOIN_CODE_KEY = "rpc-cloud-mobile-join-code";
var JOIN_SALA_KEY = "rpc-cloud-mobile-join-sala";
var JOIN_USER_KEY = "rpc-cloud-mobile-join-user";
function setCloudMobileToken(token) {
  setCloudSyncToken(token, { remember: true });
}
function readCloudMobilePairing() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CLOUD_MOBILE_PAIRING_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    return {
      auth: String(o.auth || "").trim(),
      room: String(o.room || "").trim(),
      roomId: String(o.roomId || "").trim(),
      sala: String(o.sala || "").trim(),
      user: String(o.user || "").trim().replace(/^@+/, "")
    };
  } catch {
    return null;
  }
}
function mergeCloudMobilePairing(next, prev) {
  return {
    auth: String(next.auth || prev.auth || "").trim(),
    room: String(next.room || prev.room || "").trim(),
    roomId: String(next.roomId || prev.roomId || "").trim(),
    sala: String(next.sala || prev.sala || "").trim(),
    user: String(next.user || prev.user || "").trim().replace(/^@+/, "")
  };
}
function persistCloudMobilePairing(next) {
  if (typeof localStorage === "undefined" || !next) return false;
  try {
    const prev = readCloudMobilePairing() || {
      auth: "",
      room: "",
      roomId: "",
      sala: "",
      user: ""
    };
    const merged = mergeCloudMobilePairing(next, prev);
    if (!merged.auth && !merged.user) return false;
    localStorage.setItem(CLOUD_MOBILE_PAIRING_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}
function readCloudMobileJoinCode() {
  try {
    const fromSession = String(sessionStorage.getItem(JOIN_CODE_KEY) || "").trim();
    if (fromSession) return fromSession;
    return String(readCloudMobilePairing()?.room || "").trim();
  } catch {
    return "";
  }
}
function readCloudMobileJoinSala() {
  try {
    const fromSession = String(sessionStorage.getItem(JOIN_SALA_KEY) || "").trim();
    if (fromSession) return fromSession;
    return String(readCloudMobilePairing()?.sala || "").trim();
  } catch {
    return "";
  }
}
function readCloudMobileJoinUser() {
  try {
    const fromSession = String(sessionStorage.getItem(JOIN_USER_KEY) || "").trim();
    if (fromSession) return fromSession;
    return String(readCloudMobilePairing()?.user || "").trim();
  } catch {
    return "";
  }
}
function writeCloudMobileJoinHints(hints) {
  try {
    const room = String(hints?.room || "").trim();
    const sala = String(hints?.sala || "").trim();
    const user = String(hints?.user || "").trim().replace(/^@+/, "");
    if (room) sessionStorage.setItem(JOIN_CODE_KEY, room);
    if (sala) sessionStorage.setItem(JOIN_SALA_KEY, sala);
    if (user) sessionStorage.setItem(JOIN_USER_KEY, user);
  } catch {
  }
}
function clearCloudMobileJoinHints() {
  try {
    sessionStorage.removeItem(JOIN_CODE_KEY);
    sessionStorage.removeItem(JOIN_SALA_KEY);
    sessionStorage.removeItem(JOIN_USER_KEY);
  } catch {
  }
}
function applyCloudMobileInviteSearch(search) {
  const invite = parseCloudMobileInviteSearch(search);
  writeCloudMobileJoinHints(invite);
  let appliedAuth = false;
  if (invite.auth) {
    setCloudMobileToken(invite.auth);
    appliedAuth = true;
  }
  if (invite.auth || invite.room) {
    persistCloudMobilePairing({
      auth: invite.auth || void 0,
      room: invite.room || void 0,
      sala: invite.sala || void 0,
      user: invite.user || void 0
    });
  }
  return { ...invite, appliedAuth };
}
function restoreCloudMobilePairingFromStorage() {
  const pairing = readCloudMobilePairing();
  if (!pairing) return false;
  let applied = false;
  if (pairing.auth && !getCloudSyncToken()) {
    setCloudMobileToken(pairing.auth);
    applied = true;
  } else if (pairing.auth) {
    setCloudSyncRemember(true);
  }
  writeCloudMobileJoinHints({
    room: pairing.room,
    sala: pairing.sala,
    user: pairing.user
  });
  if (pairing.room) applied = true;
  if (pairing.roomId && !getCloudSyncRoomId()) {
    setCloudSyncRoomSnapshot({
      id: pairing.roomId,
      code: pairing.room,
      sala: pairing.sala
    });
    applied = true;
  }
  return applied;
}
function persistCloudMobilePairingFromRoom(room, user) {
  if (!room?.code) return;
  persistCloudMobilePairing({
    auth: getCloudSyncToken() || void 0,
    room: room.code,
    roomId: room.id,
    sala: room.sala,
    user: user || readCloudMobileJoinUser()
  });
}

export {
  setCloudMobileToken,
  readCloudMobileJoinCode,
  readCloudMobileJoinSala,
  readCloudMobileJoinUser,
  clearCloudMobileJoinHints,
  applyCloudMobileInviteSearch,
  restoreCloudMobilePairingFromStorage,
  persistCloudMobilePairingFromRoom
};
//# sourceMappingURL=/js/chunks/chunk-3KYJCC4V.js.map
