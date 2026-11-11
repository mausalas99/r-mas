import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { storage } from '../storage.js';
import { buildGuardiaCensusModel, collapsedGroupIds } from './guardia-census-table.mjs';
import { SCENARIOS, SCENARIO_TODOS, SCENARIO_CTX, SCENARIO_GUARDIAS } from './guardia-census-table-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { GuardiaCensusTable } from './guardia-census-table-view.jsx';
  export const html = (model, onRowClick) => renderToString(<GuardiaCensusTable model={model} onChip={() => {}} onRowClick={onRowClick} />);`);

storage.getTodos = (id) => SCENARIO_TODOS[id] || [];

function draw(name) {
  const s = SCENARIOS[name];
  collapsedGroupIds.clear();
  s.collapsed.forEach((k) => collapsedGroupIds.add(k));
  const model = buildGuardiaCensusModel(s.patients, SCENARIO_GUARDIAS, s.rank, SCENARIO_CTX, s.filter);
  collapsedGroupIds.clear();
  return view.html(model, () => {});
}

for (const name of Object.keys(SCENARIOS)) {
  test(`census table ${name} renders the census card`, () => {
    const html = draw(name);
    assert.match(html, /class="wb-table-card guardia-census-table"/);
    assert.match(html, /Censo · \d+ pacientes?</);
  });
}
