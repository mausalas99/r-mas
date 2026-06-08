/**
 * LAN LiveSync room membership, wire messages, and reconnect (IM-11).
 */

import { storage } from '../../storage.js';
import { isPitchPatientIsolationActive } from '../../tour-pitch-demo-seed.mjs';
import {
  buildRoomSnapshotFromStorage,
  nextRoomSnapshotGeneration,
  isLiveSyncEnvelope,
} from '../../live-sync-room.mjs';
import {
  getRoomMembership,
  setRoomMembership,
  clearRoomMembership,
  migrateLastRoomToMembership,
} from '../../live-sync-membership.mjs';
import { mergeLiveSyncFullBundles } from '../../lan-merge-registry.mjs';
import {
  prepareClinicalOpsForLanSync,
  getCachedClinicalOpsSnapshot,
  isClinicalOpsLanAvailable,
  applyClinicalOpsLanSnapshot,
  refreshClinicalOpsSnapshotCache,
} from '../../clinical-ops-lan.mjs';
import { getHostBundleBases, setHostBundleBases } from '../../host-bundle-bases.mjs';
import { RoomSyncPhase, getRoomSyncPhase, setRoomSyncPhase, clearRoomSyncPhase } from '../../lan-sync-state.mjs';
import { recordClinicalOpsTrace, recordLanSyncError } from '../../lan-sync-diagnostics.mjs';
import {
  rememberPrimaryHostUrl,
  getPrimaryHostUrl,
  recordLivePeer,
  listLivePeerHostUrls,
  pingLanHostUrl,
  getSurrogateHostState,
  setSurrogateHostState,
  clearSurrogateHostState,
  isSurrogateHostActive,
  surrogateElectionDelayMs,
} from '../../lan-surrogate-host.mjs';
import {
  canAttemptAutoHostDetect,
  isAutoHostDetectPaused,
  recordAutoHostDetectMiss,
  recordAutoHostDetectSuccess,
  resumeAutoHostDetect,
} from '../../lan-host-detect-guard.mjs';
import { getPinnedHostUrl } from '../../lan-host-pin.mjs';
import {
  registerLanSyncPushBridge,
  pushRoomSyncBundleToHost,
  pushClinicalOpsLanNow,
  reconcileLiveSyncRoom,
  flushLiveSyncOutbox,
  scheduleLiveSyncOutboxFlush,
  scheduleLiveSyncPush,
  scheduleReconcileFromRevisionHint,
  emitLiveSyncRevisionHint,
  liveSyncBundleHasPayload,
  ensureEffectiveLiveSyncRoomId,
} from './push.mjs';
import {
  lanClient,
  activeLiveSyncRoomId,
  activeLiveSyncRoomLabel,
  getLanClientId,
  setActiveLiveSyncRoom,
  clearActiveLiveSyncRoom,
  getActiveLiveSyncRoomId,
} from './runtime.mjs';
import {
  isLanSessionConfiguredForRest,
  lanFetchAuthed,
  getLanTeamCodeFromConfig,
  persistLanClientConfig,
  isLanElectronDesktop,
  isLanRemoteJoinMode,
  resolveLanHostUrlAuto,
  applyLanHostUrlSwitch,
  maybeApplyLanHostUrlSwitch,
  trimStoredLanBearer,
} from './transport.mjs';
import { patients } from '../../app-state.mjs';
import {
  shouldApplyCommandBroadcast,
  updateCommandSeqState,
} from '../../lan-command-room-order.mjs';

export { shouldApplyCommandBroadcast, updateCommandSeqState };

/** @type {Record<string, unknown> | null} */
let roomBridge = null;

/** @type {Promise<void> | null} */
var roomBridgeWirePromise = null;

function lanSyncRoomBridgeGlobal() {
  return globalThis['__LAN_SYNC_ROOM_BRIDGE__'];
}

function setLanSyncRoomBridgeGlobal(value) {
  globalThis['__LAN_SYNC_ROOM_BRIDGE__'] = value;
}

export function registerLanSyncRoomBridge(deps) {
  roomBridge = deps && typeof deps === 'object' ? deps : null;
  if (roomBridge && typeof globalThis !== 'undefined') {
    setLanSyncRoomBridgeGlobal(roomBridge);
  }
}

/**
 * Ensures orchestrator boot wiring ran (esbuild may load room before registerLanSyncRoomBridge).
 * @returns {Promise<void>}
 */
export function ensureLanSyncRoomBridgeWired() {
  if (roomBridge) return Promise.resolve();
  if (typeof globalThis !== 'undefined') {
    var cached = lanSyncRoomBridgeGlobal();
    if (cached && typeof cached === 'object') {
      roomBridge = cached;
      return Promise.resolve();
    }
  }
  if (!roomBridgeWirePromise) {
    roomBridgeWirePromise = import('./orchestrator.mjs').then(function () {
      if (!roomBridge && typeof globalThis !== 'undefined') {
        var g = lanSyncRoomBridgeGlobal();
        if (g && typeof g === 'object') roomBridge = g;
      }
    });
  }
  return roomBridgeWirePromise;
}

function bridge() {
  if (!roomBridge && typeof globalThis !== 'undefined') {
    var cached = lanSyncRoomBridgeGlobal();
    if (cached && typeof cached === 'object') roomBridge = cached;
  }
  if (!roomBridge) throw new Error('lan-sync-room: registerLanSyncRoomBridge() not called');
  return roomBridge;
}

function runtime() {
  return bridge().runtime || { showToast() {} };
}

var _liveSyncReconnectTimer = null;
var _liveSyncReconnectAttempt = 0;
var _surrogateFailoverTimer = null;
/** Once per cold start: full reconcile/push even if live WS already looks connected. */
var _liveSyncSessionResyncDone = false;
/** Tracks last applied command broadcast sequence for gap detection. */
var commandSeqState = { lastAppliedSeq: 0, lastAckedCommandId: '' };

export async function resolveSelfLanAdvertiseHostUrl() {
  if (!isLanElectronDesktop() || isLanRemoteJoinMode()) return '';
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var fromCfg = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (fromCfg) return fromCfg;
  return resolveLanHostUrlAuto();
}

export function buildLiveSyncHelloPayload(roomId) {
  var rid = String(roomId || '').trim();
  var prev = storage.getLanRoomSnapshot(rid);
  var payload = {
    type: 'livesync:hello',
    roomId: rid,
    clientId: getLanClientId(),
    snapshotAt: prev && prev.savedAt ? prev.savedAt : null,
    generation: prev && prev.generation != null ? prev.generation : 0,
    canHost: isLanElectronDesktop(),
    isSurrogate: isSurrogateHostActive(),
    capabilities: {
      deltaSync: 1,
      deltaEntities: ['historiaClinica', 'agenda', 'todo'],
      lastDeltaSeq: Number(prev && prev.lastDeltaSeq ? prev.lastDeltaSeq : 0),
    },
  };
  return payload;
}

export async function enrichLiveSyncHelloPayload(payload) {
  if (!payload || !payload.canHost) return payload;
  var url = await resolveSelfLanAdvertiseHostUrl();
  if (url) payload.hostUrl = url;
  return payload;
}

export function stopSurrogateFailoverTimer() {
  if (_surrogateFailoverTimer) {
    clearTimeout(_surrogateFailoverTimer);
    _surrogateFailoverTimer = null;
  }
}

export function scheduleSurrogateFailoverCheck() {
  if (!activeLiveSyncRoomId || !getRoomMembership()) return;
  if (!canAttemptAutoHostDetect()) return;
  stopSurrogateFailoverTimer();
  _surrogateFailoverTimer = setTimeout(function () {
    _surrogateFailoverTimer = null;
    void runSurrogateFailoverCheck();
  }, 1200);
}

export async function tryReconnectLanToHostUrl(hostUrl, teamCode) {
  await ensureLanSyncRoomBridgeWired();
  var targetUrl = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var currentUrl = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  var pinned = getPinnedHostUrl();
  var switchOpts = { skipRememberPrimary: true };
  if (targetUrl && targetUrl !== currentUrl && pinned && targetUrl !== pinned) {
    runtime().showToast('Anfitrión fijado: ' + pinned + '.', 'info');
    return false;
  }
  if (!applyLanHostUrlSwitch(hostUrl, teamCode, switchOpts)) return false;
  var ok = await pingLanHostUrl(hostUrl, teamCode);
  if (!ok) return false;
  var rid = activeLiveSyncRoomId;
  if (rid) {
    try {
      lanClient.connectLiveChannel(rid);
    } catch (_e) {}
    await syncLiveSyncAfterRoomJoin(rid);
    startLiveSyncReconnectLoop();
  }
  recordAutoHostDetectSuccess();
  syncLiveSyncStatusChrome();
  bridge().patchLanPanelJoinButtons();
  return true;
}

export async function promoteSelfToSurrogateHost() {
  await ensureLanSyncRoomBridgeWired();
  if (typeof window !== 'undefined' && window.electronAPI?.ensureLanServerReady) {
    await window.electronAPI.ensureLanServerReady();
  }
  if (!isLanElectronDesktop() || !isLanRemoteJoinMode()) return false;
  if (!activeLiveSyncRoomId) return false;
  if (isSurrogateHostActive()) return false;
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var formerUrl = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  var formerCode = getLanTeamCodeFromConfig();
  var localUrl = await resolveLanHostUrlAuto();
  if (!localUrl) return false;
  if (formerUrl && (await pingLanHostUrl(formerUrl, formerCode))) return false;
  setSurrogateHostState({
    formerHostUrl: formerUrl || getPrimaryHostUrl(),
    formerTeamCode: formerCode,
    localHostUrl: localUrl,
    roomId: activeLiveSyncRoomId,
    promotedAt: new Date().toISOString(),
  });
  applyLanHostUrlSwitch(localUrl, formerCode, { skipRememberPrimary: true });
  var bundle = await buildLiveSyncBundleEnvelope(activeLiveSyncRoomId);
  await pushRoomSyncBundleToHost(activeLiveSyncRoomId, bundle);
  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
    lanClient.connectLiveChannel(activeLiveSyncRoomId);
  } catch (_e) {}
  await syncLiveSyncAfterRoomJoin(activeLiveSyncRoomId);
  startLiveSyncReconnectLoop();
  var handoff = await enrichLiveSyncHelloPayload(buildLiveSyncHelloPayload(activeLiveSyncRoomId));
  handoff.type = 'livesync:host-handoff';
  handoff.newHostUrl = localUrl;
  handoff.reason = 'surrogate-promoted';
  try {
    lanClient.sendLive(handoff);
  } catch (_e2) {}
  runtime().showToast(
    'El anfitrión se desconectó: esta Mac asume el servidor hasta que vuelva. Comparte de nuevo la invitación si alguien no reconecta solo.',
    'success'
  );
  bridge().renderLanPanel();
  return true;
}

export async function maybeRevertSurrogateToPrimary() {
  await ensureLanSyncRoomBridgeWired();
  var st = getSurrogateHostState();
  if (!st || !st.formerHostUrl) return false;
  var code = st.formerTeamCode || getLanTeamCodeFromConfig();
  if (!(await pingLanHostUrl(st.formerHostUrl, code))) return false;
  if (activeLiveSyncRoomId) {
    var bundle = await buildLiveSyncBundleEnvelope(activeLiveSyncRoomId);
    var prevUrl = lanClient.baseUrl();
    applyLanHostUrlSwitch(st.formerHostUrl, code, { skipRememberPrimary: true });
    await pushRoomSyncBundleToHost(activeLiveSyncRoomId, bundle);
    if (!(await pingLanHostUrl(st.formerHostUrl, code))) {
      applyLanHostUrlSwitch(prevUrl, code, { skipRememberPrimary: true });
      return false;
    }
  }
  clearSurrogateHostState();
  applyLanHostUrlSwitch(st.formerHostUrl, code, { skipRememberPrimary: false });
  if (activeLiveSyncRoomId) {
    try {
      lanClient.connectLiveChannel(activeLiveSyncRoomId);
    } catch (_e) {}
    await syncLiveSyncAfterRoomJoin(activeLiveSyncRoomId);
  }
  runtime().showToast('El anfitrión original volvió: esta Mac dejó de ser servidor temporal.', 'success');
  bridge().renderLanPanel();
  return true;
}

export async function runSurrogateFailoverCheck() {
  if (!activeLiveSyncRoomId || !getRoomMembership()) return;
  if (!canAttemptAutoHostDetect()) return;
  if (lanClient.connected && lanClient.liveConnected) return;
  var teamCode = getLanTeamCodeFromConfig();
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var currentUrl = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (currentUrl && (await pingLanHostUrl(currentUrl, teamCode))) {
    try {
      if (!lanClient.connected) lanClient.connectSyncChannel();
      if (activeLiveSyncRoomId) lanClient.connectLiveChannel(activeLiveSyncRoomId);
    } catch (_pingOk) {}
    if (isSurrogateHostActive()) void maybeRevertSurrogateToPrimary();
    return;
  }
  if (isSurrogateHostActive()) {
    if (await maybeRevertSurrogateToPrimary()) return;
  }
  var targets = [];
  var primary = getPrimaryHostUrl();
  if (primary && primary !== currentUrl) targets.push(primary);
  listLivePeerHostUrls(getLanClientId()).forEach(function (u) {
    if (u && targets.indexOf(u) === -1 && u !== currentUrl) targets.push(u);
  });
  for (var i = 0; i < targets.length; i += 1) {
    if (await tryReconnectLanToHostUrl(targets[i], teamCode)) {
      if (targets[i] !== primary) {
        runtime().showToast('Reconectado al nuevo anfitrión de la sala.', 'success');
      } else if (!isSurrogateHostActive()) {
        runtime().showToast('Anfitrión original de vuelta.', 'success');
      }
      return;
    }
  }
  if (!isLanElectronDesktop() || !isLanRemoteJoinMode()) return;
  await new Promise(function (r) {
    setTimeout(r, surrogateElectionDelayMs(getLanClientId()));
  });
  if (lanClient.connected && lanClient.liveConnected) return;
  if (primary && (await pingLanHostUrl(primary, teamCode))) {
    await tryReconnectLanToHostUrl(primary, teamCode);
    return;
  }
  for (var j = 0; j < targets.length; j += 1) {
    if (await pingLanHostUrl(targets[j], teamCode)) {
      await tryReconnectLanToHostUrl(targets[j], teamCode);
      return;
    }
  }
  if (!canAttemptAutoHostDetect()) return;
  recordAutoHostDetectMiss();
  if (!canAttemptAutoHostDetect()) return;
  await promoteSelfToSurrogateHost();
}

export function saveLocalRoomSnapshot(roomId) {
  void ensureLanSyncRoomBridgeWired().then(function () {
    saveLocalRoomSnapshotBody(roomId);
  });
}

function saveLocalRoomSnapshotBody(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid) return;
  var snap = buildRoomSnapshotFromStorage(storage, bridge().collectPatientIdsForLiveSync());
  var prev = storage.getLanRoomSnapshot(rid);
  var entries = bridge().collectPatientEntriesForLanSync();
  storage.saveLanRoomSnapshot(rid, {
    savedAt: snap.savedAt,
    generation: nextRoomSnapshotGeneration(prev),
    agenda: snap.agenda,
    todos: snap.todos,
    entries: entries,
    clinicalOps: getCachedClinicalOpsSnapshot(),
  });
}

export async function buildLiveSyncBundleEnvelope(roomId) {
  await ensureLanSyncRoomBridgeWired();
  if (isClinicalOpsLanAvailable()) {
    await prepareClinicalOpsForLanSync();
  }
  var rid = String(roomId || '').trim();
  var snap = buildRoomSnapshotFromStorage(storage, bridge().collectPatientIdsForLiveSync());
  var prev = storage.getLanRoomSnapshot(rid);
  var entries = bridge().collectPatientEntriesForLanSync();
  return {
    type: 'livesync:bundle',
    roomId: rid,
    clientId: getLanClientId(),
    savedAt: snap.savedAt,
    generation: nextRoomSnapshotGeneration(prev),
    agenda: snap.agenda,
    todos: snap.todos,
    entries: entries,
    clinicalOps: getCachedClinicalOpsSnapshot(),
  };
}

/**
 * Wait until live WS for roomId is open (or timeout).
 * @param {string} roomId
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
export function waitForLiveChannelOpen(roomId, timeoutMs) {
  var rid = String(roomId || '').trim();
  var ms = Math.max(500, Number(timeoutMs) || 5000);
  if (!rid) return Promise.resolve(false);
  if (
    lanClient.liveConnected &&
    String(lanClient.liveRoomId || '').trim() === rid
  ) {
    var ws = lanClient._liveWs;
    if (ws && ws.readyState === 1) return Promise.resolve(true);
  }
  return new Promise(function (resolve) {
    var settled = false;
    function finish(ok) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      lanClient.removeEventListener('lan-live-status', onStatus);
      resolve(!!ok);
    }
    function onStatus(ev) {
      if (!ev || !ev.detail || !ev.detail.connected) return;
      if (String(ev.detail.roomId || '').trim() !== rid) return;
      finish(true);
    }
    var timer = setTimeout(function () {
      finish(false);
    }, ms);
    lanClient.addEventListener('lan-live-status', onStatus);
  });
}

export function applyRoomSyncPhaseAfterReconcile(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid) return;
  var active = String(activeLiveSyncRoomId || '').trim();
  if (!active) {
    var mem = getRoomMembership();
    if (mem && String(mem.roomId || '').trim() === rid) {
      setActiveLiveSyncRoom(rid, mem.label || rid);
      active = rid;
    }
  }
  if (active && active !== rid) return;

  var liveRid = String(lanClient.liveRoomId || '').trim();
  if (lanClient.liveConnected && (liveRid === rid || !liveRid)) {
    setRoomSyncPhase(rid, RoomSyncPhase.live);
  } else if (getRoomMembership() && String(getRoomMembership().roomId || '').trim() === rid) {
    setRoomSyncPhase(rid, RoomSyncPhase.degraded);
    if (canAttemptAutoHostDetect()) {
      void import('../../lan-shift-pin-connect.mjs').then(function (m) {
        if (typeof m.tryEasyLanShiftPinConnect === 'function') {
          return m.tryEasyLanShiftPinConnect({ roomId: rid, silent: true });
        }
      });
    }
  } else if (isLanSessionConfiguredForRest()) {
    setRoomSyncPhase(rid, RoomSyncPhase.configured);
  } else {
    setRoomSyncPhase(rid, RoomSyncPhase.offline);
  }
}

function liveSyncStatusChromeClass(phase) {
  if (phase === RoomSyncPhase.live) return 'live';
  if (phase === RoomSyncPhase.catching_up || phase === RoomSyncPhase.joining) return 'syncing';
  if (phase === RoomSyncPhase.degraded) return 'degraded';
  if (phase === RoomSyncPhase.configured || phase === RoomSyncPhase.offline) return 'local';
  return 'idle';
}

function liveSyncStatusChromeDetail(roomLabel, phase) {
  var prefix = roomLabel ? 'Sala: ' + roomLabel + ' · ' : '';
  if (phase === RoomSyncPhase.live) {
    return prefix + 'sincronizando pacientes, equipos, labs, agenda y pendientes';
  }
  if (phase === RoomSyncPhase.catching_up) return prefix + 'sincronizando…';
  if (phase === RoomSyncPhase.joining) return prefix + 'conectando…';
  if (phase === RoomSyncPhase.degraded) {
    return prefix + (isAutoHostDetectPaused() ? 'desconectado' : 'reconectando…');
  }
  if (roomLabel) return prefix + 'solo local (sin sync en vivo)';
  return 'Conexión LAN / LiveSync';
}

export function syncLiveSyncStatusChrome() {
  var btn = document.getElementById('btn-header-team-sync');
  if (!btn) return;
  var roomLabel = activeLiveSyncRoomId
    ? activeLiveSyncRoomLabel || activeLiveSyncRoomId
    : '';
  var phase = activeLiveSyncRoomId
    ? getRoomSyncPhase(activeLiveSyncRoomId)
    : RoomSyncPhase.offline;
  var chromeClass = liveSyncStatusChromeClass(phase);
  var detail = liveSyncStatusChromeDetail(roomLabel, phase);
  btn.className =
    'btn-header-icon btn-livesync-header btn-livesync-header--' + chromeClass;
  btn.title = detail;
  btn.setAttribute('aria-label', detail);
}

export function stopLiveSyncReconnectLoop() {
  if (_liveSyncReconnectTimer) {
    clearTimeout(_liveSyncReconnectTimer);
    _liveSyncReconnectTimer = null;
  }
}

export function resumeAutoHostDetectAndReconnect() {
  resumeAutoHostDetect();
  _liveSyncReconnectAttempt = 0;
  if (getRoomMembership()?.roomId) {
    startLiveSyncReconnectLoop();
  }
}

let _shiftPinRediscoverInFlight = false;

export function startLiveSyncReconnectLoop() {
  stopLiveSyncReconnectLoop();
  var m = getRoomMembership();
  if (!m || !m.roomId) return;
  function tick() {
    var mem = getRoomMembership();
    if (!mem || !mem.roomId) {
      stopLiveSyncReconnectLoop();
      return;
    }
    if (!activeLiveSyncRoomId) {
      setActiveLiveSyncRoom(mem.roomId, mem.label);
    }
    if (lanClient.liveConnected && String(lanClient.liveRoomId || '') === mem.roomId) {
      _liveSyncReconnectAttempt = 0;
      recordAutoHostDetectSuccess();
      if (!_liveSyncSessionResyncDone) {
        _liveSyncSessionResyncDone = true;
        void syncLiveSyncAfterRoomJoin(mem.roomId).then(function () {
          return flushLiveSyncOutbox(mem.roomId);
        });
      }
      syncLiveSyncStatusChrome();
      scheduleReconnect();
      return;
    }
    if (!canAttemptAutoHostDetect()) {
      syncLiveSyncStatusChrome();
      stopLiveSyncReconnectLoop();
      return;
    }
    if (typeof lanClient.isLiveChannelBusy === 'function' && lanClient.isLiveChannelBusy(mem.roomId)) {
      syncLiveSyncStatusChrome();
      scheduleReconnect();
      return;
    }
    if (isLanSessionConfiguredForRest()) {
      try {
        if (!lanClient.connected) lanClient.connectSyncChannel();
        lanClient.connectLiveChannel(mem.roomId);
        syncLiveSyncAfterRoomJoin(mem.roomId);
      } catch (_e) {}
    }
    _liveSyncReconnectAttempt += 1;
    if (_liveSyncReconnectAttempt >= 2 && !_shiftPinRediscoverInFlight && canAttemptAutoHostDetect()) {
      _shiftPinRediscoverInFlight = true;
      void import('../../lan-shift-pin-connect.mjs')
        .then(function (mod) {
          if (typeof mod.tryEasyLanShiftPinConnect !== 'function') return { ok: false };
          return mod.tryEasyLanShiftPinConnect({
            roomId: mem.roomId,
            silent: true,
            skipCooldown: true,
          });
        })
        .finally(function () {
          _shiftPinRediscoverInFlight = false;
        });
    }
    if (_liveSyncReconnectAttempt >= 3 && canAttemptAutoHostDetect()) {
      scheduleSurrogateFailoverCheck();
    }
    syncLiveSyncStatusChrome();
    if (!canAttemptAutoHostDetect()) {
      stopLiveSyncReconnectLoop();
      return;
    }
    scheduleReconnect();
  }
  function scheduleReconnect() {
    var delay = Math.min(30000, 1000 * Math.pow(2, Math.min(_liveSyncReconnectAttempt, 5)));
    _liveSyncReconnectTimer = setTimeout(tick, delay);
  }
  tick();
}

export function bootLanRoomMembership() {
  migrateLastRoomToMembership();
  var m = getRoomMembership();
  if (!m || !m.roomId || !isLanSessionConfiguredForRest()) return;
  setActiveLiveSyncRoom(m.roomId, m.label);
  setRoomSyncPhase(m.roomId, RoomSyncPhase.catching_up);
  scheduleLiveSyncOutboxFlush();
  void (async function () {
    var rid = m.roomId;
    try {
      const accessMod = await import('../../clinical-access-runtime.mjs');
      if (typeof accessMod.waitForClinicalAccessReady === 'function') {
        await accessMod.waitForClinicalAccessReady();
      }
      try {
        if (!lanClient.connected) lanClient.connectSyncChannel();
        lanClient.connectLiveChannel(rid);
      } catch (_eConn) {}
      var liveOpen = await waitForLiveChannelOpen(rid, 8000);
      if (!liveOpen) {
        recordLanSyncError({
          op: 'live-ws',
          code: 'TIMEOUT',
          message: 'Canal live no conectó en 8s; sync HTTP sigue activo',
        });
        try {
          const pinMod = await import('../../lan-shift-pin-connect.mjs');
          if (typeof pinMod.tryEasyLanShiftPinConnect === 'function') {
            await pinMod.tryEasyLanShiftPinConnect({ roomId: rid, silent: true, force: true });
          }
        } catch (_ePin) {}
      }
      await syncLiveSyncAfterRoomJoin(rid);
      await flushLiveSyncOutbox(rid);
      if (!getRoomMembership()) return;
      _liveSyncSessionResyncDone = true;
      startLiveSyncReconnectLoop();
    } catch (err) {
      recordLanSyncError({
        op: 'boot-membership',
        code: 'BOOT',
        message: err && err.message ? err.message : 'boot membership sync failed',
      });
    } finally {
      applyRoomSyncPhaseAfterReconcile(rid);
      syncLiveSyncStatusChrome();
    }
  })();
}

export function onLiveSyncWireMessage(data) {
  if (!data || !isLiveSyncEnvelope(data)) return;
  if (data.roomId && activeLiveSyncRoomId && data.roomId !== activeLiveSyncRoomId) return;
  void ensureLanSyncRoomBridgeWired().then(function () {
    onLiveSyncWireMessageBody(data);
  });
}

function onLiveSyncWireMessageBody(data) {
  var myId = getLanClientId();
  if (data.type === 'livesync:hello' || data.type === 'livesync:host-handoff') {
    if (data.clientId !== myId) {
      recordLivePeer(data.clientId, {
        hostUrl: data.newHostUrl || data.hostUrl,
        canHost: !!data.canHost,
      });
      if (data.type === 'livesync:host-handoff' && data.newHostUrl) {
        var newUrl = String(data.newHostUrl || '')
          .trim()
          .replace(/\/+$/, '');
        var cfgNow = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
        var curUrl = String(cfgNow.hostUrl || '')
          .trim()
          .replace(/\/+$/, '');
        if (newUrl && newUrl !== curUrl && isLanRemoteJoinMode()) {
          void tryReconnectLanToHostUrl(newUrl, getLanTeamCodeFromConfig());
        }
      }
    }
    if (data.type === 'livesync:hello' && data.clientId !== myId && activeLiveSyncRoomId) {
      scheduleClinicalOpsPullFromHost(activeLiveSyncRoomId);
      const bases = getHostBundleBases(activeLiveSyncRoomId);
      emitLiveSyncRevisionHint(activeLiveSyncRoomId, bases ? bases.revision : 0);
    }
    return;
  }
  if (data.type === 'livesync:leave' && data.bundle && data.clientId !== myId) {
    void bridge().applyLiveSyncMerged(
      mergeLiveSyncFullBundles([data.bundle, bridge().buildLiveSyncLocalMergeSource()])
    );
    return;
  }
  if (data.type === 'livesync:revision' && data.clientId !== myId) {
    scheduleClinicalOpsPullFromHost(data.roomId);
    scheduleReconcileFromRevisionHint(data.roomId);
    return;
  }
  if (data.clientId === myId && data.type !== 'livesync:hello') return;
  if (data.type === 'livesync:bundle') {
    var mergedBundle = mergeLiveSyncFullBundles([data, bridge().buildLiveSyncLocalMergeSource()]);
    void bridge().applyLiveSyncMerged(mergedBundle);
    return;
  }
  if (data.type === 'livesync:delta:applied') {
    bridge().applyLiveSyncDeltaApplied(data);
    return;
  }
  if (data.type === 'livesync:command:applied') {
    const decision = shouldApplyCommandBroadcast(commandSeqState, data);
    if (decision.action === 'catch_up') {
      scheduleReconcileFromRevisionHint(data.roomId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lan-command-gap', {
          detail: { afterSeq: decision.afterSeq, message: data },
        }));
      }
      return;
    }
    if (decision.action === 'ignore') return;
    commandSeqState = updateCommandSeqState(commandSeqState, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lan-command-applied', { detail: data }));
    }
    return;
  }
  if (data.type === 'livesync:applied') {
    bridge().applyLiveSyncApplied(data);
    return;
  }
}

var clinicalOpsGossipPushTimer = null;
var clinicalOpsPullFromHostTimer = null;

/** Pull host directorio (lightweight) when a peer publishes profile or clinical ops. */
function scheduleClinicalOpsPullFromHost(roomId) {
  var rid = String(roomId || ensureEffectiveLiveSyncRoomId() || '').trim();
  if (!rid || !isClinicalOpsLanAvailable()) return;
  if (clinicalOpsPullFromHostTimer) clearTimeout(clinicalOpsPullFromHostTimer);
  clinicalOpsPullFromHostTimer = setTimeout(function () {
    clinicalOpsPullFromHostTimer = null;
    void fetchAndApplyClinicalOpsFromHost(rid, { skipGossipPush: true });
  }, 400);
}

/** Re-publish merged local roster so the host accumulates all Macs (not only pull). */
function scheduleClinicalOpsGossipPush() {
  if (!isClinicalOpsLanAvailable()) return;
  if (clinicalOpsGossipPushTimer) clearTimeout(clinicalOpsGossipPushTimer);
  clinicalOpsGossipPushTimer = setTimeout(function () {
    clinicalOpsGossipPushTimer = null;
    void pushClinicalOpsLanNow().catch(function () {});
  }, 2500);
}

/** GET /clinical-ops from another Mac on the subnet (split-brain directorio fallback). */
export async function fetchClinicalOpsFromAlternateHost(hostUrl, roomId, options = {}) {
  const url = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  const rid = String(roomId || ensureEffectiveLiveSyncRoomId() || '').trim();
  if (!url || !rid || !isClinicalOpsLanAvailable() || !isLanSessionConfiguredForRest()) {
    return false;
  }
  const cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  const ownUrl = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (ownUrl && url === ownUrl) return false;
  const teamCode = getLanTeamCodeFromConfig();
  if (!teamCode) return false;

  const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 5000);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(
      `${url}/api/lan/v1/rooms/${encodeURIComponent(rid)}/clinical-ops`,
      {
        signal: ctrl.signal,
        cache: 'no-store',
        headers: { Authorization: `Bearer ${teamCode}` },
      }
    );
    if (!resp || !resp.ok) return false;
    const body = await resp.json();
    if (!body || !body.snapshot || typeof body.snapshot !== 'object') return false;
    const mergeResult = await applyClinicalOpsLanSnapshot(body.snapshot);
    if (!mergeResult.ok) return false;
    await refreshClinicalOpsSnapshotCache();
    if (mergeResult.changed && !options.skipGossipPush) {
      scheduleClinicalOpsGossipPush();
    }
    return true;
  } catch (_e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** GET /clinical-ops from host and merge into local SQLCipher (directorio LAN). */
export async function fetchAndApplyClinicalOpsFromHost(roomId, options = {}) {
  const rid = String(roomId || '').trim();
  if (!rid || !isClinicalOpsLanAvailable() || !isLanSessionConfiguredForRest()) {
    return false;
  }
  const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 8000);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
    const resp = await lanClient.fetch(
      '/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/clinical-ops',
      { signal: ctrl.signal, cache: 'no-store' }
    );
    if (!resp || !resp.ok) {
      recordClinicalOpsTrace('get', {
        roomId: rid,
        httpStatus: resp ? resp.status : 0,
        incomingUsers: 0,
        ok: false,
      });
      return false;
    }
    const body = await resp.json();
    recordClinicalOpsTrace('get', {
      roomId: rid,
      httpStatus: resp.status,
      incomingUsers: Array.isArray(body?.snapshot?.clinical_users)
        ? body.snapshot.clinical_users.length
        : 0,
      ok: true,
    });
    if (body && body.revision != null) {
      const prev = getHostBundleBases(rid) || {};
      setHostBundleBases(rid, {
        revision: Number(body.revision),
        entityVersions: prev.entityVersions || {},
      });
    }
    if (!body || !body.snapshot || typeof body.snapshot !== 'object') return false;
    const mergeResult = await applyClinicalOpsLanSnapshot(body.snapshot);
    if (!mergeResult.ok) return false;
    await refreshClinicalOpsSnapshotCache();
    if (mergeResult.changed && !options.skipGossipPush) {
      scheduleClinicalOpsGossipPush();
    }
    return true;
  } catch (_e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshLanClinicalDirectoryFromRoom(options = {}) {
  const roomId = ensureEffectiveLiveSyncRoomId();
  if (!roomId || !isClinicalOpsLanAvailable() || !isLanSessionConfiguredForRest()) {
    return false;
  }
  const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 5000);
  try {
    if (!lanClient.connected) {
      try {
        lanClient.connectSyncChannel();
      } catch (_e) {}
    }
    const applied = await Promise.race([
      fetchAndApplyClinicalOpsFromHost(roomId, { timeoutMs }),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
    if (applied) return true;
    await Promise.race([
      reconcileLiveSyncRoom(roomId),
      new Promise((resolve) => {
        setTimeout(resolve, timeoutMs);
      }),
    ]);
    return false;
  } catch (_e) {
    return false;
  }
}

export function syncLiveSyncAfterRoomJoin(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid) return Promise.resolve();
  return ensureLanSyncRoomBridgeWired().then(function () {
    return syncLiveSyncAfterRoomJoinBody(rid);
  });
}

function syncLiveSyncAfterRoomJoinBody(rid) {
  var chain = Promise.resolve();
  if (isClinicalOpsLanAvailable()) {
    chain = chain.then(function () {
      return import('../../clinical-ops-lan.mjs').then(function (mod) {
        return mod.flushPendingClinicalOpsLanSnapshot();
      });
    });
  }
  if (isClinicalOpsLanAvailable()) {
    chain = chain
      .then(function () {
        return prepareClinicalOpsForLanSync();
      })
      .then(function () {
        return pushClinicalOpsLanNow();
      });
  }
  return chain
    .then(function () {
      return reconcileLiveSyncRoom(rid, { force: true, reason: 'room-join' });
    })
    .then(function () {
      if (activeLiveSyncRoomId !== rid) return;
      return fetchAndApplyClinicalOpsFromHost(rid, { skipGossipPush: true });
    })
    .then(function () {
      if (activeLiveSyncRoomId !== rid) return;
      applyRoomSyncPhaseAfterReconcile(rid);
      scheduleLiveSyncPush();
      if (isClinicalOpsLanAvailable()) {
        void pushClinicalOpsLanNow().catch(function () {});
      }
      if (lanClient.liveConnected) {
        void enrichLiveSyncHelloPayload(buildLiveSyncHelloPayload(rid)).then(function (hello) {
          if (activeLiveSyncRoomId !== rid) return;
          try {
            lanClient.sendLive(hello);
          } catch (_hello) {}
        });
      }
      syncLiveSyncStatusChrome();
      runtime().renderProcedureAgendaPanel();
      runtime().refreshAllTodoUIs();
      void import('../../clinical-access-runtime.mjs').then(function (accessMod) {
        if (typeof accessMod.refreshClinicalPatientListForScope === 'function') {
          return accessMod.refreshClinicalPatientListForScope({ allowLanPull: false });
        }
        runtime().renderPatientList({ silent: true });
      });
      void import('../../historia-clinica-lan-sync.mjs').then(function (m) {
        return m.scheduleFlushAllPendingHistoriaClinicaLanSync();
      });
    });
}

export function leaveLiveSyncRoom(opts) {
  opts = opts || {};
  var roomId = activeLiveSyncRoomId;
  if (roomId) {
    void ensureLanSyncRoomBridgeWired().then(function () {
      return (async function () {
      var bundle = await buildLiveSyncBundleEnvelope(roomId);
      if (!opts.silentLeave) {
        lanClient.sendLive({
          type: 'livesync:leave',
          roomId: roomId,
          clientId: getLanClientId(),
          bundle: bundle,
        });
      }
      saveLocalRoomSnapshot(roomId);
      if (liveSyncBundleHasPayload(bundle)) {
        pushRoomSyncBundleToHost(roomId, bundle);
      }
      })();
    });
  }
  clearActiveLiveSyncRoom();
  if (roomId) clearRoomSyncPhase(roomId);
  clearRoomMembership();
  _liveSyncSessionResyncDone = false;
  stopLiveSyncReconnectLoop();
  lanClient.disconnectLiveChannel();
  syncLiveSyncStatusChrome();
  void ensureLanSyncRoomBridgeWired().then(function () {
    bridge().patchLanPanelJoinButtons();
    if (typeof renderLanPanel === 'function') bridge().renderLanPanel();
  });
}

/**
 * @param {string} roomId
 * @param {string} [displayName]
 * @param {{ silent?: boolean, mobileSharerSync?: boolean }} [opts]
 */
export async function joinLanRoom(roomId, displayName, opts) {
  opts = opts || {};
  var silent = !!(opts.silent || opts.mobileSharerSync);
  await ensureLanSyncRoomBridgeWired();
  var id = String(roomId || '').trim();
  if (!id) {
    runtime().showToast('No se pudo identificar la sala. Vuelve a abrir ⇄ e inténtalo.', 'error');
    return;
  }
  if (!isLanSessionConfiguredForRest()) {
    runtime().showToast(
      'Primero conecta al servidor del equipo (Activar sala en vivo o pega el enlace de invitación).',
      'error'
    );
    return;
  }
  if (!lanClient.baseUrl()) {
    try {
      bridge().initLanClientFromStorage();
    } catch (_boot) {}
  }
  if (!lanClient.baseUrl()) {
    runtime().showToast('Falta la dirección del servidor LAN. Configúrala en ⇄ antes de unirte.', 'error');
    return;
  }
  if (
    activeLiveSyncRoomId === id &&
    String(lanClient.liveRoomId || '') === id &&
    lanClient.liveConnected
  ) {
    setRoomSyncPhase(id, RoomSyncPhase.joining);
    syncLiveSyncAfterRoomJoin(id);
    _liveSyncSessionResyncDone = true;
    syncLiveSyncStatusChrome();
    bridge().patchLanPanelJoinButtons();
    if (!silent) runtime().showToast('Ya estás en esta sala', 'success');
    return;
  }
  if (activeLiveSyncRoomId && activeLiveSyncRoomId !== id) {
    leaveLiveSyncRoom({ silentLeave: false });
  }
  setActiveLiveSyncRoom(id, displayName != null ? String(displayName) : id);
  setRoomSyncPhase(id, RoomSyncPhase.joining);
  syncLiveSyncStatusChrome();
  try {
    if (!lanClient.connected) {
      try {
        lanClient.connectSyncChannel();
      } catch (_sync) {}
    }
    lanClient.connectLiveChannel(id);
    setRoomMembership({ roomId: id, label: activeLiveSyncRoomLabel });
    bridge().rememberLanRoomJoined(id, activeLiveSyncRoomLabel);
    scheduleLiveSyncOutboxFlush();
    startLiveSyncReconnectLoop();
  } catch (_e) {
    clearActiveLiveSyncRoom();
    clearRoomSyncPhase(id);
    runtime().showToast('No se pudo activar relay de sala', 'error');
    return;
  }
  if (!silent) {
    runtime().showToast('Sala: sincronizando expediente, agenda y pendientes', 'success');
  }
  syncLiveSyncStatusChrome();
  bridge().patchLanPanelJoinButtons();
  if (opts.mobileSharerSync) {
    void finishMobileRoomJoinSync(id);
    return;
  }
  await waitForLiveChannelOpen(id, 5000);
  await syncLiveSyncAfterRoomJoin(id);
  applyRoomSyncPhaseAfterReconcile(id);
  _liveSyncSessionResyncDone = true;
  syncLiveSyncStatusChrome();
}

async function finishMobileRoomJoinSync(roomId) {
  var id = String(roomId || '').trim();
  if (!id) return;
  try {
    await waitForLiveChannelOpen(id, 3500);
    await syncLiveSyncAfterRoomJoin(id);
    applyRoomSyncPhaseAfterReconcile(id);
    _liveSyncSessionResyncDone = true;
    syncLiveSyncStatusChrome();
  } finally {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('rpc-mobile-lan-sync-settled'));
    }
  }
}
export function registerLanSyncRoomWireHandlers() {
  lanClient.addEventListener('lan-live', function (ev) {
    onLiveSyncWireMessage(ev.detail);
  });
  lanClient.addEventListener('lan-live-status', function (ev) {
    if (!ev.detail) return;
    if (ev.detail.connected && activeLiveSyncRoomId) {
      syncLiveSyncAfterRoomJoin(activeLiveSyncRoomId);
      flushLiveSyncOutbox(activeLiveSyncRoomId);
      void import('../../historia-clinica-lan-sync.mjs').then(function (m) {
        return m.scheduleFlushAllPendingHistoriaClinicaLanSync();
      });
      void maybeRevertSurrogateToPrimary();
    } else if (!ev.detail.connected && activeLiveSyncRoomId) {
      setRoomSyncPhase(activeLiveSyncRoomId, RoomSyncPhase.degraded);
      saveLocalRoomSnapshot(activeLiveSyncRoomId);
      startLiveSyncReconnectLoop();
      if (!lanClient.connected) scheduleSurrogateFailoverCheck();
    }
    syncLiveSyncStatusChrome();
  });
  lanClient.addEventListener('lan-status', function (ev) {
    if (!ev.detail || ev.detail.connected) return;
    if (activeLiveSyncRoomId && getRoomMembership()) scheduleSurrogateFailoverCheck();
  });
}

export { getActiveLiveSyncRoomId };
