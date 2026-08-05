// public/js/lan-host-registry-upsert-fields.mjs
function resolveOptionalBool(incoming, existing, key) {
  return incoming[key] != null ? !!incoming[key] : existing?.[key] ?? false;
}
function resolveMergedUrl(existing, record, shouldUpdateUrl) {
  return shouldUpdateUrl ? String(record.currentUrl || "") : existing.currentUrl;
}
function resolveMergedSource(existing, record, shouldUpdateUrl) {
  return shouldUpdateUrl ? record.source : existing?.source ?? "scan";
}
function buildMergedHostRegistryFields(existing, record, shouldUpdateUrl) {
  return {
    fingerprint: String(record.fingerprint),
    clientId: String(record.clientId || ""),
    startedAt: Number(record.startedAt) || 0,
    currentUrl: resolveMergedUrl(existing, record, shouldUpdateUrl),
    rank: String(record.rank || existing?.rank || ""),
    dbUnlocked: resolveOptionalBool(record, existing, "dbUnlocked"),
    shiftPinActive: resolveOptionalBool(record, existing, "shiftPinActive"),
    rttMs: Number(record.rttMs) || (existing?.rttMs ?? 0),
    lastSeenAt: Number(record.lastSeenAt) || Date.now(),
    source: resolveMergedSource(existing, record, shouldUpdateUrl)
  };
}

// public/js/lan-host-registry-upsert.mjs
var SOURCE_WEIGHT = {
  heartbeat: 5,
  mdns: 4,
  health_poll: 3,
  udp: 2,
  scan: 1
};
function shouldReplaceHostRecord(existing, incoming, incomingWeight, existingWeight) {
  if (!existing) return true;
  if (incomingWeight > existingWeight) return true;
  return incomingWeight === existingWeight && incoming.lastSeenAt >= existing.lastSeenAt;
}
function mergeHostRegistryRecord(existing, record, incomingWeight) {
  const existingWeight = existing ? SOURCE_WEIGHT[existing.source] ?? 0 : -1;
  const shouldUpdateUrl = shouldReplaceHostRecord(
    existing,
    record,
    incomingWeight,
    existingWeight
  );
  return buildMergedHostRegistryFields(existing, record, shouldUpdateUrl);
}

// public/js/lan-host-registry.mjs
var PINNED_FP_KEY = "rplus.lan.pinnedFingerprint";
var _registry = /* @__PURE__ */ new Map();
function _resetRegistryForTest() {
  _registry.clear();
}
function upsertHost(record) {
  if (!record || !record.fingerprint) return;
  const fp = String(record.fingerprint);
  const existing = _registry.get(fp);
  const incomingWeight = SOURCE_WEIGHT[record.source] ?? 0;
  _registry.set(fp, mergeHostRegistryRecord(existing, record, incomingWeight));
}
function findByFingerprint(fingerprint) {
  return _registry.get(String(fingerprint)) ?? null;
}
function findByUrl(url) {
  const normalized = String(url || "").replace(/\/+$/, "");
  for (const r of _registry.values()) {
    if (r.currentUrl.replace(/\/+$/, "") === normalized) return r;
  }
  return null;
}
function listHosts() {
  return [..._registry.values()];
}
var FAST_DISCOVERY_SOURCES = /* @__PURE__ */ new Set(["heartbeat", "mdns", "health_poll", "udp"]);
function listRegistryDiscoveryUrls(maxAgeMs = 9e4) {
  const cutoff = Date.now() - maxAgeMs;
  return listHosts().filter(
    (r) => r.currentUrl && FAST_DISCOVERY_SOURCES.has(r.source) && Number(r.lastSeenAt) >= cutoff
  ).sort((a, b) => (SOURCE_WEIGHT[b.source] || 0) - (SOURCE_WEIGHT[a.source] || 0)).map((r) => String(r.currentUrl).replace(/\/+$/, ""));
}
function evictStale(maxAgeMs = 9e4) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [fp, r] of _registry) {
    if (r.lastSeenAt < cutoff) _registry.delete(fp);
  }
}
function getPinnedFingerprint() {
  try {
    return String(localStorage.getItem(PINNED_FP_KEY) || "").trim();
  } catch {
    return "";
  }
}
function setPinnedFingerprint(fp) {
  try {
    if (!fp) {
      localStorage.removeItem(PINNED_FP_KEY);
      return;
    }
    localStorage.setItem(PINNED_FP_KEY, String(fp));
  } catch {
  }
}
function clearPinnedFingerprint() {
  try {
    localStorage.removeItem(PINNED_FP_KEY);
  } catch {
  }
}
function _migrateFromLegacyPinnedUrl() {
  try {
    if (getPinnedFingerprint()) return;
    const legacyUrl = String(localStorage.getItem("rpc-lan-pinned-host-url") || "").trim().replace(/\/+$/, "");
    if (!legacyUrl) return;
    const provisionalFp = `legacy:${legacyUrl}`;
    upsertHost({
      fingerprint: provisionalFp,
      clientId: "legacy",
      startedAt: 0,
      currentUrl: legacyUrl,
      rank: "",
      dbUnlocked: false,
      shiftPinActive: false,
      rttMs: 0,
      lastSeenAt: Date.now(),
      source: "scan"
    });
    setPinnedFingerprint(provisionalFp);
  } catch {
  }
}
_migrateFromLegacyPinnedUrl();

export {
  _resetRegistryForTest,
  upsertHost,
  findByFingerprint,
  findByUrl,
  listHosts,
  listRegistryDiscoveryUrls,
  evictStale,
  getPinnedFingerprint,
  setPinnedFingerprint,
  clearPinnedFingerprint
};
//# sourceMappingURL=/js/chunks/chunk-TY4AHNM4.js.map
