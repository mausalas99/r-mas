/**
 * Shared <select> options for clinical teams (patient assign + Filtros censo).
 */
import { CLINICAL_SALA_VALUES } from '../../../../lib/clinical-salas.mjs';
import { esc } from '../../dom-escape.mjs';

function teamOption(team, selectedTeamId) {
  const id = String(team?.team_id || '');
  const label = String(team?.name || team?.service || 'Equipo').trim() || 'Equipo';
  return { value: id, label, selected: !!id && id === String(selectedTeamId || '') };
}

function optionHtml(o) {
  return '<option value="' + esc(o.value) + '"' + (o.selected ? ' selected' : '') + '>' + esc(o.label) + '</option>';
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
 * Plain model of the options: `{ options }` flat, or `{ groups: [{ label, options }] }` by sala.
 * @param {object[]} teams
 * @param {string} [selectedTeamId]
 * @param {{ groupBySala?: boolean }} [opts]
 */
export function teamSelectModel(teams, selectedTeamId, opts = {}) {
  const list = Array.isArray(teams) ? teams : [];
  const options = (l) => sortTeamsForSelect(l).map((team) => teamOption(team, selectedTeamId));
  if (!opts.groupBySala) return { options: options(list) };

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
  return { groups: salaOrder.map((sala) => ({ label: sala, options: options(bySala.get(sala) || []) })) };
}

/**
 * @param {object[]} teams
 * @param {string} [selectedTeamId]
 * @param {{ groupBySala?: boolean }} [opts]
 */
export function buildTeamSelectOptions(teams, selectedTeamId, opts = {}) {
  const model = teamSelectModel(teams, selectedTeamId, opts);
  if (model.options) return model.options.map(optionHtml).join('');
  return model.groups
    .map((g) => '<optgroup label="' + esc(g.label) + '">' + g.options.map(optionHtml).join('') + '</optgroup>')
    .join('');
}
