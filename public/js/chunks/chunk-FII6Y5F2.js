import {
  upsertHost
} from "/js/chunks/chunk-VQ3KZLKM.js";

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
  }
}
function getPrimaryHostUrl() {
  try {
    return String(localStorage.getItem(PRIMARY_HOST_KEY) || "").trim().replace(/\/+$/, "");
  } catch (_e) {
    return "";
  }
}
function readPeersRaw() {
  try {
    const raw = localStorage.getItem(PEERS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch (_e) {
    return {};
  }
}
function writePeersRaw(map) {
  try {
    localStorage.setItem(PEERS_KEY, JSON.stringify(map || {}));
  } catch (_e) {
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
  } catch (_e) {
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
  } catch (_e) {
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
  }
}
function clearSurrogateHostState() {
  try {
    localStorage.removeItem(SURROGATE_KEY);
  } catch (_e) {
  }
}
function isSurrogateHostActive() {
  return !!getSurrogateHostState();
}

// public/interno/host-discovery.mjs
function isLoopbackHostname(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "::1";
}
function isPrivateIpv4(hostname) {
  const h = String(hostname || "").split(":")[0];
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!m) return false;
  const a = +m[1];
  const b = +m[2];
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}
function subnetPrefixFromIpv4(ip) {
  const s = String(ip || "");
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(s)) return "";
  return s.split(".").slice(0, 3).join(".");
}
function orderedSubnetHosts(prefix, skipHost = "") {
  const skip = String(skipHost || "");
  const order = [];
  const seen = /* @__PURE__ */ new Set();
  const add = (n) => {
    const host = `${prefix}.${n}`;
    if (host === skip || seen.has(host)) return;
    seen.add(host);
    order.push(host);
  };
  add(1);
  add(254);
  for (let i = 2; i <= 50; i += 1) add(i);
  for (let i = 100; i <= 200; i += 1) add(i);
  for (let i = 51; i <= 99; i += 1) add(i);
  for (let i = 201; i <= 253; i += 1) add(i);
  return order;
}

// public/js/lan-host-subnet-discovery.mjs
var LAN_BEACON_PATH = "/api/lan/v1/beacon";
var LAN_PING_PATH = "/api/lan/v1/ping";
var PROBE_TIMEOUT_MS = 500;
var PROBE_CONCURRENCY = 6;
var MAX_FOUND = 4;
var DEFAULT_PORT = "3738";
function normalizeLanHostBase(raw) {
  const s = String(raw || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `http://${s}`;
}
function isHostOnCurrentSubnets(hostUrl, prefixes) {
  const host = hostIpv4FromBase(hostUrl);
  if (!host || !Array.isArray(prefixes) || !prefixes.length) return false;
  const prefix = subnetPrefixFromIpv4(host);
  return !!prefix && prefixes.includes(prefix);
}
function hostIpv4FromBase(base) {
  try {
    return new URL(normalizeLanHostBase(base)).hostname;
  } catch (_e) {
    return "";
  }
}
function lanHostBasesSameMachine(a, b) {
  const ha = hostIpv4FromBase(a);
  const hb = hostIpv4FromBase(b);
  if (!ha || !hb) return false;
  if (ha === hb) return true;
  const loop = (h) => isLoopbackHostname(h);
  return loop(ha) && loop(hb);
}
async function probeLanHostBase(base, teamCode, signal) {
  const normalized = normalizeLanHostBase(base);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      return null;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    const code = String(teamCode || "").trim();
    if (!normalized || !code) return null;
    const ok = await pingLanHostUrl(normalized, code);
    if (!ok) return null;
    const res = await fetch(`${normalized}${LAN_PING_PATH}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${code}` },
      cache: "no-store",
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.lan !== true) return null;
    return normalized;
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
async function probeLanHostBeacon(base, signal) {
  const normalized = normalizeLanHostBase(base);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      return null;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    if (!normalized) return null;
    const res = await fetch(`${normalized}${LAN_BEACON_PATH}`, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.lan !== true) return null;
    return normalized;
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
async function resolveLocalLanSubnetPrefixes(ownBaseUrl) {
  if (typeof window !== "undefined" && window.electronAPI?.getLanSubnetPrefixes) {
    try {
      const fromIpc = await window.electronAPI.getLanSubnetPrefixes();
      if (Array.isArray(fromIpc) && fromIpc.length) {
        return fromIpc.map((p) => String(p || "").trim()).filter((p) => /^\d+\.\d+\.\d+$/.test(p));
      }
    } catch (_e) {
    }
  }
  const own = normalizeLanHostBase(ownBaseUrl);
  let seedHost = hostIpv4FromBase(own);
  if ((!seedHost || isLoopbackHostname(seedHost)) && typeof window !== "undefined") {
    if (window.electronAPI?.getLanCandidateBaseUrl) {
      try {
        const fromElectron = normalizeLanHostBase(await window.electronAPI.getLanCandidateBaseUrl());
        const h = hostIpv4FromBase(fromElectron);
        if (h && !isLoopbackHostname(h)) seedHost = h;
      } catch (_e2) {
      }
    }
  }
  if (!seedHost && own) seedHost = hostIpv4FromBase(own);
  const prefix = subnetPrefixFromIpv4(seedHost);
  if (!prefix || !isPrivateIpv4(seedHost)) return [];
  return [prefix];
}
async function discoverLanHostsOnSubnetViaBeacon(ownBaseUrl, opts = {}) {
  const own = normalizeLanHostBase(ownBaseUrl);
  const prefixes = Array.isArray(opts.subnetPrefixes) && opts.subnetPrefixes.length ? opts.subnetPrefixes : await resolveLocalLanSubnetPrefixes(own);
  if (!prefixes.length) return [];
  let seedHost = hostIpv4FromBase(own);
  if (!seedHost || isLoopbackHostname(seedHost)) {
    for (const prefix of prefixes) {
      const probe = `${prefix}.1`;
      if (isPrivateIpv4(probe)) {
        seedHost = probe;
        break;
      }
    }
  }
  const skip = seedHost && !isLoopbackHostname(seedHost) ? seedHost : "";
  const found = /* @__PURE__ */ new Set();
  for (const prefix of prefixes) {
    if (found.size >= MAX_FOUND) break;
    const hosts = orderedSubnetHosts(prefix, skip);
    for (let i = 0; i < hosts.length && found.size < MAX_FOUND; i += PROBE_CONCURRENCY) {
      const batch = hosts.slice(i, i + PROBE_CONCURRENCY);
      const bases = batch.map((host) => `http://${host}:${DEFAULT_PORT}`);
      const probes = await Promise.all(bases.map((base) => probeLanHostBeacon(base)));
      for (const url of probes) {
        if (!url || own && (url === own || lanHostBasesSameMachine(url, own))) continue;
        found.add(url);
        if (found.size >= MAX_FOUND) break;
      }
    }
  }
  return [...found].sort();
}
async function discoverLanHostsOnAllLocalSubnetsViaBeacon(ownBaseUrl) {
  const prefixes = await resolveLocalLanSubnetPrefixes(ownBaseUrl);
  return discoverLanHostsOnSubnetViaBeacon(ownBaseUrl, { subnetPrefixes: prefixes });
}
async function discoverLanHostsOnSubnet(teamCode, ownBaseUrl, opts = {}) {
  const own = normalizeLanHostBase(ownBaseUrl);
  const code = String(teamCode || "").trim();
  if (!code) return [];
  const prefixes = Array.isArray(opts.subnetPrefixes) && opts.subnetPrefixes.length ? opts.subnetPrefixes : await resolveLocalLanSubnetPrefixes(own);
  if (!prefixes.length) return [];
  let seedHost = hostIpv4FromBase(own);
  if ((!seedHost || isLoopbackHostname(seedHost)) && typeof window !== "undefined") {
    if (window.electronAPI && typeof window.electronAPI.getLanCandidateBaseUrl === "function") {
      try {
        const fromElectron = normalizeLanHostBase(await window.electronAPI.getLanCandidateBaseUrl());
        const h = hostIpv4FromBase(fromElectron);
        if (h && !isLoopbackHostname(h)) seedHost = h;
      } catch (_e) {
      }
    }
  }
  if (!seedHost && own) seedHost = hostIpv4FromBase(own);
  const skip = seedHost && !isLoopbackHostname(seedHost) ? seedHost : "";
  const found = /* @__PURE__ */ new Set();
  for (const prefix of prefixes) {
    if (found.size >= MAX_FOUND) break;
    const hosts = orderedSubnetHosts(prefix, skip);
    for (let i = 0; i < hosts.length && found.size < MAX_FOUND; i += PROBE_CONCURRENCY) {
      const batch = hosts.slice(i, i + PROBE_CONCURRENCY);
      const bases = batch.map((host) => `http://${host}:${DEFAULT_PORT}`);
      const probes = await Promise.all(bases.map((base) => probeLanHostBase(base, code)));
      for (const url of probes) {
        if (!url || own && (url === own || lanHostBasesSameMachine(url, own))) continue;
        found.add(url);
        if (found.size >= MAX_FOUND) break;
      }
    }
  }
  return [...found].sort();
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
  normalizeLanHostBase,
  isHostOnCurrentSubnets,
  lanHostBasesSameMachine,
  resolveLocalLanSubnetPrefixes,
  discoverLanHostsOnSubnetViaBeacon,
  discoverLanHostsOnAllLocalSubnetsViaBeacon,
  discoverLanHostsOnSubnet
};
//# sourceMappingURL=/js/chunks/chunk-FII6Y5F2.js.map
