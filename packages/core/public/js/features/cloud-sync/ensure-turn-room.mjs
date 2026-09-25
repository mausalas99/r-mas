import { isCloudSala, normalizeCloudSala } from './sala-allowlist.mjs';
import { setCloudRoomConnected } from './nube-sync-policy.mjs';
import { loadRoomDek, exportCachedDeksForPersistence, getCachedRoomDek } from './room-dek.mjs';

/**
 * Every connect to a turn room must have its DEK loaded — otherwise this device
 * silently applies the room's encrypted fields as empty (see MISTAKES.md 2026-09-17).
 * `loadRoomDek` returns the cached key instantly when already loaded, so this is
 * safe to call on every reconnect, not just the first join. Never blocks or throws
 * into the connect flow — a failed fetch just leaves the room flagged unprotected.
 *
 * The sync runtime's own first pull on connect fires immediately, racing this
 * fetch — on a device that has never had this room's key before, that first
 * pull can land before the key does and silently drop real data as ciphertext.
 * Only when this call is the one that fetched the key for the first time on
 * this device (not just returning an already-cached key) does it nudge the
 * runtime to re-pull right away, instead of waiting out the next scheduled
 * poll — a cheap, one-time correction, not a recurring extra request.
 * @param {object} deps @param {object} room
 */
function loadDekAfterTurnConnect(deps, room) {
  if (!deps.api?.getRoomDek || !room?.id) return;
  const hadDekAlready = !!getCachedRoomDek(room.id);
  void loadRoomDek(deps.api, room.id, room.code)
    .then(async (dek) => {
      const { setStoredRoomDeks } = await import('./settings.mjs');
      setStoredRoomDeks(await exportCachedDeksForPersistence());
      if (dek && !hadDekAlready) {
        const { nudgeCloudSyncRuntime } = await import('./sync-runtime.mjs');
        nudgeCloudSyncRuntime();
      }
    })
    .catch(() => {});
}

/** @param {object} deps @param {object} room */
function applyEnsureTurnSuccess(deps, room) {
  if (typeof deps.setCloudSyncRoomSnapshot === 'function') {
    deps.setCloudSyncRoomSnapshot(room);
  } else {
    deps.setCloudSyncRoomId(String(room.id));
    deps.setCloudSyncRevision(Number(room.revision) || 0);
  }
  loadDekAfterTurnConnect(deps, room);
  setCloudRoomConnected(true);
  deps.onConnected?.(room);
  deps.startSyncRuntime?.();
  deps.toast?.('Sala nube lista', 'success');
}


/**
 * @param {{
 *   api: { ensureTurn: (body: { sala: string }) => Promise<{ room: object }> },
 *   getSala: () => string,
 *   getToken: () => string,
 *   setCloudSyncRoomId: (id: string) => void,
 *   setCloudSyncRevision: (revision: number) => void,
 *   onConnected?: (room: object) => void,
 *   startSyncRuntime?: () => void,
 *   toast?: (msg: string, kind?: string) => void,
 * }} deps
 * @returns {Promise<object | null>}
 */
export async function ensureTurnRoom(deps) {
  const sala = normalizeCloudSala(deps.getSala());
  if (!isCloudSala(sala)) return null;
  if (!deps.getToken()) return null;

  try {
    const data = await deps.api.ensureTurn({ sala });
    const room = data?.room;
    if (!room?.id) throw new Error('Respuesta inválida del servidor.');
    applyEnsureTurnSuccess(deps, room);
    return room;
  } catch (err) {
    deps.toast?.(
      err?.data?.message || err?.message || 'No se pudo preparar la sala nube.',
      'error'
    );
    return null;
  }
}

/** Dynamic-import helper after Mi rotación team join. */
export async function ensureTurnRoomAfterTeamJoin(toast) {
  const [settings, { createCloudSyncApi }] = await Promise.all([
    import('./settings.mjs'),
    import('./api-client.mjs'),
  ]);
  const api = createCloudSyncApi({
    getBaseUrl: settings.getCloudSyncUrl,
    getToken: settings.getCloudSyncToken,
  });
  const { getUserSala } = await import('./panel-clinical-context.mjs');
  return ensureTurnRoom({
    api,
    getSala: getUserSala,
    getToken: settings.getCloudSyncToken,
    setCloudSyncRoomId: settings.setCloudSyncRoomId,
    setCloudSyncRoomSnapshot: settings.setCloudSyncRoomSnapshot,
    setCloudSyncRevision: settings.setCloudSyncRevision,
    toast,
  });
}
