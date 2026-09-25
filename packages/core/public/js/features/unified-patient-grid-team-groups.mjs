/**
 * Guardia census grid — group elevated censo rows by clinical team.
 */
import { CLINICAL_SALA_VALUES } from '../../../lib/clinical-salas.mjs';
import { resolvePatientCensusTeamId } from './patients-clinical-filter.mjs';

export const GUARDIA_UNASSIGNED_TEAM_LABEL = 'Sin equipo asignado';

/**
 * @param {object} team
 * @returns {string}
 */
export function guardiaTeamGroupLabel(team) {
  const name = String(team?.name || team?.service || '').trim();
  return name || 'Equipo';
}

/**
 * @param {object[]} teams
 * @param {Map<string, object[]>} byTeamId
 * @returns {string[]}
 */
function orderedTeamIdsWithPatients(teams, byTeamId) {
  const list = (teams || []).filter((t) => t && byTeamId.has(String(t.team_id || '')));
  list.sort((a, b) => {
    const salaA = String(a.sala || '').trim();
    const salaB = String(b.sala || '').trim();
    const ia = CLINICAL_SALA_VALUES.indexOf(salaA);
    const ib = CLINICAL_SALA_VALUES.indexOf(salaB);
    const ra = ia === -1 ? 999 : ia;
    const rb = ib === -1 ? 999 : ib;
    if (ra !== rb) return ra - rb;
    if (salaA !== salaB) return salaA.localeCompare(salaB, 'es');
    return guardiaTeamGroupLabel(a).localeCompare(guardiaTeamGroupLabel(b), 'es');
  });
  return list.map((t) => String(t.team_id || ''));
}

/**
 * @param {object[]} patients
 * @param {object[]} teams
 * @param {object[]} assignments
 * @param {string|Date|number} now
 * @returns {{ byTeamId: Map<string, object[]>, unassigned: object[] }}
 */
function partitionPatientsByTeam(patients, teams, assignments, now) {
  /** @type {Map<string, object[]>} */
  const byTeamId = new Map();
  /** @type {object[]} */
  const unassigned = [];

  for (const patient of patients || []) {
    if (!patient?.id) continue;
    const teamId =
      'censusTeamId' in patient
        ? String(patient.censusTeamId || '')
        : resolvePatientCensusTeamId(patient, teams, assignments, now);
    if (!teamId) {
      unassigned.push(patient);
      continue;
    }
    if (!byTeamId.has(teamId)) byTeamId.set(teamId, []);
    byTeamId.get(teamId).push(patient);
  }
  return { byTeamId, unassigned };
}

/**
 * @param {object[]} teams
 * @param {Map<string, object[]>} byTeamId
 * @param {Map<string, object>} teamById
 * @returns {Array<{ teamId: string, label: string, patients: object[] }>}
 */
function buildKnownTeamGroups(teams, byTeamId, teamById) {
  const groups = [];
  for (const teamId of orderedTeamIdsWithPatients(teams, byTeamId)) {
    const team = teamById.get(teamId);
    groups.push({
      teamId,
      label: team ? guardiaTeamGroupLabel(team) : 'Equipo',
      patients: byTeamId.get(teamId) || [],
    });
    byTeamId.delete(teamId);
  }
  return groups;
}

/**
 * Orphan team ids (assignment points at missing team row).
 * @param {Map<string, object[]>} byTeamId
 * @returns {Array<{ teamId: string, label: string, patients: object[] }>}
 */
function buildOrphanTeamGroups(byTeamId) {
  const groups = [];
  const orphanIds = [...byTeamId.keys()].sort((a, b) => a.localeCompare(b, 'es'));
  for (const teamId of orphanIds) {
    groups.push({
      teamId,
      label: 'Equipo',
      patients: byTeamId.get(teamId) || [],
    });
  }
  return groups;
}

/**
 * Build ordered team sections for the Guardia census grid.
 * Unassigned patients go last under {@link GUARDIA_UNASSIGNED_TEAM_LABEL}.
 *
 * @param {object[]} patients — grid rows with `id` (and chart fields for structural match)
 * @param {{ teams?: object[], assignments?: object[], now?: string|Date|number }} [ctx]
 * @returns {Array<{ teamId: string, label: string, patients: object[] }>}
 */
export function buildGuardiaTeamCensusGroups(patients, ctx = {}) {
  const teams = ctx.teams || [];
  const assignments = ctx.assignments || [];
  const now = ctx.now || new Date().toISOString();
  const teamById = new Map(
    teams.filter((t) => t && t.team_id).map((t) => [String(t.team_id), t])
  );

  const { byTeamId, unassigned } = partitionPatientsByTeam(patients, teams, assignments, now);
  const groups = buildKnownTeamGroups(teams, byTeamId, teamById);
  groups.push(...buildOrphanTeamGroups(byTeamId));
  if (unassigned.length) {
    groups.push({
      teamId: '',
      label: GUARDIA_UNASSIGNED_TEAM_LABEL,
      patients: unassigned,
    });
  }
  return groups;
}
