/**
 * LAN room push, reconcile, and outbox (IM-11).
 */

import { storage } from './storage.js';
import { isPitchPatientIsolationActive } from './tour-pitch-demo-seed.mjs';
import { enqueueOutbox, drainOutbox } from './live-sync-outbox.mjs';
import { getRoomMembership } from './live-sync-membership.mjs';
import {
  hostBundlePutBodyFromEnvelope,
  getHostBundleBases,
  setHostBundleBases,
} from './host-bundle-bases.mjs';
import { isLanManejoRoomSyncEnabled } from './manejo-room-data.mjs';
import {
  prepareClinicalOpsForLanSync,
  getCachedClinicalOpsSnapshot,
  isClinicalOpsLanAvailable,
} from './clinical-ops-lan.mjs';
import { RoomSyncPhase, setRoomSyncPhase } from './lan-sync-state.mjs';
import { mergeLiveSyncFullBundles } from './lan-merge-registry.mjs';
import {
  lanClient,
  activeLiveSyncRoomId,
  activeLiveSyncRoomLabel,
  getLanClientId,
  setActiveLiveSyncRoom,
  getLiveSyncPushTimer,
  setLiveSyncPushTimer,
  getLiveSyncRevisionReconcileTimer,
  setLiveSyncRevisionReconcileTimer,
  getLiveSyncOutboxFlushTimer,
  setLiveSyncOutboxFlushTimer,
  LIVE_SYNC_PUSH_DEBOUNCE_MS,
  LIVE_SYNC_OUTBOX_FLUSH_MS,
} from './lan-sync-runtime.mjs';

/** @type {Record<string, unknown> | null} */
let pushBridge = null;

/**
 * Wire lan-sync feature callbacks (avoids circular import with features/lan-sync.mjs).
 * @param {object} deps
 */
export function registerLanSyncPushBridge(deps) {
  pushBridge = deps && typeof deps === 'object' ? deps : null;
}

function bridge() {
  if (!pushBridge) {
    throw new Error('lan-sync-push: registerLanSyncPushBridge() not called');
  }
  return pushBridge;
}

export function ensureEffectiveLiveSyncRoomId() {
  var roomId = String(activeLiveSyncRoomId || '').trim();
  if (roomId) return roomId;
  var mem = getRoomMembership();
  if (!mem || !mem.roomId) return '';
  roomId = String(mem.roomId).trim();
  setActiveLiveSyncRoom(roomId, mem.label || roomId);
  return roomId;
}

export function liveSyncBundleHasPayload(bundle) {
  if (!bundle) return false;
  if (Array.isArray(bundle.entries) && bundle.entries.length > 0) return true;
  if (Array.isArray(bundle.agenda) && bundle.agenda.length > 0) return true;
  var todos = bundle.todos;
  if (!todos || typeof todos !== 'object') return false;
  var keys = Object.keys(todos);
  for (var i = 0; i < keys.length; i += 1) {
    if (Array.isArray(todos[keys[i]]) && todos[keys[i]].length > 0) return true;
  }
  var manejo = bundle.manejo;
  if (isLanManejoRoomSyncEnabled() && manejo && typeof manejo === 'object') {
    if (Array.isArray(manejo.customProtocols) && manejo.customProtocols.length > 0) return true;
    if (manejo.overrides && Object.keys(manejo.overrides).length > 0) return true;
    if (Array.isArray(manejo.favorites) && manejo.favorites.length > 0) return true;
  }
  var clinicalOps = bundle.clinicalOps;
  if (clinicalOps && typeof clinicalOps === 'object') {
    if (
      (Array.isArray(clinicalOps.rotation_cycles) && clinicalOps.rotation_cycles.length > 0) ||
      (Array.isArray(clinicalOps.patient_team_assignment) &&
        clinicalOps.patient_team_assignment.length > 0) ||
      (Array.isArray(clinicalOps.team_guardia_today) && clinicalOps.team_guardia_today.length > 0) ||
      (Array.isArray(clinicalOps.active_guardias) && clinicalOps.active_guardias.length > 0) ||
      (Array.isArray(clinicalOps.teams) && clinicalOps.teams.length > 0) ||
      (Array.isArray(clinicalOps.team_membership) && clinicalOps.team_membership.length > 0) ||
      (Array.isArray(clinicalOps.clinical_users) && clinicalOps.clinical_users.length > 0)
    ) {
      return true;
    }
  }
  return false;
}

export function hostBundleBodyFromEnvelope(envelope, roomId) {
  var body = hostBundlePutBodyFromEnvelope(roomId, envelope);
  body.uploadedByClientId = envelope.clientId || getLanClientId();
  return body;
}

export function pushRoomSyncBundleToHost(roomId, envelope) {
  var b = bridge();
  if (typeof b.isLanSessionConfiguredForRest !== 'function' || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve(false);
  }
  var rid = String(roomId || '').trim();
  if (!rid || !envelope || !liveSyncBundleHasPayload(envelope)) return Promise.resolve(false);
  return lanClient
    .fetch('/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/sync-bundle', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bundle: hostBundleBodyFromEnvelope(envelope, rid),
      }),
    })
    .then(function (resp) {
      if (!resp) return false;
      if (resp.status === 409) {
        return resp.json().then(function (body) {
          if (typeof b.isLanConflictViewerSuppressed === 'function' && b.isLanConflictViewerSuppressed()) {
            enqueueOutbox(rid, { kind: 'bundle', payload: envelope });
            return false;
          }
          var conflicts = body && Array.isArray(body.conflicts) ? body.conflicts : [];
          var conflictKeys = conflicts.map(function (c) {
            return c && c.key ? String(c.key) : '';
          }).filter(Boolean);
          var bundleConflictKeys = conflictKeys.length ? conflictKeys : ['*'];
          return b
            .saveDraftConflict({
              scope: 'room:' + rid,
              entityType: 'roomBundle',
              transport: 'http',
              roomId: rid,
              localBundle: envelope,
              serverBundle: body && body.bundle ? body.bundle : null,
              conflicts: conflicts,
              conflictingKeys: bundleConflictKeys,
            })
            .then(function (draftId) {
              var roomDraft = {
                id: draftId,
                roomId: rid,
                serverBundle: body && body.bundle ? body.bundle : null,
              };
              if (typeof b.shouldDeferLanConflictModal !== 'function' || !b.shouldDeferLanConflictModal()) {
                b.openClinicalConflictViewer({
                  draftId: draftId,
                  conflictingKeys: bundleConflictKeys,
                  localData: envelope,
                  serverData: body && body.bundle ? body.bundle : {},
                  context: {
                    entityType: 'roomBundle',
                    roomId: rid,
                    transport: 'http',
                  },
                  onUseServer: function () {
                    void b.applyRoomBundleServerChoice(roomDraft);
                  },
                  onEditDraft: function () {},
                  onClose: function () {},
                });
              } else if (typeof b.markDeferredConflictToastShown === 'function') {
                b.markDeferredConflictToastShown();
              }
              if (typeof b.renderLanPanel === 'function') void b.renderLanPanel();
              return false;
            });
        });
      }
      if (resp.ok) {
        return resp.json().then(function (body) {
          if (body && body.bundle) {
            setHostBundleBases(rid, body.bundle);
            emitLiveSyncRevisionHint(rid, body.bundle.revision);
          }
          return true;
        });
      }
      return false;
    })
    .catch(function () {
      return false;
    });
}

export function flushLiveSyncOutbox(roomId) {
  var b = bridge();
  var rid = String(roomId || '').trim();
  if (!rid || typeof b.isLanSessionConfiguredForRest !== 'function' || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve();
  }
  return drainOutbox(rid).then(function (items) {
    if (!items || !items.length) return;
    var chain = Promise.resolve();
    items.forEach(function (item) {
      chain = chain.then(function () {
        if (!item || item.kind !== 'bundle' || !item.payload) return;
        return pushRoomSyncBundleToHost(rid, item.payload).then(function (ok) {
          if (!ok) return enqueueOutbox(rid, item);
        });
      });
    });
    return chain;
  });
}

export function scheduleLiveSyncOutboxFlush() {
  if (getLiveSyncOutboxFlushTimer()) return;
  setLiveSyncOutboxFlushTimer(
    setInterval(function () {
      var m = getRoomMembership();
      if (!m || !m.roomId) return;
      flushLiveSyncOutbox(m.roomId);
    }, LIVE_SYNC_OUTBOX_FLUSH_MS)
  );
}

export function scheduleReconcileFromRevisionHint(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid || rid !== activeLiveSyncRoomId) return;
  var prev = getLiveSyncRevisionReconcileTimer();
  if (prev) clearTimeout(prev);
  setLiveSyncRevisionReconcileTimer(
    setTimeout(function () {
      setLiveSyncRevisionReconcileTimer(null);
      void reconcileLiveSyncRoom(rid);
    }, 500)
  );
}

export function emitLiveSyncRevisionHint(roomId, revision) {
  if (!lanClient.liveConnected) return;
  try {
    lanClient.sendLive({
      type: 'livesync:revision',
      roomId: String(roomId || '').trim(),
      revision: Number(revision || 0),
      clientId: getLanClientId(),
    });
  } catch (_e) {}
}

/** Debounced room push: HTTP sync-bundle is authoritative; WS carries patches + revision hints (IM-05). */
export function scheduleLiveSyncPush() {
  if (!activeLiveSyncRoomId) return;
  if (isPitchPatientIsolationActive()) return;
  var prev = getLiveSyncPushTimer();
  if (prev) clearTimeout(prev);
  setLiveSyncPushTimer(
    setTimeout(function () {
      setLiveSyncPushTimer(null);
      var roomId = activeLiveSyncRoomId;
      if (!roomId) return;
      void (async function () {
        var b = bridge();
        var bundle = await b.buildLiveSyncBundleEnvelope(roomId);
        b.saveLocalRoomSnapshot(roomId);
        if (!b.isLanSessionConfiguredForRest()) return;
        var ok = await pushRoomSyncBundleToHost(roomId, bundle);
        if (!ok) void enqueueOutbox(roomId, { kind: 'bundle', payload: bundle });
      })();
    }, LIVE_SYNC_PUSH_DEBOUNCE_MS)
  );
}

/** @returns {boolean} */
export function sendLiveBundleIfOpen(roomId, envelope) {
  var rid = String(roomId || '').trim();
  if (!rid || !envelope) return false;
  var ws = lanClient._liveWs;
  if (!lanClient.liveConnected || String(lanClient.liveRoomId || '').trim() !== rid) return false;
  if (!ws || ws.readyState !== 1) return false;
  try {
    return lanClient.sendLive(envelope) === true;
  } catch (_e) {
    return false;
  }
}

/**
 * @param {boolean} ok
 * @param {string} [code]
 * @param {{ http?: boolean, live?: boolean, outbox?: boolean }} [channels]
 */
export function lanPushResult(ok, code, channels) {
  return { ok: !!ok, code: code || undefined, channels: channels || {} };
}

/**
 * Push clinical profile / @usuario to LAN immediately (no debounce).
 * @param {{ requireMembership?: boolean }} [opts]
 */
export async function pushClinicalOpsLanNow(opts) {
  if (isPitchPatientIsolationActive()) return lanPushResult(false, 'PITCH_DEMO');
  if (!isClinicalOpsLanAvailable()) return lanPushResult(false, 'NO_CLINICAL_OPS');

  await prepareClinicalOpsForLanSync();
  var snap = getCachedClinicalOpsSnapshot();
  if (!snap) return lanPushResult(false, 'NO_SNAPSHOT');

  var roomId = ensureEffectiveLiveSyncRoomId();
  if (!roomId) {
    return lanPushResult(false, 'NO_ROOM');
  }
  var b = bridge();
  if (!b.isLanSessionConfiguredForRest()) {
    return lanPushResult(false, 'NO_LAN');
  }

  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
  } catch (_e) {}

  var envelope = await b.buildLiveSyncBundleEnvelope(roomId);
  envelope.clinicalOps = snap;

  var bases = getHostBundleBases(roomId);
  var okHttp = false;
  try {
    var opsResp = await lanClient.fetch(
      '/api/lan/v1/rooms/' + encodeURIComponent(roomId) + '/clinical-ops',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot: snap,
          baseRevision: bases && bases.revision != null ? bases.revision : 0,
          clientId: getLanClientId(),
        }),
      }
    );
    if (opsResp && opsResp.ok) {
      var opsBody = await opsResp.json();
      if (opsBody && opsBody.revision != null) {
        var prevBases = bases || {};
        setHostBundleBases(roomId, {
          revision: opsBody.revision,
          entityVersions: prevBases.entityVersions || {},
        });
        emitLiveSyncRevisionHint(roomId, opsBody.revision);
      }
      okHttp = true;
    } else if (!opsResp || opsResp.status !== 409) {
      okHttp = await pushRoomSyncBundleToHost(roomId, envelope);
    } else {
      okHttp = await pushRoomSyncBundleToHost(roomId, envelope);
    }
  } catch (_opsErr) {
    okHttp = await pushRoomSyncBundleToHost(roomId, envelope);
  }

  var pushedLive = sendLiveBundleIfOpen(roomId, envelope);
  b.saveLocalRoomSnapshot(roomId);
  if (typeof b.syncLiveSyncStatusChrome === 'function') b.syncLiveSyncStatusChrome();

  if (okHttp || pushedLive) {
    return lanPushResult(true, undefined, { http: !!okHttp, live: pushedLive });
  }
  void enqueueOutbox(roomId, { kind: 'bundle', payload: envelope });
  return lanPushResult(false, 'PUSH_FAILED', { outbox: true });
}

export async function reconcileLiveSyncRoom(roomId) {
  var b = bridge();
  var rid = String(roomId || '').trim();
  if (rid && activeLiveSyncRoomId === rid) {
    setRoomSyncPhase(rid, RoomSyncPhase.catching_up);
    if (typeof b.syncLiveSyncStatusChrome === 'function') b.syncLiveSyncStatusChrome();
  }
  if (isClinicalOpsLanAvailable()) {
    await prepareClinicalOpsForLanSync();
  }
  var sources = [];
  var local = storage.getLanRoomSnapshot(roomId);
  if (local) sources.push(local);
  sources.push(b.buildLiveSyncLocalMergeSource());
  try {
    const syncPath = '/api/lan/v1/rooms/' + encodeURIComponent(roomId) + '/sync-bundle';
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer =
      ac &&
      setTimeout(() => {
        ac.abort();
      }, 5000);
    var resp = await lanClient.fetch(syncPath, ac ? { signal: ac.signal } : {});
    if (timer) clearTimeout(timer);
    if (resp.ok) {
      var j = await resp.json();
      if (j && j.bundle) {
        setHostBundleBases(roomId, j.bundle);
        sources.push(j.bundle);
      }
    }
  } catch (_e) {}
  if (sources.length) {
    b.applyLiveSyncMerged(mergeLiveSyncFullBundles(sources));
  }
  if (typeof b.applyRoomSyncPhaseAfterReconcile === 'function') {
    b.applyRoomSyncPhaseAfterReconcile(rid || roomId);
  }
  if (typeof b.syncLiveSyncStatusChrome === 'function') b.syncLiveSyncStatusChrome();
  return flushLiveSyncOutbox(roomId);
}
