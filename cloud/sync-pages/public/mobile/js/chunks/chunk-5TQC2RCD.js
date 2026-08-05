import {
  upsertHost
} from "/mobile/js/chunks/chunk-TY4AHNM4.js";

// public/js/lan-surrogate-host.mjs
var PEERS_KEY = "rpc-lan-live-peers";
var SURROGATE_KEY = "rpc-lan-surrogate-host";
var PRIMARY_HOST_KEY = "rpc-lan-primary-host-url";
var PEER_TTL_MS = 5 * 60 * 1e3;
function rememberPrimaryHostUrl(hostUrl) {
  const url = String(hostUrl || "").trim().replace(/\/+$/, "");
  if (!url) return;
  try {
    localStorage.setItem(PRIMARY_HOST_KEY, url);
  } catch (_e) {
    void _e;
  }
}
function getPrimaryHostUrl() {
  try {
    return String(localStorage.getItem(PRIMARY_HOST_KEY) || "").trim().replace(/\/+$/, "");
  } catch {
    return "";
  }
}
function readPeersRaw() {
  try {
    const raw = localStorage.getItem(PEERS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
function writePeersRaw(map) {
  try {
    localStorage.setItem(PEERS_KEY, JSON.stringify(map || {}));
  } catch (_e) {
    void _e;
  }
}
function pruneLivePeers(nowMs) {
  const now = nowMs != null ? nowMs : Date.now();
  const map = readPeersRaw();
  let changed = false;
  Object.keys(map).forEach((id) => {
    const row = map[id];
    if (!row || now - Number(row.seenAt || 0) > PEER_TTL_MS) {
      delete map[id];
      changed = true;
    }
  });
  if (changed) writePeersRaw(map);
  return map;
}
function recordLivePeer(clientId, meta) {
  const id = String(clientId || "").trim();
  const hostUrl = String(meta && meta.hostUrl ? meta.hostUrl : "").trim().replace(/\/+$/, "");
  if (!id || !hostUrl) return;
  const map = pruneLivePeers();
  map[id] = {
    hostUrl,
    canHost: !!(meta && meta.canHost),
    seenAt: Date.now(),
    clientId: id
  };
  writePeersRaw(map);
  if (meta && Number(meta.startedAt) > 0) {
    upsertHost({
      fingerprint: `${id}:${meta.startedAt}`,
      clientId: id,
      startedAt: Number(meta.startedAt),
      currentUrl: hostUrl,
      rank: String(meta.rank || ""),
      dbUnlocked: false,
      shiftPinActive: false,
      rttMs: 0,
      lastSeenAt: Date.now(),
      source: "heartbeat"
    });
  }
}
function listLivePeerHostUrls(excludeClientId) {
  const skip = String(excludeClientId || "").trim();
  const map = pruneLivePeers();
  const urls = [];
  const seen = /* @__PURE__ */ new Set();
  Object.keys(map).forEach((id) => {
    if (id === skip) return;
    const row = map[id];
    if (!row || !row.canHost || !row.hostUrl) return;
    if (seen.has(row.hostUrl)) return;
    seen.add(row.hostUrl);
    urls.push(row.hostUrl);
  });
  urls.sort();
  return urls;
}
function surrogateElectionDelayMs(clientId) {
  const s = String(clientId || "lc");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = h * 31 + s.charCodeAt(i) >>> 0;
  return 400 + h % 2400;
}
var LAN_PING_TIMEOUT_MS = 500;
async function pingLanHostUrl(hostUrl, teamCode) {
  const url = String(hostUrl || "").trim().replace(/\/+$/, "");
  if (!url) return false;
  const code = String(teamCode || "").trim();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LAN_PING_TIMEOUT_MS);
  try {
    const r = await fetch(`${url}/api/lan/v1/ping`, {
      method: "GET",
      headers: { Authorization: `Bearer ${code}` },
      cache: "no-store",
      signal: ctrl.signal
    });
    return !!(r && r.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
function getSurrogateHostState() {
  try {
    const raw = localStorage.getItem(SURROGATE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !String(o.formerHostUrl || "").trim()) return null;
    return {
      formerHostUrl: String(o.formerHostUrl).trim().replace(/\/+$/, ""),
      formerTeamCode: String(o.formerTeamCode || "").trim(),
      localHostUrl: String(o.localHostUrl || "").trim().replace(/\/+$/, ""),
      promotedAt: String(o.promotedAt || ""),
      roomId: String(o.roomId || "").trim()
    };
  } catch {
    return null;
  }
}
function setSurrogateHostState(state) {
  if (!state || !state.formerHostUrl) {
    clearSurrogateHostState();
    return;
  }
  try {
    localStorage.setItem(
      SURROGATE_KEY,
      JSON.stringify({
        formerHostUrl: String(state.formerHostUrl).trim().replace(/\/+$/, ""),
        formerTeamCode: String(state.formerTeamCode || "").trim(),
        localHostUrl: String(state.localHostUrl || "").trim().replace(/\/+$/, ""),
        promotedAt: state.promotedAt || (/* @__PURE__ */ new Date()).toISOString(),
        roomId: String(state.roomId || "").trim()
      })
    );
  } catch (_e) {
    void _e;
  }
}
function clearSurrogateHostState() {
  try {
    localStorage.removeItem(SURROGATE_KEY);
  } catch (_e) {
    void _e;
  }
}
function isSurrogateHostActive() {
  return !!getSurrogateHostState();
}

// public/js/lan-host-detect-guard.mjs
var MAX_AUTO_HOST_DETECT_ATTEMPTS = 5;
var _missCount = 0;
var _paused = false;
function isAutoHostDetectPaused() {
  return _paused;
}
function canAttemptAutoHostDetect() {
  return !_paused;
}
function recordAutoHostDetectMiss() {
  _missCount += 1;
  if (_missCount >= MAX_AUTO_HOST_DETECT_ATTEMPTS) {
    _paused = true;
  }
}
function recordAutoHostDetectSuccess() {
  _missCount = 0;
  _paused = false;
}
function resumeAutoHostDetect() {
  _missCount = 0;
  _paused = false;
}

// public/js/lan-shift-pin-bypass.mjs
function isLanSkipShiftPin() {
  try {
    if (typeof window !== "undefined" && window.electronAPI?.isLanShiftPinRequired?.()) {
      return false;
    }
  } catch {
  }
  return true;
}

export {
  rememberPrimaryHostUrl,
  getPrimaryHostUrl,
  recordLivePeer,
  listLivePeerHostUrls,
  surrogateElectionDelayMs,
  pingLanHostUrl,
  getSurrogateHostState,
  setSurrogateHostState,
  clearSurrogateHostState,
  isSurrogateHostActive,
  isAutoHostDetectPaused,
  canAttemptAutoHostDetect,
  recordAutoHostDetectMiss,
  recordAutoHostDetectSuccess,
  resumeAutoHostDetect,
  isLanSkipShiftPin
};
//# sourceMappingURL=/js/chunks/chunk-5TQC2RCD.js.map
