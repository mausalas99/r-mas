import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { canAccessCloudAdmin } from './panel-admin.mjs';
import { nextStepHtml, userHasJoinedTeam, equipoStepHtml } from './panel-conexion-html.mjs';
import { applyConexionView } from './panel-conexion-views.mjs';
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

/** @param {boolean} [hasCloudSession] @returns {string} */
export function adminShellHtml(hasCloudSession = false) {
  if (!canAccessCloudAdmin(clinicalSessionContext.user, { hasCloudSession })) return '';
  return '<div class="cloud-sync-admin-host" data-cloud-admin-host></div>';
}

/** @param {HTMLElement} section @param {object} deps @param {object} ui */
export function wireConexionClicks(section, deps, ui) {
  const handlerDeps = {
    renderLanPanel: deps.renderLanPanel,
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
    getCloudSyncRoomSnapshot: deps.getCloudSyncRoomSnapshot,
    setCloudSyncRoomSnapshot: deps.setCloudSyncRoomSnapshot,
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

  function goView(view) {
    applyConexionView(section, view, { onAdmin: ui.ensureAdminOpen });
  }

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
    'toggle-admin': () => void ui.ensureAdminOpen?.(),
    'nav-options': () => goView('options'),
    'nav-back': () => {
      const cur = section.dataset.cloudView || 'status';
      goView(cur === 'options' ? 'status' : 'options');
    },
    'save-url': () => {
      void ui.saveUrlFromUi().then(function () {
        ui.toast?.('URL guardada', 'success');
      });
    },
  };

  section.addEventListener('click', function (ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-cloud-action]') : null;
    if (!btn) return;
    const action = btn.getAttribute('data-cloud-action');
    if (action === 'nav-view') {
      const view = btn.getAttribute('data-cloud-view');
      if (view) goView(view);
      return;
    }
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
    const view = section.querySelector('[data-cloud-view="equipo"] .cloud-sync-view-body');
    if (view) view.insertAdjacentHTML('afterbegin', equipoStepHtml(getToken));
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

/**
 * Local snapshot for instant Conexión chrome (no network wait).
 * @param {object} deps
 * @param {string} normalizedSala
 */
export function localRoomFromSession(deps, normalizedSala) {
  const roomId = deps.getCloudSyncRoomId();
  const token = deps.getCloudSyncToken();
  if (!roomId || !token) return null;
  const snap = deps.getCloudSyncRoomSnapshot ? deps.getCloudSyncRoomSnapshot() : null;
  const revision = Number(deps.getCloudSyncRevision() || 0) || 0;
  return {
    id: String(roomId),
    revision,
    sala: String((snap && snap.sala) || normalizedSala || ''),
    code: String((snap && snap.code) || ''),
    turnKey: String((snap && snap.turnKey) || ''),
    name: String((snap && snap.name) || ''),
  };
}

/** @param {HTMLElement} section @param {object} deps @param {object} ui */
export function bootstrapConexionState(section, deps, ui) {
  const roomId = deps.getCloudSyncRoomId();
  if (roomId && deps.getCloudSyncToken()) {
    const optimistic = localRoomFromSession(deps, ui.normalizedSala);
    if (optimistic) {
      // Local snapshot is enough — skip getRoom (saves Free-tier requests).
      // Membership is validated on the next pull/push cycle.
      ui.renderConnected(optimistic);
      return;
    }
    void deps
      .getApi()
      .getRoom(roomId)
      .then(function (data) {
        if (!section.isConnected) return;
        ui.setCloudUser(null);
        ui.renderConnected(data.room || data);
      })
      .catch(function () {
        if (!section.isConnected) return;
        deps.clearCloudSyncSession();
        deps.onCloudRoomChange?.(false);
        ui.renderDisconnected();
      });
    return;
  }
  if (deps.getCloudSyncToken()) {
    ui.renderDisconnected();
    void ui.tryAutoEnsureTurnRoom().then(function (room) {
      if (room && section.isConnected) ui.renderConnected(room);
    });
    return;
  }
  ui.renderDisconnected();
}

/** @param {HTMLElement} section @param {object} deps @param {(msg: string, kind?: string) => void} toast */
export function mountAdminShell(section, deps, toast) {
  /** @type {ReturnType<import('./panel-admin.mjs').mountCloudAdminPanel> | null} */
  let adminMount = null;
  async function ensureAdminOpen() {
    const host = section.querySelector('[data-cloud-admin-host]');
    if (!host) return;
    if (!adminMount) {
      const { mountCloudAdminPanel } = await import('./panel-admin.mjs');
      host.textContent = '';
      adminMount = mountCloudAdminPanel(host, { getApi: deps.getApi, toast });
    } else {
      adminMount.refresh?.();
    }
  }
  return { ensureAdminOpen, toggleAdminPanel: ensureAdminOpen };
}
