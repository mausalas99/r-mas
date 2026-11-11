import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { UnifiedSearchResults, ExtraTemplatesList } from './productivity-view.jsx';
  export const search = (p) => renderToString(<UnifiedSearchResults {...p} />);
  export const tmpl = (p) => renderToString(<ExtraTemplatesList {...p} />);`);

const text = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const results = [
  { id: 'r1', title: 'Paciente <A> & "B"', tag: 'nota', meta: 'Cto. 12 · Cama 3 · REG1', snippet: '… dolor torácico y Fiebre <38> & tos …' },
  { id: 'r2', title: 'Sin nombre', tag: 'paciente', meta: 'Cto. - · Cama -', snippet: '' },
  { id: 'r3', title: 'Otro', tag: 'indicaciones', meta: 'm', snippet: 'FIEBRE fiebre Fiebre' },
];

test('search results show each title, escaped', () => {
  const t = text(view.search({ results, q: 'fiebre' }));
  assert.ok(t.includes('Paciente <A> & "B"'));
  assert.ok(t.includes('Sin nombre'));
  assert.ok(t.includes('Otro'));
});

test('search highlights every match, ignoring case', () => {
  const html = view.search({ results: [results[2]], q: 'fiebre' });
  assert.equal((html.match(/<mark>/g) || []).length, 3);
});

test('templates list shows each label and wires edit and delete', () => {
  const html = view.tmpl({ templates: [{ id: 't"1', label: 'Dieta <blanda> & "x"' }, { id: 't2', label: '' }] });
  assert.ok(text(html).includes('Dieta <blanda> & "x"'));
  assert.equal((html.match(/data-onclick="editExtraTemplate"/g) || []).length, 2);
  assert.equal((html.match(/data-onclick="deleteExtraTemplate"/g) || []).length, 2);
});

test('empty states', () => {
  assert.match(view.search({ results: [], q: '' }), /Buscar en el censo/);
  assert.match(view.search({ results: [], q: 'zz' }), /Sin coincidencias/);
  assert.match(view.tmpl({ templates: [] }), /Sin plantillas guardadas/);
});

test('query with regex characters does not break highlighting', () => {
  assert.match(view.search({ results: [{ ...results[0], snippet: 'a (b) c' }], q: '(b)' }), /<mark>\(b\)<\/mark>/);
});
