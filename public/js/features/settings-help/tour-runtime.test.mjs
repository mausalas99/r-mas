import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTourVersionLabel,
  shouldShowGuidedTourIntro,
} from './tour-runtime.mjs';

test('normalizeTourVersionLabel trims and defaults empty to dev', () => {
  assert.equal(normalizeTourVersionLabel('  6.6.2  '), '6.6.2');
  assert.equal(normalizeTourVersionLabel(''), 'dev');
  assert.equal(normalizeTourVersionLabel(null), 'dev');
});

test('shouldShowGuidedTourIntro on semver bump after stored done version', () => {
  assert.equal(shouldShowGuidedTourIntro('6.6.2', ''), true);
  assert.equal(shouldShowGuidedTourIntro('6.6.2', '6.6.2'), false);
  assert.equal(shouldShowGuidedTourIntro('6.6.3', '6.6.2'), true);
  assert.equal(shouldShowGuidedTourIntro('6.6.1', '6.6.2'), false);
});
