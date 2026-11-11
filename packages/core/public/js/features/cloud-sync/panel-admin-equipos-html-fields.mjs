import { esc } from '../../dom-escape.mjs';
import { formatCycleOptionLabel } from '../clinical-teams/teams-roster-directory-render.mjs';
import { CLINICAL_SALAS } from '../clinical-teams/shared.mjs';
import { getCycleLetterOptionsForRank } from '../../clinico-access.mjs';
import { resolveMembershipCycleForUser } from '../../clinico-access.mjs';

export const CLINICAL_RANK_OPTIONS = ['R1', 'R2', 'R3', 'R4', 'Admin'];

/** Option lists are plain data: `{ value, label, selected }`. @param {string} selectedRank */
export function rankOptions(selectedRank) {
  const selected = String(selectedRank || 'R1');
  return CLINICAL_RANK_OPTIONS.map((rank) => ({ value: rank, label: rank, selected: rank === selected }));
}

/** @param {string} selectedSala */
export function userSalaOptions(selectedSala) {
  const selected = String(selectedSala || '').trim();
  return [
    { value: '', label: '— Elegir —', selected: !selected },
    ...CLINICAL_SALAS.map((sala) => ({ value: sala, label: sala, selected: sala === selected })),
  ];
}

/** @param {{ value: string, label: string, selected?: boolean }[]} options */
function optionsHtml(options) {
  return options
    .map((o) => '<option value="' + esc(o.value) + '"' + (o.selected ? ' selected' : '') + '>' + esc(o.label) + '</option>')
    .join('');
}

/**
 * @param {object[]} all
 * @param {string} selected
 * @param {string} sala
 */
function teamsForAssignOptions(all, selected, sala) {
  let list = sala ? all.filter((t) => String(t?.sala || '').trim() === sala) : all.slice();
  if (!sala || !selected) return list;
  const selectedTeam = all.find((t) => String(t?.team_id || '') === selected);
  if (selectedTeam && !list.some((t) => String(t?.team_id || '') === selected)) {
    return [selectedTeam, ...list];
  }
  return list;
}

/** @param {object[]} list */
function groupTeamsBySala(list) {
  /** @type {Map<string, object[]>} */
  const bySala = new Map();
  for (const team of list) {
    const teamSala = String(team?.sala || '').trim() || 'Sin sala';
    if (!bySala.has(teamSala)) bySala.set(teamSala, []);
    bySala.get(teamSala).push(team);
  }
  return bySala;
}

/** @param {string} sala @param {object[]} rows @param {string} selected */
function teamOptgroup(sala, rows, selected) {
  const sorted = rows.slice().sort((a, b) => {
    const ca = String(a.sub_area_fraction || '').localeCompare(String(b.sub_area_fraction || ''), 'es');
    if (ca) return ca;
    return String(a.name || '').localeCompare(String(b.name || ''), 'es');
  });
  const options = sorted.map((team) => {
    const value = String(team.team_id || '');
    const cycle = String(team.sub_area_fraction || '').trim();
    const label =
      String(team.name || 'Equipo').trim() +
      (cycle ? ' · ' + cycle : '') +
      ' (' + (Array.isArray(team.members) ? team.members.length : 0) + ')';
    return { value, label, selected: !!selected && value === selected };
  });
  return { sala, options };
}

/**
 * Clinical teams for admin assign, grouped by sala: loose options first, then one group per sala.
 * @param {object[]} teams
 * @param {string} [selectedTeamId]
 * @param {string} [salaFilter]
 * @returns {{ options: { value: string, label: string }[], groups: { sala: string, options: { value: string, label: string, selected: boolean }[] }[] }}
 */
export function assignTeamOptions(teams, selectedTeamId, salaFilter) {
  const all = Array.isArray(teams) ? teams : [];
  const selected = String(selectedTeamId || '').trim();
  const sala = String(salaFilter || '').trim();
  const list = teamsForAssignOptions(all, selected, sala);
  if (!list.length) {
    return { options: [{ value: '', label: sala ? 'Sin equipos en esta sala' : 'Sin equipos' }], groups: [] };
  }
  const bySala = groupTeamsBySala(list);
  const salaOrder = [
    ...CLINICAL_SALAS.filter((s) => bySala.has(s)),
    ...[...bySala.keys()].filter((s) => !CLINICAL_SALAS.includes(s)).sort((a, b) => a.localeCompare(b, 'es')),
  ];
  return {
    options: [{ value: '', label: 'Sin asignar' }],
    groups: salaOrder.map((salaKey) => teamOptgroup(salaKey, bySala.get(salaKey) || [], selected)),
  };
}

/** The same options as `<option>` strings, for the selects that are refilled in place while a row is edited. */
export function renderEquiposAssignTeamOptionsHtml(teams, selectedTeamId, salaFilter) {
  const { options, groups } = assignTeamOptions(teams, selectedTeamId, salaFilter);
  return optionsHtml(options) + groups.map((g) => '<optgroup label="' + esc(g.sala) + '">' + optionsHtml(g.options) + '</optgroup>').join('');
}

/** @param {object | null | undefined} team @param {string} userId @param {string} userRank @param {string} [selectedCycle] */
export function cycleOptions(team, userId, userRank, selectedCycle) {
  const none = [{ value: '', label: 'Ciclo' }];
  if (!team) return none;
  const service = String(team.service || 'Sala');
  const rank = String(userRank || 'R1');
  const letters = getCycleLetterOptionsForRank(service, rank);
  const defaultCycle = resolveMembershipCycleForUser(team, userId, rank);
  const selected = String(selectedCycle || '').trim() || defaultCycle;
  if (!letters.length) return none;
  return letters.map((letter) => ({ value: letter, label: formatCycleOptionLabel(letter, rank), selected: letter === selected }));
}

export const cycleOptionsForTeam = (team, userId, userRank, selectedCycle) =>
  optionsHtml(cycleOptions(team, userId, userRank, selectedCycle));
