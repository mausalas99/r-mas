/** LAN directorio team assign / delete handlers. */
import { fetchClinicalTeamsFromDb } from '../../clinical-access-runtime.mjs';
import { resolveMembershipCycleForUser } from '../../clinico-access.mjs';
import { publishClinicalTeamsToSync } from './teams-guardia-bridge.mjs';
import { dbApi, toast, currentUserId, escapeHtml, escapeAttr } from './shared.mjs';
import { directoryRt } from './teams-roster-directory-state.mjs';
import {
  cycleLettersForAssign,
  formatCycleOptionLabel,
} from './teams-roster-directory-render.mjs';

/** @param {object|null} team @param {string} userRank @param {string} rowPreferred */
function resolveLanAssignDefaultCycle(team, userId, userRank, rowPreferred, letters) {
  let defaultCycle = team ? resolveMembershipCycleForUser(team, userId, userRank) : letters[0] || 'A';
  if (rowPreferred && letters.includes(rowPreferred)) defaultCycle = rowPreferred;
  return defaultCycle;
}

export function syncAssignCycleSelect(teamSelect, preferredCycle = '') {
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const row = teamSelect.closest('.clinical-lan-user-row');
  const cycleSelect = row?.querySelector('.clinical-directory-assign-cycle');
  if (!(cycleSelect instanceof HTMLSelectElement)) return;

  const teamId = String(teamSelect.value || '').trim();
  if (!teamId) {
    cycleSelect.innerHTML = '<option value="">— Ciclo —</option>';
    cycleSelect.disabled = true;
    return;
  }

  const team = directoryRt.teams.find((t) => String(t.team_id) === teamId);
  const userId = String(row?.dataset.userId || '').trim();
  const userRank = String(row?.dataset.userRank || 'R1');
  const letters = team ? cycleLettersForAssign(team, userRank) : [];
  const rowPreferred = String(preferredCycle || row?.dataset.preferredCycle || '').trim();
  const defaultCycle = resolveLanAssignDefaultCycle(team, userId, userRank, rowPreferred, letters);

  cycleSelect.innerHTML = letters
    .map((letter) => {
      const label = formatCycleOptionLabel(letter, userRank);
      return `<option value="${escapeAttr(letter)}" ${letter === defaultCycle ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');
  cycleSelect.disabled = letters.length === 0;
  cycleSelect.value = defaultCycle;
}

/** @param {Element} row */
export function initUserRowAssignState(row) {
  const teamSelect = row.querySelector('.clinical-directory-assign-team');
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const preferred = String(row.dataset.preferredCycle || '').trim();
  syncAssignCycleSelect(teamSelect, preferred);
}

async function handleLanAssignUserToTeam(userId, teamId, subAreaFraction) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('No se pudo asignar.', 'error');
    return false;
  }
  const res = await api.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction,
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
  const confirmed = window.confirm(
    `¿Eliminar a «${label}» de la base clínica en esta Mac?\n\nDesaparecerá del directorio. Las demás R+ en la misma sala Nube lo quitarán al sincronizar.`
  );
  if (!confirmed) return;

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
  const cycleSelect = row.querySelector('.clinical-directory-assign-cycle');
  const teamId =
    teamSelect instanceof HTMLSelectElement ? String(teamSelect.value || '').trim() : '';
  let subAreaFraction =
    cycleSelect instanceof HTMLSelectElement ? String(cycleSelect.value || '').trim() : '';
  const userRank = String(row.dataset.userRank || 'R1');
  return { row, userId, teamId, subAreaFraction, userRank };
}

export async function handleLanAssignButtonClick(btn) {
  if (!(btn instanceof HTMLButtonElement)) return;
  const selection = readLanAssignRowSelection(btn);
  if (!selection) return;
  const { userId, teamId, subAreaFraction: initialCycle, userRank } = selection;
  let subAreaFraction = initialCycle;

  if (!userId || !teamId) {
    toast('Elige un equipo.', 'error');
    return;
  }

  const team = directoryRt.teams.find((t) => String(t.team_id) === teamId);
  if (!subAreaFraction && team) {
    subAreaFraction = resolveMembershipCycleForUser(team, userId, userRank);
  }
  if (!subAreaFraction) {
    toast('Elige el ciclo del integrante.', 'error');
    return;
  }

  const wasMember = Boolean(
    team?.members?.some((m) => String(m.user_id || '') === userId)
  );

  btn.disabled = true;
  const ok = await handleLanAssignUserToTeam(userId, teamId, subAreaFraction);
  btn.disabled = false;
  if (!ok) return;

  toast(wasMember ? 'Ciclo actualizado.' : 'Integrante asignado al equipo.', 'success');
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
