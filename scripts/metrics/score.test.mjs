import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTotalScore, fileLineOverageDebt, eslintDebtFromResults } from './score.mjs';

test('fileLineOverageDebt charges over 600 lines', () => {
  assert.equal(fileLineOverageDebt(650), 2 * Math.ceil(50 / 10));
});

test('eslintDebtFromResults reads the real per-file max-lines-per-function budget from the message, not a hardcoded 80', () => {
  // A test file gets a 320-line budget (eslint.config.mjs) — a 350-line function
  // is only 30 over, not 270 over as a hardcoded-80 assumption would compute.
  const { lengthOverage } = eslintDebtFromResults([
    {
      filePath: '/does/not/exist.test.mjs',
      messages: [
        {
          ruleId: 'max-lines-per-function',
          message: "Function 'x' has too many lines (350). Maximum allowed is 320.",
        },
      ],
    },
  ]);
  assert.equal(lengthOverage, 2 * Math.ceil(30 / 10));
});

test('eslintDebtFromResults falls back to 80 when the message has no explicit budget', () => {
  const { lengthOverage } = eslintDebtFromResults([
    {
      filePath: '/does/not/exist.mjs',
      messages: [
        {
          ruleId: 'max-lines-per-function',
          message: 'Function has too many lines (100).',
        },
      ],
    },
  ]);
  assert.equal(lengthOverage, 2 * Math.ceil(20 / 10));
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
