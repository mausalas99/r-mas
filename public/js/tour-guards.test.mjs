import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  syncGuidedTourContext,
  isCasiopeaTourSendBlocked,
  shouldSuppressGuardiaEntregaBootstrap,
  shouldShowGuardiaBoardWithoutEntrega,
  shouldOpenEntregaRosterForTour,
} from './tour-guards.mjs';

test('isCasiopeaTourSendBlocked is false when tour inactive', () => {
  syncGuidedTourContext({ active: false, stepId: null });
  assert.equal(isCasiopeaTourSendBlocked('lab'), false);
  assert.equal(isCasiopeaTourSendBlocked('trends'), false);
});

test('isCasiopeaTourSendBlocked blocks lab step only on sala_casiopea_lab', () => {
  syncGuidedTourContext({ active: true, stepId: 'sala_casiopea_lab' });
  assert.equal(isCasiopeaTourSendBlocked('lab'), true);
  assert.equal(isCasiopeaTourSendBlocked('trends'), false);
});

test('isCasiopeaTourSendBlocked blocks trends confirm on sala_casiopea_trends', () => {
  syncGuidedTourContext({ active: true, stepId: 'sala_casiopea_trends' });
  assert.equal(isCasiopeaTourSendBlocked('lab'), false);
  assert.equal(isCasiopeaTourSendBlocked('trends'), true);
});

test('guardia v7 tour suppresses entrega bootstrap on modo guardia steps', () => {
  syncGuidedTourContext({ active: false, stepId: null });
  assert.equal(shouldSuppressGuardiaEntregaBootstrap(), false);

  syncGuidedTourContext({ active: true, stepId: 'gv7_guardia_tab' });
  assert.equal(shouldSuppressGuardiaEntregaBootstrap(), true);
  assert.equal(shouldShowGuardiaBoardWithoutEntrega('gv7_guardia_tab'), true);
  assert.equal(shouldOpenEntregaRosterForTour('gv7_guardia_tab'), false);

  syncGuidedTourContext({ active: true, stepId: 'gv7_entrega_roster' });
  assert.equal(shouldSuppressGuardiaEntregaBootstrap(), false);
  assert.equal(shouldShowGuardiaBoardWithoutEntrega('gv7_entrega_roster'), false);
  assert.equal(shouldOpenEntregaRosterForTour('gv7_entrega_roster'), true);
});
