import {
  getCloudSyncUrl,
  getCloudSyncToken,
  setCloudSyncToken,
  getCloudSyncRoomId,
  setCloudSyncRoomId,
  getCloudSyncRevision,
  setCloudSyncRevision,
  setCloudSyncRoomSnapshot,
  getCloudSyncRoomSnapshot,
  clearCloudSyncSession,
  setCloudSyncRemember,
} from '../cloud-sync/settings.mjs';
import { parseCloudMobileInviteSearch, buildCloudMobileJoinUrl } from './invite-url.mjs';

/** Durable PWA pairing — survives Add to Home Screen (same idea as rpc-lan-config). */
export const CLOUD_MOBILE_PAIRING_KEY = 'rpc-cloud-mobile-pairing';

const JOIN_CODE_KEY = 'rpc-cloud-mobile-join-code';
const JOIN_SALA_KEY = 'rpc-cloud-mobile-join-sala';
const JOIN_USER_KEY = 'rpc-cloud-mobile-join-user';

/** Permanent iPad sign-in (survives Safari / Add to Home Screen). */
export function setCloudMobileToken(token) {
  setCloudSyncToken(token, { remember: true });
}

/**
 * @returns {{
 *   auth: string,
 *   room: string,
 *   roomId: string,
 *   sala: string,
 *   user: string,
 * } | null}
 */
export function readCloudMobilePairing() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CLOUD_MOBILE_PAIRING_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    return {
      auth: String(o.auth || '').trim(),
      room: String(o.room || '').trim(),
      roomId: String(o.roomId || '').trim(),
      sala: String(o.sala || '').trim(),
      user: String(o.user || '').trim().replace(/^@+/, ''),
    };
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   auth?: string,
 *   room?: string,
 *   roomId?: string,
 *   sala?: string,
 *   user?: string,
 * } | null | undefined} next
 * @param {NonNullable<ReturnType<typeof readCloudMobilePairing>>} prev
 */
function mergeCloudMobilePairing(next, prev) {
  return {
    auth: String(next.auth || prev.auth || '').trim(),
    room: String(next.room || prev.room || '').trim(),
    roomId: String(next.roomId || prev.roomId || '').trim(),
    sala: String(next.sala || prev.sala || '').trim(),
    user: String(next.user || prev.user || '')
      .trim()
      .replace(/^@+/, ''),
  };
}

/**
 * @param {{
 *   auth?: string,
 *   room?: string,
 *   roomId?: string,
 *   sala?: string,
 *   user?: string,
 * } | null | undefined} next
 */
export function persistCloudMobilePairing(next) {
  if (typeof localStorage === 'undefined' || !next) return false;
  try {
    const prev = readCloudMobilePairing() || {
      auth: '',
      room: '',
      roomId: '',
      sala: '',
      user: '',
    };
    const merged = mergeCloudMobilePairing(next, prev);
    if (!merged.auth && !merged.user) return false;
    localStorage.setItem(CLOUD_MOBILE_PAIRING_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}

export function clearCloudMobilePairing() {
  try {
    localStorage.removeItem(CLOUD_MOBILE_PAIRING_KEY);
  } catch {
    /* ignore */
  }
}

export function readCloudMobileJoinCode() {
  try {
    const fromSession = String(sessionStorage.getItem(JOIN_CODE_KEY) || '').trim();
    if (fromSession) return fromSession;
    return String(readCloudMobilePairing()?.room || '').trim();
  } catch {
    return '';
  }
}

export function readCloudMobileJoinSala() {
  try {
    const fromSession = String(sessionStorage.getItem(JOIN_SALA_KEY) || '').trim();
    if (fromSession) return fromSession;
    return String(readCloudMobilePairing()?.sala || '').trim();
  } catch {
    return '';
  }
}

export function readCloudMobileJoinUser() {
  try {
    const fromSession = String(sessionStorage.getItem(JOIN_USER_KEY) || '').trim();
    if (fromSession) return fromSession;
    return String(readCloudMobilePairing()?.user || '').trim();
  } catch {
    return '';
  }
}

/** @param {{ room?: string, sala?: string, user?: string }} hints */
export function writeCloudMobileJoinHints(hints) {
  try {
    const room = String(hints?.room || '').trim();
    const sala = String(hints?.sala || '').trim();
    const user = String(hints?.user || '').trim().replace(/^@+/, '');
    if (room) sessionStorage.setItem(JOIN_CODE_KEY, room);
    if (sala) sessionStorage.setItem(JOIN_SALA_KEY, sala);
    if (user) sessionStorage.setItem(JOIN_USER_KEY, user);
  } catch {
    /* ignore */
  }
}

export function clearCloudMobileJoinHints() {
  try {
    sessionStorage.removeItem(JOIN_CODE_KEY);
    sessionStorage.removeItem(JOIN_SALA_KEY);
    sessionStorage.removeItem(JOIN_USER_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Apply invite query (auth + room) into durable mobile session + PWA pairing blob.
 * @param {string} [search]
 * @returns {{ room: string, sala: string, auth: string, user: string, appliedAuth: boolean }}
 */
export function applyCloudMobileInviteSearch(search) {
  const invite = parseCloudMobileInviteSearch(search);
  writeCloudMobileJoinHints(invite);
  let appliedAuth = false;
  if (invite.auth) {
    setCloudMobileToken(invite.auth);
    appliedAuth = true;
  }
  if (invite.auth || invite.room) {
    persistCloudMobilePairing({
      auth: invite.auth || undefined,
      room: invite.room || undefined,
      sala: invite.sala || undefined,
      user: invite.user || undefined,
    });
  }
  return { ...invite, appliedAuth };
}

/**
 * Restore pairing after Add to Home Screen (manifest start_url has no query).
 * @returns {boolean} true if auth and/or room were restored
 */
export function restoreCloudMobilePairingFromStorage() {
  const pairing = readCloudMobilePairing();
  if (!pairing) return false;
  let applied = false;

  if (pairing.auth && !getCloudSyncToken()) {
    setCloudMobileToken(pairing.auth);
    applied = true;
  } else if (pairing.auth) {
    setCloudSyncRemember(true);
  }

  writeCloudMobileJoinHints({
    room: pairing.room,
    sala: pairing.sala,
    user: pairing.user,
  });
  if (pairing.room) applied = true;

  if (pairing.roomId && !getCloudSyncRoomId()) {
    setCloudSyncRoomSnapshot({
      id: pairing.roomId,
      code: pairing.room,
      sala: pairing.sala,
    });
    applied = true;
  }

  return applied;
}

/**
 * After successful room join — update durable pairing for home-screen relaunch.
 * @param {{ id?: string, code?: string, sala?: string }} room
 * @param {string} [user]
 */
export function persistCloudMobilePairingFromRoom(room, user) {
  if (!room?.code) return;
  persistCloudMobilePairing({
    auth: getCloudSyncToken() || undefined,
    room: room.code,
    roomId: room.id,
    sala: room.sala,
    user: user || readCloudMobileJoinUser(),
  });
}

/**
 * Permanent homescreen URL (auth + room), LAN-style `/mobile/?…`.
 * @param {{ baseUrl: string, roomCode: string, sala?: string, user?: string, auth?: string }} opts
 */
export function buildPersistedCloudMobileUrl(opts) {
  return buildCloudMobileJoinUrl(opts);
}

export {
  getCloudSyncUrl,
  getCloudSyncToken,
  getCloudSyncRoomId,
  setCloudSyncRoomId,
  getCloudSyncRevision,
  setCloudSyncRevision,
  setCloudSyncRoomSnapshot,
  getCloudSyncRoomSnapshot,
  clearCloudSyncSession,
};
