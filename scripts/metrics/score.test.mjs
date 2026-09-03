import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTotalScore, eslintDebtFromResults } from './score.mjs';

test('eslintDebtFromResults charges complexity only', () => {
  const { complexityOverage, lengthOverage } = eslintDebtFromResults([
    {
      filePath: '/x.mjs',
      messages: [
        { ruleId: 'complexity', message: 'Function has a complexity of 20.' },
        {
          ruleId: 'max-lines-per-function',
          message: "Function 'x' has too many lines (350). Maximum allowed is 80.",
        },
      ],
    },
  ]);
  assert.equal(complexityOverage, 10);
  assert.equal(lengthOverage, 0);
});

test('computeTotalScore sums components', () => {
  const total = computeTotalScore({
    complexityOverage: 10,
    lengthOverage: 4,
    duplicationDebt: 3,
    importSmellDebt: 0,
    bootGraphDebt: 25,
  });
  assert.equal(total, 42);
});
