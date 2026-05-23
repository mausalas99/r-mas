import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  syncGuidedTourContext,
  isCasiopeaTourSendBlocked,
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
