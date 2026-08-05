// public/js/features/cloud-sync/settings.mjs
var SETTINGS_KEY = "rpc-settings";
var DEFAULT_CLOUD_SYNC_URL = "https://rplus-sync.rmas-workersdev.workers.dev";
var TOKEN_KEY = "rpc-cloud-sync-token";
var ROOM_ID_KEY = "rpc-cloud-sync-room-id";
var REVISION_KEY = "rpc-cloud-sync-revision";
var ROOM_META_KEY = "rpc-cloud-sync-room-meta";
var REMEMBER_KEY = "rpc-cloud-sync-remember";
function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function getCloudSyncUrl() {
  const s = readSettings();
  const raw = String(s.cloudSyncUrl || "").trim();
  return (raw || DEFAULT_CLOUD_SYNC_URL).replace(/\/$/, "");
}
function setCloudSyncUrl(url) {
  const s = readSettings();
  s.cloudSyncUrl = String(url || "").replace(/\/$/, "");
  writeSettings(s);
}
function getCloudSyncRemember() {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}
function setCloudSyncRemember(remember) {
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, "1");
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
  }
}
function readDual(key) {
  try {
    const sessionVal = sessionStorage.getItem(key);
    if (sessionVal) return sessionVal;
    if (!getCloudSyncRemember()) return "";
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
function writeDual(key, value) {
  try {
    if (value) {
      sessionStorage.setItem(key, value);
      if (getCloudSyncRemember()) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } else {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
  } catch {
  }
}
function getCloudSyncToken() {
  return readDual(TOKEN_KEY);
}
function setCloudSyncToken(token, opts) {
  if (opts && Object.prototype.hasOwnProperty.call(opts, "remember")) {
    setCloudSyncRemember(!!opts.remember);
  }
  writeDual(TOKEN_KEY, token ? String(token) : "");
}
function clearCloudSyncToken() {
  writeDual(TOKEN_KEY, "");
}
function getCloudSyncRoomId() {
  return readDual(ROOM_ID_KEY);
}
function setCloudSyncRoomId(roomId) {
  writeDual(ROOM_ID_KEY, roomId ? String(roomId) : "");
  if (!roomId) writeDual(ROOM_META_KEY, "");
}
function setCloudSyncRoomSnapshot(room) {
  if (!room || !room.id) {
    setCloudSyncRoomId("");
    setCloudSyncRevision(0);
    return;
  }
  setCloudSyncRoomId(String(room.id));
  if (room.revision != null) setCloudSyncRevision(Number(room.revision) || 0);
  writeDual(
    ROOM_META_KEY,
    JSON.stringify({
      id: String(room.id),
      code: String(room.code || ""),
      sala: String(room.sala || ""),
      turnKey: String(room.turnKey || ""),
      name: String(room.name || "")
    })
  );
}
function getCloudSyncRoomSnapshot() {
  const raw = readDual(ROOM_META_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || !o.id) return null;
    return {
      id: String(o.id),
      code: String(o.code || ""),
      sala: String(o.sala || ""),
      turnKey: String(o.turnKey || ""),
      name: String(o.name || "")
    };
  } catch {
    return null;
  }
}
function getCloudSyncRevision() {
  const raw = readDual(REVISION_KEY);
  return raw !== "" ? Number(raw) || 0 : 0;
}
function setCloudSyncRevision(revision) {
  writeDual(REVISION_KEY, String(Number(revision) || 0));
}
function getCloudSyncSettings() {
  return {
    baseUrl: getCloudSyncUrl(),
    token: getCloudSyncToken(),
    roomId: getCloudSyncRoomId(),
    revision: getCloudSyncRevision(),
    remember: getCloudSyncRemember()
  };
}
function clearCloudSyncSession() {
  clearCloudSyncToken();
  setCloudSyncRoomId("");
  setCloudSyncRevision(0);
  writeDual(ROOM_META_KEY, "");
}

export {
  DEFAULT_CLOUD_SYNC_URL,
  getCloudSyncUrl,
  setCloudSyncUrl,
  getCloudSyncRemember,
  setCloudSyncRemember,
  getCloudSyncToken,
  setCloudSyncToken,
  clearCloudSyncToken,
  getCloudSyncRoomId,
  setCloudSyncRoomId,
  setCloudSyncRoomSnapshot,
  getCloudSyncRoomSnapshot,
  getCloudSyncRevision,
  setCloudSyncRevision,
  getCloudSyncSettings,
  clearCloudSyncSession
};
//# sourceMappingURL=/js/chunks/chunk-BRT2MMPP.js.map
