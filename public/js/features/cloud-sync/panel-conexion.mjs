import { esc } from '../../dom-escape.mjs';
import { normalizeCloudSala } from './sala-allowlist.mjs';
import { shouldShowNubePanel } from './lan-override.mjs';
import { startCloudSyncRuntime } from './sync-runtime.mjs';
import { createOutbox } from './outbox.mjs';
import { configureCloudMutateBridge } from './mutate-bridge.mjs';
import { applyCloudPullResult } from './pull-apply.mjs';
import { bridgeCloudIdentityToLocal } from './identity-bridge.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { getLanClientId } from '../lan/runtime.mjs';
import {
  CLINICAL_LAN_USERNAME_HINT_HTML,
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  readRpcSettings,
} from '../../clinical-settings.mjs';
import { isValidUsernameFormat, normalizeUsername } from '../../clinical-username.mjs';
import { filterJoinedTeams } from '../clinical-teams/shared.mjs';

/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

const STATUS_LABELS = {
  idle: 'Al día',
  syncing: 'Sincronizando…',
  pending: 'Pendiente',
  offline: 'Sin conexión',
  error: 'Error',
};

/** @param {CloudSyncStatus} status */
function statusChipModifier(status) {
  if (status === 'syncing') return 'is-syncing';
  if (status === 'error') return 'is-error';
  if (status === 'pending' || status === 'offline') return 'is-pending';
  return 'is-idle';
}

/** @returns {boolean} */
function userHasJoinedTeam() {
  return filterJoinedTeams(clinicalSessionContext.teams, clinicalSessionContext.user).length > 0;
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   getUserSala: () => string,
 *   getCloudSyncUrl: () => string,
 *   setCloudSyncUrl: (url: string) => void,
 *   getCloudSyncToken: () => string,
 *   setCloudSyncToken: (token: string) => void,
 *   clearCloudSyncSession: () => void,
 *   getCloudSyncRoomId: () => string,
 *   setCloudSyncRoomId: (id: string) => void,
 *   getCloudSyncRevision: () => number,
 *   setCloudSyncRevision: (revision: number) => void,
 *   getApi: () => ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   toast?: (msg: string, kind?: string) => void,
 *   setStatus?: (status: CloudSyncStatus) => void,
 *   onCloudRoomChange?: (connected: boolean) => void,
 * }} deps
 */
export function mountNubeSection(root, deps) {
  const sala = deps.getUserSala();
  if (!shouldShowNubePanel(sala)) return null;

  const toast = deps.toast || function () {};
  const normalizedSala = normalizeCloudSala(sala);

  /** @type {ReturnType<typeof startCloudSyncRuntime> | null} */
  let runtime = null;
  /** @type {{ username?: string, displayName?: string } | null} */
  let cloudUser = null;

  const section = document.createElement('section');
  section.className = 'cloud-sync-conexion';
  section.setAttribute('data-cloud-nube-section', '1');

  function renderStatusChip(status) {
    const chip = section.querySelector('[data-cloud-status-chip]');
    if (!chip) return;
    chip.textContent = STATUS_LABELS[status] || status;
    chip.className = 'cloud-sync-status-chip ' + statusChipModifier(status);
    chip.setAttribute('data-status', status);
    deps.setStatus?.(status);
  }

  function stopRuntime() {
    if (runtime) {
      runtime.stop();
      runtime = null;
    }
  }

  function startRuntime() {
    stopRuntime();
    const roomId = deps.getCloudSyncRoomId();
    if (!roomId || !deps.getCloudSyncToken()) return;
    const outbox = createOutbox();
    runtime = startCloudSyncRuntime({
      api: deps.getApi(),
      outbox,
      getRoomId: deps.getCloudSyncRoomId,
      getRevision: deps.getCloudSyncRevision,
      setRevision: deps.setCloudSyncRevision,
      onStatus: renderStatusChip,
      applyPullResult: async function (result) {
        try {
          await applyCloudPullResult(result);
        } catch {
          toast('No se pudieron aplicar los cambios de la nube.', 'error');
        }
      },
    });
    configureCloudMutateBridge({
      outbox,
      getRevision: deps.getCloudSyncRevision,
      flush: function () {
        return runtime?.flushOutbox();
      },
      getActorId: function () {
        return String(clinicalSessionContext.user?.user_id || getLanClientId() || 'local');
      },
    });
    void runtime.syncCycle();
    deps.onCloudRoomChange?.(true);
  }

  function accountSummaryHtml() {
    const settings = readRpcSettings();
    const handle = normalizeUsername(
      cloudUser?.username || clinicalSessionContext.user?.username || settings.clinicalUsername || ''
    );
    const display =
      cloudUser?.displayName ||
      clinicalSessionContext.user?.clinical_name ||
      settings.clinicalDisplayName ||
      '';
    return (
      '<div class="cloud-sync-account-summary">' +
      '<p><span class="cloud-sync-account-label">Usuario</span> ' +
      '<strong>@' +
      esc(handle || '—') +
      '</strong></p>' +
      '<p><span class="cloud-sync-account-label">Nombre en guardia</span> ' +
      '<strong>' +
      esc(display || '—') +
      '</strong></p>' +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-action="logout">' +
      'Cerrar sesión</button></div>'
    );
  }

  function authFormsHtml() {
    const url = deps.getCloudSyncUrl();
    return (
      '<div class="cloud-sync-account-forms">' +
      '<details class="cloud-sync-auth-block" open>' +
      '<summary>Crear cuenta</summary>' +
      '<div class="cloud-sync-field">' +
      '<label>Usuario LAN (@usuario)</label>' +
      '<input type="text" class="profile-input" data-cloud-reg-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false" />' +
      '<p class="cloud-sync-hint">' +
      CLINICAL_LAN_USERNAME_HINT_HTML +
      '</p></div>' +
      '<div class="cloud-sync-field">' +
      '<label>Nombre en guardia</label>' +
      '<input type="text" class="profile-input" data-cloud-reg-display autocomplete="name" placeholder="ej. Dr. Mendoza" />' +
      '<p class="cloud-sync-hint">' +
      CLINICAL_LAN_DISPLAY_NAME_HINT_HTML +
      '</p></div>' +
      '<div class="cloud-sync-field">' +
      '<label>Contraseña</label>' +
      '<input type="password" class="profile-input" data-cloud-reg-pass autocomplete="new-password" /></div>' +
      '<button type="button" class="cloud-sync-btn" data-cloud-action="register">Crear cuenta</button></details>' +
      '<details class="cloud-sync-auth-block">' +
      '<summary>Entrar</summary>' +
      '<div class="cloud-sync-field">' +
      '<label>Usuario LAN (@usuario)</label>' +
      '<input type="text" class="profile-input" data-cloud-login-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false" /></div>' +
      '<div class="cloud-sync-field">' +
      '<label>Contraseña</label>' +
      '<input type="password" class="profile-input" data-cloud-login-pass autocomplete="current-password" /></div>' +
      '<button type="button" class="cloud-sync-btn" data-cloud-action="login">Entrar</button></details>' +
      '<details class="cloud-sync-advanced">' +
      '<summary>Avanzado</summary>' +
      '<div class="cloud-sync-field">' +
      '<label for="cloud-sync-url">URL del servicio</label>' +
      '<input id="cloud-sync-url" type="url" class="profile-input" data-cloud-sync-url value="' +
      esc(url) +
      '" placeholder="https://…workers.dev" /></div></details></div>'
    );
  }

  function nextStepHtml() {
    if (!deps.getCloudSyncToken() || userHasJoinedTeam()) return '';
    return (
      '<div class="cloud-sync-next-step">' +
      '<p class="cloud-sync-next-step-lead">Siguiente paso</p>' +
      '<p class="cloud-sync-hint">Configurá tu equipo en Mi rotación para sincronizar con tu guardia.</p>' +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cloud-action="open-rotation">' +
      'Ir a Mi rotación</button></div>'
    );
  }

  function roomConnectedHtml(room) {
    const code = String(room?.code || '').trim();
    const revision = room?.revision ?? deps.getCloudSyncRevision();
    return (
      '<div class="cloud-sync-room cloud-sync-room--connected">' +
      '<p class="cloud-sync-room-title">Sala nube</p>' +
      '<dl class="cloud-sync-room-meta">' +
      '<div><dt>Código</dt><dd><code data-cloud-room-code>' +
      esc(code) +
      '</code></dd></div>' +
      '<div><dt>Revisión</dt><dd><span data-cloud-room-revision>' +
      esc(String(revision)) +
      '</span></dd></div></dl>' +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger" data-cloud-action="leave-room">' +
      'Salir de la sala</button></div>'
    );
  }

  function roomActionsHtml() {
    return (
      '<div class="cloud-sync-room cloud-sync-room--actions">' +
      '<p class="cloud-sync-room-title">Unirse a una sala del turno</p>' +
      '<div class="cloud-sync-field">' +
      '<label>Nombre de la sala (opcional)</label>' +
      '<input type="text" class="profile-input" data-cloud-room-name placeholder="Turno ' +
      esc(normalizedSala) +
      '" /></div>' +
      '<button type="button" class="cloud-sync-btn" data-cloud-action="create-room">Crear sala</button>' +
      '<div class="cloud-sync-field">' +
      '<label>Código de sala</label>' +
      '<input type="text" class="profile-input" data-cloud-join-code placeholder="ABC123" /></div>' +
      '<button type="button" class="cloud-sync-btn" data-cloud-action="join-room">Unirse con código</button></div>'
    );
  }

  function advancedUrlHtml() {
    const url = deps.getCloudSyncUrl();
    return (
      '<details class="cloud-sync-advanced">' +
      '<summary>Avanzado</summary>' +
      '<div class="cloud-sync-field">' +
      '<label for="cloud-sync-url-connected">URL del servicio</label>' +
      '<input id="cloud-sync-url-connected" type="url" class="profile-input" data-cloud-sync-url value="' +
      esc(url) +
      '" placeholder="https://…workers.dev" /></div></details>'
    );
  }

  function renderShell(bodyHtml, status) {
    section.innerHTML =
      '<header class="cloud-sync-conexion-head">' +
      '<h4 class="cloud-sync-conexion-title">Conexión — ' +
      esc(normalizedSala) +
      '</h4>' +
      '<span class="cloud-sync-status-chip ' +
      statusChipModifier(status) +
      '" data-cloud-status-chip data-status="' +
      esc(status) +
      '">' +
      esc(STATUS_LABELS[status]) +
      '</span></header>' +
      '<p class="cloud-sync-lead">En Sala y Torre HU la nube sustituye al anfitrión LAN. ' +
      'Interconsultas, UX, Eme y Área A siguen en LAN.</p>' +
      bodyHtml;
  }

  function renderConnected(room) {
    renderShell(
      '<div class="cloud-sync-account">' +
        accountSummaryHtml() +
        '</div>' +
        nextStepHtml() +
        roomConnectedHtml(room) +
        advancedUrlHtml(),
      'idle'
    );
    startRuntime();
  }

  function renderDisconnected() {
    const hasToken = !!deps.getCloudSyncToken();
    renderShell(
      '<div class="cloud-sync-account">' +
        (hasToken ? accountSummaryHtml() : authFormsHtml()) +
        '</div>' +
        (hasToken ? nextStepHtml() + roomActionsHtml() + advancedUrlHtml() : ''),
      hasToken ? 'idle' : 'offline'
    );
  }

  async function saveUrlFromUi() {
    const input = section.querySelector('[data-cloud-sync-url]');
    if (input) deps.setCloudSyncUrl(String(input.value || '').trim());
  }

  async function tryAutoEnsureTurnRoom() {
    if (!userHasJoinedTeam() || deps.getCloudSyncRoomId()) return null;
    const { ensureTurnRoom } = await import('./ensure-turn-room.mjs');
    return ensureTurnRoom({
      api: deps.getApi(),
      getSala: deps.getUserSala,
      getToken: deps.getCloudSyncToken,
      setCloudSyncRoomId: deps.setCloudSyncRoomId,
      setCloudSyncRevision: deps.setCloudSyncRevision,
      onConnected: function (room) {
        deps.onCloudRoomChange?.(true);
        renderConnected(room);
      },
      toast,
    });
  }

  async function afterAuthSuccess(user) {
    cloudUser = {
      username: user?.username || '',
      displayName: user?.displayName || '',
    };
    await bridgeCloudIdentityToLocal({
      username: cloudUser.username,
      displayName: cloudUser.displayName,
    });
    await tryAutoEnsureTurnRoom();
  }

  async function handleRegister() {
    await saveUrlFromUi();
    const user = section.querySelector('[data-cloud-reg-user]');
    const pass = section.querySelector('[data-cloud-reg-pass]');
    const display = section.querySelector('[data-cloud-reg-display]');
    const username = normalizeUsername(String(user?.value || ''));
    const displayName = String(display?.value || '').trim();
    const password = String(pass?.value || '');

    if (!isValidUsernameFormat(username)) {
      toast('Usuario inválido: minúsculas, sin espacios, 3–32 caracteres.', 'error');
      return;
    }
    if (!displayName) {
      toast('Ingresá tu nombre en guardia.', 'error');
      return;
    }
    if (!password) {
      toast('Ingresá una contraseña.', 'error');
      return;
    }

    try {
      const data = await deps.getApi().register({ username, password, displayName });
      deps.setCloudSyncToken(data.token);
      await afterAuthSuccess(data.user || { username, displayName });
      toast('Cuenta creada.', 'success');
      if (!deps.getCloudSyncRoomId()) renderDisconnected();
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo registrar.', 'error');
    }
  }

  async function handleLogin() {
    await saveUrlFromUi();
    const user = section.querySelector('[data-cloud-login-user]');
    const pass = section.querySelector('[data-cloud-login-pass]');
    const username = normalizeUsername(String(user?.value || ''));
    const password = String(pass?.value || '');

    if (!username || !password) {
      toast('Usuario y contraseña requeridos.', 'error');
      return;
    }

    try {
      const data = await deps.getApi().login({ username, password });
      deps.setCloudSyncToken(data.token);
      await afterAuthSuccess(data.user || { username });
      toast('Sesión iniciada.', 'success');
      if (!deps.getCloudSyncRoomId()) renderDisconnected();
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo iniciar sesión.', 'error');
    }
  }

  async function handleCreateRoom() {
    await saveUrlFromUi();
    if (!deps.getCloudSyncToken()) {
      toast('Iniciá sesión primero.', 'error');
      return;
    }
    const nameInput = section.querySelector('[data-cloud-room-name]');
    const name = String(nameInput?.value || '').trim() || 'Turno ' + normalizedSala;
    try {
      const data = await deps.getApi().createRoom({ name, sala: normalizedSala });
      const room = data.room;
      deps.setCloudSyncRoomId(room.id);
      deps.setCloudSyncRevision(Number(room.revision) || 0);
      renderConnected(room);
      toast('Sala creada: ' + room.code, 'success');
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo crear la sala.', 'error');
    }
  }

  async function handleJoinRoom() {
    await saveUrlFromUi();
    if (!deps.getCloudSyncToken()) {
      toast('Iniciá sesión primero.', 'error');
      return;
    }
    const codeInput = section.querySelector('[data-cloud-join-code]');
    const code = String(codeInput?.value || '').trim();
    if (!code) {
      toast('Ingresá el código de sala.', 'error');
      return;
    }
    try {
      const data = await deps.getApi().joinRoom({ code });
      const room = data.room;
      deps.setCloudSyncRoomId(room.id);
      deps.setCloudSyncRevision(Number(room.revision) || 0);
      renderConnected(room);
      toast('Unido a la sala ' + room.code + '.', 'success');
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo unir a la sala.', 'error');
    }
  }

  async function handleLeaveRoom() {
    const roomId = deps.getCloudSyncRoomId();
    stopRuntime();
    try {
      if (roomId) await deps.getApi().leaveRoom(roomId);
    } catch {
      /* best-effort */
    }
    deps.clearCloudSyncSession();
    deps.onCloudRoomChange?.(false);
    toast('Saliste de la sala en la nube.', 'info');
    renderDisconnected();
  }

  async function handleLogout() {
    stopRuntime();
    try {
      await deps.getApi().logout();
    } catch {
      /* ignore */
    }
    deps.clearCloudSyncSession();
    cloudUser = null;
    deps.onCloudRoomChange?.(false);
    renderDisconnected();
  }

  async function handleOpenRotation() {
    try {
      const { openMiRotacion } = await import('../clinical-rotation-entry.mjs');
      await openMiRotacion();
    } catch {
      toast('No se pudo abrir Mi rotación.', 'error');
    }
  }

  section.addEventListener('click', function (ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-cloud-action]') : null;
    if (!btn) return;
    const action = btn.getAttribute('data-cloud-action');
    if (action === 'register') void handleRegister();
    else if (action === 'login') void handleLogin();
    else if (action === 'create-room') void handleCreateRoom();
    else if (action === 'join-room') void handleJoinRoom();
    else if (action === 'leave-room') void handleLeaveRoom();
    else if (action === 'logout') void handleLogout();
    else if (action === 'open-rotation') void handleOpenRotation();
  });

  document.addEventListener('rpc-clinical-teams-changed', function onTeamsChanged() {
    if (!section.isConnected) return;
    const roomId = deps.getCloudSyncRoomId();
    if (roomId && deps.getCloudSyncToken()) {
      const next = section.querySelector('.cloud-sync-next-step');
      if (userHasJoinedTeam() && next) next.remove();
      else if (!userHasJoinedTeam() && !next) {
        const anchor = section.querySelector('.cloud-sync-account');
        if (anchor) anchor.insertAdjacentHTML('afterend', nextStepHtml());
      }
    } else if (deps.getCloudSyncToken()) {
      renderDisconnected();
    }
  });

  const roomId = deps.getCloudSyncRoomId();
  if (roomId && deps.getCloudSyncToken()) {
    void deps
      .getApi()
      .getRoom(roomId)
      .then(function (data) {
        cloudUser = null;
        renderConnected(data.room || data);
      })
      .catch(function () {
        deps.clearCloudSyncSession();
        deps.onCloudRoomChange?.(false);
        renderDisconnected();
      });
  } else {
    renderDisconnected();
  }

  root.appendChild(section);
  return {
    section,
    stop() {
      stopRuntime();
    },
  };
}
