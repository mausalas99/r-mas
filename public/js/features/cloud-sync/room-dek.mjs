/**
 * Room DEK lifecycle for Nube E2EE.
 *
 * The wrap key comes from the user's Nube password, derived fresh each session —
 * we never persist the password itself. The unwrapped DEK is cached in memory only
 * for this run of the app; it does not survive a restart yet (Recuérdame restores
 * the session token but not the password, so there is nothing to re-derive the wrap
 * key from). Re-entering the password once per app launch is the known gap until
 * the durable Recuérdame store is extended to also hold the unwrapped DEK.
 */
import { generateDek, generateWrapSalt, deriveWrapKey, wrapDek, unwrapDek } from './crypto.mjs';
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
