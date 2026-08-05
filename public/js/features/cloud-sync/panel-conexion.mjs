import { displayCloudSalaLabel, normalizeCloudSala } from './sala-allowlist.mjs';
import { shouldShowNubePanel } from './lan-override.mjs';
import { STATUS_LABELS, statusChipModifier } from './panel-conexion-html.mjs';
import { createConexionRenderers, saveUrlFromUi } from './panel-conexion-ui.mjs';
import { createNubeRuntime } from './panel-conexion-runtime.mjs';
import {
  bootstrapConexionState,
  mountAdminShell,
  wireConexionClicks,
  wireTeamsChangedListener,
} from './panel-conexion-bootstrap.mjs';
import { wireCloudAuthTabs } from './panel-steps-html.mjs';

/** @param {HTMLElement} section @param {object} deps */
function bindStatusChip(section, deps) {
  return function renderStatusChip(status, detail) {
    const chip = section.querySelector('[data-cloud-status-chip]');
    if (!chip) return;
    chip.textContent = STATUS_LABELS[status] || status;
    chip.className = 'cloud-sync-status-chip ' + statusChipModifier(status);
    chip.setAttribute('data-status', status);
    const detailEl = section.querySelector('[data-cloud-status-detail]');
    if (detailEl) {
      const text = status === 'error' ? String(detail || '').trim() : '';
      detailEl.textContent = text;
      detailEl.hidden = !text;
    }
    deps.setStatus?.(status, detail);
  };
}

/**
 * @param {object} deps
 * @param {{ toast: Function, renderConnected: Function }} ui
 */
/** @param {object} deps @param {{ toast: Function }} ui */
function createEnsureTurn(deps, ui) {
  let inflight = null;
  let done = false;
  return async function tryAutoEnsureTurnRoom() {
    if (!deps.getCloudSyncToken() || done) return null;
    if (inflight) return inflight;
    const { ensureTurnRoom } = await import('./ensure-turn-room.mjs');
    // Always refresh to the canonical month room (not a sticky day roomId).
    inflight = ensureTurnRoom({
      api: deps.getApi(),
      getSala: deps.getUserSala,
      getToken: deps.getCloudSyncToken,
      setCloudSyncRoomId: deps.setCloudSyncRoomId,
      setCloudSyncRoomSnapshot: deps.setCloudSyncRoomSnapshot,
      setCloudSyncRevision: deps.setCloudSyncRevision,
      onConnected() {
        done = true;
        deps.onCloudRoomChange?.(true);
      },
      toast: ui.toast,
    }).finally(function () {
      inflight = null;
      done = true;
    });
    return inflight;
  };
}

/**
 * @param {HTMLElement} root
 * @param {object} deps
 */
export function mountNubeSection(root, deps) {
  const sala = deps.getUserSala();
  if (!shouldShowNubePanel(sala)) return null;

  const toast = deps.toast || function () {};
  const normalizedSala = normalizeCloudSala(sala);
  const displaySala = displayCloudSalaLabel(sala);
  /** @type {{ username?: string, displayName?: string } | null} */
  let cloudUser = null;

  const section = document.createElement('section');
  section.className = 'cloud-sync-conexion';
  section.setAttribute('data-cloud-nube-section', '1');

  const { startRuntime, stopRuntime } = createNubeRuntime({
    getApi: deps.getApi,
    getCloudSyncRoomId: deps.getCloudSyncRoomId,
    getCloudSyncToken: deps.getCloudSyncToken,
    getCloudSyncRevision: deps.getCloudSyncRevision,
    setCloudSyncRevision: deps.setCloudSyncRevision,
    onStatus: bindStatusChip(section, deps),
    toast,
  });

  const cloudUserRef = {
    get cloudUser() { return cloudUser; },
    set cloudUser(v) { cloudUser = v; },
    startRuntime,
    displaySala,
  };
  const { renderConnected, renderDisconnected } = createConexionRenderers(
    section,
    normalizedSala,
    deps,
    cloudUserRef
  );

  const { ensureAdminOpen, toggleAdminPanel } = mountAdminShell(section, deps, toast);
  cloudUserRef.ensureAdminOpen = ensureAdminOpen;
  const ui = {
    normalizedSala,
    toast,
    saveUrlFromUi: () => saveUrlFromUi(section, deps.setCloudSyncUrl),
    tryAutoEnsureTurnRoom: createEnsureTurn(deps, { toast, renderConnected }),
    renderConnected,
    renderDisconnected,
    startRuntime,
    stopRuntime,
    setCloudUser(u) { cloudUser = u; },
    getCloudUser() { return cloudUser; },
    ensureAdminOpen,
    toggleAdminPanel,
  };

  wireCloudAuthTabs(section);
  wireConexionClicks(section, deps, ui);
  wireTeamsChangedListener(section, deps, ui);
  bootstrapConexionState(section, deps, ui);

  root.appendChild(section);
  return { section, stop() { stopRuntime(); } };
}
