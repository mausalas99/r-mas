import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tableHiddenRowClass, tableColumnHeader } from './tend-group-table-render.mjs';

test('hidden rows use the same is-hidden class as columns', () => {
  assert.equal(tableHiddenRowClass(true), 'is-hidden');
  assert.equal(tableHiddenRowClass(false), '');
});

test('table date headers omit lab-draw time', () => {
  const cols = [
    { fecha: '18/08/2026', hora: '05:05' },
    { fecha: '18/08/2026', hora: '17:02' },
  ];
  assert.equal(tableColumnHeader(cols[0], cols), '18/08/2026');
  assert.equal(tableColumnHeader(cols[1], cols), '18/08/2026');
});
