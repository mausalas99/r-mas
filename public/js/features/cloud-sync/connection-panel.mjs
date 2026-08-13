/**
 * Lazy ⇄ Nube section mount — keeps connection chrome under file budget.
 */
import { isClinicalLocalOnlyMode, readRpcSettings } from '../../clinical-settings.mjs';
import { getUserSala } from './panel-clinical-context.mjs';
import { escapeHtml } from '../../dom-escape.mjs';

/** @type {ReturnType<import('./panel-nube-section.mjs').mountNubeSection> | null} */
let _cloudNubeMount = null;

/** @param {HTMLElement} root @param {'local-only'|'unsupported-sala'} kind */
export function renderConnectionPanelFallback(root, kind) {
  const copy =
    kind === 'local-only'
      ? {
          title: 'Solo este equipo',
          body:
            'Este modo no usa R+ Cloud ni ⇄ Conexión. Para sincronizar censo y equipos, activa guardia en <strong>Ajustes → Respaldos, sync y recuperación</strong>.',
        }
      : {
          title: 'Conexión no disponible',
          body:
            'Tu rotación actual no usa Nube. Completa el registro en la pantalla principal o elige una rotación con sincronización.',
        };
  root.innerHTML =
    '<section class="cloud-sync-conexion cloud-sync-conexion--fallback" data-cloud-nube-fallback="1">' +
    '<h4 class="cloud-sync-conexion-title">' +
    escapeHtml(copy.title) +
    '</h4>' +
    '<p class="cloud-sync-hint">' +
    copy.body +
    '</p></section>';
}

function nubeSectionInDom() {
  return !!(
    typeof document !== 'undefined' &&
    document.querySelector('.cloud-sync-conexion:not([data-cloud-nube-fallback])')
  );
}

/**
 * @param {HTMLElement} root
 * @param {{ runtime: () => object }} deps
 */
export async function mountCloudConnectionPanel(root, deps) {
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    renderConnectionPanelFallback(root, 'local-only');
    return;
  }

  const { shouldShowNubePanel } = await import('./nube-sync-policy.mjs');
  if (!shouldShowNubePanel(getUserSala())) {
    renderConnectionPanelFallback(root, 'unsupported-sala');
    return;
  }

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
    getCloudSyncRemember: settings.getCloudSyncRemember,
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
  if (!_cloudNubeMount) {
    renderConnectionPanelFallback(root, 'unsupported-sala');
  }
}

function defaultConnectionRuntime() {
  return function runtime() {
    return {
      showToast(msg, kind) {
        void import('../../app-shell.mjs')
          .then(function (m) {
            m.showToast?.(msg, kind);
          })
          .catch(function () {});
      },
      closeSettingsDropdown() {
        void import('../../app-shell.mjs')
          .then(function (m) {
            m.closeSettingsDropdown?.();
          })
          .catch(function () {});
      },
      isMobileWeb() {
        return false;
      },
    };
  };
}

export async function renderConnectionPanel(opts) {
  const root = document.getElementById('lan-connection-panel-root');
  if (!root) return;
  const runtime =
    typeof opts?.runtime === 'function' ? opts.runtime : defaultConnectionRuntime();
  await mountCloudConnectionPanel(root, { runtime });
}
