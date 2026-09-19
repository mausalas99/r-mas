/**
 * Navigate ⇄ Conexión to the inline Equipo (Mi rotación) view.
 */
import { openConnectionDropdown } from './panel-chrome.mjs';
import { applyConexionView } from './panel-conexion-views.mjs';
import { mountEquipoTeamsPanel } from './panel-equipo-embed.mjs';
import { equipoEmbedHostHtml } from './panel-conexion-html.mjs';

/** @param {number} [maxMs] */
async function waitForConexionSection(maxMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const section = document.querySelector('.cloud-sync-conexion[data-cloud-nube-section]');
    if (section) return section;
    await new Promise(function (resolve) {
      setTimeout(resolve, 50);
    });
  }
  return null;
}

/**
 * @param {HTMLElement} section
 * @param {{ toast?: (msg: string, kind?: string) => void, skipProfileGate?: boolean }} opts
 */
async function navigateEquipoView(section, opts) {
  const toast = typeof opts.toast === 'function' ? opts.toast : function () {};
  let host = section.querySelector('[data-cloud-equipo-host]');
  if (!host) {
    const body = section.querySelector('[data-cloud-view="equipo"] .cloud-sync-view-body');
    if (body) {
      body.insertAdjacentHTML('afterbegin', equipoEmbedHostHtml());
      host = body.querySelector('[data-cloud-equipo-host]');
    }
  }
  applyConexionView(section, 'equipo', {
    onEquipo() {
      void mountEquipoTeamsPanel(host, { toast });
    },
  });
  if (host) {
    await mountEquipoTeamsPanel(host, { toast });
  }
}

/**
 * Open ⇄ and show Equipo (Mi rotación). Falls back to the legacy modal when Nube UI is absent.
 * @param {{ skipProfileGate?: boolean, toast?: (msg: string, kind?: string) => void }} [opts]
 */
export async function openConexionEquipoPanel(opts = {}) {
  const toast = typeof opts.toast === 'function' ? opts.toast : function () {};

  openConnectionDropdown();
  const section = await waitForConexionSection();
  if (!section) {
    const { openClinicalTeamsPanelModal } = await import(
      '../clinical-teams/teams-roster-shell.mjs'
    );
    await openClinicalTeamsPanelModal(opts);
    return;
  }

  const equipoView = section.querySelector('[data-cloud-view="equipo"]');
  if (!equipoView) {
    const { openClinicalTeamsPanelModal } = await import(
      '../clinical-teams/teams-roster-shell.mjs'
    );
    await openClinicalTeamsPanelModal(opts);
    return;
  }

  if (!opts.skipProfileGate) {
    try {
      const { needsClinicalOnboarding } = await import('../clinical-onboarding.mjs');
      if (needsClinicalOnboarding()) {
        const mainMod = await import('../clinical-onboarding-main.mjs');
        await mainMod.showMainClinicalOnboarding();
        mainMod.focusMainClinicalOnboarding();
        return;
      }
    } catch {
      /* profile gate optional */
    }
  }

  await navigateEquipoView(section, { toast, skipProfileGate: opts.skipProfileGate });
}
