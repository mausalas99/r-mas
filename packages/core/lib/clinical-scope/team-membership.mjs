import { normalizeUsername } from '../db/clinical-username.mjs';
import { normalizeServiceKey, toMillis } from './shared.mjs';
import { extractSalaLetter, salaLetterForTeamOrArea } from './patient-sala.mjs';

const R3_EXTENDED_SERVICES = new Set(['torre hu', 'eme', 'ux']);

/**
 * @param {string} patientSvc
 * @param {string} teamSvc
 * @param {{ service?: string }} patient
 */
function patientServiceMatchesTeam(patientSvc, teamSvc, patient) {
  if (patientSvc === teamSvc) return true;
  if (patientSvc.includes('sala') && teamSvc.includes('sala')) return true;
  if (teamSvc.includes('sala') && (patientSvc.includes('sala') || extractSalaLetter(patient.service))) {
    return true;
  }
  return false;
}

/**
 * @param {{ id?: string, service?: string, sub_area?: string }|null|undefined} patient
 * @param {{ service?: string, sub_area_fraction?: string, name?: string }} team
 */
export function patientMatchesTeam(patient, team) {
  if (!patient || !team) return false;
  const patientSvc = normalizeServiceKey(patient.service);
  const teamSvc = normalizeServiceKey(team.service);
  if (!patientServiceMatchesTeam(patientSvc, teamSvc, patient)) return false;
  const frac = String(team.sub_area_fraction || '').trim();
  if (!frac) return true;
  const letter = frac.toUpperCase();
  const patientLetter = salaLetterForTeamOrArea(patient);
  if (patientLetter && patientLetter === letter) return true;
  const hay = `${patient.service || ''} ${patient.sub_area || ''}`;
  const escaped = letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp('(?:^|\\s)' + escaped + '(?=\\s|$)', 'i').test(hay)) return true;
  return false;
}

/** @param {object[]} teams @param {string|object} userOrUserId @param {string} [usernameHint] */
export function getJoinedTeamsForUser(teams, userOrUserId, usernameHint) {
  let uid = '';
  let handle = '';
  if (userOrUserId && typeof userOrUserId === 'object') {
    uid = String(userOrUserId.user_id || '');
    handle = normalizeUsername(String(userOrUserId.username || ''));
  } else {
    uid = String(userOrUserId || '');
    handle = normalizeUsername(usernameHint || '');
  }
  if (!uid && !handle) return [];
  return (teams || []).filter((team) =>
    (team.members || []).some((m) => {
      if (uid && String(m.user_id) === uid) return true;
      if (handle && normalizeUsername(m.username || '') === handle) return true;
      return false;
    })
  );
}

/** @param {object[]} teams @param {string} userId */
export function getJoinedTeams(teams, userId) {
  return getJoinedTeamsForUser(teams, userId);
}

/** @param {object[]} teams @param {string} userId */
export function userHasJoinedClinicalTeams(teams, userId) {
  return getJoinedTeams(teams, userId).length > 0;
}

/**
 * @param {string} patientId
 * @param {object[]} assignments
 */
export function patientHasExplicitTeamAssignment(patientId, assignments) {
  const pid = String(patientId || '');
  return (assignments || []).some((a) => String(a.patient_id) === pid);
}

/**
 * Active team for a patient (latest assignment with effective_at <= now).
 * @param {string} patientId
 * @param {object[]} assignments
 * @param {Date|string|number} [now]
 */
export function resolvePatientTeamIdFromAssignments(patientId, assignments, now) {
  const pid = String(patientId || '');
  const nowMs = toMillis(now != null ? now : new Date());
  let best = null;
  let bestMs = -Infinity;
  let bestCreatedMs = -Infinity;
  for (const row of assignments || []) {
    if (String(row?.patient_id || '') !== pid) continue;
    const effMs = toMillis(row.effective_at);
    if (!Number.isFinite(effMs) || effMs > nowMs) continue;
    const createdMs = toMillis(row.created_at, row.effective_at);
    if (effMs > bestMs || (effMs === bestMs && createdMs >= bestCreatedMs)) {
      bestMs = effMs;
      bestCreatedMs = createdMs;
      best = String(row.team_id || '');
    }
  }
  return best || '';
}

/**
 * @param {string} patientId
 * @param {object[]} assignments
 * @param {Set<string>} joinedTeamIds
 * @param {Date|string|number} [now]
 */
export function patientAssignedToTeam(patientId, assignments, joinedTeamIds, now) {
  const teamId = resolvePatientTeamIdFromAssignments(patientId, assignments, now);
  return !!(teamId && joinedTeamIds.has(teamId));
}

/**
 * Team scope for census/LAN: explicit assignment wins; structural match only when unassigned.
 * @param {object} patient
 * @param {object[]} joinedTeams
 * @param {object[]} assignments
 * @param {Set<string>} joinedTeamIds
 * @param {string} [userId]
 * @param {Date|string|number} [now]
 * @param {{ strictTeamFilter?: boolean }} [opts]
 */
export function patientInJoinedTeamScope(
  patient,
  joinedTeams,
  assignments,
  joinedTeamIds,
  userId,
  now,
  opts
) {
  const patientId = String(patient?.id || '');
  const strictTeamFilter = opts?.strictTeamFilter === true;
  if (patientAssignedToTeam(patientId, assignments, joinedTeamIds, now)) return true;
  if (strictTeamFilter || patientHasExplicitTeamAssignment(patientId, assignments)) return false;
  return patientMatchesAnyJoinedTeam(patient, joinedTeams, userId);
}

/**
 * Team row scoped to one member's cycle letter (membership sub_area_fraction).
 * @param {object} team
 * @param {string} [userId]
 */
export function teamForMemberCycle(team, userId) {
  if (!team || !userId) return team;
  const member = (team.members || []).find((m) => String(m.user_id) === String(userId));
  const frac = String(member?.sub_area_fraction || '').trim();
  if (!frac) {
    if (String(member?.rank || '') === 'R2') {
      const teamFrac = String(team.sub_area_fraction || '').trim();
      if (teamFrac) return { ...team, sub_area_fraction: teamFrac };
    }
    return team;
  }
  return { ...team, sub_area_fraction: frac };
}

/** @param {object} patient @param {object[]} joinedTeams @param {string} [userId] */
export function patientMatchesAnyJoinedTeam(patient, joinedTeams, userId) {
  const mapped = {
    id: patient?.id,
    service: String(patient?.service || patient?.servicio || ''),
    sub_area: String(patient?.sub_area || patient?.area || ''),
    interconsult_type: patient?.interconsult_type,
    sala: patient?.sala,
  };
  return (joinedTeams || []).some((team) => {
    const scoped = userId ? teamForMemberCycle(team, userId) : team;
    return patientMatchesTeam(mapped, scoped);
  });
}

/** @param {object} user @param {object} patient @param {object[]} joinedTeams */
export function r3ExtendedStructuralAccess(user, patient, joinedTeams) {
  const uid = String(user?.user_id || '');
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey(team?.service);
    const isExtended = [...R3_EXTENDED_SERVICES].some((s) => svc.includes(s));
    if (!isExtended) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return patientMatchesTeam(
      {
        id: patient?.id,
        service: String(patient?.service || patient?.servicio || ''),
        sub_area: String(patient?.sub_area || patient?.area || ''),
      },
      team
    );
  });
}
