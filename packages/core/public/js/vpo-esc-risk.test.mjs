import test from 'node:test';
import assert from 'node:assert/strict';
import { ESC_PROCEDURES, getEscProcedure } from './vpo-esc-risk.mjs';

test('ESC 2022 table has 31 procedures: 10 low, 10 intermediate, 11 high', () => {
  const n = (t) => ESC_PROCEDURES.filter((p) => p.tier === t).length;
  assert.deepEqual([n('Bajo'), n('Intermedio'), n('Alto')], [10, 10, 11]);
  assert.equal(new Set(ESC_PROCEDURES.map((p) => p.id)).size, 31);
});

test('lookup', () => {
  assert.equal(getEscProcedure('esophagectomy').tier, 'Alto');
  assert.equal(getEscProcedure('intraperitoneal').tier, 'Intermedio');
  assert.equal(getEscProcedure('nope'), null);
});
