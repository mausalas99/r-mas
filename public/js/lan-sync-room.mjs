/**
 * LAN LiveSync room membership, wire messages, and reconnect (IM-11).
 */

import { storage } from './storage.js';
import { isPitchPatientIsolationActive } from './tour-pitch-demo-seed.mjs';
import {
  buildRoomSnapshotFromStorage,
  nextRoomSnapshotGeneration,
  isLiveSyncEnvelope,
} from './live-sync-room.mjs';
import {
  getRoomMembership,
  setRoomMembership,
  clearRoomMembership,
  migrateLastRoomToMembership,
} from './live-sync-membership.mjs';
import { mergeLiveSyncFullBundles } from './lan-merge-registry.mjs';
import {
  collectManejoRoomPayload,
  isLanManejoRoomSyncEnabled,
} from './manejo-room-data.mjs';
import {
  prepareClinicalOpsForLanSync,
  getCachedClinicalOpsSnapshot,
  isClinicalOpsLanAvailable,
} from './clinical-ops-lan.mjs';
import { getHostBundleBases } from './host-bundle-bases.mjs';
import { RoomSyncPhase, getRoomSyncPhase, setRoomSyncPhase, clearRoomSyncPhase } from './lan-sync-state.mjs';
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
} from './lan-surrogate-host.mjs';
import { getPinnedHostUrl } from './lan-host-pin.mjs';
import {
  registerLanSyncPushBridge,
  pushRoomSyncBundleToHost,
  reconcileLiveSyncRoom,
  flushLiveSyncOutbox,
  scheduleLiveSyncOutboxFlush,
  scheduleLiveSyncPush,
  scheduleReconcileFromRevisionHint,
  liveSyncBundleHasPayload,
  ensureEffectiveLiveSyncRoomId,
} from './lan-sync-push.mjs';
import {
  lanClient,
  activeLiveSyncRoomId,
  activeLiveSyncRoomLabel,
  getLanClientId,
  setActiveLiveSyncRoom,
  clearActiveLiveSyncRoom,
  getActiveLiveSyncRoomId,
} from './lan-sync-runtime.mjs';
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
} from './lan-sync-transport.mjs';
import { patients } from './app-state.mjs';

/** @type {Record<string, unknown> | null} */
let roomBridge = null;

export function registerLanSyncRoomBridge(deps) {
  roomBridge = deps && typeof deps === 'object' ? deps : null;
}

function bridge() {
  if (!roomBridge) throw new Error('lan-sync-room: registerLanSyncRoomBridge() not called');
  return roomBridge;
}

function runtime() {
  return bridge().runtime || { showToast() {} };
}

var _liveSyncReconnectTimer = null;
var _liveSyncReconnectAttempt = 0;
var _surrogateFailoverTimer = null;
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
  stopSurrogateFailoverTimer();
  _surrogateFailoverTimer = setTimeout(function () {
    _surrogateFailoverTimer = null;
    void runSurrogateFailoverCheck();
  }, 1200);
}

export async function tryReconnectLanToHostUrl(hostUrl, teamCode) {
  var targetUrl = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var currentUrl = String(cfg.hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  var pinned = getPinnedHostUrl();
  var switchOpts = { skipRememberPrimary: true };
  if (targetUrl && targetUrl !== currentUrl) {
    if (pinned) {
      if (targetUrl !== pinned) {
        var pinMsg =
          'Se detectó otro anfitrión (' +
          targetUrl +
          '). Tienes fijado ' +
          pinned +
          '. ¿Cambiar de todos modos?';
        if (typeof confirm !== 'function' || !confirm(pinMsg)) return false;
      }
    } else if (typeof confirm === 'function') {
      if (
        !confirm(
          '¿Reconectar al anfitrión ' + targetUrl + '?'
        )
      ) {
        return false;
      }
    }
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
  syncLiveSyncStatusChrome();
  bridge().patchLanPanelJoinButtons();
  return true;
}

export async function promoteSelfToSurrogateHost() {
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
  await promoteSelfToSurrogateHost();
}

export function saveLocalRoomSnapshot(roomId) {
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
    ...(isLanManejoRoomSyncEnabled() ? { manejo: collectManejoRoomPayload() } : {}),
    clinicalOps: getCachedClinicalOpsSnapshot(),
  });
}

export async function buildLiveSyncBundleEnvelope(roomId) {
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
    ...(isLanManejoRoomSyncEnabled() ? { manejo: collectManejoRoomPayload() } : {}),
    clinicalOps: getCachedClinicalOpsSnapshot(),
  };
}

export function applyRoomSyncPhaseAfterReconcile(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid || activeLiveSyncRoomId !== rid) return;
  if (
    lanClient.liveConnected &&
    String(lanClient.liveRoomId || '').trim() === rid
  ) {
    setRoomSyncPhase(rid, RoomSyncPhase.live);
  } else if (getRoomMembership() && getRoomMembership().roomId === rid) {
    setRoomSyncPhase(rid, RoomSyncPhase.degraded);
  } else if (isLanSessionConfiguredForRest()) {
    setRoomSyncPhase(rid, RoomSyncPhase.configured);
  } else {
    setRoomSyncPhase(rid, RoomSyncPhase.offline);
  }
}

export function syncLiveSyncStatusChrome() {
  var el = document.getElementById('lan-livesync-status');
  if (!el) return;
  if (!activeLiveSyncRoomId) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  el.style.display = 'block';
  var label = activeLiveSyncRoomLabel || activeLiveSyncRoomId;
  var prefix = 'Sala: ' + label + ' · ';
  var phase = getRoomSyncPhase(activeLiveSyncRoomId);
  if (phase === RoomSyncPhase.live) {
    el.textContent =
      prefix + 'sincronizando pacientes, equipos, labs, agenda y pendientes';
  } else if (phase === RoomSyncPhase.catching_up) {
    el.textContent = prefix + 'sincronizando…';
  } else if (phase === RoomSyncPhase.joining) {
    el.textContent = prefix + 'conectando…';
  } else if (phase === RoomSyncPhase.degraded) {
    el.textContent = prefix + 'reconectando…';
  } else {
    el.textContent = prefix + 'solo local (sin sync en vivo)';
  }
}

export function stopLiveSyncReconnectLoop() {
  if (_liveSyncReconnectTimer) {
    clearTimeout(_liveSyncReconnectTimer);
    _liveSyncReconnectTimer = null;
  }
}

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
      syncLiveSyncStatusChrome();
      scheduleReconnect();
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
    if (_liveSyncReconnectAttempt >= 3) scheduleSurrogateFailoverCheck();
    syncLiveSyncStatusChrome();
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
  bridge().deferLanConflictModalForMs(20000);
  setActiveLiveSyncRoom(m.roomId, m.label);
  setRoomSyncPhase(m.roomId, RoomSyncPhase.catching_up);
  scheduleLiveSyncOutboxFlush();
  reconcileLiveSyncRoom(m.roomId)
    .then(function () {
      return flushLiveSyncOutbox(m.roomId);
    })
    .then(function () {
      if (!getRoomMembership()) return;
      try {
        if (!lanClient.connected) lanClient.connectSyncChannel();
        lanClient.connectLiveChannel(m.roomId);
      } catch (_e) {}
      applyRoomSyncPhaseAfterReconcile(m.roomId);
      void import('./historia-clinica-lan-sync.mjs').then(function (mod) {
        return mod.scheduleFlushAllPendingHistoriaClinicaLanSync();
      });
      startLiveSyncReconnectLoop();
      syncLiveSyncStatusChrome();
    });
}

export function onLiveSyncWireMessage(data) {
  if (!data || !isLiveSyncEnvelope(data)) return;
  if (data.roomId && activeLiveSyncRoomId && data.roomId !== activeLiveSyncRoomId) return;
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
      void (async function () {
        try {
          lanClient.sendLive(await buildLiveSyncBundleEnvelope(activeLiveSyncRoomId));
        } catch (_eHelloBundle) {}
      })();
    }
    return;
  }
  if (data.type === 'livesync:leave' && data.bundle && data.clientId !== myId) {
    bridge().applyLiveSyncMerged(
      mergeLiveSyncFullBundles([bridge().buildLiveSyncLocalMergeSource(), data.bundle])
    );
    return;
  }
  if (data.type === 'livesync:revision' && data.clientId !== myId) {
    scheduleReconcileFromRevisionHint(data.roomId);
    return;
  }
  if (data.clientId === myId && data.type !== 'livesync:hello') return;
  if (data.type === 'livesync:bundle') {
    var mergedBundle = mergeLiveSyncFullBundles([bridge().buildLiveSyncLocalMergeSource(), data]);
    bridge().applyLiveSyncMerged(mergedBundle);
    return;
  }
  if (data.type === 'livesync:applied') {
    bridge().applyLiveSyncApplied(data);
    return;
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
    await Promise.race([
      reconcileLiveSyncRoom(roomId),
      new Promise((resolve) => {
        setTimeout(resolve, timeoutMs);
      }),
    ]);
    return true;
  } catch (_e) {
    return false;
  }
}

export function syncLiveSyncAfterRoomJoin(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid) return Promise.resolve();
  return reconcileLiveSyncRoom(rid).then(function () {
    if (activeLiveSyncRoomId !== rid) return;
    applyRoomSyncPhaseAfterReconcile(rid);
    scheduleLiveSyncPush();
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
    runtime().renderPatientList();
    void import('./historia-clinica-lan-sync.mjs').then(function (m) {
      return m.scheduleFlushAllPendingHistoriaClinicaLanSync();
    });
  });
}

export function leaveLiveSyncRoom(opts) {
  opts = opts || {};
  var roomId = activeLiveSyncRoomId;
  if (roomId) {
    void (async function () {
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
  }
  clearActiveLiveSyncRoom();
  if (roomId) clearRoomSyncPhase(roomId);
  clearRoomMembership();
  stopLiveSyncReconnectLoop();
  lanClient.disconnectLiveChannel();
  syncLiveSyncStatusChrome();
  bridge().patchLanPanelJoinButtons();
  if (typeof renderLanPanel === 'function') bridge().renderLanPanel();
}

export function joinLanRoom(roomId, displayName) {
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
    syncLiveSyncStatusChrome();
    bridge().patchLanPanelJoinButtons();
    runtime().showToast('Ya estás en esta sala', 'success');
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
  runtime().showToast('Sala: sincronizando expediente, agenda y pendientes', 'success');
  syncLiveSyncStatusChrome();
  bridge().patchLanPanelJoinButtons();
  syncLiveSyncAfterRoomJoin(id);
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
      void import('./historia-clinica-lan-sync.mjs').then(function (m) {
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
