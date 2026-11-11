import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { LabRepoBatchList, LabChemistrySkeleton } from './lab-repo-batch-import-view.jsx';
  export const list = (rows, busy) => renderToString(<LabRepoBatchList rows={rows} busy={busy} />);
  export const skeleton = () => renderToString(<LabChemistrySkeleton />);`);

const rows = [
  { id: 'r1', hasRegistro: true, selected: true },
  { id: 'r2', hasRegistro: false, selected: false },
  { id: 'r3', hasRegistro: true, selected: false },
];

const count = (html, re) => (html.match(re) || []).length;

test('batch list draws one checkbox per row', () => {
  assert.equal(count(view.list(rows, false), /type="checkbox"/g), rows.length);
});

test('a row without registro is disabled, the others are not', () => {
  const html = view.list(rows, false);
  const boxes = html.match(/<input[^>]*type="checkbox"[^>]*>/g) || [];
  assert.equal(boxes.length, rows.length);
  assert.match(boxes[1], /disabled/);
  assert.doesNotMatch(boxes[0], /disabled/);
  assert.doesNotMatch(boxes[2], /disabled/);
});

test('busy list disables every checkbox', () => {
  assert.equal(count(view.list(rows, true), /<input[^>]*type="checkbox"[^>]*disabled/g), rows.length);
});

test('a checked row is checked', () => {
  const boxes = view.list(rows, false).match(/<input[^>]*type="checkbox"[^>]*>/g) || [];
  assert.match(boxes[0], /checked/);
  assert.doesNotMatch(boxes[2], /checked/);
});

test('no rows gives the empty message', () => {
  assert.match(view.list([], false), /No hay pacientes en tu equipo/);
});

test('chemistry skeleton renders', () => {
  assert.ok(view.skeleton().length > 0);
});
