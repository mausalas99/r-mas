import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeClinicalText,
  matchAllClauses,
  evalSafetyPredicate,
  evaluateSafetyRules,
} from './evaluate.mjs';

const METFORMINA_RULES = [
  {
    id: 'metformina-egfr-lt30',
    severity: 'high',
    title: 'Metformina IRC',
    message: 'TFGe < 30',
    scope: 'cross_field',
    clauses: [{ anyOf: ['metformina'] }],
    requires: ['renal'],
    predicate: 'renal.egfr != null && renal.egfr < 30',
  },
];

test('normalizeClinicalText strips accents', () => {
  assert.equal(normalizeClinicalText('Insuficiencia Renál'), 'insuficiencia renal');
});

test('text-only rule fires on APP match', () => {
  var fired = evaluateSafetyRules({
    appText: 'Alergia documentada a penicilina con anafilaxia previa',
    rules: [
      {
        id: 'beta-lactam-allergy',
        severity: 'high',
        title: 'Beta-lactam',
        message: 'Alert',
        scope: 'text',
        clauses: [
          { anyOf: ['penicilina', 'amoxicilina'] },
          { anyOf: ['alergia', 'anafilaxia'] },
        ],
      },
    ],
  });
  assert.equal(fired.length, 1);
  assert.equal(fired[0].id, 'beta-lactam-allergy');
});

test('cross-field does not fire when eGFR >= 30', () => {
  var fired = evaluateSafetyRules({
    appText: 'Continúa metformina 850 mg c/12h',
    renal: { egfr: 45, creatinineMgDl: 1.1 },
    rules: METFORMINA_RULES,
  });
  assert.equal(fired.length, 0);
});

test('cross-field fires when text matches and eGFR < 30', () => {
  var fired = evaluateSafetyRules({
    appText: 'DM2 en manejo con metformina',
    renal: { egfr: 22, creatinineMgDl: 2.1, fecha: '30/05/26', setId: 'set_1', source: 'computed' },
    rules: METFORMINA_RULES,
  });
  assert.equal(fired.length, 1);
  assert.equal(fired[0].id, 'metformina-egfr-lt30');
});

test('evalSafetyPredicate renal.egfr < 30', () => {
  assert.equal(evalSafetyPredicate('renal.egfr != null && renal.egfr < 30', { renal: { egfr: 29 } }), true);
  assert.equal(evalSafetyPredicate('renal.egfr != null && renal.egfr < 30', { renal: { egfr: 30 } }), false);
});

test('matchAllClauses requires all groups', () => {
  var norm = normalizeClinicalText('metformina sola');
  assert.equal(
    matchAllClauses(norm, [{ anyOf: ['metformina'] }, { anyOf: ['dialisis'] }]),
    false
  );
});
