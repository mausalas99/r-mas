import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldShowNubePostAuthChrome,
  shouldForcePanelRebuildOnAuthChange,
  shouldHidePrimaryLanChrome,
} from './panel-session-gate.mjs';

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

describe('shouldHidePrimaryLanChrome', () => {
  it('hides when cloud sala + cloud sync active', () => {
    assert.equal(shouldHidePrimaryLanChrome({ cloudSala: true, cloudActive: true }), true);
  });

  it('shows LAN chrome for LAN salas', () => {
    assert.equal(shouldHidePrimaryLanChrome({ cloudSala: false, cloudActive: false }), false);
  });

  it('hides primary LAN chrome on cloud sala even when Nube not connected', () => {
    assert.equal(shouldHidePrimaryLanChrome({ cloudSala: true, cloudActive: false }), true);
  });
});

