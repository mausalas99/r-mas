import {
  parseCloudMobileInviteSearch
} from "/mobile/js/chunks/chunk-OBGB2GI4.js";
import {
  patients
} from "/mobile/js/chunks/chunk-TWV6UAYK.js";
import {
  getCloudSyncRoomId,
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRemember,
  setCloudSyncRoomSnapshot,
  setCloudSyncToken
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-FORXNEKH.js";

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

// public/js/features/cloud-mobile/resolve-active-room.mjs
function createApi() {
  return createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken
  });
}
function pickBestCloudMobileRoom(rooms) {
  const list = Array.isArray(rooms) ? rooms.slice() : [];
  if (!list.length) return null;
  list.sort(function(a, b) {
    const rev = Number(b?.revision || 0) - Number(a?.revision || 0);
    if (rev !== 0) return rev;
    const bytes = Number(b?.storageBytes || 0) - Number(a?.storageBytes || 0);
    if (bytes !== 0) return bytes;
    return String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || ""));
  });
  return list[0] || null;
}
async function joinCloudMobileRoomByCodeSilent(code) {
  const trimmed = String(code || "").trim();
  if (!trimmed || !getCloudSyncToken()) return null;
  try {
    const data = await createApi().joinRoom({ code: trimmed });
    const room = data?.room || null;
    if (!room?.id) return null;
    setCloudSyncRoomSnapshot(room);
    persistCloudMobilePairingFromRoom(room, readCloudMobileJoinUser());
    return room;
  } catch {
    return null;
  }
}
function applyResolvedRoom(room) {
  if (!room?.id) return null;
  setCloudSyncRoomSnapshot(room);
  persistCloudMobilePairingFromRoom(room, readCloudMobileJoinUser());
  return room;
}
async function resolveCloudMobileActiveRoom(api) {
  const client = api || createApi();
  if (!getCloudSyncToken()) return null;
  try {
    const data = await client.activeRoom();
    const active = data?.room || null;
    if (active?.id && Number(active.revision) > 0) {
      return applyResolvedRoom(active);
    }
    const listed = await client.listRooms();
    const best = pickBestCloudMobileRoom(listed?.rooms);
    if (best?.id) return applyResolvedRoom(best);
    if (active?.id) return applyResolvedRoom(active);
  } catch {
  }
  return joinCloudMobileRoomByCodeSilent(readCloudMobileJoinCode());
}
async function notifyIfCloudMobileCensusEmpty(toast) {
  if (!patients?.length) {
    toast?.(
      "Censo vac\xEDo en la nube. En Mac abre \u21C4 \u2192 Conexi\xF3n y confirma que la sala tenga pacientes sincronizados.",
      "info"
    );
  }
}
function showCloudMobileEmptyCensusBanner() {
  if (patients?.length) {
    const existing = document.getElementById("rpc-cloud-mobile-empty-census");
    if (existing) existing.hidden = true;
    return;
  }
  if (typeof document === "undefined") return;
  let banner = document.getElementById("rpc-cloud-mobile-empty-census");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "rpc-cloud-mobile-empty-census";
    banner.className = "rpc-cloud-mobile-empty-census";
    banner.setAttribute("role", "status");
    document.body.appendChild(banner);
  }
  banner.textContent = "Sin pacientes en la nube. En el Mac del turno deja R+ abierto unos 20 s (misma cuenta \u21C4) y recarga aqu\xED.";
  banner.hidden = false;
}

export {
  setCloudMobileToken,
  readCloudMobileJoinCode,
  readCloudMobileJoinSala,
  readCloudMobileJoinUser,
  clearCloudMobileJoinHints,
  applyCloudMobileInviteSearch,
  restoreCloudMobilePairingFromStorage,
  persistCloudMobilePairingFromRoom,
  pickBestCloudMobileRoom,
  joinCloudMobileRoomByCodeSilent,
  resolveCloudMobileActiveRoom,
  notifyIfCloudMobileCensusEmpty,
  showCloudMobileEmptyCensusBanner
};
//# sourceMappingURL=/js/chunks/chunk-357ZNVQI.js.map
