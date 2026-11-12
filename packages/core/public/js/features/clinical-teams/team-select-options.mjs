/**
 * Shared <select> options for clinical teams (patient assign + Filtros censo).
 */
import { CLINICAL_SALA_VALUES } from '../../../../lib/clinical-salas.mjs';
import { esc } from '../../dom-escape.mjs';

function teamOptionHtml(team, selectedTeamId) {
  const id = String(team?.team_id || '');
  const label = teamSelectLabel(team);
  const sel = id && id === String(selectedTeamId || '') ? ' selected' : '';
  return '<option value="' + esc(id) + '"' + sel + '>' + esc(label) + '</option>';
}

function sortTeamsForSelect(teams) {
  return (teams || []).slice().sort((a, b) => {
    const ca = String(a.sub_area_fraction || '').localeCompare(String(b.sub_area_fraction || ''), 'es');
    if (ca) return ca;
    const nameA = String(a.name || a.service || '').trim();
    const nameB = String(b.name || b.service || '').trim();
    return nameA.localeCompare(nameB, 'es');
  });
}

/**
 * Teams in select order. Flat: one group with no label. By sala: one group per sala
 * (known salas first, the rest A–Z).
 * @param {object[]} teams
 * @param {boolean} [groupBySala]
 * @returns {{ label: string|null, teams: object[] }[]}
 */
export function teamSelectGroups(teams, groupBySala) {
  const list = Array.isArray(teams) ? teams : [];
  if (!groupBySala) return [{ label: null, teams: sortTeamsForSelect(list) }];

  /** @type {Map<string, object[]>} */
  const bySala = new Map();
  for (const team of list) {
    const teamSala = String(team?.sala || '').trim() || 'Sin sala';
    if (!bySala.has(teamSala)) bySala.set(teamSala, []);
    bySala.get(teamSala).push(team);
  }

  const salaOrder = [
    ...CLINICAL_SALA_VALUES.filter((s) => bySala.has(s)),
    ...[...bySala.keys()]
      .filter((s) => !CLINICAL_SALA_VALUES.includes(s))
      .sort((a, b) => a.localeCompare(b, 'es')),
  ];
  return salaOrder.map((sala) => ({ label: sala, teams: sortTeamsForSelect(bySala.get(sala) || []) }));
}

/** Label shown for a team in the select. */
export const teamSelectLabel = (team) => String(team?.name || team?.service || 'Equipo').trim() || 'Equipo';

/**
 * @param {object[]} teams
 * @param {string} [selectedTeamId]
 * @param {{ groupBySala?: boolean }} [opts]
 */
export function buildTeamSelectOptions(teams, selectedTeamId, opts = {}) {
  return teamSelectGroups(teams, opts.groupBySala)
    .map(({ label, teams: group }) => {
      const optsHtml = group.map((team) => teamOptionHtml(team, selectedTeamId)).join('');
      return label === null ? optsHtml : '<optgroup label="' + esc(label) + '">' + optsHtml + '</optgroup>';
    })
    .join('');
}

/**
 * Fill `select` with the same options buildTeamSelectOptions writes, built as DOM nodes
 * (sync, so callers can set `select.value` right after). `placeholder` is the empty first option.
 * @param {HTMLSelectElement} select
 * @param {{ teams: object[], selectedTeamId?: string, groupBySala?: boolean, placeholder?: string }} p
 */
export function fillTeamSelectOptions(select, { teams, selectedTeamId, groupBySala, placeholder }) {
  const picked = String(selectedTeamId || '');
  const option = (team) => {
    const id = String(team?.team_id || '');
    return new Option(teamSelectLabel(team), id, false, !!id && id === picked);
  };
  const nodes = placeholder ? [new Option(placeholder, '')] : [];
  for (const { label, teams: group } of teamSelectGroups(teams, groupBySala)) {
    if (label === null) {
      nodes.push(...group.map(option));
      continue;
    }
    const og = document.createElement('optgroup');
    og.label = label;
    og.append(...group.map(option));
    nodes.push(og);
  }
  select.replaceChildren(...nodes);
}

/**
 * Plain model of the options: `{ options }` flat, or `{ groups: [{ label, options }] }` by sala.
 * @param {object[]} teams
 * @param {string} [selectedTeamId]
 * @param {{ groupBySala?: boolean }} [opts]
 */
export function teamSelectModel(teams, selectedTeamId, opts = {}) {
  const picked = String(selectedTeamId || '');
  const option = (team) => {
    const id = String(team?.team_id || '');
    return { value: id, label: teamSelectLabel(team), selected: !!id && id === picked };
  };
  const groups = teamSelectGroups(teams, opts.groupBySala);
  if (!opts.groupBySala) return { options: groups[0].teams.map(option) };
  return { groups: groups.map((g) => ({ label: g.label, options: g.teams.map(option) })) };
}
