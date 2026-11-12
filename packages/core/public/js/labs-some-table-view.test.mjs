import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './features/preact-view-test-helpers.mjs';
import { buildSomeTablesModel } from './labs-some-table-render.mjs';
import { makeParsed, CASES } from './labs-some-table-view-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { SomeReportTables } from './labs-some-table-view.jsx';
  export const html = (model) => renderToString(<SomeReportTables model={model} />);`);

// Exact markup renderSomeReportTablesHtml made before the port (from the old code).
const { default: OLD } = await import('./labs-some-table-view.old.json', { with: { type: 'json' } });

// Preact writes void tags as <x/>, closes SVG shapes and writes empty attributes bare, escapes quotes in text; HTML parses both the same.
const norm = (s) => s.replace(/<\/(?:rect|path|circle)>/g, '').replace(/ ?\/>/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/ ([a-z-]+)=""/g, ' $1');

for (const [name, c] of Object.entries(CASES)) {
  test(`SOME tables HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.html(buildSomeTablesModel(makeParsed(), c.opts))), norm(OLD[name]));
  });
}
test('SOME tables model is null without departments', () => {
  assert.equal(buildSomeTablesModel({ departments: [] }), null);
  assert.equal(OLD.empty, '');
});
