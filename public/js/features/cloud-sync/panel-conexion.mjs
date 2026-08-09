import { displayCloudSalaLabel, normalizeCloudSala } from './sala-allowlist.mjs';
import { shouldShowNubePanel } from './nube-sync-policy.mjs';
import { statusChipModifier, formatCloudStatusChipLabel } from './panel-conexion-html.mjs';
import { createConexionRenderers, saveUrlFromUi } from './panel-conexion-ui.mjs';
import { createNubeRuntime, getSharedNubeRuntime } from './panel-conexion-runtime.mjs';
import {
  bootstrapConexionState,
  mountAdminShell,
  wireConexionClicks,
  wireTeamsChangedListener,
} from './panel-conexion-bootstrap.mjs';
import { wireCloudAuthTabs } from './panel-steps-html.mjs';
import { humanizeCloudSyncErrorMessage } from './cloud-sync-error-text.mjs';
import { refreshCloudSyncDiagnostics } from './panel-cloud-diagnostics.mjs';
import { applyHeaderTeamSyncVisual } from './cloud-sync-header-chrome.mjs';
import { resolveCloudConexionChipStatus } from './cloud-sync-status-snapshot.mjs';

/** @param {HTMLElement} section @param {object} deps */
function bindStatusChip(section, deps) {
  const toast = typeof deps.toast === 'function' ? deps.toast : function () {};
  function renderStatusChip(status, detail) {
    const chip = section.querySelector('[data-cloud-status-chip]');
    const live = resolveCloudConexionChipStatus();
    const resolvedStatus = live.status || status;
    const resolvedDetail = live.detail || detail;
    const transport = live.transport || getSharedNubeRuntime()?.getTransportState?.() || 'poll';
    if (chip) {
      chip.textContent = formatCloudStatusChipLabel(resolvedStatus, transport);
      chip.className = 'cloud-sync-status-chip ' + statusChipModifier(resolvedStatus);
      chip.setAttribute('data-status', resolvedStatus);
      chip.setAttribute('data-cloud-transport', transport);
    }
    const detailEl = section.querySelector('[data-cloud-status-detail]');
    if (detailEl) {
      const text =
        resolvedStatus === 'error'
          ? humanizeCloudSyncErrorMessage(String(resolvedDetail || '').trim())
          : '';
      detailEl.textContent = text;
      detailEl.hidden = !text;
    }
    applyHeaderTeamSyncVisual(resolvedStatus, transport);
    deps.setStatus?.(resolvedStatus, resolvedDetail);
    if (section.dataset.cloudView === 'nube') {
      refreshCloudSyncDiagnostics(section.querySelector('[data-cloud-nube-diagnostics-host]'), {
        toast,
      });
    }
  }
  function refreshStatusChipFromRuntime() {
    const live = resolveCloudConexionChipStatus();
    renderStatusChip(live.status, live.detail);
  }
  return { renderStatusChip, refreshStatusChipFromRuntime };
}

/**
 * @param {object} deps
 * @param {{ toast: Function, renderConnected: Function }} ui
 */
/** @param {object} deps @param {{ toast: Function }} ui */
function createEnsureTurn(deps, ui) {
  let inflight = null;
  return async function tryAutoEnsureTurnRoom() {
    if (!deps.getCloudSyncToken()) return null;
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
        deps.onCloudRoomChange?.(true);
      },
      toast: ui.toast,
    }).finally(function () {
      inflight = null;
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

  const statusChip = bindStatusChip(section, deps);

  const { startRuntime: startRuntimeInner, stopRuntime } = createNubeRuntime({
    getApi: deps.getApi,
    getCloudSyncRoomId: deps.getCloudSyncRoomId,
    getCloudSyncToken: deps.getCloudSyncToken,
    getCloudSyncRevision: deps.getCloudSyncRevision,
    setCloudSyncRevision: deps.setCloudSyncRevision,
    onStatus: statusChip.renderStatusChip,
    toast,
  });

  function startRuntime() {
    startRuntimeInner();
    statusChip.refreshStatusChipFromRuntime();
  }

  const cloudUserRef = {
    get cloudUser() { return cloudUser; },
    set cloudUser(v) { cloudUser = v; },
    startRuntime,
    refreshStatusChipFromRuntime: statusChip.refreshStatusChipFromRuntime,
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
    refreshStatusChipFromRuntime: statusChip.refreshStatusChipFromRuntime,
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
