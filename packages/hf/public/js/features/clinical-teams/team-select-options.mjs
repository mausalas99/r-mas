/**
 * Shared <select> options for clinical teams (patient assign + Filtros censo).
 */
import { CLINICAL_SALA_VALUES } from '../../../../lib/clinical-salas.mjs';
import { esc } from '../../dom-escape.mjs';

function teamOptionHtml(team, selectedTeamId) {
  const id = String(team?.team_id || '');
  const label = String(team?.name || team?.service || 'Equipo').trim() || 'Equipo';
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
 * @param {object[]} teams
 * @param {string} [selectedTeamId]
 * @param {{ groupBySala?: boolean }} [opts]
 */
export function buildTeamSelectOptions(teams, selectedTeamId, opts = {}) {
  const list = Array.isArray(teams) ? teams : [];
  if (!opts.groupBySala) {
    return sortTeamsForSelect(list)
      .map((team) => teamOptionHtml(team, selectedTeamId))
      .join('');
  }

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

  return salaOrder
    .map((sala) => {
      const optsHtml = sortTeamsForSelect(bySala.get(sala) || [])
        .map((team) => teamOptionHtml(team, selectedTeamId))
        .join('');
      return '<optgroup label="' + esc(sala) + '">' + optsHtml + '</optgroup>';
    })
    .join('');
}
