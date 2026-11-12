import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
import { buildTeamSelectOptions } from './team-select-options.mjs';

const view = await loadJsx(import.meta.url, `import { TeamSelectOptions } from './team-select-options-view.jsx';
  export const options = (p) => renderToString(<TeamSelectOptions {...p} />);`);

// Synthetic teams: unsorted, two salas, an unknown sala, one without sala, markup chars in names.
const teams = [
  { team_id: 't3', name: 'Equipo <Z> & "C"', sala: 'Sala Q', sub_area_fraction: 'B' },
  { team_id: 't1', name: 'Equipo A', sala: 'Sala B', sub_area_fraction: 'A' },
  { team_id: 't2', service: 'Cardio', sala: '', sub_area_fraction: 'A' },
  { team_id: 't4', name: '', sala: 'Sala B', sub_area_fraction: 'C' },
];

test('flat and by-sala options equal buildTeamSelectOptions (picked and none)', () => {
  for (const groupBySala of [false, true]) {
    for (const selectedTeamId of ['', 't1', 't3', 'nope']) {
      sameHtml(view.options({ teams, selectedTeamId, groupBySala }),
        buildTeamSelectOptions(teams, selectedTeamId, { groupBySala }), `${groupBySala}/${selectedTeamId}`);
    }
  }
});

test('placeholder comes first; empty list gives only the placeholder', () => {
  const ph = '<option value="">— Sin asignar —</option>';
  sameHtml(view.options({ teams: [], placeholder: '— Sin asignar —' }), ph, 'empty');
  sameHtml(view.options({ teams, selectedTeamId: 't1', placeholder: '— Sin asignar —' }),
    ph + buildTeamSelectOptions(teams, 't1'), 'with teams');
});
