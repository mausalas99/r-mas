import { normalizeCloudSala } from './sala-allowlist.mjs';
import { shouldForcePanelRebuildOnAuthChange } from './panel-session-gate.mjs';
import { bridgeCloudIdentityToLocal } from './identity-bridge.mjs';
import { hydrateClinicalTeamsAfterCloudPull } from './clinical-ops-hydrate.mjs';
import { isValidUsernameFormat, normalizeUsername } from '../../clinical-username.mjs';
import { isCutoverPending } from './cutover-flags.mjs';
import { userHasJoinedTeam } from './panel-conexion-html.mjs';
import { showRecoveryCodeModal } from './recovery-modal.mjs';
import {
  clearRoomDekCache,
  ensureRoomDek,
  loadRoomDek,
  exportCachedDeksForPersistence,
} from './room-dek.mjs';
import { backfillRoomEncryption } from './room-dek-migrate.mjs';
import { getCloudSyncClientId } from './client-id.mjs';
import { setStoredRoomDeks } from './settings.mjs';
import { showConfirmDialog } from '../../ui-approval-card.mjs';

/** DEK cache changed (created/loaded/re-wrapped) — mirror it to the durable Recuérdame store. */
async function persistRoomDeks() {
  setStoredRoomDeks(await exportCachedDeksForPersistence());
}

/** Prefer explicit checkbox; else sticky Recuérdame preference; else persist on desktop. */
function resolveRememberFromSection(section, selector, deps) {
  const el = section?.querySelector?.(selector);
  if (el instanceof HTMLInputElement) return !!el.checked;
  if (typeof deps?.getCloudSyncRemember === 'function') return !!deps.getCloudSyncRemember();
  return true;
}

/** Refresh outer ⇄ chrome; never a substitute for in-place section render. */
function rebuildPanelOnAuthChange(deps, prevToken) {
  if (shouldForcePanelRebuildOnAuthChange(prevToken, deps.getCloudSyncToken())) {
    deps.renderLanPanel?.({ force: true });
  }
}
const REGENERATE_CONFIRM = '¿Regenerar código? El anterior deja de funcionar.';

/** @param {{ recoveryCode?: string } | null | undefined} data */
async function maybeShowRecoveryCodeModal(data) {
  const code = String(data?.recoveryCode || '').trim();
  if (code) await showRecoveryCodeModal({ code });
}

/** Persist token and show logged-in Conexión before recovery/profile work. */
export function enterCloudSession(deps, token, remember, prevToken) {
  const t = String(token || '').trim();
  if (!t) {
    const err = new Error('El servidor no devolvió sesión.');
    err.data = { message: err.message };
    throw err;
  }
  deps.setCloudSyncToken(t, { remember });
  rebuildPanelOnAuthChange(deps, prevToken);
  deps.renderAfterAuth();
}

/** Recovery modal + identity/room. Must not undo an already-entered session. */
async function finishCloudAuthProfile(deps, data, user) {
  try {
    await maybeShowRecoveryCodeModal(data);
    await afterAuthSuccess(deps, user);
  } catch (postErr) {
    deps.toast?.(
      postErr?.data?.message ||
        postErr?.message ||
        'Sesión iniciada; no se pudo completar el perfil.',
      'error'
    );
  }
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
    toast('Ingresa tu nombre en guardia.', 'error');
    return false;
  }
  if (!form.password) {
    toast('Ingresa una contraseña.', 'error');
    return false;
  }
  return true;
}

/** @param {Error & { data?: { message?: string } }} err @param {(msg: string, kind?: string) => void} toast */
export function toastRegisterError(err, toast) {
  const msg = err?.data?.message || err?.message || 'No se pudo registrar.';
  toast(/not found/i.test(msg) ? 'URL nube incorrecta o vacía. Revisa Avanzado → URL del servicio.' : msg, 'error');
}

/**
 * @param {object} deps
 * @param {{ username: string, displayName: string }} user
 */
export async function afterAuthSuccess(deps, user) {
  deps.setCloudUser({ username: user?.username || '', displayName: user?.displayName || '' });
  // Identity IPC + ensure-turn in parallel — don't serialize round-trips.
  const [, room] = await Promise.all([
    bridgeCloudIdentityToLocal({
      username: deps.getCloudUser().username,
      displayName: deps.getCloudUser().displayName,
    }),
    deps.tryAutoEnsureTurnRoom(),
  ]);
  // Existing rooms never got a DEK (only room *creation* triggers one) — the owner's
  // next login silently backfills it and re-encrypts already-stored plaintext content.
  // Fire-and-forget: must never block or fail login.
  if (room?.id) {
    void backfillRoomEncryption(deps.getApi(), room, getCloudSyncClientId()).then(
      (result) => {
        if (result && (result.failed > 0 || result.remaining !== 0)) {
          deps.toast('Sala ' + (room.code || room.id) + ': algunos datos aún no están protegidos. Reintenta más tarde.', 'error');
        }
        return persistRoomDeks();
      },
      () => {}
    );
  }
  await hydrateClinicalTeamsAfterCloudPull();
  // Mi rotación must not block "conectado" — open in background if needed.
  if (!isCutoverPending() && !userHasJoinedTeam()) {
    void deps.handleOpenRotation();
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
    enterCloudSession(
      deps,
      data.token,
      resolveRememberFromSection(deps.section, '[data-cloud-reg-remember]', deps),
      prevToken
    );
    deps.toast('Cuenta creada. Sesión nube iniciada.', 'success');
    await finishCloudAuthProfile(deps, data, data.user || form);
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
    enterCloudSession(deps, data.token, form.remember, prevToken);
    deps.toast(
      form.remember
        ? 'Sesión nube iniciada (se recordará en este dispositivo).'
        : 'Sesión nube iniciada.',
      'success'
    );
    await finishCloudAuthProfile(deps, data, data.user || { username: form.username });
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
    // Room DEKs are wrapped with the room's own join code, not the login
    // password — recovering the password doesn't affect them at all.
    const prevToken = deps.getCloudSyncToken();
    enterCloudSession(
      deps,
      data.token,
      resolveRememberFromSection(deps.section, '[data-cloud-login-remember]', deps),
      prevToken
    );
    deps.toast('Cuenta recuperada. Sesión nube iniciada.', 'success');
    await finishCloudAuthProfile(deps, data, data.user || { username: form.username });
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo recuperar la cuenta.', 'error');
  }
}

/** @param {object} deps */
export async function handleRegenerateRecovery(deps) {
  const ok = await showConfirmDialog({
    id: 'cloud-sync-regenerate-recovery-confirm',
    title: 'Regenerar código',
    question: REGENERATE_CONFIRM,
    confirmLabel: 'Regenerar',
    cancelLabel: 'Cancelar',
  });
  if (!ok) return;
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
    deps.toast('Inicia sesión primero.', 'error');
    return;
  }
  const nameInput = deps.section.querySelector('[data-cloud-room-name]');
  const name = String(nameInput?.value || '').trim() || 'Turno ' + deps.normalizedSala;
  try {
    const data = await deps.getApi().createRoom({ name, sala: deps.normalizedSala });
    const room = data.room;
    persistCloudRoom(deps, room);
    const dekOk = await ensureRoomDek(deps.getApi(), room.id, room.code)
      .then(() => true)
      .catch(() => false);
    await persistRoomDeks();
    deps.renderConnected(room);
    deps.toast(
      dekOk
        ? 'Sala creada: ' + room.code
        : 'Sala creada: ' + room.code + ' (sin cifrado — reintenta desde ⇄ si es necesario).',
      dekOk ? 'success' : 'error'
    );
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo crear la sala.', 'error');
  }
}

/** @param {object} deps */
export async function handleJoinRoom(deps) {
  await deps.saveUrlFromUi();
  if (!deps.getCloudSyncToken()) {
    deps.toast('Inicia sesión primero.', 'error');
    return;
  }
  const codeInput = deps.section.querySelector('[data-cloud-join-code]');
  const code = String(codeInput?.value || '').trim();
  if (!code) {
    deps.toast('Ingresa el código de sala.', 'error');
    return;
  }
  try {
    const data = await deps.getApi().joinRoom({ code });
    const room = data.room;
    persistCloudRoom(deps, room);
    deps.renderConnected(room);
    deps.toast('Unido a la sala ' + room.code + '.', 'success');
    // Loading the room key is best-effort AFTER the join itself succeeded — a
    // key-load hiccup should never read to the user as "couldn't join."
    try {
      await loadRoomDek(deps.getApi(), room.id, room.code);
      await persistRoomDeks();
    } catch {
      deps.toast('Unido, pero no se pudo cargar la llave de cifrado de la sala.', 'error');
    }
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
  // Keep Nube auth (Recuérdame); only clear room membership.
  if (typeof deps.setCloudSyncRoomSnapshot === 'function') {
    deps.setCloudSyncRoomSnapshot(null);
  } else {
    deps.setCloudSyncRoomId('');
    deps.setCloudSyncRevision(0);
  }
  deps.onCloudRoomChange?.(false);
  deps.toast('Saliste de la sala en la nube.', 'info');
  deps.renderDisconnected();
}

/** @param {object} deps */
export async function handleLogout(deps) {
  const prevToken = deps.getCloudSyncToken();
  deps.stopRuntime();
  try { await deps.getApi().logout(); } catch { /* ignore */ }
  clearRoomDekCache();
  deps.clearCloudSyncSession();
  deps.setCloudUser(null);
  deps.onCloudRoomChange?.(false);
  rebuildPanelOnAuthChange(deps, prevToken);
  deps.renderDisconnected();
}

/** @param {(msg: string, kind?: string) => void} toast */
export async function handleOpenRotation(toast) {
  try {
    const { openConexionEquipoPanel } = await import('./panel-equipo-nav.mjs');
    await openConexionEquipoPanel({ toast });
  } catch {
    toast('No se pudo abrir equipos.', 'error');
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
    // renderConnected starts the sync runtime — do not call startRuntime again.
    deps.renderConnected({
      id: roomId,
      revision: deps.getCloudSyncRevision(),
      sala: snap?.sala || normalizeCloudSala(deps.getUserSala()),
      code: snap?.code || '',
      turnKey: snap?.turnKey || '',
      name: snap?.name || '',
    });
  } else {
    deps.renderDisconnected();
  }
}
