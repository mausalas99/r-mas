import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { UnifiedSearchResults, ExtraTemplatesList } from './productivity-view.jsx';
  export const search = (p) => renderToString(<UnifiedSearchResults {...p} />);
  export const tmpl = (p) => renderToString(<ExtraTemplatesList {...p} />);`);

// Exact markup the old string builders in productivity.mjs made (synthetic data).
const OLD = JSON.parse(fs.readFileSync(new URL('./productivity-view.old.json', import.meta.url), 'utf8'));
// Preact leaves '>' unescaped in text, writes empty attrs bare, and the old builder used single quotes for data-onclick-args.
const norm = (s) => s.replace(/&gt;/g, '>').replace(/ title>/g, ' title="">').replace(/data-onclick-args='([^']*)'/g, 'data-onclick-args="$1"');

const results = [
  { id: 'r1', title: 'Paciente <A> & "B"', tag: 'nota', meta: 'Cto. 12 · Cama 3 · REG1', snippet: '… dolor torácico y Fiebre <38> & tos …' },
  { id: 'r2', title: 'Sin nombre', tag: 'paciente', meta: 'Cto. - · Cama -', snippet: '' },
  { id: 'r3', title: 'Otro', tag: 'indicaciones', meta: 'm', snippet: 'FIEBRE fiebre Fiebre' },
];

test('search results HTML equals the old builder', () => {
  assert.equal(norm(view.search({ results, q: 'fiebre' })), norm(OLD.results));
});
test('templates list HTML equals the old builder', () => {
  assert.equal(norm(view.tmpl({ templates: [{ id: 't"1', label: 'Dieta <blanda> & "x"' }, { id: 't2', label: '' }] })), norm(OLD.tmpl));
});
test('empty states', () => {
  assert.match(view.search({ results: [], q: '' }), /Buscar en el censo/);
  assert.match(view.search({ results: [], q: 'zz' }), /Sin coincidencias/);
  assert.match(view.tmpl({ templates: [] }), /Sin plantillas guardadas/);
});
test('query with regex characters does not break highlighting', () => {
  assert.match(view.search({ results: [{ ...results[0], snippet: 'a (b) c' }], q: '(b)' }), /<mark>\(b\)<\/mark>/);
});
