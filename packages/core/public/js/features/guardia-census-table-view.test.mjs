import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { storage } from '../storage.js';
import { buildGuardiaCensusModel, collapsedGroupIds } from './guardia-census-table.mjs';
import { SCENARIOS, SCENARIO_TODOS, SCENARIO_CTX, SCENARIO_GUARDIAS } from './guardia-census-table-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { GuardiaCensusTable } from './guardia-census-table-view.jsx';
  export const html = (model, onRowClick) => renderToString(<GuardiaCensusTable model={model} onChip={() => {}} onRowClick={onRowClick} />);`);

// Exact markup buildGuardiaCensusTableHtml made before the port (captured from the old code).
const OLD = JSON.parse(fs.readFileSync(new URL('./guardia-census-table-view.old.json', import.meta.url), 'utf8'));
storage.getTodos = (id) => SCENARIO_TODOS[id] || [];

// Preact leaves '>' unescaped in text and attributes; HTML parses both the same.
const norm = (s) => s.replace(/&gt;/g, '>');
const oldHtml = (name) => norm(OLD[name]);

function draw(name, onRowClick) {
  const s = SCENARIOS[name];
  collapsedGroupIds.clear();
  s.collapsed.forEach((k) => collapsedGroupIds.add(k));
  const model = buildGuardiaCensusModel(s.patients, SCENARIO_GUARDIAS, s.rank, SCENARIO_CTX, s.filter);
  collapsedGroupIds.clear();
  return norm(view.html(model, onRowClick));
}

for (const name of Object.keys(SCENARIOS)) {
  test(`census table HTML equals the old builder: ${name}`, () => {
    assert.equal(draw(name), oldHtml(name));
  });
}
