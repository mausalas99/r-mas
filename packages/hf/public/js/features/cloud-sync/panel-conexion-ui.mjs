import {
  authFormsHtml,
  roomConnectedHtml,
  roomActionsHtml,
  conexionShellHtml,
  equipoEmbedHostHtml,
} from './panel-conexion-html.mjs';
import { connectedViewsHtml, applyConexionView } from './panel-conexion-views.mjs';
import { adminShellHtml } from './panel-conexion-bootstrap.mjs';
import { wireCloudAuthTabs } from './panel-steps-html.mjs';
import { resolveCloudConexionChipStatus } from './cloud-sync-status-snapshot.mjs';

/**
 * @param {HTMLElement} section
 * @param {string} normalizedSala — cloud ward for API (Sala 1 / Sala 2 / Sala E / Torre HU)
 * @param {object} deps
 * @param {{ cloudUser: { username?: string, displayName?: string } | null, startRuntime: () => void, ensureAdminOpen?: () => void | Promise<void>, displaySala?: string }} ctx
 */
export function createConexionRenderers(section, normalizedSala, deps, ctx) {
  const displaySala = String(ctx.displaySala || normalizedSala || '').trim() || normalizedSala;

  function renderShell(bodyHtml, status, detail) {
    section.innerHTML = conexionShellHtml(displaySala, bodyHtml, status, detail);
  }

  function renderConnectedBody(roomHtml) {
    const hasCloudSession = !!deps.getCloudSyncToken();
    const chip = resolveCloudConexionChipStatus();
    renderShell(
      connectedViewsHtml({
        cloudUser: ctx.cloudUser,
        roomHtml,
        equipoHtml: equipoEmbedHostHtml(),
        adminHtml: adminShellHtml(hasCloudSession),
        url: deps.getCloudSyncUrl(),
        hasCloudSession,
      }),
      chip.status,
      chip.detail
    );
    applyConexionView(section, 'status', { onAdmin: ctx.ensureAdminOpen });
  }

  /**
   * @param {object} room
   * @param {{ startRuntime?: boolean }} [opts]
   */
  function renderConnected(room, opts) {
    renderConnectedBody(roomConnectedHtml(room, deps.getCloudSyncRevision));
    if (opts?.startRuntime !== false) ctx.startRuntime();
  }

  function renderDisconnected() {
    const hasToken = !!deps.getCloudSyncToken();
    if (!hasToken) {
      renderShell(authFormsHtml(deps.getCloudSyncUrl()), 'offline');
      wireCloudAuthTabs(section);
      return;
    }
    renderConnectedBody(roomActionsHtml(displaySala));
  }

  return { renderConnected, renderDisconnected };
}

/** @param {HTMLElement} section @param {(url: string) => void} setCloudSyncUrl */
export async function saveUrlFromUi(section, setCloudSyncUrl) {
  const input = section.querySelector('[data-cloud-sync-url]');
  if (input) setCloudSyncUrl(String(input.value || '').trim());
}
