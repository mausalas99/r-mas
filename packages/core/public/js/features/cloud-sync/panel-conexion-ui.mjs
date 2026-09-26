import {
  authFormsHtml,
  roomConnectedHtml,
  roomActionsHtml,
  conexionShellHtml,
  equipoEmbedHostHtml,
  techSummaryLine,
} from './panel-conexion-html.mjs';
import { connectedViewsHtml, applyConexionView, conexionHeroBlockHtml } from './panel-conexion-views.mjs';
import { getSyncablePatients } from '../../app-state.mjs';
import { getSharedNubeOutbox } from './panel-conexion-runtime.mjs';
import { adminShellHtml } from './panel-conexion-bootstrap.mjs';
import { wireCloudAuthTabs } from './panel-steps-html.mjs';
import { resolveCloudConexionChipStatus } from './cloud-sync-status-snapshot.mjs';

// ── Nube status home (board «Nube A»): hero + chain in the panel head and
// the «Detalles técnicos» one-liner, refreshed in place on every status tick.

/** @param {object} deps @returns {object | null} */
function currentRoom(deps) {
  const id = deps.getCloudSyncRoomId?.();
  if (!id) return null;
  const snap = deps.getCloudSyncRoomSnapshot?.() || {};
  return { ...snap, id: String(id) };
}

/** «Cola 0 · Rev. 13516 · 50 pacientes locales» @param {object} deps */
export function nubeTechSummary(deps) {
  const queued = getSharedNubeOutbox()?.list?.()?.length || 0;
  const patients = getSyncablePatients();
  return techSummaryLine(
    queued,
    deps.getCloudSyncRevision?.() || 0,
    Array.isArray(patients) ? patients.length : 0
  );
}

/**
 * @param {object} deps
 * @param {string} displaySala
 * @param {object | null} [room] defaults to the stored room snapshot
 */
export function nubeHeroBlockHtml(deps, displaySala, room) {
  const live = resolveCloudConexionChipStatus();
  return conexionHeroBlockHtml({
    status: live.status,
    detail: live.detail,
    transport: live.transport || 'poll',
    displaySala,
    room: room || currentRoom(deps),
    tokenPresent: !!deps.getCloudSyncToken?.(),
  });
}

/**
 * Re-render the hero and the tech line in place. No-op when the panel shows
 * the pre-room / login head instead of the hero.
 * @param {HTMLElement} section @param {object} deps @param {string} displaySala
 */
export function refreshNubeStatusHome(section, deps, displaySala) {
  const block = section.querySelector('[data-cloud-hero-block]');
  if (block) {
    const html = nubeHeroBlockHtml(deps, displaySala);
    // Same markup → leave the DOM alone (keeps focus on «Sincronizar ahora»).
    // Compare with what we last wrote: the browser re-serializes outerHTML.
    if (section._nubeHeroHtml !== html) {
      block.outerHTML = html;
      section._nubeHeroHtml = html;
    }
  }
  const tech = section.querySelector('[data-cloud-tech-summary]');
  if (tech) tech.textContent = nubeTechSummary(deps);
}

/**
 * @param {HTMLElement} section
 * @param {string} normalizedSala — cloud ward for API (Sala 1 / Sala 2 / Sala E / Torre HU)
 * @param {object} deps
 * @param {{ cloudUser: { username?: string, displayName?: string } | null, startRuntime: () => void, ensureAdminOpen?: () => void | Promise<void>, displaySala?: string }} ctx
 */
export function createConexionRenderers(section, normalizedSala, deps, ctx) {
  const displaySala = String(ctx.displaySala || normalizedSala || '').trim() || normalizedSala;

  function renderShell(bodyHtml, status, detail, heroBlockHtml = '') {
    section.innerHTML = conexionShellHtml(displaySala, bodyHtml, status, detail, heroBlockHtml);
    section._nubeHeroHtml = heroBlockHtml;
  }

  /** @param {string} roomHtml @param {object | null} [room] joined room → status hero */
  function renderConnectedBody(roomHtml, room = null) {
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
        techSummary: room ? nubeTechSummary(deps) : '',
      }),
      chip.status,
      chip.detail,
      room ? nubeHeroBlockHtml(deps, displaySala, room) : ''
    );
    applyConexionView(section, 'status', { onAdmin: ctx.ensureAdminOpen });
  }

  /**
   * @param {object} room
   * @param {{ startRuntime?: boolean }} [opts]
   */
  function renderConnected(room, opts) {
    renderConnectedBody(roomConnectedHtml(room), room);
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
