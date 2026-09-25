import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  syncGuidedTourContext,
  shouldShowGuardiaBoardWithoutEntrega,
} from './tour-guards.mjs';

test('guardia v7 tour shows board without entrega on modo guardia steps', () => {
  syncGuidedTourContext({ active: false, stepId: null });
  assert.equal(shouldShowGuardiaBoardWithoutEntrega('gv7_guardia_tab'), false);

  syncGuidedTourContext({ active: true, stepId: 'gv7_guardia_tab' });
  assert.equal(shouldShowGuardiaBoardWithoutEntrega('gv7_guardia_tab'), true);

  syncGuidedTourContext({ active: true, stepId: 'gv7_censo_r1' });
  assert.equal(shouldShowGuardiaBoardWithoutEntrega('gv7_censo_r1'), false);
});
