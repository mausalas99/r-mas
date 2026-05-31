import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ClinicalSafetyError,
  requirePositiveFinite,
  clamp,
  planStandardKClBags,
  maxMeqForVolume,
} from './clinical-safety.mjs';

test('requirePositiveFinite rejects empty and non-positive', () => {
  assert.equal(requirePositiveFinite(''), null);
  assert.equal(requirePositiveFinite(undefined), null);
  assert.equal(requirePositiveFinite(0), null);
  assert.equal(requirePositiveFinite(-1), null);
  assert.equal(requirePositiveFinite(70), 70);
});

test('planStandardKClBags: 30 mEq peripheral ≤40 mEq/L', () => {
  var plan = planStandardKClBags(30, 40);
  assert.equal(plan.bags.length, 1);
  assert.equal(plan.bags[0].meq, 30);
  assert.ok(plan.bags[0].volMl >= 750);
  assert.ok(plan.bags[0].meq / (plan.bags[0].volMl / 1000) <= 40);
});

test('planStandardKClBags: 80 mEq peripheral splits across 2×1000 mL', () => {
  var plan = planStandardKClBags(80, 40);
  assert.equal(plan.bags.length, 2);
  assert.equal(plan.bags[0].volMl, 1000);
  assert.equal(plan.bags[1].volMl, 1000);
  assert.equal(plan.bags[0].meq, 40);
  assert.equal(plan.bags[1].meq, 40);
});

test('planStandardKClBags: invalid dose throws', () => {
  assert.throws(function () {
    planStandardKClBags(0, 40);
  }, ClinicalSafetyError);
});

test('maxMeqForVolume 1000 mL at 40 mEq/L', () => {
  assert.equal(maxMeqForVolume(1000, 40), 40);
});

test('clamp', () => {
  assert.equal(clamp(5000, 0, 3000), 3000);
});
