import {
  agendaEntityKey,
  todoEntityKey
} from "/mobile/js/chunks/chunk-H45VYIPQ.js";
import {
  activeLiveSyncRoomId,
  getLanClientId,
  getLastDeltaSeq,
  getLiveSyncRevisionReconcileTimer,
  lanClient,
  setActiveLiveSyncRoom,
  setLastDeltaSeq,
  setLiveSyncRevisionReconcileTimer
} from "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import {
  getRoomMembership
} from "/mobile/js/chunks/chunk-WZAOH7W5.js";

// public/js/features/lan/lan-sync-bridge-globals.mjs
function createLanSyncBridgeGlobal(key) {
  return {
    get() {
      return globalThis[key];
    },
    set(value) {
      globalThis[key] = value;
    }
  };
}
var LAN_SYNC_PUSH_BRIDGE_KEY = "__LAN_SYNC_PUSH_BRIDGE__";
var LAN_SYNC_ROOM_BRIDGE_KEY = "__LAN_SYNC_ROOM_BRIDGE__";
var LAN_SYNC_TRANSPORT_DEPS_KEY = "__LAN_SYNC_TRANSPORT_DEPS__";
var pushBridgeGlobal = createLanSyncBridgeGlobal(LAN_SYNC_PUSH_BRIDGE_KEY);
var roomBridgeGlobal = createLanSyncBridgeGlobal(LAN_SYNC_ROOM_BRIDGE_KEY);
var transportDepsGlobal = createLanSyncBridgeGlobal(LAN_SYNC_TRANSPORT_DEPS_KEY);
var lanSyncPushBridgeGlobal = pushBridgeGlobal.get;
var setLanSyncPushBridgeGlobal = pushBridgeGlobal.set;
var lanSyncRoomBridgeGlobal = roomBridgeGlobal.get;
var setLanSyncRoomBridgeGlobal = roomBridgeGlobal.set;
var lanSyncTransportDepsGlobal = transportDepsGlobal.get;
var setLanSyncTransportDepsGlobal = transportDepsGlobal.set;

// public/js/features/lan/push-bridge.mjs
var pushBridge = null;
var pushBridgeWirePromise = null;
function registerLanSyncPushBridge(deps) {
  pushBridge = deps && typeof deps === "object" ? deps : null;
  if (pushBridge && typeof globalThis !== "undefined") {
    setLanSyncPushBridgeGlobal(pushBridge);
  }
}
function ensureLanSyncPushBridgeWired() {
  if (pushBridge) return Promise.resolve();
  if (typeof globalThis !== "undefined") {
    var cached = lanSyncPushBridgeGlobal();
    if (cached && typeof cached === "object") {
      pushBridge = cached;
      return Promise.resolve();
    }
  }
  if (!pushBridgeWirePromise) {
    pushBridgeWirePromise = import("/mobile/js/chunks/orchestrator-SRX6Q4RW.js").then(function() {
      if (!pushBridge && typeof globalThis !== "undefined") {
        var g = lanSyncPushBridgeGlobal();
        if (g && typeof g === "object") pushBridge = g;
      }
    });
  }
  return pushBridgeWirePromise;
}
function bridge() {
  if (!pushBridge && typeof globalThis !== "undefined") {
    var cached = lanSyncPushBridgeGlobal();
    if (cached && typeof cached === "object") pushBridge = cached;
  }
  if (!pushBridge) {
    throw new Error("lan-sync-push: registerLanSyncPushBridge() not called");
  }
  return pushBridge;
}

// public/js/host-bundle-bases-keys.mjs
function collectAgendaKeys(envelope, keys) {
  const agenda = Array.isArray(envelope.agenda) ? envelope.agenda : [];
  for (const ev of agenda) {
    if (ev && ev.id) keys.add(agendaEntityKey(ev.id));
  }
}
function collectTodoKeys(envelope, keys) {
  const todos = envelope.todos && typeof envelope.todos === "object" ? envelope.todos : {};
  for (const pid of Object.keys(todos)) {
    const arr = Array.isArray(todos[pid]) ? todos[pid] : [];
    for (const t of arr) {
      if (t && t.id) keys.add(todoEntityKey(pid, t.id));
    }
  }
}
function collectMiscKeys(envelope, keys) {
  if (envelope.manejo && typeof envelope.manejo === "object") keys.add("manejo");
  if (envelope.clinicalOps && typeof envelope.clinicalOps === "object") keys.add("clinicalOps");
  if (Array.isArray(envelope.labPanelOverlay) && envelope.labPanelOverlay.length) {
    keys.add("labPanelOverlay");
  }
}
function collectKeysFromEnvelope(envelope) {
  const keys = /* @__PURE__ */ new Set();
  if (!envelope || typeof envelope !== "object") return keys;
  collectAgendaKeys(envelope, keys);
  collectTodoKeys(envelope, keys);
  collectMiscKeys(envelope, keys);
  return keys;
}

// public/js/host-bundle-bases.mjs
var BASES_KEY = "rpc-lan-host-bundle-bases";
function readAll() {
  try {
    const raw = localStorage.getItem(BASES_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
function writeAll(map) {
  localStorage.setItem(BASES_KEY, JSON.stringify(map));
}
function getHostBundleBases(roomId) {
  const rid = String(roomId || "").trim();
  if (!rid) return { revision: 0, entityVersions: {} };
  const row = readAll()[rid];
  if (!row || typeof row !== "object") return { revision: 0, entityVersions: {} };
  return {
    revision: Number(row.revision || 0),
    entityVersions: row.entityVersions && typeof row.entityVersions === "object" ? row.entityVersions : {}
  };
}
function setHostBundleBases(roomId, bundle) {
  const rid = String(roomId || "").trim();
  if (!rid || !bundle) return;
  const all = readAll();
  all[rid] = {
    revision: Number(bundle.revision || 0),
    entityVersions: bundle.entityVersions && typeof bundle.entityVersions === "object" ? bundle.entityVersions : {}
  };
  writeAll(all);
}
function buildBaseEntityVersionsForEnvelope(envelope, serverEntityVersions) {
  const versions = serverEntityVersions || {};
  const baseEntityVersions = {};
  for (const key of collectKeysFromEnvelope(envelope)) {
    baseEntityVersions[key] = versions[key] != null ? Number(versions[key]) : 0;
  }
  return baseEntityVersions;
}
function hostBundlePutBodyFromEnvelope(roomId, envelope) {
  const bases = getHostBundleBases(roomId);
  if (envelope.entriesPartial === true) {
    return {
      baseRevision: bases.revision,
      baseEntityVersions: {},
      uploadedByClientId: envelope.clientId || "",
      entries: envelope.entries || [],
      entriesPartial: true
    };
  }
  const body = {
    baseRevision: bases.revision,
    baseEntityVersions: buildBaseEntityVersionsForEnvelope(envelope, bases.entityVersions),
    uploadedByClientId: envelope.clientId || "",
    agenda: envelope.agenda || [],
    todos: envelope.todos || {},
    entries: envelope.entries || [],
    manejo: envelope.manejo != null ? envelope.manejo : null
  };
  if (envelope.clinicalOps != null && typeof envelope.clinicalOps === "object") {
    body.clinicalOps = envelope.clinicalOps;
  }
  if (Array.isArray(envelope.labPanelOverlay) && envelope.labPanelOverlay.length) {
    body.labPanelOverlay = envelope.labPanelOverlay;
  }
  return body;
}

// public/js/features/lan/push-helpers.mjs
var BUNDLE_PUSH_HANDLED = "handled";
var CLINICAL_OPS_HANDLED = "handled";
function ensureEffectiveLiveSyncRoomId() {
  var roomId = String(activeLiveSyncRoomId || "").trim();
  if (roomId) return roomId;
  var mem = getRoomMembership();
  if (!mem || !mem.roomId) return "";
  roomId = String(mem.roomId).trim();
  setActiveLiveSyncRoom(roomId, mem.label || roomId);
  return roomId;
}
var CLINICAL_OPS_PAYLOAD_KEYS = [
  "rotation_cycles",
  "patient_team_assignment",
  "team_guardia_today",
  "active_guardias",
  "teams",
  "team_membership",
  "clinical_users"
];
function arraySectionHasItems(clinicalOps, key) {
  return Array.isArray(clinicalOps[key]) && clinicalOps[key].length > 0;
}
function clinicalOpsBundleHasPayload(clinicalOps) {
  if (!clinicalOps || typeof clinicalOps !== "object") return false;
  for (var i = 0; i < CLINICAL_OPS_PAYLOAD_KEYS.length; i += 1) {
    if (arraySectionHasItems(clinicalOps, CLINICAL_OPS_PAYLOAD_KEYS[i])) return true;
  }
  return false;
}
function todosBundleHasPayload(todos) {
  if (!todos || typeof todos !== "object") return false;
  var keys = Object.keys(todos);
  for (var i = 0; i < keys.length; i += 1) {
    if (Array.isArray(todos[keys[i]]) && todos[keys[i]].length > 0) return true;
  }
  return false;
}
function liveSyncBundleHasPayload(bundle) {
  if (!bundle) return false;
  if (Array.isArray(bundle.entries) && bundle.entries.length > 0) return true;
  if (Array.isArray(bundle.agenda) && bundle.agenda.length > 0) return true;
  if (todosBundleHasPayload(bundle.todos)) return true;
  if (Array.isArray(bundle.labPanelOverlay) && bundle.labPanelOverlay.length > 0) return true;
  return clinicalOpsBundleHasPayload(bundle.clinicalOps);
}
function hostBundleBodyFromEnvelope(envelope, roomId) {
  var body = hostBundlePutBodyFromEnvelope(roomId, envelope);
  body.uploadedByClientId = envelope.clientId || getLanClientId();
  return body;
}
function sendLiveBundleIfOpen(roomId, envelope) {
  var rid = String(roomId || "").trim();
  if (!rid || !envelope) return false;
  var ws = lanClient._liveWs;
  if (!lanClient.liveConnected || String(lanClient.liveRoomId || "").trim() !== rid) return false;
  if (!ws || ws.readyState !== 1) return false;
  try {
    return lanClient.sendLive(envelope) === true;
  } catch {
    return false;
  }
}
function lanPushResult(ok, code, channels) {
  return { ok: !!ok, code: code || void 0, channels: channels || {} };
}

// public/js/features/lan/push-revision.mjs
function liveSyncRoomIdIsRelevant(roomId) {
  var rid = String(roomId || "").trim();
  if (!rid) return false;
  if (rid === String(activeLiveSyncRoomId || "").trim()) return true;
  try {
    var mem = getRoomMembership();
    return !!(mem && String(mem.roomId || "").trim() === rid);
  } catch {
    return false;
  }
}
var missingPatientsReconcileTimer = null;
var MISSING_PATIENTS_RECONCILE_DELAY_MS = 2e4;
async function tryDeltaReplayFromHint(roomId) {
  var rid = String(roomId || "").trim();
  if (!rid) return false;
  var afterSeq = getLastDeltaSeq(rid);
  try {
    var res = await lanClient.fetch(
      "/api/lan/v1/rooms/" + encodeURIComponent(rid) + "/deltas?afterSeq=" + afterSeq,
      { cache: "no-store" }
    );
    if (!res || !res.ok) return false;
    var j = await res.json();
    if (!j) return false;
    if (j.fallback === "sync_bundle") return false;
    if (!Array.isArray(j.deltas) || j.deltas.length === 0) return true;
    await ensureLanSyncPushBridgeWired();
    var b = bridge();
    if (typeof b.applyLiveSyncDeltas !== "function") return false;
    await b.applyLiveSyncDeltas(rid, j.deltas);
    var maxSeq = j.deltas.reduce(function(m, d) {
      return Math.max(m, Number(d.deltaSeq || d.seq || 0));
    }, afterSeq);
    setLastDeltaSeq(rid, maxSeq);
    return true;
  } catch {
    return false;
  }
}
function scheduleReconcileFromRevisionHint(roomId) {
  var rid = String(roomId || "").trim();
  if (!rid || !liveSyncRoomIdIsRelevant(rid)) return;
  if (!activeLiveSyncRoomId) ensureEffectiveLiveSyncRoomId();
  setTimeout(function() {
    tryDeltaReplayFromHint(rid).then(function(applied) {
      if (!applied) {
        scheduleReconcileLiveSyncRoom(rid, { reason: "revision-hint-fallback", delayMs: 0 });
      }
    }).catch(function() {
      scheduleReconcileLiveSyncRoom(rid, { reason: "revision-hint-error", delayMs: 0 });
    });
  }, 500);
}
function emitLiveSyncRevisionHint(roomId, revision) {
  var rid = String(roomId || "").trim();
  if (!rid) return;
  if (!lanClient.liveConnected) {
    try {
      lanClient.connectLiveChannel(rid);
    } catch (_e) {
      void _e;
    }
  }
  if (!lanClient.liveConnected) return;
  try {
    lanClient.sendLive({
      type: "livesync:revision",
      roomId: String(roomId || "").trim(),
      revision: Number(revision || 0),
      clientId: getLanClientId()
    });
  } catch (_e) {
    void _e;
  }
}
function scheduleReconcileLiveSyncRoom(roomId, options) {
  var rid = String(roomId || "").trim();
  if (!rid) return;
  var opts = options || {};
  if (opts.reason === "missing-patients") {
    if (missingPatientsReconcileTimer) return;
    missingPatientsReconcileTimer = setTimeout(function() {
      missingPatientsReconcileTimer = null;
      void import("/mobile/js/chunks/push-reconcile-EAHAKE6X.js").then(function(m) {
        return m.reconcileLiveSyncRoom(rid, { reason: "missing-patients" });
      });
    }, opts.delayMs != null ? opts.delayMs : MISSING_PATIENTS_RECONCILE_DELAY_MS);
    return;
  }
  var delay = opts.delayMs != null ? opts.delayMs : 500;
  var prev = getLiveSyncRevisionReconcileTimer();
  if (prev) clearTimeout(prev);
  setLiveSyncRevisionReconcileTimer(
    setTimeout(function() {
      setLiveSyncRevisionReconcileTimer(null);
      void import("/mobile/js/chunks/push-reconcile-EAHAKE6X.js").then(function(m) {
        return m.reconcileLiveSyncRoom(rid, { reason: opts.reason || "scheduled" });
      });
    }, delay)
  );
}

export {
  lanSyncRoomBridgeGlobal,
  setLanSyncRoomBridgeGlobal,
  lanSyncTransportDepsGlobal,
  setLanSyncTransportDepsGlobal,
  registerLanSyncPushBridge,
  ensureLanSyncPushBridgeWired,
  bridge,
  getHostBundleBases,
  setHostBundleBases,
  hostBundlePutBodyFromEnvelope,
  BUNDLE_PUSH_HANDLED,
  CLINICAL_OPS_HANDLED,
  ensureEffectiveLiveSyncRoomId,
  liveSyncBundleHasPayload,
  hostBundleBodyFromEnvelope,
  sendLiveBundleIfOpen,
  lanPushResult,
  scheduleReconcileFromRevisionHint,
  emitLiveSyncRevisionHint,
  scheduleReconcileLiveSyncRoom
};
//# sourceMappingURL=/js/chunks/chunk-VQEQYC4S.js.map
