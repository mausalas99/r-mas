import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPitchStepBadgeText, shouldApplyPitchSpotlight } from './tour-pitch.mjs';

test('getPitchStepBadgeText uses callout label when present', () => {
  assert.equal(getPitchStepBadgeText('pitch_modo_pase'), '⑰ Modo Pase');
  assert.equal(getPitchStepBadgeText('listado_problemas'), '⑯ Listado de problemas');
});

test('getPitchStepBadgeText uses slide labels for fullscreen steps', () => {
  assert.equal(getPitchStepBadgeText('pitch_intro'), 'Pitch · Intro');
  assert.equal(getPitchStepBadgeText('pitch_problem_laboratoriazo'), 'Pitch · El problema');
  assert.equal(getPitchStepBadgeText('wrap'), 'Pitch · Cierre');
});

test('shouldApplyPitchSpotlight false when dock collapsed', () => {
  assert.equal(shouldApplyPitchSpotlight({ tourActive: true, dockCollapsed: true }), false);
  assert.equal(shouldApplyPitchSpotlight({ tourActive: true, dockCollapsed: false }), true);
  assert.equal(shouldApplyPitchSpotlight({ tourActive: false, dockCollapsed: false }), false);
});
