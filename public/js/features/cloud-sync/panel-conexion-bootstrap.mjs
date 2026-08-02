import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { canAccessCloudAdmin } from './panel-admin.mjs';
import { nextStepHtml, userHasJoinedTeam, equipoStepHtml } from './panel-conexion-html.mjs';
import {
  handleRegister,
  handleLogin,
  handleRecover,
  handleRegenerateRecovery,
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleLogout,
  handleOpenRotation,
  renderAfterAuth,
} from './panel-conexion-handlers.mjs';

/** @returns {string} */
export function adminShellHtml() {
  if (!canAccessCloudAdmin(clinicalSessionContext.user)) return '';
  return (
    '<div class="cloud-sync-admin-wrap">' +
    '<button type="button" class="cloud-sync-btn" data-cloud-action="toggle-admin" aria-expanded="false">Administración nube</button>' +
    '<div class="cloud-sync-admin-host" data-cloud-admin-host hidden></div></div>'
  );
}

/** @param {HTMLElement} section @param {object} deps @param {object} ui */
export function wireConexionClicks(section, deps, ui) {
  const handlerDeps = {
    section,
    normalizedSala: ui.normalizedSala,
    toast: ui.toast,
    getApi: deps.getApi,
    getUserSala: deps.getUserSala,
    getCloudSyncToken: deps.getCloudSyncToken,
    setCloudSyncToken: deps.setCloudSyncToken,
    clearCloudSyncSession: deps.clearCloudSyncSession,
    getCloudSyncRoomId: deps.getCloudSyncRoomId,
    setCloudSyncRoomId: deps.setCloudSyncRoomId,
    getCloudSyncRevision: deps.getCloudSyncRevision,
    setCloudSyncRevision: deps.setCloudSyncRevision,
    onCloudRoomChange: deps.onCloudRoomChange,
    saveUrlFromUi: ui.saveUrlFromUi,
    tryAutoEnsureTurnRoom: ui.tryAutoEnsureTurnRoom,
    renderConnected: ui.renderConnected,
    renderDisconnected: ui.renderDisconnected,
    startRuntime: ui.startRuntime,
    stopRuntime: ui.stopRuntime,
    setCloudUser: ui.setCloudUser,
    getCloudUser: ui.getCloudUser,
    handleOpenRotation: () => handleOpenRotation(ui.toast),
    renderAfterAuth() { renderAfterAuth(handlerDeps); },
  };

  const clickActions = {
    register: () => void handleRegister(handlerDeps),
    login: () => void handleLogin(handlerDeps),
    recover: () => void handleRecover(handlerDeps),
    'regenerate-recovery': () => void handleRegenerateRecovery(handlerDeps),
    'create-room': () => void handleCreateRoom(handlerDeps),
    'join-room': () => void handleJoinRoom(handlerDeps),
    'leave-room': () => void handleLeaveRoom(handlerDeps),
    logout: () => void handleLogout(handlerDeps),
    'open-rotation': () => void handleOpenRotation(ui.toast),
    'toggle-admin': () => void ui.toggleAdminPanel(),
  };

  section.addEventListener('click', function (ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-cloud-action]') : null;
    if (!btn) return;
    const action = btn.getAttribute('data-cloud-action');
    if (action && clickActions[action]) clickActions[action]();
  });
}

/** @param {HTMLElement} section @param {() => string} getToken */
function refreshConnectedEquipoStep(section, getToken) {
  const equipo = section.querySelector('[data-cloud-equipo-body]');
  if (userHasJoinedTeam() && equipo) {
    equipo.outerHTML = '<p class="cloud-sync-hint" data-cloud-equipo-body>Equipo configurado.</p>';
    return;
  }
  if (!userHasJoinedTeam() && !equipo) {
    const step = section.querySelector('[data-cloud-step="3"]');
    if (!step) return;
    const head = step.querySelector('.cloud-sync-step-head');
    if (head) head.insertAdjacentHTML('afterend', equipoStepHtml(getToken));
  }
}

/** @param {HTMLElement} section @param {() => string} getToken */
function refreshDisconnectedNextStep(section, getToken) {
  const next = section.querySelector('.cloud-sync-next-step');
  if (userHasJoinedTeam() && next) next.remove();
  else if (!userHasJoinedTeam() && !next) {
    const anchor = section.querySelector('.cloud-sync-account');
    if (anchor) anchor.insertAdjacentHTML('afterend', nextStepHtml(getToken));
  }
}

/** @param {HTMLElement} section @param {object} deps @param {object} ui */
export function wireTeamsChangedListener(section, deps, ui) {
  document.addEventListener('rpc-clinical-teams-changed', function onTeamsChanged() {
    if (!section.isConnected) return;
    const roomId = deps.getCloudSyncRoomId();
    if (roomId && deps.getCloudSyncToken()) {
      refreshConnectedEquipoStep(section, deps.getCloudSyncToken);
      return;
    }
    if (deps.getCloudSyncToken()) {
      refreshDisconnectedNextStep(section, deps.getCloudSyncToken);
      ui.renderDisconnected();
    }
  });
}

/** @param {HTMLElement} section @param {object} deps @param {object} ui */
export function bootstrapConexionState(section, deps, ui) {
  const roomId = deps.getCloudSyncRoomId();
  if (roomId && deps.getCloudSyncToken()) {
    void deps.getApi().getRoom(roomId).then(function (data) {
      ui.setCloudUser(null);
      ui.renderConnected(data.room || data);
    }).catch(function () {
      deps.clearCloudSyncSession();
      deps.onCloudRoomChange?.(false);
      ui.renderDisconnected();
    });
    return;
  }
  if (deps.getCloudSyncToken()) {
    ui.renderDisconnected();
    void ui.tryAutoEnsureTurnRoom().then(function (room) {
      if (room) { ui.renderConnected(room); ui.startRuntime(); }
    });
    return;
  }
  ui.renderDisconnected();
}

/** @param {HTMLElement} section @param {object} deps @param {(msg: string, kind?: string) => void} toast */
export function mountAdminShell(section, deps, toast) {
  /** @type {ReturnType<import('./panel-admin.mjs').mountCloudAdminPanel> | null} */
  let adminMount = null;
  async function toggleAdminPanel() {
    const host = section.querySelector('[data-cloud-admin-host]');
    const btn = section.querySelector('[data-cloud-action="toggle-admin"]');
    if (!host || !btn) return;
    const opening = host.hasAttribute('hidden');
    if (opening) {
      host.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      if (!adminMount) {
        const { mountCloudAdminPanel } = await import('./panel-admin.mjs');
        host.textContent = '';
        adminMount = mountCloudAdminPanel(host, { getApi: deps.getApi, toast });
      } else {
        adminMount.refresh?.();
      }
    } else {
      host.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }
  }
  return { toggleAdminPanel };
}
