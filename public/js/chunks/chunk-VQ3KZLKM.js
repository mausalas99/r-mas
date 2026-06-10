// public/js/lan-host-registry.mjs
var PINNED_FP_KEY = "rplus.lan.pinnedFingerprint";
var _registry = /* @__PURE__ */ new Map();
var SOURCE_WEIGHT = {
  heartbeat: 5,
  mdns: 4,
  health_poll: 3,
  udp: 2,
  scan: 1
};
function _resetRegistryForTest() {
  _registry.clear();
}
function upsertHost(record) {
  if (!record || !record.fingerprint) return;
  const fp = String(record.fingerprint);
  const existing = _registry.get(fp);
  const incomingWeight = SOURCE_WEIGHT[record.source] ?? 0;
  const existingWeight = existing ? SOURCE_WEIGHT[existing.source] ?? 0 : -1;
  const shouldUpdateUrl = !existing || incomingWeight > existingWeight || incomingWeight === existingWeight && record.lastSeenAt >= existing.lastSeenAt;
  _registry.set(fp, {
    fingerprint: fp,
    clientId: String(record.clientId || ""),
    startedAt: Number(record.startedAt) || 0,
    currentUrl: shouldUpdateUrl ? String(record.currentUrl || "") : existing.currentUrl,
    rank: String(record.rank || existing?.rank || ""),
    dbUnlocked: record.dbUnlocked != null ? !!record.dbUnlocked : existing?.dbUnlocked ?? false,
    shiftPinActive: record.shiftPinActive != null ? !!record.shiftPinActive : existing?.shiftPinActive ?? false,
    rttMs: Number(record.rttMs) || (existing?.rttMs ?? 0),
    lastSeenAt: Number(record.lastSeenAt) || Date.now(),
    source: shouldUpdateUrl ? record.source : existing?.source ?? "scan"
  });
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
  } catch (_e) {
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
  } catch (_e) {
  }
}
function clearPinnedFingerprint() {
  try {
    localStorage.removeItem(PINNED_FP_KEY);
  } catch (_e) {
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
  } catch (_e) {
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
//# sourceMappingURL=/js/chunks/chunk-VQ3KZLKM.js.map
