import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  syncGuidedTourContext,
  shouldSuppressGuardiaEntregaBootstrap,
  shouldShowGuardiaBoardWithoutEntrega,
} from './tour-guards.mjs';

test('guardia v7 tour suppresses entrega bootstrap on modo guardia steps', () => {
  syncGuidedTourContext({ active: false, stepId: null });
  assert.equal(shouldSuppressGuardiaEntregaBootstrap(), false);

  syncGuidedTourContext({ active: true, stepId: 'gv7_guardia_tab' });
  assert.equal(shouldSuppressGuardiaEntregaBootstrap(), true);
  assert.equal(shouldShowGuardiaBoardWithoutEntrega('gv7_guardia_tab'), true);

  syncGuidedTourContext({ active: true, stepId: 'gv7_censo_r1' });
  assert.equal(shouldSuppressGuardiaEntregaBootstrap(), false);
  assert.equal(shouldShowGuardiaBoardWithoutEntrega('gv7_censo_r1'), false);
});
