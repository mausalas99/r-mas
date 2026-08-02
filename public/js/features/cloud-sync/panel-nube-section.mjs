import { esc } from '../../dom-escape.mjs';
import { normalizeCloudSala } from './sala-allowlist.mjs';
import { shouldShowNubePanel } from './lan-override.mjs';
import { startCloudSyncRuntime } from './sync-runtime.mjs';
import { createOutbox } from './outbox.mjs';

/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

const STATUS_LABELS = {
  idle: 'Al día',
  syncing: 'Sincronizando…',
  pending: 'Pendiente',
  offline: 'Sin conexión',
  error: 'Error',
};

/** @param {CloudSyncStatus} status */
function statusChipClass(status) {
  if (status === 'syncing') return 'is-live';
  if (status === 'error') return 'is-error';
  if (status === 'pending' || status === 'offline') return 'is-pending';
  return 'is-live';
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

  const section = document.createElement('section');
  section.className = 'cloud-sync-nube-section equipos-cloud-setup';
  section.setAttribute('data-cloud-nube-section', '1');

  function renderStatusChip(status) {
    const chip = section.querySelector('[data-cloud-status-chip]');
    if (!chip) return;
    chip.textContent = STATUS_LABELS[status] || status;
    chip.className = 'equipos-cloud-badge ' + statusChipClass(status);
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
    runtime = startCloudSyncRuntime({
      api: deps.getApi(),
      outbox: createOutbox(),
      getRoomId: deps.getCloudSyncRoomId,
      getRevision: deps.getCloudSyncRevision,
      setRevision: deps.setCloudSyncRevision,
      onStatus: renderStatusChip,
      applyPullResult: async function () {
        toast('Sincronización en la nube activa (aplicar cambios en próxima tarea).', 'info');
      },
    });
    deps.onCloudRoomChange?.(true);
  }

  function renderConnected(room) {
    const code = String(room?.code || '').trim();
    const revision = room?.revision ?? deps.getCloudSyncRevision();
  section.innerHTML =
      '<div class="equipos-cloud-setup-head">' +
      '<h4 class="equipos-cloud-setup-title">Nube — ' +
      esc(normalizedSala) +
      '</h4>' +
      '<span class="equipos-cloud-badge is-live" data-cloud-status-chip>Al día</span></div>' +
      '<p class="equipos-cloud-setup-hint">En Sala y Torre HU la nube sustituye al anfitrión LAN. ' +
      'Interconsultas, UX, Eme y Área A siguen en LAN.</p>' +
      '<div class="cloud-sync-connected-meta">' +
      '<p><strong>Código:</strong> <code data-cloud-room-code>' +
      esc(code) +
      '</code></p>' +
      '<p><strong>Revisión:</strong> <span data-cloud-room-revision>' +
      esc(String(revision)) +
      '</span></p>' +
      '</div>' +
      '<div class="equipos-cloud-fields">' +
      '<button type="button" class="btn-settings-row btn-settings-row--danger" data-cloud-action="leave-room">' +
      'Salir de la sala</button></div>';

    startRuntime();
  }

  function renderAuthForms() {
    const hasToken = !!deps.getCloudSyncToken();
    const url = deps.getCloudSyncUrl();

    section.innerHTML =
      '<div class="equipos-cloud-setup-head">' +
      '<h4 class="equipos-cloud-setup-title">Nube — ' +
      esc(normalizedSala) +
      '</h4></div>' +
      '<p class="equipos-cloud-setup-hint">En Sala y Torre HU la nube sustituye al anfitrión LAN. ' +
      'Interconsultas, UX, Eme y Área A siguen en LAN.</p>' +
      '<div class="equipos-cloud-fields">' +
      '<div class="lan-connect-field"><label for="cloud-sync-url">URL del servicio</label>' +
      '<input id="cloud-sync-url" type="url" class="profile-input" data-cloud-sync-url value="' +
      esc(url) +
      '" placeholder="https://…workers.dev" /></div>' +
      (hasToken
        ? '<p class="cloud-sync-auth-hint">Sesión iniciada. Creá o unite a una sala del turno.</p>'
        : '<details class="cloud-sync-auth-block" open><summary>Registrarse</summary>' +
          '<div class="lan-connect-field"><label>Usuario</label>' +
          '<input type="text" class="profile-input" data-cloud-reg-user autocomplete="username" /></div>' +
          '<div class="lan-connect-field"><label>Contraseña</label>' +
          '<input type="password" class="profile-input" data-cloud-reg-pass autocomplete="new-password" /></div>' +
          '<div class="lan-connect-field"><label>Nombre para mostrar</label>' +
          '<input type="text" class="profile-input" data-cloud-reg-display /></div>' +
          '<button type="button" class="btn-settings-row" data-cloud-action="register">Crear cuenta</button></details>' +
          '<details class="cloud-sync-auth-block"><summary>Iniciar sesión</summary>' +
          '<div class="lan-connect-field"><label>Usuario</label>' +
          '<input type="text" class="profile-input" data-cloud-login-user autocomplete="username" /></div>' +
          '<div class="lan-connect-field"><label>Contraseña</label>' +
          '<input type="password" class="profile-input" data-cloud-login-pass autocomplete="current-password" /></div>' +
          '<button type="button" class="btn-settings-row" data-cloud-action="login">Entrar</button></details>') +
      '<div class="cloud-sync-room-actions">' +
      '<div class="lan-connect-field"><label>Nombre de la sala (opcional)</label>' +
      '<input type="text" class="profile-input" data-cloud-room-name placeholder="Turno ' +
      esc(normalizedSala) +
      '" /></div>' +
      '<button type="button" class="btn-settings-row" data-cloud-action="create-room">Crear sala</button>' +
      '<div class="lan-connect-field"><label>Código de sala</label>' +
      '<input type="text" class="profile-input" data-cloud-join-code placeholder="ABC123" /></div>' +
      '<button type="button" class="btn-settings-row" data-cloud-action="join-room">Unirse con código</button>' +
      (hasToken
        ? '<button type="button" class="btn-settings-row btn-settings-row--warn" data-cloud-action="logout">Cerrar sesión</button>'
        : '') +
      '</div></div>';
  }

  async function saveUrlFromUi() {
    const input = section.querySelector('[data-cloud-sync-url]');
    if (input) deps.setCloudSyncUrl(String(input.value || '').trim());
  }

  async function handleRegister() {
    await saveUrlFromUi();
    const user = section.querySelector('[data-cloud-reg-user]');
    const pass = section.querySelector('[data-cloud-reg-pass]');
    const display = section.querySelector('[data-cloud-reg-display]');
    try {
      const data = await deps.getApi().register({
        username: String(user?.value || '').trim(),
        password: String(pass?.value || ''),
        displayName: String(display?.value || '').trim(),
      });
      deps.setCloudSyncToken(data.token);
      toast('Cuenta creada.', 'success');
      renderAuthForms();
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo registrar.', 'error');
    }
  }

  async function handleLogin() {
    await saveUrlFromUi();
    const user = section.querySelector('[data-cloud-login-user]');
    const pass = section.querySelector('[data-cloud-login-pass]');
    try {
      const data = await deps.getApi().login({
        username: String(user?.value || '').trim(),
        password: String(pass?.value || ''),
      });
      deps.setCloudSyncToken(data.token);
      toast('Sesión iniciada.', 'success');
      renderAuthForms();
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
      // Best-effort leave.
    }
    deps.clearCloudSyncSession();
    deps.onCloudRoomChange?.(false);
    toast('Saliste de la sala en la nube.', 'info');
    renderAuthForms();
  }

  async function handleLogout() {
    stopRuntime();
    try {
      await deps.getApi().logout();
    } catch {
      // ignore
    }
    deps.clearCloudSyncSession();
    deps.onCloudRoomChange?.(false);
    renderAuthForms();
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
  });

  const roomId = deps.getCloudSyncRoomId();
  if (roomId && deps.getCloudSyncToken()) {
    void deps
      .getApi()
      .getRoom(roomId)
      .then(function (data) {
        renderConnected(data.room || data);
      })
      .catch(function () {
        deps.clearCloudSyncSession();
        deps.onCloudRoomChange?.(false);
        renderAuthForms();
      });
  } else {
    renderAuthForms();
  }

  root.appendChild(section);
  return {
    section,
    stop() {
      stopRuntime();
    },
  };
}
