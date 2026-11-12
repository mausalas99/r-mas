import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { resolveGuardiaCensusEmptyCopy } from './guardia-census-empty.mjs';

const view = await loadJsx(import.meta.url, `import { GuardiaCensusEmpty, GuardiaSalaPicker, GuardiaCensusLoading } from './guardia-census-empty-view.jsx';
  export const empty = (copy) => renderToString(<GuardiaCensusEmpty copy={copy} />);
  export const picker = (salas, selected) => renderToString(<GuardiaSalaPicker salas={salas} selected={selected} />);
  export const loading = () => renderToString(<GuardiaCensusLoading />);`);

// Exact markup guardia-census-empty.mjs made before the port (container.innerHTML, from the old code).
const { default: OLD } = await import('./guardia-census-empty-view.old.json', { with: { type: 'json' } });

const norm = (s) => s.replace(/ ?\/>/g, '>');

for (const [name, filterOn] of [['empty-plain', false], ['empty-filtered', true]]) {
  test(`Guardia census empty HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.empty(resolveGuardiaCensusEmptyCopy({ filterOn }))), OLD[name]);
  });
}
for (const [name, salas, sel] of [
  ['picker-selected', ['Sala 1', 'Sala 2', 'Urgencias'], 'Sala 2'],
  ['picker-none', ['Sala 1', 'Sala 2'], ''],
  ['picker-nosalas', [], ''],
]) {
  test(`Guardia sala picker HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.picker(salas, sel)), OLD[name]);
  });
}
test('Guardia census loading HTML equals the old builder', () => {
  assert.equal(norm(view.loading()), OLD.loading);
});
