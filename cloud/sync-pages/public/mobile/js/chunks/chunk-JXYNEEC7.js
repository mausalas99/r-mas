import {
  persistCloudMobilePairingFromRoom,
  readCloudMobileJoinCode,
  readCloudMobileJoinUser
} from "/mobile/js/chunks/chunk-3KYJCC4V.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-KYGE5G3V.js";
import {
  getPatients
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRoomSnapshot
} from "/mobile/js/chunks/chunk-NPUSZB5W.js";

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
  if (!getPatients()?.length) {
    toast?.(
      "Censo vac\xEDo en la nube. En Mac abre \u21C4 \u2192 Conexi\xF3n y confirma que la sala tenga pacientes sincronizados.",
      "info"
    );
  }
}
function showCloudMobileEmptyCensusBanner() {
  if (getPatients()?.length) {
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
  pickBestCloudMobileRoom,
  joinCloudMobileRoomByCodeSilent,
  resolveCloudMobileActiveRoom,
  notifyIfCloudMobileCensusEmpty,
  showCloudMobileEmptyCensusBanner
};
//# sourceMappingURL=/js/chunks/chunk-JXYNEEC7.js.map
