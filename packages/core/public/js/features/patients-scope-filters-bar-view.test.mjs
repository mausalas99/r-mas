import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { CLINICAL_SALA_VALUES } from '../../../lib/clinical-salas.mjs';
import { teamSelectModel } from './clinical-teams/team-select-options.mjs';
import { TEAM_OPTION_CASES, BODY_CASES } from './patients-scope-filters-bar-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { CensusFiltersBody, TeamSelectOptions } from './patients-scope-filters-bar-view.jsx';
  export const body = (showSala, salas) => renderToString(<CensusFiltersBody showSala={showSala} salas={salas} />);
  export const options = (model, unassignedValue) => renderToString(<TeamSelectOptions model={model} unassignedValue={unassignedValue} />);`);

// Exact markup the old string builders made (bar.innerHTML and the Equipo select's options, from the old code).
const { default: OLD } = await import('./patients-scope-filters-bar-view.old.json', { with: { type: 'json' } });

// Preact writes an empty value as a bare attribute, void tags as <x/> and leaves > bare in text; HTML parses both the same.
const norm = (s) => s.replace(/ ?\/>/g, '>').replace(/&#39;/g, "'").replace(/ value=""/g, ' value').replace(/&gt;/g, '>');

for (const [name, c] of Object.entries(BODY_CASES)) {
  test(`Filtros censo body HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.body(c.showSala, CLINICAL_SALA_VALUES)), norm(OLD.body[name]));
  });
}
for (const [name, c] of Object.entries(TEAM_OPTION_CASES)) {
  test(`Equipo select options HTML equals the old builder: ${name}`, () => {
    const html = view.options(teamSelectModel(c.teams, c.selected, c.opts), '__unassigned__');
    assert.equal(norm(html), norm('<option value="">Todos los equipos</option>' + OLD.unassigned + OLD.options[name]));
  });
}
test('Equipo select options leave out «Sin equipo asignado» when not offered', () => {
  assert.equal(norm(view.options(teamSelectModel([], ''), '')), norm('<option value="">Todos los equipos</option>'));
});
