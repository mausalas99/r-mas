/**
 * Inline Mi rotación host inside ⇄ Conexión → Opciones → Equipo.
 */
import { buildTextSkeletonPanel } from '../../ui-skeleton.mjs';
import {
  ensureClinicalPanelSession,
  getClinicalTeamsPanelHost,
  setClinicalTeamsEmbedHost,
  setClinicalTeamsPanelError,
} from '../clinical-panel-host.mjs';
import { wireClinicalTeamsFormDelegation } from '../clinical-teams/teams-roster-form-delegation.mjs';

/** @param {HTMLElement | null | undefined} host */
function resolveEmbedBody(host) {
  if (!host) return null;
  const body = host.querySelector('.clinical-teams-panel-body');
  return body instanceof HTMLElement ? body : host;
}

/** @param {HTMLElement | null | undefined} host */
function setEmbedLoading(host) {
  const body = resolveEmbedBody(host);
  if (body) {
    body.innerHTML = buildTextSkeletonPanel('clinical-teams-skeleton skel-panel', 3);
  }
}

/**
 * @returns {Promise<boolean>} true when onboarding intercepted the flow (caller should stop)
 */
async function interceptClinicalOnboarding() {
  try {
    const { needsClinicalOnboarding } = await import('../clinical-onboarding.mjs');
    if (!needsClinicalOnboarding()) return false;
    const mainMod = await import('../clinical-onboarding-main.mjs');
    await mainMod.showMainClinicalOnboarding();
    mainMod.focusMainClinicalOnboarding();
    return true;
  } catch (err) {
    console.error('[Equipo]', err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : 'No se pudo abrir equipos.'
    );
    return true;
  }
}

/**
 * @param {HTMLElement} panelHost
 * @param {(msg: string, kind?: string) => void} toast
 */
async function renderEquipoTeamsPanelInto(panelHost, toast) {
  try {
    const { renderClinicalTeamsPanelInto } = await import(
      '../clinical-teams/teams-roster-panel.mjs'
    );
    await renderClinicalTeamsPanelInto(panelHost, { skipLanPull: false });
    panelHost.scrollTop = 0;
    const dropdownScroll = document.getElementById('connection-dropdown-scroll');
    if (dropdownScroll instanceof HTMLElement) dropdownScroll.scrollTop = 0;
  } catch (err) {
    console.error('[Equipo]', err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : 'No se pudo cargar equipos.'
    );
    toast('No se pudo cargar equipos.', 'error');
  }
}

/**
 * @param {HTMLElement | null} host — `[data-cloud-equipo-host]`
 * @param {{ toast?: (msg: string, kind?: string) => void }} [opts]
 */
export async function mountEquipoTeamsPanel(host, opts = {}) {
  const toast = typeof opts.toast === 'function' ? opts.toast : function () {};
  if (!host) return;

  const panelHost = resolveEmbedBody(host);
  if (!panelHost) return;

  setClinicalTeamsEmbedHost(panelHost);
  setEmbedLoading(host);

  const section = host.closest('.cloud-sync-conexion');
  if (section) wireClinicalTeamsFormDelegation(section);

  const sessionOk = await ensureClinicalPanelSession({ interactive: true });
  if (!sessionOk) {
    setClinicalTeamsPanelError('Activa la sesión clínica para gestionar equipos.');
    return;
  }

  if (await interceptClinicalOnboarding()) return;

  await renderEquipoTeamsPanelInto(panelHost, toast);
}

/** @returns {boolean} */
export function isEquipoEmbedActive() {
  const host = getClinicalTeamsPanelHost();
  if (!host?.isConnected) return false;
  const view = host.closest('[data-cloud-view="equipo"]');
  return !!(view && !view.hidden);
}
