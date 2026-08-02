import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowNubePostAuthChrome } from './panel-session-gate.mjs';

describe('shouldShowNubePostAuthChrome', () => {
  it('returns false for null, undefined, empty, or whitespace-only token', () => {
    assert.equal(shouldShowNubePostAuthChrome(null), false);
    assert.equal(shouldShowNubePostAuthChrome(undefined), false);
    assert.equal(shouldShowNubePostAuthChrome(''), false);
    assert.equal(shouldShowNubePostAuthChrome('   '), false);
  });

  it('returns true for non-empty trimmed token', () => {
    assert.equal(shouldShowNubePostAuthChrome('abc'), true);
    assert.equal(shouldShowNubePostAuthChrome('  token  '), true);
  });
});
