/**
 * Learn Hub / tour helpers — navigate ⇄ Conexión to the correct subview.
 */
import { applyConexionView } from './panel-conexion-views.mjs';
import { mountEquipoTeamsPanel } from './panel-equipo-embed.mjs';
import { mountCloudMobileInviteInHost } from './panel-mobile-invite.mjs';
import { refreshCloudSyncDiagnostics } from './panel-cloud-diagnostics.mjs';
import { setClinicalTeamsEmbedHost } from '../clinical-panel-host.mjs';

/** @type {Record<string, string>} */
const TOUR_CONEXION_VIEW = {
  livesync_desktop: 'status',
  livesync_mobile: 'mobile',
  gv7_lan_wifi: 'status',
  gv7_lan_directorio: 'equipo',
  gv7_lan_rotacion: 'equipo',
  gv7_rotacion_rejoin: 'equipo',
  gv7_inherit_patients: 'equipo',
  gv7_mobile_link: 'mobile',
  gv7_mobile_scope: 'mobile',
  gv7_mobile_vs_sala: 'mobile',
};

/** @returns {HTMLElement | null} */
export function findConexionSection() {
  return document.querySelector('.cloud-sync-conexion[data-cloud-nube-section]');
}

/** @param {string} msg @param {string} [kind] */
function tourToast(msg, kind) {
  void import('../../app-shell.mjs')
    .then(function (m) {
      m.showToast?.(msg, kind);
    })
    .catch(function () {});
}

/** @param {HTMLElement} section */
function buildConexionTourHooks(section) {
  const runtime = function () {
    return { showToast: tourToast };
  };
  return {
    onMobile() {
      mountCloudMobileInviteInHost(section.querySelector('[data-cloud-mobile-invite-host]'), {
        runtime,
      });
    },
    onEquipo() {
      void mountEquipoTeamsPanel(section.querySelector('[data-cloud-equipo-host]'), {
        toast: tourToast,
      });
    },
    onNube() {
      refreshCloudSyncDiagnostics(section.querySelector('[data-cloud-nube-diagnostics-host]'), {
        toast: tourToast,
      });
    },
  };
}

/** @param {HTMLElement | null} [section] @param {string} [view] */
function applyConexionTourView(section, view) {
  const host = section || findConexionSection();
  if (!host) return;
  applyConexionView(host, view, buildConexionTourHooks(host));
}

/** Retired or missing subviews (e.g. legacy Operaciones) → Conexión home. */
export function resetStaleConexionSubview() {
  const section = findConexionSection();
  if (!section) return;
  const view = String(section.dataset.cloudView || 'status').trim() || 'status';
  const hasView = !!section.querySelector('[data-cloud-view="' + view + '"]');
  if (view === 'ops' || view === 'lan' || !hasView) {
    applyConexionTourView(section, 'status');
  }
}

/** Reset subview when the modal closes so the next open does not restore Operaciones, etc. */
export function resetConexionPanelOnClose() {
  const section = findConexionSection();
  if (!section) return;
  setClinicalTeamsEmbedHost(null);
  applyConexionTourView(section, 'status');
}

/**
 * After ⇄ mount completes: tour steps land on the right subview; otherwise Conexión home.
 */
export async function afterConnectionPanelOpened() {
  const { tourState } = await import('../settings-help/tour-state.mjs');
  if (tourState.guidedTourActive && tourState.tourStepId) {
    await prepareConexionPanelForTour(tourState.tourStepId);
    return;
  }
  resetStaleConexionSubview();
}

/**
 * @param {string} [stepId]
 * @param {number} [attempt]
 */
export async function prepareConexionPanelForTour(stepId, attempt = 0) {
  const section = findConexionSection();
  if (!section) {
    if (attempt < 40) {
      await new Promise(function (resolve) {
        setTimeout(resolve, 50);
      });
      return prepareConexionPanelForTour(stepId, attempt + 1);
    }
    return;
  }

  const view = TOUR_CONEXION_VIEW[String(stepId || '').trim()];
  if (!view) {
    resetStaleConexionSubview();
    return;
  }

  applyConexionTourView(section, view);
}
