/**
 * Reset LAN turn connection (split-brain recovery): leave room, clear pinned host,
 * stop using this Mac as REST host, reconnect via PIN or invite.
 */
import { storage } from './storage.js';
import { clearPinnedHostUrl } from './lan-host-pin.mjs';
import { clearWardHostRegistry as clearLocalWardHostRegistry } from './lan-ward-host-registry.mjs';

export const LAN_TURN_RESET_CLIENT_CONFIRM =
  'Saldrás de la sala ⇄, se quitará el anfitrión fijado y esta Mac dejará de actuar como servidor del turno. Tu base clínica y equipos no se borran. Después ingresa el PIN del R4 o pega el enlace de invitación. ¿Restablecer?';

const SPLIT_BRAIN_HINT_KEY = 'rpc-lan-split-brain-hint-shown';

/**
 * @param {{ leaveLiveSyncRoom: (opts?: object) => void, lanClient: { disconnect?: () => void } }} deps
 */
export async function performLanTurnClientReset(deps) {
  if (typeof deps.leaveLiveSyncRoom === 'function') {
    deps.leaveLiveSyncRoom({ silentLeave: true });
  }
  clearPinnedHostUrl();
  clearLocalWardHostRegistry();
  if (typeof storage.saveLanUiRole === 'function') storage.saveLanUiRole('client');
  if (typeof storage.saveLanConfig === 'function') storage.saveLanConfig(null);
  try {
    if (deps.lanClient && typeof deps.lanClient.disconnect === 'function') {
      deps.lanClient.disconnect();
    }
  } catch (_disc) {}
  try {
    sessionStorage.removeItem(SPLIT_BRAIN_HINT_KEY);
  } catch (_ss) {}
  return { mode: 'client' };
}
