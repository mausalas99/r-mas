import { createCloudSyncApi } from '../cloud-sync/api-client.mjs';
import { wireCloudAuthTabs } from '../cloud-sync/panel-steps-html.mjs';
import {
  readLoginForm,
  readRegisterForm,
  validateRegisterForm,
  toastRegisterError,
} from '../cloud-sync/panel-conexion-handlers.mjs';
import { bridgeCloudIdentityToLocal } from '../cloud-sync/identity-bridge.mjs';
import { drawLoadingShell, drawLoginShell } from './login-ui-view.jsx';
import {
  getCloudSyncToken,
  getCloudSyncRoomId,
  setCloudSyncRoomSnapshot,
  setCloudMobileToken,
  readCloudMobileJoinCode,
  readCloudMobileJoinUser,
  getCloudSyncUrl,
  persistCloudMobilePairingFromRoom,
} from './session.mjs';
import { buildCloudMobileBookmarkUrl } from './invite-url.mjs';
import { resolveCloudMobileActiveRoom } from './resolve-active-room.mjs';
import { loadRoomDek } from '../cloud-sync/room-dek.mjs';
import {
  CLOUD_MOBILE_ROOM_RESOLVE_TIMEOUT_MS,
  withCloudMobileBootTimeout,
} from './boot-timeout.mjs';
import { notify } from '../../toast-notify.mjs';

function resolveApiBaseUrl() {
  try {
    if (typeof location !== 'undefined' && location.origin) {
      return String(location.origin).replace(/\/+$/, '');
    }
  } catch {
    /* ignore */
  }
  return getCloudSyncUrl();
}

function createApi() {
  return createCloudSyncApi({
    getBaseUrl: resolveApiBaseUrl,
    getToken: getCloudSyncToken,
  });
}

/** @param {string} msg @param {string} [kind] */
function toast(msg, kind) {
  try { notify(msg, kind); } catch { /* a failing toast must not break login */ }
}

/** @param {{ recoveryCode?: string } | null | undefined} data */
async function maybeShowRecoveryCodeModal(data) {
  const code = String(data?.recoveryCode || '').trim();
  if (!code) return;
  try {
    const { showRecoveryCodeModal } = await import('../cloud-sync/recovery-modal.mjs');
    await showRecoveryCodeModal({ code });
  } catch {
    /* ignore */
  }
}

/** @param {string} [user] */
export function rewriteCloudMobileBookmarkUrl(user) {
  try {
    if (typeof location === 'undefined' || !location.origin) return;
    const next = buildCloudMobileBookmarkUrl({
      baseUrl: location.origin,
      user: user || readCloudMobileJoinUser(),
      auth: getCloudSyncToken() || undefined,
    });
    if (!next) return;
    const path = next.replace(location.origin, '');
    history.replaceState(null, '', path || next);
  } catch {
    /* ignore */
  }
}

/** @param {HTMLElement} gate */
export function dismissCloudMobileGate(gate) {
  gate.hidden = true;
  gate.replaceChildren();
  document.body.classList.remove('rpc-cloud-mobile-gated');
}

/**
 * @param {HTMLElement} section
 * @param {'auth' | 'join'} mode
 * @param {string} [prefilled]
 */
function renderShell(section, mode, prefilled) {
  drawLoginShell(section, mode, mode === 'join' ? prefilled || '' : prefilled || readCloudMobileJoinUser());
  if (mode === 'auth') wireCloudAuthTabs(section);
}

/** @param {HTMLElement} section @param {() => void} onConnected */
function wireShellActions(section, onConnected) {
  if (section.dataset.cloudMobileWired === '1') return;
  section.dataset.cloudMobileWired = '1';
  section.addEventListener('click', function (ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-cloud-action]') : null;
    if (!btn || !section.contains(btn)) return;
    const action = btn.getAttribute('data-cloud-action');
    if (action === 'login') void handleLogin(section, onConnected);
    else if (action === 'register') void handleRegister(section, onConnected);
    else if (action === 'join-room') void handleJoinRoom(section, onConnected);
  });
}

/**
 * @param {string} code
 * @param {() => void} onConnected
 * @returns {Promise<boolean>}
 */
export async function joinCloudMobileRoomByCode(code, onConnected) {
  const trimmed = String(code || '').trim();
  if (!trimmed) return false;
  if (!getCloudSyncToken()) return false;
  try {
    const api = createApi();
    const data = await api.joinRoom({ code: trimmed });
    const room = data.room;
    setCloudSyncRoomSnapshot(room);
    persistCloudMobilePairingFromRoom(room);
    rewriteCloudMobileBookmarkUrl();
    // Best-effort: without the room's decryption key every patient renders
    // as empty, with no error. Same load-after-join step as the desktop
    // panel-conexion-handlers.mjs join handler.
    try {
      await loadRoomDek(api, room.id, room.code);
    } catch {
      /* patient identity still renders; clinical content stays locked */
    }
    toast('Unido a la sala ' + room.code + '.', 'success');
    onConnected();
    return true;
  } catch (err) {
    toast(err?.data?.message || err?.message || 'No se pudo unir a la sala.', 'error');
    return false;
  }
}

/** @param {() => void} onConnected */
async function continueAfterAuth(onConnected) {
  const room = await resolveCloudMobileActiveRoom();
  if (room?.id) {
    onConnected();
    return;
  }
  const code = readCloudMobileJoinCode();
  if (code) {
    const ok = await joinCloudMobileRoomByCode(code, onConnected);
    if (ok) return;
  }
}

/** @param {HTMLElement} section @param {() => void} onConnected */
async function handleLogin(section, onConnected) {
  const form = readLoginForm(section);
  if (!form.username || !form.password) {
    toast('Usuario y contraseña requeridos.', 'error');
    return;
  }
  try {
    const data = await createApi().login({
      username: form.username,
      password: form.password,
    });
    setCloudMobileToken(data.token);
    await maybeShowRecoveryCodeModal(data);
    await bridgeCloudIdentityToLocal(data.user || { username: form.username });
    toast('Sesión nube iniciada.', 'success');
    await continueAfterAuth(onConnected);
    if (!getCloudSyncRoomId()) {
      renderShell(section, 'join', readCloudMobileJoinCode());
    }
  } catch (err) {
    toast(err?.data?.message || err?.message || 'No se pudo iniciar sesión.', 'error');
  }
}

/** @param {HTMLElement} section @param {() => void} onConnected */
async function handleRegister(section, onConnected) {
  const form = readRegisterForm(section);
  if (!validateRegisterForm(form, toast)) return;
  try {
    const data = await createApi().register(form);
    setCloudMobileToken(data.token);
    await maybeShowRecoveryCodeModal(data);
    await bridgeCloudIdentityToLocal(data.user || form);
    toast('Cuenta creada. Sesión nube iniciada.', 'success');
    await continueAfterAuth(onConnected);
    if (!getCloudSyncRoomId()) {
      renderShell(section, 'join', readCloudMobileJoinCode());
    }
  } catch (err) {
    toastRegisterError(err, toast);
  }
}

/** @param {HTMLElement} section @param {() => void} onConnected */
async function handleJoinRoom(section, onConnected) {
  if (!getCloudSyncToken()) {
    toast('Inicia sesión primero.', 'error');
    renderShell(section, 'auth');
    return;
  }
  const codeInput = section.querySelector('[data-cloud-join-code]');
  const code = String(codeInput?.value || '').trim();
  if (!code) {
    toast('Ingresa el código de sala.', 'error');
    return;
  }
  await joinCloudMobileRoomByCode(code, onConnected);
}

/**
 * @param {HTMLElement} root — gate overlay host
 * @param {{ onConnected: () => void }} opts
 */
export function mountCloudMobileLoginShell(root, { onConnected }) {
  document.body.classList.add('rpc-cloud-mobile-gated');
  root.hidden = false;

  const section = document.createElement('section');
  section.className = 'rpc-cloud-mobile-modal material-solid-elevated ui-overlay-dialog';
  section.setAttribute('role', 'dialog');
  section.setAttribute('aria-modal', 'true');
  section.setAttribute('aria-labelledby', 'rpc-cloud-mobile-modal-title');
  root.replaceChildren(section);

  if (getCloudSyncToken() && !getCloudSyncRoomId()) {
    wireShellActions(section, onConnected);
    drawLoadingShell(section);
    void withCloudMobileBootTimeout(
      resolveCloudMobileActiveRoom(),
      CLOUD_MOBILE_ROOM_RESOLVE_TIMEOUT_MS,
      'room_resolve_timeout'
    )
      .then(function (room) {
        if (room?.id) {
          onConnected();
          return;
        }
        renderShell(section, 'join', readCloudMobileJoinCode());
        const code = readCloudMobileJoinCode();
        if (code) {
          void joinCloudMobileRoomByCode(code, onConnected).then(function (ok) {
            if (!ok && !getCloudSyncRoomId()) {
              renderShell(section, 'join', code);
            }
          });
        }
      })
      .catch(function () {
        toast('No se pudo contactar la nube. Revisa la red e intenta de nuevo.', 'error');
        renderShell(section, 'join', readCloudMobileJoinCode());
      });
    return;
  }

  renderShell(section, 'auth', readCloudMobileJoinUser());
  wireShellActions(section, onConnected);
}
