import {
  buildTeamHash,
  canAttemptAutoHostDetect,
  lanNetworkProfile,
  liveSyncRoomLabel,
  recordAutoHostDetectMiss,
  recordAutoHostDetectSuccess,
  resolveLiveSyncRoomIdFromSala,
  resumeAutoHostDetect
} from "/js/chunks/chunk-GPPD4VPS.js";
import {
  listWardHostUrlsForProbe,
  listWardSubnetPrefixesForProbe,
  mergeWardHostRegistry,
  recordWardHostUrl
} from "/js/chunks/chunk-AOR2DWAW.js";
import {
  discoverLanHostsOnAllLocalSubnetsViaBeacon,
  discoverLanHostsOnSubnetViaBeacon,
  lanHostBasesSameMachine,
  normalizeLanHostBase,
  pingLanHostUrl,
  probeLanHostBeacon,
  resolveLocalLanSubnetPrefixes
} from "/js/chunks/chunk-EXMEBP6A.js";
import {
  storage
} from "/js/chunks/chunk-2TZHN5MF.js";
import {
  listRegistryDiscoveryUrls,
  upsertHost
} from "/js/chunks/chunk-VQ3KZLKM.js";

// public/js/lan-shift-pin-connect.mjs
var EXCHANGE_TIMEOUT_MS = 8e3;
var BACKOFF_STEPS_MS = [12e3, 3e4, 6e4, 12e4];
var MAX_EXTRA_WARD_PREFIXES = 3;
var _easyConnectFailCount = 0;
var _lastEasyConnectAttemptMs = 0;
var _lastShiftPinFailReason = "";
function getShiftPinCooldownMs() {
  return BACKOFF_STEPS_MS[Math.min(_easyConnectFailCount, BACKOFF_STEPS_MS.length - 1)];
}
function recordShiftPinFailure() {
  _easyConnectFailCount = Math.min(_easyConnectFailCount + 1, BACKOFF_STEPS_MS.length - 1);
}
function resetShiftPinBackoff() {
  _easyConnectFailCount = 0;
  _lastEasyConnectAttemptMs = 0;
}
function loadLanTransport() {
  return import("/js/chunks/transport-UTZGQ5HY.js");
}
function showEasyToast(message, kind) {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(message, kind);
  }
}
async function verifyTeamHashFromUrl(joinUrl, ownTeamCode) {
  try {
    const urlTh = new URL(joinUrl).searchParams.get("th");
    if (!urlTh) return true;
    const expectedTh = await buildTeamHash(ownTeamCode);
    return !expectedTh || urlTh === expectedTh;
  } catch (_e) {
    return true;
  }
}
function getOwnTeamCode() {
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  return String(cfg.teamCode || "").trim();
}
async function exchangeShiftPinOnHost(hostUrl, shiftPin) {
  const base = normalizeLanHostBase(hostUrl);
  const pin = String(shiftPin || "").trim();
  if (!base || !/^\d{6}$/.test(pin)) return { ok: false, reason: "bad_input" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EXCHANGE_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/api/lan/v1/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftPin: pin }),
      signal: ctrl.signal
    });
    if (res.status === 401) return { ok: false, reason: "invalid_pin" };
    if (!res.ok) return { ok: false, reason: "http_" + res.status };
    const data = await res.json();
    return data?.token ? { ok: true, data } : { ok: false, reason: "bad_response" };
  } catch (_e) {
    return { ok: false, reason: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
async function persistShiftPinBearer(data) {
  if (!data?.token) return;
  if (window.electronAPI && typeof window.electronAPI.lanGuestWriteBearer === "function") {
    try {
      await window.electronAPI.lanGuestWriteBearer({ token: String(data.token).trim() });
    } catch (_e) {
    }
  }
}
async function resolveOwnLanBaseUrl() {
  let ownUrl = "";
  if (window.electronAPI?.getLanCandidateBaseUrl) {
    try {
      ownUrl = normalizeLanHostBase(await window.electronAPI.getLanCandidateBaseUrl());
    } catch (_e) {
    }
  }
  if (!ownUrl) {
    const transport = await loadLanTransport();
    ownUrl = normalizeLanHostBase(await transport.resolveLanShareBaseUrl());
  }
  return ownUrl;
}
async function isCurrentLanHostReachable() {
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  const url = normalizeLanHostBase(cfg.hostUrl);
  const code = String(cfg.teamCode || "").trim();
  if (!url || code.length < 32) return false;
  return pingLanHostUrl(url, code);
}
async function joinHostAfterShiftPinExchange(hostUrl, shiftPin, opts) {
  const ex = await exchangeShiftPinOnHost(hostUrl, shiftPin);
  if (!ex.ok) {
    _lastShiftPinFailReason = ex.reason || "not_found";
    return false;
  }
  const data = ex.data;
  await persistShiftPinBearer(data);
  const transport = await loadLanTransport();
  const joined = await transport.joinRemoteLanHostAsClient(
    String(data.hostUrl || hostUrl),
    data.token,
    { requireConfirm: false, toastLabel: "" }
  );
  if (!joined) return false;
  const resolvedUrl = normalizeLanHostBase(String(data.hostUrl || hostUrl));
  if (resolvedUrl) {
    recordWardHostUrl(resolvedUrl, { source: "client" });
  }
  if (data.wardHostHints) {
    mergeWardHostRegistry(data.wardHostHints);
  }
  const roomId = String(opts.roomId || "").trim() || resolveLiveSyncRoomIdFromSala(opts.sala) || "";
  if (roomId) {
    try {
      const room = await import("/js/chunks/room-GM3FTSCE.js");
      if (typeof room.joinLanRoom === "function") {
        await room.joinLanRoom(roomId, liveSyncRoomLabel(roomId));
      }
    } catch (_eRoom) {
    }
  }
  _lastShiftPinFailReason = "";
  return true;
}
function collectShiftPinProbeUrls(opts = {}, cfg = {}) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const add = (raw) => {
    const u = normalizeLanHostBase(raw);
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  add(opts.hostUrl);
  add(cfg.hostUrl);
  const localPrefixes = Array.isArray(opts.localSubnetPrefixes) ? opts.localSubnetPrefixes : null;
  for (const u of listWardHostUrlsForProbe(void 0, { localSubnetPrefixes: localPrefixes })) {
    add(u);
  }
  return out;
}
async function collectShiftPinFastDiscoveryUrls(ownBaseUrl) {
  const own = normalizeLanHostBase(ownBaseUrl);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const add = (raw) => {
    const u = normalizeLanHostBase(raw);
    if (!u || seen.has(u)) return;
    if (own && (u === own || lanHostBasesSameMachine(u, own))) return;
    seen.add(u);
    out.push(u);
  };
  for (const u of listRegistryDiscoveryUrls()) add(u);
  if (!out.length && typeof window !== "undefined" && window.electronAPI?.lanUdpDiscover) {
    try {
      const udpHosts = await window.electronAPI.lanUdpDiscover();
      if (Array.isArray(udpHosts)) {
        for (const h of udpHosts) {
          if (!h?.clientId || !h?.startedAt) continue;
          upsertHost({
            fingerprint: `${h.clientId}:${h.startedAt}`,
            clientId: h.clientId,
            startedAt: h.startedAt,
            currentUrl: h.url,
            rank: h.rank || "",
            dbUnlocked: false,
            shiftPinActive: false,
            rttMs: 0,
            lastSeenAt: Date.now(),
            source: "udp"
          });
          add(h.url);
        }
      }
    } catch (_e) {
    }
  }
  const verified = [];
  for (const url of out) {
    const hit = await probeLanHostBeacon(url);
    if (hit) verified.push(hit);
  }
  return verified;
}
function shouldTryLoopbackShiftPin(transport) {
  if (typeof window !== "undefined" && window.electronAPI?.isLanDevPeer?.()) {
    return true;
  }
  if (transport?.isLanRemoteJoinMode?.()) return false;
  return true;
}
async function connectLanWithShiftPin(shiftPin, opts = {}) {
  const transport = await loadLanTransport();
  if (!transport.isLanElectronDesktop()) return false;
  const pin = String(shiftPin || "").trim();
  if (!/^\d{6}$/.test(pin)) return false;
  const joinUrl = String(opts.joinUrl || "").trim();
  if (joinUrl) {
    const hashOk = await verifyTeamHashFromUrl(joinUrl, getOwnTeamCode());
    if (!hashOk) {
      showEasyToast("Este enlace es de otra sala o servicio. Verifica con el anfitri\xF3n.", "warn");
      return false;
    }
  }
  if (typeof storage.saveLanShiftPin === "function") storage.saveLanShiftPin(pin);
  if (!opts.forceRediscover && await isCurrentLanHostReachable()) {
    return true;
  }
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  const ownUrl = await resolveOwnLanBaseUrl();
  const localPrefixes = await resolveLocalLanSubnetPrefixes(ownUrl);
  const tried = /* @__PURE__ */ new Set();
  _lastShiftPinFailReason = "";
  for (const hostUrl of collectShiftPinProbeUrls(
    { ...opts, localSubnetPrefixes: localPrefixes },
    cfg
  )) {
    tried.add(hostUrl);
    const ok = await joinHostAfterShiftPinExchange(hostUrl, pin, opts);
    if (ok) return true;
  }
  for (const hostUrl of await collectShiftPinFastDiscoveryUrls(ownUrl)) {
    if (tried.has(hostUrl)) continue;
    tried.add(hostUrl);
    const ok = await joinHostAfterShiftPinExchange(hostUrl, pin, opts);
    if (ok) return true;
  }
  if (shouldTryLoopbackShiftPin(transport)) {
    const loopbackHost = normalizeLanHostBase("http://127.0.0.1:3738");
    if (loopbackHost && !tried.has(loopbackHost)) {
      tried.add(loopbackHost);
      const viaLoopback = await joinHostAfterShiftPinExchange(loopbackHost, pin, opts);
      if (viaLoopback) return true;
    }
  }
  const hosts = await discoverLanHostsOnAllLocalSubnetsViaBeacon(ownUrl);
  for (const hostUrl of hosts) {
    if (tried.has(hostUrl)) continue;
    tried.add(hostUrl);
    const ok = await joinHostAfterShiftPinExchange(hostUrl, pin, opts);
    if (ok) return true;
  }
  const allPrefixes = await listWardSubnetPrefixesForProbe(ownUrl);
  const extraPrefixes = allPrefixes.filter((p) => !localPrefixes.includes(p)).slice(0, MAX_EXTRA_WARD_PREFIXES);
  for (const prefix of extraPrefixes) {
    const wardHosts = await discoverLanHostsOnSubnetViaBeacon(ownUrl, {
      subnetPrefixes: [prefix]
    });
    for (const hostUrl of wardHosts) {
      if (tried.has(hostUrl)) continue;
      tried.add(hostUrl);
      const ok = await joinHostAfterShiftPinExchange(hostUrl, pin, opts);
      if (ok) return true;
    }
  }
  return false;
}
async function tryEasyLanShiftPinConnect(opts = {}) {
  if (opts.force) {
    resumeAutoHostDetect();
  }
  if (!opts.force && !canAttemptAutoHostDetect()) {
    return { ok: false, reason: "paused" };
  }
  if (lanNetworkProfile.getNetworkProfile() === "offline") {
    return { ok: false, reason: "offline" };
  }
  const now = Date.now();
  if (!opts.force && !opts.skipCooldown && now - _lastEasyConnectAttemptMs < getShiftPinCooldownMs()) {
    return { ok: false, reason: "cooldown" };
  }
  _lastEasyConnectAttemptMs = now;
  const pin = String(opts.shiftPin || "").trim() || (typeof storage.getLanShiftPin === "function" ? storage.getLanShiftPin() : "");
  if (!/^\d{6}$/.test(pin)) {
    return { ok: false, reason: "no_pin" };
  }
  if (!opts.force && await isCurrentLanHostReachable()) {
    resetShiftPinBackoff();
    return { ok: true, reason: "already_live" };
  }
  if (!opts.silent) {
    showEasyToast("Buscando anfitri\xF3n del turno\u2026", "info");
  }
  const ok = await connectLanWithShiftPin(pin, { ...opts, forceRediscover: true });
  if (ok) {
    resetShiftPinBackoff();
    recordAutoHostDetectSuccess();
    if (!opts.silent) {
      showEasyToast("Listo: conectado al turno.", "success");
    }
    return { ok: true, reason: "connected" };
  }
  recordShiftPinFailure();
  if (!opts.force && (opts.silent || opts.skipCooldown)) {
    recordAutoHostDetectMiss();
  }
  const reason = _lastShiftPinFailReason || "not_found";
  _lastShiftPinFailReason = "";
  return { ok: false, reason };
}
async function rediscoverLanHostWithShiftPin(opts = {}) {
  const result = await tryEasyLanShiftPinConnect({ ...opts, force: true, silent: opts.silent });
  return result.ok;
}

export {
  getShiftPinCooldownMs,
  recordShiftPinFailure,
  resetShiftPinBackoff,
  collectShiftPinProbeUrls,
  collectShiftPinFastDiscoveryUrls,
  connectLanWithShiftPin,
  tryEasyLanShiftPinConnect,
  rediscoverLanHostWithShiftPin
};
//# sourceMappingURL=/js/chunks/chunk-5JTZWKGL.js.map
