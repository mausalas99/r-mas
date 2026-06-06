import test from 'node:test';
import assert from 'node:assert/strict';
import {
  markNeoCompanionStepComplete,
  isNeoCompanionStepComplete,
  loadNeoCompanionProgress,
} from './neo-companion-progress.mjs';

test('neo companion progress tracks completed steps', () => {
  const storage = {
    data: {},
    getItem(k) {
      return this.data[k] ?? null;
    },
    setItem(k, v) {
      this.data[k] = v;
    },
  };
  assert.equal(isNeoCompanionStepComplete('sala_casiopea_lab', storage), false);
  const result = markNeoCompanionStepComplete('sala_casiopea_lab', storage);
  assert.equal(result.wasNew, true);
  assert.equal(isNeoCompanionStepComplete('sala_casiopea_lab', storage), true);
  assert.deepEqual(loadNeoCompanionProgress(storage).completedSteps, ['sala_casiopea_lab']);
});
