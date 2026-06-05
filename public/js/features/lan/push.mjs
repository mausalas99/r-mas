/**
 * LAN room push, reconcile, and outbox (IM-11).
 */

import { storage } from '../../storage.js';
import { isPitchPatientIsolationActive } from '../../tour-pitch-demo-seed.mjs';
import { enqueueOutbox, drainOutbox } from '../../live-sync-outbox.mjs';
import { getRoomMembership } from '../../live-sync-membership.mjs';
import {
  hostBundlePutBodyFromEnvelope,
  getHostBundleBases,
  setHostBundleBases,
} from '../../host-bundle-bases.mjs';
import { isLanManejoRoomSyncEnabled } from '../../manejo-room-data.mjs';
import {
  prepareClinicalOpsForLanSync,
  getCachedClinicalOpsSnapshot,
  isClinicalOpsLanAvailable,
} from '../../clinical-ops-lan.mjs';
import { RoomSyncPhase, getRoomSyncPhase, setRoomSyncPhase } from '../../lan-sync-state.mjs';
import { recordClinicalOpsTrace, recordLanSyncError } from '../../lan-sync-diagnostics.mjs';
import { notifyLwwOverwrite } from '../../lan-lww-toast.mjs';
import {
  pauseBundlePushForRoom,
  isBundlePushPaused,
} from '../../lan-sync-bundle-push.mjs';

/** Bundle / clinical-ops 409 resolved locally — do not re-enqueue the same payload. */
var BUNDLE_PUSH_HANDLED = 'handled';
var CLINICAL_OPS_HANDLED = 'handled';
import { mergeLiveSyncFullBundles } from '../../lan-merge-registry.mjs';
import { isMobileWeb } from '../../mobile-web.mjs';
import { patients } from '../../app-state.mjs';
import { guardAndSignLiveSyncMutation } from '../../clinical-access-runtime.mjs';
import { wrapLiveSyncPatch } from '../../versioned-mutation.mjs';
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
} from './runtime.mjs';

/** @type {Record<string, unknown> | null} */
let pushBridge = null;

/** @type {Promise<void> | null} */
var pushBridgeWirePromise = null;

/** Literal key — esbuild may run wireLanSyncBridges() before a module-level const here is initialized. */
function lanSyncPushBridgeGlobal() {
  return globalThis['__LAN_SYNC_PUSH_BRIDGE__'];
}

function setLanSyncPushBridgeGlobal(value) {
  globalThis['__LAN_SYNC_PUSH_BRIDGE__'] = value;
}

/**
 * Wire lan-sync feature callbacks (avoids circular import with features/lan-sync.mjs).
 * @param {object} deps
 */
export function registerLanSyncPushBridge(deps) {
  pushBridge = deps && typeof deps === 'object' ? deps : null;
  if (pushBridge && typeof globalThis !== 'undefined') {
    setLanSyncPushBridgeGlobal(pushBridge);
  }
}

/**
 * Ensures orchestrator boot wiring ran (esbuild may load push/room before registerLanSyncPushBridge).
 * @returns {Promise<void>}
 */
export function ensureLanSyncPushBridgeWired() {
  if (pushBridge) return Promise.resolve();
  if (typeof globalThis !== 'undefined') {
    var cached = lanSyncPushBridgeGlobal();
    if (cached && typeof cached === 'object') {
      pushBridge = cached;
      return Promise.resolve();
    }
  }
  if (!pushBridgeWirePromise) {
    pushBridgeWirePromise = import('./orchestrator.mjs').then(function () {
      if (!pushBridge && typeof globalThis !== 'undefined') {
        var g = lanSyncPushBridgeGlobal();
        if (g && typeof g === 'object') pushBridge = g;
      }
    });
  }
  return pushBridgeWirePromise;
}

function bridge() {
  if (!pushBridge && typeof globalThis !== 'undefined') {
    var cached = lanSyncPushBridgeGlobal();
    if (cached && typeof cached === 'object') pushBridge = cached;
  }
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

function lwwToastRuntime(b) {
  return { showToast: typeof b.showToast === 'function' ? b.showToast : undefined };
}

function notifyBundleLwwOverwrite(b, roomId, lwwAppliedKeys) {
  var keys = Array.isArray(lwwAppliedKeys) ? lwwAppliedKeys : [];
  if (!keys.length) return;
  notifyLwwOverwrite(lwwToastRuntime(b), {
    entityType: 'bundle',
    entityId: roomId,
    overwrittenKeys: keys,
  });
}

function applyServerBundleLwwLocally(rid, b, serverBundle, lwwAppliedKeys) {
  if (!serverBundle) return false;
  setHostBundleBases(rid, serverBundle);
  emitLiveSyncRevisionHint(rid, serverBundle.revision);
  if (typeof b.acceptServerBundleConflict === 'function') {
    b.acceptServerBundleConflict({
      roomId: rid,
      serverBundle: serverBundle,
      conflicts: [],
    });
  }
  notifyBundleLwwOverwrite(b, rid, lwwAppliedKeys);
  return true;
}

function finishBundle409Locally(rid, b, opts) {
  opts = opts || {};
  pauseBundlePushForRoom(rid, 45000);
  scheduleReconcileFromRevisionHint(rid);
  if (typeof b.applyRoomSyncPhaseAfterReconcile === 'function') {
    b.applyRoomSyncPhaseAfterReconcile(rid);
  }
  if (typeof b.syncLiveSyncStatusChrome === 'function') {
    b.syncLiveSyncStatusChrome();
  }
  return BUNDLE_PUSH_HANDLED;
}

/** @returns {Promise<string>} */
function resolveClinicalOps409(rid, b, body) {
  var opsBody = body && typeof body === 'object' ? body : {};
  if (opsBody.revision != null) {
    var prevBases = getHostBundleBases(rid) || {};
    setHostBundleBases(rid, {
      revision: opsBody.revision,
      entityVersions: prevBases.entityVersions || {},
    });
    emitLiveSyncRevisionHint(rid, opsBody.revision);
  }
  var acceptP = Promise.resolve();
  if (typeof b.acceptServerClinicalOpsConflict === 'function') {
    acceptP = Promise.resolve(
      b.acceptServerClinicalOpsConflict(rid, opsBody.snapshot, opsBody.revision)
    );
  }
  var lwwKeys = Array.isArray(opsBody.lwwAppliedKeys) ? opsBody.lwwAppliedKeys : [];
  if (lwwKeys.length) {
    notifyLwwOverwrite(lwwToastRuntime(b), {
      entityType: 'clinicalOps',
      entityId: rid,
      overwrittenKeys: lwwKeys,
    });
  }
  pauseBundlePushForRoom(rid, 45000);
  if (typeof b.syncLiveSyncStatusChrome === 'function') {
    b.syncLiveSyncStatusChrome();
  }
  return acceptP.then(function () {
    return CLINICAL_OPS_HANDLED;
  });
}

function applyClinicalOpsPutSuccess(rid, b, body, prevBases) {
  if (body && body.revision != null) {
    var prev = prevBases || getHostBundleBases(rid) || {};
    setHostBundleBases(rid, {
      revision: body.revision,
      entityVersions: prev.entityVersions || {},
    });
    emitLiveSyncRevisionHint(rid, body.revision);
  }
  var lwwKeys = Array.isArray(body && body.lwwAppliedKeys) ? body.lwwAppliedKeys : [];
  if (lwwKeys.length) {
    notifyLwwOverwrite(lwwToastRuntime(b), {
      entityType: 'clinicalOps',
      entityId: rid,
      overwrittenKeys: lwwKeys,
    });
  }
  return true;
}

/** Align local baseRevision with host before PUT (avoids stale-revision 409). */
function ensureClinicalOpsPushRevision(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid) return Promise.resolve();
  var b = bridge();
  if (typeof b.isLanSessionConfiguredForRest !== 'function' || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve();
  }
  var bases = getHostBundleBases(rid) || {};
  var localRev = Number(bases.revision || 0);
  return lanClient
    .fetch('/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/clinical-ops')
    .then(function (resp) {
      if (!resp || !resp.ok) return;
      return resp.json().then(function (body) {
        var serverRev = Number(body && body.revision != null ? body.revision : 0);
        if (localRev === serverRev) return;
        if (typeof b.acceptServerClinicalOpsConflict === 'function') {
          return b.acceptServerClinicalOpsConflict(rid, body.snapshot, serverRev);
        }
        setHostBundleBases(rid, {
          revision: serverRev,
          entityVersions: bases.entityVersions || {},
        });
      });
    })
    .catch(function () {});
}

/**
 * PUT clinical-ops snapshot; on 409 align with host and retry once.
 * @returns {Promise<boolean|string>}
 */
function putClinicalOpsSnapshotToHost(roomId, snapshot, clientId) {
  var rid = String(roomId || '').trim();
  var snap = snapshot && typeof snapshot === 'object' ? snapshot : null;
  if (!rid || !snap) return Promise.resolve(false);
  var b = bridge();
  if (typeof b.isLanSessionConfiguredForRest !== 'function' || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve(false);
  }

  function doPut() {
    return ensureClinicalOpsPushRevision(rid).then(function () {
      var bases = getHostBundleBases(rid);
      return lanClient
        .fetch('/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/clinical-ops', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshot: snap,
            baseRevision: bases && bases.revision != null ? bases.revision : 0,
            clientId: clientId || getLanClientId(),
          }),
        })
        .then(function (resp) {
          if (!resp) return false;
          if (resp.status === 409) {
            return resp
              .json()
              .catch(function () {
                return {};
              })
              .then(function (conflictBody) {
                return resolveClinicalOps409(rid, b, conflictBody).then(function () {
                  return prepareClinicalOpsForLanSync().then(function () {
                    var fresh = getCachedClinicalOpsSnapshot() || snap;
                    return ensureClinicalOpsPushRevision(rid).then(function () {
                      var basesRetry = getHostBundleBases(rid);
                      return lanClient
                        .fetch(
                          '/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/clinical-ops',
                          {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              snapshot: fresh,
                              baseRevision:
                                basesRetry && basesRetry.revision != null
                                  ? basesRetry.revision
                                  : 0,
                              clientId: clientId || getLanClientId(),
                            }),
                          }
                        )
                        .then(function (retryResp) {
                          if (!retryResp) return false;
                          if (retryResp.status === 409) {
                            return retryResp
                              .json()
                              .catch(function () {
                                return {};
                              })
                              .then(function (body2) {
                                return resolveClinicalOps409(rid, b, body2);
                              });
                          }
                          if (!retryResp.ok) return false;
                          return retryResp.json().then(function (body) {
                            return applyClinicalOpsPutSuccess(rid, b, body, basesRetry);
                          });
                        });
                    });
                  });
                });
              });
          }
          if (!resp.ok) return false;
          return resp.json().then(function (body) {
            return applyClinicalOpsPutSuccess(rid, b, body, bases);
          });
        })
        .catch(function () {
          return false;
        });
    });
  }

  return doPut();
}

/**
 * @param {string} roomId
 * @param {{ snapshot: object, baseRevision?: number, clientId?: string }} payload
 */
function pushClinicalOpsPayloadToHost(roomId, payload) {
  var rid = String(roomId || '').trim();
  var snap = payload && payload.snapshot;
  if (!rid || !snap) return Promise.resolve(false);
  return putClinicalOpsSnapshotToHost(rid, snap, payload.clientId || getLanClientId());
}

async function pushDeltaToHost(roomId, envelope) {
  const rid = String(roomId || '').trim();
  if (!rid || !envelope) return false;
  const body = envelope.delta || envelope;
  const resp = await lanClient.fetch('/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/delta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return resp && (resp.ok || resp.status === 409);
}

export function pushRoomSyncBundleToHost(roomId, envelope) {
  return ensureLanSyncPushBridgeWired().then(function () {
    return pushRoomSyncBundleToHostBody(roomId, envelope);
  });
}

function pushRoomSyncBundleToHostBody(roomId, envelope) {
  var b = bridge();
  if (typeof b.isLanSessionConfiguredForRest !== 'function' || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve(false);
  }
  var rid = String(roomId || '').trim();
  if (!rid || !envelope || !liveSyncBundleHasPayload(envelope)) return Promise.resolve(false);
  if (isBundlePushPaused(rid)) return Promise.resolve('paused');
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
          var serverBundle = body && body.bundle ? body.bundle : null;
          var lwwKeys =
            body && Array.isArray(body.lwwAppliedKeys) ? body.lwwAppliedKeys : ['*'];
          if (!serverBundle) {
            enqueueOutbox(rid, { kind: 'bundle', payload: envelope });
            return finishBundle409Locally(rid, b, {});
          }
          applyServerBundleLwwLocally(rid, b, serverBundle, lwwKeys);
          return finishBundle409Locally(rid, b, {});
        });
      }
      if (resp.ok) {
        return resp.json().then(function (body) {
          if (body && body.bundle) {
            setHostBundleBases(rid, body.bundle);
            emitLiveSyncRevisionHint(rid, body.bundle.revision);
          }
          notifyBundleLwwOverwrite(
            b,
            rid,
            body && Array.isArray(body.lwwAppliedKeys) ? body.lwwAppliedKeys : []
          );
          return true;
        });
      }
      recordLanSyncError({
        op: 'sync-bundle',
        code: String(resp.status || 'HTTP'),
        message: 'PUT sync-bundle rechazado',
      });
      return false;
    })
    .catch(function (err) {
      recordLanSyncError({
        op: 'sync-bundle',
        code: 'NETWORK',
        message: err && err.message ? err.message : 'PUT sync-bundle falló',
      });
      return false;
    });
}

export function flushLiveSyncOutbox(roomId) {
  return ensureLanSyncPushBridgeWired().then(function () {
    return flushLiveSyncOutboxBody(roomId);
  });
}

function flushLiveSyncOutboxBody(roomId) {
  var b = bridge();
  var rid = String(roomId || '').trim();
  if (!rid || typeof b.isLanSessionConfiguredForRest !== 'function' || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve();
  }
  return drainOutbox(rid).then(function (items) {
    if (!items || !items.length) return;
    var sorted = items.slice().sort(function (a, b) {
      var score = function (k) {
        if (k === 'clinical_ops') return 0;
        if (k === 'bundle') return 1;
        return 2;
      };
      return score(a && a.kind) - score(b && b.kind);
    });

    function pushLiveSyncPatchOutbox(envelope) {
      if (!envelope || !envelope.mutation) return Promise.resolve(false);
      function trySend() {
        if (!lanClient.liveConnected) return Promise.resolve(false);
        return guardAndSignLiveSyncMutation(envelope.mutation, envelope)
          .then(function () {
            lanClient.sendLive(envelope);
            return true;
          })
          .catch(function () {
            return false;
          });
      }
      return trySend().then(function (sent) {
        if (sent) return true;
        try {
          lanClient.connectLiveChannel(rid);
        } catch (_eConn) {}
        return import('./room.mjs').then(function (mod) {
          if (typeof mod.waitForLiveChannelOpen !== 'function') return false;
          return mod.waitForLiveChannelOpen(rid, 4000).then(function () {
            return trySend();
          });
        });
      });
    }

    function pushOutboxItem(item) {
      if (!item || !item.payload) return Promise.resolve(true);
      if (item.kind === 'clinical_ops') {
        return pushClinicalOpsPayloadToHost(rid, item.payload);
      }
      if (item.kind === 'bundle') {
        return pushRoomSyncBundleToHost(rid, item.payload);
      }
      if (item.kind === 'delta') {
        return pushDeltaToHost(rid, item.payload);
      }
      if (item.kind === 'patch') {
        return pushLiveSyncPatchOutbox(item.payload);
      }
      return Promise.resolve(true);
    }

    function outboxItemSucceeded(result) {
      return (
        result === true || result === BUNDLE_PUSH_HANDLED || result === CLINICAL_OPS_HANDLED
      );
    }

    function reenqueueSlice(slice) {
      var chain = Promise.resolve();
      slice.forEach(function (it) {
        chain = chain.then(function () {
          return enqueueOutbox(rid, { kind: it.kind, payload: it.payload });
        });
      });
      return chain;
    }

    function drainFromIndex(index) {
      if (index >= sorted.length) return Promise.resolve();
      var item = sorted[index];
      return pushOutboxItem(item).then(function (result) {
        if (result === 'paused') {
          return reenqueueSlice(sorted.slice(index));
        }
        if (!outboxItemSucceeded(result)) {
          return reenqueueSlice(sorted.slice(index));
        }
        return drainFromIndex(index + 1);
      });
    }

    return drainFromIndex(0);
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

function liveSyncRoomIdIsRelevant(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid) return false;
  if (rid === String(activeLiveSyncRoomId || '').trim()) return true;
  try {
    var mem = getRoomMembership();
    return !!(mem && String(mem.roomId || '').trim() === rid);
  } catch (_e) {
    return false;
  }
}

export function scheduleReconcileFromRevisionHint(roomId) {
  var rid = String(roomId || '').trim();
  if (!rid || !liveSyncRoomIdIsRelevant(rid)) return;
  if (!activeLiveSyncRoomId) ensureEffectiveLiveSyncRoomId();
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
  var rid = String(roomId || '').trim();
  if (!rid) return;
  if (!lanClient.liveConnected) {
    try {
      lanClient.connectLiveChannel(rid);
    } catch (_eConn) {}
  }
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
  var roomId = ensureEffectiveLiveSyncRoomId();
  if (!roomId) return;
  if (isBundlePushPaused(roomId)) return;
  if (isPitchPatientIsolationActive()) return;
  var prev = getLiveSyncPushTimer();
  if (prev) clearTimeout(prev);
  setLiveSyncPushTimer(
    setTimeout(function () {
      setLiveSyncPushTimer(null);
      var roomId = ensureEffectiveLiveSyncRoomId();
      if (!roomId) return;
      void (async function () {
        await ensureLanSyncPushBridgeWired();
        var b = bridge();
        var bundle = await b.buildLiveSyncBundleEnvelope(roomId);
        b.saveLocalRoomSnapshot(roomId);
        if (!b.isLanSessionConfiguredForRest()) return;
        var pushResult = await pushRoomSyncBundleToHost(roomId, bundle);
        if (
          pushResult !== true &&
          pushResult !== BUNDLE_PUSH_HANDLED &&
          !isBundlePushPaused(roomId)
        ) {
          void enqueueOutbox(roomId, { kind: 'bundle', payload: bundle });
        }
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

/** @type {Promise<{ ok: boolean, code?: string, channels?: object }>|null} */
var clinicalOpsLanPushInFlight = null;

/**
 * Push clinical profile / @usuario to LAN immediately (no debounce).
 * @param {{ requireMembership?: boolean }} [opts]
 */
export async function pushClinicalOpsLanNow(opts) {
  if (clinicalOpsLanPushInFlight) return clinicalOpsLanPushInFlight;
  clinicalOpsLanPushInFlight = pushClinicalOpsLanNowBody(opts).finally(function () {
    clinicalOpsLanPushInFlight = null;
  });
  return clinicalOpsLanPushInFlight;
}

/**
 * @param {{ requireMembership?: boolean }} [opts]
 */
async function pushClinicalOpsLanNowBody(opts) {
  await ensureLanSyncPushBridgeWired();
  if (isPitchPatientIsolationActive()) return lanPushResult(false, 'PITCH_DEMO');
  if (!isClinicalOpsLanAvailable()) {
    recordClinicalOpsTrace('push', { code: 'NO_CLINICAL_OPS', usersExported: 0 });
    return lanPushResult(false, 'NO_CLINICAL_OPS');
  }

  await prepareClinicalOpsForLanSync();
  var snap = getCachedClinicalOpsSnapshot();
  if (!snap) {
    recordClinicalOpsTrace('push', { code: 'NO_SNAPSHOT', usersExported: 0 });
    return lanPushResult(false, 'NO_SNAPSHOT');
  }

  var roomId = ensureEffectiveLiveSyncRoomId();
  if (!roomId) {
    recordClinicalOpsTrace('push', {
      code: 'NO_ROOM',
      usersExported: Array.isArray(snap.clinical_users) ? snap.clinical_users.length : 0,
    });
    return lanPushResult(false, 'NO_ROOM');
  }
  var b = bridge();
  if (!b.isLanSessionConfiguredForRest()) {
    recordClinicalOpsTrace('push', {
      roomId,
      code: 'NO_LAN',
      usersExported: Array.isArray(snap.clinical_users) ? snap.clinical_users.length : 0,
    });
    return lanPushResult(false, 'NO_LAN');
  }

  try {
    if (!lanClient.connected) lanClient.connectSyncChannel();
  } catch (_e) {}

  var envelope = await b.buildLiveSyncBundleEnvelope(roomId);
  envelope.clinicalOps = snap;

  var bases = getHostBundleBases(roomId);
  var putResult = false;
  try {
    putResult = await putClinicalOpsSnapshotToHost(roomId, snap, getLanClientId());
  } catch (_opsErr) {
    putResult = false;
  }
  var okHttp = putResult === true;
  var conflictHandled = putResult === CLINICAL_OPS_HANDLED;

  var pushedLive = sendLiveBundleIfOpen(roomId, envelope);
  b.saveLocalRoomSnapshot(roomId);
  if (typeof b.syncLiveSyncStatusChrome === 'function') b.syncLiveSyncStatusChrome();

  recordClinicalOpsTrace('push', {
    roomId,
    code: okHttp || pushedLive ? 'ok' : conflictHandled ? 'CONFLICT_RESOLVED' : 'QUEUED',
    usersExported: Array.isArray(snap.clinical_users) ? snap.clinical_users.length : 0,
    http: !!okHttp,
    live: pushedLive,
  });

  if (okHttp || pushedLive) {
    return lanPushResult(true, undefined, { http: !!okHttp, live: pushedLive });
  }
  if (conflictHandled) {
    return lanPushResult(true, 'CONFLICT_RESOLVED', { http: true });
  }
  await enqueueOutbox(roomId, {
    kind: 'clinical_ops',
    payload: {
      snapshot: snap,
      baseRevision: bases && bases.revision != null ? bases.revision : 0,
      clientId: getLanClientId(),
    },
  });
  return lanPushResult(true, 'QUEUED', { outbox: true });
}

function finishReconcilePhase(rid, b) {
  if (!rid) return;
  if (b && typeof b.applyRoomSyncPhaseAfterReconcile === 'function') {
    b.applyRoomSyncPhaseAfterReconcile(rid);
    if (typeof b.syncLiveSyncStatusChrome === 'function') b.syncLiveSyncStatusChrome();
    return;
  }
  void import('./room.mjs').then(function (mod) {
    if (typeof mod.applyRoomSyncPhaseAfterReconcile === 'function') {
      mod.applyRoomSyncPhaseAfterReconcile(rid);
    }
    if (typeof mod.syncLiveSyncStatusChrome === 'function') mod.syncLiveSyncStatusChrome();
  });
}

export async function reconcileLiveSyncRoom(roomId) {
  await ensureLanSyncPushBridgeWired();
  var rid = String(roomId || ensureEffectiveLiveSyncRoomId() || '').trim();
  if (!rid) return false;
  if (!activeLiveSyncRoomId) ensureEffectiveLiveSyncRoomId();
  var b;
  try {
    b = bridge();
    if (String(activeLiveSyncRoomId || '').trim() === rid) {
      if (getRoomSyncPhase(rid) !== RoomSyncPhase.live) {
        setRoomSyncPhase(rid, RoomSyncPhase.catching_up);
        if (typeof b.syncLiveSyncStatusChrome === 'function') b.syncLiveSyncStatusChrome();
      }
    }
    if (isClinicalOpsLanAvailable()) {
      await prepareClinicalOpsForLanSync();
    }
    var sources = [];
    var local = storage.getLanRoomSnapshot(rid);
    if (local) sources.push(local);
    var hostBundleLoaded = false;
    try {
      const syncPath = '/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/sync-bundle';
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const fetchMs = isMobileWeb()
        ? window.__RPC_MOBILE_SYNC_BUNDLE_DONE__
          ? 20000
          : 12000
        : 8000;
      const timer =
        ac &&
        setTimeout(() => {
          ac.abort();
        }, fetchMs);
      var resp = await lanClient.fetch(syncPath, ac ? { signal: ac.signal, cache: 'no-store' } : {});
      if (timer) clearTimeout(timer);
      if (resp && resp.status === 404) {
        recordLanSyncError({
          op: 'sync-bundle',
          code: 'NO_BUNDLE',
          message: 'host has no room bundle yet',
        });
        if (isMobileWeb() && typeof b.showToast === 'function') {
          b.showToast(
            'El anfitrión aún no compartió pacientes en esta sala. En la Mac anfitrión: abre ⇄ y pulsa «Unirse» en la misma sala; luego en el iPad ⇄ → Unirse otra vez.',
            'warn'
          );
        }
      } else if (resp && resp.ok) {
        var j = await resp.json();
        if (j && j.bundle) {
          setHostBundleBases(rid, j.bundle);
          sources.push(j.bundle);
          hostBundleLoaded = true;
          if (isMobileWeb()) window.__RPC_MOBILE_SYNC_BUNDLE_DONE__ = true;
        }
      }
    } catch (_eBundle) {}
    try {
      if (
        isClinicalOpsLanAvailable() &&
        typeof b.fetchAndApplyClinicalOpsFromHost === 'function'
      ) {
        await b.fetchAndApplyClinicalOpsFromHost(rid);
      }
    } catch (_eOps) {}
    sources.push(b.buildLiveSyncLocalMergeSource());
    if (sources.length) {
      var merged = mergeLiveSyncFullBundles(sources);
      b.applyLiveSyncMerged(merged);
      if (
        isMobileWeb() &&
        hostBundleLoaded &&
        (!merged || !merged.entries || !merged.entries.length) &&
        (!patients || !patients.length)
      ) {
        if (typeof b.showToast === 'function') {
          b.showToast(
            'La sala está vacía en el anfitrión. Confirma que la Mac anfitrión tiene pacientes y está unida a esta sala.',
            'info'
          );
        }
      }
    }
    return flushLiveSyncOutbox(rid);
  } catch (err) {
    recordLanSyncError({
      op: 'reconcile',
      code: 'RECONCILE',
      message: err && err.message ? err.message : 'reconcile failed',
    });
    return false;
  } finally {
    finishReconcilePhase(rid, b);
  }
}
