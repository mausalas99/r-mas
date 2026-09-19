import { esc } from '../../dom-escape.mjs';
import { CLINICAL_SALAS } from '../clinical-teams/shared.mjs';
import { CLINICAL_RANKS } from '../../../../lib/clinical-ranks.mjs';

export const CLINICAL_RANK_OPTIONS = CLINICAL_RANKS;

/** @param {string} selectedRank */
export function rankSelectOptionsHtml(selectedRank) {
  const selected = String(selectedRank || 'Team');
  return CLINICAL_RANK_OPTIONS.map((rank) => {
    const sel = rank === selected ? ' selected' : '';
    return '<option value="' + esc(rank) + '"' + sel + '>' + esc(rank) + '</option>';
  }).join('');
}

/** @param {string} selectedSala */
export function userSalaSelectOptionsHtml(selectedSala) {
  const selected = String(selectedSala || '').trim();
  const blank = selected ? '' : ' selected';
  return (
    '<option value=""' +
    blank +
    '>— Elegir —</option>' +
    CLINICAL_SALAS.map((sala) => {
      const sel = sala === selected ? ' selected' : '';
      return '<option value="' + esc(sala) + '"' + sel + '>' + esc(sala) + '</option>';
    }).join('')
  );
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
function renderTeamOptgroupHtml(sala, rows, selected) {
  const sorted = rows.slice().sort((a, b) => {
    const ca = String(a.sub_area_fraction || '').localeCompare(String(b.sub_area_fraction || ''), 'es');
    if (ca) return ca;
    return String(a.name || '').localeCompare(String(b.name || ''), 'es');
  });
  const opts = sorted
    .map((team) => {
      const id = esc(String(team.team_id || ''));
      const cycle = String(team.sub_area_fraction || '').trim();
      const label =
        esc(String(team.name || 'Equipo').trim()) +
        (cycle ? ' · ' + esc(cycle) : '') +
        ' (' +
        (Array.isArray(team.members) ? team.members.length : 0) +
        ')';
      const isSelected = selected && id === selected ? ' selected' : '';
      return '<option value="' + id + '"' + isSelected + '>' + label + '</option>';
    })
    .join('');
  return '<optgroup label="' + esc(sala) + '">' + opts + '</optgroup>';
}

/**
 * Clinical teams for admin assign, grouped by sala.
 * @param {object[]} teams
 * @param {string} [selectedTeamId]
 * @param {string} [salaFilter]
 */
export function renderEquiposAssignTeamOptionsHtml(teams, selectedTeamId, salaFilter) {
  const all = Array.isArray(teams) ? teams : [];
  const selected = String(selectedTeamId || '').trim();
  const sala = String(salaFilter || '').trim();
  const list = teamsForAssignOptions(all, selected, sala);
  if (!list.length) {
    return sala
      ? '<option value="">Sin equipos en esta sala</option>'
      : '<option value="">Sin equipos</option>';
  }

  const bySala = groupTeamsBySala(list);
  const salaOrder = [
    ...CLINICAL_SALAS.filter((s) => bySala.has(s)),
    ...[...bySala.keys()].filter((s) => !CLINICAL_SALAS.includes(s)).sort((a, b) => a.localeCompare(b, 'es')),
  ];
  const groups = salaOrder
    .map((salaKey) => renderTeamOptgroupHtml(salaKey, bySala.get(salaKey) || [], selected))
    .join('');
  return '<option value="">Sin asignar</option>' + groups;
}
