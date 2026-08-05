import { createCloudSyncApi } from '../cloud-sync/api-client.mjs';
import { wireCloudAuthTabs } from '../cloud-sync/panel-steps-html.mjs';
import {
  readLoginForm,
  readRegisterForm,
  validateRegisterForm,
  toastRegisterError,
} from '../cloud-sync/panel-conexion-handlers.mjs';
import { bridgeCloudIdentityToLocal } from '../cloud-sync/identity-bridge.mjs';
import {
  CLINICAL_LAN_USERNAME_HINT_HTML,
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
} from '../../clinical-settings.mjs';
import { esc } from '../../dom-escape.mjs';
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
  try {
    window.showToast?.(msg, kind);
  } catch {
    /* ignore */
  }
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
export function showCloudMobileConnecting(gate) {
  document.body.classList.add('rpc-cloud-mobile-gated');
  gate.hidden = false;
  gate.innerHTML =
    '<div class="rpc-cloud-mobile-modal material-solid-elevated ui-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="rpc-cloud-mobile-modal-title">' +
    '<div class="rpc-cloud-mobile-modal__head">' +
    '<h4 id="rpc-cloud-mobile-modal-title" class="rpc-cloud-mobile-modal__title">R+ Móvil</h4>' +
    '<p class="rpc-cloud-mobile-modal__sub">Conectando al turno…</p>' +
    '</div>' +
    '<div class="rpc-cloud-mobile-modal__body rpc-cloud-mobile-modal__body--center">' +
    '<span class="rpc-cloud-mobile-spinner" aria-hidden="true"></span>' +
    '</div></div>';
}

/** @param {HTMLElement} gate */
export function dismissCloudMobileGate(gate) {
  gate.hidden = true;
  gate.innerHTML = '';
  document.body.classList.remove('rpc-cloud-mobile-gated');
}

function authBodyHtml(prefilledUser) {
  const userVal = prefilledUser ? ' value="' + esc(prefilledUser) + '"' : '';
  return (
    '<div class="cloud-sync-tabs" role="tablist" aria-label="Cuenta Nube">' +
    '<button type="button" class="cloud-sync-tab is-active" role="tab" aria-selected="true" data-cloud-tab="login">Entrar</button>' +
    '<button type="button" class="cloud-sync-tab" role="tab" aria-selected="false" data-cloud-tab="register">Crear cuenta</button>' +
    '</div>' +
    '<div class="cloud-sync-tab-panels">' +
    '<div class="cloud-sync-tab-panel" data-cloud-tab-panel="login" role="tabpanel">' +
    '<div class="cloud-sync-field"><label>Usuario (@usuario)</label>' +
    '<input type="text" class="profile-input" data-cloud-login-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false"' +
    userVal +
    ' /></div>' +
    '<div class="cloud-sync-field"><label>Contraseña</label>' +
    '<input type="password" class="profile-input" data-cloud-login-pass autocomplete="current-password" /></div>' +
    '<button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="login">Entrar</button></div>' +
    '<div class="cloud-sync-tab-panel" data-cloud-tab-panel="register" role="tabpanel" hidden>' +
    '<div class="cloud-sync-field"><label>Usuario (@usuario)</label>' +
    '<input type="text" class="profile-input" data-cloud-reg-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false"' +
    userVal +
    ' />' +
    '<p class="cloud-sync-hint">' +
    CLINICAL_LAN_USERNAME_HINT_HTML +
    '</p></div>' +
    '<div class="cloud-sync-field"><label>Nombre en guardia</label>' +
    '<input type="text" class="profile-input" data-cloud-reg-display autocomplete="name" placeholder="ej. Dr. Mendoza" />' +
    '<p class="cloud-sync-hint">' +
    CLINICAL_LAN_DISPLAY_NAME_HINT_HTML +
    '</p></div>' +
    '<div class="cloud-sync-field"><label>Contraseña</label>' +
    '<input type="password" class="profile-input" data-cloud-reg-pass autocomplete="new-password" /></div>' +
    '<button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="register">Crear cuenta</button></div>' +
    '</div>'
  );
}

/** @param {string} prefilledCode */
function joinBodyHtml(prefilledCode) {
  const value = prefilledCode ? ' value="' + esc(prefilledCode) + '"' : '';
  return (
    '<p class="cloud-sync-lead">Ingresa el código que compartió el equipo en escritorio.</p>' +
    '<div class="cloud-sync-field"><label>Código de sala</label>' +
    '<input type="text" class="profile-input" data-cloud-join-code placeholder="ABC123"' +
    value +
    ' /></div>' +
    '<button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="join-room">Unirse al turno</button>'
  );
}

/**
 * @param {HTMLElement} section
 * @param {'auth' | 'join'} mode
 * @param {string} [prefilled]
 */
function renderShell(section, mode, prefilled) {
  const body =
    mode === 'join'
      ? joinBodyHtml(prefilled || '')
      : authBodyHtml(prefilled || readCloudMobileJoinUser());
  const title = mode === 'join' ? 'Unirse al turno' : 'R+ Móvil · Nube';
  const sub =
    mode === 'join'
      ? 'Sesión iniciada — une tu iPad al turno.'
      : 'Inicia sesión para sincronizar el censo.';
  section.innerHTML =
    '<div class="rpc-cloud-mobile-modal__head">' +
    '<h4 id="rpc-cloud-mobile-modal-title" class="rpc-cloud-mobile-modal__title">' +
    esc(title) +
    '</h4>' +
    '<p class="rpc-cloud-mobile-modal__sub">' +
    esc(sub) +
    '</p></div>' +
    '<div class="rpc-cloud-mobile-modal__body">' +
    body +
    '</div>';
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
    const data = await createApi().joinRoom({ code: trimmed });
    const room = data.room;
    setCloudSyncRoomSnapshot(room);
    persistCloudMobilePairingFromRoom(room);
    rewriteCloudMobileBookmarkUrl();
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
    section.innerHTML =
      '<div class="rpc-cloud-mobile-modal__head">' +
      '<h4 class="rpc-cloud-mobile-modal__title">R+ Móvil</h4>' +
      '<p class="rpc-cloud-mobile-modal__sub">Buscando tu sala nube…</p></div>' +
      '<div class="rpc-cloud-mobile-modal__body rpc-cloud-mobile-modal__body--center">' +
      '<span class="rpc-cloud-mobile-spinner" aria-hidden="true"></span></div>';
    void resolveCloudMobileActiveRoom().then(function (room) {
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
    });
    return;
  }

  renderShell(section, 'auth', readCloudMobileJoinUser());
  wireShellActions(section, onConnected);
}
