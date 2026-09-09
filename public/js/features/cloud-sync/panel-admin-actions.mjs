import { confirmAction, fmtRole } from './panel-admin-helpers.mjs';
import { rewrapRoomDekForNewCode } from './room-dek.mjs';
import { joinRoomByCode } from './panel-conexion-handlers.mjs';
import { resolveCloudActorId } from './mutate-bridge.mjs';
import { buildCloudTombstoneOp } from './outbox-tombstones.mjs';
import { cloudSyncNowIso } from './cloud-sync-clock.mjs';
import { setSessionAdminKey } from './panel-admin-helpers.mjs';
import { showRecoveryCodeModal } from './recovery-modal.mjs';
import { showAdminPromptModal } from './admin-prompt-modal.mjs';
import {
  loadAdminMutations,
  loadAdminNetworkCensus,
  loadAdminResumen,
  loadAdminRoomDetail,
  loadAdminSalas,
} from './panel-admin-data.mjs';
import { listSelectedNetworkPatients } from './panel-admin-html.mjs';
import { loadAdminEquipos } from './panel-admin-equipos-data.mjs';
import { purgeClinicalUserMatchingCloudHandle } from './panel-admin-clinical-purge.mjs';
import { openEquiposActivityHistoryFromButton } from './panel-admin-equipos-history-modal.mjs';
import { scopeCloudStateToPatient } from './scope-cloud-state-to-patient.mjs';

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
  return function onAdminClick(ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-admin-action]') : null;
    if (!btn) return;
    const action = btn.getAttribute('data-admin-action');
    if (dispatchSimpleAction(action, deps)) return;
    dispatchRoomAction(action, btn, deps);
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
    'refresh-red': () => void loadAdminNetworkCensus(deps.root, deps.outerDeps),
    'bulk-archive-network': () => void handleBulkArchiveNetwork(deps),
    'bulk-delete-network': () => void handleBulkDeleteNetwork(deps),
    'search-users': () => void loadAdminEquipos(deps.root, deps.getApi),
    'refresh-equipos': () => void deps.equiposPanel?.refresh(),
    'save-equipos-bulk': () => void deps.equiposPanel?.handleBulkSave?.(),
    'purge-equipos-bulk': () => void deps.equiposPanel?.handleBulkPurge?.(),
    'load-mutations': () => void loadAdminMutations(deps.root, deps.getApi, deps.toast),
    'purge-room-selected': () => void handlePurgeRoomSelected(deps),
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

function roomDetailAction(btn, deps) {
  const roomId = btn.getAttribute('data-room-id');
  if (!roomId) return;
  deps.setOpenRoomDetailId(roomId);
  void loadAdminSalas(deps.root, deps.getApi, buildSalasCtx(deps));
}

function rotateCodeAction(btn, deps) {
  const roomId = btn.getAttribute('data-room-id');
  if (roomId) void handleRotateCode(deps, roomId);
}

function purgeRoomAction(btn, deps) {
  const roomId = btn.getAttribute('data-room-id');
  if (roomId) void handlePurgeRoom(deps, roomId, btn.getAttribute('data-room-code') || roomId);
}

function switchNetworkRoomAction(btn, deps) {
  const code = btn.getAttribute('data-room-code') || '';
  const patientId = btn.getAttribute('data-patient-id') || '';
  if (code) void handleSwitchNetworkRoom(deps, code, patientId);
}

function archiveNetworkPatientAction(btn, deps) {
  const targetRoomId = btn.getAttribute('data-room-id') || '';
  const patientId = btn.getAttribute('data-patient-id') || '';
  const wasArchived = btn.getAttribute('data-archived') === '1';
  if (targetRoomId && patientId) {
    void handleArchiveNetworkPatient(deps, targetRoomId, patientId, !wasArchived);
  }
}

function deleteNetworkPatientAction(btn, deps) {
  const targetRoomId = btn.getAttribute('data-room-id') || '';
  const patientId = btn.getAttribute('data-patient-id') || '';
  const registro = btn.getAttribute('data-registro') || '';
  if (targetRoomId && patientId) {
    void handleDeleteNetworkPatient(deps, targetRoomId, patientId, registro);
  }
}

const ROOM_ACTIONS = {
  'room-detail': roomDetailAction,
  'rotate-code': rotateCodeAction,
  'purge-room': purgeRoomAction,
  'switch-network-room': switchNetworkRoomAction,
  'archive-network-patient': archiveNetworkPatientAction,
  'delete-network-patient': deleteNetworkPatientAction,
};

/** @param {string | null} action @param {Element} btn @param {object} deps */
function dispatchRoomAction(action, btn, deps) {
  const handler = action && ROOM_ACTIONS[action];
  if (handler) handler(btn, deps);
}

/**
 * "Abrir expediente" from the Red tab — switches this device's active room
 * to the patient's room (same mechanics as the manual join form), applies a
 * fresh pull of that room so the patient is on this device immediately
 * instead of waiting for the next sync cycle, then selects the chart.
 * Only that one patient's data is merged in (scopeCloudStateToPatient) — the
 * pulled state otherwise carries the whole sala's roster and todos, which
 * would silently adopt every other patient in that room onto this device.
 * @param {object} deps @param {string} code @param {string} patientId
 */
async function handleSwitchNetworkRoom(deps, code, patientId) {
  try {
    const room = await joinRoomByCode(deps.outerDeps, code);
    const { applyCloudPullResult } = await import('./pull-apply.mjs');
    const { patientsBridge } = await import('../patients-bridge.mjs');
    const data = await deps.getApi().pull(room.id, 0);
    if (data?.state) {
      const scoped = patientId ? scopeCloudStateToPatient(data.state, patientId) : data.state;
      await applyCloudPullResult({ needSnapshot: true, state: scoped });
    }
    if (patientId) patientsBridge.selectPatient(patientId);
    deps.toast('Cambiado a la sala ' + room.code + '.', 'success');
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo cambiar de sala.', 'error');
  }
}

/**
 * Pull a room's current revision + one patient's `fields` — shared by the
 * single-row and bulk archive/delete actions so the pull step lives once.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api @param {string} roomId @param {string} patientId
 */
async function pullNetworkPatientFields(api, roomId, patientId) {
  const { state, revision } = await api.pull(roomId, 0);
  const entry = (state?.entries || []).find((e) => String(e?.id) === patientId);
  return { revision: Number(revision) || 0, fields: entry?.fields || null };
}

/**
 * Archive/restore a patient from the Red tab without switching this device's
 * room — a direct `entries/{id}/fields` push to the patient's own room
 * (`fields` is plaintext identity data, never E2EE — same as every other
 * census field). Re-pulls fresh `fields` first since the push replaces the
 * whole object; no join needed first, since the Worker lets an admin
 * push/pull any room without a `room_members` row (sync.js `requireMember`).
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api @param {string} roomId @param {string} patientId @param {boolean} nextArchived
 */
async function archiveOneNetworkPatient(api, roomId, patientId, nextArchived) {
  const { revision, fields } = await pullNetworkPatientFields(api, roomId, patientId);
  if (!fields) throw new Error('No se encontró el paciente en esa sala.');
  const op = {
    path: `entries/${patientId}/fields`,
    value: { ...fields, archived: nextArchived },
    actorId: resolveCloudActorId(),
    updatedAt: cloudSyncNowIso(),
  };
  await api.push(roomId, {
    clientMutationId: `admin-archive-${patientId}-${Date.now()}`,
    ops: [op],
    baseRevision: revision,
  });
}

/**
 * Permanently remove a patient from one room only — a direct `tombstones/{id}`
 * push (same op family as `enqueueCloudPatientDelete`, plaintext like `fields`,
 * scoped to this one room). Lets a patient who moved areas (e.g. Urgencias →
 * hospitalización) be re-admitted fresh elsewhere without a stale archived row.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api @param {string} roomId @param {string} patientId @param {string} registro
 */
async function deleteOneNetworkPatient(api, roomId, patientId, registro) {
  const { revision } = await pullNetworkPatientFields(api, roomId, patientId);
  const op = buildCloudTombstoneOp(patientId, {
    registro,
    actorId: resolveCloudActorId(),
    updatedAt: cloudSyncNowIso(),
  });
  await api.push(roomId, {
    clientMutationId: `admin-delete-${patientId}-${Date.now()}`,
    ops: [op],
    baseRevision: revision,
  });
}

/** @param {object} deps @param {string} roomId @param {string} patientId @param {boolean} nextArchived */
async function handleArchiveNetworkPatient(deps, roomId, patientId, nextArchived) {
  try {
    await archiveOneNetworkPatient(deps.getApi(), roomId, patientId, nextArchived);
    deps.toast(nextArchived ? 'Paciente archivado.' : 'Paciente restaurado.', 'success');
    void loadAdminNetworkCensus(deps.root, deps.outerDeps);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo archivar el paciente.', 'error');
  }
}

/** @param {object} deps @param {string} roomId @param {string} patientId @param {string} registro */
async function handleDeleteNetworkPatient(deps, roomId, patientId, registro) {
  if (
    !(await confirmAction(
      '¿Eliminar a este paciente de esta sala? Esto no se puede deshacer aquí; si vuelve a esta área, se admite de nuevo desde cero.'
    ))
  ) {
    return;
  }
  try {
    await deleteOneNetworkPatient(deps.getApi(), roomId, patientId, registro);
    deps.toast('Paciente eliminado de esa sala.', 'success');
    void loadAdminNetworkCensus(deps.root, deps.outerDeps);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo eliminar el paciente.', 'error');
  }
}

/**
 * Bulk archive every selected, still-active patient across every area at once —
 * loops the same single-patient push used by the row action; one failure
 * doesn't stop the rest. Selection comes from `listSelectedNetworkPatients`
 * (checkboxes wired in redCensusHtml).
 * @param {object} deps
 */
async function handleBulkArchiveNetwork(deps) {
  const selected = listSelectedNetworkPatients(deps.root);
  const targets = selected.filter((p) => !p.archived && p.roomId && p.patientId);
  if (!targets.length) {
    deps.toast('Selecciona pacientes activos para archivar.', 'error');
    return;
  }
  if (!(await confirmAction('¿Archivar ' + targets.length + ' paciente(s) seleccionado(s)?'))) return;
  const api = deps.getApi();
  let ok = 0;
  for (const p of targets) {
    try {
      await archiveOneNetworkPatient(api, p.roomId, p.patientId, true);
      ok += 1;
    } catch {
      /* keep going — one bad room shouldn't stop the rest */
    }
  }
  deps.toast(ok + ' de ' + targets.length + ' archivado(s).', ok === targets.length ? 'success' : 'warn');
  void loadAdminNetworkCensus(deps.root, deps.outerDeps);
}

/**
 * Bulk-delete every selected patient that is ALREADY archived, one room each —
 * a selected-but-still-active patient is skipped, never deleted outright, so
 * "select all" can't accidentally wipe active patients.
 * @param {object} deps
 */
async function handleBulkDeleteNetwork(deps) {
  const selected = listSelectedNetworkPatients(deps.root);
  const targets = selected.filter((p) => p.archived && p.roomId && p.patientId);
  const skipped = selected.length - targets.length;
  if (!targets.length) {
    deps.toast('Selecciona pacientes ya archivados para eliminarlos.', 'error');
    return;
  }
  const skipNote = skipped ? ` (se omiten ${skipped} activo(s) seleccionados)` : '';
  if (
    !(await confirmAction(
      '¿Eliminar ' + targets.length + ' paciente(s) archivado(s) de su sala' + skipNote + '? Esto no se puede deshacer aquí.'
    ))
  ) {
    return;
  }
  const api = deps.getApi();
  let ok = 0;
  for (const p of targets) {
    try {
      await deleteOneNetworkPatient(api, p.roomId, p.patientId, p.registro);
      ok += 1;
    } catch {
      /* keep going — one bad room shouldn't stop the rest */
    }
  }
  deps.toast(ok + ' de ' + targets.length + ' eliminado(s).', ok === targets.length ? 'success' : 'warn');
  void loadAdminNetworkCensus(deps.root, deps.outerDeps);
}

/** @param {string | null} action @param {Element} btn @param {object} deps */
function dispatchEquiposUserAction(action, btn, deps) {
  const equiposMap = {
    'assign-equipo': () => void deps.equiposPanel?.handleAssign(btn),
    'save-equipo-rank': () => void deps.equiposPanel?.handleSaveRank(btn),
    'purge-equipo-user': () => void deps.equiposPanel?.handlePurge(btn),
    'equipos-activity-history': () => openEquiposActivityHistoryFromButton(btn),
  };
  if (!action || !(action in equiposMap)) return false;
  equiposMap[action]();
  return true;
}

/** @param {string | null} action @param {Element} btn @param {object} deps */
function dispatchUserAction(action, btn, deps) {
  if (dispatchEquiposUserAction(action, btn, deps)) return;
  const userId = btn.getAttribute('data-user-id');
  const handle = btn.getAttribute('data-user-handle') || '';
  const userMap = {
    'revoke-sessions': () => userId && void handleRevokeSessions(deps, userId, handle),
    'promote-user': () => userId && void handlePromoteUser(deps, userId, handle, btn),
    'reset-password': () => userId && void handleResetPassword(deps, userId, handle),
    'disable-user': () => userId && void handleDisableUser(deps, userId, handle),
    'delete-user': () => userId && void handleDeleteUser(deps, userId, handle),
  };
  if (action && action in userMap) userMap[action]();
}

/** @param {object} deps */
async function handlePromoteSelf(deps) {
  try {
    const me = await deps.getApi().me();
    const userId = me?.user?.id;
    if (!userId) {
      deps.toast('Inicia sesión en la nube primero.', 'error');
      return;
    }
    if (!(await confirmAction('¿Promover tu cuenta a admin en la nube?'))) return;
    await deps.getApi().adminPromote(userId, 'admin');
    deps.toast('Cuenta promovida a admin.', 'success');
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo promover.', 'error');
  }
}

/** @param {object} deps */
function handlePurgeRoomSelected(deps) {
  const sel = deps.root.querySelector('[data-admin-peligro-room]');
  if (!(sel instanceof HTMLSelectElement) || !sel.value) {
    deps.toast('Elige una sala.', 'error');
    return;
  }
  const roomId = sel.value;
  const room = (deps.roomsCache || []).find(function (r) {
    return r && r.id === roomId;
  });
  void handlePurgeRoom(deps, roomId, (room && room.code) || roomId);
}

/** @param {object} deps @param {string} roomId */
async function handleRotateCode(deps, roomId) {
  if (!(await confirmAction('¿Rotar el código de esta sala? Quienes tengan el código anterior no podrán unirse.'))) return;
  try {
    const data = await deps.getApi().adminRotateCode(roomId);
    if (data.code) await rewrapRoomDekForNewCode(deps.getApi(), roomId, data.code);
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
    message: 'Esto elimina la sala "' + code + '" y todos sus datos en la nube.\n\nEscribe el código de sala para confirmar:',
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
  if (!(await confirmAction('¿Revocar todas las sesiones de @' + handle + '?'))) return;
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
  if (!(await confirmAction('¿Cambiar rol de @' + handle + ' a ' + fmtRole(role) + '?'))) return;
  try {
    await deps.getApi().adminPromote(userId, role);
    deps.toast('Rol actualizado.', 'success');
    void loadAdminEquipos(deps.root, deps.getApi);
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
  const rotateRecovery = await confirmAction(
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
  if (!(await confirmAction('¿Deshabilitar @' + handle + ' y revocar sus sesiones?'))) return;
  try {
    await deps.getApi().adminDisable(userId);
    deps.toast('Usuario deshabilitado.', 'success');
    void loadAdminEquipos(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo deshabilitar.', 'error');
  }
}

/** @param {object} deps @param {string} userId @param {string} handle */
async function handleDeleteUser(deps, userId, handle) {
  if (
    !(await confirmAction(
      '¿Eliminar a @' +
        handle +
        ' de la nube?\n\nTambién se quitará de los equipos clínicos en esta Mac y se publicará el cambio a la sala.\n\nSi es dueño de una sala con otros miembros, el dueño pasa a otro. Si queda sola, se purga esa sala.'
    ))
  ) {
    return;
  }
  try {
    await deps.getApi().adminDeleteUser(userId);
    const purged = await purgeClinicalUserMatchingCloudHandle(handle);
    if (purged.ok) {
      deps.toast('Usuario eliminado de la nube y de los equipos clínicos.', 'success');
    } else if (purged.reason === 'not_local') {
      deps.toast(
        'Usuario eliminado de la nube. No había perfil clínico local con ese @usuario.',
        'info'
      );
    } else if (purged.reason === 'no_db') {
      deps.toast(
        'Usuario eliminado de la nube. Abre R+ de escritorio para quitarlo también de los equipos.',
        'warn'
      );
    } else {
      deps.toast(
        'Usuario eliminado de la nube, pero no se pudo quitar del equipo local: ' +
          String(purged.reason || 'error'),
        'warn'
      );
    }
    void loadAdminResumen(deps.root, deps.getApi);
    void loadAdminEquipos(deps.root, deps.getApi);
  } catch (err) {
    deps.toast(err?.data?.message || err?.message || 'No se pudo eliminar.', 'error');
  }
}
