import { confirmAction, fmtRole } from './panel-admin-helpers.mjs';
import { setSessionAdminKey } from './panel-admin-helpers.mjs';
import { showRecoveryCodeModal } from './recovery-modal.mjs';
import { showAdminPromptModal } from './admin-prompt-modal.mjs';
import {
  loadAdminMutations,
  loadAdminResumen,
  loadAdminRoomDetail,
  loadAdminSalas,
  loadAdminUsers,
} from './panel-admin-data.mjs';

/**
 * @param {HTMLElement} root
 * @param {{
 *   getApi: () => ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   toast: (msg: string, kind?: string) => void,
 *   roomsCache: Array<{ id: string, code?: string, sala?: string }>,
 *   openRoomDetailId: string | null,
 *   setOpenRoomDetailId: (id: string | null) => void,
 *   updateMutacionesRoomSelect: () => void,
 * }} deps
 */
export function createAdminClickHandler(deps) {
  const ctx = {
    roomsCache: deps.roomsCache,
    get openRoomDetailId() { return deps.openRoomDetailId; },
    set openRoomDetailId(v) { deps.setOpenRoomDetailId(v); },
    updateMutacionesRoomSelect: deps.updateMutacionesRoomSelect,
    loadRoomDetail: (id) => loadAdminRoomDetail(deps.root, deps.getApi, id),
  };

  return function onAdminClick(ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-admin-action]') : null;
    if (!btn) return;
    const action = btn.getAttribute('data-admin-action');
    if (dispatchSimpleAction(action, deps)) return;
    dispatchRoomAction(action, btn, deps, ctx);
    dispatchUserAction(action, btn, deps);
  };
}

/** @param {string | null} action @param {object} deps */
function dispatchSimpleAction(action, deps) {
  const map = {
    'save-key': () => {
      const input = deps.root.querySelector('[data-admin-key-input]');
      if (input instanceof HTMLInputElement) setSessionAdminKey(input.value);
      deps.toast('Clave guardada solo para esta sesión.', 'info');
    },
    'promote-self': () => void handlePromoteSelf(deps),
    'refresh-resumen': () => void loadAdminResumen(deps.root, deps.getApi),
    'refresh-salas': () => void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps)),
    'search-users': () => void loadAdminUsers(deps.root, deps.getApi),
    'load-mutations': () => void loadAdminMutations(deps.root, deps.getApi, deps.toast),
    'close-room-detail': () => {
      deps.setOpenRoomDetailId(null);
      void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps));
    },
  };
  if (!action || !(action in map)) return false;
  map[action]();
  return true;
}

/** @param {object} deps */
function buildSalasCtx(deps) {
  return {
    roomsCache: deps.roomsCache,
    openRoomDetailId: deps.openRoomDetailId,
    updateMutacionesRoomSelect: deps.updateMutacionesRoomSelect,
    loadRoomDetail: (id) => loadAdminRoomDetail(deps.root, deps.getApi, id),
  };
}

/** @param {string | null} action @param {Element} btn @param {object} deps @param {object} ctx */
function dispatchRoomAction(action, btn, deps, _ctx) {
  const roomId = btn.getAttribute('data-room-id');
  if (action === 'room-detail' && roomId) {
    deps.setOpenRoomDetailId(roomId);
    void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps));
    return;
  }
  if (action === 'rotate-code' && roomId) void handleRotateCode(deps, roomId);
  if (action === 'purge-room' && roomId) {
    void handlePurgeRoom(deps, roomId, btn.getAttribute('data-room-code') || roomId);
  }
}

/** @param {string | null} action @param {Element} btn @param {object} deps */
function dispatchUserAction(action, btn, deps) {
  const userId = btn.getAttribute('data-user-id');
  const handle = btn.getAttribute('data-user-handle') || '';
  if (action === 'revoke-sessions' && userId) void handleRevokeSessions(deps, userId, handle);
  if (action === 'promote-user' && userId) void handlePromoteUser(deps, userId, handle, btn);
  if (action === 'reset-password' && userId) void handleResetPassword(deps, userId, handle);
  if (action === 'disable-user' && userId) void handleDisableUser(deps, userId, handle);
  if (action === 'delete-user' && userId) void handleDeleteUser(deps, userId, handle);
}

/** @param {object} deps */
async function handlePromoteSelf(deps) {
  try {
    const me = await deps.getApi().me();
    const userId = me?.user?.id;
    if (!userId) {
      deps.toast('Iniciá sesión en la nube primero.', 'error');
      return;
    }
    if (!confirmAction('¿Promover tu cuenta a admin en la nube?')) return;
    await deps.getApi().adminPromote(userId, 'admin');
    deps.toast('Cuenta promovida a admin.', 'success');
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo promover.', 'error');
  }
}

/** @param {object} deps @param {string} roomId */
async function handleRotateCode(deps, roomId) {
  if (!confirmAction('¿Rotar el código de esta sala? Quienes tengan el código anterior no podrán unirse.')) return;
  try {
    const data = await deps.getApi().adminRotateCode(roomId);
    deps.toast('Nuevo código: ' + (data.code || '—'), 'success');
    void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps));
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo rotar el código.', 'error');
  }
}

/** @param {object} deps @param {string} roomId @param {string} code */
async function handlePurgeRoom(deps, roomId, code) {
  const typed = await showAdminPromptModal({
    title: 'Purgar sala',
    message: 'Esto elimina la sala "' + code + '" y todos sus datos en la nube.\n\nEscribí el código de sala para confirmar:',
    placeholder: code,
    confirmLabel: 'Purgar',
  });
  if (typed === null || String(typed).trim().toUpperCase() !== String(code).trim().toUpperCase()) {
    if (typed !== null) deps.toast('Confirmación incorrecta; no se purgó.', 'error');
    return;
  }
  try {
    await deps.getApi().adminPurgeRoom(roomId);
    if (deps.openRoomDetailId === roomId) deps.setOpenRoomDetailId(null);
    deps.toast('Sala purgada.', 'success');
    void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps));
    void loadAdminResumen(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo purgar la sala.', 'error');
  }
}

/** @param {object} deps @param {string} userId @param {string} handle */
async function handleRevokeSessions(deps, userId, handle) {
  if (!confirmAction('¿Revocar todas las sesiones de @' + handle + '?')) return;
  try {
    const data = await deps.getApi().adminRevokeSessions(userId);
    deps.toast('Sesiones revocadas: ' + String(data.revoked ?? 0), 'success');
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudieron revocar sesiones.', 'error');
  }
}

/** @param {object} deps @param {string} userId @param {string} handle @param {Element} btn */
async function handlePromoteUser(deps, userId, handle, btn) {
  const row = btn.closest('.cloud-sync-admin-row-actions');
  const sel = row?.querySelector('[data-admin-promote-role]');
  const role = sel instanceof HTMLSelectElement ? sel.value : 'admin';
  if (!confirmAction('¿Cambiar rol de @' + handle + ' a ' + fmtRole(role) + '?')) return;
  try {
    await deps.getApi().adminPromote(userId, role);
    deps.toast('Rol actualizado.', 'success');
    void loadAdminUsers(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo cambiar el rol.', 'error');
  }
}

/** @param {object} deps @param {string} userId @param {string} handle */
async function handleResetPassword(deps, userId, handle) {
  const temporaryPassword = await showAdminPromptModal({
    title: 'Restablecer contraseña',
    message: 'Contraseña temporal para @' + handle + ' (mínimo 10 caracteres):',
    placeholder: 'mínimo 10 caracteres',
    confirmLabel: 'Restablecer',
    inputType: 'password',
  });
  if (temporaryPassword === null) return;
  if (String(temporaryPassword).length < 10) {
    deps.toast('La contraseña debe tener al menos 10 caracteres.', 'error');
    return;
  }
  const rotateRecovery = confirmAction(
    '¿Rotar también el código de recuperación? El anterior dejará de funcionar.'
  );
  try {
    const data = await deps.getApi().adminResetPassword(userId, {
      temporaryPassword,
      rotateRecovery,
    });
    deps.toast('Contraseña restablecida.', 'success');
    if (data?.recoveryCode) await showRecoveryCodeModal({ code: data.recoveryCode });
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo restablecer la contraseña.', 'error');
  }
}

/** @param {object} deps @param {string} userId @param {string} handle */
async function handleDisableUser(deps, userId, handle) {
  if (!confirmAction('¿Deshabilitar @' + handle + ' y revocar sus sesiones?')) return;
  try {
    await deps.getApi().adminDisable(userId);
    deps.toast('Usuario deshabilitado.', 'success');
    void loadAdminUsers(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo deshabilitar.', 'error');
  }
}

/** @param {object} deps @param {string} userId @param {string} handle */
async function handleDeleteUser(deps, userId, handle) {
  if (
    !confirmAction(
      '¿Eliminar a @' +
        handle +
        ' de la nube?\n\nSi es dueño de una sala con otros miembros, el dueño pasa a otro. Si queda sola, se purga esa sala.'
    )
  ) {
    return;
  }
  try {
    await deps.getApi().adminDeleteUser(userId);
    deps.toast('Usuario eliminado.', 'success');
    void loadAdminUsers(deps.root, deps.getApi);
    void loadAdminResumen(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo eliminar.', 'error');
  }
}
