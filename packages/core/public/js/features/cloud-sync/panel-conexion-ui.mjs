import {
  STATUS_LABELS,
  statusChipModifier,
  techSummaryLine,
} from './panel-conexion-html.mjs';
import { applyConexionView, conexionHeroModel, connectedBodyModel } from './panel-conexion-views.mjs';
import { getSyncablePatients } from '../../app-state.mjs';
import { getSharedNubeOutbox } from './panel-conexion-runtime.mjs';
import { signedOutBodyModel, wireCloudAuthTabs } from './panel-steps-html.mjs';
import { resolveCloudConexionChipStatus } from './cloud-sync-status-snapshot.mjs';
import { drawConexionShell, replaceHeroBlock } from './panel-conexion-view.jsx';

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
 * Hero + chain data for the panel head.
 * @param {object} deps
 * @param {string} displaySala
 * @param {object | null} [room] defaults to the stored room snapshot
 */
export function nubeHeroModel(deps, displaySala, room) {
  const live = resolveCloudConexionChipStatus();
  return conexionHeroModel({
    status: live.status,
    detail: live.detail,
    transport: live.transport || 'poll',
    displaySala,
    room: room || currentRoom(deps),
    tokenPresent: !!deps.getCloudSyncToken?.(),
  });
}

/**
 * Redraw the hero and the tech line in place. No-op when the panel shows
 * the pre-room / login head instead of the hero.
 * @param {HTMLElement} section @param {object} deps @param {string} displaySala
 */
export function refreshNubeStatusHome(section, deps, displaySala) {
  const block = section.querySelector('[data-cloud-hero-block]');
  if (block) {
    const model = nubeHeroModel(deps, displaySala);
    // Same data → leave the DOM alone (keeps focus on «Sincronizar ahora»).
    const key = JSON.stringify(model);
    if (section._nubeHeroKey !== key) {
      replaceHeroBlock(block, model);
      section._nubeHeroKey = key;
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

  /** @param {object} body @param {string} status @param {string} detail @param {object | null} hero */
  function renderShell(body, status, detail, hero = null) {
    drawConexionShell(section, {
      displaySala,
      status,
      statusLabel: STATUS_LABELS[status] || status,
      chipClass: statusChipModifier(status),
      detail,
      hero,
      body,
    });
    section._nubeHeroKey = hero ? JSON.stringify(hero) : '';
  }

  /** @param {object | null} [room] joined room → status hero + «Tu sala»; null → create / join actions */
  function renderConnectedBody(room = null) {
    // Stay in Administración when a room switch re-renders from inside it
    // («Abrir expediente» in Pacientes); every other view returns home.
    const stayInAdmin = section.dataset.cloudView === 'admin';
    const hasCloudSession = !!deps.getCloudSyncToken();
    const chip = resolveCloudConexionChipStatus();
    renderShell(
      connectedBodyModel({
        cloudUser: ctx.cloudUser,
        room,
        displaySala,
        url: deps.getCloudSyncUrl(),
        hasCloudSession,
        techSummary: room ? nubeTechSummary(deps) : '',
      }),
      chip.status,
      chip.detail,
      room ? nubeHeroModel(deps, displaySala, room) : null
    );
    applyConexionView(section, stayInAdmin ? 'admin' : 'status', { onAdmin: ctx.ensureAdminOpen });
  }

  /**
   * @param {object} room
   * @param {{ startRuntime?: boolean }} [opts]
   */
  function renderConnected(room, opts) {
    renderConnectedBody(room);
    if (opts?.startRuntime !== false) ctx.startRuntime();
  }

  function renderDisconnected() {
    const hasToken = !!deps.getCloudSyncToken();
    if (!hasToken) {
      renderShell(signedOutBodyModel(deps.getCloudSyncUrl(), displaySala), 'offline', '', nubeHeroModel(deps, displaySala, null));
      wireCloudAuthTabs(section);
      return;
    }
    renderConnectedBody();
  }

  return { renderConnected, renderDisconnected };
}

/** @param {HTMLElement} section @param {(url: string) => void} setCloudSyncUrl */
export async function saveUrlFromUi(section, setCloudSyncUrl) {
  const input = section.querySelector('[data-cloud-sync-url]');
  if (input) setCloudSyncUrl(String(input.value || '').trim());
}
