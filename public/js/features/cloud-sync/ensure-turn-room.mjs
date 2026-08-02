import { isCloudSala, normalizeCloudSala } from './sala-allowlist.mjs';
import { setCloudRoomConnected } from './lan-override.mjs';

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
    if (!room?.id) {
      throw new Error('Respuesta inválida del servidor.');
    }
    deps.setCloudSyncRoomId(String(room.id));
    deps.setCloudSyncRevision(Number(room.revision) || 0);
    setCloudRoomConnected(true);
    deps.onConnected?.(room);
    deps.startSyncRuntime?.();
    deps.toast?.('Sala nube lista', 'success');
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
  const { getUserSala } = await import('../lan/panel-clinical-context.mjs');
  return ensureTurnRoom({
    api,
    getSala: getUserSala,
    getToken: settings.getCloudSyncToken,
    setCloudSyncRoomId: settings.setCloudSyncRoomId,
    setCloudSyncRevision: settings.setCloudSyncRevision,
    toast,
  });
}
