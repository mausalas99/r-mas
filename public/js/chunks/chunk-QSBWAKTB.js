import {
  CLINICAL_SALA_VALUES,
  clinicalSalaRoomSlug
} from "/js/chunks/chunk-CRJYUJ23.js";

// public/js/lan-join-link.mjs
var JOIN_TICKET_PATH_RE = /\/join\/(req_[a-f0-9]{12})\b/i;
var LIVE_SYNC_SALA_DEFS = CLINICAL_SALA_VALUES.map((key) => ({
  id: clinicalSalaRoomSlug(key),
  label: key,
  key
}));
function resolveLiveSyncRoomIdFromSala(salaOrRoom) {
  const raw = String(salaOrRoom || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const hit = LIVE_SYNC_SALA_DEFS.find(
    (d) => d.id === lower || d.key === raw || d.label === raw
  );
  return hit ? hit.id : "";
}
function liveSyncRoomLabel(roomId) {
  const id = String(roomId || "").trim();
  const hit = LIVE_SYNC_SALA_DEFS.find((d) => d.id === id);
  return hit ? hit.label : id;
}
function resolveLanJoinHostUrl(fromServer, pageOrigin) {
  try {
    const u = new URL(String(fromServer || "").trim());
    if (u.hostname && !/^(localhost|127\.0\.0\.1)$/i.test(u.hostname)) {
      return `${u.protocol}//${u.host}`;
    }
  } catch (_e) {
  }
  const origin = String(pageOrigin || "").trim();
  if (origin) {
    try {
      const o = new URL(origin);
      if (o.hostname && !/^(localhost|127\.0\.0\.1)$/i.test(o.hostname)) {
        return `${o.protocol}//${o.host}`;
      }
    } catch (_e2) {
    }
  }
  return "";
}
async function buildTeamHash(teamCode) {
  const code = String(teamCode || "");
  if (!code) return "";
  try {
    const buf = new TextEncoder().encode(code);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const hex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, 8);
  } catch (_e) {
    return "";
  }
}
function appendTeamHashToUrl(url, th) {
  if (!th) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}th=${encodeURIComponent(th)}`;
}
async function buildLanJoinUrls(hostUrl, ticketId, teamCode) {
  const base = String(hostUrl || "").trim().replace(/\/+$/, "");
  const id = encodeURIComponent(String(ticketId || "").trim());
  const th = teamCode ? await buildTeamHash(String(teamCode).trim()) : "";
  const path = `${base}/join/${id}`;
  const withTh = appendTeamHashToUrl(path, th);
  return {
    joinUrl: withTh,
    mobileUrl: withTh
  };
}
async function buildPermanentMobileJoinUrl(hostUrl, teamCode) {
  const base = String(hostUrl || "").trim().replace(/\/+$/, "");
  const code = String(teamCode || "").trim();
  if (!base || !code) return "";
  const u = new URL(`${base}/mobile/`);
  u.searchParams.set("token", code);
  const th = await buildTeamHash(code);
  if (th) u.searchParams.set("th", th);
  return u.toString();
}
function parseLanJoinQuery(search, origin) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const code = String(params.get("code") || params.get("token") || "").trim();
  const roomParam = String(params.get("room") || "").trim();
  const salaParam = String(params.get("sala") || "").trim();
  const roomId = resolveLiveSyncRoomIdFromSala(roomParam) || resolveLiveSyncRoomIdFromSala(salaParam) || roomParam;
  const hostParam = String(params.get("host") || "").trim().replace(/\/+$/, "");
  let hostUrl = resolveLanJoinHostUrl(hostParam, origin);
  if (!hostUrl && hostParam) hostUrl = hostParam;
  return { hostUrl, teamCode: code, roomId, sala: salaParam };
}
function hostFromUrl(u) {
  return `${u.protocol}//${u.host}`;
}
function emptyInviteParse() {
  return { hostUrl: "", teamCode: "", roomId: "", ticketId: "", legacyInvite: false };
}
function parseLanInviteInput(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return emptyInviteParse();
  }
  const urlMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  if (urlMatch) {
    try {
      const u = new URL(urlMatch[0]);
      const hostUrl = hostFromUrl(u);
      const ticketM = u.pathname.match(JOIN_TICKET_PATH_RE);
      if (ticketM) {
        return { hostUrl, teamCode: "", roomId: "", ticketId: ticketM[1], legacyInvite: false };
      }
      const search = u.search || "";
      if (/\/mobile\/?$/i.test(u.pathname)) {
        const mobileParsed = parseLanJoinQuery(search, hostUrl);
        if (mobileParsed.teamCode) {
          return {
            hostUrl,
            teamCode: mobileParsed.teamCode,
            roomId: mobileParsed.roomId,
            ticketId: "",
            legacyInvite: false
          };
        }
      }
      if (search.includes("code=") || search.includes("token=")) {
        const room = String(new URLSearchParams(search).get("room") || "").trim();
        return { hostUrl, teamCode: "", roomId: room, ticketId: "", legacyInvite: true };
      }
    } catch (_e) {
    }
  }
  const pathTicket = text.match(JOIN_TICKET_PATH_RE);
  if (pathTicket) {
    return { hostUrl: "", teamCode: "", roomId: "", ticketId: pathTicket[1], legacyInvite: false };
  }
  if (text.includes("code=") || text.includes("token=") || text.includes("room=")) {
    const q = text.includes("?") ? text.slice(text.indexOf("?")) : text.startsWith("?") ? text : `?${text}`;
    const parsed = parseLanJoinQuery(q, "");
    if (parsed.teamCode || parsed.roomId) {
      return {
        hostUrl: parsed.hostUrl,
        teamCode: "",
        roomId: parsed.roomId,
        ticketId: "",
        legacyInvite: true
      };
    }
  }
  return emptyInviteParse();
}
function isLanSalaInvitePaste(raw) {
  const text = String(raw || "").trim();
  if (!text) return false;
  if (/https?:\/\//i.test(text) && /\/join\//i.test(text)) return true;
  if (JOIN_TICKET_PATH_RE.test(text)) return true;
  const parsed = parseLanInviteInput(text);
  return !!(parsed.ticketId || parsed.hostUrl && parsed.teamCode);
}

// public/js/lan-network-profile.mjs
var RTT_SLOW_THRESHOLD_MS = 500;
var RTT_FAST_THRESHOLD_MS = 200;
var FAST_TO_SLOW_COUNT = 3;
var SLOW_TO_FAST_COUNT = 5;
var FAST_TO_OFFLINE_FAIL_COUNT = 5;
var SLOW_TO_OFFLINE_FAIL_COUNT = 3;
function createNetworkProfile() {
  let profile = "fast";
  let consecutiveSlowCount = 0;
  let consecutiveFastCount = 0;
  let consecutiveFailCount = 0;
  let lastRttMs = 0;
  const subscribers = /* @__PURE__ */ new Set();
  let reconnectResolve = null;
  function notify(newProfile) {
    for (const cb of subscribers) {
      try {
        cb(newProfile);
      } catch (_) {
      }
    }
  }
  function transition(newProfile) {
    if (newProfile === profile) return;
    profile = newProfile;
    consecutiveSlowCount = 0;
    consecutiveFastCount = 0;
    consecutiveFailCount = 0;
    notify(profile);
  }
  function recordPingSuccess(rttMs) {
    if (profile === "offline") return;
    lastRttMs = Number(rttMs) || 0;
    consecutiveFailCount = 0;
    if (rttMs > RTT_SLOW_THRESHOLD_MS) {
      consecutiveSlowCount++;
      consecutiveFastCount = 0;
      if (profile === "fast" && consecutiveSlowCount >= FAST_TO_SLOW_COUNT) {
        transition("slow");
      }
    } else if (rttMs < RTT_FAST_THRESHOLD_MS) {
      consecutiveFastCount++;
      consecutiveSlowCount = 0;
      if (profile === "slow" && consecutiveFastCount >= SLOW_TO_FAST_COUNT) {
        transition("fast");
      }
    } else {
      consecutiveFastCount = 0;
      consecutiveSlowCount = 0;
    }
  }
  function recordPingFailure() {
    if (profile === "offline") return;
    consecutiveFailCount++;
    consecutiveSlowCount = 0;
    consecutiveFastCount = 0;
    const threshold = profile === "slow" ? SLOW_TO_OFFLINE_FAIL_COUNT : FAST_TO_OFFLINE_FAIL_COUNT;
    if (consecutiveFailCount >= threshold) {
      transition("offline");
    }
  }
  function recordRttSample(rttMs) {
    recordPingSuccess(rttMs);
  }
  function getNetworkProfile() {
    return profile;
  }
  function getLastRttMs() {
    return lastRttMs;
  }
  function subscribeNetworkProfile(cb) {
    subscribers.add(cb);
    return function unsubscribe() {
      subscribers.delete(cb);
    };
  }
  function resetProfile() {
    profile = "fast";
    consecutiveSlowCount = 0;
    consecutiveFastCount = 0;
    consecutiveFailCount = 0;
    lastRttMs = 0;
    if (reconnectResolve) {
      reconnectResolve("fast");
      reconnectResolve = null;
    }
  }
  function userInitiatedReconnect() {
    return new Promise(function(resolve) {
      if (profile !== "offline") {
        resolve(profile);
        return;
      }
      reconnectResolve = resolve;
    });
  }
  function _simulatePingResult(ok, rttMs) {
    if (ok) {
      profile = rttMs <= RTT_SLOW_THRESHOLD_MS ? "fast" : "slow";
      lastRttMs = Number(rttMs) || 0;
      consecutiveFailCount = 0;
      const newProfile = profile;
      notify(newProfile);
      if (reconnectResolve) {
        reconnectResolve(newProfile);
        reconnectResolve = null;
      }
    } else {
      if (reconnectResolve) {
        reconnectResolve("offline");
        reconnectResolve = null;
      }
    }
  }
  return {
    recordPingSuccess,
    recordPingFailure,
    recordRttSample,
    getNetworkProfile,
    getLastRttMs,
    subscribeNetworkProfile,
    userInitiatedReconnect,
    resetProfile,
    _simulatePingResult
  };
}
var lanNetworkProfile = createNetworkProfile();

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

export {
  LIVE_SYNC_SALA_DEFS,
  resolveLiveSyncRoomIdFromSala,
  liveSyncRoomLabel,
  resolveLanJoinHostUrl,
  buildTeamHash,
  buildLanJoinUrls,
  buildPermanentMobileJoinUrl,
  parseLanJoinQuery,
  parseLanInviteInput,
  isLanSalaInvitePaste,
  lanNetworkProfile,
  isAutoHostDetectPaused,
  canAttemptAutoHostDetect,
  recordAutoHostDetectMiss,
  recordAutoHostDetectSuccess,
  resumeAutoHostDetect
};
//# sourceMappingURL=/js/chunks/chunk-QSBWAKTB.js.map
