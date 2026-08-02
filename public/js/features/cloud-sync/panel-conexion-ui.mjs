import {
  accountSummaryHtml,
  authFormsHtml,
  nextStepHtml,
  roomConnectedHtml,
  roomActionsHtml,
  advancedUrlHtml,
  conexionShellHtml,
} from './panel-conexion-html.mjs';

/**
 * @param {HTMLElement} section
 * @param {string} normalizedSala
 * @param {object} deps
 * @param {{ cloudUser: { username?: string, displayName?: string } | null, startRuntime: () => void }} ctx
 */
export function createConexionRenderers(section, normalizedSala, deps, ctx) {
  function renderShell(bodyHtml, status) {
    section.innerHTML = conexionShellHtml(normalizedSala, bodyHtml, status);
  }

  function renderConnected(room) {
    renderShell(
      '<div class="cloud-sync-account">' + accountSummaryHtml(ctx.cloudUser) + '</div>' +
      nextStepHtml(deps.getCloudSyncToken) + roomConnectedHtml(room, deps.getCloudSyncRevision) + advancedUrlHtml(deps.getCloudSyncUrl()),
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
