import {
  accountSummaryHtml,
  authFormsHtml,
  nextStepHtml,
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
    renderShell(
      '<div class="cloud-sync-account">' + (hasToken ? accountSummaryHtml(ctx.cloudUser) : authFormsHtml(deps.getCloudSyncUrl())) + '</div>' +
      (hasToken ? nextStepHtml(deps.getCloudSyncToken) + roomActionsHtml(normalizedSala) + advancedUrlHtml(deps.getCloudSyncUrl()) : ''),
      hasToken ? 'idle' : 'offline'
    );
  }

  return { renderConnected, renderDisconnected };
}

/** @param {HTMLElement} section @param {(url: string) => void} setCloudSyncUrl */
export async function saveUrlFromUi(section, setCloudSyncUrl) {
  const input = section.querySelector('[data-cloud-sync-url]');
  if (input) setCloudSyncUrl(String(input.value || '').trim());
}
