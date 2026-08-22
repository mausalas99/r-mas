import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { canAccessCloudAdmin } from './panel-admin.mjs';
import { nextStepHtml, userHasJoinedTeam } from './panel-conexion-html.mjs';
import { applyConexionView } from './panel-conexion-views.mjs';
import { mountEquipoTeamsPanel } from './panel-equipo-embed.mjs';
import { wireClinicalTeamsFormDelegation } from '../clinical-teams/teams-roster-form-delegation.mjs';
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
import { mountCloudMobileInviteInHost } from './panel-mobile-invite.mjs';
import { refreshCloudSyncDiagnostics } from './panel-cloud-diagnostics.mjs';
import { hydrateRoomDeksFromPersistence } from './room-dek.mjs';
import { getStoredRoomDeks } from './settings.mjs';
import { promptAndApplyRemotePatientDeletes } from './remote-patient-delete-confirm.mjs';

/** @param {boolean} [hasCloudSession] @returns {string} */
export function adminShellHtml(hasCloudSession = false) {
  if (!canAccessCloudAdmin(clinicalSessionContext.user, { hasCloudSession })) return '';
  return '<div class="cloud-sync-admin-host" data-cloud-admin-host></div>';
}

/** @param {HTMLElement} section @param {object} deps @param {object} ui */
function buildConexionGoView(section, deps, ui) {
  return function goView(view) {
    applyConexionView(section, view, {
      onAdmin: ui.ensureAdminOpen,
      onMobile() {
        mountCloudMobileInviteInHost(
          section.querySelector('[data-cloud-mobile-invite-host]'),
          { runtime: deps.runtime }
        );
      },
      onNube() {
        refreshCloudSyncDiagnostics(section.querySelector('[data-cloud-nube-diagnostics-host]'), {
          toast: ui.toast,
        });
      },
      onEquipo() {
        mountEquipoTeamsPanel(section.querySelector('[data-cloud-equipo-host]'), {
          toast: ui.toast,
        });
      },
      onStatusHome() {
        ui.refreshStatusChipFromRuntime?.();
      },
    });
  };
}

/** @param {object} handlerDeps @param {object} ui @param {(view: string) => void} goView */
function buildConexionClickActions(handlerDeps, ui, goView) {
  return {
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
      const cur = handlerDeps.section.dataset.cloudView || 'status';
      goView(cur === 'options' ? 'status' : 'options');
    },
    'save-url': () => {
      void ui.saveUrlFromUi().then(function () {
        ui.toast?.('URL guardada', 'success');
      });
    },
  };
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
    getCloudSyncRemember: deps.getCloudSyncRemember,
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
  const goView = buildConexionGoView(section, deps, ui);
  const clickActions = buildConexionClickActions(handlerDeps, ui, goView);

  function onCloudActionClick(ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-cloud-action]') : null;
    if (!btn) return;
    // Modal-head back lives outside the section; still handle it here.
    if (!section.contains(btn) && btn.id !== 'btn-connection-dropdown-back') return;
    const action = btn.getAttribute('data-cloud-action');
    if (action === 'nav-view') {
      const view = btn.getAttribute('data-cloud-view');
      if (view) goView(view);
      return;
    }
    if (action === 'review-remote-delete') {
      const patientId = btn.getAttribute('data-patient-id') || '';
      const deletedAt = btn.getAttribute('data-deleted-at') || '';
      if (patientId) {
        void promptAndApplyRemotePatientDeletes([{ patientId, deletedAt }]).then(function () {
          handlerDeps.renderConnected(handlerDeps.getCloudSyncRoomSnapshot?.());
        });
      }
      return;
    }
    if (action && clickActions[action]) clickActions[action]();
  }

  section.addEventListener('click', onCloudActionClick);
  document
    .getElementById('connection-dropdown')
    ?.addEventListener('click', onCloudActionClick);
  wireClinicalTeamsFormDelegation(section);
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
      // Equipo roster refresh is owned by wireClinicalTeamsControls → refreshTeamsUiAfterChange.
      // Remounting here (skeleton) caused intermittent flashes while Equipo was open.
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

/** Reconcile sticky roomId with canonical sala+month room (ensure-turn). */
function reconcileCanonicalCloudRoom(section, deps, ui, cachedRoomId) {
  if (typeof ui.tryAutoEnsureTurnRoom !== 'function') return;
  const snapCode = String(deps.getCloudSyncRoomSnapshot?.()?.code || '').trim();
  void ui.tryAutoEnsureTurnRoom().then(function (room) {
    if (!room || !section.isConnected) return;
    const nextId = String(room.id || '').trim();
    const cachedId = String(cachedRoomId || '').trim();
    const roomCode = String(room.code || '').trim();
    if (roomCode && (!snapCode || (nextId && nextId !== cachedId))) {
      ui.renderConnected(room);
    }
  });
}

/** @param {HTMLElement} section @param {object} deps @param {object} ui */
export function bootstrapConexionState(section, deps, ui) {
  const roomId = deps.getCloudSyncRoomId();
  if (roomId && deps.getCloudSyncToken()) {
    // Restore any room DEKs held from a prior run — skips re-asking for the Nube
    // password when the room's content is encrypted. Fire-and-forget: decrypt call
    // sites read the cache lazily, no render needs to wait on this.
    void hydrateRoomDeksFromPersistence(getStoredRoomDeks());
    reconcileCanonicalCloudRoom(section, deps, ui, roomId);
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
      .catch(function (err) {
        if (!section.isConnected) return;
        const status = Number(err && err.status) || 0;
        // Only drop Recuérdame / auth on real auth failures — network or
        // missing-room errors must not wipe the persisted token.
        if (status === 401 || status === 403) {
          deps.clearCloudSyncSession();
          deps.onCloudRoomChange?.(false);
          ui.renderDisconnected();
          return;
        }
        deps.onCloudRoomChange?.(false);
        ui.renderDisconnected();
        void ui.tryAutoEnsureTurnRoom?.().then(function (room) {
          if (room && section.isConnected) ui.renderConnected(room);
        });
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
