import { clinicalSessionContext } from '../../clinical-session-context.mjs';

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/**
 * Join existing team or recreate if membership add fails.
 * @returns {Promise<{ ok: boolean, team?: object|null }>}
 */
export async function ensureTeamMembership(chosenTeam, chosenUser, toast) {
  if (!chosenTeam?.teamId) return { ok: true, team: chosenTeam };
  const apiDb = dbApi();
  if (!apiDb || !chosenUser?.username) return { ok: true, team: chosenTeam };

  const joined = await tryJoinTeam(apiDb, chosenTeam, toast);
  if (joined) return { ok: true, team: chosenTeam };

  return tryRecreateTeam(apiDb, chosenTeam, chosenUser, toast);
}

async function tryJoinTeam(apiDb, chosenTeam, toast) {
  const sessionUserId =
    clinicalSessionContext.user?.user_id || clinicalSessionContext.user?.id || '';
  if (!apiDb.dbClinicalTeamsMemberAdd || !sessionUserId) return false;
  try {
    const res = await apiDb.dbClinicalTeamsMemberAdd({
      teamId: chosenTeam.teamId,
      userId: sessionUserId,
    });
    if (res?.ok === false) return false;
    toast('Te uniste al equipo ' + chosenTeam.name, 'success');
    return true;
  } catch {
    return false;
  }
}

async function tryRecreateTeam(apiDb, chosenTeam, chosenUser, toast) {
  if (!apiDb.dbClinicalTeamsCreate) return { ok: true, team: chosenTeam };
  try {
    const res = await apiDb.dbClinicalTeamsCreate({
      name: chosenTeam.name,
      sala: chosenTeam.sala || chosenUser?.sala || undefined,
    });
    if (res?.ok === false || !res?.team?.team_id) return { ok: true, team: chosenTeam };
    const team = {
      teamId: String(res.team.team_id),
      name: chosenTeam.name,
      sala: chosenTeam.sala,
    };
    toast('Equipo recreado: ' + chosenTeam.name, 'success');
    return { ok: true, team };
  } catch (err) {
    toast(err?.message || 'No se pudo recrear el equipo.', 'error');
    return { ok: false, team: chosenTeam };
  }
}
