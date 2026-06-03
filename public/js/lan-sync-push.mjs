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
import { recordLanSyncError } from './lan-sync-diagnostics.mjs';
import { clearRoomBundleDrafts } from './draft-conflict-store.mjs';
import {
  pauseBundlePushForRoom,
  isBundlePushPaused,
  bundleConflictsAreClinicalOpsOnly,
} from './lan-sync-bundle-push.mjs';

/** Bundle / clinical-ops 409 resolved locally — do not re-enqueue the same payload. */
var BUNDLE_PUSH_HANDLED = 'handled';
var CLINICAL_OPS_HANDLED = 'handled';
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

function finishBundle409Locally(rid, b, opts) {
  opts = opts || {};
  pauseBundlePushForRoom(rid, 45000);
  scheduleReconcileFromRevisionHint(rid);
  if (opts.toast === 'clinicalOps' && typeof b.showToast === 'function') {
    b.showToast(
      'Sala alineada con el servidor (clinicalOps). Los reintentos automáticos se pausaron un momento.',
      'info'
    );
  } else if (opts.toast === 'draft' && typeof b.showToast === 'function') {
    b.showToast(
      'Conflicto al sincronizar la sala. Abre ⇄ → Borradores de conflicto.',
      'warn'
    );
  } else if (typeof b.markDeferredConflictToastShown === 'function') {
    b.markDeferredConflictToastShown();
  }
  if (typeof b.applyRoomSyncPhaseAfterReconcile === 'function') {
    b.applyRoomSyncPhaseAfterReconcile(rid);
  }
  if (typeof b.syncLiveSyncStatusChrome === 'function') {
    b.syncLiveSyncStatusChrome();
  }
  return BUNDLE_PUSH_HANDLED;
}

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
  if (typeof b.acceptServerClinicalOpsConflict === 'function') {
    b.acceptServerClinicalOpsConflict(rid, opsBody.snapshot, opsBody.revision);
  }
  pauseBundlePushForRoom(rid, 45000);
  if (typeof b.syncLiveSyncStatusChrome === 'function') {
    b.syncLiveSyncStatusChrome();
  }
  return CLINICAL_OPS_HANDLED;
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
        if (serverRev > 0 && localRev !== serverRev) {
          if (typeof b.acceptServerClinicalOpsConflict === 'function') {
            b.acceptServerClinicalOpsConflict(rid, body.snapshot, serverRev);
          } else {
            setHostBundleBases(rid, {
              revision: serverRev,
              entityVersions: bases.entityVersions || {},
            });
          }
        }
      });
    })
    .catch(function () {});
}

/**
 * @param {string} roomId
 * @param {{ snapshot: object, baseRevision?: number, clientId?: string }} payload
 */
function pushClinicalOpsPayloadToHost(roomId, payload) {
  var rid = String(roomId || '').trim();
  var snap = payload && payload.snapshot;
  if (!rid || !snap) return Promise.resolve(false);
  var b = bridge();
  if (typeof b.isLanSessionConfiguredForRest !== 'function' || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve(false);
  }
  return ensureClinicalOpsPushRevision(rid).then(function () {
    var bases = getHostBundleBases(rid);
    return lanClient
      .fetch('/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/clinical-ops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot: snap,
          baseRevision: bases && bases.revision != null ? bases.revision : 0,
          clientId: payload.clientId || getLanClientId(),
        }),
      })
      .then(function (resp) {
        if (!resp) return false;
        if (resp.status === 409) {
          return resp
            .json()
            .then(function (body) {
              return resolveClinicalOps409(rid, b, body);
            })
            .catch(function () {
              return resolveClinicalOps409(rid, b, {});
            });
        }
        if (!resp.ok) return false;
        return resp.json().then(function (body) {
          if (body && body.revision != null) {
            var prev = bases || {};
            setHostBundleBases(rid, {
              revision: body.revision,
              entityVersions: prev.entityVersions || {},
            });
            emitLiveSyncRevisionHint(rid, body.revision);
          }
          return true;
        });
      })
      .catch(function () {
        return false;
      });
  });
}

export function pushRoomSyncBundleToHost(roomId, envelope) {
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
          if (typeof b.isLanConflictViewerSuppressed === 'function' && b.isLanConflictViewerSuppressed()) {
            enqueueOutbox(rid, { kind: 'bundle', payload: envelope });
            return finishBundle409Locally(rid, b, {});
          }
          var conflicts = body && Array.isArray(body.conflicts) ? body.conflicts : [];
          var conflictKeys = conflicts.map(function (c) {
            return c && c.key ? String(c.key) : '';
          }).filter(Boolean);
          var bundleConflictKeys = conflictKeys.length ? conflictKeys : ['*'];
          var serverBundle = body && body.bundle ? body.bundle : null;
          if (
            serverBundle &&
            typeof b.acceptServerBundleConflict === 'function' &&
            bundleConflictsAreClinicalOpsOnly(conflicts)
          ) {
            var accepted = b.acceptServerBundleConflict({
              roomId: rid,
              serverBundle: serverBundle,
              conflicts: conflicts,
            });
            if (accepted) {
              return finishBundle409Locally(rid, b, { toast: 'clinicalOps' });
            }
          }
          recordLanSyncError({
            op: 'sync-bundle',
            code: '409',
            message: 'Conflicto de bundle de sala',
          });
          return clearRoomBundleDrafts(rid)
            .catch(function () {
              return 0;
            })
            .then(function () {
              return b.saveDraftConflict({
                scope: 'room:' + rid,
                entityType: 'roomBundle',
                transport: 'http',
                roomId: rid,
                conflictingKeys: bundleConflictKeys,
                localRevision:
                  envelope && envelope.revision != null ? envelope.revision : null,
                serverRevision:
                  serverBundle && serverBundle.revision != null ? serverBundle.revision : null,
              });
            })
            .then(function () {
              return finishBundle409Locally(rid, b, { toast: 'draft' });
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

    function pushOutboxItem(item) {
      if (!item || !item.payload) return Promise.resolve(true);
      if (item.kind === 'clinical_ops') {
        return pushClinicalOpsPayloadToHost(rid, item.payload);
      }
      if (item.kind === 'bundle') {
        return pushRoomSyncBundleToHost(rid, item.payload);
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

  await ensureClinicalOpsPushRevision(roomId);
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
    } else if (opsResp && opsResp.status === 409) {
      var conflictBody = {};
      try {
        conflictBody = await opsResp.json();
      } catch (_e409) {}
      resolveClinicalOps409(roomId, b, conflictBody);
      return lanPushResult(true, 'CONFLICT_RESOLVED', { http: true });
    } else {
      okHttp = false;
    }
  } catch (_opsErr) {
    okHttp = false;
  }

  var pushedLive = sendLiveBundleIfOpen(roomId, envelope);
  b.saveLocalRoomSnapshot(roomId);
  if (typeof b.syncLiveSyncStatusChrome === 'function') b.syncLiveSyncStatusChrome();

  if (okHttp || pushedLive) {
    return lanPushResult(true, undefined, { http: !!okHttp, live: pushedLive });
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

export async function reconcileLiveSyncRoom(roomId) {
  var b = bridge();
  var rid = String(roomId || ensureEffectiveLiveSyncRoomId() || '').trim();
  if (!rid) return false;
  if (!activeLiveSyncRoomId) ensureEffectiveLiveSyncRoomId();
  if (String(activeLiveSyncRoomId || '').trim() === rid) {
    setRoomSyncPhase(rid, RoomSyncPhase.catching_up);
    if (typeof b.syncLiveSyncStatusChrome === 'function') b.syncLiveSyncStatusChrome();
  }
  try {
    if (isClinicalOpsLanAvailable()) {
      await prepareClinicalOpsForLanSync();
    }
    var sources = [];
    var local = storage.getLanRoomSnapshot(rid);
    if (local) sources.push(local);
    sources.push(b.buildLiveSyncLocalMergeSource());
    try {
      const syncPath = '/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/sync-bundle';
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
          setHostBundleBases(rid, j.bundle);
          sources.push(j.bundle);
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
    if (sources.length) {
      b.applyLiveSyncMerged(mergeLiveSyncFullBundles(sources));
    }
    return flushLiveSyncOutbox(rid);
  } finally {
    if (typeof b.applyRoomSyncPhaseAfterReconcile === 'function') {
      b.applyRoomSyncPhaseAfterReconcile(rid);
    }
    if (typeof b.syncLiveSyncStatusChrome === 'function') b.syncLiveSyncStatusChrome();
  }
}
