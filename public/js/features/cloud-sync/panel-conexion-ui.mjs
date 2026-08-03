import {
  authFormsHtml,
  roomConnectedHtml,
  roomActionsHtml,
  conexionShellHtml,
  equipoStepHtml,
} from './panel-conexion-html.mjs';
import { connectedViewsHtml, applyConexionView } from './panel-conexion-views.mjs';

/**
 * @param {HTMLElement} section
 * @param {string} normalizedSala
 * @param {object} deps
 * @param {{ cloudUser: { username?: string, displayName?: string } | null, startRuntime: () => void, masAdminHtml?: string, ensureAdminOpen?: () => void | Promise<void> }} ctx
 */
export function createConexionRenderers(section, normalizedSala, deps, ctx) {
  function renderShell(bodyHtml, status) {
    section.innerHTML = conexionShellHtml(normalizedSala, bodyHtml, status);
  }

  function renderConnectedBody(roomHtml) {
    renderShell(
      connectedViewsHtml({
        cloudUser: ctx.cloudUser,
        roomHtml,
        equipoHtml: equipoStepHtml(deps.getCloudSyncToken),
        adminHtml: ctx.masAdminHtml || '',
        url: deps.getCloudSyncUrl(),
      }),
      'idle'
    );
    applyConexionView(section, 'status', { onAdmin: ctx.ensureAdminOpen });
  }

  function renderConnected(room) {
    renderConnectedBody(roomConnectedHtml(room, deps.getCloudSyncRevision));
    ctx.startRuntime();
  }

  function renderDisconnected() {
    const hasToken = !!deps.getCloudSyncToken();
    if (!hasToken) {
      renderShell(authFormsHtml(deps.getCloudSyncUrl()), 'offline');
      return;
    }
    renderConnectedBody(roomActionsHtml(normalizedSala));
  }

  return { renderConnected, renderDisconnected };
}

/** @param {HTMLElement} section @param {(url: string) => void} setCloudSyncUrl */
export async function saveUrlFromUi(section, setCloudSyncUrl) {
  const input = section.querySelector('[data-cloud-sync-url]');
  if (input) setCloudSyncUrl(String(input.value || '').trim());
}
