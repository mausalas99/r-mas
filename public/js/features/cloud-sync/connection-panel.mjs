/**
 * Lazy ⇄ Nube section mount — keeps connection chrome under file budget.
 */
import { getUserSala } from './panel-clinical-context.mjs';

/** @type {ReturnType<import('./panel-nube-section.mjs').mountNubeSection> | null} */
let _cloudNubeMount = null;

function nubeSectionInDom() {
  return !!(
    typeof document !== 'undefined' &&
    document.querySelector('.cloud-sync-conexion')
  );
}

/**
 * @param {HTMLElement} root
 * @param {{ runtime: () => object }} deps
 */
export async function mountCloudConnectionPanel(root, deps) {
  const { shouldShowNubePanel } = await import('./nube-sync-policy.mjs');
  if (!shouldShowNubePanel(getUserSala())) return;

  if (_cloudNubeMount && nubeSectionInDom()) {
    const el = root.querySelector('.cloud-sync-conexion');
    if (el && root.firstChild !== el) root.insertBefore(el, root.firstChild);
    return;
  }

  if (_cloudNubeMount && typeof _cloudNubeMount.stop === 'function') {
    _cloudNubeMount.stop();
    _cloudNubeMount = null;
  }

  const settings = await import('./settings.mjs');
  const { createCloudSyncApi } = await import('./api-client.mjs');
  const { getSessionAdminKey } = await import('./panel-admin.mjs');
  const { mountNubeSection } = await import('./panel-nube-section.mjs');
  const { setCloudRoomConnected } = await import('./nube-sync-policy.mjs');

  const api = createCloudSyncApi({
    getBaseUrl: settings.getCloudSyncUrl,
    getToken: settings.getCloudSyncToken,
    getAdminKey: getSessionAdminKey,
  });

  _cloudNubeMount = mountNubeSection(root, {
    renderLanPanel: function () {
      return mountCloudConnectionPanel(root, deps);
    },
    getUserSala,
    getCloudSyncUrl: settings.getCloudSyncUrl,
    setCloudSyncUrl: settings.setCloudSyncUrl,
    getCloudSyncToken: settings.getCloudSyncToken,
    setCloudSyncToken: settings.setCloudSyncToken,
    clearCloudSyncSession: settings.clearCloudSyncSession,
    getCloudSyncRoomId: settings.getCloudSyncRoomId,
    setCloudSyncRoomId: settings.setCloudSyncRoomId,
    getCloudSyncRoomSnapshot: settings.getCloudSyncRoomSnapshot,
    setCloudSyncRoomSnapshot: settings.setCloudSyncRoomSnapshot,
    getCloudSyncRevision: settings.getCloudSyncRevision,
    setCloudSyncRevision: settings.setCloudSyncRevision,
    getApi: function () {
      return api;
    },
    toast: function (msg, kind) {
      deps.runtime().showToast?.(msg, kind);
    },
    onCloudRoomChange: function (connected) {
      setCloudRoomConnected(connected);
      try {
        void import('../clinical-rotation-entry.mjs').then((m) => m.syncClinicalRotationEntryChrome?.());
      } catch {
        /* ignore */
      }
    },
  });
}

export async function renderConnectionPanel(opts) {
  const root = document.getElementById('lan-connection-panel-root');
  if (!root) return;
  const runtime = function () {
    return {
      showToast() {},
      closeSettingsDropdown() {},
      isMobileWeb() {
        return false;
      },
    };
  };
  try {
    const shell = await import('../../app-shell.mjs');
    runtime.showToast = shell.showToast;
    runtime.closeSettingsDropdown = shell.closeSettingsDropdown || function () {};
  } catch {
    /* optional */
  }
  await mountCloudConnectionPanel(root, { runtime });
  void opts;
}
