/**
 * Resolve the user's active Nube room (server pointer + membership fallback).
 */
import { createCloudSyncApi } from '../cloud-sync/api-client.mjs';
import { loadRoomDek } from '../cloud-sync/room-dek.mjs';
import { getPatients } from '../../app-state.mjs';
import {
  getCloudSyncUrl,
  getCloudSyncToken,
  setCloudSyncRoomSnapshot,
  persistCloudMobilePairingFromRoom,
  readCloudMobileJoinUser,
  readCloudMobileJoinCode,
} from './session.mjs';

function createApi() {
  return createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken,
  });
}

/** @param {object[]} rooms */
export function pickBestCloudMobileRoom(rooms) {
  const list = Array.isArray(rooms) ? rooms.slice() : [];
  if (!list.length) return null;
  list.sort(function (a, b) {
    const rev = Number(b?.revision || 0) - Number(a?.revision || 0);
    if (rev !== 0) return rev;
    const bytes = Number(b?.storageBytes || 0) - Number(a?.storageBytes || 0);
    if (bytes !== 0) return bytes;
    return String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || ''));
  });
  return list[0] || null;
}

/**
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export async function joinCloudMobileRoomByCodeSilent(code) {
  const trimmed = String(code || '').trim();
  if (!trimmed || !getCloudSyncToken()) return null;
  const api = createApi();
  try {
    const data = await api.joinRoom({ code: trimmed });
    const room = data?.room || null;
    return applyResolvedRoom(room, api);
  } catch {
    return null;
  }
}

async function applyResolvedRoom(room, api) {
  if (!room?.id) return null;
  setCloudSyncRoomSnapshot(room);
  persistCloudMobilePairingFromRoom(room, readCloudMobileJoinUser());
  // Best-effort: an iPad session with no decryption key would show every
  // patient as empty, with no error — see the desktop join handler in
  // panel-conexion-handlers.mjs for the same load-after-join step.
  try {
    await loadRoomDek(api, room.id, room.code);
  } catch {
    /* patient identity still renders; clinical content stays locked */
  }
  return room;
}

/**
 * @param {ReturnType<typeof createCloudSyncApi>} [api]
 * @returns {Promise<object|null>}
 */
export async function resolveCloudMobileActiveRoom(api) {
  const client = api || createApi();
  if (!getCloudSyncToken()) return null;
  try {
    const data = await client.activeRoom();
    const active = data?.room || null;
    if (active?.id && Number(active.revision) > 0) {
      return await applyResolvedRoom(active, client);
    }
    const listed = await client.listRooms();
    const best = pickBestCloudMobileRoom(listed?.rooms);
    if (best?.id) return await applyResolvedRoom(best, client);
    if (active?.id) return await applyResolvedRoom(active, client);
  } catch {
    /* legacy fallback */
  }
  return joinCloudMobileRoomByCodeSilent(readCloudMobileJoinCode());
}

/** @param {(msg: string, kind?: string) => void} [toast] */
export async function notifyIfCloudMobileCensusEmpty(toast) {
  if (!getPatients()?.length) {
    toast?.(
      'Censo vacío en la nube. En Mac abre ⇄ → Conexión y confirma que la sala tenga pacientes sincronizados.',
      'info'
    );
  }
}

export function showCloudMobileEmptyCensusBanner() {
  if (getPatients()?.length) {
    const existing = document.getElementById('rpc-cloud-mobile-empty-census');
    if (existing) existing.hidden = true;
    return;
  }
  if (typeof document === 'undefined') return;
  let banner = document.getElementById('rpc-cloud-mobile-empty-census');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'rpc-cloud-mobile-empty-census';
    banner.className = 'rpc-cloud-mobile-empty-census';
    banner.setAttribute('role', 'status');
    document.body.appendChild(banner);
  }
  banner.textContent =
    'Sin pacientes en la nube. En el Mac del turno deja R+ abierto unos 20 s (misma cuenta ⇄) y recarga aquí.';
  banner.hidden = false;
}
