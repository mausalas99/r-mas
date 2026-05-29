import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPitchStepBadgeText } from './tour-pitch.mjs';

test('getPitchStepBadgeText uses callout label when present', () => {
  assert.equal(getPitchStepBadgeText('pitch_modo_pase'), '⑰ Modo Pase');
  assert.equal(getPitchStepBadgeText('listado_problemas'), '⑯ Listado de problemas');
});

test('getPitchStepBadgeText uses slide labels for fullscreen steps', () => {
  assert.equal(getPitchStepBadgeText('pitch_intro'), 'Pitch · Intro');
  assert.equal(getPitchStepBadgeText('pitch_problem_laboratoriazo'), 'Pitch · El problema');
  assert.equal(getPitchStepBadgeText('wrap'), 'Pitch · Cierre');
});
