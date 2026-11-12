/** Mi rotación — team card props (drawn by teams-roster-cards-view.jsx). */
import { getClinicalScopeContextForEvaluate, clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { getPatients } from '../../app-state.mjs';
import { resolvePatientTeamIdFromAssignments } from '../../clinico-access.mjs';
import {
  getCycleLettersForTeamCreate,
  getCycleLetterOptionsForRank,
  formatMemberCycleLabel,
  isSalaWardService,
} from '../../clinico-access.mjs';
import { teamInviteCode } from '../../clinical-team-invite.mjs';
import { effectiveClinicalRank, canManageTeamRoster } from '../../clinical-privileges.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { CLINICAL_SALAS, readClinicalTeamsCollapseOpen } from './shared.mjs';
import { shouldShowInheritPatientsUi } from './teams-roster-inherit-gate.mjs';

/** @param {string} teamId @param {object[]} assignments @param {string|Date} now */
export function listLocalCensusPatientsForTeam(teamId, assignments, now) {
  const tid = String(teamId || '');
  if (!tid) return [];
  return (getPatients() || []).filter(
    (p) => p?.id && resolvePatientTeamIdFromAssignments(String(p.id), assignments, now) === tid
  );
}

/** @param {string} teamId @param {object[]} assignments @param {string|Date} now */
export function countLocalCensusPatientsForTeam(teamId, assignments, now) {
  return listLocalCensusPatientsForTeam(teamId, assignments, now).length;
}

/** Parts of the one context line (sala · servicio), or [] when there is none. @param {object} team */
export function teamMetaParts(team) {
  const parts = [];
  const sala = String(team.sala || '').trim();
  const service = String(team.service || '').trim();
  if (sala) parts.push(sala);
  if (service && service.toLowerCase() !== 'sala') parts.push(service);
  return parts;
}

/** @param {number} onDevice @param {number} assignedLan */
function formatTeamPatientCountMessage(onDevice, assignedLan) {
  if (onDevice <= 0 && assignedLan > 0) {
    return assignedLan === 1
      ? '1 asignado en la red — sincronizando expediente…'
      : `${assignedLan} asignados en la red — sincronizando expedientes…`;
  }
  if (assignedLan > onDevice && assignedLan > 0) {
    const pending = assignedLan - onDevice;
    const visible = onDevice === 1 ? '1 paciente en censo' : `${onDevice} pacientes en censo`;
    const waiting =
      pending === 1
        ? '1 asignado en la red sin expediente aquí'
        : `${pending} asignados en la red sin expediente aquí`;
    return `${visible} · ${waiting}`;
  }
  return onDevice === 1 ? '1 paciente en censo' : `${onDevice} pacientes en censo`;
}

/** «N pacientes en censo» line text, or '' when there is nothing to say. @param {object} team @param {Date|string} now */
export function teamPatientLabel(team, now) {
  const teamId = String(team?.team_id || '');
  const ctx = getClinicalScopeContextForEvaluate();
  const assignments = Array.isArray(ctx?.assignments) ? ctx.assignments : [];
  const onDevice = countLocalCensusPatientsForTeam(teamId, assignments, ctx?.now || now);
  const assignedLan = Math.max(Number(team?.lanAssignmentCount) || 0, Number(team?.patientCount) || 0);
  if (onDevice <= 0 && assignedLan <= 0) return '';
  return formatTeamPatientCountMessage(onDevice, assignedLan);
}

/** Props for <MembersBlock>, or null when a compact block has no members. */
export function membersBlockProps(members, { compact = false, teamId = '' } = {}) {
  const list = Array.isArray(members) ? members : [];
  if (compact && list.length === 0) return null;
  const user = clinicalSessionContext.user;
  const canRemove = !!teamId && canManageTeamRoster(user);
  const callerUserId = String(user?.user_id || '').trim();
  const rows = list.map((m) => {
    const userId = String(m.user_id || '').trim();
    const handle = String(m.username || m.user_id || '');
    const name = String(m.clinical_name || '').trim();
    return {
      rank: effectiveClinicalRank({ rank: m.rank }),
      displayName: name || handle,
      cycle: formatMemberCycleLabel(m),
      canRemove: !!(canRemove && teamId && userId && userId !== callerUserId),
      userId,
      teamId: String(teamId),
      label: String(m.clinical_name || handle || userId),
    };
  });
  return { rows, count: list.length, compact };
}

/** Props for <MyCycleBlock>, or null when `user` is not in the team. */
export function myCycleProps(team, user) {
  const teamId = String(team.team_id || '');
  const userId = String(user?.user_id || '');
  const handle = normalizeUsername(user?.username || '');
  const members = Array.isArray(team.members) ? team.members : [];
  const me = members.find((m) => {
    if (userId && String(m.user_id) === userId) return true;
    if (handle && normalizeUsername(m.username || '') === handle) return true;
    return false;
  });
  if (!me) return null;
  const rank = effectiveClinicalRank({ rank: me.rank });
  const service = String(team.service || 'Sala');
  const hint = isSalaWardService(service)
    ? rank === 'R2'
      ? 'Tu letra A–F en el ciclo de sala.'
      : rank === 'R1'
        ? 'Tu subciclo (A1–D1 o A2–D2), independiente del resto del equipo.'
        : 'Letra de rotación para este servicio.'
    : 'Letra de rotación A–D (misma para todos los rangos en este servicio).';
  return {
    teamId,
    hint,
    selectId: `clinical-my-cycle-${teamId}`,
    letters: getCycleLetterOptionsForRank(service, rank),
    current: String(me.sub_area_fraction || '').trim(),
    open: readClinicalTeamsCollapseOpen(`card.${teamId}.cycle2`, false),
  };
}

/**
 * Preview of the predecessor team's patients for a staged team; null when it does not apply.
 * @param {object} team @param {object[]} [siblingTeams] this sala's other teams @param {Date|string} now
 */
export function inheritedPreviewProps(team, siblingTeams = [], now = new Date()) {
  const staged = Number(team.rotation_active) === 0;
  const predecessorId = String(team.succeeds_team_id || '').trim();
  if (!staged || !predecessorId) return null;
  const predecessor = (siblingTeams || []).find((t) => String(t?.team_id || '').trim() === predecessorId);
  if (!predecessor) return null;
  const ctx = getClinicalScopeContextForEvaluate();
  const assignments = Array.isArray(ctx?.assignments) ? ctx.assignments : [];
  const patients = listLocalCensusPatientsForTeam(predecessorId, assignments, ctx?.now || now);
  const teamId = String(team.team_id || '');
  return {
    teamId,
    predecessorName: String(predecessor.name || 'equipo anterior').trim(),
    patients: patients.map((p) => ({ nombre: String(p.nombre || 'Sin nombre'), registro: String(p.registro || 's/reg') })),
    open: readClinicalTeamsCollapseOpen(`card.${teamId}.inherit-preview`, false),
  };
}

/** Active (this month's) teams in `sala` that `team` could link to as its predecessor. */
function succeedsOptionsFor(team, siblingTeams) {
  const selfId = String(team.team_id || '').trim();
  const sala = String(team.sala || '').trim();
  return (siblingTeams || []).filter(
    (t) =>
      t &&
      !t.archived_at &&
      Number(t.rotation_active) === 1 &&
      String(t.team_id || '').trim() !== selfId &&
      String(t.sala || '').trim() === sala
  );
}

/** Props for the edit/delete buttons and the hidden edit form; null when the user cannot manage. */
export function teamManageProps(team, siblingTeams = []) {
  if (!canManageTeamRoster(clinicalSessionContext.user || {})) return null;
  const staged = Number(team.rotation_active) === 0;
  return {
    teamName: String(team.name || 'Equipo'),
    edit: {
      teamId: String(team.team_id || ''),
      name: String(team.name || ''),
      sala: String(team.sala || '').trim(),
      salas: CLINICAL_SALAS,
      staged,
      cycleLetter: String(team.sub_area_fraction || '').trim().toUpperCase(),
      succeedsId: String(team.succeeds_team_id || '').trim(),
      succeedsOptions: staged
        ? succeedsOptionsFor(team, siblingTeams).map((t) => ({ id: String(t.team_id), name: String(t.name || 'Equipo') }))
        : [],
    },
  };
}

function inviteProps(team, teamId) {
  const tid = String(teamId || team?.team_id || '').trim();
  const service = String(team.service || 'Sala');
  const addCycle = { id: `clinical-add-cycle-${tid}` };
  if (!isSalaWardService(service)) {
    addCycle.letters = getCycleLetterOptionsForRank(service, 'R2');
  } else {
    addCycle.groups = [
      { label: 'R2 · A–F', letters: getCycleLettersForTeamCreate('Sala', 'R2') },
      { label: 'R1 · primera línea', letters: getCycleLettersForTeamCreate('Sala', 'R1', 0) },
      { label: 'R1 · segunda línea', letters: getCycleLettersForTeamCreate('Sala', 'R1', 1) },
    ];
  }
  return {
    teamId: tid,
    code: teamInviteCode(tid),
    service: String(team.service || ''),
    addCycle,
    open: readClinicalTeamsCollapseOpen(`card.${tid}.invite`, false),
  };
}

/**
 * Props for <JoinedTeamCard>.
 * @param {object} team
 * @param {object[]} [siblingTeams] this sala's other teams, for the "Hereda de" picker
 * @param {Date} [now]
 */
export function joinedTeamCardProps(team, siblingTeams = [], now = new Date()) {
  const user = clinicalSessionContext.user || {};
  const teamId = String(team.team_id || '');
  return {
    teamId,
    name: String(team.name || 'Equipo'),
    metaParts: teamMetaParts(team),
    patientLabel: teamPatientLabel(team, now),
    manage: teamManageProps(team, siblingTeams),
    preview: inheritedPreviewProps(team, siblingTeams, now),
    members: membersBlockProps(team.members, { compact: true, teamId }),
    myCycle: myCycleProps(team, user),
    inheritName: shouldShowInheritPatientsUi(now) ? String(team.name || 'Equipo') : null,
    invite: inviteProps(team, teamId),
    leaveName: String(team.name || 'este equipo'),
  };
}

/**
 * Props for <DirectoryTeamCard>.
 * @param {object} team
 * @param {{ elevated?: boolean, siblingTeams?: object[] }} [opts]
 * @param {Date} [now]
 */
export function directoryTeamCardProps(team, opts = {}, now = new Date()) {
  const { elevated = false, siblingTeams = [] } = opts;
  let joinHint = '';
  if (team.joinEligible) {
    if (team.joinWarning) joinHint = String(team.joinWarning);
  } else if (team.joinReason) {
    joinHint = String(team.joinReason);
  }
  const teamId = String(team.team_id || '');
  return {
    teamId,
    staged: Number(team.rotation_active) === 0,
    name: String(team.name || ''),
    metaParts: teamMetaParts(team),
    patientLabel: teamPatientLabel(team, now),
    preview: inheritedPreviewProps(team, siblingTeams, now),
    members: membersBlockProps(team.members, { compact: true, teamId }),
    joinHint,
    canJoin: !!team.joinEligible,
    manage: elevated ? teamManageProps(team, siblingTeams) : null,
  };
}
