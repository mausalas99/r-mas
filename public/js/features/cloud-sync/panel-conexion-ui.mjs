import {
  authFormsHtml,
  roomConnectedHtml,
  roomActionsHtml,
  advancedUrlHtml,
  conexionShellHtml,
  equipoStepHtml,
} from './panel-conexion-html.mjs';
import { connectedStepsHtml } from './panel-steps-html.mjs';

/**
 * @param {HTMLElement} section
 * @param {string} normalizedSala
 * @param {object} deps
 * @param {{ cloudUser: { username?: string, displayName?: string } | null, startRuntime: () => void, masAdminHtml?: string }} ctx
 */
export function createConexionRenderers(section, normalizedSala, deps, ctx) {
  function renderShell(bodyHtml, status) {
    section.innerHTML = conexionShellHtml(normalizedSala, bodyHtml, status);
  }

  function renderConnected(room) {
    const masBodyHtml = (ctx.masAdminHtml || '') + advancedUrlHtml(deps.getCloudSyncUrl());
    renderShell(
      connectedStepsHtml({
        cloudUser: ctx.cloudUser,
        roomHtml: roomConnectedHtml(room, deps.getCloudSyncRevision),
        equipoHtml: equipoStepHtml(deps.getCloudSyncToken),
        masBodyHtml,
      }),
      'idle'
    );
    ctx.startRuntime();
  }

  function renderDisconnected() {
    const hasToken = !!deps.getCloudSyncToken();
    if (!hasToken) {
      renderShell(authFormsHtml(deps.getCloudSyncUrl()), 'offline');
      return;
    }
    const masBodyHtml = (ctx.masAdminHtml || '') + advancedUrlHtml(deps.getCloudSyncUrl());
    renderShell(
      connectedStepsHtml({
        cloudUser: ctx.cloudUser,
        roomHtml: roomActionsHtml(normalizedSala),
        equipoHtml: equipoStepHtml(deps.getCloudSyncToken),
        masBodyHtml,
      }),
      'idle'
    );
  }

  return { renderConnected, renderDisconnected };
}

/** @param {HTMLElement} section @param {(url: string) => void} setCloudSyncUrl */
export async function saveUrlFromUi(section, setCloudSyncUrl) {
  const input = section.querySelector('[data-cloud-sync-url]');
  if (input) setCloudSyncUrl(String(input.value || '').trim());
}
