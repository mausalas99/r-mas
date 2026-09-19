import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowKey } from './tend-group-table-render.mjs';

test('rowKey namespaces by section so cross-section homonyms cannot collide', () => {
  const bhRow = { sectionKey: 'BH', fieldKey: 'Fib' };
  const qsRow = { sectionKey: 'QS', fieldKey: 'Fib' };
  assert.notEqual(rowKey(bhRow), rowKey(qsRow));
  assert.equal(rowKey(bhRow), 'BH|Fib');
});
