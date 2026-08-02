/**
 * Lazy ⇄ Nube section mount — keeps panel.mjs under file budget.
 * Remount only when missing from DOM (avoids flash on force panel refresh).
 */
import { getUserSala } from './panel-clinical-context.mjs';

/** @type {ReturnType<import('../cloud-sync/panel-nube-section.mjs').mountNubeSection> | null} */
let _cloudNubeMount = null;

function nubeSectionInDom() {
  return !!(
    typeof document !== 'undefined' &&
    document.querySelector('.cloud-sync-conexion')
  );
}

/**
 * @param {HTMLElement} root
 * @param {{ runtime: () => object, renderLanPanel: (opts?: object) => void, stopLanAutoDiscovery: () => void }} deps
 */
export async function mountCloudNubeSection(root, deps) {
  const { shouldShowNubePanel } = await import('../cloud-sync/lan-override.mjs');
  if (!shouldShowNubePanel(getUserSala())) return;
  try {
    deps.stopLanAutoDiscovery();
  } catch {
    /* ignore */
  }

  if (_cloudNubeMount && nubeSectionInDom()) {
    // Already mounted — move to top of root if panel rebuilt around it.
    const el = root.querySelector('.cloud-sync-conexion');
    if (el && root.firstChild !== el) root.insertBefore(el, root.firstChild);
    return;
  }

  if (_cloudNubeMount && typeof _cloudNubeMount.stop === 'function') {
    _cloudNubeMount.stop();
    _cloudNubeMount = null;
  }

  const settings = await import('../cloud-sync/settings.mjs');
  const { createCloudSyncApi } = await import('../cloud-sync/api-client.mjs');
  const { getSessionAdminKey } = await import('../cloud-sync/panel-admin.mjs');
  const { mountNubeSection } = await import('../cloud-sync/panel-nube-section.mjs');
  const { setCloudRoomConnected } = await import('../cloud-sync/lan-override.mjs');

  const api = createCloudSyncApi({
    getBaseUrl: settings.getCloudSyncUrl,
    getToken: settings.getCloudSyncToken,
    getAdminKey: getSessionAdminKey,
  });

  _cloudNubeMount = mountNubeSection(root, {
    getUserSala,
    getCloudSyncUrl: settings.getCloudSyncUrl,
    setCloudSyncUrl: settings.setCloudSyncUrl,
    getCloudSyncToken: settings.getCloudSyncToken,
    setCloudSyncToken: settings.setCloudSyncToken,
    clearCloudSyncSession: settings.clearCloudSyncSession,
    getCloudSyncRoomId: settings.getCloudSyncRoomId,
    setCloudSyncRoomId: settings.setCloudSyncRoomId,
    getCloudSyncRevision: settings.getCloudSyncRevision,
    setCloudSyncRevision: settings.setCloudSyncRevision,
    getApi: function () {
      return api;
    },
    toast: function (msg, kind) {
      deps.runtime().showToast(msg, kind);
    },
    onCloudRoomChange: function (connected) {
      setCloudRoomConnected(connected);
      if (connected) deps.stopLanAutoDiscovery();
      // Do NOT force full ⇄ rebuild — remounting Nube caused UI flash.
      try {
        const rot = import('../clinical-rotation-entry.mjs');
        void rot.then((m) => m.syncClinicalRotationEntryChrome?.());
      } catch {
        /* ignore */
      }
    },
  });
}
