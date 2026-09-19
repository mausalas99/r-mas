import test from 'node:test';
import assert from 'node:assert/strict';
import { projectMomentum, rubberband } from './ui-physics.mjs';

test('projectMomentum matches Apple exponential decay', () => {
  const d = 0.998;
  const v = 110; // px/s
  assert.equal(projectMomentum(v, d), (v / 1000) * d / (1 - d));
});

test('rubberband resists more as overshoot grows', () => {
  const a = rubberband(-40, 400, 0.55);
  const b = rubberband(-80, 400, 0.55);
  assert.ok(a > -40 && a < 0);
  assert.ok(Math.abs(b) < 80);
  assert.ok(Math.abs(b) > Math.abs(a));
});

test('rubberband zero / bad dimension', () => {
  assert.equal(rubberband(0, 400), 0);
  assert.equal(rubberband(-10, 0), 0);
});
