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
  if (raw) return raw.replace(/\/$/, "");
  const devOverride = typeof window !== "undefined" ? window.electronAPI?.getDevCloudSyncUrlOverride?.() : null;
  return String(devOverride || DEFAULT_CLOUD_SYNC_URL).replace(/\/$/, "");
}
function setCloudSyncUrl(url) {
  const s = readSettings();
  s.cloudSyncUrl = String(url || "").replace(/\/$/, "");
  writeSettings(s);
}
function getCloudSyncRemember() {
  try {
    hydrateRememberFromDisk();
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
function rememberBridgeApi() {
  try {
    if (typeof window === "undefined") return null;
    return window.electronAPI || null;
  } catch {
    return null;
  }
}
var rememberHydrated = false;
var cachedDeks = {};
function getStoredRoomDeks() {
  hydrateRememberFromDisk();
  return cachedDeks;
}
function setStoredRoomDeks(deks) {
  cachedDeks = deks && typeof deks === "object" ? deks : {};
  persistRememberToDisk();
}
function hydrateRememberFromDisk() {
  if (rememberHydrated) return;
  rememberHydrated = true;
  const api = rememberBridgeApi();
  if (!api || typeof api.cloudSyncRememberGetSync !== "function") return;
  let snap = null;
  try {
    snap = api.cloudSyncRememberGetSync();
  } catch {
    return;
  }
  if (snap && snap.deks && typeof snap.deks === "object") cachedDeks = snap.deks;
  if (!snap || !String(snap.token || "").trim()) return;
  try {
    localStorage.setItem(REMEMBER_KEY, "1");
    sessionStorage.setItem(TOKEN_KEY, String(snap.token));
    localStorage.setItem(TOKEN_KEY, String(snap.token));
    if (snap.roomId) {
      sessionStorage.setItem(ROOM_ID_KEY, String(snap.roomId));
      localStorage.setItem(ROOM_ID_KEY, String(snap.roomId));
    }
    if (snap.revision != null) {
      const rev = String(Number(snap.revision) || 0);
      sessionStorage.setItem(REVISION_KEY, rev);
      localStorage.setItem(REVISION_KEY, rev);
    }
    if (snap.roomMeta && snap.roomMeta.id) {
      const meta = JSON.stringify(snap.roomMeta);
      sessionStorage.setItem(ROOM_META_KEY, meta);
      localStorage.setItem(ROOM_META_KEY, meta);
    }
  } catch {
  }
}
function persistRememberToDisk() {
  const api = rememberBridgeApi();
  if (!api) return;
  if (!getCloudSyncRemember()) {
    if (typeof api.cloudSyncRememberClear === "function") {
      void api.cloudSyncRememberClear();
    }
    return;
  }
  const token = (() => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  })();
  if (!token) {
    if (typeof api.cloudSyncRememberClear === "function") {
      void api.cloudSyncRememberClear();
    }
    return;
  }
  if (typeof api.cloudSyncRememberSet !== "function") return;
  let roomMeta = null;
  try {
    const raw = sessionStorage.getItem(ROOM_META_KEY) || localStorage.getItem(ROOM_META_KEY);
    roomMeta = raw ? JSON.parse(raw) : null;
  } catch {
    roomMeta = null;
  }
  void api.cloudSyncRememberSet({
    remember: true,
    token,
    roomId: (() => {
      try {
        return sessionStorage.getItem(ROOM_ID_KEY) || localStorage.getItem(ROOM_ID_KEY) || "";
      } catch {
        return "";
      }
    })(),
    revision: (() => {
      try {
        const raw = sessionStorage.getItem(REVISION_KEY) || localStorage.getItem(REVISION_KEY) || "0";
        return Number(raw) || 0;
      } catch {
        return 0;
      }
    })(),
    roomMeta,
    deks: cachedDeks
  });
}
function readDual(key) {
  try {
    hydrateRememberFromDisk();
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
  if (key === TOKEN_KEY || key === ROOM_ID_KEY || key === REVISION_KEY || key === ROOM_META_KEY || key === REMEMBER_KEY) {
    persistRememberToDisk();
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
function advanceCloudSyncRevision(revision) {
  const next = Number(revision) || 0;
  if (next <= 0) return;
  if (next > getCloudSyncRevision()) setCloudSyncRevision(next);
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
  cachedDeks = {};
  const api = rememberBridgeApi();
  if (api && typeof api.cloudSyncRememberClear === "function") {
    void api.cloudSyncRememberClear();
  }
}

export {
  DEFAULT_CLOUD_SYNC_URL,
  getCloudSyncUrl,
  setCloudSyncUrl,
  getCloudSyncRemember,
  setCloudSyncRemember,
  getStoredRoomDeks,
  setStoredRoomDeks,
  getCloudSyncToken,
  setCloudSyncToken,
  clearCloudSyncToken,
  getCloudSyncRoomId,
  setCloudSyncRoomId,
  setCloudSyncRoomSnapshot,
  getCloudSyncRoomSnapshot,
  getCloudSyncRevision,
  setCloudSyncRevision,
  advanceCloudSyncRevision,
  getCloudSyncSettings,
  clearCloudSyncSession
};
//# sourceMappingURL=/js/chunks/chunk-FLGCYVFI.js.map
