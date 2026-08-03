import { normalizeCloudSala } from './sala-allowlist.mjs';
import { shouldForcePanelRebuildOnAuthChange } from './panel-session-gate.mjs';
import { bridgeCloudIdentityToLocal } from './identity-bridge.mjs';
import { isValidUsernameFormat, normalizeUsername } from '../../clinical-username.mjs';
import { isCutoverPending } from './cutover-flags.mjs';
import { userHasJoinedTeam } from './panel-conexion-html.mjs';
import { showRecoveryCodeModal } from './recovery-modal.mjs';


/** @param {object} deps @param {unknown} prevToken */
function rebuildPanelOnAuthChange(deps, prevToken) {
  if (shouldForcePanelRebuildOnAuthChange(prevToken, deps.getCloudSyncToken())) {
    deps.renderLanPanel?.({ force: true });
    return true;
  }
  return false;
}
const REGENERATE_CONFIRM = '¿Regenerar código? El anterior deja de funcionar.';

/** @param {{ recoveryCode?: string } | null | undefined} data */
async function maybeShowRecoveryCodeModal(data) {
  const code = String(data?.recoveryCode || '').trim();
  if (code) await showRecoveryCodeModal({ code });
}

/** @param {HTMLElement} section */
export function readRegisterForm(section) {
  const user = section.querySelector('[data-cloud-reg-user]');
  const pass = section.querySelector('[data-cloud-reg-pass]');
  const display = section.querySelector('[data-cloud-reg-display]');
  return {
    username: normalizeUsername(String(user?.value || '')),
    displayName: String(display?.value || '').trim(),
    password: String(pass?.value || ''),
  };
}

/** @param {{ username: string, displayName: string, password: string }} form @param {(msg: string, kind?: string) => void} toast */
export function validateRegisterForm(form, toast) {
  if (!isValidUsernameFormat(form.username)) {
    toast('Usuario inválido: minúsculas, sin espacios, 3–32 caracteres.', 'error');
    return false;
  }
  if (!form.displayName) {
    toast('Ingresá tu nombre en guardia.', 'error');
    return false;
  }
  if (!form.password) {
    toast('Ingresá una contraseña.', 'error');
    return false;
  }
  return true;
}

/** @param {Error & { data?: { message?: string } }} err @param {(msg: string, kind?: string) => void} toast */
export function toastRegisterError(err, toast) {
  const msg = err?.data?.message || err?.message || 'No se pudo registrar.';
  toast(/not found/i.test(msg) ? 'URL nube incorrecta o vacía. Revisá Avanzado → URL del servicio.' : msg, 'error');
}

/**
 * @param {object} deps
 * @param {{ username: string, displayName: string }} user
 */
export async function afterAuthSuccess(deps, user) {
  deps.setCloudUser({ username: user?.username || '', displayName: user?.displayName || '' });
  await bridgeCloudIdentityToLocal({
    username: deps.getCloudUser().username,
    displayName: deps.getCloudUser().displayName,
  });
  await deps.tryAutoEnsureTurnRoom();
  if (!isCutoverPending() && !userHasJoinedTeam()) {
    await deps.handleOpenRotation();
  }
}

/** @param {object} deps */
export async function handleRegister(deps) {
  await deps.saveUrlFromUi();
  const form = readRegisterForm(deps.section);
  if (!validateRegisterForm(form, deps.toast)) return;
  try {
    const data = await deps.getApi().register(form);
    const prevToken = deps.getCloudSyncToken();
    deps.setCloudSyncToken(data.token);
    await maybeShowRecoveryCodeModal(data);
    await afterAuthSuccess(deps, data.user || form);
    deps.toast('Cuenta creada. Sesión nube iniciada.', 'success');
    if (!rebuildPanelOnAuthChange(deps, prevToken)) deps.renderAfterAuth();
  } catch (err) {
    toastRegisterError(err, deps.toast);
  }
}

/** @param {HTMLElement} section */
export function readLoginForm(section) {
  const user = section.querySelector('[data-cloud-login-user]');
  const pass = section.querySelector('[data-cloud-login-pass]');
  const remember = section.querySelector('[data-cloud-login-remember]');
  return {
    username: normalizeUsername(String(user?.value || '')),
    password: String(pass?.value || ''),
    remember: !!(remember && /** @type {HTMLInputElement} */ (remember).checked),
  };
}

/** @param {object} deps @param {object} room */
function persistCloudRoom(deps, room) {
  if (typeof deps.setCloudSyncRoomSnapshot === 'function') {
    deps.setCloudSyncRoomSnapshot(room);
    return;
  }
  deps.setCloudSyncRoomId(room.id);
  deps.setCloudSyncRevision(Number(room.revision) || 0);
}

/** @param {object} deps */
export async function handleLogin(deps) {
  await deps.saveUrlFromUi();
  const form = readLoginForm(deps.section);
  if (!form.username || !form.password) {
    deps.toast('Usuario y contraseña requeridos.', 'error');
    return;
  }
  try {
    const data = await deps.getApi().login({
      username: form.username,
      password: form.password,
    });
    const prevToken = deps.getCloudSyncToken();
    deps.setCloudSyncToken(data.token, { remember: form.remember });
    await maybeShowRecoveryCodeModal(data);
    await afterAuthSuccess(deps, data.user || { username: form.username });
    deps.toast(
      form.remember
        ? 'Sesión nube iniciada (se recordará en este dispositivo).'
        : 'Sesión nube iniciada.',
      'success'
    );
    if (!rebuildPanelOnAuthChange(deps, prevToken)) deps.renderAfterAuth();
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo iniciar sesión.', 'error');
  }
}

/** @param {HTMLElement} section */
export function readRecoverForm(section) {
  const user = section.querySelector('[data-cloud-recover-user]');
  const code = section.querySelector('[data-cloud-recover-code]');
  const pass = section.querySelector('[data-cloud-recover-pass]');
  const pass2 = section.querySelector('[data-cloud-recover-pass2]');
  return {
    username: normalizeUsername(String(user?.value || '')),
    recoveryCode: String(code?.value || '').trim(),
    password: String(pass?.value || ''),
    password2: String(pass2?.value || ''),
  };
}

/** @param {object} deps */
export async function handleRecover(deps) {
  await deps.saveUrlFromUi();
  const form = readRecoverForm(deps.section);
  if (!form.username || !form.recoveryCode) {
    deps.toast('Usuario y código de recuperación requeridos.', 'error');
    return;
  }
  if (form.password.length < 10) {
    deps.toast('Contraseña: mínimo 10 caracteres.', 'error');
    return;
  }
  if (form.password !== form.password2) {
    deps.toast('Las contraseñas no coinciden.', 'error');
    return;
  }
  try {
    const data = await deps.getApi().recover({
      username: form.username,
      recoveryCode: form.recoveryCode,
      newPassword: form.password,
    });
    const prevToken = deps.getCloudSyncToken();
    deps.setCloudSyncToken(data.token);
    await maybeShowRecoveryCodeModal(data);
    await afterAuthSuccess(deps, data.user || { username: form.username });
    deps.toast('Cuenta recuperada. Sesión nube iniciada.', 'success');
    if (!rebuildPanelOnAuthChange(deps, prevToken)) deps.renderAfterAuth();
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo recuperar la cuenta.', 'error');
  }
}

/** @param {object} deps */
export async function handleRegenerateRecovery(deps) {
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    if (!window.confirm(REGENERATE_CONFIRM)) return;
  }
  try {
    const data = await deps.getApi().regenerateRecovery();
    await maybeShowRecoveryCodeModal(data);
    deps.toast('Código de recuperación regenerado.', 'success');
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo regenerar el código.', 'error');
  }
}

/** @param {object} deps */
export async function handleCreateRoom(deps) {
  await deps.saveUrlFromUi();
  if (!deps.getCloudSyncToken()) {
    deps.toast('Iniciá sesión primero.', 'error');
    return;
  }
  const nameInput = deps.section.querySelector('[data-cloud-room-name]');
  const name = String(nameInput?.value || '').trim() || 'Turno ' + deps.normalizedSala;
  try {
    const data = await deps.getApi().createRoom({ name, sala: deps.normalizedSala });
    const room = data.room;
    persistCloudRoom(deps, room);
    deps.renderConnected(room);
    deps.toast('Sala creada: ' + room.code, 'success');
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo crear la sala.', 'error');
  }
}

/** @param {object} deps */
export async function handleJoinRoom(deps) {
  await deps.saveUrlFromUi();
  if (!deps.getCloudSyncToken()) {
    deps.toast('Iniciá sesión primero.', 'error');
    return;
  }
  const codeInput = deps.section.querySelector('[data-cloud-join-code]');
  const code = String(codeInput?.value || '').trim();
  if (!code) {
    deps.toast('Ingresá el código de sala.', 'error');
    return;
  }
  try {
    const data = await deps.getApi().joinRoom({ code });
    const room = data.room;
    persistCloudRoom(deps, room);
    deps.renderConnected(room);
    deps.toast('Unido a la sala ' + room.code + '.', 'success');
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo unir a la sala.', 'error');
  }
}

/** @param {object} deps */
export async function handleLeaveRoom(deps) {
  const roomId = deps.getCloudSyncRoomId();
  deps.stopRuntime();
  try {
    if (roomId) await deps.getApi().leaveRoom(roomId);
  } catch { /* best-effort */ }
  deps.clearCloudSyncSession();
  deps.onCloudRoomChange?.(false);
  deps.toast('Saliste de la sala en la nube.', 'info');
  deps.renderDisconnected();
}

/** @param {object} deps */
export async function handleLogout(deps) {
  const prevToken = deps.getCloudSyncToken();
  deps.stopRuntime();
  try { await deps.getApi().logout(); } catch { /* ignore */ }
  deps.clearCloudSyncSession();
  deps.setCloudUser(null);
  deps.onCloudRoomChange?.(false);
  if (!rebuildPanelOnAuthChange(deps, prevToken)) deps.renderDisconnected();
}

/** @param {(msg: string, kind?: string) => void} toast */
export async function handleOpenRotation(toast) {
  try {
    const { openMiRotacion } = await import('../clinical-rotation-entry.mjs');
    await openMiRotacion();
  } catch {
    toast('No se pudo abrir Mi rotación.', 'error');
  }
}

/** @param {object} deps */
export function renderAfterAuth(deps) {
  const roomId = deps.getCloudSyncRoomId();
  if (roomId) {
    const snap =
      typeof deps.getCloudSyncRoomSnapshot === 'function'
        ? deps.getCloudSyncRoomSnapshot()
        : null;
    deps.renderConnected({
      id: roomId,
      revision: deps.getCloudSyncRevision(),
      sala: snap?.sala || normalizeCloudSala(deps.getUserSala()),
      code: snap?.code || '',
      turnKey: snap?.turnKey || '',
      name: snap?.name || '',
    });
    deps.startRuntime();
  } else {
    deps.renderDisconnected();
  }
}
