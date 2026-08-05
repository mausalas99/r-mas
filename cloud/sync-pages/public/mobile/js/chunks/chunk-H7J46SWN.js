import {
  canAttemptAutoHostDetect,
  isLanSkipShiftPin,
  pingLanHostUrl,
  recordAutoHostDetectMiss,
  recordAutoHostDetectSuccess,
  resumeAutoHostDetect
} from "/mobile/js/chunks/chunk-5TQC2RCD.js";
import {
  storage
} from "/mobile/js/chunks/chunk-JFY46RJV.js";
import {
  listRegistryDiscoveryUrls,
  upsertHost
} from "/mobile/js/chunks/chunk-TY4AHNM4.js";
import {
  listWardHostUrlsForProbe,
  listWardSubnetPrefixesForProbe,
  mergeWardHostRegistry,
  recordWardHostUrl
} from "/mobile/js/chunks/chunk-YAGCGSLT.js";
import {
  discoverLanHostsOnAllLocalSubnetsViaBeacon,
  discoverLanHostsOnSubnetViaBeacon,
  lanHostBasesSameMachine,
  normalizeLanHostBase,
  probeLanHostBeacon,
  resolveLocalLanSubnetPrefixes
} from "/mobile/js/chunks/chunk-WONKP6NU.js";
import {
  lanNetworkProfile
} from "/mobile/js/chunks/chunk-WVOQEB7T.js";
import {
  buildTeamHash,
  liveSyncRoomLabel,
  resolveLiveSyncRoomIdFromSala
} from "/mobile/js/chunks/chunk-GWKS66VB.js";

// public/js/lan-shift-pin-connect.mjs
var EXCHANGE_TIMEOUT_MS = 8e3;
var BACKOFF_STEPS_MS = [12e3, 3e4, 6e4, 12e4];
var MAX_EXTRA_WARD_PREFIXES = 3;
var _easyConnectFailCount = 0;
var _lastEasyConnectAttemptMs = 0;
var _lastShiftPinFailReason = "";
function readShiftPinClientId() {
  try {
    const id = localStorage.getItem("rpc-lan-client-id");
    if (id && String(id).trim()) return String(id).trim();
  } catch (_e) {
    void _e;
  }
  return "";
}
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
  return import("/mobile/js/chunks/transport-MTWX4U7G.js");
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
  } catch {
    return true;
  }
}
function getOwnTeamCode() {
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  return String(cfg.teamCode || "").trim();
}
function resolveAutoJoinSalaFromProfile() {
  try {
    const s = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    return String(s.clinicalSala || "").trim();
  } catch {
    return "";
  }
}
async function exchangeShiftPinOnHost(hostUrl, shiftPin) {
  const base = normalizeLanHostBase(hostUrl);
  const bypass = isLanSkipShiftPin();
  const pin = String(shiftPin || "").trim();
  if (!base) return { ok: false, reason: "bad_input" };
  if (!bypass && !/^\d{6}$/.test(pin)) return { ok: false, reason: "bad_input" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EXCHANGE_TIMEOUT_MS);
  const body = bypass && !pin ? { clientId: readShiftPinClientId() } : { shiftPin: pin, clientId: readShiftPinClientId() };
  try {
    const res = await fetch(`${base}/api/lan/v1/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    if (res.status === 401) return { ok: false, reason: bypass ? "bypass_rejected" : "invalid_pin" };
    if (!res.ok) return { ok: false, reason: "http_" + res.status };
    const data = await res.json();
    return data?.token ? { ok: true, data } : { ok: false, reason: "bad_response" };
  } catch {
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
      void _e;
    }
  }
  if (data.clientToken) {
    try {
      localStorage.setItem("rpc-lan-client-token", String(data.clientToken));
    } catch (_e) {
      void _e;
    }
  }
}
async function resolveOwnLanBaseUrl() {
  let ownUrl = "";
  if (window.electronAPI?.getLanCandidateBaseUrl) {
    try {
      ownUrl = normalizeLanHostBase(await window.electronAPI.getLanCandidateBaseUrl());
    } catch (_e) {
      void _e;
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
      const room = await import("/mobile/js/chunks/room-3Y6CTDKF.js");
      if (typeof room.joinLanRoom === "function") {
        await room.joinLanRoom(roomId, liveSyncRoomLabel(roomId));
      }
    } catch (_e) {
      void _e;
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
function registerUdpDiscoveryHost(h, add) {
  if (!h?.clientId || !h?.startedAt) return;
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
async function loadUdpDiscoveryUrls(add) {
  if (typeof window === "undefined" || !window.electronAPI?.lanUdpDiscover) return;
  try {
    const udpHosts = await window.electronAPI.lanUdpDiscover();
    if (!Array.isArray(udpHosts)) return;
    for (const h of udpHosts) registerUdpDiscoveryHost(h, add);
  } catch (_e) {
    void _e;
  }
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
  if (!out.length) await loadUdpDiscoveryUrls(add);
  const verified = [];
  for (const url of out) {
    const hit = await probeLanHostBeacon(url);
    if (hit) verified.push(hit);
  }
  return verified;
}
async function tryJoinShiftPinHosts(hostUrls, pin, opts, tried) {
  for (const hostUrl of hostUrls) {
    if (tried.has(hostUrl)) continue;
    tried.add(hostUrl);
    const ok = await joinHostAfterShiftPinExchange(hostUrl, pin, opts);
    if (ok) return true;
  }
  return false;
}
function shouldTryLoopbackShiftPin(transport) {
  if (typeof window !== "undefined" && window.electronAPI?.isLanDevPeer?.()) {
    return true;
  }
  if (transport?.isLanRemoteJoinMode?.()) return false;
  return true;
}
async function discoverExtraWardHosts(ownUrl, localPrefixes, pin, opts, tried) {
  const allPrefixes = await listWardSubnetPrefixesForProbe(ownUrl);
  const extraPrefixes = allPrefixes.filter((p) => !localPrefixes.includes(p)).slice(0, MAX_EXTRA_WARD_PREFIXES);
  for (const prefix of extraPrefixes) {
    const wardHosts = await discoverLanHostsOnSubnetViaBeacon(ownUrl, {
      subnetPrefixes: [prefix]
    });
    if (await tryJoinShiftPinHosts(wardHosts, pin, opts, tried)) return true;
  }
  return false;
}
async function tryLoopbackShiftPin(transport, pin, opts, tried) {
  if (!shouldTryLoopbackShiftPin(transport)) return false;
  const loopbackHost = normalizeLanHostBase("http://127.0.0.1:3738");
  if (!loopbackHost || tried.has(loopbackHost)) return false;
  tried.add(loopbackHost);
  return joinHostAfterShiftPinExchange(loopbackHost, pin, opts);
}
async function validateShiftPinJoinUrl(opts) {
  const joinUrl = String(opts.joinUrl || "").trim();
  if (!joinUrl) return true;
  const hashOk = await verifyTeamHashFromUrl(joinUrl, getOwnTeamCode());
  if (!hashOk) {
    showEasyToast("Este enlace es de otra sala o servicio. Verifica con el anfitri\xF3n.", "warn");
    return false;
  }
  return true;
}
async function tryShiftPinJoinSequence(transport, pin, opts, ownUrl, localPrefixes, tried) {
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  if (await tryJoinShiftPinHosts(
    collectShiftPinProbeUrls({ ...opts, localSubnetPrefixes: localPrefixes }, cfg),
    pin,
    opts,
    tried
  )) {
    return true;
  }
  if (await tryJoinShiftPinHosts(await collectShiftPinFastDiscoveryUrls(ownUrl), pin, opts, tried)) {
    return true;
  }
  if (await tryLoopbackShiftPin(transport, pin, opts, tried)) return true;
  if (await tryJoinShiftPinHosts(await discoverLanHostsOnAllLocalSubnetsViaBeacon(ownUrl), pin, opts, tried)) {
    return true;
  }
  return discoverExtraWardHosts(ownUrl, localPrefixes, pin, opts, tried);
}
async function connectLanWithShiftPin(shiftPin, opts = {}) {
  const transport = await loadLanTransport();
  if (!transport.isLanElectronDesktop()) return false;
  const bypass = isLanSkipShiftPin();
  const pin = String(shiftPin || "").trim();
  if (!bypass && !/^\d{6}$/.test(pin)) return false;
  if (!await validateShiftPinJoinUrl(opts)) return false;
  if (pin && typeof storage.saveLanShiftPin === "function") storage.saveLanShiftPin(pin);
  if (!opts.forceRediscover && await isCurrentLanHostReachable()) {
    return true;
  }
  const ownUrl = await resolveOwnLanBaseUrl();
  const localPrefixes = await resolveLocalLanSubnetPrefixes(ownUrl);
  const tried = /* @__PURE__ */ new Set();
  _lastShiftPinFailReason = "";
  return tryShiftPinJoinSequence(transport, pin, opts, ownUrl, localPrefixes, tried);
}
function easyConnectBlockedReason(opts) {
  if (!opts.force && !canAttemptAutoHostDetect()) return "paused";
  if (lanNetworkProfile.getNetworkProfile() === "offline") return "offline";
  const now = Date.now();
  if (!opts.force && !opts.skipCooldown && now - _lastEasyConnectAttemptMs < getShiftPinCooldownMs()) {
    return "cooldown";
  }
  return "";
}
function reportEasyConnectFailure(opts) {
  recordShiftPinFailure();
  if (!isLanSkipShiftPin() && !opts.force && (opts.silent || opts.skipCooldown)) {
    recordAutoHostDetectMiss();
  }
  const reason = _lastShiftPinFailReason || "not_found";
  _lastShiftPinFailReason = "";
  return { ok: false, reason };
}
function resolveEasyConnectPin(opts) {
  return String(opts.shiftPin || "").trim() || (typeof storage.getLanShiftPin === "function" ? storage.getLanShiftPin() : "");
}
function reportEasyConnectSuccess(opts) {
  resetShiftPinBackoff();
  recordAutoHostDetectSuccess();
  if (!opts.silent) {
    showEasyToast("Listo: conectado al turno.", "success");
  }
  return { ok: true, reason: "connected" };
}
async function tryEasyLanShiftPinConnect(opts = {}) {
  if (opts.force) resumeAutoHostDetect();
  const blocked = easyConnectBlockedReason(opts);
  if (blocked) return { ok: false, reason: blocked };
  _lastEasyConnectAttemptMs = Date.now();
  const pin = resolveEasyConnectPin(opts);
  if (!isLanSkipShiftPin() && !/^\d{6}$/.test(pin)) {
    return { ok: false, reason: "no_pin" };
  }
  const sala = String(opts.sala || "").trim() || resolveAutoJoinSalaFromProfile();
  const connectOpts = { ...opts, sala, forceRediscover: true };
  if (!opts.force && await isCurrentLanHostReachable()) {
    resetShiftPinBackoff();
    return { ok: true, reason: "already_live" };
  }
  if (!opts.silent) {
    showEasyToast("Buscando anfitri\xF3n del turno\u2026", "info");
  }
  const ok = await connectLanWithShiftPin(pin, connectOpts);
  if (ok) return reportEasyConnectSuccess(opts);
  return reportEasyConnectFailure(opts);
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
//# sourceMappingURL=/js/chunks/chunk-H7J46SWN.js.map
