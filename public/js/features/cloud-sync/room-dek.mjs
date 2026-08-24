/**
 * Room DEK lifecycle for Nube E2EE.
 *
 * The wrap key comes from the room's own join code — not a personal login
 * password. Everyone who can join the room already knows the code, so unlocking
 * is automatic for every member: no per-member row, no device-to-device handoff.
 * See docs/superpowers/plans/2026-08-23-nube-e2ee-deploy.md Stage 0 item 1.
 *
 * The unwrapped DEK is cached in memory for this run of the app. It can also be
 * restored from the durable Recuérdame store (raw, no code needed) via
 * hydrateRoomDeksFromPersistence — the caller owns writing that store, this module
 * only exports/imports the raw key material.
 *
 * A separate admin rescue copy (see ensureAdminEscrow) is wrapped with the admin's
 * public key (asymmetric) for the case where the room code itself is lost and no
 * device has the DEK cached anymore — Stage 0 item 2.
 */
import {
  generateDek,
  generateWrapSalt,
  deriveWrapKey,
  wrapDek,
  unwrapDek,
  exportDekRaw,
  importDekRaw,
  importAdminPublicKey,
  wrapDekForAdmin,
} from './crypto.mjs';
import { auditDekEvent, DEK_EVENTS } from './cloud-sync-audit.mjs';

/**
 * Off until the Worker's NUBE_VERSION_GATE_ENABLED is on and fleet adoption
 * is confirmed via version-stats. While an old (pre-8.2.0) build can still
 * reach a room's push/pull endpoints, it can overwrite a field's ciphertext
 * with plaintext (last-writer-wins), corrupting the room for everyone —
 * not just failing to read it. Gates DEK *creation* only (room creation +
 * backfill); an already-existing DEK still loads and decrypts normally.
 * See docs/superpowers/plans/2026-08-23-nube-e2ee-deploy.md Stage 0.
 */
export const NUBE_E2EE_ENABLED = false;

/** @type {Map<string, CryptoKey>} roomId -> unwrapped DEK, in-memory only. */
const dekByRoomId = new Map();

/**
 * Rooms whose key we know (or strongly suspect) we cannot currently open —
 * a fetch/unwrap kept failing after retries. Content still gets pushed
 * (plaintext, fail-open — the doctor is never blocked), but the UI shows a
 * "sala no protegida" badge while a room is in this set. Cleared the moment
 * loadRoomDek succeeds again, including via a later retry.
 * @type {Set<string>}
 */
const unprotectedRooms = new Set();

/** Drops all cached DEKs — call on logout. */
export function clearRoomDekCache() {
  dekByRoomId.clear();
  unprotectedRooms.clear();
}

/** @param {string} roomId @returns {CryptoKey | null} */
export function getCachedRoomDek(roomId) {
  return dekByRoomId.get(String(roomId || '')) || null;
}

/** @param {string} roomId @returns {boolean} */
export function isRoomUnprotected(roomId) {
  return unprotectedRooms.has(String(roomId || ''));
}

const DEK_FETCH_RETRIES = 2;
const DEK_FETCH_RETRY_DELAY_MS = 800;

/**
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 */
async function fetchRoomDekWithRetry(api, roomId) {
  let lastErr;
  for (let attempt = 0; attempt <= DEK_FETCH_RETRIES; attempt += 1) {
    try {
      return await api.getRoomDek(roomId);
    } catch (err) {
      lastErr = err;
      if (attempt < DEK_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, DEK_FETCH_RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * Best-effort: hand a copy of the DEK to the admin rescue mechanism, wrapped with
 * the admin's public key. Safe to call even if the escrow already exists (the
 * server rejects the write with a conflict, which we swallow) or if this device
 * has no Electron admin-rescue-key bridge available (renders a no-op).
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @param {CryptoKey} dek
 */
async function ensureAdminEscrow(api, roomId, dek) {
  const bridge = globalThis.electronAPI?.adminRescueKeyGetPublicInfo;
  if (typeof bridge !== 'function') return;
  try {
    const info = await bridge();
    if (!info?.publicKeyB64 || !info?.keyId) return;
    const adminPublicKey = await importAdminPublicKey(info.publicKeyB64);
    const wrapped = await wrapDekForAdmin(dek, adminPublicKey);
    await api.setAdminRoomDek(roomId, { ...wrapped, keyId: info.keyId });
    await auditDekEvent(DEK_EVENTS.WRAP_PUT, { roomId, reason: 'admin-escrow' });
  } catch {
    // Already set by another device, or Keychain unavailable — not fatal to the
    // room's own DEK flow, which already succeeded by the time this runs.
  }
}

/**
 * Call once, right after a room is created. Generates a fresh room DEK, wraps it
 * with a key derived from the room's own join code, and stores the wrapped blob
 * server-side. Also creates the admin rescue copy. The Worker only ever sees
 * wrapped (opaque) blobs.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @param {string} roomCode
 */
export async function ensureRoomDek(api, roomId, roomCode) {
  if (!roomCode) return null;
  try {
    const dek = await generateDek();
    const salt = generateWrapSalt();
    const wrapKey = await deriveWrapKey(roomCode, salt);
    const wrapped = await wrapDek(dek, wrapKey);
    await api.setRoomDek(roomId, { ct: wrapped.ct, iv: wrapped.iv, salt });
    dekByRoomId.set(String(roomId), dek);
    await auditDekEvent(DEK_EVENTS.DEK_CREATED, { roomId });
    await auditDekEvent(DEK_EVENTS.WRAP_PUT, { roomId });
    await ensureAdminEscrow(api, roomId, dek);
    return dek;
  } catch (err) {
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, { roomId, phase: 'create', message: String(err?.message || err) });
    throw err;
  }
}

/**
 * Call after joining/reconnecting to a room, with the room's join code in hand.
 * Fetches the wrapped DEK and unwraps it locally. Returns null (not an error) for
 * a room that has no DEK yet — that room's content stays plaintext, unchanged.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @param {string} roomCode
 */
export async function loadRoomDek(api, roomId, roomCode) {
  const cached = getCachedRoomDek(roomId);
  if (cached) return cached;
  if (!roomCode) return null;

  let wrapped;
  try {
    ({ dek: wrapped } = await fetchRoomDekWithRetry(api, roomId));
  } catch (err) {
    // Fetch never succeeded even after retries — we don't know whether this room
    // has a DEK, so we can't rule out that it does. Flag it rather than assume fine.
    unprotectedRooms.add(String(roomId));
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, { roomId, phase: 'load-fetch', message: String(err?.message || err) });
    return null;
  }
  if (!wrapped) {
    unprotectedRooms.delete(String(roomId)); // room genuinely has no DEK yet — fine, not a failure
    return null;
  }
  try {
    const wrapKey = await deriveWrapKey(roomCode, wrapped.salt);
    const dek = await unwrapDek({ ct: wrapped.ct, iv: wrapped.iv }, wrapKey);
    dekByRoomId.set(String(roomId), dek);
    unprotectedRooms.delete(String(roomId));
    await auditDekEvent(DEK_EVENTS.WRAP_GET, { roomId });
    return dek;
  } catch (err) {
    unprotectedRooms.add(String(roomId));
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, { roomId, phase: 'load', message: String(err?.message || err) });
    return null;
  }
}

/**
 * Called opportunistically (e.g. on every status-chip render) while a room is
 * flagged unprotected — re-attempts the fetch and clears the flag on success,
 * without the caller needing its own retry/backoff loop.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @param {string} roomCode
 */
export async function retryRoomDekIfUnprotected(api, roomId, roomCode) {
  if (!isRoomUnprotected(roomId)) return;
  await loadRoomDek(api, roomId, roomCode).catch(() => {});
}

/**
 * Re-wrap a room's DEK under a NEW join code — call right after the room code is
 * rotated (admin action), while this device still holds the DEK unwrapped under
 * the old code. Devices that haven't reconnected since the rotation keep working
 * off their in-memory cache; the next time they call loadRoomDek with a code that
 * no longer matches, they'll need the new code (same as any other room rejoin).
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @param {string} roomId
 * @param {string} newRoomCode
 */
export async function rewrapRoomDekForNewCode(api, roomId, newRoomCode) {
  const dek = getCachedRoomDek(roomId);
  if (!dek || !newRoomCode) return;
  try {
    const salt = generateWrapSalt();
    const wrapKey = await deriveWrapKey(newRoomCode, salt);
    const wrapped = await wrapDek(dek, wrapKey);
    await api.rotateRoomDek(roomId, { ct: wrapped.ct, iv: wrapped.iv, salt });
    await auditDekEvent(DEK_EVENTS.WRAP_PUT, { roomId, reason: 'code-rotated' });
  } catch (err) {
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, { roomId, phase: 'rotate', message: String(err?.message || err) });
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
 * Restore cached DEKs from the durable Recuérdame store, no code needed.
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
      /* corrupt entry — room falls back to loadRoomDek with the room code */
    }
  }
}
