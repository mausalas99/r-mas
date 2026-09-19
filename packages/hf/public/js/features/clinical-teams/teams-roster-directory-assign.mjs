/** LAN directorio team assign / delete handlers. */
import { fetchClinicalTeamsFromDb } from '../../clinical-access-runtime.mjs';
import { publishClinicalTeamsToSync } from './teams-guardia-bridge.mjs';
import { dbApi, toast, currentUserId } from './shared.mjs';
import { directoryRt } from './teams-roster-directory-state.mjs';
import { openConfirm } from '../workbench/confirm.mjs';

/** @param {Element} _row */
export function initUserRowAssignState(_row) {
  /* no-op — no cycle field to sync anymore */
}

async function handleLanAssignUserToTeam(userId, teamId) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('No se pudo asignar.', 'error');
    return false;
  }
  const res = await api.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se asignó al equipo.', 'error');
    return false;
  }
  if (Array.isArray(res.warnings) && res.warnings[0]) {
    toast(String(res.warnings[0]), 'warn');
  }
  return true;
}

export async function handleLanDeleteDirectoryUserClick(btn) {
  const userId = String(btn.dataset.userId || '').trim();
  if (!userId) return;
  const label = String(btn.dataset.userLabel || '').trim() || userId;
  const api = dbApi();
  if (!api || typeof api.dbClinicalUserDelete !== 'function') {
    toast('Eliminar usuarios requiere R+ de escritorio con base clínica desbloqueada.', 'error');
    return;
  }
  const result = await openConfirm({
    weight: 'destructive',
    title: `¿Eliminar a «${label}» de la base clínica en esta Mac?`,
    message: 'Desaparecerá del directorio. Las demás R+ en la misma sala Nube lo quitarán al sincronizar.',
    confirmLabel: 'Eliminar',
  });
  if (result !== 'confirm') return;

  btn.disabled = true;
  const res = await api.dbClinicalUserDelete({
    targetUserId: userId,
    callerUserId: currentUserId(),
  });
  btn.disabled = false;
  if (!res?.ok) {
    toast(res?.error || 'No se pudo eliminar el usuario.', 'error');
    return;
  }

  toast('Usuario eliminado de esta Mac.', 'success');
  const { isBenignPushSkipCode } = await import('../../clinical-profile-cloud-stubs.mjs');
  const lanPush = await publishClinicalTeamsToSync();
  if (!lanPush.ok && !isBenignPushSkipCode(lanPush.code)) {
    toast(
      'Usuario eliminado aquí, pero no se pudo publicar el cambio a la sala ⇄. Revisa la conexión.',
      'warning'
    );
  }
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  const { reloadDirectoryUsersAfterMutation } = await import('./teams-roster-directory-load.mjs');
  await reloadDirectoryUsersAfterMutation();
}

/** @param {HTMLButtonElement} btn */
function readLanAssignRowSelection(btn) {
  const row = btn.closest('.clinical-lan-user-row');
  if (!row) return null;
  const userId = String(btn.dataset.userId || row.dataset.userId || '').trim();
  const teamSelect = row.querySelector('.clinical-directory-assign-team');
  const teamId =
    teamSelect instanceof HTMLSelectElement ? String(teamSelect.value || '').trim() : '';
  return { row, userId, teamId };
}

export async function handleLanAssignButtonClick(btn) {
  if (!(btn instanceof HTMLButtonElement)) return;
  const selection = readLanAssignRowSelection(btn);
  if (!selection) return;
  const { userId, teamId } = selection;

  if (!userId || !teamId) {
    toast('Elige un equipo.', 'error');
    return;
  }

  const team = directoryRt.teams.find((t) => String(t.team_id) === teamId);
  const wasMember = Boolean(
    team?.members?.some((m) => String(m.user_id || '') === userId)
  );

  btn.disabled = true;
  const ok = await handleLanAssignUserToTeam(userId, teamId);
  btn.disabled = false;
  if (!ok) return;

  toast(wasMember ? 'Perfil actualizado.' : 'Integrante asignado al equipo.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsToSync();
  try {
    const { scheduleCloudSyncPush } = await import('../cloud-sync/mutate-bridge.mjs');
    scheduleCloudSyncPush();
  } catch { /* optional */ }
  await fetchClinicalTeamsFromDb();
  const { reloadDirectoryUsersAfterMutation } = await import('./teams-roster-directory-load.mjs');
  await reloadDirectoryUsersAfterMutation();
}
