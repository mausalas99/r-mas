/**
 * Room DEK lifecycle for Nube E2EE.
 *
 * The wrap key comes from the user's Nube password, derived fresh each session —
 * we never persist the password itself. The unwrapped DEK is cached in memory for
 * this run of the app. It can also be restored from the durable Recuérdame store
 * (raw, no password needed) via hydrateRoomDeksFromPersistence — the caller owns
 * writing that store, this module only exports/imports the raw key material.
 */
import {
  generateDek,
  generateWrapSalt,
  deriveWrapKey,
  wrapDek,
  unwrapDek,
  exportDekRaw,
  importDekRaw,
} from './crypto.mjs';
import { auditDekEvent, DEK_EVENTS } from './cloud-sync-audit.mjs';

/** In-memory only — cleared on logout, never written to disk. */
let sessionPassword = '';
/** @type {Map<string, CryptoKey>} roomId -> unwrapped DEK, in-memory only. */
const dekByRoomId = new Map();

/** @param {string} password */
export function cacheSessionPassword(password) {
  sessionPassword = String(password || '');
}

export function clearSessionPassword() {
  sessionPassword = '';
}

/** Drops all cached DEKs and the session password — call on logout. */
export function clearRoomDekCache() {
  sessionPassword = '';
  dekByRoomId.clear();
}

/** @param {string} roomId @returns {CryptoKey | null} */
export function getCachedRoomDek(roomId) {
  return dekByRoomId.get(String(roomId || '')) || null;
}

/**
 * Call once, right after a room is created, while the login password is still cached.
 * Generates a fresh room DEK, wraps it with the current password, and stores the
 * wrapped blob server-side. The Worker only ever sees the wrapped (opaque) blob.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 */
export async function ensureRoomDek(api, roomId) {
  if (!sessionPassword) return null;
  try {
    const dek = await generateDek();
    const salt = generateWrapSalt();
    const wrapKey = await deriveWrapKey(sessionPassword, salt);
    const wrapped = await wrapDek(dek, wrapKey);
    await api.setRoomDek(roomId, { ct: wrapped.ct, iv: wrapped.iv, salt });
    dekByRoomId.set(String(roomId), dek);
    await auditDekEvent(DEK_EVENTS.DEK_CREATED, { roomId });
    await auditDekEvent(DEK_EVENTS.WRAP_PUT, { roomId });
    return dek;
  } catch (err) {
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, { roomId, phase: 'create', message: String(err?.message || err) });
    throw err;
  }
}

/**
 * Call after joining/reconnecting to a room, while the login password is cached.
 * Fetches the wrapped DEK and unwraps it locally. Returns null (not an error) for
 * a room that has no DEK yet — that room's content stays plaintext, unchanged.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 */
export async function loadRoomDek(api, roomId) {
  const cached = getCachedRoomDek(roomId);
  if (cached) return cached;
  if (!sessionPassword) return null;
  try {
    const { dek: wrapped } = await api.getRoomDek(roomId);
    if (!wrapped) return null;
    const wrapKey = await deriveWrapKey(sessionPassword, wrapped.salt);
    const dek = await unwrapDek({ ct: wrapped.ct, iv: wrapped.iv }, wrapKey);
    dekByRoomId.set(String(roomId), dek);
    await auditDekEvent(DEK_EVENTS.WRAP_GET, { roomId });
    return dek;
  } catch (err) {
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, { roomId, phase: 'load', message: String(err?.message || err) });
    return null;
  }
}

/**
 * Raw (unwrapped) DEKs for every cached room, base64, keyed by roomId — for
 * writing to the durable Recuérdame store only. Never sent to the server.
 * @returns {Promise<Record<string, string>>}
 */
export async function exportCachedDeksForPersistence() {
  const out = {};
  for (const [roomId, dek] of dekByRoomId) {
    out[roomId] = await exportDekRaw(dek);
  }
  return out;
}

/**
 * Restore cached DEKs from the durable Recuérdame store, no password needed.
 * Call once at app boot, before rendering a restored session. Skips rooms
 * already cached and silently drops entries that fail to import (corrupt file).
 * @param {Record<string, string> | null | undefined} deksByRoomId
 */
export async function hydrateRoomDeksFromPersistence(deksByRoomId) {
  if (!deksByRoomId) return;
  for (const [roomId, raw] of Object.entries(deksByRoomId)) {
    if (dekByRoomId.has(roomId) || !raw) continue;
    try {
      dekByRoomId.set(roomId, await importDekRaw(raw));
    } catch {
      /* corrupt entry — room falls back to loadRoomDek with the password */
    }
  }
}

/**
 * Re-wrap every currently-cached room DEK under a new password — call right after
 * a successful password change/recovery, while the new password is cached. Only
 * covers rooms whose DEK this device already holds unwrapped (an active session,
 * or one restored via hydrateRoomDeksFromPersistence); a password truly forgotten
 * with no cached DEK cannot be recovered — that key material never left the wrap.
 * Best-effort per room: only the room owner may set a DEK server-side, so a
 * rejection for a room the caller doesn't own is expected and skipped.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} newPassword
 */
export async function rewrapCachedRoomDeks(api, newPassword) {
  const password = String(newPassword || '');
  if (!password) return;
  for (const [roomId, dek] of dekByRoomId) {
    try {
      const salt = generateWrapSalt();
      const wrapKey = await deriveWrapKey(password, salt);
      const wrapped = await wrapDek(dek, wrapKey);
      await api.setRoomDek(roomId, { ct: wrapped.ct, iv: wrapped.iv, salt });
      await auditDekEvent(DEK_EVENTS.WRAP_PUT, { roomId, reason: 'password-recovery' });
    } catch (err) {
      await auditDekEvent(DEK_EVENTS.WRAP_FAILED, {
        roomId,
        phase: 'rewrap',
        message: String(err?.message || err),
      });
    }
  }
}
