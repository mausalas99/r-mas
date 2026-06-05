/**
 * LAN push when registering @usuario / saving clinical profile.
 */

import { clinicalSessionContext } from './clinical-access-runtime.mjs';
import { getRoomMembership, setRoomMembership } from './live-sync-membership.mjs';
import { liveSyncRoomLabel, parseLanJoinQuery, resolveLiveSyncRoomIdFromSala } from './lan-join-link.mjs';

/** @deprecated Registration no longer requires ⇄; kept for tests / copy references. */
export const LAN_USERNAME_REGISTER_REQUIRES_ROOM_MSG =
  'Sin sala ⇄ activa el perfil queda solo en esta Mac hasta que te unas o vuelva la red.';

export const LAN_PROFILE_PUSH_FAILED_MSG =
  'Perfil guardado en esta Mac, pero no se pudo publicar a la sala. Revisa conexión ⇄ e intenta Guardar perfil de nuevo.';

/** LAN push codes that are expected offline / sin sala — no toast de error. */
export function isBenignLanPushSkipCode(code) {
  const c = String(code || '');
  return c === 'NO_LAN' || c === 'NO_ROOM' || c === 'NO_CLINICAL_OPS' || c === 'PITCH_DEMO';
}

/** @param {string} roomId @param {string} [label] */
export function rememberLiveSyncRoomMembership(roomId, label) {
  const id = String(roomId || '').trim();
  if (!id) return false;
  setRoomMembership({
    roomId: id,
    label: String(label || '').trim() || liveSyncRoomLabel(id) || id,
    joinedAt: new Date().toISOString(),
  });
  return true;
}

/**
 * @param {{ roomId?: string, sala?: string }} [opts]
 * @returns {string}
 */
export function resolveRoomIdForUsernameRegister(opts = {}) {
  const explicit = String(opts.roomId || '').trim();
  if (explicit) return explicit;
  const fromSala = resolveLiveSyncRoomIdFromSala(opts.sala);
  if (fromSala) return fromSala;

  try {
    const mem = getRoomMembership();
    const fromMem = String(mem?.roomId || '').trim();
    if (fromMem) return fromMem;
  } catch (_e) {
    /* ignore */
  }

  if (typeof location !== 'undefined') {
    const parsed = parseLanJoinQuery(location.search, location.origin);
    const fromUrl = String(parsed.roomId || '').trim();
    if (fromUrl) return fromUrl;
  }

  try {
    const settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    const fromSettings = resolveLiveSyncRoomIdFromSala(settings.clinicalSala);
    if (fromSettings) return fromSettings;
  } catch (_e2) {
    /* ignore */
  }

  return resolveLiveSyncRoomIdFromSala(clinicalSessionContext.user?.sala);
}

/**
 * Maps clinical Sala / invite / membership to LiveSync room before @usuario gate.
 * @param {{ roomId?: string, sala?: string, joinLive?: boolean }} [opts]
 */
export async function ensureLiveSyncRoomForUsernameRegister(opts = {}) {
  const lan = await import('./features/lan-sync.mjs');
  if (!lan.isLanSessionConfiguredForRest()) {
    return { roomId: '', lanConfigured: false };
  }

  let roomId = resolveRoomIdForUsernameRegister(opts);
  if (!roomId) {
    const active = String(lan.getActiveLiveSyncRoomId?.() || '').trim();
    if (active) roomId = active;
  }
  if (!roomId) {
    return { roomId: '', lanConfigured: true };
  }

  rememberLiveSyncRoomMembership(roomId);

  if (opts.joinLive !== false && typeof lan.joinLanRoom === 'function') {
    try {
      lan.joinLanRoom(roomId, liveSyncRoomLabel(roomId));
    } catch (_e) {
      /* membership alone satisfies registration gate */
    }
  }

  return { roomId, lanConfigured: true };
}

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
    rememberLiveSyncRoomMembership(roomId);
  }
}

/**
 * Best-effort LAN context before @usuario (invite URL, sala → membership). Never blocks registration.
 * @param {{ roomId?: string, sala?: string, joinLive?: boolean }} [opts]
 * @returns {Promise<{ allowed: boolean, lanConfigured: boolean, roomId?: string, code?: string }>}
 */
export async function assertLanRoomForUsernameRegister(opts = {}) {
  const lan = await import('./features/lan-sync.mjs');
  const lanConfigured = !!lan.isLanSessionConfiguredForRest?.();

  await applyPendingLanInviteFromPage();
  const ensured = await ensureLiveSyncRoomForUsernameRegister({
    ...opts,
    joinLive: opts.joinLive === true,
  });

  const roomId =
    String(lan.getActiveLiveSyncRoomId?.() || '').trim() ||
    String(ensured.roomId || '').trim() ||
    String(getRoomMembership()?.roomId || '').trim();

  return {
    allowed: true,
    lanConfigured,
    roomId: roomId || undefined,
    code: roomId ? undefined : lanConfigured ? 'NO_ROOM' : undefined,
  };
}

/**
 * Export clinical ops and push immediately to the LAN room (HTTP + live channel when connected).
 * @param {{ requireMembership?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, code?: string }>}
 */
export async function flushClinicalProfileToLan(opts = {}) {
  const { isClinicalLocalOnlyMode } = await import('./clinical-settings.mjs');
  if (isClinicalLocalOnlyMode()) return { ok: false, code: 'NO_LAN' };

  await applyPendingLanInviteFromPage();

  const roomId = resolveRoomIdForUsernameRegister({
    roomId: opts.roomId,
    sala: opts.sala,
  });
  if (roomId) {
    rememberLiveSyncRoomMembership(roomId, liveSyncRoomLabel(roomId));
  }

  const lan = await import('./features/lan-sync.mjs');
  if (!lan.isLanSessionConfiguredForRest?.()) {
    return { ok: false, code: 'NO_LAN' };
  }

  const pushMod = await import('./features/lan/push.mjs');
  const effectiveRoom = pushMod.ensureEffectiveLiveSyncRoomId();
  if (!effectiveRoom) {
    return { ok: false, code: 'NO_ROOM' };
  }

  try {
    const { lanClient } = await import('./lan-client.mjs');
    if (lanClient && !lanClient.connected) lanClient.connectSyncChannel();
  } catch (_e) {
    /* HTTP push still works when sync channel is down */
  }

  return lan.pushClinicalOpsLanNow(opts);
}

/**
 * @param {{ ok?: boolean, code?: string, channels?: { outbox?: boolean } }} lanPush
 * @param {(msg: string, kind: string) => void} showToast
 */
export function notifyLanProfilePushResult(lanPush, showToast) {
  if (!lanPush || lanPush.ok || typeof showToast !== 'function') return;
  if (isBenignLanPushSkipCode(lanPush.code)) return;
  if (lanPush.channels && lanPush.channels.outbox) {
    showToast('Perfil guardado en esta Mac; se publicará al reconectar.', 'info');
  }
}
