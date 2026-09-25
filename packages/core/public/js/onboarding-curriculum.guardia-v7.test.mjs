import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRICULUM_VERSION,
  GUARDIA_V7_CHAPTERS,
  getGuardiaV7TourSteps,
  getFirstStepIdForChapter,
  isValidStepForBranch,
  getChapterForStep,
  getTourStepsForChapter,
} from './onboarding-curriculum.mjs';

test('CURRICULUM_VERSION is 20', () => {
  assert.equal(CURRICULUM_VERSION, 20);
});

test('guardia-v7 has 4 chapters and 16 steps (Modo Entrega retired)', () => {
  assert.equal(GUARDIA_V7_CHAPTERS.length, 4);
  assert.equal(getGuardiaV7TourSteps().length, 16);
  assert.ok(!GUARDIA_V7_CHAPTERS.some((ch) => ch.id === 'ch-guardia-entrega'));
});

test('getFirstStepIdForChapter guardia-v7 branch', () => {
  assert.equal(getFirstStepIdForChapter('ch-guardia-modo', 'guardia-v7'), 'gv7_guardia_chip');
});

test('isValidStepForBranch accepts gv7 steps on guardia-v7', () => {
  assert.equal(isValidStepForBranch('gv7_guardia_chip', 'guardia-v7', 'base'), true);
  assert.equal(isValidStepForBranch('gv7_guardia_chip', 'sala', 'base'), false);
});

test('getChapterForStep maps gv7 steps to guardia chapters', () => {
  assert.equal(getChapterForStep('gv7_lan_wifi', 'guardia-v7').id, 'ch-guardia-nube');
  assert.equal(getChapterForStep('gv7_censo_r1', 'guardia-v7').id, 'ch-guardia-censo');
});

test('censo steps precede nube in guardia-v7 linear order', () => {
  const steps = getGuardiaV7TourSteps();
  assert.ok(steps.indexOf('gv7_guardia_exit') < steps.indexOf('gv7_censo_r1'));
  assert.ok(steps.indexOf('gv7_censo_sync') < steps.indexOf('gv7_lan_wifi'));
});

test('getTourStepsForChapter returns scoped step list', () => {
  const steps = getTourStepsForChapter('ch-guardia-modo', 'guardia-v7');
  assert.equal(steps.length, 5);
  assert.equal(steps[0], 'gv7_guardia_chip');
  assert.equal(steps[steps.length - 1], 'gv7_guardia_exit');
  assert.ok(!steps.includes('gv7_trust_strip'));
});
