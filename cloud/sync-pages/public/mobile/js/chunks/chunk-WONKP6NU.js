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
  } catch {
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
  } catch {
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
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
async function readSubnetPrefixesFromIpc() {
  if (typeof window === "undefined" || !window.electronAPI?.getLanSubnetPrefixes) return [];
  try {
    const fromIpc = await window.electronAPI.getLanSubnetPrefixes();
    if (!Array.isArray(fromIpc) || !fromIpc.length) return [];
    return fromIpc.map((p) => String(p || "").trim()).filter((p) => /^\d+\.\d+\.\d+$/.test(p));
  } catch (_e) {
    void _e;
    return [];
  }
}
async function resolveSeedHostFromElectron() {
  if (typeof window === "undefined" || !window.electronAPI?.getLanCandidateBaseUrl) return "";
  try {
    const fromElectron = normalizeLanHostBase(await window.electronAPI.getLanCandidateBaseUrl());
    const h = hostIpv4FromBase(fromElectron);
    return h && !isLoopbackHostname(h) ? h : "";
  } catch (_e) {
    void _e;
    return "";
  }
}
async function scanPrefixesForHosts(prefixes, skip, own, probeFn) {
  const found = /* @__PURE__ */ new Set();
  for (const prefix of prefixes) {
    if (found.size >= MAX_FOUND) break;
    const hosts = orderedSubnetHosts(prefix, skip);
    for (let i = 0; i < hosts.length && found.size < MAX_FOUND; i += PROBE_CONCURRENCY) {
      const batch = hosts.slice(i, i + PROBE_CONCURRENCY);
      const bases = batch.map((host) => `http://${host}:${DEFAULT_PORT}`);
      const probes = await Promise.all(bases.map((base) => probeFn(base)));
      for (const url of probes) {
        if (!url || own && (url === own || lanHostBasesSameMachine(url, own))) continue;
        found.add(url);
        if (found.size >= MAX_FOUND) break;
      }
    }
  }
  return [...found].sort();
}
async function resolveLocalLanSubnetPrefixes(ownBaseUrl) {
  const fromIpc = await readSubnetPrefixesFromIpc();
  if (fromIpc.length) return fromIpc;
  const own = normalizeLanHostBase(ownBaseUrl);
  let seedHost = hostIpv4FromBase(own);
  if (!seedHost || isLoopbackHostname(seedHost)) {
    seedHost = await resolveSeedHostFromElectron() || seedHost;
  }
  if (!seedHost && own) seedHost = hostIpv4FromBase(own);
  const prefix = subnetPrefixFromIpv4(seedHost);
  if (!prefix || !isPrivateIpv4(seedHost)) return [];
  return [prefix];
}
function resolveDiscoverySkipHost(own, prefixes) {
  let seedHost = hostIpv4FromBase(own);
  if (!seedHost || isLoopbackHostname(seedHost)) {
    for (const prefix of prefixes) {
      const probe = `${prefix}.1`;
      if (isPrivateIpv4(probe)) return probe;
    }
  }
  return seedHost && !isLoopbackHostname(seedHost) ? seedHost : "";
}
async function discoverLanHostsOnSubnetViaBeacon(ownBaseUrl, opts = {}) {
  const own = normalizeLanHostBase(ownBaseUrl);
  const prefixes = Array.isArray(opts.subnetPrefixes) && opts.subnetPrefixes.length ? opts.subnetPrefixes : await resolveLocalLanSubnetPrefixes(own);
  if (!prefixes.length) return [];
  const skip = resolveDiscoverySkipHost(own, prefixes);
  return scanPrefixesForHosts(prefixes, skip, own, probeLanHostBeacon);
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
  if (!seedHost || isLoopbackHostname(seedHost)) {
    seedHost = await resolveSeedHostFromElectron() || seedHost;
  }
  if (!seedHost && own) seedHost = hostIpv4FromBase(own);
  const skip = seedHost && !isLoopbackHostname(seedHost) ? seedHost : "";
  return scanPrefixesForHosts(prefixes, skip, own, (base) => probeLanHostBase(base, code));
}
async function discoverLanHostsOnAllLocalSubnets(teamCode, ownBaseUrl) {
  return discoverLanHostsOnSubnet(teamCode, ownBaseUrl);
}

export {
  subnetPrefixFromIpv4,
  normalizeLanHostBase,
  isHostOnCurrentSubnets,
  hostIpv4FromBase,
  lanHostBasesSameMachine,
  probeLanHostBase,
  probeLanHostBeacon,
  resolveLocalLanSubnetPrefixes,
  discoverLanHostsOnSubnetViaBeacon,
  discoverLanHostsOnAllLocalSubnetsViaBeacon,
  discoverLanHostsOnSubnet,
  discoverLanHostsOnAllLocalSubnets
};
//# sourceMappingURL=/js/chunks/chunk-WONKP6NU.js.map
