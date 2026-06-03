/**
 * LAN push when registering @usuario / saving clinical profile.
 */

import { getRoomMembership, setRoomMembership } from './live-sync-membership.mjs';
import { liveSyncRoomLabel, parseLanJoinQuery } from './lan-join-link.mjs';

export const LAN_USERNAME_REGISTER_REQUIRES_ROOM_MSG =
  'Antes de registrar @usuario: activa la sala en vivo (⇄) o únete con el enlace de invitación del turno.';

export const LAN_PROFILE_PUSH_FAILED_MSG =
  'Perfil guardado en esta Mac, pero no se pudo publicar a la sala. Revisa conexión ⇄ e intenta Guardar perfil de nuevo.';

/** Apply host/code/room from invite URL before username registration gate. */
export async function applyPendingLanInviteFromPage() {
  if (typeof window === 'undefined') return;
  const parsed = parseLanJoinQuery(window.location.search, window.location.origin);
  const hostUrl = String(parsed.hostUrl || '').trim();
  const teamCode = String(parsed.teamCode || '').trim();
  if (!hostUrl || !teamCode) return;

  const lan = await import('./features/lan-sync.mjs');
  if (typeof lan.persistLanClientConfig === 'function') {
    lan.persistLanClientConfig(hostUrl, teamCode);
  }
  const roomId = String(parsed.roomId || '').trim();
  if (roomId) {
    setRoomMembership({
      roomId,
      label: liveSyncRoomLabel(roomId) || roomId,
      joinedAt: new Date().toISOString(),
    });
  }
}

/**
 * When LAN host is configured, @usuario registration requires an active or remembered room.
 * @returns {Promise<{ allowed: boolean, lanConfigured: boolean, roomId?: string, code?: string }>}
 */
export async function assertLanRoomForUsernameRegister() {
  const lan = await import('./features/lan-sync.mjs');
  if (!lan.isLanSessionConfiguredForRest()) {
    return { allowed: true, lanConfigured: false };
  }
  const roomId =
    String(lan.getActiveLiveSyncRoomId() || '').trim() ||
    String(getRoomMembership()?.roomId || '').trim();
  if (!roomId) {
    return { allowed: false, lanConfigured: true, code: 'NO_ROOM' };
  }
  return { allowed: true, lanConfigured: true, roomId };
}

/**
 * Export clinical ops and push immediately to the LAN room (HTTP + live channel when connected).
 * @param {{ requireMembership?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, code?: string }>}
 */
export async function flushClinicalProfileToLan(opts = {}) {
  const lan = await import('./features/lan-sync.mjs');
  return lan.pushClinicalOpsLanNow(opts);
}
