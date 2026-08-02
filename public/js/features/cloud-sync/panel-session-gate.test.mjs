import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowNubePostAuthChrome, shouldForcePanelRebuildOnAuthChange } from './panel-session-gate.mjs';

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
describe('shouldForcePanelRebuildOnAuthChange', () => {
  it('returns true when token presence changes', () => {
    assert.equal(shouldForcePanelRebuildOnAuthChange(null, 'tok'), true);
    assert.equal(shouldForcePanelRebuildOnAuthChange('tok', null), true);
    assert.equal(shouldForcePanelRebuildOnAuthChange('', 'tok'), true);
  });

  it('returns false when token presence unchanged', () => {
    assert.equal(shouldForcePanelRebuildOnAuthChange(null, null), false);
    assert.equal(shouldForcePanelRebuildOnAuthChange('tok', 'tok2'), false);
    assert.equal(shouldForcePanelRebuildOnAuthChange('', '   '), false);
  });
});

