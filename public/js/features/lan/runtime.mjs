/**
 * Shared mutable LAN / LiveSync runtime state (IM-11).
 */

import { LanClient } from '../../lan-client.mjs';

/** @type {import('../../lan-client.mjs').LanClient} */
export let lanClient = new LanClient();

export let activeLiveSyncRoomId = '';
export let activeLiveSyncRoomLabel = '';

export let liveSyncPushTimer = null;
export let liveSyncRevisionReconcileTimer = null;
export let liveSyncOutboxFlushTimer = null;

export const LIVE_SYNC_PUSH_DEBOUNCE_MS = 900;
export const LIVE_SYNC_OUTBOX_FLUSH_MS = 60000;

/**
 * @param {{ lanClient?: import('../../lan-client.mjs').LanClient }} [deps]
 */
export function initLanSyncRuntime(deps) {
  if (deps && deps.lanClient) {
    lanClient = deps.lanClient;
  }
}

export function getLanClient() {
  return lanClient;
}

export function getActiveLiveSyncRoomId() {
  return activeLiveSyncRoomId;
}

export function getActiveLiveSyncRoomLabel() {
  return activeLiveSyncRoomLabel;
}

/**
 * @param {string} roomId
 * @param {string} [label]
 */
export function setActiveLiveSyncRoom(roomId, label) {
  activeLiveSyncRoomId = String(roomId || '').trim();
  if (label !== undefined) {
    activeLiveSyncRoomLabel = String(label || '').trim();
  }
}

export function clearActiveLiveSyncRoom() {
  activeLiveSyncRoomId = '';
  activeLiveSyncRoomLabel = '';
}

export function getLiveSyncPushTimer() {
  return liveSyncPushTimer;
}

/** @param {ReturnType<typeof setTimeout> | null} timer */
export function setLiveSyncPushTimer(timer) {
  liveSyncPushTimer = timer;
}

export function getLiveSyncRevisionReconcileTimer() {
  return liveSyncRevisionReconcileTimer;
}

/** @param {ReturnType<typeof setTimeout> | null} timer */
export function setLiveSyncRevisionReconcileTimer(timer) {
  liveSyncRevisionReconcileTimer = timer;
}

export function getLiveSyncOutboxFlushTimer() {
  return liveSyncOutboxFlushTimer;
}

/** @param {ReturnType<typeof setInterval> | null} timer */
export function setLiveSyncOutboxFlushTimer(timer) {
  liveSyncOutboxFlushTimer = timer;
}

export function getLanClientId() {
  try {
    var id = localStorage.getItem('rpc-lan-client-id');
    if (id && String(id).trim()) return String(id).trim();
    var gen = 'lc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('rpc-lan-client-id', gen);
    return gen;
  } catch (_e) {
    return 'lc_anon';
  }
}
