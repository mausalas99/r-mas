import { normalizeCloudSala } from './sala-allowlist.mjs';
import { shouldShowNubePanel } from './lan-override.mjs';
import { STATUS_LABELS, statusChipModifier } from './panel-conexion-html.mjs';
import { createConexionRenderers, saveUrlFromUi } from './panel-conexion-ui.mjs';
import { createNubeRuntime } from './panel-conexion-runtime.mjs';
import {
  bootstrapConexionState,
  adminShellHtml,
  mountAdminShell,
  wireConexionClicks,
  wireTeamsChangedListener,
} from './panel-conexion-bootstrap.mjs';
import { wireCloudAuthTabs } from './panel-steps-html.mjs';

/**
 * @param {HTMLElement} root
 * @param {object} deps
 */
export function mountNubeSection(root, deps) {
  const sala = deps.getUserSala();
  if (!shouldShowNubePanel(sala)) return null;

  const toast = deps.toast || function () {};
  const normalizedSala = normalizeCloudSala(sala);
  let ensureTurnInflight = null;
  let ensureTurnDone = false;
  /** @type {{ username?: string, displayName?: string } | null} */
  let cloudUser = null;

  const section = document.createElement('section');
  section.className = 'cloud-sync-conexion';
  section.setAttribute('data-cloud-nube-section', '1');

  function renderStatusChip(status) {
    const chip = section.querySelector('[data-cloud-status-chip]');
    if (!chip) return;
    chip.textContent = STATUS_LABELS[status] || status;
    chip.className = 'cloud-sync-status-chip ' + statusChipModifier(status);
    chip.setAttribute('data-status', status);
    deps.setStatus?.(status);
  }

  const { startRuntime, stopRuntime } = createNubeRuntime({
    getApi: deps.getApi,
    getCloudSyncRoomId: deps.getCloudSyncRoomId,
    getCloudSyncToken: deps.getCloudSyncToken,
    getCloudSyncRevision: deps.getCloudSyncRevision,
    setCloudSyncRevision: deps.setCloudSyncRevision,
    onStatus: renderStatusChip,
    toast,
  });

  const cloudUserRef = {
    get cloudUser() { return cloudUser; },
    set cloudUser(v) { cloudUser = v; },
    startRuntime,
    masAdminHtml: adminShellHtml(),
  };
  const { renderConnected, renderDisconnected } = createConexionRenderers(section, normalizedSala, deps, cloudUserRef);

  async function tryAutoEnsureTurnRoom() {
    if (deps.getCloudSyncRoomId()) { ensureTurnDone = true; return null; }
    if (!deps.getCloudSyncToken() || ensureTurnDone) return null;
    if (ensureTurnInflight) return ensureTurnInflight;
    const { ensureTurnRoom } = await import('./ensure-turn-room.mjs');
    ensureTurnInflight = ensureTurnRoom({
      api: deps.getApi(),
      getSala: deps.getUserSala,
      getToken: deps.getCloudSyncToken,
      setCloudSyncRoomId: deps.setCloudSyncRoomId,
      setCloudSyncRevision: deps.setCloudSyncRevision,
      onConnected: function (room) {
        ensureTurnDone = true;
        deps.onCloudRoomChange?.(true);
        renderConnected(room);
      },
      toast,
    }).finally(function () { ensureTurnInflight = null; ensureTurnDone = true; });
    return ensureTurnInflight;
  }

  const { toggleAdminPanel } = mountAdminShell(section, deps, toast);
  const ui = {
    normalizedSala,
    toast,
    saveUrlFromUi: () => saveUrlFromUi(section, deps.setCloudSyncUrl),
    tryAutoEnsureTurnRoom,
    renderConnected,
    renderDisconnected,
    startRuntime,
    stopRuntime,
    setCloudUser(u) { cloudUser = u; },
    getCloudUser() { return cloudUser; },
    toggleAdminPanel,
  };

  wireCloudAuthTabs(section);
  wireConexionClicks(section, deps, ui);
  wireTeamsChangedListener(section, deps, ui);
  bootstrapConexionState(section, deps, ui);

  root.appendChild(section);
  return { section, stop() { stopRuntime(); } };
}
