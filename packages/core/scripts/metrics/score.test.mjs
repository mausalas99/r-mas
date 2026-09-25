import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTotalScore, eslintDebtFromResults, duplicationDebtFromJscpd } from './score.mjs';

test('duplicationDebtFromJscpd reads duplicatedTokens, not total scanned tokens', () => {
  const statistics = { total: { tokens: 2356438, duplicatedTokens: 48795 } };
  assert.equal(duplicationDebtFromJscpd(statistics), 976);
});

test('duplicationDebtFromJscpd is 0 when there is nothing to read', () => {
  assert.equal(duplicationDebtFromJscpd(undefined), 0);
  assert.equal(duplicationDebtFromJscpd({}), 0);
});

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
    bootGraphDebt: 25,
  });
  assert.equal(total, 42);
});
