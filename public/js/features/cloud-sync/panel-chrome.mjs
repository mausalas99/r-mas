/**
 * Conexión dropdown chrome — cloud-sync façade (WS3-2).
 */
import { closeModalAnimated } from '../../ui-motion.mjs';
import { isCloudMobileClient } from '../cloud-mobile/origin.mjs';
import { renderConnectionPanel } from './connection-panel.mjs';

let connectionModalChromeWired = false;

export function isLanConnectionDropdownOpen() {
  const bg = document.getElementById('connection-dropdown-backdrop');
  return !!(bg && bg.classList.contains('open'));
}

function wireConnectionModalChromeOnce(closeConnectionDropdown) {
  if (connectionModalChromeWired) return;
  connectionModalChromeWired = true;
  document.getElementById('btn-connection-dropdown-close')?.addEventListener('click', () => {
    closeConnectionDropdown();
  });
  const bg = document.getElementById('connection-dropdown-backdrop');
  bg?.addEventListener('click', (ev) => {
    if (ev.target === bg) closeConnectionDropdown();
  });
}

function getRuntime() {
  return {
    showToast(msg, kind) {
      try {
        import('../../app-shell.mjs').then((m) => m.showToast?.(msg, kind));
      } catch {
        /* ignore */
      }
    },
    closeSettingsDropdown() {
      try {
        import('../../app-shell.mjs').then((m) => m.closeSettingsDropdown?.());
      } catch {
        /* ignore */
      }
    },
  };
}

function setConnectionDropdownOpen(open) {
  const dd = document.getElementById('connection-dropdown');
  const bg = document.getElementById('connection-dropdown-backdrop');
  const syncBtn = document.getElementById('btn-header-team-sync');
  if (!dd && !bg) return;

  function finishClose() {
    if (dd) dd.classList.remove('open');
    if (bg) {
      bg.classList.remove('open');
      bg.setAttribute('aria-hidden', 'true');
    }
    if (syncBtn) syncBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('connection-dropdown-open');
  }

  if (!open) {
    void import('./panel-conexion-tour.mjs').then(function (m) {
      m.resetConexionPanelOnClose();
    });
    if (bg) closeModalAnimated(bg, finishClose);
    else finishClose();
    return;
  }

  getRuntime().closeSettingsDropdown();
  wireConnectionModalChromeOnce(closeConnectionDropdown);
  if (bg) {
    bg.classList.add('open');
    bg.setAttribute('aria-hidden', 'false');
  }
  if (dd) dd.classList.add('open');
  document.body.classList.add('connection-dropdown-open');
  if (syncBtn) syncBtn.setAttribute('aria-expanded', 'true');
  void renderConnectionPanel({ force: true }).then(function () {
    return import('./panel-conexion-tour.mjs').then(function (m) {
      return m.afterConnectionPanelOpened();
    });
  });
}

export function closeConnectionDropdown() {
  setConnectionDropdownOpen(false);
}

export function openConnectionDropdown() {
  if (isCloudMobileClient()) {
    getRuntime().showToast(
      'R+ Móvil usa la nube automáticamente. Si no ves pacientes, deja R+ abierto en el Mac del turno y recarga.',
      'info'
    );
    return;
  }
  setConnectionDropdownOpen(true);
}

export function toggleConnectionDropdown(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  if (isLanConnectionDropdownOpen()) closeConnectionDropdown();
  else openConnectionDropdown();
}

export function openTeamSyncFromHeader() {
  openConnectionDropdown();
}

/** @deprecated LAN host disk section retired — no-op for settings/help runtime compat. */
export function syncSettingsLanHostDiskSection() {}

export const windowHandlers = {
  toggleConnectionDropdown,
  closeConnectionDropdown,
  openConnectionDropdown,
  openTeamSyncFromHeader,
  saveLanSettingsFromUi: async function () {},
  saveLanHostTeamCodeFromUi: async function () {},
  resetLanSquadHostStateFromUi: async function () {},
  resetLanTurnConnectionFromUi: async function () {},
  dismissLanHostFirstTimeHint: function () {},
  dismissLanDisconnectBanner: function () {},
  setLanHideDisconnectBannerFromUi: function () {},
  joinLanRoom: async function () {},
  joinLanFromInviteUi: function () {},
  createLanRoomFromUi: async function () {},
  deleteLanRoom: async function () {},
  copyLanInviteLinkFromUi: function () {},
  copyMobileLanLinkFromUi: function () {},
};
