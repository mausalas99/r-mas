import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { TYPES, FIELDS } from './lab-manual-entry-view-scenarios.mjs';

const old = JSON.parse(fs.readFileSync(new URL('./lab-manual-entry-view.old.json', import.meta.url), 'utf8'));
const m = await loadJsx(import.meta.url, `
  import { LabManualTypeOptions, LabManualFieldGrid } from './lab-manual-entry-view.jsx';
  export const types = (t) => renderToString(<LabManualTypeOptions types={t} />);
  export const grid = (f) => renderToString(<LabManualFieldGrid fields={f} />);`);

// Same DOM, different serialization: Preact prints void tags as "<input/>", leaves ">" bare in
// text and attributes, and drops an empty value. Old strings used " />", "&gt;" and value="".
const norm = (h) => h.replace(/ ?\/>/g, '>').replace(/&gt;/g, '>').replace(/ value>/g, ' value="">').replace(/ value=""/g, ' value=""');

for (const [name, v] of Object.entries(TYPES)) {
  test(`manual lab type options ${name} match the old markup`, () => assert.equal(norm(m.types(v)), norm(old.types[name])));
}
for (const [name, v] of Object.entries(FIELDS)) {
  test(`manual lab field grid ${name} matches the old markup`, () => assert.equal(norm(m.grid(v)), norm(old.grid[name])));
}
