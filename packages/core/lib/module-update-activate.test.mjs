import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isCoreVersionCompatible } from './module-update-activate.mjs';

describe('isCoreVersionCompatible', () => {
  it('accepts a core version inside the manifest range', () => {
    const manifest = { minCoreVersion: '1.0.0', maxCoreVersion: '2.0.0' };
    assert.equal(isCoreVersionCompatible('1.5.0', manifest), true);
    assert.equal(isCoreVersionCompatible('1.0.0', manifest), true);
    assert.equal(isCoreVersionCompatible('2.0.0', manifest), true);
  });

  it('rejects a core version outside the manifest range', () => {
    const manifest = { minCoreVersion: '1.0.0', maxCoreVersion: '2.0.0' };
    assert.equal(isCoreVersionCompatible('0.9.0', manifest), false);
    assert.equal(isCoreVersionCompatible('2.0.1', manifest), false);
  });

  it('rejects when the manifest has no usable range, rather than trusting compareSemverCore\'s 0-on-malformed default', () => {
    assert.equal(isCoreVersionCompatible('1.5.0', { minCoreVersion: 'not-a-version', maxCoreVersion: '2.0.0' }), false);
    assert.equal(isCoreVersionCompatible('1.5.0', { minCoreVersion: '1.0.0', maxCoreVersion: undefined }), false);
    assert.equal(isCoreVersionCompatible('1.5.0', {}), false);
  });

  it('rejects an unparseable core version', () => {
    const manifest = { minCoreVersion: '1.0.0', maxCoreVersion: '2.0.0' };
    assert.equal(isCoreVersionCompatible('not-a-version', manifest), false);
  });
});
