/**
 * Lazy ⇄ Nube section mount — keeps panel.mjs under file budget.
 */
import { getUserSala } from './panel-clinical-context.mjs';

/** @type {ReturnType<import('../cloud-sync/panel-nube-section.mjs').mountNubeSection> | null} */
let _cloudNubeMount = null;

/**
 * @param {HTMLElement} root
 * @param {{ runtime: () => object, renderLanPanel: (opts?: object) => void, stopLanAutoDiscovery: () => void }} deps
 */
export async function mountCloudNubeSection(root, deps) {
  const { shouldShowNubePanel } = await import('../cloud-sync/lan-override.mjs');
  if (!shouldShowNubePanel(getUserSala())) return;

  if (_cloudNubeMount && typeof _cloudNubeMount.stop === 'function') {
    _cloudNubeMount.stop();
    _cloudNubeMount = null;
  }

  const settings = await import('../cloud-sync/settings.mjs');
  const { createCloudSyncApi } = await import('../cloud-sync/api-client.mjs');
  const { mountNubeSection } = await import('../cloud-sync/panel-nube-section.mjs');
  const { setCloudRoomConnected } = await import('../cloud-sync/lan-override.mjs');

  const api = createCloudSyncApi({
    getBaseUrl: settings.getCloudSyncUrl,
    getToken: settings.getCloudSyncToken,
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
      deps.renderLanPanel({ force: true });
    },
  });
}
